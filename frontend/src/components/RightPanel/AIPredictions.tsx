import { useLiveStore } from '../../store/liveStore';
import { AI_PREDICTIONS, TEAM_COLORS } from '../../data/f1Data';
import type { AIPrediction } from '../../types';

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
      <div className="flex-1 h-1 bg-[--border] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-mono text-[8px] text-[--text-secondary] w-5 text-right tabular-nums">
        {value}%
      </span>
    </div>
  );
}

export function AIPredictions() {
  const livePredictions = useLiveStore(s => s.predictions);
  const predictions: AIPrediction[] = livePredictions.length > 0
    ? livePredictions.slice(0, 10)
    : AI_PREDICTIONS.slice(0, 10);

  return (
    <div className="border-b border-[--border]">
      {/* Section label */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[--border]">
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-3.5 rounded-sm bg-[--accent]" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[--text-secondary] font-semibold">
            AI Predictions
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[8px] text-[--text-muted] uppercase tracking-widest">
          <span className="text-yellow-400/70">PIT</span>
          <span className="text-[--accent]/70">OVT</span>
        </div>
      </div>

      {/* Driver rows */}
      <div>
        {predictions.map(p => {
          const color = TEAM_COLORS[p.code] ?? '#ffffff';
          return (
            <div
              key={p.code}
              className="flex items-center gap-2 px-3 h-[26px] border-b border-[--border]/30 hover:bg-[--panel2] transition-colors"
            >
              <span
                className="font-mono font-bold text-[10px] w-7 flex-shrink-0"
                style={{ color }}
              >
                {p.code}
              </span>
              <MiniBar value={p.pitProb}      color="#FFC906" />
              <MiniBar value={p.overtakeProb} color="#00FF87" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
