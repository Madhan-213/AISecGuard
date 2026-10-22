"""week4_add_risk_score_and_rule_id

Revision ID: 6e6a6aa64397
Revises: 159697363d5a
Create Date: 2026-10-03 20:59:36.529065

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6e6a6aa64397'
down_revision: Union[str, Sequence[str], None] = '159697363d5a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    finding_cols = [c['name'] for c in inspector.get_columns('findings')]
    if 'rule_id' not in finding_cols:
        with op.batch_alter_table('findings', schema=None) as batch_op:
            batch_op.add_column(sa.Column('rule_id', sa.String(length=50), nullable=True))

    scan_cols = [c['name'] for c in inspector.get_columns('scans')]
    if 'risk_score' not in scan_cols:
        with op.batch_alter_table('scans', schema=None) as batch_op:
            batch_op.add_column(sa.Column('risk_score', sa.Integer(), nullable=False, server_default=sa.text('0')))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('scans', schema=None) as batch_op:
        batch_op.drop_column('risk_score')

    with op.batch_alter_table('findings', schema=None) as batch_op:
        batch_op.drop_column('rule_id')
