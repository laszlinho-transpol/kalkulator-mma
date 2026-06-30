// ============================================================
// MODAL FIGUR – wybór kształtu + formularz wymiarów
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { SafeModal } from '../common/SafeModal';
import { lightTheme, darkTheme } from '../../constants/theme';
import { NumericInput } from '../common/NumericInput';
import { obliczPowierzchniFigury } from '../../utils/calculations';
import { formatujPikietaz } from '../../utils/chainage';
import type { Figura, TypFigury } from '../../types';

const FIGURY_INFO: Array<{ typ: TypFigury; etykieta: string; ikona: string; opis: string }> = [
  {
    typ: 'prostokat',
    etykieta: 'Prostokąt',
    ikona: '▬',
    opis: 'Typowy odcinek drogi o stałej szerokości. Wzór: szerokość × długość',
  },
  {
    typ: 'trapez',
    etykieta: 'Trapez',
    ikona: '⏢',
    opis: 'Odcinek o zmiennej szerokości (np. poszerzenie). Wzór: ((szer1+szer2)/2) × długość',
  },
  {
    typ: 'trojkat',
    etykieta: 'Trójkąt',
    ikona: '▲',
    opis: 'Trójkątne pole (np. zakończenie klina). Wzór: (szerokość × długość) / 2',
  },
  {
    typ: 'pierscien',
    etykieta: 'Pierścień kołowy',
    ikona: '◎',
    opis: 'Rondo lub łuk kołowy. Wzór: szerokość × (dł_zewn + dł_wewn) / 2',
  },
  {
    typ: 'wjazd',
    etykieta: 'Wjazd',
    ikona: '⤵',
    opis: 'Wjazd z promieniami. Wzór: (L × s) + (R1² + R2²) × 0,2146',
  },
];

// Stan formularzy – osobne pola dla każdej figury
type FormProstokat = { szerokosc: string; dlugosc: string };
type FormTrapez = { szerokosc1: string; szerokosc2: string; dlugosc: string };
type FormTrojkat = { szerokosc: string; dlugosc: string };
type FormPierscien = { szerokosc: string; dlugoscZewnetrzna: string; dlugoscWewnetrzna: string };
type FormWjazd = { L: string; s: string; R1: string; R2: string };

const PUSTE: {
  prostokat: FormProstokat;
  trapez: FormTrapez;
  trojkat: FormTrojkat;
  pierscien: FormPierscien;
  wjazd: FormWjazd;
} = {
  prostokat: { szerokosc: '', dlugosc: '' },
  trapez: { szerokosc1: '', szerokosc2: '', dlugosc: '' },
  trojkat: { szerokosc: '', dlugosc: '' },
  pierscien: { szerokosc: '', dlugoscZewnetrzna: '', dlugoscWewnetrzna: '' },
  wjazd: { L: '', s: '', R1: '', R2: '' },
};

const p = (s: string) => parseFloat(s.replace(',', '.')) || 0;

function generujId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

interface ShapeModalProps {
  visible: boolean;
  numeracja: number;
  kilometrazPoczatkowy: number; // w metrach bieżących
  onDodaj: (figura: Figura) => void;
  onClose: () => void;
  /** Edycja istniejącej figury – ten sam modal, przycisk Zapisz */
  figuraEdytowana?: Figura | null;
  onZapisz?: (figura: Figura) => void;
}

function wczytajFormZFigury(figura: Figura) {
  const fmt = (n: number) => String(n).replace('.', ',');
  switch (figura.typ) {
    case 'prostokat':
      return { typ: figura.typ as TypFigury, prostokat: { szerokosc: fmt(figura.szerokosc), dlugosc: fmt(figura.dlugosc) } };
    case 'trapez':
      return { typ: figura.typ, trapez: { szerokosc1: fmt(figura.szerokosc1), szerokosc2: fmt(figura.szerokosc2), dlugosc: fmt(figura.dlugosc) } };
    case 'trojkat':
      return { typ: figura.typ, trojkat: { szerokosc: fmt(figura.szerokosc), dlugosc: fmt(figura.dlugosc) } };
    case 'pierscien':
      return { typ: figura.typ, pierscien: { szerokosc: fmt(figura.szerokosc), dlugoscZewnetrzna: fmt(figura.dlugoscZewnetrzna), dlugoscWewnetrzna: fmt(figura.dlugoscWewnetrzna) } };
    case 'wjazd':
      return { typ: figura.typ, wjazd: { L: fmt(figura.L), s: fmt(figura.s), R1: fmt(figura.R1 ?? 0), R2: fmt(figura.R2 ?? 0) } };
    default:
      return null;
  }
}

