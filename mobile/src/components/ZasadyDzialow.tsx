// Slajdy „Zasada działania” pierwszych stron działów (budowa, mieszanki, wbudowywanie, sprzęt, pracownicy, firmy,
// obmiar PZT). Nazwy pól i przycisków muszą zgadzać się z ekranami – po zmianie strony sprawdź jej slajdy.

import React from 'react';
import {
  WycinekKarty, WycinekPola, WycinekPozycji, WycinekPrzycisku, WycinekWiersz, WycinekWyniku, WycinekZakladek,
  type SlajdZasady,
} from './ui';

export const ZASADA_BUDOWY: SlajdZasady[] = [
  {
    tytul: 'Załóż budowę',
    rysunek: (
      <>
        <WycinekPrzycisku tekst="Nowa" plus />
        <WycinekWiersz>
          <WycinekPola etykieta="Kod" wartosc="B128" aktywne />
          <WycinekPola etykieta="Nazwa inwestycji" wartosc="DK25 Mąkowarsko" />
        </WycinekWiersz>
        <WycinekZakladek zakladki={['Aktywna', 'Gwarancja', 'Zakończona']} />
      </>
    ),
    opis: 'Stuknij **+ Nowa** w nagłówku. Wpisz **Kod** (np. B128) i **Nazwę inwestycji**, wybierz **Status** i stuknij **Utwórz**. Powstanie szablon budowy: PZT, legenda, konstrukcje i przedmiar.',
  },
  {
    tytul: 'Lista budów',
    rysunek: <WycinekKarty tytul="B128" podtytul="DK25 Mąkowarsko" podsumowanie="Arkusze PZT: 4" akcje={['Otwórz', 'Edytuj', 'Usuń']} />,
    opis: 'Budowy są pogrupowane: **Aktywne**, **Gwarancja** i **Zakończone**. **Otwórz** wchodzi do budowy, **Edytuj** zmienia kod, nazwę, status i datę końca gwarancji. Zakończoną budowę wrócisz przyciskiem **Przywróć**.',
  },
  {
    tytul: 'Projekt budowy',
    rysunek: (
      <>
        <WycinekZakladek zakladki={['PZT', 'Legenda', 'Konstrukcje', 'Przedmiar']} />
        <WycinekPrzycisku tekst="Dodaj arkusze XFDF / PDF" plus drugi />
      </>
    ),
    opis: 'W zakładce **PZT** stuknij **+ Dodaj arkusze XFDF / PDF** i ustaw **role kolorów** (trasa L i P, droga boczna, wjazd, ścieżka). Czerwona linia to krawężnik. Oś trasy to najdłuższa kreska osi, czarna albo niebieska: jej własna długość jest kilometrażem arkusza, krawężnik i dłuższa krawędź łuku obok jej nie zmieniają. Krótsze niebieskie kreski to domiary. Gdy pikiety projektu nie schodzą się z długością kreski, **Koniec wg projektu** prowadzi podziałkę wzdłuż tej kreski do wpisanej pikiety – szerokości, domiary i powierzchnie zostają w skali rysunku. **Podziałka kilometrażu** rysuje pikiety co podaną liczbę metrów: kreska i opis są w obszarze, prostopadle do osi i rosną razem z przybliżeniem planu (to samo na liniówce). **Zmierz** stawia łamaną – kolejne stuknięcia dodają węzły, palec je przesuwa, długość jest w metrach skali rysunku. Stuknij wiersz **Kontynuacja poprzedniego arkusza**, żeby zdjąć plik z pikietażu (droga boczna): następny arkusz trasy styka się z poprzednim, np. 9, potem 11. W **Konstrukcjach** każda ma numer: **Przypisz obszary**, stukaj je na arkuszach PZT i zatwierdź **OK**. **Przedmiar** liczy powierzchnie z odsadzkami.',
  },
  {
    tytul: 'Wykonanie',
    rysunek: (
      <>
        <WycinekZakladek zakladki={['Raporty', 'Liniówka', 'Zaawansowanie']} />
        <WycinekPrzycisku tekst="Dodaj raport" plus />
      </>
    ),
    opis: '**Raporty** – kilometraż wpisujesz albo zaznaczasz początek i koniec na planie; odsadzki L i P z raportu liczą wykonaną powierzchnię. **Liniówka** dorysowuje odsadzki warstw (krawężnik zostaje). **Zaawansowanie** pokazuje, ile m² zostało do zakrycia, ile ton każdej mieszanki jeszcze potrzeba i czy jest oszczędność, czy przepał.',
  },
];

