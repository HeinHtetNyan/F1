from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class LapBase(BaseModel):
    session_key: int
    driver_number: int
    lap_number: int
    lap_duration: Optional[float] = None
    duration_sector_1: Optional[float] = None
    duration_sector_2: Optional[float] = None
    duration_sector_3: Optional[float] = None
    i1_speed: Optional[float] = None
    i2_speed: Optional[float] = None
    st_speed: Optional[float] = None
    is_pit_out_lap: bool = False
    date_start: Optional[datetime] = None


class LapCreate(LapBase):
    pass


class LapResponse(LapBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
