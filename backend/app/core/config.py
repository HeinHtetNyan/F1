from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "F1 Analytics Platform"
    debug: bool = False
    log_level: str = "INFO"

    # Database
    database_url: str = "postgresql+asyncpg://f1user:f1password@localhost:5432/f1_analytics"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # OpenF1 API
    openf1_base_url: str = "https://api.openf1.org/v1"
    # Credentials for live-session access (optional — free tier works outside live sessions)
    openf1_username: Optional[str] = None
    openf1_password: Optional[str] = None

    # Worker timing
    poll_interval_seconds: float = 1.5
    ws_broadcast_interval: float = 1.0
    # How many poll cycles between full snapshots (10 cycles × 1.5 s ≈ 15 s)
    snapshot_every_n_cycles: int = 10

    # Ingestion retry
    openf1_max_retries: int = 3
    openf1_backoff_base: float = 1.0       # seconds; doubled each retry

    # Redis keys (live state)
    redis_leaderboard_key: str = "f1:leaderboard"
    redis_session_key: str = "f1:current_session"
    redis_drivers_key: str = "f1:drivers"
    redis_events_key: str = "f1:recent_events"
    redis_predictions_key: str = "f1:predictions"
    redis_events_max: int = 50

    # Redis fallback cache keys (used when OpenF1 API is unavailable)
    redis_fallback_prefix: str = "f1:fallback:"   # e.g. f1:fallback:positions

    # Redis pub/sub channels
    # Legacy single-channel (kept for backward compat)
    redis_pubsub_channel: str = "f1:live_updates"
    # Per-domain channels (manager subscribes to all four)
    redis_channel_leaderboard: str = "f1:ch:leaderboard"
    redis_channel_events: str = "f1:ch:events"
    redis_channel_predictions: str = "f1:ch:predictions"
    redis_channel_radio: str = "f1:ch:radio"
    redis_channel_location: str = "f1:ch:location"

    # Radio cache
    redis_radio_key: str = "f1:radio"
    redis_radio_max: int = 30

    # WebSocket sync-delay cap (seconds)
    ws_max_delay_seconds: float = 300.0    # 5 minutes max
    ws_queue_maxsize: int = 500            # per-connection delivery queue depth

    model_config = {"env_file": ".env", "case_sensitive": False}

    @property
    def redis_pubsub_channels(self) -> List[str]:
        """All channels the WebSocket manager subscribes to."""
        return [
            self.redis_channel_leaderboard,
            self.redis_channel_events,
            self.redis_channel_predictions,
            self.redis_channel_radio,
            self.redis_channel_location,
        ]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
