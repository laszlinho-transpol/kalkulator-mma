// Edytor przekroju poprzecznego (kreator + pomiar łatą) – wspólny dla szablonów w geodezji i szczegółów budowy.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import {
  Naciskany, Pole, Przycisk, Sekcja, Wiersz, WierszDanych, Wybor, Zakladki, useMotyw, TYPOGRAFIA, PROMIEN,
} from '../ui';
import { Kartka, RysunekSvg } from './Kartka';
import { Okienko, PasekPlywajacy, PrzyciskPaska } from './Okienko';
import { fm, liczbaZTekstu, naSwiat, zeZnakiem, zoomWokol, type Pkt, type Widok } from '../../geodezja/geometria';
import {
  KATALOG_ELEMENTOW, dodajElement, domyslnyOpor, edytujElement, geometriaWarstw, gruboscLawy, GRUBOSC_LAWY, kluczZera,
  maZaglebienie, nowaWarstwa, nowyPrzekroj, normalizujPrzekroj, oporElementu, przeliczPomiar, przesunElement, przesunWarstwe,
  usunElement, warstwyElementu, zWarstwami, zaglebienieElementu,
  type ElementPrzekroju, type PrzekrojPoprzeczny, type StronyWarstw, type WarstwaNawierzchni, type WzorElementu,
} from '../../geodezja/przekroj';
import {
  PAPIER, WYPELNIENIA, elementPodPunktem, probkaWypelnienia, punktPomiaruPodEkranem, rysunekPrzekroju, widokPrzekroju,
} from '../../geodezja/rysunek';
import { potwierdzAkcje } from '../../utils/dialog';

type Zakladka = 'kreator' | 'pomiar';
type Zmiana = (f: (p: PrzekrojPoprzeczny) => PrzekrojPoprzeczny) => void;

/** Stan edytowanego przekroju z autozapisem (400 ms po zmianie i przy wyjściu z ekranu). */
export function useEdycjaPrzekroju(zapisany: PrzekrojPoprzeczny | undefined, zapisz: (p: PrzekrojPoprzeczny) => void) {
  const [przekroj, setStan] = useState<PrzekrojPoprzeczny | undefined>(() => (zapisany ? normalizujPrzekroj(zapisany) : undefined));
  const brudny = useRef(false);
  const usuniety = useRef(false);
  const ostatni = useRef(przekroj);
  ostatni.current = przekroj;
  const zapiszRef = useRef(zapisz);
  zapiszRef.current = zapisz;

  useEffect(() => {
    if (!przekroj && zapisany) setStan(normalizujPrzekroj(zapisany));
  }, [zapisany, przekroj]);

  useEffect(() => {
    if (!przekroj || !brudny.current) return undefined;
    const t = setTimeout(() => {
      brudny.current = false;
      if (!usuniety.current) zapiszRef.current(przekroj);
    }, 400);
    return () => clearTimeout(t);
  }, [przekroj]);

  useEffect(() => () => {
    if (brudny.current && !usuniety.current && ostatni.current) zapiszRef.current(ostatni.current);
  }, []);

  const setPrzekroj: Zmiana = (f) => {
    brudny.current = true;
    setStan((p) => (p ? f(p) : p));
  };
  return { przekroj, setPrzekroj, oznaczUsuniety: () => { usuniety.current = true; } };
}

