import base64
import os
import time

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["HUNYUAN3D_BASE_URL"] = ""
os.environ["HUNYUAN3D_OUTPUT_DIR"] = "generated_models_test"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.config import settings
from app.services.hunyuan3d import adapter, Hunyuan3DProviderError
import app.services.hunyuan3d as service

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


client = TestClient(app)

PRIMARY_USER = {
    "name": "Gen User",
    "username": "genuser",
    "email": "gen@example.com",
    "password": "Password123!",
}


@pytest.fixture(autouse=True)
def clean_db(monkeypatch):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    previous_override = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(service, "SessionLocal", TestingSessionLocal)
    yield
    if previous_override is None:
        app.dependency_overrides.pop(get_db, None)
    else:
        app.dependency_overrides[get_db] = previous_override


def _register_and_token() -> str:
    response = client.post("/auth/register", json=PRIMARY_USER)
    assert response.status_code == 201
    return response.json()["access_token"]


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _wait_for_terminal(job_id: int, token: str):
    for _ in range(100):
        response = client.get(f"/generation/{job_id}", headers=_headers(token))
        if response.status_code == 200 and response.json()["status"] in ("completed", "failed"):
            return response.json()
        time.sleep(0.05)
    return client.get(f"/generation/{job_id}", headers=_headers(token)).json()


def test_generation_requires_auth():
    response = client.post("/generation/text-to-3d", json={"prompt": "a small cube"})
    assert response.status_code == 401


def test_text_prompt_validation():
    token = _register_and_token()
    response = client.post(
        "/generation/text-to-3d",
        json={"prompt": "ab"},
        headers=_headers(token),
    )
    assert response.status_code == 422


def test_image_type_validation():
    token = _register_and_token()
    response = client.post(
        "/generation/image-to-3d",
        files={"file": ("test.txt", b"not an image", "text/plain")},
        headers=_headers(token),
    )
    assert response.status_code == 415


def test_image_size_validation(monkeypatch):
    monkeypatch.setattr(settings, "HUNYUAN3D_MAX_IMAGE_BYTES", 4)
    token = _register_and_token()
    response = client.post(
        "/generation/image-to-3d",
        files={"file": ("test.png", b"12345", "image/png")},
        headers=_headers(token),
    )
    assert response.status_code == 413


def test_provider_failure_marks_job_failed(monkeypatch):
    async def failing_submit(params):
        raise Hunyuan3DProviderError("provider unavailable")

    monkeypatch.setattr(adapter, "submit", failing_submit)
    token = _register_and_token()
    response = client.post(
        "/generation/text-to-3d",
        json={"prompt": "a failed remote request"},
        headers=_headers(token),
    )
    assert response.status_code == 202
    job = _wait_for_terminal(response.json()["id"], token)
    assert job["status"] == "failed"
    assert "provider unavailable" in (job["error"] or "")


def test_successful_text_generation(monkeypatch):
    monkeypatch.setattr(settings, "HUNYUAN3D_JOB_TIMEOUT_SECONDS", 5)

    async def fake_submit(params):
        return "remote-job-1"

    async def fake_poll(uid):
        return {
            "status": "completed",
            "model_base64": base64.b64encode(b"glTF-test-data").decode("ascii"),
        }

    monkeypatch.setattr(adapter, "submit", fake_submit)
    monkeypatch.setattr(adapter, "poll", fake_poll)

    token = _register_and_token()
    response = client.post(
        "/generation/text-to-3d",
        json={"prompt": "a low poly chair"},
        headers=_headers(token),
    )
    assert response.status_code == 202
    job = _wait_for_terminal(response.json()["id"], token)
    assert job["status"] == "completed"
    assert job["model_url"] is not None

    download = client.get(job["model_url"], headers=_headers(token))
    assert download.status_code == 200
    assert download.content[:4] == b"glTF"


def test_successful_image_generation(monkeypatch):
    monkeypatch.setattr(settings, "HUNYUAN3D_JOB_TIMEOUT_SECONDS", 5)

    async def fake_submit(params):
        assert "image" in params
        return "remote-job-2"

    async def fake_poll(uid):
        return {
            "status": "completed",
            "model_base64": base64.b64encode(b"glTF-image-data").decode("ascii"),
        }

    monkeypatch.setattr(adapter, "submit", fake_submit)
    monkeypatch.setattr(adapter, "poll", fake_poll)

    token = _register_and_token()
    response = client.post(
        "/generation/image-to-3d",
        files={"file": ("sample.png", b"\x89PNG\r\n", "image/png")},
        headers=_headers(token),
    )
    assert response.status_code == 202
    job = _wait_for_terminal(response.json()["id"], token)
    assert job["status"] == "completed"


def test_job_status_ownership():
    token1 = _register_and_token()
    # second user
    second = {
        "name": "Other",
        "username": "otheruser",
        "email": "other@example.com",
        "password": "Password123!",
    }
    client.post("/auth/register", json=second)
    u2_res = client.post("/auth/login", json={"email": second["email"], "password": second["password"]})
    token2 = u2_res.json()["access_token"]

    response = client.post(
        "/generation/text-to-3d",
        json={"prompt": "owned model"},
        headers=_headers(token1),
    )
    job_id = response.json()["id"]

    forbidden = client.get(f"/generation/{job_id}", headers=_headers(token2))
    assert forbidden.status_code == 404