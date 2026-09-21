from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas
from ..ai_service import generate_draft
from .auth import get_current_doctor
from .audit import log_event

router = APIRouter(prefix="/api/consultations", tags=["consultations"])


@router.get("", response_model=List[schemas.ConsultationOut])
def list_consultations(db: Session = Depends(get_db), doctor: models.Doctor = Depends(get_current_doctor)):
    return db.query(models.Consultation).order_by(models.Consultation.created_at.desc()).all()


@router.get("/{cid}", response_model=schemas.ConsultationOut)
def get_consultation(cid: str, db: Session = Depends(get_db), doctor: models.Doctor = Depends(get_current_doctor)):
    c = db.query(models.Consultation).filter(models.Consultation.id == cid).first()
    if not c:
        raise HTTPException(404, "Consultation not found")
    return c


@router.post("", response_model=schemas.ConsultationOut)
def create_consultation(payload: schemas.ConsultationCreate, db: Session = Depends(get_db), doctor: models.Doctor = Depends(get_current_doctor)):
    patient = db.query(models.Patient).filter(models.Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(404, "Patient not found")

    c = models.Consultation(
        patient_id=payload.patient_id,
        doctor_id=doctor.id,
        raw_notes=payload.raw_notes,
        status=models.ConsultationStatus.draft_pending,
    )
    db.add(c)
    db.commit()
    db.refresh(c)

    log_event(db, actor=doctor.email, action="CONSULTATION_CREATED",
              resource_type="consultation", resource_id=c.id,
              detail=f"Notes entered for patient {patient.name} ({patient.id})")
    return c


@router.post("/{cid}/generate-draft", response_model=schemas.ConsultationOut)
def generate_ai_draft(cid: str, db: Session = Depends(get_db), doctor: models.Doctor = Depends(get_current_doctor)):
    c = db.query(models.Consultation).filter(models.Consultation.id == cid).first()
    if not c:
        raise HTTPException(404, "Consultation not found")

    patient = db.query(models.Patient).filter(models.Patient.id == c.patient_id).first()
    context = f"{patient.name}, age {patient.age}, sex {patient.sex or 'unspecified'}" if patient else ""

    result = generate_draft(c.raw_notes, context)
    c.ai_draft = result["draft"]
    c.edited_draft = result["draft"]  # doctor starts editing from the AI draft
    c.ai_model_used = result["model"]
    c.ai_generated_at = result["generated_at"]
    c.status = models.ConsultationStatus.ai_drafted
    db.commit()
    db.refresh(c)

    log_event(db, actor=doctor.email, action="AI_DRAFT_GENERATED",
              resource_type="consultation", resource_id=c.id,
              detail=f"Model used: {result['model']}. Draft is unreviewed and must be approved by a doctor before use.")
    return c


@router.put("/{cid}/draft", response_model=schemas.ConsultationOut)
def update_draft(cid: str, payload: schemas.DraftUpdateRequest, db: Session = Depends(get_db), doctor: models.Doctor = Depends(get_current_doctor)):
    c = db.query(models.Consultation).filter(models.Consultation.id == cid).first()
    if not c:
        raise HTTPException(404, "Consultation not found")

    c.edited_draft = payload.edited_draft
    c.status = models.ConsultationStatus.pending_review
    db.commit()
    db.refresh(c)

    log_event(db, actor=doctor.email, action="DRAFT_EDITED",
              resource_type="consultation", resource_id=c.id,
              detail="Doctor edited the AI-generated draft.")
    return c


@router.post("/{cid}/approve", response_model=schemas.ConsultationOut)
def approve_consultation(cid: str, payload: schemas.ApproveRequest, db: Session = Depends(get_db), doctor: models.Doctor = Depends(get_current_doctor)):
    c = db.query(models.Consultation).filter(models.Consultation.id == cid).first()
    if not c:
        raise HTTPException(404, "Consultation not found")

    c.final_record = payload.final_text
    c.status = models.ConsultationStatus.approved
    c.approved_by = doctor.name
    from datetime import datetime
    c.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(c)

    log_event(db, actor=doctor.email, action="RECORD_APPROVED",
              resource_type="consultation", resource_id=c.id,
              detail=f"Doctor {doctor.name} approved the final clinical record.")
    return c
