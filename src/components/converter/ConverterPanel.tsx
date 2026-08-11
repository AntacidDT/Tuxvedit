import React, { useState, useCallback } from 'react';
import { useFFmpeg } from '../../hooks/useFFmpeg';

const CODECS = [
  { value: 'h264_nvenc', label: 'H.264 (NVENC)', ext: 'mp4' },
  { value: 'hevc_nvenc', label: 'H.265/HEVC (NVENC)', ext: 'mp4' },
  { value: 'av1_nvenc', label: 'AV1 (NVENC)', ext: 'mp4' },
  { value: 'libx264', label: 'H.264 (CPU)', ext: 'mp4' },
  { value: 'libvpx-vp9', label: 'VP9', ext: 'webm' },
];

const PRESETS = [
  { value: 'fast', label: 'Fast' },
  { value: 'medium', label: 'Medium' },
  { value: 'slow', label: 'Slow' },
];

export function ConverterPanel() {
  const { probe, convert, openFile, saveFile, progress, isProcessing } = useFFmpeg();

  const [inputPath, setInputPath] = useState<string>('');
  const [outputPath, setOutputPath] = useState<string>('');
  const [codec, setCodec] = useState('h264_nvenc');
  const [preset, setPreset] = useState('medium');
  const [crf, setCrf] = useState(23);
  const [resolution, setResolution] = useState('');
  const [fps, setFps] = useState(0);
  const [audioBitrate, setAudioBitrate] = useState('128k');
  const [inputInfo, setInputInfo] = useState<any>(null);

  const handleSelectInput = useCallback(async () => {
    const files = await openFile();
    if (files && files.length > 0) {
      setInputPath(files[0]);
      try {
        const info = await probe(files[0]);
        setInputInfo(info);
      } catch {
        setInputInfo(null);
      }
    }
  }, [openFile, probe]);

  const handleSelectOutput = useCallback(async () => {
    const path = await saveFile();
    if (path) setOutputPath(path);
  }, [saveFile]);

  const handleConvert = useCallback(async () => {
    if (!inputPath || !outputPath) return;

    await convert({
      input: inputPath,
      output: outputPath,
      options: {
        codec,
        preset,
        crf,
        resolution: resolution || undefined,
        fps: fps || undefined,
        audioBitrate,
        hwaccel: codec.includes('nvenc'),
      },
    });
  }, [inputPath, outputPath, codec, preset, crf, resolution, fps, audioBitrate, convert]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: '1px solid var(--border)',
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        Converter
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: 'var(--space-3)' }}>
        <div className="flex flex-col gap-4">
          {/* Input */}
          <Section title="Input">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectInput}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-3)',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                }}
              >
                Browse
              </button>
              <span className="truncate flex-1" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {inputPath || 'No file selected'}
              </span>
            </div>

            {inputInfo && (
              <div
                style={{
                  padding: 'var(--space-2)',
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                }}
              >
                <div>Format: {inputInfo.format?.format_name}</div>
                <div>Duration: {parseFloat(inputInfo.format?.duration || '0').toFixed(1)}s</div>
                {inputInfo.streams?.find((s: any) => s.codec_type === 'video') && (
                  <div>
                    Video: {inputInfo.streams.find((s: any) => s.codec_type === 'video').width}x
                    {inputInfo.streams.find((s: any) => s.codec_type === 'video').height}
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Output */}
          <Section title="Output">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectOutput}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-3)',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                }}
              >
                Save As
              </button>
              <span className="truncate flex-1" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {outputPath || 'No output path'}
              </span>
            </div>
          </Section>

          {/* Codec */}
          <Section title="Codec">
            <div className="flex flex-wrap gap-1">
              {CODECS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCodec(c.value)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: codec === c.value ? 'var(--accent)' : 'var(--surface-3)',
                    color: codec === c.value ? 'var(--black)' : 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {codec.includes('nvenc') && (
              <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4 }}>
                GPU-accelerated encoding via NVENC
              </div>
            )}
          </Section>

          {/* Preset */}
          <Section title="Preset">
            <div className="flex gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPreset(p.value)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: preset === p.value ? 'var(--accent)' : 'var(--surface-3)',
                    color: preset === p.value ? 'var(--black)' : 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Quality */}
          <Section title="Quality (CRF)">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={51}
                value={crf}
                onChange={(e) => setCrf(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ width: 30, fontSize: 11, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                {crf}
              </span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Lower = better quality, larger file
            </div>
          </Section>

          {/* Resolution */}
          <Section title="Resolution">
            <input
              type="text"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="e.g., 1920x1080"
              style={{ padding: '6px 10px', width: '100%' }}
            />
          </Section>

          {/* FPS */}
          <Section title="Frame Rate">
            <div className="flex gap-1">
              {[0, 24, 25, 30, 60].map((f) => (
                <button
                  key={f}
                  onClick={() => setFps(f)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: fps === f ? 'var(--accent)' : 'var(--surface-3)',
                    color: fps === f ? 'var(--black)' : 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  {f === 0 ? 'Same' : f}
                </button>
              ))}
            </div>
          </Section>

          {/* Audio */}
          <Section title="Audio Bitrate">
            <div className="flex gap-1">
              {['64k', '128k', '192k', '256k', '320k'].map((b) => (
                <button
                  key={b}
                  onClick={() => setAudioBitrate(b)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: audioBitrate === b ? 'var(--accent-orange)' : 'var(--surface-3)',
                    color: audioBitrate === b ? 'var(--black)' : 'var(--text-secondary)',
                    fontSize: 10,
                    fontWeight: 500,
                  }}
                >
                  {b}
                </button>
              ))}
            </div>
          </Section>

          {/* Progress */}
          {isProcessing && (
            <Section title="Progress">
              <div
                style={{
                  height: 8,
                  background: 'var(--surface-3)',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progress * 100}%`,
                    height: '100%',
                    background: 'var(--accent)',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                {Math.round(progress * 100)}%
              </div>
            </Section>
          )}

          {/* Convert Button */}
          <button
            onClick={handleConvert}
            disabled={!inputPath || !outputPath || isProcessing}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              background: (!inputPath || !outputPath || isProcessing) ? 'var(--surface-3)' : 'var(--accent)',
              color: (!inputPath || !outputPath || isProcessing) ? 'var(--text-muted)' : 'var(--black)',
              fontWeight: 600,
              fontSize: 13,
              width: '100%',
              marginTop: 'var(--space-2)',
            }}
          >
            {isProcessing ? 'Converting...' : 'Convert'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 'var(--space-2)',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
