from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlparse

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .config import allow_signup as env_allows_signup
from .config import is_production
from .config import seed_demo_data as env_seeds_demo_data
from .database import Base, engine, get_db, migrate_legacy_schema
from .routers import audit, auth, consultations, patients
from .seed import seed

logger = logging.getLogger(__name__)


def _cors_origins() -> list[str]:
    candidates = [] if is_production() else ["http://localhost:5173"]
    frontend_url = os.getenv("FRONTEND_URL", "").strip()
    extras = [
        origin.strip()
        for origin in os.getenv("EXTRA_ALLOWED_ORIGINS", "").split(",")
        if origin.strip()
    ]
    candidates.extend(extras)
    if frontend_url:
        candidates.append(frontend_url)

    origins: list[str] = []
    for candidate in candidates:
        origin = candidate.rstrip("/")
        parsed = urlparse(origin)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.path
            or parsed.query
            or parsed.fragment
        ):
            raise RuntimeError(
                "FRONTEND_URL and EXTRA_ALLOWED_ORIGINS must contain valid origins without paths"
            )
        if origin not in origins:
            origins.append(origin)
    return origins


def create_app(
    *,
    initialize_database: bool = True,
    allow_signup: bool | None = None,
    demo_login_enabled: bool | None = None,
) -> FastAPI:
    production = is_production()
    should_seed = env_seeds_demo_data()
    signup_enabled = env_allows_signup() if allow_signup is None else allow_signup
    demo_enabled = (
        (should_seed and not production) if demo_login_enabled is None else demo_login_enabled
    )

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        if initialize_database:
            Base.metadata.create_all(bind=engine)
            migrate_legacy_schema(engine)
            if should_seed:
                seed()
                # Assign any pre-tenancy demo records that were migrated before
                # the original seeded doctor existed.
                migrate_legacy_schema(engine)
        yield

    app = FastAPI(
        title="Medscribe AI",
        description=(
            "AI-assisted clinical documentation demo using synthetic data. "
            "It does not diagnose and is not certified for clinical deployment."
        ),
        version="1.0.0",
        debug=False,
        lifespan=lifespan,
    )
    app.state.allow_signup = signup_enabled
    app.state.demo_login_enabled = demo_enabled

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins(),
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
        max_age=600,
    )

    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy", "camera=(), microphone=(), geolocation=()"
        )
        if production:
            response.headers.setdefault(
                "Content-Security-Policy",
                "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; "
                "img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; "
                "style-src 'self' https://fonts.googleapis.com; script-src 'self'; connect-src 'self' https:; form-action 'self'",
            )
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        if production and (
            request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
        ):
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
        return response

    app.include_router(auth.router)
    app.include_router(patients.router)
    app.include_router(consultations.router)
    app.include_router(audit.router)

    @app.get("/api/health")
    def health(db: Session = Depends(get_db)):
        try:
            db.execute(text("SELECT 1"))
        except SQLAlchemyError as exc:
            logger.error("Database health check failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database is unavailable",
            ) from exc
        return {"status": "ok", "service": "Medscribe AI API", "database": "ok"}

    frontend_dist = Path(__file__).resolve().parent / "static"
    frontend_assets = frontend_dist / "assets"
    if frontend_dist.is_dir():
        if frontend_assets.is_dir():
            app.mount("/assets", StaticFiles(directory=frontend_assets), name="frontend-assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        def serve_frontend(full_path: str):
            # Unknown API paths must remain API 404s, not return the SPA HTML.
            if full_path == "api" or full_path.startswith("api/"):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="API endpoint not found"
                )
            return FileResponse(frontend_dist / "index.html")

    return app


app = create_app()
