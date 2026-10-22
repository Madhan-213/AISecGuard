"""week6_add_missing_finding_types

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-10-22 10:00:00.000000

Week 6 changes:
- Add the FindingType values used by the dataset and dependency scanners to the
  PostgreSQL finding_type_enum type. Without them every DATA-*/DEP-* finding
  failed to insert on PostgreSQL (Docker). SQLite stores the enum as VARCHAR,
  so this is a no-op there.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ADD_VALUE_STATEMENTS = (
    "ALTER TYPE finding_type_enum ADD VALUE IF NOT EXISTS 'DATA_POISONING_INDICATOR'",
    "ALTER TYPE finding_type_enum ADD VALUE IF NOT EXISTS 'STRUCTURAL_ANOMALY'",
    "ALTER TYPE finding_type_enum ADD VALUE IF NOT EXISTS 'MALFORMED_FILE'",
    "ALTER TYPE finding_type_enum ADD VALUE IF NOT EXISTS 'UNPINNED_DEPENDENCY'",
    "ALTER TYPE finding_type_enum ADD VALUE IF NOT EXISTS 'BROAD_VERSION_RANGE'",
    "ALTER TYPE finding_type_enum ADD VALUE IF NOT EXISTS 'SUSPICIOUS_PACKAGE_NAME'",
)


def upgrade() -> None:
    """Add missing finding_type_enum values (idempotent)."""
    if op.get_bind().dialect.name != "postgresql":
        return
    for statement in ADD_VALUE_STATEMENTS:
        op.execute(statement)


def downgrade() -> None:
    """
    PostgreSQL cannot drop values from an enum type. The extra values are left
    in place; they are harmless to the previous revision.
    """
