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
import { useCanvasViewport } from "@/hooks/useCanvasViewport";
import { useAreaTool } from "@/hooks/useAreaTool";
import { areasApi, projectsApi } from "@/lib/api";
import { WORKSPACE } from "@/constants/testIds";

export default function Workspace() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [areas, setAreas] = useState([]);
  const [tool, setTool] = useState("select"); // select | pan | area
  const [gridStep, setGridStep] = useState(0.5);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  const viewport = useCanvasViewport();
  const areaTool = useAreaTool();

  const panStateRef = useRef(null); // { startX, startY, origOffset }
  const spaceHeldRef = useRef(false);
  const containerRef = useRef(null);

  // load
  useEffect(() => {
    (async () => {
      try {
        const [p, a] = await Promise.all([projectsApi.get(projectId), areasApi.list(projectId)]);
        setProject(p);
        setAreas(a);
      } catch (e) {
        toast.error("Nie udało się załadować projektu");
        navigate("/");
      }
    })();
  }, [projectId, navigate]);

  // hotkeys
  useEffect(() => {
    const onKeyDown = (e) => {
      const t = e.target;
      const isInput = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (isInput) return;

      if (e.code === "Space" && !spaceHeldRef.current) {
        spaceHeldRef.current = true;
        e.preventDefault();
      } else if (e.key === "v" || e.key === "V") setTool("select");
      else if (e.key === "h" || e.key === "H") setTool("pan");
      else if (e.key === "a" || e.key === "A") setTool("area");
      else if (e.key === "Escape") areaTool.reset();
      else if (e.key === "Backspace" && tool === "area") {
        areaTool.popLast();
        e.preventDefault();
      } else if (e.key === "Enter" && tool === "area" && areaTool.points.length >= 3) {
        finishArea();
        e.preventDefault();
      } else if (e.key === "+" || e.key === "=") viewport.zoomIn();
      else if (e.key === "-" || e.key === "_") viewport.zoomOut();
    };
    const onKeyUp = (e) => {
      if (e.code === "Space") spaceHeldRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, areaTool.points.length]);

  const getLocalPx = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const snap = useCallback(
    (world) => {
      // snap to half of grid step? Keep precise — only snap when shift held would be cool but for now we don't snap
      return world;
    },
    []
  );

  const onPointerDown = (e) => {
    const lp = getLocalPx(e);
    const isPan = tool === "pan" || spaceHeldRef.current || e.button === 1 || e.button === 2;
    if (isPan) {
      panStateRef.current = { startX: e.clientX, startY: e.clientY, origOffset: { ...viewport.offset } };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (tool === "area") {
      const w = viewport.screenToWorld(lp.x, lp.y);
      const wp = snap(w);
      // close-on-first-point when 3+ nodes
      if (areaTool.points.length >= 3) {
        const first = areaTool.points[0];
        const dx = (wp.x - first[0]) * viewport.scale;
        const dy = (wp.y - first[1]) * viewport.scale;
        if (Math.hypot(dx, dy) < 12) {
          finishArea();
          return;
        }
      }
      areaTool.addPoint([wp.x, wp.y]);
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
    const w = viewport.screenToWorld(lp.x, lp.y);
    setCursor(w);
    if (tool === "area") areaTool.setHoverPoint([w.x, w.y]);
    else areaTool.setHoverPoint([w.x, w.y]); // also show crosshair guides in select
  };

  const onPointerUp = (e) => {
    if (panStateRef.current) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      panStateRef.current = null;
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
    if (tool === "area" && areaTool.points.length >= 3) {
      finishArea();
    }
  };

  const finishArea = async () => {
    if (areaTool.points.length < 3) {
      toast.error("Obszar potrzebuje co najmniej 3 węzłów");
      return;
    }
    const pts = areaTool.points;
    try {
      const created = await areasApi.create(projectId, { points: pts, color: "#E67700" });
      setAreas((arr) => [...arr, created]);
      areaTool.reset();
      toast.success(`Obszar ${created.area_id} • ${created.area_m2.toFixed(2)} m²`);
    } catch (e) {
      toast.error("Nie udało się zapisać obszaru");
    }
  };

  const handleDeleteArea = async (a) => {
    if (!window.confirm(`Usunąć obszar ${a.area_id}?`)) return;
    try {
      await areasApi.remove(projectId, a.id);
      setAreas((arr) => arr.filter((x) => x.id !== a.id));
      toast.success("Obszar usunięty");
    } catch {
      toast.error("Nie udało się usunąć obszaru");
    }
  };

  const focusArea = (a) => {
    if (!a?.points?.length) return;
    // center on centroid
    let cx = 0, cy = 0;
    a.points.forEach((p) => { cx += p[0]; cy += p[1]; });
    cx /= a.points.length; cy /= a.points.length;
    const W = containerRef.current?.clientWidth || 800;
    const H = containerRef.current?.clientHeight || 600;
    viewport.setOffset({ x: cx - (W / 2) / viewport.scale, y: cy - (H / 2) / viewport.scale });
  };

  const cursorStyle =
    panStateRef.current ? "grabbing" : tool === "pan" || spaceHeldRef.current ? "grab" : "crosshair";

  return (
    <div data-testid={WORKSPACE.root} className="relative h-screen w-screen overflow-hidden bg-[#F1F3F5]">
      {/* Top-left brand & back */}
      <div className="absolute top-4 left-4 z-50 pointer-events-none">
        {/* Measurement panel sits exactly here; pushing brand to bottom-left compact bar instead */}
      </div>

      {/* Top-right back-to-projects integrated into sidebar header */}

      <div ref={containerRef} className="absolute inset-0">
        <CanvasBoard
          viewport={viewport}
          gridStep={gridStep}
          tool={tool}
          areas={areas}
          drawingPoints={tool === "area" ? areaTool.points : []}
          hoverPoint={areaTool.hoverPoint}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
          onDoubleClick={onDoubleClick}
          cursorStyle={cursorStyle}
        />
      </div>

      <MeasurementPanel
        active={tool === "area" && areaTool.points.length > 0}
        points={tool === "area" ? areaTool.points : []}
        areaM2={tool === "area" ? areaTool.liveAreaM2 : 0}
        perimeterM={tool === "area" ? areaTool.livePerimeterM : 0}
        canFinish={areaTool.points.length >= 3}
        onFinish={finishArea}
        onCancel={areaTool.reset}
      />

      <TopToolbar
        zoom={viewport.zoom}
        onZoomIn={() => viewport.zoomIn()}
        onZoomOut={() => viewport.zoomOut()}
        onZoomSet={(z) => viewport.setZoom(z)}
        onReset={viewport.reset}
        gridStep={gridStep}
        onGridStepChange={setGridStep}
      />

      <ToolPalette tool={tool} setTool={setTool} />

      <AreasSidebar
        project={project}
        areas={areas}
        onDelete={handleDeleteArea}
        onFocus={focusArea}
        onBack={() => navigate("/")}
      />

      {/* Branding floating at bottom-left above status bar */}
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
      />
    </div>
  );
}
