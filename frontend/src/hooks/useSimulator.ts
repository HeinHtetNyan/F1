import { useEffect } from 'react';
import { useRaceStore } from '../store/raceStore';
import { useUIStore } from '../store/uiStore';
import { useLiveStore } from '../store/liveStore';

export function useSimulator() {
  const tickSimulator  = useRaceStore(s => s.tickSimulator);
  const appState       = useUIStore(s => s.appState);
  const backendLive    = useLiveStore(s => s.connectionStatus === 'live');

  useEffect(() => {
    // Pause simulation when the real backend is streaming data
    if (backendLive) return;
    if (appState !== 'live' && appState !== 'replay') return;
    const id = setInterval(tickSimulator, 1800);
    return () => clearInterval(id);
  }, [appState, tickSimulator, backendLive]);
}
