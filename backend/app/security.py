"""Password and opaque-session token helpers."""

from __future__ import annotations

import hashlib
import os
import secrets
from datetime import timedelta

import bcrypt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from .models import utcnow

_password_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, encoded_hash: str) -> bool:
    """Verify current Argon2id hashes and safely upgrade legacy bcrypt users."""
    if encoded_hash.startswith("$argon2"):
        try:
            return _password_hasher.verify(encoded_hash, password)
        except (VerifyMismatchError, VerificationError, InvalidHashError):
            return False

    if encoded_hash.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            # The previous passlib+bcrypt setup truncated inputs at bcrypt's
            # 72-byte limit; preserve verification for those legacy hashes.
            return bcrypt.checkpw(password.encode("utf-8")[:72], encoded_hash.encode("ascii"))
        except (ValueError, UnicodeEncodeError):
            return False

    return False


def should_rehash_password(encoded_hash: str) -> bool:
    if not encoded_hash.startswith("$argon2"):
        return True
    try:
        return _password_hasher.check_needs_rehash(encoded_hash)
    except InvalidHashError:
        return True


def new_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def session_expiry():
    try:
        ttl_hours = int(os.getenv("SESSION_TTL_HOURS", "12"))
    except ValueError:
        ttl_hours = 12
    ttl_hours = max(1, min(ttl_hours, 168))
    return utcnow() + timedelta(hours=ttl_hours)
