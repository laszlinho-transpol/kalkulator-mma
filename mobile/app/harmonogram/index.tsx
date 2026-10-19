// ============================================================
// HARMONOGRAM – dziś i TK, tydzień (pn–nd), kalendarz miesiąca, plany dnia, wysyłka PDF
// ============================================================

import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppHeader, Etykieta, KalendarzZakresu, Karta, Naciskany, Przycisk, PrzyciskIkony, Sekcja, SiatkaKalendarza, Wybor,
  isoZDaty, stylFormularza, useMotyw, ODSTEP, PROMIEN, TYPOGRAFIA,
} from '../../src/components/ui';
import { SafeModal } from '../../src/components/common/SafeModal';
import { formatujDzienIso } from '../../src/components/common/KalendarzDnia';
import { wstecz } from '../../src/budzet/nawigacja';
import {
  KOLUMNY_HARMONOGRAMU, PELNY_ZESTAW, ZESTAW_SKROCONY, dniTygodnia, dokumentHarmonogramu, etykietaTygodnia,
  numerTygodnia, poczatekTygodnia, pozycjeHarmonogramu, przesunDni,
  type KolumnaHarmonogramu, type PozycjaHarmonogramu,
} from '../../src/harmonogram/harmonogram';
import { przerobRaportu, sumaPrzerobu } from '../../src/raportyBudowy/raporty';
import { udostepnijDokumentPdf } from '../../src/eksport/udostepnijPdf';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { useHarmonogramStore } from '../../src/stores/harmonogramStore';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useRaportyBudowyStore } from '../../src/stores/raportyBudowyStore';
import { formatLiczby } from '../../src/utils/calculations';
import { potwierdzAkcje } from '../../src/utils/dialog';

const wielkaLitera = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const krotkiDzien = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: '2-digit' });
};
const opisPozycji = (p: PozycjaHarmonogramu) => [p.obszar, p.warstwa, p.kilometraz].filter(Boolean).join(' · ');
const podsumowaniePozycji = (p: PozycjaHarmonogramu) => [
  `${formatLiczby(p.tony)} t`,
  p.powierzchniaM2 != null ? `${formatLiczby(p.powierzchniaM2)} m²` : '',
  p.auta != null ? `${p.auta} aut` : '',
].filter(Boolean).join(' · ');

/** Linia w tygodniu: plan prosty z kilkoma mieszankami w jednej linii, plan „Zaplanuj masę” (*) osobno. */
function liniePlanow(lista: PozycjaHarmonogramu[]): { klucz: string; tekst: string }[] {
  const linie: { klucz: string; tekst: string; budowa: string; czesci: string[] }[] = [];
  for (const p of lista) {
    const czesc = `${p.recepta} · ${formatLiczby(p.tony)} t`;
    const jest = p.wpisId ? linie.find((l) => l.klucz === p.wpisId) : undefined;
    if (jest) jest.czesci.push(czesc);
    else linie.push({ klucz: p.wpisId ?? p.klucz, tekst: p.rodzaj === 'plan' ? '* ' : '', budowa: p.budowa, czesci: [czesc] });
  }
  return linie.map((l) => ({ klucz: l.klucz, tekst: `${l.tekst}${l.czesci.join(' + ')} · ${l.budowa}` }));
}

