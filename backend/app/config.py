# =========================================================
# backend/app/config.py
#
# CONCEPT: Configuration management with Pydantic Settings.
#
# pydantic-settings reads values from the .env file and
# validates them. This gives us type-safe config access
# across the entire application.
#
# Why not just use os.environ? Pydantic Settings:
# - Validates types (e.g., ensures port is an int)
# - Gives descriptive errors if a required variable is missing
# - Groups all config in one place
# =========================================================

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from .env file.
    All fields are type-validated by Pydantic.
    """

    # Database
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days default

    # CORS
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # App
    APP_NAME: str = "Voxera"

    # Tell Pydantic where to find the .env file
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


# Create a single instance — imported everywhere else
# This pattern is called "Singleton" — one shared instance
settings = Settings()