export const ZASADA_MIESZANEK: SlajdZasady[] = [
  {
    tytul: 'Dodaj wytwórnię',
    rysunek: (
      <>
        <WycinekPrzycisku tekst="Dodaj wytwórnię" plus drugi />
        <WycinekPola etykieta="Nazwa wytwórni" wartosc="WMA Lipno" aktywne />
        <WycinekPola etykieta="Link Google Maps" wartosc="maps.app.goo.gl/…" />
      </>
    ),
    opis: 'Stuknij **+ Dodaj wytwórnię**. Wpisz **Nazwę wytwórni**, wklej **Link Google Maps** (mapa dojazdu) i dodaj kontakty. Wytwórnia pojawi się na liście jako przycisk do jej karty.',
  },
  {
    tytul: 'Dodaj receptę',
    rysunek: (
      <>
        <WycinekWiersz>
          <WycinekPola etykieta="Nr recepty" wartosc="R/24/118" />
          <WycinekPola etykieta="Rodzaj" wartosc="AC 11 W" />
        </WycinekWiersz>
        <WycinekWiersz>
          <WycinekPola etykieta="Kategoria ruchu" wartosc="KR3–4" aktywne />
          <WycinekPola etykieta="Cena" wartosc="345" jednostka="zł/t" />
        </WycinekWiersz>
      </>
    ),
    opis: 'Stuknij **+ Dodaj receptę**, wybierz wytwórnię, wpisz **Nr recepty**, **Rodzaj** mieszanki, **Kategorię ruchu** (wymagana), **Ciężar obj.** i **Cenę**. Z receptami zaplanujesz wbudowywanie i policzysz koszt masy.',
  },
  {
    tytul: 'Karta wytwórni',
    rysunek: (
      <>
        <WycinekPozycji tytul="WMA Lipno" opis="3 mieszanki · kontakty: 2" />
        <WycinekZakladek zakladki={['Info', 'Mieszanki · 3']} />
      </>
    ),
    opis: 'Stuknij wytwórnię: **Info** – adres, mapa i telefony, **Mieszanki** – jej recepty z ceną na dziś. W recepcie zakładka **Historia ceny** pokazuje wykres zmian ceny. Recepty bez wytwórni są w sekcji **Bez wytwórni**.',
  },
];

export const ZASADA_WBUDOWYWANIA: SlajdZasady[] = [
  {
    tytul: 'Skąd biorą się plany',
    rysunek: (
      <WycinekWiersz>
        <WycinekPrzycisku tekst="Zapisz plan" />
        <WycinekPrzycisku tekst="Zaplanuj masę" drugi />
      </WycinekWiersz>
    ),
    opis: 'Plan dnia zapisujesz w **Obmiarze PZT** (**Zapisz plan**) albo tworzysz w **Zaplanuj masę**. Aktywne plany trafiają tutaj, pogrupowane po budowach. **Edytuj** wraca do obmiaru albo formularza planu.',
  },
  {
    tytul: 'Plan dnia',
    rysunek: (
      <>
        <WycinekKarty tytul="wt., 12 maja" podtytul="Obmiar PZT · 3 działki" podsumowanie="8 aut • 192,4 Mg • 420 m" akcje={['Edytuj', 'Usuń']} />
        <WycinekZakladek zakladki={['Plan', 'Kontrola', '● Live']} />
      </>
    ),
    opis: 'Stuknij kartę planu. Zakładka **Plan** – podsumowanie dnia i rozpiska samochodów. **Kontrola** – wpisz **Wbudowane [Mg]** i **Przejechane od startu [m]**, a zobaczysz uzyskaną grubość względem planu.',
  },
  {
    tytul: 'Na żywo z budowy',
    rysunek: (
      <>
        <WycinekZakladek zakladki={['Plan', 'Kontrola', '● Live']} aktywna={2} />
        <WycinekWiersz>
          <WycinekPola etykieta="Tonaż" wartosc="24,6" jednostka="Mg" aktywne />
          <WycinekPola etykieta="Metry z auta" wartosc="52" jednostka="m" />
        </WycinekWiersz>
        <WycinekWyniku etykieta="Uzysk. / założ." wartosc="5,1 / 5,0 cm" />
      </>
    ),
    opis: 'W **● Live** po każdym aucie wpisz **Tonaż** i metry (**z auta** albo **od startu**), godzinę i komentarz. Tabela aut liczy grubość i ile metrów zostało do końca. Na koniec **Zakończ** archiwizuje plan z raportem PDF.',
  },
];

