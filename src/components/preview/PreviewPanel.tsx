import { useRef, useEffect, useState, useCallback } from 'react';
import { useTimelineStore } from '../../stores/timelineStore';
import { useFFmpeg } from '../../hooks/useFFmpeg';

export function PreviewPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentTime, isPlaying, setCurrentTime, setIsPlaying, duration, getClipAtTime } = useTimelineStore();
  const { extractFrame } = useFFmpeg();
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const animRef = useRef<number | null>(null);
  const lastFrameTime = useRef<number>(-1);

  const renderFrame = useCallback(async (time: number) => {
    const clip = getClipAtTime(time);
    if (!clip) {
      // Render black frame
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      setFrameUrl(null);
      return;
    }

    const localTime = time - clip.startTime + clip.sourceStartTime;
    try {
      const url = await extractFrame(clip.sourcePath, localTime);
      setFrameUrl(url);
    } catch {
      setFrameUrl(null);
    }
  }, [getClipAtTime, extractFrame]);

  // Render frame when time changes
  useEffect(() => {
    if (Math.abs(currentTime - lastFrameTime.current) > 0.03) {
      lastFrameTime.current = currentTime;
      renderFrame(currentTime);
    }
  }, [currentTime, renderFrame]);

  // Draw frame on canvas
  useEffect(() => {
    if (!frameUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;

      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    };
    img.src = frameUrl;
  }, [frameUrl]);

  // Playback animation
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
      return;
    }

    let lastTime = performance.now();
    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const newTime = useTimelineStore.getState().currentTime + delta;
      if (newTime >= duration) {
        setCurrentTime(0);
        setIsPlaying(false);
      } else {
        setCurrentTime(newTime);
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, duration, setCurrentTime, setIsPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    setCurrentTime(Math.max(0, Math.min(duration, time)));
  }, [duration, setCurrentTime]);

  const togglePlay = useCallback(() => {
    if (currentTime >= duration) setCurrentTime(0);
    setIsPlaying(!isPlaying);
  }, [currentTime, duration, isPlaying, setCurrentTime, setIsPlaying]);

  const stepFrame = useCallback((direction: -1 | 1) => {
    const fps = 30;
    const newTime = currentTime + direction / fps;
    setCurrentTime(Math.max(0, Math.min(duration, newTime)));
    setIsPlaying(false);
  }, [currentTime, duration, setCurrentTime, setIsPlaying]);

  return (
    <div className="flex flex-col h-full">
      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center" style={{ background: '#000000', position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />

        {/* Time display overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            padding: '2px 8px',
            background: 'rgba(0,0,0,0.7)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Transport Controls */}
      <div
        className="flex items-center gap-4 justify-center"
        style={{
          padding: 'var(--space-2) var(--space-4)',
          background: 'var(--surface-2)',
          borderTop: '1px solid var(--border)',
        }}
      >
        {/* Seek bar */}
        <div
          style={{
            flex: 1,
            height: 4,
            background: 'var(--surface-3)',
            borderRadius: 2,
            cursor: 'pointer',
            position: 'relative',
          }}
          onClick={handleSeek}
        >
          <div
            style={{
              width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
              height: '100%',
              background: 'var(--accent)',
              borderRadius: 2,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: -4,
              left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
              width: 12,
              height: 12,
              background: 'var(--accent)',
              borderRadius: '50%',
              transform: 'translateX(-50%)',
            }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => stepFrame(-1)}
            style={{ padding: '4px 8px', fontSize: 16, color: 'var(--text-secondary)' }}
          >
            {'\u25C0'}
          </button>
          <button
            onClick={togglePlay}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--accent)',
              color: 'var(--black)',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isPlaying ? '\u23F8' : '\u25B6'}
          </button>
          <button
            onClick={() => stepFrame(1)}
            style={{ padding: '4px 8px', fontSize: 16, color: 'var(--text-secondary)' }}
          >
            {'\u25B6'}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}
