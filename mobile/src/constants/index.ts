// ============================================================
// STAŁE APLIKACJI – KALKULATOR MMA
// ============================================================

export const DOMYSLNY_TONAZ_AUTA = 25.5; // [t]

export const KOLORY = {
  // Akcenty
  akcentGlowny: '#E8A020',      // pomarańczowo-żółty (asfalt)
  akcentDrugorzedny: '#2E86AB', // niebieski

  // Light mode
  tloJasne: '#F5F5F5',
  kartaJasna: '#FFFFFF',
  tekstJasny: '#1A1A1A',
  tekstDrugorzednyJasny: '#6B7280',
  obramowanieJasne: '#E5E7EB',

  // Dark mode
  tloCiemne: '#0F0F1A',
  kartaCiemna: '#1E1E2E',
  tekstCiemny: '#F0F0F0',
  tekstDrugorzednyCiemny: '#9CA3AF',
  obramowanieCiemne: '#374151',

  // Stany
  sukces: '#22C55E',
  blad: '#EF4444',
  ostrzezenie: '#F59E0B',
  info: '#3B82F6',

  // Specyficzne dla kontroli
  oszczednosc: '#22C55E',
  przepal: '#EF4444',
} as const;

export const NAZWY_FIGUR: Record<string, string> = {
  prostokat: 'Prostokąt',
  trapez: 'Trapez',
  trojkat: 'Trójkąt',
  pierscien: 'Pierścień kołowy',
  wjazd: 'Wjazd',
};

export const IKONY_FIGUR: Record<string, string> = {
  prostokat: '▬',
  trapez: '⬡',
  trojkat: '▲',
  pierscien: '◎',
  wjazd: '⤵',
};

export const FORMAT_KILOMETRAZU = (km: number, m: number): string => {
  const mStr = String(m).padStart(3, '0');
  return `${km}+${mStr}`;
};

/** Przelicza pikietaż [km, m] na metry bieżące */
export const DO_METROW_BIEZACYCH = (km: number, m: number): number =>
  km * 1000 + m;

/** Przelicza metry bieżące na pikietaż [km, m] */
export const Z_METROW_BIEZACYCH = (metry: number): { km: number; m: number } => ({
  km: Math.floor(metry / 1000),
  m: metry % 1000,
});
