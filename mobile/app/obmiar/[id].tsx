// ============================================================
// OBMIAR PZT – podgląd (Maps) + konfiguracja L/P + układanie WZ
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
import { AnimatedTabBar } from '../../src/components/common/AnimatedTabBar';
import { WielokatPodglad } from '../../src/components/obmiar/WielokatPodglad';
import { ObmiarKonfiguracja } from '../../src/components/obmiar/ObmiarKonfiguracja';
import { lightTheme, darkTheme, type AppTheme } from '../../src/constants/theme';
import { useObmiarStore } from '../../src/stores/obmiarStore';
import { useMieszankiStore } from '../../src/stores/mieszankiStore';
import { useBudowyStore } from '../../src/stores/budowyStore';
import { useRouteId } from '../../src/hooks/useRouteId';
import { wybierzIParsujXfdf } from '../../src/utils/xfdfImport';
import { formatLiczby } from '../../src/utils/calculations';
import {
  bilansLiveObszaru, infoAutaWz, metryZTonnObszaru, obliczKontroleObszaru, przeliczMetryWz,
} from '../../src/utils/obmiarLive';
import { formatujKilometraz, odlegloscMiedzyWezlami, zAbsKilometraza } from '../../src/utils/obmiarFigura';
import { generujRaportObmiaruPDF } from '../../src/utils/pdfGenerator';
import {
  PRESETY_SKALI_PZT,
  skalaZMianownika,
  type TrybWyboruWezla,
} from '../../src/types';

