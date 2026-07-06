"""One-off migration: add name column to users table."""
from app.db.session import engine
import sqlalchemy as sa

with engine.connect() as conn:
    try:
        conn.execute(sa.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR"))
        conn.execute(sa.text(
            "INSERT INTO alembic_version (version_num) VALUES ('b7e4d2f1a8c3') "
            "ON CONFLICT DO NOTHING"
        ))
        conn.commit()
        print("OK — name column added to users")
    except Exception as e:
        print("Error:", e)
