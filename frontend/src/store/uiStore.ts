import { create } from 'zustand';
import type { AppState, Density } from '../types';

interface UIState {
  accentColor:   string;
  showTrackMap:  boolean;
  showAIPanel:   boolean;
  showTelemetry: boolean;
  appState:      AppState;
  density:       Density;
  pinned:        string | null;
  syncDelay:     number;

  setAccentColor:   (c: string) => void;
  setShowTrackMap:  (v: boolean) => void;
  setShowAIPanel:   (v: boolean) => void;
  setShowTelemetry: (v: boolean) => void;
  setAppState:      (s: AppState) => void;
  setDensity:       (d: Density) => void;
  setPinned:        (code: string | null) => void;
  setSyncDelay:     (d: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  accentColor:   '#00FF87',
  showTrackMap:  true,
  showAIPanel:   true,
  showTelemetry: true,
  appState:      'live',
  density:       'comfortable',
  pinned:        null,
  syncDelay:     0,

  setAccentColor:   (c)    => set({ accentColor: c }),
  setShowTrackMap:  (v)    => set({ showTrackMap: v }),
  setShowAIPanel:   (v)    => set({ showAIPanel: v }),
  setShowTelemetry: (v)    => set({ showTelemetry: v }),
  setAppState:      (s)    => set({ appState: s }),
  setDensity:       (d)    => set({ density: d }),
  setPinned:        (code) => set((st) => ({ pinned: st.pinned === code ? null : code })),
  setSyncDelay:     (d)    => set({ syncDelay: d }),
}));
