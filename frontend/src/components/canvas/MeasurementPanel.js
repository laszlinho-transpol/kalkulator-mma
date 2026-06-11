import { Ruler, Check, X } from "lucide-react";
import { formatArea, formatLength } from "@/lib/geometry";
import { WORKSPACE } from "@/constants/testIds";

export const MeasurementPanel = ({ active, points, areaM2, perimeterM, canFinish, onFinish, onCancel }) => {
  return (
    <div
      data-testid={WORKSPACE.measurementPanel}
      className="absolute top-4 left-4 z-40 p-4 bg-white/95 backdrop-blur-md border border-[#DEE2E6] shadow-md rounded-sm min-w-[260px]"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Ruler className={`w-4 h-4 ${active ? "text-[#E67700]" : "text-[#868E96]"}`} />
          <span className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-[#868E96]">
            Okienko pomiaru
          </span>
        </div>
        {active && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E67700] animate-pulse" />
            <span className="font-mono-data text-[10px] text-[#E67700] uppercase tracking-wider">Live</span>
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96]">
            Powierzchnia
          </div>
          <div
            data-testid={WORKSPACE.measurementArea}
            className="font-heading font-black text-3xl tracking-tight text-[#212529]"
          >
            {formatArea(areaM2 || 0)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-dashed border-[#E9ECEF]">
          <div>
            <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96]">
              Obwód
            </div>
            <div
              data-testid={WORKSPACE.measurementPerimeter}
              className="font-mono-data text-sm font-semibold text-[#212529]"
            >
              {formatLength(perimeterM || 0)}
            </div>
          </div>
          <div>
            <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96]">
              Węzły
            </div>
            <div
              data-testid={WORKSPACE.measurementNodes}
              className="font-mono-data text-sm font-semibold text-[#212529]"
            >
              {points.length}
            </div>
          </div>
        </div>

        {active && (
          <div className="flex items-center gap-2 pt-1">
            <button
              data-testid={WORKSPACE.finishAreaBtn}
              onClick={onFinish}
              disabled={!canFinish}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm bg-[#E67700] hover:bg-[#D9480F] disabled:bg-[#DEE2E6] disabled:text-[#868E96] text-white text-xs font-semibold transition-colors"
              title="Zamknij obszar (Enter)"
            >
              <Check className="w-3.5 h-3.5" />
              Zamknij obszar
            </button>
            <button
              data-testid={WORKSPACE.cancelAreaBtn}
              onClick={onCancel}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-sm border border-[#DEE2E6] hover:bg-[#F1F3F5] text-[#212529] text-xs font-semibold transition-colors"
              title="Anuluj (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {!active && (
          <p className="text-[11px] text-[#868E96] leading-relaxed pt-1 border-t border-dashed border-[#E9ECEF]">
            Wybierz narzędzie <span className="font-mono-data text-[#212529]">Obszar (A)</span> i klikaj na planszy aby dodawać węzły.
          </p>
        )}
      </div>
    </div>
  );
};
