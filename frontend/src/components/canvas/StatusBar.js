import { WORKSPACE } from "@/constants/testIds";

export const StatusBar = ({ cursor, zoom, gridStep, tool, areasCount }) => {
  const toolLabel =
    tool === "area" ? "Obszar (rysowanie)" : tool === "pan" ? "Rączka (przesuwanie)" : "Krzyżyk (wybór)";

  return (
    <div className="status-bar absolute bottom-0 left-0 w-full h-8 flex items-center justify-between px-4 z-30 text-xs font-mono-data">
      <div className="flex items-center gap-5">
        <span data-testid={WORKSPACE.statusCoords}>
          X: <span className="text-[#FFB066]">{(cursor?.x ?? 0).toFixed(2)}</span> m
          {"   "}
          Y: <span className="text-[#FFB066]">{(cursor?.y ?? 0).toFixed(2)}</span> m
        </span>
        <span data-testid={WORKSPACE.statusGrid}>
          Siatka: <span className="text-[#FFB066]">{gridStep} m</span>
        </span>
        <span data-testid={WORKSPACE.statusTool}>
          Narzędzie: <span className="text-[#FFB066]">{toolLabel}</span>
        </span>
      </div>
      <div className="flex items-center gap-5">
        <span>
          Obszary: <span className="text-[#FFB066]">{areasCount}</span>
        </span>
        <span data-testid={WORKSPACE.statusZoom}>
          Zoom: <span className="text-[#FFB066]">{zoom}%</span>
        </span>
      </div>
    </div>
  );
};
