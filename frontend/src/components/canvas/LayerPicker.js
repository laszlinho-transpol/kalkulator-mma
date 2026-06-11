import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { LAYER_LIST, getLayer } from "@/lib/layers";
import { WORKSPACE } from "@/constants/testIds";

// Compact layer picker (chip + dropdown). Usable inline anywhere.
export const LayerPicker = ({ value, onChange, size = "sm", testId }) => {
  const layer = getLayer(value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid={testId || WORKSPACE.layerPicker}
          className={`inline-flex items-center gap-1.5 ${
            size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs"
          } rounded-sm border border-[#DEE2E6] bg-white hover:bg-[#F1F3F5] font-mono-data tracking-tight`}
          title="Zmień warstwę"
        >
          <span className="w-2 h-2 rounded-full" style={{ background: layer.color }} />
          <span>{layer.short}</span>
          <ChevronDown className="w-3 h-3 text-[#868E96]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="rounded-sm">
        {LAYER_LIST.map((l) => (
          <DropdownMenuItem
            key={l.key}
            data-testid={WORKSPACE.layerOption(l.key)}
            onClick={() => onChange(l.key)}
            className="cursor-pointer font-mono-data text-xs"
          >
            <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ background: l.color }} />
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
