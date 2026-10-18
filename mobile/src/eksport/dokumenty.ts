// Treść stron z danymi użytkownika w formie dokumentu PDF (przycisk „Udostępnij” w nagłówku).

import { formatLiczby, round2 } from '../utils/calculations';
import { POLA_WYNAGRODZENIA, dojazdRaportu, kwotaPracownika, liniePodsumowania, nazwaPracownika } from '../budzet/pracownicy';
import {
  bankR8, lataRaportow, nazwaBrygady, nazwaNieobecnosci, podsumowanieMiesiaca, rodzajRaportu, rozliczNieobecnosci,
} from '../budzet/nieobecnosci';
import { dataKrotko, etykietaSprzetu, linieStawek, opisPozycjiSprzetu } from '../budzet/wyswietlanie';
import type { GrupaPracownikow, Pracownik, RaportPracownika, RaportSprzetu, Sprzet } from '../budzet/typy';
import {
  etykietaMiesiaca, kwotaPrzerzutu, liczbaRaportow, kwotaSamochodow, materialyRaportu, miesiaceRaportow, podsumowanieDnia,
  przerobRaportu, robociznaDnia, statystykiRaportow, sumaKwot, sumaPrzerobu,
} from '../raportyBudowy/raporty';
import type { RaportDzienny } from '../raportyBudowy/typy';
import { NAZWY_KATEGORII, rodzajMieszanki } from '../mieszanki/kolejnosc';
import { formatujKmM, obliczPrzedmiar, sumyMieszanek } from '../utils/projektBudowy';
import type { Budowa, Mieszanka, ProjektBudowy, WarstwaKonstrukcji } from '../types';
import { opisStatusu } from '../utils/statusBudowy';
import { dane, tekst, type DokumentPdf, type SekcjaPdf } from './dokumentPdf';

const zl = (n: number) => `${formatLiczby(n)} zł`;
const h = (n: number) => `${formatLiczby(n)} h`;
const dni = (n: number) => (n === 1 ? '1 dzień' : `${n} dni`);
const nazwaBudowy = (budowy: Pick<Budowa, 'id' | 'kodBudowy' | 'nazwaInwestycji'>[], id?: string) => {
  const b = budowy.find((x) => x.id === id);
  return b ? `${b.kodBudowy} · ${b.nazwaInwestycji}` : 'Budowa usunięta';
};

type BudowaKrotko = Pick<Budowa, 'id' | 'kodBudowy' | 'nazwaInwestycji'>;

// --- Sprzęt ---

export function dokumentSprzetu({ maszyna, rodzaj, firma, raporty, budowy, pracownicy }: {
  maszyna: Sprzet;
  rodzaj: string;
  firma?: string;
  raporty: RaportSprzetu[];
  budowy: BudowaKrotko[];
  pracownicy: Pracownik[];
}): DokumentPdf {
  const wlasne = raporty
    .filter((r) => r.sprzetId === maszyna.id)
    .sort((a, b) => b.data.localeCompare(a.data) || b.createdAt.localeCompare(a.createdAt));
  const pracownik = (id?: string) => {
    if (!id) return 'Bez pracownika';
    const p = pracownicy.find((x) => x.id === id);
    return p ? nazwaPracownika(p) : 'Pracownik usunięty';
  };
  return {
    tytul: `${rodzaj} ${etykietaSprzetu(maszyna.numer)}`,
    podtytul: firma,
    sekcje: [
      {
        tytul: 'Dane',
        bloki: [dane([
          { etykieta: 'Rodzaj', wartosc: rodzaj },
          { etykieta: 'Numer', wartosc: etykietaSprzetu(maszyna.numer) },
          { etykieta: 'Firma', wartosc: firma ?? '—' },
          { etykieta: 'Spalanie', wartosc: maszyna.spalanieLnaMth ? `${formatLiczby(maszyna.spalanieLnaMth)} l/mth` : '—' },
        ])],
      },
      { tytul: 'Stawki', bloki: [tekst(...(linieStawek(maszyna.stawki).length ? linieStawek(maszyna.stawki) : ['Brak stawek.']))] },
      {
        tytul: `Raporty (${wlasne.length})`,
        bloki: [{
          typ: 'tabela',
          naglowki: ['Data', 'Budowa', 'Pracownik', 'Rozliczenie', 'Kwota'],
          liczbowe: [4],
          wiersze: wlasne.map((r) => [
            dataKrotko(r.data),
            nazwaBudowy(budowy, r.budowaId),
            pracownik(r.pracownikId),
            [...r.pozycje.map(opisPozycjiSprzetu), r.uwagi ?? ''].filter(Boolean).join('\n'),
            zl(r.kwota),
          ]),
          suma: wlasne.length ? ['Razem', '', '', '', zl(round2(wlasne.reduce((s, r) => s + r.kwota, 0)))] : undefined,
        }],
      },
    ],
  };
}

