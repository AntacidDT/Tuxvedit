import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { useFFmpeg } from '../../hooks/useFFmpeg';
import { useTimelineStore } from '../../stores/timelineStore';
import { Icons } from '../Icons';

export function Toolbar() {
  const { name, setName } = useProjectStore();
  const { setActivePanel, toggleConverter, converterOpen } = useUIStore();
  const { saveFile, convert, isProcessing } = useFFmpeg();
  const { clips, duration } = useTimelineStore();

  const handleExport = async () => {
    const outputPath = await saveFile();
    if (!outputPath) return;

    const videoClips = Object.values(clips).filter((c) => c.type === 'video');
    if (videoClips.length === 0) return;

    await convert({
      input: videoClips[0].sourcePath,
      output: outputPath,
      options: {
        codec: 'h264_nvenc',
        preset: 'medium',
        crf: 23,
        duration: duration,
      },
    });
  };

  return (
    <div
      className="flex items-center justify-between select-none"
      style={{
        height: 56,
        padding: '0 20px',
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--border)',
        // @ts-ignore
        WebkitAppRegion: 'drag',
      } as any}
    >
      {/* Left: Logo & Project Name */}
      <div className="flex items-center gap-3">
        <div
          style={{
            width: 32,
            height: 32,
            background: 'linear-gradient(135deg, var(--yellow) 0%, var(--orange) 100%)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 16,
            color: 'var(--black)',
            letterSpacing: '-0.5px',
          }}
        >
          T
        </div>
        <div className="flex flex-col">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 600,
              width: 180,
              padding: '2px 6px',
              borderRadius: 'var(--radius-md)',
              letterSpacing: '-0.2px',
            }}
            onFocus={(e) => e.target.style.background = 'var(--surface-3)'}
            onBlur={(e) => e.target.style.background = 'transparent'}
          />
          <span style={{ fontSize: 10, color: 'var(--text-muted)', padding: '0 6px' }}>
            Video Editor
          </span>
        </div>
      </div>

      {/* Center: Segmented Control */}
      <div
        className="flex items-center"
        style={{
          background: 'var(--surface-3)',
          borderRadius: 'var(--radius-lg)',
          padding: '3px',
          gap: '2px',
        }}
      >
        <button
          onClick={() => { setActivePanel('media'); if (converterOpen) toggleConverter(); }}
          style={{
            padding: '7px 20px',
            borderRadius: 'var(--radius-md)',
            background: !converterOpen ? 'var(--accent)' : 'transparent',
            color: !converterOpen ? 'var(--black)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '0.02em',
            // @ts-ignore
            WebkitAppRegion: 'no-drag',
          } as any}
        >
          Editor
        </button>
        <button
          onClick={toggleConverter}
          style={{
            padding: '7px 20px',
            borderRadius: 'var(--radius-md)',
            background: converterOpen ? 'var(--accent)' : 'transparent',
            color: converterOpen ? 'var(--black)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '0.02em',
            // @ts-ignore
            WebkitAppRegion: 'no-drag',
          } as any}
        >
          Converter
        </button>
      </div>

      {/* Right: Export */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          disabled={isProcessing}
          className="flex items-center gap-2"
          style={{
            padding: '9px 24px',
            borderRadius: 'var(--radius-lg)',
            background: isProcessing ? 'var(--surface-4)' : 'linear-gradient(135deg, var(--yellow) 0%, var(--orange) 100%)',
            color: 'var(--black)',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '0.02em',
            opacity: isProcessing ? 0.7 : 1,
            // @ts-ignore
            WebkitAppRegion: 'no-drag',
          } as any}
        >
          {Icons.download}
          {isProcessing ? 'Exporting...' : 'Export'}
        </button>
      </div>
    </div>
  );
}
