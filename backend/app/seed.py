"""Seeds a fresh database with demo data. Idempotent — safe to import on every startup."""
from passlib.context import CryptContext
from .database import SessionLocal
from . import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed():
    db = SessionLocal()
    try:
        if not db.query(models.Doctor).first():
            doctor = models.Doctor(
                id="DOC-demo01",
                name="Dr. Meera Sharma",
                email="doctor@carenote.demo",
                password_hash=pwd_context.hash("demo123"),
                specialty="Internal Medicine",
            )
            db.add(doctor)

        if not db.query(models.Patient).first():
            patients = [
                models.Patient(id="P-1001", name="Demo Patient", age=42, sex="Male",
                                mrn="MRN-77-001", notes="No known drug allergies (synthetic demo record)."),
                models.Patient(id="P-1002", name="Sample Patient", age=29, sex="Female",
                                mrn="MRN-77-002", notes="Penicillin allergy noted (synthetic demo record)."),
                models.Patient(id="P-1003", name="Test Patient", age=56, sex="Male",
                                mrn="MRN-77-003", notes="Type 2 diabetes, on metformin (synthetic demo record)."),
            ]
            db.add_all(patients)

        db.commit()

        # A couple of sample consultations in different states, for a lively dashboard
        if not db.query(models.Consultation).first():
            from .ai_service import generate_draft
            import datetime as dt

            c1 = models.Consultation(
                id="C-9001", patient_id="P-1002", doctor_id="DOC-demo01",
                raw_notes=("Patient c/o sore throat and fever for 3 days. Reports pain on swallowing. "
                           "Exam: temp 38.4C, throat erythematous with white exudate on tonsils, "
                           "tender anterior cervical lymph nodes. Assess: likely streptococcal pharyngitis. "
                           "Plan: rapid strep test, start amoxicillin 500mg TID for 10 days if positive, "
                           "advise rest and fluids, follow up in 1 week if not improving."),
                status=models.ConsultationStatus.approved,
            )
            result = generate_draft(c1.raw_notes, "Sample Patient, age 29, sex Female")
            c1.ai_draft = result["draft"]
            c1.edited_draft = result["draft"]
            c1.final_record = result["draft"]
            c1.ai_model_used = result["model"]
            c1.ai_generated_at = dt.datetime.utcnow()
            c1.approved_at = dt.datetime.utcnow()
            c1.approved_by = "Dr. Meera Sharma"

            c2 = models.Consultation(
                id="C-9002", patient_id="P-1001", doctor_id="DOC-demo01",
                raw_notes=("Patient presents with lower back pain after lifting heavy furniture yesterday. "
                           "No radiation to legs, no numbness or tingling. Exam: mild paraspinal tenderness "
                           "L4-L5, full range of motion with discomfort, no red flag signs. "
                           "Plan: advise NSAIDs as needed, heat application, gentle stretching, "
                           "avoid heavy lifting for 1 week, return if symptoms worsen or numbness develops."),
                status=models.ConsultationStatus.draft_pending,
            )

            db.add_all([c1, c2])
            db.commit()

            db.add(models.AuditEvent(actor="doctor@carenote.demo", action="RECORD_APPROVED",
                                      resource_type="consultation", resource_id="C-9001",
                                      detail="Dr. Meera Sharma approved the final clinical record."))
            db.add(models.AuditEvent(actor="doctor@carenote.demo", action="CONSULTATION_CREATED",
                                      resource_type="consultation", resource_id="C-9002",
                                      detail="Notes entered for patient Demo Patient (P-1001)"))
            db.commit()
    finally:
        db.close()
