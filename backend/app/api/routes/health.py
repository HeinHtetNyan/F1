from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.redis_client import get_redis

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    redis: str
    database: str


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    redis_status = "ok"
    try:
        redis = get_redis()
        await redis.ping()
    except Exception as exc:
        redis_status = f"error: {exc}"

    return HealthResponse(
        status="ok" if redis_status == "ok" else "degraded",
        timestamp=datetime.utcnow().isoformat(),
        redis=redis_status,
        database="ok",
    )
