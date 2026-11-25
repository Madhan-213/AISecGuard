"""
AISecGuard — SecurityEvent ORM Model
Security monitoring incidents, failed login spikes, critical findings, and unauthorized access alerts.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SecurityEvent(Base):
    """
    High-priority security telemetry incident record for administrative monitoring.
    """

    __tablename__ = "security_events"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True) # FAILED_LOGIN_SPIKE, CRITICAL_SCAN_FINDING, UNAUTHORIZED_ACCESS, SUSPICIOUS_TOKEN, QUARANTINE_ACTION
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="INFO") # CRITICAL, HIGH, MEDIUM, LOW, INFO
    source_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    actor_email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    def __repr__(self) -> str:
        return f"<SecurityEvent id={self.id!r} type={self.event_type!r} severity={self.severity!r}>"
