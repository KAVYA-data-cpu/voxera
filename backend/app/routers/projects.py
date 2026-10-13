# =========================================================
# backend/app/routers/projects.py
#
# FEATURE 2: Complete Project CRUD API
#
# ENDPOINTS:
#   GET    /projects                      list all my projects
#   POST   /projects                      create a new project
#   GET    /projects/saved                get my saved projects
#   GET    /projects/{id}                 get a single project
#   PATCH  /projects/{id}                 rename / update
#   DELETE /projects/{id}                 delete a project
#   POST   /projects/{id}/duplicate       duplicate a project
#   POST   /projects/{id}/save            bookmark a project
#   DELETE /projects/{id}/save            remove bookmark
#
# SECURITY CONCEPT: Ownership check
# Every endpoint that operates on a SPECIFIC project verifies:
#   project.user_id == current_user.id
# This prevents IDOR (Insecure Direct Object Reference) attacks.
# Even if user B guesses user A's project ID, the backend blocks it.
#
# CONCEPT: Why check ownership on the backend?
# Frontend can hide buttons, but a malicious user can send raw
# HTTP requests using curl, Postman, or a browser console.
# Backend is the ONLY trustworthy security boundary.
# =========================================================

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.models import User, Project, SavedProject, Notification
from app.schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    SavedProjectResponse,
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])


# =========================================================
# HELPER: Get project + verify ownership
# =========================================================
def get_project_or_404(
    project_id: int,
    user_id: int,
    db: Session,
) -> Project:
    """
    Fetch a project by ID and verify it belongs to the given user.

    Why a helper function?
    Multiple endpoints (get, update, delete, duplicate) need
    the same logic: fetch the row, check ownership, raise errors.
    Extracting it into a helper avoids code repetition (DRY principle).

    Raises:
    - 404 Not Found: if project doesn't exist
    - 403 Forbidden: if project belongs to someone else
      (403 vs 401: 401 = not logged in, 403 = logged in but not allowed)
    """
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # OWNERSHIP CHECK: This is the critical security gate.
    if project.user_id != user_id:
        # Return 404 instead of 403 to not reveal that the project exists.
        # This is called "security through obscurity" — not perfect, but
        # makes it harder for attackers to enumerate other users' projects.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return project


# =========================================================
# HELPER: Add is_saved field to project responses
# =========================================================
def enrich_project(project: Project, user_id: int, db: Session) -> dict:
    """
    Convert a Project ORM object to a dict and add is_saved.

    is_saved is NOT stored in the projects table. It depends on
    which USER is requesting the data. We compute it per-request
    by checking the saved_projects table.

    This is called "computed field" or "virtual field".
    """
    # Check if this user has bookmarked this project
    saved = db.query(SavedProject).filter(
        SavedProject.user_id == user_id,
        SavedProject.project_id == project.id,
    ).first()

    return {
        "id": project.id,
        "user_id": project.user_id,
        "name": project.name,
        "description": project.description,
        "thumbnail_url": project.thumbnail_url,
        "status": project.status,
        "model_file": project.model_file,
        "is_saved": saved is not None,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }


