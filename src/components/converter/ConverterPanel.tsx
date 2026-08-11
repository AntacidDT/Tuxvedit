import { useState, useCallback } from 'react';
import { useFFmpeg } from '../../hooks/useFFmpeg';
import { Icons } from '../Icons';

const CODECS = [
  { value: 'h264_nvenc', label: 'H.264', desc: 'NVENC', ext: 'mp4' },
  { value: 'hevc_nvenc', label: 'H.265', desc: 'NVENC', ext: 'mp4' },
  { value: 'av1_nvenc', label: 'AV1', desc: 'NVENC', ext: 'mp4' },
  { value: 'libx264', label: 'H.264', desc: 'CPU', ext: 'mp4' },
  { value: 'libvpx-vp9', label: 'VP9', desc: 'WebM', ext: 'webm' },
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
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          fontWeight: 600,
          fontSize: 14,
          letterSpacing: '-0.2px',
        }}
      >
        Converter
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: '12px' }}>
        <div className="flex flex-col gap-3">
          {/* Input */}
          <Section title="Input File">
            <button
              onClick={handleSelectInput}
              className="flex items-center gap-2 w-full"
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-3)',
                fontSize: 12,
                color: inputPath ? 'var(--text-primary)' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                justifyContent: 'flex-start',
              }}
            >
              {Icons.import}
              <span className="truncate">{inputPath || 'Select input file...'}</span>
            </button>

            {inputInfo && (
              <div
                style={{
                  padding: '10px 12px',
                  background: 'var(--surface-3)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="flex justify-between" style={{ marginBottom: 4 }}>
                  <span>Format</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{inputInfo.format?.format_name}</span>
                </div>
                <div className="flex justify-between" style={{ marginBottom: 4 }}>
                  <span>Duration</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{parseFloat(inputInfo.format?.duration || '0').toFixed(1)}s</span>
                </div>
                {inputInfo.streams?.find((s: any) => s.codec_type === 'video') && (
                  <div className="flex justify-between">
                    <span>Resolution</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      {inputInfo.streams.find((s: any) => s.codec_type === 'video').width}x
                      {inputInfo.streams.find((s: any) => s.codec_type === 'video').height}
                    </span>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Output */}
          <Section title="Output File">
            <button
              onClick={handleSelectOutput}
              className="flex items-center gap-2 w-full"
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-3)',
                fontSize: 12,
                color: outputPath ? 'var(--text-primary)' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                justifyContent: 'flex-start',
              }}
            >
              {Icons.download}
              <span className="truncate">{outputPath || 'Select output path...'}</span>
            </button>
          </Section>

          {/* Codec */}
          <Section title="Codec">
            <div className="flex flex-wrap gap-1.5">
              {CODECS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCodec(c.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: codec === c.value ? 'var(--accent)' : 'var(--surface-3)',
                    color: codec === c.value ? 'var(--black)' : 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 600,
                    border: codec === c.value ? 'none' : '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <span>{c.label}</span>
                  <span style={{ fontSize: 9, opacity: 0.7 }}>{c.desc}</span>
                </button>
              ))}
            </div>
            {codec.includes('nvenc') && (
              <div className="flex items-center gap-1.5" style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                GPU-accelerated encoding via NVENC
              </div>
            )}
          </Section>

          {/* Preset */}
          <Section title="Preset">
            <div className="flex gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPreset(p.value)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: preset === p.value ? 'var(--accent)' : 'var(--surface-3)',
                    color: preset === p.value ? 'var(--black)' : 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 600,
                    border: preset === p.value ? 'none' : '1px solid var(--border)',
                    flex: 1,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Quality */}
          <Section title="Quality (CRF)">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={51}
                value={crf}
                onChange={(e) => setCrf(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ width: 30, fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 600 }}>
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
              style={{ padding: '8px 12px', width: '100%', fontSize: 12 }}
            />
          </Section>

          {/* FPS */}
          <Section title="Frame Rate">
            <div className="flex gap-1.5">
              {[0, 24, 25, 30, 60].map((f) => (
                <button
                  key={f}
                  onClick={() => setFps(f)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: fps === f ? 'var(--accent)' : 'var(--surface-3)',
                    color: fps === f ? 'var(--black)' : 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 600,
                    border: fps === f ? 'none' : '1px solid var(--border)',
                    flex: 1,
                  }}
                >
                  {f === 0 ? 'Same' : f}
                </button>
              ))}
            </div>
          </Section>

          {/* Audio */}
          <Section title="Audio Bitrate">
            <div className="flex gap-1.5">
              {['64k', '128k', '192k', '256k', '320k'].map((b) => (
                <button
                  key={b}
                  onClick={() => setAudioBitrate(b)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: audioBitrate === b ? 'var(--accent-orange)' : 'var(--surface-3)',
                    color: audioBitrate === b ? 'var(--black)' : 'var(--text-secondary)',
                    fontSize: 10,
                    fontWeight: 600,
                    border: audioBitrate === b ? 'none' : '1px solid var(--border)',
                    flex: 1,
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
                  background: 'var(--surface-4)',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progress * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--yellow) 0%, var(--orange) 100%)',
                    transition: 'width 0.3s ease',
                    borderRadius: 4,
                  }}
                />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>
                {Math.round(progress * 100)}%
              </div>
            </Section>
          )}

          {/* Convert Button */}
          <button
            onClick={handleConvert}
            disabled={!inputPath || !outputPath || isProcessing}
            className="flex items-center justify-center gap-2"
            style={{
              padding: '12px 20px',
              borderRadius: 'var(--radius-lg)',
              background: (!inputPath || !outputPath || isProcessing)
                ? 'var(--surface-4)'
                : 'linear-gradient(135deg, var(--yellow) 0%, var(--orange) 100%)',
              color: (!inputPath || !outputPath || isProcessing) ? 'var(--text-muted)' : 'var(--black)',
              fontWeight: 700,
              fontSize: 13,
              width: '100%',
              marginTop: 'var(--space-2)',
              letterSpacing: '0.02em',
            }}
          >
            {isProcessing ? Icons.settings : Icons.download}
            {isProcessing ? 'Converting...' : 'Convert'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-3)',
        }}
      >
        {title}
      </div>
      <div style={{ padding: '12px' }}>
        {children}
      </div>
    </div>
  );
}