export default function ObmiarDetailScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const id = useRouteId() ?? '';
  const {
    sesjaPoId, dodajObszaryZXfdf, przesunObszar, usunObszar, zmienSkale,
    ustawBazeObszaru, ustawOdsadzke, dodajOdsadzke, zastosujOdsadzkeLancucha,
    ustawKonfiguracjeZablokowana, ustawParametryUkladania, dodajWpisWz,
    usunWpisWz, edytujWpisWz, ustawKierunekUkladania, ustawKontynuacje,
    usunOdsadzke, ustawBudoweSesji, archiwizujSesje,
  } = useObmiarStore();
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const pobierzMieszanke = useMieszankiStore((s) => s.pobierzMieszanke);
  const { budowy } = useBudowyStore();
  const sesja = id ? sesjaPoId(id) : undefined;

  const [podgladId, setPodgladId] = useState<string | null>(null);
  const [modalSkala, setModalSkala] = useState(false);
  const [mianownikTekst, setMianownikTekst] = useState('500');
  const [trybWyboru, setTrybWyboru] = useState<TrybWyboruWezla | null>(null);
  const [aktywnaOdsadzkaId, setAktywnaOdsadzkaId] = useState<string | null>(null);
  const [mapaAktywna, setMapaAktywna] = useState(false);
  const [blokadaPodgladu, setBlokadaPodgladu] = useState(true);
  const [metryZAutaTekst, setMetryZAutaTekst] = useState('');
  const [metryOdStartuTekst, setMetryOdStartuTekst] = useState('');
  const [tonyTekst, setTonyTekst] = useState('');
  const [gruboscTekst, setGruboscTekst] = useState('');
  const [pickerMieszanka, setPickerMieszanka] = useState(false);
  const [pickerBudowa, setPickerBudowa] = useState(false);
  const [zakladkaUkladania, setZakladkaUkladania] = useState<'wz' | 'kontrola'>('wz');
  const [wbudowaneTonyStr, setWbudowaneTony] = useState('');
  const [przejechaneMetryStr, setPrzejechaneMetry] = useState('');
  const [generujeRaport, setGenerujeRaport] = useState(false);
  const [autoInfoId, setAutoInfoId] = useState<string | null>(null);
  const [edycjaWzId, setEdycjaWzId] = useState<string | null>(null);
  const [edycjaTony, setEdycjaTony] = useState('');
  const [edycjaMetryOdStartu, setEdycjaMetryOdStartu] = useState('');
  const [edycjaMetryZAuta, setEdycjaMetryZAuta] = useState('');
  const [pomiarP1, setPomiarP1] = useState<number | undefined>();
  const [pomiarP2, setPomiarP2] = useState<number | undefined>();

  const sumaPow = useMemo(
    () => sesja?.obszary.reduce((a, o) => a + o.powierzchniaM2, 0) ?? 0,
    [sesja],
  );
  const zrodla = useMemo(
    () => [...new Set(sesja?.obszary.map((o) => o.zrodloNazwa) ?? [])],
    [sesja],
  );

  const obszarPodgladu = useMemo(() => {
    if (!sesja) return undefined;
    return sesja.obszary.find((o) => o.id === podgladId) ?? sesja.obszary[0];
  }, [sesja, podgladId]);

  useEffect(() => {
    if (!obszarPodgladu) return;
    setGruboscTekst(obszarPodgladu.gruboscCm != null ? String(obszarPodgladu.gruboscCm) : '');
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

  const mieszanka = obszarPodgladu?.mieszankaId
    ? pobierzMieszanke(obszarPodgladu.mieszankaId) ?? mieszanki.find((m) => m.id === obszarPodgladu.mieszankaId)
    : undefined;
  const rho = mieszanka?.ciezarObjetosciowy ?? 2.4;

  const bilans = useMemo(
    () => (obszarPodgladu ? bilansLiveObszaru(obszarPodgladu, rho) : null),
    [obszarPodgladu, rho],
  );

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

  const autoInfo = useMemo(() => {
    if (!obszarPodgladu || !autoInfoId) return null;
    const wpis = obszarPodgladu.wpisyWz?.find((w) => w.id === autoInfoId);
    if (!wpis) return null;
    return infoAutaWz(obszarPodgladu, wpis, rho);
  }, [obszarPodgladu, autoInfoId, rho]);

  const ostMetry = useMemo(() => {
    const lista = obszarPodgladu?.wpisyWz ?? [];
    return lista[lista.length - 1]?.przejechaneMetry ?? 0;
  }, [obszarPodgladu?.wpisyWz]);

  const sugestiaWz = useMemo(() => {
    if (!obszarPodgladu) return null;
    const tony = parseFloat(tonyTekst.replace(',', '.'));
    if (!Number.isFinite(tony) || tony <= 0) return null;
    const tmp = { ...obszarPodgladu, gruboscCm: parseFloat(gruboscTekst.replace(',', '.')) || obszarPodgladu.gruboscCm };
    return metryZTonnObszaru(tmp, tony, rho);
  }, [obszarPodgladu, tonyTekst, gruboscTekst, rho]);

  useEffect(() => {
    if (!sugestiaWz) return;
    setMetryZAutaTekst(String(sugestiaWz.metryAuta));
    setMetryOdStartuTekst(String(sugestiaWz.metryOdStartu));
  }, [sugestiaWz?.metryAuta, sugestiaWz?.metryOdStartu]);

  const tonyK = parseFloat(wbudowaneTonyStr.replace(',', '.'));
  const metryK = parseFloat(przejechaneMetryStr.replace(',', '.'));
  const wynikiKontroli = useMemo(
    () => (obszarPodgladu && Number.isFinite(tonyK) && Number.isFinite(metryK)
      ? obliczKontroleObszaru(obszarPodgladu, tonyK, metryK, rho)
      : null),
    [obszarPodgladu, tonyK, metryK, rho],
  );
  const metryPlanowane = useMemo(() => {
    if (!obszarPodgladu || !Number.isFinite(tonyK) || tonyK <= 0) return null;
    const r = obliczKontroleObszaru(obszarPodgladu, tonyK, 0.01, rho);
    return r?.metryPlanowaneOdTonow ?? null;
  }, [obszarPodgladu, tonyK, rho]);

  const budowa = sesja?.budowaId ? budowy.find((b) => b.id === sesja.budowaId) : undefined;

  const onZmianaZAuta = (t: string) => {
    setMetryZAutaTekst(t);
    const n = parseFloat(t.replace(',', '.'));
    if (!Number.isFinite(n)) return;
    setMetryOdStartuTekst(String(przeliczMetryWz(ostMetry, 'zAuta', n).odStartu));
  };
  const onZmianaOdStartu = (t: string) => {
    setMetryOdStartuTekst(t);
    const n = parseFloat(t.replace(',', '.'));
    if (!Number.isFinite(n)) return;
    setMetryZAutaTekst(String(przeliczMetryWz(ostMetry, 'odStartu', n).zAuta));
  };

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
    if (ostatni) setPodgladId(ostatni.id);
    const suma = odswiezona?.obszary.reduce((a, o) => a + o.powierzchniaM2, 0) ?? 0;
    Alert.alert(
      'Zaimportowano',
      `Dodano ${wynik.wynik.polygony.length} obszar(ów).\nŁącznie w sesji: ${formatLiczby(suma)} m²`,
    );
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

  const zapiszWz = async () => {
    if (!obszarPodgladu) return;
    const tony = parseFloat(tonyTekst.replace(',', '.'));
    let metry = parseFloat(metryOdStartuTekst.replace(',', '.'));
    if (!Number.isFinite(tony)) {
      Alert.alert('WZ', 'Podaj tonaż z WZ.');
      return;
    }
    if (!Number.isFinite(metry) && sugestiaWz) metry = sugestiaWz.metryOdStartu;
    if (!Number.isFinite(metry)) {
      Alert.alert('WZ', 'Podaj tony i metry (z auta albo od startu).');
      return;
    }
    await dodajWpisWz(sesja.id, obszarPodgladu.id, { tony, przejechaneMetry: metry });
    setMetryZAutaTekst('');
    setMetryOdStartuTekst('');
    setTonyTekst('');
  };

  const zakonczIArchiwizuj = () => Alert.alert(
    'Zakończ i archiwizuj',
    'Raport WZ trafi do archiwum. Możesz wygenerować PDF do wysłania mailem.',
    [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Zakończ i wyślij raport',
        style: 'destructive',
        onPress: async () => {
          setGenerujeRaport(true);
          try {
            await generujRaportObmiaruPDF({
              sesja,
              mieszanki,
              budowa: budowa ? { kodBudowy: budowa.kodBudowy, nazwaInwestycji: budowa.nazwaInwestycji } : undefined,
            });
            await archiwizujSesje(sesja.id);
            router.replace(`/archiwum/obmiar/${sesja.id}` as any);
          } catch {
            Alert.alert('Uwaga', 'Sesja zarchiwizowana, ale nie udało się wygenerować PDF.');
            await archiwizujSesje(sesja.id);
            router.replace(`/archiwum/obmiar/${sesja.id}` as any);
          } finally {
            setGenerujeRaport(false);
          }
        },
      },
      {
        text: 'Tylko archiwizuj',
        onPress: async () => {
          await archiwizujSesje(sesja.id);
          router.replace(`/archiwum/obmiar/${sesja.id}` as any);
        },
      },
    ],
  );

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
        scrollEnabled={!blokadaPodgladu && !mapaAktywna}
      >
        <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>Sesja dnia</Text>
          <Row label="Data" v={sesja.data} theme={theme} />
          <Row label="Skala" v={`1:${sesja.skala.mianownik} (${sesja.skala.metryNaCm} m / cm)`} theme={theme} />
          <Row label="Łączna powierzchnia" v={`${formatLiczby(sumaPow)} m²`} theme={theme} bold />
          <Row label="Obszary" v={String(sesja.obszary.length)} theme={theme} />
          {zrodla.length > 0 && (
            <Row label="Źródła XFDF" v={zrodla.join(' · ')} theme={theme} />
          )}
          <TouchableOpacity
            style={[styles.btnSek, { borderColor: theme.colors.border, marginTop: 8 }]}
            onPress={() => setPickerBudowa(true)}
          >
            <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
              {budowa ? `${budowa.kodBudowy} – ${budowa.nazwaInwestycji}` : 'Przypisz budowę'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnSek, { borderColor: theme.colors.primary }]}
            onPress={() => {
              setMianownikTekst(String(sesja.skala.mianownik));
              setModalSkala(true);
            }}
          >
            <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Ustaw skalę</Text>
          </TouchableOpacity>
        </View>

        {obszarPodgladu && (
          <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>
              Podgląd · {obszarPodgladu.kolejnosc}. {obszarPodgladu.nazwa}
            </Text>
            <WielokatPodglad
              wierzcholki={obszarPodgladu.wierzcholkiM}
              wezly={obszarPodgladu.wezlyRole}
              kolorWypelnienia={obszarPodgladu.kolorWypelnienia}
              postepLive={bilans?.postep ?? 0}
              wysokosc={320}
              etykieta={`${formatLiczby(obszarPodgladu.powierzchniaM2)} m²`}
              resetKlucz={obszarPodgladu.id}
              onPressWezel={onWezel}
              obszar={obszarPodgladu}
              pokazMaszyny
              trybWyboru={trybWyboru}
              idxPodswietlone={idxPodswietlone}
              onPressAuto={(wpisId) => setAutoInfoId(wpisId)}
              onDotykZmiana={setMapaAktywna}
              blokadaPodgladu={blokadaPodgladu}
              onBlokadaPodgladu={setBlokadaPodgladu}
            />
          </View>
        )}

        {obszarPodgladu && (
          <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <ObmiarKonfiguracja
              obszar={obszarPodgladu}
              theme={theme}
              trybWyboru={trybWyboru}
              onTryb={(t, oid) => {
                setMapaAktywna(false);
                setTrybWyboru(t);
                if (oid) setAktywnaOdsadzkaId(oid);
              }}
              zablokowana={!!obszarPodgladu.konfiguracjaZablokowana}
              onBlokada={(v) => ustawKonfiguracjeZablokowana(sesja.id, obszarPodgladu.id, v)}
              onBaza={(ktora, dane) => ustawBazeObszaru(sesja.id, obszarPodgladu.id, ktora, dane)}
              onKierunek={(k) => ustawKierunekUkladania(sesja.id, obszarPodgladu.id, k)}
              onDodajOdsadzke={async () => {
                const nid = await dodajOdsadzke(sesja.id, obszarPodgladu.id);
                if (nid) setAktywnaOdsadzkaId(nid);
              }}
              onZastosujOdsadzke={async (odsadzkaId, dystansM, extra) => {
                const w = await zastosujOdsadzkeLancucha(sesja.id, obszarPodgladu.id, odsadzkaId, dystansM, extra);
                if (w) {
                  Alert.alert(
                    'Odsadzka',
                    `Δ powierzchnia ${w.deltaPowierzchniaM2 >= 0 ? '+' : ''}${w.deltaPowierzchniaM2} m²\nNowa: ${w.powierzchniaM2} m²`,
                  );
                } else {
                  Alert.alert(
                    'Odsadzka',
                    'Nie udało się zastosować. Ustaw start/koniec L i P, zaznacz węzły albo podaj stronę i kilometraż odcinka.',
                  );
                }
              }}
              onUsunOdsadzke={(id) => usunOdsadzke(sesja.id, obszarPodgladu.id, id)}
              pomiar={pomiar}
            />
          </View>
        )}

        {obszarPodgladu && (
          <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, paddingBottom: 8 }]}>
            <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>Układanie</Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
              Recepta (ρ) i grubość jak w Zaplanuj masę. WZ zapiszesz jako raport w archiwum.
            </Text>
            <TouchableOpacity
              style={[styles.btnSek, { borderColor: theme.colors.border, marginTop: 0 }]}
              onPress={() => setPickerMieszanka(true)}
            >
              <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
                {mieszanka
                  ? `${mieszanka.rodzaj}${mieszanka.nrRecepty ? ` · ${mieszanka.nrRecepty}` : ''} · ρ ${mieszanka.ciezarObjetosciowy.toFixed(3)}`
                  : 'Wybierz receptę / mieszankę'}
              </Text>
            </TouchableOpacity>
            <View style={[styles.polaRzad, { marginTop: 10 }]}>
              <Pole
                label="Grubość [cm]"
                value={gruboscTekst}
                onChange={setGruboscTekst}
                theme={theme}
                onBlur={() => {
                  const g = parseFloat(gruboscTekst.replace(',', '.'));
                  ustawParametryUkladania(sesja.id, obszarPodgladu.id, {
                    gruboscCm: Number.isFinite(g) ? g : undefined,
                  });
                }}
              />
            </View>

            <AnimatedTabBar
              tabs={[{ id: 'wz', etykieta: 'WZ' }, { id: 'kontrola', etykieta: 'Kontrola' }]}
              aktywnaId={zakladkaUkladania}
              onChange={(id) => setZakladkaUkladania(id as 'wz' | 'kontrola')}
              style={{ marginHorizontal: -14, marginTop: 12 }}
            />

            {zakladkaUkladania === 'wz' && (
              <View style={{ paddingTop: 12 }}>
                <Pole label="Tony z WZ [Mg]" value={tonyTekst} onChange={setTonyTekst} theme={theme} />
                <View style={{ height: 8 }} />
                <Pole label="Metry z danego auta [m]" value={metryZAutaTekst} onChange={onZmianaZAuta} theme={theme} />
                <View style={{ height: 8 }} />
                <Pole label="Odległość od startu [m]" value={metryOdStartuTekst} onChange={onZmianaOdStartu} theme={theme} />
                {sugestiaWz && (
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 8 }}>
                    Sugerowane: {formatLiczby(sugestiaWz.metryAuta)} m z tego auta · {formatLiczby(sugestiaWz.metryOdStartu)} m od startu
                    {(() => {
                      const startAbs = (obszarPodgladu.bazaStart?.kilometrazKm ?? 0) * 1000
                        + (obszarPodgladu.bazaStart?.kilometrazM ?? 0);
                      const abs = obszarPodgladu.kierunekUkladania === 'malejacy'
                        ? startAbs - sugestiaWz.metryOdStartu
                        : startAbs + sugestiaWz.metryOdStartu;
                      const k = zAbsKilometraza(abs);
                      return ` · ${formatujKilometraz(k.km, k.m)}`;
                    })()}
                  </Text>
                )}
                <TouchableOpacity
                  style={[styles.btnSek, { borderColor: theme.colors.success, marginTop: 8 }]}
                  onPress={zapiszWz}
                >
                  <Text style={{ color: theme.colors.success, fontWeight: '700' }}>Dodaj auto z WZ</Text>
                </TouchableOpacity>
                {bilans && (
                  <View style={{ marginTop: 10, gap: 2 }}>
                    <Row label="Długość układania" v={`${formatLiczby(bilans.dlugoscM)} m`} theme={theme} />
                    <Row label="Postęp" v={`${formatLiczby(bilans.postep * 100)} %`} theme={theme} bold />
                    <Row label="Zakryte" v={`${formatLiczby(bilans.zakrytaPowierzchniaM2)} m²`} theme={theme} />
                    <Row label="Pozostało" v={`${formatLiczby(bilans.pozostaloMetrow)} m · ${formatLiczby(bilans.pozostaloM2)} m²`} theme={theme} />
                    {bilans.sredniaGruboscCm != null && (
                      <Row label="Śr. grubość" v={`${formatLiczby(bilans.sredniaGruboscCm)} cm`} theme={theme} />
                    )}
                    {bilans.pozostaloMgPrzyGrubosci != null && (
                      <Row label="Pozostało Mg" v={`${formatLiczby(bilans.pozostaloMgPrzyGrubosci)} Mg`} theme={theme} />
                    )}
                  </View>
                )}
                {(obszarPodgladu.wpisyWz ?? []).map((w) => {
                  const info = infoAutaWz(obszarPodgladu, w, rho);
                  return (
                    <View
                      key={w.id}
                      style={{
                        marginTop: 8,
                        paddingVertical: 8,
                        paddingHorizontal: 4,
                        borderTopWidth: 1,
                        borderColor: theme.colors.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <TouchableOpacity style={{ flex: 1 }} onPress={() => setAutoInfoId(w.id)}>
                        <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
                          Auto #{w.numer} · {formatLiczby(w.tony)} Mg · {formatLiczby(w.przejechaneMetry)} m
                        </Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                          Z tego auta {formatLiczby(info.metryTegoAuta)} m
                          {info.gruboscCm != null ? ` · Gr. ${formatLiczby(info.gruboscCm)} cm` : ''}
                          {' · '}{formatLiczby(info.powierzchniaM2)} m²
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          const lista = obszarPodgladu.wpisyWz ?? [];
                          const idx = lista.findIndex((x) => x.id === w.id);
                          const ostPrev = idx > 0 ? lista[idx - 1].przejechaneMetry : 0;
                          setEdycjaWzId(w.id);
                          setEdycjaTony(String(w.tony));
                          setEdycjaMetryOdStartu(String(w.przejechaneMetry));
                          setEdycjaMetryZAuta(String(przeliczMetryWz(ostPrev, 'odStartu', w.przejechaneMetry).zAuta));
                        }}
                        style={[styles.btnMini, { backgroundColor: `${theme.colors.info}22` }]}
                      >
                        <Text style={{ color: theme.colors.info, fontWeight: '700' }}>✎</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => Alert.alert('Usuń auto', `Usunąć auto #${w.numer}? Postęp i grubość liczone od ostatniego pozostałego WZ.`, [
                          { text: 'Anuluj', style: 'cancel' },
                          { text: 'Usuń', style: 'destructive', onPress: () => usunWpisWz(sesja.id, obszarPodgladu.id, w.id) },
                        ])}
                        style={[styles.btnMini, { backgroundColor: `${theme.colors.danger}20` }]}
                      >
                        <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
                <TouchableOpacity
                  style={[styles.btnArchiwum, { backgroundColor: theme.colors.danger }]}
                  onPress={zakonczIArchiwizuj}
                  disabled={generujeRaport}
                >
                  {generujeRaport
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnArchiwumTekst}>Zakończ i archiwizuj</Text>}
                </TouchableOpacity>
              </View>
            )}

            {zakladkaUkladania === 'kontrola' && (
              <View style={{ paddingTop: 12 }}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 10 }}>
                  Wpisz łączne tony i metry od startu obszaru – program pokaże pozycję i bilans.
                </Text>
                <NumInput label="Wbudowane tony [Mg]" value={wbudowaneTonyStr} onChange={setWbudowaneTony} theme={theme} />
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 5 }}>Gdzie powinniśmy dojechać</Text>
                  <View style={[styles.poleSzare, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
                      {metryPlanowane != null ? `${formatLiczby(metryPlanowane)} m od startu` : '— wpisz tony powyżej —'}
                    </Text>
                  </View>
                </View>
                <NumInput label="Przejechane metry [m] od startu" value={przejechaneMetryStr} onChange={setPrzejechaneMetry} theme={theme} />
                {wynikiKontroli ? (
                  <View style={styles.wynikKontroli}>
                    <Text style={[styles.wynikNagl, { color: theme.colors.text, borderBottomColor: theme.colors.border }]}>Wyniki porównania:</Text>
                    <WynikRow label="Pozycja na obszarze" wartosc={wynikiKontroli.lokalizacjaEtykieta} theme={theme} />
                    <WynikRow label="Metry od startu (fakt)" wartosc={`${formatLiczby(metryK)} m`} theme={theme} />
                    <WynikRow label="Metry od startu (wg ton)" wartosc={`${formatLiczby(wynikiKontroli.metryPlanowaneOdTonow)} m`} theme={theme} />
                    <WynikRow label="Zakryta powierzchnia" wartosc={`${formatLiczby(wynikiKontroli.zakrytaPowierzchnia)} m²`} theme={theme} />
                    <WynikRow label="Uzyskana grubość" wartosc={`${formatLiczby(wynikiKontroli.uzyskanaGrubosc)} cm`} theme={theme} />
                    <WynikRowBilans bilans={wynikiKontroli.bilansMasy} theme={theme} />
                    <View style={[styles.sep, { backgroundColor: theme.colors.border }]} />
                    <WynikRow label="Do końca metrów (plan)" wartosc={`${formatLiczby(wynikiKontroli.pozostaloMetrow)} m`} theme={theme} />
                    <WynikRow label="Do wbudowania pow." wartosc={`${formatLiczby(wynikiKontroli.pozostaloPowierzchni)} m²`} theme={theme} />
                    <WynikRow label={`Do wbudowania wg planu (${formatLiczby(wynikiKontroli.sredniaGruboscPlanu)} cm)`} wartosc={`${formatLiczby(wynikiKontroli.pozostaloMasyWgZalozen, 2)} Mg`} theme={theme} />
                    <WynikRow label={`Do wbudowania wg śr. (${formatLiczby(wynikiKontroli.uzyskanaGrubosc, 2)} cm)`} wartosc={`${formatLiczby(wynikiKontroli.pozostaloMasyWgSredniej, 2)} Mg`} theme={theme} />
                  </View>
                ) : (
                  <View style={[styles.wynikPuste, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                      Wpisz tony i metry od startu, aby zobaczyć porównanie.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        <Text style={[styles.kartaTytul, { color: theme.colors.text, marginLeft: 4 }]}>
          Kolejność układania
        </Text>

        {sesja.obszary.length === 0 ? (
          <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
              Brak obszarów. Naciśnij „+ XFDF” i wybierz eksport komentarzy z PDF-XChange.
            </Text>
          </View>
        ) : (
          [...sesja.obszary].sort((a, b) => a.kolejnosc - b.kolejnosc).map((o) => (
            <View
              key={o.id}
              style={[
                styles.karta,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: obszarPodgladu?.id === o.id ? theme.colors.success : theme.colors.border,
                  borderWidth: obszarPodgladu?.id === o.id ? 2 : 1,
                },
              ]}
            >
              <TouchableOpacity onPress={() => setPodgladId(o.id)}>
                <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 14 }}>
                  {o.kolejnosc}. {o.nazwa}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                  {formatLiczby(o.powierzchniaM2)} m² · obwód {formatLiczby(o.obwodM)} m · {o.wierzcholkiPdf.length} węzłów
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                  {o.zrodloNazwa}
                </Text>
                {o.bazaStart?.kilometrazKm != null || o.kilometrazStartKm != null ? (
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                    {formatujKilometraz(o.bazaStart?.kilometrazKm ?? o.kilometrazStartKm, o.bazaStart?.kilometrazM ?? o.kilometrazStartM)}
                    {' → '}
                    {formatujKilometraz(o.bazaKoniec?.kilometrazKm ?? o.kilometrazKoniecKm, o.bazaKoniec?.kilometrazM ?? o.kilometrazKoniecM)}
                  </Text>
                ) : null}
              </TouchableOpacity>
              {o.kolejnosc > 1 && (
                <TouchableOpacity
                  onPress={() => ustawKontynuacje(sesja.id, o.id, !o.kontynuacjaPoprzedniego)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}
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
                    Kontynuacja poprzedniego (start = koniec poprzedniego obszaru)
                  </Text>
                </TouchableOpacity>
              )}
              <View style={styles.rzadAkcji}>
                <TouchableOpacity
                  style={[styles.btnMini, { backgroundColor: `${theme.colors.primary}20` }]}
                  onPress={() => przesunObszar(sesja.id, o.id, -1)}
                >
                  <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>↑</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnMini, { backgroundColor: `${theme.colors.primary}20` }]}
                  onPress={() => przesunObszar(sesja.id, o.id, 1)}
                >
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
            </View>
          ))
        )}

        <TouchableOpacity
          style={[styles.btnImport, { backgroundColor: theme.colors.success }]}
          onPress={importuj}
        >
          <Text style={styles.btnImportTekst}>+ Importuj kolejny XFDF</Text>
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
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
            Przy skali 1:500 → 1 cm na papierze = 5 m w terenie. Zmiana przelicza powierzchnię wszystkich obszarów.
          </Text>
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
            placeholder="np. 500"
            placeholderTextColor={theme.colors.textSecondary}
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

      <SafeModal
        visible={!!autoInfo}
        tytul={autoInfo ? `Auto #${autoInfo.numer}` : 'Auto'}
        theme={theme}
        onClose={() => setAutoInfoId(null)}
        lewy={{ tekst: 'Zamknij', onPress: () => setAutoInfoId(null), kolor: theme.colors.textSecondary }}
      >
        {autoInfo && (
          <View style={{ padding: 16, gap: 6 }}>
            <Row label="Odległość (to auto)" v={`${formatLiczby(autoInfo.metryTegoAuta)} m`} theme={theme} />
            <Row label="Od startu" v={`${formatLiczby(autoInfo.przejechaneMetry)} m`} theme={theme} />
            <Row label="Powierzchnia" v={`${formatLiczby(autoInfo.powierzchniaM2)} m²`} theme={theme} />
            <Row label="Grubość" v={autoInfo.gruboscCm != null ? `${formatLiczby(autoInfo.gruboscCm)} cm` : '—'} theme={theme} />
            <Row label="Tony" v={`${formatLiczby(autoInfo.tony)} Mg`} theme={theme} />
            <Row label="Pozostało do końca" v={autoInfo.pozostaloMg != null ? `${formatLiczby(autoInfo.pozostaloMg)} Mg` : '—'} theme={theme} bold />
          </View>
        )}
      </SafeModal>

      <SafeModal
        visible={!!edycjaWzId}
        tytul="Edytuj auto WZ"
        theme={theme}
        onClose={() => setEdycjaWzId(null)}
        lewy={{ tekst: 'Anuluj', onPress: () => setEdycjaWzId(null), kolor: theme.colors.textSecondary }}
        prawy={{
          tekst: 'Zapisz',
          onPress: async () => {
            if (!obszarPodgladu || !edycjaWzId) return;
            const tony = parseFloat(edycjaTony.replace(',', '.'));
            const metry = parseFloat(edycjaMetryOdStartu.replace(',', '.'));
            if (!Number.isFinite(tony) || !Number.isFinite(metry)) {
              Alert.alert('WZ', 'Podaj tony i metry.');
              return;
            }
            await edytujWpisWz(sesja.id, obszarPodgladu.id, edycjaWzId, { tony, przejechaneMetry: metry });
            setEdycjaWzId(null);
          },
          kolor: theme.colors.primary,
        }}
      >
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
            Po zapisie postęp i grubość liczone są od ostatniego WZ. Grubość tego auta jak w LIVE.
          </Text>
          <View style={{ gap: 10 }}>
            <Pole label="Tony [Mg]" value={edycjaTony} onChange={setEdycjaTony} theme={theme} />
            <Pole
              label="Metry z danego auta [m]"
              value={edycjaMetryZAuta}
              onChange={(t) => {
                setEdycjaMetryZAuta(t);
                const lista = obszarPodgladu?.wpisyWz ?? [];
                const idx = lista.findIndex((x) => x.id === edycjaWzId);
                const ostPrev = idx > 0 ? lista[idx - 1].przejechaneMetry : 0;
                const n = parseFloat(t.replace(',', '.'));
                if (Number.isFinite(n)) setEdycjaMetryOdStartu(String(przeliczMetryWz(ostPrev, 'zAuta', n).odStartu));
              }}
              theme={theme}
            />
            <Pole
              label="Odległość od startu [m]"
              value={edycjaMetryOdStartu}
              onChange={(t) => {
                setEdycjaMetryOdStartu(t);
                const lista = obszarPodgladu?.wpisyWz ?? [];
                const idx = lista.findIndex((x) => x.id === edycjaWzId);
                const ostPrev = idx > 0 ? lista[idx - 1].przejechaneMetry : 0;
                const n = parseFloat(t.replace(',', '.'));
                if (Number.isFinite(n)) setEdycjaMetryZAuta(String(przeliczMetryWz(ostPrev, 'odStartu', n).zAuta));
              }}
              theme={theme}
            />
          </View>
        </View>
      </SafeModal>
    </View>
  );
}

