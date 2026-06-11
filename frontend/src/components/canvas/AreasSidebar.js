import { useState } from "react";
import { Layers, Trash2, MapPin, ArrowLeft, Filter, ArrowUp, ArrowDown, ArrowLeft as ArrowLeftIcon, ArrowRight, Move } from "lucide-react";
import { formatArea, formatLength } from "@/lib/geometry";
import { LAYER_LIST, getLayer, getStatus } from "@/lib/layers";
import { tonnageForArea, formatTonnage } from "@/lib/tonnage";
import { LayerPicker } from "@/components/canvas/LayerPicker";
import { StatusPicker } from "@/components/canvas/StatusPicker";
import { TonnageSummary } from "@/components/canvas/TonnageSummary";
import { DeliveriesPanel } from "@/components/canvas/DeliveriesPanel";
import { WORKSPACE } from "@/constants/testIds";

const TABS = [
  { key: "areas",      label: "Obszary",   testId: WORKSPACE.tabAreas },
  { key: "tonnage",    label: "Tonaż",     testId: WORKSPACE.tabTonnage },
  { key: "deliveries", label: "Dostawy",   testId: WORKSPACE.tabDeliveries },
];

export const AreasSidebar = ({
  project,
  areas,
  lines,
  deliveries,
  onDeleteArea,
  onDeleteLine,
  onFocus,
  onBack,
  layerFilter,
  setLayerFilter,
  selectedShape,
  onChangeLayer,
  onChangeStatus,
  onChangeThickness,
  onChangeDensity,
  onOffsetShape,
  onAddDelivery,
  onDeleteDelivery,
}) => {
  const [activeTab, setActiveTab] = useState("areas");

  const filteredAreas = layerFilter ? areas.filter((a) => (a.layer || "INNE") === layerFilter) : areas;
  const totalArea = filteredAreas.reduce((s, a) => s + (a.area_m2 || 0), 0);
  const totalTonnage = areas.reduce((s, a) => s + tonnageForArea(a), 0);
  const layerCounts = LAYER_LIST.reduce((acc, l) => {
    acc[l.key] = areas.filter((a) => (a.layer || "INNE") === l.key).length;
    return acc;
  }, {});

  return (
    <aside className="absolute top-0 right-0 h-full w-80 bg-white border-l border-[#DEE2E6] shadow-xl z-30 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#DEE2E6]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#E67700]" />
            <span className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-[#868E96]">
              Projekt
            </span>
          </div>
          <button
            data-testid={WORKSPACE.backToProjects}
            onClick={onBack}
            className="flex items-center gap-1 px-2 py-1 hover:bg-[#F1F3F5] rounded-sm text-xs font-semibold text-[#212529] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Moje projekty
          </button>
        </div>
        <h2 className="font-heading font-bold text-lg tracking-tight text-[#212529] leading-tight truncate">
          {project?.name || "—"}
        </h2>
        {project?.location && (
          <div className="flex items-center gap-1 mt-1 text-xs text-[#868E96]">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{project.location}</span>
          </div>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Obsz." value={areas.length} />
          <Stat label="Σ m²" value={formatArea(totalArea)} />
          <Stat label="Σ t" value={formatTonnage(totalTonnage)} />
        </div>
      </div>

      {/* Selected shape inspector */}
      {selectedShape && (
        <div className="px-3 pt-3">
          <div className="rounded-sm border border-[#E67700] bg-[#FFF4E6] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-[#D9480F]">
                Wybrany {selectedShape.type === "area" ? "obszar" : "odcinek"}
              </span>
              <span className="font-mono-data text-[11px] font-semibold bg-[#212529] text-white px-1.5 py-0.5 rounded-sm">
                {selectedShape.type === "area" ? selectedShape.shape.area_id : selectedShape.shape.line_id}
              </span>
            </div>
            {selectedShape.type === "area" ? (
              <>
                <div className="grid grid-cols-2 gap-2 items-end">
                  <div>
                    <div className="font-mono-data text-[10px] text-[#868E96] uppercase tracking-wider">Powierzchnia</div>
                    <div className="font-mono-data text-xs text-[#212529] font-semibold">{formatArea(selectedShape.shape.area_m2)}</div>
                  </div>
                  <div>
                    <div className="font-mono-data text-[10px] text-[#868E96] uppercase tracking-wider">Tonaż</div>
                    <div className="font-mono-data text-xs text-[#D9480F] font-bold">{formatTonnage(tonnageForArea(selectedShape.shape))}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <LayerPicker
                    testId={WORKSPACE.selectedShapeLayer}
                    value={selectedShape.shape.layer}
                    onChange={onChangeLayer}
                  />
                  <StatusPicker
                    testId={WORKSPACE.selectedShapeStatus}
                    value={selectedShape.shape.status}
                    onChange={onChangeStatus}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumInput
                    label="Grubość [cm]"
                    testId={WORKSPACE.selectedShapeThickness}
                    value={selectedShape.shape.thickness_cm ?? getLayer(selectedShape.shape.layer).thickness_cm}
                    onChange={onChangeThickness}
                  />
                  <NumInput
                    label="Gęstość [t/m³]"
                    testId={WORKSPACE.selectedShapeDensity}
                    value={selectedShape.shape.density_t_m3 ?? getLayer(selectedShape.shape.layer).density_t_m3}
                    onChange={onChangeDensity}
                    step="0.01"
                  />
                </div>
                <p className="font-mono-data text-[10px] text-[#868E96] leading-relaxed">
                  Edycja: drag uchwytów · klik <b>+</b> wstawia węzeł · <b>Shift+klik</b> usuwa.
                </p>
                <OffsetWidget onOffset={onOffsetShape} />
              </>
            ) : (
              <>
                <span className="font-mono-data text-xs text-[#212529] block">
                  {formatLength(selectedShape.shape.length_m)} · {selectedShape.shape.points.length} pkt
                </span>
                <OffsetWidget onOffset={onOffsetShape} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-3 pt-3 border-b border-[#DEE2E6]">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              data-testid={t.testId}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-t-sm transition-colors ${
                activeTab === t.key
                  ? "bg-[#212529] text-white"
                  : "bg-transparent text-[#868E96] hover:text-[#212529]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-4">
        {activeTab === "areas" && (
          <>
            {/* Layer filter */}
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Filter className="w-3 h-3 text-[#868E96]" />
                <span className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-[#868E96]">Warstwy</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  data-testid={WORKSPACE.layerFilter("ALL")}
                  onClick={() => setLayerFilter(null)}
                  className={`px-2 py-0.5 rounded-sm text-[11px] font-mono-data border transition-colors ${
                    !layerFilter ? "bg-[#212529] text-white border-[#212529]" : "border-[#DEE2E6] text-[#212529] hover:bg-[#F1F3F5]"
                  }`}
                >
                  Wszystkie ({areas.length})
                </button>
                {LAYER_LIST.map((l) => (
                  <button
                    key={l.key}
                    data-testid={WORKSPACE.layerFilter(l.key)}
                    onClick={() => setLayerFilter(layerFilter === l.key ? null : l.key)}
                    className={`px-2 py-0.5 rounded-sm text-[11px] font-mono-data border transition-colors flex items-center gap-1 ${
                      layerFilter === l.key ? "bg-[#212529] text-white border-[#212529]" : "border-[#DEE2E6] text-[#212529] hover:bg-[#F1F3F5]"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: l.color }} />
                    {l.short} ({layerCounts[l.key]})
                  </button>
                ))}
              </div>
            </div>

            {/* Areas list */}
            <SectionTitle title={layerFilter ? `Obszary • ${getLayer(layerFilter).label}` : "Obszary"} />
            {filteredAreas.length === 0 ? (
              <EmptyMsg>Brak obszarów{layerFilter ? " w tej warstwie" : ""}. Użyj narzędzia Obszar (A).</EmptyMsg>
            ) : (
              <ul className="space-y-2 mb-4">
                {filteredAreas.map((a) => {
                  const layer = getLayer(a.layer);
                  const status = getStatus(a.status);
                  const tonnage = tonnageForArea(a);
                  return (
                    <li
                      key={a.id}
                      data-testid={WORKSPACE.sidebarAreaItem(a.id)}
                      className="group bg-white border border-[#DEE2E6] rounded-sm p-3 hover:border-[#E67700] hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => onFocus(a, "area")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: layer.color }} />
                            <span className="font-mono-data text-xs font-semibold tracking-tight bg-[#212529] text-white px-1.5 py-0.5 rounded-sm">
                              {a.area_id}
                            </span>
                            <span className="font-mono-data text-[10px] text-[#868E96] uppercase tracking-wider">
                              {layer.short}
                            </span>
                            <span
                              className="font-mono-data text-[9px] uppercase tracking-wider px-1 py-0.5 rounded-sm border"
                              style={{ color: status.color, borderColor: status.color }}
                            >
                              {status.short}
                            </span>
                          </div>
                          <div className="mt-2 flex items-baseline gap-2">
                            <span className="font-heading font-bold text-base text-[#212529]">{formatArea(a.area_m2)}</span>
                            <span className="font-mono-data text-xs font-semibold text-[#D9480F]">{formatTonnage(tonnage)}</span>
                          </div>
                          <div className="font-mono-data text-[11px] text-[#868E96] mt-0.5">
                            obwód {formatLength(a.perimeter_m)} • {a.points.length} pkt
                          </div>
                        </div>
                        <button
                          data-testid={WORKSPACE.sidebarDeleteArea(a.id)}
                          onClick={(e) => { e.stopPropagation(); onDeleteArea(a); }}
                          className="opacity-0 group-hover:opacity-100 transition p-1.5 hover:bg-[#FFE3E3] rounded-sm text-[#FA5252]"
                          aria-label="Usuń obszar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <SectionTitle title="Odcinki" />
            {lines.length === 0 ? (
              <EmptyMsg>Brak odcinków. Użyj narzędzia Odcinek (L).</EmptyMsg>
            ) : (
              <ul className="space-y-2">
                {lines.map((ln) => (
                  <li
                    key={ln.id}
                    data-testid={WORKSPACE.sidebarLineItem(ln.id)}
                    className="group bg-white border border-[#DEE2E6] rounded-sm p-3 hover:border-[#1971C2] hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => onFocus(ln, "line")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ln.color || "#1971C2" }} />
                          <span className="font-mono-data text-xs font-semibold tracking-tight bg-[#1971C2] text-white px-1.5 py-0.5 rounded-sm">
                            {ln.line_id}
                          </span>
                        </div>
                        <div className="mt-2 font-heading font-bold text-base text-[#212529]">{formatLength(ln.length_m)}</div>
                        <div className="font-mono-data text-[11px] text-[#868E96] mt-0.5">{ln.points.length} pkt</div>
                      </div>
                      <button
                        data-testid={WORKSPACE.sidebarDeleteLine(ln.id)}
                        onClick={(e) => { e.stopPropagation(); onDeleteLine(ln); }}
                        className="opacity-0 group-hover:opacity-100 transition p-1.5 hover:bg-[#FFE3E3] rounded-sm text-[#FA5252]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {activeTab === "tonnage" && (
          <TonnageSummary areas={areas} deliveries={deliveries} />
        )}

        {activeTab === "deliveries" && (
          <DeliveriesPanel
            deliveries={deliveries}
            onAdd={onAddDelivery}
            onDelete={onDeleteDelivery}
          />
        )}
      </div>
    </aside>
  );
};

const Stat = ({ label, value }) => (
  <div className="bg-[#F8F9FA] border border-[#DEE2E6] rounded-sm p-2 min-w-0">
    <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96]">{label}</div>
    <div className="font-heading font-black text-sm tracking-tight truncate">{value}</div>
  </div>
);

const SectionTitle = ({ title }) => (
  <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-[#868E96] mb-2">
    {title}
  </div>
);

const EmptyMsg = ({ children }) => (
  <div className="text-[12px] text-[#ADB5BD] py-3 px-2 mb-4">{children}</div>
);

const NumInput = ({ label, value, onChange, testId, step = "0.1" }) => {
  return (
    <div>
      <div className="font-mono-data text-[10px] text-[#868E96] uppercase tracking-wider mb-1">{label}</div>
      <input
        data-testid={testId}
        type="number"
        step={step}
        defaultValue={value ?? ""}
        onBlur={(e) => {
          const v = parseFloat(e.target.value);
          if (isFinite(v)) onChange(v);
        }}
        onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
        className="w-full px-2 py-1 border border-[#DEE2E6] rounded-sm text-xs font-mono-data bg-white"
      />
    </div>
  );
};

const OffsetWidget = ({ onOffset }) => {
  const [val, setVal] = useState("0.10");
  const get = () => {
    const v = parseFloat(String(val).replace(",", "."));
    return isFinite(v) && v > 0 ? v : 0;
  };
  const btn = "w-7 h-7 rounded-sm border border-[#DEE2E6] bg-white hover:bg-[#F1F3F5] flex items-center justify-center text-[#212529]";
  return (
    <div className="border-t border-dashed border-[#E9ECEF] pt-2 mt-1">
      <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96] mb-1.5 flex items-center gap-1">
        <Move className="w-3 h-3" />
        Odsuń o
      </div>
      <div className="flex items-center gap-1.5">
        <input
          data-testid={WORKSPACE.offsetInput}
          type="text"
          inputMode="decimal"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="w-16 px-1.5 py-1 border border-[#DEE2E6] rounded-sm text-xs font-mono-data bg-white"
        />
        <span className="font-mono-data text-[10px] text-[#868E96] mr-1">m</span>
        <button data-testid={WORKSPACE.offsetUp} onClick={() => onOffset(0, -get())} className={btn} title="W górę">
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button data-testid={WORKSPACE.offsetDown} onClick={() => onOffset(0, get())} className={btn} title="W dół">
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <button data-testid={WORKSPACE.offsetLeft} onClick={() => onOffset(-get(), 0)} className={btn} title="W lewo">
          <ArrowLeftIcon className="w-3.5 h-3.5" />
        </button>
        <button data-testid={WORKSPACE.offsetRight} onClick={() => onOffset(get(), 0)} className={btn} title="W prawo">
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="font-mono-data text-[9px] text-[#868E96] mt-1 leading-relaxed">
        Strzałki klawiatury = przesuw o wpisaną wartość (Shift = ×10).
      </p>
    </div>
  );
};
