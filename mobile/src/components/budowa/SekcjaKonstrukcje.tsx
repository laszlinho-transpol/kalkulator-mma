import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
} from 'react-native';
import type { AppTheme } from '../../constants/theme';
import type { KategoriaWarstwy, KonstrukcjaObszaru, ProjektBudowy, WarstwaKonstrukcji } from '../../types';
import { PrzekrojKonstrukcji } from './PrzekrojKonstrukcji';
import { SafeModal } from '../common/SafeModal';
import { PoleKilometraz, parsujPolaKilometraza, polaZKilometraza } from '../common/PoleKilometraz';
import { karta } from '../../constants/layout';
import { useMieszankiStore } from '../../stores/mieszankiStore';
import { useWytwornieStore } from '../../stores/wytwornieStore';
import {
  czyLegendaUzupelniona,
  nowaWarstwa,
  odsadzkiWarstwy,
  sklonujWarstwy,
} from '../../utils/projektBudowy';
import { Z_METROW_BIEZACYCH } from '../../constants';

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
  const [otwarte, setOtwarte] = useState<Record<string, boolean>>({});

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
              style={[styles.input, { flex: 1, color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
            />
            <TouchableOpacity
              onPress={() => patchKonstrukcja(k.legendaId, (kk) => {
                if (wyjatekId) {
                  return {
                    ...kk,
                    wyjatki: kk.wyjatki.map((wy) => wy.id !== wyjatekId ? wy : { ...wy, warstwy: nadajKolejnosc(wy.warstwy.filter((x) => x.id !== w.id)) }),
                  };
                }
                return { ...kk, warstwy: nadajKolejnosc(kk.warstwy.filter((x) => x.id !== w.id)) };
              })}
            >
              <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>Usuń</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            value={w.rodzajOpis}
            onChangeText={(t) => patchKonstrukcja(k.legendaId, (kk) => patchWarstwy(kk, w.id, { rodzajOpis: t }, wyjatekId))}
            placeholder="Rodzaj (opis), np. KR 3-7"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
          />
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
          <TouchableOpacity
            style={[styles.chip, { alignSelf: 'flex-start', borderColor: theme.colors.secondary }]}
            onPress={() => setMixWarstwa({ konstrukcjaId: k.legendaId, warstwaId: w.id, wyjatekId })}
          >
            <Text style={{ color: theme.colors.secondary, fontSize: 12, fontWeight: '700' }}>
              {w.mieszankaIds.length === 0
                ? 'Materiał zatwierdzony (opcjonalnie)'
                : w.mieszankaIds.map((id) => {
                    const m = mieszanki.find((x) => x.id === id);
                    const wyt = etykietaWytworni(m?.wytworniaId) ?? m?.wytwórnia;
                    return m ? `${m.rodzaj}${wyt ? ` · ${wyt}` : ''}` : id;
                  }).join(', ')}
            </Text>
          </TouchableOpacity>
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

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
        Widać schemat przekroju. Każda warstwa ma odsadzkę lewą i prawą (patrząc zgodnie z rosnącym kilometrażem). Kliknij przekrój, żeby rozwinąć warstwy.
      </Text>
      {obszary.map((wpis) => {
        const k = projekt.konstrukcje.find((x) => x.legendaId === wpis.id);
        if (!k) return null;
        const rozwinieta = !!otwarte[wpis.id];
        return (
          <View key={wpis.id} style={[karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, gap: 10 }]}>
            <TouchableOpacity
              onPress={() => setOtwarte((prev) => ({ ...prev, [wpis.id]: !prev[wpis.id] }))}
              style={{ gap: 8 }}
              accessibilityLabel={rozwinieta ? 'Zwiń konstrukcję' : 'Rozwiń konstrukcję'}
            >
              <View style={styles.rzad}>
                <View style={[styles.probka, { backgroundColor: wpis.kolor }]} />
                <Text style={{ color: theme.colors.text, fontWeight: '800', flex: 1, fontSize: 16 }}>{wpis.nazwa}</Text>
                <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>{rozwinieta ? '▼' : '▶'}</Text>
              </View>
              <PrzekrojKonstrukcji warstwy={k.warstwy} theme={theme} />
              {!rozwinieta ? (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                  Kliknij schemat, aby edytować warstwy
                </Text>
              ) : null}
            </TouchableOpacity>
            {rozwinieta ? (
              <>
            {edytorWarstw(k, k.warstwy)}
            <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 12, marginTop: 4 }}>WYJĄTKI KM</Text>
            {k.wyjatki.map((wy) => {
              const od = polaZKilometraza(Z_METROW_BIEZACYCH(wy.kmOdM).km, Z_METROW_BIEZACYCH(wy.kmOdM).m);
              const dos = polaZKilometraza(Z_METROW_BIEZACYCH(wy.kmDoM).km, Z_METROW_BIEZACYCH(wy.kmDoM).m);
              return (
                <View key={wy.id} style={[styles.wyjatek, { borderColor: theme.colors.border }]}>
                  <View style={styles.rzad}>
                    <Text style={{ color: theme.colors.text, fontWeight: '700', flex: 1 }}>{wy.opis || 'Zmiana konstrukcji'}</Text>
                    <TouchableOpacity onPress={() => patchKonstrukcja(k.legendaId, (kk) => ({ ...kk, wyjatki: kk.wyjatki.filter((x) => x.id !== wy.id) }))}>
                      <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>Usuń</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.rzad, { flexWrap: 'wrap' }]}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>od</Text>
                    <PoleKilometraz
                      theme={theme}
                      mini
                      km={od.km}
                      m={od.m}
                      onKm={(v) => {
                        const { km, m } = parsujPolaKilometraza(v, od.m);
                        patchKonstrukcja(k.legendaId, (kk) => ({
                          ...kk,
                          wyjatki: kk.wyjatki.map((x) => x.id === wy.id ? { ...x, kmOdM: km * 1000 + m } : x),
                        }));
                      }}
                      onM={(v) => {
                        const { km, m } = parsujPolaKilometraza(od.km, v);
                        patchKonstrukcja(k.legendaId, (kk) => ({
                          ...kk,
                          wyjatki: kk.wyjatki.map((x) => x.id === wy.id ? { ...x, kmOdM: km * 1000 + m } : x),
                        }));
                      }}
                    />
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>do</Text>
                    <PoleKilometraz
                      theme={theme}
                      mini
                      km={dos.km}
                      m={dos.m}
                      onKm={(v) => {
                        const { km, m } = parsujPolaKilometraza(v, dos.m);
                        patchKonstrukcja(k.legendaId, (kk) => ({
                          ...kk,
                          wyjatki: kk.wyjatki.map((x) => x.id === wy.id ? { ...x, kmDoM: km * 1000 + m } : x),
                        }));
                      }}
                      onM={(v) => {
                        const { km, m } = parsujPolaKilometraza(dos.km, v);
                        patchKonstrukcja(k.legendaId, (kk) => ({
                          ...kk,
                          wyjatki: kk.wyjatki.map((x) => x.id === wy.id ? { ...x, kmDoM: km * 1000 + m } : x),
                        }));
                      }}
                    />
                  </View>
                  <PrzekrojKonstrukcji warstwy={wy.warstwy} theme={theme} szerokoscSzkicu={112} />
                  {edytorWarstw(k, wy.warstwy, wy.id)}
                </View>
              );
            })}
            <TouchableOpacity onPress={() => {
              setWyjatekDla(k.legendaId);
              const start = projekt.kilometrazPoczatkowyM;
              const od = Z_METROW_BIEZACYCH(start);
              const dos = Z_METROW_BIEZACYCH(start + 200);
              setWyjatekOdKm(String(od.km));
              setWyjatekOdM(String(od.m).padStart(3, '0'));
              setWyjatekDoKm(String(dos.km));
              setWyjatekDoM(String(dos.m).padStart(3, '0'));
              setWyjatekOpis('');
            }}>
              <Text style={{ color: theme.colors.info, fontWeight: '700' }}>+ Wyjątek od–do</Text>
            </TouchableOpacity>
              </>
            ) : null}
          </View>
        );
      })}

      <SafeModal
        visible={!!wyjatekDla}
        tytul="Nowy wyjątek konstrukcji"
        theme={theme}
        onClose={() => setWyjatekDla(null)}
        prawy={{
          tekst: 'Dodaj',
          onPress: () => {
            if (!wyjatekDla) return;
            const od = parsujPolaKilometraza(wyjatekOdKm, wyjatekOdM);
            const dos = parsujPolaKilometraza(wyjatekDoKm, wyjatekDoM);
            const k = projekt.konstrukcje.find((x) => x.legendaId === wyjatekDla);
            if (!k) return;
            patchKonstrukcja(wyjatekDla, (kk) => ({
              ...kk,
              wyjatki: [...kk.wyjatki, {
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
                opis: wyjatekOpis.trim() || undefined,
                kmOdM: od.km * 1000 + od.m,
                kmDoM: dos.km * 1000 + dos.m,
                warstwy: sklonujWarstwy(k.warstwy),
              }],
            }));
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
        visible={!!mixWarstwa}
        tytul="Zatwierdzone mieszanki"
        theme={theme}
        onClose={() => setMixWarstwa(null)}
        prawy={{ tekst: 'Gotowe', onPress: () => setMixWarstwa(null), kolor: theme.colors.primary }}
      >
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
          {mieszanki.length === 0 ? (
            <Text style={{ color: theme.colors.textSecondary }}>
              Brak recept w bazie. Dodaj mieszanki w kafelku „Mieszanki”.
            </Text>
          ) : mieszanki.map((m) => {
            const sel = mixTarget?.mieszankaIds.includes(m.id) ?? false;
            const wyt = etykietaWytworni(m.wytworniaId) ?? m.wytwórnia;
            return (
              <TouchableOpacity
                key={m.id}
                style={[karta, { backgroundColor: sel ? `${theme.colors.primary}18` : theme.colors.card, borderColor: sel ? theme.colors.primary : theme.colors.border }]}
                onPress={() => {
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
              >
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{m.rodzaj}{sel ? '  ✓' : ''}</Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                  ρ {m.ciezarObjetosciowy.toFixed(3)} t/m³{wyt ? ` · ${wyt}` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeModal>
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
  wyjatek: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 8 },
});
