import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Construction, Ruler } from "lucide-react";
import { toast } from "sonner";
import { CanvasBoard } from "@/components/canvas/CanvasBoard";
import { TopToolbar } from "@/components/canvas/TopToolbar";
import { ToolPalette } from "@/components/canvas/ToolPalette";
import { MeasurementPanel } from "@/components/canvas/MeasurementPanel";
import { StatusBar } from "@/components/canvas/StatusBar";
import { AreasSidebar } from "@/components/canvas/AreasSidebar";
import { ExportDialog } from "@/components/canvas/ExportDialog";
import { BackgroundDialog } from "@/components/canvas/BackgroundDialog";
import { useCanvasViewport } from "@/hooks/useCanvasViewport";
import { useAreaTool } from "@/hooks/useAreaTool";
import { useLineTool } from "@/hooks/useLineTool";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import {
  areasApi, linesApi, projectsApi, deliveriesApi, backgroundApi,
} from "@/lib/api";
import {
  snapToGrid, pointInPolygon, closestVertex, closestSegment,
  constrainAngle, lockedLengthPoint,
} from "@/lib/geometry";
import { WORKSPACE } from "@/constants/testIds";

const VERTEX_PICK_PX = 10;
const SEGMENT_PICK_PX = 8;

export default function Workspace() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [areas, setAreas] = useState([]);
  const [lines, setLines] = useState([]);
  const [background, setBackground] = useState(null);
  const [tool, setTool] = useState("select");
  const [gridStep, setGridStep] = useState(0.5);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [selectedShape, setSelectedShape] = useState(null);
  const [layerFilter, setLayerFilter] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [snapPreview, setSnapPreview] = useState(null);
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState([]);
  const [lockedLength, setLockedLength] = useState(null);

  const viewport = useCanvasViewport();
  const areaTool = useAreaTool();
  const lineTool = useLineTool();
  const history = useUndoRedo(50);

  const panStateRef = useRef(null);
  const spaceHeldRef = useRef(false);
  const shiftHeldRef = useRef(false);
  const dragRef = useRef(null);
  const containerRef = useRef(null);
  const lengthInputRef = useRef(null);

  // Load
  useEffect(() => {
    (async () => {
      try {
        const [p, a, ln, bg] = await Promise.all([
          projectsApi.get(projectId),
          areasApi.list(projectId),
          linesApi.list(projectId),
          backgroundApi.get(projectId).catch(() => null),
        ]);
        setProject(p);
        setAreas(a);
        setLines(ln);
        setBackground(bg || null);
      } catch (e) {
        toast.error("Nie udało się załadować projektu");
        navigate("/");
      }
    })();
  }, [projectId, navigate]);

  const selectedShapeFull = (() => {
    if (!selectedShape) return null;
    if (selectedShape.type === "area") {
      const s = areas.find((a) => a.id === selectedShape.id);
      return s ? { type: "area", id: s.id, shape: s } : null;
    }
    const s = lines.find((l) => l.id === selectedShape.id);
    return s ? { type: "line", id: s.id, shape: s } : null;
  })();

  // Hotkeys
  useEffect(() => {
    const onKeyDown = (e) => {
      const t = e.target;
      const isInput = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (isInput) return;

      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && !e.shiftKey && (e.key === "z" || e.key === "Z")) { e.preventDefault(); history.undo(); return; }
      if (ctrl && ((e.key === "y" || e.key === "Y") || (e.shiftKey && (e.key === "z" || e.key === "Z")))) {
        e.preventDefault(); history.redo(); return;
      }

      if (e.code === "Space" && !spaceHeldRef.current) {
        spaceHeldRef.current = true; e.preventDefault();
      } else if (e.key === "Shift") {
        shiftHeldRef.current = true;
      } else if (e.key === "v" || e.key === "V") setTool("select");
      else if (e.key === "h" || e.key === "H") setTool("pan");
      else if (e.key === "a" || e.key === "A") { setTool("area"); lineTool.reset(); }
      else if (e.key === "l" || e.key === "L") { setTool("line"); areaTool.reset(); }
      else if (e.key === "e" || e.key === "E") setTool("edit");
      else if (e.key === "s" || e.key === "S") setSnapEnabled((v) => !v);
      else if (e.key === "Escape") {
        areaTool.reset(); lineTool.reset(); setSelectedShape(null);
        if (calibrationMode) { setCalibrationMode(false); setCalibrationPoints([]); }
      } else if (e.key === "Backspace") {
        if (tool === "area" && areaTool.points.length > 0) { areaTool.popLast(); e.preventDefault(); }
        else if (tool === "line" && lineTool.points.length > 0) { lineTool.popLast(); e.preventDefault(); }
      } else if (e.key === "Delete") {
        if (selectedShape) {
          if (selectedShape.type === "area") {
            const a = areas.find((x) => x.id === selectedShape.id);
            if (a) handleDeleteArea(a, true);
          } else {
            const ln = lines.find((x) => x.id === selectedShape.id);
            if (ln) handleDeleteLine(ln, true);
          }
        }
      } else if (e.key === "Enter") {
        if (tool === "area" && areaTool.points.length >= 3) { finishArea(); e.preventDefault(); }
        else if (tool === "line" && lineTool.points.length >= 2) { finishLine(); e.preventDefault(); }
      } else if (e.key === "+" || e.key === "=") viewport.zoomIn();
      else if (e.key === "-" || e.key === "_") viewport.zoomOut();
      else if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (selectedShape) {
          const step = (e.shiftKey ? 10 : 1) * gridStep;
          let dx = 0, dy = 0;
          if (e.key === "ArrowUp") dy = -step;
          else if (e.key === "ArrowDown") dy = step;
          else if (e.key === "ArrowLeft") dx = -step;
          else if (e.key === "ArrowRight") dx = step;
          e.preventDefault();
          offsetSelectedShape(dx, dy);
        }
      } else if (
        (tool === "area" || tool === "line") &&
        (areaTool.points.length > 0 || lineTool.points.length > 0) &&
        /^[0-9.,]$/.test(e.key)
      ) {
        const inp = lengthInputRef.current;
        if (inp && document.activeElement !== inp) {
          e.preventDefault();
          inp.focus();
          inp.value = e.key === "," ? "." : e.key;
        }
      }
    };
    const onKeyUp = (e) => {
      if (e.code === "Space") spaceHeldRef.current = false;
      if (e.key === "Shift") shiftHeldRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, areaTool.points.length, lineTool.points.length, selectedShape, areas, lines, calibrationMode, gridStep, lockedLength]);

  const getLocalPx = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const applySnap = useCallback((w) => {
    if (!snapEnabled || shiftHeldRef.current) return w;
    // Edge snap with screen-space threshold (~6 px) — magnetic grid lines.
    const threshold = 6 / viewport.scale;
    return snapToGrid(w, gridStep, threshold);
  }, [snapEnabled, gridStep, viewport.scale]);

  // Compute final point used by drawing tools: applies Shift angle (15°) and lockedLength.
  const computeDrawPoint = useCallback((wRaw, lastPoint) => {
    let p = applySnap(wRaw);
    if (lastPoint) {
      if (shiftHeldRef.current) {
        p = constrainAngle(lastPoint, wRaw, 15);
      }
      if (lockedLength && lockedLength > 0) {
        p = lockedLengthPoint(lastPoint, p, lockedLength);
      }
    }
    return p;
  }, [applySnap, lockedLength]);

  const pxPerWorld = viewport.scale;
  const vertexPickWorld = VERTEX_PICK_PX / pxPerWorld;
  const segmentPickWorld = SEGMENT_PICK_PX / pxPerWorld;

  const hitSelectedHandles = (w) => {
    if (!selectedShape) return null;
    const shape = selectedShape.type === "area"
      ? areas.find((a) => a.id === selectedShape.id)
      : lines.find((l) => l.id === selectedShape.id);
    if (!shape) return null;
    const v = closestVertex(w.x, w.y, shape.points);
    if (v.idx >= 0 && v.dist <= vertexPickWorld) {
      return { kind: "vertex", vertexIdx: v.idx, shape };
    }
    const closed = selectedShape.type === "area";
    const n = closed ? shape.points.length : Math.max(0, shape.points.length - 1);
    for (let i = 0; i < n; i++) {
      const a = shape.points[i];
      const b = shape.points[(i + 1) % shape.points.length];
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      if (Math.hypot(mx - w.x, my - w.y) <= vertexPickWorld) {
        return { kind: "midpoint", segIdx: i, midpoint: [mx, my], shape };
      }
    }
    return null;
  };

  const pickShapeAt = (w) => {
    for (let i = areas.length - 1; i >= 0; i--) {
      const a = areas[i];
      if (pointInPolygon(w.x, w.y, a.points)) return { type: "area", id: a.id };
    }
    let best = null;
    for (const ln of lines) {
      const r = closestSegment(w.x, w.y, ln.points, false);
      if (r.dist <= segmentPickWorld && (!best || r.dist < best.dist)) {
        best = { type: "line", id: ln.id, dist: r.dist };
      }
    }
    return best ? { type: best.type, id: best.id } : null;
  };

  // Pointer handlers
  const onPointerDown = (e) => {
    const lp = getLocalPx(e);
    const isPan = tool === "pan" || spaceHeldRef.current || e.button === 1 || e.button === 2;
    if (isPan) {
      panStateRef.current = { startX: e.clientX, startY: e.clientY, origOffset: { ...viewport.offset } };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    const wRaw = viewport.screenToWorld(lp.x, lp.y);
    const w = applySnap(wRaw);

    // Calibration mode (background)
    if (calibrationMode) {
      const newPts = [...calibrationPoints, [w.x, w.y]];
      setCalibrationPoints(newPts);
      if (newPts.length === 2) finishCalibration(newPts);
      return;
    }

    if (tool === "area") {
      const lastPt = areaTool.points[areaTool.points.length - 1] || null;
      const draw = lastPt ? computeDrawPoint(wRaw, lastPt) : w;
      if (areaTool.points.length >= 3) {
        const first = areaTool.points[0];
        const dxPx = (draw.x - first[0]) * viewport.scale;
        const dyPx = (draw.y - first[1]) * viewport.scale;
        if (Math.hypot(dxPx, dyPx) < 12) { finishArea(); return; }
      }
      areaTool.addPoint([draw.x, draw.y]);
      if (lockedLength) setLockedLength(null);
      return;
    }
    if (tool === "line") {
      const lastPt = lineTool.points[lineTool.points.length - 1] || null;
      const draw = lastPt ? computeDrawPoint(wRaw, lastPt) : w;
      lineTool.addPoint([draw.x, draw.y]);
      if (lockedLength) setLockedLength(null);
      return;
    }
    if (tool === "edit") {
      const hit = hitSelectedHandles(wRaw);
      if (hit) {
        if (hit.kind === "vertex") {
          if (shiftHeldRef.current) {
            const minPts = selectedShape.type === "area" ? 3 : 2;
            if (hit.shape.points.length <= minPts) {
              toast.error(`Pozostawiono minimum ${minPts} węzłów`); return;
            }
            const oldPts = hit.shape.points;
            const newPts = hit.shape.points.filter((_, i) => i !== hit.vertexIdx);
            persistShapePoints(selectedShape.type, selectedShape.id, newPts, oldPts);
            return;
          }
          dragRef.current = {
            type: selectedShape.type, id: selectedShape.id,
            vertexIdx: hit.vertexIdx, origPoints: hit.shape.points,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
        if (hit.kind === "midpoint") {
          const newPts = [...hit.shape.points];
          newPts.splice(hit.segIdx + 1, 0, hit.midpoint);
          updateShapePointsLocal(selectedShape.type, selectedShape.id, newPts);
          dragRef.current = {
            type: selectedShape.type, id: selectedShape.id,
            vertexIdx: hit.segIdx + 1, origPoints: hit.shape.points,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
      }
      const picked = pickShapeAt(wRaw);
      setSelectedShape(picked);
      return;
    }
    if (tool === "select") {
      const picked = pickShapeAt(wRaw);
      setSelectedShape(picked);
    }
  };

  const onPointerMove = (e) => {
    const lp = getLocalPx(e);
    if (panStateRef.current) {
      const dx = e.clientX - panStateRef.current.startX;
      const dy = e.clientY - panStateRef.current.startY;
      const s = viewport.scale;
      viewport.setOffset({
        x: panStateRef.current.origOffset.x - dx / s,
        y: panStateRef.current.origOffset.y - dy / s,
      });
      return;
    }
    const wRaw = viewport.screenToWorld(lp.x, lp.y);
    const w = applySnap(wRaw);
    setCursor(w);

    const wantsSnap = (tool === "area" || tool === "line" || (tool === "edit" && dragRef.current) || calibrationMode)
      && snapEnabled && !shiftHeldRef.current;
    if (wantsSnap && (w.x !== wRaw.x || w.y !== wRaw.y)) setSnapPreview([w.x, w.y]);
    else setSnapPreview(null);

    if (dragRef.current) {
      const d = dragRef.current;
      const shape = d.type === "area"
        ? areas.find((a) => a.id === d.id)
        : lines.find((ln) => ln.id === d.id);
      if (!shape) return;
      // For edit drag we keep simple snap (no angle/length lock during vertex drag)
      const newPts = shape.points.map((p, i) => (i === d.vertexIdx ? [w.x, w.y] : p));
      updateShapePointsLocal(d.type, d.id, newPts);
      return;
    }

    // Drawing preview: compute effective hover point with angle/lockedLength applied.
    if (tool === "area") {
      const lastPt = areaTool.points[areaTool.points.length - 1] || null;
      const hp = lastPt ? computeDrawPoint(wRaw, lastPt) : w;
      areaTool.setHoverPoint([hp.x, hp.y]);
    } else if (tool === "line") {
      const lastPt = lineTool.points[lineTool.points.length - 1] || null;
      const hp = lastPt ? computeDrawPoint(wRaw, lastPt) : w;
      lineTool.setHoverPoint([hp.x, hp.y]);
    } else {
      areaTool.setHoverPoint([w.x, w.y]);
    }
  };

  const onPointerUp = async (e) => {
    if (panStateRef.current) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      panStateRef.current = null;
    }
    if (dragRef.current) {
      const d = dragRef.current;
      dragRef.current = null;
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      const shape = d.type === "area"
        ? areas.find((a) => a.id === d.id)
        : lines.find((ln) => ln.id === d.id);
      if (shape) await persistShapePoints(d.type, d.id, shape.points, d.origPoints);
    }
  };

  const onWheel = (e) => {
    e.preventDefault();
    const lp = getLocalPx(e);
    const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
    viewport.zoomAt(Math.round(viewport.zoom * factor), lp);
  };

  const onDoubleClick = () => {
    if (tool === "area" && areaTool.points.length >= 3) finishArea();
    if (tool === "line" && lineTool.points.length >= 2) finishLine();
  };

  // ---- CRUD with undo/redo ----

  const finishArea = async () => {
    if (areaTool.points.length < 3) { toast.error("Obszar potrzebuje co najmniej 3 węzłów"); return; }
    try {
      const points = [...areaTool.points];
      const created = await areasApi.create(projectId, { points, layer: "INNE" });
      setAreas((arr) => [...arr, created]);
      areaTool.reset();
      history.record({
        label: `Utwórz obszar ${created.area_id}`,
        undo: async () => {
          await areasApi.remove(projectId, created.id);
          setAreas((arr) => arr.filter((x) => x.id !== created.id));
        },
        redo: async () => {
          const re = await areasApi.create(projectId, { points, layer: created.layer });
          setAreas((arr) => [...arr, re]);
        },
      });
      toast.success(`Obszar ${created.area_id} • ${created.area_m2.toFixed(2)} m²`);
    } catch { toast.error("Nie udało się zapisać obszaru"); }
  };

  const finishLine = async () => {
    if (lineTool.points.length < 2) { toast.error("Odcinek potrzebuje co najmniej 2 węzłów"); return; }
    try {
      const points = [...lineTool.points];
      const created = await linesApi.create(projectId, { points });
      setLines((arr) => [...arr, created]);
      lineTool.reset();
      history.record({
        label: `Utwórz odcinek ${created.line_id}`,
        undo: async () => {
          await linesApi.remove(projectId, created.id);
          setLines((arr) => arr.filter((x) => x.id !== created.id));
        },
        redo: async () => {
          const re = await linesApi.create(projectId, { points });
          setLines((arr) => [...arr, re]);
        },
      });
      toast.success(`Odcinek ${created.line_id} • ${created.length_m.toFixed(2)} m`);
    } catch { toast.error("Nie udało się zapisać odcinka"); }
  };

  const handleDeleteArea = async (a, skipConfirm = false) => {
    if (!skipConfirm && !window.confirm(`Usunąć obszar ${a.area_id}?`)) return;
    try {
      await areasApi.remove(projectId, a.id);
      setAreas((arr) => arr.filter((x) => x.id !== a.id));
      if (selectedShape?.id === a.id) setSelectedShape(null);
      history.record({
        label: `Usuń obszar ${a.area_id}`,
        undo: async () => {
          const re = await areasApi.create(projectId, {
            points: a.points, layer: a.layer, color: a.color,
            thickness_cm: a.thickness_cm, density_t_m3: a.density_t_m3, status: a.status,
          });
          setAreas((arr) => [...arr, re]);
        },
        redo: async () => {
          // best-effort: remove the most recent area of same layer/area_m2
          setAreas((arr) => arr.filter((x) => !(x.layer === a.layer && Math.abs(x.area_m2 - a.area_m2) < 0.01)));
        },
      });
      toast.success("Obszar usunięty (Ctrl+Z aby cofnąć)");
    } catch { toast.error("Nie udało się usunąć obszaru"); }
  };

  const handleDeleteLine = async (ln, skipConfirm = false) => {
    if (!skipConfirm && !window.confirm(`Usunąć odcinek ${ln.line_id}?`)) return;
    try {
      await linesApi.remove(projectId, ln.id);
      setLines((arr) => arr.filter((x) => x.id !== ln.id));
      if (selectedShape?.id === ln.id) setSelectedShape(null);
      history.record({
        label: `Usuń odcinek ${ln.line_id}`,
        undo: async () => {
          const re = await linesApi.create(projectId, { points: ln.points });
          setLines((arr) => [...arr, re]);
        },
        redo: async () => {
          setLines((arr) => arr.filter((x) => Math.abs(x.length_m - ln.length_m) > 0.01));
        },
      });
      toast.success("Odcinek usunięty");
    } catch { toast.error("Nie udało się usunąć odcinka"); }
  };

  const updateShapePointsLocal = (type, id, newPoints) => {
    if (type === "area") {
      setAreas((arr) => arr.map((a) => (a.id === id ? { ...a, points: newPoints } : a)));
    } else {
      setLines((arr) => arr.map((l) => (l.id === id ? { ...l, points: newPoints } : l)));
    }
  };

  const persistShapePoints = async (type, id, newPoints, origPoints) => {
    try {
      if (type === "area") {
        const updated = await areasApi.update(projectId, id, { points: newPoints });
        setAreas((arr) => arr.map((a) => (a.id === id ? updated : a)));
        history.record({
          label: `Przesuń węzeł ${updated.area_id}`,
          undo: async () => {
            const r = await areasApi.update(projectId, id, { points: origPoints });
            setAreas((arr) => arr.map((a) => (a.id === id ? r : a)));
          },
          redo: async () => {
            const r = await areasApi.update(projectId, id, { points: newPoints });
            setAreas((arr) => arr.map((a) => (a.id === id ? r : a)));
          },
        });
      } else {
        const updated = await linesApi.update(projectId, id, { points: newPoints });
        setLines((arr) => arr.map((l) => (l.id === id ? updated : l)));
        history.record({
          label: `Przesuń węzeł ${updated.line_id}`,
          undo: async () => {
            const r = await linesApi.update(projectId, id, { points: origPoints });
            setLines((arr) => arr.map((l) => (l.id === id ? r : l)));
          },
          redo: async () => {
            const r = await linesApi.update(projectId, id, { points: newPoints });
            setLines((arr) => arr.map((l) => (l.id === id ? r : l)));
          },
        });
      }
    } catch { toast.error("Nie zapisano zmiany"); }
  };

  const patchAreaAndRecord = async (id, patch, label) => {
    const before = areas.find((a) => a.id === id);
    if (!before) return;
    try {
      const updated = await areasApi.update(projectId, id, patch);
      setAreas((arr) => arr.map((a) => (a.id === id ? updated : a)));
      const inverse = {};
      Object.keys(patch).forEach((k) => { inverse[k] = before[k]; });
      history.record({
        label,
        undo: async () => {
          const r = await areasApi.update(projectId, id, inverse);
          setAreas((arr) => arr.map((a) => (a.id === id ? r : a)));
        },
        redo: async () => {
          const r = await areasApi.update(projectId, id, patch);
          setAreas((arr) => arr.map((a) => (a.id === id ? r : a)));
        },
      });
    } catch { toast.error("Nie udało się zapisać"); }
  };

  const changeSelectedLayer = (layerKey) => {
    if (!selectedShape || selectedShape.type !== "area") return;
    patchAreaAndRecord(selectedShape.id, { layer: layerKey }, `Warstwa → ${layerKey}`);
  };
  const changeSelectedStatus = (status) => {
    if (!selectedShape || selectedShape.type !== "area") return;
    patchAreaAndRecord(selectedShape.id, { status }, `Status → ${status}`);
  };
  const changeSelectedThickness = (v) => {
    if (!selectedShape || selectedShape.type !== "area") return;
    patchAreaAndRecord(selectedShape.id, { thickness_cm: v }, `Grubość → ${v} cm`);
  };
  const changeSelectedDensity = (v) => {
    if (!selectedShape || selectedShape.type !== "area") return;
    patchAreaAndRecord(selectedShape.id, { density_t_m3: v }, `Gęstość → ${v} t/m³`);
  };

  // Offset selected shape by (dx, dy) meters (translate all points), with undo support.
  const offsetSelectedShape = async (dx, dy) => {
    if (!selectedShape || (dx === 0 && dy === 0)) return;
    const list = selectedShape.type === "area" ? areas : lines;
    const shape = list.find((s) => s.id === selectedShape.id);
    if (!shape) return;
    const oldPts = shape.points;
    const newPts = oldPts.map(([x, y]) => [x + dx, y + dy]);
    try {
      if (selectedShape.type === "area") {
        const updated = await areasApi.update(projectId, shape.id, { points: newPts });
        setAreas((arr) => arr.map((a) => (a.id === shape.id ? updated : a)));
      } else {
        const updated = await linesApi.update(projectId, shape.id, { points: newPts });
        setLines((arr) => arr.map((l) => (l.id === shape.id ? updated : l)));
      }
      history.record({
        label: `Odsuń ${selectedShape.type === "area" ? "obszar" : "odcinek"} (${dx.toFixed(2)}, ${dy.toFixed(2)}) m`,
        undo: async () => {
          if (selectedShape.type === "area") {
            const r = await areasApi.update(projectId, shape.id, { points: oldPts });
            setAreas((arr) => arr.map((a) => (a.id === shape.id ? r : a)));
          } else {
            const r = await linesApi.update(projectId, shape.id, { points: oldPts });
            setLines((arr) => arr.map((l) => (l.id === shape.id ? r : l)));
          }
        },
        redo: async () => {
          if (selectedShape.type === "area") {
            const r = await areasApi.update(projectId, shape.id, { points: newPts });
            setAreas((arr) => arr.map((a) => (a.id === shape.id ? r : a)));
          } else {
            const r = await linesApi.update(projectId, shape.id, { points: newPts });
            setLines((arr) => arr.map((l) => (l.id === shape.id ? r : l)));
          }
        },
      });
    } catch { toast.error("Nie udało się przesunąć"); }
  };


  // Deliveries
  const addDelivery = async (payload) => {
    try {
      const created = await deliveriesApi.add(projectId, payload);
      setProject((p) => p ? { ...p, deliveries: [...(p.deliveries || []), created] } : p);
      history.record({
        label: `Dostawa ${created.tonnage_t.toFixed(1)} t ${created.layer}`,
        undo: async () => {
          await deliveriesApi.remove(projectId, created.id);
          setProject((p) => p ? { ...p, deliveries: (p.deliveries || []).filter((d) => d.id !== created.id) } : p);
        },
        redo: async () => {
          const re = await deliveriesApi.add(projectId, payload);
          setProject((p) => p ? { ...p, deliveries: [...(p.deliveries || []), re] } : p);
        },
      });
      toast.success("Dostawa dodana");
    } catch { toast.error("Nie udało się dodać dostawy"); }
  };

  const deleteDelivery = async (d) => {
    if (!window.confirm(`Usunąć dostawę ${d.tonnage_t} t ${d.layer}?`)) return;
    try {
      await deliveriesApi.remove(projectId, d.id);
      setProject((p) => p ? { ...p, deliveries: (p.deliveries || []).filter((x) => x.id !== d.id) } : p);
      toast.success("Dostawa usunięta");
    } catch { toast.error("Nie udało się usunąć dostawy"); }
  };

  // Background
  const upsertBackground = async (payload) => {
    try {
      const bg = await backgroundApi.put(projectId, payload);
      setBackground(bg);
      setProject((p) => p ? { ...p, has_background: true } : p);
    } catch { toast.error("Nie udało się zapisać podkładu"); }
  };
  const patchBackground = async (payload) => {
    try {
      const bg = await backgroundApi.patch(projectId, payload);
      setBackground(bg);
    } catch { toast.error("Nie udało się zaktualizować podkładu"); }
  };
  const removeBackground = async () => {
    try {
      await backgroundApi.remove(projectId);
      setBackground(null);
      setProject((p) => p ? { ...p, has_background: false } : p);
      toast.success("Podkład usunięty");
    } catch { toast.error("Nie udało się usunąć podkładu"); }
  };

  // Calibration
  const startCalibration = () => {
    if (!background) { toast.error("Najpierw dodaj podkład"); return; }
    setCalibrationMode(true);
    setCalibrationPoints([]);
    setTool("select");
    toast.info("Kliknij 2 punkty na podkładzie o znanej odległości");
  };
  const finishCalibration = async (pts) => {
    const dxWorld = pts[1][0] - pts[0][0];
    const dyWorld = pts[1][1] - pts[0][1];
    const worldDist = Math.hypot(dxWorld, dyWorld);
    const input = window.prompt(`Podaj rzeczywistą odległość w metrach pomiędzy klikniętymi punktami:`, "10");
    setCalibrationMode(false);
    setCalibrationPoints([]);
    if (!input) return;
    const realM = parseFloat(String(input).replace(",", "."));
    if (!isFinite(realM) || realM <= 0) { toast.error("Nieprawidłowa odległość"); return; }
    // Current scale_factor = bg.scale * worldDist/worldDist (no change). We need:
    // realM corresponds to current worldDist. Ratio = realM / worldDist.
    // New scale = old scale * ratio.
    const ratio = realM / worldDist;
    const newScale = (background?.scale || 0.05) * ratio;
    await patchBackground({ scale: newScale, calibrated: true });
    toast.success(`Skala dopasowana: ${newScale.toFixed(4)} m/px`);
  };

  const focusShape = (s, kind) => {
    if (!s?.points?.length) return;
    let cx = 0, cy = 0;
    s.points.forEach((p) => { cx += p[0]; cy += p[1]; });
    cx /= s.points.length; cy /= s.points.length;
    const W = containerRef.current?.clientWidth || 800;
    const H = containerRef.current?.clientHeight || 600;
    viewport.setOffset({ x: cx - (W / 2) / viewport.scale, y: cy - (H / 2) / viewport.scale });
    setSelectedShape({ type: kind, id: s.id });
  };

  const getCanvasDataURL = () => {
    const el = document.querySelector(`[data-testid="${WORKSPACE.canvas}"]`);
    if (!el) return null;
    try { return el.toDataURL("image/png"); } catch { return null; }
  };

  const cursorStyle = panStateRef.current ? "grabbing"
    : (tool === "pan" || spaceHeldRef.current) ? "grab"
    : calibrationMode ? "crosshair"
    : "crosshair";

  return (
    <div data-testid={WORKSPACE.root} className="relative h-screen w-screen overflow-hidden bg-[#F1F3F5]">
      <div ref={containerRef} className="absolute inset-0">
        <CanvasBoard
          viewport={viewport}
          gridStep={gridStep}
          tool={tool}
          areas={areas}
          lines={lines}
          background={background}
          calibrationPoints={calibrationMode ? calibrationPoints : []}
          drawingPoints={tool === "area" ? areaTool.points : tool === "line" ? lineTool.points : []}
          drawingMode={tool === "area" && areaTool.points.length > 0 ? "area"
            : tool === "line" && lineTool.points.length > 0 ? "line" : null}
          hoverPoint={tool === "area" ? areaTool.hoverPoint
            : tool === "line" ? lineTool.hoverPoint
            : areaTool.hoverPoint}
          selectedShape={selectedShape}
          snapPreview={snapPreview}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
          onDoubleClick={onDoubleClick}
          cursorStyle={cursorStyle}
        />
      </div>

      <MeasurementPanel
        ref={lengthInputRef}
        mode={tool === "area" && areaTool.points.length > 0 ? "area"
          : tool === "line" && lineTool.points.length > 0 ? "line" : "idle"}
        points={tool === "line" ? lineTool.points : areaTool.points}
        areaM2={areaTool.liveAreaM2}
        perimeterM={areaTool.livePerimeterM}
        lengthM={lineTool.liveLengthM}
        canFinish={tool === "area" ? areaTool.points.length >= 3 : lineTool.points.length >= 2}
        onFinish={() => (tool === "line" ? finishLine() : finishArea())}
        onCancel={() => { areaTool.reset(); lineTool.reset(); setLockedLength(null); }}
        lockedLength={lockedLength}
        onSetLockedLength={(v) => setLockedLength(v)}
        onClearLockedLength={() => setLockedLength(null)}
      />

      <TopToolbar
        zoom={viewport.zoom}
        onZoomIn={() => viewport.zoomIn()}
        onZoomOut={() => viewport.zoomOut()}
        onZoomSet={(z) => viewport.setZoom(z)}
        onReset={viewport.reset}
        gridStep={gridStep}
        onGridStepChange={setGridStep}
        snapEnabled={snapEnabled}
        onToggleSnap={() => setSnapEnabled((v) => !v)}
        onExport={() => setExportOpen(true)}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
        hasBackground={!!background}
        onOpenBackground={() => setBackgroundOpen(true)}
      />

      <ToolPalette tool={tool} setTool={setTool} />

      <AreasSidebar
        project={project}
        areas={areas}
        lines={lines}
        deliveries={project?.deliveries || []}
        onDeleteArea={handleDeleteArea}
        onDeleteLine={handleDeleteLine}
        onFocus={(s, kind) => focusShape(s, kind)}
        onBack={() => navigate("/")}
        layerFilter={layerFilter}
        setLayerFilter={setLayerFilter}
        selectedShape={selectedShapeFull}
        onChangeLayer={changeSelectedLayer}
        onChangeStatus={changeSelectedStatus}
        onChangeThickness={changeSelectedThickness}
        onChangeDensity={changeSelectedDensity}
        onOffsetShape={offsetSelectedShape}
        onAddDelivery={addDelivery}
        onDeleteDelivery={deleteDelivery}
      />

      {/* Brand chip + history label */}
      <div className="absolute bottom-10 left-4 z-30 flex items-center gap-2 px-2.5 py-1.5 bg-white/95 backdrop-blur-md border border-[#DEE2E6] shadow-md rounded-sm">
        <Construction className="w-3.5 h-3.5 text-[#E67700]" />
        <span className="font-heading font-black text-xs tracking-tight">BitumenOps</span>
        {history.lastLabel && (
          <span className="font-mono-data text-[10px] text-[#868E96] ml-1 truncate max-w-[200px]" title={history.lastLabel}>
            · {history.lastLabel}
          </span>
        )}
      </div>

      {/* Calibration banner */}
      {calibrationMode && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-[#40C057] text-white rounded-sm shadow-md flex items-center gap-2">
          <Ruler className="w-4 h-4" />
          <span className="font-mono-data text-xs uppercase tracking-wider">
            Kalibracja: kliknij {2 - calibrationPoints.length} {2 - calibrationPoints.length === 1 ? "punkt" : "punkty"} (Esc = anuluj)
          </span>
        </div>
      )}

      <StatusBar
        cursor={cursor}
        zoom={viewport.zoom}
        gridStep={gridStep}
        tool={tool}
        areasCount={areas.length}
        linesCount={lines.length}
        snapEnabled={snapEnabled}
      />

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        project={project}
        areas={areas}
        lines={lines}
        deliveries={project?.deliveries || []}
        getCanvasDataURL={getCanvasDataURL}
      />

      <BackgroundDialog
        open={backgroundOpen}
        onOpenChange={setBackgroundOpen}
        background={background}
        onUpsert={upsertBackground}
        onPatch={patchBackground}
        onRemove={removeBackground}
        onStartCalibration={startCalibration}
      />
    </div>
  );
}
