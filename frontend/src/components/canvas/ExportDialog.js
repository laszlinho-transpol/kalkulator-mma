import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Sheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { getLayer, getStatus, LAYER_LIST } from "@/lib/layers";
import { formatArea, formatLength } from "@/lib/geometry";
import { tonnageForArea, aggregateByLayer, sumDeliveriesByLayer, formatTonnage } from "@/lib/tonnage";
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

export const ExportDialog = ({ open, onOpenChange, project, areas, lines, deliveries = [], getCanvasDataURL }) => {
  const [busy, setBusy] = useState(false);
  const safeName = (project?.name || "projekt").replace(/[^a-z0-9\- _]/gi, "_");

  const exportCsv = () => {
    setBusy(true);
    try {
      const rows = [];
      rows.push([
        "Typ", "ID", "Warstwa", "Status",
        "Powierzchnia [m²]", "Obwód/Długość [m]",
        "Grubość [cm]", "Gęstość [t/m³]", "Tonaż [t]",
        "Węzły", "Utworzono",
      ]);
      areas.forEach((a) => {
        const layer = getLayer(a.layer);
        rows.push([
          "Obszar", a.area_id, layer.label, getStatus(a.status).label,
          a.area_m2.toFixed(2), a.perimeter_m.toFixed(2),
          (a.thickness_cm ?? layer.thickness_cm).toFixed(1),
          (a.density_t_m3 ?? layer.density_t_m3).toFixed(2),
          tonnageForArea(a).toFixed(2),
          a.points.length,
          (a.created_at || "").slice(0, 19).replace("T", " "),
        ]);
      });
      lines.forEach((ln) => {
        rows.push(["Odcinek", ln.line_id, "-", "-", "-", ln.length_m.toFixed(2), "-", "-", "-", ln.points.length,
          (ln.created_at || "").slice(0, 19).replace("T", " ")]);
      });
      if (deliveries.length) {
        rows.push([]);
        rows.push(["Dostawy (WZ)"]);
        rows.push(["Warstwa", "Tonaż [t]", "Źródło / WZ", "Notatka", "Data"]);
        deliveries.forEach((d) => {
          rows.push([getLayer(d.layer).label, d.tonnage_t.toFixed(2), d.source || "", d.note || "",
            (d.created_at || "").slice(0, 19).replace("T", " ")]);
        });
      }
      const csv = "\uFEFF" + rows.map((r) => r.map(csvEscape).join(";")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      downloadBlob(blob, `${safeName}__obszary.csv`);
      toast.success("CSV wyeksportowany");
      onOpenChange(false);
    } catch { toast.error("Błąd eksportu CSV"); } finally { setBusy(false); }
  };

  const exportPdf = async () => {
    setBusy(true);
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("BitumenOps - Raport projektu", 14, 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Projekt: ${project?.name || "-"}`, 14, 21);
      if (project?.location) doc.text(`Lokalizacja: ${project.location}`, 14, 26);
      doc.text(`Wygenerowano: ${new Date().toLocaleString("pl-PL")}`, pageW - 14, 14, { align: "right" });

      let cursorY = 32;
      const dataUrl = getCanvasDataURL ? getCanvasDataURL() : null;
      if (dataUrl) {
        const maxW = pageW - 28; const maxH = 85;
        const img = new Image();
        const dims = await new Promise((resolve) => {
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => resolve({ w: 1, h: 1 });
          img.src = dataUrl;
        });
        const ratio = dims.w / dims.h;
        let drawW = maxW; let drawH = drawW / ratio;
        if (drawH > maxH) { drawH = maxH; drawW = drawH * ratio; }
        doc.addImage(dataUrl, "PNG", 14, cursorY, drawW, drawH, undefined, "FAST");
        cursorY += drawH + 6;
      }

      // Tonnage per layer summary
      const agg = aggregateByLayer(areas);
      const delivered = sumDeliveriesByLayer(deliveries);
      const layerKeys = new Set([...Object.keys(agg), ...Object.keys(delivered)]);
      if (layerKeys.size > 0) {
        if (cursorY > pageH - 50) { doc.addPage(); cursorY = 14; }
        doc.setFont("helvetica", "bold"); doc.setFontSize(11);
        doc.text("Tonaz wg warstwy", 14, cursorY);
        const body = LAYER_LIST.filter((l) => layerKeys.has(l.key)).map((l) => {
          const a = agg[l.key] || { m2_total: 0, t_total: 0, by_status: { planned:{t:0}, in_progress:{t:0}, done:{t:0} } };
          const del = delivered[l.key] || 0;
          const diff = del - a.by_status.done.t;
          return [
            l.label,
            a.m2_total.toFixed(2),
            a.t_total.toFixed(2),
            a.by_status.in_progress.t.toFixed(2),
            a.by_status.done.t.toFixed(2),
            del.toFixed(2),
            (diff >= 0 ? "+" : "") + diff.toFixed(2),
          ];
        });
        autoTable(doc, {
          startY: cursorY + 2,
          head: [["Warstwa", "m^2", "Plan [t]", "Trakt [t]", "Wykon [t]", "Dostarczono [t]", "Roznica [t]"]],
          body,
          styles: { font: "helvetica", fontSize: 8 },
          headStyles: { fillColor: [33, 37, 41], textColor: 255 },
          theme: "grid",
          margin: { left: 14, right: 14 },
        });
        cursorY = doc.lastAutoTable.finalY + 6;
      }

      // Areas table
      if (areas.length > 0) {
        if (cursorY > pageH - 50) { doc.addPage(); cursorY = 14; }
        doc.setFont("helvetica", "bold"); doc.setFontSize(11);
        doc.text("Obszary", 14, cursorY);
        autoTable(doc, {
          startY: cursorY + 2,
          head: [["ID", "Warstwa", "Status", "m^2", "Obwod [m]", "Grub [cm]", "Gest [t/m^3]", "Tonaz [t]", "Wezly"]],
          body: areas.map((a) => {
            const layer = getLayer(a.layer);
            return [
              a.area_id, layer.label, getStatus(a.status).label,
              a.area_m2.toFixed(2), a.perimeter_m.toFixed(2),
              (a.thickness_cm ?? layer.thickness_cm).toFixed(1),
              (a.density_t_m3 ?? layer.density_t_m3).toFixed(2),
              tonnageForArea(a).toFixed(2),
              a.points.length,
            ];
          }),
          styles: { font: "helvetica", fontSize: 8 },
          headStyles: { fillColor: [33, 37, 41], textColor: 255 },
          theme: "grid",
          margin: { left: 14, right: 14 },
        });
        cursorY = doc.lastAutoTable.finalY + 6;
      }

      if (lines.length > 0) {
        if (cursorY > pageH - 40) { doc.addPage(); cursorY = 14; }
        doc.setFont("helvetica", "bold"); doc.setFontSize(11);
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
        cursorY = doc.lastAutoTable.finalY + 6;
      }

      if (deliveries.length > 0) {
        if (cursorY > pageH - 40) { doc.addPage(); cursorY = 14; }
        doc.setFont("helvetica", "bold"); doc.setFontSize(11);
        doc.text("Dostawy (WZ)", 14, cursorY);
        autoTable(doc, {
          startY: cursorY + 2,
          head: [["Data", "Warstwa", "Tonaz [t]", "Zrodlo / WZ", "Notatka"]],
          body: deliveries.map((d) => [
            (d.created_at || "").slice(0, 19).replace("T", " "),
            getLayer(d.layer).label, d.tonnage_t.toFixed(2),
            d.source || "", d.note || "",
          ]),
          styles: { font: "helvetica", fontSize: 8 },
          headStyles: { fillColor: [64, 192, 87], textColor: 255 },
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
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid={WORKSPACE.exportDialog} className="rounded-sm border-[#DEE2E6]">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">Eksport projektu</DialogTitle>
          <DialogDescription>
            PDF zawiera snapshot planszy, podsumowanie tonażu per warstwa oraz tabele obszarów i dostaw.
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
              Pełne dane: obszary z tonażem, odcinki, dostawy WZ.
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
              Raport A4 ze snapshotem planszy + tonaż per warstwa + dostawy.
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
