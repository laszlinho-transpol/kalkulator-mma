"""Backend API tests for BitumenOps Stage 2: area PATCH, lines CRUD, layers, cascade."""
import os
import re
from datetime import datetime, timezone
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
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
def pid(session):
    r = session.post(f"{API}/projects", json={"name": "TEST_Stage2"})
    assert r.status_code == 200, r.text
    pid_ = r.json()["id"]
    yield pid_
    try:
        session.delete(f"{API}/projects/{pid_}")
    except Exception:
        pass


# ---------- Layer defaults on area POST ----------

def test_create_area_default_layer_inne(session, pid):
    r = session.post(f"{API}/projects/{pid}/areas",
                     json={"points": [[0, 0], [4, 0], [4, 3]]})
    assert r.status_code == 200, r.text
    a = r.json()
    assert a["layer"] == "INNE"
    assert a["color"] == "#1971C2"


def test_create_area_layer_ac11s_default_color(session, pid):
    r = session.post(f"{API}/projects/{pid}/areas",
                     json={"points": [[0, 0], [2, 0], [2, 2]], "layer": "AC11S"})
    assert r.status_code == 200, r.text
    a = r.json()
    assert a["layer"] == "AC11S"
    assert a["color"].upper() == "#D9480F"


def test_create_area_explicit_color_overrides(session, pid):
    r = session.post(f"{API}/projects/{pid}/areas",
                     json={"points": [[0, 0], [2, 0], [2, 2]], "layer": "SMA", "color": "#123456"})
    assert r.status_code == 200, r.text
    a = r.json()
    assert a["layer"] == "SMA"
    assert a["color"] == "#123456"


def test_create_area_layer_lowercase_normalized(session, pid):
    r = session.post(f"{API}/projects/{pid}/areas",
                     json={"points": [[0, 0], [1, 0], [1, 1]], "layer": "sma"})
    assert r.status_code == 200, r.text
    a = r.json()
    assert a["layer"] == "SMA"
    assert a["color"].upper() == "#E67700"


# ---------- Area PATCH ----------

def test_patch_area_points_recomputes(session, pid):
    # create 4x3 rectangle => 12 m^2, perimeter 14
    r = session.post(f"{API}/projects/{pid}/areas",
                     json={"points": [[0, 0], [4, 0], [4, 3], [0, 3]], "layer": "INNE"})
    aid = r.json()["id"]
    # update to 10x5 rect => 50 / 30
    rp = session.patch(f"{API}/projects/{pid}/areas/{aid}",
                       json={"points": [[0, 0], [10, 0], [10, 5], [0, 5]]})
    assert rp.status_code == 200, rp.text
    a = rp.json()
    assert abs(a["area_m2"] - 50.0) < 1e-6
    assert abs(a["perimeter_m"] - 30.0) < 1e-6
    # GET to verify persisted
    items = session.get(f"{API}/projects/{pid}/areas").json()
    persisted = next(x for x in items if x["id"] == aid)
    assert abs(persisted["area_m2"] - 50.0) < 1e-6


def test_patch_area_layer_updates_color_default(session, pid):
    r = session.post(f"{API}/projects/{pid}/areas",
                     json={"points": [[0, 0], [2, 0], [2, 2]]})
    aid = r.json()["id"]
    rp = session.patch(f"{API}/projects/{pid}/areas/{aid}", json={"layer": "SMA"})
    assert rp.status_code == 200
    a = rp.json()
    assert a["layer"] == "SMA"
    assert a["color"].upper() == "#E67700"


def test_patch_area_layer_lowercase_normalized(session, pid):
    r = session.post(f"{API}/projects/{pid}/areas",
                     json={"points": [[0, 0], [2, 0], [2, 2]]})
    aid = r.json()["id"]
    rp = session.patch(f"{API}/projects/{pid}/areas/{aid}", json={"layer": "sma"})
    assert rp.status_code == 200
    assert rp.json()["layer"] == "SMA"


