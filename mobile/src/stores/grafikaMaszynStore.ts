import { create } from 'zustand';
import { DOMYSLNA_GRAFIKA, type GrafikaMaszyn, type WygladMaszyny } from '../utils/grafikaMaszyn';
import { pobierzUstawienia, zapiszUstawienia } from '../utils/ustawieniaAplikacji';

interface Stan {
  grafika: GrafikaMaszyn;
  zaladuj: () => Promise<void>;
  ustawWyglad: (wyglad: WygladMaszyny) => Promise<void>;
  ustawSvg: (rodzaj: 'rozkladarka' | 'auto', xml: string | null) => Promise<void>;
}

async function zapisz(grafika: GrafikaMaszyn) {
  await zapiszUstawienia({ grafikaMaszyn: grafika });
}

export const useGrafikaMaszynStore = create<Stan>((set, get) => ({
  grafika: DOMYSLNA_GRAFIKA,

  zaladuj: async () => {
    const u = await pobierzUstawienia();
    set({ grafika: u.grafikaMaszyn });
  },

  ustawWyglad: async (wyglad) => {
    const grafika: GrafikaMaszyn = { wyglad, svgRozkladarki: null, svgAuta: null };
    set({ grafika });
    await zapisz(grafika);
  },

  ustawSvg: async (rodzaj, xml) => {
    const prev = get().grafika;
    const grafika: GrafikaMaszyn = {
      ...prev,
      svgRozkladarki: rodzaj === 'rozkladarka' ? xml : prev.svgRozkladarki,
      svgAuta: rodzaj === 'auto' ? xml : prev.svgAuta,
    };
    set({ grafika });
    await zapisz(grafika);
  },
}));
