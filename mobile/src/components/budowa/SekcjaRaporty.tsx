// Zakładka „Raporty” na stronie budowy: dodawanie, miesiące z raportami, kalendarz i statystyki.

import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { PozycjaListy, Przycisk, Sekcja, SiatkaDanych, SiatkaKalendarza, isoZDaty, useMotyw, ODSTEP, TYPOGRAFIA } from '../ui';
import { dataKrotko } from '../../budzet/wyswietlanie';
import { liczbaRaportow, miesiaceRaportow, statystykiRaportow } from '../../raportyBudowy/raporty';
import { useRaportyBudowyStore } from '../../stores/raportyBudowyStore';

const dniWZakresie = (od: string, doDnia: string) =>
  Math.round((Date.UTC(+doDnia.slice(0, 4), +doDnia.slice(5, 7) - 1, +doDnia.slice(8, 10))
    - Date.UTC(+od.slice(0, 4), +od.slice(5, 7) - 1, +od.slice(8, 10))) / 86400000) + 1;

export { liczbaRaportow };

export function SekcjaRaporty({ budowaId }: { budowaId: string }) {
  const theme = useMotyw();
  const wszystkie = useRaportyBudowyStore((s) => s.raporty);
  const raporty = useMemo(() => wszystkie.filter((r) => r.budowaId === budowaId), [wszystkie, budowaId]);
  const miesiace = useMemo(() => miesiaceRaportow(raporty), [raporty]);
  const statystyki = useMemo(() => statystykiRaportow(raporty), [raporty]);
  const poDniu = useMemo(() => new Map(raporty.map((r) => [r.data, r.id])), [raporty]);

  const start = statystyki.do ?? isoZDaty(new Date());
  const [rok, setRok] = useState(Number(start.slice(0, 4)));
  const [miesiac, setMiesiac] = useState(Number(start.slice(5, 7)) - 1);

  useEffect(() => {
    if (!statystyki.do) return;
    setRok(Number(statystyki.do.slice(0, 4)));
    setMiesiac(Number(statystyki.do.slice(5, 7)) - 1);
  }, [statystyki.do]);

  const nowy = (data?: string) => {
    router.push({ pathname: '/raport-budowy/formularz', params: { budowaId, ...(data ? { data } : {}) } } as never);
  };

  return (
    <View style={{ gap: ODSTEP.m }}>
      <Sekcja tytul="Raporty" info="Raporty dzienne z budowy pogrupowane w miesiące, od najnowszego. Jeden raport na dzień.">
        <Przycisk tekst="Dodaj raport" ikona="plus" onPress={() => nowy()} />

        {miesiace.length === 0 ? (
          <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>
            Brak raportów. Dodaj pierwszy raport dzienny – pojawi się tu w swoim miesiącu.
          </Text>
        ) : (
          <View style={{ gap: ODSTEP.s }}>
            {miesiace.map((m) => (
              <PozycjaListy
                key={m.klucz}
                plaska
                ikona="📅"
                tytul={m.etykieta}
                podtytul={liczbaRaportow(m.liczba)}
                accessibilityLabel={`Miesiąc ${m.etykieta}`}
                onPress={() => router.push({ pathname: '/raport-budowy/miesiac', params: { budowaId, miesiac: m.klucz } } as never)}
              />
            ))}
          </View>
        )}
      </Sekcja>

      <Sekcja tytul="Kalendarz raportów" info="Zielony dzień ma raport – dotknij, żeby go otworzyć. Dotknięcie pustego dnia zaczyna nowy raport z tą datą.">
        <SiatkaKalendarza
          rok={rok}
          miesiac={miesiac}
          onZmienMiesiac={(r, m) => { setRok(r); setMiesiac(m); }}
          stanDnia={(iso) => ({ oznaczony: poDniu.has(iso) })}
          legendaOznaczonych="raport"
          onWybierz={(iso) => {
            const id = poDniu.get(iso);
            if (id) router.push(`/raport-budowy/${id}` as never);
            else nowy(iso);
          }}
        />
      </Sekcja>

      <Sekcja tytul="Statystyki" info="Liczba raportów tej budowy i zakres dat od pierwszego do ostatniego raportu.">
        <SiatkaDanych
          pozycje={[
            { etykieta: 'Raporty', wartosc: String(statystyki.liczba) },
            { etykieta: 'Dni w zakresie', wartosc: statystyki.od && statystyki.do ? String(dniWZakresie(statystyki.od, statystyki.do)) : '—' },
            { etykieta: 'Pierwszy', wartosc: statystyki.od ? dataKrotko(statystyki.od) : '—' },
            { etykieta: 'Ostatni', wartosc: statystyki.do ? dataKrotko(statystyki.do) : '—' },
          ]}
        />
      </Sekcja>
    </View>
  );
}
