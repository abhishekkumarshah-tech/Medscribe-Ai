from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..models import utcnow
from ..security import (
    hash_password,
    hash_session_token,
    new_session_token,
    session_expiry,
    should_rehash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _bearer_token(authorization: str) -> str:
    scheme, separator, token = authorization.partition(" ")
    if not separator or scheme.lower() != "bearer" or not token.strip() or " " in token.strip():
        return ""
    return token.strip()


def _issue_session(db: Session, doctor: models.Doctor) -> str:
    token = new_session_token()
    db.add(
        models.AuthSession(
            token_hash=hash_session_token(token),
            doctor_id=doctor.id,
            expires_at=session_expiry(),
        )
    )
    return token


def get_current_doctor(
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
) -> models.Doctor:
    token = _bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    session = (
        db.query(models.AuthSession)
        .filter(
            models.AuthSession.token_hash == hash_session_token(token),
            models.AuthSession.expires_at > utcnow(),
        )
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or invalid"
        )

    doctor = db.query(models.Doctor).filter(models.Doctor.id == session.doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or invalid"
        )
    return doctor


@router.get("/config", response_model=schemas.AuthConfigOut)
def auth_config(request: Request):
    return {
        "allow_signup": request.app.state.allow_signup,
        "demo_login_enabled": request.app.state.demo_login_enabled,
    }


@router.post("/register", response_model=schemas.LoginResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: schemas.DoctorSignupRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    if not request.app.state.allow_signup:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="New account registration is disabled"
        )

    email = str(payload.email).strip().lower()
    if db.query(models.Doctor.id).filter(models.Doctor.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists"
        )

    doctor = models.Doctor(
        name=payload.name,
        email=email,
        specialty=payload.specialty,
        password_hash=hash_password(payload.password),
    )
    db.add(doctor)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists"
        )

    token = _issue_session(db, doctor)
    db.commit()
    db.refresh(doctor)
    return {"token": token, "doctor": doctor}


@router.post("/login", response_model=schemas.LoginResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    email = str(payload.email).strip().lower()
    doctor = db.query(models.Doctor).filter(models.Doctor.email == email).first()
    if not doctor or not verify_password(payload.password, doctor.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    if should_rehash_password(doctor.password_hash):
        doctor.password_hash = hash_password(payload.password)

    # Opportunistically prune expired tokens without relying on process-local
    # state; active sessions work across restarts and multiple app workers.
    db.query(models.AuthSession).filter(models.AuthSession.expires_at <= utcnow()).delete(
        synchronize_session=False
    )
    token = _issue_session(db, doctor)
    db.commit()
    return {"token": token, "doctor": doctor}


@router.post("/logout")
def logout(
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
):
    token = _bearer_token(authorization)
    if token:
        db.query(models.AuthSession).filter(
            models.AuthSession.token_hash == hash_session_token(token)
        ).delete(synchronize_session=False)
        db.commit()
    return {"ok": True}


@router.get("/me", response_model=schemas.DoctorOut)
def me(doctor: models.Doctor = Depends(get_current_doctor)):
    return doctor
