# STYL APLIKACJI – Kalkulator MMA

Jeden wygląd dla wszystkich ekranów. **Każdy nowy ekran, zakładka i formularz składamy z klocków
opisanych niżej** – bez własnych kolorów, odstępów i nagłówków. Zmiana w klocku zmienia całą aplikację.

| Gdzie | Co |
|---|---|
| `src/constants/styl.ts` | tokeny: `ODSTEP`, `PROMIEN`, `TYPOGRAFIA`, `CZAS`, `SKALA_NACISKU`, `cien(theme)`, `kolorDnia(theme, iso)` |
| `src/constants/theme.ts` | kolory jasne/ciemne (`primary`, `info`, `danger`, `sobota`, `niedziela`…) |
| `src/constants/layout.ts` | starsze stałe kart i tekstów (`karta`, `tekstTytul`…) – używane przez istniejące listy |
| `src/hooks/useMotyw.ts` | `useMotyw()` – aktualny motyw zamiast `useColorScheme() ? dark : light` |
| `src/components/ui/index.ts` | **jedno miejsce importu klocków**: `import { AppHeader, Karta, Sekcja, … } from '…/src/components/ui'` |

## 1. Zasady (obowiązkowe)

1. **Dane zawsze edytowalne.** Każda karta z danymi ma „Edytuj” (prawy róg `AppHeader`) i ekran `…/[id]/edytuj.tsx`
   z tym samym formularzem co dodawanie. Usuwanie – `Przycisk wariant="niebezpieczny"` na dole + `potwierdzAkcje`.
2. **Interaktywne przyciski i płynne przejścia.** Wszystko, co się naciska, to `Naciskany` / `Przycisk` /
   `PrzyciskIkony` / `PozycjaListy` (animacja wciśnięcia, kursor na webie). Nowy ekran wjeżdża płynnie
   samoczynnie (`PrzejscieEkranu` w `app/_layout.tsx`) – nie dodawaj własnych animacji wejścia.
   Lista obiektów (wytwórnie, pracownicy, sprzęt…) = przyciski `PozycjaListy` prowadzące na kartę obiektu,
   **nie** rozwijane sekcje.
3. **Dwie kolumny.** Pola formularza stawiamy parami w `Wiersz` (z `Formularz.tsx`), dane liczbowe w `SiatkaDanych`
   (kafelki 2 kolumny), pary etykieta–wartość w `WierszDanych`. Jednostka (`jednostka="zł / h"`) jest wewnątrz pola
   i **nigdy nie przeskakuje do nowej linii**; etykiety mają `numberOfLines={1}` i się nie zawijają.
4. **Bez opisów na ekranie.** Wyjaśnienia zasad działania tylko w `InfoTooltip` (przycisk „i”) – przez prop `info`
   w `Pole`, `Etykieta`, `Sekcja`. Na ekranie zostają etykiety i wartości.
5. **Nagłówek = `AppHeader`.** Zawsze `lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/rodzic') }}` – rysuje strzałkę
   wstecz **i domek** do menu głównego. Okna modalne: `lewy` „Anuluj”/„Zamknij” (bez domku). Pełnoekranowe formularze
   z „Anuluj” dostają `menu`, żeby domek też był. Akcje ekranu → `przyciski` (drugi rząd) albo `prawy` („Edytuj”).
   **Pasek `AppHeader` (wstecz + domek) jest zawsze widoczny na każdym ekranie oprócz menu głównego** – stoi poza
   `ScrollView` (nie przewija się z treścią), nie chowamy go w trybach pełnoekranowych (mapa, szkic, Live) ani
   w ekranach pomocniczych („nie znaleziono”, ładowanie). Chowają się tylko panele pod nim (rule 17).
6. **Porządek jak w planie dnia „Wbudowywania”.** Treść dzielimy na osobne karty: `Sekcja` (tytuł wersalikami + „i” +
   akcja po prawej) i `Karta` (tytuł, plakietka, podsumowanie, akcje pod kreską). Jedna karta = jeden temat.
   Dłuższe treści rozkładamy na `Zakladki` (np. Info | Mieszanki, Dane | Historia | Raporty), żeby nie było jednej
   długiej strony.
