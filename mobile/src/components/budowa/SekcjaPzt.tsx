import React, { useState } from 'react';
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
  przesunArkusz,
  przeliczProjektPoZmianieKm,
  usunArkusz,
  ustawTloArkusza,
  zastosujKilometrazArkuszy,
  zmienNazweArkusza,
} from '../../utils/projektBudowy';
import { karta } from '../../constants/layout';
import { Z_METROW_BIEZACYCH } from '../../constants';
import type { WynikParsowaniaXfdf } from '../../utils/xfdfParser';
import type { TloArkuszaPzt } from '../../types';
import {
  dopasujPdfDoArkuszy,
  ustawBuforTla,
} from '../../utils/tloPdfPamiec';
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
  const [arkuszId, setArkuszId] = useState(projekt.arkusze[0]?.id);
  const [busy, setBusy] = useState(false);
  const [blad, setBlad] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [kolejnoscOtwarta, setKolejnoscOtwarta] = useState(false);
  const startInit = polaZKilometraza(
    Z_METROW_BIEZACYCH(projekt.kilometrazPoczatkowyM).km,
    Z_METROW_BIEZACYCH(projekt.kilometrazPoczatkowyM).m,
  );
  const [kmStr, setKmStr] = useState(startInit.km);
  const [mStr, setMStr] = useState(startInit.m);
  const aktywny = projekt.arkusze.find((a) => a.id === arkuszId) ?? projekt.arkusze[0];
  const idxAktywny = aktywny ? projekt.arkusze.findIndex((a) => a.id === aktywny.id) : -1;

  const przypnijPdfs = async (
    proj: ProjektBudowy,
    files: PlikWebImport[],
    preferId?: string,
  ): Promise<ProjektBudowy> => {
    const pdfs = files.filter((f) => /\.pdf$/i.test(f.name));
    if (pdfs.length === 0) return proj;
    if (Platform.OS !== 'web') {
      pokazKomunikat('Tło PDF', 'Nakładanie oryginalnego PDF jest dostępne w przeglądarce (GitHub Pages).');
      return proj;
    }
    let next = proj;
    const mapa = dopasujPdfDoArkuszy(next.arkusze, pdfs.map((f) => f.name));
    const zajete = new Set(mapa.values());
    const wolnePdf = pdfs.filter((f) => !zajete.has(f.name));
    const bezTla = [...next.arkusze.filter((a) => !mapa.has(a.id))]
      .sort((a, b) => (a.id === preferId ? -1 : b.id === preferId ? 1 : 0));
    for (let i = 0; i < wolnePdf.length && i < bezTla.length; i++) {
      mapa.set(bezTla[i].id, wolnePdf[i].name);
    }
    if (preferId && pdfs.length === 1 && !mapa.has(preferId)) {
      mapa.set(preferId, pdfs[0].name);
    }
    const bufory = new Map<string, Awaited<ReturnType<typeof wymiaryStronyPdf>> & { data: Uint8Array; nazwa: string }>();
    for (const f of pdfs) {
      const data = new Uint8Array(await f.arrayBuffer());
      const wym = await wymiaryStronyPdf(data, 1);
      bufory.set(f.name, { ...wym, data, nazwa: f.name });
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
    setInfo(ile > 0
      ? `Nałożono tło PDF na ${ile} arkusz(y). Widać pikiety i obrysy z PZT; przy zoomie raster jest odświeżany.`
      : 'Nie dopasowano PDF – wgraj PDF przy otwartej zakładce (nazwa nie musi być identyczna z XFDF).');
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
    const pierwszyNowy = next.arkusze[Math.max(0, next.arkusze.length - r.wyniki.length)];
    if (pierwszyNowy) setArkuszId(pierwszyNowy.id);
    setInfo(`Dodano ${r.wyniki.length} arkusz(y). Przełączaj zakładkami.`);
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
        const pierwszyNowy = next.arkusze[Math.max(0, next.arkusze.length - r.wyniki.length)];
        if (pierwszyNowy) setArkuszId(pierwszyNowy.id);
        setInfo(`Dodano ${r.wyniki.length} arkusz(y). Przełączaj zakładkami.`);
        if (r.pominiete.length > 0) {
          const msg = r.pominiete.slice(0, 6).join('\n');
          setBlad(msg);
          pokazKomunikat('Część plików pominięto', msg);
        }
      }
      if (pdfs.length > 0) {
        next = await przypnijPdfs(next, pdfs, arkuszId);
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
    const wykonaj = () => {
      const next = usunArkusz(projekt, aktywny.id);
      onZmien(next);
      setArkuszId(next.arkusze[Math.min(idxAktywny, next.arkusze.length - 1)]?.id);
      setInfo('Usunięto arkusz.');
    };
    if (Platform.OS === 'web') {
      if (!potwierdzWeb(`Usunąć arkusz „${aktywny.nazwa}”?`)) return;
      wykonaj();
      return;
    }
    Alert.alert('Usuń arkusz', `Usunąć „${aktywny.nazwa}”?`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: wykonaj },
    ]);
  };

  const przesun = (kierunek: -1 | 1) => {
    if (!aktywny) return;
    const next = przesunArkusz(projekt, aktywny.id, kierunek);
    onZmien(next);
  };

  return (
    <View style={{ gap: 10 }}>
      <Text style={[styles.opis, { color: theme.colors.textSecondary }]}>
        Wgraj arkusze XFDF (możesz zaznaczyć też PDF tła). Zakładki to odcinki trasy z kilometrażem od–do. Kolejność zmienisz dopiero po otwarciu kłódki.
      </Text>

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
          </Text>
        </View>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
          Skala PZT 1:{projekt.skala.mianownik} ({projekt.skala.metryNaCm} m / cm)
        </Text>
      </View>

      <PrzyciskImportuXfdf
        etykieta={busy ? 'Wczytywanie…' : '+ Dodaj arkusze XFDF / PDF'}
        kolorTla={theme.colors.primary}
        disabled={busy}
        onPressNative={importujNative}
        onWebFiles={(files) => { void importujWeb(files); }}
      />
      {projekt.arkusze.length > 0 ? (
        <PrzyciskImportuXfdf
          etykieta={busy ? 'Wczytywanie…' : '+ Tło PDF (oryginał arkusza)'}
          kolorTla={theme.colors.secondary}
          accept=".pdf,application/pdf"
          disabled={busy}
          onPressNative={() => pokazKomunikat('Tło PDF', 'Wybór tła PDF jest na razie w przeglądarce.')}
          onWebFiles={(files) => { void importujWeb(files); }}
        />
      ) : null}
      {blad ? <Text style={{ color: theme.colors.danger, fontSize: 12 }}>{blad}</Text> : null}
      {info ? <Text style={{ color: theme.colors.success, fontSize: 12 }}>{info}</Text> : null}
      {!blad && !info ? (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
          W oknie plików zaznacz kilka arkuszy naraz (Shift / Ctrl). PDF nie musi mieć tej samej nazwy co XFDF – dopasowujemy po numerze arkusza (np. Ark_2_1); jeden PDF przy otwartej zakładce trafia na nią.
        </Text>
      ) : null}

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
            {projekt.arkusze.map((a, i) => {
              const sel = a.id === aktywny?.id;
              return (
                <View key={a.id} style={styles.tabWrap}>
                  <TouchableOpacity
                    style={[
                      styles.tab,
                      {
                        backgroundColor: sel ? `${theme.colors.primary}22` : theme.colors.card,
                        borderColor: sel ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setArkuszId(a.id)}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>
                      {i + 1}. {etykietaZakladkiArkusza(a.nazwa)}
                    </Text>
                    <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                      {formatujKmM(a.kilometrazPoczatkowyM)} → {formatujKmM(a.kilometrazKoncowyM)}
                    </Text>
                  </TouchableOpacity>
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

          {aktywny ? (
            <>
              <PztArkuszPodglad
                arkusz={aktywny}
                theme={theme}
                blokadaPodgladu={blokadaPodgladu}
                onBlokadaPodgladu={onBlokadaPodgladu}
                onDotykZmiana={onDotykZmiana}
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
                  Plik: {aktywny.zrodloNazwa}
                  {aktywny.zrodloPdfHref ? `\nPDF: ${aktywny.zrodloPdfHref}` : ''}
                </Text>
                <TouchableOpacity
                  style={[styles.btnUsun, { borderColor: theme.colors.danger }]}
                  onPress={usunAktywny}
                >
                  <Text style={{ color: theme.colors.danger, fontWeight: '800' }}>Usuń arkusz</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </>
      )}
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
    maxWidth: 200,
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
});
