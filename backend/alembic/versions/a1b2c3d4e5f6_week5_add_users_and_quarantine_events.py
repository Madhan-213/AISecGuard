"""week5_add_users_and_quarantine_events

Revision ID: a1b2c3d4e5f6
Revises: 6e6a6aa64397
Create Date: 2026-10-05 10:00:00.000000

Week 5 changes:
- Create 'users' table (email, hashed_password, full_name, is_active, is_admin)
- Create 'quarantine_events' table (audit trail for quarantine/release actions)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '6e6a6aa64397'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create users and quarantine_events tables (idempotent)."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    # --- users table ---
    if 'users' not in existing_tables:
        op.create_table(
            'users',
            sa.Column('id', sa.String(36), primary_key=True, nullable=False),
            sa.Column('email', sa.String(255), nullable=False),
            sa.Column('hashed_password', sa.String(255), nullable=False),
            sa.Column('full_name', sa.String(255), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('1')),
            sa.Column('is_admin', sa.Boolean(), nullable=False, server_default=sa.text('0')),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        )
        # Unique constraint on email
        with op.batch_alter_table('users') as batch_op:
            batch_op.create_unique_constraint('uq_users_email', ['email'])
            batch_op.create_index('ix_users_email', ['email'])

    # --- quarantine_events table ---
    if 'quarantine_events' not in existing_tables:
        op.create_table(
            'quarantine_events',
            sa.Column('id', sa.String(36), primary_key=True, nullable=False),
            sa.Column('artifact_id', sa.String(36), nullable=False),
            sa.Column('action', sa.String(50), nullable=False),
            sa.Column('reason', sa.Text(), nullable=True),
            sa.Column('actor_id', sa.String(36), nullable=True),
            sa.Column('actor_email', sa.String(255), nullable=True),
            sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        )
        with op.batch_alter_table('quarantine_events') as batch_op:
            batch_op.create_index('ix_quarantine_events_artifact_id', ['artifact_id'])


def downgrade() -> None:
    """Drop users and quarantine_events tables."""
    op.drop_table('quarantine_events')
    op.drop_table('users')
