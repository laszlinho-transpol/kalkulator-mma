import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../../src/components/common/AppHeader';
import { Zakladki } from '../../../../src/components/budzet/Zakladki';
import { MapaLokalizacji } from '../../../../src/components/mieszanki/MapaLokalizacji';
import { KontaktyWytworni } from '../../../../src/components/mieszanki/KontaktyWytworni';
import { lightTheme, darkTheme } from '../../../../src/constants/theme';
import { wstecz } from '../../../../src/budzet/nawigacja';
import { useRouteId } from '../../../../src/hooks/useRouteId';
import { useMieszankiStore } from '../../../../src/stores/mieszankiStore';
import { useWytwornieStore } from '../../../../src/stores/wytwornieStore';
import { cenaReceptyNaDzien, receptyWytworni } from '../../../../src/mieszanki/recepty';
import { czyKrotkiLinkMaps } from '../../../../src/utils/mapaLokalizacji';
import { adresZLinkuMaps } from '../../../../src/utils/rozwinLinkMaps';
import { formatLiczby } from '../../../../src/utils/calculations';
import { dzisIso } from '../../../../src/utils/zakresDat';
import { potwierdzAkcje } from '../../../../src/utils/dialog';

type ZakladkaWytworni = 'info' | 'recepty';

export default function KartaWytworniScreen() {
  const id = useRouteId();
  const { zakladka: startowa } = useLocalSearchParams<{ zakladka?: string }>();
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const [zakladka, setZakladka] = useState<ZakladkaWytworni>(startowa === 'recepty' ? 'recepty' : 'info');
  const wytwornia = useWytwornieStore((s) => s.wytwornie.find((w) => w.id === id));
  const edytujWytwornie = useWytwornieStore((s) => s.edytujWytwornie);
  const usunWytwornie = useWytwornieStore((s) => s.usunWytwornie);
  const mieszanki = useMieszankiStore((s) => s.mieszanki);
  const edytujMieszanke = useMieszankiStore((s) => s.edytujMieszanke);
  const recepty = id ? receptyWytworni(mieszanki, id) : [];
  const dzis = dzisIso();

  const link = wytwornia?.linkGoogleMaps;
  const adres = wytwornia?.adresMapy;
  useEffect(() => {
    if (!id || !link || adres || Platform.OS === 'web') return;
    let aktualne = true;
    adresZLinkuMaps(link).then((wynik) => {
      if (aktualne && wynik) void edytujWytwornie(id, { adresMapy: wynik });
    });
    return () => { aktualne = false; };
  }, [id, link, adres, edytujWytwornie]);

  const usun = () => {
    if (!wytwornia) return;
    potwierdzAkcje(
      'Usuń wytwórnię',
      `Usunąć „${wytwornia.nazwa}”?${recepty.length > 0 ? ` ${recepty.length} recept trafi do „Bez wytwórni”.` : ''}`,
      async () => {
        for (const m of recepty) await edytujMieszanke(m.id, { wytworniaId: undefined, wytwórnia: undefined });
        await usunWytwornie(wytwornia.id);
        router.replace('/mieszanki' as never);
      },
    );
  };

  return (
    <View style={[styles.ekran, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        tytul={wytwornia?.nazwa ?? 'Wytwórnia'}
        podtytul={`Recept: ${recepty.length}`}
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/mieszanki') }}
        prawy={wytwornia ? { tekst: 'Edytuj', onPress: () => router.push(`/mieszanki/wytwornia/${wytwornia.id}/edytuj` as never) } : undefined}
      />
      {!wytwornia ? (
        <Text style={[styles.brak, { color: theme.colors.textSecondary }]}>Nie znaleziono wytwórni.</Text>
      ) : (
        <ScrollView contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 24 }]}>
          <Zakladki<ZakladkaWytworni>
            theme={theme}
            aktywna={zakladka}
            onZmien={setZakladka}
            zakladki={[['info', 'Info'], ['recepty', `Recepty · ${recepty.length}`]]}
          />
          {zakladka === 'info' ? (
            <>
              <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={styles.wiersz}>
                  <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Nazwa</Text>
                  <Text style={[styles.wartosc, { color: theme.colors.text }]}>{wytwornia.nazwa}</Text>
                </View>
                <View style={styles.wiersz}>
                  <Text style={[styles.etykieta, { color: theme.colors.textSecondary }]}>Lokalizacja</Text>
                  <Text style={[styles.wartosc, { color: theme.colors.text }]} numberOfLines={2}>{adres || (link ? 'z linku Google Maps' : '—')}</Text>
                </View>
                {link && !adres && Platform.OS === 'web' && czyKrotkiLinkMaps(link) ? (
                  <TouchableOpacity onPress={() => router.push(`/mieszanki/wytwornia/${wytwornia.id}/edytuj` as never)}>
                    <Text style={{ color: theme.colors.warning, fontWeight: '700' }}>
                      Podgląd mapy wymaga adresu – w przeglądarce skróconego linku nie da się odczytać. Uzupełnij adres ›
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <MapaLokalizacji theme={theme} adres={adres} link={link} />
                {!link && !adres ? (
                  <TouchableOpacity onPress={() => router.push(`/mieszanki/wytwornia/${wytwornia.id}/edytuj` as never)}>
                    <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>+ Dodaj lokalizację</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <KontaktyWytworni
                  theme={theme}
                  nazwaWytworni={wytwornia.nazwa}
                  kontakty={wytwornia.kontakty ?? []}
                  onZmien={(kontakty) => edytujWytwornie(wytwornia.id, { kontakty })}
                />
              </View>
              <TouchableOpacity accessibilityLabel="Usuń wytwórnię" onPress={usun} style={styles.usun}>
                <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>Usuń wytwórnię</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={[styles.karta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <TouchableOpacity
                accessibilityLabel="Dodaj receptę"
                onPress={() => router.push(`/mieszanki/recepta/nowa?wytwornia=${wytwornia.id}` as never)}
                style={[styles.dodaj, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={styles.dodajTekst}>Dodaj receptę</Text>
              </TouchableOpacity>
              {recepty.length === 0 ? (
                <Text style={{ color: theme.colors.textSecondary }}>Brak recept w tej wytwórni.</Text>
              ) : recepty.map((r) => {
                const cena = cenaReceptyNaDzien(r, dzis);
                return (
                  <TouchableOpacity
                    key={r.id}
                    accessibilityLabel={`Recepta ${r.rodzaj}`}
                    onPress={() => router.push(`/mieszanki/recepta/${r.id}` as never)}
                    style={[styles.recepta, { borderColor: theme.colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rodzaj, { color: theme.colors.text }]}>{r.rodzaj}{r.nrRecepty ? ` · ${r.nrRecepty}` : ''}</Text>
                      <Text style={{ color: theme.colors.textSecondary }}>ρ = {r.ciezarObjetosciowy.toFixed(3)} t/m³</Text>
                    </View>
                    <Text style={[styles.cena, { color: cena ? theme.colors.text : theme.colors.textSecondary }]}>
                      {cena ? `${formatLiczby(cena)} zł/t` : 'bez ceny'}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 20 }}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1 },
  brak: { padding: 24, fontSize: 16 },
  tresc: { padding: 14, gap: 12 },
  karta: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  wiersz: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  etykieta: { fontSize: 14 },
  wartosc: { fontSize: 15, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  usun: { alignItems: 'center', paddingVertical: 8 },
  dodaj: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  dodajTekst: { color: '#1A1A1A', fontWeight: '800' },
  recepta: { borderTopWidth: 1, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rodzaj: { fontSize: 16, fontWeight: '800' },
  cena: { fontSize: 15, fontWeight: '800' },
});
