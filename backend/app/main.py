import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from . import models
from .routers import auth, patients, consultations, audit
from .seed import seed

Base.metadata.create_all(bind=engine)
seed()

app = FastAPI(
    title="Medscribe Ai",
    description="AI-assisted clinical documentation prototype (demo/synthetic data only).",
    version="0.1.0",
)

# CORS origins come from the FRONTEND_URL env var (set this to your deployed
# Vercel URL, e.g. https://your-app.vercel.app — no trailing slash) plus
# localhost for local development. Add more comma-separated URLs via
# EXTRA_ALLOWED_ORIGINS if you have preview deployments to allow too.
_default_origins = ["http://localhost:5173"]
_frontend_url = os.getenv("FRONTEND_URL", "").strip()
_extra_origins = [o.strip() for o in os.getenv("EXTRA_ALLOWED_ORIGINS", "").split(",") if o.strip()]

allowed_origins = _default_origins + _extra_origins
if _frontend_url:
    allowed_origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # never "*" together with allow_credentials=True
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(consultations.router)
app.include_router(audit.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Medscribe Ai backend"}
