import { Layers, Trash2, MapPin, ArrowLeft } from "lucide-react";
import { formatArea, formatLength } from "@/lib/geometry";
import { WORKSPACE } from "@/constants/testIds";

export const AreasSidebar = ({ project, areas, onDelete, onFocus, onBack }) => {
  const total = areas.reduce((s, a) => s + (a.area_m2 || 0), 0);

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

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-[#F8F9FA] border border-[#DEE2E6] rounded-sm p-2">
            <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96]">
              Obszarów
            </div>
            <div className="font-heading font-black text-xl tracking-tight">{areas.length}</div>
          </div>
          <div className="bg-[#F8F9FA] border border-[#DEE2E6] rounded-sm p-2">
            <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96]">
              Razem
            </div>
            <div className="font-heading font-black text-xl tracking-tight">{formatArea(total)}</div>
          </div>
        </div>
      </div>

      <div className="p-3 pb-1 font-mono-data text-[10px] uppercase tracking-[0.22em] text-[#868E96]">
        Lista obszarów
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {areas.length === 0 ? (
          <div className="text-center text-[#ADB5BD] text-sm py-10 px-4">
            Brak zapisanych obszarów. Narysuj pierwszy używając narzędzia <span className="font-mono-data text-[#212529]">Obszar</span>.
          </div>
        ) : (
          <ul className="space-y-2">
            {areas.map((a) => (
              <li
                key={a.id}
                data-testid={WORKSPACE.sidebarAreaItem(a.id)}
                className="group bg-white border border-[#DEE2E6] rounded-sm p-3 hover:border-[#E67700] hover:shadow-sm transition-all cursor-pointer"
                onClick={() => onFocus && onFocus(a)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: a.color || "#E67700" }}
                      />
                      <span className="font-mono-data text-xs font-semibold tracking-tight bg-[#212529] text-white px-1.5 py-0.5 rounded-sm">
                        {a.area_id}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(a);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition p-1.5 hover:bg-[#FFE3E3] rounded-sm text-[#FA5252]"
                    aria-label="Usuń obszar"
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
