import React from 'react';
import { Text, View } from 'react-native';
import { Przycisk, Sekcja, SiatkaDanych, useMotyw, ODSTEP, TYPOGRAFIA } from '../ui';
import { dataKrotko, etykietaSprzetu } from '../../budzet/wyswietlanie';
import { nazwaPracownika } from '../../budzet/pracownicy';
import { rodzajPoId } from '../../budzet/rodzajeSprzetu';
import { formatLiczby } from '../../utils/calculations';
import { robociznaDnia } from '../../raportyBudowy/raporty';
import { usePracownicyStore } from '../../stores/pracownicyStore';
import { useSprzetStore } from '../../stores/sprzetStore';
import type { RaportDzienny } from '../../raportyBudowy/typy';
import { WierszWyboru } from './wspolne';

export function ZakladkaRobocizna({ raport, onZmien }: {
  raport: RaportDzienny;
  onZmien: (zmiany: Partial<RaportDzienny>) => void;
}) {
  const theme = useMotyw();
  const pracownicy = usePracownicyStore((s) => s.pracownicy);
  const raportyPracownikow = usePracownicyStore((s) => s.raporty);
  const sprzet = useSprzetStore((s) => s.sprzet);
  const raportySprzetu = useSprzetStore((s) => s.raporty);
  const r = robociznaDnia(raport, raportyPracownikow, raportySprzetu);

  const przelacz = (pole: 'zatwierdzonePracownicy' | 'zatwierdzonySprzet', id: string) => {
    const lista = raport[pole];
    onZmien({ [pole]: lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id] });
  };
  const wszystkie = (pole: 'zatwierdzonePracownicy' | 'zatwierdzonySprzet', ids: string[]) => {
    const komplet = ids.every((id) => raport[pole].includes(id));
    onZmien({ [pole]: komplet ? raport[pole].filter((x) => !ids.includes(x)) : [...new Set([...raport[pole], ...ids])] });
  };

  const imie = (id: string) => {
    const p = pracownicy.find((x) => x.id === id);
    return p ? nazwaPracownika(p) : 'Pracownik usunięty';
  };
  const brak = (co: string) => (
    <Text style={[TYPOGRAFIA.opis, { color: theme.colors.textSecondary }]}>
      Brak raportów {co} z dnia {dataKrotko(raport.data)} na tej budowie. Dodaj je w Budżecie – pojawią się tutaj.
    </Text>
  );

  return (
    <View style={{ gap: ODSTEP.m }}>
      <Sekcja
        tytul="Pracownicy"
        info="Raporty pracowników z tego dnia przypisane do budowy. Zaznacz te, które potwierdzasz – tylko one wchodzą do kwoty dnia."
        prawy={r.pracownicy.length > 1 ? (
          <Przycisk tekst="Wszystkie" wariant="tekst" maly onPress={() => wszystkie('zatwierdzonePracownicy', r.pracownicy.map((x) => x.id))} accessibilityLabel="Zaznacz wszystkich pracowników" />
        ) : undefined}
      >
        {r.pracownicy.length === 0 ? brak('pracowników') : r.pracownicy.map((p) => (
          <WierszWyboru
            key={p.id}
            zaznaczony={raport.zatwierdzonePracownicy.includes(p.id)}
            tytul={imie(p.pracownikId)}
            opis={`${formatLiczby(p.godziny, p.godziny % 1 ? 1 : 0)} h${p.nadgodziny ? ` (w tym ${formatLiczby(p.nadgodziny, 1)} nadg.)` : ''}${p.uwagi ? ` · ${p.uwagi}` : ''}`}
            prawy={`${formatLiczby(p.kwota)} zł`}
            accessibilityLabel={`Zatwierdź ${imie(p.pracownikId)}`}
            onPress={() => przelacz('zatwierdzonePracownicy', p.id)}
          />
        ))}
      </Sekcja>

      <Sekcja
        tytul="Sprzęt"
        info="Raporty sprzętu z tego dnia przypisane do budowy. Zaznacz te, które potwierdzasz."
        prawy={r.sprzet.length > 1 ? (
          <Przycisk tekst="Wszystkie" wariant="tekst" maly onPress={() => wszystkie('zatwierdzonySprzet', r.sprzet.map((x) => x.id))} accessibilityLabel="Zaznacz cały sprzęt" />
        ) : undefined}
      >
        {r.sprzet.length === 0 ? brak('sprzętu') : r.sprzet.map((s) => {
          const maszyna = sprzet.find((x) => x.id === s.sprzetId);
          const nazwa = maszyna ? `${rodzajPoId(maszyna.rodzajId)?.nazwa ?? 'Sprzęt'} ${etykietaSprzetu(maszyna.numer)}` : 'Sprzęt usunięty';
          return (
            <WierszWyboru
              key={s.id}
              zaznaczony={raport.zatwierdzonySprzet.includes(s.id)}
              tytul={nazwa}
              opis={`${s.pracownikId ? `Operator: ${imie(s.pracownikId)}` : 'Bez pracownika'}${s.uwagi ? ` · ${s.uwagi}` : ''}`}
              prawy={`${formatLiczby(s.kwota)} zł`}
              accessibilityLabel={`Zatwierdź ${nazwa}`}
              onPress={() => przelacz('zatwierdzonySprzet', s.id)}
            />
          );
        })}
      </Sekcja>

      <Sekcja tytul="Kwota robocizny">
        <SiatkaDanych
          pozycje={[
            { etykieta: 'Pracownicy', wartosc: `${formatLiczby(r.kwotaPracownikow)} zł`, dopisek: `${raport.zatwierdzonePracownicy.filter((id) => r.pracownicy.some((p) => p.id === id)).length} z ${r.pracownicy.length}` },
            { etykieta: 'Sprzęt', wartosc: `${formatLiczby(r.kwotaSprzetu)} zł`, dopisek: `${raport.zatwierdzonySprzet.filter((id) => r.sprzet.some((p) => p.id === id)).length} z ${r.sprzet.length}` },
          ]}
        />
        <Text accessibilityLabel="Kwota robocizny" style={[TYPOGRAFIA.duza, { color: theme.colors.text, textAlign: 'right' }]}>
          Razem {formatLiczby(r.kwotaPracownikow + r.kwotaSprzetu)} zł
        </Text>
      </Sekcja>
    </View>
  );
}