7. **Jeden kalendarz.** Daty wybieramy tylko przez `KalendarzDnia` (jeden dzień), `KalendarzZakresu` (od–do) albo
   `DatePickerButton` (na `Date`). Wszystkie korzystają z `SiatkaKalendarza`: soboty niebieskie (`theme.colors.sobota`),
   niedziele i święta czerwone (`theme.colors.niedziela`, święta z kropką), dziś w obwódce, legenda pod siatką.
   Dni z wpisem (np. raport budowy) zaznaczamy na zielono: `stanDnia` → `oznaczony`, podpis w `legendaOznaczonych`.
   Daty na listach kolorujemy `kolorDnia(theme, iso)`.
8. **Telefony.** Każdy numer pokazujemy z `AkcjeTelefonu` (Zadzwoń / Kopiuj / Udostępnij). Pole numeru:
   `klawiatura="phone-pad"`, opcjonalnie „Z kontaktów” (`wybierzKontaktZTelefonu`).
9. **Historia wartości = wykres.** Zakładka z historią ceny/stawek ma nad listą okresów `WykresLiniowy`
   (linia ceny + przerywana linia wartości z karty).
10. **Web.** Komunikaty i potwierdzenia przez `pokazKomunikat` / `potwierdzAkcje` (`src/utils/dialog.ts`) –
    `Alert.alert` z przyciskami nie działa w przeglądarce.
11. **Mieszanki MMA.** Mieszankę zawsze wybieramy z konkretnej wytwórni – `WyborMieszanki`
    (`src/components/mieszanki/WyborMieszanki.tsx`: najpierw wytwórnia, potem jej recepty; okno: `MieszankaPicker`).
    Listy recept wyświetlamy przez `ListaMieszanek`, a sortujemy `posortujMieszanki` (`src/mieszanki/kolejnosc.ts`):
    rodzaj warstwy od najniższej (podbudowy → wiążące → ścieralne), uziarnienie od największego (31,5 → 5),
    kategoria ruchu od najwyższej. Grupa warstwy ma nagłówek, bloki uziarnienia są od siebie oddzielone.
    Ta sama kolejność obowiązuje na stronie budowy: kolumny przedmiaru i „Suma mieszanek” idą od najniższej
    warstwy (`KOLEJNOSC_KATEGORII`: KŁSM → podbudowy → wiążące → ścieralne), sumy grupowane nagłówkami warstw.
    Suma to jedna pozycja na mieszankę warstwy konstrukcji (pełny tonaż), a pod nią lista zatwierdzonych recept
    z wytwórniami – tonażu nie dzielimy między recepty.
12. **Kategoria ruchu.** Każda recepta ma obowiązkowe pole „Kategoria ruchu” – wpisujemy samą wartość (np. `1-2`).
    Recepta wszędzie (listy, karty, plan, obmiar, raporty, PDF/HTML) wyświetla się przez `rodzajMieszanki`
    (`AC16W KR1-2`) albo `nazwaMieszanki` (z numerem recepty) – nigdy samo `m.rodzaj`.
    Kilka recept (np. materiał zatwierdzony warstwy) pokazujemy jako osobne wiersze oddzielone linią
    (nazwa z KR, pod nią wytwórnia i nr recepty), nigdy sklejone przecinkami w jednym wierszu.
13. **Zakładka raportów obiektu** (budowa, pracownik): `Przycisk` „Dodaj raport”, pod nim miesiące jako
    `PozycjaListy` od najnowszego (u pracownika pogrupowane nagłówkami lat), niżej `SiatkaKalendarza`
    na bieżący miesiąc – `oznaczony` = jest raport (zielony), `brak` = brak obowiązkowego raportu (czerwony,
    `legendaBraku`). Dotknięcie dnia otwiera raport albo nowy raport z tą datą. Miesiąc to osobny ekran:
    podsumowanie, podział kosztów i `Karta` na każdy raport (dotknięcie = edycja). Kwoty UW / L4 / R8 liczy
    tylko `src/budzet/nieobecnosci.ts`.
14. **Udostępnij jako PDF.** Każda strona z danymi wpisanymi przez użytkownika (karty sprzętu i pracownika,
    miesiąc raportów, raport dnia budowy, budowa, plan, Live, obmiar, archiwum) ma w `AppHeader` prop
    `udostepnij` – ikona po prawej, przed „Edytuj”. Treść PDF składamy w `src/eksport/dokumenty.ts`
    (`DokumentPdf`: sekcje z blokami `dane` / `tabela` / `tekst`) i wysyłamy `udostepnijDokumentPdf`;
    gotowe raporty HTML (dzień, obmiar) idą przez `udostepnijHtmlJakoPdf`. Nie składamy HTML-a w ekranie.
    Natywnie: plik PDF + arkusz udostępniania, na webie okno drukowania („Zapisz jako PDF”).
