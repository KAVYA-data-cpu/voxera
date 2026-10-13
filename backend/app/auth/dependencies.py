# =========================================================
# backend/app/auth/dependencies.py
#
# STEP 5: JWT verification + current user dependency.
#
# CONCEPT: FastAPI Dependencies.
# FastAPI's Depends() system lets you declare that a route
# "depends on" some function. FastAPI will call that function
# first and pass its result to your route handler.
#
# get_current_user() is the key dependency:
# - Extracts the Bearer token from the Authorization header
# - Verifies the JWT signature + expiry
# - Looks up the user in the database
# - Returns the User object to the route handler
# - Raises 401 Unauthorized if anything is wrong
#
# This is AUTHORIZATION (not just authentication):
# Authentication = who are you?
# Authorization = are you allowed to do this?
# =========================================================

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.auth.security import decode_access_token

# OAuth2PasswordBearer tells FastAPI:
# "Look for a Bearer token in the Authorization header"
# tokenUrl is the endpoint that ISSUES tokens (for docs only)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),  # automatically extracts token
    db: Session = Depends(get_db),        # automatically opens DB session
) -> User:
    """
    Dependency: verify JWT and return the logged-in User.

    Used in protected routes like:
        @router.get("/users/me")
        def get_me(current_user: User = Depends(get_current_user)):
            ...

    Flow:
    1. FastAPI reads "Authorization: Bearer <token>" header
    2. We decode the JWT to get user_id
    3. We look up the user in the database
    4. We return the User object

    If any step fails → raise 401 Unauthorized
    """
    # Standard HTTP 401 exception to raise when auth fails
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Decode the JWT
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    # Extract user_id from the payload
    user_id: int | None = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    # Look up user in database
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    return user