// --- Pracownik ---

const opisNieobecnosciMiesiaca = (p: ReturnType<typeof podsumowanieMiesiaca>) => [
  p.dniUW ? `UW ${p.dniUW}` : '',
  p.dniL4 ? `L4 ${p.dniL4}` : '',
  p.dniR8 ? `R8 ${p.dniR8}` : '',
  p.dniUB ? `UB ${p.dniUB}` : '',
  p.dniNB ? `NB ${p.dniNB}` : '',
].filter(Boolean).join(', ') || '—';

export function dokumentPracownika({ pracownik, grupy, raporty }: {
  pracownik: Pracownik;
  grupy: GrupaPracownikow[];
  raporty: RaportPracownika[];
}): DokumentPdf {
  const wlasne = raporty.filter((r) => r.pracownikId === pracownik.id);
  const miesiace = lataRaportow(wlasne).flatMap((r) => r.miesiace).map((m) => ({ ...m, p: podsumowanieMiesiaca(pracownik, wlasne, m.miesiac) }));
  const bank = bankR8(pracownik, wlasne);
  const grupa = grupy.find((g) => g.id === pracownik.grupaId);
  return {
    tytul: nazwaPracownika(pracownik),
    podtytul: grupa?.nazwa ?? 'Bez grupy',
    sekcje: [
      {
        tytul: 'Dane',
        bloki: [dane([
          { etykieta: 'Nazwisko', wartosc: pracownik.nazwisko || '—' },
          { etykieta: 'Imię', wartosc: pracownik.imie || '—' },
          { etykieta: 'Grupa', wartosc: grupa?.nazwa ?? '—' },
          { etykieta: 'Telefon', wartosc: pracownik.telefon ?? '—' },
        ])],
      },
      {
        tytul: 'Wynagrodzenie',
        bloki: [dane(POLA_WYNAGRODZENIA.map((pole) => {
          const w = pracownik.stawki[pole.id];
          return { etykieta: pole.nazwa, wartosc: !w ? '—' : pole.mnoznik ? `× ${formatLiczby(w)}` : `${formatLiczby(w)} ${pole.jednostka}` };
        }))],
      },
      {
        tytul: 'Raporty według miesięcy',
        bloki: [{
          typ: 'tabela',
          naglowki: ['Miesiąc', 'Raporty', 'Godziny', 'Nadgodziny', 'Nieobecności', 'Wypłata', 'Koszt'],
          liczbowe: [1, 2, 3, 5, 6],
          wiersze: miesiace.map(({ miesiac, liczba, p }) => [
            etykietaMiesiaca(miesiac), String(liczba), h(p.godzinyPracy), h(p.nadgodziny), opisNieobecnosciMiesiaca(p), zl(p.wyplata), zl(p.koszt),
          ]),
          suma: miesiace.length ? [
            'Razem',
            String(wlasne.length),
            h(round2(miesiace.reduce((s, m) => s + m.p.godzinyPracy, 0))),
            h(round2(miesiace.reduce((s, m) => s + m.p.nadgodziny, 0))),
            '',
            zl(round2(miesiace.reduce((s, m) => s + m.p.wyplata, 0))),
            zl(round2(miesiace.reduce((s, m) => s + m.p.koszt, 0))),
          ] : undefined,
        }],
      },
      {
        tytul: 'R8 – nadgodziny na zimę',
        bloki: [dane([
          { etykieta: 'Odłożone', wartosc: h(bank.odlozone) },
          { etykieta: 'Odebrane (R8)', wartosc: h(bank.wykorzystane) },
          { etykieta: 'Do odebrania', wartosc: h(bank.saldo) },
        ])],
      },
    ],
  };
}

