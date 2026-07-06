"""account books many to many

Revision ID: d4f8a2c6e1b0
Revises: b7e4d2f1a8c3
Create Date: 2026-07-06 20:15:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'd4f8a2c6e1b0'
down_revision = 'b7e4d2f1a8c3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'account_books',
        sa.Column('account_id', sa.Integer(), sa.ForeignKey('accounts.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('book_id', sa.Integer(), sa.ForeignKey('books.id', ondelete='CASCADE'), primary_key=True),
    )

    op.execute(
        'INSERT INTO account_books (account_id, book_id) '
        'SELECT id, book_id FROM accounts WHERE book_id IS NOT NULL'
    )

    op.drop_constraint('accounts_book_id_fkey', 'accounts', type_='foreignkey')
    op.drop_column('accounts', 'book_id')


def downgrade():
    op.add_column('accounts', sa.Column('book_id', sa.Integer(), nullable=True))
    op.create_foreign_key('accounts_book_id_fkey', 'accounts', 'books', ['book_id'], ['id'])

    op.execute(
        'UPDATE accounts SET book_id = ('
        '  SELECT book_id FROM account_books '
        '  WHERE account_books.account_id = accounts.id LIMIT 1'
        ')'
    )

    op.alter_column('accounts', 'book_id', nullable=False)
    op.drop_table('account_books')
