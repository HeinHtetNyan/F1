import type { Driver, RaceEvent, AIPrediction, StintData, AIInsight, LapDataPoint } from '../types';

export const TIRE_COLORS: Record<string, string> = {
  S: '#FF1801',
  M: '#FFC906',
  H: '#FFFFFF',
  I: '#39B54A',
  W: '#0067FF',
};

export const TEAM_COLORS: Record<string, string> = {
  VER: '#3671C6', NOR: '#FF8000', LEC: '#E8002D', PIA: '#FF8000',
  HAM: '#27F4D2', RUS: '#27F4D2', SAI: '#E8002D', ANT: '#27F4D2',
  ALO: '#358C75', STR: '#358C75', GAS: '#0093CC', OCO: '#0093CC',
  ALB: '#64C4FF', SAR: '#64C4FF', TSU: '#6692FF', LAW: '#6692FF',
  HUL: '#B6BABD', MAG: '#B6BABD', BOT: '#C92D4B', ZHO: '#C92D4B',
};

export const INITIAL_DRIVERS: Driver[] = [
  { pos: 1,  code: 'VER', name: 'Max Verstappen',    team: 'Red Bull',     tire: 'M', laps: 3, lastLap: '1:12.456', gap: 'LEADER',  interval: '—',       posChange: 0,  fastestLap: false, pitCount: 0 },
  { pos: 2,  code: 'NOR', name: 'Lando Norris',      team: 'McLaren',      tire: 'M', laps: 3, lastLap: '1:12.701', gap: '+0.412',  interval: '+0.412',  posChange: 1,  fastestLap: false, pitCount: 0 },
  { pos: 3,  code: 'LEC', name: 'Charles Leclerc',   team: 'Ferrari',      tire: 'S', laps: 3, lastLap: '1:12.889', gap: '+1.203',  interval: '+0.791',  posChange: -1, fastestLap: false, pitCount: 0 },
  { pos: 4,  code: 'PIA', name: 'Oscar Piastri',     team: 'McLaren',      tire: 'M', laps: 3, lastLap: '1:13.102', gap: '+2.341',  interval: '+1.138',  posChange: 0,  fastestLap: false, pitCount: 0 },
  { pos: 5,  code: 'HAM', name: 'Lewis Hamilton',    team: 'Ferrari',      tire: 'S', laps: 3, lastLap: '1:13.445', gap: '+4.112',  interval: '+1.771',  posChange: 2,  fastestLap: false, pitCount: 0 },
  { pos: 6,  code: 'RUS', name: 'George Russell',    team: 'Mercedes',     tire: 'M', laps: 3, lastLap: '1:13.667', gap: '+5.890',  interval: '+1.778',  posChange: -1, fastestLap: false, pitCount: 0 },
  { pos: 7,  code: 'SAI', name: 'Carlos Sainz',      team: 'Williams',     tire: 'H', laps: 3, lastLap: '1:13.901', gap: '+7.234',  interval: '+1.344',  posChange: 0,  fastestLap: false, pitCount: 0 },
  { pos: 8,  code: 'ANT', name: 'Kimi Antonelli',    team: 'Mercedes',     tire: 'M', laps: 2, lastLap: '1:14.123', gap: '+8.567',  interval: '+1.333',  posChange: 0,  fastestLap: false, pitCount: 0 },
  { pos: 9,  code: 'ALO', name: 'Fernando Alonso',   team: 'Aston Martin', tire: 'H', laps: 3, lastLap: '1:14.345', gap: '+9.991',  interval: '+1.424',  posChange: 1,  fastestLap: false, pitCount: 0 },
  { pos: 10, code: 'STR', name: 'Lance Stroll',      team: 'Aston Martin', tire: 'H', laps: 3, lastLap: '1:14.567', gap: '+11.234', interval: '+1.243',  posChange: -1, fastestLap: false, pitCount: 0 },
  { pos: 11, code: 'GAS', name: 'Pierre Gasly',      team: 'Alpine',       tire: 'S', laps: 3, lastLap: '1:14.789', gap: '+12.890', interval: '+1.656',  posChange: 0,  fastestLap: false, pitCount: 0 },
  { pos: 12, code: 'OCO', name: 'Esteban Ocon',      team: 'Haas',         tire: 'S', laps: 3, lastLap: '1:15.012', gap: '+14.123', interval: '+1.233',  posChange: 3,  fastestLap: false, pitCount: 0 },
  { pos: 13, code: 'ALB', name: 'Alex Albon',        team: 'Williams',     tire: 'M', laps: 2, lastLap: '1:15.234', gap: '+15.456', interval: '+1.333',  posChange: -2, fastestLap: false, pitCount: 0 },
  { pos: 14, code: 'TSU', name: 'Yuki Tsunoda',      team: 'RB',           tire: 'H', laps: 3, lastLap: '1:15.456', gap: '+16.789', interval: '+1.333',  posChange: 0,  fastestLap: false, pitCount: 0 },
  { pos: 15, code: 'HUL', name: 'Nico Hülkenberg',   team: 'Sauber',       tire: 'M', laps: 3, lastLap: '1:15.678', gap: '+18.012', interval: '+1.223',  posChange: 1,  fastestLap: false, pitCount: 0 },
  { pos: 16, code: 'LAW', name: 'Liam Lawson',       team: 'RB',           tire: 'S', laps: 3, lastLap: '1:15.901', gap: '+19.234', interval: '+1.222',  posChange: -1, fastestLap: false, pitCount: 0 },
  { pos: 17, code: 'MAG', name: 'Kevin Magnussen',   team: 'Haas',         tire: 'H', laps: 2, lastLap: '1:16.123', gap: '+20.456', interval: '+1.222',  posChange: 0,  fastestLap: false, pitCount: 0 },
  { pos: 18, code: 'BOT', name: 'Valtteri Bottas',   team: 'Sauber',       tire: 'M', laps: 3, lastLap: '1:16.345', gap: '+21.678', interval: '+1.222',  posChange: 0,  fastestLap: false, pitCount: 0 },
  { pos: 19, code: 'ZHO', name: 'Guanyu Zhou',       team: 'Sauber',       tire: 'S', laps: 3, lastLap: '1:16.567', gap: '+22.901', interval: '+1.223',  posChange: 0,  fastestLap: false, pitCount: 0 },
  { pos: 20, code: 'SAR', name: 'Logan Sargeant',    team: 'Williams',     tire: 'H', laps: 2, lastLap: '1:17.890', gap: '+24.123', interval: '+1.222',  posChange: 0,  fastestLap: false, pitCount: 0 },
];

