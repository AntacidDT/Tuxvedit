import React, { useCallback } from 'react';
import { useTimelineStore } from '../../stores/timelineStore';
import { useProjectStore } from '../../stores/projectStore';

export function PropertiesPanel() {
  const { selectedClipId, clips, updateClip } = useTimelineStore();
  const { fps, resolution, setFps, setResolution } = useProjectStore();

  const clip = selectedClipId ? clips[selectedClipId] : null;

  const handleChange = useCallback((key: string, value: number | boolean) => {
    if (selectedClipId) {
      updateClip(selectedClipId, { [key]: value });
    }
  }, [selectedClipId, updateClip]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: '1px solid var(--border)',
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {clip ? 'Properties' : 'Project Settings'}
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: 'var(--space-3)' }}>
        {clip ? (
          <ClipProperties clip={clip} onChange={handleChange} />
        ) : (
          <ProjectSettings
            fps={fps}
            resolution={resolution}
            onFpsChange={setFps}
            onResolutionChange={setResolution}
          />
        )}
      </div>
    </div>
  );
}

function ClipProperties({ clip, onChange }: {
  clip: any;
  onChange: (key: string, value: number | boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Transform */}
      <Section title="Transform">
        <SliderField label="X" value={clip.x} min={-2000} max={2000} step={1} onChange={(v) => onChange('x', v)} />
        <SliderField label="Y" value={clip.y} min={-2000} max={2000} step={1} onChange={(v) => onChange('y', v)} />
        <SliderField label="Scale" value={clip.scale} min={0.1} max={5} step={0.01} onChange={(v) => onChange('scale', v)} />
        <SliderField label="Rotation" value={clip.rotation} min={-360} max={360} step={1} onChange={(v) => onChange('rotation', v)} unit="°" />
        <SliderField label="Opacity" value={clip.opacity} min={0} max={1} step={0.01} onChange={(v) => onChange('opacity', v)} />
      </Section>

      {/* Audio */}
      <Section title="Audio">
        <SliderField label="Volume" value={clip.volume} min={0} max={2} step={0.01} onChange={(v) => onChange('volume', v)} />
        <ToggleField label="Muted" value={clip.muted} onChange={(v) => onChange('muted', v)} />
      </Section>

      {/* Speed */}
      <Section title="Speed">
        <SliderField label="Speed" value={clip.speed} min={0.25} max={4} step={0.05} onChange={(v) => onChange('speed', v)} unit="x" />
      </Section>

      {/* Visibility */}
      <Section title="Visibility">
        <ToggleField label="Visible" value={clip.visible !== false} onChange={(v) => onChange('visible', v)} />
      </Section>

      {/* Info */}
      <Section title="Info">
        <InfoField label="Source" value={clip.sourceName} />
        <InfoField label="Duration" value={`${clip.duration.toFixed(2)}s`} />
        <InfoField label="Type" value={clip.type} />
      </Section>
    </div>
  );
}

function ProjectSettings({ fps, resolution, onFpsChange, onResolutionChange }: {
  fps: number;
  resolution: { width: number; height: number };
  onFpsChange: (fps: number) => void;
  onResolutionChange: (w: number, h: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Section title="Resolution">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={resolution.width}
            onChange={(e) => onResolutionChange(Number(e.target.value), resolution.height)}
            style={{ width: 80, padding: '4px 8px' }}
          />
          <span style={{ color: 'var(--text-muted)' }}>&times;</span>
          <input
            type="number"
            value={resolution.height}
            onChange={(e) => onResolutionChange(resolution.width, Number(e.target.value))}
            style={{ width: 80, padding: '4px 8px' }}
          />
        </div>
        <div className="flex gap-1 mt-2">
          {[
            { label: '720p', w: 1280, h: 720 },
            { label: '1080p', w: 1920, h: 1080 },
            { label: '1440p', w: 2560, h: 1440 },
            { label: '4K', w: 3840, h: 2160 },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => onResolutionChange(preset.w, preset.h)}
              style={{
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                background: resolution.width === preset.w ? 'var(--accent)' : 'var(--surface-3)',
                color: resolution.width === preset.w ? 'var(--black)' : 'var(--text-secondary)',
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Frame Rate">
        <div className="flex gap-1">
          {[24, 25, 30, 60].map((f) => (
            <button
              key={f}
              onClick={() => onFpsChange(f)}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                background: fps === f ? 'var(--accent)' : 'var(--surface-3)',
                color: fps === f ? 'var(--black)' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {f} fps
            </button>
          ))}
        </div>
      </Section>
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
      <div className="flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
}

function SliderField({ label, value, min, max, step, onChange, unit = '' }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ width: 60, fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <span style={{ width: 50, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
        {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(2)) : String(value)}{unit}
      </span>
    </div>
  );
}

function ToggleField({ label, value, onChange }: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: value ? 'var(--accent)' : 'var(--surface-3)',
          position: 'relative',
          transition: 'background 0.2s',
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: value ? 'var(--black)' : 'var(--text-muted)',
            position: 'absolute',
            top: 2,
            left: value ? 18 : 2,
            transition: 'left 0.2s',
          }}
        />
      </button>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );
}
