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
  onDodajOdsadzke: () => void;
  onZastosujOdsadzke: (
    odsadzkaId: string,
    dystansM: number,
    extra?: {
      strona?: 'lewa' | 'prawa';
      kmOdKm?: number;
      kmOdM?: number;
      kmDoKm?: number;
      kmDoM?: number;
    },
  ) => void;
  onUsunOdsadzke: (odsadzkaId: string) => void;
  pomiar: { p1?: number; p2?: number; wzdluzM?: number; prostoM?: number };
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

function KartaOdsadzki({
  o, theme, zablokowana, trybWyboru, onTryb, onZastosuj, onUsun,
}: {
  o: OdsadzkaObmiaru;
  theme: AppTheme;
  zablokowana: boolean;
  trybWyboru: TrybWyboruWezla | null;
  onTryb: (t: TrybWyboruWezla | null, odsadzkaId: string) => void;
  onZastosuj: (
    odsadzkaId: string,
    dystansM: number,
    extra?: {
      strona?: 'lewa' | 'prawa';
      kmOdKm?: number;
      kmOdM?: number;
      kmDoKm?: number;
      kmDoM?: number;
    },
  ) => void;
  onUsun: (odsadzkaId: string) => void;
}) {
  const [dyst, setDyst] = useState(o.dystansM != null ? String(Math.abs(o.dystansM)) : '0.10');
  const [zewn, setZewn] = useState(o.dystansM == null || o.dystansM >= 0);
  const [strona, setStrona] = useState<'lewa' | 'prawa' | undefined>(o.strona);
  const od0 = polaZKilometraza(o.kmOdKm, o.kmOdM);
  const do0 = polaZKilometraza(o.kmDoKm, o.kmDoM);
  const [kmOdKm, setKmOdKm] = useState(od0.km);
  const [kmOdM, setKmOdM] = useState(od0.m);
  const [kmDoKm, setKmDoKm] = useState(do0.km);
  const [kmDoM, setKmDoM] = useState(do0.m);
  const gotoweWezly = o.idxP != null && o.idxK != null;
  const tenSam = gotoweWezly && o.idxP === o.idxK;

  useEffect(() => {
    setStrona(o.strona);
    const a = polaZKilometraza(o.kmOdKm, o.kmOdM);
    const b = polaZKilometraza(o.kmDoKm, o.kmDoM);
    setKmOdKm(a.km);
    setKmOdM(a.m);
    setKmDoKm(b.km);
    setKmDoM(b.m);
    if (o.dystansM != null) setDyst(String(Math.abs(o.dystansM)));
    if (o.dystansM != null) setZewn(o.dystansM >= 0);
  }, [o.id, o.strona, o.kmOdKm, o.kmOdM, o.kmDoKm, o.kmDoM, o.dystansM]);

  const zastosuj = () => {
    const v = parseFloat(dyst.replace(',', '.'));
    if (!Number.isFinite(v) || v === 0) {
      Alert.alert('Odsadzka', 'Podaj wartość w metrach (np. 0.10).');
      return;
    }
    if (!gotoweWezly && !strona) {
      Alert.alert('Odsadzka', 'Zaznacz węzły P/K albo wybierz stronę L/P i kilometraż odcinka.');
      return;
    }
    const odP = parsujPolaKilometraza(kmOdKm, kmOdM);
    const doP = parsujPolaKilometraza(kmDoKm, kmDoM);
    onZastosuj(o.id, Math.abs(v) * (zewn ? 1 : -1), strona
      ? {
        strona,
        kmOdKm: odP.km,
        kmOdM: odP.m,
        kmDoKm: doP.km,
        kmDoM: doP.m,
      }
      : undefined);
  };

  return (
    <View style={{ gap: 8, paddingTop: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 13 }}>Odsadzka O{o.nr}</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {o.zastosowana && (
            <TouchableOpacity disabled={zablokowana} onPress={zastosuj}>
              <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 13 }}>✎ Edytuj</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            disabled={zablokowana}
            onPress={() => Alert.alert('Usuń odsadzkę', `Usunąć O${o.nr}? Powierzchnia wróci do stanu sprzed tej odsadzki.`, [
              { text: 'Anuluj', style: 'cancel' },
              { text: 'Usuń', style: 'destructive', onPress: () => onUsun(o.id) },
            ])}
          >
            <Text style={{ color: theme.colors.danger, fontWeight: '800', fontSize: 13 }}>Usuń</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
        Węzły P/K albo kilometraż na krawędzi L/P (np. prawa 1+300…1+400, 0,1 m na zewnątrz).
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Chip
          label={`P${o.nr}`}
          theme={theme}
          disabled={zablokowana}
          aktywny={trybWyboru === 'odsadzkaP'}
          ustawiony={o.idxP != null}
          onPress={() => onTryb(trybWyboru === 'odsadzkaP' ? null : 'odsadzkaP', o.id)}
        />
        <Chip
          label={`K${o.nr}`}
          theme={theme}
          disabled={zablokowana}
          aktywny={trybWyboru === 'odsadzkaK'}
          ustawiony={o.idxK != null}
          onPress={() => onTryb(trybWyboru === 'odsadzkaK' ? null : 'odsadzkaK', o.id)}
        />
      </View>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700' }}>Strona (krawędź)</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Chip
          label="Lewa"
          theme={theme}
          disabled={zablokowana}
          aktywny={strona === 'lewa'}
          onPress={() => setStrona(strona === 'lewa' ? undefined : 'lewa')}
        />
        <Chip
          label="Prawa"
          theme={theme}
          disabled={zablokowana}
          aktywny={strona === 'prawa'}
          onPress={() => setStrona(strona === 'prawa' ? undefined : 'prawa')}
        />
      </View>
      <View style={{ gap: 6 }}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>Kilometraż od</Text>
        <PoleKilometraz theme={theme} km={kmOdKm} m={kmOdM} onKm={setKmOdKm} onM={setKmOdM} editable={!zablokowana} compact />
        <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>Kilometraż do</Text>
        <PoleKilometraz theme={theme} km={kmDoKm} m={kmDoM} onKm={setKmDoKm} onM={setKmDoM} editable={!zablokowana} compact />
      </View>
      {tenSam && (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
          Ten sam węzeł – odsunięcie krawędzi wychodzącej z początku odcinka.
        </Text>
      )}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 90 }}>
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
          <Chip label="Zewn." theme={theme} aktywny={zewn} onPress={() => setZewn(true)} disabled={zablokowana} />
          <Chip label="Wewn." theme={theme} aktywny={!zewn} onPress={() => setZewn(false)} disabled={zablokowana} />
          <TouchableOpacity disabled={zablokowana} onPress={zastosuj}>
            <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>
              {o.zastosowana ? 'Zastosuj ponownie' : 'Zastosuj'}
            </Text>
          </TouchableOpacity>
        </View>
      {o.zastosowana && (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
          Zastosowano {o.dystansM != null && o.dystansM >= 0 ? '+' : ''}{o.dystansM} m
          {o.strona ? ` · ${o.strona === 'lewa' ? 'lewa' : 'prawa'}` : ''}
          {o.kmOdKm != null || o.kmOdM != null
            ? ` · ${o.kmOdKm ?? 0}+${String(o.kmOdM ?? 0).padStart(3, '0')}–${o.kmDoKm ?? 0}+${String(o.kmDoM ?? 0).padStart(3, '0')}`
            : ''}
          {' · stara linia szara'}
        </Text>
      )}
    </View>
  );
}