# =========================================================
# GET /projects
# =========================================================
@router.get("", response_model=list[ProjectResponse])
def get_my_projects(
    # QUERY PARAMETERS:
    # These come from the URL like: /projects?search=drone&status=ready&sort=name_asc
    search: str | None = Query(None, description="Search by project name"),
    status_filter: str | None = Query(None, alias="status", description="Filter by status"),
    sort: str | None = Query("updated_desc", description="Sort order"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    GET /projects — return all projects owned by the current user.

    CONCEPT: Query Parameters vs Path Parameters
    - Path params: /projects/{id} → required, part of the URL
    - Query params: /projects?search=x → optional, come after ?

    SEARCH: Frontend sends search term, backend filters by name.
    FILTER: Frontend sends status value, backend filters by status.
    SORT: Frontend sends sort key, backend orders results.

    WHY DO THIS ON BACKEND?
    - The database has indexes, making filtering fast even with
      millions of rows.
    - Frontend filtering requires loading ALL data first, which
      wastes bandwidth as the dataset grows.
    - For this project size, either works, but backend is the
      industry standard approach.
    """
    # Start building the query (not yet executed)
    query = db.query(Project).filter(Project.user_id == current_user.id)

    # ---- SEARCH ----
    # SQL: WHERE LOWER(name) LIKE '%drone%'
    # func.lower() makes search case-insensitive
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            func.lower(Project.name).contains(search.lower())
        )

    # ---- STATUS FILTER ----
    if status_filter and status_filter != "all":
        query = query.filter(Project.status == status_filter)

    # ---- SORTING ----
    # Different sort orders are applied by chaining .order_by()
    sort_options = {
        "updated_desc": Project.updated_at.desc(),   # recently updated first
        "updated_asc": Project.updated_at.asc(),
        "created_desc": Project.created_at.desc(),   # recently created first
        "created_asc": Project.created_at.asc(),
        "name_asc": Project.name.asc(),              # A → Z
        "name_desc": Project.name.desc(),            # Z → A
    }
    order = sort_options.get(sort or "updated_desc", Project.updated_at.desc())
    query = query.order_by(order)

    projects = query.all()

    # Add is_saved field to each project
    return [enrich_project(p, current_user.id, db) for p in projects]


# =========================================================
# POST /projects — CREATE a new project
# =========================================================
@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new project for the authenticated user.

    CONCEPT: HTTP 201 Created vs 200 OK
    - 200: request succeeded, data already existed
    - 201: request succeeded AND a new resource was created
    Using 201 is the REST convention for create endpoints.

    CONCEPT: Pydantic validation
    Before this function even runs, FastAPI passes the request body
    through ProjectCreate. If the name is empty or too long, Pydantic
    raises a 422 Unprocessable Entity automatically — no manual check needed.

    DATA FLOW:
    React form → POST /projects → FastAPI → Pydantic validates
    → SQLAlchemy creates Project row → PostgreSQL stores it
    → FastAPI returns ProjectResponse → React navigates to /projects/{id}
    """
    new_project = Project(
        user_id=current_user.id,  # Always set to the logged-in user's ID
        name=project_data.name,
        description=project_data.description,
        status="draft",           # All new projects start as draft
        model_file=None,          # No 3D file yet (Feature 3+)
        thumbnail_url=None,       # No thumbnail yet
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    return enrich_project(new_project, current_user.id, db)


# =========================================================
# GET /projects/saved — MUST come before GET /projects/{id}
# =========================================================
@router.get("/saved", response_model=list[SavedProjectResponse])
def get_saved_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    GET /projects/saved — return all projects the user has bookmarked.

    IMPORTANT: This route /projects/saved MUST be defined BEFORE
    /projects/{project_id}. Otherwise FastAPI would try to match
    "saved" as a project_id (an integer), fail to convert it, and
    return a 422 error.

    CONCEPT: Route ordering in FastAPI matters for path parameters.
    More specific routes must come before more generic ones.

    CONCEPT: joinedload (SQL JOIN)
    Without joinedload, loading 10 saved projects would trigger
    10 separate SQL queries to fetch each Project — this is the
    N+1 query problem. joinedload fetches all related Projects
    in a single JOIN query.
    """
    saved = (
        db.query(SavedProject)
        .options(joinedload(SavedProject.project))  # JOIN projects table
        .filter(SavedProject.user_id == current_user.id)
        .order_by(SavedProject.saved_at.desc())
        .all()
    )

    # Build response including is_saved=True for each saved project
    result = []
    for s in saved:
        project_dict = enrich_project(s.project, current_user.id, db)
        result.append({
            "id": s.id,
            "user_id": s.user_id,
            "project_id": s.project_id,
            "project": project_dict,
            "saved_at": s.saved_at,
        })
    return result


# =========================================================
# GET /projects/{project_id} — GET a single project
# =========================================================
@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get a single project by ID.

    CONCEPT: Path Parameters
    The {project_id} in the URL is called a path parameter.
    FastAPI automatically reads it from the URL and converts
    it to the annotated type (int). If it can't convert → 422.

    SECURITY: Ownership is verified inside get_project_or_404().
    User B cannot access User A's project even if they know the ID.
    """
    project = get_project_or_404(project_id, current_user.id, db)
    return enrich_project(project, current_user.id, db)


# =========================================================
# PATCH /projects/{project_id} — UPDATE (rename / change status)
# =========================================================
@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    update_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update a project's name, description, or status.

    CONCEPT: PATCH vs PUT
    - PUT: replace the ENTIRE resource with the new data
    - PATCH: update only the SPECIFIC fields provided
    We use PATCH because the user might only want to rename
    the project, not change everything.

    CONCEPT: model_dump(exclude_unset=True)
    This returns only the fields that were actually provided
    in the request body. If the user only sends {"name": "New Name"},
    we don't accidentally set description to None.
    """
    project = get_project_or_404(project_id, current_user.id, db)

    # Only update fields that were provided (PATCH semantics)
    update_fields = update_data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return enrich_project(project, current_user.id, db)


# =========================================================
# DELETE /projects/{project_id} — DELETE a project
# =========================================================
@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently delete a project.

    CONCEPT: HTTP 204 No Content
    Successful DELETE returns 204 (not 200). This means:
    "I processed your request successfully, and there is
    nothing to return because the resource no longer exists."

    CONCEPT: Cascade delete
    The SQLAlchemy relationship on Project has:
        cascade="all, delete-orphan"
    for saves. This means when we delete a Project, all
    associated SavedProject rows are automatically deleted too.
    No manual cleanup needed.
    """
    project = get_project_or_404(project_id, current_user.id, db)
    db.delete(project)
    db.commit()
    # Return nothing (204 No Content)


# =========================================================
# POST /projects/{project_id}/duplicate — DUPLICATE
# =========================================================
@router.post("/{project_id}/duplicate", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def duplicate_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a copy of an existing project.

    The duplicate starts as a new "draft" project owned by the
    same user, with "Copy of" prepended to the name.

    CONCEPT: Why not copy model_file / thumbnail?
    Those are file references (for Feature 3+). Duplicating file
    references without duplicating the actual files would cause
    two projects to share the same file — deleting one would
    break the other. We start fresh for now.

    SECURITY: get_project_or_404 verifies ownership. Only the
    project owner can duplicate their project.
    """
    original = get_project_or_404(project_id, current_user.id, db)

    # Create the duplicate project
    copy_name = f"Copy of {original.name}"
    # Ensure name doesn't exceed 200 chars
    if len(copy_name) > 200:
        copy_name = copy_name[:197] + "..."

    duplicate = Project(
        user_id=current_user.id,
        name=copy_name,
        description=original.description,
        status="draft",       # Reset to draft
        thumbnail_url=None,   # Don't copy thumbnail reference
        model_file=None,      # Don't copy model file reference
    )
    db.add(duplicate)
    db.commit()
    db.refresh(duplicate)

    return enrich_project(duplicate, current_user.id, db)


# =========================================================
# POST /projects/{project_id}/save — BOOKMARK a project
# =========================================================
@router.post("/{project_id}/save", status_code=status.HTTP_201_CREATED)
def save_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Bookmark (save) a project.

    DESIGN NOTE: Unlike delete/update, saving doesn't require
    the project to belong to the current user. You can bookmark
    OTHER people's projects (community feature, Feature 4+).
    But the project must EXIST.

    IDEMPOTENT: If already saved, return 200 instead of creating
    a duplicate. This prevents duplicate bookmarks.

    CONCEPT: Idempotent
    Calling the same operation multiple times produces the same
    result. The second "save" does not create a second bookmark.
    """
    # Check the project exists (no ownership check — anyone can save)
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # Check if already saved (idempotency check)
    existing = db.query(SavedProject).filter(
        SavedProject.user_id == current_user.id,
        SavedProject.project_id == project_id,
    ).first()

    if existing:
        # Already saved — return success without creating duplicate
        return {"message": "Project already saved", "project_id": project_id}

    # Create the bookmark
    saved = SavedProject(
        user_id=current_user.id,
        project_id=project_id,
    )
    db.add(saved)
    db.commit()

    return {"message": "Project saved successfully", "project_id": project_id}


# =========================================================
# DELETE /projects/{project_id}/save — REMOVE bookmark
# =========================================================
@router.delete("/{project_id}/save", status_code=status.HTTP_200_OK)
def unsave_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Remove a project bookmark.

    CONCEPT: Why not use 404 if not saved?
    If the user clicks "unsave" and the bookmark doesn't exist,
    we return 200 success. The end result (project not saved) is
    what they wanted anyway. This is lenient idempotency.
    """
    saved = db.query(SavedProject).filter(
        SavedProject.user_id == current_user.id,
        SavedProject.project_id == project_id,
    ).first()

    if saved:
        db.delete(saved)
        db.commit()

    return {"message": "Project removed from saved", "project_id": project_id}
