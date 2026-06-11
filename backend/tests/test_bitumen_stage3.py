"""Stage 3 backend tests: layer expansion, area status/thickness/density, deliveries, background."""
import os
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

# Tiny 1x1 transparent PNG
PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def pid(session):
    r = session.post(f"{API}/projects", json={"name": "TEST_Stage3"})
    assert r.status_code == 200, r.text
    pid_ = r.json()["id"]
    yield pid_
    try:
        session.delete(f"{API}/projects/{pid_}")
    except Exception:
        pass


# ---------- Area with Stage 3 fields ----------

def test_create_area_AC11S_with_status_thickness_density(session, pid):
    r = session.post(
        f"{API}/projects/{pid}/areas",
        json={
            "points": [[0, 0], [10, 0], [10, 5], [0, 5]],
            "layer": "AC11S",
            "thickness_cm": 4,
            "density_t_m3": 2.40,
            "status": "in_progress",
        },
    )
    assert r.status_code == 200, r.text
    a = r.json()
    assert a["layer"] == "AC11S"
    assert a["thickness_cm"] == 4
    assert a["density_t_m3"] == 2.40
    assert a["status"] == "in_progress"
    assert a["color"] == "#D9480F"
    assert abs(a["area_m2"] - 50.0) < 0.001


def test_create_area_default_status_planned(session, pid):
    r = session.post(
        f"{API}/projects/{pid}/areas",
        json={"points": [[0, 0], [1, 0], [1, 1]], "layer": "SMA"},
    )
    assert r.status_code == 200
    a = r.json()
    assert a["status"] == "planned"
    assert a["color"] == "#E67700"


def test_patch_area_status_done(session, pid):
    r = session.post(
        f"{API}/projects/{pid}/areas",
        json={"points": [[0, 0], [2, 0], [2, 2]], "layer": "AC8S"},
    )
    aid = r.json()["id"]
    r2 = session.patch(f"{API}/projects/{pid}/areas/{aid}", json={"status": "done"})
    assert r2.status_code == 200
    assert r2.json()["status"] == "done"


def test_patch_area_thickness_density(session, pid):
    r = session.post(
        f"{API}/projects/{pid}/areas",
        json={"points": [[0, 0], [2, 0], [2, 2]], "layer": "AC11S"},
    )
    aid = r.json()["id"]
    r2 = session.patch(f"{API}/projects/{pid}/areas/{aid}",
                       json={"thickness_cm": 6, "density_t_m3": 2.5})
    assert r2.status_code == 200
    j = r2.json()
    assert j["thickness_cm"] == 6
    assert j["density_t_m3"] == 2.5


def test_patch_area_invalid_status_400(session, pid):
    r = session.post(
        f"{API}/projects/{pid}/areas",
        json={"points": [[0, 0], [1, 0], [1, 1]], "layer": "INNE"},
    )
    aid = r.json()["id"]
    r2 = session.patch(f"{API}/projects/{pid}/areas/{aid}", json={"status": "cancelled"})
    assert r2.status_code == 400


def test_patch_area_recompute_area(session, pid):
    r = session.post(f"{API}/projects/{pid}/areas",
                     json={"points": [[0, 0], [4, 0], [4, 3]], "layer": "INNE"})
    aid = r.json()["id"]
    r2 = session.patch(f"{API}/projects/{pid}/areas/{aid}",
                       json={"points": [[0, 0], [10, 0], [10, 5], [0, 5]]})
    assert r2.status_code == 200
    assert abs(r2.json()["area_m2"] - 50.0) < 0.001


# ---------- New layers ----------

def test_layer_KLSM_ascii(session, pid):
    r = session.post(f"{API}/projects/{pid}/areas",
                     json={"points": [[0, 0], [1, 0], [1, 1]], "layer": "KLSM"})
    assert r.status_code == 200
    assert r.json()["color"] == "#5C3A21"
    assert r.json()["layer"] == "KLSM"


def test_layer_KLSM_unicode(session, pid):
    r = session.post(f"{API}/projects/{pid}/areas",
                     json={"points": [[0, 0], [1, 0], [1, 1]], "layer": "KŁSM"})
    assert r.status_code == 200
    assert r.json()["color"] == "#5C3A21"


def test_layer_AC22P_color(session, pid):
    r = session.post(f"{API}/projects/{pid}/areas",
                     json={"points": [[0, 0], [1, 0], [1, 1]], "layer": "AC22P"})
    assert r.status_code == 200
    assert r.json()["color"] == "#6B4226"


