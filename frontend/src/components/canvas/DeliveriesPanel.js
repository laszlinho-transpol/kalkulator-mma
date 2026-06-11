import { useState } from "react";
import { Trash2, Plus, Truck } from "lucide-react";
import { LAYER_LIST, getLayer } from "@/lib/layers";
import { formatTonnage } from "@/lib/tonnage";
import { WORKSPACE } from "@/constants/testIds";

export const DeliveriesPanel = ({ deliveries, onAdd, onDelete }) => {
  const [layer, setLayer] = useState("AC11S");
  const [tonnage, setTonnage] = useState("");
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const t = parseFloat(String(tonnage).replace(",", "."));
    if (!isFinite(t) || t <= 0) return;
    setBusy(true);
    try {
      await onAdd({ layer, tonnage_t: t, source: source.trim(), note: note.trim() });
      setTonnage("");
      setSource("");
      setNote("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <form
        onSubmit={submit}
        className="border border-[#DEE2E6] rounded-sm p-3 bg-[#F8F9FA] space-y-2"
      >
        <div className="flex items-center gap-1.5 mb-1">
          <Truck className="w-3.5 h-3.5 text-[#1971C2]" />
          <span className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-[#1971C2]">
            Nowa dostawa (WZ)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96]">
              Warstwa
            </label>
            <select
              data-testid={WORKSPACE.deliveryLayerSelect}
              value={layer}
              onChange={(e) => setLayer(e.target.value)}
              className="w-full mt-1 px-2 py-1 border border-[#DEE2E6] rounded-sm text-xs font-mono-data bg-white"
            >
              {LAYER_LIST.map((l) => (
                <option key={l.key} value={l.key}>{l.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96]">
              Tonaż [t]
            </label>
            <input
              data-testid={WORKSPACE.deliveryTonnageInput}
              type="text"
              inputMode="decimal"
              required
              value={tonnage}
              onChange={(e) => setTonnage(e.target.value)}
              placeholder="np. 24.5"
              className="w-full mt-1 px-2 py-1 border border-[#DEE2E6] rounded-sm text-xs font-mono-data bg-white"
            />
          </div>
        </div>

        <div>
          <label className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96]">
            Nr WZ / wytwórnia
          </label>
          <input
            data-testid={WORKSPACE.deliverySourceInput}
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="WZ-12345 / WMB Lublin"
            className="w-full mt-1 px-2 py-1 border border-[#DEE2E6] rounded-sm text-xs font-mono-data bg-white"
          />
        </div>

        <div>
          <label className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96]">
            Notatka
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="(opcjonalnie)"
            className="w-full mt-1 px-2 py-1 border border-[#DEE2E6] rounded-sm text-xs font-mono-data bg-white"
          />
        </div>

        <button
          data-testid={WORKSPACE.deliveryAddBtn}
          type="submit"
          disabled={busy || !tonnage}
          className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-sm bg-[#1971C2] hover:bg-[#1864AB] disabled:bg-[#DEE2E6] disabled:text-[#868E96] text-white text-xs font-semibold transition-colors"
        >
          <Plus className="w-3 h-3" />
          Dodaj dostawę
        </button>
      </form>

      <div>
        <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-[#868E96] mb-2">
          Historia dostaw ({deliveries.length})
        </div>
        {deliveries.length === 0 ? (
          <div className="text-[12px] text-[#ADB5BD] py-4 px-2 text-center">
            Brak dostaw. Dodaj pierwszą z WZ powyżej.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {[...deliveries].reverse().map((d) => {
              const l = getLayer(d.layer);
              return (
                <li
                  key={d.id}
                  data-testid={WORKSPACE.deliveryItem(d.id)}
                  className="group bg-white border border-[#DEE2E6] rounded-sm p-2 flex items-start justify-between gap-2 hover:border-[#1971C2] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: l.color }} />
                      <span className="font-mono-data text-[11px] font-semibold">{l.label}</span>
                      <span className="font-mono-data text-[11px] font-bold text-[#212529] ml-auto">
                        {formatTonnage(d.tonnage_t)}
                      </span>
                    </div>
                    {d.source && (
                      <div className="font-mono-data text-[10px] text-[#868E96] truncate">{d.source}</div>
                    )}
                    {d.note && (
                      <div className="font-mono-data text-[10px] text-[#ADB5BD] italic truncate">{d.note}</div>
                    )}
                  </div>
                  <button
                    data-testid={WORKSPACE.deliveryDelete(d.id)}
                    onClick={() => onDelete(d)}
                    className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-[#FFE3E3] rounded-sm text-[#FA5252]"
                    aria-label="Usuń dostawę"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