export function dokumentMiesiacaPracownika({ pracownik, miesiac, raporty, budowy, grupy }: {
  pracownik: Pracownik;
  miesiac: string;
  raporty: RaportPracownika[];
  budowy: BudowaKrotko[];
  grupy: GrupaPracownikow[];
}): DokumentPdf {
  const wlasne = raporty.filter((r) => r.pracownikId === pracownik.id);
  const p = podsumowanieMiesiaca(pracownik, wlasne, miesiac);
  const bank = bankR8(pracownik, wlasne, miesiac);
  const wzory = rozliczNieobecnosci(pracownik, wlasne);
  const nazwaPozycji = (typ: 'budowa' | 'brygada', id?: string) => (typ === 'brygada' ? nazwaBrygady(grupy, id) : nazwaBudowy(budowy, id));
  return {
    tytul: `${nazwaPracownika(pracownik)} – ${etykietaMiesiaca(miesiac)}`,
    podtytul: `Podsumowanie miesiąca · ${liczbaRaportow(p.raporty.length)}`,
    sekcje: [
      {
        tytul: 'Podsumowanie',
        bloki: [dane([
          { etykieta: 'Przepracowane', wartosc: h(p.godzinyPracy) },
          { etykieta: 'Nadgodziny', wartosc: h(p.nadgodziny) },
          { etykieta: 'Urlop UW', wartosc: dni(p.dniUW) },
          { etykieta: 'Zwolnienie L4', wartosc: dni(p.dniL4) },
          { etykieta: 'Wolne R8', wartosc: dni(p.dniR8) },
          { etykieta: 'Urlop bezpłatny UB', wartosc: dni(p.dniUB) },
          { etykieta: 'Nieobecność NB', wartosc: dni(p.dniNB) },
          { etykieta: 'Bank R8 na koniec', wartosc: h(bank.saldo) },
          { etykieta: 'Wypłata pracownika', wartosc: zl(p.wyplata) },
          { etykieta: 'Koszt pracodawcy (z ZUS i delegacjami)', wartosc: zl(p.koszt) },
          p.delegacje ? { etykieta: 'Delegacje', wartosc: zl(p.delegacje) } : null,
        ])],
      },
      {
        tytul: 'Podział kosztów',
        bloki: [{
          typ: 'tabela',
          naglowki: ['Pozycja', 'Rodzaj', 'Wypłata', 'Koszt'],
          liczbowe: [2, 3],
          wiersze: p.podzial.map((poz) => [nazwaPozycji(poz.typ, poz.id), poz.typ, zl(poz.wyplata), zl(poz.koszt)]),
          suma: p.podzial.length ? ['Razem', '', zl(p.wyplata), zl(p.koszt)] : undefined,
        }],
      },
      ...(p.odlozenie.godziny > 0 ? [{
        tytul: 'R8 – zabrane godziny na zimę',
        bloki: [tekst(
          `Odłożono ${h(p.odlozenie.godziny)} × ${zl(p.odlozenie.stawka)} (stawka nadgodziny).`,
          `Wypłata −${zl(p.odlozenie.wynagrodzenie)} · koszt pracodawcy −${zl(p.odlozenie.koszt)}.`,
        )],
      } satisfies SekcjaPdf] : []),
      {
        tytul: 'Raporty',
        bloki: [{
          typ: 'tabela',
          naglowki: ['Data', 'Rodzaj', 'Budowa / brygada', 'Wyliczenie', 'Wypłata', 'Koszt'],
          liczbowe: [4, 5],
          wiersze: p.raporty.map((r) => {
            const rodzaj = rodzajRaportu(r);
            if (rodzaj !== 'praca') {
              return [
                dataKrotko(r.data), `${rodzaj} – ${nazwaNieobecnosci(rodzaj).toLowerCase()}`,
                nazwaBrygady(grupy, r.grupaId ?? pracownik.grupaId), (wzory.get(r.id)?.linie ?? []).join('\n'),
                zl(r.wynagrodzenie), zl(r.kwota),
              ];
            }
            const dojazd = dojazdRaportu(r);
            const wynik = kwotaPracownika(r.stawki, r.godzinyPodstawowe, r.nadgodziny, dojazd, r.delegacja);
            return [
              dataKrotko(r.data), `Praca ${h(r.godziny)}${r.delegacja ? ' · delegacja' : ''}`, nazwaBudowy(budowy, r.budowaId),
              liniePodsumowania(r.stawki, r.godzinyPodstawowe, r.nadgodziny, dojazd, wynik).join('\n'),
              zl(r.wynagrodzenie), zl(r.kwota),
            ];
          }),
        }],
      },
    ],
  };
}

