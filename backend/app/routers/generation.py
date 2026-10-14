import os
from pathlib import Path
from typing import Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.config import settings
from app.database import get_db
from app.models import GenerationJob, Project, User
from app.schemas import GenerationJobResponse, TextTo3DRequest
from app.services.hunyuan3d import (
    Hunyuan3DProviderError,
    process_generation_job,
)

router = APIRouter(prefix="/generation", tags=["Generation"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _job_response(job: GenerationJob) -> GenerationJobResponse:
    model_url = None
    if job.status == "completed" and job.output_path and os.path.exists(job.output_path):
        model_url = f"/generation/{job.id}/download"
    return GenerationJobResponse(
        id=job.id,
        user_id=job.user_id,
        project_id=job.project_id,
        mode=job.mode,
        prompt=job.prompt,
        status=job.status,
        error=job.error,
        model_url=model_url,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


def _verify_project_ownership(project_id: int, user_id: int, db: Session) -> None:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project or project.user_id != user_id:
        raise HTTPException(status_code=404, detail="Project not found")


def _active_job_count(user_id: int, db: Session) -> int:
    return (
        db.query(GenerationJob)
        .filter(
            GenerationJob.user_id == user_id,
            GenerationJob.status.in_(("queued", "processing")),
        )
        .count()
    )


@router.post("/text-to-3d", response_model=GenerationJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_text_job(
    data: TextTo3DRequest,
    project_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    if _active_job_count(current_user.id, db) >= settings.HUNYUAN3D_MAX_USER_ACTIVE_JOBS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You already have the maximum number of active generation jobs",
        )

    if project_id is not None:
        _verify_project_ownership(project_id, current_user.id, db)

    job = GenerationJob(
        user_id=current_user.id,
        project_id=project_id,
        mode="text",
        prompt=data.prompt,
        status="queued",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(process_generation_job, job.id)
    return _job_response(job)


@router.post("/image-to-3d", response_model=GenerationJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_image_job(
    file: UploadFile = File(...),
    project_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    if _active_job_count(current_user.id, db) >= settings.HUNYUAN3D_MAX_USER_ACTIVE_JOBS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You already have the maximum number of active generation jobs",
        )

    if project_id is not None:
        _verify_project_ownership(project_id, current_user.id, db)

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPEG, PNG, and WebP images are supported",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty image file")
    if len(content) > settings.HUNYUAN3D_MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image exceeds maximum size of {settings.HUNYUAN3D_MAX_IMAGE_BYTES} bytes",
        )

    job = GenerationJob(
        user_id=current_user.id,
        project_id=project_id,
        mode="image",
        prompt=None,
        status="queued",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Persist the source image temporarily so the background worker can submit it.
    temp_dir = Path.cwd() / "generated_models" / "inputs"
    temp_dir.mkdir(parents=True, exist_ok=True)
    extension = ".png"
    if file.filename and "." in file.filename:
        extension = "." + file.filename.rsplit(".", 1)[-1].lower()
        if extension not in {".jpg", ".jpeg", ".png", ".webp"}:
            extension = ".png"
    input_path = temp_dir / f"{job.id}{extension}"
    input_path.write_bytes(content)
    job.input_path = str(input_path)
    db.commit()

    background_tasks.add_task(process_generation_job, job.id)
    return _job_response(job)


@router.get("/{job_id}", response_model=GenerationJobResponse, tags=["Generation"])
def get_job_status(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Generation job not found")
    return _job_response(job)


@router.get("/{job_id}/download", tags=["Generation"])
def download_job_model(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Generation job not found")
    if job.status != "completed" or not job.output_path or not os.path.exists(job.output_path):
        raise HTTPException(status_code=409, detail="Model is not ready for download")

    return FileResponse(
        job.output_path,
        media_type="model/gltf-binary",
        filename=f"hunyuan3d-{job.id}.glb",
    )
