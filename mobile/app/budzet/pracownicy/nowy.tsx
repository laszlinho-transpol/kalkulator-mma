import React from 'react';
import { useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { FormularzPracownika } from '../../../src/components/budzet/FormularzPracownika';
import { lightTheme, darkTheme } from '../../../src/constants/theme';
import { useGrupyPracownikowStore } from '../../../src/stores/grupyPracownikowStore';
import { usePracownicyStore } from '../../../src/stores/pracownicyStore';

export default function NowyPracownikScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const znajdzLubDodaj = useGrupyPracownikowStore((s) => s.znajdzLubDodaj);
  const dodaj = usePracownicyStore((s) => s.dodaj);

  return (
    <FormularzPracownika
      theme={theme}
      tytul="Nowy pracownik"
      wsteczDo="/budzet/pracownicy"
      onZapisz={async (dane) => {
        const grupaId = await znajdzLubDodaj(dane.grupaNazwa);
        const id = await dodaj({ nazwisko: dane.nazwisko, imie: dane.imie, telefon: dane.telefon, grupaId, stawki: dane.stawki });
        router.replace(`/budzet/pracownicy/${id}` as never);
      }}
    />
  );
}
