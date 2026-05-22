import { create } from 'zustand';
import type { Driver, RaceEvent, AIPrediction, StintData, LapDataPoint } from '../types';
import type {
  LeaderboardEntry, WsRawEvent, WsPrediction, WsRadioEntry, WsCarPosition, ConnectionStatus,
} from '../types/backend';

export type RadioMessage  = WsRadioEntry;
export type PosBounds = { minX: number; maxX: number; minY: number; maxY: number };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtLapTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toFixed(3).padStart(6, '0')}`;
}

function fmtGap(sec: number | null | undefined): string {
  if (sec == null || sec <= 0) return '—';
  return `+${sec.toFixed(3)}`;
}

function formatEventTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return '';
  }
}

function mapEventType(eventType: string): RaceEvent['type'] {
  switch (eventType) {
    case 'overtake':    return 'overtake';
    case 'pit_stop':    return 'pit';
    case 'fastest_lap': return 'fastest';
    default:            return 'flag';
  }
}

function mapEventColor(eventType: string): string {
  switch (eventType) {
    case 'overtake':             return '#00FF87';
    case 'pit_stop':             return '#FF8700';
    case 'fastest_lap':          return '#AE00FF';
    case 'red_flag':             return '#FF3333';
    case 'safety_car':           return '#FFF176';
    case 'virtual_safety_car':   return '#FFD54F';
    case 'yellow_flag':          return '#FFD700';
    case 'green_flag':           return '#00FF87';
    case 'drs_enabled':          return '#4FC3F7';
    default:                     return '#6b7280';
  }
}

function buildEventText(
  eventType: string,
  code: string | null,
  metadata: Record<string, unknown> | null,
): string {
  switch (eventType) {
    case 'pit_stop': {
      const dur = metadata?.pit_duration;
      return code
        ? `${code} pit stop${dur != null ? ` (${Number(dur).toFixed(1)}s)` : ''}`
        : 'Pit stop';
    }
    case 'overtake': {
      const before = metadata?.position_before;
      const after  = metadata?.position_after;
      return code && before && after
        ? `${code} P${before} → P${after}`
        : code ? `${code} overtake` : 'Overtake';
    }
    case 'safety_car':         return 'Safety Car deployed';
    case 'virtual_safety_car': return 'Virtual Safety Car';
    case 'yellow_flag':        return 'Yellow Flag';
    case 'green_flag':         return 'Green Flag – Racing resumes';
    case 'red_flag':           return 'Red Flag – Session stopped';
    case 'drs_enabled':        return 'DRS Enabled';
    default:                   return eventType.replace(/_/g, ' ');
  }
}

let _wsEventSeq = 0;

function normalizeWsEvent(
  raw: WsRawEvent,
  numToCode: Record<number, string>,
  fresh: boolean,
): RaceEvent {
  const code = raw.driver_number != null
    ? (numToCode[raw.driver_number] ?? null)
    : null;
  return {
    id:    Date.now() + ++_wsEventSeq,
    time:  formatEventTime(raw.timestamp),
    type:  mapEventType(raw.event_type),
    text:  buildEventText(raw.event_type, code, raw.metadata),
    color: mapEventColor(raw.event_type),
    fresh,
  };
}

// Picks top-4 codes from live entries so the chart works for any driver lineup
function pickChartCodes(entries: LeaderboardEntry[], existing: string[]): string[] {
  if (existing.length === 4) return existing; // locked for this session
  return entries
    .filter(e => e.last_lap_time != null)
    .slice(0, 4)
    .map(e => e.name_acronym);
}

function normalizeDriver(raw: LeaderboardEntry, prevPos?: number): Driver {
  return {
    pos:       raw.position,
    code:      raw.name_acronym,
    name:      raw.driver_name,
    team:      raw.team_name,
    tire:      raw.tire_compound ?? 'M',
    laps:      raw.tire_age      ?? 0,
    lastLap:   raw.last_lap_time != null ? fmtLapTime(raw.last_lap_time) : '—',
    gap:       fmtGap(raw.gap_to_leader),
    interval:  fmtGap(raw.gap_to_ahead),
    posChange: prevPos != null && prevPos !== raw.position
                 ? (prevPos > raw.position ? 1 : -1) : 0,
    fastestLap: false,
    pitCount:   raw.pit_stops,
  };
}

function normalizePrediction(raw: WsPrediction): AIPrediction {
  return {
    code:         raw.driver,
    pitProb:      Math.round(raw.pit_probability      * 100),
    overtakeProb: Math.round(raw.overtake_probability * 100),
  };
}

function deriveStints(drivers: Driver[]): StintData[] {
  return drivers.slice(0, 10).map(d => ({
    code:   d.code,
    stints: [{ tire: d.tire, laps: d.laps }],
  }));
}

// ─── State ────────────────────────────────────────────────────────────────────

export interface SessionInfo {
  sessionKey:  number;
  circuitName: string;
  location:    string;
  countryName: string;
  year:        number;
  totalLaps:   number;
}

interface LiveState {
  drivers:          Driver[];
  events:           RaceEvent[];
  predictions:      AIPrediction[];
  stintData:        StintData[];
  lapHistory:       LapDataPoint[];
  currentLap:       number;
  connectionStatus: ConnectionStatus;
  session:          SessionInfo | null;
  radioMessages:    RadioMessage[];
  chartCodes:       string[];   // top-4 for this session, locked once set
  carPositions:     Record<number, WsCarPosition>;
  _posBounds:       PosBounds | null;
  apiRestricted:    boolean;    // true when OpenF1 API is locked (live session, no auth)

  _numToCode:  Record<number, string>;
  _tireAgeRef: Partial<Record<string, number>>;

  setLeaderboard:        (entries: LeaderboardEntry[], meta?: Partial<SessionInfo>, lap?: number) => void;
  applyLeaderboardDelta: (changes: LeaderboardEntry[])               => void;
  setEvents:             (data: WsRawEvent[])                        => void;
  addEvents:             (data: WsRawEvent[])                        => void;
  setPredictions:        (data: WsPrediction[])                      => void;
  setConnectionStatus:   (s: ConnectionStatus)                       => void;
  setRadioMessages:      (data: RadioMessage[])                      => void;
  addRadioMessages:      (data: RadioMessage[])                      => void;
  setCarPositions:       (data: WsCarPosition[])                     => void;
  setApiRestricted:      (restricted: boolean, meta?: Partial<SessionInfo>) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useLiveStore = create<LiveState>((set, get) => ({
  drivers:          [],
  events:           [],
  predictions:      [],
  stintData:        [],
  lapHistory:       [],
  currentLap:       0,
  connectionStatus: 'idle',
  session:          null,
  radioMessages:    [],
  chartCodes:       [],
  carPositions:     {},
  _posBounds:       null,
  apiRestricted:    false,
  _numToCode:       {},
  _tireAgeRef:      {},

  setLeaderboard: (entries, meta, incomingLap) => {
    const st = get();

    // ── Session change detection ──────────────────────────────────────────
    const incomingKey = meta?.sessionKey ?? null;
    const sessionChanged =
      incomingKey != null &&
      st.session?.sessionKey != null &&
      incomingKey !== st.session.sessionKey;

    // On GP change: wipe all session-scoped data so nothing from the old race leaks
    if (sessionChanged) {
      set({
        events:        [],
        radioMessages: [],
        lapHistory:    [],
        currentLap:    0,
        predictions:   [],
        chartCodes:    [],
        carPositions:  {},
        _posBounds:    null,
        _tireAgeRef:   {},
      });
    }

    // Re-read after potential reset above
    const { drivers: prev, lapHistory, currentLap, _tireAgeRef, chartCodes } = get();

    const prevPos    = new Map(prev.map(d => [d.code, d.pos]));
    const newDrivers = entries
      .map(r => normalizeDriver(r, prevPos.get(r.name_acronym)))
      .sort((a, b) => a.pos - b.pos);

    const numToCode: Record<number, string> = {};
    for (const r of entries) numToCode[r.driver_number] = r.name_acronym;

    // Lock chart codes for this session on first successful leaderboard
    const newChartCodes = pickChartCodes(entries, chartCodes);

    const leader     = entries.find(d => d.position === 1);
    const leaderAge  = leader?.tire_age ?? 0;
    const leaderCode = leader?.name_acronym ?? '';
    const refAge     = leaderCode ? (_tireAgeRef[leaderCode] ?? leaderAge) : leaderAge;

    let newLapHistory = lapHistory;
    let newCurrentLap = currentLap;
    let newTireAgeRef = _tireAgeRef;

    const lapFromMsg = incomingLap ?? currentLap;

    if (leaderAge > refAge || lapFromMsg > currentLap) {
      newCurrentLap = lapFromMsg > currentLap ? lapFromMsg : currentLap + 1;
      const point: LapDataPoint = { lap: `L${newCurrentLap}` };
      for (const code of newChartCodes) {
        const d = entries.find(r => r.name_acronym === code);
        if (d?.last_lap_time != null) point[code] = +d.last_lap_time.toFixed(3);
      }
      newLapHistory = [...lapHistory.slice(-9), point];
      if (leaderCode) newTireAgeRef = { ...newTireAgeRef, [leaderCode]: leaderAge };
    } else if (lapHistory.length === 0) {
      newCurrentLap = lapFromMsg || 1;
      const point: LapDataPoint = { lap: `L${newCurrentLap}` };
      for (const code of newChartCodes) {
        const d = entries.find(r => r.name_acronym === code);
        if (d?.last_lap_time != null) point[code] = +d.last_lap_time.toFixed(3);
      }
      newLapHistory = [point];
      if (leaderCode) newTireAgeRef = { ...newTireAgeRef, [leaderCode]: leaderAge };
    }

    // Build updated session info
    const newSession: SessionInfo | null =
      meta && (meta.circuitName || meta.sessionKey)
        ? {
            sessionKey:  meta.sessionKey  ?? st.session?.sessionKey  ?? 0,
            circuitName: meta.circuitName ?? st.session?.circuitName ?? '',
            location:    meta.location    ?? st.session?.location    ?? '',
            countryName: meta.countryName ?? st.session?.countryName ?? '',
            year:        meta.year        ?? st.session?.year        ?? new Date().getFullYear(),
            totalLaps:   meta.totalLaps   ?? st.session?.totalLaps   ?? 0,
          }
        : st.session;

    set({
      drivers:    newDrivers,
      stintData:  deriveStints(newDrivers),
      lapHistory: newLapHistory,
      currentLap: newCurrentLap,
      chartCodes: newChartCodes,
      _numToCode: numToCode,
      _tireAgeRef: newTireAgeRef,
      ...(newSession !== st.session ? { session: newSession } : {}),
    });
  },

  applyLeaderboardDelta: (changes) => {
    const { drivers } = get();
    const map = new Map(drivers.map(d => [d.code, d]));

    let changed = false;
    for (const upd of changes) {
      const code = upd.name_acronym;
      const d = map.get(code);
      if (!d) continue;

      const newPos = upd.position;
      map.set(code, {
        ...d,
        pos:       newPos,
        posChange: newPos !== d.pos ? (d.pos > newPos ? 1 : -1) : d.posChange,
        gap:       fmtGap(upd.gap_to_leader),
        interval:  fmtGap(upd.gap_to_ahead),
        lastLap:   upd.last_lap_time != null ? fmtLapTime(upd.last_lap_time) : d.lastLap,
        tire:      upd.tire_compound ?? d.tire,
        laps:      upd.tire_age      ?? d.laps,
        pitCount:  upd.pit_stops,
      });
      changed = true;
    }

    if (!changed) return;
    const next = Array.from(map.values()).sort((a, b) => a.pos - b.pos);
    set({ drivers: next, stintData: deriveStints(next) });
  },

  setEvents: (data) => {
    const { _numToCode } = get();
    set({
      events: data.map(e => normalizeWsEvent(e, _numToCode, false)).reverse(),
    });
  },

  addEvents: (data) => {
    const { events: existing, _numToCode } = get();
    const fresh = data.map(e => normalizeWsEvent(e, _numToCode, true));
    if (!fresh.length) return;
    set({ events: [...fresh, ...existing].slice(0, 50) });
  },

  setPredictions: (data) => set({
    predictions: data.map(normalizePrediction),
  }),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  setRadioMessages: (data) => set({ radioMessages: data }),

  addRadioMessages: (data) => {
    if (!data.length) return;
    const { radioMessages } = get();
    set({ radioMessages: [...data, ...radioMessages].slice(0, 30) });
  },

  setCarPositions: (data) => {
    if (!data.length) return;
    const { carPositions, _posBounds } = get();
    const next = { ...carPositions };
    let b = _posBounds ?? { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };

    for (const p of data) {
      if (p.x == null || p.y == null) continue;
      next[p.driver_number] = p;
      if (p.x < b.minX) b = { ...b, minX: p.x };
      if (p.x > b.maxX) b = { ...b, maxX: p.x };
      if (p.y < b.minY) b = { ...b, minY: p.y };
      if (p.y > b.maxY) b = { ...b, maxY: p.y };
    }

    set({ carPositions: next, _posBounds: b });
  },

  setApiRestricted: (restricted, meta) => {
    const { session } = get();
    const updates: Partial<LiveState> = { apiRestricted: restricted };
    if (restricted && meta && (meta.circuitName || meta.sessionKey)) {
      updates.session = {
        sessionKey:  meta.sessionKey  ?? session?.sessionKey  ?? 0,
        circuitName: meta.circuitName ?? session?.circuitName ?? '',
        location:    meta.location    ?? session?.location    ?? '',
        countryName: meta.countryName ?? session?.countryName ?? '',
        year:        meta.year        ?? session?.year        ?? new Date().getFullYear(),
        totalLaps:   meta.totalLaps   ?? session?.totalLaps   ?? 0,
      };
    }
    set(updates as LiveState);
  },
}));