export const EVENTS_INITIAL: RaceEvent[] = [
  { id: 1, time: 'L3 00:12', type: 'overtake', text: 'HAM overtakes RUS for P5',        color: '#00FF87', fresh: false },
  { id: 2, time: 'L2 58:34', type: 'pit',      text: 'NOR — Pit stop in 2.3s (M→M)',    color: '#FFC906', fresh: false },
  { id: 3, time: 'L2 45:12', type: 'fastest',  text: 'VER sets fastest lap — 1:12.456', color: '#9B59FF', fresh: false },
  { id: 4, time: 'L1 00:00', type: 'flag',     text: 'Green flag — Race underway',       color: '#00FF87', fresh: false },
];

export const AI_PREDICTIONS: AIPrediction[] = [
  { code: 'VER', pitProb: 12, overtakeProb: 8  },
  { code: 'NOR', pitProb: 34, overtakeProb: 22 },
  { code: 'LEC', pitProb: 67, overtakeProb: 41 },
  { code: 'HAM', pitProb: 45, overtakeProb: 55 },
  { code: 'RUS', pitProb: 28, overtakeProb: 18 },
];

export const STINT_DATA: StintData[] = [
  { code: 'VER', stints: [{ tire: 'S', laps: 8 }, { tire: 'M', laps: 3 }] },
  { code: 'NOR', stints: [{ tire: 'M', laps: 11 }] },
  { code: 'LEC', stints: [{ tire: 'S', laps: 5 }, { tire: 'S', laps: 6 }] },
  { code: 'HAM', stints: [{ tire: 'S', laps: 11 }] },
  { code: 'RUS', stints: [{ tire: 'M', laps: 11 }] },
];

export const AI_INSIGHTS: AIInsight[] = [
  { id: 1, type: 'strategy', text: 'VER on a long medium stint — likely targeting a 1-stop. Gap to NOR could be critical in final laps.', time: '0:12 ago' },
  { id: 2, type: 'overtake', text: 'LEC under tire pressure, HAM closing at 0.3s/lap. Overtake window opens in ~4 laps.',                time: '0:34 ago' },
  { id: 3, type: 'weather',  text: 'Track evolution accelerating — lap times improving ~0.2s per lap. Soft tires favor next 8 laps.',    time: '1:02 ago' },
];

export const LAP_TIME_HISTORY: LapDataPoint[] = [
  { lap: 'L1', VER: 73.891, NOR: 74.102, LEC: 74.234, HAM: 74.567 },
  { lap: 'L2', VER: 73.456, NOR: 73.801, LEC: 73.901, HAM: 74.102 },
  { lap: 'L3', VER: 72.456, NOR: 72.701, LEC: 72.889, HAM: 73.445 },
];

export const EVENT_TEMPLATES = [
  (d1: string, d2: string) => ({ type: 'overtake' as const, text: `${d1} overtakes ${d2}`, color: '#00FF87' }),
  (d: string)              => ({ type: 'pit'      as const, text: `${d} — Pit stop in ${(2.1 + Math.random()).toFixed(1)}s`, color: '#FFC906' }),
  (d: string)              => ({ type: 'fastest'  as const, text: `${d} sets purple sector`, color: '#9B59FF' }),
  ()                       => ({ type: 'flag'     as const, text: 'DRS enabled — Turn 5', color: '#0093CC' }),
];