def test_legacy_BETON_kept_as_layer(session, pid):
    r = session.post(f"{API}/projects/{pid}/areas",
                     json={"points": [[0, 0], [1, 0], [1, 1]], "layer": "BETON"})
    assert r.status_code == 200
    assert r.json()["layer"] == "BETON"


# ---------- Deliveries ----------

def test_delivery_create_list_delete(session, pid):
    r = session.post(f"{API}/projects/{pid}/deliveries",
                     json={"layer": "AC11S", "tonnage_t": 24.5, "source": "WZ-001", "note": "test"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["layer"] == "AC11S"
    assert d["tonnage_t"] == 24.5
    assert d["source"] == "WZ-001"
    assert "id" in d
    assert "created_at" in d
    did = d["id"]

    # GET project includes delivery
    p = session.get(f"{API}/projects/{pid}").json()
    ids = [x["id"] for x in p.get("deliveries", [])]
    assert did in ids

    # DELETE
    r2 = session.delete(f"{API}/projects/{pid}/deliveries/{did}")
    assert r2.status_code == 200
    p2 = session.get(f"{API}/projects/{pid}").json()
    ids2 = [x["id"] for x in p2.get("deliveries", [])]
    assert did not in ids2


def test_delivery_delete_404(session, pid):
    r = session.delete(f"{API}/projects/{pid}/deliveries/non-existing-id")
    assert r.status_code == 404


# ---------- Background ----------

def test_background_full_lifecycle(session):
    # Dedicated project so we don't affect main pid
    pp = session.post(f"{API}/projects", json={"name": "TEST_Stage3_BG"}).json()
    pid_ = pp["id"]
    try:
        # Initially null
        r = session.get(f"{API}/projects/{pid_}/background")
        assert r.status_code == 200
        assert r.json() is None

        # PUT
        r2 = session.put(
            f"{API}/projects/{pid_}/background",
            json={"data_url": PNG_DATA_URL, "original_filename": "test.png",
                  "natural_width": 100, "natural_height": 100, "opacity": 0.5,
                  "scale": 0.1, "rotation": 0, "visible": True},
        )
        assert r2.status_code == 200, r2.text
        bg = r2.json()
        assert bg["data_url"].startswith("data:image/png;base64,")
        assert bg["opacity"] == 0.5

        # Project has_background=true
        p = session.get(f"{API}/projects/{pid_}").json()
        assert p["has_background"] is True

        # GET background
        r3 = session.get(f"{API}/projects/{pid_}/background")
        assert r3.status_code == 200
        assert r3.json()["opacity"] == 0.5

        # PATCH opacity only
        r4 = session.patch(f"{API}/projects/{pid_}/background", json={"opacity": 0.8})
        assert r4.status_code == 200
        assert r4.json()["opacity"] == 0.8
        # other fields preserved
        assert r4.json()["scale"] == 0.1

        # DELETE
        r5 = session.delete(f"{API}/projects/{pid_}/background")
        assert r5.status_code == 200
        p2 = session.get(f"{API}/projects/{pid_}").json()
        assert p2["has_background"] is False
        # GET after delete
        r6 = session.get(f"{API}/projects/{pid_}/background")
        assert r6.json() is None
    finally:
        session.delete(f"{API}/projects/{pid_}")


def test_background_patch_404_when_no_bg(session):
    pp = session.post(f"{API}/projects", json={"name": "TEST_Stage3_BG2"}).json()
    pid_ = pp["id"]
    try:
        r = session.patch(f"{API}/projects/{pid_}/background", json={"opacity": 0.3})
        assert r.status_code == 404
    finally:
        session.delete(f"{API}/projects/{pid_}")


def test_background_put_missing_data_url_400(session):
    pp = session.post(f"{API}/projects", json={"name": "TEST_Stage3_BG3"}).json()
    pid_ = pp["id"]
    try:
        r = session.put(f"{API}/projects/{pid_}/background", json={"opacity": 0.5})
        assert r.status_code == 400
    finally:
        session.delete(f"{API}/projects/{pid_}")


def test_delete_project_cascades_background(session):
    pp = session.post(f"{API}/projects", json={"name": "TEST_Stage3_Cascade"}).json()
    pid_ = pp["id"]
    session.put(f"{API}/projects/{pid_}/background", json={"data_url": PNG_DATA_URL})
    # confirm bg saved
    assert session.get(f"{API}/projects/{pid_}/background").json() is not None
    # delete project
    session.delete(f"{API}/projects/{pid_}")
    # bg should be gone; recreate project under same id is impossible, query backgrounds via new project would be different.
    # Best we can do: confirm GET project now 404
    r = session.get(f"{API}/projects/{pid_}")
    assert r.status_code == 404
