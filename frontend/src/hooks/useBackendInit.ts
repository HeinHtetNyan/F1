import { useEffect } from 'react';
import { api } from '../api/rest';
import { useLiveStore } from '../store/liveStore';
import { wsClient } from '../websocket/client';
import type { WsRawEvent, WsPrediction } from '../types/backend';

export function useBackendInit() {
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const [leaderboard, events, predictions, radio] = await Promise.allSettled([
        api.leaderboard(),
        api.events(),
        api.predictions(),
        api.radio(),
      ]);

      if (cancelled) return;

      const store = useLiveStore.getState();

      // Leaderboard: extract entries + session metadata from wrapper
      if (leaderboard.status === 'fulfilled') {
        const lb = leaderboard.value;
        store.setLeaderboard(lb.entries ?? [], {
          sessionKey:  lb.session_key        ?? 0,
          circuitName: lb.circuit_short_name ?? '',
          location:    lb.location           ?? '',
          countryName: lb.country_name       ?? '',
          year:        lb.year               ?? new Date().getFullYear(),
          totalLaps:   lb.total_laps         ?? 0,
        });
      }

      // Events: REST uses 'event_metadata'; normalize to WsRawEvent shape
      if (events.status === 'fulfilled') {
        const wsEvents: WsRawEvent[] = events.value.map(e => ({
          event_type:    e.event_type,
          driver_number: e.driver_number,
          lap_number:    e.lap_number,
          metadata:      e.event_metadata,
          timestamp:     typeof e.timestamp === 'string'
                           ? e.timestamp
                           : new Date(e.timestamp as unknown as number).toISOString(),
        }));
        store.setEvents(wsEvents);
      }

      // Predictions: REST returns one row per prediction_type per driver.
      // Group by driver_number and merge pit/overtake probabilities.
      if (predictions.status === 'fulfilled') {
        const leaderboardEntries = leaderboard.status === 'fulfilled'
          ? leaderboard.value.entries
          : [];
        const numToAcronym: Record<number, string> = {};
        for (const e of leaderboardEntries) numToAcronym[e.driver_number] = e.name_acronym;

        const byDriver = new Map<number, WsPrediction>();
        for (const p of predictions.value) {
          if (!byDriver.has(p.driver_number)) {
            byDriver.set(p.driver_number, {
              driver_number:        p.driver_number,
              driver:               numToAcronym[p.driver_number] ?? String(p.driver_number),
              pit_probability:      0,
              overtake_probability: 0,
            });
          }
          const entry = byDriver.get(p.driver_number)!;
          if (p.prediction_type === 'pit_stop')  entry.pit_probability      = p.probability;
          if (p.prediction_type === 'overtake')   entry.overtake_probability = p.probability;
        }

        store.setPredictions([...byDriver.values()]);
      }

      if (radio.status === 'fulfilled' && radio.value.length > 0) {
        store.setRadioMessages(radio.value);
      }

      wsClient.connect();
    }

    init().catch(() => { if (!cancelled) wsClient.connect(); });

    return () => {
      cancelled = true;
      wsClient.disconnect();
    };
  }, []);
}
