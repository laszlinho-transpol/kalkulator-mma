import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Construction, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { projectsApi } from "@/lib/api";
import { DASHBOARD } from "@/constants/testIds";

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await projectsApi.list();
      setProjects(data);
    } catch (e) {
      toast.error("Nie udało się załadować projektów");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (payload) => {
    setSubmitting(true);
    try {
      const created = await projectsApi.create(payload);
      setDialogOpen(false);
      toast.success(`Projekt "${created.name}" utworzony`);
      navigate(`/projects/${created.id}`);
    } catch (e) {
      toast.error("Nie udało się utworzyć projektu");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (project) => {
    if (!window.confirm(`Czy na pewno usunąć projekt "${project.name}"? Wszystkie obszary zostaną utracone.`)) return;
    try {
      await projectsApi.remove(project.id);
      setProjects((p) => p.filter((x) => x.id !== project.id));
      toast.success("Projekt usunięty");
    } catch (e) {
      toast.error("Nie udało się usunąć projektu");
    }
  };

  return (
    <div data-testid={DASHBOARD.root} className="min-h-screen bg-[#F8F9FA]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#DEE2E6]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-[#212529] flex items-center justify-center">
              <Construction className="w-5 h-5 text-[#E67700]" />
            </div>
            <div className="leading-tight">
              <div className="font-heading font-black text-lg tracking-tight">BitumenOps</div>
              <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-[#868E96]">
                Nadzór układania masy bitumicznej
              </div>
            </div>
          </div>
          <Button
            data-testid={DASHBOARD.newProjectBtn}
            onClick={() => setDialogOpen(true)}
            className="bg-[#E67700] hover:bg-[#D9480F] text-white rounded-sm font-semibold tracking-tight"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nowy projekt
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="mb-10">
          <div className="font-mono-data text-xs uppercase tracking-[0.22em] text-[#E67700] mb-3">
            Moduł / Moje projekty
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tight text-[#212529]">
            Twoje projekty drogowe
          </h1>
          <p className="text-[#495057] mt-3 max-w-2xl leading-relaxed">
            Zarządzaj projektami nadzoru, rysuj obszary układania masy i mierz powierzchnie na żywo z dokładnością inżynierską.
          </p>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 bg-white border border-[#DEE2E6] rounded-sm animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState onCreate={() => setDialogOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={(proj) => navigate(`/projects/${proj.id}`)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      <CreateProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={handleCreate}
        submitting={submitting}
      />
    </div>
  );
}

const EmptyState = ({ onCreate }) => (
  <div className="relative border-2 border-dashed border-[#DEE2E6] rounded-sm py-20 px-6 text-center bg-white overflow-hidden">
    <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
         style={{ backgroundImage: "url('https://images.unsplash.com/photo-1693019108329-1889fb170f2e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTN8MHwxfHNlYXJjaHwyfHxhc3BoYWx0JTIwcm9hZCUyMGNvbnN0cnVjdGlvbnxlbnwwfHx8fDE3ODExNzM4NDh8MA&ixlib=rb-4.1.0&q=85')", backgroundSize: "cover", backgroundPosition: "center" }} />
    <div className="relative">
      <div className="w-14 h-14 mx-auto rounded-sm bg-[#FFF4E6] flex items-center justify-center mb-5">
        <Sparkles className="w-6 h-6 text-[#E67700]" />
      </div>
      <h2 className="font-heading text-2xl font-bold tracking-tight">Brak projektów</h2>
      <p className="text-[#868E96] mt-2 max-w-md mx-auto">
        Utwórz pierwszy projekt, aby rozpocząć rysowanie obszarów układania masy bitumicznej.
      </p>
      <Button
        onClick={onCreate}
        className="mt-6 bg-[#E67700] hover:bg-[#D9480F] text-white rounded-sm font-semibold"
      >
        <Plus className="w-4 h-4 mr-1.5" />
        Utwórz pierwszy projekt
      </Button>
    </div>
  </div>
);
