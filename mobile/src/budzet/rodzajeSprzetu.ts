// Rodzaje sprzętu w budżecie. Walec stalowy jest w dwóch grupach, ale to jeden rodzaj.

export interface RodzajSprzetu {
  id: string;
  nazwa: string;
}

export interface GrupaSprzetu {
  id: string;
  nazwa: string;
  rodzaje: RodzajSprzetu[];
}

export const GRUPY_SPRZETU: GrupaSprzetu[] = [
  {
    id: 'bitumiczne',
    nazwa: 'Roboty bitumiczne',
    rodzaje: [
      { id: 'rozkladarka', nazwa: 'Rozkładarka' },
      { id: 'walec-stalowy', nazwa: 'Walec stalowy' },
      { id: 'skrapiarka', nazwa: 'Skrapiarka' },
    ],
  },
  {
    id: 'ziemne',
    nazwa: 'Roboty ziemne',
    rodzaje: [
      { id: 'walec-stalowy', nazwa: 'Walec stalowy' },
      { id: 'walec-gumowy', nazwa: 'Walec gumowy' },
      { id: 'koparka-kolowa', nazwa: 'Koparka kołowa' },
      { id: 'koparka-gasiennicowa', nazwa: 'Koparka gąsiennicowa' },
      { id: 'ladowarka', nazwa: 'Ładowarka' },
      { id: 'koparko-ladowarka', nazwa: 'Koparko-ładowarka' },
      { id: 'boczniak', nazwa: 'Boczniak' },
    ],
  },
  {
    id: 'inne',
    nazwa: 'Inne',
    rodzaje: [
      { id: 'niskopodwozie', nazwa: 'Niskopodwozie' },
      { id: 'beczka', nazwa: 'Beczka' },
      { id: 'frezarka', nazwa: 'Frezarka' },
      { id: 'wozidlo', nazwa: 'Wozidło' },
    ],
  },
  {
    id: 'drobny',
    nazwa: 'Sprzęt drobny',
    rodzaje: [
      { id: 'zageszczarka', nazwa: 'Zagęszczarka' },
      { id: 'agregat', nazwa: 'Agregat' },
      { id: 'sprezarka', nazwa: 'Sprężarka' },
    ],
  },
];

export function wszystkieRodzaje(): RodzajSprzetu[] {
  const mapa = new Map<string, RodzajSprzetu>();
  for (const grupa of GRUPY_SPRZETU) {
    for (const rodzaj of grupa.rodzaje) mapa.set(rodzaj.id, rodzaj);
  }
  return [...mapa.values()];
}

export function rodzajPoId(id: string): RodzajSprzetu | undefined {
  return wszystkieRodzaje().find((r) => r.id === id);
}
