// ============================================================
// NARZĘDZIA DATY – Kalkulator MMA
// ============================================================

/** Jutro (kalendarzowo), niezależnie od weekendu. */
export function nastepnyDzienKalendarzowy(): Date {
  const wynik = new Date();
  wynik.setDate(wynik.getDate() + 1);
  wynik.setHours(6, 0, 0, 0);
  return wynik;
}

/** Zwraca następny dzień roboczy (pom-nd → pon, pt → pon za 3 dni) */
export function nastepnyDzienRoboczy(): Date {
  const dzisiaj = new Date();
  const dzien = dzisiaj.getDay(); // 0=nd, 1=pn, ..., 5=pt, 6=so

  let offset = 1;
  if (dzien === 5) offset = 3; // piątek → poniedziałek
  else if (dzien === 6) offset = 2; // sobota → poniedziałek

  const wynik = new Date(dzisiaj);
  wynik.setDate(dzisiaj.getDate() + offset);
  wynik.setHours(6, 0, 0, 0);
  return wynik;
}

/** Formatuje datę po polsku: "poniedziałek, 21 czerwca 2026" */
export function formatujDatePl(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Formatuje datę krótko: "21.06.2026" */
export function formatujDateKrotko(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Zwraca aktualną godzinę w formacie "HH:MM" */
export function aktualnaGodzina(): string {
  const t = new Date();
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
}

/** Parsuje datę ISO i zwraca obiekt Date */
export function parseISODate(iso: string): Date {
  return new Date(iso);
}
