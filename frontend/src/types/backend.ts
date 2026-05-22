export type ConnectionStatus = 'idle' | 'connecting' | 'live' | 'disconnected';

// Matches app/schemas/leaderboard.py LeaderboardEntry
export interface LeaderboardEntry {
  position:       number;
  driver_number:  number;
  driver_name:    string;
  name_acronym:   string;
  team_name:      string;
  gap_to_leader:  number | null;
  gap_to_ahead:   number | null;
  last_lap_time:  number | null;
  best_lap_time?: number | null;
  tire_compound:  string | null;
  tire_age:       number | null;
  pit_stops:      number;
  drs_enabled:    boolean;
  is_in_pit:      boolean;
}

// REST /api/v1/leaderboard returns Leaderboard wrapper
export interface BackendLeaderboard {
  session_key:        number;
  session_name:       string | null;
  circuit_short_name: string | null;
  country_name:       string | null;
  location:           string | null;
  year:               number | null;
  total_laps:         number | null;
  timestamp:          string;
  entries:            LeaderboardEntry[];
  api_restricted?:    boolean;  // true when data is from Jolpica fallback (OpenF1 locked)
}

// WS events payload (from worker Redis publish) — no id, uses 'metadata' not 'event_metadata'
export interface WsRawEvent {
  event_type:    string;
  driver_number: number | null;
  lap_number:    number | null;
  metadata:      Record<string, unknown> | null;
  timestamp:     string;
}

// REST /api/v1/events → EventResponse (DB schema)
export interface BackendEventResponse {
  id:             number;
  session_key:    number;
  event_type:     string;
  driver_number:  number | null;
  lap_number:     number | null;
  event_metadata: Record<string, unknown> | null;
  timestamp:      string;
}

// WS predictions (compact format from worker broadcast)
export interface WsPrediction {
  driver_number:        number;
  driver:               string;   // name_acronym
  pit_probability:      number;   // 0.0–1.0
  overtake_probability: number;
}

// REST /api/v1/predictions → PredictionResponse (DB schema, one row per prediction_type per driver)
export interface BackendPredictionResponse {
  id:              number;
  session_key:     number;
  driver_number:   number;
  prediction_type: 'pit_stop' | 'overtake' | string;
  probability:     number;
  confidence:      number | null;
  input_features:  Record<string, unknown> | null;
  lap_number:      number | null;
  timestamp:       string;
}

// Team radio (WS + REST /api/v1/radio)
export interface WsRadioEntry {
  driver_number:  number;
  driver_acronym: string;
  driver_name:    string;
  headshot_url:   string | null;
  recording_url:  string | null;
  timestamp:      string;
}

// GPS car position (WS type: "positions")
export interface WsCarPosition {
  driver_number: number;
  x:             number;
  y:             number;
  z:             number;
  date:          string;
}

// WS message envelope
export interface WsMessage {
  type:      'snapshot' | 'delta' | 'events' | 'predictions' | 'radio' | 'positions' | 'ping' | 'api_restricted';
  channel?:  string;
  lap?:      number;
  timestamp?: string;
  data:      unknown;
}