15. **Status budowy i Harmonogram.** Status budowy (aktywna / gwarancja z opcjonalną datą / zakończona) liczy
    tylko `src/utils/statusBudowy.ts` – po dacie gwarancji budowa sama trafia do zakończonych; listy wyboru
    budów biorą `budowaWToku`. Budowę dodajemy i edytujemy wyłącznie `FormularzBudowy` (menu Budowa, karta
    budowy, „Dodaj plan”). Harmonogram łączy wpisy proste (`harmonogramStore`) i plany z „Zaplanuj masę”
    w `src/harmonogram/harmonogram.ts` (tygodnie pn–nd, numer TK wg ISO, eksport PDF z wyborem kolumn).
    W `SiatkaKalendarza` minione dni bez danych to `nieaktywny`, dni z planem `zaplanowany`.
16. **Szkice i działania na PZT = SVG, proporcjonalnie do pliku.** Wszystko, co rysujemy lub zaznaczamy na
    arkuszach PZT (szkice, wypełnienia, obszary liniówki, pomiary), zapisujemy i wyświetlamy jako wektor SVG –
    nigdy jako obraz rastrowy – żeby przy każdym przybliżeniu było ostre i wyraźne. Geometria zawsze we
    współrzędnych PDF arkusza (jak `wierzcholkiPdf` z XFDF), grubość kreski szkicu w jednostkach PDF
    (`gruboscPdf`) – rysunek jest proporcjonalny do pliku i przy przybliżaniu/oddalaniu skaluje się razem
    z planem, nie „pływa” i nie zmienia wielkości względem niego. To samo dotyczy znaków liniówki: strzałki
    kierunku układania i znak „i” liczymy z szerokości pasa (jednostki PDF), więc rosną i maleją z planem.
    Stałą grubość na ekranie (`vectorEffect="non-scaling-stroke"`) mają tylko linie: obrysy obszarów,
    kreski start/koniec, oś, podświetlenie LED i najcieńsza linia szkicu („linia obszaru”, `gruboscPdf: 0`).
    Szkic rysujemy zawsze w jednej warstwie i jednym obszarze naraz (wybór w oknie „Warstwa szkicu” albo stuknięciem
    na mapie; nowa warstwa może też dostać „Cały arkusz”). Szkic jest przycinany (`ClipPath`) do tego obszaru
    (`klipSzkicu`, pole `obszarId`) – farba poza nim nie trafia na liniówkę ani do powierzchni. Linia łamana
    (narzędzie „Łamana”): węzły stawiamy stuknięciem, przeciągamy je (zatrzymują się na granicy obszaru –
    `dociagnijDoObszaru`), a uchwyt w środku krawędzi wygina ją w łuk (krzywa kwadratowa); zamknięta łamana to
    wypełniony wielokąt z zapisanymi węzłami (`lamana`) do dalszej edycji. Wiaderko zalewa do linii szkicu i krawędzi obszarów, a wynik zapisuje
    jako wielokąt SVG (`plama`). Rysujemy w `PztArkuszPodglad` (props `liniowka`, `rysowanie`), logika
    liniówki i szkicu w `src/liniowka/liniowka.ts` i `src/liniowka/rasterSzkicu.ts`.

17. **Panele chowane, widok dla treści.** Przyciski, które nie są potrzebne cały czas (zakładki strony Budowy,
    narzędzia szkicu), nie zajmują stale ekranu: zakładki Budowy są zwinięte do jednego paska „Projekt · PZT –
    Zakładki ▾” i rozwijają się po stuknięciu (wybór zakładki zwija je z powrotem). W trybie rysowania strona
    chowa zakładki, a narzędzia szkicu są pływającym okienkiem przypiętym u góry mapy (zwijany kolor/grubość),
    które znika po „OK” albo „Anuluj”. Pasek `AppHeader` zostaje zawsze (rule 5).

