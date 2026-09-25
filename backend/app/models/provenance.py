"""
AISecGuard — ProvenanceRecord ORM Model
Week 3: Records the provenance metadata of an uploaded artifact.

A provenance record documents when and how an artifact entered the system.
The SHA-256 hash recorded here serves as the baseline for future integrity checks.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ProvenanceRecord(Base):
    """
    Provenance and integrity baseline for an uploaded artifact.

    The sha256_hash stored here is the hash calculated at upload time.
    It is the BASELINE — comparing against this hash in future scans
    can detect tampering or accidental modification.
    """

    __tablename__ = "provenance_records"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    artifact_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("artifacts.id", ondelete="CASCADE"), nullable=False
    )
    source_url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    sha256_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    # uploader_id is nullable — authentication is not implemented in Week 3
    uploader_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    # Relationship
    artifact: Mapped["Artifact"] = relationship(
        "Artifact", back_populates="provenance_records"
    )

    def __repr__(self) -> str:
        return (
            f"<ProvenanceRecord id={self.id!r} artifact_id={self.artifact_id!r} "
            f"sha256={self.sha256_hash[:16]!r}...>"
        )
