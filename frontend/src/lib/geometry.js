// Geometry helpers — world coords in METERS.

export const polygonArea = (pts) => {
  if (!pts || pts.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
};

export const polygonPerimeter = (pts, closed = true) => {
  if (!pts || pts.length < 2) return 0;
  let p = 0;
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    p += Math.hypot(x2 - x1, y2 - y1);
  }
  return p;
};

export const formatArea = (m2) => {
  if (m2 >= 10000) return `${(m2 / 10000).toFixed(3)} ha`;
  if (m2 >= 100) return `${m2.toFixed(1)} m²`;
  return `${m2.toFixed(2)} m²`;
};

export const formatLength = (m) => {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${m.toFixed(2)} m`;
};

// Zoom mapping: 100% = 50 px/m
export const PX_PER_METER_AT_100 = 50;
export const MIN_ZOOM = 33;
export const MAX_ZOOM = 6400;
export const ZOOM_STEPS = [33, 50, 75, 100, 150, 200, 300, 400, 600, 800, 1200, 1600, 2400, 3200, 4800, 6400];

export const zoomToScale = (zoomPct) => (zoomPct / 100) * PX_PER_METER_AT_100;
