import { AI_INSIGHTS } from '../../data/f1Data';
import { SectionHeader } from '../shared/SectionHeader';

const TYPE_COLORS: Record<string, string> = {
  strategy: '#FFC906',
  overtake:  '#00FF87',
  weather:   '#0093CC',
};

const TYPE_LABEL: Record<string, string> = {
  strategy: 'STR',
  overtake: 'OVT',
  weather:  'WX',
};

export function AIInsights() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <SectionHeader
        title="AI Insights"
        accent
        action={
          <span className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-[--accent]/15 text-[--accent]">
            LIVE
          </span>
        }
      />
      <div className="overflow-y-auto flex-1 scrollbar-none">
        {AI_INSIGHTS.map(ins => {
          const color = TYPE_COLORS[ins.type] ?? '#ffffff';
          return (
            <div
              key={ins.id}
              className="px-3 py-2.5 border-b border-[--border]/40 hover:bg-[--panel2] transition-colors"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="font-mono text-[8px] font-bold px-1 py-px rounded"
                  style={{ backgroundColor: color + '22', color }}
                >
                  {TYPE_LABEL[ins.type]}
                </span>
                <span className="font-mono text-[8px] text-[--text-muted]">{ins.time}</span>
              </div>
              <p className="font-mono text-[9px] text-[--text-secondary] leading-relaxed">
                {ins.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