// --- Budowa ---

type MieszankaDoPdf = Pick<Mieszanka, 'id' | 'rodzaj' | 'ciezarObjetosciowy' | 'wytworniaId' | 'wytwórnia' | 'cena' | 'historiaCen'>
  & Partial<Pick<Mieszanka, 'nrRecepty' | 'kategoriaRuchu'>>;

const tabelaWarstw = (warstwy: WarstwaKonstrukcji[], mieszanki: MieszankaDoPdf[]) => ({
  typ: 'tabela' as const,
  naglowki: ['Warstwa', 'Rodzaj', 'Grubość', 'Materiał zatwierdzony'],
  liczbowe: [2],
  wiersze: [...warstwy].sort((a, b) => a.kolejnosc - b.kolejnosc).map((w) => [
    w.nazwa,
    w.rodzajOpis || NAZWY_KATEGORII[w.kategoria],
    `${formatLiczby(w.gruboscCm)} cm`,
    w.mieszankaIds.map((id) => mieszanki.find((m) => m.id === id)).filter(Boolean)
      .map((m) => `${rodzajMieszanki(m!)}${m!.wytwórnia ? ` (${m!.wytwórnia})` : ''}`).join('\n') || '—',
  ]),
});

export function dokumentBudowy({ budowa, projekt, mieszanki, nazwaWytworni, raporty, raportyPracownikow, raportySprzetu }: {
  budowa: Budowa;
  projekt: ProjektBudowy;
  mieszanki: MieszankaDoPdf[];
  nazwaWytworni: (id?: string) => string | undefined;
  raporty: RaportDzienny[];
  raportyPracownikow: RaportPracownika[];
  raportySprzetu: RaportSprzetu[];
}): DokumentPdf {
  const wlasne = raporty.filter((r) => r.budowaId === budowa.id);
  const statystyki = statystykiRaportow(wlasne);
  const sumy = sumyMieszanek(obliczPrzedmiar(projekt, mieszanki), mieszanki, nazwaWytworni);
  const miesiace = miesiaceRaportow(wlasne).map((m) => {
    const dnia = wlasne.filter((r) => r.data.startsWith(m.klucz));
    const przerob = sumaPrzerobu(dnia.flatMap((r) => przerobRaportu(r)));
    const kwota = round2(dnia.reduce((s, r) => s + podsumowanieDnia(r, mieszanki, raportyPracownikow, raportySprzetu).razem, 0));
    return { ...m, przerob, kwota };
  });
  const konstrukcje: SekcjaPdf[] = projekt.konstrukcje
    .filter((k) => k.warstwy.length > 0 || k.wyjatki.length > 0)
    .map((k) => ({
      tytul: `Konstrukcja – ${projekt.legenda.find((l) => l.id === k.legendaId)?.nazwa || 'obszar'}`,
      bloki: [
        tabelaWarstw(k.warstwy, mieszanki),
        ...k.wyjatki.flatMap((w) => [
          tekst(`Zmiana konstrukcji ${formatujKmM(w.kmOdM)} – ${formatujKmM(w.kmDoM)}${w.opis ? ` (${w.opis})` : ''}`),
          tabelaWarstw(w.warstwy, mieszanki),
        ]),
      ],
    }));
  return {
    tytul: `${budowa.kodBudowy} · ${budowa.nazwaInwestycji}`,
    podtytul: 'Budowa – projekt i wykonanie',
    sekcje: [
      {
        tytul: 'Dane',
        bloki: [dane([
          { etykieta: 'Kod budowy', wartosc: budowa.kodBudowy },
          { etykieta: 'Inwestycja', wartosc: budowa.nazwaInwestycji },
          { etykieta: 'Kilometraż początkowy', wartosc: formatujKmM(projekt.kilometrazPoczatkowyM) },
          { etykieta: 'Arkusze PZT', wartosc: String(projekt.arkusze.length) },
          { etykieta: 'Status', wartosc: opisStatusu(budowa) },
        ])],
      },
      ...konstrukcje,
      {
        tytul: 'Przedmiar – suma mieszanek',
        bloki: [{
          typ: 'tabela',
          naglowki: ['Warstwa', 'Mieszanka', 'Zatwierdzone recepty', 'Powierzchnia', 'Grubość', 'Tony'],
          liczbowe: [3, 4, 5],
          wiersze: sumy.map((s) => [
            NAZWY_KATEGORII[s.warstwa], s.nazwa,
            s.recepty.map((r) => (r.wytwornia ? `${r.nazwa} (${r.wytwornia})` : r.nazwa)).join('\n') || '—',
            `${formatLiczby(s.powierzchniaM2)} m²`, `${formatLiczby(s.gruboscWazonaCm)} cm`, `${formatLiczby(s.tony)} t`,
          ]),
          suma: sumy.length ? ['Razem', '', '', '', '', `${formatLiczby(round2(sumy.reduce((s, x) => s + x.tony, 0)))} t`] : undefined,
        }],
      },
      {
        tytul: 'Wykonanie – raporty dzienne',
        bloki: [
          dane([
            { etykieta: 'Raporty', wartosc: String(statystyki.liczba) },
            { etykieta: 'Pierwszy', wartosc: statystyki.od ? dataKrotko(statystyki.od) : '—' },
            { etykieta: 'Ostatni', wartosc: statystyki.do ? dataKrotko(statystyki.do) : '—' },
          ]),
          {
            typ: 'tabela',
            naglowki: ['Miesiąc', 'Raporty', 'Wbudowano', 'Powierzchnia', 'Kwota'],
            liczbowe: [1, 2, 3, 4],
            wiersze: miesiace.map((m) => [
              m.etykieta, String(m.liczba), `${formatLiczby(m.przerob.ilosc)} t`, `${formatLiczby(m.przerob.powierzchniaM2)} m²`, zl(m.kwota),
            ]),
            suma: miesiace.length ? [
              'Razem', String(wlasne.length),
              `${formatLiczby(round2(miesiace.reduce((s, m) => s + m.przerob.ilosc, 0)))} t`,
              `${formatLiczby(round2(miesiace.reduce((s, m) => s + m.przerob.powierzchniaM2, 0)))} m²`,
              zl(round2(miesiace.reduce((s, m) => s + m.kwota, 0))),
            ] : undefined,
          },
        ],
      },
    ],
  };
}

