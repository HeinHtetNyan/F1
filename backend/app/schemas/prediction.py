from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class PredictionBase(BaseModel):
    session_key: int
    driver_number: int
    prediction_type: str
    probability: float = Field(..., ge=0.0, le=1.0)
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    input_features: Optional[Dict[str, Any]] = None
    lap_number: Optional[int] = None


class PredictionCreate(PredictionBase):
    pass


class PredictionResponse(PredictionBase):
    id: int
    timestamp: datetime

    model_config = {"from_attributes": True}
