import {
  ZoomIn, ZoomOut, Maximize2, ChevronDown, Magnet, Download,
  Undo2, Redo2, ImageIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ZOOM_STEPS } from "@/lib/geometry";
import { WORKSPACE } from "@/constants/testIds";

export const TopToolbar = ({
  zoom, onZoomIn, onZoomOut, onZoomSet, onReset,
  gridStep, onGridStepChange,
  snapEnabled, onToggleSnap,
  onExport,
  canUndo, canRedo, onUndo, onRedo,
  hasBackground, onOpenBackground,
}) => {
  const gridOptions = [0.1, 0.25, 0.5, 1, 2, 5, 10];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 p-1 bg-white/95 backdrop-blur-md border border-[#DEE2E6] shadow-md rounded-sm">
      {/* Undo / Redo */}
      <button
        data-testid={WORKSPACE.undoBtn}
        onClick={onUndo}
        disabled={!canUndo}
        title="Cofnij (Ctrl+Z)"
        className="p-2 hover:bg-[#F1F3F5] disabled:text-[#CED4DA] rounded-sm transition-colors"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        data-testid={WORKSPACE.redoBtn}
        onClick={onRedo}
        disabled={!canRedo}
        title="Ponów (Ctrl+Y / Ctrl+Shift+Z)"
        className="p-2 hover:bg-[#F1F3F5] disabled:text-[#CED4DA] rounded-sm transition-colors"
      >
        <Redo2 className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-[#DEE2E6] mx-1" />

      {/* Zoom */}
      <button
        data-testid={WORKSPACE.zoomOut}
        onClick={() => onZoomOut()}
        className="p-2 hover:bg-[#F1F3F5] rounded-sm transition-colors"
        title="Oddal (–)"
      >
        <ZoomOut className="w-4 h-4 text-[#212529]" />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            data-testid={WORKSPACE.zoomLevel}
            className="px-3 py-1.5 hover:bg-[#F1F3F5] rounded-sm font-mono-data text-sm tracking-tight flex items-center gap-1 min-w-[88px] justify-center"
          >
            {zoom}%
            <ChevronDown className="w-3 h-3 text-[#868E96]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="rounded-sm">
          {ZOOM_STEPS.map((z) => (
            <DropdownMenuItem key={z} onClick={() => onZoomSet(z)} className="font-mono-data text-sm cursor-pointer">
              {z}%
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <button
        data-testid={WORKSPACE.zoomIn}
        onClick={() => onZoomIn()}
        className="p-2 hover:bg-[#F1F3F5] rounded-sm transition-colors"
        title="Przybliż (+)"
      >
        <ZoomIn className="w-4 h-4 text-[#212529]" />
      </button>
      <div className="w-px h-6 bg-[#DEE2E6] mx-1" />
      <button
        data-testid={WORKSPACE.zoomReset}
        onClick={onReset}
        className="p-2 hover:bg-[#F1F3F5] rounded-sm transition-colors"
        title="Resetuj widok"
      >
        <Maximize2 className="w-4 h-4 text-[#212529]" />
      </button>

      <div className="w-px h-6 bg-[#DEE2E6] mx-1" />

      {/* Grid */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            data-testid={WORKSPACE.gridStepSelect}
            className="px-3 py-1.5 hover:bg-[#F1F3F5] rounded-sm flex items-center gap-1"
          >
            <span className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96]">Siatka</span>
            <span className="font-mono-data text-sm">{gridStep} m</span>
            <ChevronDown className="w-3 h-3 text-[#868E96]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="rounded-sm">
          {gridOptions.map((g) => (
            <DropdownMenuItem key={g} onClick={() => onGridStepChange(g)} className="font-mono-data text-sm cursor-pointer">
              {g} m
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        data-testid={WORKSPACE.snapToggle}
        onClick={onToggleSnap}
        title={snapEnabled ? "Snap-to-grid: WŁ. (S, Shift = wyłącz tymczasowo)" : "Snap-to-grid: WYŁ. (S)"}
        className={`p-2 rounded-sm transition-colors flex items-center gap-1 ${
          snapEnabled ? "bg-[#212529] text-white" : "hover:bg-[#F1F3F5] text-[#212529]"
        }`}
      >
        <Magnet className="w-4 h-4" />
        <span className="font-mono-data text-[10px] uppercase tracking-wider">Snap</span>
      </button>

      <div className="w-px h-6 bg-[#DEE2E6] mx-1" />

      <button
        data-testid={WORKSPACE.backgroundBtn}
        onClick={onOpenBackground}
        title="Podkład planszy"
        className={`p-2 rounded-sm transition-colors flex items-center gap-1 ${
          hasBackground ? "bg-[#FFF4E6] text-[#D9480F] border border-[#FFD8A8]" : "hover:bg-[#F1F3F5] text-[#212529]"
        }`}
      >
        <ImageIcon className="w-4 h-4" />
        <span className="font-mono-data text-[10px] uppercase tracking-wider">Podkład</span>
      </button>

      <button
        data-testid={WORKSPACE.exportBtn}
        onClick={onExport}
        className="p-2 hover:bg-[#F1F3F5] rounded-sm transition-colors flex items-center gap-1"
        title="Eksport PDF/CSV"
      >
        <Download className="w-4 h-4 text-[#212529]" />
        <span className="font-mono-data text-[10px] uppercase tracking-wider text-[#212529]">Eksport</span>
      </button>
    </div>
  );
};
