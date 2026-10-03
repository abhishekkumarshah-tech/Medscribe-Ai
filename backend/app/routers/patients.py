from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from .audit import log_event
from .auth import get_current_doctor

router = APIRouter(prefix="/api/patients", tags=["patients"])


def _owned_patient(db: Session, patient_id: str, doctor_id: str) -> models.Patient:
    patient = (
        db.query(models.Patient)
        .filter(
            models.Patient.id == patient_id,
            models.Patient.doctor_id == doctor_id,
        )
        .first()
    )
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return patient


@router.get("", response_model=list[schemas.PatientOut])
def list_patients(
    db: Session = Depends(get_db),
    doctor: models.Doctor = Depends(get_current_doctor),
):
    return (
        db.query(models.Patient)
        .filter(models.Patient.doctor_id == doctor.id)
        .order_by(models.Patient.created_at.desc())
        .all()
    )


@router.get("/{patient_id}", response_model=schemas.PatientOut)
def get_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    doctor: models.Doctor = Depends(get_current_doctor),
):
    return _owned_patient(db, patient_id, doctor.id)


@router.get("/{patient_id}/consultations", response_model=list[schemas.ConsultationOut])
def patient_consultations(
    patient_id: str,
    db: Session = Depends(get_db),
    doctor: models.Doctor = Depends(get_current_doctor),
):
    _owned_patient(db, patient_id, doctor.id)
    return (
        db.query(models.Consultation)
        .filter(
            models.Consultation.patient_id == patient_id,
            models.Consultation.doctor_id == doctor.id,
        )
        .order_by(models.Consultation.created_at.desc())
        .all()
    )


@router.post("", response_model=schemas.PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: schemas.PatientCreate,
    db: Session = Depends(get_db),
    doctor: models.Doctor = Depends(get_current_doctor),
):
    patient = models.Patient(
        doctor_id=doctor.id,
        name=payload.name,
        age=payload.age,
        sex=payload.sex or None,
        notes=payload.notes or "",
    )
    db.add(patient)
    db.flush()
    log_event(
        db,
        actor=doctor.email,
        action="PATIENT_CREATED",
        resource_type="patient",
        resource_id=patient.id,
        detail="Patient record created.",
    )
    db.commit()
    db.refresh(patient)
    return patient
