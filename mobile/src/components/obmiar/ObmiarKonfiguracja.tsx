import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { AppTheme } from '../../constants/theme';
import type { ObszarObmiaru, OdsadzkaObmiaru, TrybWyboruWezla } from '../../types';
import {
  bazaKompletna, formatujKilometraz, kierunekKilometrazu,
} from '../../utils/obmiarFigura';
import { dlugoscUkladaniaObszaru } from '../../utils/obmiarLive';
import { formatLiczby } from '../../utils/calculations';
import { PoleKilometraz, parsujPolaKilometraza, polaZKilometraza } from '../common/PoleKilometraz';

interface Props {
  obszar: ObszarObmiaru;
  theme: AppTheme;
  trybWyboru: TrybWyboruWezla | null;
  onTryb: (t: TrybWyboruWezla | null, odsadzkaId?: string) => void;
  zablokowana: boolean;
  onBlokada: (v: boolean) => void;
  onBaza: (ktora: 'start' | 'koniec', dane: { kilometrazKm?: number; kilometrazM?: number }) => void;
  onKierunek: (k: 'rosnacy' | 'malejacy') => void;
  onDodajOdsadzke: (dane?: Partial<OdsadzkaObmiaru>) => Promise<string | null>;
  onZastosujOdsadzke: (
    odsadzkaId: string,
    dystansM: number,
    extra?: Partial<OdsadzkaObmiaru>,
  ) => void;
  onUsunOdsadzke: (odsadzkaId: string) => void;
  pomiar: { p1?: number; p2?: number; wzdluzM?: number; prostoM?: number };
  onWyczyscPomiar?: () => void;
  sekcja?: 'start' | 'odsadzka' | 'pomiar';
}

