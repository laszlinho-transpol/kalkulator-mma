import React from 'react';
import { Text, useColorScheme, View } from 'react-native';
import { router } from 'expo-router';
import { FormularzPracownika } from '../../../../src/components/budzet/FormularzPracownika';
import { lightTheme, darkTheme } from '../../../../src/constants/theme';
import { wstecz } from '../../../../src/budzet/nawigacja';
import { useRouteId } from '../../../../src/hooks/useRouteId';
import { useGrupyPracownikowStore } from '../../../../src/stores/grupyPracownikowStore';
import { usePracownicyStore } from '../../../../src/stores/pracownicyStore';

export default function EdytujPracownikaScreen() {
  const id = useRouteId();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const pracownik = usePracownicyStore((s) => s.pracownicy.find((p) => p.id === id));
  const aktualizuj = usePracownicyStore((s) => s.aktualizuj);
  const grupy = useGrupyPracownikowStore((s) => s.grupy);
  const znajdzLubDodaj = useGrupyPracownikowStore((s) => s.znajdzLubDodaj);

  if (!pracownik) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 24 }}>
        <Text style={{ color: theme.colors.textSecondary }} onPress={() => wstecz('/budzet/pracownicy')}>
          Nie znaleziono pracownika.
        </Text>
      </View>
    );
  }

  return (
    <FormularzPracownika
      theme={theme}
      tytul="Edytuj pracownika"
      wsteczDo={`/budzet/pracownicy/${pracownik.id}`}
      poczatek={{
        nazwisko: pracownik.nazwisko,
        imie: pracownik.imie,
        telefon: pracownik.telefon,
        grupa: grupy.find((g) => g.id === pracownik.grupaId)?.nazwa,
        stawki: pracownik.stawki,
      }}
      onZapisz={async (dane) => {
        const grupaId = await znajdzLubDodaj(dane.grupaNazwa);
        await aktualizuj(pracownik.id, { nazwisko: dane.nazwisko, imie: dane.imie, telefon: dane.telefon, grupaId, stawki: dane.stawki });
        router.replace(`/budzet/pracownicy/${pracownik.id}` as never);
      }}
    />
  );
}