export function EdytorPrzekroju({ przekroj, setPrzekroj }: { przekroj: PrzekrojPoprzeczny; setPrzekroj: Zmiana }) {
  const theme = useMotyw();
  const insets = useSafeAreaInsets();
  const { height: wysOkna } = useWindowDimensions();
  const [zakladka, setZakladka] = useState<Zakladka>('kreator');
  const [rozmiar, setRozmiar] = useState({ w: 0, h: 0 });
  const [widok, setWidok] = useState<Widok>({ s: 100, tx: 0, ty: 0 });
  const [wybranyEl, setWybranyEl] = useState<string | null>(null);
  const [oknoKatalogu, setOknoKatalogu] = useState(false);
  const [oknoPomiaru, setOknoPomiaru] = useState<string | null>(null);
  const liczbaElementow = przekroj.elementy.length;

  const dopasuj = () => {
    if (rozmiar.w > 0) setWidok(widokPrzekroju(przekroj, rozmiar.w, rozmiar.h - 44));
  };

  useEffect(() => {
    dopasuj();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rozmiar.w, rozmiar.h, liczbaElementow, przekroj.skrocone]);

  const prymitywy = useMemo(
    () => rysunekPrzekroju(przekroj, widok, {
      zaznaczonyElement: zakladka === 'kreator' ? wybranyEl : null,
      zaznaczonyPunkt: zakladka === 'pomiar' ? oknoPomiaru : null,
      pomiar: zakladka === 'pomiar',
      obszar: { szer: rozmiar.w, wys: rozmiar.h },
    }),
    [przekroj, widok, wybranyEl, zakladka, oknoPomiaru, rozmiar.w, rozmiar.h],
  );

  const onStukniecie = (e: Pkt) => {
    if (zakladka === 'pomiar') {
      const k = punktPomiaruPodEkranem(przekroj, widok, e);
      if (k) setOknoPomiaru(k);
      return;
    }
    const u = elementPodPunktem(przekroj, naSwiat(widok, e));
    setWybranyEl(u ? u.element.id : null);
  };

  const indeksWybranego = przekroj.elementy.findIndex((e) => e.id === wybranyEl);
  const wyniki = przeliczPomiar(przekroj);
  const zero = kluczZera(przekroj);
  const wysKartki = Math.max(260, Math.round(wysOkna * 0.42));

  return (
    <>
      <View style={{ paddingHorizontal: 14, paddingTop: 10 }}>
        <Zakladki
          theme={theme}
          aktywna={zakladka}
          onZmien={setZakladka}
          zakladki={[['kreator', `Kreator · ${przekroj.elementy.length}`], ['pomiar', 'Pomiar']]}
        />
      </View>
      <View style={[styles.ramkaKartki, { height: wysKartki, borderColor: theme.colors.border }]}>
        <Kartka
          accessibilityLabel="Rysunek przekroju"
          widok={widok}
          onWidok={setWidok}
          prymitywy={prymitywy}
          szer={rozmiar.w}
          wys={rozmiar.h}
          onRozmiar={(w, h) => setRozmiar({ w, h })}
          onStukniecie={onStukniecie}
        />
        <PasekPlywajacy style={styles.lupka}>
          <View style={styles.rzad}>
            <PrzyciskPaska tekst="−" onPress={() => setWidok((w) => zoomWokol(w, w.s / 1.5, { x: rozmiar.w / 2, y: rozmiar.h / 2 }))} accessibilityLabel="Oddal" />
            <PrzyciskPaska tekst="+" onPress={() => setWidok((w) => zoomWokol(w, w.s * 1.5, { x: rozmiar.w / 2, y: rozmiar.h / 2 }))} accessibilityLabel="Przybliż" />
            <PrzyciskPaska tekst="⤢" onPress={dopasuj} accessibilityLabel="Dopasuj widok" />
          </View>
        </PasekPlywajacy>
        {przekroj.elementy.length === 0 ? (
          <View pointerEvents="none" style={styles.pustaKartka}>
            <Text style={{ color: PAPIER.olowek, fontWeight: '700' }}>Dodaj elementy od lewej do prawej</Text>
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        {zakladka === 'kreator' ? (
          <>
            <Przycisk
              ikona="plus"
              tekst={indeksWybranego >= 0 ? `Dodaj element za nr ${indeksWybranego + 1}` : 'Dodaj element'}
              onPress={() => setOknoKatalogu(true)}
            />
            {przekroj.elementy.map((e, i) => (
              <KartaElementu
                key={e.id}
                element={e}
                indeks={i}
                liczba={przekroj.elementy.length}
                rozwiniety={wybranyEl === e.id}
                onWybierz={() => setWybranyEl(wybranyEl === e.id ? null : e.id)}
                onZmien={(z) => setPrzekroj((p) => edytujElement(p, e.id, z))}
                onPrzesun={(o) => setPrzekroj((p) => przesunElement(p, e.id, o))}
                onUsun={() => potwierdzAkcje('Usunąć element?', `${i + 1}. ${e.nazwa}`, () => {
                  setPrzekroj((p) => usunElement(p, e.id));
                  setWybranyEl(null);
                })}
              />
            ))}
          </>
        ) : (
          <Sekcja
            tytul="Odczyty łaty"
            info="Stuknij trójkąt na rysunku albo wiersz i wpisz odczyt z łaty w tym miejscu (opcjonalnie rzędną). Odczyty i rzędne pozostałych miejsc przeliczą się z różnic wysokości szablonu. Wyżej położony punkt ma mniejszy odczyt."
            prawy={przekroj.pomiar ? <PrzyciskPaska tekst="Wyczyść" onPress={() => setPrzekroj((p) => ({ ...p, pomiar: undefined }))} accessibilityLabel="Wyczyść pomiar" /> : undefined}
          >
            {wyniki.length === 0 ? <Text style={{ color: theme.colors.textSecondary }}>Brak elementów w szablonie.</Text> : null}
            {wyniki.map((w) => (
              <Naciskany
                key={w.klucz}
                accessibilityRole="button"
                accessibilityLabel={`Pomiar ${w.nazwa}`}
                onPress={() => setOknoPomiaru(w.klucz)}
                style={[styles.wierszPomiaru, { borderColor: w.wpisany ? PAPIER.cel : theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: '700' }} numberOfLines={1}>{w.nazwa}</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
                    {w.klucz === zero ? 'poziom 0' : `${zeZnakiem(w.wzgledem0, 1)} cm wzgl. 0`}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: w.wpisany ? PAPIER.cel : theme.colors.text, fontWeight: '800' }}>{w.odczyt != null ? `${w.odczyt} mm` : '—'}</Text>
                  {w.rzedna != null ? <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>H {fm(w.rzedna, 3)} m</Text> : null}
                </View>
              </Naciskany>
            ))}
          </Sekcja>
        )}
      </ScrollView>

      {oknoKatalogu ? (
        <OknoKatalogu
          onAnuluj={() => setOknoKatalogu(false)}
          onWybierz={(w) => {
            const po = indeksWybranego >= 0 ? indeksWybranego : przekroj.elementy.length - 1;
            const z = dodajElement(przekroj, w, po);
            setPrzekroj(() => z);
            setWybranyEl(z.elementy[po + 1].id);
            setOknoKatalogu(false);
          }}
        />
      ) : null}

      {oknoPomiaru ? (
        <OknoPomiaru
          przekroj={przekroj}
          klucz={oknoPomiaru}
          onAnuluj={() => setOknoPomiaru(null)}
          onZero={() => {
            setPrzekroj((p) => ({ ...p, zero: oknoPomiaru }));
            setOknoPomiaru(null);
          }}
          onZapisz={(odczyt, rzedna) => {
            setPrzekroj((p) => ({ ...p, pomiar: odczyt == null && rzedna == null ? undefined : { klucz: oknoPomiaru, odczyt, rzedna } }));
            setOknoPomiaru(null);
          }}
        />
      ) : null}
    </>
  );
}

// ------------------------------------------------------------

function PoleLiczby({ etykieta, wartosc, onZmien, jednostka, mnoznik = 1, miejsca = 0, accessibilityLabel, ujemne, placeholder }: {
  etykieta: string;
  wartosc: number | undefined;
  onZmien: (n: number | undefined) => void;
  jednostka: string;
  /** Wartość w polu = wartość × mnożnik (np. cm → m: 0,01). */
  mnoznik?: number;
  miejsca?: number;
  accessibilityLabel?: string;
  /** Klawiatura ze znakiem minus. */
  ujemne?: boolean;
  placeholder?: string;
}) {
  const sformatuj = (v: number | undefined) => (v == null ? '' : fm(v * mnoznik, miejsca).replace(/,0+$/, '').replace(/(,\d*?)0+$/, '$1'));
  const [t, setT] = useState(sformatuj(wartosc));
  const ostatnia = useRef(wartosc);
  useEffect(() => {
    if (wartosc !== ostatnia.current) {
      ostatnia.current = wartosc;
      setT(sformatuj(wartosc));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wartosc]);
  return (
    <Pole
      etykieta={etykieta}
      value={t}
      onChangeText={(v) => {
        setT(v);
        // Sam minus (początek liczby ujemnej) nie zmienia wartości – inaczej pole wróciłoby do „0”.
        if (/^\s*[-−–]\s*$/.test(v)) return;
        const n = liczbaZTekstu(v);
        const w = n == null ? undefined : n / mnoznik;
        ostatnia.current = w;
        onZmien(w);
      }}
      liczba
      klawiatura={ujemne ? 'numbers-and-punctuation' : undefined}
      placeholder={placeholder}
      jednostka={jednostka}
      accessibilityLabel={accessibilityLabel ?? `${etykieta} [${jednostka}]`}
    />
  );
}

const cm = (v: number) => fm(v, v % 1 ? 1 : 0);

function KartaElementu({ element: e, indeks, liczba, rozwiniety, onWybierz, onZmien, onPrzesun, onUsun }: {
  element: ElementPrzekroju;
  indeks: number;
  liczba: number;
  rozwiniety: boolean;
  onWybierz: () => void;
  onZmien: (z: Partial<ElementPrzekroju>) => void;
  onPrzesun: (o: -1 | 1) => void;
  onUsun: () => void;
}) {
  const theme = useMotyw();
  const pas = e.typ === 'pas';
  const jezdnia = e.ksztalt === 'asfalt';
  const liczbaWarstw = warstwyElementu(e).length;
  const opor = oporElementu(e);
  const opis = [
    pas ? `${fm(e.szer / 100, 2)} m` : `${cm(e.szer)}×${cm(e.wys)} cm`,
    pas ? `gr. ${cm(e.wys)} cm` : null,
    jezdnia ? `${liczbaWarstw} ${liczbaWarstw === 1 ? 'warstwa' : liczbaWarstw < 5 ? 'warstwy' : 'warstw'}` : null,
    maZaglebienie(e) ? `zagł. ${fm(zaglebienieElementu(e), 1)} cm` : null,
    e.lawa ? `ława ${cm(gruboscLawy(e))} cm` : null,
    opor ? `opór ${opor.strona === 'l' ? 'L' : 'P'}` : null,
    indeks > 0 ? `skok ${zeZnakiem(e.skok, 0)} cm` : null,
    pas && e.spadek ? `${fm(Math.abs(e.spadek), 1)}% ${e.spadek > 0 ? '→' : '←'}` : null,
  ].filter(Boolean).join(' · ');
  return (
    <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: rozwiniety ? theme.colors.primary : theme.colors.border }]}>
      <Naciskany accessibilityRole="button" accessibilityLabel={`Element ${indeks + 1} ${e.nazwa}`} onPress={onWybierz} style={styles.naglowekKarty}>
        <View style={[styles.numer, { backgroundColor: `${theme.colors.primary}26` }]}>
          <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{indeks + 1}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[TYPOGRAFIA.tytulKarty, { color: theme.colors.text }]} numberOfLines={1}>{e.nazwa}</Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{opis}</Text>
        </View>
        <Text style={{ color: theme.colors.textSecondary, fontWeight: '800' }}>{rozwiniety ? '▴' : '▾'}</Text>
      </Naciskany>
      {rozwiniety ? (
        <View style={{ gap: 10, marginTop: 10 }}>
          <Wiersz>
            {pas ? (
              <PoleLiczby etykieta="Szerokość" wartosc={e.szer} mnoznik={0.01} miejsca={2} jednostka="m" onZmien={(n) => n && n > 0 && onZmien({ szer: n })} />
            ) : (
              <PoleLiczby etykieta="Szerokość" wartosc={e.szer} miejsca={1} jednostka="cm" onZmien={(n) => n && n > 0 && onZmien({ szer: n })} />
            )}
            {jezdnia ? null : (
              <PoleLiczby etykieta={pas ? 'Grubość' : 'Wysokość'} wartosc={e.wys} miejsca={1} jednostka="cm" onZmien={(n) => n && n > 0 && onZmien({ wys: n })} />
            )}
            {maZaglebienie(e) ? (
              <PoleLiczby
                etykieta="Zagłębienie"
                wartosc={zaglebienieElementu(e)}
                miejsca={1}
                jednostka="cm"
                accessibilityLabel="Zagłębienie korytka [cm]"
                onZmien={(n) => n != null && n >= 0 && onZmien({ zaglebienie: n })}
              />
            ) : null}
          </Wiersz>
          <Wiersz>
            {indeks > 0 ? (
              <PoleLiczby
                etykieta="Skok"
                wartosc={e.skok}
                miejsca={1}
                jednostka="cm"
                ujemne
                accessibilityLabel="Różnica wysokości względem poprzedniego [cm]"
                onZmien={(n) => n != null && onZmien({ skok: n })}
              />
            ) : null}
            {pas ? (
              <PoleLiczby etykieta="Spadek" wartosc={e.spadek == null ? undefined : Math.abs(e.spadek)} miejsca={2} jednostka="%" onZmien={(n) => onZmien({ spadek: (n ?? 0) * (e.spadek != null && e.spadek < 0 ? -1 : 1) })} />
            ) : null}
            {pas && !jezdnia ? (
              <PoleLiczby etykieta="Podbudowa" wartosc={e.podbudowa} miejsca={1} jednostka="cm" onZmien={(n) => onZmien({ podbudowa: n })} />
            ) : null}
          </Wiersz>
          {jezdnia ? <EdytorWarstw element={e} onZmien={onZmien} /> : null}
          <View style={styles.rzad}>
            {indeks > 0 ? (
              <PrzyciskPaska
                tekst={`± Skok ${e.skok < 0 ? '↓ w dół' : '↑ w górę'}`}
                onPress={() => onZmien({ skok: -e.skok })}
                accessibilityLabel="Zmień znak skoku"
              />
            ) : null}
            {pas ? (
              <>
                <Wybor zaznaczony={(e.spadek ?? 0) < 0} etykieta="Spadek ←" accessibilityLabel="Spadek w lewo" onPress={() => onZmien({ spadek: -Math.abs(e.spadek ?? 2) })} />
                <Wybor zaznaczony={(e.spadek ?? 0) > 0} etykieta="Spadek →" accessibilityLabel="Spadek w prawo" onPress={() => onZmien({ spadek: Math.abs(e.spadek ?? 2) })} />
              </>
            ) : (
              <>
                <Wybor zaznaczony={!!e.lawa} etykieta="Ława betonowa" onPress={() => onZmien({ lawa: !e.lawa })} />
                <Wybor zaznaczony={!!e.odwroc} etykieta="Odbij ⇆" accessibilityLabel="Odbij element" onPress={() => onZmien({ odwroc: !e.odwroc })} />
              </>
            )}
          </View>
          {!pas && e.lawa ? <EdytorLawy element={e} onZmien={onZmien} /> : null}
          <View style={styles.rzad}>
            <PrzyciskPaska tekst="◀ W lewo" onPress={() => onPrzesun(-1)} accessibilityLabel="Przesuń element w lewo" style={indeks === 0 ? { opacity: 0.4 } : undefined} />
            <PrzyciskPaska tekst="W prawo ▶" onPress={() => onPrzesun(1)} accessibilityLabel="Przesuń element w prawo" style={indeks === liczba - 1 ? { opacity: 0.4 } : undefined} />
            <View style={{ flex: 1 }} />
            <PrzyciskPaska tekst="Usuń" onPress={onUsun} accessibilityLabel="Usuń element" kolor={theme.colors.danger} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function EdytorLawy({ element: e, onZmien }: { element: ElementPrzekroju; onZmien: (z: Partial<ElementPrzekroju>) => void }) {
  const theme = useMotyw();
  const opor = oporElementu(e);
  const ustawOpor = (strona: 'l' | 'p' | null) => onZmien({
    opor: strona ? { ...(e.opor ?? domyslnyOpor(e, strona)), strona, szer: e.opor?.szer && e.opor.szer > 0 ? e.opor.szer : 10 } : undefined,
  });
  return (
    <View style={[styles.warstwy, { borderColor: theme.colors.border }]}>
      <Text style={[styles.naglowek, { color: theme.colors.textSecondary }]}>ŁAWA BETONOWA</Text>
      <Wiersz>
        <PoleLiczby
          etykieta="Grubość ławy"
          wartosc={e.lawaGrubosc}
          miejsca={1}
          jednostka="cm"
          placeholder={String(GRUBOSC_LAWY)}
          onZmien={(n) => onZmien({ lawaGrubosc: n != null && n > 0 ? n : undefined })}
        />
        <PoleLiczby
          etykieta="Szerokość ławy"
          wartosc={e.lawaSzer}
          miejsca={1}
          jednostka="cm"
          placeholder={cm(e.szer + (opor?.szer ?? 0))}
          onZmien={(n) => onZmien({ lawaSzer: n != null && n > 0 ? n : undefined })}
        />
      </Wiersz>
      <Text style={[styles.naglowek, { color: theme.colors.textSecondary }]}>OPÓR NA ŁAWIE</Text>
      <View style={styles.rzad}>
        <Wybor zaznaczony={!opor} etykieta="Bez oporu" onPress={() => ustawOpor(null)} />
        <Wybor zaznaczony={opor?.strona === 'l'} etykieta="Opór z lewej" onPress={() => ustawOpor('l')} />
        <Wybor zaznaczony={opor?.strona === 'p'} etykieta="Opór z prawej" onPress={() => ustawOpor('p')} />
      </View>
      {opor ? (
        <Wiersz>
          <PoleLiczby
            etykieta="Szerokość oporu"
            wartosc={opor.szer}
            miejsca={1}
            jednostka="cm"
            onZmien={(n) => n != null && n > 0 && onZmien({ opor: { ...opor, szer: n } })}
          />
          <PoleLiczby
            etykieta="Wysokość od góry"
            wartosc={opor.odGory}
            miejsca={1}
            jednostka="cm"
            accessibilityLabel="Odległość góry oporu od góry elementu [cm]"
            onZmien={(n) => n != null && n >= 0 && onZmien({ opor: { ...opor, odGory: Math.min(n, e.wys) } })}
          />
        </Wiersz>
      ) : null}
    </View>
  );
}

function Probka({ wyp, szer = 34, wys = 22 }: { wyp: Parameters<typeof probkaWypelnienia>[0]; szer?: number; wys?: number }) {
  const prym = useMemo(() => probkaWypelnienia(wyp, szer, wys), [wyp, szer, wys]);
  return (
    <Svg width={szer} height={wys}>
      <RysunekSvg prymitywy={prym} />
    </Svg>
  );
}

const STRONY: [StronyWarstw, string][] = [['obie', 'Obie strony'], ['lewa', 'Lewa'], ['prawa', 'Prawa'], ['brak', 'Bez poszerzeń']];

function EdytorWarstw({ element: e, onZmien }: { element: ElementPrzekroju; onZmien: (z: Partial<ElementPrzekroju>) => void }) {
  const theme = useMotyw();
  const warstwy = warstwyElementu(e);
  const geometria = geometriaWarstw({ ...e, warstwy });
  const [wyborWypelnienia, setWyborWypelnienia] = useState<string | null>(null);
  const zmienWarstwy = (nowe: WarstwaNawierzchni[]) => onZmien(zWarstwami(nowe));
  const zmienWarstwe = (id: string, z: Partial<WarstwaNawierzchni>) => zmienWarstwy(warstwy.map((w) => (w.id === id ? { ...w, ...z } : w)));
  return (
    <View style={[styles.warstwy, { borderColor: theme.colors.border }]}>
      <Text style={[styles.naglowek, { color: theme.colors.textSecondary }]}>
        WARSTWY KONSTRUKCJI · {warstwy.length} · razem {cm(e.wys)} cm
      </Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Odsadzki i skosy warstw po stronie:</Text>
      <View style={styles.rzad}>
        {STRONY.map(([id, etykieta]) => (
          <Wybor key={id} zaznaczony={(e.strony ?? 'obie') === id} etykieta={etykieta} accessibilityLabel={`Poszerzenia warstw: ${etykieta}`} onPress={() => onZmien({ strony: id })} />
        ))}
      </View>
      {warstwy.map((w, i) => {
        const g = geometria[i];
        const nazwaWyp = WYPELNIENIA.find((x) => x.id === g.wypelnienie)?.nazwa ?? '';
        return (
          <View key={w.id} style={[styles.warstwa, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}>
            <View style={styles.rzad}>
              <Text style={{ color: theme.colors.text, fontWeight: '800', flex: 1 }}>Warstwa {i + 1}</Text>
              <PrzyciskPaska tekst="▲" onPress={() => zmienWarstwy(przesunWarstwe(warstwy, w.id, -1))} accessibilityLabel={`Warstwa ${i + 1} wyżej`} style={i === 0 ? { opacity: 0.4 } : undefined} />
              <PrzyciskPaska tekst="▼" onPress={() => zmienWarstwy(przesunWarstwe(warstwy, w.id, 1))} accessibilityLabel={`Warstwa ${i + 1} niżej`} style={i === warstwy.length - 1 ? { opacity: 0.4 } : undefined} />
              {warstwy.length > 1 ? (
                <PrzyciskPaska tekst="Usuń" onPress={() => zmienWarstwy(warstwy.filter((x) => x.id !== w.id))} accessibilityLabel={`Usuń warstwę ${i + 1}`} kolor={theme.colors.danger} />
              ) : null}
            </View>
            <Pole etykieta="Nazwa" value={w.nazwa} onChangeText={(t) => zmienWarstwe(w.id, { nazwa: t })} accessibilityLabel={`Nazwa warstwy ${i + 1}`} />
            <Wiersz>
              <PoleLiczby
                etykieta="Grubość"
                wartosc={w.grubosc}
                miejsca={1}
                jednostka="cm"
                accessibilityLabel={`Grubość warstwy ${i + 1} [cm]`}
                onZmien={(n) => n != null && n > 0 && zmienWarstwe(w.id, { grubosc: n })}
              />
              <PoleLiczby
                etykieta="Odsadzka"
                wartosc={w.odsadzka}
                miejsca={1}
                jednostka="cm"
                placeholder="0"
                accessibilityLabel={`Odsadzka warstwy ${i + 1} [cm]`}
                onZmien={(n) => zmienWarstwe(w.id, { odsadzka: n != null && n > 0 ? n : undefined })}
              />
              <PoleLiczby
                etykieta="Skos 1 :"
                wartosc={w.skos}
                miejsca={2}
                jednostka="n"
                placeholder="0"
                accessibilityLabel={`Skos warstwy ${i + 1} 1:n`}
                onZmien={(n) => zmienWarstwe(w.id, { skos: n != null && n > 0 ? n : undefined })}
              />
            </Wiersz>
            <View style={styles.rzad}>
              <Wybor zaznaczony={!w.skos} etykieta="Prosto" accessibilityLabel={`Warstwa ${i + 1} krawędź prosto`} onPress={() => zmienWarstwe(w.id, { skos: undefined })} />
              <Wybor zaznaczony={w.skos === 1} etykieta="Skos 1:1" accessibilityLabel={`Warstwa ${i + 1} skos 1:1`} onPress={() => zmienWarstwe(w.id, { skos: 1 })} />
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, flex: 1, textAlign: 'right' }}>
                szer. {fm(g.szerGora / 100, 2)}–{fm(g.szerDol / 100, 2)} m
              </Text>
            </View>
            <Naciskany
              accessibilityRole="button"
              accessibilityLabel={`Wypełnienie warstwy ${i + 1}: ${nazwaWyp}`}
              onPress={() => setWyborWypelnienia(wyborWypelnienia === w.id ? null : w.id)}
              style={styles.rzad}
            >
              <Probka wyp={g.wypelnienie} />
              <Text style={{ color: theme.colors.text, fontWeight: '700', flex: 1 }}>Wypełnienie: {nazwaWyp}</Text>
              <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>{wyborWypelnienia === w.id ? 'Zwiń ▴' : 'Zmień ▾'}</Text>
            </Naciskany>
            {wyborWypelnienia === w.id ? (
              <View style={styles.siatkaWypelnien}>
                {WYPELNIENIA.map((f) => (
                  <Naciskany
                    key={f.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Wypełnienie ${f.nazwa}`}
                    accessibilityState={{ selected: f.id === g.wypelnienie }}
                    onPress={() => {
                      zmienWarstwe(w.id, { wypelnienie: f.id });
                      setWyborWypelnienia(null);
                    }}
                    style={[styles.kafelekWypelnienia, { borderColor: f.id === g.wypelnienie ? theme.colors.primary : theme.colors.border }]}
                  >
                    <Probka wyp={f.id} szer={52} wys={30} />
                    <Text style={{ color: theme.colors.text, fontSize: 11, textAlign: 'center' }} numberOfLines={1}>{f.nazwa}</Text>
                  </Naciskany>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
      <PrzyciskPaska tekst="+ Dodaj warstwę" accessibilityLabel="Dodaj warstwę" onPress={() => zmienWarstwy([...warstwy, nowaWarstwa(warstwy)])} />
    </View>
  );
}

function PodgladWzoru({ wzor }: { wzor: WzorElementu }) {
  const W = 132;
  const H = 74;
  const prym = useMemo(() => {
    let p = nowyPrzekroj('podgląd', new Date(0), 'podglad');
    p = dodajElement(p, wzor);
    const w = widokPrzekroju(p, W, H, 8, 8, 0);
    return rysunekPrzekroju(p, w, { bezOpisow: true });
  }, [wzor]);
  return (
    <Svg width={W} height={H}>
      <Rect x={0} y={0} width={W} height={H} fill={PAPIER.tlo} />
      <RysunekSvg prymitywy={prym} />
    </Svg>
  );
}

/** Podgląd całego przekroju dopasowany do ramki (karty szczegółów, wybór szablonu). */
export function PodgladPrzekroju({ przekroj, wys = 150 }: { przekroj: PrzekrojPoprzeczny; wys?: number }) {
  const [szer, setSzer] = useState(0);
  const prym = useMemo(() => {
    if (szer <= 0) return [];
    const w = widokPrzekroju(przekroj, szer, wys, 12, 12, 0);
    return rysunekPrzekroju(przekroj, w, { bezOpisow: true, obszar: { szer, wys } });
  }, [przekroj, szer, wys]);
  return (
    <View style={{ height: wys, backgroundColor: PAPIER.tlo }} onLayout={(e: LayoutChangeEvent) => setSzer(Math.round(e.nativeEvent.layout.width))}>
      {szer > 0 ? (
        <Svg width={szer} height={wys}>
          <RysunekSvg prymitywy={prym} />
        </Svg>
      ) : null}
      {przekroj.elementy.length === 0 ? (
        <View pointerEvents="none" style={styles.pustaKartka}>
          <Text style={{ color: PAPIER.olowek, fontWeight: '700', fontSize: 12 }}>Pusty przekrój</Text>
        </View>
      ) : null}
    </View>
  );
}

function OknoKatalogu({ onAnuluj, onWybierz }: { onAnuluj: () => void; onWybierz: (w: WzorElementu) => void }) {
  const theme = useMotyw();
  return (
    <Okienko widoczne tytul="Dodaj element" onAnuluj={onAnuluj}>
      <View style={styles.siatkaKatalogu}>
        {KATALOG_ELEMENTOW.map((w) => (
          <Naciskany
            key={w.id}
            accessibilityRole="button"
            accessibilityLabel={`Dodaj ${w.nazwa}`}
            onPress={() => onWybierz(w)}
            style={[styles.kafelekKatalogu, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
          >
            <PodgladWzoru wzor={w} />
            <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 12, textAlign: 'center' }} numberOfLines={2}>{w.nazwa}</Text>
          </Naciskany>
        ))}
      </View>
    </Okienko>
  );
}

function OknoPomiaru({ przekroj, klucz, onAnuluj, onZapisz, onZero }: {
  przekroj: PrzekrojPoprzeczny;
  klucz: string;
  onAnuluj: () => void;
  onZapisz: (odczyt?: number, rzedna?: number) => void;
  onZero: () => void;
}) {
  const wynik = przeliczPomiar(przekroj).find((w) => w.klucz === klucz);
  const [odczyt, setOdczyt] = useState(wynik?.odczyt != null ? String(wynik.odczyt) : '');
  const [rzedna, setRzedna] = useState(wynik?.rzedna != null ? fm(wynik.rzedna, 3) : '');
  if (!wynik) return null;
  return (
    <Okienko
      widoczne
      tytul={wynik.nazwa}
      onAnuluj={onAnuluj}
      onZapisz={() => onZapisz(liczbaZTekstu(odczyt), liczbaZTekstu(rzedna))}
      dodatkowe={kluczZera(przekroj) !== klucz ? <PrzyciskPaska tekst="Ustaw jako 0" onPress={onZero} accessibilityLabel="Ustaw jako poziom 0" /> : undefined}
    >
      <WierszDanych etykieta="Wysokość względem 0" wartosc={`${zeZnakiem(wynik.wzgledem0, 1)} cm`} />
      <Wiersz>
        <Pole etykieta="Odczyt" value={odczyt} onChangeText={setOdczyt} liczba jednostka="mm" accessibilityLabel="Odczyt łaty [mm]" />
        <Pole etykieta="Rzędna" value={rzedna} onChangeText={setRzedna} liczba jednostka="m" accessibilityLabel="Rzędna punktu [m]" />
      </Wiersz>
    </Okienko>
  );
}

export function OknoDanychPrzekroju({ przekroj, tytul = 'Dane przekroju', onAnuluj, onZapisz, onSvg, onArchiwum, onPrzypisz, onUsun, tekstUsun = 'Usuń przekrój' }: {
  przekroj: PrzekrojPoprzeczny;
  tytul?: string;
  onAnuluj: () => void;
  onZapisz: (z: Partial<PrzekrojPoprzeczny>) => void;
  onSvg: () => void;
  onArchiwum?: () => void;
  onPrzypisz?: () => void;
  onUsun: () => void;
  tekstUsun?: string;
}) {
  const [nazwa, setNazwa] = useState(przekroj.nazwa);
  const [opis, setOpis] = useState(przekroj.opis ?? '');
  const [skrocone, setSkrocone] = useState(przekroj.skrocone);
  return (
    <Okienko
      widoczne
      tytul={tytul}
      onAnuluj={onAnuluj}
      onZapisz={() => onZapisz({ nazwa: nazwa.trim() || przekroj.nazwa, opis: opis.trim() || undefined, skrocone })}
    >
      <Pole etykieta="Nazwa" value={nazwa} onChangeText={setNazwa} accessibilityLabel="Nazwa przekroju" />
      <Pole etykieta="Opis" value={opis} onChangeText={setOpis} multiline accessibilityLabel="Opis przekroju" />
      <Wybor zaznaczony={skrocone} etykieta="Skracaj szerokie pasy na rysunku" onPress={() => setSkrocone(!skrocone)} />
      {onPrzypisz ? <Przycisk wariant="drugi" ikona="plus" tekst="Przypisz do budowy" onPress={onPrzypisz} /> : null}
      <Przycisk wariant="drugi" tekst="Zapisz jako SVG" onPress={onSvg} />
      {onArchiwum ? <Przycisk wariant="drugi" tekst={przekroj.archiwum ? 'Przywróć z archiwum' : 'Przenieś do archiwum'} onPress={onArchiwum} /> : null}
      <Przycisk wariant="niebezpieczny" ikona="usun" tekst={tekstUsun} onPress={onUsun} />
    </Okienko>
  );
}

const styles = StyleSheet.create({
  ramkaKartki: { marginHorizontal: 14, marginTop: 10, borderWidth: 1, borderRadius: PROMIEN.l, overflow: 'hidden' },
  lupka: { position: 'absolute', bottom: 6, right: 6, padding: 6 },
  pustaKartka: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  rzad: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  karta: { borderWidth: 1, borderRadius: PROMIEN.l, padding: 12 },
  naglowekKarty: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numer: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  wierszPomiaru: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: PROMIEN.m, paddingHorizontal: 12, paddingVertical: 8 },
  warstwy: { borderTopWidth: 1, paddingTop: 10, gap: 8 },
  naglowek: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  warstwa: { borderWidth: 1, borderRadius: PROMIEN.m, padding: 10, gap: 8 },
  siatkaWypelnien: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kafelekWypelnienia: { width: 72, borderWidth: 2, borderRadius: PROMIEN.m, padding: 4, alignItems: 'center', gap: 2 },
  siatkaKatalogu: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  kafelekKatalogu: { width: 148, borderWidth: 1, borderRadius: PROMIEN.m, padding: 8, alignItems: 'center', gap: 4 },
});
