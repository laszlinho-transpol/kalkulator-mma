// Szkic geodezyjny – rzut z góry: kartka z siatką, punkty z odczytami, analiza (połączenia, punkty pośrednie).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, Pole, Przycisk, Wiersz, WierszDanych, Wybor, useMotyw, TYPOGRAFIA } from '../../../../src/components/ui';
import { Kartka } from '../../../../src/components/geodezja/Kartka';
import { Okienko, PasekPlywajacy, PrzyciskPaska } from '../../../../src/components/geodezja/Okienko';
import { useRouteId } from '../../../../src/hooks/useRouteId';
import { useGeodezjaStore } from '../../../../src/stores/geodezjaStore';
import {
  czynnikLuku, dopasujWidok, fm, liczbaZTekstu, naEkran, naSwiat, odl, rzutNaKrzywa, zakresPunktow, zeZnakiem, zoomWokol,
  type Pkt, type Widok,
} from '../../../../src/geodezja/geometria';
import {
  BEZ_WARSTWY, analizaLinii, celeDlaPunktu, dodajPunkt, dodajPunktPosredni, edytujLinie, edytujPunkt, geometriaLinii,
  horyzontInstrumentu, liniaMiedzy, liniaWidoczna, nazwaPunktu, odlegloscPosredniegoOd, polacz, polaWyliczone,
  pozycjaPunktu, przelaczWarstwe, przesunPunkt, punktWidoczny, usunLinie, usunPunkt, ustawDlugoscLinii, warstwySzkicu,
  wygnijLinie, wysokoscPunktu, zakresSzkicu, type CelSpadku, type DanePunktu, type LiniaGeodezyjna, type PunktGeodezyjny,
  type SzkicGeodezyjny,
} from '../../../../src/geodezja/szkic';
import { PAPIER, rysunekSzkicu, svgSzkicu } from '../../../../src/geodezja/rysunek';
import { dokumentSzkicuGeodezyjnego } from '../../../../src/eksport/dokumenty';
import { udostepnijDokumentPdf } from '../../../../src/eksport/udostepnijPdf';
import { udostepnijSvg } from '../../../../src/eksport/udostepnijSvg';
import { potwierdzAkcje } from '../../../../src/utils/dialog';

type Tryb = 'punkty' | 'polacz' | 'posredni';
type Zaznaczenie = { typ: 'punkt'; id: string } | { typ: 'linia'; id: string } | null;
type Chwyt = { typ: 'punkt'; id: string } | { typ: 'luk'; id: string } | null;
type Rozwiniety = null | 'analiza' | 'filtr' | 'siatka';

const PROMIEN_PUNKTU = 22;
const PROMIEN_UCHWYTU = 16;
const PROMIEN_LINII = 12;
const BOKI_SIATKI = [0.5, 1, 2, 5, 10];

