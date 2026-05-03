from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.prediction import PredictionResponse
from app.services.prediction_service import PredictionService

router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.get("", response_model=List[dict])
async def list_predictions(
    session_key: Optional[int] = Query(None),
    prediction_type: Optional[str] = Query(None, description="pit_stop | overtake"),
    db: AsyncSession = Depends(get_db),
):
    # Return latest cached predictions when no filters
    if session_key is None and prediction_type is None:
        cached = await PredictionService.get_cached()
        if cached is not None:
            return cached

    svc = PredictionService(db)
    predictions = await svc.get_latest_by_session(
        session_key=session_key or 0,
        prediction_type=prediction_type,
    )
    return [PredictionResponse.model_validate(p).model_dump(mode="json") for p in predictions]
