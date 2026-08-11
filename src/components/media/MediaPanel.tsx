import { useCallback } from 'react';
import { useProjectStore, type MediaFile } from '../../stores/projectStore';
import { useFFmpeg } from '../../hooks/useFFmpeg';
import { useTimelineStore } from '../../stores/timelineStore';
import { v4 as uuidv4 } from 'uuid';
import { Icons } from '../Icons';

export function MediaPanel() {
  const { mediaFiles, addMediaFile, removeMediaFile } = useProjectStore();
  const { probe, openFile, extractFrame, getWaveform } = useFFmpeg();
  const { addClip, tracks } = useTimelineStore();

  const handleImport = useCallback(async () => {
    const filePaths = await openFile();
    if (!filePaths || filePaths.length === 0) return;

    for (const filePath of filePaths) {
      try {
        const info = await probe(filePath);
        const videoStream = info.streams.find((s: any) => s.codec_type === 'video');
        const audioStream = info.streams.find((s: any) => s.codec_type === 'audio');
        const duration = parseFloat(info.format.duration);

        let thumbnail: string | undefined;
        if (videoStream) {
          thumbnail = await extractFrame(filePath, 0);
        }

        let waveform: number[] | undefined;
        if (audioStream) {
          try {
            waveform = await getWaveform(filePath, 200);
          } catch {}
        }

        const mediaFile: MediaFile = {
          id: uuidv4(),
          path: filePath,
          name: filePath.split('/').pop() || 'Unknown',
          type: videoStream ? 'video' : 'audio',
          duration,
          width: videoStream?.width,
          height: videoStream?.height,
          thumbnail,
          waveform,
        };

        addMediaFile(mediaFile);
      } catch (err) {
        console.error('Failed to import:', filePath, err);
      }
    }
  }, [probe, openFile, extractFrame, getWaveform, addMediaFile]);

  const handleAddToTimeline = useCallback((file: MediaFile) => {
    const track = tracks.find((t) => t.type === file.type);
    if (!track) return;

    const lastClipEnd = track.clips.reduce((max, clipId) => {
      const clip = useTimelineStore.getState().clips[clipId];
      return clip ? Math.max(max, clip.startTime + clip.duration) : max;
    }, 0);

    addClip(track.id, {
      trackId: track.id,
      sourcePath: file.path,
      sourceName: file.name,
      startTime: lastClipEnd,
      duration: file.duration,
      sourceStartTime: 0,
      type: file.type,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      volume: 1,
      speed: 1,
      visible: true,
      muted: false,
    });
  }, [tracks, addClip]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.2px' }}>Media</span>
        <button
          onClick={handleImport}
          className="flex items-center gap-2"
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent)',
            color: 'var(--black)',
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          {Icons.import}
          Import
        </button>
      </div>

      {/* Media List */}
      <div className="flex-1 overflow-hidden" style={{ padding: '8px' }}>
        {mediaFiles.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full"
            style={{
              border: '2px dashed var(--border)',
              borderRadius: 'var(--radius-lg)',
              margin: '8px',
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>
              {Icons.video}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>No media imported</div>
            <div style={{ fontSize: 12 }}>Drop files here or click Import</div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {mediaFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3"
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-2)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  border: '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface-3)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--surface-2)';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
                onDoubleClick={() => handleAddToTimeline(file)}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    width: 56,
                    height: 40,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-4)',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {file.thumbnail ? (
                    <img
                      src={file.thumbnail}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
                      {file.type === 'video' ? Icons.video : Icons.audio}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="truncate" style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                    {file.name}
                  </div>
                  <div className="flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>{file.type === 'video' && file.width ? `${file.width}x${file.height}` : 'Audio'}</span>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <span>{formatDuration(file.duration)}</span>
                  </div>
                </div>

                {/* Remove */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMediaFile(file.id);
                  }}
                  style={{
                    padding: '4px',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-muted)',
                    opacity: 0.5,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--danger)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  {Icons.x}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
