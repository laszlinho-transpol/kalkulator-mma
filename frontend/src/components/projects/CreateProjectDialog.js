import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DASHBOARD } from "@/constants/testIds";

export const CreateProjectDialog = ({ open, onOpenChange, onCreate, submitting }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const reset = () => {
    setName("");
    setDescription("");
    setLocation("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreate({ name: name.trim(), description: description.trim(), location: location.trim() });
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent data-testid={DASHBOARD.createDialog} className="rounded-sm border-[#DEE2E6]">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">Nowy projekt</DialogTitle>
          <DialogDescription>Utwórz nowy projekt do nadzorowania układania masy bitumicznej.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-[0.18em] text-[#868E96]">
              Nazwa projektu *
            </Label>
            <Input
              id="name"
              data-testid={DASHBOARD.createDialogName}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. DW-123 Krasnystaw - Zamość"
              className="rounded-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location" className="text-xs font-semibold uppercase tracking-[0.18em] text-[#868E96]">
              Lokalizacja
            </Label>
            <Input
              id="location"
              data-testid={DASHBOARD.createDialogLocation}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="np. Lubelskie, km 12+400"
              className="rounded-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc" className="text-xs font-semibold uppercase tracking-[0.18em] text-[#868E96]">
              Opis
            </Label>
            <Textarea
              id="desc"
              data-testid={DASHBOARD.createDialogDesc}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Krótki opis zakresu prac..."
              className="rounded-sm resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-sm"
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              data-testid={DASHBOARD.createDialogSubmit}
              disabled={submitting || !name.trim()}
              className="bg-[#E67700] hover:bg-[#D9480F] text-white rounded-sm font-semibold"
            >
              {submitting ? "Tworzenie..." : "Utwórz projekt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
