"""Heuristic overtake probability predictor.

Accepts an OvertakeFeatures dataclass; uses 3-lap rolling pace delta for
more accurate pace comparisons than single-lap deltas.
"""

from typing import Any, Dict, Tuple

from app.ai.features import OvertakeFeatures


def predict(features: OvertakeFeatures) -> Tuple[float, Dict[str, Any]]:
    """Return (probability 0-1, feature_dict) of an overtake within next 3 laps.

    Swap the body with an ML model call to upgrade — signature stays the same.
    """
    gap = features.gap_to_ahead

    #  gap factor: probability drops sharply beyond 1-second DRS range 
    if gap <= 0:
        gap_factor = 0.0
    elif gap < 0.5:
        gap_factor = 0.75
    elif gap < 1.0:
        gap_factor = 0.55
    elif gap < 2.0:
        gap_factor = 0.25
    else:
        gap_factor = 0.05

    #  DRS multiplier 
    drs_mult = 1.5 if (features.drs_available and features.sector_type == "straight") else 1.0

    #  3-lap pace delta factor (graduated, not stepped) 
    pd = features.last_3_lap_pace_delta
    if pd > 0.5:
        pace_factor = 0.35
    elif pd > 0.2:
        pace_factor = 0.20
    elif pd > 0.0:
        pace_factor = 0.10
    else:
        # Attacker is slower; graduated penalty capped at -0.15
        pace_factor = max(-0.15, pd * 0.30)

    #  tyre freshness advantage 
    tyre_factor = min(max(features.tire_advantage / 0.5, 0.0) * 0.15, 0.15)

    probability = (gap_factor * drs_mult) + pace_factor + tyre_factor
    probability = round(max(0.0, min(1.0, probability)), 4)

    feature_dict: Dict[str, Any] = {
        "gap_to_ahead": gap,
        "last_3_lap_pace_delta": features.last_3_lap_pace_delta,
        "drs_available": features.drs_available,
        "tire_advantage": features.tire_advantage,
        "sector_type": features.sector_type,
        "gap_factor": round(gap_factor, 3),
        "drs_mult": drs_mult,
        "pace_factor": round(pace_factor, 3),
        "tyre_factor": round(tyre_factor, 3),
    }
    return probability, feature_dict
