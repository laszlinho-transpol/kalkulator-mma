import { Layers, Trash2, MapPin, ArrowLeft, Filter } from "lucide-react";
import { formatArea, formatLength } from "@/lib/geometry";
import { LAYER_LIST, getLayer } from "@/lib/layers";
import { LayerPicker } from "@/components/canvas/LayerPicker";
import { WORKSPACE } from "@/constants/testIds";

export const AreasSidebar = ({
  project,
  areas,
  lines,
  onDeleteArea,
  onDeleteLine,
  onFocus,
  onBack,
  layerFilter,
  setLayerFilter,
  selectedShape,
  onChangeLayer,
}) => {
  const filteredAreas = layerFilter ? areas.filter((a) => (a.layer || "INNE") === layerFilter) : areas;
  const totalArea = filteredAreas.reduce((s, a) => s + (a.area_m2 || 0), 0);
  const totalLength = lines.reduce((s, l) => s + (l.length_m || 0), 0);

  // group counts per layer
  const layerCounts = LAYER_LIST.reduce((acc, l) => {
    acc[l.key] = areas.filter((a) => (a.layer || "INNE") === l.key).length;
    return acc;
  }, {});

  return (
    <aside className="absolute top-0 right-0 h-full w-80 bg-white border-l border-[#DEE2E6] shadow-xl z-30 flex flex-col">
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
            title="Wróć do listy projektów"
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

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Obsz." value={areas.length} />
          <Stat label="Odc." value={lines.length} />
          <Stat label="Σ m²" value={formatArea(totalArea)} />
        </div>
      </div>

      {/* Selected shape inspector */}
      {selectedShape && (
        <div className="px-3 pt-3">
          <div className="rounded-sm border border-[#E67700] bg-[#FFF4E6] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-[#D9480F]">
                Wybrany {selectedShape.type === "area" ? "obszar" : "odcinek"}
              </span>
              <span className="font-mono-data text-[11px] font-semibold bg-[#212529] text-white px-1.5 py-0.5 rounded-sm">
                {selectedShape.type === "area" ? selectedShape.shape.area_id : selectedShape.shape.line_id}
              </span>
            </div>
            <div className="flex items-center gap-2 justify-between">
              {selectedShape.type === "area" ? (
                <>
                  <span className="font-mono-data text-xs text-[#212529]">
                    {formatArea(selectedShape.shape.area_m2)}
                  </span>
                  <LayerPicker
                    testId={WORKSPACE.selectedShapeLayer}
                    value={selectedShape.shape.layer}
                    onChange={(k) => onChangeLayer(k)}
                  />
                </>
              ) : (
                <span className="font-mono-data text-xs text-[#212529]">
                  {formatLength(selectedShape.shape.length_m)}
                </span>
              )}
            </div>
            <p className="font-mono-data text-[10px] text-[#868E96] mt-2 leading-relaxed">
              Tryb edycji: przeciągaj <b>białe</b> uchwyty, kliknij <b>+</b> aby dodać węzeł, <b>Shift+klik</b> usuwa węzeł.
            </p>
          </div>
        </div>
      )}

      {/* Layer filter chips */}
      <div className="px-3 pt-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Filter className="w-3 h-3 text-[#868E96]" />
          <span className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-[#868E96]">
            Warstwy
          </span>
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

      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-4">
        {/* Areas */}
        <SectionTitle title={layerFilter ? `Obszary • ${getLayer(layerFilter).label}` : "Obszary"} />
        {filteredAreas.length === 0 ? (
          <EmptyMsg>Brak obszarów{layerFilter ? " w tej warstwie" : ""}. Użyj narzędzia Obszar (A).</EmptyMsg>
        ) : (
          <ul className="space-y-2 mb-4">
            {filteredAreas.map((a) => {
              const layer = getLayer(a.layer);
              return (
                <li
                  key={a.id}
                  data-testid={WORKSPACE.sidebarAreaItem(a.id)}
                  className="group bg-white border border-[#DEE2E6] rounded-sm p-3 hover:border-[#E67700] hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => onFocus(a, "area")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: layer.color }} />
                        <span className="font-mono-data text-xs font-semibold tracking-tight bg-[#212529] text-white px-1.5 py-0.5 rounded-sm">
                          {a.area_id}
                        </span>
                        <span className="font-mono-data text-[10px] text-[#868E96] uppercase tracking-wider">
                          {layer.short}
                        </span>
                      </div>
                      <div className="mt-2 font-heading font-bold text-base text-[#212529]">
                        {formatArea(a.area_m2)}
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

        {/* Lines */}
        <SectionTitle title={`Odcinki${lines.length ? ` • Σ ${formatLength(totalLength)}` : ""}`} />
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
                    <div className="mt-2 font-heading font-bold text-base text-[#212529]">
                      {formatLength(ln.length_m)}
                    </div>
                    <div className="font-mono-data text-[11px] text-[#868E96] mt-0.5">
                      {ln.points.length} pkt
                    </div>
                  </div>
                  <button
                    data-testid={WORKSPACE.sidebarDeleteLine(ln.id)}
                    onClick={(e) => { e.stopPropagation(); onDeleteLine(ln); }}
                    className="opacity-0 group-hover:opacity-100 transition p-1.5 hover:bg-[#FFE3E3] rounded-sm text-[#FA5252]"
                    aria-label="Usuń odcinek"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
};

const Stat = ({ label, value }) => (
  <div className="bg-[#F8F9FA] border border-[#DEE2E6] rounded-sm p-2">
    <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96]">{label}</div>
    <div className="font-heading font-black text-base tracking-tight truncate">{value}</div>
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
