"""Validated API request/response schemas."""

from __future__ import annotations

import datetime as dt

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_serializer, field_validator


def _utc(value: dt.datetime | None) -> dt.datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=dt.UTC)
    return value.astimezone(dt.UTC)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class DoctorSignupRequest(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    specialty: str = Field(default="General Medicine", min_length=2, max_length=120)

    @field_validator("name", "specialty")
    @classmethod
    def trim_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field cannot be blank")
        return normalized


class DoctorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    specialty: str


class LoginResponse(BaseModel):
    token: str
    doctor: DoctorOut


class AuthConfigOut(BaseModel):
    allow_signup: bool
    demo_login_enabled: bool


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    age: int
    sex: str | None = None
    mrn: str | None = None
    notes: str | None = ""


class PatientCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    age: int = Field(ge=0, le=130)
    sex: str | None = Field(default=None, max_length=64)
    notes: str | None = Field(default="", max_length=4000)

    @field_validator("name", "sex", "notes")
    @classmethod
    def trim_optional_text(cls, value):
        if value is None:
            return value
        return value.strip()


class ConsultationCreate(BaseModel):
    patient_id: str = Field(min_length=1, max_length=100)
    raw_notes: str = Field(min_length=1, max_length=12000)

    @field_validator("raw_notes")
    @classmethod
    def require_nonblank_notes(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Consultation notes cannot be blank")
        return normalized


class ConsultationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    doctor_id: str
    raw_notes: str
    ai_draft: str
    edited_draft: str
    final_record: str
    status: str
    ai_model_used: str
    ai_generated_at: dt.datetime | None = None
    approved_at: dt.datetime | None = None
    approved_by: str | None = None
    created_at: dt.datetime
    updated_at: dt.datetime

    @field_serializer(
        "ai_generated_at", "approved_at", "created_at", "updated_at", when_used="json"
    )
    @classmethod
    def serialize_utc(cls, value: dt.datetime | None) -> dt.datetime | None:
        return _utc(value)


class DraftUpdateRequest(BaseModel):
    edited_draft: str = Field(min_length=1, max_length=20000)

    @field_validator("edited_draft")
    @classmethod
    def require_nonblank_draft(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Draft cannot be blank")
        return normalized


class ApproveRequest(BaseModel):
    final_text: str = Field(min_length=1, max_length=20000)

    @field_validator("final_text")
    @classmethod
    def require_nonblank_final_record(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Final record cannot be blank")
        return normalized


class AuditEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    timestamp: dt.datetime
    actor: str
    action: str
    resource_type: str
    resource_id: str
    detail: str

    @field_serializer("timestamp", when_used="json")
    @classmethod
    def serialize_timestamp_utc(cls, value: dt.datetime) -> dt.datetime:
        return _utc(value)
