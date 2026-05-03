import { useUIStore } from '../../store/uiStore';
import { useRaceStore } from '../../store/raceStore';

export function ReplayBanner() {
  const { setAppState } = useUIStore();
  const resetRace      = useRaceStore(s => s.resetRace);
  const lap            = useRaceStore(s => s.lap);

  function handleReset() {
    resetRace();
    setAppState('replay');
  }

  return (
    <div className="absolute top-11 left-0 right-0 z-40 flex items-center justify-center pointer-events-none">
      <div className="flex items-center gap-3 px-4 py-1.5 bg-yellow-400/15 border border-yellow-400/30 rounded-full pointer-events-auto">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
        <span className="font-mono text-[10px] font-bold text-yellow-400 uppercase tracking-widest">
          Replay Mode — Lap {lap}
        </span>
        <button
          onClick={handleReset}
          className="font-mono text-[9px] text-yellow-400/70 hover:text-yellow-400 transition-colors ml-1"
        >
          ↺ Reset
        </button>
        <button
          onClick={() => setAppState('live')}
          className="font-mono text-[9px] text-yellow-400/70 hover:text-yellow-400 transition-colors"
        >
          → Live
        </button>
      </div>
    </div>
  );
}
