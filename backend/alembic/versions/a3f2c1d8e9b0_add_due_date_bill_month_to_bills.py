"""add due_date and bill_month to bills

Revision ID: a3f2c1d8e9b0
Revises: 4869f1dc42d5
Create Date: 2026-07-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'a3f2c1d8e9b0'
down_revision = '4869f1dc42d5'
branch_labels = None
depends_on = None


def upgrade():
    # Add due_date (full date) and bill_month (YYYY-MM string) columns
    op.add_column('bills', sa.Column('due_date', sa.Date(), nullable=True))
    op.add_column('bills', sa.Column('bill_month', sa.String(), nullable=True))
    # Make category_id nullable (it was NOT NULL in the original migration)
    op.alter_column('bills', 'category_id', nullable=True)


def downgrade():
    op.drop_column('bills', 'bill_month')
    op.drop_column('bills', 'due_date')
    op.alter_column('bills', 'category_id', nullable=False)
