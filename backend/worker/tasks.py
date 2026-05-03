"""Worker task implementations.

Changes over v1:
- Uses IngestionState for per-session deduplication, staleness detection,
  anomaly counting, and rolling lap-time tracking.
- Redis fallback cache: if OpenF1 returns empty, last successful response
  is served from Redis (key: f1:fallback:<endpoint>).
- AI predictions now use typed feature dataclasses (PitStopFeatures,
  OvertakeFeatures) via the features.py extraction layer.
- Leaderboard delta computation: only changed entries are published on
  most cycles; full snapshot published every N cycles.
- Publishes to three separate Redis channels:
    f1:ch:leaderboard  — snapshot / delta
    f1:ch:events       — new events only
    f1:ch:predictions  — latest prediction batch
"""

import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai import overtake_predictor, pit_stop_predictor
from app.ai.features import build_overtake_features, build_pit_features
from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.redis_client import get_redis
from app.ingestion.normalizer import (
    detect_overtake_events,
    normalize_driver,
    normalize_lap,
    normalize_pit_event,
    normalize_race_control_event,
)
from app.ingestion.openf1_client import OpenF1Client
from app.ingestion.state import IngestionState
from app.models.lap import Lap
from app.schemas.event import EventCreate, EventResponse
from app.schemas.leaderboard import Leaderboard, LeaderboardEntry
from app.schemas.prediction import PredictionCreate, PredictionResponse
from app.services.driver_service import DriverService
from app.services.event_service import EventService
from app.services.leaderboard_service import LeaderboardService
from app.services.prediction_service import PredictionService

logger = get_logger(__name__)
settings = get_settings()

# Module-level singletons — one per worker process
_state = IngestionState()
_poll_count: int = 0
_active_session_key: Optional[int] = None         # tracks current session
_prev_leaderboard_entries: Dict[int, Dict] = {}   # driver_number → entry dict
_seen_radio: set = set()                           # (driver_number, date) dedup
_latest_car_positions: Dict[int, Dict] = {}        # driver_number → {x, y, z, date}


# Redis fallback cache helpers
async def _cache_fallback(key_suffix: str, data: List[Dict]) -> None:
    """Persist a successful API response so we can serve it if the API fails."""
    if not data:
        return
    redis = get_redis()
    await redis.set(
        f"{settings.redis_fallback_prefix}{key_suffix}",
        json.dumps(data),
        ex=60,   # stale after 60 s
    )


async def _get_fallback(key_suffix: str) -> List[Dict]:
    """Return the last cached response for an endpoint (empty list if none)."""
    redis = get_redis()
    raw = await redis.get(f"{settings.redis_fallback_prefix}{key_suffix}")
    if raw:
        logger.warning("Using Redis fallback for '%s'", key_suffix)
        return json.loads(raw)
    return []


async def _fetch_with_fallback(
    coro,                  # awaitable from OpenF1Client
    key_suffix: str,
) -> List[Dict]:
    """Fetch from OpenF1; fall back to Redis cache if result is empty."""
    data: List[Dict] = await coro
    if data:
        await _cache_fallback(key_suffix, data)
    else:
        data = await _get_fallback(key_suffix)
    return data


