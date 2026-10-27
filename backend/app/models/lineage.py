"""
AISecGuard — LineageEdge ORM Model
Week 8: Directed link between two artifacts (parent → child), e.g. the dataset a
model was trained on. Together the edges form the supply-chain graph.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LineageRelation(str, enum.Enum):
    """How the child was produced from the parent."""
    DERIVED_FROM = "DERIVED_FROM"        # dataset → dataset (cleaning, sampling, labelling)
    TRAINED_ON = "TRAINED_ON"            # dataset → model
    FINE_TUNED_FROM = "FINE_TUNED_FROM"  # model → model
    DEPENDS_ON = "DEPENDS_ON"            # dependency manifest → model


class LineageEdge(Base):
    __tablename__ = "lineage_edges"
    __table_args__ = (UniqueConstraint("parent_id", "child_id", "relation", name="uq_lineage_edge"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    parent_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("artifacts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    child_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("artifacts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Stored as plain text (validated against LineageRelation) so new relations need no enum migration
    relation: Mapped[str] = mapped_column(String(32), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    def __repr__(self) -> str:
        return f"<LineageEdge {self.parent_id!r} -{self.relation}-> {self.child_id!r}>"
