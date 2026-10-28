import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
} from 'react-native';
import type { AppTheme } from '../../constants/theme';
import type { KategoriaWarstwy, KonstrukcjaObszaru, ProjektBudowy, WarstwaKonstrukcji, WyjatekKonstrukcji } from '../../types';
import { PrzekrojKonstrukcji } from './PrzekrojKonstrukcji';
import { SafeModal } from '../common/SafeModal';
import { InfoTooltip } from '../common/InfoTooltip';
import { PoleKilometraz, parsujPolaKilometraza, polaZKilometraza } from '../common/PoleKilometraz';
import { WyborMieszanki } from '../mieszanki/WyborMieszanki';
import { posortujMieszanki } from '../../mieszanki/kolejnosc';
import { useMieszankiStore } from '../../stores/mieszankiStore';
import { useWytwornieStore } from '../../stores/wytwornieStore';
import {
  czyLegendaUzupelniona,
  formatujKmM,
  konstrukcjaDlaObszaru,
  nowaKonstrukcja,
  nowaWarstwa,
  odsadzkiWarstwy,
  opisWyjatkuZKilometrazem,
  postepPrzypisan,
  segmentyKonstrukcji,
  zapiszPrzypisaniaWedlugKoloru,
  sklonujWarstwy,
  wszystkieObszary,
} from '../../utils/projektBudowy';
import { lokalizacjaObszaru, nastepnyNumerWyjatku, odcinkiObszaru } from '../../utils/lokalizacjaObszaru';
import { zakresKmObszaru } from '../../utils/planZBudowy';
import { Z_METROW_BIEZACYCH } from '../../constants';
import { PozycjaListy, Przycisk, PrzyciskIkony } from '../ui';
import { WyborZakresuNaPlanie } from '../plan/WyborZakresuNaPlanie';
import { potwierdzAkcje } from '../../utils/dialog';
import { rodzajMieszanki } from '../../mieszanki/kolejnosc';

interface Props {
  projekt: ProjektBudowy;
  theme: AppTheme;
  onZmien: (p: ProjektBudowy) => void;
  onPokazObszar?: (cel: { arkuszId: string; obszarId: string; kmOdM: number; kmDoM: number }) => void;
}

const KATEGORIE: { id: KategoriaWarstwy; etykieta: string }[] = [
  { id: 'sma', etykieta: 'SMA / ścieralna' },
  { id: 'wiazaca', etykieta: 'Wiążąca' },
  { id: 'podbudowa', etykieta: 'Podbudowa' },
  { id: 'klsm', etykieta: 'KŁSM' },
  { id: 'inna', etykieta: 'Inna' },
];

function nadajKolejnosc(warstwy: WarstwaKonstrukcji[]): WarstwaKonstrukcji[] {
  return warstwy.map((w, i) => ({ ...w, kolejnosc: i + 1 }));
}

function wyjatekNaSrodku(k: KonstrukcjaObszaru, od: number, doM: number): WyjatekKonstrukcji | undefined {
  const srodek = (od + doM) / 2;
  return k.wyjatki.find((w) => {
    const a = Math.min(w.kmOdM, w.kmDoM);
    const b = Math.max(w.kmOdM, w.kmDoM);
    return srodek >= a && srodek <= b;
  });
}

function zakresTrasy(projekt: ProjektBudowy, legendaId: string): { odM: number; doM: number } {
  const z = zakresKmObszaru(projekt, legendaId);
  if (z && z.doM > z.odM) return z;
  const start = projekt.kilometrazPoczatkowyM;
  const koniec = projekt.arkusze.length
    ? Math.max(...projekt.arkusze.map((a) => a.kilometrazKoncowyM))
    : start;
  return { odM: Math.min(start, koniec), doM: Math.max(start, koniec) };
}

function numerZmiany(k: KonstrukcjaObszaru, w: WyjatekKonstrukcji): string {
  const n = w.numer && w.numer > 0 ? w.numer : Math.max(1, k.wyjatki.findIndex((x) => x.id === w.id) + 1);
  return `${k.numer ?? ''}.${n}`;
}

