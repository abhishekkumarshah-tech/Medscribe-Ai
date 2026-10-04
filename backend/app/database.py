"""Database engine, sessions, and safe compatibility migrations."""

from __future__ import annotations

import os

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker


def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip() or "sqlite:///./carenote.db"
    # Render has historically supplied the legacy postgres:// form. SQLAlchemy
    # 2.x expects the explicit dialect name.
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    return url


DATABASE_URL = _database_url()
_is_sqlite = DATABASE_URL.startswith("sqlite")
_connect_args = {"check_same_thread": False} if _is_sqlite else {"connect_timeout": 10}

engine = create_engine(
    DATABASE_URL,
    connect_args=_connect_args,
    pool_pre_ping=True,
    pool_recycle=300,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def migrate_legacy_schema(db_engine=engine) -> None:
    """Add patient ownership to databases created by the original demo.

    This is additive and preserves existing patient records. Unassigned legacy
    demo rows are assigned to the oldest doctor once the doctor table exists.
    New installations get the same column from ``create_all``.
    """
    inspector = inspect(db_engine)
    table_names = set(inspector.get_table_names())
    if "patients" not in table_names:
        return

    columns = {column["name"] for column in inspector.get_columns("patients")}
    with db_engine.begin() as connection:
        if "doctor_id" not in columns:
            connection.execute(text("ALTER TABLE patients ADD COLUMN doctor_id VARCHAR"))
        connection.execute(
            text("CREATE INDEX IF NOT EXISTS ix_patients_doctor_id ON patients (doctor_id)")
        )

        if "doctors" in table_names:
            owner_id = connection.execute(
                text("SELECT id FROM doctors ORDER BY created_at, id LIMIT 1")
            ).scalar()
            if owner_id:
                connection.execute(
                    text("UPDATE patients SET doctor_id = :owner_id WHERE doctor_id IS NULL"),
                    {"owner_id": owner_id},
                )
