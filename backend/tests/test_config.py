from app.main import create_app
from fastapi.testclient import TestClient


def test_production_disables_demo_seed_and_local_cors_by_default(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("SEED_DEMO_DATA", "true")
    monkeypatch.delenv("ALLOW_SIGNUP", raising=False)
    monkeypatch.setenv("FRONTEND_URL", "https://frontend.example.com")
    monkeypatch.delenv("EXTRA_ALLOWED_ORIGINS", raising=False)

    app = create_app(initialize_database=False)
    assert app.state.demo_login_enabled is False
    assert app.state.allow_signup is False

    with TestClient(app) as client:
        config = client.get("/api/auth/config")
        assert config.json() == {"allow_signup": False, "demo_login_enabled": False}

        allowed = client.options(
            "/api/auth/config",
            headers={
                "Origin": "https://frontend.example.com",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert allowed.status_code == 200
        assert allowed.headers["access-control-allow-origin"] == "https://frontend.example.com"

        local_origin = client.options(
            "/api/auth/config",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert "access-control-allow-origin" not in local_origin.headers
