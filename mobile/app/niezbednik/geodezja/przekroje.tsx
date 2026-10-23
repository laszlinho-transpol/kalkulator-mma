import React from 'react';
import { router } from 'expo-router';
import { ListaRysunkow } from '../../../src/components/geodezja/ListaRysunkow';
import { useGeodezjaStore } from '../../../src/stores/geodezjaStore';
import { nowyPrzekroj, szerokoscPrzekroju } from '../../../src/geodezja/przekroj';
import { fm } from '../../../src/geodezja/geometria';
import { WycinekPola, WycinekPrzycisku, WycinekWiersz, WycinekZakladek, type SlajdZasady } from '../../../src/components/ui';
import { RysPrzekrojElementy, RysPrzekrojPomiar } from '../../../src/components/geodezja/ZasadyGeodezji';

const SLAJDY: SlajdZasady[] = [
  {
    tytul: 'Szablon przekroju',
    rysunek: (
      <>
        <WycinekZakladek zakladki={['Aktywne', 'Archiwum']} />
        <WycinekPrzycisku tekst="Nowy przekrój" plus />
      </>
    ),
    opis: 'Przekrój poprzeczny to szablon konstrukcji drogi w poprzek: jezdnia z warstwami, krawężniki, korytka, chodnik. Stuknij **Nowy przekrój**, a otworzy się kreator. Szablon możesz potem **przypisać do budowy**.',
  },
  {
    tytul: 'Dodaj elementy od lewej',
    rysunek: (
      <>
        <RysPrzekrojElementy />
        <WycinekPrzycisku tekst="Dodaj element" plus />
      </>
    ),
    opis: 'W zakładce **Kreator** przyciskiem **Dodaj element** wybierasz z katalogu krawężnik, obrzeże, korytko, kostkę albo jezdnię – kolejno **od lewej do prawej**. Gdy element jest rozwinięty, nowy wstawia się za nim.',
  },
  {
    tytul: 'Ustaw wymiary elementu',
    rysunek: (
      <WycinekWiersz>
        <WycinekPola etykieta="Szerokość" wartosc="3,00" jednostka="m" aktywne />
        <WycinekPola etykieta="Spadek" wartosc="2" jednostka="%" />
      </WycinekWiersz>
    ),
    opis: 'Stuknij element na liście: wpisz **szerokość**, **grubość**, **spadek ← / →**, skok wysokości, **ławę** i **warstwy** konstrukcji. Strzałkami ◀ ▶ zmieniasz kolejność, rysunek u góry odświeża się od razu.',
  },
  {
    tytul: 'Pomiar łatą',
    rysunek: (
      <>
        <RysPrzekrojPomiar />
        <WycinekZakladek zakladki={['Kreator', 'Pomiar']} aktywna={1} />
      </>
    ),
    opis: 'W zakładce **Pomiar** stuknij trójkąt na rysunku albo wiersz i wpisz **odczyt z łaty** w tym miejscu. Pozostałe odczyty i rzędne przeliczą się z wysokości szablonu – wyżej położony punkt ma **mniejszy odczyt**.',
  },
  {
    tytul: 'Zapis i budowa',
    rysunek: <WycinekPrzycisku tekst="Zapisz jako SVG" drugi />,
    opis: '**Edytuj** w nagłówku przekroju: nazwa i opis, zapis **SVG**, **Przypisz do budowy** (kopia trafia do Konstrukcje › Szczegóły) i przeniesienie do archiwum.',
  },
];

export default function PrzekrojeScreen() {
  const przekroje = useGeodezjaStore((s) => s.przekroje);
  const zapiszPrzekroj = useGeodezjaStore((s) => s.zapiszPrzekroj);

  const nowy = async () => {
    const p = nowyPrzekroj(`Przekrój ${przekroje.length + 1}`);
    await zapiszPrzekroj(p);
    router.push(`/niezbednik/geodezja/przekroj/${p.id}` as never);
  };

  return (
    <ListaRysunkow
      tytul="Przekroje poprzeczne"
      zasada={{ klucz: 'geodezja/przekroje', slajdy: SLAJDY }}
      tekstNowy="Nowy przekrój"
      pusteTytul="Brak szablonów przekroju"
      onNowy={nowy}
      onOtworz={(id) => router.push(`/niezbednik/geodezja/przekroj/${id}` as never)}
      pozycje={przekroje.map((p) => ({
        id: p.id,
        nazwa: p.nazwa,
        opis: p.opis,
        archiwum: p.archiwum,
        updatedAt: p.updatedAt,
        podsumowanie: `Elementy: ${p.elementy.length} · szerokość ${fm(szerokoscPrzekroju(p) / 100, 2)} m`,
      }))}
    />
  );
}
