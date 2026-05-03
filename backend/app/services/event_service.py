import json
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.redis_client import get_redis
from app.models.event import Event
from app.schemas.event import EventCreate, EventResponse

logger = get_logger(__name__)
settings = get_settings()


class EventService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, data: EventCreate) -> Event:
        event = Event(**data.model_dump())
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def get_by_session(
        self,
        session_key: int,
        event_type: Optional[str] = None,
        limit: int = 100,
    ) -> List[Event]:
        query = select(Event).where(Event.session_key == session_key)
        if event_type:
            query = query.where(Event.event_type == event_type)
        query = query.order_by(Event.timestamp.desc()).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    # Redis helpers — maintain a capped list of recent events

    @staticmethod
    async def push_to_cache(event: EventResponse) -> None:
        redis = get_redis()
        key = settings.redis_events_key
        await redis.lpush(key, event.model_dump_json())
        await redis.ltrim(key, 0, settings.redis_events_max - 1)
        await redis.expire(key, 300)

    @staticmethod
    async def get_cached(limit: int = 50) -> List[dict]:
        redis = get_redis()
        raw_list = await redis.lrange(settings.redis_events_key, 0, limit - 1)
        result = []
        for raw in raw_list:
            try:
                result.append(json.loads(raw))
            except Exception:
                pass
        return result
