from __future__ import annotations

from app.ai_service import AIServiceError
from app.database import migrate_legacy_schema
from app.routers import consultations as consultation_router
from sqlalchemy import create_engine, text


def test_health_is_database_aware_and_sets_security_headers(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["database"] == "ok"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"


def test_private_endpoints_require_authentication(client):
    for path in ("/api/auth/me", "/api/patients", "/api/consultations", "/api/audit"):
        assert client.get(path).status_code == 401


def test_register_login_and_server_side_logout(client):
    registered = client.post(
        "/api/auth/register",
        json={
            "name": "Dr. New User",
            "email": "NEW.USER@example.com",
            "password": "a-strong-test-password",
            "specialty": "Internal Medicine",
        },
    )
    assert registered.status_code == 201, registered.text
    payload = registered.json()
    assert payload["doctor"]["email"] == "new.user@example.com"
    assert "password_hash" not in payload["doctor"]
    headers = {"Authorization": f"Bearer {payload['token']}"}
    assert client.get("/api/auth/me", headers=headers).json()["name"] == "Dr. New User"

    duplicate = client.post(
        "/api/auth/register",
        json={
            "name": "Another User",
            "email": "new.user@example.com",
            "password": "another-strong-password",
            "specialty": "Medicine",
        },
    )
    assert duplicate.status_code == 409

    login = client.post(
        "/api/auth/login",
        json={
            "email": "new.user@example.com",
            "password": "a-strong-test-password",
        },
    )
    assert login.status_code == 200
    login_headers = {"Authorization": f"Bearer {login.json()['token']}"}
    assert client.post("/api/auth/logout", headers=login_headers).json() == {"ok": True}
    assert client.get("/api/auth/me", headers=login_headers).status_code == 401


def test_signup_can_be_disabled(client):
    from app.main import create_app
    from fastapi.testclient import TestClient

    app = create_app(initialize_database=False, allow_signup=False, demo_login_enabled=False)
    response = TestClient(app).post(
        "/api/auth/register",
        json={
            "name": "Dr. New User",
            "email": "new@example.com",
            "password": "a-strong-test-password",
            "specialty": "Medicine",
        },
    )
    assert response.status_code == 403


def test_patient_consultation_ai_review_approval_flow(signed_in, monkeypatch):
    client, headers = signed_in
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

    patient_response = client.post(
        "/api/patients",
        headers=headers,
        json={
            "name": "New Synthetic Patient",
            "age": 35,
            "sex": "Unspecified",
            "notes": "Synthetic test data only.",
        },
    )
    assert patient_response.status_code == 201, patient_response.text
    patient_id = patient_response.json()["id"]

    created = client.post(
        "/api/consultations",
        headers=headers,
        json={
            "patient_id": patient_id,
            "raw_notes": "Patient reports sore throat. Exam: HR 78, throat erythematous. Plan: follow up in one week.",
        },
    )
    assert created.status_code == 201, created.text
    consultation_id = created.json()["id"]
    assert created.json()["status"] == "draft_pending"

    generated = client.post(f"/api/consultations/{consultation_id}/generate-draft", headers=headers)
    assert generated.status_code == 200, generated.text
    draft = generated.json()
    assert draft["status"] == "ai_drafted"
    assert draft["ai_model_used"] == "offline-structuring-v1"
    assert "sore throat" in draft["ai_draft"]
    assert "Examination Findings" in draft["ai_draft"]
    assert draft["ai_generated_at"].endswith("Z")

    edited_text = draft["ai_draft"] + "\nVerified and edited by clinician."
    updated = client.put(
        f"/api/consultations/{consultation_id}/draft",
        headers=headers,
        json={"edited_draft": edited_text},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "pending_review"

    final_text = edited_text + "\nFinal check completed."
    approved = client.post(
        f"/api/consultations/{consultation_id}/approve",
        headers=headers,
        json={"final_text": final_text},
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"
    assert approved.json()["final_record"] == final_text
    assert approved.json()["approved_by"] == "Dr. Test User"
    assert approved.json()["approved_at"].endswith("Z")

    assert (
        client.put(
            f"/api/consultations/{consultation_id}/draft",
            headers=headers,
            json={"edited_draft": "changed"},
        ).status_code
        == 409
    )
    assert (
        client.post(
            f"/api/consultations/{consultation_id}/approve",
            headers=headers,
            json={"final_text": "changed"},
        ).status_code
        == 409
    )
    assert (
        client.post(
            f"/api/consultations/{consultation_id}/generate-draft", headers=headers
        ).status_code
        == 409
    )

    actions = [event["action"] for event in client.get("/api/audit", headers=headers).json()]
    assert actions.count("PATIENT_CREATED") == 1
    assert "CONSULTATION_CREATED" in actions
    assert "AI_DRAFT_GENERATED" in actions
    assert "DRAFT_EDITED" in actions
    assert "RECORD_APPROVED" in actions


def test_records_are_isolated_between_accounts(signed_in, client):
    first_client, first_headers = signed_in
    patient = first_client.get("/api/patients/P-test", headers=first_headers).json()
    consultation = first_client.post(
        "/api/consultations",
        headers=first_headers,
        json={
            "patient_id": patient["id"],
            "raw_notes": "Private synthetic consultation notes.",
        },
    ).json()

    second_registration = client.post(
        "/api/auth/register",
        json={
            "name": "Dr. Separate User",
            "email": "separate@example.com",
            "password": "another-strong-password",
            "specialty": "Surgery",
        },
    )
    assert second_registration.status_code == 201
    second_headers = {"Authorization": f"Bearer {second_registration.json()['token']}"}

    assert client.get("/api/patients", headers=second_headers).json() == []
    assert client.get("/api/consultations", headers=second_headers).json() == []
    assert client.get("/api/audit", headers=second_headers).json() == []
    assert client.get(f"/api/patients/{patient['id']}", headers=second_headers).status_code == 404
    assert (
        client.get(f"/api/consultations/{consultation['id']}", headers=second_headers).status_code
        == 404
    )
    assert (
        client.post(
            "/api/consultations",
            headers=second_headers,
            json={
                "patient_id": patient["id"],
                "raw_notes": "Attempted cross-account access.",
            },
        ).status_code
        == 404
    )


def test_validation_rejects_empty_notes_and_invalid_patient_data(signed_in):
    client, headers = signed_in
    empty_notes = client.post(
        "/api/consultations",
        headers=headers,
        json={
            "patient_id": "P-test",
            "raw_notes": "   ",
        },
    )
    assert empty_notes.status_code == 422

    invalid_patient = client.post(
        "/api/patients",
        headers=headers,
        json={
            "name": "X",
            "age": 999,
        },
    )
    assert invalid_patient.status_code == 422


def test_provider_failure_is_reported_without_exposing_provider_details(signed_in, monkeypatch):
    client, headers = signed_in
    created = client.post(
        "/api/consultations",
        headers=headers,
        json={
            "patient_id": "P-test",
            "raw_notes": "Source note stays saved.",
        },
    )
    consultation_id = created.json()["id"]

    def unavailable(_notes):
        raise AIServiceError("provider secret text must not be surfaced")

    monkeypatch.setattr(consultation_router, "generate_draft", unavailable)
    response = client.post(f"/api/consultations/{consultation_id}/generate-draft", headers=headers)
    assert response.status_code == 503
    assert "provider secret" not in response.text
    assert (
        client.get(f"/api/consultations/{consultation_id}", headers=headers).json()["status"]
        == "draft_pending"
    )
    assert any(
        event["action"] == "AI_DRAFT_FAILED"
        for event in client.get("/api/audit", headers=headers).json()
    )


def test_legacy_patient_ownership_migration_is_additive(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'legacy.sqlite3'}")
    with engine.begin() as connection:
        connection.execute(
            text("CREATE TABLE doctors (id VARCHAR PRIMARY KEY, created_at DATETIME)")
        )
        connection.execute(
            text("INSERT INTO doctors (id, created_at) VALUES ('DOC-legacy', '2020-01-01')")
        )
        connection.execute(
            text("CREATE TABLE patients (id VARCHAR PRIMARY KEY, name VARCHAR, age INTEGER)")
        )
        connection.execute(
            text("INSERT INTO patients (id, name, age) VALUES ('P-legacy', 'Synthetic legacy', 30)")
        )

    migrate_legacy_schema(engine)
    with engine.connect() as connection:
        patient = connection.execute(
            text("SELECT id, doctor_id FROM patients WHERE id='P-legacy'")
        ).one()
    assert patient.id == "P-legacy"
    assert patient.doctor_id == "DOC-legacy"
    engine.dispose()
