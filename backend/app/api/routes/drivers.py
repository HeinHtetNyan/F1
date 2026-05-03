from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.driver import DriverResponse
from app.services.driver_service import DriverService

router = APIRouter(prefix="/drivers", tags=["drivers"])


@router.get("", response_model=List[DriverResponse])
async def list_drivers(
    session_key: Optional[int] = Query(None, description="Filter by session key"),
    db: AsyncSession = Depends(get_db),
) -> List[DriverResponse]:
    # Try Redis cache first
    if session_key is None:
        cached = await DriverService.get_cached_drivers()
        if cached:
            return [DriverResponse.model_validate(d) for d in cached]

    svc = DriverService(db)
    drivers = await svc.get_all(session_key=session_key)
    return [DriverResponse.model_validate(d) for d in drivers]


@router.get("/{driver_number}", response_model=DriverResponse)
async def get_driver(
    driver_number: int,
    db: AsyncSession = Depends(get_db),
) -> DriverResponse:
    svc = DriverService(db)
    driver = await svc.get_by_number(driver_number)
    if driver is None:
        raise HTTPException(status_code=404, detail=f"Driver #{driver_number} not found")
    return DriverResponse.model_validate(driver)
