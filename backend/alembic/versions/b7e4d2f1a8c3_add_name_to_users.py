"""add name to users

Revision ID: b7e4d2f1a8c3
Revises: a3f2c1d8e9b0
Create Date: 2026-07-06 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'b7e4d2f1a8c3'
down_revision = 'a3f2c1d8e9b0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('name', sa.String(), nullable=True))


def downgrade():
    op.drop_column('users', 'name')
