from fastapi import APIRouter, HTTPException

from app.schemas.leaderboard import Leaderboard
from app.services.leaderboard_service import LeaderboardService

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("", response_model=Leaderboard)
async def get_leaderboard() -> Leaderboard:
    leaderboard = await LeaderboardService.get_live()
    if leaderboard is None:
        raise HTTPException(
            status_code=503,
            detail="Leaderboard not yet available — worker may still be initialising.",
        )
    return leaderboard
