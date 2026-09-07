// ============================================================
// OBMIAR PZT – kolejność, konfiguracja 1–4, plan dnia → wbudowywanie
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  useColorScheme, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../src/components/common/AppHeader';
import { SafeModal } from '../../src/components/common/SafeModal';
import { MieszankaPicker } from '../../src/components/common/MieszankaPicker';
import { BudowaPicker } from '../../src/components/common/BudowaPicker';
import { DatePickerButton } from '../../src/components/common/DatePickerButton';
import { WielokatPodglad } from '../../src/components/obmiar/WielokatPodglad';
import { ObmiarKonfiguracja } from '../../src/components/obmiar/ObmiarKonfiguracja';
import { lightTheme, darkTheme, type AppTheme } from '../../src/constants/theme';
import { DOMYSLNY_TONAZ_AUTA } from '../../src/constants';
import { useObmiarStore } from '../../src/stores/obmiarStore';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { usePlanyStore } from '../../src/stores/planyStore';
import { useRouteId } from '../../src/hooks/useRouteId';
import { wybierzIParsujXfdf } from '../../src/utils/xfdfImport';
import { formatLiczby, parsujRzuty, walidujRzuty, generujDomyslneRzuty } from '../../src/utils/calculations';
import { formatujKilometraz, odlegloscMiedzyWezlami } from '../../src/utils/obmiarFigura';
import {
  brakiZatwierdzeniaObszaru, etykietaMasy, etykietaPowierzchni, gruboscWbudowywaniaObszaru,
  podsumowaniePlanuObmiaru, sesjaNaDanePlanu,
} from '../../src/utils/obmiarDoPlanu';
import { pobierzUstawienia } from '../ustawienia';
import { PRESETY_SKALI_PZT, skalaZMianownika, type ObszarObmiaru, type TrybWyboruWezla } from '../../src/types';

type SekcjaNr = 'start' | 'odsadzka' | 'konstrukcja' | null;

