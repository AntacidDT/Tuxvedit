import { useRef, useCallback, useEffect, useState } from 'react';
import { useTimelineStore, type Clip, type Track } from '../../stores/timelineStore';
import { useTimelineDrag } from '../../hooks/useDragDrop';
import { Icons } from '../Icons';

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
  const totalWidth = Math.max(duration * pixelsPerSecond + 400, 1200);

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
  }, [setSelectedClip]);

  return (
    <div className="flex flex-col h-full select-none">
      {/* Timeline Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)',
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => addTrack('video')}
            className="flex items-center gap-1.5"
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-3)',
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            {Icons.plus}
            <span>Video</span>
          </button>
          <button
            onClick={() => addTrack('audio')}
            className="flex items-center gap-1.5"
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-3)',
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            {Icons.plus}
            <span>Audio</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setZoom(Math.max(10, zoom - 20))}
            style={{ padding: '4px', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)' }}
          >
            {Icons.zoomOut}
          </button>
          <div
            style={{
              width: 100,
              height: 4,
              background: 'var(--surface-4)',
              borderRadius: 2,
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: `${((zoom - 10) / 490) * 100}%`,
                top: -5,
                width: 14,
                height: 14,
                background: 'var(--accent)',
                borderRadius: '50%',
                transform: 'translateX(-50%)',
              }}
            />
          </div>
          <button
            onClick={() => setZoom(Math.min(500, zoom + 20))}
            style={{ padding: '4px', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)' }}
          >
            {Icons.zoomIn}
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: 35 }}>
            {zoom}%
          </span>
        </div>
      </div>

      {/* Timeline Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track Labels */}
        <div
          style={{
            width: 140,
            minWidth: 140,
            borderRight: '1px solid var(--border)',
            background: 'var(--surface-1)',
          }}
        >
          {/* Ruler space */}
          <div style={{ height: 28, borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }} />
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
          style={{ position: 'relative', background: 'var(--surface-0)' }}
          onClick={handleTimelineClick}
          onWheel={handleWheel}
        >
          {/* Ruler */}
          <Ruler duration={duration} pixelsPerSecond={pixelsPerSecond} />

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
                width: 2,
                height: '100%',
                background: 'var(--playhead-color)',
                zIndex: 10,
                pointerEvents: 'none',
                boxShadow: '0 0 8px rgba(255,214,10,0.4)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -2,
                  left: -6,
                  width: 14,
                  height: 14,
                  background: 'var(--playhead-color)',
                  clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
                  filter: 'drop-shadow(0 0 4px rgba(255,214,10,0.5))',
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
      className="flex items-center gap-2"
      style={{
        height: 52,
        padding: '0 12px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-1)',
      }}
    >
      <div style={{ color: track.type === 'video' ? 'var(--accent)' : 'var(--accent-orange)', opacity: 0.7 }}>
        {track.type === 'video' ? Icons.video : Icons.audio}
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, flex: 1, color: 'var(--text-secondary)' }}>{track.name}</span>
      <button
        onClick={onToggleMute}
        style={{
          padding: '3px',
          borderRadius: 'var(--radius-sm)',
          color: track.muted ? 'var(--danger)' : 'var(--text-muted)',
        }}
      >
        {track.muted ? Icons.volumeMuted : Icons.volume}
      </button>
      <button
        onClick={onToggleLock}
        style={{
          padding: '3px',
          borderRadius: 'var(--radius-sm)',
          color: track.locked ? 'var(--accent)' : 'var(--text-muted)',
        }}
      >
        {track.locked ? Icons.lock : Icons.unlock}
      </button>
    </div>
  );
}

function Ruler({ duration, pixelsPerSecond }: {
  duration: number;
  pixelsPerSecond: number;
}) {
  const marks = [];
  const step = pixelsPerSecond > 50 ? 1 : pixelsPerSecond > 20 ? 5 : 10;

  for (let t = 0; t <= duration + 10; t += step) {
    const x = t * pixelsPerSecond;
    const isMajor = t % (step * 5) === 0;
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
        {isMajor && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>
            {formatTimeShort(t)}
          </div>
        )}
        <div style={{ width: isMajor ? 1 : 1, flex: 1, background: isMajor ? 'var(--border-hover)' : 'var(--border)', opacity: isMajor ? 1 : 0.5 }} />
      </div>
    );
  }

  return (
    <div
      style={{
        height: 28,
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
        height: 52,
        borderBottom: '1px solid var(--border)',
        position: 'relative',
        background: 'var(--surface-0)',
      }}
    >
      {track.clips.map((clipId) => {
        const clip = clips[clipId];
        if (!clip) return null;

        const isDragging = dragState?.clipId === clipId;
        const startTime = isDragging ? clip.startTime + dragState.offset : clip.startTime;
        const left = startTime * pixelsPerSecond;
        const width = clip.duration * pixelsPerSecond;

        const isVideo = clip.type === 'video';
        const isVisible = clip.visible !== false;
        const isMuted = clip.muted === true;

        return (
          <div
            key={clipId}
            onMouseDown={(e) => onClipMouseDown(e, clipId)}
            onContextMenu={(e) => onClipContextMenu(e, clipId)}
            style={{
              position: 'absolute',
              left,
              top: 6,
              width: Math.max(width, 24),
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: isVideo
                ? (isVisible
                  ? 'linear-gradient(180deg, rgba(255,214,10,0.9) 0%, rgba(255,180,0,0.9) 100%)'
                  : 'var(--surface-3)')
                : (!isMuted
                  ? 'linear-gradient(180deg, rgba(255,107,0,0.9) 0%, rgba(200,80,0,0.9) 100%)'
                  : 'var(--surface-3)'),
              opacity: !isVisible ? 0.5 : 1,
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              padding: '0 8px',
              overflow: 'hidden',
              border: selectedClipId === clipId
                ? '2px solid var(--white)'
                : '1px solid rgba(255,255,255,0.15)',
              zIndex: isDragging ? 20 : 1,
              boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.5)' : 'none',
              transition: isDragging ? 'none' : 'box-shadow 0.15s ease',
            }}
          >
            {/* Clip content */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span style={{ opacity: 0.6, flexShrink: 0, color: isVideo ? 'var(--black)' : 'var(--black)' }}>
                {isVideo ? Icons.video : Icons.audio}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: (isVideo ? isVisible : !isMuted) ? 'var(--black)' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {clip.sourceName}
              </span>
            </div>

            {/* Quick actions */}
            {width > 80 && (
              <div className="flex items-center gap-0.5" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                {isVideo && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleVisibility(clipId); }}
                    style={{
                      padding: '2px 4px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0,0,0,0.15)',
                      color: isVisible ? 'var(--black)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {isVisible ? Icons.eye : Icons.eyeOff}
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleMute(clipId); }}
                  style={{
                    padding: '2px 4px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0,0,0,0.15)',
                    color: !isMuted ? 'var(--black)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {!isMuted ? Icons.volume : Icons.volumeMuted}
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
