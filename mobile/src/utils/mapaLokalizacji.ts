// ============================================================
// LOKALIZACJA GOOGLE MAPS – odczyt linku i adres podglądu mapy
// ============================================================

export interface MiejsceNaMapie {
  /** Nazwa / adres miejsca (np. z /maps/place/...). */
  nazwa?: string;
  lat?: number;
  lng?: number;
}

function sprobujUrl(tekst: string): URL | null {
  try {
    return new URL(tekst.trim());
  } catch {
    return null;
  }
}

/** Skrócone linki z aplikacji Google Maps (maps.app.goo.gl, goo.gl/maps). */
export function czyKrotkiLinkMaps(link: string): boolean {
  const url = sprobujUrl(link);
  if (!url) return false;
  const host = url.hostname.toLowerCase();
  return host === 'maps.app.goo.gl' || (host === 'goo.gl' && url.pathname.startsWith('/maps'));
}

export function czyLinkGoogleMaps(link: string): boolean {
  const url = sprobujUrl(link);
  if (!url) return false;
  const host = url.hostname.toLowerCase();
  return czyKrotkiLinkMaps(link)
    || ((/(^|\.)google\.[a-z.]+$/.test(host)) && (url.pathname.startsWith('/maps') || host.startsWith('maps.')))
    || host === 'consent.google.com';
}

function wspolrzedne(lat: number, lng: number): { lat: number; lng: number } | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function parsujWspolrzedne(tekst: string): { lat: number; lng: number } | null {
  const m = tekst.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  return m ? wspolrzedne(Number(m[1]), Number(m[2])) : null;
}

function dekoduj(fragment: string): string {
  try {
    return decodeURIComponent(fragment.replace(/\+/g, ' ')).trim();
  } catch {
    return fragment.replace(/\+/g, ' ').trim();
  }
}

/** Odczytuje miejsce z pełnego linku Google Maps (skrócony trzeba najpierw rozwinąć). */
export function odczytajMiejsce(link: string): MiejsceNaMapie | null {
  let url = sprobujUrl(link);
  if (!url) return null;
  if (url.hostname === 'consent.google.com') {
    const dalej = url.searchParams.get('continue');
    url = dalej ? sprobujUrl(dalej) : null;
    if (!url) return null;
  }
  const wynik: MiejsceNaMapie = {};

  const miejsce = url.pathname.match(/\/maps\/(?:place|search)\/([^/]+)/);
  if (miejsce) {
    const nazwa = dekoduj(miejsce[1]);
    const punkt = parsujWspolrzedne(nazwa);
    if (punkt) Object.assign(wynik, punkt);
    else if (nazwa) wynik.nazwa = nazwa;
  }

  const pinezka = url.pathname.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const widok = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const punkt = pinezka
    ? wspolrzedne(Number(pinezka[1]), Number(pinezka[2]))
    : widok ? wspolrzedne(Number(widok[1]), Number(widok[2])) : null;
  if (punkt && wynik.lat == null) Object.assign(wynik, punkt);

  for (const klucz of ['q', 'query', 'destination', 'll']) {
    const wartosc = url.searchParams.get(klucz);
    if (!wartosc) continue;
    const p = parsujWspolrzedne(wartosc);
    if (p) {
      if (wynik.lat == null) Object.assign(wynik, p);
    } else if (!wynik.nazwa && klucz !== 'll') {
      wynik.nazwa = wartosc.trim();
    }
  }

  return wynik.nazwa || wynik.lat != null ? wynik : null;
}

/** Tekst do pola „Adres na mapie”: współrzędne pinezki (dokładne), a bez nich nazwa miejsca. */
export function adresZMiejsca(miejsce: MiejsceNaMapie): string {
  if (miejsce.lat != null && miejsce.lng != null) return `${miejsce.lat},${miejsce.lng}`;
  return miejsce.nazwa ?? '';
}

/** Adres podglądu mapy w ramce (bez klucza API). */
export function adresOsadzonejMapy(adres: string, zoom = 15): string | null {
  const zapytanie = adres.trim();
  if (!zapytanie) return null;
  const kod = encodeURIComponent(zapytanie).replace(/!/g, '%21').replace(/%20/g, '+');
  return `https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1s${kod}!6i${zoom}`;
}

/** Link otwierający miejsce w Google Maps, gdy nie ma zapisanego linku. */
export function linkWyszukiwaniaMaps(adres: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adres.trim())}`;
}
