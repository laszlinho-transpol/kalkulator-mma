import { useEffect, useRef } from "react";
import { zoomToScale } from "@/lib/geometry";
import { getLayer } from "@/lib/layers";
import { WORKSPACE } from "@/constants/testIds";

// Image cache keyed by data_url
const imgCache = new Map();
const getImg = (dataUrl) => {
  if (!dataUrl) return null;
  if (imgCache.has(dataUrl)) return imgCache.get(dataUrl);
  const img = new Image();
  img.src = dataUrl;
  imgCache.set(dataUrl, img);
  return img;
};

export const CanvasBoard = ({
  viewport,
  gridStep,
  tool,
  areas,
  lines,
  background,           // { data_url, opacity, x, y, scale (m/px), rotation, visible, natural_width, natural_height }
  calibrationPoints,    // array of [x,y] world coords during calibration
  drawingPoints,
  drawingMode,
  hoverPoint,
  selectedShape,
  snapPreview,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
  onDoubleClick,
  cursorStyle,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

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

  useEffect(() => {
    // If background image not yet loaded, schedule a redraw on load.
    if (background?.data_url) {
      const img = getImg(background.data_url);
      if (!img.complete) {
        img.onload = () => draw();
      }
    }
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewport.zoom, viewport.offset.x, viewport.offset.y,
    gridStep, areas, lines, drawingPoints, drawingMode, hoverPoint,
    selectedShape, snapPreview, tool, background, calibrationPoints,
  ]);

  const draw = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    const scale = zoomToScale(viewport.zoom);
    const { x: ox, y: oy } = viewport.offset;
    const w2s = (wx, wy) => [(wx - ox) * scale, (wy - oy) * scale];

    // Background fill
    ctx.fillStyle = "#F1F3F5";
    ctx.fillRect(0, 0, w, h);

    // BACKGROUND IMAGE (under grid)
    if (background?.data_url && background.visible !== false) {
      const img = getImg(background.data_url);
      if (img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, background.opacity ?? 0.5));
        // Translate to image origin in screen coords (world (bgX, bgY))
        const [sx, sy] = w2s(background.x || 0, background.y || 0);
        ctx.translate(sx, sy);
        ctx.rotate(((background.rotation || 0) * Math.PI) / 180);
        // image is rendered at (scale_meters_per_pixel * zoom_pixels_per_meter) = scaleFactor screen px per image px
        const sf = (background.scale || 0.05) * scale;
        ctx.scale(sf, sf);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
      }
    }

    // GRID
    let step = gridStep;
    while (step * scale < 6) step *= 2;
    const xStart = Math.floor(ox / step) * step;
    const yStart = Math.floor(oy / step) * step;
    const xEnd = ox + w / scale;
    const yEnd = oy + h / scale;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(173,181,189,0.4)";
    ctx.beginPath();
    for (let x = xStart; x <= xEnd; x += step) {
      const sx = (x - ox) * scale + 0.5;
      ctx.moveTo(sx, 0); ctx.lineTo(sx, h);
    }
    for (let y = yStart; y <= yEnd; y += step) {
      const sy = (y - oy) * scale + 0.5;
      ctx.moveTo(0, sy); ctx.lineTo(w, sy);
    }
    ctx.stroke();

    const majorStep = step * 5;
    ctx.strokeStyle = "rgba(108,117,125,0.45)";
    ctx.beginPath();
    const xMajorStart = Math.floor(ox / majorStep) * majorStep;
    const yMajorStart = Math.floor(oy / majorStep) * majorStep;
    for (let x = xMajorStart; x <= xEnd; x += majorStep) {
      const sx = (x - ox) * scale + 0.5;
      ctx.moveTo(sx, 0); ctx.lineTo(sx, h);
    }
    for (let y = yMajorStart; y <= yEnd; y += majorStep) {
      const sy = (y - oy) * scale + 0.5;
      ctx.moveTo(0, sy); ctx.lineTo(w, sy);
    }
    ctx.stroke();

    // Origin
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(73,80,87,0.6)";
    const originX = (0 - ox) * scale;
    const originY = (0 - oy) * scale;
    ctx.beginPath();
    if (originY >= 0 && originY <= h) { ctx.moveTo(0, originY); ctx.lineTo(w, originY); }
    if (originX >= 0 && originX <= w) { ctx.moveTo(originX, 0); ctx.lineTo(originX, h); }
    ctx.stroke();

    ctx.fillStyle = "#868E96";
    ctx.font = "11px 'IBM Plex Mono', monospace";
    ctx.fillText(`grid: ${step} m`, 12, h - 16);

    // SAVED AREAS
    const selectedAreaId = selectedShape?.type === "area" ? selectedShape.id : null;
    areas.forEach((a) => {
      const layer = getLayer(a.layer);
      const stroke = a.color || layer.color;
      const isSelected = a.id === selectedAreaId;
      const status = a.status || "planned";
      const fillAlpha = status === "done" ? 0.30 : status === "in_progress" ? 0.22 : 0.13;
      const dashed = status === "planned";
      drawPolygon(ctx, a.points, w2s, {
        fill: hexToRgba(stroke, isSelected ? fillAlpha + 0.1 : fillAlpha),
        stroke,
        lineWidth: isSelected ? 3 : 2,
        dashed,
        label: a.area_id + (status === "done" ? " ✓" : status === "in_progress" ? " ●" : ""),
        labelBg: isSelected ? "#E67700" : "#212529",
        labelFg: "#FFFFFF",
      });
      if (isSelected && tool === "edit") {
        drawEditHandles(ctx, a.points, w2s, true);
      }
    });

    // SAVED LINES
    const selectedLineId = selectedShape?.type === "line" ? selectedShape.id : null;
    lines.forEach((ln) => {
      const isSelected = ln.id === selectedLineId;
      drawPolyline(ctx, ln.points, w2s, {
        stroke: ln.color || "#1971C2",
        lineWidth: isSelected ? 3.5 : 2.5,
        label: ln.line_id,
        labelBg: isSelected ? "#E67700" : "#1971C2",
      });
      if (isSelected && tool === "edit") {
        drawEditHandles(ctx, ln.points, w2s, false);
      }
    });

    // CALIBRATION OVERLAY
    if (calibrationPoints && calibrationPoints.length > 0) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#40C057";
      ctx.fillStyle = "#40C057";
      ctx.beginPath();
      calibrationPoints.forEach((p, i) => {
        const [sx, sy] = w2s(p[0], p[1]);
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
      calibrationPoints.forEach((p) => {
        const [sx, sy] = w2s(p[0], p[1]);
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#40C057";
        ctx.stroke();
      });
    }

    // IN-PROGRESS DRAWING
    if (drawingMode && drawingPoints && drawingPoints.length > 0) {
      const isArea = drawingMode === "area";
      const previewPts = hoverPoint ? [...drawingPoints, hoverPoint] : drawingPoints;
      if (isArea && previewPts.length >= 3) {
        ctx.beginPath();
        previewPts.forEach((p, i) => {
          const [sx, sy] = w2s(p[0], p[1]);
          if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        });
        ctx.closePath();
        ctx.fillStyle = "rgba(230, 119, 0, 0.12)";
        ctx.fill();
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = isArea ? "#E67700" : "#1971C2";
      ctx.beginPath();
      drawingPoints.forEach((p, i) => {
        const [sx, sy] = w2s(p[0], p[1]);
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      });
      ctx.stroke();

      if (hoverPoint && drawingPoints.length > 0) {
        const last = drawingPoints[drawingPoints.length - 1];
        const [sx1, sy1] = w2s(last[0], last[1]);
        const [sx2, sy2] = w2s(hoverPoint[0], hoverPoint[1]);
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = isArea ? "#E67700" : "#1971C2";
        ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2); ctx.stroke();
        if (isArea && drawingPoints.length >= 2) {
          const first = drawingPoints[0];
          const [fsx, fsy] = w2s(first[0], first[1]);
          ctx.strokeStyle = "rgba(230,119,0,0.55)";
          ctx.beginPath(); ctx.moveTo(sx2, sy2); ctx.lineTo(fsx, fsy); ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      drawingPoints.forEach((p, i) => {
        const [sx, sy] = w2s(p[0], p[1]);
        ctx.beginPath();
        ctx.arc(sx, sy, i === 0 && isArea ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 && isArea ? "#FFFFFF" : (isArea ? "#E67700" : "#1971C2");
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = isArea ? "#E67700" : "#1971C2";
        ctx.stroke();
      });
    }

    // CROSSHAIR
    if ((tool === "select" || tool === "area" || tool === "line" || tool === "edit") && hoverPoint) {
      const [sx, sy] = w2s(hoverPoint[0], hoverPoint[1]);
      ctx.strokeStyle = "rgba(33,37,41,0.35)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, sy); ctx.lineTo(w, sy);
      ctx.moveTo(sx, 0); ctx.lineTo(sx, h);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // SNAP INDICATOR
    if (snapPreview) {
      const [sx, sy] = w2s(snapPreview[0], snapPreview[1]);
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(64, 192, 87, 0.25)";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#40C057";
      ctx.stroke();
    }
  };

  return (
    <div ref={containerRef} className="absolute inset-0">
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

const drawPolygon = (ctx, pts, w2s, opts) => {
  if (!pts || pts.length < 2) return;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const [sx, sy] = w2s(p[0], p[1]);
    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
  });
  ctx.closePath();
  if (opts.fill) { ctx.fillStyle = opts.fill; ctx.fill(); }
  if (opts.stroke) {
    ctx.lineWidth = opts.lineWidth || 2;
    ctx.strokeStyle = opts.stroke;
    if (opts.dashed) ctx.setLineDash([6, 4]); else ctx.setLineDash([]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (opts.label) drawLabel(ctx, centroid(pts), w2s, opts.label, opts.labelBg, opts.labelFg);
};

const drawPolyline = (ctx, pts, w2s, opts) => {
  if (!pts || pts.length < 2) return;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const [sx, sy] = w2s(p[0], p[1]);
    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
  });
  ctx.lineWidth = opts.lineWidth || 2;
  ctx.strokeStyle = opts.stroke || "#1971C2";
  ctx.stroke();
  pts.forEach((p, i) => {
    if (i !== 0 && i !== pts.length - 1) return;
    const [sx, sy] = w2s(p[0], p[1]);
    ctx.beginPath();
    ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = opts.stroke || "#1971C2";
    ctx.fill();
  });
  if (opts.label) {
    const midIdx = Math.floor(pts.length / 2);
    const a = pts[midIdx - 1] || pts[0];
    const b = pts[midIdx] || pts[pts.length - 1];
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    drawLabel(ctx, mid, w2s, opts.label, opts.labelBg || "#1971C2", "#FFFFFF");
  }
};

const drawEditHandles = (ctx, pts, w2s, drawInsertPlus) => {
  pts.forEach((p) => {
    const [sx, sy] = w2s(p[0], p[1]);
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF"; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = "#E67700"; ctx.stroke();
  });
  const n = drawInsertPlus ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const [sx, sy] = w2s((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF"; ctx.fill();
    ctx.strokeStyle = "#40C057"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx - 2, sy); ctx.lineTo(sx + 2, sy);
    ctx.moveTo(sx, sy - 2); ctx.lineTo(sx, sy + 2);
    ctx.stroke();
  }
};

const drawLabel = (ctx, worldPos, w2s, text, bg, fg) => {
  const [sx, sy] = w2s(worldPos[0], worldPos[1]);
  ctx.font = "600 11px 'IBM Plex Mono', monospace";
  const m = ctx.measureText(text);
  const padX = 6;
  const wL = m.width + padX * 2;
  const hL = 18;
  ctx.fillStyle = bg || "#212529";
  ctx.fillRect(sx - wL / 2, sy - hL / 2, wL, hL);
  ctx.fillStyle = fg || "#FFFFFF";
  ctx.textBaseline = "middle";
  ctx.fillText(text, sx - wL / 2 + padX, sy + 0.5);
};

const centroid = (pts) => {
  let cx = 0, cy = 0;
  pts.forEach((p) => { cx += p[0]; cy += p[1]; });
  return [cx / pts.length, cy / pts.length];
};

const hexToRgba = (hex, alpha) => {
  if (!hex) return `rgba(230,119,0,${alpha})`;
  const m = hex.replace("#", "");
  const bigint = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
