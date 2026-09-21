import datetime as dt
from typing import Optional, List
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: str
    password: str


class DoctorOut(BaseModel):
    id: str
    name: str
    email: str
    specialty: str

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    token: str
    doctor: DoctorOut


class PatientOut(BaseModel):
    id: str
    name: str
    age: int
    sex: Optional[str] = None
    mrn: Optional[str] = None
    notes: Optional[str] = ""

    class Config:
        from_attributes = True


class PatientCreate(BaseModel):
    name: str
    age: int
    sex: Optional[str] = None
    notes: Optional[str] = ""


class ConsultationCreate(BaseModel):
    patient_id: str
    raw_notes: str


class ConsultationOut(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    raw_notes: str
    ai_draft: str
    edited_draft: str
    final_record: str
    status: str
    ai_model_used: str
    ai_generated_at: Optional[dt.datetime] = None
    approved_at: Optional[dt.datetime] = None
    approved_by: Optional[str] = None
    created_at: dt.datetime
    updated_at: dt.datetime

    class Config:
        from_attributes = True


class DraftUpdateRequest(BaseModel):
    edited_draft: str


class ApproveRequest(BaseModel):
    final_text: str


class AuditEventOut(BaseModel):
    id: str
    timestamp: dt.datetime
    actor: str
    action: str
    resource_type: str
    resource_id: str
    detail: str

    class Config:
        from_attributes = True
