import { useEffect } from 'react';
import { useUIStore } from './store/uiStore';
import { useSimulator } from './hooks/useSimulator';
import { useBackendInit } from './hooks/useBackendInit';
import { TopBar } from './components/TopBar';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { CenterPanel } from './components/CenterPanel';
import { RightPanel } from './components/RightPanel';
import { PinnedComparison } from './components/PinnedComparison';
import { LoadingOverlay } from './components/overlays/LoadingOverlay';
import { DisconnectedOverlay } from './components/overlays/DisconnectedOverlay';
import { ReplayBanner } from './components/overlays/ReplayBanner';

function AccentSync() {
  const accentColor = useUIStore(s => s.accentColor);
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColor);
  }, [accentColor]);
  return null;
}

export default function App() {
  useSimulator();
  useBackendInit();

  const appState = useUIStore(s => s.appState);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[--bg] text-[--text-primary] relative">
      <AccentSync />

      <TopBar />

      {appState === 'replay' && <ReplayBanner />}

      <div className="flex flex-1 overflow-hidden relative min-h-0">
        {/* Leaderboard: show on lg+ */}
        <div className="hidden lg:contents">
          <LeaderboardPanel />
        </div>

        <CenterPanel />

        {/* Right panel: show on sm+ */}
        <RightPanel />

        <PinnedComparison />
      </div>

      {appState === 'loading'      && <LoadingOverlay />}
      {appState === 'disconnected' && <DisconnectedOverlay />}
    </div>
  );
}
