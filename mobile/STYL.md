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

## 2. Klocki (`src/components/ui`)

| Klocek | Kiedy |
|---|---|
| `AppHeader` | nagłówek każdego ekranu (wstecz + domek, tytuł, podtytuł, `prawy`, `przyciski`) |
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
- [ ] pola parami w `Wiersz`, jednostki i etykiety nie zawijają się (sprawdź szerokość 360 px)
- [ ] opisy tylko w „i”
- [ ] treść w osobnych `Sekcja`/`Karta`, długie strony podzielone `Zakladki`
- [ ] daty przez wspólny kalendarz
- [ ] każdy naciskany element ma `accessibilityLabel` (testy Puppeteer klikają po etykietach)
- [ ] tryb ciemny wygląda poprawnie (kolory tylko z motywu)
