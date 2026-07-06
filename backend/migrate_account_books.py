"""One-off migration: account_books many-to-many, drop accounts.book_id."""
from app.db.session import engine
import sqlalchemy as sa

with engine.connect() as conn:
    try:
        conn.execute(sa.text("""
            CREATE TABLE IF NOT EXISTS account_books (
                account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
                PRIMARY KEY (account_id, book_id)
            )
        """))
        conn.execute(sa.text("""
            INSERT INTO account_books (account_id, book_id)
            SELECT id, book_id FROM accounts
            WHERE book_id IS NOT NULL
            ON CONFLICT DO NOTHING
        """))
        conn.execute(sa.text(
            "ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_book_id_fkey"
        ))
        conn.execute(sa.text(
            "ALTER TABLE accounts DROP COLUMN IF EXISTS book_id"
        ))
        conn.execute(sa.text(
            "UPDATE alembic_version SET version_num = 'd4f8a2c6e1b0' "
            "WHERE version_num = 'b7e4d2f1a8c3'"
        ))
        conn.execute(sa.text(
            "INSERT INTO alembic_version (version_num) VALUES ('d4f8a2c6e1b0') "
            "ON CONFLICT DO NOTHING"
        ))
        conn.commit()
        print("OK — account_books table created, book_id column removed")
    except Exception as e:
        print("Error:", e)