export const ZASADA_SPRZETU: SlajdZasady[] = [
  {
    tytul: 'Wybierz rodzaj',
    rysunek: (
      <>
        <WycinekPozycji tytul="Rozkładarka" prawy="2" />
        <WycinekPozycji tytul="Walec stalowy" prawy="3" />
      </>
    ),
    opis: 'Sprzęt jest podzielony na grupy (roboty bitumiczne, ziemne, inne, drobny). Liczba po prawej to ilość maszyn danego rodzaju. Stuknij rodzaj, żeby zobaczyć jego listę maszyn.',
  },
  {
    tytul: 'Dodaj nowy sprzęt',
    rysunek: (
      <>
        <WycinekPrzycisku tekst="Dodaj nowy" />
        <WycinekWiersz>
          <WycinekPola etykieta="Numer" wartosc="R-12" />
          <WycinekPola etykieta="Spalanie" wartosc="4" jednostka="l/mth" />
        </WycinekWiersz>
        <WycinekPola etykieta="Firma" wartosc="Transbud" aktywne />
      </>
    ),
    opis: 'Stuknij **Dodaj nowy**, wybierz rodzaj, wpisz **Numer**, **Spalanie** i **Firmę** (trafi do bazy firm i będzie podpowiadana).',
  },
  {
    tytul: 'Stawki i raporty',
    rysunek: (
      <>
        <WycinekWiersz>
          <WycinekPola etykieta="Stawka na dzień" wartosc="350" jednostka="zł/dzień" />
          <WycinekPola etykieta="Stawka godzinowa" wartosc="150" jednostka="zł/mth" aktywne />
        </WycinekWiersz>
        <WycinekZakladek zakladki={['Dane', 'Historia stawek', 'Raporty']} />
      </>
    ),
    opis: 'W **Rozliczeniu** uzupełnij jedną albo kilka stawek: **Koszt miesięczny**, **Stawka na dzień**, **Stawka godzinowa**, **Stawka za kilometr** (dla skrapiarki także **Dozowanie**). Karta maszyny ma **Historię stawek** i **Raporty** pracy.',
  },
];

export const ZASADA_PRACOWNIKOW: SlajdZasady[] = [
  {
    tytul: 'Dodaj pracownika',
    rysunek: (
      <>
        <WycinekPrzycisku tekst="Dodaj nowy" />
        <WycinekWiersz>
          <WycinekPola etykieta="Nazwisko" wartosc="Zieliński" aktywne />
          <WycinekPola etykieta="Imię" wartosc="Tomasz" />
        </WycinekWiersz>
        <WycinekWiersz>
          <WycinekPola etykieta="Telefon" wartosc="600 100 200" />
          <WycinekPola etykieta="Stawka 8h" wartosc="32" jednostka="zł/h" />
        </WycinekWiersz>
      </>
    ),
    opis: 'Stuknij **Dodaj nowy**. Wpisz **Nazwisko**, **Imię**, **Telefon**, wybierz **Grupę** i uzupełnij stawki (**Stawka 8h**, **Nadgodzina**, **Kierowca**, **Pasażer**, **ZUS**, **Delegacja**). Z nich liczy się koszt pracy w raportach.',
  },
  {
    tytul: 'Grupy i ulubione',
    rysunek: (
      <>
        <WycinekPozycji tytul="Zieliński Tomasz" opis="Stawka 8h: 32 zł" gwiazdka />
        <WycinekPozycji tytul="Wrona Marek" opis="Stawka 8h: 30 zł" />
      </>
    ),
    opis: 'Pracownicy są w sekcjach według grup. **Gwiazdka** przy grupie przenosi ją na górę (oddzieloną kreską), gwiazdka przy osobie wyróżnia ją w grupie. Stuknij osobę, żeby otworzyć jej kartę.',
  },
  {
    tytul: 'Karta pracownika',
    rysunek: <WycinekZakladek zakladki={['Dane', 'Historia stawek', 'Raporty']} aktywna={2} />,
    opis: '**Dane** – telefon (zadzwoń, kopiuj, udostępnij) i stawki. **Historia stawek** – od kiedy obowiązywała stawka, z wykresem. **Raporty** – kalendarz pracy i nieobecności (UW, L4, R8, UB, NB).',
  },
];

