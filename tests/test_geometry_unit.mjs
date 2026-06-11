// Unit tests for geometry helpers (Stage 3 cz.2): edge-snap threshold, constrainAngle, lockedLengthPoint.
// Run: node /app/tests/test_geometry_unit.mjs
import { snapToGrid, constrainAngle, lockedLengthPoint } from "/app/frontend/src/lib/geometry.js";

let pass = 0, fail = 0;
const approx = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const check = (name, cond, info = "") => {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else      { fail++; console.log(`FAIL  ${name}  ${info}`); }
};

// ===== snapToGrid edge-mode =====
// grid=0.5, threshold = 6/50 = 0.12 (100% zoom).
const t = 0.12;

// (1.30, 0.20): x=1.30 → nearest 1.5 (diff 0.20 > 0.12) → no snap; y=0.20 → nearest 0.0 (diff 0.20 > 0.12) → no snap.
{
  const r = snapToGrid({ x: 1.30, y: 0.20 }, 0.5, t);
  check("snap (1.30,0.20) → free", approx(r.x, 1.30) && approx(r.y, 0.20), JSON.stringify(r));
}
// (1.05, 1.30): x=1.05 → nearest 1.0 (diff 0.05 < 0.12) → snap to 1.0; y=1.30 → nearest 1.5 (diff 0.20 > 0.12) → no snap.
{
  const r = snapToGrid({ x: 1.05, y: 1.30 }, 0.5, t);
  check("snap (1.05,1.30) → (1.00,1.30) edge-x only", approx(r.x, 1.00) && approx(r.y, 1.30), JSON.stringify(r));
}
// (1.05, 1.05): both axes snap → vertex pull to (1.0, 1.0).
{
  const r = snapToGrid({ x: 1.05, y: 1.05 }, 0.5, t);
  check("snap (1.05,1.05) → (1.00,1.00) vertex", approx(r.x, 1.00) && approx(r.y, 1.00), JSON.stringify(r));
}
// No threshold = old behavior, always snap both axes.
{
  const r = snapToGrid({ x: 1.30, y: 0.20 }, 0.5);
  check("snap no-threshold → vertex (1.5, 0.0)", approx(r.x, 1.5) && approx(r.y, 0.0), JSON.stringify(r));
}

// ===== constrainAngle =====
// origin (0,0), target (1, 0.1) → small angle ~5.7° → snap to 0°.
{
  const r = constrainAngle([0, 0], { x: 1, y: 0.1 }, 15);
  const dist = Math.hypot(r.x - 0, r.y - 0);
  const targetDist = Math.hypot(1, 0.1);
  check("constrainAngle 15° ortho", approx(r.y, 0, 1e-9) && approx(dist, targetDist), JSON.stringify(r));
}
// origin (0,0), target making 22° → nearest 15° multiple is 15°.
{
  const ang = (22 * Math.PI) / 180;
  const r = constrainAngle([0, 0], { x: Math.cos(ang), y: Math.sin(ang) }, 15);
  const angOut = Math.atan2(r.y, r.x) * 180 / Math.PI;
  check("constrainAngle 22° → 15°", approx(angOut, 15, 1e-6), `got ${angOut}`);
}
// origin (0,0), target making 38° → nearest is 45° (since 45-38=7 < 38-30=8).
{
  const ang = (38 * Math.PI) / 180;
  const r = constrainAngle([0, 0], { x: Math.cos(ang), y: Math.sin(ang) }, 15);
  const angOut = Math.atan2(r.y, r.x) * 180 / Math.PI;
  check("constrainAngle 38° → 45°", approx(angOut, 45, 1e-6), `got ${angOut}`);
}

// ===== lockedLengthPoint =====
// origin (0,0), target (10, 0), lock 3 → (3, 0)
{
  const r = lockedLengthPoint([0, 0], { x: 10, y: 0 }, 3);
  check("lockedLength on x-axis", approx(r.x, 3) && approx(r.y, 0), JSON.stringify(r));
}
// origin (0,0), target (3, 4), lock 10 → on ray (3/5,4/5)*10 = (6, 8)
{
  const r = lockedLengthPoint([0, 0], { x: 3, y: 4 }, 10);
  check("lockedLength on 3-4-5 ray", approx(r.x, 6) && approx(r.y, 8), JSON.stringify(r));
}
// Degenerate: origin==target → returns target.
{
  const r = lockedLengthPoint([5, 5], { x: 5, y: 5 }, 3);
  check("lockedLength degenerate (no-op)", approx(r.x, 5) && approx(r.y, 5), JSON.stringify(r));
}
// lockedLength=0 / null → returns target unchanged.
{
  const r = lockedLengthPoint([0, 0], { x: 1, y: 1 }, 0);
  check("lockedLength=0 → passthrough", approx(r.x, 1) && approx(r.y, 1), JSON.stringify(r));
}

console.log(`\n${pass} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
