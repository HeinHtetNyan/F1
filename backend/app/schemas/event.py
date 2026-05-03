from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel


class EventBase(BaseModel):
    session_key: int
    event_type: str
    driver_number: Optional[int] = None
    lap_number: Optional[int] = None
    event_metadata: Optional[Dict[str, Any]] = None


class EventCreate(EventBase):
    pass


class EventResponse(EventBase):
    id: int
    timestamp: datetime

    model_config = {"from_attributes": True}