// --- Raport dzienny budowy ---

export function dokumentRaportuBudowy({ raport, budowa, mieszanki, raportyPracownikow, raportySprzetu, pracownicy, sprzet }: {
  raport: RaportDzienny;
  budowa?: BudowaKrotko;
  mieszanki: MieszankaDoPdf[];
  raportyPracownikow: RaportPracownika[];
  raportySprzetu: RaportSprzetu[];
  pracownicy: Pracownik[];
  sprzet: Sprzet[];
}): DokumentPdf {
  const przerob = przerobRaportu(raport);
  const materialy = materialyRaportu(raport, mieszanki);
  const dzien = podsumowanieDnia(raport, mieszanki, raportyPracownikow, raportySprzetu);
  const robocizna = robociznaDnia(raport, raportyPracownikow, raportySprzetu);
  const tak = (ok: boolean) => (ok ? '✓ zatwierdzony' : 'niezatwierdzony');
  return {
    tytul: `Raport dzienny – ${dataKrotko(raport.data)}`,
    podtytul: budowa ? `${budowa.kodBudowy} · ${budowa.nazwaInwestycji}` : undefined,
    sekcje: [
      {
        tytul: 'Kwota dnia',
        bloki: [dane([
          { etykieta: 'Materiał', wartosc: zl(dzien.material) },
          { etykieta: 'Transport', wartosc: zl(dzien.transport) },
          { etykieta: 'Robocizna (zatwierdzona)', wartosc: zl(dzien.robocizna) },
          { etykieta: 'Razem', wartosc: zl(dzien.razem) },
        ]), tekst(raport.uwagi && `Uwagi: ${raport.uwagi}`)],
      },
      {
        tytul: 'Przerób',
        bloki: [{
          typ: 'tabela',
          naglowki: ['Warstwa', 'Mieszanka', 'Ilość', 'Powierzchnia', 'Grubość', 'Projekt'],
          liczbowe: [2, 3, 4, 5],
          wiersze: przerob.map((w) => [
            w.warstwaNazwa, w.mieszankaNazwa ?? '—', `${formatLiczby(w.ilosc)} t`, `${formatLiczby(w.powierzchniaM2)} m²`,
            w.gruboscCm != null ? `${formatLiczby(w.gruboscCm)} cm` : '—', `${formatLiczby(w.gruboscProjCm)} cm`,
          ]),
        }],
      },
      {
        tytul: 'Materiał',
        bloki: [{
          typ: 'tabela',
          naglowki: ['Materiał', 'Ilość', 'Cena', 'Kwota'],
          liczbowe: [1, 2, 3],
          wiersze: materialy.map((m) => [
            [m.nazwa, m.firma, m.uwagi].filter(Boolean).join(' – '), `${formatLiczby(m.ilosc)} ${m.jednostka}`,
            `${zl(m.cena)}${m.zmieniona ? ' (zmieniona)' : ''}`, zl(m.kwota),
          ]),
          suma: materialy.length ? ['Razem', '', '', zl(sumaKwot(materialy))] : undefined,
        }],
      },
      {
        tytul: 'Transport',
        bloki: [{
          typ: 'tabela',
          naglowki: ['Rodzaj', 'Opis', 'Kwota'],
          liczbowe: [2],
          wiersze: [
            ...raport.przerzuty.map((p) => ['Przerzut', [p.firma, p.trasa, p.ladunek].filter(Boolean).join(' · ') || '—', zl(kwotaPrzerzutu(p))]),
            ...raport.samochody.map((s) => ['Samochody', [s.firma, s.kursy ? `${s.kursy} kursów` : ''].filter(Boolean).join(' · ') || '—', zl(kwotaSamochodow(s))]),
          ],
          suma: raport.przerzuty.length + raport.samochody.length ? ['Razem', '', zl(dzien.transport)] : undefined,
        }],
      },
      {
        tytul: 'Robocizna',
        bloki: [{
          typ: 'tabela',
          naglowki: ['Rodzaj', 'Kto / co', 'Status', 'Kwota'],
          liczbowe: [3],
          wiersze: [
            ...robocizna.pracownicy.map((r) => {
              const p = pracownicy.find((x) => x.id === r.pracownikId);
              return ['Pracownik', `${p ? nazwaPracownika(p) : 'Pracownik usunięty'} · ${h(r.godziny)}`, tak(raport.zatwierdzonePracownicy.includes(r.id)), zl(r.kwota)];
            }),
            ...robocizna.sprzet.map((r) => {
              const m = sprzet.find((x) => x.id === r.sprzetId);
              return ['Sprzęt', m ? etykietaSprzetu(m.numer) : 'Sprzęt usunięty', tak(raport.zatwierdzonySprzet.includes(r.id)), zl(r.kwota)];
            }),
          ],
          suma: robocizna.pracownicy.length + robocizna.sprzet.length ? ['Zatwierdzone', '', '', zl(dzien.robocizna)] : undefined,
        }],
      },
    ],
  };
}

