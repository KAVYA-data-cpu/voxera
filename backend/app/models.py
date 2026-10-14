# =========================================================
# backend/app/models.py
#
# STEP 1: Database models (SQLAlchemy ORM tables).
#
# CONCEPT: What is an ORM model?
# Each class here = one table in PostgreSQL.
# Each class attribute = one column in that table.
#
# Instead of writing:
#   CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR, ...)
# We write a Python class and SQLAlchemy generates the SQL.
#
# RELATIONSHIPS:
# - User → Project: One user can have many projects (one-to-many)
# - User → SavedProject: one-to-many (through join table)
# - User → Notification: one-to-many
# - User → UserSettings: one-to-one
# =========================================================

from datetime import datetime, timezone
from sqlalchemy import (
    Integer, String, Text, Boolean, DateTime,
    ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database import Base


def utcnow() -> datetime:
    """Return the current UTC time (timezone-aware)."""
    return datetime.now(timezone.utc)


# =========================================================
# USER TABLE
# =========================================================
class User(Base):
    """
    Stores registered user accounts.

    Security notes:
    - password_hash: We NEVER store the plain password.
      We store only a bcrypt hash of it.
    - email: unique=True prevents duplicate accounts.
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar: Mapped[str | None] = mapped_column(String(500), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships (SQLAlchemy loads related objects automatically)
    projects: Mapped[list["Project"]] = relationship(
        "Project", back_populates="owner", cascade="all, delete-orphan"
    )
    saved_projects: Mapped[list["SavedProject"]] = relationship(
        "SavedProject", back_populates="user", cascade="all, delete-orphan"
    )
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )
    settings: Mapped["UserSettings | None"] = relationship(
        "UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


# =========================================================
# USER SETTINGS TABLE
# =========================================================
class UserSettings(Base):
    """
    One-to-one extension of User for preferences.
    Stored separately to keep the users table lean.
    """
    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    theme: Mapped[str] = mapped_column(
        SAEnum("light", "dark", "system", name="theme_enum"),
        default="system",
        nullable=False,
    )
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    push_notifications: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="settings")


# =========================================================
# PROJECT TABLE
# =========================================================
class Project(Base):
    """
    Represents a 3D project/model owned by a user.

    Feature 2: Full CRUD operations are implemented.
    Feature 3+: Actual 3D model generation/processing will be added.

    Status values:
    - draft: Just created, not yet processed
    - generating: AI is generating the 3D model (future)
    - processing: Post-processing (slicing, analysis) in progress (future)
    - ready: Model is ready to view/print
    - completed: Print job completed
    - failed: Processing or generation failed
    """
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # DESIGN DECISION: Using String instead of PostgreSQL ENUM.
    # ENUM requires a DB migration to add new values.
    # String lets us add statuses (e.g. "generating", "completed")
    # without touching the database schema.
    # Validation of allowed values happens in Pydantic schemas.
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)

    # model_file: reference to the 3D model file (future Feature 3+)
    # For now, this will always be null.
    model_file: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    owner: Mapped["User"] = relationship("User", back_populates="projects")
    saves: Mapped[list["SavedProject"]] = relationship(
        "SavedProject", back_populates="project", cascade="all, delete-orphan"
    )


# =========================================================
# SAVED PROJECT (Bookmarks) TABLE
# =========================================================
class SavedProject(Base):
    """
    Join table: which user saved which project.
    A user can save community projects (not just their own).
    """
    __tablename__ = "saved_projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    saved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped["User"] = relationship("User", back_populates="saved_projects")
    project: Mapped["Project"] = relationship("Project", back_populates="saves")


# =========================================================
# NOTIFICATION TABLE
# =========================================================
class Notification(Base):
    """
    System/app notifications for a user.
    Examples: project processing complete, welcome message, etc.
    """
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped["User"] = relationship("User", back_populates="notifications")


# =========================================================
# GENERATION JOB TABLE
# =========================================================
class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), nullable=True, index=True)
    mode: Mapped[str] = mapped_column(String(20), nullable=False)
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    remote_uid: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="queued", nullable=False)
    output_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    input_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
