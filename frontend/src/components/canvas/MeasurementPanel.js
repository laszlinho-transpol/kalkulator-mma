import { forwardRef } from "react";
import { Ruler, Check, X, Minus, Lock, Unlock } from "lucide-react";
import { formatArea, formatLength } from "@/lib/geometry";
import { WORKSPACE } from "@/constants/testIds";

// Mode: 'area' | 'line' | 'idle'
export const MeasurementPanel = forwardRef(({
  mode,
  points,
  areaM2,
  perimeterM,
  lengthM,
  canFinish,
  onFinish,
  onCancel,
  lockedLength,
  onSetLockedLength,
  onClearLockedLength,
}, lockInputRef) => {
  const isArea = mode === "area";
  const isLine = mode === "line";
  const active = isArea || isLine;
  const Icon = isLine ? Minus : Ruler;
  const canType = active && points.length >= 1;

  const handleLockSubmit = (e) => {
    e.preventDefault();
    const raw = e.target.elements.lockLen.value;
    const v = parseFloat(String(raw).replace(",", "."));
    if (isFinite(v) && v > 0) onSetLockedLength(v);
  };

  return (
    <div
      data-testid={WORKSPACE.measurementPanel}
      className="absolute top-4 left-4 z-40 p-4 bg-white/95 backdrop-blur-md border border-[#DEE2E6] shadow-md rounded-sm min-w-[280px]"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${active ? "text-[#E67700]" : "text-[#868E96]"}`} />
          <span className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-[#868E96]">
            {isLine ? "Pomiar odcinka" : "Okienko pomiaru"}
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
        {isLine ? (
          <div>
            <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96]">Długość</div>
            <div
              data-testid={WORKSPACE.measurementLength}
              className="font-heading font-black text-3xl tracking-tight text-[#212529]"
            >
              {formatLength(lengthM || 0)}
            </div>
          </div>
        ) : (
          <div>
            <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96]">Powierzchnia</div>
            <div
              data-testid={WORKSPACE.measurementArea}
              className="font-heading font-black text-3xl tracking-tight text-[#212529]"
            >
              {formatArea(areaM2 || 0)}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-dashed border-[#E9ECEF]">
          {!isLine && (
            <div>
              <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96]">Obwód</div>
              <div
                data-testid={WORKSPACE.measurementPerimeter}
                className="font-mono-data text-sm font-semibold text-[#212529]"
              >
                {formatLength(perimeterM || 0)}
              </div>
            </div>
          )}
          <div>
            <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96]">Węzły</div>
            <div
              data-testid={WORKSPACE.measurementNodes}
              className="font-mono-data text-sm font-semibold text-[#212529]"
            >
              {points.length}
            </div>
          </div>
        </div>

        {/* Length lock input — visible during drawing after first node */}
        {canType && (
          <form
            onSubmit={handleLockSubmit}
            className={`border rounded-sm p-2 ${lockedLength ? "border-[#E67700] bg-[#FFF4E6]" : "border-[#DEE2E6] bg-[#F8F9FA]"}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96] flex items-center gap-1">
                {lockedLength ? <Lock className="w-3 h-3 text-[#E67700]" /> : <Unlock className="w-3 h-3" />}
                Długość węzła [m]
              </span>
              {lockedLength && (
                <button
                  type="button"
                  data-testid={WORKSPACE.measurementLockClear}
                  onClick={onClearLockedLength}
                  className="font-mono-data text-[10px] uppercase tracking-wider text-[#D9480F] hover:underline"
                >
                  Odblokuj
                </button>
              )}
            </div>
            <div className="flex gap-1">
              <input
                ref={lockInputRef}
                data-testid={WORKSPACE.measurementLockInput}
                name="lockLen"
                type="text"
                inputMode="decimal"
                placeholder="np. 0.12 lub 12.5 → Enter"
                defaultValue={lockedLength ?? ""}
                key={lockedLength ?? "unset"}
                className="flex-1 px-2 py-1 border border-[#DEE2E6] rounded-sm text-xs font-mono-data bg-white"
                onKeyDown={(e) => { if (e.key === "Escape") { e.currentTarget.blur(); onClearLockedLength(); } }}
              />
              <button
                type="submit"
                className="px-2 py-1 rounded-sm bg-[#212529] hover:bg-[#000] text-white text-xs font-semibold"
                title="Zablokuj długość (Enter)"
              >
                <Lock className="w-3 h-3" />
              </button>
            </div>
            <p className="font-mono-data text-[9px] text-[#868E96] mt-1 leading-relaxed">
              Wpisz długość → Enter. Kolejny klik wstawi węzeł dokładnie w tej odległości w kierunku kursora.
            </p>
          </form>
        )}

        {active && (
          <div className="flex items-center gap-2 pt-1">
            <button
              data-testid={isLine ? WORKSPACE.finishLineBtn : WORKSPACE.finishAreaBtn}
              onClick={onFinish}
              disabled={!canFinish}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm bg-[#E67700] hover:bg-[#D9480F] disabled:bg-[#DEE2E6] disabled:text-[#868E96] text-white text-xs font-semibold transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              {isLine ? "Zakończ odcinek" : "Zamknij obszar"}
            </button>
            <button
              data-testid={WORKSPACE.cancelDrawBtn}
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
            Wybierz narzędzie <span className="font-mono-data text-[#212529]">Obszar (A)</span> lub <span className="font-mono-data text-[#212529]">Odcinek (L)</span> aby rozpocząć rysowanie.
            <br />
            <span className="font-mono-data text-[#212529]">Shift</span> = krok co 15° / orto.
          </p>
        )}
      </div>
    </div>
  );
});
