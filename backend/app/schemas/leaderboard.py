from typing import List, Optional

from pydantic import BaseModel


class LeaderboardEntry(BaseModel):
    position: int
    driver_number: int
    driver_name: str
    name_acronym: str
    team_name: str
    gap_to_leader: Optional[float] = None
    gap_to_ahead: Optional[float] = None
    last_lap_time: Optional[float] = None
    best_lap_time: Optional[float] = None
    tire_compound: Optional[str] = None
    tire_age: Optional[int] = None
    pit_stops: int = 0
    drs_enabled: bool = False
    is_in_pit: bool = False


class Leaderboard(BaseModel):
    session_key: int
    session_name: Optional[str] = None
    circuit_short_name: Optional[str] = None
    country_name: Optional[str] = None
    location: Optional[str] = None
    year: Optional[int] = None
    total_laps: Optional[int] = None
    timestamp: str
    entries: List[LeaderboardEntry]