function pozycjeObszarow(projekt: ProjektBudowy, k: KonstrukcjaObszaru) {
  const klucz = k.id || k.legendaId;
  const out: {
    id: string;
    arkuszId: string;
    obszarId: string;
    kmOdM: number;
    kmDoM: number;
    sortTrasa: number;
    sortBoczna: number;
    numer: string;
    nazwa: string;
    tekst: string;
  }[] = [];
  for (const para of wszystkieObszary(projekt)) {
    const wlasna = konstrukcjaDlaObszaru(projekt, para.obszar.id);
    if (!wlasna || (wlasna.id || wlasna.legendaId) !== klucz) continue;
    const lok = lokalizacjaObszaru(para.obszar, para.arkusz);
    for (const d of odcinkiObszaru(para.obszar, para.arkusz, k)) {
      out.push({
        id: d.id,
        arkuszId: para.arkusz.id,
        obszarId: para.obszar.id,
        kmOdM: d.kmOdM,
        kmDoM: d.kmDoM,
        sortTrasa: lok?.rodzaj === 'boczna' ? lok.kmTrasyOdM : d.kmOdM,
        sortBoczna: lok?.rodzaj === 'boczna' ? (lok.kmBocznaOdM ?? 0) : 0,
        numer: d.numer,
        nazwa: d.nazwa,
        tekst: lok?.rodzaj === 'boczna'
          ? lok.tekst
          : `${formatujKmM(d.kmOdM)} – ${formatujKmM(d.kmDoM)}`,
      });
    }
  }
  out.sort((a, b) => a.sortTrasa - b.sortTrasa || a.sortBoczna - b.sortBoczna || a.kmOdM - b.kmOdM);
  return out;
}

