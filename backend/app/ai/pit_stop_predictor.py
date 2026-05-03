"""Heuristic pit stop probability predictor.

Accepts a PitStopFeatures dataclass so the prediction logic can be replaced
with a trained ML model without changing any caller code.
"""

from typing import Any, Dict, Tuple

from app.ai.features import PitStopFeatures

# Expected stint lengths (laps) per compound — 2024 season approximations
_COMPOUND_LIFE: Dict[str, float] = {
    "SOFT": 20.0,
    "MEDIUM": 30.0,
    "HARD": 42.0,
    "INTERMEDIATE": 25.0,
    "WET": 20.0,
    "HYPERSOFT": 15.0,
    "ULTRASOFT": 18.0,
    "SUPERSOFT": 22.0,
}
_DEFAULT_LIFE = 30.0


def _compound_life(compound: str) -> float:
    return _COMPOUND_LIFE.get(compound.upper(), _DEFAULT_LIFE)


def predict(features: PitStopFeatures) -> Tuple[float, Dict[str, Any]]:
    """Return (probability 0-1, feature_dict) for a pit stop within next 3 laps.

    Swap the body of this function with an ML model call to upgrade to a
    learned predictor — the signature and return type stay the same.
    """
    expected_life = _compound_life(features.tire_compound)
    laps_remaining = features.total_laps - features.current_lap

    # wear factor: rises steeply past 80% of expected compound life
    wear_ratio = features.tire_age / max(expected_life, 1)
    if wear_ratio < 0.6:
        wear_factor = wear_ratio * 0.30
    elif wear_ratio < 0.8:
        wear_factor = 0.18 + (wear_ratio - 0.6) * 0.60
    else:
        wear_factor = 0.30 + (wear_ratio - 0.8) * 1.50
    wear_factor = min(wear_factor, 0.70)

    # lap-time trend factor: slope from linear regression over last N laps
    # 0.1 s/lap degradation rate → +0.20 probability
    trend_factor = min(max(features.lap_time_trend / 0.1, 0.0) * 0.20, 0.30)

    # strategic pit window bonus
    half_race = features.total_laps / 2
    in_pit_window = abs(features.current_lap - half_race) < 5
    strategic_bonus = 0.10 if in_pit_window else 0.0

    # late-race no-pit penalty
    late_race_penalty = 0.30 if laps_remaining < 10 else 0.0

    probability = wear_factor + trend_factor + strategic_bonus - late_race_penalty
    probability = round(max(0.0, min(1.0, probability)), 4)

    feature_dict: Dict[str, Any] = {
        "tire_compound": features.tire_compound,
        "tire_age": features.tire_age,
        "expected_compound_life": expected_life,
        "wear_ratio": round(wear_ratio, 3),
        "lap_time_trend": round(features.lap_time_trend, 4),
        "stint_length": features.stint_length,
        "current_lap": features.current_lap,
        "total_laps": features.total_laps,
        "laps_remaining": laps_remaining,
        "wear_factor": round(wear_factor, 3),
        "trend_factor": round(trend_factor, 3),
        "strategic_bonus": strategic_bonus,
        "late_race_penalty": late_race_penalty,
    }
    return probability, feature_dict
