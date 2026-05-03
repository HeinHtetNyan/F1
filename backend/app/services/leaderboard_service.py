import json
from typing import Optional

from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.redis_client import get_redis
from app.schemas.leaderboard import Leaderboard

logger = get_logger(__name__)
settings = get_settings()


class LeaderboardService:
    @staticmethod
    async def get_live() -> Optional[Leaderboard]:
        redis = get_redis()
        raw = await redis.get(settings.redis_leaderboard_key)
        if not raw:
            return None
        try:
            return Leaderboard.model_validate(json.loads(raw))
        except Exception as exc:
            logger.error("Failed to deserialize leaderboard: %s", exc)
            return None

    @staticmethod
    async def set_live(leaderboard: Leaderboard) -> None:
        redis = get_redis()
        await redis.set(
            settings.redis_leaderboard_key,
            leaderboard.model_dump_json(),
            ex=30,  # expire after 30 s of no updates
        )
