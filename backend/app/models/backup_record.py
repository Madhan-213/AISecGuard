"""
AISecGuard — BackupRecord ORM Model
Tracks automated and manual database snapshots and configuration backups.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BackupRecord(Base):
    """
    Metadata representation of a database backup snapshot.
    """

    __tablename__ = "backup_records"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    backup_type: Mapped[str] = mapped_column(String(30), nullable=False, default="DATABASE_SNAPSHOT")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="COMPLETED") # COMPLETED, IN_PROGRESS, FAILED
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    created_by: Mapped[str | None] = mapped_column(String(255), nullable=True)

    def __repr__(self) -> str:
        return f"<BackupRecord filename={self.filename!r} status={self.status!r}>"
