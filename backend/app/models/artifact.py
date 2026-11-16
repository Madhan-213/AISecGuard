"""
AISecGuard — Artifact ORM Model
Week 3: Represents an uploaded AI/ML artifact (model, dataset, dependency file).
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.sqlite import TEXT

from app.db.base import Base
from app.models.enums import ArtifactType, ArtifactStatus


class Artifact(Base):
    """
    Represents an uploaded AI/ML artifact.

    An artifact is any file submitted to AISecGuard for security scanning.
    The file is stored using a safe UUID-based path — never the original filename.
    """

    __tablename__ = "artifacts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    artifact_type: Mapped[str] = mapped_column(
        SAEnum(ArtifactType, name="artifact_type_enum"), nullable=False
    )
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    file_extension: Mapped[str] = mapped_column(String(50), nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    status: Mapped[str] = mapped_column(
        SAEnum(ArtifactStatus, name="artifact_status_enum"),
        nullable=False,
        default=ArtifactStatus.UPLOADED.value,
    )
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    user_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True, index=True
    )

    # Relationships
    provenance_records: Mapped[list["ProvenanceRecord"]] = relationship(
        "ProvenanceRecord", back_populates="artifact", cascade="all, delete-orphan"
    )
    scans: Mapped[list["Scan"]] = relationship(
        "Scan", back_populates="artifact", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<Artifact id={self.id!r} original={self.original_filename!r} "
            f"type={self.artifact_type!r} status={self.status!r}>"
        )
