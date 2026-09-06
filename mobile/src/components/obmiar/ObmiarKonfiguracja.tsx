import React, { useMemo, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { AppTheme } from '../../constants/theme';
import type { ObszarObmiaru, OdsadzkaObmiaru, TrybWyboruWezla } from '../../types';
import {
  bazaKompletna, formatujKilometraz, kierunekKilometrazu,
  odleglosciWezlowOdStartu, parsujKilometraz,
} from '../../utils/obmiarFigura';
import { formatLiczby } from '../../utils/calculations';

interface Props {
  obszar: ObszarObmiaru;
  theme: AppTheme;
  trybWyboru: TrybWyboruWezla | null;
  onTryb: (t: TrybWyboruWezla | null, odsadzkaId?: string) => void;
  zablokowana: boolean;
  onBlokada: (v: boolean) => void;
  onBaza: (ktora: 'start' | 'koniec', dane: { kilometrazKm?: number; kilometrazM?: number }) => void;
  onDodajOdsadzke: () => void;
  onZastosujOdsadzke: (odsadzkaId: string, dystansM: number) => void;
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
  tytul, ktora, obszar, theme, zablokowana, trybWyboru, onTryb, onBaza,
}: {
  tytul: string;
  ktora: 'start' | 'koniec';
  obszar: ObszarObmiaru;
  theme: AppTheme;
  zablokowana: boolean;
  trybWyboru: TrybWyboruWezla | null;
  onTryb: (t: TrybWyboruWezla | null, odsadzkaId?: string) => void;
  onBaza: (ktora: 'start' | 'koniec', dane: { kilometrazKm?: number; kilometrazM?: number }) => void;
}) {
  const baza = ktora === 'start' ? obszar.bazaStart : obszar.bazaKoniec;
  const lTryb = ktora === 'start' ? 'startLewy' : 'koniecLewy';
  const pTryb = ktora === 'start' ? 'startPrawy' : 'koniecPrawy';
  const [kmTekst, setKmTekst] = useState(formatujKilometraz(baza?.kilometrazKm, baza?.kilometrazM));
  const komplet = bazaKompletna(baza);

  const zapiszKm = () => {
    const p = parsujKilometraz(kmTekst);
    if (!p) {
      Alert.alert('Kilometraż', 'Podaj np. 1+500');
      return;
    }
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
        {komplet && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 140 }}>
            <TextInput
              value={kmTekst}
              onChangeText={setKmTekst}
              editable={!zablokowana}
              placeholder="1+500"
              placeholderTextColor={theme.colors.textSecondary}
              style={{
                flex: 1,
                borderWidth: 1,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderColor: theme.colors.border,
                color: theme.colors.text,
                backgroundColor: theme.colors.inputBackground,
                fontSize: 15,
                fontWeight: '700',
              }}
            />
            <TouchableOpacity
              disabled={zablokowana}
              onPress={zapiszKm}
              style={{ paddingHorizontal: 10, paddingVertical: 8 }}
            >
              <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>OK</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      {komplet && (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
          Podstawa {ktora === 'start' ? 'pierwsza' : 'druga'}: linia L–P
          {baza?.kilometrazKm != null ? ` · ${formatujKilometraz(baza.kilometrazKm, baza.kilometrazM)}` : ''}
        </Text>
      )}
    </View>
  );
}

function KartaOdsadzki({
  o, theme, zablokowana, trybWyboru, onTryb, onZastosuj,
}: {
  o: OdsadzkaObmiaru;
  theme: AppTheme;
  zablokowana: boolean;
  trybWyboru: TrybWyboruWezla | null;
  onTryb: (t: TrybWyboruWezla | null, odsadzkaId: string) => void;
  onZastosuj: (odsadzkaId: string, dystansM: number) => void;
}) {
  const [dyst, setDyst] = useState(o.dystansM != null ? String(Math.abs(o.dystansM)) : '0.10');
  const [zewn, setZewn] = useState(o.dystansM == null || o.dystansM >= 0);
  const gotowe = o.idxP != null && o.idxK != null;

  return (
    <View style={{ gap: 8, paddingTop: 6 }}>
      <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 13 }}>Odsadzka O{o.nr}</Text>
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
      {gotowe && !o.zastosowana && (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
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
          <TouchableOpacity
            disabled={zablokowana}
            onPress={() => {
              const v = parseFloat(dyst.replace(',', '.'));
              if (!Number.isFinite(v) || v === 0) {
                Alert.alert('Odsadzka', 'Podaj wartość w metrach (np. 0.10).');
                return;
              }
              onZastosuj(o.id, Math.abs(v) * (zewn ? 1 : -1));
            }}
          >
            <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>Zastosuj</Text>
          </TouchableOpacity>
        </View>
      )}
      {o.zastosowana && (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
          Zastosowano {o.dystansM != null && o.dystansM >= 0 ? '+' : ''}{o.dystansM} m · stara linia szara
        </Text>
      )}
    </View>
  );
}

export function ObmiarKonfiguracja({
  obszar, theme, trybWyboru, onTryb, zablokowana, onBlokada,
  onBaza, onDodajOdsadzke, onZastosujOdsadzke, pomiar,
}: Props) {
  const kierunek = kierunekKilometrazu(obszar);
  const odl = useMemo(
    () => (bazaKompletna(obszar.bazaStart) && bazaKompletna(obszar.bazaKoniec)
      ? odleglosciWezlowOdStartu(obszar)
      : []),
    [obszar],
  );
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
        zablokowana={zablokowana}
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
      />

      {kierunek !== 'nieznany' && (
        <Text style={{ color: theme.colors.success, fontWeight: '700', fontSize: 12 }}>
          Układanie w kilometraż {kierunek === 'rosnacy' ? 'rosnący' : 'malejący'}
        </Text>
      )}

      {odl.some((x) => x.odStartuM > 0) && (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
          Odległości węzłów od startu:{' '}
          {odl.filter((x) => x.odStartuM > 0).slice(0, 8).map((x) => `W${x.idx + 1}=${formatLiczby(x.odStartuM)} m`).join(' · ')}
        </Text>
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
