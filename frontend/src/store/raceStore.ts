import { create } from 'zustand';
import type { Driver, RaceEvent, LapDataPoint } from '../types';
import {
  INITIAL_DRIVERS, EVENTS_INITIAL, LAP_TIME_HISTORY,
  TEAM_COLORS, EVENT_TEMPLATES,
} from '../data/f1Data';

interface RaceState {
  drivers:        Driver[];
  events:         RaceEvent[];
  lap:            number;
  raceTime:       number;
  lapHistory:     LapDataPoint[];
  eventIdCounter: number;

  tickSimulator:  () => void;
  resetRace:      () => void;
}

const CHART_CODES = ['VER', 'NOR', 'LEC', 'HAM'] as const;

export const useRaceStore = create<RaceState>((set, get) => ({
  drivers:        INITIAL_DRIVERS.map(d => ({ ...d })),
  events:         EVENTS_INITIAL,
  lap:            3,
  raceTime:       194,
  lapHistory:     LAP_TIME_HISTORY,
  eventIdCounter: 10,

  tickSimulator: () => {
    const { drivers, events, lap, raceTime, lapHistory, eventIdCounter } = get();

    // Advance race time
    const newRaceTime = raceTime + 1;

    // Update driver lap times + occasional position changes
    const newDrivers = drivers.map(d => {
      const delta  = (Math.random() - 0.5) * 0.3;
      const secs   = 12 + 0.4 * d.pos + delta;
      const lapStr = `1:${secs.toFixed(3).padStart(6, '0')}`;
      return {
        ...d,
        lastLap:   lapStr,
        posChange: Math.random() > 0.92 ? (Math.random() > 0.5 ? 1 : -1) : 0,
      };
    });
    // Mark random fastest lap
    const flIdx = Math.floor(Math.random() * 5);
    newDrivers.forEach((d, i) => { d.fastestLap = i === flIdx && Math.random() > 0.92; });

    // Occasionally add a lap + event
    let newLap = lap;
    let newEvents = events;
    let newCounter = eventIdCounter;
    let newLapHistory = lapHistory;

    if (Math.random() > 0.7) {
      if (Math.random() > 0.85) {
        newLap = lap + 1;
        // Append a new lap history point
        const point: LapDataPoint = { lap: `L${newLap}` };
        for (const code of CHART_CODES) {
          const base = 72.456 + CHART_CODES.indexOf(code) * 0.3;
          point[code] = +(base + (Math.random() - 0.3) * 0.4).toFixed(3);
        }
        newLapHistory = [...lapHistory.slice(-9), point];
      }

      const codes  = INITIAL_DRIVERS.map(d => d.code);
      const tplIdx = Math.floor(Math.random() * EVENT_TEMPLATES.length);
      const tpl    = EVENT_TEMPLATES[tplIdx];
      const evData = tpl(
        codes[Math.floor(Math.random() * 5)],
        codes[Math.floor(Math.random() * 5) + 1],
      );
      const mins = Math.floor(newRaceTime / 60);
      const secs = newRaceTime % 60;
      newCounter++;
      const freshEvent: RaceEvent = {
        id:   newCounter,
        time: `L${newLap} ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
        fresh: true,
        ...evData,
      };
      newEvents = [freshEvent, ...events.slice(0, 29)];

      // Clear "fresh" flag after 1.2s via a simple timeout
      setTimeout(() => {
        set(st => ({
          events: st.events.map(e => ({ ...e, fresh: false })),
        }));
      }, 1200);
    }

    set({
      drivers:        newDrivers,
      raceTime:       newRaceTime,
      lap:            newLap,
      events:         newEvents,
      lapHistory:     newLapHistory,
      eventIdCounter: newCounter,
    });
  },

  resetRace: () => set({
    drivers:        INITIAL_DRIVERS.map(d => ({ ...d })),
    events:         EVENTS_INITIAL,
    lap:            3,
    raceTime:       194,
    lapHistory:     LAP_TIME_HISTORY,
    eventIdCounter: 10,
  }),
}));
