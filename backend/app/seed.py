"""Idempotent local-only seed data for the synthetic demo workspace."""

from __future__ import annotations

from . import models
from .database import SessionLocal
from .security import hash_password

DEMO_EMAIL = "doctor@carenote.demo"
DEMO_PASSWORD = "demo123"


def seed() -> None:
    db = SessionLocal()
    try:
        doctor = db.query(models.Doctor).filter(models.Doctor.email == DEMO_EMAIL).first()
        if not doctor:
            doctor = models.Doctor(
                id="DOC-demo01",
                name="Dr. Meera Sharma",
                email=DEMO_EMAIL,
                password_hash=hash_password(DEMO_PASSWORD),
                specialty="Internal Medicine",
            )
            db.add(doctor)
            db.flush()

        if not db.query(models.Patient).first():
            db.add_all(
                [
                    models.Patient(
                        id="P-1001",
                        doctor_id=doctor.id,
                        name="Demo Patient",
                        age=42,
                        sex="Male",
                        mrn="MRN-77-001",
                        notes="No known drug allergies (synthetic demo record).",
                    ),
                    models.Patient(
                        id="P-1002",
                        doctor_id=doctor.id,
                        name="Sample Patient",
                        age=29,
                        sex="Female",
                        mrn="MRN-77-002",
                        notes="Penicillin allergy noted (synthetic demo record).",
                    ),
                    models.Patient(
                        id="P-1003",
                        doctor_id=doctor.id,
                        name="Test Patient",
                        age=56,
                        sex="Male",
                        mrn="MRN-77-003",
                        notes="Type 2 diabetes, on metformin (synthetic demo record).",
                    ),
                ]
            )

        db.commit()

        # Sample workflow rows are synthetic and exist only in local demo mode.
        sample_patients = {
            row[0]
            for row in db.query(models.Patient.id)
            .filter(models.Patient.id.in_(["P-1001", "P-1002"]))
            .all()
        }
        if {"P-1001", "P-1002"}.issubset(sample_patients) and not db.query(
            models.Consultation
        ).first():
            from .ai_service import _mock_generate_draft

            c1 = models.Consultation(
                id="C-9001",
                patient_id="P-1002",
                doctor_id=doctor.id,
                raw_notes=(
                    "Patient c/o sore throat and fever for 3 days. Reports pain on swallowing. "
                    "Exam: temp 38.4C, throat erythematous with white exudate on tonsils, "
                    "tender anterior cervical lymph nodes. Assess: likely streptococcal pharyngitis. "
                    "Plan: rapid strep test, start amoxicillin 500mg TID for 10 days if positive, "
                    "advise rest and fluids, follow up in 1 week if not improving."
                ),
                status=models.ConsultationStatus.approved,
            )
            draft = _mock_generate_draft(c1.raw_notes)
            c1.ai_draft = draft
            c1.edited_draft = draft
            c1.final_record = draft
            c1.ai_model_used = "offline-structuring-v1"
            c1.ai_generated_at = models.utcnow()
            c1.approved_at = models.utcnow()
            c1.approved_by = doctor.name

            c2 = models.Consultation(
                id="C-9002",
                patient_id="P-1001",
                doctor_id=doctor.id,
                raw_notes=(
                    "Patient presents with lower back pain after lifting heavy furniture yesterday. "
                    "No radiation to legs, no numbness or tingling. Exam: mild paraspinal tenderness "
                    "L4-L5, full range of motion with discomfort, no red flag signs. "
                    "Plan: advise NSAIDs as needed, heat application, gentle stretching, "
                    "avoid heavy lifting for 1 week, return if symptoms worsen or numbness develops."
                ),
                status=models.ConsultationStatus.draft_pending,
            )
            db.add_all([c1, c2])
            db.flush()
            db.add_all(
                [
                    models.AuditEvent(
                        actor=doctor.email,
                        action="RECORD_APPROVED",
                        resource_type="consultation",
                        resource_id=c1.id,
                        detail="Synthetic sample record marked as approved for demo display.",
                    ),
                    models.AuditEvent(
                        actor=doctor.email,
                        action="CONSULTATION_CREATED",
                        resource_type="consultation",
                        resource_id=c2.id,
                        detail="Synthetic sample consultation created.",
                    ),
                ]
            )
            db.commit()
    finally:
        db.close()
