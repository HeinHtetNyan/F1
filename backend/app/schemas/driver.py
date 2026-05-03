from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class DriverBase(BaseModel):
    driver_number: int
    full_name: str
    name_acronym: Optional[str] = None
    team_name: Optional[str] = None
    country_code: Optional[str] = None
    headshot_url: Optional[str] = None


class DriverCreate(DriverBase):
    session_key: int


class DriverUpdate(BaseModel):
    full_name: Optional[str] = None
    team_name: Optional[str] = None
    headshot_url: Optional[str] = None
    session_key: Optional[int] = None


class DriverResponse(DriverBase):
    id: int
    session_key: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
