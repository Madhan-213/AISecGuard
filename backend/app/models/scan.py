"""
AISecGuard — Scan ORM Model
Week 3: Represents a single security scan of an artifact.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ScanStatus, RiskLevel


class Scan(Base):
    """
    Represents a security scan of an artifact.

    A scan collects zero or more Findings.
    The overall risk_level is a preliminary classification computed from
    the findings — the full Risk Assessment Engine is planned for Week 5.
    """

    __tablename__ = "scans"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    artifact_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("artifacts.id", ondelete="CASCADE"), nullable=False
    )
    scan_type: Mapped[str] = mapped_column(
        String(100), nullable=False, default="FULL"
    )
    status: Mapped[str] = mapped_column(
        SAEnum(ScanStatus, name="scan_status_enum"),
        nullable=False,
        default=ScanStatus.PENDING.value,
    )
    risk_level: Mapped[str] = mapped_column(
        SAEnum(RiskLevel, name="risk_level_enum"),
        nullable=False,
        default=RiskLevel.UNKNOWN.value,
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    artifact: Mapped["Artifact"] = relationship("Artifact", back_populates="scans")
    findings: Mapped[list["Finding"]] = relationship(
        "Finding", back_populates="scan", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<Scan id={self.id!r} artifact_id={self.artifact_id!r} "
            f"status={self.status!r} risk={self.risk_level!r}>"
        )
