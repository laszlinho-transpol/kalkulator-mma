import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import type { AppTheme } from '../../constants/theme';
import type { ArkuszPzt, ElementSzkicu, PowierzchniaSzkicuObszaru, ProjektBudowy } from '../../types';
import type { RaportDzienny } from '../../raportyBudowy/typy';
import { useRaportyBudowyStore } from '../../stores/raportyBudowyStore';
import { useMieszankiStore } from '../../stores/mieszankiStore';
import { useWytwornieStore } from '../../stores/wytwornieStore';
import {
  dniLiniowki,
  dodajWarstweWlasna,
  nowySzkic,
  obszaryWarstwy,
  posortujDoRysowania,
  powierzchnieSzkicu,
  poziomKlucza,
  poziomSegmentu,
  segmentyLiniowki,
  szukajPoDacie,
  szukajPoKm,
  usunSzkic,
  usunWpisReczny,
  warstwyLiniowki,
  zapiszSzkic,
  type SegmentLiniowki,
  type WarstwaLiniowki,
} from '../../liniowka/liniowka';
import { wpisLegendyObszaru } from '../../utils/planZBudowy';
import { etykietaZakladkiArkusza, formatujKmM, kluczLegendy, ustawTloArkusza } from '../../utils/projektBudowy';
import { formatLiczby } from '../../utils/calculations';
import { potwierdzAkcje, pokazKomunikat } from '../../utils/dialog';
import { nazwaMieszanki } from '../mieszanki/WyborMieszanki';
import { SafeModal } from '../common/SafeModal';
import { PoleKilometraz } from '../common/PoleKilometraz';
import {
  Karta, Pole, Przycisk, Sekcja, SiatkaKalendarza, WierszDanych, Wybor, isoZDaty, stylFormularza, ODSTEP, PROMIEN, TYPOGRAFIA,
} from '../ui';
import { PztArkuszPodglad, type NarzedzieSzkicu, type OdcinekLiniowkiPodgladu, type SzkicPodgladu } from './PztArkuszPodglad';

const KOLORY_PIORA = ['#DC2626', '#16A34A', '#2563EB', '#EAB308', '#9333EA', '#EA580C', '#111827', '#FFFFFF'];
/** 0 = linia obszaru: tak cienka jak obrys XFDF przy każdym przybliżeniu. */
const GRUBOSCI_PIORA = [0, 2, 4, 8];
const NARZEDZIA: Array<{ id: NarzedzieSzkicu; nazwa: string }> = [
  { id: 'pioro', nazwa: '✏️ Pióro' },
  { id: 'wiadro', nazwa: '🪣 Wiadro' },
  { id: 'gumka', nazwa: '⌫ Gumka' },
];

interface Props {
  projekt: ProjektBudowy;
  budowaId: string;
  theme: AppTheme;
  onZmien: (p: ProjektBudowy) => void;
  blokadaPodgladu?: boolean;
  onBlokadaPodgladu?: (v: boolean) => void;
  onDotykZmiana?: (aktywny: boolean) => void;
}

interface SzkicRoboczy {
  id?: string;
  arkuszId: string;
  elementy: ElementSzkicu[];
  historia: ElementSzkicu[][];
  warstwaKlucz?: string;
  nowaWarstwa?: { nazwa: string; opis?: string };
  raportId?: string;
}

type WyborWarstwy = { klucz: string } | { nazwa: string; opis?: string };

const m2 = (x: number) => `${formatLiczby(x)} m²`;

const dataPl = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
};

const zakresKm = (s: Pick<SegmentLiniowki, 'kmOdM' | 'kmDoM'>) => `${formatujKmM(s.kmOdM)} – ${formatujKmM(s.kmDoM)}`;