function Chip({
  label, aktywny, ustawiony, theme, onPress, disabled,
}: {
  label: string; aktywny?: boolean; ustawiony?: boolean; theme: AppTheme;
  onPress: () => void; disabled?: boolean;
}) {
  const border = aktywny
    ? theme.colors.info
    : ustawiony
      ? theme.colors.success
      : theme.colors.border;
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: border,
        backgroundColor: aktywny ? `${theme.colors.info}22` : theme.colors.inputBackground,
        opacity: disabled ? 0.45 : 1,
        minWidth: 40,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function CheckMini({
  on, theme, disabled, onPress,
}: {
  on: boolean; theme: AppTheme; disabled?: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={{
        width: 22, height: 22, borderRadius: 4, borderWidth: 2,
        borderColor: on ? theme.colors.success : theme.colors.border,
        backgroundColor: on ? theme.colors.success : 'transparent',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {on ? <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>✓</Text> : null}
    </TouchableOpacity>
  );
}

function kmStartKoniec(obszar: ObszarObmiaru) {
  return {
    odKm: obszar.bazaStart?.kilometrazKm ?? obszar.kilometrazStartKm,
    odM: obszar.bazaStart?.kilometrazM ?? obszar.kilometrazStartM,
    doKm: obszar.bazaKoniec?.kilometrazKm ?? obszar.kilometrazKoniecKm,
    doM: obszar.bazaKoniec?.kilometrazM ?? obszar.kilometrazKoniecM,
  };
}

function SekcjaBazy({
  tytul, ktora, obszar, theme, zablokowana, trybWyboru, onTryb, onBaza, autoKoniec,
}: {
  tytul: string;
  ktora: 'start' | 'koniec';
  obszar: ObszarObmiaru;
  theme: AppTheme;
  zablokowana: boolean;
  trybWyboru: TrybWyboruWezla | null;
  onTryb: (t: TrybWyboruWezla | null, odsadzkaId?: string) => void;
  onBaza: (ktora: 'start' | 'koniec', dane: { kilometrazKm?: number; kilometrazM?: number }) => void;
  autoKoniec?: boolean;
}) {
  const baza = ktora === 'start' ? obszar.bazaStart : obszar.bazaKoniec;
  const lTryb = ktora === 'start' ? 'startLewy' : 'koniecLewy';
  const pTryb = ktora === 'start' ? 'startPrawy' : 'koniecPrawy';
  const pola0 = polaZKilometraza(baza?.kilometrazKm, baza?.kilometrazM);
  const [km, setKm] = useState(pola0.km);
  const [m, setM] = useState(pola0.m);
  const komplet = bazaKompletna(baza);

  useEffect(() => {
    const p = polaZKilometraza(baza?.kilometrazKm, baza?.kilometrazM);
    setKm(p.km);
    setM(p.m);
  }, [baza?.kilometrazKm, baza?.kilometrazM]);

  const zapiszKm = () => {
    const p = parsujPolaKilometraza(km, m);
    onBaza(ktora, { kilometrazKm: p.km, kilometrazM: p.m });
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 13, textTransform: 'uppercase' }}>
        {tytul}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Chip
          label="L"
          theme={theme}
          disabled={zablokowana}
          aktywny={trybWyboru === lTryb}
          ustawiony={baza?.idxLewy != null}
          onPress={() => onTryb(trybWyboru === lTryb ? null : lTryb)}
        />
        <Chip
          label="P"
          theme={theme}
          disabled={zablokowana}
          aktywny={trybWyboru === pTryb}
          ustawiony={baza?.idxPrawy != null}
          onPress={() => onTryb(trybWyboru === pTryb ? null : pTryb)}
        />
      </View>
      {komplet && (
        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
            {ktora === 'start' ? 'Kilometraż startu' : 'Kilometraż końca'}
            {autoKoniec ? ' (z osi figury)' : ''}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <PoleKilometraz
              theme={theme}
              km={km}
              m={m}
              onKm={setKm}
              onM={setM}
              editable={!zablokowana && !autoKoniec}
              compact
            />
            {!autoKoniec && (
              <TouchableOpacity disabled={zablokowana} onPress={zapiszKm}>
                <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function WierszOdsadzki({
  o, theme, zablokowana, pokazKm, onZastosuj, onUsun,
}: {
  o: OdsadzkaObmiaru;
  theme: AppTheme;
  zablokowana: boolean;
  pokazKm: boolean;
  onZastosuj: (odsadzkaId: string, dystansM: number, extra?: Partial<OdsadzkaObmiaru>) => void;
  onUsun: (odsadzkaId: string) => void;
}) {
  const [edycja, setEdycja] = useState(!o.zastosowana);
  const [dyst, setDyst] = useState(o.dystansM != null ? String(Math.abs(o.dystansM)) : '0.10');
  const [zewn, setZewn] = useState(o.dystansM == null || o.dystansM >= 0);
  const od0 = polaZKilometraza(o.kmOdKm, o.kmOdM);
  const do0 = polaZKilometraza(o.kmDoKm, o.kmDoM);
  const [kmOdKm, setKmOdKm] = useState(od0.km);
  const [kmOdM, setKmOdM] = useState(od0.m);
  const [kmDoKm, setKmDoKm] = useState(do0.km);
  const [kmDoM, setKmDoM] = useState(do0.m);

  useEffect(() => {
    const a = polaZKilometraza(o.kmOdKm, o.kmOdM);
    const b = polaZKilometraza(o.kmDoKm, o.kmDoM);
    setKmOdKm(a.km);
    setKmOdM(a.m);
    setKmDoKm(b.km);
    setKmDoM(b.m);
    if (o.dystansM != null) {
      setDyst(String(Math.abs(o.dystansM)));
      setZewn(o.dystansM >= 0);
    }
    setEdycja(!o.zastosowana);
  }, [o.id, o.strona, o.kmOdKm, o.kmOdM, o.kmDoKm, o.kmDoM, o.dystansM, o.zastosowana, o.calosc]);

  const zastosuj = () => {
    const v = parseFloat(dyst.replace(',', '.'));
    if (!Number.isFinite(v) || v === 0) {
      Alert.alert('Odsadzka', 'Podaj wartość w metrach (np. 0.10).');
      return;
    }
    if (!pokazKm && (o.idxP == null || o.idxK == null)) {
      Alert.alert('Odsadzka', 'Zaznacz na mapie punkty P1 i K1.');
      return;
    }
    if (pokazKm && !o.calosc && kmOdKm === '' && kmOdM === '' && kmDoKm === '' && kmDoM === '') {
      Alert.alert('Odsadzka', 'Wpisz kilometraż od–do albo zaznacz „całość”.');
      return;
    }
    const odP = parsujPolaKilometraza(kmOdKm, kmOdM);
    const doP = parsujPolaKilometraza(kmDoKm, kmDoM);
    const extra: Partial<OdsadzkaObmiaru> = { strona: o.strona, calosc: o.calosc };
    if (pokazKm && !o.calosc) {
      extra.kmOdKm = odP.km;
      extra.kmOdM = odP.m;
      extra.kmDoKm = doP.km;
      extra.kmDoM = doP.m;
    }
    onZastosuj(o.id, Math.abs(v) * (zewn ? 1 : -1), extra);
  };

  const etykieta = o.calosc
    ? 'całość'
    : (o.kmOdKm != null || o.kmOdM != null || o.kmDoKm != null || o.kmDoM != null)
      ? `${formatujKilometraz(o.kmOdKm, o.kmOdM) || '—'}–${formatujKilometraz(o.kmDoKm, o.kmDoM) || '—'}`
      : (o.idxP != null && o.idxK != null ? `W${o.idxP + 1}–W${o.idxK + 1}` : 'odcinek');

  if (o.zastosowana && !edycja) {
    return (
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        paddingVertical: 6,
      }}>
        <Text style={{ color: theme.colors.text, fontSize: 13, flex: 1 }}>
          {etykieta} · {o.dystansM != null && o.dystansM >= 0 ? '+' : ''}{o.dystansM} m
          {o.dystansM != null && o.dystansM >= 0 ? ' zewn.' : ' wewn.'}
        </Text>
        <TouchableOpacity disabled={zablokowana} onPress={() => setEdycja(true)}>
          <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 13 }}>Edytuj</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={zablokowana}
          onPress={() => Alert.alert('Usuń odsadzkę', 'Usunąć ten odcinek? Powierzchnia wróci do stanu sprzed tej odsadzki.', [
            { text: 'Anuluj', style: 'cancel' },
            { text: 'Usuń', style: 'destructive', onPress: () => onUsun(o.id) },
          ])}
        >
          <Text style={{ color: theme.colors.danger, fontWeight: '800', fontSize: 13 }}>Usuń</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ gap: 8, paddingTop: 4 }}>
      {pokazKm && !o.calosc && (
        <>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>Kilometraż od – do</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <PoleKilometraz theme={theme} km={kmOdKm} m={kmOdM} onKm={setKmOdKm} onM={setKmOdM} editable={!zablokowana} mini />
            <Text style={{ color: theme.colors.textSecondary, fontWeight: '700' }}>–</Text>
            <PoleKilometraz theme={theme} km={kmDoKm} m={kmDoM} onKm={setKmDoKm} onM={setKmDoM} editable={!zablokowana} mini />
            <TouchableOpacity disabled={zablokowana} onPress={zastosuj}>
              <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>OK</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <View style={{ width: 88 }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Odsunięcie [m]</Text>
          <TextInput
            value={dyst}
            onChangeText={setDyst}
            editable={!zablokowana}
            keyboardType="decimal-pad"
            style={{
              borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
              borderColor: theme.colors.border, color: theme.colors.text,
              backgroundColor: theme.colors.inputBackground,
            }}
          />
        </View>
        <Chip label="Zewnątrz" theme={theme} aktywny={zewn} onPress={() => setZewn(true)} disabled={zablokowana} />
        <Chip label="Wewnątrz" theme={theme} aktywny={!zewn} onPress={() => setZewn(false)} disabled={zablokowana} />
        {(!pokazKm || o.calosc) && (
          <TouchableOpacity disabled={zablokowana} onPress={zastosuj}>
            <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>OK</Text>
          </TouchableOpacity>
        )}
      </View>
      {o.zastosowana && (
        <TouchableOpacity disabled={zablokowana} onPress={() => setEdycja(false)}>
          <Text style={{ color: theme.colors.textSecondary, fontWeight: '700', fontSize: 12 }}>Anuluj edycję</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function SekcjaKrawedzi({
  strona, obszar, odsadzki, theme, zablokowana, onDodaj, onZastosuj, onUsun,
}: {
  strona: 'lewa' | 'prawa';
  obszar: ObszarObmiaru;
  odsadzki: OdsadzkaObmiaru[];
  theme: AppTheme;
  zablokowana: boolean;
  onDodaj: (dane: Partial<OdsadzkaObmiaru>) => Promise<string | null>;
  onZastosuj: (id: string, d: number, extra?: Partial<OdsadzkaObmiaru>) => void;
  onUsun: (id: string) => void;
}) {
  const tej = odsadzki.filter((o) => o.strona === strona);
  const calosc = tej.some((o) => o.calosc);
  const km = kmStartKoniec(obszar);

  const toggleCalosc = async () => {
    if (zablokowana) return;
    const istniejaca = tej.find((o) => o.calosc);
    if (istniejaca) {
      if (istniejaca.zastosowana) {
        Alert.alert('Całość', 'Usunąć odsadzkę na całej krawędzi?', [
          { text: 'Anuluj', style: 'cancel' },
          { text: 'Usuń', style: 'destructive', onPress: () => onUsun(istniejaca.id) },
        ]);
      } else {
        onUsun(istniejaca.id);
      }
      return;
    }
    await onDodaj({
      strona,
      calosc: true,
      kmOdKm: km.odKm,
      kmOdM: km.odM,
      kmDoKm: km.doKm,
      kmDoM: km.doM,
    });
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 13, flex: 1 }}>
          {strona === 'lewa' ? 'Lewa krawędź' : 'Prawa krawędź'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <CheckMini on={calosc} theme={theme} disabled={zablokowana} onPress={toggleCalosc} />
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>całość</Text>
        </View>
        <TouchableOpacity
          disabled={zablokowana}
          onPress={() => onDodaj({ strona, calosc: false })}
          style={{
            width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.primary,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 18 }}>+</Text>
        </TouchableOpacity>
      </View>
      {tej.length === 0 ? (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
          Zaznacz „całość” albo dodaj odcinek plusikiem.
        </Text>
      ) : tej.map((o) => (
        <WierszOdsadzki
          key={o.id}
          o={o}
          theme={theme}
          zablokowana={zablokowana}
          pokazKm
          onZastosuj={onZastosuj}
          onUsun={onUsun}
        />
      ))}
    </View>
  );
}

export function ObmiarKonfiguracja({
  obszar, theme, trybWyboru, onTryb, zablokowana, onBlokada,
  onBaza, onKierunek, onDodajOdsadzke, onZastosujOdsadzke, onUsunOdsadzke, pomiar,
  onWyczyscPomiar, sekcja,
}: Props) {
  const kierunek = kierunekKilometrazu(obszar);
  const dl = useMemo(() => dlugoscUkladaniaObszaru(obszar), [obszar]);
  const startKoniecGotowe = bazaKompletna(obszar.bazaStart) && bazaKompletna(obszar.bazaKoniec);
  const [aktywnaOdsadzkaId, setAktywnaOdsadzkaId] = useState<string | null>(
    obszar.odsadzki?.find((x) => !x.strona)?.id ?? null,
  );
  const odsadzki = obszar.odsadzki ?? [];
  const mapaOds = odsadzki.filter((o) => !o.strona);

  const pokazStart = !sekcja || sekcja === 'start';
  const pokazOds = !sekcja || sekcja === 'odsadzka';
  const pokazPomiar = !sekcja || sekcja === 'pomiar';

  const wybierzNaMapie = async (ktory: 'odsadzkaP' | 'odsadzkaK') => {
    let cel = mapaOds.find((o) => !o.zastosowana) ?? mapaOds[mapaOds.length - 1];
    if (!cel) {
      const nid = await onDodajOdsadzke({});
      if (!nid) return;
      setAktywnaOdsadzkaId(nid);
      onTryb(ktory, nid);
      return;
    }
    setAktywnaOdsadzkaId(cel.id);
    onTryb(trybWyboru === ktory && aktywnaOdsadzkaId === cel.id ? null : ktory, cel.id);
  };

  return (
    <View style={{ gap: 14 }}>
      {!sekcja && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 13, textTransform: 'uppercase' }}>
            Konfiguracja obszaru
          </Text>
          <TouchableOpacity onPress={() => onBlokada(!zablokowana)}>
            <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 13 }}>
              {zablokowana ? 'Odblokuj' : 'Zablokuj'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {pokazStart && (
        <>
          <SekcjaBazy
            tytul="Start"
            ktora="start"
            obszar={obszar}
            theme={theme}
            zablokowana={zablokowana || !!obszar.kontynuacjaPoprzedniego}
            trybWyboru={trybWyboru}
            onTryb={onTryb}
            onBaza={onBaza}
          />
          <SekcjaBazy
            tytul="Koniec"
            ktora="koniec"
            obszar={obszar}
            theme={theme}
            zablokowana={zablokowana}
            trybWyboru={trybWyboru}
            onTryb={onTryb}
            onBaza={onBaza}
            autoKoniec={startKoniecGotowe && kierunek !== 'nieznany'}
          />
          {startKoniecGotowe && (
            <View style={{ gap: 8 }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
                Kierunek układania
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['rosnacy', 'malejacy'] as const).map((k) => (
                  <TouchableOpacity
                    key={k}
                    disabled={zablokowana}
                    onPress={() => onKierunek(k)}
                    style={{
                      flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
                      borderColor: kierunek === k ? theme.colors.primary : theme.colors.border,
                      backgroundColor: kierunek === k ? `${theme.colors.primary}22` : theme.colors.inputBackground,
                    }}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 13 }}>
                      {k === 'rosnacy' ? '↑ Rosnący' : '↓ Malejący'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                Oś figury: {formatLiczby(dl)} m
                {obszar.bazaStart?.kilometrazKm != null || obszar.bazaStart?.kilometrazM != null
                  ? ` · ${formatujKilometraz(obszar.bazaStart?.kilometrazKm, obszar.bazaStart?.kilometrazM)} → ${formatujKilometraz(obszar.bazaKoniec?.kilometrazKm, obszar.bazaKoniec?.kilometrazM)}`
                  : ''}
              </Text>
            </View>
          )}
        </>
      )}

      {pokazOds && (
        <>
          <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 13 }}>Zaznacz na mapie</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              label="P1"
              theme={theme}
              disabled={zablokowana}
              aktywny={trybWyboru === 'odsadzkaP'}
              ustawiony={mapaOds.some((o) => o.idxP != null)}
              onPress={() => wybierzNaMapie('odsadzkaP')}
            />
            <Chip
              label="K1"
              theme={theme}
              disabled={zablokowana}
              aktywny={trybWyboru === 'odsadzkaK'}
              ustawiony={mapaOds.some((o) => o.idxK != null)}
              onPress={() => wybierzNaMapie('odsadzkaK')}
            />
          </View>
          {(trybWyboru === 'odsadzkaP' || trybWyboru === 'odsadzkaK') && (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
              Przewiń do podglądu i stuknij węzeł.
            </Text>
          )}
          {mapaOds.map((o) => (
            <WierszOdsadzki
              key={o.id}
              o={o}
              theme={theme}
              zablokowana={zablokowana}
              pokazKm={false}
              onZastosuj={onZastosujOdsadzke}
              onUsun={onUsunOdsadzke}
            />
          ))}

          <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 4 }} />

          <SekcjaKrawedzi
            strona="lewa"
            obszar={obszar}
            odsadzki={odsadzki}
            theme={theme}
            zablokowana={zablokowana}
            onDodaj={onDodajOdsadzke}
            onZastosuj={onZastosujOdsadzke}
            onUsun={onUsunOdsadzke}
          />

          <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 4 }} />

          <SekcjaKrawedzi
            strona="prawa"
            obszar={obszar}
            odsadzki={odsadzki}
            theme={theme}
            zablokowana={zablokowana}
            onDodaj={onDodajOdsadzke}
            onZastosuj={onZastosujOdsadzke}
            onUsun={onUsunOdsadzke}
          />
        </>
      )}

      {pokazPomiar && (
        <>
          {!sekcja && <View style={{ height: 1, backgroundColor: theme.colors.border }} />}
          <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 13, textTransform: 'uppercase' }}>
            Zmierz odległość
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              label="P1"
              theme={theme}
              aktywny={trybWyboru === 'pomiarP1'}
              ustawiony={pomiar.p1 != null}
              onPress={() => onTryb(trybWyboru === 'pomiarP1' ? null : 'pomiarP1')}
            />
            <Chip
              label="P2"
              theme={theme}
              aktywny={trybWyboru === 'pomiarP2'}
              ustawiony={pomiar.p2 != null}
              onPress={() => onTryb(trybWyboru === 'pomiarP2' ? null : 'pomiarP2')}
            />
            <TouchableOpacity onPress={onWyczyscPomiar}>
              <Text style={{ color: theme.colors.danger, fontWeight: '800', fontSize: 13 }}>Wyczyść</Text>
            </TouchableOpacity>
          </View>
          {pomiar.wzdluzM != null && (
            <Text style={{ color: theme.colors.text, fontSize: 13 }}>
              Wzdłuż krawędzi: {formatLiczby(pomiar.wzdluzM)} m · w linii: {formatLiczby(pomiar.prostoM ?? 0)} m
            </Text>
          )}
        </>
      )}
    </View>
  );
}