export function ObmiarKonfiguracja({
  obszar, theme, trybWyboru, onTryb, zablokowana, onBlokada,
  onBaza, onKierunek, onDodajOdsadzke, onZastosujOdsadzke, onUsunOdsadzke, pomiar,
}: Props) {
  const kierunek = kierunekKilometrazu(obszar);
  const dl = useMemo(() => dlugoscUkladaniaObszaru(obszar), [obszar]);
  const startKoniecGotowe = bazaKompletna(obszar.bazaStart) && bazaKompletna(obszar.bazaKoniec);
  const [aktywnaOdsadzkaId, setAktywnaOdsadzkaId] = useState<string | null>(
    obszar.odsadzki?.[0]?.id ?? null,
  );
  const odsadzki = obszar.odsadzki?.length ? obszar.odsadzki : [];

  return (
    <View style={{ gap: 14 }}>
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
          <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
            Niebieska linia = start, czerwona = koniec. Odległość od startu wzdłuż osi.
          </Text>
        </View>
      )}

      <View style={{ height: 1, backgroundColor: theme.colors.border }} />

      {odsadzki.map((o) => (
        <KartaOdsadzki
          key={o.id}
          o={o}
          theme={theme}
          zablokowana={zablokowana}
          trybWyboru={aktywnaOdsadzkaId === o.id ? trybWyboru : null}
          onTryb={(t, id) => {
            setAktywnaOdsadzkaId(id);
            onTryb(t, id);
          }}
          onZastosuj={onZastosujOdsadzke}
          onUsun={onUsunOdsadzke}
        />
      ))}
      <TouchableOpacity disabled={zablokowana} onPress={onDodajOdsadzke}>
        <Text style={{ color: zablokowana ? theme.colors.textSecondary : theme.colors.primary, fontWeight: '800' }}>
          + Dodaj kolejną odsadzkę
        </Text>
      </TouchableOpacity>

      <View style={{ height: 1, backgroundColor: theme.colors.border }} />
      <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 13, textTransform: 'uppercase' }}>
        Zmierz odległość
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
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
      </View>
      {pomiar.wzdluzM != null && (
        <Text style={{ color: theme.colors.text, fontSize: 13 }}>
          Wzdłuż krawędzi: {formatLiczby(pomiar.wzdluzM)} m · w linii: {formatLiczby(pomiar.prostoM ?? 0)} m
        </Text>
      )}
    </View>
  );
}
