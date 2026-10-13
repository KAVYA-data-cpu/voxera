# =========================================================
# backend/app/routers/users.py
#
# STEP 6: Current-user API and user management endpoints.
#
# All endpoints here are PROTECTED — they require a valid JWT.
# The get_current_user dependency handles token verification.
#
# ENDPOINTS:
# GET  /users/me          — get current user's profile
# PATCH /users/me         — update profile
# GET  /users/me/settings — get user settings
# PATCH /users/me/settings — update settings
# =========================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserSettings
from app.schemas import UserResponse, UserUpdate, UserSettingsResponse, UserSettingsUpdate
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


# =========================================================
# STEP 6: GET /users/me
# =========================================================
@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Return the currently authenticated user's profile.

    This endpoint is used by the React frontend on:
    - App startup (to verify the stored token is still valid)
    - After login (to populate auth state)

    The Depends(get_current_user) does all the JWT verification.
    """
    return current_user


# =========================================================
# PATCH /users/me — Update profile
# =========================================================
@router.patch("/me", response_model=UserResponse)
def update_me(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update the current user's profile fields.

    Only provided fields are updated (PATCH semantics).
    We check for username uniqueness before updating.
    """
    # Check if new username conflicts with another user
    if update_data.username and update_data.username != current_user.username:
        existing = db.query(User).filter(
            User.username == update_data.username,
            User.id != current_user.id,  # not ourselves
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This username is already taken",
            )

    # Apply only the fields that were provided in the request
    # model_dump(exclude_unset=True) returns only non-None fields
    update_fields = update_data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return current_user


# =========================================================
# GET /users/me/settings
# =========================================================
@router.get("/me/settings", response_model=UserSettingsResponse)
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user's preference settings."""
    settings = db.query(UserSettings).filter(
        UserSettings.user_id == current_user.id
    ).first()

    if not settings:
        # Create default settings if missing (shouldn't happen after register)
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


# =========================================================
# PATCH /users/me/settings
# =========================================================
@router.patch("/me/settings", response_model=UserSettingsResponse)
def update_settings(
    update_data: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user's preference settings."""
    settings = db.query(UserSettings).filter(
        UserSettings.user_id == current_user.id
    ).first()

    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)

    update_fields = update_data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)
    return settings
