import os
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

# In-memory SQLite engine for tests
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

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_project_crud_and_ownership():
    # 1. Register User 1
    u1_res = client.post("/auth/register", json={
        "name": "User One",
        "username": "userone",
        "email": "user1@example.com",
        "password": "Password123!"
    })
    assert u1_res.status_code == 201
    token1 = u1_res.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    # 2. Register User 2
    u2_res = client.post("/auth/register", json={
        "name": "User Two",
        "username": "usertwo",
        "email": "user2@example.com",
        "password": "Password123!"
    })
    assert u2_res.status_code == 201
    token2 = u2_res.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # 3. User 1 creates a project
    create_res = client.post("/projects", json={
        "name": "Drone Frame",
        "description": "Custom drone chassis"
    }, headers=headers1)
    assert create_res.status_code == 201
    project1 = create_res.json()
    p1_id = project1["id"]
    assert project1["name"] == "Drone Frame"
    assert project1["status"] == "draft"

    # 4. User 1 can view project
    get_res = client.get(f"/projects/{p1_id}", headers=headers1)
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Drone Frame"

    # 5. User 2 CANNOT access User 1's project (Ownership / IDOR protection)
    forbidden_res = client.get(f"/projects/{p1_id}", headers=headers2)
    assert forbidden_res.status_code == 404

    # 6. User 1 renames project
    update_res = client.patch(f"/projects/{p1_id}", json={
        "name": "Drone Frame V2"
    }, headers=headers1)
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Drone Frame V2"

    # 7. User 1 duplicates project
    dup_res = client.post(f"/projects/{p1_id}/duplicate", headers=headers1)
    assert dup_res.status_code == 201
    assert "Copy of Drone Frame V2" in dup_res.json()["name"]

    # 8. User 1 bookmarks (saves) the project
    save_res = client.post(f"/projects/{p1_id}/save", headers=headers1)
    assert save_res.status_code == 201

    saved_list_res = client.get("/projects/saved", headers=headers1)
    assert saved_list_res.status_code == 200
    assert len(saved_list_res.json()) >= 1

    # 9. User 1 unsaves project
    unsave_res = client.delete(f"/projects/{p1_id}/save", headers=headers1)
    assert unsave_res.status_code == 200

    # 10. User 1 deletes project
    del_res = client.delete(f"/projects/{p1_id}", headers=headers1)
    assert del_res.status_code == 204

    # 11. Verify deleted
    get_deleted_res = client.get(f"/projects/{p1_id}", headers=headers1)
    assert get_deleted_res.status_code == 404
