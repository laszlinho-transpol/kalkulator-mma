// Wspólny model strony eksportowanej do PDF (przycisk „Udostępnij” w nagłówku) i jego HTML.

export interface PozycjaDanychPdf {
  etykieta: string;
  wartosc: string;
}

export type BlokPdf =
  | { typ: 'dane'; pozycje: PozycjaDanychPdf[] }
  | { typ: 'tabela'; naglowki: string[]; wiersze: string[][]; suma?: string[]; /** Kolumny wyrównane do prawej (liczby). */ liczbowe?: number[] }
  | { typ: 'tekst'; linie: string[] }
  /** Rysunek wektorowy (szkic, przekrój) – wstawiany bez zmian, skalowany do szerokości strony. */
  | { typ: 'svg'; svg: string };

export interface SekcjaPdf {
  tytul: string;
  bloki: BlokPdf[];
}

export interface DokumentPdf {
  tytul: string;
  podtytul?: string;
  sekcje: SekcjaPdf[];
}

export const dane = (pozycje: (PozycjaDanychPdf | false | null | undefined)[]): BlokPdf => ({
  typ: 'dane',
  pozycje: pozycje.filter((p): p is PozycjaDanychPdf => !!p),
});

export const tekst = (...linie: (string | false | null | undefined)[]): BlokPdf => ({
  typ: 'tekst',
  linie: linie.filter((l): l is string => !!l),
});

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const STYL = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a1a; margin: 18px; }
  h1 { font-size: 18px; color: #1a1a1a; margin: 0; }
  .podtytul { color: #6B7280; font-size: 12px; margin-top: 3px; }
  .naglowek { border-bottom: 3px solid #E8A020; padding-bottom: 8px; margin-bottom: 14px; }
  h2 { font-size: 12px; color: #2E86AB; text-transform: uppercase; letter-spacing: 0.5px; margin: 16px 0 6px; }
  .sekcja { break-inside: avoid-page; }
  .dane { display: flex; flex-wrap: wrap; gap: 6px; }
  .poz { flex: 1 1 30%; min-width: 150px; border: 1px solid #E5E7EB; border-radius: 6px; padding: 6px 8px; }
  .poz .e { color: #6B7280; font-size: 10px; }
  .poz .w { font-weight: bold; font-size: 12px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 10px; }
  th { background: #E8A020; color: #fff; padding: 5px 6px; text-align: left; }
  td { padding: 4px 6px; border-bottom: 1px solid #E5E7EB; vertical-align: top; white-space: pre-line; }
  tr:nth-child(even) td { background: #f9fafb; }
  td.l, th.l { text-align: right; white-space: nowrap; }
  tr.suma td { font-weight: bold; border-top: 2px solid #1a1a1a; background: #fff; }
  p { margin: 3px 0; line-height: 1.45; }
  .rysunek { border: 1px solid #E5E7EB; border-radius: 6px; overflow: hidden; }
  .rysunek svg { display: block; width: 100%; height: auto; }
  .stopka { color: #9CA3AF; font-size: 9px; margin-top: 18px; border-top: 1px solid #E5E7EB; padding-top: 6px; }
`;

function htmlBloku(blok: BlokPdf): string {
  if (blok.typ === 'dane') {
    if (blok.pozycje.length === 0) return '';
    return `<div class="dane">${blok.pozycje
      .map((p) => `<div class="poz"><div class="e">${escapeHtml(p.etykieta)}</div><div class="w">${escapeHtml(p.wartosc)}</div></div>`)
      .join('')}</div>`;
  }
  if (blok.typ === 'tekst') {
    return blok.linie.map((l) => `<p>${escapeHtml(l)}</p>`).join('');
  }
  if (blok.typ === 'svg') return `<div class="rysunek">${blok.svg}</div>`;
  const kl = (i: number) => (blok.liczbowe?.includes(i) ? ' class="l"' : '');
  const wiersz = (komorki: string[], klasa = '') => `<tr${klasa}>${komorki.map((k, i) => `<td${kl(i)}>${escapeHtml(k)}</td>`).join('')}</tr>`;
  if (blok.wiersze.length === 0) return '<p style="color:#6B7280;font-style:italic">Brak pozycji.</p>';
  return `<table><thead><tr>${blok.naglowki.map((n, i) => `<th${kl(i)}>${escapeHtml(n)}</th>`).join('')}</tr></thead><tbody>${
    blok.wiersze.map((w) => wiersz(w)).join('')
  }${blok.suma ? wiersz(blok.suma, ' class="suma"') : ''}</tbody></table>`;
}

export function htmlDokumentu(dokument: DokumentPdf, wygenerowano: Date = new Date()): string {
  const sekcje = dokument.sekcje
    .map((s) => `<div class="sekcja"><h2>${escapeHtml(s.tytul)}</h2>${s.bloki.map(htmlBloku).join('')}</div>`)
    .join('');
  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"/><title>${escapeHtml(dokument.tytul)}</title><style>${STYL}</style></head>
<body>
  <div class="naglowek">
    <h1>${escapeHtml(dokument.tytul)}</h1>
    ${dokument.podtytul ? `<div class="podtytul">${escapeHtml(dokument.podtytul)}</div>` : ''}
  </div>
  ${sekcje}
  <p class="stopka">Wygenerowano: ${escapeHtml(wygenerowano.toLocaleString('pl-PL'))} | Kalkulator MMA</p>
</body>
</html>`;
}
