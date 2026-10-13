# =========================================================
# backend/app/routers/auth.py
#
# STEP 3 & 4: Registration and Login API endpoints.
#
# CONCEPT: FastAPI Router.
# Instead of putting all routes in main.py (messy!), we group
# related routes into "routers". This keeps code organized.
# The router is then "included" in main.py.
#
# ENDPOINT FLOW:
#
# POST /auth/register:
#   client → validate data (Pydantic) → check for duplicates
#   → hash password → save to DB → create JWT → return token+user
#
# POST /auth/login:
#   client → find user by email → verify password (bcrypt)
#   → create JWT → return token+user
# =========================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserSettings, Notification
from app.schemas import UserCreate, UserLogin, Token, UserResponse
from app.auth.security import hash_password, verify_password, create_access_token

# Create a router with a URL prefix and tag (shown in API docs)
router = APIRouter(prefix="/auth", tags=["Authentication"])


# =========================================================
# STEP 3: POST /auth/register
# =========================================================
@router.post(
    "/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user account.

    Steps:
    1. Check if email is already registered
    2. Check if username is already taken
    3. Hash the password (NEVER store plain text!)
    4. Create User record in DB
    5. Create default UserSettings for this user
    6. Create a welcome notification
    7. Generate and return a JWT token
    """
    # ---- Step 1: Check email uniqueness ----
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    # ---- Step 2: Check username uniqueness ----
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This username is already taken",
        )

    # ---- Step 3: Hash password ----
    # plain_password → bcrypt hash (one-way, salted)
    hashed = hash_password(user_data.password)

    # ---- Step 4: Create User ----
    new_user = User(
        name=user_data.name,
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed,  # Store hash, NOT the plain password
    )
    db.add(new_user)
    db.flush()  # flush to get new_user.id without committing yet

    # ---- Step 5: Create default settings ----
    settings_record = UserSettings(user_id=new_user.id, theme="system")
    db.add(settings_record)

    # ---- Step 6: Welcome notification ----
    welcome_notif = Notification(
        user_id=new_user.id,
        title="Welcome to Voxera! 🎉",
        message=(
            "Your account is ready. Start by completing your profile "
            "and exploring the AI 3D design tools coming in Feature 2!"
        ),
    )
    db.add(welcome_notif)

    # Commit all three records in one transaction
    db.commit()
    db.refresh(new_user)

    # ---- Step 7: Create JWT ----
    # "sub" (subject) is the standard JWT claim for user identity
    token = create_access_token({"sub": str(new_user.id)})

    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user),
    )


# =========================================================
# STEP 4: POST /auth/login
# =========================================================
@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate a user and return a JWT token.

    Security note on error messages:
    We return the SAME error for "user not found" and "wrong
    password". This prevents attackers from discovering which
    emails are registered (user enumeration attack).
    """
    # ---- Find user by email ----
    user = db.query(User).filter(User.email == credentials.email).first()

    # ---- Verify password ----
    # IMPORTANT: We check BOTH conditions before raising the error.
    # This avoids leaking whether the email exists.
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ---- Create JWT token ----
    token = create_access_token({"sub": str(user.id)})

    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


# =========================================================
# POST /auth/logout (soft logout)
# =========================================================
@router.post("/logout", status_code=status.HTTP_200_OK)
def logout():
    """
    Logout endpoint.

    Since JWT is stateless (no session on server), actual logout
    is handled on the frontend by deleting the token from
    localStorage. This endpoint just returns success for
    completeness (useful if we add token blacklisting later).
    """
    return {"message": "Logged out successfully"}
