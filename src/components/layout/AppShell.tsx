import { Toolbar } from './Toolbar';
import { MediaPanel } from '../media/MediaPanel';
import { PreviewPanel } from '../preview/PreviewPanel';
import { Timeline } from '../timeline/Timeline';
import { PropertiesPanel } from '../properties/PropertiesPanel';
import { ConverterPanel } from '../converter/ConverterPanel';
import { useUIStore } from '../../stores/uiStore';

export function AppShell() {
  const { converterOpen } = useUIStore();

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--surface-0)' }}>
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div
          style={{
            width: 320,
            minWidth: 320,
            borderRight: '1px solid var(--border)',
            background: 'var(--surface-1)',
          }}
        >
          {converterOpen ? <ConverterPanel /> : <MediaPanel />}
        </div>

        {/* Center: Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <PreviewPanel />
        </div>

        {/* Right Panel: Properties */}
        <div
          style={{
            width: 300,
            minWidth: 300,
            borderLeft: '1px solid var(--border)',
            background: 'var(--surface-1)',
          }}
        >
          <PropertiesPanel />
        </div>
      </div>

      {/* Bottom: Timeline */}
      <div
        style={{
          height: 240,
          minHeight: 200,
          borderTop: '1px solid var(--border)',
          background: 'var(--surface-1)',
        }}
      >
        <Timeline />
      </div>
    </div>
  );
}
