import { useRef, useCallback, useEffect, useState } from 'react';
import { useTimelineStore, type Clip, type Track } from '../../stores/timelineStore';
import { useTimelineDrag } from '../../hooks/useDragDrop';

export function Timeline() {
  const {
    tracks, clips, currentTime, duration, zoom, scrollX,
    setCurrentTime, setZoom, setScrollX, setSelectedClip,
    selectedClipId, toggleTrackMute, toggleTrackLock,
    toggleClipVisibility, toggleClipMute,
    moveClip, addTrack,
  } = useTimelineStore();

  const timelineRef = useRef<HTMLDivElement>(null);
  const { isDragging, startDrag, getDragOffset, endDrag } = useTimelineDrag();
  const [dragState, setDragState] = useState<{ clipId: string; offset: number } | null>(null);

  const pixelsPerSecond = zoom / 10;
  const totalWidth = Math.max(duration * pixelsPerSecond + 200, 800);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollX;
    const time = x / pixelsPerSecond;
    setCurrentTime(Math.max(0, time));
  }, [scrollX, pixelsPerSecond, setCurrentTime]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(zoom + (e.deltaY > 0 ? -10 : 10));
    } else {
      setScrollX(Math.max(0, scrollX + e.deltaX));
    }
  }, [zoom, scrollX, setZoom, setScrollX]);

  const handleClipMouseDown = useCallback((e: React.MouseEvent, clipId: string) => {
    e.stopPropagation();
    setSelectedClip(clipId);
    const clip = clips[clipId];
    if (clip) {
      startDrag(e, clipId, clip.startTime, clip.trackId);
    }
  }, [clips, setSelectedClip, startDrag]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const offset = getDragOffset(e, pixelsPerSecond);
      if (offset) {
        setDragState({ clipId: offset.clipId, offset: offset.timeOffset });
      }
    };

    const handleMouseUp = () => {
      if (dragState) {
        const clip = clips[dragState.clipId];
        if (clip) {
          const newTime = Math.max(0, clip.startTime + dragState.offset);
          moveClip(dragState.clipId, clip.trackId, newTime);
        }
      }
      setDragState(null);
      endDrag();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragState, clips, pixelsPerSecond, getDragOffset, endDrag, moveClip]);

  const handleContextMenu = useCallback((e: React.MouseEvent, clipId: string) => {
    e.preventDefault();
    setSelectedClip(clipId);
    // Context menu would be shown here
  }, [setSelectedClip]);

  return (
    <div className="flex flex-col h-full select-none">
      {/* Timeline Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: 'var(--space-1) var(--space-3)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)',
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => addTrack('video')}
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-3)',
              fontSize: 11,
              color: 'var(--text-secondary)',
            }}
          >
            + Video Track
          </button>
          <button
            onClick={() => addTrack('audio')}
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-3)',
              fontSize: 11,
              color: 'var(--text-secondary)',
            }}
          >
            + Audio Track
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Zoom:</span>
          <input
            type="range"
            min={10}
            max={500}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ width: 80 }}
          />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 30 }}>{zoom}%</span>
        </div>
      </div>

      {/* Timeline Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track Labels */}
        <div
          style={{
            width: 120,
            minWidth: 120,
            borderRight: '1px solid var(--border)',
            background: 'var(--surface-2)',
          }}
        >
          {/* Ruler space */}
          <div style={{ height: 24, borderBottom: '1px solid var(--border)' }} />
          {tracks.map((track) => (
            <TrackLabel
              key={track.id}
              track={track}
              onToggleMute={() => toggleTrackMute(track.id)}
              onToggleLock={() => toggleTrackLock(track.id)}
            />
          ))}
        </div>

        {/* Clips Area */}
        <div
          ref={timelineRef}
          className="flex-1 overflow-x-auto overflow-y-hidden"
          style={{ position: 'relative' }}
          onClick={handleTimelineClick}
          onWheel={handleWheel}
        >
          {/* Ruler */}
          <Ruler
            duration={duration}
            pixelsPerSecond={pixelsPerSecond}
            currentTime={currentTime}
            scrollX={scrollX}
          />

          {/* Tracks */}
          <div style={{ position: 'relative', width: totalWidth }}>
            {tracks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                clips={clips}
                pixelsPerSecond={pixelsPerSecond}
                selectedClipId={selectedClipId}
                dragState={dragState}
                onClipMouseDown={handleClipMouseDown}
                onClipContextMenu={handleContextMenu}
                onToggleVisibility={toggleClipVisibility}
                onToggleMute={toggleClipMute}
              />
            ))}

            {/* Playhead */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: currentTime * pixelsPerSecond,
                width: 1,
                height: '100%',
                background: 'var(--playhead-color)',
                zIndex: 10,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: -5,
                  width: 10,
                  height: 10,
                  background: 'var(--playhead-color)',
                  clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackLabel({ track, onToggleMute, onToggleLock }: {
  track: Track;
  onToggleMute: () => void;
  onToggleLock: () => void;
}) {
  return (
    <div
      className="flex items-center gap-1"
      style={{
        height: 48,
        padding: '0 var(--space-2)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-2)',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 500, flex: 1 }}>{track.name}</span>
      <button
        onClick={onToggleMute}
        style={{
          padding: '2px 4px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 10,
          color: track.muted ? 'var(--danger)' : 'var(--text-muted)',
          background: track.muted ? 'rgba(255,68,68,0.1)' : 'transparent',
        }}
      >
        {track.muted ? 'M' : 'M'}
      </button>
      <button
        onClick={onToggleLock}
        style={{
          padding: '2px 4px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 10,
          color: track.locked ? 'var(--accent)' : 'var(--text-muted)',
          background: track.locked ? 'rgba(255,214,10,0.1)' : 'transparent',
        }}
      >
        {track.locked ? '&#128274;' : '&#128275;'}
      </button>
    </div>
  );
}

function Ruler({ duration, pixelsPerSecond }: {
  duration: number;
  pixelsPerSecond: number;
  currentTime?: number;
  scrollX?: number;
}) {
  const marks = [];
  const step = pixelsPerSecond > 50 ? 1 : pixelsPerSecond > 20 ? 5 : 10;

  for (let t = 0; t <= duration + 10; t += step) {
    const x = t * pixelsPerSecond;
    marks.push(
      <div
        key={t}
        style={{
          position: 'absolute',
          left: x,
          top: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>
          {formatTimeShort(t)}
        </div>
        <div style={{ width: 1, flex: 1, background: 'var(--border)' }} />
      </div>
    );
  }

  return (
    <div
      style={{
        height: 24,
        borderBottom: '1px solid var(--border)',
        position: 'relative',
        background: 'var(--surface-2)',
        overflow: 'hidden',
      }}
    >
      {marks}
    </div>
  );
}

function TrackRow({ track, clips, pixelsPerSecond, selectedClipId, dragState, onClipMouseDown, onClipContextMenu, onToggleVisibility, onToggleMute }: {
  track: Track;
  clips: Record<string, Clip>;
  pixelsPerSecond: number;
  selectedClipId: string | null;
  dragState: { clipId: string; offset: number } | null;
  onClipMouseDown: (e: React.MouseEvent, clipId: string) => void;
  onClipContextMenu: (e: React.MouseEvent, clipId: string) => void;
  onToggleVisibility: (clipId: string) => void;
  onToggleMute: (clipId: string) => void;
}) {
  return (
    <div
      style={{
        height: 48,
        borderBottom: '1px solid var(--border)',
        position: 'relative',
        background: track.type === 'video' ? 'rgba(255,214,10,0.02)' : 'rgba(255,107,0,0.02)',
      }}
    >
      {track.clips.map((clipId) => {
        const clip = clips[clipId];
        if (!clip) return null;

        const isDragging = dragState?.clipId === clipId;
        const startTime = isDragging ? clip.startTime + dragState.offset : clip.startTime;
        const left = startTime * pixelsPerSecond;
        const width = clip.duration * pixelsPerSecond;

        return (
          <div
            key={clipId}
            onMouseDown={(e) => onClipMouseDown(e, clipId)}
            onContextMenu={(e) => onClipContextMenu(e, clipId)}
            style={{
              position: 'absolute',
              left,
              top: 4,
              width: Math.max(width, 20),
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: clip.type === 'video'
                ? (clip.visible !== false ? 'var(--accent)' : 'var(--surface-3)')
                : (clip.muted !== true ? 'var(--accent-orange)' : 'var(--surface-3)'),
              opacity: clip.visible === false ? 0.4 : 1,
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              padding: '0 6px',
              overflow: 'hidden',
              border: selectedClipId === clipId ? '2px solid var(--white)' : '1px solid rgba(255,255,255,0.1)',
              zIndex: isDragging ? 20 : 1,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--black)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
              }}
            >
              {clip.sourceName}
            </span>

            {/* Quick actions */}
            {width > 60 && (
              <div className="flex items-center gap-1" style={{ marginLeft: 'auto' }}>
                {clip.type === 'video' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleVisibility(clipId); }}
                    style={{
                      fontSize: 10,
                      padding: '1px 3px',
                      borderRadius: 2,
                      background: 'rgba(0,0,0,0.2)',
                      color: 'var(--black)',
                    }}
                  >
                    {clip.visible !== false ? '&#128065;' : '&#128064;'}
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleMute(clipId); }}
                  style={{
                    fontSize: 10,
                    padding: '1px 3px',
                    borderRadius: 2,
                    background: 'rgba(0,0,0,0.2)',
                    color: 'var(--black)',
                  }}
                >
                  {clip.muted !== true ? '&#128266;' : '&#128263;'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatTimeShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
