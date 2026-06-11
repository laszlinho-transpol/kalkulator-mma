import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Sheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { getLayer } from "@/lib/layers";
import { formatArea, formatLength } from "@/lib/geometry";
import { WORKSPACE } from "@/constants/testIds";

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const csvEscape = (v) => {
  if (v == null) return "";
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const ExportDialog = ({ open, onOpenChange, project, areas, lines, getCanvasDataURL }) => {
  const [busy, setBusy] = useState(false);

  const safeName = (project?.name || "projekt").replace(/[^a-z0-9\- _]/gi, "_");

  const exportCsv = () => {
    setBusy(true);
    try {
      const rows = [];
      rows.push(["Typ", "ID", "Warstwa", "Powierzchnia [m²]", "Obwód / Długość [m]", "Węzły", "Utworzono"]);
      areas.forEach((a) => {
        rows.push([
          "Obszar",
          a.area_id,
          getLayer(a.layer).label,
          a.area_m2.toFixed(2),
          a.perimeter_m.toFixed(2),
          a.points.length,
          (a.created_at || "").slice(0, 19).replace("T", " "),
        ]);
      });
      lines.forEach((ln) => {
        rows.push([
          "Odcinek",
          ln.line_id,
          "-",
          "-",
          ln.length_m.toFixed(2),
          ln.points.length,
          (ln.created_at || "").slice(0, 19).replace("T", " "),
        ]);
      });
      const csv = "\uFEFF" + rows.map((r) => r.map(csvEscape).join(";")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      downloadBlob(blob, `${safeName}__obszary.csv`);
      toast.success("CSV wyeksportowany");
      onOpenChange(false);
    } catch (e) {
      toast.error("Błąd eksportu CSV");
    } finally {
      setBusy(false);
    }
  };

  const exportPdf = async () => {
    setBusy(true);
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("BitumenOps – Raport projektu", 14, 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Projekt: ${project?.name || "-"}`, 14, 21);
      if (project?.location) doc.text(`Lokalizacja: ${project.location}`, 14, 26);
      doc.text(
        `Wygenerowano: ${new Date().toLocaleString("pl-PL")}`,
        pageW - 14,
        14,
        { align: "right" }
      );

      // Canvas snapshot
      const dataUrl = getCanvasDataURL ? getCanvasDataURL() : null;
      let cursorY = 32;
      if (dataUrl) {
        // Maintain aspect, max width = pageW - 28, max height ~ 90mm
        const maxW = pageW - 28;
        const maxH = 90;
        const img = new Image();
        const dims = await new Promise((resolve) => {
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => resolve({ w: 1, h: 1 });
          img.src = dataUrl;
        });
        const ratio = dims.w / dims.h;
        let drawW = maxW;
        let drawH = drawW / ratio;
        if (drawH > maxH) { drawH = maxH; drawW = drawH * ratio; }
        doc.addImage(dataUrl, "PNG", 14, cursorY, drawW, drawH, undefined, "FAST");
        cursorY += drawH + 6;
      }

      // Summary
      const totalArea = areas.reduce((s, a) => s + (a.area_m2 || 0), 0);
      const totalLen = lines.reduce((s, ln) => s + (ln.length_m || 0), 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Podsumowanie", 14, cursorY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      cursorY += 5;
      doc.text(
        `Obszary: ${areas.length}   |   Lacznie powierzchni: ${totalArea.toFixed(2)} m²   |   Odcinki: ${lines.length}   |   Lacznie dlugosci: ${totalLen.toFixed(2)} m`,
        14,
        cursorY
      );
      cursorY += 4;

      if (areas.length > 0) {
        autoTable(doc, {
          startY: cursorY + 2,
          head: [["ID", "Warstwa", "Powierzchnia [m²]", "Obwod [m]", "Wezly"]],
          body: areas.map((a) => [
            a.area_id,
            getLayer(a.layer).label,
            a.area_m2.toFixed(2),
            a.perimeter_m.toFixed(2),
            a.points.length,
          ]),
          styles: { font: "helvetica", fontSize: 8 },
          headStyles: { fillColor: [33, 37, 41], textColor: 255 },
          theme: "grid",
          margin: { left: 14, right: 14 },
        });
        cursorY = doc.lastAutoTable.finalY + 6;
      }

      if (lines.length > 0) {
        // page break if needed
        if (cursorY > pageH - 40) { doc.addPage(); cursorY = 14; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Odcinki", 14, cursorY);
        autoTable(doc, {
          startY: cursorY + 2,
          head: [["ID", "Dlugosc [m]", "Wezly"]],
          body: lines.map((ln) => [ln.line_id, ln.length_m.toFixed(2), ln.points.length]),
          styles: { font: "helvetica", fontSize: 8 },
          headStyles: { fillColor: [25, 113, 194], textColor: 255 },
          theme: "grid",
          margin: { left: 14, right: 14 },
        });
      }

      doc.save(`${safeName}__raport.pdf`);
      toast.success("PDF wyeksportowany");
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Błąd eksportu PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid={WORKSPACE.exportDialog} className="rounded-sm border-[#DEE2E6]">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">Eksport projektu</DialogTitle>
          <DialogDescription>
            Wybierz format eksportu. PDF zawiera snapshot planszy + pełną tabelę obszarów i odcinków.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 my-2">
          <button
            data-testid={WORKSPACE.exportCsvBtn}
            onClick={exportCsv}
            disabled={busy}
            className="group border border-[#DEE2E6] rounded-sm p-5 text-left hover:border-[#212529] hover:bg-[#F8F9FA] transition-all disabled:opacity-50"
          >
            <Sheet className="w-6 h-6 text-[#212529] mb-3" />
            <div className="font-heading font-bold text-lg tracking-tight">CSV</div>
            <p className="text-xs text-[#868E96] mt-1 leading-relaxed">
              Płaska tabela ze wszystkimi obszarami i odcinkami (Excel, LibreOffice).
            </p>
          </button>
          <button
            data-testid={WORKSPACE.exportPdfBtn}
            onClick={exportPdf}
            disabled={busy}
            className="group border border-[#DEE2E6] rounded-sm p-5 text-left hover:border-[#E67700] hover:bg-[#FFF4E6] transition-all disabled:opacity-50"
          >
            <FileText className="w-6 h-6 text-[#E67700] mb-3" />
            <div className="font-heading font-bold text-lg tracking-tight">PDF</div>
            <p className="text-xs text-[#868E96] mt-1 leading-relaxed">
              Raport A4 z snapshotem planszy + tabelą obszarów per warstwa.
            </p>
          </button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-sm">
            Anuluj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
