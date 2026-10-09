import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Platform, TextInput, Alert,
} from 'react-native';
import type { AppTheme } from '../../constants/theme';
import type { ProjektBudowy } from '../../types';
import { PztArkuszPodglad } from './PztArkuszPodglad';
import { PrzyciskImportuXfdf } from './PrzyciskImportuXfdf';
import { PoleKilometraz, parsujPolaKilometraza, polaZKilometraza } from '../common/PoleKilometraz';
import { parsujWebFileList, wybierzIParsujWieleXfdf } from '../../utils/xfdfImport';
import {
  dodajArkuszeDoProjektu,
  etykietaZakladkiArkusza,
  formatujKmM,
  komunikatPoImporcieXfdf,
  podsumowanieDlugosciArkusza,
  podsumowanieOsiTrasy,
  przesunArkusz,
  przeliczProjektPoZmianieKm,
  usunArkusz,
  ustawTloArkusza,
  zastosujKilometrazArkuszy,
  zmienNazweArkusza,
} from '../../utils/projektBudowy';
import { MMA_WEB_BUILD } from '../../constants/version';
import { karta } from '../../constants/layout';
import { Z_METROW_BIEZACYCH } from '../../constants';
import type { WynikParsowaniaXfdf } from '../../utils/xfdfParser';
import type { TloArkuszaPzt } from '../../types';
import { SafeModal } from '../common/SafeModal';
import { InfoTooltip } from '../common/InfoTooltip';
import {
  dopasujPdfDoArkuszy,
  listaWgranychPdf,
  odpinBuforTlaArkusza,
  odtworzTlaZIdb,
  podlaczBuforDoArkusza,
  przypnijWgranyPdfDoArkusza,
  usunWgranyPdf,
  ustawBuforTla,
  zapiszBuforPliku,
} from '../../utils/tloPdfPamiec';
import { CALY_PZT_ID, scalPztDoArkusza } from '../../utils/pztPloter';
import { dlugoscPolilinii } from '../../utils/osPzt';
import { wymiaryStronyPdf } from '../../utils/pdfjsWeb';
import type { PlikWebImport } from './PrzyciskImportuXfdf';

interface Props {
  projekt: ProjektBudowy;
  theme: AppTheme;
  onZmien: (p: ProjektBudowy) => void;
  blokadaPodgladu?: boolean;
  onBlokadaPodgladu?: (v: boolean) => void;
  onDotykZmiana?: (aktywny: boolean) => void;
}

function potwierdzWeb(pytanie: string): boolean {
  if (typeof window !== 'undefined') return window.confirm(pytanie);
  return true;
}

function tekstPikietazuOsi(os: ReturnType<typeof podsumowanieOsiTrasy>): string {
  if (os.nEtykiet === os.nArkuszy && os.nEtykiet > 0) {
    return `Pikietaż = suma długości osi z XFDF (${os.nArkuszy} ark. = ${os.kmM.toLocaleString('pl-PL', { maximumFractionDigits: 2 })} m).`;
  }
  if (os.nEtykiet === 0) {
    return 'Nie odczytano wymiaru osi z XFDF (np. „422,07 m” na kresce). Wgraj te same XFDF ponownie — program podmieni arkusze w pamięci przeglądarki.';
  }
  return `Wymiar osi odczytany na ${os.nEtykiet}/${os.nArkuszy} ark. Wgraj XFDF ponownie, żeby pikietaż był pełną długością osi.`;
}

