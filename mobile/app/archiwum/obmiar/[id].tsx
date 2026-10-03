// ============================================================
// ARCHIWUM – raport sesji obmiaru WZ (PDF + e-mail)
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  useColorScheme, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as MailComposer from 'expo-mail-composer';
import { useRouteId } from '../../../src/hooks/useRouteId';
import { useObmiarStore } from '../../../src/stores/obmiarStore';
import { useMieszankiStore } from '../../../src/stores/mieszankiStore';
import { useBudowyStore } from '../../../src/stores/budowyStore';
import { lightTheme, darkTheme, type AppTheme } from '../../../src/constants/theme';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { formatLiczby } from '../../../src/utils/calculations';
import { formatujDatePl } from '../../../src/utils/dates';
import { infoAutaWz, dlugoscUkladaniaObszaru } from '../../../src/utils/obmiarLive';
import { formatujKilometraz } from '../../../src/utils/obmiarFigura';
import { generujRaportObmiaruPDF, stworzRaportObmiaruPDF } from '../../../src/utils/pdfGenerator';

export default function ArchiwumObmiarScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const id = useRouteId() ?? '';
  const sesja = useObmiarStore((s) => s.sesjaPoId(id));
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const pobierzMieszanke = useMieszankiStore((s) => s.pobierzMieszanke);
  const budowy = useBudowyStore((s) => s.budowy);
  const [generujePDF, setGenerujePDF] = useState(false);

  if (!sesja) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader tytul="Raport obmiaru" lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }} />
        <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: 40 }}>Sesja nie znaleziona.</Text>
      </View>
    );
  }

  const budowa = sesja.budowaId ? budowy.find((b) => b.id === sesja.budowaId) : undefined;
  const sumaPow = sesja.obszary.reduce((a, o) => a + o.powierzchniaM2, 0);
  const wszystkieWz = sesja.obszary.flatMap((o) => o.wpisyWz ?? []);
  const sumaTon = wszystkieWz.reduce((a, w) => a + w.tony, 0);
  const pdfOpts = {
    sesja,
    mieszanki,
    budowa: budowa ? { kodBudowy: budowa.kodBudowy, nazwaInwestycji: budowa.nazwaInwestycji } : undefined,
  };

  const handlePDF = async () => {
    setGenerujePDF(true);
    try {
      await generujRaportObmiaruPDF(pdfOpts);
    } catch {
      Alert.alert('Błąd', 'Nie udało się wygenerować PDF.');
    } finally {
      setGenerujePDF(false);
    }
  };

  const handleMail = async () => {
    const dostepny = await MailComposer.isAvailableAsync();
    if (!dostepny) {
      Alert.alert('Brak klienta e-mail', 'Na urządzeniu nie skonfigurowano konta e-mail.');
      return;
    }
    setGenerujePDF(true);
    try {
      const uri = await stworzRaportObmiaruPDF(pdfOpts);
      await MailComposer.composeAsync({
        subject: `Raport obmiaru WZ – ${sesja.nazwa} (${formatujDatePl(sesja.data)})`,
        body: `W załączniku raport obmiaru WZ z ${formatujDatePl(sesja.data)}.\n\nWygenerowano: Kalkulator MMA`,
        attachments: [uri],
      });
    } catch {
      Alert.alert('Błąd', 'Nie udało się przygotować wiadomości. Spróbuj eksportu PDF.');
    } finally {
      setGenerujePDF(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={sesja.nazwa}
        lewy={{ tekst: '‹ Wstecz', onPress: () => router.back() }}
        prawy={{
          tekst: generujePDF ? '…' : '📄 PDF',
          onPress: handlePDF,
          kolor: theme.colors.primary,
        }}
      />
      <ScrollView contentContainerStyle={[styles.zawartosc, { paddingBottom: insets.bottom + 24 }]}>
        {budowa ? (
          <View style={[styles.karta, { backgroundColor: `${theme.colors.secondary}12`, borderColor: theme.colors.secondary }]}>
            <Text style={{ color: theme.colors.secondary, fontWeight: '700' }}>
              {budowa.kodBudowy} – {budowa.nazwaInwestycji}
            </Text>
          </View>
        ) : null}

        <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>Podsumowanie</Text>
          <IR label="Data" v={formatujDatePl(sesja.data)} theme={theme} />
          <IR label="Obszary" v={String(sesja.obszary.length)} theme={theme} />
          <IR label="Powierzchnia" v={`${formatLiczby(sumaPow)} m²`} theme={theme} />
          <IR label="Aut" v={String(wszystkieWz.length)} theme={theme} />
          <IR label="Masa z WZ" v={`${formatLiczby(sumaTon, 2)} Mg`} theme={theme} bold />
        </View>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.colors.primary }]}
          onPress={handlePDF}
          disabled={generujePDF}
        >
          {generujePDF ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTekst}>Eksportuj PDF</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.colors.secondary }]}
          onPress={handleMail}
          disabled={generujePDF}
        >
          <Text style={styles.btnTekst}>Wyślij na e-mail</Text>
        </TouchableOpacity>

        {sesja.obszary.map((o) => {
          const mie = o.mieszankaId
            ? pobierzMieszanke(o.mieszankaId) ?? mieszanki.find((m) => m.id === o.mieszankaId)
            : undefined;
          const rho = mie?.ciezarObjetosciowy ?? 2.4;
          const wpisy = [...(o.wpisyWz ?? [])].sort((a, b) => a.numer - b.numer);
          return (
            <View key={o.id} style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.kartaTytul, { color: theme.colors.text }]}>
                {o.kolejnosc}. {o.nazwa}
              </Text>
              <IR label="Powierzchnia" v={`${formatLiczby(o.powierzchniaM2)} m²`} theme={theme} />
              <IR label="Długość" v={`${formatLiczby(dlugoscUkladaniaObszaru(o))} m`} theme={theme} />
              {(o.bazaStart?.kilometrazKm != null || o.kilometrazStartKm != null) ? (
                <IR
                  label="Kilometraż"
                  v={`${formatujKilometraz(o.bazaStart?.kilometrazKm ?? o.kilometrazStartKm, o.bazaStart?.kilometrazM ?? o.kilometrazStartM)} → ${formatujKilometraz(o.bazaKoniec?.kilometrazKm ?? o.kilometrazKoniecKm, o.bazaKoniec?.kilometrazM ?? o.kilometrazKoniecM)}`}
                  theme={theme}
                />
              ) : null}
              {mie ? <IR label="Mieszanka" v={`${mie.rodzaj} · ρ ${mie.ciezarObjetosciowy.toFixed(3)}`} theme={theme} /> : null}
              {wpisy.length === 0 ? (
                <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>Brak wpisów WZ.</Text>
              ) : wpisy.map((w) => {
                const info = infoAutaWz(o, w, rho);
                return (
                  <View key={w.id} style={[styles.wiersz, { borderTopColor: theme.colors.border }]}>
                    <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
                      Auto #{w.numer} · {formatLiczby(w.tony)} Mg
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                      {formatLiczby(info.metryTegoAuta)} m z auta · {formatLiczby(w.przejechaneMetry)} m od startu
                      {info.gruboscCm != null ? ` · Gr. ${formatLiczby(info.gruboscCm)} cm` : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function IR({ label, v, theme, bold }: { label: string; v: string; theme: AppTheme; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: 8 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: bold ? '700' : '400', textAlign: 'right', flexShrink: 1 }}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  zawartosc: { padding: 14, gap: 12 },
  karta: { borderRadius: 14, padding: 14, borderWidth: 1 },
  kartaTytul: { fontSize: 13, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  btn: { paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  btnTekst: { color: '#fff', fontWeight: '700', fontSize: 15 },
  wiersz: { borderTopWidth: 1, marginTop: 8, paddingTop: 8 },
});
