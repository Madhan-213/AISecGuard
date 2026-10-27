"""
AISecGuard — ArtifactSignature ORM Model
Week 8: Ed25519 signature over an artifact's SHA-256 and its approving scan.

The signed payload is stored verbatim so verification never depends on how
the payload would be rebuilt today.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ArtifactSignature(Base):
    """One approval signature. An artifact may be signed again after a re-scan."""

    __tablename__ = "artifact_signatures"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    artifact_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("artifacts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scan_id: Mapped[str] = mapped_column(String(36), nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    algorithm: Mapped[str] = mapped_column(String(20), nullable=False, default="Ed25519")
    key_id: Mapped[str] = mapped_column(String(16), nullable=False)
    payload: Mapped[str] = mapped_column(Text, nullable=False)
    signature: Mapped[str] = mapped_column(Text, nullable=False)  # base64
    signed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    signed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    def __repr__(self) -> str:
        return f"<ArtifactSignature artifact={self.artifact_id!r} key={self.key_id!r}>"