function Row({
  label, v, theme, bold,
}: {
  label: string; v: string; theme: AppTheme; bold?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: 8 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: bold ? '700' : '400', flexShrink: 1, textAlign: 'right' }}>{v}</Text>
    </View>
  );
}

function Pole({
  label, value, onChange, theme, onBlur,
}: {
  label: string; value: string; onChange: (t: string) => void; theme: AppTheme; onBlur?: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={theme.colors.textSecondary}
        style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.inputBackground }]}
      />
    </View>
  );
}

function NumInput({ label, value, onChange, theme }: { label: string; value: string; onChange: (v: string) => void; theme: AppTheme }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 5 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.replace(',', '.'))}
        keyboardType="decimal-pad"
        placeholderTextColor={theme.colors.textSecondary}
        style={{
          borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16,
          backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text,
        }}
      />
    </View>
  );
}

function WynikRow({ label, wartosc, theme }: { label: string; wartosc: string; theme: AppTheme }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{wartosc}</Text>
    </View>
  );
}

function WynikRowBilans({ bilans, theme }: { bilans: number; theme: AppTheme }) {
  const czyOszczednosc = bilans < 0;
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8,
      backgroundColor: czyOszczednosc ? `${theme.colors.success}20` : `${theme.colors.danger}20`, marginVertical: 4,
    }}>
      <Text style={{ color: czyOszczednosc ? theme.colors.success : theme.colors.danger, fontSize: 13, fontWeight: '600' }}>
        Bilans {czyOszczednosc ? '(oszczędność)' : '(przepał)'}
      </Text>
      <Text style={{ color: czyOszczednosc ? theme.colors.success : theme.colors.danger, fontSize: 13, fontWeight: '700' }}>
        {bilans > 0 ? '+' : ''}{formatLiczby(bilans, 2)} Mg
      </Text>
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
  btnArchiwum: { paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  btnArchiwumTekst: { color: '#fff', fontWeight: '700', fontSize: 15 },
  polaRzad: { flexDirection: 'row', gap: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  presetBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minWidth: 96 },
  poleSzare: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  wynikKontroli: { marginTop: 14 },
  wynikNagl: { fontSize: 14, fontWeight: '700', borderBottomWidth: 1, paddingBottom: 8, marginBottom: 8 },
  wynikPuste: { borderWidth: 1, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 16 },
  sep: { height: 1, marginVertical: 10 },
});