export const ZASADA_FIRM: SlajdZasady[] = [
  {
    tytul: 'Dodaj firmę',
    rysunek: (
      <>
        <WycinekPrzycisku tekst="Nowa" plus />
        <WycinekPola etykieta="Nazwa firmy" wartosc="Transbud Sp. z o.o." aktywne />
      </>
    ),
    opis: 'Stuknij **+ Nowa**, wpisz **Nazwę firmy** i **Dodaj**. Firma powstaje też sama, gdy wpiszesz ją przy sprzęcie, transporcie albo materiale w raporcie dnia – potem podpowiada się w tych polach.',
  },
  {
    tytul: 'Karta firmy',
    rysunek: (
      <>
        <WycinekPozycji tytul="Transbud Sp. z o.o." opis="sprzęt: 3 · kontakty: 2 · Toruń" />
        <WycinekWiersz>
          <WycinekPola etykieta="Adres siedziby" wartosc="Toruń, ul. Polna 2" />
          <WycinekPola etykieta="E-mail" wartosc="biuro@…" />
        </WycinekWiersz>
      </>
    ),
    opis: 'Stuknij firmę, a potem **Uzupełnij dane** albo **Edytuj**: **Adres siedziby**, **E-mail**, telefony i **Komentarz**. Na karcie zobaczysz jej sprzęt, **Pokaż na mapie** i **Napisz e-mail**.',
  },
];

export const ZASADA_OBMIARU: SlajdZasady[] = [
  {
    tytul: 'Nowa sesja',
    rysunek: (
      <>
        <WycinekPrzycisku tekst="Nowy" />
        <WycinekPola etykieta="Nazwa" wartosc="Różniaty – dzień 1" aktywne />
      </>
    ),
    opis: 'Stuknij **Nowy** w nagłówku, wpisz **Nazwę** sesji (bez nazwy dostanie dzisiejszą datę) i **Utwórz**. Jedna sesja to obmiar na jeden dzień robót.',
  },
  {
    tytul: 'Wczytaj XFDF',
    rysunek: (
      <>
        <WycinekPrzycisku tekst="XFDF" plus />
        <WycinekWyniku etykieta="Skala rysunku" wartosc="1:500" />
      </>
    ),
    opis: 'W sesji stuknij **+ XFDF** i wybierz plik z obszarami zaznaczonymi na PZT (możesz dodać PDF tła). Sprawdź **Skalę rysunku** – od niej zależą metry i m². Kolejny plik dodasz przyciskiem **Importuj kolejny XFDF**.',
  },
  {
    tytul: 'Uzupełnij obszary',
    rysunek: (
      <>
        <WycinekZakladek zakladki={['Start / Koniec', 'Odsadzka', 'Konstrukcja']} aktywna={2} />
        <WycinekPrzycisku tekst="Zatwierdź" />
      </>
    ),
    opis: 'Przy każdym obszarze ustaw **Start / Koniec** (kierunek pracy), **Odsadzkę** i **Konstrukcję** (warstwa, grubość, mieszanka), potem **Zatwierdź**. Kłódka blokuje zatwierdzony obszar – stuknij ją, żeby edytować.',
  },
  {
    tytul: 'Plan dnia',
    rysunek: (
      <>
        <WycinekPola etykieta="Tonaż na auto" wartosc="25" jednostka="Mg" aktywne />
        <WycinekWyniku etykieta="Masa · Razem aut" wartosc="192 Mg · 8" />
        <WycinekPrzycisku tekst="Zapisz plan" />
      </>
    ),
    opis: 'W **Planie dnia** wpisz **Tonaż na auto** – zobaczysz powierzchnię, masę i liczbę aut. **Zapisz plan** przenosi go do **Wbudowywania** z podziałem aut na kursy.',
  },
];
