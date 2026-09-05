// ============================================================
// OBMIAR PZT – szczegoly: XFDF, skala, podglad, Etap B LIVE
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  useColorScheme, Alert, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../src/components/common/AppHeader';
import { SafeModal } from '../../src/components/common/SafeModal';
import { WielokatPodglad } from '../../src/components/obmiar/WielokatPodglad';
import { lightTheme, darkTheme, type AppTheme } from '../../src/constants/theme';
import { useObmiarStore } from '../../src/stores/obmiarStore';
import { useRouteId } from '../../src/hooks/useRouteId';
import { wybierzIParsujXfdf } from '../../src/utils/xfdfImport';
import { formatLiczby } from '../../src/utils/calculations';
import { bilansLiveObszaru } from '../../src/utils/obmiarLive';
import { listaKrawedzi, odsadzKrawedz } from '../../src/utils/obmiarOffset';
import {
  PRESETY_SKALI_PZT,
  skalaZMianownika,
  type RolaWezlaObmiaru,
} from '../../src/types';

const ROLE_OPCJE: { rola: RolaWezlaObmiaru; label: string }[] = [
  { rola: 'start', label: 'START' },
  { rola: 'koniec', label: 'KONIEC' },
  { rola: 'lewa', label: 'LEWA' },
  { rola: 'prawa', label: 'PRAWA' },
  { rola: 'zwykly', label: 'Wyczysc' },
];

