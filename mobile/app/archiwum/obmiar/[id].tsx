// ============================================================
// ARCHIWUM – raport sesji obmiaru WZ (PDF + e-mail)
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  useColorScheme, ActivityIndicator, } from 'react-native';
import { wstecz } from '../../../src/budzet/nawigacja';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as MailComposer from 'expo-mail-composer';
import { useRouteId } from '../../../src/hooks/useRouteId';
import { useObmiarStore } from '../../../src/stores/obmiarStore';
import { useMieszankiStore } from '../../../src/stores/mieszankiStore';
import { useBudowyStore } from '../../../src/stores/budowyStore';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { formatLiczby } from '../../../src/utils/calculations';
import { formatujDatePl } from '../../../src/utils/dates';
import { infoAutaWz, dlugoscUkladaniaObszaru } from '../../../src/utils/obmiarLive';
import { formatujKilometraz } from '../../../src/utils/obmiarFigura';
import { generujRaportObmiaruPDF, stworzRaportObmiaruPDF } from '../../../src/utils/pdfGenerator';
import { pokazKomunikat } from '../../../src/utils/dialog';
import { Przycisk, Sekcja, SiatkaDanych, WierszDanych, kolorDnia, rodzajDnia } from '../../../src/components/ui';

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
        <AppHeader tytul="Raport obmiaru" lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/archiwum') }} />
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
      pokazKomunikat('Błąd', 'Nie udało się wygenerować PDF.');
    } finally {
      setGenerujePDF(false);
    }
  };

  const handleMail = async () => {
    const dostepny = await MailComposer.isAvailableAsync();
    if (!dostepny) {
      pokazKomunikat('Brak klienta e-mail', 'Na urządzeniu nie skonfigurowano konta e-mail.');
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
      pokazKomunikat('Błąd', 'Nie udało się przygotować wiadomości. Spróbuj eksportu PDF.');
    } finally {
      setGenerujePDF(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={sesja.nazwa}
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/archiwum') }}
        prawy={{
          tekst: generujePDF ? '…' : '📄 PDF',
          onPress: handlePDF,
          kolor: theme.colors.primary,
        }}
      />
      <ScrollView contentContainerStyle={[styles.zawartosc, { paddingBottom: insets.bottom + 24 }]}>
        <Sekcja tytul="Podsumowanie">
          <WierszDanych
            etykieta="Data"
            wartosc={formatujDatePl(sesja.data)}
            kolor={rodzajDnia(sesja.data) === 'roboczy' ? undefined : kolorDnia(theme, sesja.data)}
          />
          {budowa ? <WierszDanych etykieta="Budowa" wartosc={`${budowa.kodBudowy} – ${budowa.nazwaInwestycji}`} kolor={theme.colors.secondary} /> : null}
          <SiatkaDanych
            pozycje={[
              { etykieta: 'Obszary', wartosc: String(sesja.obszary.length) },
              { etykieta: 'Powierzchnia', wartosc: `${formatLiczby(sumaPow)} m²` },
              { etykieta: 'Aut', wartosc: String(wszystkieWz.length) },
              { etykieta: 'Masa z WZ', wartosc: `${formatLiczby(sumaTon, 2)} Mg` },
            ]}
          />
          <View style={styles.rzadPrzyciskow}>
            <Przycisk tekst={generujePDF ? 'Generowanie…' : 'Eksportuj PDF'} onPress={handlePDF} disabled={generujePDF} style={{ flex: 1 }} />
            <Przycisk tekst="Wyślij e-mail" wariant="drugi" onPress={handleMail} disabled={generujePDF} style={{ flex: 1 }} />
          </View>
          {generujePDF ? <ActivityIndicator color={theme.colors.primary} /> : null}
        </Sekcja>

        {sesja.obszary.map((o) => {
          const mie = o.mieszankaId
            ? pobierzMieszanke(o.mieszankaId) ?? mieszanki.find((m) => m.id === o.mieszankaId)
            : undefined;
          const rho = mie?.ciezarObjetosciowy ?? 2.4;
          const wpisy = [...(o.wpisyWz ?? [])].sort((a, b) => a.numer - b.numer);
          return (
            <Sekcja key={o.id} tytul={`${o.kolejnosc}. ${o.nazwa}`}>
              <SiatkaDanych
                pozycje={[
                  { etykieta: 'Powierzchnia', wartosc: `${formatLiczby(o.powierzchniaM2)} m²` },
                  { etykieta: 'Długość', wartosc: `${formatLiczby(dlugoscUkladaniaObszaru(o))} m` },
                ]}
              />
              {(o.bazaStart?.kilometrazKm != null || o.kilometrazStartKm != null) ? (
                <WierszDanych
                  etykieta="Kilometraż"
                  wartosc={`${formatujKilometraz(o.bazaStart?.kilometrazKm ?? o.kilometrazStartKm, o.bazaStart?.kilometrazM ?? o.kilometrazStartM)} → ${formatujKilometraz(o.bazaKoniec?.kilometrazKm ?? o.kilometrazKoniecKm, o.bazaKoniec?.kilometrazM ?? o.kilometrazKoniecM)}`}
                />
              ) : null}
              {mie ? <WierszDanych etykieta="Mieszanka" wartosc={`${mie.rodzaj} · ρ ${mie.ciezarObjetosciowy.toFixed(3)}`} /> : null}
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
            </Sekcja>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  zawartosc: { padding: 14, gap: 12 },
  rzadPrzyciskow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  wiersz: { borderTopWidth: 1, marginTop: 8, paddingTop: 8 },
});
