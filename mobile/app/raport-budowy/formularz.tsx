import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppHeader, Etykieta, KalendarzDnia, Pole, Przycisk, PrzyciskIkony, Wiersz, Wybor, WierszDanych,
  stylFormularza, useMotyw, ODSTEP, PROMIEN, TYPOGRAFIA,
} from '../../src/components/ui';
import { PoleKilometraz, parsujPolaKilometraza, polaZKilometraza } from '../../src/components/common/PoleKilometraz';
import { wstecz } from '../../src/budzet/nawigacja';
import { parsujLiczbePola } from '../../src/budzet/rozliczenie';
import { dataKrotko } from '../../src/budzet/wyswietlanie';
import {
  gestoscPozycji, gruboscZMasy, nazwaIlosci, nazwaRecepty, warstwyBudowy, type OpcjaOdcinka, type OpcjaWarstwy,
} from '../../src/raportyBudowy/raporty';
import type { PozycjaRaportu, RaportDzienny } from '../../src/raportyBudowy/typy';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { generujIdRaportu, useRaportyBudowyStore } from '../../src/stores/raportyBudowyStore';
import { Z_METROW_BIEZACYCH } from '../../src/constants';
import { formatLiczby } from '../../src/utils/calculations';
import { dzisIso } from '../../src/utils/zakresDat';

interface OdcinekSzkic {
  id: string;
  odcinekKlucz: string;
  odKm: string;
  odM: string;
  doKm: string;
  doM: string;
  m2: string;
}

interface PozycjaSzkic {
  id: string;
  warstwaKlucz: string;
  mieszankaId?: string;
  ilosc: string;
  odcinki: OdcinekSzkic[];
}

const kluczOdcinka = (o: Pick<OpcjaOdcinka, 'legendaId' | 'wyjatekId'>) => `${o.legendaId}|${o.wyjatekId ?? ''}`;
const liczbaTekst = (n: number) => (n ? String(n).replace('.', ',') : '');

function polaKm(metry?: number) {
  if (metry == null) return { km: '', m: '' };
  const { km, m } = Z_METROW_BIEZACYCH(Math.round(metry));
  return polaZKilometraza(km, m);
}

const pustyOdcinek = (): OdcinekSzkic => ({ id: generujIdRaportu(), odcinekKlucz: '', odKm: '', odM: '', doKm: '', doM: '', m2: '' });
const pustaPozycja = (): PozycjaSzkic => ({ id: generujIdRaportu(), warstwaKlucz: '', ilosc: '', odcinki: [pustyOdcinek()] });

function szkicZRaportu(r: RaportDzienny): PozycjaSzkic[] {
  return r.pozycje.map((p) => ({
    id: p.id,
    warstwaKlucz: p.warstwaKlucz,
    mieszankaId: p.mieszankaId,
    ilosc: liczbaTekst(p.ilosc),
    odcinki: p.odcinki.map((o) => {
      const od = polaKm(o.kmOdM);
      const dos = polaKm(o.kmDoM);
      return { id: o.id, odcinekKlucz: kluczOdcinka(o), odKm: od.km, odM: od.m, doKm: dos.km, doM: dos.m, m2: liczbaTekst(o.powierzchniaM2) };
    }),
  }));
}

/** Warstwy z konstrukcji + te z edytowanego raportu, których w konstrukcjach już nie ma. */
function opcjeZRaportem(opcje: OpcjaWarstwy[], raport?: RaportDzienny): OpcjaWarstwy[] {
  if (!raport) return opcje;
  const wynik = opcje.map((o) => ({ ...o, odcinki: [...o.odcinki] }));
  for (const p of raport.pozycje) {
    let o = wynik.find((x) => x.klucz === p.warstwaKlucz);
    if (!o) {
      o = {
        klucz: p.warstwaKlucz, nazwa: p.warstwaNazwa, rodzajOpis: p.rodzajOpis ?? '', gruboscCm: p.gruboscProjCm,
        kategoria: p.kategoria, mieszankaIds: p.mieszankaId ? [p.mieszankaId] : [], kolejnosc: 99, odcinki: [],
      };
      wynik.push(o);
    }
    for (const odc of p.odcinki) {
      if (!o.odcinki.some((x) => kluczOdcinka(x) === kluczOdcinka(odc))) {
        o.odcinki.push({ legendaId: odc.legendaId, wyjatekId: odc.wyjatekId, nazwa: odc.nazwa });
      }
    }
  }
  return wynik;
}

