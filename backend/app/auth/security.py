# =========================================================
# backend/app/auth/security.py
#
# STEP 2: Authentication utilities.
#
# This module handles:
# 1. Password hashing — converts plain password → bcrypt hash
# 2. Password verification — checks plain password vs stored hash
# 3. JWT creation — encodes user data into a signed token
# 4. JWT verification — decodes and validates a token
#
# CONCEPT: Why hash passwords?
# Storing plain passwords is dangerous — if the database is
# breached, all users are immediately compromised.
# bcrypt hashes are:
# - One-way: you can't reverse a hash to get the password
# - Salted: each hash is unique even for the same password
# - Slow: bcrypt is intentionally slow to make brute-force hard
#
# CONCEPT: What is a JWT?
# JWT = JSON Web Token. Format: header.payload.signature
# - Header: algorithm used (HS256)
# - Payload: data (user_id, expiry time)
# - Signature: HMAC hash of header+payload using SECRET_KEY
# The server can verify the signature without a database lookup.
# =========================================================

from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import JWTError, jwt
from app.config import settings

# ---- PASSWORD HASHING ----
# CryptContext manages password hashing schemes.
# "bcrypt" is the algorithm. "auto" means the scheme is
# automatically upgraded if we switch algorithms in the future.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """
    Hash a plain-text password using bcrypt.
    The salt is embedded in the hash string automatically.

    Example:
        hash_password("mysecret123")
        → "$2b$12$4GhMs.../some-long-hash..."
    """
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a stored bcrypt hash.
    Uses timing-safe comparison (prevents timing attacks).

    Returns True if they match, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)


# ---- JWT CREATION ----
def create_access_token(data: dict) -> str:
    """
    Create a JWT access token.

    Steps:
    1. Copy the data payload.
    2. Add an expiry timestamp (exp claim).
    3. Sign the token with our SECRET_KEY using HS256.

    The 'exp' claim is standard in JWTs — the jose library
    automatically rejects expired tokens during verification.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})

    # jwt.encode() returns the signed token string
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return encoded_jwt


# ---- JWT VERIFICATION ----
def decode_access_token(token: str) -> dict | None:
    """
    Decode and verify a JWT token.

    Returns the payload dict if valid, None if invalid/expired.

    Why can this fail?
    - Token was tampered with (signature won't match)
    - Token has expired (exp < current time)
    - Token is malformed (not valid JWT format)
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return payload
    except JWTError:
        return None
