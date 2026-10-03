"""Environment-backed application settings with safe production defaults."""

from __future__ import annotations

import os


def env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None or not value.strip():
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def app_environment() -> str:
    return os.getenv("APP_ENV", "development").strip().lower()


def is_production() -> bool:
    return app_environment() in {"production", "prod"}


def allow_signup() -> bool:
    return env_bool("ALLOW_SIGNUP", default=not is_production())


def seed_demo_data() -> bool:
    # Known demo credentials and shared synthetic records are never seeded in
    # production, even if the seed flag is accidentally enabled there.
    if is_production():
        return False
    return env_bool("SEED_DEMO_DATA", default=True)
