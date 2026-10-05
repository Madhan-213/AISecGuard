"""
AISecGuard — QuarantineEvent ORM Model
Week 5: Immutable audit trail for quarantine/release actions on artifacts.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class QuarantineEvent(Base):
    """
    Immutable audit record created every time an artifact is quarantined or released.

    Design:
    - Records are never updated or deleted — full audit trail is preserved.
    - actor_id links to the user who performed the action (nullable for system actions).
    - reason is a free-text field required for quarantine actions.
    """

    __tablename__ = "quarantine_events"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    artifact_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    action: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # "QUARANTINE" or "RELEASE"
    reason: Mapped[str] = mapped_column(Text, nullable=True)
    actor_id: Mapped[str] = mapped_column(String(36), nullable=True)  # user id or None for system
    actor_email: Mapped[str] = mapped_column(String(255), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return (
            f"<QuarantineEvent id={self.id!r} artifact={self.artifact_id!r} "
            f"action={self.action!r} actor={self.actor_email!r}>"
        )