export default function HarmonogramScreen() {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const dzis = isoZDaty(new Date());
  const { tk } = numerTygodnia(dzis);

  const wpisy = useHarmonogramStore((s) => s.wpisy);
  const usunWpis = useHarmonogramStore((s) => s.usun);
  const plany = usePlanyStore((s) => s.plany);
  const budowy = useBudowyStore((s) => s.budowy);
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const raporty = useRaportyBudowyStore((s) => s.raporty);

  const pozycje = useMemo(
    () => pozycjeHarmonogramu({ wpisy, plany, budowy, mieszanki }),
    [wpisy, plany, budowy, mieszanki],
  );
  const naDzien = useMemo(() => {
    const m = new Map<string, PozycjaHarmonogramu[]>();
    for (const p of pozycje) m.set(p.data, [...(m.get(p.data) ?? []), p]);
    return m;
  }, [pozycje]);
  const raportyDnia = useMemo(() => {
    const m = new Map<string, typeof raporty>();
    for (const r of raporty) m.set(r.data, [...(m.get(r.data) ?? []), r]);
    return m;
  }, [raporty]);

  const [tydzien, setTydzien] = useState(poczatekTygodnia(dzis));
  const [rok, setRok] = useState(Number(dzis.slice(0, 4)));
  const [miesiac, setMiesiac] = useState(Number(dzis.slice(5, 7)) - 1);
  const [wybrany, setWybrany] = useState(dzis);

  const [oknoPdf, setOknoPdf] = useState(false);
  const [pdfOd, setPdfOd] = useState(tydzien);
  const [pdfDo, setPdfDo] = useState(przesunDni(tydzien, 6));
  const [kolumny, setKolumny] = useState<KolumnaHarmonogramu[]>(PELNY_ZESTAW);

  const wybierzDzien = (iso: string) => {
    setWybrany(iso);
    setRok(Number(iso.slice(0, 4)));
    setMiesiac(Number(iso.slice(5, 7)) - 1);
  };
  const otworzPdf = () => {
    setPdfOd(tydzien);
    setPdfDo(przesunDni(tydzien, 6));
    setOknoPdf(true);
  };
  const przelaczKolumne = (k: KolumnaHarmonogramu) => setKolumny((obecne) => (
    obecne.includes(k) ? obecne.filter((x) => x !== k) : [...obecne, k]
  ));
  const wZakresiePdf = pozycje.filter((p) => p.data >= pdfOd && p.data <= pdfDo).length;
  const tenSamZestaw = (z: KolumnaHarmonogramu[]) => z.length === kolumny.length && z.every((k) => kolumny.includes(k));

  const kartaWpisu = (lista: PozycjaHarmonogramu[]) => {
    const p = lista[0];
    const recepty = lista.map((x) => x.recepta).join(', ');
    const suma = lista.reduce((s, x) => s + x.tony, 0);
    const usun = () => potwierdzAkcje('Usuń plan', `Usunąć plan ${recepty} (${formatLiczby(suma)} t)?`, () => {
      if (p.wpisId) void usunWpis(p.wpisId);
    });
    return (
      <Karta
        key={p.wpisId}
        tytul={p.budowa}
        podtytul={lista.map((x) => `${x.recepta}: ${formatLiczby(x.tony)} t`).join('\n')}
        podsumowanie={lista.length > 1 ? `Razem ${formatLiczby(suma)} t` : `${formatLiczby(suma)} t`}
        accessibilityLabel={`Plan ${recepty} ${p.data}`}
        akcje={[
          { tekst: 'Edytuj', accessibilityLabel: `Edytuj plan ${recepty}`, onPress: () => router.push(`/harmonogram/nowy?id=${p.wpisId}` as never) },
          { tekst: 'Usuń', rodzaj: 'niebezpieczna', accessibilityLabel: `Usuń plan ${recepty}`, onPress: usun },
        ]}
      />
    );
  };

  const kartyDnia = (lista: PozycjaHarmonogramu[]) => {
    const wpisy = new Map<string, PozycjaHarmonogramu[]>();
    for (const p of lista) if (p.wpisId) wpisy.set(p.wpisId, [...(wpisy.get(p.wpisId) ?? []), p]);
    const pokazane = new Set<string>();
    return lista.map((p) => {
      if (!p.wpisId) return kartaPozycji(p);
      if (pokazane.has(p.wpisId)) return null;
      pokazane.add(p.wpisId);
      return kartaWpisu(wpisy.get(p.wpisId) ?? [p]);
    });
  };

  const kartaPozycji = (p: PozycjaHarmonogramu) => {
    const usun = () => potwierdzAkcje('Usuń plan', `Usunąć plan ${p.recepta} (${formatLiczby(p.tony)} t)?`, () => {
      if (p.wpisId) void usunWpis(p.wpisId);
    });
    return (
      <Karta
        key={p.klucz}
        tytul={p.recepta}
        podtytul={[p.budowa, opisPozycji(p)].filter(Boolean).join('\n')}
        znaczek={p.rodzaj === 'plan'
          ? { tekst: p.zrealizowany ? 'Zrealizowany' : 'Zaplanuj masę *', kolor: p.zrealizowany ? theme.colors.textSecondary : theme.colors.info }
          : undefined}
        podsumowanie={podsumowaniePozycji(p)}
        accessibilityLabel={`Plan ${p.recepta} ${p.data}`}
        akcje={p.rodzaj === 'plan'
          ? [
            {
              tekst: p.zrealizowany ? 'Raport' : 'Wbudowywanie',
              rodzaj: 'glowna',
              onPress: () => router.push((p.zrealizowany ? `/archiwum/${p.planId}` : `/wbudowywanie/${p.planId}`) as never),
            },
            ...(p.zrealizowany ? [] : [{ tekst: 'Edytuj', onPress: () => router.push(`/plan/edytuj/${p.planId}` as never) }]),
          ]
          : [
            { tekst: 'Edytuj', accessibilityLabel: `Edytuj plan ${p.recepta}`, onPress: () => router.push(`/harmonogram/nowy?id=${p.wpisId}` as never) },
            { tekst: 'Usuń', rodzaj: 'niebezpieczna', accessibilityLabel: `Usuń plan ${p.recepta}`, onPress: usun },
          ]}
      />
    );
  };

  const minionyWybrany = wybrany < dzis;
  const planyWybranego = naDzien.get(wybrany) ?? [];
  const raportyWybranego = raportyDnia.get(wybrany) ?? [];

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul="Harmonogram"
        podtytul={`TK ${tk}`}
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/') }}
        prawy={{ tekst: 'Wyślij', onPress: otworzPdf, kolor: theme.colors.primary }}
      />
      <ScrollView contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.dzis, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>Dziś</Text>
            <Text style={[styles.dzisData, { color: theme.colors.text }]} accessibilityLabel={`Dziś ${dzis}`}>
              {wielkaLitera(formatujDzienIso(dzis))}
            </Text>
          </View>
          <View style={[styles.tk, { backgroundColor: theme.colors.primary }]} accessibilityLabel={`Tydzień kalendarzowy ${tk}`}>
            <Text style={styles.tkPodpis}>TK</Text>
            <Text style={styles.tkNumer}>{tk}</Text>
          </View>
        </View>

        <Sekcja
          tytul="Harmonogram tygodnia"
          info="Tydzień kalendarzowy od poniedziałku do niedzieli. Plany proste i plany z „Zaplanuj masę” (*) w jednym widoku."
        >
          <View style={[styles.okno, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.nawigacja}>
              <PrzyciskIkony ikona="wstecz" accessibilityLabel="Poprzedni tydzień" onPress={() => setTydzien(przesunDni(tydzien, -7))} kolor={theme.colors.text} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={[TYPOGRAFIA.sekcja, { color: theme.colors.text }]}>{etykietaTygodnia(tydzien)}</Text>
                {tydzien !== poczatekTygodnia(dzis) ? (
                  <Naciskany onPress={() => setTydzien(poczatekTygodnia(dzis))} accessibilityLabel="Bieżący tydzień">
                    <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 12 }}>Wróć do TK {tk}</Text>
                  </Naciskany>
                ) : null}
              </View>
              <PrzyciskIkony ikona="dalej" accessibilityLabel="Następny tydzień" onPress={() => setTydzien(przesunDni(tydzien, 7))} kolor={theme.colors.text} />
            </View>
            {dniTygodnia(tydzien).map((iso) => {
              const lista = naDzien.get(iso) ?? [];
              const suma = lista.reduce((s, p) => s + p.tony, 0);
              return (
                <Naciskany
                  key={iso}
                  onPress={() => wybierzDzien(iso)}
                  accessibilityLabel={`Dzień ${iso}`}
                  style={[
                    styles.dzien,
                    { borderTopColor: theme.colors.border },
                    iso === dzis && { backgroundColor: `${theme.colors.info}1A` },
                    iso === wybrany && { backgroundColor: `${theme.colors.primary}26` },
                  ]}
                >
                  <View style={styles.dzienNaglowek}>
                    <Text style={[styles.dzienNazwa, { color: iso < dzis ? theme.colors.textSecondary : theme.colors.text }]}>
                      {krotkiDzien(iso)}{iso === dzis ? ' · dziś' : ''}
                    </Text>
                    {lista.length ? <Text style={[TYPOGRAFIA.podsumowanie, { color: theme.colors.text }]}>{formatLiczby(suma)} t</Text> : null}
                  </View>
                  {lista.length === 0 ? (
                    <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>—</Text>
                  ) : liniePlanow(lista).map((l) => (
                    <Text key={l.klucz} style={[TYPOGRAFIA.opis, { color: theme.colors.text }]} numberOfLines={3}>
                      {l.tekst}
                    </Text>
                  ))}
                </Naciskany>
              );
            })}
          </View>
        </Sekcja>

        <Sekcja
          tytul="Kalendarz"
          info="Minione dni są szare; dzień z raportem dziennym jest zielony i można go otworzyć. Dziś i kolejne dni: wybierz dzień, aby zobaczyć plany i dodać nowy."
        >
          <View style={[styles.okno, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, padding: ODSTEP.m }]}>
            <SiatkaKalendarza
              rok={rok}
              miesiac={miesiac}
              onZmienMiesiac={(r, m) => { setRok(r); setMiesiac(m); }}
              stanDnia={(iso) => (iso < dzis
                ? { oznaczony: raportyDnia.has(iso), nieaktywny: !raportyDnia.has(iso), wybrany: iso === wybrany && raportyDnia.has(iso) }
                : { wybrany: iso === wybrany, zaplanowany: naDzien.has(iso) })}
              onWybierz={(iso) => { setWybrany(iso); setTydzien(poczatekTygodnia(iso)); }}
              legendaOznaczonych="raport dzienny"
              legendaZaplanowanych="plan"
              legendaNieaktywnych="minione"
            />
          </View>
        </Sekcja>

        <Sekcja tytul={wielkaLitera(formatujDzienIso(wybrany))}>
          <View style={{ gap: ODSTEP.m }}>
            {minionyWybrany ? (
              raportyWybranego.length === 0 ? (
                <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>Brak raportu dziennego z tego dnia.</Text>
              ) : raportyWybranego.map((r) => {
                const b = budowy.find((x) => x.id === r.budowaId);
                const przerob = przerobRaportu(r);
                const suma = sumaPrzerobu(przerob);
                return (
                  <Karta
                    key={r.id}
                    tytul={b ? `${b.kodBudowy} · ${b.nazwaInwestycji}` : 'Budowa usunięta'}
                    podtytul={przerob.length ? przerob.map((w) => `${w.mieszankaNazwa ?? w.warstwaNazwa}: ${formatLiczby(w.ilosc)} t`).join(' · ') : 'Bez warstw'}
                    znaczek={{ tekst: 'Raport dzienny', kolor: theme.colors.success }}
                    podsumowanie={`${formatLiczby(suma.ilosc)} t · ${formatLiczby(suma.powierzchniaM2)} m²`}
                    accessibilityLabel={`Raport ${b?.kodBudowy ?? ''} ${r.data}`}
                    onPress={() => router.push(`/raport-budowy/${r.id}` as never)}
                  />
                );
              })
            ) : (
              <>
                {planyWybranego.length === 0 ? (
                  <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>Na ten dzień nie ma planu.</Text>
                ) : kartyDnia(planyWybranego)}
                <Przycisk
                  tekst="Dodaj plan"
                  ikona="plus"
                  accessibilityLabel={`Dodaj plan na ${wybrany}`}
                  onPress={() => router.push(`/harmonogram/nowy?data=${wybrany}` as never)}
                />
              </>
            )}
            {minionyWybrany && planyWybranego.length > 0 ? (
              <>
                <Text style={[TYPOGRAFIA.sekcja, { color: theme.colors.textSecondary }]}>Plan z tego dnia</Text>
                {kartyDnia(planyWybranego)}
              </>
            ) : null}
          </View>
        </Sekcja>
      </ScrollView>

      <SafeModal
        visible={oknoPdf}
        tytul="Wyślij harmonogram"
        theme={theme}
        onClose={() => setOknoPdf(false)}
      >
        <ScrollView contentContainerStyle={stylFormularza.tresc}>
          <View>
            <Etykieta tekst="Zakres dat" />
            <KalendarzZakresu od={pdfOd} doDnia={pdfDo} onZatwierdz={(od, d) => { setPdfOd(od); setPdfDo(d); }} />
            <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary, marginTop: ODSTEP.xs }]}>
              Pozycji w zakresie: {wZakresiePdf}
            </Text>
          </View>
          <View>
            <Etykieta tekst="Gotowe zestawy" />
            <View style={stylFormularza.chipy}>
              <Wybor zaznaczony={tenSamZestaw(PELNY_ZESTAW)} etykieta="Pełny zestaw" onPress={() => setKolumny(PELNY_ZESTAW)} />
              <Wybor zaznaczony={tenSamZestaw(ZESTAW_SKROCONY)} etykieta="Data, recepta, ilość" onPress={() => setKolumny(ZESTAW_SKROCONY)} />
            </View>
          </View>
          <View>
            <Etykieta tekst="Zawartość" info="Data jest zawsze w pierwszej kolumnie. Obszar, powierzchnia, kilometraż, warstwa i liczba aut pochodzą z planów „Zaplanuj masę” (*)." />
            <View style={{ gap: ODSTEP.xs }}>
              {KOLUMNY_HARMONOGRAMU.map((k) => {
                const zaznaczony = kolumny.includes(k.id);
                return (
                  <Naciskany
                    key={k.id}
                    onPress={() => przelaczKolumne(k.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: zaznaczony }}
                    accessibilityLabel={`Kolumna ${k.nazwa}`}
                    style={[styles.ptaszek, { borderColor: zaznaczony ? theme.colors.primary : theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
                  >
                    <View style={[styles.kwadrat, { borderColor: zaznaczony ? theme.colors.primary : theme.colors.textSecondary, backgroundColor: zaznaczony ? theme.colors.primary : 'transparent' }]}>
                      {zaznaczony ? <Text style={styles.znak}>✓</Text> : null}
                    </View>
                    <Text style={[TYPOGRAFIA.wartosc, { color: theme.colors.text }]}>{k.nazwa}</Text>
                  </Naciskany>
                );
              })}
            </View>
          </View>
          <Przycisk
            tekst="Eksportuj PDF"
            ikona="udostepnij"
            disabled={kolumny.length === 0}
            onPress={() => {
              setOknoPdf(false);
              void udostepnijDokumentPdf(dokumentHarmonogramu({ pozycje, od: pdfOd, doDnia: pdfDo, kolumny }));
            }}
          />
        </ScrollView>
      </SafeModal>
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  tresc: { padding: ODSTEP.l, gap: ODSTEP.l },
  dzis: { flexDirection: 'row', alignItems: 'center', gap: ODSTEP.m, borderWidth: 1, borderRadius: PROMIEN.l, padding: ODSTEP.m + 2 },
  dzisData: { fontSize: 18, fontWeight: '800' },
  tk: { borderRadius: PROMIEN.m, paddingHorizontal: ODSTEP.m, paddingVertical: ODSTEP.s, alignItems: 'center', minWidth: 64 },
  tkPodpis: { color: '#1A1A1A', fontSize: 11, fontWeight: '800' },
  tkNumer: { color: '#1A1A1A', fontSize: 24, fontWeight: '900' },
  okno: { borderWidth: 1, borderRadius: PROMIEN.l, overflow: 'hidden' },
  nawigacja: { flexDirection: 'row', alignItems: 'center', padding: ODSTEP.s },
  dzien: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: ODSTEP.s, paddingHorizontal: ODSTEP.m, gap: 2 },
  dzienNaglowek: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dzienNazwa: { fontWeight: '800', fontSize: 14, textTransform: 'capitalize' },
  ptaszek: { flexDirection: 'row', alignItems: 'center', gap: ODSTEP.m, borderWidth: 1, borderRadius: PROMIEN.m, paddingVertical: ODSTEP.s + 2, paddingHorizontal: ODSTEP.m },
  kwadrat: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  znak: { color: '#1A1A1A', fontWeight: '900', fontSize: 14 },
});
