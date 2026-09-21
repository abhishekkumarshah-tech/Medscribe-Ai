from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas
from .auth import get_current_doctor

router = APIRouter(prefix="/api/audit", tags=["audit"])


def log_event(db: Session, actor: str, action: str, resource_type: str, resource_id: str, detail: str = ""):
    event = models.AuditEvent(
        actor=actor, action=action, resource_type=resource_type,
        resource_id=resource_id, detail=detail,
    )
    db.add(event)
    db.commit()
    return event


@router.get("", response_model=List[schemas.AuditEventOut])
def list_audit_events(db: Session = Depends(get_db), doctor: models.Doctor = Depends(get_current_doctor)):
    return db.query(models.AuditEvent).order_by(models.AuditEvent.timestamp.desc()).all()
