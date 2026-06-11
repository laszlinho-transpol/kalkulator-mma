"""Backend API tests for BitumenOps Stage 1 (projects + areas)."""
import os
from datetime import datetime, timezone
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # fallback to reading frontend env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def created_project_id(session):
    """Create a project used across tests, cleaned up after module."""
    r = session.post(f"{API}/projects", json={
        "name": "TEST_BitumenE2E",
        "description": "automated test project",
        "location": "Warszawa",
    })
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    yield pid
    try:
        session.delete(f"{API}/projects/{pid}")
    except Exception:
        pass


# ---------- Health ----------

def test_root(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    assert "BitumenOps" in r.json().get("message", "")


# ---------- Projects ----------

def test_list_projects(session):
    r = session.get(f"{API}/projects")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_create_and_get_project(session, created_project_id):
    r = session.get(f"{API}/projects/{created_project_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == created_project_id
    assert data["name"] == "TEST_BitumenE2E"
    assert data["location"] == "Warszawa"
    assert data["area_counter"] == 0
    assert data["areas_count"] == 0


def test_get_project_not_found(session):
    r = session.get(f"{API}/projects/nonexistent-id-zzzz")
    assert r.status_code == 404


# ---------- Areas ----------

def test_create_area_rectangle_10x5(session, created_project_id):
    # rectangle 10m x 5m => area=50, perimeter=30
    points = [[0, 0], [10, 0], [10, 5], [0, 5]]
    r = session.post(f"{API}/projects/{created_project_id}/areas",
                     json={"points": points, "color": "#E67700"})
    assert r.status_code == 200, r.text
    a = r.json()
    assert a["project_id"] == created_project_id
    assert abs(a["area_m2"] - 50.0) < 1e-6
    assert abs(a["perimeter_m"] - 30.0) < 1e-6
    # area_id format MM/YY/0001
    now = datetime.now(timezone.utc)
    expected_prefix = f"{now.month:02d}/{now.year % 100:02d}/"
    assert a["area_id"].startswith(expected_prefix), f"got {a['area_id']}, expected prefix {expected_prefix}"
    assert a["area_id"].endswith("0001")


def test_create_second_area_counter_increments(session, created_project_id):
    points = [[0, 0], [2, 0], [2, 2], [0, 2]]
    r = session.post(f"{API}/projects/{created_project_id}/areas", json={"points": points})
    assert r.status_code == 200
    a = r.json()
    assert abs(a["area_m2"] - 4.0) < 1e-6
    assert a["area_id"].endswith("0002")


def test_list_areas_persisted(session, created_project_id):
    r = session.get(f"{API}/projects/{created_project_id}/areas")
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 2
    suffixes = sorted([it["area_id"].split("/")[-1] for it in items])
    assert suffixes == ["0001", "0002"]


def test_project_counter_reflects_areas(session, created_project_id):
    r = session.get(f"{API}/projects/{created_project_id}")
    assert r.status_code == 200
    p = r.json()
    assert p["area_counter"] == 2
    assert p["areas_count"] == 2


def test_delete_area(session, created_project_id):
    # get any area, delete it, verify count decrements
    items = session.get(f"{API}/projects/{created_project_id}/areas").json()
    target = items[0]
    r = session.delete(f"{API}/projects/{created_project_id}/areas/{target['id']}")
    assert r.status_code == 200
    items2 = session.get(f"{API}/projects/{created_project_id}/areas").json()
    assert len(items2) == 1


def test_create_area_invalid_points(session, created_project_id):
    # < 3 points should be rejected by pydantic
    r = session.post(f"{API}/projects/{created_project_id}/areas",
                     json={"points": [[0, 0], [1, 1]]})
    assert r.status_code in (400, 422)


def test_create_area_unknown_project(session):
    r = session.post(f"{API}/projects/zzz-unknown/areas",
                     json={"points": [[0, 0], [1, 0], [1, 1]]})
    assert r.status_code == 404


# ---------- Project delete cascade ----------

def test_delete_project_cascades_areas(session):
    r = session.post(f"{API}/projects", json={"name": "TEST_cascade"})
    pid = r.json()["id"]
    session.post(f"{API}/projects/{pid}/areas",
                 json={"points": [[0, 0], [1, 0], [1, 1]]})
    rd = session.delete(f"{API}/projects/{pid}")
    assert rd.status_code == 200
    # areas listing for a deleted project should be empty (project gone)
    r2 = session.get(f"{API}/projects/{pid}/areas")
    # endpoint does not check project existence, so it returns []
    assert r2.status_code == 200
    assert r2.json() == []
