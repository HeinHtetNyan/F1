"""Feature extraction layer for AI prediction modules.

Each predictor receives a typed dataclass rather than loose keyword args.
This makes it trivial to swap heuristic models for trained ML models:
only the body of pit_stop_predictor.predict() / overtake_predictor.predict()
needs to change — callers and feature builders are untouched.
"""

from dataclasses import dataclass
from typing import List, Optional


# Feature dataclasses

@dataclass
class PitStopFeatures:
    tire_compound: str          # "SOFT" | "MEDIUM" | "HARD" | ...
    tire_age: int               # laps since this compound was fitted
    stint_length: int           # total laps driven in this stint so far
    lap_time_trend: float       # linear-regression slope (s/lap); positive = degrading
    total_laps: int             # total race distance in laps
    current_lap: int


@dataclass
class OvertakeFeatures:
    gap_to_ahead: float             # seconds gap to the car directly ahead
    last_3_lap_pace_delta: float    # avg pace advantage over last 3 laps (pos = attacker faster)
    drs_available: bool
    tire_advantage: float = 0.0     # compound-age advantage (pos = attacker on fresher tyre)
    sector_type: str = "straight"   # "straight" | "technical"
    driver_number: Optional[int] = None
    ahead_driver_number: Optional[int] = None


# Builder functions

def build_pit_features(
    stint_info: dict,
    current_lap: int,
    total_laps: int,
    lap_trend: float,
) -> PitStopFeatures:
    """Construct PitStopFeatures from raw OpenF1 stint data."""
    compound = str(stint_info.get("compound") or "MEDIUM").upper()
    lap_start = int(stint_info.get("lap_start") or current_lap)
    age_base  = int(stint_info.get("tyre_age_at_start") or 0)
    tire_age  = max(0, age_base + current_lap - lap_start)

    return PitStopFeatures(
        tire_compound=compound,
        tire_age=tire_age,
        stint_length=max(0, current_lap - lap_start),
        lap_time_trend=lap_trend,
        total_laps=total_laps,
        current_lap=current_lap,
    )


def build_overtake_features(
    interval_info: dict,
    attacker_laps: List[float],
    defender_laps: List[float],
    drs_available: bool = True,
    driver_number: Optional[int] = None,
    ahead_driver_number: Optional[int] = None,
) -> OvertakeFeatures:
    """Construct OvertakeFeatures from raw interval and lap-time data.

    OpenF1 returns interval as "+1.234" strings or floats.
    """
    raw = interval_info.get("interval")
    if isinstance(raw, str):
        try:
            gap = float(raw.lstrip("+"))
        except ValueError:
            gap = 999.0
    elif isinstance(raw, (int, float)):
        gap = float(raw)
    else:
        gap = 999.0

    # 3-lap rolling pace delta: positive means attacker is faster
    if len(attacker_laps) >= 3 and len(defender_laps) >= 3:
        pace_delta = round(
            sum(defender_laps[-3:]) / 3 - sum(attacker_laps[-3:]) / 3, 3
        )
    else:
        pace_delta = 0.0

    return OvertakeFeatures(
        gap_to_ahead=gap,
        last_3_lap_pace_delta=pace_delta,
        drs_available=drs_available,
        driver_number=driver_number,
        ahead_driver_number=ahead_driver_number,
    )
