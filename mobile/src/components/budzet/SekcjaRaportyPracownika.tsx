// Zakładka „Raporty” na karcie pracownika: lata → miesiące, kalendarz z brakującymi dniami i bank R8.

import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { PozycjaListy, Przycisk, Sekcja, SiatkaDanych, SiatkaKalendarza, isoZDaty, useMotyw, ODSTEP, TYPOGRAFIA } from '../ui';
import { liczbaRaportow } from '../budowa/SekcjaRaporty';
import { etykietaMiesiaca } from '../../raportyBudowy/raporty';
import { bankR8, czyBrakRaportu, lataRaportow, podsumowanieMiesiaca } from '../../budzet/nieobecnosci';
import type { Pracownik, RaportPracownika } from '../../budzet/typy';
import { formatLiczby } from '../../utils/calculations';

export function SekcjaRaportyPracownika({ pracownik, raporty }: { pracownik: Pracownik; raporty: RaportPracownika[] }) {
  const theme = useMotyw();
  const dzis = isoZDaty(new Date());
  const [rok, setRok] = useState(Number(dzis.slice(0, 4)));
  const [miesiac, setMiesiac] = useState(Number(dzis.slice(5, 7)) - 1);

  const lata = useMemo(() => lataRaportow(raporty), [raporty]);
  const poDniu = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const r of [...raporty].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      if (!mapa.has(r.data)) mapa.set(r.data, r.id);
    }
    return mapa;
  }, [raporty]);
  const zRaportem = useMemo(() => new Set(poDniu.keys()), [poDniu]);
  const start = useMemo(
    () => raporty.reduce((min, r) => (r.data < min ? r.data : min), pracownik.createdAt.slice(0, 10)),
    [raporty, pracownik.createdAt],
  );
  const bank = useMemo(() => bankR8(pracownik, raporty), [pracownik, raporty]);
  const brakiMiesiaca = useMemo(() => {
    const mm = `${rok}-${String(miesiac + 1).padStart(2, '0')}`;
    const dni = new Date(rok, miesiac + 1, 0).getDate();
    let n = 0;
    for (let d = 1; d <= dni; d += 1) {
      if (czyBrakRaportu(`${mm}-${String(d).padStart(2, '0')}`, dzis, start, zRaportem)) n += 1;
    }
    return n;
  }, [rok, miesiac, dzis, start, zRaportem]);

  const nowy = (data?: string) => {
    router.push({ pathname: '/budzet/pracownicy/[id]/raport', params: { id: pracownik.id, ...(data ? { data } : {}) } } as never);
  };

  const opisMiesiaca = (klucz: string, liczba: number) => {
    const p = podsumowanieMiesiaca(pracownik, raporty, klucz);
    const dni = [
      p.dniUW ? `UW ${p.dniUW}` : '',
      p.dniL4 ? `L4 ${p.dniL4}` : '',
      p.dniR8 ? `R8 ${p.dniR8}` : '',
      p.dniUB ? `UB ${p.dniUB}` : '',
      p.dniNB ? `NB ${p.dniNB}` : '',
    ].filter(Boolean).join(' · ');
    return { podtytul: `${liczbaRaportow(liczba)} · ${formatLiczby(p.godzinyPracy)} h${dni ? ` · ${dni}` : ''}`, wyplata: `${formatLiczby(p.wyplata)} zł` };
  };

  return (
    <View style={{ gap: ODSTEP.m }}>
      <Sekcja tytul="Raporty" info="Raporty pracownika pogrupowane w lata i miesiące, od najnowszego. Miesiąc pokazuje godziny, nieobecności, wypłatę i koszty z podziałem na budowy.">
        <Przycisk tekst="Dodaj raport" ikona="plus" onPress={() => nowy()} />
        {lata.length === 0 ? (
          <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>
            Brak raportów. Dodaj pierwszy raport – dzień pracy albo UW, L4, R8, UB, NB.
          </Text>
        ) : lata.map((r) => (
          <View key={r.rok} style={{ gap: ODSTEP.s }}>
            <Text accessibilityRole="header" style={[TYPOGRAFIA.sekcja, { color: theme.colors.textSecondary, marginTop: ODSTEP.s }]}>{r.rok}</Text>
            {r.miesiace.map((m) => {
              const opis = opisMiesiaca(m.miesiac, m.liczba);
              return (
                <PozycjaListy
                  key={m.miesiac}
                  plaska
                  ikona="📅"
                  tytul={etykietaMiesiaca(m.miesiac)}
                  podtytul={opis.podtytul}
                  prawy={opis.wyplata}
                  accessibilityLabel={`Miesiąc ${etykietaMiesiaca(m.miesiac)}`}
                  onPress={() => router.push({ pathname: '/budzet/pracownicy/[id]/miesiac', params: { id: pracownik.id, miesiac: m.miesiac } } as never)}
                />
              );
            })}
          </View>
        ))}
      </Sekcja>

      <Sekcja
        tytul="Kalendarz raportów"
        info="Zielony dzień ma raport – dotknij, żeby go otworzyć. Czerwony to dzień roboczy (pn–pt) bez raportu – uzupełnij go. Pusty dzień zaczyna nowy raport z tą datą."
      >
        <SiatkaKalendarza
          rok={rok}
          miesiac={miesiac}
          onZmienMiesiac={(r, m) => { setRok(r); setMiesiac(m); }}
          stanDnia={(iso) => ({ oznaczony: zRaportem.has(iso), brak: czyBrakRaportu(iso, dzis, start, zRaportem) })}
          legendaOznaczonych="raport"
          legendaBraku="brak raportu"
          onWybierz={(iso) => {
            const id = poDniu.get(iso);
            if (id) router.push({ pathname: '/budzet/pracownicy/[id]/raport', params: { id: pracownik.id, raportId: id } } as never);
            else nowy(iso);
          }}
        />
        {brakiMiesiaca > 0 ? (
          <Text style={[TYPOGRAFIA.opis, { color: theme.colors.danger, fontWeight: '700' }]}>
            Brakuje raportów: {brakiMiesiaca} {brakiMiesiaca === 1 ? 'dzień roboczy' : 'dni robocze'} – uzupełnij czerwone dni.
          </Text>
        ) : null}
      </Sekcja>

      <Sekcja tytul="R8 – nadgodziny na zimę" info="Godziny odłożone w miesiącach (zaznaczasz je w podsumowaniu miesiąca) minus 8 h za każdy odebrany dzień R8.">
        <SiatkaDanych
          pozycje={[
            { etykieta: 'Odłożone', wartosc: `${formatLiczby(bank.odlozone)} h` },
            { etykieta: 'Odebrane (R8)', wartosc: `${formatLiczby(bank.wykorzystane)} h` },
            {
              etykieta: 'Do odebrania',
              wartosc: `${formatLiczby(bank.saldo)} h`,
              dopisek: bank.saldo > 0 ? `${formatLiczby(bank.saldo / 8)} dni R8` : undefined,
              kolor: bank.saldo < 0 ? theme.colors.danger : undefined,
            },
          ]}
        />
      </Sekcja>
    </View>
  );
}