# Main ingestion + prediction pipeline
async def ingest_and_update(
    client: OpenF1Client,
    db: AsyncSession,
) -> None:
    """Fetch → normalise → persist → predict → broadcast."""
    global _poll_count, _active_session_key, _prev_leaderboard_entries, _seen_radio, _latest_car_positions

    try:
        session_data = await client.get_latest_session()
        if not session_data:
            logger.warning("No active session from OpenF1")
            return

        session_key: int = session_data["session_key"]
        _state.reset_for_session(session_key)

        # On GP change: reset snapshot state, radio dedup, and poll counter
        if session_key != _active_session_key:
            logger.info("New session detected (%s → %s) — resetting broadcast state.", _active_session_key, session_key)
            _active_session_key = session_key
            _prev_leaderboard_entries = {}
            _seen_radio = set()
            _latest_car_positions = {}
            _poll_count = 0   # force snapshot on first cycle of new session

        _state.tick()
        _poll_count += 1

        # Concurrent data fetch with per-endpoint Redis fallback
        (
            raw_drivers,
            raw_positions,
            raw_laps,
            raw_stints,
            raw_pits,
            raw_intervals,
            raw_rc,
        ) = await asyncio.gather(
            _fetch_with_fallback(client.get_drivers(str(session_key)),    "drivers"),
            _fetch_with_fallback(client.get_positions(str(session_key)),  "positions"),
            _fetch_with_fallback(client.get_laps(str(session_key)),       "laps"),
            _fetch_with_fallback(client.get_stints(str(session_key)),     "stints"),
            _fetch_with_fallback(client.get_pit_stops(str(session_key)),  "pits"),
            _fetch_with_fallback(client.get_intervals(str(session_key)),  "intervals"),
            _fetch_with_fallback(client.get_race_control(str(session_key)), "race_control"),
        )

        # 1. Upsert drivers
        driver_svc = DriverService(db)
        for raw in raw_drivers:
            if not raw.get("driver_number"):
                continue
            try:
                await driver_svc.upsert(normalize_driver(raw, session_key))
            except Exception as exc:
                logger.error("Driver upsert error: %s", exc)

        all_drivers = await driver_svc.get_all(session_key=session_key)
        driver_map: Dict[int, Any] = {d.driver_number: d for d in all_drivers}
        await DriverService.cache_drivers(all_drivers)

        # 2. Persist new, non-duplicate, non-stale laps
        for raw in raw_laps:
            dn  = raw.get("driver_number")
            ln  = raw.get("lap_number")
            sk  = raw.get("session_key")
            dur = raw.get("lap_duration")

            # Null guard
            if not (dn and ln and sk):
                _state._null_skip_count += 1
                continue
            # Dedup
            if _state.is_known_lap(sk, dn, ln):
                continue
            # Staleness check
            if _state.is_stale_lap(dn, ln):
                continue

            lap_schema = normalize_lap(raw)
            if lap_schema and dur:
                try:
                    db.add(Lap(**lap_schema.model_dump()))
                    _state.mark_lap(sk, dn, ln)
                    _state.record_lap_time(dn, ln, float(dur))
                except Exception as exc:
                    logger.error("Lap add error driver=%s lap=%s: %s", dn, ln, exc)

        try:
            await db.commit()
        except Exception as exc:
            await db.rollback()
            logger.error("Lap commit error: %s", exc)

        # 3. Build leaderboard
        leaderboard = _build_leaderboard(
            session_key=session_key,
            session_name=session_data.get("session_name"),
            circuit_short_name=session_data.get("circuit_short_name"),
            country_name=session_data.get("country_name"),
            location=session_data.get("location"),
            year=session_data.get("year"),
            total_laps=int(session_data.get("total_laps") or 0) or None,
            raw_positions=raw_positions,
            raw_laps=raw_laps,
            raw_stints=raw_stints,
            raw_intervals=raw_intervals,
            driver_map=driver_map,
        )
        await LeaderboardService.set_live(leaderboard)

        # 4. Event detection
        event_svc = EventService(db)
        new_events: List[EventCreate] = []

        # Pit stops (dedup via IngestionState)
        for raw in raw_pits:
            dn  = raw.get("driver_number")
            sk  = raw.get("session_key")
            sn  = raw.get("stop_number") or 0
            if not (dn and sk):
                continue
            if _state.is_known_pit(sk, dn, sn):
                continue
            evt = normalize_pit_event(raw)
            if evt:
                new_events.append(evt)
                _state.mark_pit(sk, dn, sn)

        # Overtakes (position deltas)
        curr_positions: Dict[int, int] = {}
        current_lap_num: Optional[int] = None
        for pos in raw_positions:
            dn = pos.get("driver_number")
            p  = pos.get("position")
            if dn and p:
                curr_positions[dn] = p
                if current_lap_num is None:
                    current_lap_num = pos.get("lap_number")

        prev_positions = _state.swap_positions(curr_positions)
        if prev_positions:
            new_events.extend(
                detect_overtake_events(prev_positions, curr_positions, session_key, current_lap_num)
            )

        # Race control (dedup via IngestionState)
        for raw in raw_rc:
            sk  = raw.get("session_key")
            dt  = raw.get("date")
            msg = raw.get("message")
            if _state.is_known_rc(sk, dt, msg):
                continue
            evt = normalize_race_control_event(raw)
            if evt:
                new_events.append(evt)
                _state.mark_rc(sk, dt, msg)

        # Persist + cache events
        for evt_schema in new_events:
            try:
                saved = await event_svc.create(evt_schema)
                await EventService.push_to_cache(EventResponse.model_validate(saved))
                logger.info(
                    "Event: %s driver=%s lap=%s",
                    evt_schema.event_type, evt_schema.driver_number, evt_schema.lap_number,
                )
            except Exception as exc:
                await db.rollback()
                logger.error("Event persist error: %s", exc)

        # 5. AI predictions with feature extraction
        stint_map    = _build_stint_map(raw_stints)
        interval_map = _build_interval_map(raw_intervals)
        total_laps   = int(session_data.get("total_laps") or 60)

        pred_svc = PredictionService(db)
        predictions_out: List[PredictionResponse] = []
        driver_predictions: Dict[str, Dict] = {}   # acronym → {pit_probability, overtake_probability}

        # Build a position-to-driver mapping for finding the car directly ahead
        pos_to_driver: Dict[int, int] = {v: k for k, v in curr_positions.items()}

        for driver_number, driver in driver_map.items():
            stint_info    = stint_map.get(driver_number, {})
            interval_info = interval_map.get(driver_number, {})
            lap_trend     = _state.get_lap_trend(driver_number)
            attacker_laps = _state.get_lap_times(driver_number)

            # Find car directly ahead for defender lap times
            ahead_dn: Optional[int] = None
            pos = curr_positions.get(driver_number)
            if pos and pos > 1:
                ahead_dn = pos_to_driver.get(pos - 1)
            defender_laps = _state.get_lap_times(ahead_dn) if ahead_dn else []

            pit_prob = ov_prob = 0.0
            pit_features_dict: Dict = {}
            ov_features_dict: Dict = {}

            # Pit stop prediction
            try:
                pit_f = build_pit_features(
                    stint_info=stint_info,
                    current_lap=current_lap_num or 1,
                    total_laps=total_laps,
                    lap_trend=lap_trend,
                )
                pit_prob, pit_features_dict = pit_stop_predictor.predict(pit_f)
                pit_pred = await pred_svc.create(
                    PredictionCreate(
                        session_key=session_key,
                        driver_number=driver_number,
                        prediction_type="pit_stop",
                        probability=pit_prob,
                        confidence=0.60,
                        input_features=pit_features_dict,
                        lap_number=current_lap_num,
                    )
                )
                predictions_out.append(PredictionResponse.model_validate(pit_pred))
            except Exception as exc:
                logger.debug("Pit prediction error driver=%d: %s", driver_number, exc)

            # Overtake prediction
            try:
                ov_f = build_overtake_features(
                    interval_info=interval_info,
                    attacker_laps=attacker_laps,
                    defender_laps=defender_laps,
                    drs_available=True,
                    driver_number=driver_number,
                    ahead_driver_number=ahead_dn,
                )
                ov_prob, ov_features_dict = overtake_predictor.predict(ov_f)
                ov_pred = await pred_svc.create(
                    PredictionCreate(
                        session_key=session_key,
                        driver_number=driver_number,
                        prediction_type="overtake",
                        probability=ov_prob,
                        confidence=0.55,
                        input_features=ov_features_dict,
                        lap_number=current_lap_num,
                    )
                )
                predictions_out.append(PredictionResponse.model_validate(ov_pred))
            except Exception as exc:
                logger.debug("Overtake prediction error driver=%d: %s", driver_number, exc)

            # Build compact output for broadcast
            acronym = driver.name_acronym or driver.full_name[:3].upper()
            driver_predictions[acronym] = {
                "driver_number": driver_number,
                "driver": acronym,
                "pit_probability": pit_prob,
                "overtake_probability": ov_prob,
            }

        await PredictionService.cache_predictions(predictions_out)

        # 6. Publish to per-domain Redis channels
        redis = get_redis()
        now_iso = datetime.now(timezone.utc).isoformat()
        is_snapshot_cycle = (_poll_count % settings.snapshot_every_n_cycles == 0)

        # leaderboard channel
        lb_entries = [e.model_dump() for e in leaderboard.entries]
        if is_snapshot_cycle:
            lb_payload = json.dumps({
                "channel": "leaderboard",
                "type": "snapshot",
                "lap": current_lap_num,
                "timestamp": now_iso,
                "data": {
                    "session_key":        leaderboard.session_key,
                    "session_name":       leaderboard.session_name,
                    "circuit_short_name": leaderboard.circuit_short_name,
                    "country_name":       leaderboard.country_name,
                    "location":           leaderboard.location,
                    "year":               leaderboard.year,
                    "total_laps":         leaderboard.total_laps,
                    "entries":            lb_entries,
                },
            })
            # Update in-memory snapshot reference
            _prev_leaderboard_entries = {e["driver_number"]: e for e in lb_entries}
        else:
            # Compute delta — only changed entries
            changed = _compute_leaderboard_delta(lb_entries, _prev_leaderboard_entries)
            _prev_leaderboard_entries = {e["driver_number"]: e for e in lb_entries}
            if changed:
                lb_payload = json.dumps({
                    "channel": "leaderboard",
                    "type": "delta",
                    "timestamp": now_iso,
                    "data": {"changes": changed},
                })
            else:
                lb_payload = None   # no change — skip publish

        if lb_payload:
            await redis.publish(settings.redis_channel_leaderboard, lb_payload)

        # events channel (only when new events exist)
        if new_events:
            events_payload = json.dumps({
                "channel": "events",
                "type": "events",
                "timestamp": now_iso,
                "data": [
                    {
                        "event_type": e.event_type,
                        "driver_number": e.driver_number,
                        "lap_number": e.lap_number,
                        "metadata": e.event_metadata,
                        "timestamp": now_iso,
                    }
                    for e in new_events
                ],
            })
            await redis.publish(settings.redis_channel_events, events_payload)

        # predictions channel (every cycle)
        pred_payload = json.dumps({
            "channel": "predictions",
            "type": "predictions",
            "timestamp": now_iso,
            "data": list(driver_predictions.values()),
        })
        await redis.publish(settings.redis_channel_predictions, pred_payload)

        #  radio channel (every 5 cycles ~7.5 s)
        if _poll_count % 5 == 0:
            await _poll_and_broadcast_radio(client, session_key, driver_map, redis, now_iso)

        #location channel (every 2 cycles ~3 s)
        if _poll_count % 2 == 0:
            await _poll_and_broadcast_location(client, session_key, redis, now_iso)

    except Exception as exc:
        logger.exception("Unhandled error in ingest_and_update: %s", exc)


