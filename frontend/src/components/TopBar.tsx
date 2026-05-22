import { useUIStore } from '../store/uiStore';
import { useRaceStore } from '../store/raceStore';
import { useLiveStore } from '../store/liveStore';
import { wsClient } from '../websocket/client';

export function TopBar() {
  const { appState, syncDelay, setSyncDelay } = useUIStore();
  const { lap, raceTime } = useRaceStore();
  const connectionStatus = useLiveStore(s => s.connectionStatus);
  const currentLap       = useLiveStore(s => s.currentLap);
  const session          = useLiveStore(s => s.session);
  const apiRestricted    = useLiveStore(s => s.apiRestricted);

  const displayLap = currentLap > 0 ? currentLap : lap;
  const totalLaps  = session?.totalLaps ?? 0;
  const raceName   = session
    ? `${session.countryName || session.location || session.circuitName} Grand Prix ${session.year}`
    : 'Formula 1';

  const mins = String(Math.floor(raceTime / 60)).padStart(2, '0');
  const secs = String(raceTime % 60).padStart(2, '0');

  function adjustDelay(delta: number) {
    const next = Math.max(0, Math.min(120, syncDelay + delta));
    setSyncDelay(next);
    wsClient.send({ type: 'set_delay', value: next });
  }

  function syncNow() {
    setSyncDelay(0);
    wsClient.send({ type: 'sync_now' });
  }

  const isLive = connectionStatus === 'live';

  return (
    <header
      className="flex items-center justify-between px-3 md:px-4 border-b border-[--border] bg-[--panel] flex-shrink-0 gap-2"
      style={{ height: 44 }}
    >
      {/* Left — brand + race name */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[--accent] font-mono font-bold text-sm tracking-tight">F1</span>
          <span className="hidden sm:block text-[--text-secondary] font-mono text-[10px] uppercase tracking-widest">
            Analytics
          </span>
        </div>

        <div className="hidden sm:block h-4 w-px bg-[--border]" />

        <span className="font-ui font-bold text-[12px] md:text-[13px] text-[--text-primary] uppercase tracking-wide truncate max-w-[140px] md:max-w-[220px] lg:max-w-none">
          {raceName}
        </span>

        <div className="flex items-center gap-2 font-mono text-[10px] md:text-[11px] flex-shrink-0">
          <span className="text-[--text-secondary]">
            <span className="text-[--text-muted] text-[9px] mr-0.5">LAP</span>
            <span className="text-[--text-primary] font-bold tabular-nums">{displayLap}</span>
            {totalLaps > 0 && (
              <span className="text-[--text-muted]">/{totalLaps}</span>
            )}
          </span>
          <span className="text-[--text-primary] font-bold tabular-nums hidden sm:block">
            {mins}:{secs}
          </span>
        </div>
      </div>

      {/* Center — connection status / API restricted notice */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {apiRestricted ? (
          <div className="flex items-center gap-1.5" title="Live session data requires OpenF1 credentials — showing last race results. Set OPENF1_USERNAME and OPENF1_PASSWORD in backend/.env to enable live timing.">
            <span className="w-2 h-2 rounded-full bg-[--text-muted]" />
            <span className="font-mono text-[9px] md:text-[10px] text-[--text-muted] uppercase tracking-widest">
              Last Race Data
            </span>
          </div>
        ) : isLive ? (
          <div className="flex items-center gap-1.5">
            <span className="anim-live-dot w-2 h-2 rounded-full bg-[--accent]" />
            <span className="font-mono text-[9px] md:text-[10px] font-bold text-[--accent] uppercase tracking-widest">
              Live
            </span>
          </div>
        ) : appState === 'replay' ? (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="font-mono text-[9px] md:text-[10px] font-bold text-yellow-400 uppercase tracking-widest">
              Replay
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-[--text-muted]'}`} />
            <span className="font-mono text-[9px] md:text-[10px] text-[--text-muted] uppercase tracking-widest hidden sm:block">
              {connectionStatus === 'connecting' ? 'Connecting' : 'Simulation'}
            </span>
          </div>
        )}
      </div>

      {/* Right — delay controls */}
      <div className="hidden md:flex items-center gap-1 font-mono text-[11px] flex-shrink-0">
        <span className="text-[--text-muted] uppercase tracking-widest text-[9px] mr-1">Delay</span>
        <button
          onClick={() => adjustDelay(-5)}
          className="px-1.5 py-0.5 border border-[--border] text-[--text-secondary] hover:text-[--text-primary] hover:border-[--accent] transition-colors rounded-sm text-[10px]"
        >
          −5s
        </button>
        <span className="w-10 text-center text-[--text-primary] text-[10px] tabular-nums">
          {syncDelay === 0 ? 'Live' : `+${syncDelay}s`}
        </span>
        <button
          onClick={() => adjustDelay(5)}
          className="px-1.5 py-0.5 border border-[--border] text-[--text-secondary] hover:text-[--text-primary] hover:border-[--accent] transition-colors rounded-sm text-[10px]"
        >
          +5s
        </button>
        {syncDelay > 0 && (
          <button
            onClick={syncNow}
            title="Snap to live"
            className="px-1.5 py-0.5 border border-[--accent]/40 text-[--accent] hover:bg-[--accent]/10 transition-colors rounded-sm text-[9px] uppercase tracking-widest ml-0.5"
          >
            ↺
          </button>
        )}
      </div>
    </header>
  );
}
