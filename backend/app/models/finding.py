"""
AISecGuard — Finding ORM Model
Week 3: Represents an individual security finding within a scan.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import FindingType, FindingSeverity


class Finding(Base):
    """
    Represents a single security finding produced by a scan.

    A finding documents a specific security concern — for example,
    unsafe pickle serialization, a suspicious module reference, or an
    integrity hash mismatch.
    """

    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    scan_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False
    )
    finding_type: Mapped[str] = mapped_column(
        SAEnum(FindingType, name="finding_type_enum"), nullable=False
    )
    severity: Mapped[str] = mapped_column(
        SAEnum(FindingSeverity, name="finding_severity_enum"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationship
    scan: Mapped["Scan"] = relationship("Scan", back_populates="findings")

    def __repr__(self) -> str:
        return (
            f"<Finding id={self.id!r} type={self.finding_type!r} "
            f"severity={self.severity!r} title={self.title!r}>"
        )
