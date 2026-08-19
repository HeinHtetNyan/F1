import { useLiveStore } from '../store/liveStore';
import type {
  WsMessage, BackendLeaderboard, LeaderboardEntry, WsRawEvent, WsPrediction, WsRadioEntry, WsCarPosition,
} from '../types/backend';

const WS_URL  = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:8000/ws/live';
const BASE_MS = 1_000;
const MAX_MS  = 30_000;

class F1WsClient {
  private ws:     WebSocket | null = null;
  private timer:  ReturnType<typeof setTimeout> | null = null;
  private retries = 0;
  private active  = false;

  connect() {
    this.active = true;
    this._open();
  }

  disconnect() {
    this.active = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.ws?.close();
    this.ws = null;
  }

  send(msg: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private _open() {
    if (!this.active) return;
    if (
      this.ws?.readyState === WebSocket.CONNECTING ||
      this.ws?.readyState === WebSocket.OPEN
    ) return;

    useLiveStore.getState().setConnectionStatus('connecting');

    const ws = new WebSocket(WS_URL);
    this.ws   = ws;

    ws.onopen = () => {
      this.retries = 0;
      useLiveStore.getState().setConnectionStatus('live');
    };

    ws.onmessage = ({ data }) => {
      try { this._route(JSON.parse(data) as WsMessage); }
      catch { /* malformed frame — ignore */ }
    };

    ws.onclose = () => {
      if (!this.active) return;
      useLiveStore.getState().setConnectionStatus('disconnected');
      this._scheduleReconnect();
    };

    ws.onerror = () => { /* onclose fires after onerror */ };
  }

  private _scheduleReconnect() {
    const delay = Math.min(BASE_MS * 2 ** this.retries, MAX_MS);
    this.retries = Math.min(this.retries + 1, 10);
    this.timer   = setTimeout(() => this._open(), delay);
  }

  private _route(msg: WsMessage) {
    const store = useLiveStore.getState();

    if (msg.type === 'ping') return;

    if (msg.type === 'api_restricted' && msg.channel === 'leaderboard') {
      const d = msg.data as BackendLeaderboard;
      store.setApiRestricted(true, {
        sessionKey:  d.session_key        ?? undefined,
        circuitName: d.circuit_short_name ?? undefined,
        location:    d.location           ?? undefined,
        countryName: d.country_name       ?? undefined,
        year:        d.year               ?? undefined,
      });
      return;
    }

    if (msg.type === 'snapshot' && msg.channel === 'leaderboard') {
      const board = msg.data as BackendLeaderboard;
      // api_restricted=true means data is from Jolpica fallback — show banner but still
      // update the leaderboard so the correct circuit map and driver list are displayed
      store.setApiRestricted(board.api_restricted ?? false);
      store.setLeaderboard(board.entries ?? [], {
        sessionKey:  board.session_key        ?? 0,
        circuitName: board.circuit_short_name ?? '',
        location:    board.location           ?? '',
        countryName: board.country_name       ?? '',
        year:        board.year               ?? new Date().getFullYear(),
        totalLaps:   board.total_laps         ?? 0,
      }, msg.lap);
      return;
    }

    if (msg.type === 'delta' && msg.channel === 'leaderboard') {
      const changes = (msg.data as { changes: LeaderboardEntry[] }).changes ?? [];
      store.applyLeaderboardDelta(changes);
      return;
    }

    if (msg.type === 'events') {
      store.addEvents(msg.data as WsRawEvent[]);
      return;
    }

    if (msg.type === 'predictions') {
      store.setPredictions(msg.data as WsPrediction[]);
      return;
    }

    if (msg.type === 'radio') {
      store.addRadioMessages(msg.data as WsRadioEntry[]);
      return;
    }

    if (msg.type === 'positions') {
      store.setCarPositions(msg.data as WsCarPosition[]);
      return;
    }
  }
}

export const wsClient = new F1WsClient();