async def _poll_and_broadcast_radio(
    client: OpenF1Client,
    session_key: int,
    driver_map: Dict[int, Any],
    redis: Any,
    now_iso: str,
) -> None:
    """Fetch team radio, push new entries via WS and cache in Redis."""
    global _seen_radio
    try:
        raw_radio = await client.get_team_radio(str(session_key))
        if not raw_radio:
            return

        new_entries = []
        for r in raw_radio:
            dn   = r.get("driver_number")
            date = r.get("date", "")
            key  = (dn, date)
            if key in _seen_radio or not dn:
                continue
            _seen_radio.add(key)

            driver = driver_map.get(dn)
            entry = {
                "driver_number": dn,
                "driver_acronym": (driver.name_acronym or str(dn)) if driver else str(dn),
                "driver_name":    driver.full_name if driver else f"#{dn}",
                "headshot_url":   (driver.headshot_url or None) if driver else None,
                "recording_url":  r.get("recording_url"),
                "timestamp":      date or now_iso,
            }
            new_entries.append(entry)

        if not new_entries:
            return

        # Update Redis list (prepend newest, keep last redis_radio_max)
        existing_raw = await redis.get(settings.redis_radio_key)
        existing: List[Dict] = json.loads(existing_raw) if existing_raw else []
        merged = (new_entries + existing)[: settings.redis_radio_max]
        await redis.set(settings.redis_radio_key, json.dumps(merged), ex=3600)

        radio_payload = json.dumps({
            "channel": "radio",
            "type": "radio",
            "timestamp": now_iso,
            "data": new_entries,
        })
        await redis.publish(settings.redis_channel_radio, radio_payload)
        logger.info("Radio: %d new message(s)", len(new_entries))

    except Exception as exc:
        logger.warning("Radio poll error: %s", exc)


