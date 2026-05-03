from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_key: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    driver_number: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    prediction_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # pit_stop | overtake
    probability: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float)
    input_features: Mapped[dict | None] = mapped_column(JSONB)
    lap_number: Mapped[int | None] = mapped_column(Integer)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
