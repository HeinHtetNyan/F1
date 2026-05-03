"""Ingestion state: deduplication, staleness detection, anomaly tracking.

Single IngestionState instance is created in worker/tasks.py and passed
through the ingestion pipeline on every poll cycle.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

from app.core.logging import get_logger

logger = get_logger(__name__)

# Typed dedup keys
LapKey = Tuple[int, int, int]                              # (session_key, driver_number, lap_number)
PitKey = Tuple[int, int, int]                              # (session_key, driver_number, stop_number)
RCKey  = Tuple[Optional[int], Optional[str], Optional[str]]  # (session_key, date, message)


@dataclass
class DriverState:
    last_lap_number: int = 0
    lap_times: List[float] = field(default_factory=list)   # rolling window, max 10


class IngestionState:
    """Mutable state persisted across poll cycles within a single session."""

    def __init__(self) -> None:
        self.session_key: Optional[int] = None
        self.drivers: Dict[int, DriverState] = {}
        self.known_lap_keys: Set[LapKey] = set()
        self.known_pit_keys: Set[PitKey] = set()
        self.known_rc_keys: Set[RCKey] = set()
        self.prev_positions: Dict[int, int] = {}
        self._dup_count: int = 0
        self._stale_count: int = 0
        self._null_skip_count: int = 0
        self._poll_count: int = 0

    # Session lifecycle

    def reset_for_session(self, new_key: int) -> None:
        """Clear all state when the active session changes."""
        if self.session_key == new_key:
            return
        logger.info(
            "Session changed %s → %s — resetting ingestion state.",
            self.session_key, new_key,
        )
        self.__init__()
        self.session_key = new_key

    # Lap deduplication / staleness

    def is_known_lap(self, session_key: int, driver_number: int, lap_number: int) -> bool:
        if (session_key, driver_number, lap_number) in self.known_lap_keys:
            self._dup_count += 1
            return True
        return False

    def mark_lap(self, session_key: int, driver_number: int, lap_number: int) -> None:
        self.known_lap_keys.add((session_key, driver_number, lap_number))

    def is_stale_lap(self, driver_number: int, lap_number: int) -> bool:
        ds = self.drivers.get(driver_number)
        if ds and lap_number < ds.last_lap_number:
            self._stale_count += 1
            logger.debug(
                "Stale lap skipped: driver=%d lap=%d (last_known=%d)",
                driver_number, lap_number, ds.last_lap_number,
            )
            return True
        return False

    def record_lap_time(self, driver_number: int, lap_number: int, lap_time: float) -> None:
        ds = self.drivers.setdefault(driver_number, DriverState())
        ds.last_lap_number = max(ds.last_lap_number, lap_number)
        ds.lap_times.append(lap_time)
        if len(ds.lap_times) > 10:
            ds.lap_times = ds.lap_times[-10:]

    def get_lap_times(self, driver_number: int) -> List[float]:
        ds = self.drivers.get(driver_number)
        return list(ds.lap_times) if ds else []

    def get_lap_trend(self, driver_number: int, window: int = 5) -> float:
        """Linear-regression slope of the last N lap times (s/lap).
        Positive value means lap times are getting slower (degrading)."""
        times = self.get_lap_times(driver_number)[-window:]
        n = len(times)
        if n < 2:
            return 0.0
        x_mean = (n - 1) / 2.0
        y_mean = sum(times) / n
        num = sum((i - x_mean) * (t - y_mean) for i, t in enumerate(times))
        den = sum((i - x_mean) ** 2 for i in range(n))
        return round(num / den, 4) if den else 0.0

    # Pit stop deduplication

    def is_known_pit(self, session_key: int, driver_number: int, stop_number: int) -> bool:
        if (session_key, driver_number, stop_number) in self.known_pit_keys:
            self._dup_count += 1
            return True
        return False

    def mark_pit(self, session_key: int, driver_number: int, stop_number: int) -> None:
        self.known_pit_keys.add((session_key, driver_number, stop_number))

    # Race-control deduplication

    def is_known_rc(
        self,
        session_key: Optional[int],
        date: Optional[str],
        message: Optional[str],
    ) -> bool:
        if (session_key, date, message) in self.known_rc_keys:
            self._dup_count += 1
            return True
        return False

    def mark_rc(
        self,
        session_key: Optional[int],
        date: Optional[str],
        message: Optional[str],
    ) -> None:
        self.known_rc_keys.add((session_key, date, message))

    # Position tracking (overtake detection)

    def swap_positions(self, new_positions: Dict[int, int]) -> Dict[int, int]:
        """Atomically replace positions; return the previous snapshot."""
        prev = dict(self.prev_positions)
        self.prev_positions = dict(new_positions)
        return prev

    # Anomaly / stats reporting

    def tick(self) -> None:
        """Call once per poll cycle; logs stats every 100 cycles."""
        self._poll_count += 1
        if self._poll_count % 100 == 0:
            logger.info(
                "IngestionState — session=%s polls=%d dups=%d stale=%d null_skips=%d "
                "drivers=%d known_laps=%d",
                self.session_key,
                self._poll_count,
                self._dup_count,
                self._stale_count,
                self._null_skip_count,
                len(self.drivers),
                len(self.known_lap_keys),
            )
