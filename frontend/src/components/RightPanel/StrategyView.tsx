import { useLiveStore } from '../../store/liveStore';
import { STINT_DATA, TIRE_COLORS, TEAM_COLORS } from '../../data/f1Data';
import type { StintData } from '../../types';

export function StrategyView() {
  const liveStints = useLiveStore(s => s.stintData);
  const stintData: StintData[] = liveStints.length > 0
    ? liveStints.slice(0, 10)
    : STINT_DATA;

  const maxLaps = Math.max(
    ...stintData.map(d => d.stints.reduce((s, st) => s + st.laps, 0)),
    1,
  );

  return (
    <div>
      <div className="flex items-center px-3 py-1.5 border-b border-[--border]">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[--text-secondary] font-semibold">
          Tire Strategy
        </span>
      </div>

      <div className="px-3 py-2 flex flex-col gap-1">
        {stintData.map(d => {
          const color = TEAM_COLORS[d.code] ?? '#ffffff';
          const total = d.stints.reduce((s, st) => s + st.laps, 0);
          return (
            <div key={d.code} className="flex items-center gap-2 h-5">
              <span
                className="font-mono font-bold text-[9px] w-7 flex-shrink-0"
                style={{ color }}
              >
                {d.code}
              </span>
              <div className="flex-1 flex h-3.5 gap-px overflow-hidden rounded-sm">
                {d.stints.map((st, i) => {
                  const tireColor = TIRE_COLORS[st.tire] ?? '#ffffff';
                  const pct = (st.laps / maxLaps) * 100;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-center text-[6px] font-bold font-mono text-black"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: tireColor,
                        opacity: 0.9,
                        minWidth: 10,
                      }}
                      title={`${st.tire} — ${st.laps}L`}
                    >
                      {st.tire}
                    </div>
                  );
                })}
              </div>
              <span className="font-mono text-[8px] text-[--text-muted] w-7 text-right tabular-nums">
                {total}L
              </span>
            </div>
          );
        })}
      </div>

      {/* Tire legend */}
      <div className="flex items-center gap-2.5 flex-wrap px-3 py-1.5 border-t border-[--border]">
        {Object.entries(TIRE_COLORS).map(([k, c]) => (
          <div key={k} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
            <span className="font-mono text-[7px] text-[--text-muted]">{k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
