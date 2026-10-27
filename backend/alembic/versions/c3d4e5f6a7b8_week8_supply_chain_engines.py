"""week8_supply_chain_engines

Revision ID: c3d4e5f6a7b8
Revises: b7c8d9e0f1a2
Create Date: 2026-10-27 10:00:00.000000

Week 8 changes:
- finding_type_enum: KNOWN_VULNERABILITY (CVE matching), UPSTREAM_RISK (lineage)
- provenance_records.expected_sha256 (hash the uploader expects)
- quarantine_events.seq / prev_hash / entry_hash (tamper-evident audit chain)
- artifact_signatures table (Ed25519 model signing)
- lineage_edges table (data lineage graph)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ADD_VALUE_STATEMENTS = (
    "ALTER TYPE finding_type_enum ADD VALUE IF NOT EXISTS 'KNOWN_VULNERABILITY'",
    "ALTER TYPE finding_type_enum ADD VALUE IF NOT EXISTS 'UPSTREAM_RISK'",
)


def _columns(inspector, table: str) -> set[str]:
    return {c["name"] for c in inspector.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        for statement in ADD_VALUE_STATEMENTS:
            op.execute(statement)

    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "expected_sha256" not in _columns(inspector, "provenance_records"):
        with op.batch_alter_table("provenance_records") as batch_op:
            batch_op.add_column(sa.Column("expected_sha256", sa.String(length=64), nullable=True))

    if "entry_hash" not in _columns(inspector, "quarantine_events"):
        with op.batch_alter_table("quarantine_events") as batch_op:
            batch_op.add_column(sa.Column("seq", sa.Integer(), nullable=True))
            batch_op.add_column(sa.Column("prev_hash", sa.String(length=64), nullable=True))
            batch_op.add_column(sa.Column("entry_hash", sa.String(length=64), nullable=True))
            batch_op.create_index("ix_quarantine_events_seq", ["seq"])

    if "artifact_signatures" not in tables:
        op.create_table(
            "artifact_signatures",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("artifact_id", sa.String(length=36), sa.ForeignKey("artifacts.id", ondelete="CASCADE"), nullable=False),
            sa.Column("scan_id", sa.String(length=36), nullable=False),
            sa.Column("sha256", sa.String(length=64), nullable=False),
            sa.Column("algorithm", sa.String(length=20), nullable=False),
            sa.Column("key_id", sa.String(length=16), nullable=False),
            sa.Column("payload", sa.Text(), nullable=False),
            sa.Column("signature", sa.Text(), nullable=False),
            sa.Column("signed_by", sa.String(length=255), nullable=True),
            sa.Column("signed_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_artifact_signatures_artifact_id", "artifact_signatures", ["artifact_id"])

    if "lineage_edges" not in tables:
        op.create_table(
            "lineage_edges",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("parent_id", sa.String(length=36), sa.ForeignKey("artifacts.id", ondelete="CASCADE"), nullable=False),
            sa.Column("child_id", sa.String(length=36), sa.ForeignKey("artifacts.id", ondelete="CASCADE"), nullable=False),
            sa.Column("relation", sa.String(length=32), nullable=False),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column("created_by", sa.String(length=255), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("parent_id", "child_id", "relation", name="uq_lineage_edge"),
        )
        op.create_index("ix_lineage_edges_parent_id", "lineage_edges", ["parent_id"])
        op.create_index("ix_lineage_edges_child_id", "lineage_edges", ["child_id"])


def downgrade() -> None:
    """
    Drops the new tables and columns. PostgreSQL cannot drop enum values, so
    KNOWN_VULNERABILITY and UPSTREAM_RISK stay in finding_type_enum (harmless).
    """
    op.drop_index("ix_lineage_edges_child_id", table_name="lineage_edges")
    op.drop_index("ix_lineage_edges_parent_id", table_name="lineage_edges")
    op.drop_table("lineage_edges")
    op.drop_index("ix_artifact_signatures_artifact_id", table_name="artifact_signatures")
    op.drop_table("artifact_signatures")
    with op.batch_alter_table("quarantine_events") as batch_op:
        batch_op.drop_index("ix_quarantine_events_seq")
        batch_op.drop_column("entry_hash")
        batch_op.drop_column("prev_hash")
        batch_op.drop_column("seq")
    with op.batch_alter_table("provenance_records") as batch_op:
        batch_op.drop_column("expected_sha256")