export default function ObmiarDetailScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const id = useRouteId() ?? '';
  const {
    sesjaPoId, dodajObszaryZXfdf, przesunObszar, usunObszar, zmienSkale,
    ustawBazeObszaru, ustawOdsadzke, dodajOdsadzke, zastosujOdsadzkeLancucha,
    ustawKonfiguracjeZablokowana, ustawParametryUkladania,
    ustawKierunekUkladania, ustawKontynuacje, usunOdsadzke,
    ustawBudoweSesji, ustawDateSesji, ustawPlanDniaMeta, powiazPlanSesji,
  } = useObmiarStore();
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const pobierzMieszanke = useMieszankiStore((s) => s.pobierzMieszanke);
  const { budowy } = useBudowyStore();
  const dodajPlan = usePlanyStore((s) => s.dodajPlan);
  const edytujPlan = usePlanyStore((s) => s.edytujPlan);
  const sesja = id ? sesjaPoId(id) : undefined;

  const [rozwinietyId, setRozwinietyId] = useState<string | null>(null);
  const [sekcjaOtwarta, setSekcjaOtwarta] = useState<SekcjaNr>(null);
  const [modalSkala, setModalSkala] = useState(false);
  const [mianownikTekst, setMianownikTekst] = useState('500');
  const [trybWyboru, setTrybWyboru] = useState<TrybWyboruWezla | null>(null);
  const [aktywnaOdsadzkaId, setAktywnaOdsadzkaId] = useState<string | null>(null);
  const [mapaAktywna, setMapaAktywna] = useState(false);
  const [blokadaPodgladu, setBlokadaPodgladu] = useState(false);
  const [pickerMieszanka, setPickerMieszanka] = useState(false);
  const [pickerBudowa, setPickerBudowa] = useState(false);
  const [pomiarP1, setPomiarP1] = useState<number | undefined>();
  const [pomiarP2, setPomiarP2] = useState<number | undefined>();
  const [tonazStr, setTonazStr] = useState(String(DOMYSLNY_TONAZ_AUTA));
  const [rzutyStr, setRzutyStr] = useState('');
  const [zapisuje, setZapisuje] = useState(false);

  useEffect(() => {
    pobierzUstawienia().then((u) => {
      if (!sesja?.tonazAuta) setTonazStr(String(u.tonazDomyslny));
    });
  }, [sesja?.id]);

  useEffect(() => {
    if (sesja?.tonazAuta) setTonazStr(String(sesja.tonazAuta));
    if (sesja?.rzuty?.length) setRzutyStr(sesja.rzuty.map((r) => r.iloscSamochodow).join('+'));
  }, [sesja?.id]);

  const obszarPodgladu = useMemo(() => {
    if (!sesja) return undefined;
    return sesja.obszary.find((o) => o.id === rozwinietyId) ?? sesja.obszary[0];
  }, [sesja, rozwinietyId]);

  useEffect(() => {
    if (!obszarPodgladu) return;
    setTrybWyboru(null);
    setPomiarP1(undefined);
    setPomiarP2(undefined);
    setAktywnaOdsadzkaId(obszarPodgladu.odsadzki?.[0]?.id ?? null);
    if (!obszarPodgladu.odsadzki?.length && sesja) {
      dodajOdsadzke(sesja.id, obszarPodgladu.id).then((nid) => {
        if (nid) setAktywnaOdsadzkaId(nid);
      });
    }
  }, [obszarPodgladu?.id]);

  const pomiar = useMemo(() => {
    if (pomiarP1 == null || pomiarP2 == null || !obszarPodgladu) {
      return { p1: pomiarP1, p2: pomiarP2 };
    }
    const d = odlegloscMiedzyWezlami(obszarPodgladu.wierzcholkiM, pomiarP1, pomiarP2);
    return { p1: pomiarP1, p2: pomiarP2, wzdluzM: d.wzdluzM, prostoM: d.prostoM };
  }, [pomiarP1, pomiarP2, obszarPodgladu]);

  const idxPodswietlone = useMemo(() => {
    const out: number[] = [];
    if (pomiarP1 != null) out.push(pomiarP1);
    if (pomiarP2 != null) out.push(pomiarP2);
    const o = (obszarPodgladu?.odsadzki ?? []).find((x) => x.id === aktywnaOdsadzkaId);
    if (o?.idxP != null) out.push(o.idxP);
    if (o?.idxK != null) out.push(o.idxK);
    return out;
  }, [pomiarP1, pomiarP2, obszarPodgladu, aktywnaOdsadzkaId]);

  const tonazAuta = parseFloat(tonazStr.replace(',', '.')) || DOMYSLNY_TONAZ_AUTA;
  const podsumowanie = useMemo(
    () => (sesja ? podsumowaniePlanuObmiaru(sesja, mieszanki, tonazAuta) : null),
    [sesja, mieszanki, tonazAuta],
  );
  const budowa = sesja?.budowaId ? budowy.find((b) => b.id === sesja.budowaId) : undefined;
  const dataPlanu = useMemo(() => {
    const raw = sesja?.data;
    if (!raw) return new Date();
    const d = new Date(raw.length <= 10 ? `${raw}T12:00:00` : raw);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [sesja?.data]);

  if (!sesja) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader tytul="Obmiar" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
        <Text style={{ color: theme.colors.danger, textAlign: 'center', marginTop: 40 }}>Sesja nie znaleziona.</Text>
      </View>
    );
  }

  const importuj = async () => {
    const wynik = await wybierzIParsujXfdf();
    if (!wynik.sukces) {
      if (wynik.blad !== 'Anulowano wybór pliku.') Alert.alert('Import XFDF', wynik.blad);
      return;
    }
    await dodajObszaryZXfdf(sesja.id, wynik.wynik);
    const odswiezona = useObmiarStore.getState().sesjaPoId(sesja.id);
    const ostatni = odswiezona?.obszary[odswiezona.obszary.length - 1];
    if (ostatni) {
      setRozwinietyId(ostatni.id);
      setSekcjaOtwarta('start');
    }
    const suma = odswiezona?.obszary.reduce((a, o) => a + o.powierzchniaM2, 0) ?? 0;
    Alert.alert('Zaimportowano', `Dodano ${wynik.wynik.polygony.length} obszar(ów).\nŁącznie: ${formatLiczby(suma)} m²`);
  };

  const onWezel = async (idx: number) => {
    setMapaAktywna(false);
    if (!obszarPodgladu || !trybWyboru) return;
    const zablokowana = !!obszarPodgladu.konfiguracjaZablokowana;
    if (zablokowana && trybWyboru !== 'pomiarP1' && trybWyboru !== 'pomiarP2') return;

    if (trybWyboru === 'startLewy') await ustawBazeObszaru(sesja.id, obszarPodgladu.id, 'start', { idxLewy: idx });
    if (trybWyboru === 'startPrawy') await ustawBazeObszaru(sesja.id, obszarPodgladu.id, 'start', { idxPrawy: idx });
    if (trybWyboru === 'koniecLewy') await ustawBazeObszaru(sesja.id, obszarPodgladu.id, 'koniec', { idxLewy: idx });
    if (trybWyboru === 'koniecPrawy') await ustawBazeObszaru(sesja.id, obszarPodgladu.id, 'koniec', { idxPrawy: idx });
    if (trybWyboru === 'odsadzkaP' || trybWyboru === 'odsadzkaK') {
      let oid = aktywnaOdsadzkaId;
      if (!oid) {
        oid = obszarPodgladu.odsadzki?.[0]?.id ?? await dodajOdsadzke(sesja.id, obszarPodgladu.id);
        if (oid) setAktywnaOdsadzkaId(oid);
      }
      if (oid) {
        await ustawOdsadzke(sesja.id, obszarPodgladu.id, oid, trybWyboru === 'odsadzkaP' ? { idxP: idx } : { idxK: idx });
      }
    }
    if (trybWyboru === 'pomiarP1') setPomiarP1(idx);
    if (trybWyboru === 'pomiarP2') setPomiarP2(idx);
    setTrybWyboru(null);
  };

  const toggleObszar = (oid: string) => {
    if (rozwinietyId === oid) {
      setRozwinietyId(null);
      setSekcjaOtwarta(null);
      setTrybWyboru(null);
      return;
    }
    setRozwinietyId(oid);
    setSekcjaOtwarta(null);
    setTrybWyboru(null);
  };

  const toggleSekcja = (s: SekcjaNr) => {
    setSekcjaOtwarta((prev) => (prev === s ? null : s));
    setTrybWyboru(null);
  };

  const zatwierdz = async (o: ObszarObmiaru) => {
    const braki = brakiZatwierdzeniaObszaru(o);
    if (braki.length) {
      const pierwszy = braki[0];
      Alert.alert('Uzupełnij konfigurację', braki.map((b) => `• ${b.komunikat}`).join('\n'), [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Przejdź',
          onPress: () => {
            setRozwinietyId(o.id);
            setSekcjaOtwarta(pierwszy.pole === 'start' ? 'start' : 'konstrukcja');
          },
        },
      ]);
      return;
    }
    await ustawKonfiguracjeZablokowana(sesja.id, o.id, true);
    Alert.alert('Zatwierdzono', 'Kłódka zamknięta – obszar gotowy do kontrolowania w Wbudowywaniu.');
  };

  const zapiszPlan = async () => {
    const niegotowe = sesja.obszary.filter((o) => brakiZatwierdzeniaObszaru(o).length > 0);
    if (niegotowe.length) {
      const o = niegotowe[0];
      const braki = brakiZatwierdzeniaObszaru(o);
      Alert.alert(
        'Nie można zapisać planu',
        `Obszar „${o.nazwa}”: ${braki.map((b) => b.komunikat).join(' ')}`,
        [
          { text: 'Anuluj', style: 'cancel' },
          {
            text: 'Uzupełnij',
            onPress: () => {
              setRozwinietyId(o.id);
              setSekcjaOtwarta(braki[0].pole === 'start' ? 'start' : 'konstrukcja');
            },
          },
        ],
      );
      return;
    }
    let rzuty = generujDomyslneRzuty(podsumowanie?.sumaAut || 1);
    if (rzutyStr.trim()) {
      const parsed = parsujRzuty(rzutyStr);
      if (!parsed || !walidujRzuty(rzutyStr, podsumowanie?.sumaAut || 1)) {
        Alert.alert('Rzuty', `Podział „${rzutyStr}” musi sumować się do ${podsumowanie?.sumaAut} aut.`);
        return;
      }
      rzuty = parsed;
    }
    await ustawPlanDniaMeta(sesja.id, { tonazAuta, rzuty });
    for (const o of sesja.obszary) {
      if (!o.konfiguracjaZablokowana) await ustawKonfiguracjeZablokowana(sesja.id, o.id, true);
    }
    setZapisuje(true);
    try {
      const dane = sesjaNaDanePlanu({ ...sesja, tonazAuta, rzuty }, tonazAuta, rzuty);
      if (sesja.planId) {
        await edytujPlan(sesja.planId, dane);
        router.replace(`/wbudowywanie/${sesja.planId}` as any);
      } else {
        const planId = await dodajPlan(dane);
        await powiazPlanSesji(sesja.id, planId);
        router.replace(`/wbudowywanie/${planId}` as any);
      }
    } catch {
      Alert.alert('Błąd', 'Nie udało się zapisać planu.');
    } finally {
      setZapisuje(false);
    }
  };

  const wspolneKonfig = obszarPodgladu ? {
    obszar: obszarPodgladu,
    theme,
    trybWyboru,
    onTryb: (t: TrybWyboruWezla | null, oid?: string) => {
      setMapaAktywna(false);
      setTrybWyboru(t);
      if (oid) setAktywnaOdsadzkaId(oid);
    },
    zablokowana: !!obszarPodgladu.konfiguracjaZablokowana,
    onBlokada: (v: boolean) => ustawKonfiguracjeZablokowana(sesja.id, obszarPodgladu.id, v),
    onBaza: (ktora: 'start' | 'koniec', dane: { kilometrazKm?: number; kilometrazM?: number }) =>
      ustawBazeObszaru(sesja.id, obszarPodgladu.id, ktora, dane),
    onKierunek: (k: 'rosnacy' | 'malejacy') => ustawKierunekUkladania(sesja.id, obszarPodgladu.id, k),
    onDodajOdsadzke: async () => {
      const nid = await dodajOdsadzke(sesja.id, obszarPodgladu.id);
      if (nid) setAktywnaOdsadzkaId(nid);
    },
    onZastosujOdsadzke: async (
      odsadzkaId: string,
      dystansM: number,
      extra?: { strona?: 'lewa' | 'prawa'; kmOdKm?: number; kmOdM?: number; kmDoKm?: number; kmDoM?: number },
    ) => {
      const w = await zastosujOdsadzkeLancucha(sesja.id, obszarPodgladu.id, odsadzkaId, dystansM, extra);
      if (w) {
        Alert.alert('Odsadzka', `Δ ${w.deltaPowierzchniaM2 >= 0 ? '+' : ''}${w.deltaPowierzchniaM2} m²\nNowa: ${w.powierzchniaM2} m²`);
      } else {
        Alert.alert('Odsadzka', 'Nie udało się zastosować. Ustaw start/koniec L i P albo stronę i kilometraż.');
      }
    },
    onUsunOdsadzke: (oid: string) => usunOdsadzke(sesja.id, obszarPodgladu.id, oid),
    pomiar,
    onWyczyscPomiar: () => { setPomiarP1(undefined); setPomiarP2(undefined); setTrybWyboru(null); },
  } : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={sesja.nazwa}
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
        prawy={{ tekst: '+ XFDF', onPress: importuj, kolor: theme.colors.success }}
      />

      <ScrollView
        contentContainerStyle={[styles.zawartosc, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        scrollEnabled={!blokadaPodgladu && !mapaAktywna && !trybWyboru}
      >
        <Text style={[styles.kartaTytul, { color: theme.colors.text, marginLeft: 4 }]}>Kolejność układania</Text>

        {sesja.obszary.length === 0 ? (
          <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
              Brak obszarów. Naciśnij „+ XFDF” i wybierz eksport komentarzy z PDF-XChange.
            </Text>
          </View>
        ) : (
          [...sesja.obszary].sort((a, b) => a.kolejnosc - b.kolejnosc).map((o) => {
            const otwarty = rozwinietyId === o.id;
            const zamek = !!o.konfiguracjaZablokowana;
            return (
              <View
                key={o.id}
                style={[
                  styles.karta,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: otwarty ? theme.colors.success : theme.colors.border,
                    borderWidth: otwarty ? 2 : 1,
                  },
                ]}
              >
                <TouchableOpacity onPress={() => toggleObszar(o.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>{zamek ? '🔒' : '🔓'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 14 }}>
                      {o.kolejnosc}. {o.nazwaDzialki || o.nazwa}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                      {formatLiczby(o.powierzchniaM2)} m² · {o.wierzcholkiPdf.length} węzłów
                      {o.bazaStart?.kilometrazKm != null || o.kilometrazStartKm != null
                        ? ` · ${formatujKilometraz(o.bazaStart?.kilometrazKm ?? o.kilometrazStartKm, o.bazaStart?.kilometrazM ?? o.kilometrazStartM)}`
                        : ''}
                    </Text>
                  </View>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 18 }}>{otwarty ? '▾' : '▸'}</Text>
                </TouchableOpacity>

                <View style={styles.rzadAkcji}>
                  <TouchableOpacity style={[styles.btnMini, { backgroundColor: `${theme.colors.primary}20` }]} onPress={() => przesunObszar(sesja.id, o.id, -1)}>
                    <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>↑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btnMini, { backgroundColor: `${theme.colors.primary}20` }]} onPress={() => przesunObszar(sesja.id, o.id, 1)}>
                    <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>↓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnMini, { backgroundColor: `${theme.colors.danger}20` }]}
                    onPress={() => Alert.alert('Usuń obszar', `Usunąć „${o.nazwa}”?`, [
                      { text: 'Anuluj', style: 'cancel' },
                      { text: 'Usuń', style: 'destructive', onPress: () => usunObszar(sesja.id, o.id) },
                    ])}
                  >
                    <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {otwarty && wspolneKonfig && obszarPodgladu?.id === o.id && (
                  <View style={{ marginTop: 12, gap: 10 }}>
                    <WielokatPodglad
                      wierzcholki={o.wierzcholkiM}
                      wezly={o.wezlyRole}
                      kolorWypelnienia={o.kolorWypelnienia}
                      wysokosc={300}
                      etykieta={`${formatLiczby(o.powierzchniaM2)} m²`}
                      resetKlucz={o.id}
                      onPressWezel={onWezel}
                      obszar={o}
                      pokazMaszyny={false}
                      trybWyboru={trybWyboru}
                      idxPodswietlone={idxPodswietlone}
                      onDotykZmiana={setMapaAktywna}
                      blokadaPodgladu={blokadaPodgladu}
                      onBlokadaPodgladu={setBlokadaPodgladu}
                    />
                    <TouchableOpacity
                      style={[styles.btnSek, { borderColor: theme.colors.primary, marginTop: 0 }]}
                      onPress={() => { setMianownikTekst(String(sesja.skala.mianownik)); setModalSkala(true); }}
                    >
                      <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
                        Skala 1:{sesja.skala.mianownik} ({sesja.skala.metryNaCm} m / cm)
                      </Text>
                    </TouchableOpacity>

                    <ObmiarKonfiguracja {...wspolneKonfig} sekcja="pomiar" />

                    {o.kolejnosc > 1 && (
                      <TouchableOpacity
                        onPress={() => ustawKontynuacje(sesja.id, o.id, !o.kontynuacjaPoprzedniego)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                      >
                        <View style={{
                          width: 22, height: 22, borderRadius: 4, borderWidth: 2,
                          borderColor: o.kontynuacjaPoprzedniego ? theme.colors.success : theme.colors.border,
                          backgroundColor: o.kontynuacjaPoprzedniego ? theme.colors.success : 'transparent',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          {o.kontynuacjaPoprzedniego ? <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>✓</Text> : null}
                        </View>
                        <Text style={{ color: theme.colors.text, fontSize: 13, flex: 1 }}>
                          Kontynuacja poprzedniego (start = koniec poprzedniego)
                        </Text>
                      </TouchableOpacity>
                    )}

                    <WierszRozwijany
                      nr={1}
                      tytul="Start / Koniec"
                      otwarty={sekcjaOtwarta === 'start'}
                      theme={theme}
                      onPress={() => toggleSekcja('start')}
                    >
                      <ObmiarKonfiguracja {...wspolneKonfig} sekcja="start" />
                    </WierszRozwijany>
                    <WierszRozwijany
                      nr={2}
                      tytul="Odsadzka"
                      otwarty={sekcjaOtwarta === 'odsadzka'}
                      theme={theme}
                      onPress={() => toggleSekcja('odsadzka')}
                    >
                      <ObmiarKonfiguracja {...wspolneKonfig} sekcja="odsadzka" />
                    </WierszRozwijany>
                    <WierszRozwijany
                      nr={3}
                      tytul="Konstrukcja"
                      otwarty={sekcjaOtwarta === 'konstrukcja'}
                      theme={theme}
                      onPress={() => toggleSekcja('konstrukcja')}
                    >
                      <KonstrukcjaObszaru
                        obszar={o}
                        theme={theme}
                        zablokowana={zamek}
                        mieszanka={o.mieszankaId ? pobierzMieszanke(o.mieszankaId) ?? mieszanki.find((m) => m.id === o.mieszankaId) : undefined}
                        onMieszanka={() => setPickerMieszanka(true)}
                        onZmiana={(dane) => ustawParametryUkladania(sesja.id, o.id, dane)}
                      />
                    </WierszRozwijany>
                    <TouchableOpacity
                      style={[styles.btnZatwierdz, { backgroundColor: zamek ? theme.colors.textSecondary : theme.colors.success }]}
                      onPress={() => (zamek ? ustawKonfiguracjeZablokowana(sesja.id, o.id, false) : zatwierdz(o))}
                    >
                      <Text style={styles.btnZatwierdzTekst}>{zamek ? '4. Odblokuj kłódkę' : '4. Zatwierdź'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}

        <TouchableOpacity style={[styles.btnImport, { backgroundColor: theme.colors.success }]} onPress={importuj}>
          <Text style={styles.btnImportTekst}>+ Importuj kolejny XFDF</Text>
        </TouchableOpacity>

        <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>Plan dnia</Text>
          <DatePickerButton
            label="Data"
            value={dataPlanu}
            onChange={(d) => ustawDateSesji(sesja.id, d.toISOString().slice(0, 10))}
          />
          <TouchableOpacity style={[styles.btnSek, { borderColor: theme.colors.border }]} onPress={() => setPickerBudowa(true)}>
            <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
              {budowa ? `${budowa.kodBudowy} – ${budowa.nazwaInwestycji}` : 'Przypisz budowę'}
            </Text>
          </TouchableOpacity>
          {podsumowanie && (
            <View style={{ marginTop: 10, gap: 4 }}>
              <Row label="Łączna powierzchnia" v={`${formatLiczby(podsumowanie.powierzchniaRazem)} m²`} theme={theme} bold />
              {podsumowanie.powierzchnie.map((p) => (
                <Text key={p.etykieta} style={{ color: theme.colors.textSecondary, fontSize: 13, marginLeft: 4 }}>
                  – {etykietaPowierzchni(p)}
                </Text>
              ))}
              <Row label="Obszary (działki robocze)" v={String(podsumowanie.liczbaObszarow)} theme={theme} />
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 6 }}>Mieszanki / masa</Text>
              {podsumowanie.mieszanki.length === 0 ? (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Uzupełnij konstrukcję obszarów.</Text>
              ) : podsumowanie.mieszanki.map((p) => (
                <Text key={`${p.mieszankaId}-${p.gruboscCm}`} style={{ color: theme.colors.text, fontSize: 13 }}>
                  – {etykietaMasy(p)}
                </Text>
              ))}
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 6 }}>Ilość samochodów</Text>
              {podsumowanie.masaNaMieszanke.map((m) => (
                <Text key={m.mieszankaId} style={{ color: theme.colors.text, fontSize: 13 }}>
                  – {m.auta} aut · {formatLiczby(m.masaMg, 2)} t {m.etykieta}
                </Text>
              ))}
              <Row label="Razem aut" v={String(podsumowanie.sumaAut)} theme={theme} bold />
            </View>
          )}
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Tonaż na auto [t]</Text>
            <TextInput
              value={tonazStr}
              onChangeText={setTonazStr}
              keyboardType="decimal-pad"
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.inputBackground }]}
            />
          </View>
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginBottom: 4 }}>
              Podział na kursy (np. 6+6+4), suma = {podsumowanie?.sumaAut ?? 0}
            </Text>
            <TextInput
              value={rzutyStr}
              onChangeText={setRzutyStr}
              placeholder="puste = jeden kurs"
              placeholderTextColor={theme.colors.textSecondary}
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.inputBackground }]}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btnImport, { backgroundColor: theme.colors.primary }]}
          onPress={zapiszPlan}
          disabled={zapisuje}
        >
          {zapisuje ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnImportTekst}>Zapisz plan</Text>}
        </TouchableOpacity>
      </ScrollView>

      <SafeModal
        visible={modalSkala}
        tytul="Skala rysunku"
        theme={theme}
        onClose={() => setModalSkala(false)}
        lewy={{ tekst: 'Anuluj', onPress: () => setModalSkala(false), kolor: theme.colors.textSecondary }}
        prawy={{
          tekst: 'Zastosuj',
          onPress: () => {
            const m = parseInt(mianownikTekst.replace(',', '.'), 10);
            if (!Number.isFinite(m) || m < 1) {
              Alert.alert('Skala', 'Podaj poprawny mianownik (np. 500).');
              return;
            }
            zmienSkale(sesja.id, skalaZMianownika(m));
            setModalSkala(false);
          },
          kolor: theme.colors.primary,
        }}
      >
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PRESETY_SKALI_PZT.map((p) => (
              <TouchableOpacity
                key={p.mianownik}
                style={[
                  styles.presetBtn,
                  {
                    borderColor: sesja.skala.mianownik === p.mianownik ? theme.colors.primary : theme.colors.border,
                    backgroundColor: sesja.skala.mianownik === p.mianownik ? `${theme.colors.primary}20` : theme.colors.inputBackground,
                  },
                ]}
                onPress={() => {
                  setMianownikTekst(String(p.mianownik));
                  zmienSkale(sesja.id, skalaZMianownika(p.mianownik));
                  setModalSkala(false);
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>1:{p.mianownik}</Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>{p.metryNaCm} m / cm</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={mianownikTekst}
            onChangeText={setMianownikTekst}
            keyboardType="numeric"
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.inputBackground }]}
          />
        </ScrollView>
      </SafeModal>

      <MieszankaPicker
        visible={pickerMieszanka}
        selectedId={obszarPodgladu?.mieszankaId ?? ''}
        theme={theme}
        onSelect={(m) => {
          if (obszarPodgladu) ustawParametryUkladania(sesja.id, obszarPodgladu.id, { mieszankaId: m.id });
        }}
        onClose={() => setPickerMieszanka(false)}
      />
      <BudowaPicker
        visible={pickerBudowa}
        budowy={budowy.filter((b) => b.status !== 'archiwalna')}
        selectedId={sesja.budowaId}
        theme={theme}
        onSelect={(bid) => ustawBudoweSesji(sesja.id, bid)}
        onClose={() => setPickerBudowa(false)}
      />
    </View>
  );
}

