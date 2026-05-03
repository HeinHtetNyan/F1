import json
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.redis_client import get_redis
from app.models.prediction import Prediction
from app.schemas.prediction import PredictionCreate, PredictionResponse

logger = get_logger(__name__)
settings = get_settings()


class PredictionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, data: PredictionCreate) -> Prediction:
        prediction = Prediction(**data.model_dump())
        self.db.add(prediction)
        await self.db.commit()
        await self.db.refresh(prediction)
        return prediction

    async def get_latest_by_session(
        self,
        session_key: int,
        prediction_type: Optional[str] = None,
    ) -> List[Prediction]:
        query = select(Prediction).where(Prediction.session_key == session_key)
        if prediction_type:
            query = query.where(Prediction.prediction_type == prediction_type)
        query = query.order_by(Prediction.timestamp.desc()).limit(200)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    # Redis helpers

    @staticmethod
    async def cache_predictions(predictions: List[PredictionResponse]) -> None:
        redis = get_redis()
        payload = [p.model_dump() for p in predictions]
        # Convert datetime to string for JSON serialisation
        for item in payload:
            if "timestamp" in item and hasattr(item["timestamp"], "isoformat"):
                item["timestamp"] = item["timestamp"].isoformat()
        await redis.set(
            settings.redis_predictions_key,
            json.dumps(payload),
            ex=10,
        )

    @staticmethod
    async def get_cached() -> Optional[List[dict]]:
        redis = get_redis()
        raw = await redis.get(settings.redis_predictions_key)
        return json.loads(raw) if raw else None
