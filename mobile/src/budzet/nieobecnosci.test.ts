import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bankR8, czyBrakRaportu, czyDzienNieobecnosci, dniZakresu, lataRaportow, podsumowanieMiesiaca,
  przeliczoneRaporty, rozliczNieobecnosci,
} from './nieobecnosci';
import type { Pracownik, RaportPracownika } from './typy';

const stawki = { stawka8h: 30, nadgodzina: 40, zus: 1.4 };
const pracownik = (odlozone?: Record<string, number>): Pracownik => ({
  id: 'p', nazwisko: 'Nowak', imie: 'Jan', grupaId: 'g1', stawki, odlozoneNadgodziny: odlozone, createdAt: '', updatedAt: '',
});

let licznik = 0;
const praca = (data: string, wynagrodzenie: number, budowaId = 'b1'): RaportPracownika => ({
  id: `r${licznik += 1}`, pracownikId: 'p', data, budowaId, godziny: 10, godzinyPodstawowe: 8, nadgodziny: 2,
  stawki, wynagrodzenie, kwota: wynagrodzenie * 1.4, createdAt: `${data}T10:00:00Z`,
});
const wolne = (data: string, rodzaj: 'UW' | 'L4' | 'R8'): RaportPracownika => ({
  id: `r${licznik += 1}`, pracownikId: 'p', data, rodzaj, budowaId: '', grupaId: 'g1', godziny: 0, godzinyPodstawowe: 0, nadgodziny: 0,
  stawki, wynagrodzenie: 0, kwota: 0, createdAt: `${data}T10:00:00Z`,
});
const trzyMiesiace = () => [praca('2026-07-10', 6000), praca('2026-08-10', 6600), praca('2026-09-10', 5400)];

describe('nieobecności pracownika', () => {
  it('UW: wypłaty z 3 miesięcy ÷ 3 ÷ dni robocze, pracodawca × ZUS', () => {
    const uw = wolne('2026-10-15', 'UW');
    const w = rozliczNieobecnosci(pracownik(), [...trzyMiesiace(), uw]).get(uw.id)!;
    assert.equal(w.wynagrodzenie, 272.73);
    assert.equal(w.koszt, 381.82);
  });

  it('UW: odłożone nadgodziny pomniejszają wypłatę w podstawie', () => {
    const uw = wolne('2026-10-15', 'UW');
    const w = rozliczNieobecnosci(pracownik({ '2026-09': 20 }), [...trzyMiesiace(), uw]).get(uw.id)!;
    assert.equal(w.wynagrodzenie, 260.61);
  });

  it('L4: średnia z dostępnych miesięcy (max 12) ÷ dni kalendarzowe × 0,8, pracodawca × 1,2', () => {
    const l4 = wolne('2026-10-15', 'L4');
    const w = rozliczNieobecnosci(pracownik(), [...trzyMiesiace(), l4]).get(l4.id)!;
    assert.equal(w.wynagrodzenie, 154.84);
    assert.equal(w.koszt, 185.81);
  });

  it('L4: od 34. dnia w roku pracodawca nie płaci', () => {
    const dni = dniZakresu('2026-10-01', '2026-11-03').map((d) => wolne(d, 'L4'));
    assert.equal(dni.length, 34);
    const wyniki = rozliczNieobecnosci(pracownik(), [...trzyMiesiace(), ...dni]);
    assert.ok(wyniki.get(dni[32].id)!.koszt > 0);
    assert.equal(wyniki.get(dni[33].id)!.koszt, 0);
    assert.ok(wyniki.get(dni[33].id)!.wynagrodzenie > 0);
    const nowyRok = wolne('2027-01-04', 'L4');
    assert.ok(rozliczNieobecnosci(pracownik(), [...trzyMiesiace(), ...dni, nowyRok]).get(nowyRok.id)!.koszt > 0);
  });

  it('R8: 8 × stawka 8h, pracodawca × ZUS; bank godzin', () => {
    const r8 = wolne('2026-12-07', 'R8');
    const w = rozliczNieobecnosci(pracownik(), [r8]).get(r8.id)!;
    assert.equal(w.wynagrodzenie, 240);
    assert.equal(w.koszt, 336);
    assert.deepEqual(bankR8(pracownik({ '2026-09': 20 }), [r8]), { odlozone: 20, wykorzystane: 8, saldo: 12 });
    assert.equal(bankR8(pracownik({ '2026-09': 20 }), [r8], '2026-11').saldo, 20);
  });

  it('podsumowanie miesiąca: praca na budowę, nieobecności i odłożone godziny na brygadę', () => {
    const raporty = przeliczoneRaporty(pracownik({ '2026-10': 2 }), [
      ...trzyMiesiace(), praca('2026-10-14', 300, 'b1'), praca('2026-10-16', 200, 'b2'), wolne('2026-10-15', 'UW'),
    ]);
    const p = podsumowanieMiesiaca(pracownik({ '2026-10': 2 }), raporty, '2026-10');
    assert.equal(p.godzinyPracy, 20);
    assert.equal(p.nadgodziny, 4);
    assert.equal(p.dniUW, 1);
    assert.equal(p.odlozenie.wynagrodzenie, 80);
    assert.equal(p.wyplata, 692.73);
    assert.equal(p.koszt, 969.82);
    assert.deepEqual(p.podzial.map((x) => `${x.typ}:${x.id}:${x.wyplata}:${x.koszt}`), [
      'budowa:b1:300:420', 'budowa:b2:200:280', 'brygada:g1:192.73:269.82',
    ]);
  });

  it('lata i miesiące od najnowszych, dni bez raportu i dni nieobecności', () => {
    const lata = lataRaportow([{ data: '2025-12-02' }, { data: '2026-10-01' }, { data: '2026-02-03' }, { data: '2026-10-05' }]);
    assert.deepEqual(lata.map((l) => `${l.rok}:${l.miesiace.map((m) => `${m.miesiac}/${m.liczba}`).join(',')}`), [
      '2026:2026-10/2,2026-02/1', '2025:2025-12/1',
    ]);
    const z = new Set(['2026-10-14']);
    assert.equal(czyBrakRaportu('2026-10-13', '2026-10-17', '2026-10-01', z), true);
    assert.equal(czyBrakRaportu('2026-10-14', '2026-10-17', '2026-10-01', z), false);
    assert.equal(czyBrakRaportu('2026-10-11', '2026-10-17', '2026-10-01', z), false, 'niedziela');
    assert.equal(czyBrakRaportu('2026-10-17', '2026-10-17', '2026-10-01', z), false, 'dziś');
    assert.equal(czyBrakRaportu('2026-09-30', '2026-10-17', '2026-10-01', z), false, 'przed zatrudnieniem');
    assert.equal(czyDzienNieobecnosci('UW', '2026-11-11'), false);
    assert.equal(czyDzienNieobecnosci('L4', '2026-11-11'), true);
  });
});
