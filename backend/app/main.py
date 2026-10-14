# =========================================================
# backend/app/main.py
#
# The FastAPI application entry point.
#
# CONCEPT: What happens here?
# 1. Create the FastAPI app instance
# 2. Configure CORS (Cross-Origin Resource Sharing)
# 3. Create all database tables
# 4. Include all routers (auth, users, projects, notifications)
# 5. Add a health-check root endpoint
#
# CONCEPT: CORS (Cross-Origin Resource Sharing)
# Your React app runs on http://localhost:5173
# Your FastAPI runs on http://localhost:8000
# These are DIFFERENT origins (different ports).
#
# Browsers block requests from one origin to another by default
# for security (Same-Origin Policy).
#
# CORS headers tell the browser: "It's OK for localhost:5173
# to make requests to this API."
#
# Without CORS configured, your React app would get:
#   Access-Control-Allow-Origin missing → fetch blocked by browser
# =========================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import auth, users, projects, notifications, generation

# ---- Create FastAPI app ----
app = FastAPI(
    title=f"{settings.APP_NAME} API",
    description="Backend API for the AI 3D Print Assistant",
    version="1.0.0",
)

# ---- Configure CORS ----
# This must be added BEFORE including routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],  # only allow our frontend
    allow_credentials=True,    # allow cookies / Authorization header
    allow_methods=["*"],       # GET, POST, PATCH, DELETE, OPTIONS
    allow_headers=["*"],       # Content-Type, Authorization, etc.
)

# ---- Create DB tables ----
# This creates any tables that don't exist yet.
# In production you would use Alembic migrations instead.
Base.metadata.create_all(bind=engine)

# ---- Include routers ----
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(notifications.router)
app.include_router(generation.router)


# ---- Health check ----
@app.get("/", tags=["Health"])
def health_check():
    """Verify the API is running."""
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": "1.0.0",
    }