export function SekcjaKonstrukcje({ projekt, theme, onZmien, onPokazObszar }: Props) {
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const wytwornie = useWytwornieStore((s) => s.wytwornie);
  const [mixWarstwa, setMixWarstwa] = useState<{ konstrukcjaId: string; warstwaId: string; wyjatekId?: string } | null>(null);
  const [wyjatekDla, setWyjatekDla] = useState<string | null>(null);
  const [wyjatekOdKm, setWyjatekOdKm] = useState('0');
  const [wyjatekOdM, setWyjatekOdM] = useState('000');
  const [wyjatekDoKm, setWyjatekDoKm] = useState('0');
  const [wyjatekDoM, setWyjatekDoM] = useState('200');
  const [wyjatekOpis, setWyjatekOpis] = useState('');
  const [mapaWyjatku, setMapaWyjatku] = useState(false);
  const [wybrany, setWybrany] = useState<Record<string, string>>({});
  const [oknoWarstw, setOknoWarstw] = useState<{ legendaId: string; wyjatekId?: string } | null>(null);
  const [otwartaId, setOtwartaId] = useState<string | null>(null);

  const obszary = projekt.legenda.filter((w) => w.typ === 'obszar' && w.nazwa.trim());
  const etykietaWytworni = (id?: string) => wytwornie.find((w) => w.id === id)?.nazwa;
  const legendOk = czyLegendaUzupelniona(projekt.legenda);

  const mixTarget = useMemo(() => {
    if (!mixWarstwa) return null;
    const k = projekt.konstrukcje.find((x) => x.id === mixWarstwa.konstrukcjaId)
      ?? projekt.konstrukcje.find((x) => x.legendaId === mixWarstwa.konstrukcjaId);
    if (!k) return null;
    const warstwy = mixWarstwa.wyjatekId
      ? k.wyjatki.find((w) => w.id === mixWarstwa.wyjatekId)?.warstwy
      : k.warstwy;
    return warstwy?.find((w) => w.id === mixWarstwa.warstwaId) ?? null;
  }, [mixWarstwa, projekt.konstrukcje]);

  if (!legendOk) {
    return (
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
        Uzupełnij nazwy obszarów w legendzie, aby przypisać konstrukcje warstw.
      </Text>
    );
  }

  const zapiszKonstrukcje = (lista: KonstrukcjaObszaru[]) => onZmien({ ...projekt, konstrukcje: lista });

  const patchKonstrukcja = (klucz: string, fn: (k: KonstrukcjaObszaru) => KonstrukcjaObszaru) => {
    const poId = projekt.konstrukcje.some((k) => k.id === klucz);
    zapiszKonstrukcje(projekt.konstrukcje.map((k) => ((poId ? k.id === klucz : k.legendaId === klucz) ? fn(k) : k)));
  };

  const patchWarstwy = (
    k: KonstrukcjaObszaru,
    warstwaId: string,
    patch: Partial<WarstwaKonstrukcji>,
    wyjatekId?: string,
  ): KonstrukcjaObszaru => {
    if (wyjatekId) {
      return {
        ...k,
        wyjatki: k.wyjatki.map((w) => w.id !== wyjatekId ? w : {
          ...w,
          warstwy: w.warstwy.map((x) => x.id === warstwaId ? { ...x, ...patch } : x),
        }),
      };
    }
    return {
      ...k,
      warstwy: k.warstwy.map((x) => x.id === warstwaId ? { ...x, ...patch } : x),
    };
  };

  const edytorWarstw = (
    k: KonstrukcjaObszaru,
    warstwy: WarstwaKonstrukcji[],
    wyjatekId?: string,
  ) => (
    <View style={{ gap: 8 }}>
      {warstwy.map((w, idx) => (
        <View key={w.id} style={[styles.warstwa, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}>
          <View style={styles.rzad}>
            <Text style={{ color: theme.colors.primary, fontWeight: '800', width: 22 }}>{idx + 1}.</Text>
            <TextInput
              value={w.nazwa}
              onChangeText={(t) => patchKonstrukcja(k.id || k.legendaId, (kk) => patchWarstwy(kk, w.id, { nazwa: t }, wyjatekId))}
              placeholder="Nazwa warstwy"
              placeholderTextColor={theme.colors.textSecondary}
              style={[styles.input, { flex: 1, minWidth: 0, color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
            />
            <TextInput
              value={w.rodzajOpis}
              onChangeText={(t) => patchKonstrukcja(k.id || k.legendaId, (kk) => patchWarstwy(kk, w.id, { rodzajOpis: t }, wyjatekId))}
              placeholder="Rodzaj, np. KR 3-7"
              placeholderTextColor={theme.colors.textSecondary}
              style={[styles.input, { flex: 1, minWidth: 0, color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
            />
            <PrzyciskIkony
              ikona="usun"
              kolor={theme.colors.danger}
              accessibilityLabel={`Usuń warstwę ${w.nazwa}`}
              onPress={() => patchKonstrukcja(k.id || k.legendaId, (kk) => {
                if (wyjatekId) {
                  return {
                    ...kk,
                    wyjatki: kk.wyjatki.map((wy) => wy.id !== wyjatekId ? wy : { ...wy, warstwy: nadajKolejnosc(wy.warstwy.filter((x) => x.id !== w.id)) }),
                  };
                }
                return { ...kk, warstwy: nadajKolejnosc(kk.warstwy.filter((x) => x.id !== w.id)) };
              })}
            />
          </View>
          <View style={styles.rzad}>
            <View style={{ flex: 1 }}>
              <Text style={styles.miniLabel}>Grubość cm</Text>
              <TextInput
                value={String(w.gruboscCm)}
                keyboardType="numeric"
                onChangeText={(t) => {
                  const n = parseFloat(t.replace(',', '.'));
                  patchKonstrukcja(k.id || k.legendaId, (kk) => patchWarstwy(kk, w.id, { gruboscCm: Number.isFinite(n) ? n : 0 }, wyjatekId));
                }}
                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.miniLabel}>Odsadzka L cm</Text>
              <TextInput
                value={String(odsadzkiWarstwy(w).lewa)}
                keyboardType="numeric"
                onChangeText={(t) => {
                  const n = parseFloat(t.replace(',', '.'));
                  const lewa = Number.isFinite(n) ? n : 0;
                  const prawa = odsadzkiWarstwy(w).prawa;
                  patchKonstrukcja(k.id || k.legendaId, (kk) => patchWarstwy(kk, w.id, { odsadzkaLewaCm: lewa, odsadzkaCm: lewa, odsadzkaPrawaCm: prawa }, wyjatekId));
                }}
                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.miniLabel}>Odsadzka P cm</Text>
              <TextInput
                value={String(odsadzkiWarstwy(w).prawa)}
                keyboardType="numeric"
                onChangeText={(t) => {
                  const n = parseFloat(t.replace(',', '.'));
                  const prawa = Number.isFinite(n) ? n : 0;
                  const lewa = odsadzkiWarstwy(w).lewa;
                  patchKonstrukcja(k.id || k.legendaId, (kk) => patchWarstwy(kk, w.id, { odsadzkaPrawaCm: prawa, odsadzkaLewaCm: lewa, odsadzkaCm: lewa }, wyjatekId));
                }}
                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
              />
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {KATEGORIE.map((kat) => {
              const sel = w.kategoria === kat.id;
              return (
                <TouchableOpacity
                  key={kat.id}
                  onPress={() => patchKonstrukcja(k.id || k.legendaId, (kk) => patchWarstwy(kk, w.id, { kategoria: kat.id }, wyjatekId))}
                  style={[styles.chip, { borderColor: sel ? theme.colors.primary : theme.colors.border, backgroundColor: sel ? `${theme.colors.primary}22` : theme.colors.card }]}
                >
                  <Text style={{ color: theme.colors.text, fontSize: 11, fontWeight: '700' }}>{kat.etykieta}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {(() => {
            const zatwierdzone = posortujMieszanki(mieszanki.filter((x) => w.mieszankaIds.includes(x.id)));
            const otworz = () => setMixWarstwa({ konstrukcjaId: k.id || k.legendaId, warstwaId: w.id, wyjatekId });
            if (zatwierdzone.length === 0) {
              return (
                <TouchableOpacity
                  accessibilityLabel={`Materiał zatwierdzony ${w.nazwa}`}
                  style={[styles.chip, { alignSelf: 'flex-start', borderColor: theme.colors.secondary }]}
                  onPress={otworz}
                >
                  <Text style={{ color: theme.colors.secondary, fontSize: 12, fontWeight: '700' }}>Materiał zatwierdzony (opcjonalnie)</Text>
                </TouchableOpacity>
              );
            }
            return (
              <View
                accessibilityLabel={`Zatwierdzone recepty ${w.nazwa}`}
                style={[styles.zatwierdzone, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
              >
                <View style={styles.naglowekZatwierdzonych}>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '800', flex: 1 }}>
                    MATERIAŁ ZATWIERDZONY · {zatwierdzone.length}
                  </Text>
                  <TouchableOpacity accessibilityLabel={`Zmień materiał zatwierdzony ${w.nazwa}`} onPress={otworz} hitSlop={8}>
                    <Text style={{ color: theme.colors.secondary, fontSize: 12, fontWeight: '800' }}>+ Dodaj / zmień</Text>
                  </TouchableOpacity>
                </View>
                {zatwierdzone.map((m) => {
                  const wyt = etykietaWytworni(m.wytworniaId) ?? m.wytwórnia;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={otworz}
                      style={[styles.wierszZatwierdzonej, { borderTopColor: theme.colors.border }]}
                    >
                      <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '700' }}>{rodzajMieszanki(m)}</Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                        {[wyt ?? 'Bez wytwórni', m.nrRecepty].filter(Boolean).join(' · ')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })()}
        </View>
      ))}
      <TouchableOpacity
        onPress={() => patchKonstrukcja(k.id || k.legendaId, (kk) => {
          const nowa = nowaWarstwa({
            kolejnosc: warstwy.length + 1,
            nazwa: 'Nowa warstwa',
            kategoria: 'inna',
            gruboscCm: 4,
            odsadzkaCm: 0,
            odsadzkaLewaCm: 0,
            odsadzkaPrawaCm: 0,
          });
          if (wyjatekId) {
            return {
              ...kk,
              wyjatki: kk.wyjatki.map((wy) => wy.id !== wyjatekId ? wy : { ...wy, warstwy: [...wy.warstwy, nowa] }),
            };
          }
          return { ...kk, warstwy: [...kk.warstwy, nowa] };
        })}
      >
        <Text style={{ color: theme.colors.info, fontWeight: '700' }}>+ Dodaj warstwę</Text>
      </TouchableOpacity>
    </View>
  );

  const ustawKmWyjatku = (legendaId: string, wyjatekId: string, kmOdM: number, kmDoM: number) => {
    patchKonstrukcja(legendaId, (kk) => ({
      ...kk,
      wyjatki: kk.wyjatki.map((x) => (x.id === wyjatekId
        ? { ...x, kmOdM, kmDoM, opis: opisWyjatkuZKilometrazem(x.opis, kmOdM, kmDoM) }
        : x)),
    }));
  };

  const oknoK = oknoWarstw
    ? projekt.konstrukcje.find((x) => x.id === oknoWarstw.legendaId) ?? projekt.konstrukcje.find((x) => x.legendaId === oknoWarstw.legendaId)
    : undefined;
  const oknoWy = oknoK && oknoWarstw?.wyjatekId ? oknoK.wyjatki.find((w) => w.id === oknoWarstw.wyjatekId) : undefined;
  const oknoOd = oknoWy ? polaZKilometraza(Z_METROW_BIEZACYCH(oknoWy.kmOdM).km, Z_METROW_BIEZACYCH(oknoWy.kmOdM).m) : null;
  const oknoDo = oknoWy ? polaZKilometraza(Z_METROW_BIEZACYCH(oknoWy.kmDoM).km, Z_METROW_BIEZACYCH(oknoWy.kmDoM).m) : null;
  const oknoNazwa = oknoK ? projekt.legenda.find((w) => w.id === oknoK.legendaId)?.nazwa ?? 'Konstrukcja' : '';
  const oknoTytul = oknoWy
    ? `${oknoNazwa} · ${formatujKmM(oknoWy.kmOdM)} - ${formatujKmM(oknoWy.kmDoM)}`
    : `${oknoNazwa} · warstwy`;

  const oknoMieszanek = (
  <SafeModal
    visible={!!mixWarstwa}
    tytul="Zatwierdzone mieszanki"
    theme={theme}
    onClose={() => setMixWarstwa(null)}
    prawy={{ tekst: 'Gotowe', onPress: () => setMixWarstwa(null), kolor: theme.colors.primary }}
  >
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <WyborMieszanki
        mieszanki={mieszanki}
        zaznaczone={mixTarget?.mieszankaIds ?? []}
        pustyTekst="Brak recept w bazie. Dodaj mieszanki w kafelku „Mieszanki”."
        onWybierz={(m) => {
          if (!mixWarstwa) return;
          patchKonstrukcja(mixWarstwa.konstrukcjaId, (kk) => {
            const war = (mixWarstwa.wyjatekId
              ? kk.wyjatki.find((w) => w.id === mixWarstwa.wyjatekId)?.warstwy
              : kk.warstwy)?.find((x) => x.id === mixWarstwa.warstwaId);
            const ids = war?.mieszankaIds ?? [];
            const next = ids.includes(m.id) ? ids.filter((id) => id !== m.id) : [...ids, m.id];
            return patchWarstwy(kk, mixWarstwa.warstwaId, { mieszankaIds: next }, mixWarstwa.wyjatekId);
          });
        }}
      />
    </ScrollView>
  </SafeModal>
  );

  const postep = postepPrzypisan(projekt);
  const konstrukcje = [...projekt.konstrukcje].sort((a, b) => (a.numer ?? 99) - (b.numer ?? 99));
  const otwarta = konstrukcje.find((k) => (k.id || k.legendaId) === otwartaId) ?? null;

  const szczegolyKonstrukcji = (k: KonstrukcjaObszaru) => {
    const wpis = projekt.legenda.find((w) => w.id === k.legendaId);
    const kluczK = k.id || k.legendaId;
    const zakres = zakresTrasy(projekt, k.legendaId);
    const segmenty = segmentyKonstrukcji(k, zakres.odM, zakres.doM);
    const odcinki = segmenty.length > 0
      ? segmenty
      : [{ od: zakres.odM, do: zakres.doM, warstwy: k.warstwy }];
    const klucz = (od: number, doM: number) => `${od}|${doM}`;
    const wybranyKlucz = odcinki.some((s) => klucz(s.od, s.do) === wybrany[kluczK])
      ? wybrany[kluczK]
      : klucz(odcinki[0].od, odcinki[0].do);
    const sel = odcinki.find((s) => klucz(s.od, s.do) === wybranyKlucz) ?? odcinki[0];
    const pozycje = pozycjeObszarow(projekt, k);
    return (
      <View style={{ gap: 12 }}>
        <View style={styles.rzad}>
          <View style={[styles.probka, { backgroundColor: wpis?.kolor ?? theme.colors.primary }]} />
          <Text style={{ color: theme.colors.text, fontWeight: '800', flex: 1, fontSize: 16 }}>
            {wpis?.nazwa?.trim() || 'Bez nazwy w legendzie'}
          </Text>
        </View>
        {pozycje.length === 0 ? (
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
            Brak przypisanych obszarów. Na PZT stuknij obrys, wybierz konstrukcję i stuknij Zapisz.
          </Text>
        ) : (
          <View style={{ gap: 6 }}>
            {pozycje.map((p) => (
              <TouchableOpacity
                key={p.id}
                accessibilityLabel={`${p.numer} ${p.nazwa} ${p.tekst}`}
                onPress={() => {
                  setOtwartaId(null);
                  onPokazObszar?.({
                    arkuszId: p.arkuszId,
                    obszarId: p.obszarId,
                    kmOdM: p.kmOdM,
                    kmDoM: p.kmDoM,
                  });
                }}
                style={[styles.odcinekBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
              >
                <Text style={{ color: theme.colors.text, fontWeight: '800' }}>
                  {`${p.numer ? `${p.numer} · ` : ''}${p.nazwa}`}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{p.tekst}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
            <View style={{ gap: 8 }}>
              {odcinki.map((s) => {
                const on = klucz(s.od, s.do) === wybranyKlucz;
                const etykieta = `${formatujKmM(s.od)} - ${formatujKmM(s.do)}`;
                const wyOdcinka = wyjatekNaSrodku(k, s.od, s.do);
                return (
                  <View key={klucz(s.od, s.do)} style={styles.rzad}>
                    <TouchableOpacity
                      onPress={() => setWybrany((prev) => ({ ...prev, [kluczK]: klucz(s.od, s.do) }))}
                      accessibilityLabel={etykieta}
                      style={[
                        styles.odcinekBtn,
                        {
                          backgroundColor: on ? theme.colors.primary : theme.colors.inputBackground,
                          borderColor: on ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                    >
                      <Text style={{ color: on ? '#1A1A1A' : theme.colors.text, fontWeight: '800', textAlign: 'center' }}>
                        {etykieta}
                      </Text>
                      {wyOdcinka ? (
                        <Text style={{ color: on ? '#1A1A1A' : theme.colors.textSecondary, fontSize: 11, textAlign: 'center' }} numberOfLines={1}>
                          {`Zmiana ${numerZmiany(k, wyOdcinka)}`}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                    <Przycisk
                      tekst={`Warstwy · ${s.warstwy.length}`}
                      wariant="drugi"
                      maly
                      onPress={() => {
                        setWybrany((prev) => ({ ...prev, [kluczK]: klucz(s.od, s.do) }));
                        setOknoWarstw({ legendaId: kluczK, wyjatekId: wyOdcinka?.id });
                      }}
                      accessibilityLabel={`Warstwy ${etykieta}`}
                    />
                  </View>
                );
              })}
            </View>
            <PrzekrojKonstrukcji
              warstwy={(wyjatekNaSrodku(k, sel.od, sel.do) ?? { warstwy: sel.warstwy }).warstwy}
              theme={theme}
            />
            <Przycisk
              tekst="Zmiana konstrukcji"
              ikona="plus"
              wariant="drugi"
              accessibilityLabel={`Zmiana konstrukcji ${k.numer ?? ''}`}
              onPress={() => {
              setWyjatekDla(kluczK);
              const start = projekt.kilometrazPoczatkowyM;
              const od = Z_METROW_BIEZACYCH(start);
              const dos = Z_METROW_BIEZACYCH(start + 200);
              setWyjatekOdKm(String(od.km));
              setWyjatekOdM(String(od.m).padStart(3, '0'));
              setWyjatekDoKm(String(dos.km));
              setWyjatekDoM(String(dos.m).padStart(3, '0'));
              setWyjatekOpis('');
            }}
            />
      </View>
    );
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.rzad}>
        <Text style={{ color: theme.colors.text, fontWeight: '800', flex: 1 }}>
          {`Zapisane: ${postep.przypisane} / ${postep.wszystkie}`}
          {postep.wszystkie > 0 ? ` (${Math.round((postep.przypisane / postep.wszystkie) * 100)}%)` : ''}
        </Text>
        <InfoTooltip tresc="Każdy wiersz to jedna konstrukcja. Stuknięcie otwiera jej obszary, kilometraż i warstwy. Na PZT wybór konstrukcji zapisujesz przyciskiem Zapisz. Dopóki obszar nie jest zapisany, numer bierze się z koloru. Lewa strona leży po lewej od osi, gdy patrzysz w kierunku rosnącego kilometrażu." />
      </View>
      {postep.przypisane < postep.wszystkie ? (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
          Pozostałe obszary biorą konstrukcję z koloru. Zapiszesz je pojedynczo na PZT albo wszystkie naraz.
        </Text>
      ) : null}
      {postep.przypisane < postep.wszystkie ? (
        <Przycisk
          tekst="Zapisz według koloru"
          wariant="drugi"
          onPress={() => onZmien(zapiszPrzypisaniaWedlugKoloru(projekt))}
          accessibilityLabel="Zapisz według koloru"
        />
      ) : null}
      <Przycisk
        tekst="Nowa konstrukcja"
        ikona="plus"
        wariant="drugi"
        onPress={() => {
          const legendaId = obszary[0]?.id;
          if (!legendaId) return;
          const numer = konstrukcje.reduce((m, k) => Math.max(m, k.numer ?? 0), 0) + 1;
          zapiszKonstrukcje([...projekt.konstrukcje, nowaKonstrukcja(legendaId, numer)]);
        }}
        accessibilityLabel="Nowa konstrukcja"
      />
      {konstrukcje.map((k) => {
        const wpis = projekt.legenda.find((w) => w.id === k.legendaId);
        const kluczK = k.id || k.legendaId;
        const pozycje = pozycjeObszarow(projekt, k);
        const kmOd = pozycje.length ? Math.min(...pozycje.map((p) => p.sortTrasa)) : 0;
        const kmDo = pozycje.length ? Math.max(...pozycje.map((p) => Math.max(p.sortTrasa, p.kmDoM))) : 0;
        const ile = pozycje.length === 1
          ? '1 obszar'
          : pozycje.length >= 2 && pozycje.length <= 4
            ? `${pozycje.length} obszary`
            : `${pozycje.length} obszarów`;
        const podtytul = pozycje.length
          ? `${ile} · ${formatujKmM(kmOd)} – ${formatujKmM(kmDo)}`
          : 'Brak obszarów';
        const tytul = `Konstrukcja ${k.numer ?? ''}${wpis?.nazwa ? ` · ${wpis.nazwa}` : ''}`;
        return (
          <View key={kluczK} style={styles.rzad}>
            <View style={[styles.pasek, { backgroundColor: wpis?.kolor ?? theme.colors.border }]} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <PozycjaListy
                tytul={tytul}
                podtytul={podtytul}
                ikona={String(k.numer ?? '–')}
                prawy={pozycje.length ? String(pozycje.length) : undefined}
                onPress={() => setOtwartaId(kluczK)}
                accessibilityLabel={tytul}
              />
            </View>
          </View>
        );
      })}

      <SafeModal
        visible={!!otwarta}
        tytul={otwarta ? `Konstrukcja ${otwarta.numer ?? ''}` : 'Konstrukcja'}
        theme={theme}
        onClose={() => setOtwartaId(null)}
        lewy={{ tekst: '‹ Wstecz', onPress: () => setOtwartaId(null) }}
      >
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          {otwarta ? szczegolyKonstrukcji(otwarta) : null}
        </ScrollView>
      </SafeModal>

      <SafeModal
        visible={!!wyjatekDla}
        tytul="Zmiana konstrukcji"
        theme={theme}
        onClose={() => setWyjatekDla(null)}
        prawy={{
          tekst: 'Dodaj',
          onPress: () => {
            if (!wyjatekDla) return;
            const od = parsujPolaKilometraza(wyjatekOdKm, wyjatekOdM);
            const dos = parsujPolaKilometraza(wyjatekDoKm, wyjatekDoM);
            const kmOdM = od.km * 1000 + od.m;
            const kmDoM = dos.km * 1000 + dos.m;
            const k = projekt.konstrukcje.find((x) => x.id === wyjatekDla) ?? projekt.konstrukcje.find((x) => x.legendaId === wyjatekDla);
            if (!k) return;
            const zakres = zakresTrasy(projekt, k.legendaId);
            const lo = Math.max(zakres.odM, Math.min(kmOdM, kmDoM));
            const hi = Math.min(zakres.doM > zakres.odM ? zakres.doM : Math.max(kmOdM, kmDoM), Math.max(kmOdM, kmDoM));
            patchKonstrukcja(wyjatekDla, (kk) => ({
              ...kk,
              wyjatki: [...kk.wyjatki, {
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
                opis: opisWyjatkuZKilometrazem(wyjatekOpis, kmOdM, kmDoM),
                kmOdM,
                kmDoM,
                numer: nastepnyNumerWyjatku(kk),
                warstwy: sklonujWarstwy(k.warstwy),
              }],
            }));
            setWybrany((prev) => ({ ...prev, [wyjatekDla]: `${lo}|${hi}` }));
            setWyjatekDla(null);
          },
          kolor: theme.colors.primary,
        }}
      >
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: theme.colors.textSecondary }}>Kilometraż od</Text>
          <PoleKilometraz theme={theme} km={wyjatekOdKm} m={wyjatekOdM} onKm={setWyjatekOdKm} onM={setWyjatekOdM} />
          <Text style={{ color: theme.colors.textSecondary }}>Kilometraż do</Text>
          <PoleKilometraz theme={theme} km={wyjatekDoKm} m={wyjatekDoM} onKm={setWyjatekDoKm} onM={setWyjatekDoM} />
          <TextInput
            value={wyjatekOpis}
            onChangeText={setWyjatekOpis}
            placeholder="Opis (opcjonalnie)"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
          />
          <Przycisk
            tekst="Zaznacz początek i koniec na planie"
            wariant="drugi"
            maly
            onPress={() => setMapaWyjatku(true)}
            accessibilityLabel="Zaznacz zakres wyjątku na planie"
          />
        </View>
      </SafeModal>
      <WyborZakresuNaPlanie
        visible={mapaWyjatku}
        projekt={projekt}
        theme={theme}
        obszarIds={(() => {
          const k = projekt.konstrukcje.find((x) => x.id === wyjatekDla) ?? projekt.konstrukcje.find((x) => x.legendaId === wyjatekDla);
          return k?.obszarIds;
        })()}
        odsLewaCm={0}
        odsPrawaCm={0}
        onClose={() => setMapaWyjatku(false)}
        onWybierz={({ kmOdM, kmDoM }) => {
          const od = Z_METROW_BIEZACYCH(kmOdM);
          const dos = Z_METROW_BIEZACYCH(kmDoM);
          setWyjatekOdKm(String(od.km));
          setWyjatekOdM(String(od.m).padStart(3, '0'));
          setWyjatekDoKm(String(dos.km));
          setWyjatekDoM(String(dos.m).padStart(3, '0'));
        }}
      />

      <SafeModal
        visible={!!oknoWarstw}
        tytul={oknoTytul}
        theme={theme}
        onClose={() => setOknoWarstw(null)}
        lewy={{ tekst: '‹ Wstecz', onPress: () => setOknoWarstw(null) }}
        prawy={{ tekst: 'Gotowe', onPress: () => setOknoWarstw(null), kolor: theme.colors.primary }}
      >
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          {oknoK ? (
            <>
              <PrzekrojKonstrukcji warstwy={oknoWy ? oknoWy.warstwy : oknoK.warstwy} theme={theme} />
              {oknoWy && oknoOd && oknoDo ? (
                <View style={[styles.wyjatek, { borderColor: theme.colors.border }]}>
                  <View style={styles.rzad}>
                    <Text style={{ color: theme.colors.text, fontWeight: '700', flex: 1 }}>{oknoWy.opis || 'Zmiana konstrukcji'}</Text>
                    <TouchableOpacity
                      accessibilityLabel="Usuń zmianę konstrukcji"
                      onPress={() => potwierdzAkcje('Usuń zmianę konstrukcji', 'Odcinek wróci do konstrukcji podstawowej.', () => {
                        patchKonstrukcja(oknoK.id || oknoK.legendaId, (kk) => ({ ...kk, wyjatki: kk.wyjatki.filter((x) => x.id !== oknoWy.id) }));
                        setOknoWarstw(null);
                      })}
                    >
                      <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>Usuń</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.rzad, { flexWrap: 'wrap' }]}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>od</Text>
                    <PoleKilometraz
                      theme={theme}
                      mini
                      km={oknoOd.km}
                      m={oknoOd.m}
                      onKm={(v) => {
                        const { km, m } = parsujPolaKilometraza(v, oknoOd.m);
                        ustawKmWyjatku(oknoK.id || oknoK.legendaId, oknoWy.id, km * 1000 + m, oknoWy.kmDoM);
                      }}
                      onM={(v) => {
                        const { km, m } = parsujPolaKilometraza(oknoOd.km, v);
                        ustawKmWyjatku(oknoK.id || oknoK.legendaId, oknoWy.id, km * 1000 + m, oknoWy.kmDoM);
                      }}
                    />
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>do</Text>
                    <PoleKilometraz
                      theme={theme}
                      mini
                      km={oknoDo.km}
                      m={oknoDo.m}
                      onKm={(v) => {
                        const { km, m } = parsujPolaKilometraza(v, oknoDo.m);
                        ustawKmWyjatku(oknoK.id || oknoK.legendaId, oknoWy.id, oknoWy.kmOdM, km * 1000 + m);
                      }}
                      onM={(v) => {
                        const { km, m } = parsujPolaKilometraza(oknoDo.km, v);
                        ustawKmWyjatku(oknoK.id || oknoK.legendaId, oknoWy.id, oknoWy.kmOdM, km * 1000 + m);
                      }}
                    />
                  </View>
                </View>
              ) : null}
              {edytorWarstw(oknoK, oknoWy ? oknoWy.warstwy : oknoK.warstwy, oknoWy?.id)}
            </>
          ) : null}
        </ScrollView>
        {oknoWarstw ? oknoMieszanek : null}
      </SafeModal>

      {oknoWarstw ? null : oknoMieszanek}
    </View>
  );
}

const styles = StyleSheet.create({
  rzad: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  probka: { width: 18, height: 18, borderRadius: 4 },
  pasek: { width: 8, borderRadius: 4, alignSelf: 'stretch' },
  warstwa: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  miniLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4, color: '#6B7280' },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  zatwierdzone: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingTop: 8 },
  naglowekZatwierdzonych: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 6 },
  wierszZatwierdzonej: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 7, gap: 1 },
  wyjatek: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 8 },
  odcinki: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  odcinekBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
});