function pokazKomunikat(tytul: string, tresc: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${tytul}\n\n${tresc}`);
    return;
  }
  Alert.alert(tytul, tresc);
}

export function SekcjaPzt({
  projekt, theme, onZmien, blokadaPodgladu = false, onBlokadaPodgladu, onDotykZmiana,
}: Props) {
  const [arkuszId, setArkuszId] = useState<string>(CALY_PZT_ID);
  const [busy, setBusy] = useState(false);
  const [blad, setBlad] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [kolejnoscOtwarta, setKolejnoscOtwarta] = useState(false);
  const [tlaWersja, setTlaWersja] = useState(0);
  const [konfiguratorTla, setKonfiguratorTla] = useState(false);
  const startInit = polaZKilometraza(
    Z_METROW_BIEZACYCH(projekt.kilometrazPoczatkowyM).km,
    Z_METROW_BIEZACYCH(projekt.kilometrazPoczatkowyM).m,
  );
  const [kmStr, setKmStr] = useState(startInit.km);
  const [mStr, setMStr] = useState(startInit.m);
  const [podzStr, setPodzStr] = useState(String(projekt.podzialkaKilometrazuM ?? 50));
  const aktywny = projekt.arkusze.find((a) => a.id === arkuszId) ?? (
    arkuszId === CALY_PZT_ID ? undefined : projekt.arkusze[0]
  );
  const widokCaly = arkuszId === CALY_PZT_ID || (!aktywny && projekt.arkusze.length > 0);
  const calyArkusz = useMemo(
    () => (projekt.arkusze.length > 0 ? scalPztDoArkusza(projekt.arkusze) : null),
    [projekt.arkusze],
  );
  const idxAktywny = aktywny ? projekt.arkusze.findIndex((a) => a.id === aktywny.id) : -1;
  const kmKoniecTrasy = projekt.arkusze[projekt.arkusze.length - 1]?.kilometrazKoncowyM;
  const sumaOsi = podsumowanieOsiTrasy(projekt);
  const dlAkt = aktywny ? podsumowanieDlugosciArkusza(aktywny) : null;
  const kluczPikietazu = `${projekt.kilometrazPoczatkowyM}|${projekt.arkusze.length}|${sumaOsi.nEtykiet}|${sumaOsi.etykietyM}|${sumaOsi.kmM}`;
  useEffect(() => {
    if (projekt.arkusze.length === 0) return;
    const next = przeliczProjektPoZmianieKm(projekt);
      const dlGeom = (a?: typeof next.arkusze[number]) => {
        const os = a?.osTrasy?.wierzcholkiM;
        return os && os.length >= 2 ? dlugoscPolilinii(os) : 0;
      };
      const zmiana = next.arkusze.some((a, i) => {
      const stary = projekt.arkusze[i];
      return !stary
        || Math.abs(a.kilometrazKoncowyM - stary.kilometrazKoncowyM) > 0.05
        || Math.abs(a.kilometrazPoczatkowyM - stary.kilometrazPoczatkowyM) > 0.05
        || Math.abs(dlGeom(a) - dlGeom(stary)) > 0.05;
    });
    if (zmiana) onZmien(next);
    // Przelicza pikietaż z sumy osi XFDF (kasuje stare rozciągnięcie do 116+031).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kluczPikietazu]);

  useEffect(() => {
    let zyje = true;
    void (async () => {
      const n = await odtworzTlaZIdb();
      if (!zyje || n === 0) return;
      let next = projekt;
      let zmieniono = false;
      for (const a of projekt.arkusze) {
        if (a.tlo?.nazwa) podlaczBuforDoArkusza(a.id, a.tlo.nazwa);
      }
      const nazwy = listaWgranychPdf().map((x) => x.nazwa);
      const mapa = dopasujPdfDoArkuszy(projekt.arkusze, nazwy);
      for (const [id, nazwa] of mapa) {
        const buf = przypnijWgranyPdfDoArkusza(id, nazwa);
        if (!buf) continue;
        const ark = next.arkusze.find((a) => a.id === id);
        if (!ark?.tlo) {
          next = ustawTloArkusza(next, id, {
            nazwa: buf.nazwa,
            pageW: buf.pageW,
            pageH: buf.pageH,
            strona: buf.strona,
            widoczne: true,
            opacity: 1,
          });
          zmieniono = true;
        }
      }
      setTlaWersja((v) => v + 1);
      if (zmieniono) onZmien(next);
    })();
    return () => { zyje = false; };
    // Odtworzenie teł po odświeżeniu strony – raz na montaż.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const przypnijPdfs = async (
    proj: ProjektBudowy,
    files: PlikWebImport[],
    preferId?: string,
    wymienAktywny = false,
  ): Promise<ProjektBudowy> => {
    const pdfs = files.filter((f) => /\.pdf$/i.test(f.name));
    if (pdfs.length === 0) return proj;
    if (Platform.OS !== 'web') {
      pokazKomunikat('Tło PDF', 'Nakładanie oryginalnego PDF jest dostępne w przeglądarce (GitHub Pages).');
      return proj;
    }
    let next = proj;
    const bufory = new Map<string, Awaited<ReturnType<typeof wymiaryStronyPdf>> & { data: Uint8Array; nazwa: string }>();
    for (const f of pdfs) {
      const data = new Uint8Array(await f.arrayBuffer());
      const wym = await wymiaryStronyPdf(data, 1);
      const b = { ...wym, data, nazwa: f.name };
      bufory.set(f.name, b);
      zapiszBuforPliku({
        data: b.data,
        nazwa: b.nazwa,
        pageW: b.pageW,
        pageH: b.pageH,
        strona: 1,
      });
    }
    const mapa = dopasujPdfDoArkuszy(next.arkusze, pdfs.map((f) => f.name));
    const zajete = new Set(mapa.values());
    const wolnePdf = pdfs.filter((f) => !zajete.has(f.name));
    const bezTla = [...next.arkusze.filter((a) => !mapa.has(a.id) && !a.tlo)]
      .sort((a, b) => (a.id === preferId ? -1 : b.id === preferId ? 1 : 0));
    for (let i = 0; i < wolnePdf.length && i < bezTla.length; i++) {
      mapa.set(bezTla[i].id, wolnePdf[i].name);
    }
    if (wymienAktywny && preferId && pdfs.length === 1) {
      mapa.set(preferId, pdfs[0].name);
    }
    let ile = 0;
    for (const [arkId, nazwa] of mapa) {
      const b = bufory.get(nazwa);
      if (!b) continue;
      ustawBuforTla(arkId, {
        data: b.data,
        nazwa: b.nazwa,
        pageW: b.pageW,
        pageH: b.pageH,
        strona: 1,
      });
      const tlo: TloArkuszaPzt = {
        nazwa: b.nazwa,
        pageW: b.pageW,
        pageH: b.pageH,
        strona: 1,
        widoczne: true,
        opacity: 1,
      };
      next = ustawTloArkusza(next, arkId, tlo);
      ile += 1;
    }
    setTlaWersja((n) => n + 1);
    const nieprzypisane = pdfs.length - ile;
    if (ile > 0 && nieprzypisane > 0) {
      setInfo(`Nałożono tło na ${ile} arkusz(y). ${nieprzypisane} PDF bez pary – otwórz konfigurator teł.`);
      setKonfiguratorTla(true);
    } else if (ile > 0) {
      setInfo(`Nałożono tło PDF na ${ile} arkusz(y).`);
    } else {
      setInfo('PDF zapisano w konfiguratorze teł. Przypisz do arkusza albo usuń zbędny plik.');
      setKonfiguratorTla(true);
    }
    return next;
  };

  const zastosujWynik = (
    r: { sukces: true; wyniki: WynikParsowaniaXfdf[]; pominiete: string[] } | { sukces: false; blad: string },
  ) => {
    if (!r.sukces) {
      if (!r.blad.includes('Anulowano')) {
        setBlad(r.blad);
        setInfo(null);
        pokazKomunikat('Import XFDF', r.blad);
      }
      return;
    }
    setBlad(null);
    const next = dodajArkuszeDoProjektu(projekt, r.wyniki);
    onZmien(next);
    setArkuszId(next.arkusze.length > 1 ? CALY_PZT_ID : (next.arkusze[0]?.id ?? CALY_PZT_ID));
    setInfo(komunikatPoImporcieXfdf(projekt, next, r.wyniki.map((w) => w.zrodloNazwa)));
    if (r.pominiete.length > 0) {
      const msg = r.pominiete.slice(0, 6).join('\n');
      setBlad(msg);
      pokazKomunikat('Część plików pominięto', msg);
    }
  };

  const importujNative = async () => {
    setBusy(true);
    setBlad(null);
    try {
      zastosujWynik(await wybierzIParsujWieleXfdf());
    } finally {
      setBusy(false);
    }
  };

  const importujWeb = async (lista: PlikWebImport[]) => {
    setBusy(true);
    setBlad(null);
    const xfdf = lista.filter((f) => !/\.pdf$/i.test(f.name));
    const pdfs = lista.filter((f) => /\.pdf$/i.test(f.name));
    setInfo(`Wczytywanie ${lista.length} plik(ów)…`);
    try {
      let next = projekt;
      if (xfdf.length > 0) {
        const r = await parsujWebFileList(xfdf);
        if (!r.sukces) {
          if (!r.blad.includes('Anulowano')) {
            setBlad(r.blad);
            setInfo(null);
            pokazKomunikat('Import XFDF', r.blad);
          }
          return;
        }
        next = dodajArkuszeDoProjektu(projekt, r.wyniki);
        setArkuszId(next.arkusze.length > 1 ? CALY_PZT_ID : (next.arkusze[0]?.id ?? CALY_PZT_ID));
        setInfo(komunikatPoImporcieXfdf(projekt, next, r.wyniki.map((w) => w.zrodloNazwa)));
        if (r.pominiete.length > 0) {
          const msg = r.pominiete.slice(0, 6).join('\n');
          setBlad(msg);
          pokazKomunikat('Część plików pominięto', msg);
        }
      }
      if (pdfs.length > 0) {
        next = await przypnijPdfs(next, pdfs, arkuszId, xfdf.length === 0);
      }
      onZmien(next);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Nie udało się wczytać plików.';
      setBlad(msg);
      setInfo(null);
      pokazKomunikat('Import', msg);
    } finally {
      setBusy(false);
    }
  };

  const ustawStart = (kmN: string, mN: string) => {
    setKmStr(kmN);
    setMStr(mN);
    const { km, m } = parsujPolaKilometraza(kmN, mN);
    const next = km * 1000 + m;
    if (next === projekt.kilometrazPoczatkowyM) return;
    onZmien(przeliczProjektPoZmianieKm({
      ...projekt,
      kilometrazPoczatkowyM: next,
    }));
  };

  const usunAktywny = () => {
    if (!aktywny) return;
    usunArkuszPoId(aktywny.id, aktywny.nazwa);
  };

  const usunArkuszPoId = (id: string, nazwa: string) => {
    const wykonaj = () => {
      odpinBuforTlaArkusza(id);
      setTlaWersja((n) => n + 1);
      const next = usunArkusz(projekt, id);
      onZmien(next);
      if (arkuszId === id) {
        setArkuszId(next.arkusze.length > 1 ? CALY_PZT_ID : next.arkusze[0]?.id);
      }
      setInfo(`Usunięto arkusz „${nazwa}”.`);
    };
    if (Platform.OS === 'web') {
      if (!potwierdzWeb(`Usunąć arkusz XFDF „${nazwa}”?`)) return;
      wykonaj();
      return;
    }
    Alert.alert('Usuń arkusz', `Usunąć „${nazwa}”?`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: wykonaj },
    ]);
  };

  const usunTloArkusza = (id: string, nazwaArkusza: string) => {
    const wykonaj = () => {
      odpinBuforTlaArkusza(id);
      setTlaWersja((n) => n + 1);
      onZmien(ustawTloArkusza(projekt, id, undefined));
      setInfo(`Odpięto tło PDF od „${nazwaArkusza}”.`);
    };
    if (Platform.OS === 'web') {
      if (!potwierdzWeb(`Odpiąć tło PDF od „${nazwaArkusza}”?`)) return;
      wykonaj();
      return;
    }
    Alert.alert('Usuń tło', `Odpiąć tło PDF od „${nazwaArkusza}”?`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: wykonaj },
    ]);
  };

  const usunTloAktywnego = () => {
    if (!aktywny) return;
    usunTloArkusza(aktywny.id, aktywny.nazwa);
  };

  const usunPlikPdf = (nazwa: string) => {
    const wykonaj = () => {
      const ids = usunWgranyPdf(nazwa);
      setTlaWersja((n) => n + 1);
      let next = projekt;
      for (const id of ids) next = ustawTloArkusza(next, id, undefined);
      if (ids.length > 0) onZmien(next);
      setInfo(`Usunięto plik tła „${nazwa}”.`);
    };
    if (Platform.OS === 'web') {
      if (!potwierdzWeb(`Usunąć wgrany PDF „${nazwa}” z pamięci?`)) return;
      wykonaj();
      return;
    }
    Alert.alert('Usuń PDF', `Usunąć „${nazwa}”?`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: wykonaj },
    ]);
  };

  const uzyjPdfNaArkuszu = (arkuszId: string, nazwa: string) => {
    const ark = projekt.arkusze.find((a) => a.id === arkuszId);
    if (!ark) {
      pokazKomunikat('Tło PDF', 'Najpierw wybierz arkusz XFDF.');
      return;
    }
    const buf = przypnijWgranyPdfDoArkusza(arkuszId, nazwa);
    if (!buf) {
      pokazKomunikat('Tło PDF', 'Nie znaleziono tego pliku w pamięci – wgraj go ponownie.');
      return;
    }
    setTlaWersja((n) => n + 1);
    onZmien(ustawTloArkusza(projekt, arkuszId, {
      nazwa: buf.nazwa,
      pageW: buf.pageW,
      pageH: buf.pageH,
      strona: buf.strona,
      widoczne: true,
      opacity: 1,
    }));
    setInfo(`Tło „${buf.nazwa}” na arkuszu „${ark.nazwa}”.`);
  };

  const wgranePdf = listaWgranychPdf();
  void tlaWersja;

  const przesun = (kierunek: -1 | 1) => {
    if (!aktywny) return;
    const next = przesunArkusz(projekt, aktywny.id, kierunek);
    onZmien(next);
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, gap: 8 }]}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Kilometraż początkowy trasy</Text>
        <View style={styles.kmRzad}>
          <PoleKilometraz
            theme={theme}
            compact
            km={kmStr}
            m={mStr}
            onKm={(v) => ustawStart(v, mStr)}
            onM={(v) => ustawStart(kmStr, v)}
          />
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' }}>
            {formatujKmM(projekt.kilometrazPoczatkowyM)}
            {kmKoniecTrasy != null ? ` → ${formatujKmM(kmKoniecTrasy)}` : ''}
          </Text>
        </View>
        {projekt.arkusze.length > 0 ? (
          <View style={{ gap: 4 }}>
            <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '700' }}>
              {formatujKmM(projekt.kilometrazPoczatkowyM)}
              {` + ${sumaOsi.kmM.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`}
              {kmKoniecTrasy != null ? ` = ${formatujKmM(kmKoniecTrasy)}` : ''}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 11, lineHeight: 16 }}>
              {tekstPikietazuOsi(sumaOsi)}
            </Text>
            {sumaOsi.lukaNumeracji ? (
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, lineHeight: 16 }}>{sumaOsi.lukaNumeracji}</Text>
            ) : null}
            {sumaOsi.wymiary.length > 1 ? (
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, lineHeight: 16 }}>
                Wymiary ark.: {sumaOsi.wymiary.slice(0, 4).map((n) => n.toLocaleString('pl-PL', { maximumFractionDigits: 2 })).join(' + ')}
                {sumaOsi.wymiary.length > 4 ? ' + …' : ''}
                {`  (${sumaOsi.nArkuszy} ark.)`}
              </Text>
            ) : null}
            {sumaOsi.nEtykiet > 0 && Math.abs(sumaOsi.geomM - sumaOsi.kmM) > 1 ? (
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, lineHeight: 16 }}>
                Rysunek 1:500 ≈ {sumaOsi.geomM.toLocaleString('pl-PL', { maximumFractionDigits: 2 })} m;
                pikietaż XFDF = {sumaOsi.kmM.toLocaleString('pl-PL', { maximumFractionDigits: 2 })} m.
              </Text>
            ) : null}
          </View>
        ) : null}
        <View style={styles.rzad}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Podziałka kilometrażu osi</Text>
          <InfoTooltip tresc={`Kreska z pikietą co pełne ${projekt.podzialkaKilometrazuM ?? 50} m od startu. Oś i kilometraż biorą się z XFDF: suma długości linii osi (np. „422,07 m” na kresce). Pominięty arkusz drogi bocznej (np. 2_9) nie robi dziury: 2_8 styka się z 2_10. Ponowne wgranie tego samego arkusza podmienia geometrię w pamięci przeglądarki.`} />
        </View>
        <View style={styles.kmRzad}>
          <TextInput
            value={podzStr}
            keyboardType="numeric"
            onChangeText={(t) => {
              setPodzStr(t);
              const n = parseFloat(t.replace(',', '.'));
              const krok = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 50;
              if (krok === (projekt.podzialkaKilometrazuM ?? 50)) return;
              onZmien({ ...projekt, podzialkaKilometrazuM: krok });
            }}
            placeholder="50"
            placeholderTextColor={theme.colors.textSecondary}
            style={[
              styles.input,
              { width: 88, color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground },
            ]}
          />
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>m</Text>
        </View>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 10 }}>
          Wdrożenie {MMA_WEB_BUILD === 'dev' ? 'dev' : MMA_WEB_BUILD.slice(0, 7)}
          {MMA_WEB_BUILD === 'dev' ? '' : ' — jeśli po odświeżeniu widać inną wartość, to stara kopia strony.'}
        </Text>
      </View>

      <View style={styles.rzad}>
        <View style={{ flex: 1 }}>
          <PrzyciskImportuXfdf
            etykieta={busy ? 'Wczytywanie…' : '+ Dodaj arkusze XFDF / PDF'}
            kolorTla={theme.colors.primary}
            disabled={busy}
            onPressNative={importujNative}
            onWebFiles={(files) => { void importujWeb(files); }}
          />
        </View>
        <InfoTooltip tresc="Wgraj arkusze XFDF (możesz zaznaczyć też PDF tła). W oknie plików zaznacz kilka arkuszy naraz (Shift / Ctrl). Zakładki to odcinki trasy z kilometrażem od–do. Kolejność zmienisz dopiero po otwarciu kłódki. PDF nie musi mieć tej samej nazwy co XFDF – dopasowanie idzie po numerze arkusza (np. Ark_2_1); jeden PDF przy otwartej zakładce trafia na nią." />
      </View>
      {projekt.arkusze.length > 0 || wgranePdf.length > 0 ? (
        <View style={styles.rzad}>
          <TouchableOpacity
            onPress={() => setKonfiguratorTla(true)}
            style={[styles.btnKonfigurator, { borderColor: theme.colors.secondary, backgroundColor: `${theme.colors.secondary}14`, flex: 1 }]}
          >
            <Text style={{ color: theme.colors.secondary, fontWeight: '800', fontSize: 14 }}>
              {`Tła PDF${wgranePdf.length ? ` (${wgranePdf.length})` : ''} — konfigurator`}
            </Text>
          </TouchableOpacity>
          <InfoTooltip tresc="Przypisz, zmień albo usuń oryginały arkuszy. Pliki zostają w przeglądarce po odświeżeniu strony. Nazwy nie muszą być identyczne z XFDF – wystarczy numer arkusza albo jeden PDF na otwartą zakładkę." />
        </View>
      ) : null}
      {blad ? <Text style={{ color: theme.colors.danger, fontSize: 12 }}>{blad}</Text> : null}
      {info ? <Text style={{ color: theme.colors.success, fontSize: 12 }}>{info}</Text> : null}

      {projekt.arkusze.length === 0 ? (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
          Brak arkuszy. Dodaj pliki XFDF z zaznaczonymi obszarami i krawężnikami.
        </Text>
      ) : (
        <>
          <View style={styles.rzad}>
            <TouchableOpacity
              onPress={() => setKolejnoscOtwarta((v) => !v)}
              style={[styles.klodka, { borderColor: kolejnoscOtwarta ? theme.colors.primary : theme.colors.border }]}
              accessibilityLabel={kolejnoscOtwarta ? 'Zablokuj kolejność arkuszy' : 'Odblokuj kolejność arkuszy'}
            >
              <Text style={{ fontSize: 18 }}>{kolejnoscOtwarta ? '🔓' : '🔒'}</Text>
              <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 12 }}>
                {kolejnoscOtwarta ? 'Kolejność odblokowana – strzałki aktywne' : 'Kolejność zablokowana'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerStyle={styles.tabLista}
          >
            {calyArkusz ? (
              <View style={styles.tabWrap}>
                <View
                  style={[
                    styles.tab,
                    {
                      backgroundColor: widokCaly ? `${theme.colors.primary}22` : theme.colors.card,
                      borderColor: widokCaly ? theme.colors.primary : theme.colors.border,
                      minWidth: 168,
                    },
                  ]}
                >
                  <TouchableOpacity onPress={() => setArkuszId(CALY_PZT_ID)} style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>
                      Cały PZT
                    </Text>
                    <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                      {formatujKmM(calyArkusz.kilometrazPoczatkowyM)} → {formatujKmM(calyArkusz.kilometrazKoncowyM)}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 10, marginTop: 2 }}>
                      {projekt.arkusze.length} ark. · ploter
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
            {projekt.arkusze.map((a, i) => {
              const sel = a.id === aktywny?.id;
              return (
                <View key={a.id} style={styles.tabWrap}>
                  <View
                    style={[
                      styles.tab,
                      {
                        backgroundColor: sel ? `${theme.colors.primary}22` : theme.colors.card,
                        borderColor: sel ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <TouchableOpacity onPress={() => setArkuszId(a.id)} style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>
                        {i + 1}. {etykietaZakladkiArkusza(a.nazwa)}
                      </Text>
                      <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                        {formatujKmM(a.kilometrazPoczatkowyM)} → {formatujKmM(a.kilometrazKoncowyM)}
                      </Text>
                      {a.tlo ? (
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 10, marginTop: 2 }} numberOfLines={1}>
                          PDF: {a.tlo.nazwa}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => usunArkuszPoId(a.id, a.nazwa)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      accessibilityLabel={`Usuń arkusz ${a.nazwa}`}
                      style={styles.tabX}
                    >
                      <Text style={{ color: theme.colors.danger, fontWeight: '900', fontSize: 16 }}>×</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.tabAkcje}>
                    <TouchableOpacity
                      style={[styles.strzalka, { borderColor: theme.colors.border, opacity: !kolejnoscOtwarta || i === 0 ? 0.35 : 1 }]}
                      disabled={!kolejnoscOtwarta || i === 0}
                      onPress={() => {
                        setArkuszId(a.id);
                        onZmien(przesunArkusz(projekt, a.id, -1));
                      }}
                    >
                      <Text style={{ color: theme.colors.text, fontWeight: '800' }}>◀</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.strzalka, { borderColor: theme.colors.border, opacity: !kolejnoscOtwarta || i === projekt.arkusze.length - 1 ? 0.35 : 1 }]}
                      disabled={!kolejnoscOtwarta || i === projekt.arkusze.length - 1}
                      onPress={() => {
                        setArkuszId(a.id);
                        onZmien(przesunArkusz(projekt, a.id, 1));
                      }}
                    >
                      <Text style={{ color: theme.colors.text, fontWeight: '800' }}>▶</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {widokCaly && calyArkusz ? (
            <>
              <PztArkuszPodglad
                arkusz={calyArkusz}
                theme={theme}
                wysokosc={440}
                blokadaPodgladu={blokadaPodgladu}
                onBlokadaPodgladu={onBlokadaPodgladu}
                onDotykZmiana={onDotykZmiana}
                podzialkaM={projekt.podzialkaKilometrazuM ?? 50}
              />
              <View style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, gap: 8 }]}>
                <View style={styles.rzad}>
                  <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 14, flex: 1 }}>Cały PZT – ciągłość trasy</Text>
                  <InfoTooltip tresc="Styk: ostatnie węzły żółtego (L) i różowego (P) arkusza N są pierwsze na arkuszu N+1 (poprzeczka i tyczenie wstecz). Zakładki stron służą do porównania z PDF." />
                </View>
                <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 13 }}>
                  {formatujKmM(calyArkusz.kilometrazPoczatkowyM)} + {sumaOsi.kmM.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m
                  {`  =  ${formatujKmM(calyArkusz.kilometrazKoncowyM)}`}
                </Text>
                {sumaOsi.nEtykiet < sumaOsi.nArkuszy ? (
                  <Text style={{ color: theme.colors.danger, fontSize: 12, lineHeight: 17 }}>
                    Wymiar osi odczytany na {sumaOsi.nEtykiet}/{sumaOsi.nArkuszy} arkuszach
                    (geometria 1:500 ≈ {sumaOsi.geomM.toLocaleString('pl-PL', { maximumFractionDigits: 2 })} m).
                    Wgraj XFDF ponownie — arkusze zostaną podmienione, nie zdublowane.
                  </Text>
                ) : (
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12, lineHeight: 17 }}>
                    {`Pikietaż z XFDF: ${sumaOsi.kmM.toLocaleString('pl-PL', { maximumFractionDigits: 2 })} m (${sumaOsi.nArkuszy} ark.).`}
                    {sumaOsi.lukaNumeracji ? ` ${sumaOsi.lukaNumeracji}` : ''}
                  </Text>
                )}
              </View>
            </>
          ) : aktywny ? (
            <>
              <PztArkuszPodglad
                arkusz={aktywny}
                theme={theme}
                blokadaPodgladu={blokadaPodgladu}
                onBlokadaPodgladu={onBlokadaPodgladu}
                onDotykZmiana={onDotykZmiana}
                podzialkaM={projekt.podzialkaKilometrazuM ?? 50}
                onTloZmiana={(patch) => {
                  if (!aktywny.tlo) return;
                  onZmien(ustawTloArkusza(projekt, aktywny.id, { ...aktywny.tlo, ...patch }));
                }}
              />
              <View style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, gap: 10 }]}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Nazwa zakładki</Text>
                <TextInput
                  value={aktywny.nazwa}
                  onChangeText={(t) => onZmien(zmienNazweArkusza(projekt, aktywny.id, t))}
                  placeholder="np. Ark. 2_1"
                  placeholderTextColor={theme.colors.textSecondary}
                  style={[
                    styles.input,
                    { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground },
                  ]}
                />
                <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 13 }}>
                  Zakres: {formatujKmM(aktywny.kilometrazPoczatkowyM)} → {formatujKmM(aktywny.kilometrazKoncowyM)}
                </Text>
                {dlAkt ? (
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12, lineHeight: 16 }}>
                    Oś km: {Math.round(dlAkt.kmM)} m
                    {dlAkt.ukladanieM - dlAkt.kmM > 0.4
                      ? ` · układanie MMA ${Math.round(dlAkt.ukladanieM)} m (wyspy/zatoki +${Math.round(dlAkt.ukladanieM - dlAkt.kmM)} m – nie wchodzą do pikietażu)`
                      : ''}
                    {dlAkt.obszary.map((o) => `\n${o.nazwa}: boki ${Math.round(Math.min(o.lewaDl, o.prawaDl))}/${Math.round(Math.max(o.lewaDl, o.prawaDl))} m`).join('')}
                  </Text>
                ) : null}
                <View style={styles.rzad}>
                  <TouchableOpacity
                    style={[styles.btnKolej, { borderColor: theme.colors.border, opacity: !kolejnoscOtwarta || idxAktywny <= 0 ? 0.4 : 1 }]}
                    disabled={!kolejnoscOtwarta || idxAktywny <= 0}
                    onPress={() => przesun(-1)}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: '700' }}>◀ Wcześniej na trasie</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnKolej, { borderColor: theme.colors.border, opacity: !kolejnoscOtwarta || idxAktywny >= projekt.arkusze.length - 1 ? 0.4 : 1 }]}
                    disabled={!kolejnoscOtwarta || idxAktywny >= projekt.arkusze.length - 1}
                    onPress={() => przesun(1)}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Później na trasie ▶</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.rzad}>
                  <Text style={{ color: theme.colors.text, flex: 1, fontWeight: '600' }}>Kontynuacja poprzedniego arkusza</Text>
                  <Switch
                    value={aktywny.kontynuacjaPoprzedniego}
                    onValueChange={(v) => {
                      const arkusze = zastosujKilometrazArkuszy(
                        projekt.arkusze.map((a) => a.id === aktywny.id ? { ...a, kontynuacjaPoprzedniego: v } : a),
                        projekt.kilometrazPoczatkowyM,
                      );
                      onZmien({ ...projekt, arkusze });
                    }}
                    disabled={idxAktywny === 0}
                  />
                </View>
                {!aktywny.kontynuacjaPoprzedniego && idxAktywny > 0 ? (
                  <View>
                    <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Własny kilometraż startu</Text>
                    <PoleKilometraz
                      theme={theme}
                      compact
                      km={String(Z_METROW_BIEZACYCH(aktywny.kilometrazPoczatkowyM).km)}
                      m={String(Z_METROW_BIEZACYCH(aktywny.kilometrazPoczatkowyM).m).padStart(3, '0')}
                      onKm={(kmN) => {
                        const { km, m } = parsujPolaKilometraza(kmN, String(Z_METROW_BIEZACYCH(aktywny.kilometrazPoczatkowyM).m));
                        const arkusze = zastosujKilometrazArkuszy(
                          projekt.arkusze.map((a) => a.id === aktywny.id ? { ...a, kilometrazPoczatkowyM: km * 1000 + m } : a),
                          projekt.kilometrazPoczatkowyM,
                        );
                        onZmien({ ...projekt, arkusze });
                      }}
                      onM={(mN) => {
                        const { km, m } = parsujPolaKilometraza(String(Z_METROW_BIEZACYCH(aktywny.kilometrazPoczatkowyM).km), mN);
                        const arkusze = zastosujKilometrazArkuszy(
                          projekt.arkusze.map((a) => a.id === aktywny.id ? { ...a, kilometrazPoczatkowyM: km * 1000 + m } : a),
                          projekt.kilometrazPoczatkowyM,
                        );
                        onZmien({ ...projekt, arkusze });
                      }}
                    />
                  </View>
                ) : null}
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                  Plik XFDF: {aktywny.zrodloNazwa}
                  {aktywny.tlo ? `\nTło PDF: ${aktywny.tlo.nazwa}` : '\nBrak tła PDF'}
                </Text>
                {aktywny.tlo ? (
                  <TouchableOpacity
                    style={[styles.btnUsun, { borderColor: theme.colors.warning ?? theme.colors.danger }]}
                    onPress={usunTloAktywnego}
                  >
                    <Text style={{ color: theme.colors.warning ?? theme.colors.danger, fontWeight: '800' }}>Odepnij tło PDF</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[styles.btnUsun, { borderColor: theme.colors.danger }]}
                  onPress={usunAktywny}
                >
                  <Text style={{ color: theme.colors.danger, fontWeight: '800' }}>Usuń arkusz XFDF</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </>
      )}

      <SafeModal
        visible={konfiguratorTla}
        tytul="Konfigurator teł PDF"
        theme={theme}
        onClose={() => setKonfiguratorTla(false)}
        lewy={{ tekst: 'Zamknij', onPress: () => setKonfiguratorTla(false), kolor: theme.colors.textSecondary }}
        prawy={{ tekst: 'Gotowe', onPress: () => setKonfiguratorTla(false), kolor: theme.colors.primary }}
      >
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
          <PrzyciskImportuXfdf
            etykieta={busy ? 'Wczytywanie…' : '+ Wgraj PDF tła'}
            kolorTla={theme.colors.secondary}
            accept=".pdf,application/pdf"
            disabled={busy}
            onPressNative={() => pokazKomunikat('Tło PDF', 'Wybór tła PDF jest na razie w przeglądarce.')}
            onWebFiles={(files) => { void importujWeb(files); }}
          />

          {projekt.arkusze.length > 0 ? (
            <Text style={[styles.label, { color: theme.colors.primary }]}>Arkusze XFDF</Text>
          ) : (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Najpierw wgraj arkusze XFDF.</Text>
          )}
          {projekt.arkusze.map((a, i) => (
            <View
              key={a.id}
              style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, gap: 8 }]}
            >
              <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 14 }}>
                {i + 1}. {etykietaZakladkiArkusza(a.nazwa)}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                {formatujKmM(a.kilometrazPoczatkowyM)} → {formatujKmM(a.kilometrazKoncowyM)}
                {a.tlo ? `\nTło: ${a.tlo.nazwa}` : '\nBrak tła'}
              </Text>
              <View style={styles.pdfChipy}>
                {wgranePdf.map((p) => {
                  const wybrane = a.tlo ? p.nazwa === a.tlo.nazwa : p.arkuszIds.includes(a.id);
                  return (
                    <TouchableOpacity
                      key={`${a.id}-${p.nazwa}`}
                      onPress={() => uzyjPdfNaArkuszu(a.id, p.nazwa)}
                      style={[
                        styles.pdfChip,
                        {
                          borderColor: wybrane ? theme.colors.primary : theme.colors.border,
                          backgroundColor: wybrane ? `${theme.colors.primary}18` : theme.colors.inputBackground,
                        },
                      ]}
                    >
                      <Text style={{ color: theme.colors.text, fontSize: 11, fontWeight: wybrane ? '800' : '600' }} numberOfLines={1}>
                        {p.nazwa}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {a.tlo ? (
                <TouchableOpacity onPress={() => usunTloArkusza(a.id, a.nazwa)}>
                  <Text style={{ color: theme.colors.warning, fontWeight: '800', fontSize: 12 }}>Odepnij tło</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}

          <Text style={[styles.label, { color: theme.colors.primary }]}>Wgrane pliki PDF</Text>
          {wgranePdf.length === 0 ? (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
              Brak plików w pamięci. Wgraj PDF powyżej albo razem z XFDF.
            </Text>
          ) : wgranePdf.map((p) => {
            const etykiety = p.arkuszIds
              .map((id) => {
                const ark = projekt.arkusze.find((a) => a.id === id);
                return ark ? etykietaZakladkiArkusza(ark.nazwa) : null;
              })
              .filter(Boolean);
            return (
              <View key={p.nazwa} style={[styles.pdfWiersz, { borderColor: theme.colors.border }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 13 }} numberOfLines={2}>
                    {p.nazwa}
                  </Text>
                  <Text style={{ color: etykiety.length ? theme.colors.textSecondary : theme.colors.warning, fontSize: 11, marginTop: 2 }}>
                    {etykiety.length ? `Przypisany: ${etykiety.join(', ')}` : 'Nieprzypisany'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => usunPlikPdf(p.nazwa)}>
                  <Text style={{ color: theme.colors.danger, fontWeight: '800', fontSize: 12 }}>Usuń</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </SafeModal>
    </View>
  );
}

const styles = StyleSheet.create({
  opis: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '700' },
  tabLista: { gap: 8, paddingVertical: 2, paddingRight: 8 },
  tabWrap: { gap: 4 },
  tab: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 148,
    maxWidth: 220,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  tabX: { paddingHorizontal: 2, paddingTop: 0 },
  pdfWiersz: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tabAkcje: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  klodka: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  strzalka: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  rzad: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  kmRzad: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  btnKolej: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, flexGrow: 1 },
  btnUsun: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnKonfigurator: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  pdfChipy: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pdfChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, maxWidth: '100%' },
});
