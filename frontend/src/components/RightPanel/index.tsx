import { useState } from 'react';
import { useLiveStore } from '../../store/liveStore';
import { AIPredictions } from './AIPredictions';
import { StrategyView } from './StrategyView';
import { AIInsights } from './AIInsights';
import { DriverRadio } from './DriverRadio';

type Tab = 'predict' | 'radio' | 'info';

const TABS: { id: Tab; label: string }[] = [
  { id: 'predict', label: 'Predict' },
  { id: 'radio',   label: 'Radio'   },
  { id: 'info',    label: 'Info'    },
];

export function RightPanel() {
  const [tab, setTab] = useState<Tab>('predict');
  const radioCount = useLiveStore(s => s.radioMessages.length);

  return (
    <aside className="hidden sm:flex flex-col border-l border-[--border] bg-[--panel] flex-shrink-0 w-[220px] md:w-[240px] lg:w-[260px] overflow-hidden">
      {/* Tab bar */}
      <div className="flex flex-shrink-0 border-b border-[--border] h-9">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex-1 flex items-center justify-center gap-1 font-mono text-[9px] uppercase tracking-widest transition-colors ${
              tab === t.id
                ? 'text-[--accent] border-b-2 border-[--accent]'
                : 'text-[--text-muted] hover:text-[--text-secondary] border-b-2 border-transparent'
            }`}
          >
            {t.label}
            {t.id === 'radio' && radioCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[--accent] opacity-80" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content — fills remaining height, scrolls internally */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
        {tab === 'predict' && (
          <>
            <AIPredictions />
            <StrategyView />
          </>
        )}
        {tab === 'radio' && <DriverRadio />}
        {tab === 'info'  && <AIInsights />}
      </div>
    </aside>
  );
}
