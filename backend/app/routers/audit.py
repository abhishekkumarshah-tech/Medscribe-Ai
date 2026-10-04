from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from .auth import get_current_doctor

router = APIRouter(prefix="/api/audit", tags=["audit"])


def log_event(
    db: Session,
    actor: str,
    action: str,
    resource_type: str,
    resource_id: str,
    detail: str = "",
) -> models.AuditEvent:
    """Stage a metadata-only audit row in the caller's transaction."""
    event = models.AuditEvent(
        actor=actor,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        detail=detail,
    )
    db.add(event)
    return event


@router.get("", response_model=list[schemas.AuditEventOut])
def list_audit_events(
    db: Session = Depends(get_db),
    doctor: models.Doctor = Depends(get_current_doctor),
):
    return (
        db.query(models.AuditEvent)
        .filter(models.AuditEvent.actor == doctor.email)
        .order_by(models.AuditEvent.timestamp.desc())
        .all()
    )
