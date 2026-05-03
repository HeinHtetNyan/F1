from datetime import datetime

from sqlalchemy import DateTime, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Lap(Base):
    __tablename__ = "laps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_key: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    driver_number: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    lap_number: Mapped[int] = mapped_column(Integer, nullable=False)
    lap_duration: Mapped[float | None] = mapped_column(Float)
    duration_sector_1: Mapped[float | None] = mapped_column(Float)
    duration_sector_2: Mapped[float | None] = mapped_column(Float)
    duration_sector_3: Mapped[float | None] = mapped_column(Float)
    i1_speed: Mapped[float | None] = mapped_column(Float)
    i2_speed: Mapped[float | None] = mapped_column(Float)
    st_speed: Mapped[float | None] = mapped_column(Float)
    is_pit_out_lap: Mapped[bool] = mapped_column(Integer, default=False)
    date_start: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
