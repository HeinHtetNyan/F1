"""Normalize raw OpenF1 API payloads into internal schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from app.schemas.driver import DriverCreate
from app.schemas.event import EventCreate
from app.schemas.lap import LapCreate


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(value[:26], fmt[:len(fmt)])
        except ValueError:
            continue
    return None


def normalize_driver(raw: Dict[str, Any], session_key: int) -> DriverCreate:
    return DriverCreate(
        driver_number=raw["driver_number"],
        full_name=raw.get("full_name") or raw.get("broadcast_name") or "Unknown",
        name_acronym=raw.get("name_acronym"),
        team_name=raw.get("team_name"),
        country_code=raw.get("country_code"),
        headshot_url=raw.get("headshot_url"),
        session_key=session_key,
    )


def normalize_lap(raw: Dict[str, Any]) -> Optional[LapCreate]:
    lap_number = raw.get("lap_number")
    driver_number = raw.get("driver_number")
    session_key = raw.get("session_key")
    if not (lap_number and driver_number and session_key):
        return None
    return LapCreate(
        session_key=session_key,
        driver_number=driver_number,
        lap_number=lap_number,
        lap_duration=raw.get("lap_duration"),
        duration_sector_1=raw.get("duration_sector_1"),
        duration_sector_2=raw.get("duration_sector_2"),
        duration_sector_3=raw.get("duration_sector_3"),
        i1_speed=raw.get("i1_speed"),
        i2_speed=raw.get("i2_speed"),
        st_speed=raw.get("st_speed"),
        is_pit_out_lap=bool(raw.get("is_pit_out_lap", False)),
        date_start=_parse_dt(raw.get("date_start")),
    )


def normalize_pit_event(raw: Dict[str, Any]) -> Optional[EventCreate]:
    session_key = raw.get("session_key")
    driver_number = raw.get("driver_number")
    if not (session_key and driver_number):
        return None
    return EventCreate(
        session_key=session_key,
        event_type="pit_stop",
        driver_number=driver_number,
        lap_number=raw.get("lap_number"),
        event_metadata={
            "pit_duration": raw.get("pit_duration"),
            "stop_number": raw.get("stop_number"),
        },
    )


def normalize_race_control_event(raw: Dict[str, Any]) -> Optional[EventCreate]:
    session_key = raw.get("session_key")
    category = raw.get("category", "").upper()
    message = raw.get("message", "").upper()

    # Map race control messages to internal event types
    event_type: Optional[str] = None
    if "SAFETY CAR" in message:
        event_type = "safety_car"
    elif "VIRTUAL SAFETY CAR" in message or "VSC" in message:
        event_type = "virtual_safety_car"
    elif "YELLOW" in message or category == "FLAG" and "YELLOW" in message:
        event_type = "yellow_flag"
    elif "GREEN" in message and "FLAG" in message:
        event_type = "green_flag"
    elif "RED FLAG" in message:
        event_type = "red_flag"
    elif "DRS" in message and "ENABLED" in message:
        event_type = "drs_enabled"

    if not (session_key and event_type):
        return None

    return EventCreate(
        session_key=session_key,
        event_type=event_type,
        driver_number=raw.get("driver_number"),
        lap_number=raw.get("lap_number"),
        event_metadata={
            "message": raw.get("message"),
            "category": raw.get("category"),
            "flag": raw.get("flag"),
            "sector": raw.get("sector"),
        },
    )


def detect_overtake_events(
    prev_positions: Dict[int, int],
    curr_positions: Dict[int, int],
    session_key: int,
    lap_number: Optional[int] = None,
) -> List[EventCreate]:
    """Compare two position snapshots and emit overtake events."""
    events: List[EventCreate] = []
    for driver_number, curr_pos in curr_positions.items():
        prev_pos = prev_positions.get(driver_number)
        if prev_pos is not None and curr_pos < prev_pos:
            events.append(
                EventCreate(
                    session_key=session_key,
                    event_type="overtake",
                    driver_number=driver_number,
                    lap_number=lap_number,
                    event_metadata={
                        "position_before": prev_pos,
                        "position_after": curr_pos,
                        "positions_gained": prev_pos - curr_pos,
                    },
                )
            )
    return events
