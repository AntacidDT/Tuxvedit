import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // File dialogs
  openFile: (options?: any) => ipcRenderer.invoke('dialog:openFile', options),
  saveFile: (options?: any) => ipcRenderer.invoke('dialog:saveFile', options),

  // FFmpeg
  probe: (filePath: string) => ipcRenderer.invoke('ffmpeg:probe', filePath),
  extractFrame: (filePath: string, time: number) =>
    ipcRenderer.invoke('ffmpeg:extractFrame', filePath, time),
  convert: (params: any) => ipcRenderer.invoke('ffmpeg:convert', params),
  waveform: (filePath: string, samples?: number) =>
    ipcRenderer.invoke('ffmpeg:waveform', filePath, samples),

  // Progress callback
  onProgress: (callback: (progress: number) => void) => {
    ipcRenderer.on('ffmpeg:progress', (_event, progress) => callback(progress));
    return () => {
      ipcRenderer.removeAllListeners('ffmpeg:progress');
    };
  },
});
