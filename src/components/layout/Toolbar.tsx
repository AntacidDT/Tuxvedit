import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { useFFmpeg } from '../../hooks/useFFmpeg';
import { useTimelineStore } from '../../stores/timelineStore';

export function Toolbar() {
  const { name, setName } = useProjectStore();
  const { setActivePanel, toggleConverter, converterOpen } = useUIStore();
  const { saveFile, convert, isProcessing } = useFFmpeg();
  const { clips, duration } = useTimelineStore();

  const handleExport = async () => {
    const outputPath = await saveFile();
    if (!outputPath) return;

    // Build filter complex for timeline export
    const videoClips = Object.values(clips).filter((c) => c.type === 'video');
    if (videoClips.length === 0) return;

    // Simple export: concatenate clips
    // In a real app, this would build a complex filter graph
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
        height: 48,
        padding: '0 var(--space-4)',
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--border)',
        // @ts-ignore - Electron specific CSS
        WebkitAppRegion: 'drag',
      } as any}
    >
      {/* Left: Logo & Project Name */}
      <div className="flex items-center gap-3">
        <div
          style={{
            width: 28,
            height: 28,
            background: 'var(--accent)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 14,
            color: 'var(--black)',
          }}
        >
          T
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: 14,
            fontWeight: 500,
            width: 200,
            padding: '4px 8px',
            borderRadius: 'var(--radius-md)',
          }}
          onFocus={(e) => e.target.style.background = 'var(--surface-3)'}
          onBlur={(e) => e.target.style.background = 'transparent'}
        />
      </div>

      {/* Center: Navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => { setActivePanel('media'); toggleConverter(); }}
          style={{
            padding: '6px 16px',
            borderRadius: 'var(--radius-md)',
            background: !converterOpen ? 'var(--surface-3)' : 'transparent',
            color: !converterOpen ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 500,
            fontSize: 13,
            // @ts-ignore
            WebkitAppRegion: 'no-drag',
          } as any}
        >
          Editor
        </button>
        <button
          onClick={toggleConverter}
          style={{
            padding: '6px 16px',
            borderRadius: 'var(--radius-md)',
            background: converterOpen ? 'var(--surface-3)' : 'transparent',
            color: converterOpen ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 500,
            fontSize: 13,
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
          style={{
            padding: '8px 20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent)',
            color: 'var(--black)',
            fontWeight: 600,
            fontSize: 13,
            opacity: isProcessing ? 0.6 : 1,
            // @ts-ignore
            WebkitAppRegion: 'no-drag',
          } as any}
        >
          {isProcessing ? 'Exporting...' : 'Export'}
        </button>
      </div>
    </div>
  );
}