function WierszRozwijany({
  nr, tytul, otwarty, theme, onPress, children,
}: {
  nr: number; tytul: string; otwarty: boolean; theme: AppTheme; onPress: () => void; children: React.ReactNode;
}) {
  return (
    <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, overflow: 'hidden' }}>
      <TouchableOpacity
        onPress={onPress}
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 8 }}
      >
        <Text style={{ color: theme.colors.primary, fontWeight: '800', width: 22 }}>{nr}.</Text>
        <Text style={{ color: theme.colors.text, fontWeight: '700', flex: 1 }}>{tytul}</Text>
        <Text style={{ color: theme.colors.textSecondary }}>{otwarty ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {otwarty ? <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>{children}</View> : null}
    </View>
  );
}

function KonstrukcjaObszaru({
  obszar, theme, zablokowana, mieszanka, onMieszanka, onZmiana,
}: {
  obszar: ObszarObmiaru;
  theme: AppTheme;
  zablokowana: boolean;
  mieszanka?: { rodzaj: string; nrRecepty?: string; ciezarObjetosciowy: number };
  onMieszanka: () => void;
  onZmiana: (d: {
    nazwaDzialki?: string;
    gruboscProjektowa?: number;
    tolerancja?: number;
    gruboscWbudowywania?: number;
    gruboscCm?: number;
  }) => void;
}) {
  const [nazwa, setNazwa] = useState(obszar.nazwaDzialki ?? '');
  const [proj, setProj] = useState(obszar.gruboscProjektowa != null ? String(obszar.gruboscProjektowa) : '');
  const [tol, setTol] = useState(obszar.tolerancja != null ? String(obszar.tolerancja) : '10');
  const [wb, setWb] = useState(
    gruboscWbudowywaniaObszaru(obszar) > 0 ? String(gruboscWbudowywaniaObszaru(obszar)) : '',
  );

  useEffect(() => {
    setNazwa(obszar.nazwaDzialki ?? '');
    setProj(obszar.gruboscProjektowa != null ? String(obszar.gruboscProjektowa) : '');
    setTol(obszar.tolerancja != null ? String(obszar.tolerancja) : '10');
    setWb(gruboscWbudowywaniaObszaru(obszar) > 0 ? String(gruboscWbudowywaniaObszaru(obszar)) : '');
  }, [obszar.id, obszar.nazwaDzialki, obszar.gruboscProjektowa, obszar.tolerancja, obszar.gruboscWbudowywania, obszar.gruboscCm]);

  const zapiszLiczby = () => {
    const g = parseFloat(wb.replace(',', '.'));
    const p = parseFloat(proj.replace(',', '.'));
    const t = parseFloat(tol.replace(',', '.'));
    onZmiana({
      nazwaDzialki: nazwa.trim() || undefined,
      gruboscWbudowywania: Number.isFinite(g) ? g : undefined,
      gruboscCm: Number.isFinite(g) ? g : undefined,
      gruboscProjektowa: Number.isFinite(p) ? p : undefined,
      tolerancja: Number.isFinite(t) ? t : 10,
    });
  };

  return (
    <View style={{ gap: 8 }} pointerEvents={zablokowana ? 'none' : 'auto'}>
      <Pole label="Nazwa działki (opcjonalnie)" value={nazwa} onChange={setNazwa} theme={theme} onBlur={zapiszLiczby} klawiatura="default" />
      <TouchableOpacity
        style={[styles.btnSek, { borderColor: theme.colors.border, marginTop: 0, opacity: zablokowana ? 0.5 : 1 }]}
        onPress={onMieszanka}
        disabled={zablokowana}
      >
        <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
          {mieszanka
            ? `${mieszanka.rodzaj}${mieszanka.nrRecepty ? ` · ${mieszanka.nrRecepty}` : ''} · ρ ${mieszanka.ciezarObjetosciowy.toFixed(3)}`
            : 'Wybierz mieszankę'}
        </Text>
      </TouchableOpacity>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pole label="Grubość projektowa [cm]" value={proj} onChange={setProj} theme={theme} onBlur={zapiszLiczby} />
        <Pole label="Tolerancja [%]" value={tol} onChange={setTol} theme={theme} onBlur={zapiszLiczby} />
      </View>
      <Pole label="Grubość wbudowywania [cm]" value={wb} onChange={setWb} theme={theme} onBlur={zapiszLiczby} />
    </View>
  );
}

function Row({ label, v, theme, bold }: { label: string; v: string; theme: AppTheme; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: 8 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: bold ? '700' : '400' }}>{v}</Text>
    </View>
  );
}

function Pole({
  label, value, onChange, theme, onBlur, klawiatura = 'decimal-pad',
}: {
  label: string; value: string; onChange: (t: string) => void; theme: AppTheme; onBlur?: () => void;
  klawiatura?: 'decimal-pad' | 'default';
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        keyboardType={klawiatura}
        placeholderTextColor={theme.colors.textSecondary}
        style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.inputBackground }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  zawartosc: { padding: 14, gap: 12 },
  karta: { borderRadius: 14, padding: 14, borderWidth: 1 },
  kartaTytul: { fontSize: 13, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  rzadAkcji: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btnMini: { width: 40, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnSek: { marginTop: 10, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  btnImport: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  btnImportTekst: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnZatwierdz: { paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  btnZatwierdzTekst: { color: '#fff', fontWeight: '800', fontSize: 15 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  presetBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minWidth: 96 },
});