export default function SzkicGeodezyjnyScreen() {
  const id = useRouteId();
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const zapisany = useGeodezjaStore((s) => s.szkice.find((x) => x.id === id));
  const zapiszSzkic = useGeodezjaStore((s) => s.zapiszSzkic);
  const usunSzkicZeStore = useGeodezjaStore((s) => s.usunSzkic);

  const [szkic, setSzkicStan] = useState<SzkicGeodezyjny | undefined>(zapisany);
  const brudny = useRef(false);
  const usuniety = useRef(false);
  const ostatni = useRef(szkic);
  ostatni.current = szkic;

  useEffect(() => {
    if (!szkic && zapisany) setSzkicStan(zapisany);
  }, [zapisany, szkic]);

  const setSzkic = (f: (s: SzkicGeodezyjny) => SzkicGeodezyjny) => {
    brudny.current = true;
    setSzkicStan((s) => (s ? f(s) : s));
  };

  useEffect(() => {
    if (!szkic || !brudny.current) return undefined;
    const t = setTimeout(() => {
      brudny.current = false;
      if (!usuniety.current) zapiszSzkic(szkic);
    }, 400);
    return () => clearTimeout(t);
  }, [szkic, zapiszSzkic]);

  useEffect(() => () => {
    if (brudny.current && !usuniety.current && ostatni.current) zapiszSzkic(ostatni.current);
  }, [zapiszSzkic]);

  const [rozmiar, setRozmiar] = useState({ w: 0, h: 0 });
  const [widok, setWidok] = useState<Widok>({ s: 40, tx: 0, ty: 0 });
  const [tryb, setTryb] = useState<Tryb>('punkty');
  const [wybrane, setWybrane] = useState<string[]>([]);
  const [zazn, setZazn] = useState<Zaznaczenie>(null);
  const [rozwiniety, setRozwiniety] = useState<Rozwiniety>(null);
  const [oknoPunktu, setOknoPunktu] = useState<{ id: string; nowy: boolean } | null>(null);
  const [oknoPosredni, setOknoPosredni] = useState<{ od: string; do: string } | null>(null);
  const [oknoDane, setOknoDane] = useState(false);
  const [blokada, setBlokada] = useState<{ punktId: string; liniaId: string; dlugosc: number } | null>(null);
  const [przeciagany, setPrzeciagany] = useState<string | null>(null);
  const [ostatniaWarstwa, setOstatniaWarstwa] = useState<string | undefined>(undefined);
  const chwyt = useRef<Chwyt>(null);
  const dopasowano = useRef(false);

  const dopasuj = (s = szkic, w = rozmiar.w, h = rozmiar.h) => {
    if (!s || w <= 0 || h <= 0) return;
    const pts = zakresSzkicu(s);
    if (pts.length <= 1) {
      const p = pts[0] ?? { x: 0, y: 0 };
      setWidok({ s: 40, tx: w / 2 - p.x * 40, ty: h / 2 - p.y * 40 });
      return;
    }
    setWidok(dopasujWidok(zakresPunktow(pts), w, h - 120, 95, 40));
    setWidok((v) => ({ ...v, ty: v.ty + 80 }));
  };

  useEffect(() => {
    if (!dopasowano.current && szkic && rozmiar.w > 0) {
      dopasowano.current = true;
      dopasuj(szkic, rozmiar.w, rozmiar.h);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [szkic, rozmiar]);

  const prymitywy = useMemo(() => {
    if (!szkic || rozmiar.w <= 0) return [];
    let okrag: { srodek: Pkt; r: number } | null = null;
    if (blokada && przeciagany === blokada.punktId) {
      const l = szkic.linie.find((q) => q.id === blokada.liniaId);
      const drugi = l ? pozycjaPunktu(szkic, l.a === blokada.punktId ? l.b : l.a) : null;
      if (l && drugi) okrag = { srodek: drugi, r: blokada.dlugosc / czynnikLuku(l.wygiecie) };
    }
    return rysunekSzkicu(szkic, widok, {
      szer: rozmiar.w,
      wys: rozmiar.h,
      zaznaczonyPunkt: zazn?.typ === 'punkt' ? zazn.id : null,
      zaznaczonaLinia: zazn?.typ === 'linia' ? zazn.id : null,
      wybrane,
      uchwyty: tryb === 'punkty',
      okregBlokady: okrag,
    });
  }, [szkic, widok, rozmiar, zazn, wybrane, tryb, blokada, przeciagany]);

  if (!szkic) {
    return (
      <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
        <AppHeader tytul="Szkic geodezyjny" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
        <Text style={[styles.pusto, { color: theme.colors.textSecondary }]}>Nie znaleziono szkicu.</Text>
      </View>
    );
  }

  // --- trafienia na kartce (piksele ekranu) ---

  const punktPod = (e: Pkt): string | undefined => {
    let best: { id: string; d: number } | undefined;
    for (const p of szkic.punkty) {
      if (!punktWidoczny(szkic, p)) continue;
      const poz = pozycjaPunktu(szkic, p.id);
      if (!poz) continue;
      const d = odl(naEkran(widok, poz), e);
      if (d < PROMIEN_PUNKTU && (!best || d < best.d)) best = { id: p.id, d };
    }
    return best?.id;
  };

  const lukPod = (e: Pkt): string | undefined => {
    for (const l of szkic.linie) {
      if (!liniaWidoczna(szkic, l)) continue;
      const g = geometriaLinii(szkic, l);
      if (g && odl(naEkran(widok, g.a), naEkran(widok, g.b)) > 28 && odl(naEkran(widok, g.m), e) < PROMIEN_UCHWYTU) return l.id;
    }
    return undefined;
  };

  const liniaPod = (e: Pkt): string | undefined => {
    const w = naSwiat(widok, e);
    let best: { id: string; d: number } | undefined;
    for (const l of szkic.linie) {
      if (!liniaWidoczna(szkic, l)) continue;
      const g = geometriaLinii(szkic, l);
      if (!g) continue;
      const d = rzutNaKrzywa(g.a, g.c, g.b, w).odleglosc * widok.s;
      if (d < PROMIEN_LINII && (!best || d < best.d)) best = { id: l.id, d };
    }
    return best?.id;
  };

  // --- gesty ---

  const onChwyc = (e: Pkt): boolean => {
    if (tryb !== 'punkty') return false;
    const p = punktPod(e);
    if (p) {
      chwyt.current = { typ: 'punkt', id: p };
      return true;
    }
    const l = lukPod(e);
    if (l) {
      chwyt.current = { typ: 'luk', id: l };
      return true;
    }
    return false;
  };

  const onPrzeciagnij = (e: Pkt) => {
    const c = chwyt.current;
    if (!c) return;
    const w = naSwiat(widok, e);
    if (c.typ === 'punkt') {
      if (przeciagany !== c.id) {
        setPrzeciagany(c.id);
        setZazn({ typ: 'punkt', id: c.id });
      }
      const b = blokada && blokada.punktId === c.id ? { liniaId: blokada.liniaId, dlugosc: blokada.dlugosc } : null;
      setSzkic((s) => przesunPunkt(s, c.id, w, b));
    } else {
      setSzkic((s) => wygnijLinie(s, c.id, w));
    }
  };

  const onPusc = () => {
    chwyt.current = null;
    setPrzeciagany(null);
  };

  const onStukniecie = (e: Pkt) => {
    setRozwiniety(null);
    const p = punktPod(e);
    if (tryb === 'polacz') {
      if (!p) return;
      const poprzedni = wybrane[wybrane.length - 1];
      if (poprzedni && poprzedni !== p) setSzkic((s) => polacz(s, poprzedni, p).szkic);
      setWybrane([p]);
      return;
    }
    if (tryb === 'posredni') {
      if (!p) return;
      const nowe = wybrane.includes(p) ? wybrane : [...wybrane, p];
      if (nowe.length >= 2) {
        setWybrane(nowe.slice(0, 2));
        setOknoPosredni({ od: nowe[0], do: nowe[1] });
      } else setWybrane(nowe);
      return;
    }
    if (p) {
      setZazn({ typ: 'punkt', id: p });
      return;
    }
    const l = liniaPod(e);
    if (l) {
      setZazn({ typ: 'linia', id: l });
      return;
    }
    if (zazn) {
      setZazn(null);
      return;
    }
    const { szkic: nowy, punkt } = dodajPunkt(szkic, naSwiat(widok, e), { warstwa: ostatniaWarstwa });
    brudny.current = true;
    setSzkicStan(nowy);
    setOknoPunktu({ id: punkt.id, nowy: true });
  };

  const zmienTryb = (t: Tryb) => {
    setTryb(t);
    setWybrane([]);
    setZazn(null);
    setRozwiniety(null);
  };

  const zoom = (k: number) => setWidok((w) => zoomWokol(w, w.s * k, { x: rozmiar.w / 2, y: rozmiar.h / 2 }));

  const warstwy = warstwySzkicu(szkic);
  const bezWarstwy = szkic.punkty.some((p) => !p.warstwa?.trim());
  const punktOkna = oknoPunktu ? szkic.punkty.find((p) => p.id === oknoPunktu.id) : undefined;

  const naglowekTrybu = tryb === 'polacz'
    ? (wybrane.length ? `Łączenie od punktu ${nazwaPunktu(szkic, wybrane[0])}` : 'Łączenie punktów')
    : tryb === 'posredni'
      ? (wybrane.length ? `Punkt 1: ${nazwaPunktu(szkic, wybrane[0])} – wskaż punkt 2` : 'Wskaż punkt 1')
      : null;

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={szkic.nazwa}
        podtytul={szkic.archiwum ? 'Archiwum' : 'Szkic geodezyjny – rzut z góry'}
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
        prawy={{ tekst: 'Edytuj', onPress: () => setOknoDane(true) }}
        udostepnij={() => udostepnijDokumentPdf(dokumentSzkicuGeodezyjnego(szkic))}
      />
      <View style={styles.obszar}>
        <Kartka
          accessibilityLabel="Kartka szkicu"
          widok={widok}
          onWidok={setWidok}
          prymitywy={prymitywy}
          szer={rozmiar.w}
          wys={rozmiar.h}
          onRozmiar={(w, h) => setRozmiar({ w, h })}
          onStukniecie={onStukniecie}
          onChwyc={onChwyc}
          onPrzeciagnij={onPrzeciagnij}
          onPusc={onPusc}
        />

        <PasekPlywajacy style={styles.pasekGora}>
          <View style={styles.rzad}>
            <PrzyciskPaska tekst="Punkty" aktywny={tryb === 'punkty'} onPress={() => zmienTryb('punkty')} accessibilityLabel="Tryb punktów" />
            <PrzyciskPaska
              tekst={`Analiza ${rozwiniety === 'analiza' ? '▴' : '▾'}`}
              aktywny={tryb !== 'punkty' || rozwiniety === 'analiza'}
              onPress={() => setRozwiniety(rozwiniety === 'analiza' ? null : 'analiza')}
              accessibilityLabel="Analiza"
            />
            <PrzyciskPaska
              tekst={`Filtr${szkic.ukryteWarstwy.length ? ` · ${szkic.ukryteWarstwy.length}` : ''} ${rozwiniety === 'filtr' ? '▴' : '▾'}`}
              aktywny={rozwiniety === 'filtr' || szkic.ukryteWarstwy.length > 0}
              onPress={() => setRozwiniety(rozwiniety === 'filtr' ? null : 'filtr')}
              accessibilityLabel="Filtr warstw"
            />
            <PrzyciskPaska
              tekst={`# ${rozwiniety === 'siatka' ? '▴' : '▾'}`}
              aktywny={rozwiniety === 'siatka'}
              onPress={() => setRozwiniety(rozwiniety === 'siatka' ? null : 'siatka')}
              accessibilityLabel="Ustawienia siatki"
            />
          </View>

          {rozwiniety === 'analiza' ? (
            <View style={styles.rzad}>
              <PrzyciskPaska tekst="Połącz punkty" aktywny={tryb === 'polacz'} onPress={() => zmienTryb('polacz')} />
              <PrzyciskPaska tekst="Punkty pośrednie" aktywny={tryb === 'posredni'} onPress={() => zmienTryb('posredni')} />
            </View>
          ) : null}

          {rozwiniety === 'filtr' ? (
            <View style={styles.rzad}>
              {warstwy.length === 0 && !bezWarstwy ? <Text style={{ color: theme.colors.textSecondary }}>Brak warstw</Text> : null}
              {[...warstwy, ...(bezWarstwy ? [BEZ_WARSTWY] : [])].map((w) => (
                <PrzyciskPaska
                  key={w || '-'}
                  tekst={`${szkic.ukryteWarstwy.includes(w) ? '○' : '●'} ${w || 'Bez warstwy'}`}
                  aktywny={!szkic.ukryteWarstwy.includes(w)}
                  onPress={() => setSzkic((s) => przelaczWarstwe(s, w))}
                  accessibilityLabel={`Warstwa ${w || 'Bez warstwy'}`}
                />
              ))}
            </View>
          ) : null}

          {rozwiniety === 'siatka' ? (
            <View style={styles.rzad}>
              <PrzyciskPaska
                tekst={szkic.siatka ? 'Siatka wł.' : 'Siatka wył.'}
                aktywny={szkic.siatka}
                onPress={() => setSzkic((s) => ({ ...s, siatka: !s.siatka }))}
                accessibilityLabel="Pokaż siatkę"
              />
              {BOKI_SIATKI.map((b) => (
                <PrzyciskPaska
                  key={b}
                  tekst={`${fm(b, b < 1 ? 1 : 0)} m`}
                  aktywny={szkic.bokSiatki === b}
                  onPress={() => setSzkic((s) => ({ ...s, bokSiatki: b, siatka: true }))}
                  accessibilityLabel={`Bok siatki ${fm(b, b < 1 ? 1 : 0)} m`}
                />
              ))}
              <View style={{ width: 110 }}>
                <PoleBoku wartosc={szkic.bokSiatki} onZmien={(b) => setSzkic((s) => ({ ...s, bokSiatki: b, siatka: true }))} />
              </View>
            </View>
          ) : null}

          {naglowekTrybu ? (
            <View style={styles.rzad}>
              <Text style={[styles.trybTekst, { color: theme.colors.text }]} numberOfLines={1}>{naglowekTrybu}</Text>
              <PrzyciskPaska tekst="Zakończ" onPress={() => zmienTryb('punkty')} accessibilityLabel="Zakończ analizę" kolor={theme.colors.success} aktywny />
            </View>
          ) : null}
        </PasekPlywajacy>

        {!zazn ? (
          <PasekPlywajacy style={[styles.lupka, { bottom: insets.bottom + 8 }]}>
            <View style={styles.rzad}>
              <PrzyciskPaska tekst="−" onPress={() => zoom(1 / 1.5)} accessibilityLabel="Oddal" />
              <PrzyciskPaska tekst="+" onPress={() => zoom(1.5)} accessibilityLabel="Przybliż" />
              <PrzyciskPaska tekst="⤢" onPress={() => dopasuj()} accessibilityLabel="Dopasuj widok" />
            </View>
          </PasekPlywajacy>
        ) : null}

        {zazn ? (
          <PasekPlywajacy style={[styles.panelDol, { bottom: insets.bottom + 8 }]}>
            <ScrollView style={{ maxHeight: Math.max(180, rozmiar.h * 0.46) }} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
              {zazn.typ === 'punkt' ? (
                <PanelPunktu
                  szkic={szkic}
                  punktId={zazn.id}
                  blokada={blokada?.punktId === zazn.id ? blokada : null}
                  onBlokada={(b) => {
                    setBlokada(b);
                    if (b) {
                      const poz = pozycjaPunktu(szkic, b.punktId);
                      if (poz) setSzkic((s) => przesunPunkt(s, b.punktId, poz, { liniaId: b.liniaId, dlugosc: b.dlugosc }));
                    }
                  }}
                  onZmien={setSzkic}
                  onEdytuj={() => setOknoPunktu({ id: zazn.id, nowy: false })}
                  onUsun={() => potwierdzAkcje('Usunąć punkt?', 'Usunięte zostaną też jego połączenia i punkty pośrednie na nich.', () => {
                    setSzkic((s) => usunPunkt(s, zazn.id));
                    setZazn(null);
                  })}
                  onZamknij={() => setZazn(null)}
                />
              ) : (
                <PanelLinii
                  szkic={szkic}
                  liniaId={zazn.id}
                  onZmien={setSzkic}
                  onPosredni={(l) => setOknoPosredni({ od: l.a, do: l.b })}
                  onUsun={() => potwierdzAkcje('Usunąć połączenie?', 'Punkty pośrednie na tej linii też zostaną usunięte.', () => {
                    setSzkic((s) => usunLinie(s, zazn.id));
                    setZazn(null);
                  })}
                  onZamknij={() => setZazn(null)}
                />
              )}
            </ScrollView>
          </PasekPlywajacy>
        ) : null}
      </View>

      {oknoPunktu && punktOkna ? (
        <OknoPunktu
          szkic={szkic}
          punkt={punktOkna}
          nowy={oknoPunktu.nowy}
          onAnuluj={() => {
            if (oknoPunktu.nowy) setSzkic((s) => usunPunkt(s, oknoPunktu.id));
            setOknoPunktu(null);
          }}
          onZapisz={(dane, odleglosc) => {
            setSzkic((s) => {
              let z = edytujPunkt(s, oknoPunktu.id, dane);
              const p = z.punkty.find((q) => q.id === oknoPunktu.id);
              if (p?.naLinii && odleglosc != null) {
                const l = z.linie.find((q) => q.id === p.naLinii!.liniaId);
                const g = l ? geometriaLinii(z, l) : null;
                if (g) {
                  z = { ...z, punkty: z.punkty.map((q) => (q.id === p.id ? { ...q, naLinii: { ...q.naLinii!, odleglosc: Math.max(0, Math.min(g.dlugosc, odleglosc)) } } : q)) };
                }
              }
              return z;
            });
            setOstatniaWarstwa(dane.warstwa?.trim() || undefined);
            setOknoPunktu(null);
          }}
        />
      ) : null}

      {oknoPosredni ? (
        <OknoPosredni
          szkic={szkic}
          od={oknoPosredni.od}
          doPunktu={oknoPosredni.do}
          onAnuluj={() => {
            setOknoPosredni(null);
            setWybrane([]);
          }}
          onZapisz={(d) => {
            const { szkic: z, punkt } = dodajPunktPosredni(szkic, oknoPosredni.od, oknoPosredni.do, d);
            brudny.current = true;
            setSzkicStan(z);
            setOknoPosredni(null);
            setWybrane([]);
            if (punkt) {
              setTryb('punkty');
              setZazn({ typ: 'punkt', id: punkt.id });
            }
          }}
        />
      ) : null}

      {oknoDane ? (
        <OknoDanych
          szkic={szkic}
          onAnuluj={() => setOknoDane(false)}
          onZapisz={(z) => {
            setSzkic((s) => ({ ...s, ...z }));
            setOknoDane(false);
          }}
          onArchiwum={() => {
            setSzkic((s) => ({ ...s, archiwum: !s.archiwum }));
            setOknoDane(false);
          }}
          onSvg={() => udostepnijSvg(svgSzkicu(szkic).svg, szkic.nazwa)}
          onUsun={() => potwierdzAkcje('Usunąć szkic?', `„${szkic.nazwa}” zostanie usunięty bez możliwości przywrócenia.`, () => {
            usuniety.current = true;
            usunSzkicZeStore(szkic.id);
            setOknoDane(false);
            router.back();
          })}
        />
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------

function PoleBoku({ wartosc, onZmien }: { wartosc: number; onZmien: (b: number) => void }) {
  const [t, setT] = useState(fm(wartosc, 2));
  useEffect(() => setT(fm(wartosc, 2)), [wartosc]);
  return (
    <Pole
      value={t}
      onChangeText={(v) => {
        setT(v);
        const n = liczbaZTekstu(v);
        if (n != null && n > 0.01) onZmien(n);
      }}
      liczba
      jednostka="m"
      accessibilityLabel="Bok siatki [m]"
    />
  );
}

function tekstCelu(c: ReturnType<typeof celeDlaPunktu>[number]): string {
  return [
    c.odczyt != null ? `${c.odczyt} mm` : null,
    c.rzedna != null ? `H ${fm(c.rzedna, 3)} m` : null,
    c.roznica != null ? `Δh ${zeZnakiem(c.roznica * 1000, 0)} mm` : null,
  ].filter(Boolean).join(' · ');
}

function WyborKierunku({ szkic, linia, od, onZmien }: {
  szkic: SzkicGeodezyjny;
  linia: LiniaGeodezyjna;
  od: 'a' | 'b';
  onZmien: (od: 'a' | 'b') => void;
}) {
  const a = nazwaPunktu(szkic, linia.a);
  const b = nazwaPunktu(szkic, linia.b);
  return (
    <View style={styles.rzad}>
      <Wybor zaznaczony={od === 'a'} etykieta={`${a} → ${b}`} accessibilityLabel={`Spadek z ${a} do ${b}`} onPress={() => onZmien('a')} />
      <Wybor zaznaczony={od === 'b'} etykieta={`${b} → ${a}`} accessibilityLabel={`Spadek z ${b} do ${a}`} onPress={() => onZmien('b')} />
    </View>
  );
}

function PanelPunktu({ szkic, punktId, blokada, onBlokada, onZmien, onEdytuj, onUsun, onZamknij }: {
  szkic: SzkicGeodezyjny;
  punktId: string;
  blokada: { punktId: string; liniaId: string; dlugosc: number } | null;
  onBlokada: (b: { punktId: string; liniaId: string; dlugosc: number } | null) => void;
  onZmien: (f: (s: SzkicGeodezyjny) => SzkicGeodezyjny) => void;
  onEdytuj: () => void;
  onUsun: () => void;
  onZamknij: () => void;
}) {
  const theme = useMotyw();
  const p = szkic.punkty.find((q) => q.id === punktId);
  const [dlugosci, setDlugosci] = useState<Record<string, string>>({});
  const [celSpadek, setCelSpadek] = useState('');
  useEffect(() => {
    setDlugosci({});
    setCelSpadek(p?.cel ? fm(p.cel.spadek, 2) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [punktId]);
  if (!p) return null;
  const h = wysokoscPunktu(szkic, p.id);
  const wyl = polaWyliczone(szkic, p.id);
  const cele = celeDlaPunktu(szkic, p.id);
  const linie = p.naLinii ? [] : szkic.linie.filter((l) => l.a === p.id || l.b === p.id);
  const liniaPosr = p.naLinii ? szkic.linie.find((l) => l.id === p.naLinii!.liniaId) : undefined;

  const ustawCelWlasny = (cel: CelSpadku | undefined) => onZmien((s) => edytujPunkt(s, p.id, { cel }));

  return (
    <>
      <View style={styles.rzad}>
        <Text style={[TYPOGRAFIA.tytulKarty, { color: theme.colors.text, flexShrink: 1 }]} numberOfLines={1}>
          Punkt {p.nazwa}{p.warstwa ? ` · ${p.warstwa}` : ''}
        </Text>
        <View style={{ flex: 1 }} />
        <PrzyciskPaska tekst="Edytuj" onPress={onEdytuj} accessibilityLabel="Edytuj punkt" />
        <PrzyciskPaska tekst="Usuń" onPress={onUsun} accessibilityLabel="Usuń punkt" kolor={theme.colors.danger} />
        <PrzyciskPaska tekst="✕" onPress={onZamknij} accessibilityLabel="Zamknij panel" />
      </View>
      <WierszDanych etykieta={`Odczyt${wyl.odczyt ? ' (wyliczony)' : ''}`} wartosc={h?.odczyt != null ? `${h.odczyt} mm` : '—'} />
      <WierszDanych etykieta={`Rzędna${wyl.rzedna ? ' (wyliczona)' : ''}`} wartosc={h?.rzedna != null ? `${fm(h.rzedna, 3)} m` : '—'} />
      {cele.map((c) => {
        const l = szkic.linie.find((q) => q.id === c.liniaId);
        return (
          <WierszDanych
            key={c.liniaId}
            etykieta={`Cel ${l ? `${nazwaPunktu(szkic, l.a)}–${nazwaPunktu(szkic, l.b)}` : ''}`}
            wartosc={tekstCelu(c)}
            kolor={PAPIER.cel}
          />
        );
      })}
      {p.komentarz ? <Text style={{ color: theme.colors.textSecondary, fontStyle: 'italic' }}>{p.komentarz}</Text> : null}

      {liniaPosr ? (
        <>
          <WierszDanych
            etykieta={`Od punktu ${nazwaPunktu(szkic, liniaPosr.a)}`}
            wartosc={`${fm(odlegloscPosredniegoOd(szkic, p.id, liniaPosr.a) ?? 0, 2)} m`}
          />
          <Text style={[TYPOGRAFIA.sekcja, { color: theme.colors.textSecondary }]}>Cel punktu</Text>
          <View style={styles.rzad}>
            <Wybor zaznaczony={!p.cel} etykieta="Z linii" onPress={() => ustawCelWlasny(undefined)} accessibilityLabel="Cel z linii" />
            <Wybor
              zaznaczony={!!p.cel}
              etykieta="Własny"
              accessibilityLabel="Własny cel punktu"
              onPress={() => ustawCelWlasny(p.cel ?? liniaPosr.cel ?? { spadek: 2, od: 'a' })}
            />
          </View>
          {p.cel ? (
            <>
              <Wiersz>
                <Pole
                  etykieta="Spadek"
                  value={celSpadek}
                  onChangeText={(v) => {
                    setCelSpadek(v);
                    const n = liczbaZTekstu(v);
                    if (n != null && p.cel) ustawCelWlasny({ ...p.cel, spadek: n });
                  }}
                  liczba
                  jednostka="%"
                  accessibilityLabel="Spadek celu punktu [%]"
                />
              </Wiersz>
              <WyborKierunku szkic={szkic} linia={liniaPosr} od={p.cel.od} onZmien={(od) => ustawCelWlasny({ ...p.cel!, od })} />
            </>
          ) : null}
        </>
      ) : null}

      {linie.map((l) => {
        const drugi = l.a === p.id ? l.b : l.a;
        const an = analizaLinii(szkic, l);
        const zablokowana = blokada?.liniaId === l.id;
        const tekst = dlugosci[l.id] ?? '';
        return (
          <View key={l.id} style={styles.rzad}>
            <Text style={{ color: theme.colors.text, fontWeight: '700', minWidth: 120 }} numberOfLines={1}>
              {zablokowana ? '🔒 ' : ''}Do {nazwaPunktu(szkic, drugi)}: {fm(an?.dlugosc ?? 0, 2)} m
            </Text>
            {zablokowana ? (
              <PrzyciskPaska tekst="Odblokuj" onPress={() => onBlokada(null)} accessibilityLabel={`Odblokuj odległość do ${nazwaPunktu(szkic, drugi)}`} />
            ) : (
              <>
                <View style={{ width: 96 }}>
                  <Pole
                    value={tekst}
                    onChangeText={(v) => setDlugosci((d) => ({ ...d, [l.id]: v }))}
                    placeholder={fm(an?.dlugosc ?? 0, 2)}
                    liczba
                    jednostka="m"
                    accessibilityLabel={`Odległość do ${nazwaPunktu(szkic, drugi)} [m]`}
                  />
                </View>
                <PrzyciskPaska
                  tekst="Zablokuj"
                  accessibilityLabel={`Zablokuj odległość do ${nazwaPunktu(szkic, drugi)}`}
                  onPress={() => {
                    const n = liczbaZTekstu(tekst) ?? an?.dlugosc;
                    if (n && n > 0) onBlokada({ punktId: p.id, liniaId: l.id, dlugosc: n });
                  }}
                />
              </>
            )}
          </View>
        );
      })}
    </>
  );
}

function PanelLinii({ szkic, liniaId, onZmien, onPosredni, onUsun, onZamknij }: {
  szkic: SzkicGeodezyjny;
  liniaId: string;
  onZmien: (f: (s: SzkicGeodezyjny) => SzkicGeodezyjny) => void;
  onPosredni: (l: LiniaGeodezyjna) => void;
  onUsun: () => void;
  onZamknij: () => void;
}) {
  const theme = useMotyw();
  const l = szkic.linie.find((q) => q.id === liniaId);
  const an = l ? analizaLinii(szkic, l) : null;
  const [dl, setDl] = useState('');
  const [cel, setCel] = useState('');
  const [celOd, setCelOd] = useState<'a' | 'b'>('a');
  useEffect(() => {
    setDl(an ? fm(an.dlugosc, 2) : '');
    setCel(l?.cel ? fm(l.cel.spadek, 2) : '');
    setCelOd(l?.cel?.od ?? (an?.wDol === 'a' ? 'b' : 'a'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liniaId]);
  if (!l || !an) return null;
  const a = nazwaPunktu(szkic, l.a);
  const b = nazwaPunktu(szkic, l.b);
  const pa = szkic.punkty.find((q) => q.id === l.a);
  const pb = szkic.punkty.find((q) => q.id === l.b);
  const moznaDlugosc = !(pa?.naLinii && pb?.naLinii);
  const spadekTekst = an.spadek != null
    ? `${fm(an.spadek, 2)}%${an.wDol ? ` · w stronę ${an.wDol === 'b' ? b : a}` : ''}`
    : 'brak wysokości';

  const ustawCel = (od = celOd, tekst = cel) => {
    const n = liczbaZTekstu(tekst);
    if (n == null) return;
    onZmien((s) => edytujLinie(s, l.id, { cel: { spadek: n, od } }));
  };

  return (
    <>
      <View style={styles.rzad}>
        <Text style={[TYPOGRAFIA.tytulKarty, { color: theme.colors.text }]} numberOfLines={1}>Połączenie {a} – {b}</Text>
        <View style={{ flex: 1 }} />
        <PrzyciskPaska tekst="✕" onPress={onZamknij} accessibilityLabel="Zamknij panel" />
      </View>
      <WierszDanych etykieta="Spadek" wartosc={spadekTekst} kolor={PAPIER.spadek} />
      {an.roznica != null ? <WierszDanych etykieta={`Różnica wysokości ${a}→${b}`} wartosc={`${zeZnakiem(an.roznica * 1000, 0)} mm`} /> : null}
      {moznaDlugosc ? (
        <View style={styles.rzad}>
          <View style={{ flex: 1 }}>
            <Pole etykieta="Odległość" value={dl} onChangeText={setDl} liczba jednostka="m" accessibilityLabel="Odległość linii [m]" />
          </View>
          <Przycisk
            maly
            wariant="drugi"
            tekst="Ustaw"
            accessibilityLabel="Ustaw odległość"
            style={{ alignSelf: 'flex-end' }}
            onPress={() => {
              const n = liczbaZTekstu(dl);
              if (n && n > 0) onZmien((s) => ustawDlugoscLinii(s, l.id, n));
            }}
          />
        </View>
      ) : null}
      <Text style={[TYPOGRAFIA.sekcja, { color: PAPIER.cel }]}>Cel</Text>
      <View style={styles.rzad}>
        <View style={{ flex: 1 }}>
          <Pole value={cel} onChangeText={setCel} placeholder="np. 2" liczba jednostka="%" accessibilityLabel="Spadek celu [%]" />
        </View>
        <Przycisk maly tekst="Ustaw cel" accessibilityLabel="Ustaw cel" onPress={() => ustawCel()} />
      </View>
      <WyborKierunku
        szkic={szkic}
        linia={l}
        od={celOd}
        onZmien={(od) => {
          setCelOd(od);
          if (l.cel) ustawCel(od, cel || fm(l.cel.spadek, 2));
        }}
      />
      <View style={[styles.rzad, { marginTop: 4 }]}>
        <PrzyciskPaska tekst="Punkt pośredni" onPress={() => onPosredni(l)} />
        {l.cel ? <PrzyciskPaska tekst="Usuń cel" onPress={() => onZmien((s) => edytujLinie(s, l.id, { cel: undefined }))} /> : null}
        {l.wygiecie ? <PrzyciskPaska tekst="Wyprostuj" onPress={() => onZmien((s) => edytujLinie(s, l.id, { wygiecie: 0 }))} /> : null}
        <PrzyciskPaska tekst="Usuń połączenie" onPress={onUsun} kolor={theme.colors.danger} />
      </View>
    </>
  );
}

function OknoPunktu({ szkic, punkt, nowy, onAnuluj, onZapisz }: {
  szkic: SzkicGeodezyjny;
  punkt: PunktGeodezyjny;
  nowy: boolean;
  onAnuluj: () => void;
  onZapisz: (dane: Partial<DanePunktu>, odleglosc?: number) => void;
}) {
  const [nazwa, setNazwa] = useState(punkt.nazwa);
  const [warstwa, setWarstwa] = useState(punkt.warstwa ?? '');
  const [odczyt, setOdczyt] = useState(punkt.odczyt != null ? String(punkt.odczyt) : '');
  const [rzedna, setRzedna] = useState(punkt.rzedna != null ? fm(punkt.rzedna, 3) : '');
  const [komentarz, setKomentarz] = useState(punkt.komentarz ?? '');
  const linia = punkt.naLinii ? szkic.linie.find((l) => l.id === punkt.naLinii!.liniaId) : undefined;
  const [odleglosc, setOdleglosc] = useState(linia ? fm(odlegloscPosredniegoOd(szkic, punkt.id, linia.a) ?? 0, 2) : '');
  const warstwy = warstwySzkicu(szkic);
  const hi = horyzontInstrumentu(szkic);
  const o = liczbaZTekstu(odczyt);
  const r = liczbaZTekstu(rzedna);
  const podpowiedzRzednej = r == null && o != null && hi != null ? fm(hi - o / 1000, 3) : undefined;
  const podpowiedzOdczytu = o == null && r != null && hi != null ? String(Math.round((hi - r) * 1000)) : undefined;
  const wyliczony = punkt.naLinii ? wysokoscPunktu(szkic, punkt.id) : null;

  return (
    <Okienko
      widoczne
      tytul={nowy ? `Nowy punkt ${punkt.nr}` : `Punkt ${punkt.nazwa}`}
      onAnuluj={onAnuluj}
      onZapisz={() => {
        const zLinii = linia ? liczbaZTekstu(odleglosc) : undefined;
        onZapisz(
          { nazwa, warstwa, odczyt: o, rzedna: r, komentarz },
          zLinii,
        );
      }}
    >
      <Wiersz>
        <Pole etykieta="Nazwa" value={nazwa} onChangeText={setNazwa} placeholder={String(punkt.nr)} accessibilityLabel="Nazwa punktu" />
        <Pole etykieta="Warstwa" value={warstwa} onChangeText={setWarstwa} placeholder="np. lewa krawędź" accessibilityLabel="Warstwa punktu" />
      </Wiersz>
      {warstwy.length > 0 ? (
        <View style={styles.rzad}>
          {warstwy.map((w) => (
            <Wybor key={w} zaznaczony={warstwa.trim() === w} etykieta={w} accessibilityLabel={`Wybierz warstwę ${w}`} onPress={() => setWarstwa(w)} />
          ))}
          <Wybor zaznaczony={!warstwa.trim()} etykieta="Bez warstwy" onPress={() => setWarstwa('')} />
        </View>
      ) : null}
      <Wiersz>
        <Pole
          etykieta="Odczyt"
          value={odczyt}
          onChangeText={setOdczyt}
          placeholder={podpowiedzOdczytu ?? (wyliczony?.odczyt != null ? String(wyliczony.odczyt) : undefined)}
          liczba
          jednostka="mm"
          accessibilityLabel="Odczyt z łaty [mm]"
          info="Wynik pomiaru z łaty w milimetrach. Gdy w szkicu jest punkt z odczytem i rzędną (reper), odczyt przelicza się na rzędną."
        />
        <Pole
          etykieta="Rzędna"
          value={rzedna}
          onChangeText={setRzedna}
          placeholder={podpowiedzRzednej ?? (wyliczony?.rzedna != null ? fm(wyliczony.rzedna, 3) : undefined)}
          liczba
          jednostka="m"
          accessibilityLabel="Rzędna [m]"
          info="Wpisz, jeśli znasz rzędną. Pierwszy punkt z odczytem i rzędną wyznacza horyzont instrumentu dla całego szkicu."
        />
      </Wiersz>
      {linia ? (
        <Pole
          etykieta={`Odległość od punktu ${nazwaPunktu(szkic, linia.a)}`}
          value={odleglosc}
          onChangeText={setOdleglosc}
          liczba
          jednostka="m"
          accessibilityLabel="Odległość punktu pośredniego [m]"
        />
      ) : null}
      <Pole etykieta="Komentarz" value={komentarz} onChangeText={setKomentarz} multiline accessibilityLabel="Komentarz punktu" />
    </Okienko>
  );
}

function OknoPosredni({ szkic, od, doPunktu, onAnuluj, onZapisz }: {
  szkic: SzkicGeodezyjny;
  od: string;
  doPunktu: string;
  onAnuluj: () => void;
  onZapisz: (odleglosc: number) => void;
}) {
  const l = liniaMiedzy(szkic, od, doPunktu);
  const a = pozycjaPunktu(szkic, od);
  const b = pozycjaPunktu(szkic, doPunktu);
  const dlugosc = l ? (analizaLinii(szkic, l)?.dlugosc ?? 0) : a && b ? odl(a, b) : 0;
  const [t, setT] = useState(fm(dlugosc / 2, 2));
  const n = liczbaZTekstu(t);
  return (
    <Okienko
      widoczne
      tytul={`Punkt pośredni ${nazwaPunktu(szkic, od)} → ${nazwaPunktu(szkic, doPunktu)}`}
      onAnuluj={onAnuluj}
      tekstZapisz="Dodaj punkt"
      onZapisz={() => {
        if (n != null && n >= 0 && n <= dlugosc + 1e-9) onZapisz(n);
      }}
    >
      <WierszDanych etykieta="Długość linii" wartosc={`${fm(dlugosc, 2)} m`} />
      <Pole
        etykieta={`Odległość od punktu ${nazwaPunktu(szkic, od)}`}
        value={t}
        onChangeText={setT}
        liczba
        jednostka="m"
        accessibilityLabel="Odległość od punktu 1 [m]"
      />
      {n != null && (n < 0 || n > dlugosc + 1e-9) ? <Text style={{ color: PAPIER.zaznaczenie, fontWeight: '700' }}>Odległość poza linią (0–{fm(dlugosc, 2)} m)</Text> : null}
    </Okienko>
  );
}

function OknoDanych({ szkic, onAnuluj, onZapisz, onArchiwum, onSvg, onUsun }: {
  szkic: SzkicGeodezyjny;
  onAnuluj: () => void;
  onZapisz: (z: Partial<SzkicGeodezyjny>) => void;
  onArchiwum: () => void;
  onSvg: () => void;
  onUsun: () => void;
}) {
  const [nazwa, setNazwa] = useState(szkic.nazwa);
  const [opis, setOpis] = useState(szkic.opis ?? '');
  return (
    <Okienko
      widoczne
      tytul="Dane szkicu"
      onAnuluj={onAnuluj}
      onZapisz={() => onZapisz({ nazwa: nazwa.trim() || szkic.nazwa, opis: opis.trim() || undefined })}
    >
      <Pole etykieta="Nazwa" value={nazwa} onChangeText={setNazwa} accessibilityLabel="Nazwa szkicu" />
      <Pole etykieta="Opis" value={opis} onChangeText={setOpis} multiline accessibilityLabel="Opis szkicu" />
      <Przycisk wariant="drugi" tekst="Zapisz jako SVG" onPress={onSvg} />
      <Przycisk wariant="drugi" tekst={szkic.archiwum ? 'Przywróć z archiwum' : 'Przenieś do archiwum'} onPress={onArchiwum} />
      <Przycisk wariant="niebezpieczny" ikona="usun" tekst="Usuń szkic" onPress={onUsun} />
    </Okienko>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  obszar: { flex: 1 },
  pusto: { padding: 24, textAlign: 'center' },
  pasekGora: { position: 'absolute', top: 8, left: 8, right: 8 },
  panelDol: { position: 'absolute', left: 8, right: 8 },
  lupka: { position: 'absolute', right: 8, padding: 6 },
  rzad: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  trybTekst: { fontWeight: '700', flexShrink: 1 },
});