export default function FormularzRaportuScreen() {
  const params = useLocalSearchParams<{ budowaId?: string; data?: string; id?: string }>();
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const edytowany = useRaportyBudowyStore((s) => s.raporty.find((r) => r.id === params.id));
  const wszystkie = useRaportyBudowyStore((s) => s.raporty);
  const dodaj = useRaportyBudowyStore((s) => s.dodaj);
  const aktualizuj = useRaportyBudowyStore((s) => s.aktualizuj);
  const budowaId = edytowany?.budowaId ?? params.budowaId ?? '';
  const budowa = useBudowyStore((s) => s.budowy.find((b) => b.id === budowaId));
  const mieszanki = useMieszankiStore((s) => s.mieszanki);

  const opcje = useMemo(
    () => opcjeZRaportem(budowa?.projekt ? warstwyBudowy(budowa.projekt) : [], edytowany),
    [budowa?.projekt, edytowany],
  );

  const [data, setData] = useState(() => edytowany?.data ?? params.data ?? dzisIso());
  const [pozycje, setPozycje] = useState<PozycjaSzkic[]>(() => (edytowany ? szkicZRaportu(edytowany) : [pustaPozycja()]));
  const [uwagi, setUwagi] = useState(edytowany?.uwagi ?? '');
  const [blad, setBlad] = useState('');
  const [zapis, setZapis] = useState(false);

  const powrot = edytowany ? `/raport-budowy/${edytowany.id}` : `/budowa/${budowaId}?zakladka=raporty`;

  const zmienPozycje = (id: string, zmiany: Partial<PozycjaSzkic>) =>
    setPozycje((prev) => prev.map((p) => (p.id === id ? { ...p, ...zmiany } : p)));
  const zmienOdcinek = (pozId: string, odcId: string, zmiany: Partial<OdcinekSzkic>) =>
    setPozycje((prev) => prev.map((p) => (
      p.id === pozId ? { ...p, odcinki: p.odcinki.map((o) => (o.id === odcId ? { ...o, ...zmiany } : o)) } : p
    )));

  const wybierzWarstwe = (poz: PozycjaSzkic, opcja: OpcjaWarstwy) => {
    const recepty = opcja.mieszankaIds.filter((id) => mieszanki.some((m) => m.id === id));
    const odcinki = poz.odcinki.map((o) => (
      opcja.odcinki.some((x) => kluczOdcinka(x) === o.odcinekKlucz) ? o : { ...o, odcinekKlucz: opcja.odcinki.length === 1 ? kluczOdcinka(opcja.odcinki[0]) : '' }
    ));
    zmienPozycje(poz.id, {
      warstwaKlucz: opcja.klucz,
      mieszankaId: recepty.includes(poz.mieszankaId ?? '') ? poz.mieszankaId : recepty.length === 1 ? recepty[0] : undefined,
      odcinki,
    });
  };

  const wybierzOdcinek = (poz: PozycjaSzkic, odc: OdcinekSzkic, opcja: OpcjaOdcinka) => {
    const zmiany: Partial<OdcinekSzkic> = { odcinekKlucz: kluczOdcinka(opcja) };
    if (opcja.kmOdM != null && !odc.odKm && !odc.doKm) {
      const od = polaKm(opcja.kmOdM);
      const dos = polaKm(opcja.kmDoM);
      Object.assign(zmiany, { odKm: od.km, odM: od.m, doKm: dos.km, doM: dos.m });
    }
    zmienOdcinek(poz.id, odc.id, zmiany);
  };

  const zbuduj = (): PozycjaRaportu[] | string => {
    if (pozycje.length === 0) return 'Dodaj choć jedną warstwę.';
    const wynik: PozycjaRaportu[] = [];
    for (const [i, p] of pozycje.entries()) {
      const nr = pozycje.length > 1 ? ` (warstwa ${i + 1})` : '';
      const opcja = opcje.find((o) => o.klucz === p.warstwaKlucz);
      if (!opcja) return `Wybierz warstwę${nr}.`;
      const ilosc = parsujLiczbePola(p.ilosc) ?? 0;
      if (!(ilosc > 0)) return `Podaj ilość: ${nazwaIlosci(opcja.kategoria).toLowerCase()}${nr}.`;
      if (p.odcinki.length === 0) return `Dodaj odcinek${nr}.`;
      const odcinki = [];
      for (const o of p.odcinki) {
        const opOdc = opcja.odcinki.find((x) => kluczOdcinka(x) === o.odcinekKlucz);
        if (!opOdc) return `Wybierz odcinek${nr}.`;
        if (!o.odKm || !o.doKm) return `Podaj kilometraż od i do: ${opOdc.nazwa}${nr}.`;
        const od = parsujPolaKilometraza(o.odKm, o.odM);
        const dos = parsujPolaKilometraza(o.doKm, o.doM);
        const m2 = parsujLiczbePola(o.m2) ?? 0;
        if (!(m2 > 0)) return `Podaj powierzchnię: ${opOdc.nazwa}${nr}.`;
        odcinki.push({
          id: o.id,
          legendaId: opOdc.legendaId,
          ...(opOdc.wyjatekId ? { wyjatekId: opOdc.wyjatekId } : {}),
          nazwa: opOdc.nazwa,
          kmOdM: od.km * 1000 + od.m,
          kmDoM: dos.km * 1000 + dos.m,
          powierzchniaM2: m2,
        });
      }
      const recepta = p.mieszankaId ? mieszanki.find((m) => m.id === p.mieszankaId) : undefined;
      const poprzednia = edytowany?.pozycje.find((x) => x.id === p.id);
      wynik.push({
        id: p.id,
        warstwaKlucz: opcja.klucz,
        warstwaNazwa: opcja.nazwa,
        rodzajOpis: opcja.rodzajOpis || undefined,
        kategoria: opcja.kategoria,
        gruboscProjCm: opcja.gruboscCm,
        ...(p.mieszankaId ? {
          mieszankaId: p.mieszankaId,
          mieszankaNazwa: recepta ? nazwaRecepty(recepta) : poprzednia?.mieszankaNazwa,
        } : {}),
        gestoscTm3: recepta ? gestoscPozycji(opcja.kategoria, recepta) : poprzednia?.gestoscTm3 ?? gestoscPozycji(opcja.kategoria),
        ilosc,
        odcinki,
      });
    }
    return wynik;
  };

  const zapisz = async () => {
    const wynik = zbuduj();
    if (typeof wynik === 'string') { setBlad(wynik); return; }
    const kolizja = wszystkie.find((r) => r.budowaId === budowaId && r.data === data && r.id !== edytowany?.id);
    if (kolizja) { setBlad(`Raport z dnia ${dataKrotko(data)} już jest – otwórz go z kalendarza.`); return; }
    setBlad('');
    setZapis(true);
    try {
      const dane = { data, pozycje: wynik, uwagi: uwagi.trim() || undefined };
      if (edytowany) {
        await aktualizuj(edytowany.id, dane);
        wstecz(`/raport-budowy/${edytowany.id}`);
      } else {
        const id = await dodaj({ ...dane, budowaId });
        router.replace(`/raport-budowy/${id}` as never);
      }
    } finally {
      setZapis(false);
    }
  };

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={edytowany ? 'Edytuj raport' : 'Nowy raport'}
        podtytul={budowa ? `${budowa.kodBudowy} · ${budowa.nazwaInwestycji}` : undefined}
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz(powrot) }}
      />
      {!budowa ? (
        <Text style={[styles.brak, { color: theme.colors.textSecondary }]}>Nie znaleziono budowy.</Text>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[stylFormularza.tresc, { paddingBottom: insets.bottom + 24 }]}>
          <View>
            <Etykieta tekst="Data" info="Dzień robót. Na budowie jest jeden raport na dzień." />
            <KalendarzDnia wartosc={data} onZatwierdz={setData} accessibilityLabel="Data raportu" />
          </View>

          {opcje.length === 0 ? (
            <View style={{ gap: ODSTEP.s }}>
              <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>
                Na budowie nie ma jeszcze warstw. Uzupełnij zakładkę Konstrukcje – stamtąd raport bierze warstwy i odcinki.
              </Text>
              <Przycisk
                tekst="Przejdź do Konstrukcji"
                wariant="drugi"
                onPress={() => router.replace(`/budowa/${budowaId}?zakladka=konstrukcje` as never)}
              />
            </View>
          ) : pozycje.map((poz, i) => {
            const opcja = opcje.find((o) => o.klucz === poz.warstwaKlucz);
            const recepty = opcja ? opcja.mieszankaIds.map((id) => mieszanki.find((m) => m.id === id)).filter((m) => !!m) : [];
            const recepta = recepty.find((m) => m.id === poz.mieszankaId);
            const m2 = poz.odcinki.reduce((s, o) => s + (parsujLiczbePola(o.m2) ?? 0), 0);
            const ilosc = parsujLiczbePola(poz.ilosc) ?? 0;
            const grubosc = opcja ? gruboscZMasy(ilosc, m2, gestoscPozycji(opcja.kategoria, recepta)) : undefined;
            return (
              <View key={poz.id} style={[styles.blok, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
                <View style={styles.naglowekBloku}>
                  <Text style={[TYPOGRAFIA.sekcja, { color: theme.colors.textSecondary, flex: 1 }]}>Warstwa {i + 1}</Text>
                  {pozycje.length > 1 ? (
                    <PrzyciskIkony
                      ikona="usun"
                      kolor={theme.colors.danger}
                      accessibilityLabel={`Usuń warstwę ${i + 1}`}
                      onPress={() => setPozycje((prev) => prev.filter((p) => p.id !== poz.id))}
                    />
                  ) : null}
                </View>

                <View>
                  <Etykieta tekst="Warstwa" wymagane info="Warstwy z zakładki Konstrukcje tej budowy, z grubością projektową." />
                  <View style={stylFormularza.chipy}>
                    {opcje.map((o) => (
                      <Wybor
                        key={o.klucz}
                        zaznaczony={o.klucz === poz.warstwaKlucz}
                        etykieta={`${o.nazwa} · ${formatLiczby(o.gruboscCm, o.gruboscCm % 1 ? 1 : 0)} cm`}
                        accessibilityLabel={`Warstwa ${o.nazwa} ${o.gruboscCm} cm`}
                        onPress={() => wybierzWarstwe(poz, o)}
                      />
                    ))}
                  </View>
                </View>

                {opcja ? (
                  <>
                    <WierszDanych etykieta="Grubość projektowa" wartosc={`${formatLiczby(opcja.gruboscCm, 1)} cm${opcja.rodzajOpis ? ` · ${opcja.rodzajOpis}` : ''}`} />
                    {recepty.length > 0 ? (
                      <View>
                        <Etykieta tekst="Recepta" info="Recepty przypisane do warstwy w Konstrukcjach. Przerób i materiał liczą się osobno dla każdej recepty." />
                        <View style={stylFormularza.chipy}>
                          {recepty.map((m) => (
                            <Wybor
                              key={m.id}
                              zaznaczony={m.id === poz.mieszankaId}
                              etykieta={nazwaRecepty(m)}
                              accessibilityLabel={`Recepta ${nazwaRecepty(m)}`}
                              onPress={() => zmienPozycje(poz.id, { mieszankaId: m.id === poz.mieszankaId ? undefined : m.id })}
                            />
                          ))}
                        </View>
                      </View>
                    ) : null}

                    {poz.odcinki.map((odc, j) => (
                      <View key={odc.id} style={[styles.odcinek, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}>
                        <View style={styles.naglowekBloku}>
                          <Text style={[TYPOGRAFIA.etykieta, { color: theme.colors.text, flex: 1 }]}>Odcinek {j + 1}</Text>
                          {poz.odcinki.length > 1 ? (
                            <PrzyciskIkony
                              ikona="usun"
                              kolor={theme.colors.danger}
                              accessibilityLabel={`Usuń odcinek ${j + 1}`}
                              onPress={() => zmienPozycje(poz.id, { odcinki: poz.odcinki.filter((o) => o.id !== odc.id) })}
                            />
                          ) : null}
                        </View>
                        <View style={stylFormularza.chipy}>
                          {opcja.odcinki.map((o) => (
                            <Wybor
                              key={kluczOdcinka(o)}
                              zaznaczony={kluczOdcinka(o) === odc.odcinekKlucz}
                              etykieta={o.nazwa}
                              accessibilityLabel={`Odcinek ${o.nazwa}`}
                              onPress={() => wybierzOdcinek(poz, odc, o)}
                            />
                          ))}
                        </View>
                        <Wiersz>
                          <View>
                            <Etykieta tekst="Km od" wymagane />
                            <PoleKilometraz
                              theme={theme}
                              mini
                              km={odc.odKm}
                              m={odc.odM}
                              accessibilityLabel={`Km od odcinka ${j + 1}`}
                              onKm={(v) => zmienOdcinek(poz.id, odc.id, { odKm: v })}
                              onM={(v) => zmienOdcinek(poz.id, odc.id, { odM: v })}
                            />
                          </View>
                          <View>
                            <Etykieta tekst="Km do" wymagane />
                            <PoleKilometraz
                              theme={theme}
                              mini
                              km={odc.doKm}
                              m={odc.doM}
                              accessibilityLabel={`Km do odcinka ${j + 1}`}
                              onKm={(v) => zmienOdcinek(poz.id, odc.id, { doKm: v })}
                              onM={(v) => zmienOdcinek(poz.id, odc.id, { doM: v })}
                            />
                          </View>
                        </Wiersz>
                        <Pole
                          etykieta="Powierzchnia"
                          wymagane
                          jednostka="m²"
                          liczba
                          value={odc.m2}
                          onChangeText={(v) => zmienOdcinek(poz.id, odc.id, { m2: v })}
                          accessibilityLabel={`Powierzchnia odcinka ${j + 1}`}
                        />
                      </View>
                    ))}
                    <Przycisk
                      tekst="Dodaj odcinek"
                      ikona="plus"
                      wariant="drugi"
                      maly
                      onPress={() => zmienPozycje(poz.id, { odcinki: [...poz.odcinki, pustyOdcinek()] })}
                    />

                    <Pole
                      etykieta={nazwaIlosci(opcja.kategoria)}
                      wymagane
                      jednostka="t"
                      liczba
                      value={poz.ilosc}
                      onChangeText={(v) => zmienPozycje(poz.id, { ilosc: v })}
                      info="Ilość wbudowana na wszystkich odcinkach tej warstwy."
                      accessibilityLabel={`Ilość warstwa ${i + 1}`}
                    />
                    {grubosc != null ? (
                      <Text style={[TYPOGRAFIA.podsumowanie, { color: theme.colors.primary }]}>
                        Wychodzi {formatLiczby(grubosc)} cm (proj. {formatLiczby(opcja.gruboscCm, 1)} cm) na {formatLiczby(m2)} m²
                      </Text>
                    ) : null}
                  </>
                ) : null}
              </View>
            );
          })}

          {opcje.length > 0 ? (
            <Przycisk tekst="Dodaj warstwę" ikona="plus" wariant="drugi" onPress={() => setPozycje((prev) => [...prev, pustaPozycja()])} />
          ) : null}

          <Pole etykieta="Uwagi" value={uwagi} onChangeText={setUwagi} placeholder="Opcjonalnie" multiline accessibilityLabel="Uwagi raportu" />

          {blad ? <Text style={[stylFormularza.blad, { color: theme.colors.danger }]}>{blad}</Text> : null}
          <Przycisk
            tekst={zapis ? 'Zapis…' : 'Zapisz raport'}
            disabled={zapis || opcje.length === 0}
            onPress={zapisz}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  brak: { padding: ODSTEP.l },
  blok: { borderWidth: 1, borderRadius: PROMIEN.l, padding: ODSTEP.m, gap: ODSTEP.m },
  odcinek: { borderWidth: 1, borderRadius: PROMIEN.m, padding: ODSTEP.m, gap: ODSTEP.s },
  naglowekBloku: { flexDirection: 'row', alignItems: 'center', gap: ODSTEP.s, minHeight: 28 },
});
