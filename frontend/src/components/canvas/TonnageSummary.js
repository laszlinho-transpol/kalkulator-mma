import { LAYER_LIST } from "@/lib/layers";
import { aggregateByLayer, sumDeliveriesByLayer, formatTonnage } from "@/lib/tonnage";
import { formatArea } from "@/lib/geometry";
import { WORKSPACE } from "@/constants/testIds";

// Live tonnage breakdown per layer + per status + delivered comparison.
export const TonnageSummary = ({ areas, deliveries }) => {
  const agg = aggregateByLayer(areas);
  const delivered = sumDeliveriesByLayer(deliveries);

  const totals = {
    planned_m2: 0, planned_t: 0,
    in_progress_t: 0, done_t: 0,
    delivered_t: 0,
  };

  // Render all layers that have any data OR have deliveries
  const layerKeys = new Set([...Object.keys(agg), ...Object.keys(delivered)]);

  if (layerKeys.size === 0) {
    return (
      <div className="text-[12px] text-[#ADB5BD] py-6 px-2 text-center">
        Brak obszarów ani dostaw — utwórz obszar lub dodaj dostawę aby zobaczyć tonaż.
      </div>
    );
  }

  const rows = LAYER_LIST.filter((l) => layerKeys.has(l.key)).map((l) => {
    const a = agg[l.key] || { m2_total: 0, t_total: 0, by_status: { planned: { t: 0 }, in_progress: { t: 0 }, done: { t: 0 } } };
    const del = delivered[l.key] || 0;
    totals.planned_t += a.t_total;
    totals.in_progress_t += a.by_status.in_progress.t;
    totals.done_t += a.by_status.done.t;
    totals.delivered_t += del;
    const planned = a.t_total;
    const diff = del - a.by_status.done.t;
    return { layer: l, a, del, planned, diff };
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 mb-1">
        <Stat label="PLAN." value={formatTonnage(totals.planned_t)} testId={WORKSPACE.tonnageTotalPlanned} />
        <Stat label="WYKON." value={formatTonnage(totals.done_t)} color="#40C057" testId={WORKSPACE.tonnageTotalDone} />
        <Stat label="DOSTAW." value={formatTonnage(totals.delivered_t)} color="#1971C2" testId={WORKSPACE.tonnageTotalDelivered} />
      </div>

      <div className="space-y-2">
        {rows.map((r) => {
          const progressPct = r.planned > 0 ? Math.min(100, (r.a.by_status.done.t / r.planned) * 100) : 0;
          const inProgressPct = r.planned > 0 ? Math.min(100 - progressPct, (r.a.by_status.in_progress.t / r.planned) * 100) : 0;
          return (
            <div
              key={r.layer.key}
              data-testid={WORKSPACE.tonnageRow(r.layer.key)}
              className="border border-[#DEE2E6] rounded-sm p-3 bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.layer.color }} />
                  <span className="font-heading font-bold text-sm tracking-tight">{r.layer.label}</span>
                  <span className="font-mono-data text-[10px] text-[#868E96] uppercase tracking-wider">
                    {r.layer.thickness_cm}cm · {r.layer.density_t_m3} t/m³
                  </span>
                </div>
                <span className="font-mono-data text-[11px] text-[#212529]">
                  {formatArea(r.a.m2_total)}
                </span>
              </div>

              {/* Progress bar: done (green) + in_progress (amber) over planned */}
              <div className="h-2 w-full rounded-sm bg-[#F1F3F5] overflow-hidden flex">
                <div className="h-full bg-[#40C057] transition-all" style={{ width: `${progressPct}%` }} />
                <div className="h-full bg-[#E67700] transition-all" style={{ width: `${inProgressPct}%` }} />
              </div>

              <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] font-mono-data">
                <Mini label="PLAN" v={formatTonnage(r.planned)} />
                <Mini label="TRAKT" v={formatTonnage(r.a.by_status.in_progress.t)} color="#E67700" />
                <Mini label="WYKON" v={formatTonnage(r.a.by_status.done.t)} color="#40C057" />
                <Mini
                  label="WZ"
                  v={formatTonnage(r.del)}
                  color="#1971C2"
                  sub={r.del > 0 ? `${r.diff >= 0 ? "+" : ""}${r.diff.toFixed(1)} t` : null}
                  subColor={r.diff >= 0 ? "#40C057" : "#FA5252"}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Stat = ({ label, value, color, testId }) => (
  <div data-testid={testId} className="bg-[#F8F9FA] border border-[#DEE2E6] rounded-sm p-2">
    <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96]">{label}</div>
    <div className="font-heading font-black text-sm tracking-tight" style={{ color: color || "#212529" }}>
      {value}
    </div>
  </div>
);

const Mini = ({ label, v, color, sub, subColor }) => (
  <div>
    <div className="text-[9px] uppercase tracking-wider text-[#868E96]">{label}</div>
    <div className="font-semibold" style={{ color: color || "#212529" }}>{v}</div>
    {sub && <div className="text-[9px]" style={{ color: subColor || "#868E96" }}>{sub}</div>}
  </div>
);
