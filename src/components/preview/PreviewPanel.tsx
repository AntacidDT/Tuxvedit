import { useRef, useEffect, useState, useCallback } from 'react';
import { useTimelineStore } from '../../stores/timelineStore';
import { useFFmpeg } from '../../hooks/useFFmpeg';
import { Icons } from '../Icons';

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

  useEffect(() => {
    if (Math.abs(currentTime - lastFrameTime.current) > 0.03) {
      lastFrameTime.current = currentTime;
      renderFrame(currentTime);
    }
  }, [currentTime, renderFrame]);

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

  const skipToStart = useCallback(() => {
    setCurrentTime(0);
    setIsPlaying(false);
  }, [setCurrentTime, setIsPlaying]);

  const skipToEnd = useCallback(() => {
    setCurrentTime(duration);
    setIsPlaying(false);
  }, [duration, setCurrentTime, setIsPlaying]);

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
            bottom: 12,
            right: 12,
            padding: '4px 10px',
            background: 'rgba(0,0,0,0.75)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
            backdropFilter: 'blur(8px)',
          }}
        >
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Transport Controls */}
      <div
        style={{
          padding: '12px 20px',
          background: 'var(--surface-2)',
          borderTop: '1px solid var(--border)',
        }}
      >
        {/* Seek bar */}
        <div
          style={{
            width: '100%',
            height: 6,
            background: 'var(--surface-4)',
            borderRadius: 3,
            cursor: 'pointer',
            position: 'relative',
            marginBottom: 12,
          }}
          onClick={handleSeek}
        >
          <div
            style={{
              width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--yellow) 0%, var(--orange) 100%)',
              borderRadius: 3,
              transition: 'width 0.05s linear',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: -5,
              left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
              width: 16,
              height: 16,
              background: 'var(--accent)',
              borderRadius: '50%',
              transform: 'translateX(-50%)',
              boxShadow: '0 0 8px rgba(255,214,10,0.4)',
              transition: 'left 0.05s linear',
            }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={skipToStart}
            style={{ padding: '6px', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            {Icons.skipBack}
          </button>
          <button
            onClick={() => stepFrame(-1)}
            style={{ padding: '6px', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            {Icons.stepBack}
          </button>
          <button
            onClick={togglePlay}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--accent)',
              color: 'var(--black)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(255,214,10,0.3)',
            }}
          >
            {isPlaying ? Icons.pause : Icons.play}
          </button>
          <button
            onClick={() => stepFrame(1)}
            style={{ padding: '6px', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            {Icons.stepForward}
          </button>
          <button
            onClick={skipToEnd}
            style={{ padding: '6px', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            {Icons.skipForward}
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
