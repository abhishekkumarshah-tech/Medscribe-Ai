from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas
from .auth import get_current_doctor

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.get("", response_model=List[schemas.PatientOut])
def list_patients(db: Session = Depends(get_db), doctor: models.Doctor = Depends(get_current_doctor)):
    return db.query(models.Patient).order_by(models.Patient.created_at.desc()).all()


@router.get("/{patient_id}", response_model=schemas.PatientOut)
def get_patient(patient_id: str, db: Session = Depends(get_db), doctor: models.Doctor = Depends(get_current_doctor)):
    p = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not p:
        raise HTTPException(404, "Patient not found")
    return p


@router.get("/{patient_id}/consultations", response_model=List[schemas.ConsultationOut])
def patient_consultations(patient_id: str, db: Session = Depends(get_db), doctor: models.Doctor = Depends(get_current_doctor)):
    return (
        db.query(models.Consultation)
        .filter(models.Consultation.patient_id == patient_id)
        .order_by(models.Consultation.created_at.desc())
        .all()
    )


@router.post("", response_model=schemas.PatientOut)
def create_patient(payload: schemas.PatientCreate, db: Session = Depends(get_db), doctor: models.Doctor = Depends(get_current_doctor)):
    p = models.Patient(name=payload.name, age=payload.age, sex=payload.sex, notes=payload.notes or "")
    db.add(p)
    db.commit()
    db.refresh(p)
    return p
