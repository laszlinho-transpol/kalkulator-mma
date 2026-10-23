import React from 'react';
import { router } from 'expo-router';
import { ListaRysunkow } from '../../../src/components/geodezja/ListaRysunkow';
import { useGeodezjaStore } from '../../../src/stores/geodezjaStore';
import { nowySzkicGeodezyjny, warstwySzkicu } from '../../../src/geodezja/szkic';
import { WycinekPola, WycinekPrzycisku, WycinekWiersz, WycinekZakladek, type SlajdZasady } from '../../../src/components/ui';
import { RysSzkicCel, RysSzkicLinia, RysSzkicPunkty } from '../../../src/components/geodezja/ZasadyGeodezji';

const SLAJDY: SlajdZasady[] = [
  {
    tytul: 'Nowy szkic',
    rysunek: (
      <>
        <WycinekZakladek zakladki={['Aktywne', 'Archiwum']} />
        <WycinekPrzycisku tekst="Nowy szkic" plus />
      </>
    ),
    opis: 'Szkic to rzut z góry na kartce w kratkę: punkty z odczytami łaty, połączenia z odległością i spadkiem. Stuknij **Nowy szkic**, a otworzy się pusta kartka. Gotowe szkice są na liście, stare przenieś do **Archiwum**.',
  },
  {
    tytul: 'Dodaj punkty',
    rysunek: (
      <>
        <RysSzkicPunkty />
        <WycinekWiersz>
          <WycinekPola etykieta="Odczyt" wartosc="1520" jednostka="mm" aktywne />
          <WycinekPola etykieta="Rzędna" wartosc="" jednostka="m" />
        </WycinekWiersz>
      </>
    ),
    opis: 'W trybie **Punkty** stuknij kartkę tam, gdzie stała łata – powstanie punkt i otworzy się okienko. Wpisz **odczyt z łaty w mm** (albo rzędną) klawiaturą liczbową. Punkt przesuwasz palcem, dwoma palcami przybliżasz kartkę.',
  },
  {
    tytul: 'Połącz punkty',
    rysunek: <RysSzkicLinia />,
    opis: 'Rozwiń **Analiza → Połącz punkty** i stukaj kolejne punkty. Nad linią jest odległość, pod nią spadek w nawiasie ze strzałką kierunku. Stuknij linię, żeby wpisać odległość zmierzoną taśmą.',
  },
  {
    tytul: 'Ustaw cel spadku',
    rysunek: <RysSzkicCel />,
    opis: 'Stuknij linię, w polu **Cel** wpisz spadek (np. 2%) i wybierz, który punkt **zostaje z łaty**. Przy drugim punkcie pojawi się **docelowy odczyt** i **Δh** – ile trzeba podnieść lub obniżyć.',
  },
  {
    tytul: 'Warstwy, PDF i SVG',
    rysunek: <WycinekZakladek zakladki={['Punkty', 'Analiza ▾', 'Filtr ▾', '# ▾']} />,
    opis: 'Punktom nadaj **warstwę** (np. lewa krawędź) i ukrywaj je w **Filtrze**; **#** ustawia siatkę. Ikona udostępniania w nagłówku tworzy **PDF**, a **Edytuj** – nazwę, opis i zapis **SVG**.',
  },
];

export default function SzkiceGeodezyjneScreen() {
  const szkice = useGeodezjaStore((s) => s.szkice);
  const zapiszSzkic = useGeodezjaStore((s) => s.zapiszSzkic);

  const nowy = async () => {
    const s = nowySzkicGeodezyjny(`Szkic ${szkice.length + 1}`);
    await zapiszSzkic(s);
    router.push(`/niezbednik/geodezja/szkic/${s.id}` as never);
  };

  return (
    <ListaRysunkow
      tytul="Szkice geodezyjne"
      zasada={{ klucz: 'geodezja/szkice', slajdy: SLAJDY }}
      tekstNowy="Nowy szkic"
      pusteTytul="Brak szkiców"
      onNowy={nowy}
      onOtworz={(id) => router.push(`/niezbednik/geodezja/szkic/${id}` as never)}
      pozycje={szkice.map((s) => {
        const warstwy = warstwySzkicu(s).length;
        return {
          id: s.id,
          nazwa: s.nazwa,
          opis: s.opis,
          archiwum: s.archiwum,
          updatedAt: s.updatedAt,
          podsumowanie: [`Punkty: ${s.punkty.length}`, `Połączenia: ${s.linie.length}`, warstwy ? `Warstwy: ${warstwy}` : null]
            .filter(Boolean).join(' · '),
        };
      })}
    />
  );
}
