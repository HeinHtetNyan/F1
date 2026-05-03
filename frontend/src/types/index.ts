export interface Driver {
  pos: number;
  code: string;
  name: string;
  team: string;
  tire: string;
  laps: number;
  lastLap: string;
  gap: string;
  interval: string;
  posChange: number;
  fastestLap: boolean;
  pitCount: number;
}

export interface RaceEvent {
  id: number;
  time: string;
  type: 'overtake' | 'pit' | 'fastest' | 'flag';
  text: string;
  color: string;
  fresh: boolean;
}

export interface AIPrediction {
  code: string;
  pitProb: number;
  overtakeProb: number;
}

export interface Stint {
  tire: string;
  laps: number;
}

export interface StintData {
  code: string;
  stints: Stint[];
}

export interface AIInsight {
  id: number;
  type: 'strategy' | 'overtake' | 'weather';
  text: string;
  time: string;
}

export type AppState = 'live' | 'replay' | 'loading' | 'disconnected';
export type Density = 'compact' | 'comfortable';

export interface LapDataPoint {
  lap: string;
  [driverCode: string]: number | string | undefined;
}
