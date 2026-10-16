import React from 'react';
import { Text, View } from 'react-native';
import { Sekcja, SiatkaDanych, WierszDanych, useMotyw, ODSTEP, TYPOGRAFIA } from '../ui';
import { formatujKmM } from '../../utils/projektBudowy';
import { formatLiczby } from '../../utils/calculations';
import { nazwaIlosci, przerobRaportu, sumaPrzerobu } from '../../raportyBudowy/raporty';
import type { RaportDzienny } from '../../raportyBudowy/typy';

/** Odchyłka grubości większa niż 10% projektu – na kolor ostrzeżenia. */
const PROG_ODCHYLKI = 0.1;

const tytulWiersza = (warstwa: string, recepta?: string) => {
  if (!recepta) return warstwa;
  return recepta.toLowerCase().startsWith(warstwa.toLowerCase()) ? recepta : `${warstwa} · ${recepta}`;
};

export function ZakladkaPrzerob({ raport }: { raport: RaportDzienny }) {
  const theme = useMotyw();
  const wiersze = przerobRaportu(raport);
  const suma = sumaPrzerobu(wiersze);
  const odcinki = raport.pozycje.reduce((s, p) => s + p.odcinki.length, 0);

  return (
    <View style={{ gap: ODSTEP.m }}>
      <Sekcja tytul="Przerób dnia" info="Suma wszystkich warstw z raportu. Grubość = ilość ÷ (powierzchnia × ciężar objętościowy recepty).">
        <SiatkaDanych
          pozycje={[
            { etykieta: 'Ilość łącznie', wartosc: `${formatLiczby(suma.ilosc)} t` },
            { etykieta: 'Powierzchnia', wartosc: `${formatLiczby(suma.powierzchniaM2)} m²` },
            { etykieta: 'Warstwy / recepty', wartosc: String(wiersze.length) },
            { etykieta: 'Odcinki', wartosc: String(odcinki) },
          ]}
        />
      </Sekcja>

      {wiersze.map((w) => {
        const odchylka = w.gruboscCm != null ? w.gruboscCm - w.gruboscProjCm : undefined;
        const duza = odchylka != null && w.gruboscProjCm > 0 && Math.abs(odchylka) / w.gruboscProjCm > PROG_ODCHYLKI;
        return (
          <Sekcja key={w.klucz} tytul={tytulWiersza(w.warstwaNazwa, w.mieszankaNazwa)}>
            <SiatkaDanych
              pozycje={[
                { etykieta: nazwaIlosci(w.kategoria), wartosc: `${formatLiczby(w.ilosc)} t` },
                { etykieta: 'Powierzchnia', wartosc: `${formatLiczby(w.powierzchniaM2)} m²` },
                { etykieta: 'Długość odcinków', wartosc: `${formatLiczby(w.dlugoscM)} m` },
                {
                  etykieta: 'Grubość wyszła',
                  wartosc: w.gruboscCm != null ? `${formatLiczby(w.gruboscCm)} cm` : '—',
                  dopisek: odchylka != null
                    ? `proj. ${formatLiczby(w.gruboscProjCm, 1)} cm (${odchylka >= 0 ? '+' : ''}${formatLiczby(odchylka)})`
                    : `proj. ${formatLiczby(w.gruboscProjCm, 1)} cm`,
                  kolor: odchylka == null ? undefined : duza ? theme.colors.warning : theme.colors.success,
                },
              ]}
            />
          </Sekcja>
        );
      })}

      <Sekcja tytul="Odcinki">
        {raport.pozycje.flatMap((p) => p.odcinki.map((o) => (
          <View key={`${p.id}-${o.id}`} style={{ gap: 2 }}>
            <Text style={[TYPOGRAFIA.wartosc, { color: theme.colors.text }]} numberOfLines={2}>{p.warstwaNazwa} · {o.nazwa}</Text>
            <WierszDanych
              etykieta={`${formatujKmM(Math.min(o.kmOdM, o.kmDoM))} – ${formatujKmM(Math.max(o.kmOdM, o.kmDoM))}`}
              wartosc={`${formatLiczby(o.powierzchniaM2)} m²`}
            />
          </View>
        )))}
      </Sekcja>

      {raport.uwagi ? (
        <Sekcja tytul="Uwagi">
          <Text style={[TYPOGRAFIA.opis, { color: theme.colors.text }]}>{raport.uwagi}</Text>
        </Sekcja>
      ) : null}
    </View>
  );
}
