from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..ai_service import AIServiceError, generate_draft
from ..database import get_db
from .audit import log_event
from .auth import get_current_doctor

router = APIRouter(prefix="/api/consultations", tags=["consultations"])


def _owned_consultation(
    db: Session,
    consultation_id: str,
    doctor_id: str,
    *,
    for_update: bool = False,
) -> models.Consultation:
    query = db.query(models.Consultation).filter(
        models.Consultation.id == consultation_id,
        models.Consultation.doctor_id == doctor_id,
    )
    if for_update:
        query = query.with_for_update()
    consultation = query.first()
    if not consultation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found")
    return consultation


@router.get("", response_model=list[schemas.ConsultationOut])
def list_consultations(
    db: Session = Depends(get_db),
    doctor: models.Doctor = Depends(get_current_doctor),
):
    return (
        db.query(models.Consultation)
        .filter(models.Consultation.doctor_id == doctor.id)
        .order_by(models.Consultation.created_at.desc())
        .all()
    )


@router.get("/{cid}", response_model=schemas.ConsultationOut)
def get_consultation(
    cid: str,
    db: Session = Depends(get_db),
    doctor: models.Doctor = Depends(get_current_doctor),
):
    return _owned_consultation(db, cid, doctor.id)


@router.post("", response_model=schemas.ConsultationOut, status_code=status.HTTP_201_CREATED)
def create_consultation(
    payload: schemas.ConsultationCreate,
    db: Session = Depends(get_db),
    doctor: models.Doctor = Depends(get_current_doctor),
):
    patient = (
        db.query(models.Patient)
        .filter(
            models.Patient.id == payload.patient_id,
            models.Patient.doctor_id == doctor.id,
        )
        .first()
    )
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    consultation = models.Consultation(
        patient_id=patient.id,
        doctor_id=doctor.id,
        raw_notes=payload.raw_notes,
        status=models.ConsultationStatus.draft_pending,
    )
    db.add(consultation)
    db.flush()
    log_event(
        db,
        actor=doctor.email,
        action="CONSULTATION_CREATED",
        resource_type="consultation",
        resource_id=consultation.id,
        detail="Consultation notes saved.",
    )
    db.commit()
    db.refresh(consultation)
    return consultation


@router.post("/{cid}/generate-draft", response_model=schemas.ConsultationOut)
def generate_ai_draft(
    cid: str,
    db: Session = Depends(get_db),
    doctor: models.Doctor = Depends(get_current_doctor),
):
    consultation = _owned_consultation(db, cid, doctor.id, for_update=True)
    if consultation.status != models.ConsultationStatus.draft_pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A draft can only be generated once for a consultation that has not been reviewed.",
        )

    try:
        result = generate_draft(consultation.raw_notes)
    except AIServiceError:
        log_event(
            db,
            actor=doctor.email,
            action="AI_DRAFT_FAILED",
            resource_type="consultation",
            resource_id=consultation.id,
            detail="Draft generation failed; consultation notes remain saved.",
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The AI drafting service is unavailable. Your notes are saved; please try again later.",
        )

    consultation.ai_draft = result["draft"]
    consultation.edited_draft = result["draft"]
    consultation.ai_model_used = result["model"]
    consultation.ai_generated_at = result["generated_at"]
    consultation.status = models.ConsultationStatus.ai_drafted
    log_event(
        db,
        actor=doctor.email,
        action="AI_DRAFT_GENERATED",
        resource_type="consultation",
        resource_id=consultation.id,
        detail=f"Draft generated with {result['model']}; requires clinician review.",
    )
    db.commit()
    db.refresh(consultation)
    return consultation


@router.put("/{cid}/draft", response_model=schemas.ConsultationOut)
def update_draft(
    cid: str,
    payload: schemas.DraftUpdateRequest,
    db: Session = Depends(get_db),
    doctor: models.Doctor = Depends(get_current_doctor),
):
    consultation = _owned_consultation(db, cid, doctor.id, for_update=True)
    if consultation.status not in {
        models.ConsultationStatus.ai_drafted,
        models.ConsultationStatus.pending_review,
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Generate a draft before editing it; approved records cannot be changed.",
        )

    consultation.edited_draft = payload.edited_draft
    consultation.status = models.ConsultationStatus.pending_review
    log_event(
        db,
        actor=doctor.email,
        action="DRAFT_EDITED",
        resource_type="consultation",
        resource_id=consultation.id,
        detail="Clinician edited the draft.",
    )
    db.commit()
    db.refresh(consultation)
    return consultation


@router.post("/{cid}/approve", response_model=schemas.ConsultationOut)
def approve_consultation(
    cid: str,
    payload: schemas.ApproveRequest,
    db: Session = Depends(get_db),
    doctor: models.Doctor = Depends(get_current_doctor),
):
    consultation = _owned_consultation(db, cid, doctor.id, for_update=True)
    if consultation.status not in {
        models.ConsultationStatus.ai_drafted,
        models.ConsultationStatus.pending_review,
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Generate and review a draft before approving a final record.",
        )

    final_text = payload.final_text
    if final_text != consultation.edited_draft:
        consultation.edited_draft = final_text
        log_event(
            db,
            actor=doctor.email,
            action="DRAFT_EDITED",
            resource_type="consultation",
            resource_id=consultation.id,
            detail="Draft text was edited as part of final approval.",
        )

    consultation.final_record = final_text
    consultation.status = models.ConsultationStatus.approved
    consultation.approved_by = doctor.name
    consultation.approved_at = models.utcnow()
    log_event(
        db,
        actor=doctor.email,
        action="RECORD_APPROVED",
        resource_type="consultation",
        resource_id=consultation.id,
        detail="Clinician approved the final record.",
    )
    db.commit()
    db.refresh(consultation)
    return consultation
