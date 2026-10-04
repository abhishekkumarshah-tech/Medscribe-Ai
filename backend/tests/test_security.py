import bcrypt
from app.security import hash_password, hash_session_token, should_rehash_password, verify_password


def test_argon2_password_hash_round_trip():
    encoded = hash_password("a-strong-password")
    assert encoded.startswith("$argon2id$")
    assert verify_password("a-strong-password", encoded)
    assert not verify_password("not-the-password", encoded)
    assert not should_rehash_password(encoded)


def test_legacy_bcrypt_hash_is_verified_and_marked_for_upgrade():
    encoded = bcrypt.hashpw(b"legacy-password", bcrypt.gensalt()).decode("ascii")
    assert verify_password("legacy-password", encoded)
    assert should_rehash_password(encoded)


def test_session_tokens_are_stored_as_one_way_hashes():
    token_hash = hash_session_token("test-session-token")
    assert len(token_hash) == 64
    assert token_hash != "test-session-token"