async def _poll_and_broadcast_location(
    client: OpenF1Client,
    session_key: int,
    redis: Any,
    now_iso: str,
) -> None:
    """Fetch the latest GPS positions per car and broadcast to the location channel."""
    global _latest_car_positions
    try:
        from datetime import timedelta
        cutoff = (datetime.now(timezone.utc) - timedelta(seconds=10)).strftime(
            "%Y-%m-%dT%H:%M:%S.%f"
        )
        raw = await client.get_location(str(session_key), date_gt=cutoff)
        if not raw:
            return

        for entry in raw:
            dn = entry.get("driver_number")
            x  = entry.get("x")
            y  = entry.get("y")
            if dn is None or x is None or y is None:
                continue
            date = entry.get("date") or now_iso
            existing = _latest_car_positions.get(dn)
            if existing is None or date > existing.get("date", ""):
                _latest_car_positions[dn] = {
                    "driver_number": dn,
                    "x": float(x),
                    "y": float(y),
                    "z": float(entry.get("z") or 0),
                    "date": date,
                }

        if not _latest_car_positions:
            return

        payload = json.dumps({
            "type": "positions",
            "timestamp": now_iso,
            "data": list(_latest_car_positions.values()),
        })
        await redis.publish(settings.redis_channel_location, payload)

    except Exception as exc:
        logger.warning("Location poll error: %s", exc)


