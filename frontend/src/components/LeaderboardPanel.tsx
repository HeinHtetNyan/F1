import { useRaceStore } from '../store/raceStore';
import { useLiveStore } from '../store/liveStore';
import { TIRE_COLORS, TEAM_COLORS } from '../data/f1Data';
import { SectionHeader } from './shared/SectionHeader';
import { useUIStore } from '../store/uiStore';

export function LeaderboardPanel() {
  const liveDrivers = useLiveStore(s => s.drivers);
  const simDrivers  = useRaceStore(s => s.drivers);
  const drivers     = liveDrivers.length > 0 ? liveDrivers : simDrivers;
  const { pinned, setPinned } = useUIStore();

  return (
    <aside className="flex flex-col border-r border-[--border] bg-[--panel] flex-shrink-0 overflow-hidden w-[240px] xl:w-[270px]">
      <SectionHeader title="Leaderboard" accent />

      {/* Column headers */}
      <div
        className="grid font-mono text-[9px] uppercase tracking-widest text-[--text-muted] px-2 border-b border-[--border]"
        style={{ gridTemplateColumns: '22px 36px 1fr 52px 18px 50px', height: 22, alignItems: 'center' }}
      >
        <span>P</span>
        <span>DRV</span>
        <span />
        <span className="text-right">GAP</span>
        <span className="text-center">T</span>
        <span className="text-right">LAST</span>
      </div>

      {/* Driver rows */}
      <div className="overflow-y-auto flex-1 scrollbar-none">
        {drivers.map(d => {
          const teamColor = TEAM_COLORS[d.code] ?? '#ffffff';
          const tireColor = TIRE_COLORS[d.tire]  ?? '#ffffff';
          const isPinned  = pinned === d.code;
          const isTop3    = d.pos <= 3;

          return (
            <div
              key={d.code}
              onClick={() => setPinned(d.code)}
              style={{ height: 32, gridTemplateColumns: '22px 36px 1fr 52px 18px 50px' }}
              className={`grid items-center px-2 cursor-pointer select-none transition-colors border-b border-[--border]/40
                ${isPinned
                  ? 'bg-[--accent]/8 border-l-2 border-l-[--accent]'
                  : 'hover:bg-[--panel2]'}
                ${d.posChange > 0 ? 'animate-[pulse-green_1s_ease-out]' : ''}
                ${d.posChange < 0 ? 'animate-[pulse-red_1s_ease-out]'  : ''}
              `}
            >
              {/* Position */}
              <span className={`font-mono font-bold text-[11px] tabular-nums ${isTop3 ? 'text-[--accent]' : 'text-[--text-secondary]'}`}>
                {d.pos}
              </span>

              {/* Code + arrow */}
              <div className="flex items-center gap-0.5">
                <span className="font-mono font-bold text-[11px]" style={{ color: teamColor }}>
                  {d.code}
                </span>
                {d.posChange !== 0 && (
                  <span className={`text-[7px] font-bold ${d.posChange > 0 ? 'text-[--accent]' : 'text-red-400'}`}>
                    {d.posChange > 0 ? '▲' : '▼'}
                  </span>
                )}
              </div>

              {/* Last name */}
              <span className="font-mono text-[9px] text-[--text-muted] truncate pr-1">
                {d.name.split(' ').slice(-1)[0]}
              </span>

              {/* Gap */}
              <span className="font-mono text-[10px] text-right text-[--text-secondary] tabular-nums">
                {d.gap}
              </span>

              {/* Tire dot */}
              <div className="flex justify-center">
                <span
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[6px] font-bold text-black"
                  style={{ backgroundColor: tireColor }}
                >
                  {d.tire.charAt(0)}
                </span>
              </div>

              {/* Last lap */}
              <div className="text-right">
                <span className={`font-mono text-[10px] tabular-nums ${d.fastestLap ? 'text-[#9B59FF] font-bold' : 'text-[--text-secondary]'}`}>
                  {d.lastLap.replace(/^1:/, '')}
                </span>
              </div>
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
    </aside>
  );
}
