import { Trash2, FolderKanban, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DASHBOARD } from "@/constants/testIds";

const formatDate = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
};

export const ProjectCard = ({ project, onOpen, onDelete }) => {
  return (
    <div
      data-testid={DASHBOARD.projectCard(project.id)}
      className="group relative bg-white border border-[#DEE2E6] rounded-sm p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-sm bg-[#FFF4E6] flex items-center justify-center shrink-0">
            <FolderKanban className="w-4 h-4 text-[#E67700]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-base tracking-tight text-[#212529] truncate">
              {project.name}
            </h3>
            <span className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96]">
              ID • {project.id.slice(0, 8)}
            </span>
          </div>
        </div>
        <button
          data-testid={DASHBOARD.deleteProjectBtn(project.id)}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(project);
          }}
          className="opacity-0 group-hover:opacity-100 transition p-1.5 hover:bg-[#FFE3E3] rounded-sm text-[#FA5252]"
          aria-label="Usuń projekt"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {project.description ? (
        <p className="text-sm text-[#495057] line-clamp-2 leading-relaxed">{project.description}</p>
      ) : (
        <p className="text-sm text-[#ADB5BD] italic">Brak opisu</p>
      )}

      <div className="mt-auto pt-3 border-t border-dashed border-[#E9ECEF] flex items-center justify-between text-xs text-[#868E96]">
        <div className="flex items-center gap-3 min-w-0">
          {project.location ? (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{project.location}</span>
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(project.created_at)}
          </span>
        </div>
        <span className="font-mono-data text-[11px] px-1.5 py-0.5 bg-[#212529] text-white rounded-sm">
          {project.areas_count ?? 0} obsz.
        </span>
      </div>

      <Button
        data-testid={DASHBOARD.openProjectBtn(project.id)}
        onClick={() => onOpen(project)}
        className="bg-[#E67700] hover:bg-[#D9480F] text-white rounded-sm font-semibold tracking-tight"
      >
        Otwórz projekt
      </Button>
    </div>
  );
};