18. **Geodezja – szkic i przekrój jak rysunek na kartce.** Szkic geodezyjny (rzut z góry) i przekrój poprzeczny
    rysujemy na `Kartka` (`src/components/geodezja/Kartka.tsx`): tło papieru, siatka kwadratów (bok domyślnie 1 m,
    zmienny), przesuwanie palcem, zoom dwoma palcami / kółkiem myszy, stuknięcia i przeciąganie obiektów.
    Geometria w metrach (rysunek w skali), a cały rysunek opisuje `src/geodezja/rysunek.ts` jako prymitywy –
    ten sam opis rysuje ekran (`RysunekSvg`) i plik SVG/PDF (`svgSzkicu`, `svgPrzekroju`, blok `svg` w `DokumentPdf`).
    Wysokości: odczyt łaty [mm] ↔ rzędna [m] przez horyzont instrumentu (pierwszy punkt z odczytem i rzędną);
    wyliczone wartości kursywą na szaro, wartości docelowe („cel”) zawsze na zielono (`PAPIER.cel`).
    Narzędzia szkicu to pływający pasek u góry kartki (Punkty, Analiza ▾, Filtr ▾, Siatka ▾), dane zaznaczenia –
    pływający panel na dole. Logika: `src/geodezja/szkic.ts`, `src/geodezja/przekroj.ts`.
    Wypełnienia warstw i betonu rysuje `wypelnionyWielokat` (wzór przycięty do wielokąta wypukłego, siatka wzoru
    zaczepiona w początku świata, z `obszar` tylko w widocznej części kartki); próbki w kreatorze – `probkaWypelnienia`.
    Edytor przekroju (`src/components/geodezja/EdytorPrzekroju.tsx`) jest wspólny dla szablonów w geodezji
    i szczegółów budowy (`ProjektBudowy.szczegoly`, kopie szablonów – edycja szczegółu nie zmienia szablonu).
    Liczby nad kartką wpisuje mała klawiatura w aplikacji (`PoleLiczby` + `KlawiaturaLiczb` w `StrefaKlawiatury`,
    `src/components/geodezja/KlawiaturaLiczb.tsx`) – systemowa zasłania kartkę i przesuwa widok. `Okienko` stoi
    przy górnej krawędzi (klawiatura pod nim), panele zaznaczenia mieszczą się bez przewijania.
19. **Zasada działania na pierwszej stronie działu.** Na górze strony (kalkulator albo pierwsza lista działu)
    stoi `ZasadaDzialania` – slajdy krok po kroku przesuwane palcem: rysunek SVG albo wycinek formularza
    (`WycinekPola`, `WycinekPrzycisku`, `WycinekWyniku`, `WycinekZakladek`, `WycinekPozycji`, `WycinekKarty`) i opis z **pogrubionymi** nazwami pól
    i przycisków. Opis mówi nowemu użytkownikowi, co wpisać i co dostanie. Ten sam `klucz` dostaje
    `AppHeader zasada=…` – przycisk „i” obok domku chowa/pokazuje okienko (podświetlony = pokazane), stan
    zapamiętuje `zasadyStore`. Kalkulatory jak „Wierzchołek łuku”: `Sekcja „Dane”` z `PoleLiczby` i
    `KlawiaturaLiczb` w `StrefaKlawiatury`, wynik w `RamkaWyniku`, reszta w `SiatkaDanych`,
    `usePrzewijanieDoDanych` przewija do danych po otwarciu klawiatury.
    Na stronach list (Budowa, Mieszanki, Wbudowywanie, Sprzęt, Pracownicy, Firmy, Obmiar PZT) okienko stoi
    w `ScrollView` nad listą i nad `EmptyState`; slajdy działów są w `src/components/ZasadyDzialow.tsx`.
    **Po każdej aktualizacji i zmianie w działaniu strony sprawdź, czy nie trzeba zaktualizować jej
    „Zasady działania”** (nazwy pól i przycisków, kolejność kroków, wycinki i rysunki slajdów).

## 2. Klocki (`src/components/ui`)

