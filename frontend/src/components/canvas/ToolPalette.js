import { MousePointer2, Hand, Ruler } from "lucide-react";
import { WORKSPACE } from "@/constants/testIds";

const Tool = ({ id, label, icon: Icon, active, onClick, testId, hotkey }) => (
  <button
    data-testid={testId}
    onClick={onClick}
    title={`${label}${hotkey ? ` (${hotkey})` : ""}`}
    className={`flex items-center gap-2 px-3 py-2 rounded-sm transition-colors text-left w-full ${
      active
        ? "bg-[#212529] text-white"
        : "text-[#212529] hover:bg-[#F1F3F5]"
    }`}
  >
    <Icon className="w-4 h-4" />
    <span className="text-xs font-semibold tracking-tight">{label}</span>
    {hotkey && (
      <span
        className={`ml-auto font-mono-data text-[10px] px-1 py-0.5 rounded-sm border ${
          active ? "border-white/30 text-white/70" : "border-[#DEE2E6] text-[#868E96]"
        }`}
      >
        {hotkey}
      </span>
    )}
  </button>
);

export const ToolPalette = ({ tool, setTool }) => {
  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-40 bg-white/95 backdrop-blur-md border border-[#DEE2E6] shadow-md rounded-sm p-1 flex flex-col gap-0.5 w-[170px]">
      <div className="px-3 pt-2 pb-1 font-mono-data text-[10px] uppercase tracking-[0.2em] text-[#868E96]">
        Narzędzia
      </div>
      <Tool
        id="select"
        testId={WORKSPACE.toolSelect}
        label="Krzyżyk"
        icon={MousePointer2}
        hotkey="V"
        active={tool === "select"}
        onClick={() => setTool("select")}
      />
      <Tool
        id="pan"
        testId={WORKSPACE.toolPan}
        label="Rączka"
        icon={Hand}
        hotkey="H"
        active={tool === "pan"}
        onClick={() => setTool("pan")}
      />
      <div className="my-1 h-px bg-[#DEE2E6]" />
      <div className="px-3 pt-1 pb-1 font-mono-data text-[10px] uppercase tracking-[0.2em] text-[#868E96]">
        Pomiar
      </div>
      <Tool
        id="area"
        testId={WORKSPACE.toolArea}
        label="Obszar"
        icon={Ruler}
        hotkey="A"
        active={tool === "area"}
        onClick={() => setTool("area")}
      />
    </div>
  );
};
