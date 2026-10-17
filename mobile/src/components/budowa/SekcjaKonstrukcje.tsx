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
import { karta } from '../../constants/layout';
import { WyborMieszanki } from '../mieszanki/WyborMieszanki';
import { posortujMieszanki } from '../../mieszanki/kolejnosc';
import { useMieszankiStore } from '../../stores/mieszankiStore';
import { useWytwornieStore } from '../../stores/wytwornieStore';
import {
  czyLegendaUzupelniona,
  formatujKmM,
  nowaWarstwa,
  odsadzkiWarstwy,
  opisWyjatkuZKilometrazem,
  segmentyKonstrukcji,
  sklonujWarstwy,
} from '../../utils/projektBudowy';
import { zakresKmObszaru } from '../../utils/planZBudowy';
import { Z_METROW_BIEZACYCH } from '../../constants';
import { Przycisk, PrzyciskIkony } from '../ui';
import { potwierdzAkcje } from '../../utils/dialog';
import { rodzajMieszanki } from '../../mieszanki/kolejnosc';

interface Props {
  projekt: ProjektBudowy;
  theme: AppTheme;
  onZmien: (p: ProjektBudowy) => void;
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

export function SekcjaKonstrukcje({ projekt, theme, onZmien }: Props) {
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const wytwornie = useWytwornieStore((s) => s.wytwornie);
  const [mixWarstwa, setMixWarstwa] = useState<{ konstrukcjaId: string; warstwaId: string; wyjatekId?: string } | null>(null);
  const [wyjatekDla, setWyjatekDla] = useState<string | null>(null);
  const [wyjatekOdKm, setWyjatekOdKm] = useState('0');
  const [wyjatekOdM, setWyjatekOdM] = useState('000');
  const [wyjatekDoKm, setWyjatekDoKm] = useState('0');
  const [wyjatekDoM, setWyjatekDoM] = useState('200');
  const [wyjatekOpis, setWyjatekOpis] = useState('');
  const [wybrany, setWybrany] = useState<Record<string, string>>({});
  const [oknoWarstw, setOknoWarstw] = useState<{ legendaId: string; wyjatekId?: string } | null>(null);

  const obszary = projekt.legenda.filter((w) => w.typ === 'obszar' && w.nazwa.trim());
  const etykietaWytworni = (id?: string) => wytwornie.find((w) => w.id === id)?.nazwa;
  const legendOk = czyLegendaUzupelniona(projekt.legenda);

  const mixTarget = useMemo(() => {
    if (!mixWarstwa) return null;
    const k = projekt.konstrukcje.find((x) => x.legendaId === mixWarstwa.konstrukcjaId);
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

  const patchKonstrukcja = (legendaId: string, fn: (k: KonstrukcjaObszaru) => KonstrukcjaObszaru) => {
    zapiszKonstrukcje(projekt.konstrukcje.map((k) => (k.legendaId === legendaId ? fn(k) : k)));
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
              onChangeText={(t) => patchKonstrukcja(k.legendaId, (kk) => patchWarstwy(kk, w.id, { nazwa: t }, wyjatekId))}
              placeholder="Nazwa warstwy"
              placeholderTextColor={theme.colors.textSecondary}
              style={[styles.input, { flex: 1, minWidth: 0, color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
            />
            <TextInput
              value={w.rodzajOpis}
              onChangeText={(t) => patchKonstrukcja(k.legendaId, (kk) => patchWarstwy(kk, w.id, { rodzajOpis: t }, wyjatekId))}
              placeholder="Rodzaj, np. KR 3-7"
              placeholderTextColor={theme.colors.textSecondary}
              style={[styles.input, { flex: 1, minWidth: 0, color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
            />
            <PrzyciskIkony
              ikona="usun"
              kolor={theme.colors.danger}
              accessibilityLabel={`Usuń warstwę ${w.nazwa}`}
              onPress={() => patchKonstrukcja(k.legendaId, (kk) => {
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
                  patchKonstrukcja(k.legendaId, (kk) => patchWarstwy(kk, w.id, { gruboscCm: Number.isFinite(n) ? n : 0 }, wyjatekId));
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
                  patchKonstrukcja(k.legendaId, (kk) => patchWarstwy(kk, w.id, { odsadzkaLewaCm: lewa, odsadzkaCm: lewa, odsadzkaPrawaCm: prawa }, wyjatekId));
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
                  patchKonstrukcja(k.legendaId, (kk) => patchWarstwy(kk, w.id, { odsadzkaPrawaCm: prawa, odsadzkaLewaCm: lewa, odsadzkaCm: lewa }, wyjatekId));
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
                  onPress={() => patchKonstrukcja(k.legendaId, (kk) => patchWarstwy(kk, w.id, { kategoria: kat.id }, wyjatekId))}
                  style={[styles.chip, { borderColor: sel ? theme.colors.primary : theme.colors.border, backgroundColor: sel ? `${theme.colors.primary}22` : theme.colors.card }]}
                >
                  <Text style={{ color: theme.colors.text, fontSize: 11, fontWeight: '700' }}>{kat.etykieta}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {(() => {
            const zatwierdzone = posortujMieszanki(mieszanki.filter((x) => w.mieszankaIds.includes(x.id)));
            const otworz = () => setMixWarstwa({ konstrukcjaId: k.legendaId, warstwaId: w.id, wyjatekId });
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
        onPress={() => patchKonstrukcja(k.legendaId, (kk) => {
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

  const oknoK = oknoWarstw ? projekt.konstrukcje.find((x) => x.legendaId === oknoWarstw.legendaId) : undefined;
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

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.rzad}>
        <Text style={{ color: theme.colors.text, fontWeight: '800' }}>Odcinki</Text>
        <InfoTooltip tresc="Bez zmiany konstrukcji trasa to jeden odcinek. Przycisk „Zmiana konstrukcji” dzieli trasę na odcinki z kilometrażem, np. 112+300 - 115+000. Kliknięcie odcinka pokazuje schemat, a „Warstwy” otwiera okno z warstwami tego odcinka. Odsadzka lewa i prawa jest patrząc zgodnie z rosnącym kilometrażem." />
      </View>
      {obszary.map((wpis) => {
        const k = projekt.konstrukcje.find((x) => x.legendaId === wpis.id);
        if (!k) return null;
        const zakres = zakresTrasy(projekt, wpis.id);
        const segmenty = segmentyKonstrukcji(k, zakres.odM, zakres.doM);
        const odcinki = segmenty.length > 0
          ? segmenty
          : [{ od: zakres.odM, do: zakres.doM, warstwy: k.warstwy }];
        const klucz = (od: number, doM: number) => `${od}|${doM}`;
        const wybranyKlucz = odcinki.some((s) => klucz(s.od, s.do) === wybrany[wpis.id])
          ? wybrany[wpis.id]
          : klucz(odcinki[0].od, odcinki[0].do);
        const sel = odcinki.find((s) => klucz(s.od, s.do) === wybranyKlucz) ?? odcinki[0];
        return (
          <View key={wpis.id} style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, gap: 10 }]}>
            <View style={styles.rzad}>
              <View style={[styles.probka, { backgroundColor: wpis.kolor }]} />
              <Text style={{ color: theme.colors.text, fontWeight: '800', flex: 1, fontSize: 16 }}>{wpis.nazwa}</Text>
            </View>
            <View style={{ gap: 8 }}>
              {odcinki.map((s) => {
                const on = klucz(s.od, s.do) === wybranyKlucz;
                const etykieta = `${formatujKmM(s.od)} - ${formatujKmM(s.do)}`;
                const wyOdcinka = wyjatekNaSrodku(k, s.od, s.do);
                return (
                  <View key={klucz(s.od, s.do)} style={styles.rzad}>
                    <TouchableOpacity
                      onPress={() => setWybrany((prev) => ({ ...prev, [wpis.id]: klucz(s.od, s.do) }))}
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
                          Zmiana konstrukcji
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                    <Przycisk
                      tekst={`Warstwy · ${s.warstwy.length}`}
                      wariant="drugi"
                      maly
                      onPress={() => {
                        setWybrany((prev) => ({ ...prev, [wpis.id]: klucz(s.od, s.do) }));
                        setOknoWarstw({ legendaId: k.legendaId, wyjatekId: wyOdcinka?.id });
                      }}
                      accessibilityLabel={`Warstwy ${etykieta}`}
                    />
                  </View>
                );
              })}
            </View>
            <PrzekrojKonstrukcji warstwy={sel.warstwy} theme={theme} />
            <Przycisk
              tekst="Zmiana konstrukcji"
              ikona="plus"
              wariant="drugi"
              accessibilityLabel={`Zmiana konstrukcji ${wpis.nazwa}`}
              onPress={() => {
              setWyjatekDla(k.legendaId);
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
      })}

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
            const k = projekt.konstrukcje.find((x) => x.legendaId === wyjatekDla);
            if (!k) return;
            const zakres = zakresTrasy(projekt, wyjatekDla);
            const lo = Math.max(zakres.odM, Math.min(kmOdM, kmDoM));
            const hi = Math.min(zakres.doM > zakres.odM ? zakres.doM : Math.max(kmOdM, kmDoM), Math.max(kmOdM, kmDoM));
            patchKonstrukcja(wyjatekDla, (kk) => ({
              ...kk,
              wyjatki: [...kk.wyjatki, {
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
                opis: opisWyjatkuZKilometrazem(wyjatekOpis, kmOdM, kmDoM),
                kmOdM,
                kmDoM,
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
        </View>
      </SafeModal>

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
                        patchKonstrukcja(oknoK.legendaId, (kk) => ({ ...kk, wyjatki: kk.wyjatki.filter((x) => x.id !== oknoWy.id) }));
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
                        ustawKmWyjatku(oknoK.legendaId, oknoWy.id, km * 1000 + m, oknoWy.kmDoM);
                      }}
                      onM={(v) => {
                        const { km, m } = parsujPolaKilometraza(oknoOd.km, v);
                        ustawKmWyjatku(oknoK.legendaId, oknoWy.id, km * 1000 + m, oknoWy.kmDoM);
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
                        ustawKmWyjatku(oknoK.legendaId, oknoWy.id, oknoWy.kmOdM, km * 1000 + m);
                      }}
                      onM={(v) => {
                        const { km, m } = parsujPolaKilometraza(oknoDo.km, v);
                        ustawKmWyjatku(oknoK.legendaId, oknoWy.id, oknoWy.kmOdM, km * 1000 + m);
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
