# =========================================================
# backend/app/database.py
#
# STEP 1 (part 1): Database connection setup.
#
# CONCEPT: SQLAlchemy ORM connection.
#
# SQLAlchemy is an Object-Relational Mapper (ORM):
# - You write Python classes (models) instead of SQL tables.
# - SQLAlchemy translates those classes into SQL automatically.
#
# Key terms:
# - Engine: The connection pool to the database.
# - SessionLocal: A factory that creates database sessions.
# - Base: The base class all models inherit from.
# - get_db: A "dependency" FastAPI calls to open and close a DB
#   session for each request.
# =========================================================

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings


# ---- ENGINE ----
# The engine manages the connection pool.
# pool_pre_ping=True: tests connections before using them
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

# ---- SESSION FACTORY ----
# SessionLocal is a class. Each call to SessionLocal() creates
# a new database session (a transaction context).
# autocommit=False: we manually commit (intentional)
# autoflush=False: don't auto-flush before queries
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ---- BASE MODEL CLASS ----
# All SQLAlchemy models will inherit from Base.
# This lets SQLAlchemy track all the tables.
class Base(DeclarativeBase):
    pass


# ---- DB DEPENDENCY ----
# FastAPI calls this function for every request that needs DB.
# Using "yield" makes it a generator:
# - Code BEFORE yield: opens the session (setup)
# - yield: provides the session to the route handler
# - Code AFTER yield (in finally): always closes the session
#
# This is called the "dependency injection" pattern.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
