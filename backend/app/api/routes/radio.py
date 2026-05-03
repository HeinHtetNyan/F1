import json
from typing import List

from fastapi import APIRouter

from app.core.config import get_settings
from app.core.redis_client import get_redis

router = APIRouter(prefix="/radio", tags=["radio"])
settings = get_settings()


@router.get("", response_model=List[dict])
async def list_radio():
    redis = get_redis()
    raw = await redis.get(settings.redis_radio_key)
    if raw:
        return json.loads(raw)
    return []
