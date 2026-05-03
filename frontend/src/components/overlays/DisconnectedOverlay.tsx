import { useUIStore } from '../../store/uiStore';

export function DisconnectedOverlay() {
  const setAppState = useUIStore(s => s.setAppState);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[--bg]/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 p-8 border border-red-500/30 rounded-lg bg-[--panel]">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="font-mono font-bold text-sm text-red-400 uppercase tracking-widest">
            Connection Lost
          </span>
          <span className="font-mono text-[10px] text-[--text-muted]">
            Unable to reach live telemetry feed
          </span>
        </div>
        <button
          onClick={() => setAppState('live')}
          className="px-4 py-1.5 border border-[--accent] text-[--accent] font-mono text-[10px] uppercase tracking-widest rounded hover:bg-[--accent] hover:text-black transition-colors"
        >
          Reconnect
        </button>
      </div>
    </div>
  );
}