export function ShapeModal({
  visible, numeracja, kilometrazPoczatkowy, onDodaj, onClose,
  figuraEdytowana, onZapisz,
}: ShapeModalProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const [selectedTyp, setSelectedTyp] = useState<TypFigury | null>(null);
  const [prostokat, setProstokat] = useState<FormProstokat>(PUSTE.prostokat);
  const [trapez, setTrapez] = useState<FormTrapez>(PUSTE.trapez);
  const [trojkat, setTrojkat] = useState<FormTrojkat>(PUSTE.trojkat);
  const [pierscien, setPierscien] = useState<FormPierscien>(PUSTE.pierscien);
  const [wjazd, setWjazd] = useState<FormWjazd>(PUSTE.wjazd);
  const [blad, setBlad] = useState('');
  const trybEdycji = !!figuraEdytowana;

  useEffect(() => {
    if (!visible || !figuraEdytowana) return;
    const dane = wczytajFormZFigury(figuraEdytowana);
    if (!dane) return;
    setSelectedTyp(dane.typ);
    if (dane.prostokat) setProstokat(dane.prostokat);
    if (dane.trapez) setTrapez(dane.trapez);
    if (dane.trojkat) setTrojkat(dane.trojkat);
    if (dane.pierscien) setPierscien(dane.pierscien);
    if (dane.wjazd) setWjazd(dane.wjazd);
    setBlad('');
  }, [visible, figuraEdytowana]);

  const resetujForm = () => {
    setSelectedTyp(null);
    setProstokat(PUSTE.prostokat);
    setTrapez(PUSTE.trapez);
    setTrojkat(PUSTE.trojkat);
    setPierscien(PUSTE.pierscien);
    setWjazd(PUSTE.wjazd);
    setBlad('');
  };

  const zamknij = () => {
    resetujForm();
    onClose();
  };

  const podgladPowierzchni = (): number | null => {
    if (!selectedTyp) return null;
    try {
      const figura = zbudujFigure(selectedTyp);
      if (!figura) return null;
      return obliczPowierzchniFigury(figura as unknown as Figura);
    } catch {
      return null;
    }
  };

  const zbudujFigure = (typ: TypFigury): Record<string, unknown> | null => {
    const base = { kilometrazPoczatkowy };
    switch (typ) {
      case 'prostokat': {
        const s = p(prostokat.szerokosc);
        const d = p(prostokat.dlugosc);
        if (!s || !d) return null;
        return { ...base, typ, szerokosc: s, dlugosc: d };
      }
      case 'trapez': {
        const s1 = p(trapez.szerokosc1);
        const s2 = p(trapez.szerokosc2);
        const d = p(trapez.dlugosc);
        if (!s1 || !s2 || !d) return null;
        return { ...base, typ, szerokosc1: s1, szerokosc2: s2, dlugosc: d };
      }
      case 'trojkat': {
        const s = p(trojkat.szerokosc);
        const d = p(trojkat.dlugosc);
        if (!s || !d) return null;
        return { ...base, typ, szerokosc: s, dlugosc: d };
      }
      case 'pierscien': {
        const s = p(pierscien.szerokosc);
        const dz = p(pierscien.dlugoscZewnetrzna);
        const dw = p(pierscien.dlugoscWewnetrzna);
        if (!s || !dz || !dw) return null;
        return { ...base, typ, szerokosc: s, dlugoscZewnetrzna: dz, dlugoscWewnetrzna: dw };
      }
      case 'wjazd': {
        const L = p(wjazd.L);
        const s = p(wjazd.s);
        const R1 = p(wjazd.R1);
        const R2 = p(wjazd.R2);
        if (!L || !s) return null;
        return { ...base, typ, L, s, R1, R2 };
      }
      default: return null;
    }
  };

  const dodaj = () => {
    if (!selectedTyp) {
      setBlad('Wybierz typ figury.');
      return;
    }
    const figura = zbudujFigure(selectedTyp);
    if (!figura) {
      setBlad('Wypełnij wszystkie wymagane wymiary (wartości > 0).');
      return;
    }
    if (trybEdycji && figuraEdytowana && onZapisz) {
      const zaktualizowana = {
        ...figura,
        id: figuraEdytowana.id,
        numeracja: figuraEdytowana.numeracja,
      } as unknown as Figura;
      onZapisz(zaktualizowana);
      resetujForm();
      onClose();
      return;
    }
    const pełnaFigura = {
      ...figura,
      id: generujId(),
      numeracja,
    } as unknown as Figura;
    onDodaj(pełnaFigura);
    resetujForm();
    onClose();
  };

  const powierzchnia = podgladPowierzchni();
  const info = FIGURY_INFO.find((f) => f.typ === selectedTyp);

  return (
    <SafeModal
      visible={visible}
      tytul={trybEdycji ? `Edytuj figurę #${numeracja}` : `Figura #${numeracja}`}
      theme={theme}
      onClose={zamknij}
      lewy={{ tekst: selectedTyp && !trybEdycji ? '‹ Zmień' : 'Anuluj', onPress: selectedTyp && !trybEdycji ? () => setSelectedTyp(null) : zamknij, kolor: theme.colors.danger }}
      prawy={selectedTyp ? { tekst: trybEdycji ? 'Zapisz' : 'Dodaj', onPress: dodaj, kolor: theme.colors.primary } : undefined}
    >
      <ScrollView contentContainerStyle={styles.zawartosc} keyboardShouldPersistTaps="handled">
            {/* KROK 1: Wybór kształtu (tylko nowa figura) */}
            {!selectedTyp && !trybEdycji && (
              <>
                <Text style={[styles.sekcjaTytul, { color: theme.colors.textSecondary }]}>
                  Wybierz kształt figury
                </Text>
                <Text style={[styles.pikietazInfo, { color: theme.colors.info }]}>
                  Pikietaż początkowy: {formatujPikietaz(kilometrazPoczatkowy)}
                </Text>
                <View style={styles.siatkaTypy}>
                  {FIGURY_INFO.map((f) => (
                    <TouchableOpacity
                      key={f.typ}
                      style={[styles.kafelekTypu, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                      onPress={() => { setBlad(''); setSelectedTyp(f.typ); }}
                    >
                      <Text style={styles.ikonaTypu}>{f.ikona}</Text>
                      <Text style={[styles.etykietaTypu, { color: theme.colors.text }]}>{f.etykieta}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* KROK 2: Formularz wybranego kształtu */}
            {selectedTyp && (
              <>
                <View style={[styles.typBadge, { backgroundColor: `${theme.colors.primary}20` }]}>
                  <Text style={styles.typBadgeIkona}>{info?.ikona}</Text>
                  <View>
                    <Text style={[styles.typBadgeTytul, { color: theme.colors.text }]}>{info?.etykieta}</Text>
                    <Text style={[styles.typBadgeOpis, { color: theme.colors.textSecondary }]}>{info?.opis}</Text>
                  </View>
                </View>

                {selectedTyp === 'prostokat' && (
                  <>
                    <NumericInput label="Szerokość" value={prostokat.szerokosc} onChangeText={(v) => setProstokat((f) => ({ ...f, szerokosc: v }))} unit="m" required tooltip="Szerokość układanego pasa. Wymiar poprzeczny do osi drogi." />
                    <NumericInput label="Długość" value={prostokat.dlugosc} onChangeText={(v) => setProstokat((f) => ({ ...f, dlugosc: v }))} unit="m" required tooltip="Długość odcinka wzdłuż osi drogi." />
                  </>
                )}

                {selectedTyp === 'trapez' && (
                  <>
                    <NumericInput label="Szerokość 1 (początek)" value={trapez.szerokosc1} onChangeText={(v) => setTrapez((f) => ({ ...f, szerokosc1: v }))} unit="m" required tooltip="Szerokość na początku odcinka." />
                    <NumericInput label="Szerokość 2 (koniec)" value={trapez.szerokosc2} onChangeText={(v) => setTrapez((f) => ({ ...f, szerokosc2: v }))} unit="m" required tooltip="Szerokość na końcu odcinka." />
                    <NumericInput label="Długość" value={trapez.dlugosc} onChangeText={(v) => setTrapez((f) => ({ ...f, dlugosc: v }))} unit="m" required tooltip="Długość odcinka wzdłuż osi drogi." />
                  </>
                )}

                {selectedTyp === 'trojkat' && (
                  <>
                    <NumericInput label="Szerokość (podstawa)" value={trojkat.szerokosc} onChangeText={(v) => setTrojkat((f) => ({ ...f, szerokosc: v }))} unit="m" required tooltip="Szerokość podstawy trójkąta." />
                    <NumericInput label="Długość (wysokość)" value={trojkat.dlugosc} onChangeText={(v) => setTrojkat((f) => ({ ...f, dlugosc: v }))} unit="m" required tooltip="Długość trójkąta wzdłuż osi drogi." />
                  </>
                )}

                {selectedTyp === 'pierscien' && (
                  <>
                    <NumericInput label="Szerokość pasa" value={pierscien.szerokosc} onChangeText={(v) => setPierscien((f) => ({ ...f, szerokosc: v }))} unit="m" required tooltip="Szerokość pasa jezdni na łuku / rondzie." />
                    <NumericInput label="Długość zewnętrzna" value={pierscien.dlugoscZewnetrzna} onChangeText={(v) => setPierscien((f) => ({ ...f, dlugoscZewnetrzna: v }))} unit="m" required tooltip="Długość zewnętrznej krawędzi łuku." />
                    <NumericInput label="Długość wewnętrzna" value={pierscien.dlugoscWewnetrzna} onChangeText={(v) => setPierscien((f) => ({ ...f, dlugoscWewnetrzna: v }))} unit="m" required tooltip="Długość wewnętrznej krawędzi łuku." />
                  </>
                )}

                {selectedTyp === 'wjazd' && (
                  <>
                    <NumericInput label="L – długość wjazdu" value={wjazd.L} onChangeText={(v) => setWjazd((f) => ({ ...f, L: v }))} unit="m" required tooltip="Długość prostego odcinka wjazdu." />
                    <NumericInput label="s – szerokość wjazdu" value={wjazd.s} onChangeText={(v) => setWjazd((f) => ({ ...f, s: v }))} unit="m" required tooltip="Szerokość wjazdu." />
                    <NumericInput label="R1 – promień 1" value={wjazd.R1} onChangeText={(v) => setWjazd((f) => ({ ...f, R1: v }))} unit="m" tooltip="Promień łuku przy pierwszym rogu wjazdu (0 jeśli brak)." />
                    <NumericInput label="R2 – promień 2" value={wjazd.R2} onChangeText={(v) => setWjazd((f) => ({ ...f, R2: v }))} unit="m" tooltip="Promień łuku przy drugim rogu wjazdu (0 jeśli brak)." />
                  </>
                )}

                {/* Podgląd powierzchni */}
                {powierzchnia !== null && powierzchnia > 0 && (
                  <View style={[styles.podglad, { backgroundColor: `${theme.colors.success}15`, borderColor: theme.colors.success }]}>
                    <Text style={[styles.podgladTekst, { color: theme.colors.success }]}>
                      Powierzchnia: {powierzchnia.toFixed(2).replace('.', ',')} m²
                    </Text>
                  </View>
                )}

                {blad ? (
                  <Text style={[styles.blad, { color: theme.colors.danger }]}>{blad}</Text>
                ) : null}
              </>
            )}
          </ScrollView>
    </SafeModal>
  );
}

const styles = StyleSheet.create({
  zawartosc: { padding: 20, gap: 4 },
  sekcjaTytul: { fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  pikietazInfo: { fontSize: 13, marginBottom: 16 },
  siatkaTypy: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kafelekTypu: {
    width: '30%',
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  ikonaTypu: { fontSize: 30 },
  etykietaTypu: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  typBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  typBadgeIkona: { fontSize: 32 },
  typBadgeTytul: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  typBadgeOpis: { fontSize: 13, lineHeight: 18 },
  podglad: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  podgladTekst: { fontSize: 16, fontWeight: '700' },
  blad: { fontSize: 14, marginTop: 8 },
});
