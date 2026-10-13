# =========================================================
# backend/app/schemas.py
#
# CONCEPT: Pydantic Schemas (Data Transfer Objects).
#
# Schemas serve two purposes:
# 1. VALIDATION: Pydantic validates incoming request bodies
#    before your code even runs.
# 2. SERIALIZATION: They control what data is sent back to
#    the frontend (e.g., we NEVER include password_hash).
#
# DIFFERENCE from SQLAlchemy models:
# - SQLAlchemy models = database structure
# - Pydantic schemas = API input/output structure
#
# Naming convention:
# - XxxCreate: incoming data to create a record
# - XxxUpdate: incoming data to update a record
# - XxxResponse: outgoing data returned to client
# =========================================================

from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator
import re


# =========================================================
# USER SCHEMAS
# =========================================================

class UserCreate(BaseModel):
    """Data required to register a new user."""
    name: str
    username: str
    email: EmailStr          # Pydantic validates email format automatically
    password: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r'^[a-zA-Z0-9_]{3,20}$', v):
            raise ValueError(
                "Username must be 3-20 characters, "
                "letters, numbers, and underscores only"
            )
        return v

    @field_validator("password")
    @classmethod
    def password_strong_enough(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    """Data required to log in."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """
    Safe user data returned to the frontend.
    Notice: NO password_hash field here.
    """
    id: int
    name: str
    username: str
    email: str
    avatar: str | None
    bio: str | None
    created_at: datetime
    updated_at: datetime

    # model_config tells Pydantic to read from SQLAlchemy ORM objects
    # (not just plain dicts). This is required for "from_attributes".
    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """All fields are optional — user can update any subset."""
    name: str | None = None
    username: str | None = None
    bio: str | None = None
    avatar: str | None = None

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip().lower()
        if not re.match(r'^[a-zA-Z0-9_]{3,20}$', v):
            raise ValueError("Invalid username format")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v


# =========================================================
# AUTH SCHEMAS
# =========================================================

class Token(BaseModel):
    """Returned after successful login or register."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    """
    The payload stored inside the JWT.
    We decode this when verifying a token.
    """
    user_id: int | None = None


# =========================================================
# USER SETTINGS SCHEMAS
# =========================================================

class UserSettingsResponse(BaseModel):
    id: int
    user_id: int
    theme: str
    email_notifications: bool
    push_notifications: bool
    model_config = {"from_attributes": True}


class UserSettingsUpdate(BaseModel):
    theme: str | None = None
    email_notifications: bool | None = None
    push_notifications: bool | None = None

    @field_validator("theme")
    @classmethod
    def theme_valid(cls, v: str | None) -> str | None:
        if v is not None and v not in ("light", "dark", "system"):
            raise ValueError("Theme must be 'light', 'dark', or 'system'")
        return v


# =========================================================
# PROJECT SCHEMAS
# =========================================================

# All valid status values in one place.
# We define it here so frontend and backend stay in sync.
VALID_PROJECT_STATUSES = ("draft", "generating", "processing", "ready", "completed", "failed")


class ProjectCreate(BaseModel):
    """
    Data required to create a new project.
    Only name is required — description is optional.
    """
    name: str
    description: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Project name cannot be empty")
        if len(v) < 2:
            raise ValueError("Project name must be at least 2 characters")
        if len(v) > 200:
            raise ValueError("Project name cannot exceed 200 characters")
        return v

    @field_validator("description")
    @classmethod
    def description_clean(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if len(v) > 2000:
                raise ValueError("Description cannot exceed 2000 characters")
            return v if v else None
        return v


class ProjectUpdate(BaseModel):
    """
    Data for updating a project. All fields are optional.
    PATCH semantics: only send the fields you want to change.
    """
    name: str | None = None
    description: str | None = None
    status: str | None = None

    @field_validator("name")
    @classmethod
    def name_valid(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Project name must be at least 2 characters")
        if len(v) > 200:
            raise ValueError("Project name cannot exceed 200 characters")
        return v

    @field_validator("status")
    @classmethod
    def status_valid(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_PROJECT_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(VALID_PROJECT_STATUSES)}")
        return v


class ProjectResponse(BaseModel):
    """
    Safe project data returned to the frontend.
    Includes is_saved so the frontend knows if the current user bookmarked it.
    """
    id: int
    user_id: int
    name: str
    description: str | None
    thumbnail_url: str | None
    status: str
    model_file: str | None
    # is_saved: computed on the backend for the current user.
    # This tells the frontend whether to show a filled or empty bookmark icon.
    is_saved: bool = False
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# =========================================================
# SAVED PROJECT SCHEMAS
# =========================================================

class SavedProjectResponse(BaseModel):
    id: int
    user_id: int
    project_id: int
    project: ProjectResponse
    saved_at: datetime
    model_config = {"from_attributes": True}


# =========================================================
# NOTIFICATION SCHEMAS
# =========================================================

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime
    model_config = {"from_attributes": True}