export function dokumentMiesiacaBudowy({ miesiac, budowa, raporty, mieszanki, raportyPracownikow, raportySprzetu }: {
  miesiac: string;
  budowa?: BudowaKrotko;
  raporty: RaportDzienny[];
  mieszanki: MieszankaDoPdf[];
  raportyPracownikow: RaportPracownika[];
  raportySprzetu: RaportSprzetu[];
}): DokumentPdf {
  const dnia = raporty.filter((r) => r.data.startsWith(miesiac)).sort((a, b) => a.data.localeCompare(b.data));
  const wiersze = dnia.map((r) => {
    const suma = sumaPrzerobu(przerobRaportu(r));
    const d = podsumowanieDnia(r, mieszanki, raportyPracownikow, raportySprzetu);
    return { r, suma, d };
  });
  return {
    tytul: `Raporty budowy – ${etykietaMiesiaca(miesiac)}`,
    podtytul: budowa ? `${budowa.kodBudowy} · ${budowa.nazwaInwestycji}` : undefined,
    sekcje: [{
      tytul: `Raporty (${dnia.length})`,
      bloki: [{
        typ: 'tabela',
        naglowki: ['Data', 'Warstwy', 'Ilość', 'Powierzchnia', 'Materiał', 'Transport', 'Robocizna', 'Razem'],
        liczbowe: [2, 3, 4, 5, 6, 7],
        wiersze: wiersze.map(({ r, suma, d }) => [
          dataKrotko(r.data),
          przerobRaportu(r).map((w) => w.mieszankaNazwa ?? w.warstwaNazwa).join('\n') || '—',
          `${formatLiczby(suma.ilosc)} t`, `${formatLiczby(suma.powierzchniaM2)} m²`,
          zl(d.material), zl(d.transport), zl(d.robocizna), zl(d.razem),
        ]),
        suma: wiersze.length ? [
          'Razem', '',
          `${formatLiczby(round2(wiersze.reduce((s, w) => s + w.suma.ilosc, 0)))} t`,
          `${formatLiczby(round2(wiersze.reduce((s, w) => s + w.suma.powierzchniaM2, 0)))} m²`,
          zl(round2(wiersze.reduce((s, w) => s + w.d.material, 0))),
          zl(round2(wiersze.reduce((s, w) => s + w.d.transport, 0))),
          zl(round2(wiersze.reduce((s, w) => s + w.d.robocizna, 0))),
          zl(round2(wiersze.reduce((s, w) => s + w.d.razem, 0))),
        ] : undefined,
      }],
    }],
  };
}
