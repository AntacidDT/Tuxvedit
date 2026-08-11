import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { spawn, exec } from 'child_process';

const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE_PATH = process.env.FFPROBE_PATH || 'ffprobe';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0A0A0A',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// File dialog
ipcMain.handle('dialog:openFile', async (_event, options) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections'],
    filters: options?.filters || [
      { name: 'Media Files', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'mp3', 'wav', 'flac', 'ogg'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return result.filePaths;
});

ipcMain.handle('dialog:saveFile', async (_event, options) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    filters: options?.filters || [
      { name: 'MP4', extensions: ['mp4'] },
      { name: 'MKV', extensions: ['mkv'] },
      { name: 'WebM', extensions: ['webm'] },
    ],
  });
  return result.filePath;
});

// FFmpeg probe
ipcMain.handle('ffmpeg:probe', async (_event, filePath: string) => {
  return new Promise((resolve, reject) => {
    exec(
      `${FFPROBE_PATH} -v quiet -print_format json -show_format -show_streams "${filePath}"`,
      (error, stdout) => {
        if (error) reject(error);
        else resolve(JSON.parse(stdout));
      }
    );
  });
});

// FFmpeg extract frame
ipcMain.handle('ffmpeg:extractFrame', async (_event, filePath: string, time: number) => {
  return new Promise((resolve, reject) => {
    const args = [
      '-hwaccel', 'cuda',
      '-hwaccel_output_format', 'cuda',
      '-ss', time.toString(),
      '-i', filePath,
      '-vframes', '1',
      '-f', 'image2pipe',
      '-vcodec', 'png',
      'pipe:1',
    ];

    const process = spawn(FFMPEG_PATH, args);
    const chunks: Buffer[] = [];

    process.stdout.on('data', (chunk) => chunks.push(chunk));
    process.stderr.on('data', () => {});
    process.on('close', () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer.toString('base64'));
    });
    process.on('error', reject);
  });
});

// FFmpeg convert with NVENC
ipcMain.handle('ffmpeg:convert', async (_event, params) => {
  const { input, output, options } = params;

  return new Promise((resolve, reject) => {
    const args = buildFFmpegArgs(input, output, options);
    const process = spawn(FFMPEG_PATH, args);

    let stderr = '';
    process.stderr.on('data', (data) => {
      stderr += data.toString();
      const progress = parseProgress(stderr, options?.duration);
      if (progress !== null) {
        _event.sender.send('ffmpeg:progress', progress);
      }
    });

    process.on('close', (code) => {
      if (code === 0) resolve({ success: true });
      else reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
    });

    process.on('error', reject);
  });
});

// FFmpeg extract audio waveform
ipcMain.handle('ffmpeg:waveform', async (_event, filePath: string, samples: number = 1000) => {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', filePath,
      '-ac', '1',
      '-filter:a', `aresample=${samples}`,
      '-map', '0:a',
      '-c:a', 'pcm_s16le',
      '-f', 's16le',
      'pipe:1',
    ];

    const process = spawn(FFMPEG_PATH, args);
    const chunks: Buffer[] = [];

    process.stdout.on('data', (chunk) => chunks.push(chunk));
    process.stderr.on('data', () => {});
    process.on('close', () => {
      const buffer = Buffer.concat(chunks);
      const samples_data: number[] = [];
      for (let i = 0; i < buffer.length; i += 2) {
        samples_data.push(buffer.readInt16LE(i) / 32768);
      }
      resolve(samples_data);
    });
    process.on('error', reject);
  });
});

function buildFFmpegArgs(input: string, output: string, options: any): string[] {
  const args = ['-y'];

  // Hardware acceleration for decoding
  if (options?.hwaccel !== false) {
    args.push('-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda');
  }

  args.push('-i', input);

  // Video codec - use NVENC
  if (options?.codec) {
    args.push('-c:v', options.codec);
  } else {
    args.push('-c:v', 'h264_nvenc');
  }

  // Quality (CRF or bitrate)
  if (options?.crf !== undefined) {
    args.push('-crf', options.crf.toString());
  }
  if (options?.bitrate) {
    args.push('-b:v', options.bitrate);
  }

  // Resolution
  if (options?.resolution) {
    args.push('-s', options.resolution);
  }

  // FPS
  if (options?.fps) {
    args.push('-r', options.fps.toString());
  }

  // Audio codec
  if (options?.audioCodec) {
    args.push('-c:a', options.audioCodec);
  } else {
    args.push('-c:a', 'aac');
  }

  // Audio bitrate
  if (options?.audioBitrate) {
    args.push('-b:a', options.audioBitrate);
  }

  // Preset
  if (options?.preset) {
    args.push('-preset', options.preset);
  }

  // Pixel format
  args.push('-pix_fmt', 'yuv420p');

  args.push(output);
  return args;
}

function parseProgress(stderr: string, duration?: number): number | null {
  const timeMatch = stderr.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
  if (timeMatch && duration) {
    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const seconds = parseInt(timeMatch[3]);
    const centiseconds = parseInt(timeMatch[4]);
    const currentTime = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
    return Math.min(currentTime / duration, 1);
  }
  return null;
}