export default function ObmiarDetailScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const id = useRouteId() ?? '';
  const {
    sesjaPoId, dodajObszaryZXfdf, przesunObszar, usunObszar, zmienSkale,
    ustawRoleWezla, ustawKilometraz, ustawLiveObszaru, zastosujOdsadzke,
  } = useObmiarStore();
  const sesja = id ? sesjaPoId(id) : undefined;

  const [podgladId, setPodgladId] = useState<string | null>(null);
  const [modalSkala, setModalSkala] = useState(false);
  const [mianownikTekst, setMianownikTekst] = useState('500');
  const [wybranyWezel, setWybranyWezel] = useState<number | null>(null);
  const [metryTekst, setMetryTekst] = useState('');
  const [tonyTekst, setTonyTekst] = useState('');
  const [kmStart, setKmStart] = useState('');
  const [mStart, setMStart] = useState('');
  const [kmKoniec, setKmKoniec] = useState('');
  const [mKoniec, setMKoniec] = useState('');
  const [idxKrawedzi, setIdxKrawedzi] = useState(0);
  const [odsadzkaCm, setOdsadzkaCm] = useState('10');
  const [odsadzkaZewnatrz, setOdsadzkaZewnatrz] = useState(true);

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
    setMetryTekst(obszarPodgladu.przejechaneMetry != null ? String(obszarPodgladu.przejechaneMetry) : '');
    setTonyTekst(obszarPodgladu.sumaTon != null ? String(obszarPodgladu.sumaTon) : '');
    setKmStart(obszarPodgladu.kilometrazStartKm != null ? String(obszarPodgladu.kilometrazStartKm) : '');
    setMStart(obszarPodgladu.kilometrazStartM != null ? String(obszarPodgladu.kilometrazStartM) : '');
    setKmKoniec(obszarPodgladu.kilometrazKoniecKm != null ? String(obszarPodgladu.kilometrazKoniecKm) : '');
    setMKoniec(obszarPodgladu.kilometrazKoniecM != null ? String(obszarPodgladu.kilometrazKoniecM) : '');
    setWybranyWezel(null);
  }, [obszarPodgladu?.id]);

  const bilans = useMemo(
    () => (obszarPodgladu ? bilansLiveObszaru(obszarPodgladu) : null),
    [obszarPodgladu],
  );

  const prognozaOdsadzki = useMemo(() => {
    if (!obszarPodgladu) return null;
    const cm = parseFloat(odsadzkaCm.replace(',', '.'));
    if (!Number.isFinite(cm) || cm === 0) return null;
    const dystansM = (Math.abs(cm) / 100) * (odsadzkaZewnatrz ? 1 : -1);
    return odsadzKrawedz(obszarPodgladu.wierzcholkiM, idxKrawedzi, dystansM);
  }, [obszarPodgladu, odsadzkaCm, odsadzkaZewnatrz, idxKrawedzi]);

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

  const otworzSkale = () => {
    setMianownikTekst(String(sesja.skala.mianownik));
    setModalSkala(true);
  };

  const zastosujSkale = async (mianownik: number) => {
    await zmienSkale(sesja.id, skalaZMianownika(mianownik));
    setModalSkala(false);
  };

  const zapiszLive = async () => {
    if (!obszarPodgladu) return;
    const metry = parseFloat(metryTekst.replace(',', '.'));
    const tony = parseFloat(tonyTekst.replace(',', '.'));
    await ustawLiveObszaru(sesja.id, obszarPodgladu.id, {
      przejechaneMetry: Number.isFinite(metry) ? metry : 0,
      sumaTon: Number.isFinite(tony) ? tony : 0,
    });
  };

  const zapiszKm = async () => {
    if (!obszarPodgladu) return;
    const parseOpt = (t: string) => {
      const v = parseFloat(t.replace(',', '.'));
      return Number.isFinite(v) ? v : undefined;
    };
    await ustawKilometraz(sesja.id, obszarPodgladu.id, {
      kilometrazStartKm: parseOpt(kmStart),
      kilometrazStartM: parseOpt(mStart),
      kilometrazKoniecKm: parseOpt(kmKoniec),
      kilometrazKoniecM: parseOpt(mKoniec),
    });
  };

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
          <TouchableOpacity style={[styles.btnSek, { borderColor: theme.colors.primary }]} onPress={otworzSkale}>
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
              wysokosc={300}
              etykieta={`${formatLiczby(obszarPodgladu.powierzchniaM2)} m²`}
              resetKlucz={obszarPodgladu.id}
              onPressWezel={(idx) => setWybranyWezel(idx)}
              obszar={obszarPodgladu}
              pokazMaszyny
            />
            {wybranyWezel != null && (
              <View style={{ marginTop: 10 }}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 6 }}>
                  Węzeł {wybranyWezel + 1} – ustaw rolę:
                </Text>
                <View style={styles.roleRzad}>
                  {ROLE_OPCJE.map((r) => (
                    <TouchableOpacity
                      key={r.rola}
                      style={[styles.roleBtn, { borderColor: theme.colors.border, backgroundColor: `${theme.colors.primary}15` }]}
                      onPress={async () => {
                        await ustawRoleWezla(sesja.id, obszarPodgladu.id, wybranyWezel, r.rola);
                        setWybranyWezel(null);
                      }}
                    >
                      <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 11 }}>{r.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {obszarPodgladu && bilans && (
          <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>LIVE na obszarze</Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
              Oznacz START/KONIEC na podglądzie (dotknij węzeł), potem wpisz metry i tony.
            </Text>
            <View style={styles.polaRzad}>
              <Pole label="Metry [m]" value={metryTekst} onChange={setMetryTekst} theme={theme} />
              <Pole label="Tony [Mg]" value={tonyTekst} onChange={setTonyTekst} theme={theme} />
            </View>
            <TouchableOpacity
              style={[styles.btnSek, { borderColor: theme.colors.success, marginTop: 8 }]}
              onPress={zapiszLive}
            >
              <Text style={{ color: theme.colors.success, fontWeight: '700' }}>Zapisz LIVE</Text>
            </TouchableOpacity>
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

            <Text style={[styles.kartaTytul, { color: theme.colors.text, marginTop: 14 }]}>Kilometraż</Text>
            <View style={styles.polaRzad}>
              <Pole label="Start km" value={kmStart} onChange={setKmStart} theme={theme} />
              <Pole label="Start m" value={mStart} onChange={setMStart} theme={theme} />
            </View>
            <View style={[styles.polaRzad, { marginTop: 8 }]}>
              <Pole label="Koniec km" value={kmKoniec} onChange={setKmKoniec} theme={theme} />
              <Pole label="Koniec m" value={mKoniec} onChange={setMKoniec} theme={theme} />
            </View>
            <TouchableOpacity
              style={[styles.btnSek, { borderColor: theme.colors.border, marginTop: 8 }]}
              onPress={zapiszKm}
            >
              <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Zapisz kilometraż</Text>
            </TouchableOpacity>
          </View>
        )}

        
        {obszarPodgladu && (
          <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>Odsadzka krawędzi</Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
              Przesuń wybraną krawędź o zadaną odległość (np. 10 cm na 100 m ≈ +10 m² na zewnątrz).
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {listaKrawedzi(obszarPodgladu.wierzcholkiM).map((k) => (
                <TouchableOpacity
                  key={k.idx}
                  onPress={() => setIdxKrawedzi(k.idx)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    marginRight: 6,
                    borderColor: idxKrawedzi === k.idx ? theme.colors.primary : theme.colors.border,
                    backgroundColor: idxKrawedzi === k.idx ? `${theme.colors.primary}20` : theme.colors.inputBackground,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '600' }}>{k.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Odległość [cm]</Text>
                <TextInput
                  value={odsadzkaCm}
                  onChangeText={setOdsadzkaCm}
                  keyboardType="decimal-pad"
                  style={{
                    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
                    borderColor: theme.colors.border, color: theme.colors.text,
                    backgroundColor: theme.colors.inputBackground, fontSize: 16,
                  }}
                />
              </View>
              <TouchableOpacity
                onPress={() => setOdsadzkaZewnatrz(true)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1,
                  borderColor: odsadzkaZewnatrz ? theme.colors.success : theme.colors.border,
                  backgroundColor: odsadzkaZewnatrz ? `${theme.colors.success}20` : theme.colors.inputBackground,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 12 }}>Na zewnątrz</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setOdsadzkaZewnatrz(false)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1,
                  borderColor: !odsadzkaZewnatrz ? theme.colors.danger : theme.colors.border,
                  backgroundColor: !odsadzkaZewnatrz ? `${theme.colors.danger}20` : theme.colors.inputBackground,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 12 }}>Do wewnątrz</Text>
              </TouchableOpacity>
            </View>
            {prognozaOdsadzki ? (
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 8 }}>
                Prognoza Δ: {prognozaOdsadzki.deltaPowierzchniaM2 >= 0 ? '+' : ''}
                {prognozaOdsadzki.deltaPowierzchniaM2} m² (krawędź {prognozaOdsadzki.dlugoscKrawedziM} m)
              </Text>
            ) : null}
            <TouchableOpacity
              style={{
                marginTop: 10, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
                borderColor: theme.colors.primary,
              }}
              onPress={async () => {
                const cm = parseFloat(odsadzkaCm.replace(',', '.'));
                if (!Number.isFinite(cm) || cm === 0) {
                  Alert.alert('Odsadzka', 'Podaj odległość w cm (np. 10).');
                  return;
                }
                const dystansM = (Math.abs(cm) / 100) * (odsadzkaZewnatrz ? 1 : -1);
                const wynik = await zastosujOdsadzke(sesja.id, obszarPodgladu.id, idxKrawedzi, dystansM);
                if (wynik) {
                  Alert.alert(
                    'Odsadzka zastosowana',
                    `Krawędź ${wynik.dlugoscKrawedziM} m · Δ powierzchnia ${wynik.deltaPowierzchniaM2 >= 0 ? '+' : ''}${wynik.deltaPowierzchniaM2} m²\nNowa powierzchnia: ${wynik.powierzchniaM2} m²`,
                  );
                }
              }}
            >
              <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Zastosuj odsadzkę</Text>
            </TouchableOpacity>
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
              </TouchableOpacity>
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
            zastosujSkale(m);
          },
          kolor: theme.colors.primary,
        }}
      >
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
            Przy skali 1:500 → 1 cm na papierze = 5 m w terenie. Zmiana przelicza powierzchnię wszystkich obszarów.
          </Text>
          <Text style={{ color: theme.colors.text, fontWeight: '700', marginTop: 4 }}>Presety</Text>
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
                  zastosujSkale(p.mianownik);
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>1:{p.mianownik}</Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>{p.metryNaCm} m / cm</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ color: theme.colors.text, fontWeight: '700', marginTop: 8 }}>Własny mianownik</Text>
          <TextInput
            value={mianownikTekst}
            onChangeText={setMianownikTekst}
            keyboardType="numeric"
            placeholder="np. 500"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.inputBackground }]}
          />
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
            1 cm = {(parseFloat(mianownikTekst.replace(',', '.')) / 100 || 0).toFixed(2)} m
          </Text>
        </ScrollView>
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
  label, value, onChange, theme,
}: {
  label: string; value: string; onChange: (t: string) => void; theme: AppTheme;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder="0"
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
  roleRzad: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  roleBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  polaRzad: { flexDirection: 'row', gap: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  presetBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minWidth: 96 },
});
