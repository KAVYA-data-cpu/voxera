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
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days default

    # CORS
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # App
    APP_NAME: str = "Voxera"

    # ---- Tencent Hunyuan3D remote provider ----
    # Base URL of a self-hosted/remote Hunyuan3D API server implementing
    # the documented /generate, /send and /status/{uid} endpoints.
    # Leave empty to disable generation (tests mock the adapter).
    HUNYUAN3D_BASE_URL: str = ""
    # Optional bearer token / API key if the hosted provider requires auth.
    # The open-source Hunyuan3D server does not require auth by default.
    HUNYUAN3D_API_KEY: str = ""
    # Request timeout in seconds.
    HUNYUAN3D_TIMEOUT_SECONDS: int = 30
    # Polling timeout in seconds for long-running async tasks.
    HUNYUAN3D_JOB_TIMEOUT_SECONDS: int = 900
    # How often to poll provider job status.
    HUNYUAN3D_POLL_INTERVAL_SECONDS: float = 5.0
    # Max uploaded source image size in bytes.
    HUNYUAN3D_MAX_IMAGE_BYTES: int = 10 * 1024 * 1024
    # Max concurrent generation jobs processed by this backend.
    HUNYUAN3D_MAX_CONCURRENT_JOBS: int = 2
    # Number of generation jobs a single user may have queued/processing.
    HUNYUAN3D_MAX_USER_ACTIVE_JOBS: int = 2
    # Local directory where completed GLB files are cached.
    HUNYUAN3D_OUTPUT_DIR: str = "generated_models"

    # Tell Pydantic where to find the .env file
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


# Create a single instance — imported everywhere else
# This pattern is called "Singleton" — one shared instance
settings = Settings()
