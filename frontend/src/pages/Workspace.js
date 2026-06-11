import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Construction } from "lucide-react";
import { toast } from "sonner";
import { CanvasBoard } from "@/components/canvas/CanvasBoard";
import { TopToolbar } from "@/components/canvas/TopToolbar";
import { ToolPalette } from "@/components/canvas/ToolPalette";
import { MeasurementPanel } from "@/components/canvas/MeasurementPanel";
import { StatusBar } from "@/components/canvas/StatusBar";
import { AreasSidebar } from "@/components/canvas/AreasSidebar";
import { ExportDialog } from "@/components/canvas/ExportDialog";
import { useCanvasViewport } from "@/hooks/useCanvasViewport";
import { useAreaTool } from "@/hooks/useAreaTool";
import { useLineTool } from "@/hooks/useLineTool";
import { areasApi, linesApi, projectsApi } from "@/lib/api";
import {
  snapToGrid,
  pointInPolygon,
  closestVertex,
  closestSegment,
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
  const [tool, setTool] = useState("select");
  const [gridStep, setGridStep] = useState(0.5);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [selectedShape, setSelectedShape] = useState(null); // { type, id, shape }
  const [layerFilter, setLayerFilter] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [snapPreview, setSnapPreview] = useState(null); // [x,y] | null

  const viewport = useCanvasViewport();
  const areaTool = useAreaTool();
  const lineTool = useLineTool();

  const panStateRef = useRef(null);
  const spaceHeldRef = useRef(false);
  const shiftHeldRef = useRef(false);
  const dragRef = useRef(null); // { type, id, vertexIdx, origPoints }
  const containerRef = useRef(null);

  // Load project
  useEffect(() => {
    (async () => {
      try {
        const [p, a, ln] = await Promise.all([
          projectsApi.get(projectId),
          areasApi.list(projectId),
          linesApi.list(projectId),
        ]);
        setProject(p);
        setAreas(a);
        setLines(ln);
      } catch (e) {
        toast.error("Nie udało się załadować projektu");
        navigate("/");
      }
    })();
  }, [projectId, navigate]);

  // Keep selectedShape in sync with current shape data
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
  }, [tool, areaTool.points.length, lineTool.points.length, selectedShape, areas, lines]);

  const getLocalPx = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const applySnap = useCallback(
    (world) => {
      if (!snapEnabled || shiftHeldRef.current) return world;
      return snapToGrid(world, gridStep);
    },
    [snapEnabled, gridStep]
  );

  // Hit-test helpers ---------------------------------------------------------
  const pxPerWorld = viewport.scale;
  const vertexPickWorld = VERTEX_PICK_PX / pxPerWorld;
  const segmentPickWorld = SEGMENT_PICK_PX / pxPerWorld;

  const hitSelectedHandles = (w) => {
    if (!selectedShape) return null;
    const shape = selectedShape.type === "area"
      ? areas.find((a) => a.id === selectedShape.id)
      : lines.find((l) => l.id === selectedShape.id);
    if (!shape) return null;
    // vertex?
    const v = closestVertex(w.x, w.y, shape.points);
    if (v.idx >= 0 && v.dist <= vertexPickWorld) {
      return { kind: "vertex", vertexIdx: v.idx, shape };
    }
    // midpoint insertion?
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
    // areas first (z-order, last drawn picks first)
    for (let i = areas.length - 1; i >= 0; i--) {
      const a = areas[i];
      if (pointInPolygon(w.x, w.y, a.points)) return { type: "area", id: a.id };
    }
    // then lines: closest segment within threshold
    let best = null;
    for (const ln of lines) {
      const r = closestSegment(w.x, w.y, ln.points, false);
      if (r.dist <= segmentPickWorld && (!best || r.dist < best.dist)) {
        best = { type: "line", id: ln.id, dist: r.dist };
      }
    }
    return best ? { type: best.type, id: best.id } : null;
  };

  // Pointer handlers ---------------------------------------------------------
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

    if (tool === "area") {
      // Click-to-close on first vertex when 3+ nodes
      if (areaTool.points.length >= 3) {
        const first = areaTool.points[0];
        const dxPx = (w.x - first[0]) * viewport.scale;
        const dyPx = (w.y - first[1]) * viewport.scale;
        if (Math.hypot(dxPx, dyPx) < 12) { finishArea(); return; }
      }
      areaTool.addPoint([w.x, w.y]);
      return;
    }
    if (tool === "line") {
      lineTool.addPoint([w.x, w.y]);
      return;
    }

    if (tool === "edit") {
      // Interact with selected shape first
      const hit = hitSelectedHandles(wRaw);
      if (hit) {
        if (hit.kind === "vertex") {
          if (shiftHeldRef.current) {
            // delete vertex (need to keep min 3 for area, 2 for line)
            const minPts = selectedShape.type === "area" ? 3 : 2;
            if (hit.shape.points.length <= minPts) {
              toast.error(`Pozostawiono minimum ${minPts} węzłów`);
              return;
            }
            const newPts = hit.shape.points.filter((_, i) => i !== hit.vertexIdx);
            persistShapePoints(selectedShape.type, selectedShape.id, newPts);
            return;
          }
          dragRef.current = {
            type: selectedShape.type,
            id: selectedShape.id,
            vertexIdx: hit.vertexIdx,
            origPoints: hit.shape.points,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
        if (hit.kind === "midpoint") {
          // Insert vertex at midpoint, then immediately start dragging it.
          const newPts = [...hit.shape.points];
          newPts.splice(hit.segIdx + 1, 0, hit.midpoint);
          updateShapePointsLocal(selectedShape.type, selectedShape.id, newPts);
          dragRef.current = {
            type: selectedShape.type,
            id: selectedShape.id,
            vertexIdx: hit.segIdx + 1,
            origPoints: newPts,
            inserted: true,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
      }
      // pick shape
      const picked = pickShapeAt(wRaw);
      setSelectedShape(picked);
      return;
    }

    // tool === "select" — also lets users click-to-select shapes
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

    // Snap preview only when snapping is active and we're in a tool where it matters
    const wantsSnap = (tool === "area" || tool === "line" || (tool === "edit" && dragRef.current))
      && snapEnabled && !shiftHeldRef.current;
    if (wantsSnap && (w.x !== wRaw.x || w.y !== wRaw.y)) setSnapPreview([w.x, w.y]);
    else setSnapPreview(null);

    if (dragRef.current) {
      const d = dragRef.current;
      const shape = d.type === "area"
        ? areas.find((a) => a.id === d.id)
        : lines.find((ln) => ln.id === d.id);
      if (!shape) return;
      const newPts = shape.points.map((p, i) => (i === d.vertexIdx ? [w.x, w.y] : p));
      updateShapePointsLocal(d.type, d.id, newPts);
      return;
    }

    if (tool === "area") areaTool.setHoverPoint([w.x, w.y]);
    else if (tool === "line") lineTool.setHoverPoint([w.x, w.y]);
    else areaTool.setHoverPoint([w.x, w.y]); // generic crosshair guides
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
      // persist
      const shape = d.type === "area"
        ? areas.find((a) => a.id === d.id)
        : lines.find((ln) => ln.id === d.id);
      if (shape) await persistShapePoints(d.type, d.id, shape.points);
    }
  };

  const onWheel = (e) => {
    e.preventDefault();
    const lp = getLocalPx(e);
    const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
    const next = Math.round(viewport.zoom * factor);
    viewport.zoomAt(next, lp);
  };

  const onDoubleClick = () => {
    if (tool === "area" && areaTool.points.length >= 3) finishArea();
    if (tool === "line" && lineTool.points.length >= 2) finishLine();
  };

  // CRUD --------------------------------------------------------------------
  const finishArea = async () => {
    if (areaTool.points.length < 3) { toast.error("Obszar potrzebuje co najmniej 3 węzłów"); return; }
    try {
      const created = await areasApi.create(projectId, { points: areaTool.points, layer: "INNE" });
      setAreas((arr) => [...arr, created]);
      areaTool.reset();
      toast.success(`Obszar ${created.area_id} • ${created.area_m2.toFixed(2)} m²`);
    } catch { toast.error("Nie udało się zapisać obszaru"); }
  };

  const finishLine = async () => {
    if (lineTool.points.length < 2) { toast.error("Odcinek potrzebuje co najmniej 2 węzłów"); return; }
    try {
      const created = await linesApi.create(projectId, { points: lineTool.points });
      setLines((arr) => [...arr, created]);
      lineTool.reset();
      toast.success(`Odcinek ${created.line_id} • ${created.length_m.toFixed(2)} m`);
    } catch { toast.error("Nie udało się zapisać odcinka"); }
  };

  const handleDeleteArea = async (a, skipConfirm = false) => {
    if (!skipConfirm && !window.confirm(`Usunąć obszar ${a.area_id}?`)) return;
    try {
      await areasApi.remove(projectId, a.id);
      setAreas((arr) => arr.filter((x) => x.id !== a.id));
      if (selectedShape?.id === a.id) setSelectedShape(null);
      toast.success("Obszar usunięty");
    } catch { toast.error("Nie udało się usunąć obszaru"); }
  };

  const handleDeleteLine = async (ln, skipConfirm = false) => {
    if (!skipConfirm && !window.confirm(`Usunąć odcinek ${ln.line_id}?`)) return;
    try {
      await linesApi.remove(projectId, ln.id);
      setLines((arr) => arr.filter((x) => x.id !== ln.id));
      if (selectedShape?.id === ln.id) setSelectedShape(null);
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

  const persistShapePoints = async (type, id, points) => {
    try {
      if (type === "area") {
        const updated = await areasApi.update(projectId, id, { points });
        setAreas((arr) => arr.map((a) => (a.id === id ? updated : a)));
      } else {
        const updated = await linesApi.update(projectId, id, { points });
        setLines((arr) => arr.map((l) => (l.id === id ? updated : l)));
      }
    } catch (e) { toast.error("Nie zapisano zmiany"); }
  };

  const changeSelectedLayer = async (layerKey) => {
    if (!selectedShape || selectedShape.type !== "area") return;
    try {
      const updated = await areasApi.update(projectId, selectedShape.id, { layer: layerKey });
      setAreas((arr) => arr.map((a) => (a.id === updated.id ? updated : a)));
      toast.success(`Warstwa zmieniona: ${layerKey}`);
    } catch { toast.error("Nie udało się zmienić warstwy"); }
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

  const cursorStyle =
    panStateRef.current ? "grabbing"
    : tool === "pan" || spaceHeldRef.current ? "grab"
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
        mode={tool === "area" && areaTool.points.length > 0 ? "area"
          : tool === "line" && lineTool.points.length > 0 ? "line"
          : "idle"}
        points={tool === "line" ? lineTool.points : areaTool.points}
        areaM2={areaTool.liveAreaM2}
        perimeterM={areaTool.livePerimeterM}
        lengthM={lineTool.liveLengthM}
        canFinish={tool === "area" ? areaTool.points.length >= 3 : lineTool.points.length >= 2}
        onFinish={() => (tool === "line" ? finishLine() : finishArea())}
        onCancel={() => { areaTool.reset(); lineTool.reset(); }}
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
      />

      <ToolPalette tool={tool} setTool={setTool} />

      <AreasSidebar
        project={project}
        areas={areas}
        lines={lines}
        onDeleteArea={handleDeleteArea}
        onDeleteLine={handleDeleteLine}
        onFocus={(s, kind) => focusShape(s, kind)}
        onBack={() => navigate("/")}
        layerFilter={layerFilter}
        setLayerFilter={setLayerFilter}
        selectedShape={selectedShapeFull}
        onChangeLayer={changeSelectedLayer}
      />

      {/* Brand chip */}
      <div className="absolute bottom-10 left-4 z-30 flex items-center gap-2 px-2.5 py-1.5 bg-white/95 backdrop-blur-md border border-[#DEE2E6] shadow-md rounded-sm">
        <Construction className="w-3.5 h-3.5 text-[#E67700]" />
        <span className="font-heading font-black text-xs tracking-tight">BitumenOps</span>
      </div>

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
        getCanvasDataURL={getCanvasDataURL}
      />
    </div>
  );
}
