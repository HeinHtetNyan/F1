import { useUIStore } from '../store/uiStore';
import { useRaceStore } from '../store/raceStore';
import { TEAM_COLORS, TIRE_COLORS } from '../data/f1Data';

export function PinnedComparison() {
  const { pinned, setPinned } = useUIStore();
  const drivers = useRaceStore(s => s.drivers);

  if (!pinned) return null;

  const driver = drivers.find(d => d.code === pinned);
  if (!driver) return null;

  const teamColor = TEAM_COLORS[pinned] ?? '#ffffff';
  const tireColor = TIRE_COLORS[driver.tire] ?? '#ffffff';

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 px-4 py-3
        bg-[--panel2] border border-[--accent]/30 rounded-lg shadow-lg shadow-black/50"
      style={{ minWidth: 320 }}
    >
      {/* Team color stripe */}
      <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: teamColor }} />

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm" style={{ color: teamColor }}>
            {driver.code}
          </span>
          <span className="font-mono text-[10px] text-[--text-secondary]">{driver.name}</span>
          <span className="font-mono text-[9px] text-[--text-muted]">{driver.team}</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] text-[--text-secondary]">
          <span>P{driver.pos}</span>
          <span>{driver.gap}</span>
          <span className={driver.fastestLap ? 'text-[#9B59FF]' : ''}>{driver.lastLap}</span>
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold text-black"
              style={{ backgroundColor: tireColor }}
            >
              {driver.tire}
            </span>
            <span className="text-[--text-muted]">{driver.laps}L</span>
          </div>
          <span className="text-[--text-muted]">{driver.pitCount} stop{driver.pitCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <button
        onClick={() => setPinned(null)}
        className="ml-auto text-[--text-muted] hover:text-[--text-primary] transition-colors font-mono text-sm"
        title="Unpin"
      >
        ×
      </button>
    </div>
  );
}
