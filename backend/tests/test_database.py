from app.database import _database_url


def test_render_postgres_legacy_url_is_normalized(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL", "postgres://demo:password@db.example.com/medscribe?sslmode=require"
    )
    assert _database_url() == "postgresql://demo:password@db.example.com/medscribe?sslmode=require"


def test_blank_database_url_uses_local_sqlite(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "")
    assert _database_url() == "sqlite:///./carenote.db"