export function SekcjaLiniowka({ projekt, budowaId, theme, onZmien, blokadaPodgladu = false, onBlokadaPodgladu, onDotykZmiana }: Props) {
  const raporty = useRaportyBudowyStore((s) => s.raporty);
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const wytwornie = useWytwornieStore((s) => s.wytwornie);
  const [arkuszId, setArkuszId] = useState<string | undefined>(projekt.arkusze[0]?.id);
  const [ukryte, setUkryte] = useState<Set<string>>(() => new Set());
  const [wybranyId, setWybranyId] = useState<string | undefined>();
  const [szukaj, setSzukaj] = useState(false);
  const [szkic, setSzkic] = useState<SzkicRoboczy | null>(null);
  const [narzedzie, setNarzedzie] = useState<NarzedzieSzkicu>('pioro');
  const [kolorPiora, setKolorPiora] = useState(KOLORY_PIORA[0]);
  const [grubosc, setGrubosc] = useState(GRUBOSCI_PIORA[1]);
  const [zapisSzkicu, setZapisSzkicu] = useState(false);
  const [wyborWarstwy, setWyborWarstwy] = useState(false);
  const [wybranySzkicId, setWybranySzkicId] = useState<string | undefined>();

  const aktywny = projekt.arkusze.find((a) => a.id === arkuszId) ?? projekt.arkusze[0];
  const raportyBudowy = useMemo(
    () => raporty.filter((r) => r.budowaId === budowaId).sort((a, b) => b.data.localeCompare(a.data)),
    [raporty, budowaId],
  );

  const segmenty = useMemo(() => segmentyLiniowki(projekt, raporty, budowaId, (id) => {
    const m = mieszanki.find((x) => x.id === id);
    return m ? nazwaMieszanki(m) : undefined;
  }), [projekt, raporty, budowaId, mieszanki]);
  const warstwy = useMemo(() => warstwyLiniowki(projekt, segmenty), [projekt, segmenty]);
  const warstwaPoKluczu = useMemo(() => new Map(warstwy.map((w) => [w.klucz, w])), [warstwy]);
  const szkice = projekt.liniowka?.szkice ?? [];
  const reczne = projekt.liniowka?.reczne ?? [];

  const warstwyFiltra = useMemo(() => {
    const klucze = new Set([...segmenty.map((s) => s.klucz), ...szkice.map((s) => s.warstwaKlucz)]);
    return warstwy.filter((w) => klucze.has(w.klucz)).sort((a, b) => b.poziom - a.poziom);
  }, [warstwy, segmenty, szkice]);

  const widoczne = useMemo(
    () => posortujDoRysowania(projekt, segmenty.filter((s) => !ukryte.has(s.klucz))),
    [projekt, segmenty, ukryte],
  );
  const poziomy = useMemo(() => widoczne.map((s) => poziomSegmentu(projekt, s)), [projekt, widoczne]);

  const odcinkiPodgladu = useMemo<OdcinekLiniowkiPodgladu[]>(() => widoczne.map((s) => {
    const w = warstwaPoKluczu.get(s.klucz);
    return {
      id: s.id,
      kluczObszaru: wpisLegendyObszaru(projekt, s.legendaId)?.klucz ?? '',
      kmOdM: s.kmOdM,
      kmDoM: s.kmDoM,
      kolor: w?.kolor ?? '#9CA3AF',
      krycie: w?.krycie ?? 0.3,
      reczny: s.zrodlo === 'reczny',
      warstwa: s.klucz,
    };
  }), [widoczne, warstwaPoKluczu, projekt]);

  const klipWarstwy = (arkusz: ArkuszPzt | undefined, klucz: string | undefined) => {
    if (!arkusz || !klucz) return null;
    return obszaryWarstwy(projekt, arkusz, klucz);
  };

  const szkicePodgladu = useMemo<SzkicPodgladu[]>(() => szkice
    .filter((s) => s.arkuszId === aktywny?.id && s.id !== szkic?.id && !ukryte.has(s.warstwaKlucz))
    .map((s) => {
      const p = poziomKlucza(s.warstwaKlucz);
      return {
        id: s.id,
        elementy: s.elementy,
        krycie: warstwaPoKluczu.get(s.warstwaKlucz)?.krycie ?? 0.5,
        poIndeksie: poziomy.filter((x) => x <= p).length,
        klip: obszaryWarstwy(projekt, aktywny!, s.warstwaKlucz)?.map((o) => o.wierzcholkiPdf) ?? null,
      };
    }), [szkice, aktywny, szkic?.id, ukryte, warstwaPoKluczu, poziomy, projekt]);

  const wybrany = segmenty.find((s) => s.id === wybranyId);
  const wybranySzkic = szkice.find((s) => s.id === wybranySzkicId);
  const raportPoId = (id?: string) => (id ? raportyBudowy.find((r) => r.id === id) : undefined);
  const nazwaWarstwySzkicu = (s: Pick<SzkicRoboczy, 'warstwaKlucz' | 'nowaWarstwa'>) => (
    s.nowaWarstwa?.nazwa ?? (s.warstwaKlucz ? warstwaPoKluczu.get(s.warstwaKlucz)?.nazwa : undefined) ?? 'Szkic'
  );

  const arkuszSegmentu = (s: SegmentLiniowki) => {
    const klucz = wpisLegendyObszaru(projekt, s.legendaId)?.klucz;
    const lo = Math.min(s.kmOdM, s.kmDoM);
    const hi = Math.max(s.kmOdM, s.kmDoM);
    return projekt.arkusze.find((a) => a.kilometrazKoncowyM > lo && a.kilometrazPoczatkowyM < hi
      && a.obszary.some((o) => kluczLegendy('obszar', o.kolorWypelnienia) === klucz))
      ?? projekt.arkusze.find((a) => a.kilometrazKoncowyM > lo && a.kilometrazPoczatkowyM < hi);
  };

  const pokaz = (s: SegmentLiniowki) => {
    setWybranyId(s.id);
    setUkryte((u) => {
      if (!u.has(s.klucz)) return u;
      const n = new Set(u);
      n.delete(s.klucz);
      return n;
    });
    const a = arkuszSegmentu(s);
    if (a) setArkuszId(a.id);
    setSzukaj(false);
  };

  const przelaczWarstwe = (klucz: string) => setUkryte((u) => {
    const n = new Set(u);
    if (n.has(klucz)) n.delete(klucz);
    else n.add(klucz);
    return n;
  });

  const zacznijSzkic = (istniejacy?: typeof szkice[number], wybor?: WyborWarstwy) => {
    if (!aktywny && !istniejacy) return;
    if (istniejacy) setArkuszId(istniejacy.arkuszId);
    setWybranyId(undefined);
    setWybranySzkicId(undefined);
    setWyborWarstwy(false);
    const klucz = istniejacy?.warstwaKlucz ?? (wybor && 'klucz' in wybor ? wybor.klucz : undefined);
    setSzkic({
      id: istniejacy?.id,
      arkuszId: istniejacy?.arkuszId ?? aktywny!.id,
      elementy: istniejacy?.elementy ?? [],
      historia: [],
      warstwaKlucz: klucz,
      nowaWarstwa: wybor && 'nazwa' in wybor ? wybor : undefined,
      raportId: istniejacy?.raportId,
    });
    const kolorWarstwy = klucz ? warstwaPoKluczu.get(klucz)?.kolor : undefined;
    if (kolorWarstwy) setKolorPiora(kolorWarstwy);
    setNarzedzie('pioro');
    onBlokadaPodgladu?.(true);
  };

  const zakonczSzkic = () => {
    setSzkic(null);
    setZapisSzkicu(false);
    onBlokadaPodgladu?.(false);
  };

  const wybierzOdcinek = (id: string) => {
    setWybranySzkicId(undefined);
    setWybranyId(id);
  };

  const wybierzSzkic = (id: string) => {
    setWybranyId(undefined);
    setWybranySzkicId(id);
  };

  const zmienElementySzkicu = (elementy: ElementSzkicu[]) => setSzkic((s) => (s
    ? { ...s, elementy, historia: [...s.historia.slice(-30), s.elementy] }
    : s));

  const cofnij = () => setSzkic((s) => {
    if (!s || s.historia.length === 0) return s;
    return { ...s, elementy: s.historia[s.historia.length - 1], historia: s.historia.slice(0, -1) };
  });

  const usunWpis = (id: string) => {
    potwierdzAkcje('Usuń obszar', 'Usunąć obszar dodany ręcznie?', () => {
      setWybranyId(undefined);
      onZmien(usunWpisReczny(projekt, id));
    }, 'Usuń');
  };

  const recepta = (s: SegmentLiniowki) => {
    const m = s.mieszankaId ? mieszanki.find((x) => x.id === s.mieszankaId) : undefined;
    const wytw = m?.wytworniaId ? wytwornie.find((w) => w.id === m.wytworniaId)?.nazwa : undefined;
    return { nazwa: m ? nazwaMieszanki(m) : (s.mieszankaNazwa || '—'), wytwornia: wytw ?? m?.wytwórnia ?? '—' };
  };

  if (projekt.arkusze.length === 0 || !aktywny) {
    return <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Najpierw wgraj arkusze PZT.</Text>;
  }

  const arkuszSzkicu = szkic ? projekt.arkusze.find((a) => a.id === szkic.arkuszId) ?? aktywny : aktywny;
  const klipSzkicu = szkic && !szkic.nowaWarstwa ? klipWarstwy(arkuszSzkicu, szkic.warstwaKlucz) : null;
  const wynikSzkicu = szkic && zapisSzkicu ? powierzchnieSzkicu(szkic.elementy, arkuszSzkicu, klipSzkicu) : null;

  return (
    <View style={{ gap: ODSTEP.m }}>
      {szkic ? (
        <View style={[styles.pasek, { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}10` }]}>
          <View accessibilityLabel="Warstwa szkicu">
            <Text style={[TYPOGRAFIA.wartosc, { color: theme.colors.text }]} numberOfLines={1}>
              {`Warstwa: ${nazwaWarstwySzkicu(szkic)}`}
            </Text>
            <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>
              {klipSzkicu
                ? 'Malujesz tylko po obszarze tej warstwy (obrys przerywany).'
                : 'Nowa warstwa – rysujesz po całym arkuszu.'}
            </Text>
          </View>
          <View style={stylFormularza.chipy}>
            {NARZEDZIA.map((n) => (
              <Wybor key={n.id} zaznaczony={narzedzie === n.id} etykieta={n.nazwa} accessibilityLabel={`Narzędzie ${n.id}`} onPress={() => setNarzedzie(n.id)} />
            ))}
          </View>
          <View style={styles.rzad}>
            {KOLORY_PIORA.map((k) => (
              <TouchableOpacity
                key={k}
                accessibilityLabel={`Kolor ${k}`}
                accessibilityState={{ selected: k === kolorPiora }}
                onPress={() => setKolorPiora(k)}
                style={[styles.probka, { backgroundColor: k, borderColor: k === kolorPiora ? theme.colors.text : theme.colors.border, borderWidth: k === kolorPiora ? 3 : 1 }]}
              />
            ))}
          </View>
          <View style={styles.rzad}>
            {GRUBOSCI_PIORA.map((g) => (
              <TouchableOpacity
                key={g}
                accessibilityLabel={g === 0 ? 'Grubość linii obszaru' : `Grubość ${g}`}
                accessibilityState={{ selected: g === grubosc }}
                onPress={() => setGrubosc(g)}
                style={[styles.grubosc, { borderColor: g === grubosc ? theme.colors.primary : theme.colors.border, backgroundColor: theme.colors.card }]}
              >
                <View style={{ width: 22, height: g || 1, borderRadius: (g || 1) / 2, backgroundColor: kolorPiora === '#FFFFFF' ? theme.colors.text : kolorPiora }} />
              </TouchableOpacity>
            ))}
            <View style={{ flex: 1 }} />
            <Przycisk tekst="Cofnij" wariant="drugi" maly disabled={szkic.historia.length === 0} onPress={cofnij} />
          </View>
          <View style={styles.rzad}>
            <Przycisk tekst="Anuluj" wariant="niebezpieczny" maly onPress={zakonczSzkic} style={{ flex: 1 }} />
            <Przycisk
              tekst="OK"
              maly
              accessibilityLabel="Zatwierdź szkic"
              onPress={() => {
                if (szkic.elementy.length === 0) {
                  pokazKomunikat('Szkic', 'Narysuj coś na arkuszu albo wybierz Anuluj.');
                  return;
                }
                setZapisSzkicu(true);
              }}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : (
        <View style={styles.filtrRzad}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={styles.rzad}>
            {warstwyFiltra.length === 0 ? (
              <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary, alignSelf: 'center' }]}>Brak ułożonych obszarów</Text>
            ) : warstwyFiltra.map((w) => (
              <ChipWarstwy key={w.klucz} warstwa={w} wlaczona={!ukryte.has(w.klucz)} theme={theme} onPress={() => przelaczWarstwe(w.klucz)} />
            ))}
          </ScrollView>
          <Przycisk tekst="Wyszukaj" wariant="drugi" maly onPress={() => setSzukaj(true)} />
        </View>
      )}

      {projekt.arkusze.length > 1 && !szkic ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rzad}>
          {projekt.arkusze.map((a, i) => {
            const on = a.id === aktywny.id;
            return (
              <TouchableOpacity
                key={a.id}
                accessibilityLabel={`Arkusz ${a.nazwa}`}
                onPress={() => setArkuszId(a.id)}
                style={[styles.tab, {
                  borderColor: on ? theme.colors.primary : theme.colors.border,
                  backgroundColor: on ? `${theme.colors.primary}22` : theme.colors.card,
                }]}
              >
                <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>
                  {i + 1}. {etykietaZakladkiArkusza(a.nazwa)}
                </Text>
                <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                  {formatujKmM(a.kilometrazPoczatkowyM)} → {formatujKmM(a.kilometrazKoncowyM)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      <PztArkuszPodglad
        arkusz={arkuszSzkicu}
        theme={theme}
        wysokosc={420}
        blokadaPodgladu={blokadaPodgladu}
        onBlokadaPodgladu={onBlokadaPodgladu}
        onDotykZmiana={onDotykZmiana}
        podzialkaM={projekt.podzialkaKilometrazuM ?? 50}
        onTloZmiana={(patch) => {
          if (!arkuszSzkicu.tlo) return;
          onZmien(ustawTloArkusza(projekt, arkuszSzkicu.id, { ...arkuszSzkicu.tlo, ...patch }));
        }}
        liniowka={{
          odcinki: odcinkiPodgladu,
          szkice: szkicePodgladu,
          podswietlonyId: wybranyId,
          onPressOdcinek: szkic ? undefined : wybierzOdcinek,
          podswietlonySzkicId: wybranySzkicId,
          onPressSzkic: szkic ? undefined : wybierzSzkic,
        }}
        rysowanie={szkic ? {
          narzedzie,
          kolor: kolorPiora,
          gruboscPx: grubosc,
          elementy: szkic.elementy,
          onZmien: zmienElementySzkicu,
          klip: klipSzkicu?.map((o) => o.wierzcholkiPdf) ?? null,
          onWiadroBezGranic: () => pokazKomunikat(
            'Wiaderko',
            klipSzkicu
              ? 'Stuknij wewnątrz obszaru warstwy (obrys przerywany).'
              : 'Farba nie ma granic – obrysuj miejsce linią albo stuknij wewnątrz obszaru PZT.',
          ),
        } : undefined}
      />

      {wybranySzkic && !szkic ? (
        <View accessibilityLabel="Informacja o szkicu">
          <Karta
            tytul={`Szkic · ${warstwaPoKluczu.get(wybranySzkic.warstwaKlucz)?.nazwa ?? 'warstwa'}`}
            znaczek={{ tekst: 'Szkic', kolor: warstwaPoKluczu.get(wybranySzkic.warstwaKlucz)?.kolor ?? theme.colors.primary }}
            akcje={[
              ...(raportPoId(wybranySzkic.raportId) ? [{
                tekst: 'Otwórz raport', rodzaj: 'glowna' as const, onPress: () => router.push(`/raport-budowy/${wybranySzkic.raportId}` as never),
              }] : []),
              { tekst: 'Edytuj', onPress: () => zacznijSzkic(wybranySzkic) },
              { tekst: 'Zamknij', onPress: () => setWybranySzkicId(undefined) },
            ]}
          >
            {wybranySzkic.powierzchniaM2 != null ? <WierszDanych etykieta="Zamalowano" wartosc={m2(wybranySzkic.powierzchniaM2)} /> : null}
            {(wybranySzkic.powierzchnie ?? []).map((p) => <WierszDanych key={p.obszarId} etykieta={p.obszarNazwa || 'Obszar'} wartosc={m2(p.m2)} />)}
            <WierszDanych etykieta="Raport" wartosc={raportPoId(wybranySzkic.raportId) ? dataPl(raportPoId(wybranySzkic.raportId)!.data) : 'nie podłączono'} />
            {warstwaPoKluczu.get(wybranySzkic.warstwaKlucz)?.opis ? <WierszDanych etykieta="Opis" wartosc={warstwaPoKluczu.get(wybranySzkic.warstwaKlucz)!.opis!} /> : null}
          </Karta>
        </View>
      ) : null}

      {wybrany && !szkic ? (
        <View accessibilityLabel="Informacja o obszarze">
          <Karta
            tytul={`${wybrany.warstwaNazwa} · ${wybrany.obszarNazwa}`}
            znaczek={wybrany.zrodlo === 'reczny' ? { tekst: 'Ręcznie', kolor: theme.colors.warning } : { tekst: 'Raport', kolor: theme.colors.success }}
            akcje={[
              ...(wybrany.raportId ? [{ tekst: 'Otwórz raport', rodzaj: 'glowna' as const, onPress: () => router.push(`/raport-budowy/${wybrany.raportId}` as never) }] : []),
              ...(wybrany.wpisId ? [
                { tekst: 'Edytuj', onPress: () => router.push(`/budowa/liniowka-reczna?budowaId=${budowaId}&wpisId=${wybrany.wpisId}` as never) },
                { tekst: 'Usuń', rodzaj: 'niebezpieczna' as const, onPress: () => usunWpis(wybrany.wpisId!) },
              ] : []),
              { tekst: 'Zamknij', onPress: () => setWybranyId(undefined) },
            ]}
          >
            <WierszDanych etykieta="Data" wartosc={dataPl(wybrany.data)} />
            <WierszDanych etykieta="Powierzchnia" wartosc={`${formatLiczby(wybrany.powierzchniaM2)} m²`} />
            <WierszDanych etykieta="Kilometraż" wartosc={zakresKm(wybrany)} />
            <WierszDanych etykieta="Recepta" wartosc={recepta(wybrany).nazwa} />
            <WierszDanych etykieta="Wytwórnia" wartosc={recepta(wybrany).wytwornia} />
            {wybrany.komentarz ? <WierszDanych etykieta="Komentarz" wartosc={wybrany.komentarz} /> : null}
          </Karta>
        </View>
      ) : null}

      {!szkic ? (
        <View style={styles.rzad}>
          <Przycisk
            tekst="Dodaj ręcznie"
            ikona="plus"
            wariant="drugi"
            onPress={() => router.push(`/budowa/liniowka-reczna?budowaId=${budowaId}` as never)}
            style={{ flex: 1 }}
          />
          <Przycisk tekst="Szkicuj" ikona="edytuj" wariant="drugi" onPress={() => setWyborWarstwy(true)} style={{ flex: 1 }} />
        </View>
      ) : null}

      {!szkic && reczne.length > 0 ? (
        <Sekcja tytul="Dodane ręcznie" info="Obszary wykonane poza raportem dziennym. Na liniówce mają przerywany obrys w kolorze warstwy.">
          <View style={{ gap: ODSTEP.s }}>
            {segmenty.filter((s) => s.zrodlo === 'reczny').map((s) => (
              <Karta
                key={s.id}
                tytul={`${s.warstwaNazwa} · ${s.obszarNazwa}`}
                podtytul={`${dataPl(s.data)} · ${zakresKm(s)}${s.komentarz ? `\n${s.komentarz}` : ''}`}
                akcje={[
                  { tekst: 'Pokaż', onPress: () => pokaz(s) },
                  { tekst: 'Edytuj', onPress: () => router.push(`/budowa/liniowka-reczna?budowaId=${budowaId}&wpisId=${s.wpisId}` as never) },
                  { tekst: 'Usuń', rodzaj: 'niebezpieczna', onPress: () => usunWpis(s.wpisId!) },
                ]}
              />
            ))}
          </View>
        </Sekcja>
      ) : null}

      {!szkic && szkice.length > 0 ? (
        <Sekcja tytul="Szkice" info="Szkic zostaje w formacie SVG na arkuszu. Edytuj, aby dorysować albo wymazać fragment.">
          <View style={{ gap: ODSTEP.s }}>
            {szkice.map((s) => {
              const w = warstwaPoKluczu.get(s.warstwaKlucz);
              const ark = projekt.arkusze.find((a) => a.id === s.arkuszId);
              const rap = raportPoId(s.raportId);
              return (
                <Karta
                  key={s.id}
                  tytul={w?.nazwa ?? 'Szkic'}
                  podtytul={[
                    ark ? etykietaZakladkiArkusza(ark.nazwa) : '',
                    s.powierzchniaM2 != null ? m2(s.powierzchniaM2) : `${s.elementy.length} el.`,
                    rap ? `raport ${dataPl(rap.data)}` : '',
                    w?.opis ?? '',
                  ].filter(Boolean).join(' · ')}
                  akcje={[
                    { tekst: 'Pokaż', onPress: () => { setArkuszId(s.arkuszId); wybierzSzkic(s.id); } },
                    ...(rap ? [{ tekst: 'Raport', onPress: () => router.push(`/raport-budowy/${rap.id}` as never) }] : []),
                    { tekst: 'Edytuj', accessibilityLabel: `Edytuj szkic ${w?.nazwa ?? ''}`, onPress: () => zacznijSzkic(s) },
                    {
                      tekst: 'Usuń',
                      rodzaj: 'niebezpieczna',
                      onPress: () => potwierdzAkcje('Usuń szkic', 'Usunąć szkic z liniówki?', () => onZmien(usunSzkic(projekt, s.id)), 'Usuń'),
                    },
                  ]}
                />
              );
            })}
          </View>
        </Sekcja>
      ) : null}

      <OknoWyszukaj
        widoczne={szukaj}
        theme={theme}
        segmenty={segmenty}
        warstwaPoKluczu={warstwaPoKluczu}
        onClose={() => setSzukaj(false)}
        onPokaz={pokaz}
      />

      <OknoWarstwySzkicu
        widoczne={wyborWarstwy}
        theme={theme}
        warstwy={warstwy}
        onClose={() => setWyborWarstwy(false)}
        onWybierz={(w) => zacznijSzkic(undefined, w)}
      />

      {szkic && wynikSzkicu ? (
        <OknoZapisuSzkicu
          widoczne={zapisSzkicu}
          theme={theme}
          nazwaWarstwy={nazwaWarstwySzkicu(szkic)}
          wynik={wynikSzkicu}
          wKlipie={!!klipSzkicu}
          raporty={raportyBudowy}
          raportId={szkic.raportId}
          onClose={() => setZapisSzkicu(false)}
          onZapisz={(raportId) => {
            let p = projekt;
            let klucz = szkic.warstwaKlucz;
            if (szkic.nowaWarstwa || !klucz) {
              const nowa = dodajWarstweWlasna(p, szkic.nowaWarstwa?.nazwa ?? 'Szkic', szkic.nowaWarstwa?.opis, kolorPiora);
              p = nowa.projekt;
              klucz = nowa.klucz;
            }
            const dane = { powierzchniaM2: wynikSzkicu.razemM2, powierzchnie: wynikSzkicu.powierzchnie, raportId };
            const istniejacy = szkice.find((s) => s.id === szkic.id);
            const zapis = istniejacy
              ? { ...istniejacy, ...dane, elementy: szkic.elementy, warstwaKlucz: klucz, updatedAt: new Date().toISOString() }
              : nowySzkic(szkic.arkuszId, szkic.elementy, klucz, dane);
            onZmien(zapiszSzkic(p, zapis));
            const k = klucz;
            setUkryte((u) => {
              if (!u.has(k)) return u;
              const n = new Set(u);
              n.delete(k);
              return n;
            });
            zakonczSzkic();
          }}
        />
      ) : null}
    </View>
  );
}

function ChipWarstwy({ warstwa, wlaczona, theme, onPress }: { warstwa: WarstwaLiniowki; wlaczona: boolean; theme: AppTheme; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel={`Warstwa ${warstwa.nazwa}`}
      accessibilityState={{ selected: wlaczona }}
      style={[styles.chip, {
        borderColor: wlaczona ? warstwa.kolor : theme.colors.border,
        backgroundColor: wlaczona ? `${warstwa.kolor}22` : theme.colors.card,
        opacity: wlaczona ? 1 : 0.6,
      }]}
    >
      <View style={[styles.kropka, { backgroundColor: warstwa.kolor, opacity: wlaczona ? Math.max(0.35, warstwa.krycie) : 0.25 }]} />
      <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 13 }}>{warstwa.nazwa}</Text>
    </TouchableOpacity>
  );
}

function OknoWyszukaj({ widoczne, theme, segmenty, warstwaPoKluczu, onClose, onPokaz }: {
  widoczne: boolean;
  theme: AppTheme;
  segmenty: SegmentLiniowki[];
  warstwaPoKluczu: Map<string, WarstwaLiniowki>;
  onClose: () => void;
  onPokaz: (s: SegmentLiniowki) => void;
}) {
  const [tryb, setTryb] = useState<'km' | 'data'>('km');
  const [km, setKm] = useState('');
  const [m, setM] = useState('');
  const dni = useMemo(() => new Set(dniLiniowki(segmenty)), [segmenty]);
  const ostatni = [...dni].pop() ?? isoZDaty(new Date());
  const [dzien, setDzien] = useState<string | undefined>();
  const [rok, setRok] = useState(Number(ostatni.slice(0, 4)));
  const [miesiac, setMiesiac] = useState(Number(ostatni.slice(5, 7)) - 1);

  const kmM = km.trim() ? (parseInt(km, 10) || 0) * 1000 + (parseInt(m || '0', 10) || 0) : null;
  const wyniki = tryb === 'km'
    ? (kmM == null ? [] : szukajPoKm(segmenty, kmM))
    : (dzien ? szukajPoDacie(segmenty, dzien) : []);

  return (
    <SafeModal visible={widoczne} tytul="Wyszukaj" theme={theme} onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: ODSTEP.l, gap: ODSTEP.m }} keyboardShouldPersistTaps="handled">
        <View style={stylFormularza.chipy}>
          <Wybor zaznaczony={tryb === 'km'} etykieta="Kilometraż" onPress={() => setTryb('km')} />
          <Wybor zaznaczony={tryb === 'data'} etykieta="Data" onPress={() => setTryb('data')} />
        </View>
        {tryb === 'km' ? (
          <PoleKilometraz theme={theme} km={km} m={m} onKm={setKm} onM={setM} accessibilityLabel="Szukany kilometraż" />
        ) : (
          <View style={[styles.okno, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
            <SiatkaKalendarza
              rok={rok}
              miesiac={miesiac}
              onZmienMiesiac={(r, mm) => { setRok(r); setMiesiac(mm); }}
              stanDnia={(iso) => ({ wybrany: iso === dzien, oznaczony: dni.has(iso) })}
              onWybierz={setDzien}
              legendaOznaczonych="ułożone obszary"
            />
          </View>
        )}
        {(tryb === 'km' ? kmM != null : !!dzien) ? (
          <Text style={[TYPOGRAFIA.sekcja, { color: theme.colors.textSecondary }]}>
            {tryb === 'km' ? `Km ${formatujKmM(kmM ?? 0)}` : dataPl(dzien!)} · {wyniki.length === 0 ? 'brak wyników' : `${wyniki.length} poz.`}
          </Text>
        ) : null}
        {wyniki.map((s) => {
          const w = warstwaPoKluczu.get(s.klucz);
          return (
            <Karta
              key={s.id}
              tytul={`${s.warstwaNazwa} · ${s.obszarNazwa}`}
              podtytul={`${dataPl(s.data)} · ${zakresKm(s)} · ${formatLiczby(s.powierzchniaM2)} m²${s.zrodlo === 'reczny' ? ' · ręcznie' : ''}`}
              znaczek={w ? { tekst: w.nazwa, kolor: w.kolor } : undefined}
              akcje={[
                { tekst: 'Pokaż na mapie', onPress: () => onPokaz(s) },
                ...(s.raportId ? [{
                  tekst: 'Raport',
                  rodzaj: 'glowna' as const,
                  onPress: () => { onClose(); router.push(`/raport-budowy/${s.raportId}` as never); },
                }] : []),
              ]}
            />
          );
        })}
      </ScrollView>
    </SafeModal>
  );
}

function OknoWarstwySzkicu({ widoczne, theme, warstwy, onClose, onWybierz }: {
  widoczne: boolean;
  theme: AppTheme;
  warstwy: WarstwaLiniowki[];
  onClose: () => void;
  onWybierz: (w: WyborWarstwy) => void;
}) {
  const [klucz, setKlucz] = useState<string | undefined>();
  const [nowa, setNowa] = useState(false);
  const [nazwa, setNazwa] = useState('');
  const [opis, setOpis] = useState('');
  const nowaWarstwa = nowa || warstwy.length === 0;

  const dalej = () => {
    if (nowaWarstwa) {
      if (!nazwa.trim()) {
        pokazKomunikat('Warstwa', 'Podaj nazwę nowej warstwy.');
        return;
      }
      onWybierz({ nazwa: nazwa.trim(), opis: opis.trim() || undefined });
    } else if (klucz) {
      onWybierz({ klucz });
    } else {
      pokazKomunikat('Warstwa', 'Wybierz warstwę albo dodaj nową.');
      return;
    }
    setKlucz(undefined);
    setNowa(false);
    setNazwa('');
    setOpis('');
  };

  return (
    <SafeModal
      visible={widoczne}
      tytul="Warstwa szkicu"
      theme={theme}
      onClose={onClose}
      prawy={{ tekst: 'Rysuj', onPress: dalej, kolor: theme.colors.primary }}
    >
      <ScrollView contentContainerStyle={{ padding: ODSTEP.l, gap: ODSTEP.m }} keyboardShouldPersistTaps="handled">
        <Sekcja
          tytul="Warstwa"
          info="Istniejąca warstwa: malujesz tylko po jej obszarze na PZT, a po zatwierdzeniu dostajesz zamalowaną powierzchnię. Nowa warstwa: rysujesz po całym arkuszu."
        >
          <View style={stylFormularza.chipy}>
            {warstwy.map((w) => (
              <Wybor
                key={w.klucz}
                zaznaczony={!nowaWarstwa && klucz === w.klucz}
                etykieta={w.nazwa}
                accessibilityLabel={`Przypisz do ${w.nazwa}`}
                onPress={() => { setNowa(false); setKlucz(w.klucz); }}
              />
            ))}
            <Wybor zaznaczony={nowaWarstwa} etykieta="+ Nowa warstwa" onPress={() => setNowa(true)} />
          </View>
        </Sekcja>
        {nowaWarstwa ? (
          <Sekcja tytul="Nowa warstwa" info="Dostaje kolor pióra. Trafia na liniówkę i do filtra warstw.">
            <View style={{ gap: ODSTEP.m }}>
              <Pole etykieta="Nazwa" value={nazwa} onChangeText={setNazwa} accessibilityLabel="Nazwa nowej warstwy" wymagane />
              <Pole etykieta="Opis" value={opis} onChangeText={setOpis} accessibilityLabel="Opis nowej warstwy" multiline />
            </View>
          </Sekcja>
        ) : null}
        <Przycisk tekst="Rysuj" accessibilityLabel="Zacznij rysować" onPress={dalej} />
      </ScrollView>
    </SafeModal>
  );
}

function OknoZapisuSzkicu({ widoczne, theme, nazwaWarstwy, wynik, wKlipie, raporty, raportId, onClose, onZapisz }: {
  widoczne: boolean;
  theme: AppTheme;
  nazwaWarstwy: string;
  wynik: { razemM2: number; powierzchnie: PowierzchniaSzkicuObszaru[] };
  wKlipie: boolean;
  raporty: RaportDzienny[];
  raportId?: string;
  onClose: () => void;
  onZapisz: (raportId: string | undefined) => void;
}) {
  const [raport, setRaport] = useState<string | undefined>(raportId);

  return (
    <SafeModal
      visible={widoczne}
      tytul="Zapisz szkic"
      theme={theme}
      onClose={onClose}
      prawy={{ tekst: 'Zapisz', onPress: () => onZapisz(raport), kolor: theme.colors.primary }}
    >
      <ScrollView contentContainerStyle={{ padding: ODSTEP.l, gap: ODSTEP.m }} keyboardShouldPersistTaps="handled">
        <Sekcja
          tytul="Zamalowana powierzchnia"
          info={wKlipie
            ? 'Liczona tylko wewnątrz obszarów warstwy, w skali powierzchni obszaru z XFDF.'
            : 'Liczona w skali arkusza. Poniżej część, która wypada na obszarach PZT.'}
        >
          <View accessibilityLabel="Powierzchnia szkicu">
            <WierszDanych etykieta={`Razem · ${nazwaWarstwy}`} wartosc={m2(wynik.razemM2)} />
            {wynik.powierzchnie.map((p) => (
              <WierszDanych key={p.obszarId} etykieta={p.obszarNazwa || 'Obszar'} wartosc={m2(p.m2)} />
            ))}
          </View>
        </Sekcja>
        <Sekcja tytul="Raport dzienny" info="Podłączony szkic widać w raporcie z tego dnia, a z liniówki przejdziesz do raportu.">
          {raporty.length === 0 ? (
            <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>Brak raportów tej budowy.</Text>
          ) : (
            <View style={stylFormularza.chipy}>
              <Wybor zaznaczony={!raport} etykieta="Bez raportu" onPress={() => setRaport(undefined)} />
              {raporty.map((r) => (
                <Wybor
                  key={r.id}
                  zaznaczony={raport === r.id}
                  etykieta={dataPl(r.data)}
                  accessibilityLabel={`Raport ${dataPl(r.data)}`}
                  onPress={() => setRaport(r.id)}
                />
              ))}
            </View>
          )}
        </Sekcja>
        <Przycisk tekst="Zapisz" accessibilityLabel="Zapisz szkic na liniówce" onPress={() => onZapisz(raport)} />
      </ScrollView>
    </SafeModal>
  );
}

const styles = StyleSheet.create({
  filtrRzad: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rzad: { flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: PROMIEN.pigulka, paddingHorizontal: 10, paddingVertical: 7 },
  kropka: { width: 14, height: 14, borderRadius: 4 },
  tab: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, maxWidth: 200 },
  pasek: { borderWidth: 1.5, borderRadius: 12, padding: 10, gap: 10 },
  probka: { width: 28, height: 28, borderRadius: 14 },
  grubosc: { width: 40, height: 32, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  okno: { borderWidth: 1, borderRadius: 12, padding: 10 },
});