| Klocek | Kiedy |
|---|---|
| `AppHeader` | nagłówek każdego ekranu (wstecz + domek, tytuł, podtytuł, `prawy`, `przyciski`, `zasada` – przycisk „i”) |
| `ZasadaDzialania` | okienko z samouczkiem na górze strony, slajdy z rysunkami / wycinkami formularza |
| `RamkaWyniku` | główny wynik kalkulatora – duża liczba w ramce |
| `Zakladki<T>` | zakładki karty obiektu: `zakladki={[['info','Info'],['mieszanki',`Mieszanki · ${n}`]]}` |
| `Sekcja` | blok treści z tytułem wersalikami, `info`, elementem `prawy` (np. `PrzyciskIkony ikona="plus"`) |
| `Karta` | element listy z podsumowaniem i akcjami (wzór: karta planu dnia) |
| `PozycjaListy` | wiersz-przycisk do innej strony; `plaska` wewnątrz `Sekcja`/`Karta` |
| `WierszDanych` | etykieta po lewej, wartość po prawej |
| `SiatkaDanych` | kafelki „etykieta nad wartością” w 2 kolumnach; `dopisek` + `kolor` – np. odchyłka od planu |
| `Przycisk` | `glowny` (jeden na kartę), `drugi`, `niebezpieczny`, `tekst`; `ikona`, `maly` |
| `PrzyciskIkony` | okrągły przycisk z ikoną (`plus`, `edytuj`, `wstecz`, `dom`…) – zawsze z `accessibilityLabel` |
| `Ikona` | ikony SVG: wstecz, dom, dalej, telefon, kopiuj, udostepnij, plus, edytuj, usun, mapa |
| `Naciskany` | własny element naciskany z animacją (gdy żaden z powyższych nie pasuje) |
| `Pole`, `Wiersz`, `Etykieta`, `Wybor` | formularze (`src/components/common/Formularz.tsx`) |
| `KalendarzDnia`, `KalendarzZakresu`, `SiatkaKalendarza` | daty (zasada 7) |
| `AkcjeTelefonu` | zasada 8 |
| `WykresLiniowy` | zasada 9 |
| `InfoTooltip` | przycisk „i” (zasada 4) |

## 3. Tokeny

- Odstępy: `ODSTEP.xs 4 · s 8 · m 12 · l 16 · xl 24`. Treść ekranu: `padding: 14`, odstęp kart `gap: 12`.
- Zaokrąglenia: pola i przyciski `PROMIEN.m` (12), karty `PROMIEN.l` (16), plakietki `PROMIEN.pigulka`.
- Typografia: `TYPOGRAFIA.tytulKarty`, `sekcja` (wersaliki), `etykieta`, `wartosc`, `opis`, `podsumowanie`, `duza`.
- Cień kart: `cien(theme)` – już wbudowany w `Karta`, `Sekcja`, `PozycjaListy`, `AppHeader`.
- Kolory tylko z `theme.colors` (`useMotyw()`); tekst na `primary` = `#1A1A1A`.
- Animacje: `CZAS.nacisk` (110 ms), `CZAS.wejscie` (240 ms), `SKALA_NACISKU` (0,97).

## 4. Szablon nowego ekranu karty obiektu

```tsx
import { AppHeader, Sekcja, WierszDanych, Przycisk, Zakladki, useMotyw } from '../../src/components/ui';

export default function KartaXScreen() {
  const theme = useMotyw();
  const [zakladka, setZakladka] = useState<'info' | 'historia'>('info');
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader
        tytul={x.nazwa}
        lewy={{ tekst: '‹ Wstecz', onPress: () => wstecz('/lista-x') }}
        prawy={{ tekst: 'Edytuj', onPress: edytuj }}
      />
      <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
        <Zakladki theme={theme} aktywna={zakladka} onZmien={setZakladka} zakladki={[['info', 'Info'], ['historia', 'Historia']]} />
        <Sekcja tytul="Dane" info="Jak działa…">
          <WierszDanych etykieta="Nazwa" wartosc={x.nazwa} />
        </Sekcja>
        <Przycisk wariant="niebezpieczny" ikona="usun" tekst="Usuń" onPress={usun} />
      </ScrollView>
    </View>
  );
}
```

## 5. Lista kontrolna przed oddaniem ekranu

- [ ] `AppHeader` z „‹ Wstecz” (domek widoczny), tytuł mieści się w jednej linii
- [ ] dane edytowalne (Edytuj + ten sam formularz), usuwanie z potwierdzeniem
- [ ] strona z danymi użytkownika ma `udostepnij` w `AppHeader` (eksport PDF)
- [ ] pola parami w `Wiersz`, jednostki i etykiety nie zawijają się (sprawdź szerokość 360 px)
- [ ] opisy tylko w „i”
- [ ] treść w osobnych `Sekcja`/`Karta`, długie strony podzielone `Zakladki`
- [ ] daty przez wspólny kalendarz
- [ ] rysunki na PZT jako SVG we współrzędnych PDF, ostre i proporcjonalne przy każdym przybliżeniu
- [ ] każdy naciskany element ma `accessibilityLabel` (testy Puppeteer klikają po etykietach)
- [ ] tryb ciemny wygląda poprawnie (kolory tylko z motywu)
