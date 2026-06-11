import { useEffect, useRef } from "react";
import { zoomToScale } from "@/lib/geometry";
import { WORKSPACE } from "@/constants/testIds";

// Draws the grid, saved areas, in-progress polygon and hover guides.
export const CanvasBoard = ({
  viewport,
  gridStep,
  tool,
  areas,
  drawingPoints,
  hoverPoint,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
  onDoubleClick,
  cursorStyle,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Resize observer
  useEffect(() => {
    const cv = canvasRef.current;
    const cont = containerRef.current;
    if (!cv || !cont) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = cont.clientWidth;
      const h = cont.clientHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      const ctx = cv.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(cont);
    resize();
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-draw whenever inputs change
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport.zoom, viewport.offset.x, viewport.offset.y, gridStep, areas, drawingPoints, hoverPoint, tool]);

  const draw = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    const scale = zoomToScale(viewport.zoom); // px/m
    const { x: ox, y: oy } = viewport.offset;

    // Background
    ctx.fillStyle = "#F1F3F5";
    ctx.fillRect(0, 0, w, h);

    // ---- GRID ----
    let step = gridStep;
    // auto-subdivide so cells are at least ~6 px
    while (step * scale < 6) step *= 2;

    const xStart = Math.floor(ox / step) * step;
    const yStart = Math.floor(oy / step) * step;
    const xEnd = ox + w / scale;
    const yEnd = oy + h / scale;

    // Minor lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#E9ECEF";
    ctx.beginPath();
    for (let x = xStart; x <= xEnd; x += step) {
      const sx = (x - ox) * scale + 0.5;
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
    }
    for (let y = yStart; y <= yEnd; y += step) {
      const sy = (y - oy) * scale + 0.5;
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
    }
    ctx.stroke();

    // Major every 5*step (or 10*gridStep)
    const majorStep = step * 5;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#CED4DA";
    ctx.beginPath();
    const xMajorStart = Math.floor(ox / majorStep) * majorStep;
    const yMajorStart = Math.floor(oy / majorStep) * majorStep;
    for (let x = xMajorStart; x <= xEnd; x += majorStep) {
      const sx = (x - ox) * scale + 0.5;
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
    }
    for (let y = yMajorStart; y <= yEnd; y += majorStep) {
      const sy = (y - oy) * scale + 0.5;
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
    }
    ctx.stroke();

    // Axes (origin)
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#ADB5BD";
    const originX = (0 - ox) * scale;
    const originY = (0 - oy) * scale;
    ctx.beginPath();
    if (originY >= 0 && originY <= h) { ctx.moveTo(0, originY); ctx.lineTo(w, originY); }
    if (originX >= 0 && originX <= w) { ctx.moveTo(originX, 0); ctx.lineTo(originX, h); }
    ctx.stroke();

    // Grid step label
    ctx.fillStyle = "#868E96";
    ctx.font = "11px 'IBM Plex Mono', monospace";
    ctx.fillText(`grid: ${step} m`, 12, h - 16);

    // ---- SAVED AREAS ----
    areas.forEach((a) => {
      drawPolygon(ctx, a.points, scale, ox, oy, {
        fill: hexToRgba(a.color || "#E67700", 0.15),
        stroke: a.color || "#E67700",
        lineWidth: 2,
        label: a.area_id,
        labelBg: "#212529",
        labelFg: "#FFFFFF",
      });
    });

    // ---- IN-PROGRESS POLYGON ----
    if (drawingPoints && drawingPoints.length > 0) {
      const previewPts = hoverPoint ? [...drawingPoints, hoverPoint] : drawingPoints;
      // fill (if 3+ points, draw closing preview lightly)
      if (previewPts.length >= 3) {
        ctx.beginPath();
        previewPts.forEach((p, i) => {
          const sx = (p[0] - ox) * scale;
          const sy = (p[1] - oy) * scale;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        ctx.closePath();
        ctx.fillStyle = "rgba(230, 119, 0, 0.12)";
        ctx.fill();
      }

      // committed segments
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#E67700";
      ctx.beginPath();
      drawingPoints.forEach((p, i) => {
        const sx = (p[0] - ox) * scale;
        const sy = (p[1] - oy) * scale;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();

      // ghost line to hover point
      if (hoverPoint && drawingPoints.length > 0) {
        const last = drawingPoints[drawingPoints.length - 1];
        const sx1 = (last[0] - ox) * scale;
        const sy1 = (last[1] - oy) * scale;
        const sx2 = (hoverPoint[0] - ox) * scale;
        const sy2 = (hoverPoint[1] - oy) * scale;
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = "#E67700";
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.stroke();

        // also dashed line to first point if 3+ nodes (closing preview)
        if (drawingPoints.length >= 2) {
          const first = drawingPoints[0];
          const fsx = (first[0] - ox) * scale;
          const fsy = (first[1] - oy) * scale;
          ctx.strokeStyle = "rgba(230,119,0,0.55)";
          ctx.beginPath();
          ctx.moveTo(sx2, sy2);
          ctx.lineTo(fsx, fsy);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // nodes
      drawingPoints.forEach((p, i) => {
        const sx = (p[0] - ox) * scale;
        const sy = (p[1] - oy) * scale;
        ctx.beginPath();
        ctx.arc(sx, sy, i === 0 ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? "#FFFFFF" : "#E67700";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#E67700";
        ctx.stroke();
      });
    }

    // ---- CROSSHAIR (when tool = select/area, follow hoverPoint) ----
    if ((tool === "select" || tool === "area") && hoverPoint) {
      const sx = (hoverPoint[0] - ox) * scale;
      const sy = (hoverPoint[1] - oy) * scale;
      ctx.strokeStyle = "rgba(33,37,41,0.35)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, sy); ctx.lineTo(w, sy);
      ctx.moveTo(sx, 0); ctx.lineTo(sx, h);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
    >
      <canvas
        ref={canvasRef}
        data-testid={WORKSPACE.canvas}
        className="block"
        style={{ cursor: cursorStyle, touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
};

const drawPolygon = (ctx, pts, scale, ox, oy, opts) => {
  if (!pts || pts.length < 2) return;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const sx = (p[0] - ox) * scale;
    const sy = (p[1] - oy) * scale;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  });
  ctx.closePath();
  if (opts.fill) {
    ctx.fillStyle = opts.fill;
    ctx.fill();
  }
  if (opts.stroke) {
    ctx.lineWidth = opts.lineWidth || 2;
    ctx.strokeStyle = opts.stroke;
    ctx.stroke();
  }
  if (opts.label) {
    // centroid
    let cx = 0, cy = 0;
    pts.forEach((p) => { cx += p[0]; cy += p[1]; });
    cx /= pts.length; cy /= pts.length;
    const sx = (cx - ox) * scale;
    const sy = (cy - oy) * scale;
    ctx.font = "600 11px 'IBM Plex Mono', monospace";
    const text = opts.label;
    const m = ctx.measureText(text);
    const padX = 6, padY = 4;
    const w = m.width + padX * 2;
    const h = 18;
    ctx.fillStyle = opts.labelBg || "#212529";
    ctx.fillRect(sx - w / 2, sy - h / 2, w, h);
    ctx.fillStyle = opts.labelFg || "#FFFFFF";
    ctx.textBaseline = "middle";
    ctx.fillText(text, sx - w / 2 + padX, sy + 0.5);
  }
};

const hexToRgba = (hex, alpha) => {
  const m = hex.replace("#", "");
  const bigint = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
