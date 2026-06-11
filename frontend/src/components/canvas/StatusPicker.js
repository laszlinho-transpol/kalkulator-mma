import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Circle, Loader, ChevronDown } from "lucide-react";
import { STATUS_LIST, getStatus } from "@/lib/layers";
import { WORKSPACE } from "@/constants/testIds";

const STATUS_ICON = { planned: Circle, in_progress: Loader, done: Check };

export const StatusPicker = ({ value, onChange, testId }) => {
  const status = getStatus(value);
  const Icon = STATUS_ICON[status.key] || Circle;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid={testId || WORKSPACE.statusPicker}
          className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm border border-[#DEE2E6] bg-white hover:bg-[#F1F3F5] font-mono-data tracking-tight text-[11px]"
          title="Zmień status"
          style={{ borderColor: status.color }}
        >
          <Icon className="w-3 h-3" style={{ color: status.color }} />
          <span style={{ color: status.color }}>{status.short}</span>
          <ChevronDown className="w-3 h-3 text-[#868E96]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="rounded-sm">
        {STATUS_LIST.map((s) => {
          const I = STATUS_ICON[s.key] || Circle;
          return (
            <DropdownMenuItem
              key={s.key}
              data-testid={WORKSPACE.statusOption(s.key)}
              onClick={() => onChange(s.key)}
              className="cursor-pointer font-mono-data text-xs"
            >
              <I className="w-3 h-3 mr-2" style={{ color: s.color }} />
              {s.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
