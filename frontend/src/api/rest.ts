import type {
  BackendLeaderboard, BackendEventResponse, BackendPredictionResponse, WsRadioEntry,
} from '../types/backend';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return r.json() as Promise<T>;
}

export const api = {
  leaderboard:  () => get<BackendLeaderboard>('/api/v1/leaderboard'),
  events:       () => get<BackendEventResponse[]>('/api/v1/events'),
  predictions:  () => get<BackendPredictionResponse[]>('/api/v1/predictions'),
  radio:        () => get<WsRadioEntry[]>('/api/v1/radio'),
};
