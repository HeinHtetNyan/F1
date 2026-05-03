import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useLiveStore } from '../../store/liveStore';
import { SectionHeader } from '../shared/SectionHeader';
import { TrackMap } from './TrackMap';
import { LapTimeChart } from './LapTimeChart';
import { GapChart } from './GapChart';
import { EventTimeline } from './EventTimeline';

type ChartTab = 'laptime' | 'gap';

export function CenterPanel() {
  const [chartTab, setChartTab] = useState<ChartTab>('laptime');
  const { showTrackMap } = useUIStore();
  const session = useLiveStore(s => s.session);

  const trackSubtitle = session
    ? `${session.circuitName} — ${session.location}`
    : 'Circuit';

  return (
    <main
      className="flex-1 min-w-0 overflow-hidden grid gap-0 h-full"
      style={{
        gridTemplateRows: showTrackMap ? '2fr 1fr 1fr' : '1fr 1fr',
      }}
    >
      {/* Row 1 — Track Map */}
      {showTrackMap && (
        <div className="flex flex-col overflow-hidden border-b border-[--border] min-h-0">
          <SectionHeader title="Track Map" subtitle={trackSubtitle} accent />
          <div className="flex-1 min-h-0 overflow-hidden">
            <TrackMap />
          </div>
        </div>
      )}

      {/* Row 2 — Race Events */}
      <div className="flex flex-col overflow-hidden border-b border-[--border] min-h-0">
        <SectionHeader
          title="Race Events"
          action={<span className="font-mono text-[9px] text-[--text-muted]">Live</span>}
        />
        <EventTimeline />
      </div>

      {/* Row 3 — Charts */}
      <div className="flex flex-col overflow-hidden min-h-0">
        <div className="flex items-center gap-0 px-2 border-b border-[--border] h-9 flex-shrink-0">
          <span className="font-mono text-[9px] text-[--text-muted] uppercase tracking-widest mr-3">
            Charts
          </span>
          {(['laptime', 'gap'] as ChartTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setChartTab(tab)}
              className={`px-3 h-full font-mono text-[9px] uppercase tracking-widest border-b-2 transition-colors ${
                chartTab === tab
                  ? 'border-[--accent] text-[--accent]'
                  : 'border-transparent text-[--text-muted] hover:text-[--text-secondary]'
              }`}
            >
              {tab === 'laptime' ? 'Lap Times' : 'Gap'}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0 p-2 overflow-hidden">
          {chartTab === 'laptime' ? <LapTimeChart /> : <GapChart />}
        </div>
      </div>
    </main>
  );
}
