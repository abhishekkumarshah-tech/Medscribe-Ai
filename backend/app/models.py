"""SQLAlchemy models for the Medscribe AI demo application."""

from __future__ import annotations

import datetime as dt
import enum
import uuid

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


def utcnow() -> dt.datetime:
    """Return naive UTC for compatibility with existing SQLite/Postgres rows."""
    return dt.datetime.now(dt.UTC).replace(tzinfo=None)


def gen_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex}"


class ConsultationStatus(enum.StrEnum):
    draft_pending = "draft_pending"
    ai_drafted = "ai_drafted"
    pending_review = "pending_review"
    approved = "approved"


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(String, primary_key=True, default=lambda: gen_id("DOC"))
    name = Column(String(200), nullable=False)
    email = Column(String(254), unique=True, nullable=False, index=True)
    password_hash = Column(String(512), nullable=False)
    specialty = Column(String(120), nullable=False, default="General Medicine")
    created_at = Column(DateTime, nullable=False, default=utcnow)

    consultations = relationship("Consultation", back_populates="doctor")
    sessions = relationship("AuthSession", back_populates="doctor", cascade="all, delete-orphan")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, default=lambda: gen_id("P"))
    # Nullable only to permit a safe in-place migration of pre-tenant demo DBs.
    # All new records are assigned to the authenticated doctor and API queries
    # never expose unowned rows.
    doctor_id = Column(
        String, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name = Column(String(200), nullable=False)
    age = Column(Integer, nullable=False)
    sex = Column(String(64), nullable=True)
    mrn = Column(String(80), nullable=True)
    notes = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, nullable=False, default=utcnow)

    doctor = relationship("Doctor")
    consultations = relationship("Consultation", back_populates="patient")


class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(String, primary_key=True, default=lambda: gen_id("C"))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id = Column(String, ForeignKey("doctors.id"), nullable=False, index=True)

    raw_notes = Column(Text, nullable=False, default="")
    ai_draft = Column(Text, nullable=False, default="")
    edited_draft = Column(Text, nullable=False, default="")
    final_record = Column(Text, nullable=False, default="")

    status = Column(
        Enum(ConsultationStatus),
        nullable=False,
        default=ConsultationStatus.draft_pending,
    )

    ai_model_used = Column(String(120), nullable=False, default="")
    ai_generated_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(String(200), nullable=True)

    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    patient = relationship("Patient", back_populates="consultations")
    doctor = relationship("Doctor", back_populates="consultations")


class AuditEvent(Base):
    """Append-only audit record; no application route permits edits or deletion."""

    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, default=lambda: gen_id("AUD"))
    timestamp = Column(DateTime, nullable=False, default=utcnow)
    actor = Column(String(254), nullable=False)
    action = Column(String(80), nullable=False)
    resource_type = Column(String(80), nullable=False)
    resource_id = Column(String(100), nullable=False)
    # Keep event details metadata-only; do not duplicate clinical notes here.
    detail = Column(Text, nullable=False, default="")


class AuthSession(Base):
    """Persisted opaque session. Only a SHA-256 token hash is stored."""

    __tablename__ = "auth_sessions"

    token_hash = Column(String(64), primary_key=True)
    doctor_id = Column(
        String, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at = Column(DateTime, nullable=False, default=utcnow)
    expires_at = Column(DateTime, nullable=False, index=True)

    doctor = relationship("Doctor", back_populates="sessions")
