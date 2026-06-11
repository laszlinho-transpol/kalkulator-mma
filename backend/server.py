from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Tuple
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="BitumenOps API")
api_router = APIRouter(prefix="/api")


# ---------- Models ----------

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = ""
    location: Optional[str] = ""


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None


class Project(ProjectBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    area_counter: int = 0
    areas_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AreaCreate(BaseModel):
    points: List[Tuple[float, float]] = Field(..., min_length=3)
    color: Optional[str] = None
    note: Optional[str] = ""
    layer: Optional[str] = "INNE"


class AreaUpdate(BaseModel):
    points: Optional[List[Tuple[float, float]]] = None
    color: Optional[str] = None
    note: Optional[str] = None
    layer: Optional[str] = None


class Area(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    area_id: str  # MM/YY/XXXX
    points: List[Tuple[float, float]]
    area_m2: float
    perimeter_m: float
    color: str = "#E67700"
    note: str = ""
    layer: str = "INNE"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LineCreate(BaseModel):
    points: List[Tuple[float, float]] = Field(..., min_length=2)
    color: Optional[str] = "#1971C2"
    note: Optional[str] = ""


class LineUpdate(BaseModel):
    points: Optional[List[Tuple[float, float]]] = None
    color: Optional[str] = None
    note: Optional[str] = None


class Line(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    line_id: str  # L-MM/YY/XXXX
    points: List[Tuple[float, float]]
    length_m: float
    color: str = "#1971C2"
    note: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------- Helpers ----------

def _polygon_area_m2(points: List[Tuple[float, float]]) -> float:
    n = len(points)
    if n < 3:
        return 0.0
    s = 0.0
    for i in range(n):
        x1, y1 = points[i]
        x2, y2 = points[(i + 1) % n]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2.0


def _polygon_perimeter_m(points: List[Tuple[float, float]]) -> float:
    n = len(points)
    if n < 2:
        return 0.0
    per = 0.0
    for i in range(n):
        x1, y1 = points[i]
        x2, y2 = points[(i + 1) % n]
        per += ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
    return per


def _serialize(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    for k, v in list(doc.items()):
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc


def _project_to_doc(p: Project) -> dict:
    d = p.model_dump()
    d["created_at"] = d["created_at"].isoformat()
    d["updated_at"] = d["updated_at"].isoformat()
    return d


def _area_to_doc(a: Area) -> dict:
    d = a.model_dump()
    d["created_at"] = d["created_at"].isoformat()
    return d


def _line_to_doc(line: Line) -> dict:
    d = line.model_dump()
    d["created_at"] = d["created_at"].isoformat()
    return d


# Layer defaults (color used when payload.color is not provided)
LAYER_COLORS = {
    "SMA": "#E67700",
    "AC_W": "#D9480F",
    "AC_P": "#5C3A21",
    "BETON": "#495057",
    "INNE": "#1971C2",
}


# ---------- Project Routes ----------

@api_router.get("/")
async def root():
    return {"message": "BitumenOps API", "version": "1.0"}


@api_router.get("/projects", response_model=List[Project])
async def list_projects():
    docs = await db.projects.find({}, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    return [Project(**_serialize(d)) for d in docs]


@api_router.post("/projects", response_model=Project)
async def create_project(payload: ProjectCreate):
    project = Project(**payload.model_dump())
    await db.projects.insert_one(_project_to_doc(project))
    return project


@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    doc = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    return Project(**_serialize(doc))


@api_router.patch("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, payload: ProjectUpdate):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        doc = await db.projects.find_one({"id": project_id}, {"_id": 0})
    else:
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        doc = await db.projects.find_one_and_update(
            {"id": project_id},
            {"$set": update},
            return_document=True,
            projection={"_id": 0},
        )
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    return Project(**_serialize(doc))


@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    res = await db.projects.delete_one({"id": project_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.areas.delete_many({"project_id": project_id})
    await db.lines.delete_many({"project_id": project_id})
    return {"ok": True}


# ---------- Area Routes ----------

@api_router.get("/projects/{project_id}/areas", response_model=List[Area])
async def list_areas(project_id: str):
    docs = await db.areas.find({"project_id": project_id}, {"_id": 0}).sort("created_at", 1).to_list(5000)
    return [Area(**_serialize(d)) for d in docs]


@api_router.post("/projects/{project_id}/areas", response_model=Area)
async def create_area(project_id: str, payload: AreaCreate):
    project_doc = await db.projects.find_one({"id": project_id})
    if not project_doc:
        raise HTTPException(status_code=404, detail="Project not found")

    # Atomic counter increment
    updated = await db.projects.find_one_and_update(
        {"id": project_id},
        {"$inc": {"area_counter": 1, "areas_count": 1},
         "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
        return_document=True,
    )
    counter = updated["area_counter"]
    now = datetime.now(timezone.utc)
    area_id_str = f"{now.month:02d}/{now.year % 100:02d}/{counter:04d}"

    pts = [tuple(p) for p in payload.points]
    area_m2 = _polygon_area_m2(pts)
    perimeter_m = _polygon_perimeter_m(pts)

    layer = (payload.layer or "INNE").upper()
    color = payload.color or LAYER_COLORS.get(layer, "#E67700")

    area = Area(
        project_id=project_id,
        area_id=area_id_str,
        points=pts,
        area_m2=area_m2,
        perimeter_m=perimeter_m,
        color=color,
        note=payload.note or "",
        layer=layer,
        created_at=now,
    )
    await db.areas.insert_one(_area_to_doc(area))
    return area


@api_router.patch("/projects/{project_id}/areas/{area_id}", response_model=Area)
async def update_area(project_id: str, area_id: str, payload: AreaUpdate):
    doc = await db.areas.find_one({"id": area_id, "project_id": project_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Area not found")

    update = {}
    if payload.points is not None:
        if len(payload.points) < 3:
            raise HTTPException(status_code=400, detail="At least 3 points required")
        pts = [tuple(p) for p in payload.points]
        update["points"] = pts
        update["area_m2"] = _polygon_area_m2(pts)
        update["perimeter_m"] = _polygon_perimeter_m(pts)
    if payload.layer is not None:
        update["layer"] = payload.layer.upper()
        # update color to layer default if no explicit color in payload
        if payload.color is None:
            update["color"] = LAYER_COLORS.get(update["layer"], doc.get("color", "#E67700"))
    if payload.color is not None:
        update["color"] = payload.color
    if payload.note is not None:
        update["note"] = payload.note

    if update:
        await db.areas.update_one({"id": area_id, "project_id": project_id}, {"$set": update})
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        doc.update(update)
    return Area(**_serialize(doc))


@api_router.delete("/projects/{project_id}/areas/{area_id}")
async def delete_area(project_id: str, area_id: str):
    res = await db.areas.delete_one({"id": area_id, "project_id": project_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Area not found")
    await db.projects.update_one(
        {"id": project_id},
        {"$inc": {"areas_count": -1},
         "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True}


# ---------- Line Routes ----------

def _polyline_length_m(points: List[Tuple[float, float]]) -> float:
    n = len(points)
    if n < 2:
        return 0.0
    total = 0.0
    for i in range(n - 1):
        x1, y1 = points[i]
        x2, y2 = points[i + 1]
        total += ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
    return total


@api_router.get("/projects/{project_id}/lines", response_model=List[Line])
async def list_lines(project_id: str):
    docs = await db.lines.find({"project_id": project_id}, {"_id": 0}).sort("created_at", 1).to_list(5000)
    return [Line(**_serialize(d)) for d in docs]


@api_router.post("/projects/{project_id}/lines", response_model=Line)
async def create_line(project_id: str, payload: LineCreate):
    project_doc = await db.projects.find_one({"id": project_id})
    if not project_doc:
        raise HTTPException(status_code=404, detail="Project not found")

    updated = await db.projects.find_one_and_update(
        {"id": project_id},
        {"$inc": {"line_counter": 1, "lines_count": 1},
         "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
        return_document=True,
    )
    counter = updated["line_counter"]
    now = datetime.now(timezone.utc)
    line_id_str = f"L-{now.month:02d}/{now.year % 100:02d}/{counter:04d}"

    pts = [tuple(p) for p in payload.points]
    length_m = _polyline_length_m(pts)

    line = Line(
        project_id=project_id,
        line_id=line_id_str,
        points=pts,
        length_m=length_m,
        color=payload.color or "#1971C2",
        note=payload.note or "",
        created_at=now,
    )
    await db.lines.insert_one(_line_to_doc(line))
    return line


@api_router.patch("/projects/{project_id}/lines/{line_id}", response_model=Line)
async def update_line(project_id: str, line_id: str, payload: LineUpdate):
    doc = await db.lines.find_one({"id": line_id, "project_id": project_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Line not found")
    update = {}
    if payload.points is not None:
        if len(payload.points) < 2:
            raise HTTPException(status_code=400, detail="At least 2 points required")
        pts = [tuple(p) for p in payload.points]
        update["points"] = pts
        update["length_m"] = _polyline_length_m(pts)
    if payload.color is not None:
        update["color"] = payload.color
    if payload.note is not None:
        update["note"] = payload.note
    if update:
        await db.lines.update_one({"id": line_id, "project_id": project_id}, {"$set": update})
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        doc.update(update)
    return Line(**_serialize(doc))


@api_router.delete("/projects/{project_id}/lines/{line_id}")
async def delete_line(project_id: str, line_id: str):
    res = await db.lines.delete_one({"id": line_id, "project_id": project_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Line not found")
    await db.projects.update_one(
        {"id": project_id},
        {"$inc": {"lines_count": -1},
         "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
