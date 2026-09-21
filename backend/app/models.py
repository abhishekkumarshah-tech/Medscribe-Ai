"""
SQLAlchemy models for CareNote AI.

Every state-changing action on a consultation (draft generated, edited,
approved) is mirrored into AuditEvent — this is a product requirement,
not an afterthought, since auditability is a core feature of a clinical
documentation tool.
"""
import uuid
import datetime as dt
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
import enum

from .database import Base


def gen_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


class ConsultationStatus(str, enum.Enum):
    draft_pending = "draft_pending"      # notes entered, no AI draft yet
    ai_drafted = "ai_drafted"            # AI draft generated, awaiting review
    pending_review = "pending_review"    # doctor is editing
    approved = "approved"                # doctor approved -> final record


class Doctor(Base):
    __tablename__ = "doctors"
    id = Column(String, primary_key=True, default=lambda: gen_id("DOC"))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    specialty = Column(String, default="General Medicine")
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    consultations = relationship("Consultation", back_populates="doctor")


class Patient(Base):
    __tablename__ = "patients"
    id = Column(String, primary_key=True, default=lambda: gen_id("P"))
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    sex = Column(String, nullable=True)
    mrn = Column(String, nullable=True)  # synthetic medical record number
    notes = Column(Text, default="")  # e.g. known allergies, demo-only
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    consultations = relationship("Consultation", back_populates="patient")


class Consultation(Base):
    __tablename__ = "consultations"
    id = Column(String, primary_key=True, default=lambda: gen_id("C"))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(String, ForeignKey("doctors.id"), nullable=False)

    raw_notes = Column(Text, default="")          # unstructured doctor input
    ai_draft = Column(Text, default="")            # AI-generated structured draft
    edited_draft = Column(Text, default="")        # doctor-edited version
    final_record = Column(Text, default="")        # approved final text

    status = Column(Enum(ConsultationStatus), default=ConsultationStatus.draft_pending)

    ai_model_used = Column(String, default="")
    ai_generated_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(String, nullable=True)

    created_at = Column(DateTime, default=dt.datetime.utcnow)
    updated_at = Column(DateTime, default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)

    patient = relationship("Patient", back_populates="consultations")
    doctor = relationship("Doctor", back_populates="consultations")


class AuditEvent(Base):
    """Immutable log of every meaningful action for compliance/auditability."""
    __tablename__ = "audit_events"
    id = Column(String, primary_key=True, default=lambda: gen_id("AUD"))
    timestamp = Column(DateTime, default=dt.datetime.utcnow)
    actor = Column(String, nullable=False)          # doctor name/email or "system"
    action = Column(String, nullable=False)         # e.g. "AI_DRAFT_GENERATED"
    resource_type = Column(String, nullable=False)  # e.g. "consultation"
    resource_id = Column(String, nullable=False)
    detail = Column(Text, default="")
