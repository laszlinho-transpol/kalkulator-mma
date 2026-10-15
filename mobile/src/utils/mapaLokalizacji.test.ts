import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  adresOsadzonejMapy, adresZMiejsca, czyKrotkiLinkMaps, czyLinkGoogleMaps, odczytajMiejsce,
} from './mapaLokalizacji';

const ROZWINIETY = 'https://www.google.com/maps/place/KOBYLARNIA+S.A.,+Zakole,+86-061+Kobylarnia/data=!4m2!3m1!1s0x47036b9c388ec96d:0xa3c79ef4fd74ef09!18m1!1e1?utm_source=mstt_1&entry=gps&g_st=ac';

describe('lokalizacja Google Maps', () => {
  it('rozpoznaje skrócony link z aplikacji', () => {
    assert.equal(czyKrotkiLinkMaps('https://maps.app.goo.gl/xmwoFydjZXNCFrBX9?g_st=ac'), true);
    assert.equal(czyKrotkiLinkMaps(ROZWINIETY), false);
    assert.equal(czyLinkGoogleMaps('https://maps.app.goo.gl/xmwoFydjZXNCFrBX9?g_st=ac'), true);
    assert.equal(czyLinkGoogleMaps(ROZWINIETY), true);
    assert.equal(czyLinkGoogleMaps('https://example.com/maps/place/x'), false);
  });

  it('odczytuje nazwę miejsca z rozwiniętego linku', () => {
    assert.deepEqual(odczytajMiejsce(ROZWINIETY), { nazwa: 'KOBYLARNIA S.A., Zakole, 86-061 Kobylarnia' });
  });

  it('bierze pinezkę !3d!4d przed środkiem widoku @', () => {
    const m = odczytajMiejsce('https://www.google.com/maps/place/Wytw%C3%B3rnia/@53.1,18.2,15z/data=!3m1!4b1!4m6!3m5!8m2!3d53.0855!4d18.1497');
    assert.deepEqual(m, { nazwa: 'Wytwórnia', lat: 53.0855, lng: 18.1497 });
  });

  it('obsługuje q=, współrzędne i stronę zgody Google', () => {
    assert.deepEqual(odczytajMiejsce('https://maps.google.com/?q=52.23,21.01'), { lat: 52.23, lng: 21.01 });
    assert.deepEqual(odczytajMiejsce('https://www.google.com/maps/search/?api=1&query=Mak%C3%B3w'), { nazwa: 'Maków' });
    const zgoda = `https://consent.google.com/m?continue=${encodeURIComponent(ROZWINIETY)}&gl=PL`;
    assert.equal(odczytajMiejsce(zgoda)?.nazwa, 'KOBYLARNIA S.A., Zakole, 86-061 Kobylarnia');
    assert.equal(odczytajMiejsce('https://maps.app.goo.gl/xmwoFydjZXNCFrBX9'), null);
  });

  it('buduje adres podglądu mapy', () => {
    assert.equal(adresZMiejsca({ lat: 53.08, lng: 18.14 }), '53.08,18.14');
    assert.equal(
      adresOsadzonejMapy('KOBYLARNIA S.A., Zakole'),
      'https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1sKOBYLARNIA+S.A.%2C+Zakole!6i15',
    );
    assert.equal(adresOsadzonejMapy('  '), null);
  });
});
