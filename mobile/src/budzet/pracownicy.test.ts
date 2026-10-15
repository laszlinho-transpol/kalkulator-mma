import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { czyDzienWolny, swietaPolskie } from './kalendarzPracy';
import { dniRoboczeMiesiaca } from './rozliczenie';
import {
  BEZ_DOJAZDU, kwotaPracownika, nazwaPracownika, podzialGodzin, rozdzielImieNazwisko, sekcjePracownikow,
} from './pracownicy';
import type { GrupaPracownikow, Pracownik } from './typy';

const pracownik = (id: string, nazwisko: string, imie: string, grupaId?: string, ulubiony?: boolean): Pracownik => ({
  id, nazwisko, imie, grupaId, ulubiony, stawki: {}, createdAt: '', updatedAt: '',
});
const grupa = (id: string, nazwa: string, ulubiona?: boolean): GrupaPracownikow => ({ id, nazwa, ulubiona, createdAt: '' });

describe('kalendarz pracy', () => {
  it('liczy święta ruchome i Wigilię od 2025', () => {
    const swieta = swietaPolskie(2026);
    assert.ok(swieta.has('2026-04-06'), 'Poniedziałek Wielkanocny');
    assert.ok(swieta.has('2026-06-04'), 'Boże Ciało');
    assert.ok(swieta.has('2026-12-24'));
    assert.ok(!swietaPolskie(2024).has('2024-12-24'));
  });

  it('sobota, niedziela i święto to dni wolne', () => {
    assert.equal(czyDzienWolny('2026-10-17'), true);
    assert.equal(czyDzienWolny('2026-10-18'), true);
    assert.equal(czyDzienWolny('2026-11-11'), true);
    assert.equal(czyDzienWolny('2026-10-15'), false);
  });

  it('dni robocze miesiąca pomijają święta', () => {
    assert.equal(dniRoboczeMiesiaca('2026-11-01'), 20);
  });
});

describe('wynagrodzenie pracownika', () => {
  it('pn–pt powyżej 8 h to nadgodziny', () => {
    assert.deepEqual(podzialGodzin('2026-10-15', 10), { podstawowe: 8, nadgodziny: 2, wolny: false });
    assert.deepEqual(podzialGodzin('2026-10-15', 6), { podstawowe: 6, nadgodziny: 0, wolny: false });
  });

  it('w sobotę i święto każda godzina to nadgodzina', () => {
    assert.deepEqual(podzialGodzin('2026-10-17', 6), { podstawowe: 0, nadgodziny: 6, wolny: true });
    assert.deepEqual(podzialGodzin('2026-11-11', 9), { podstawowe: 0, nadgodziny: 9, wolny: true });
  });

  it('ZUS mnoży sumę pozycji 1–4', () => {
    const stawki = { stawka8h: 45, nadgodzina: 60, kierowca: 30, pasazer: 20, zus: 1.4 };
    const wynik = kwotaPracownika(stawki, 8, 0, { kierowca: 4, pasazer: 0 });
    assert.equal(wynik.zaPodstawe, 360);
    assert.equal(wynik.wynagrodzenie, 480);
    assert.equal(wynik.koszt, 672);
    assert.equal(kwotaPracownika(stawki, 8, 2, { kierowca: 0, pasazer: 2 }).wynagrodzenie, 360 + 120 + 40);
    assert.equal(kwotaPracownika({ stawka8h: 25 }, 8, 0, BEZ_DOJAZDU).koszt, 200);
  });

  it('kierowca i pasażer łączą się w jednym dniu, płatne za godzinę', () => {
    const wynik = kwotaPracownika({ kierowca: 30, pasazer: 20 }, 0, 0, { kierowca: 1, pasazer: 1.5 });
    assert.equal(wynik.zaKierowce, 30);
    assert.equal(wynik.zaPasazera, 30);
    assert.equal(wynik.wynagrodzenie, 60);
  });
});

describe('lista pracowników', () => {
  it('ulubione grupy na górze, w grupie ulubieni i alfabet nazwisk', () => {
    const grupy = [grupa('a', 'Asfalt'), grupa('b', 'Brukarze', true), grupa('c', 'Cieśle')];
    const lista = [
      pracownik('1', 'Żak', 'Ola', 'a'),
      pracownik('2', 'Nowak', 'Jan', 'a'),
      pracownik('3', 'Łukasik', 'Ewa', 'a'),
      pracownik('4', 'Zając', 'Piotr', 'a', true),
      pracownik('5', 'Kowal', 'Adam', 'b'),
      pracownik('6', 'Bez', 'Grupy'),
    ];
    const { ulubione, pozostale } = sekcjePracownikow(lista, grupy);
    assert.deepEqual(ulubione.map((s) => s.grupa?.nazwa), ['Brukarze']);
    assert.deepEqual(pozostale.map((s) => s.grupa?.nazwa ?? '—'), ['Asfalt', '—']);
    assert.deepEqual(pozostale[0].pracownicy.map(nazwaPracownika), ['Zając Piotr', 'Łukasik Ewa', 'Nowak Jan', 'Żak Ola']);
  });

  it('stary zapis „Imię Nazwisko” rozdziela się na pola', () => {
    assert.deepEqual(rozdzielImieNazwisko('Jan Kowalski'), { imie: 'Jan', nazwisko: 'Kowalski' });
    assert.deepEqual(rozdzielImieNazwisko('Kowalski'), { imie: '', nazwisko: 'Kowalski' });
  });
});