# Delta helpers

def _compute_leaderboard_delta(
    current_entries: List[Dict],
    previous: Dict[int, Dict],
) -> List[Dict]:
    """Return only entries that differ from the previous snapshot."""
    changed: List[Dict] = []
    _WATCHED_FIELDS = ("position", "gap_to_leader", "gap_to_ahead", "last_lap_time", "tire_compound", "tire_age")
    for entry in current_entries:
        dn = entry.get("driver_number")
        prev = previous.get(dn, {})
        if any(entry.get(f) != prev.get(f) for f in _WATCHED_FIELDS):
            changed.append(entry)
    return changed


# Helper builders (unchanged from v1, kept here for locality)

def _build_leaderboard(
    session_key: int,
    session_name: Optional[str],
    raw_positions: List[Dict],
    raw_laps: List[Dict],
    raw_stints: List[Dict],
    raw_intervals: List[Dict],
    driver_map: Dict[int, Any],
    circuit_short_name: Optional[str] = None,
    country_name: Optional[str] = None,
    location: Optional[str] = None,
    year: Optional[int] = None,
    total_laps: Optional[int] = None,
) -> Leaderboard:
    pos_map: Dict[int, int] = {}
    for p in raw_positions:
        dn  = p.get("driver_number")
        pos = p.get("position")
        if dn and pos:
            pos_map[dn] = pos

    # Latest lap time per driver (last entry in laps list wins)
    lap_map: Dict[int, float] = {}
    for lap in raw_laps:
        dn  = lap.get("driver_number")
        dur = lap.get("lap_duration")
        if dn and dur:
            lap_map[dn] = float(dur)

    stint_map    = _build_stint_map(raw_stints)
    interval_map = _build_interval_map(raw_intervals)

    entries: List[LeaderboardEntry] = []
    for driver_number, driver in driver_map.items():
        position = pos_map.get(driver_number, 99)
        stint    = stint_map.get(driver_number, {})
        interval = interval_map.get(driver_number, {})

        gap_raw       = interval.get("gap_to_leader")
        gap_ahead_raw = interval.get("interval")

        # Parse OpenF1 interval strings like "+1.234"
        def _parse_gap(v: Any) -> Optional[float]:
            if isinstance(v, (int, float)):
                return float(v)
            if isinstance(v, str):
                try:
                    return float(v.lstrip("+"))
                except ValueError:
                    pass
            return None

        entries.append(
            LeaderboardEntry(
                position=position,
                driver_number=driver_number,
                driver_name=driver.full_name,
                name_acronym=driver.name_acronym or driver.full_name[:3].upper(),
                team_name=driver.team_name or "Unknown",
                gap_to_leader=_parse_gap(gap_raw),
                gap_to_ahead=_parse_gap(gap_ahead_raw),
                last_lap_time=lap_map.get(driver_number),
                tire_compound=stint.get("compound"),
                tire_age=stint.get("tyre_age_at_start"),
            )
        )

    entries.sort(key=lambda e: e.position)
    return Leaderboard(
        session_key=session_key,
        session_name=session_name,
        circuit_short_name=circuit_short_name,
        country_name=country_name,
        location=location,
        year=year,
        total_laps=total_laps,
        timestamp=datetime.now(timezone.utc).isoformat(),
        entries=entries,
    )


def _build_stint_map(raw_stints: List[Dict]) -> Dict[int, Dict]:
    """Most recent stint per driver (highest stint_number wins)."""
    stint_map: Dict[int, Dict] = {}
    for s in raw_stints:
        dn = s.get("driver_number")
        if not dn:
            continue
        existing = stint_map.get(dn)
        if existing is None or s.get("stint_number", 0) > existing.get("stint_number", 0):
            stint_map[dn] = s
    return stint_map


def _build_interval_map(raw_intervals: List[Dict]) -> Dict[int, Dict]:
    """Latest interval record per driver (last entry wins)."""
    imap: Dict[int, Dict] = {}
    for iv in raw_intervals:
        dn = iv.get("driver_number")
        if dn:
            imap[dn] = iv
    return imap
