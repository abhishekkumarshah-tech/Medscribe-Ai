"""
Database layer.

Defaults to a local SQLite file so the hackathon demo runs with zero setup.
Set DATABASE_URL to a PostgreSQL DSN (e.g. postgresql://user:pass@host:5432/carenote)
to swap the backing store in production — no other code needs to change,
because every query goes through the SQLAlchemy session below.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./carenote.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
