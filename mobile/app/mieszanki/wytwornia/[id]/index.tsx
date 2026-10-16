import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../../../src/components/common/AppHeader';
import { Zakladki } from '../../../../src/components/budzet/Zakladki';
import { Karta, PozycjaListy, Przycisk, PrzyciskIkony, Sekcja, WierszDanych } from '../../../../src/components/ui';
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

type ZakladkaWytworni = 'info' | 'mieszanki';

export default function KartaWytworniScreen() {
  const id = useRouteId();
  const { zakladka: startowa } = useLocalSearchParams<{ zakladka?: string }>();
  const theme = useColorScheme() === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const [zakladka, setZakladka] = useState<ZakladkaWytworni>(startowa === 'mieszanki' || startowa === 'recepty' ? 'mieszanki' : 'info');
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

  const edytuj = () => { if (id) router.push(`/mieszanki/wytwornia/${id}/edytuj` as never); };

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
        podtytul={`Mieszanek: ${recepty.length}`}
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/mieszanki') }}
        prawy={wytwornia ? { tekst: 'Edytuj', onPress: edytuj } : undefined}
      />
      {!wytwornia ? (
        <Text style={[styles.brak, { color: theme.colors.textSecondary }]}>Nie znaleziono wytwórni.</Text>
      ) : (
        <ScrollView contentContainerStyle={[styles.tresc, { paddingBottom: insets.bottom + 24 }]}>
          <Zakladki<ZakladkaWytworni>
            theme={theme}
            aktywna={zakladka}
            onZmien={setZakladka}
            zakladki={[['info', 'Info'], ['mieszanki', `Mieszanki · ${recepty.length}`]]}
          />
          {zakladka === 'info' ? (
            <>
              <Sekcja tytul="Wytwórnia" prawy={<Przycisk maly wariant="tekst" ikona="edytuj" tekst="Edytuj" onPress={edytuj} />}>
                <WierszDanych etykieta="Nazwa" wartosc={wytwornia.nazwa} />
                <WierszDanych etykieta="Lokalizacja" wartosc={adres || (link ? 'z linku Google Maps' : '—')} />
                {link && !adres && Platform.OS === 'web' && czyKrotkiLinkMaps(link) ? (
                  <Przycisk
                    maly
                    wariant="tekst"
                    tekst="Uzupełnij adres, aby zobaczyć mapę"
                    accessibilityLabel="Uzupełnij adres mapy"
                    onPress={edytuj}
                  />
                ) : null}
                <MapaLokalizacji theme={theme} adres={adres} link={link} />
                {!link && !adres ? <Przycisk maly wariant="drugi" ikona="mapa" tekst="Dodaj lokalizację" onPress={edytuj} /> : null}
              </Sekcja>
              <Karta>
                <KontaktyWytworni
                  theme={theme}
                  nazwaWytworni={wytwornia.nazwa}
                  kontakty={wytwornia.kontakty ?? []}
                  onZmien={(kontakty) => edytujWytwornie(wytwornia.id, { kontakty })}
                />
              </Karta>
              <Przycisk wariant="niebezpieczny" ikona="usun" tekst="Usuń wytwórnię" onPress={usun} />
            </>
          ) : (
            <Sekcja
              tytul="Mieszanki wytwórni"
              info="Recepty tej wytwórni wybierasz potem w planach dnia i obmiarach. Cena z karty recepty liczy się w Budżecie."
              prawy={(
                <PrzyciskIkony
                  ikona="plus"
                  accessibilityLabel="Dodaj receptę"
                  kolor="#1A1A1A"
                  tlo={theme.colors.primary}
                  onPress={() => router.push(`/mieszanki/recepta/nowa?wytwornia=${wytwornia.id}` as never)}
                />
              )}
            >
              {recepty.length === 0 ? (
                <Text style={{ color: theme.colors.textSecondary }}>Brak mieszanek. Dodaj pierwszą plusem.</Text>
              ) : recepty.map((r) => {
                const cena = cenaReceptyNaDzien(r, dzis);
                return (
                  <PozycjaListy
                    key={r.id}
                    plaska
                    tytul={`${r.rodzaj}${r.nrRecepty ? ` · ${r.nrRecepty}` : ''}`}
                    podtytul={`ρ = ${r.ciezarObjetosciowy.toFixed(3)} t/m³`}
                    prawy={cena ? `${formatLiczby(cena)} zł/t` : 'bez ceny'}
                    accessibilityLabel={`Recepta ${r.rodzaj}`}
                    onPress={() => router.push(`/mieszanki/recepta/${r.id}` as never)}
                  />
                );
              })}
            </Sekcja>
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
});
