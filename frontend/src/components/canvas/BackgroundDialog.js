import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Upload, Image as ImageIcon, FileText, Trash2, Eye, EyeOff, Ruler } from "lucide-react";
import { toast } from "sonner";
import { pdfFileToPngDataUrl, imageFileToDataUrl } from "@/lib/pdfRender";
import { WORKSPACE } from "@/constants/testIds";

export const BackgroundDialog = ({
  open,
  onOpenChange,
  background,
  onUpsert,
  onPatch,
  onRemove,
  onStartCalibration,
}) => {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const pickFile = () => fileRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      let result;
      if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
        toast.info("Renderowanie PDF...");
        result = await pdfFileToPngDataUrl(file);
      } else if (file.type.startsWith("image/")) {
        result = await imageFileToDataUrl(file);
      } else {
        toast.error("Nieobsługiwany format. Użyj PNG, JPG lub PDF.");
        return;
      }
      await onUpsert({
        data_url: result.dataUrl,
        original_filename: file.name,
        natural_width: result.width,
        natural_height: result.height,
        opacity: background?.opacity ?? 0.5,
        scale: background?.scale ?? 0.05,
        rotation: background?.rotation ?? 0.0,
        x: background?.x ?? 0,
        y: background?.y ?? 0,
        visible: true,
      });
      toast.success("Podkład załadowany");
    } catch (err) {
      console.error(err);
      toast.error("Błąd ładowania pliku");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const setField = async (patch) => {
    if (!background) return;
    await onPatch(patch);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid={WORKSPACE.backgroundDialog}
        className="rounded-sm border-[#DEE2E6] max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">Podkład planszy</DialogTitle>
          <DialogDescription>
            Dodaj plan lub szkic terenu (PNG / JPG / PDF). Renderowany pod siatką i obszarami.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,application/pdf,.pdf"
          onChange={handleFile}
          className="hidden"
          data-testid={WORKSPACE.backgroundFile}
        />

        {!background ? (
          <button
            onClick={pickFile}
            disabled={uploading}
            className="w-full border-2 border-dashed border-[#DEE2E6] rounded-sm p-8 text-center hover:border-[#E67700] hover:bg-[#FFF4E6] transition-all disabled:opacity-60"
          >
            <Upload className="w-8 h-8 mx-auto text-[#868E96] mb-2" />
            <div className="font-heading font-bold">
              {uploading ? "Ładowanie..." : "Wybierz plik PNG / JPG / PDF"}
            </div>
            <div className="text-xs text-[#868E96] mt-1">
              Pierwsza strona PDF zostanie wyrenderowana jako obraz.
            </div>
          </button>
        ) : (
          <div className="space-y-4">
            <div className="border border-[#DEE2E6] rounded-sm p-3 bg-[#F8F9FA] flex items-center gap-3">
              <div className="w-12 h-12 rounded-sm border border-[#DEE2E6] bg-white overflow-hidden flex items-center justify-center">
                {background.data_url ? (
                  <img src={background.data_url} alt="thumb" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-[#868E96]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-heading font-bold text-sm truncate flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-[#E67700] shrink-0" />
                  {background.original_filename || "podkład"}
                </div>
                <div className="font-mono-data text-[10px] text-[#868E96]">
                  {Math.round(background.natural_width)}×{Math.round(background.natural_height)} px
                </div>
              </div>
              <button
                onClick={pickFile}
                title="Zmień plik"
                className="p-2 rounded-sm hover:bg-white border border-transparent hover:border-[#DEE2E6]"
              >
                <Upload className="w-4 h-4 text-[#212529]" />
              </button>
            </div>

            <Field label={`Krycie: ${Math.round((background.opacity ?? 0.5) * 100)}%`}>
              <Slider
                data-testid={WORKSPACE.backgroundOpacity}
                value={[Math.round((background.opacity ?? 0.5) * 100)]}
                onValueChange={(v) => setField({ opacity: v[0] / 100 })}
                min={0}
                max={100}
                step={5}
              />
            </Field>

            <Field label={`Skala: ${(background.scale ?? 0.05).toFixed(4)} m/px (1 m = ${(1 / (background.scale || 0.05)).toFixed(1)} px)`}>
              <input
                data-testid={WORKSPACE.backgroundScale}
                type="number"
                step="0.0001"
                value={Number(background.scale ?? 0.05).toFixed(4)}
                onChange={(e) => setField({ scale: parseFloat(e.target.value) || 0.05 })}
                className="w-full px-2 py-1 border border-[#DEE2E6] rounded-sm text-xs font-mono-data"
              />
            </Field>

            <Field label={`Obrót: ${(background.rotation ?? 0).toFixed(1)}°`}>
              <Slider
                data-testid={WORKSPACE.backgroundRotation}
                value={[background.rotation ?? 0]}
                onValueChange={(v) => setField({ rotation: v[0] })}
                min={-180}
                max={180}
                step={0.5}
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <button
                data-testid={WORKSPACE.backgroundToggleVisible}
                onClick={() => setField({ visible: !background.visible })}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm border border-[#DEE2E6] hover:bg-[#F1F3F5] text-xs font-semibold"
              >
                {background.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {background.visible ? "Widoczny" : "Ukryty"}
              </button>
              <button
                data-testid={WORKSPACE.backgroundCalibrate}
                onClick={() => { onOpenChange(false); onStartCalibration(); }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm border border-[#E67700] bg-[#FFF4E6] hover:bg-[#FFEAB6] text-xs font-semibold text-[#D9480F]"
                title="Kliknij dwa punkty na planszy o znanej odległości"
              >
                <Ruler className="w-3.5 h-3.5" />
                Kalibruj (2 pkt)
              </button>
            </div>

            <button
              data-testid={WORKSPACE.backgroundRemove}
              onClick={async () => {
                if (!window.confirm("Usunąć podkład?")) return;
                await onRemove();
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm border border-[#FA5252] text-[#FA5252] hover:bg-[#FFE3E3] text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Usuń podkład
            </button>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-sm">
            Zamknij
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, children }) => (
  <div>
    <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#868E96] mb-1.5">
      {label}
    </div>
    {children}
  </div>
);
