import asyncio
import base64
import logging
import os
import time
from pathlib import Path
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models import GenerationJob

logger = logging.getLogger(__name__)


class Hunyuan3DProviderError(Exception):
    """Raised when the remote Hunyuan3D provider rejects or fails a request."""


def _base_url() -> str:
    return settings.HUNYUAN3D_BASE_URL.strip().rstrip("/")


def _headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if settings.HUNYUAN3D_API_KEY.strip():
        headers["Authorization"] = f"Bearer {settings.HUNYUAN3D_API_KEY.strip()}"
    return headers


def _resolved_output_dir() -> Path:
    path = Path(settings.HUNYUAN3D_OUTPUT_DIR)
    if not path.is_absolute():
        path = Path.cwd() / path
    path.mkdir(parents=True, exist_ok=True)
    return path


class Hunyuan3DAdapter:
    """Thin, replaceable adapter around the documented Hunyuan3D HTTP API."""

    def is_configured(self) -> bool:
        return bool(_base_url())

    async def submit(self, params: dict[str, Any]) -> str:
        base_url = _base_url()
        if not base_url:
            raise Hunyuan3DProviderError(
                "HUNYUAN3D_BASE_URL is not configured. "
                "See .env.example and point it at a Hunyuan3D API server."
            )

        async with httpx.AsyncClient(timeout=settings.HUNYUAN3D_TIMEOUT_SECONDS) as client:
            try:
                response = await client.post(
                    f"{base_url}/send",
                    json=params,
                    headers=_headers(),
                )
            except httpx.HTTPError as exc:
                raise Hunyuan3DProviderError(f"Provider connection failed: {exc}") from exc

        if response.status_code >= 400:
            raise Hunyuan3DProviderError(
                f"Provider submit failed (HTTP {response.status_code}): {response.text[:500]}"
            )

        try:
            data = response.json()
        except ValueError as exc:
            raise Hunyuan3DProviderError("Provider returned invalid JSON from /send") from exc

        uid = data.get("uid")
        if not uid:
            raise Hunyuan3DProviderError("Provider /send response did not include a uid")
        return str(uid)

    async def poll(self, uid: str) -> dict[str, Any]:
        base_url = _base_url()
        async with httpx.AsyncClient(timeout=settings.HUNYUAN3D_TIMEOUT_SECONDS) as client:
            try:
                response = await client.get(
                    f"{base_url}/status/{uid}",
                    headers=_headers(),
                )
            except httpx.HTTPError as exc:
                raise Hunyuan3DProviderError(f"Provider status request failed: {exc}") from exc

        if response.status_code >= 400:
            raise Hunyuan3DProviderError(
                f"Provider status failed (HTTP {response.status_code}): {response.text[:500]}"
            )

        try:
            data = response.json()
        except ValueError as exc:
            raise Hunyuan3DProviderError("Provider returned invalid JSON from /status") from exc

        if not isinstance(data, dict):
            raise Hunyuan3DProviderError("Provider status response is not an object")
        return data

    async def download_bytes(self, url: str) -> bytes:
        async with httpx.AsyncClient(timeout=settings.HUNYUAN3D_TIMEOUT_SECONDS, follow_redirects=True) as client:
            try:
                response = await client.get(url, headers=_headers())
            except httpx.HTTPError as exc:
                raise Hunyuan3DProviderError(f"Provider download failed: {exc}") from exc
        if response.status_code >= 400:
            raise Hunyuan3DProviderError(f"Provider download failed (HTTP {response.status_code})")
        return response.content


adapter = Hunyuan3DAdapter()

_JOB_SEMAPHORE = asyncio.Semaphore(settings.HUNYUAN3D_MAX_CONCURRENT_JOBS)


async def process_generation_job(job_id: int) -> None:
    """Background task: submit job, poll provider, cache GLB output."""
    async with _JOB_SEMAPHORE:
        db: Session = SessionLocal()
        job: GenerationJob | None = None
        try:
            job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
            if job is None:
                return

            job.status = "processing"
            db.commit()

            # ---- Build provider request ----
            if job.mode == "text":
                if not job.prompt:
                    raise Hunyuan3DProviderError("Missing prompt")
                params: dict[str, Any] = {"text": job.prompt}
            else:
                if not job.input_path or not os.path.exists(job.input_path):
                    raise Hunyuan3DProviderError("Missing source image")
                with open(job.input_path, "rb") as f:
                    image_bytes = f.read()
                params = {"image": base64.b64encode(image_bytes).decode("ascii")}

            params["texture"] = False
            params["type"] = "glb"

            # ---- Submit ----
            remote_uid = await adapter.submit(params)
            job.remote_uid = remote_uid
            db.commit()

            # ---- Poll ----
            deadline = time.monotonic() + settings.HUNYUAN3D_JOB_TIMEOUT_SECONDS
            interval = max(0.5, float(settings.HUNYUAN3D_POLL_INTERVAL_SECONDS))
            while time.monotonic() < deadline:
                await asyncio.sleep(interval)
                result = await adapter.poll(remote_uid)
                remote_status = str(result.get("status", "")).lower()

                if remote_status in {"completed", "done", "success", "finished"}:
                    output_path = _resolved_output_dir() / f"{job.id}.glb"

                    if result.get("model_base64"):
                        try:
                            payload = base64.b64decode(result["model_base64"], validate=True)
                        except Exception as exc:
                            raise Hunyuan3DProviderError("Provider returned invalid model_base64") from exc
                        output_path.write_bytes(payload)
                    elif result.get("model_url") or result.get("output_url") or result.get("url"):
                        url = result.get("model_url") or result.get("output_url") or result.get("url")
                        payload = await adapter.download_bytes(str(url))
                        output_path.write_bytes(payload)
                    else:
                        raise Hunyuan3DProviderError(
                            "Provider reported completion but no model_base64 or output URL was returned"
                        )

                    if not output_path.read_bytes()[:4] == b"glTF":
                        logger.warning("Generated file for job %s does not look like a standard GLB", job.id)

                    job.output_path = str(output_path)
                    job.status = "completed"
                    job.error = None
                    db.commit()
                    return

                if remote_status in {"failed", "error", "cancelled"}:
                    raise Hunyuan3DProviderError(
                        result.get("text")
                        or result.get("error")
                        or "Remote provider reported failure"
                    )

            raise Hunyuan3DProviderError("Timed out waiting for provider job to complete")

        except Exception as exc:  # noqa: BLE001
            logger.exception("Generation job %s failed", job_id)
            if job is not None:
                job.status = "failed"
                job.error = str(exc)
                db.commit()
        finally:
            if job is not None and job.input_path and os.path.exists(job.input_path):
                try:
                    os.remove(job.input_path)
                except OSError:
                    logger.warning("Could not remove temporary input file %s", job.input_path)
            db.close()