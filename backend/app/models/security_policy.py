"""
AISecGuard — SecurityPolicy ORM Model
Configurable system and scanning security policies.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SecurityPolicy(Base):
    """
    Configurable security policy controlling scanning parameters, quarantine rules,
    file thresholds, and AI supply chain enforcement rules.
    """

    __tablename__ = "security_policies"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="GENERAL")
    value_type: Mapped[str] = mapped_column(String(20), nullable=False, default="STRING") # BOOLEAN, NUMBER, STRING
    value: Mapped[str] = mapped_column(String(255), nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    updated_by: Mapped[str | None] = mapped_column(String(255), nullable=True)

    def __repr__(self) -> str:
        return f"<SecurityPolicy key={self.key!r} value={self.value!r} enabled={self.is_enabled}>"
