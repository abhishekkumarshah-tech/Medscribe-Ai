from __future__ import annotations

import pytest
from app.database import Base, get_db
from app.main import create_app
from app.models import Doctor, Patient
from app.security import hash_password
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture
def client(tmp_path):
    database_file = tmp_path / "test.sqlite3"
    test_engine = create_engine(
        f"sqlite:///{database_file}",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestSession = sessionmaker(
        autocommit=False, autoflush=False, bind=test_engine, expire_on_commit=False
    )
    Base.metadata.create_all(bind=test_engine)

    db = TestSession()
    doctor = Doctor(
        id="DOC-test",
        name="Dr. Test User",
        email="doctor@example.com",
        specialty="Family Medicine",
        password_hash=hash_password("test-password-with-12-chars"),
    )
    db.add(doctor)
    db.add(
        Patient(
            id="P-test",
            doctor_id=doctor.id,
            name="Synthetic Test Patient",
            age=40,
            sex="Unspecified",
            notes="Synthetic fixture record.",
        )
    )
    db.commit()
    db.close()

    app = create_app(initialize_database=False, allow_signup=True, demo_login_enabled=False)

    def override_get_db():
        session = TestSession()
        try:
            yield session
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    test_engine.dispose()


@pytest.fixture
def signed_in(client):
    response = client.post(
        "/api/auth/login",
        json={
            "email": "doctor@example.com",
            "password": "test-password-with-12-chars",
        },
    )
    assert response.status_code == 200, response.text
    return client, {"Authorization": f"Bearer {response.json()['token']}"}
