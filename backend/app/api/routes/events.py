from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.event import EventResponse
from app.services.event_service import EventService

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=List[dict])
async def list_events(
    session_key: Optional[int] = Query(None),
    event_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    # Return from Redis cache when no filters applied
    if session_key is None and event_type is None:
        return await EventService.get_cached(limit=limit)

    svc = EventService(db)
    events = await svc.get_by_session(
        session_key=session_key,
        event_type=event_type,
        limit=limit,
    )
    return [EventResponse.model_validate(e).model_dump(mode="json") for e in events]
