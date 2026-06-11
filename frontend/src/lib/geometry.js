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

export const polylineLength = (pts) => polygonPerimeter(pts, false);

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

// ---- Snap & hit-test ----

// Edge-mode snap: each axis snaps INDEPENDENTLY when within `threshold` world units
// of a grid line. This gives "magnetic grid lines" feel with strongest pull at vertices
// (when both axes snap simultaneously). Set threshold=null/undefined for old corner-only snap.
export const snapToGrid = (world, step, threshold = null) => {
  const gx = Math.round(world.x / step) * step;
  const gy = Math.round(world.y / step) * step;
  if (threshold == null) return { x: gx, y: gy };
  const x = Math.abs(gx - world.x) <= threshold ? gx : world.x;
  const y = Math.abs(gy - world.y) <= threshold ? gy : world.y;
  return { x, y };
};

// Constrain direction (origin → target) to multiples of stepDeg degrees.
// Returns a new {x,y} on the same ray but at the snapped angle (same distance from origin).
export const constrainAngle = (origin, target, stepDeg = 15) => {
  const dx = target.x - origin[0];
  const dy = target.y - origin[1];
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-9) return { x: target.x, y: target.y };
  const stepRad = (stepDeg * Math.PI) / 180;
  const angle = Math.atan2(dy, dx);
  const snapped = Math.round(angle / stepRad) * stepRad;
  return { x: origin[0] + Math.cos(snapped) * dist, y: origin[1] + Math.sin(snapped) * dist };
};

// Project target onto a ray of fixed length from origin in direction of cursor.
export const lockedLengthPoint = (origin, target, lockedLength) => {
  const dx = target.x - origin[0];
  const dy = target.y - origin[1];
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-9 || !lockedLength || lockedLength <= 0) return { x: target.x, y: target.y };
  return { x: origin[0] + (dx / dist) * lockedLength, y: origin[1] + (dy / dist) * lockedLength };
};

// Point in polygon (ray casting)
export const pointInPolygon = (px, py, pts) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

// Distance from point (px,py) to segment (ax,ay)-(bx,by), and projection
export const distanceToSegment = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return { dist: Math.hypot(px - ax, py - ay), t: 0, x: ax, y: ay };
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const x = ax + t * dx;
  const y = ay + t * dy;
  return { dist: Math.hypot(px - x, py - y), t, x, y };
};

// Find closest vertex index in pts to (px,py). Returns { idx, dist }
export const closestVertex = (px, py, pts) => {
  let bestIdx = -1;
  let bestDist = Infinity;
  pts.forEach((p, i) => {
    const d = Math.hypot(px - p[0], py - p[1]);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  });
  return { idx: bestIdx, dist: bestDist };
};

// Find closest segment of a polygon (closed=true) or polyline.
// Returns { segIdx, t, x, y, dist } where segIdx is index of segment start vertex.
export const closestSegment = (px, py, pts, closed = true) => {
  let best = { segIdx: -1, t: 0, x: 0, y: 0, dist: Infinity };
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const r = distanceToSegment(px, py, a[0], a[1], b[0], b[1]);
    if (r.dist < best.dist) {
      best = { segIdx: i, t: r.t, x: r.x, y: r.y, dist: r.dist };
    }
  }
  return best;
};
