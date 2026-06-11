import { getLayer } from "@/lib/layers";

// Tonnage = area_m2 × thickness(m) × density(t/m³)
// Falls back to layer defaults when per-area overrides are not set.
export const tonnageForArea = (area) => {
  if (!area) return 0;
  const layer = getLayer(area.layer);
  const t = area.thickness_cm ?? layer.thickness_cm;
  const d = area.density_t_m3 ?? layer.density_t_m3;
  return (area.area_m2 || 0) * (t / 100) * d;
};

export const formatTonnage = (t) => {
  if (!isFinite(t)) return "0.00 t";
  if (Math.abs(t) >= 1000) return `${(t / 1000).toFixed(2)} kt`;
  return `${t.toFixed(2)} t`;
};

// Aggregate per layer / per status from a list of areas.
export const aggregateByLayer = (areas) => {
  const out = {};
  for (const a of areas) {
    const layer = getLayer(a.layer);
    const key = layer.key;
    if (!out[key]) {
      out[key] = {
        layer,
        m2_total: 0, t_total: 0,
        by_status: { planned: { m2: 0, t: 0 }, in_progress: { m2: 0, t: 0 }, done: { m2: 0, t: 0 } },
      };
    }
    const t = tonnageForArea(a);
    out[key].m2_total += (a.area_m2 || 0);
    out[key].t_total += t;
    const st = out[key].by_status[a.status || "planned"];
    if (st) {
      st.m2 += (a.area_m2 || 0);
      st.t += t;
    }
  }
  return out;
};

// Sum delivered tonnage by layer.
export const sumDeliveriesByLayer = (deliveries) => {
  const out = {};
  for (const d of deliveries || []) {
    const k = (d.layer || "INNE").toUpperCase();
    out[k] = (out[k] || 0) + (d.tonnage_t || 0);
  }
  return out;
};
