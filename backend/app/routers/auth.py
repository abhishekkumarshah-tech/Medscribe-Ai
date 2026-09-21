import uuid
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Simplified in-memory session store — fine for a local hackathon prototype.
# Swap for real JWT/OAuth before any production use.
SESSIONS: dict[str, str] = {}  # token -> doctor_id


def get_current_doctor(authorization: str = Header(default=""), db: Session = Depends(get_db)) -> models.Doctor:
    token = authorization.replace("Bearer ", "") if authorization else ""
    doctor_id = SESSIONS.get(token)
    if not doctor_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return doctor


@router.post("/login", response_model=schemas.LoginResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    doctor = db.query(models.Doctor).filter(models.Doctor.email == payload.email).first()
    if not doctor or not pwd_context.verify(payload.password, doctor.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = uuid.uuid4().hex
    SESSIONS[token] = doctor.id
    return {"token": token, "doctor": doctor}


@router.post("/logout")
def logout(authorization: str = Header(default="")):
    token = authorization.replace("Bearer ", "") if authorization else ""
    SESSIONS.pop(token, None)
    return {"ok": True}


@router.get("/me", response_model=schemas.DoctorOut)
def me(doctor: models.Doctor = Depends(get_current_doctor)):
    return doctor
