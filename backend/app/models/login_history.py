"""
AISecGuard — LoginHistory ORM Model
Audit records of user and administrator login attempts, IP addresses, and session outcomes.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LoginHistory(Base):
    """
    Tracks authentication attempts, client IP, User-Agent, and success/failure status.
    """

    __tablename__ = "login_history"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="SUCCESS")  # SUCCESS, FAILED_INVALID_PASSWORD, FAILED_USER_NOT_FOUND, FAILED_SUSPENDED, FAILED_NOT_ADMIN
    failure_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    login_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    logout_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    def __repr__(self) -> str:
        return f"<LoginHistory email={self.email!r} status={self.status!r} time={self.login_time}>"