def test_patch_area_too_few_points(session, pid):
    r = session.post(f"{API}/projects/{pid}/areas",
                     json={"points": [[0, 0], [2, 0], [2, 2]]})
    aid = r.json()["id"]
    rp = session.patch(f"{API}/projects/{pid}/areas/{aid}",
                       json={"points": [[0, 0], [1, 1]]})
    assert rp.status_code == 400


# ---------- Lines CRUD ----------

LINE_ID_RE = re.compile(r"^L-\d{2}/\d{2}/\d{4}$")


def test_create_line_length_and_format(session, pid):
    r = session.post(f"{API}/projects/{pid}/lines",
                     json={"points": [[0, 0], [10, 0], [10, 5]]})
    assert r.status_code == 200, r.text
    line = r.json()
    assert abs(line["length_m"] - 15.0) < 1e-6
    assert LINE_ID_RE.match(line["line_id"]), f"bad id {line['line_id']}"
    now = datetime.now(timezone.utc)
    expected_prefix = f"L-{now.month:02d}/{now.year % 100:02d}/"
    assert line["line_id"].startswith(expected_prefix)
    assert line["line_id"].endswith("0001")


def test_create_second_line_counter_increments(session, pid):
    r = session.post(f"{API}/projects/{pid}/lines",
                     json={"points": [[0, 0], [3, 4]]})  # length 5
    assert r.status_code == 200
    line = r.json()
    assert abs(line["length_m"] - 5.0) < 1e-6
    assert line["line_id"].endswith("0002")


def test_list_lines_persisted(session, pid):
    r = session.get(f"{API}/projects/{pid}/lines")
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 2
    suffixes = sorted([it["line_id"].split("/")[-1] for it in items])
    assert suffixes == ["0001", "0002"]


def test_create_line_too_few_points(session, pid):
    r = session.post(f"{API}/projects/{pid}/lines", json={"points": [[0, 0]]})
    assert r.status_code in (400, 422)


def test_patch_line_points_recomputes(session, pid):
    r = session.post(f"{API}/projects/{pid}/lines",
                     json={"points": [[0, 0], [1, 0]]})
    lid = r.json()["id"]
    rp = session.patch(f"{API}/projects/{pid}/lines/{lid}",
                       json={"points": [[0, 0], [6, 8]]})  # 10
    assert rp.status_code == 200, rp.text
    assert abs(rp.json()["length_m"] - 10.0) < 1e-6


def test_patch_line_too_few_points(session, pid):
    r = session.post(f"{API}/projects/{pid}/lines",
                     json={"points": [[0, 0], [1, 0]]})
    lid = r.json()["id"]
    rp = session.patch(f"{API}/projects/{pid}/lines/{lid}", json={"points": [[0, 0]]})
    assert rp.status_code == 400


def test_delete_line(session, pid):
    r = session.post(f"{API}/projects/{pid}/lines",
                     json={"points": [[0, 0], [1, 0]]})
    lid = r.json()["id"]
    rd = session.delete(f"{API}/projects/{pid}/lines/{lid}")
    assert rd.status_code == 200
    items = session.get(f"{API}/projects/{pid}/lines").json()
    assert all(x["id"] != lid for x in items)


# ---------- Cascade delete (areas + lines) ----------

def test_delete_project_cascades_areas_and_lines(session):
    r = session.post(f"{API}/projects", json={"name": "TEST_cascade2"})
    pid_ = r.json()["id"]
    session.post(f"{API}/projects/{pid_}/areas",
                 json={"points": [[0, 0], [1, 0], [1, 1]]})
    session.post(f"{API}/projects/{pid_}/lines",
                 json={"points": [[0, 0], [1, 0]]})
    rd = session.delete(f"{API}/projects/{pid_}")
    assert rd.status_code == 200
    assert session.get(f"{API}/projects/{pid_}/areas").json() == []
    assert session.get(f"{API}/projects/{pid_}/lines").json() == []
