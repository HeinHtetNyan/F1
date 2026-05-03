import { useRaceStore } from '../../store/raceStore';
import { useLiveStore } from '../../store/liveStore';

const TYPE_ICONS: Record<string, string> = {
  overtake: '⟳',
  pit:      '⬡',
  fastest:  '◆',
  flag:     '⚑',
};

// Maximum events shown (keeps DOM lightweight when running for long sessions)
const MAX_VISIBLE = 30;

export function EventTimeline() {
  const liveEvents = useLiveStore(s => s.events);
  const simEvents  = useRaceStore(s => s.events);
  const events     = (liveEvents.length > 0 ? liveEvents : simEvents).slice(0, MAX_VISIBLE);

  return (
    <div className="overflow-y-auto flex-1 min-h-0 scrollbar-thin">
      {events.map((ev, idx) => (
        <div
          key={ev.id}
          className="flex items-start gap-2 px-3 py-1.5 border-b border-[--border]/30 transition-colors hover:bg-[--panel2]"
          style={{
            animation: idx === 0 && ev.fresh
              ? 'event-slide-in 0.25s ease-out'
              : ev.fresh
              ? 'event-flash 1.2s ease-out'
              : undefined,
          }}
        >
          {/* Icon */}
          <div
            className="mt-0.5 w-4 h-4 rounded-sm flex items-center justify-center flex-shrink-0 text-[9px]"
            style={{ backgroundColor: ev.color + '1a', color: ev.color }}
          >
            {TYPE_ICONS[ev.type] ?? '·'}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] text-[--text-primary] leading-tight truncate">
              {ev.text}
            </p>
            <p className="font-mono text-[9px] text-[--text-muted] mt-px">{ev.time}</p>
          </div>

          {/* NEW badge */}
          {ev.fresh && (
            <span className="flex-shrink-0 px-1 py-px rounded text-[7px] font-bold font-mono bg-[--accent] text-black leading-tight">
              NEW
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
