from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_key: Mapped[int] = mapped_column(Integer, unique=True, index=True, nullable=False)
    session_name: Mapped[str | None] = mapped_column(String(100))
    session_type: Mapped[str | None] = mapped_column(String(50))
    circuit_short_name: Mapped[str | None] = mapped_column(String(100))
    country_name: Mapped[str | None] = mapped_column(String(100))
    date_start: Mapped[datetime | None] = mapped_column(DateTime)
    date_end: Mapped[datetime | None] = mapped_column(DateTime)
    year: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="upcoming")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
