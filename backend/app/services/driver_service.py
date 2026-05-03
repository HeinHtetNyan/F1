import json
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.core.redis_client import get_redis
from app.core.config import get_settings
from app.models.driver import Driver
from app.schemas.driver import DriverCreate, DriverResponse, DriverUpdate

logger = get_logger(__name__)
settings = get_settings()


class DriverService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def upsert(self, data: DriverCreate) -> Driver:
        result = await self.db.execute(
            select(Driver).where(Driver.driver_number == data.driver_number)
        )
        driver = result.scalar_one_or_none()

        if driver is None:
            driver = Driver(**data.model_dump())
            self.db.add(driver)
        else:
            for field, value in data.model_dump(exclude={"driver_number"}).items():
                if value is not None:
                    setattr(driver, field, value)

        await self.db.commit()
        await self.db.refresh(driver)
        return driver

    async def get_all(self, session_key: Optional[int] = None) -> List[Driver]:
        query = select(Driver)
        if session_key:
            query = query.where(Driver.session_key == session_key)
        result = await self.db.execute(query.order_by(Driver.driver_number))
        return list(result.scalars().all())

    async def get_by_number(self, driver_number: int) -> Optional[Driver]:
        result = await self.db.execute(
            select(Driver).where(Driver.driver_number == driver_number)
        )
        return result.scalar_one_or_none()

    # ------------------------------------------------------------------
    # Redis helpers
    # ------------------------------------------------------------------

    @staticmethod
    async def cache_drivers(drivers: List[Driver]) -> None:
        redis = get_redis()
        payload = [
            {
                "driver_number": d.driver_number,
                "full_name": d.full_name,
                "name_acronym": d.name_acronym,
                "team_name": d.team_name,
                "country_code": d.country_code,
                "headshot_url": d.headshot_url,
            }
            for d in drivers
        ]
        await redis.set(settings.redis_drivers_key, json.dumps(payload), ex=3600)

    @staticmethod
    async def get_cached_drivers() -> Optional[List[dict]]:
        redis = get_redis()
        raw = await redis.get(settings.redis_drivers_key)
        return json.loads(raw) if raw else None
