// ============================================================
// GENERATOR PDF – Raport dnia roboczego
// ============================================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Plan, WpisLive, DzialkaRobocza } from '../types';
import { obliczWynikiDzialki, obliczLacznaDlugosc, formatLiczby } from './calculations';
import { formatujDatePl, formatujDateKrotko } from './dates';
import { formatujPikietaz } from './chainage';

interface GenerujPDFOptions {
  plan: Plan;
  wpisyLive: WpisLive[];
  mieszanki: Array<{ id: string; rodzaj: string; ciezarObjetosciowy: number }>;
}

export async function generujRaportPDF({ plan, wpisyLive, mieszanki }: GenerujPDFOptions): Promise<void> {
  const getMieszanka = (id: string) => mieszanki.find((m) => m.id === id);

  const stylePDF = `
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; margin: 20px; }
    h1 { font-size: 18px; color: #E8A020; border-bottom: 2px solid #E8A020; padding-bottom: 6px; }
    h2 { font-size: 14px; color: #2E86AB; margin-top: 18px; }
    h3 { font-size: 12px; color: #6B7280; margin-top: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background-color: #E8A020; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; }
    td { padding: 5px 8px; border-bottom: 1px solid #E5E7EB; font-size: 11px; }
    tr:nth-child(even) { background-color: #f9fafb; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 10px; }
    .info-row { display: flex; justify-content: space-between; padding: 3px 0; }
    .info-label { color: #6B7280; }
    .info-val { font-weight: bold; }
    .section-box { border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; margin-top: 10px; }
    .green { color: #22C55E; } .red { color: #EF4444; }
    .rzut-label { background: #E8A020; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
    @media print { .page-break { page-break-before: always; } }
  `;

  const wierszeDzialek = plan.dzialki.map((dz) => {
    const mie = getMieszanka(dz.mieszankaId);
    const wyniki = mie ? obliczWynikiDzialki(dz, mie.ciezarObjetosciowy, plan.tonazAuta) : null;
    const wpisyDzialki = wpisyLive.filter((w) => w.dzialkaId === dz.id);
    const sumaTonLive = wpisyDzialki.reduce((s, w) => s + w.tonazPrzywieziony, 0);
    const sumaMetrLive = wpisyDzialki.reduce((s, w) => s + w.przejechaneMetry, 0);
    const srednia = wpisyDzialki.length > 0 ? sumaTonLive / wpisyDzialki.length : 0;

    const tabelaAut = wpisyDzialki.map((wp) => `
      <tr>
        <td>${wp.numerAuta}</td>
        <td>${formatLiczby(wp.tonazPrzywieziony)} Mg</td>
        <td>${formatLiczby(wp.przejechaneMetry)} m</td>
        <td>${wp.godzinaWybudowania}</td>
        <td>${wp.komentarz ?? '–'}</td>
      </tr>
    `).join('');

    return `
      <h2>Działka: ${dz.nazwa}</h2>
      <div class="section-box">
        <div class="info-row"><span class="info-label">Mieszanka</span><span class="info-val">${mie?.rodzaj ?? '–'}</span></div>
        <div class="info-row"><span class="info-label">Ciężar obj.</span><span class="info-val">${mie?.ciezarObjetosciowy.toFixed(3) ?? '–'} t/m³</span></div>
        <div class="info-row"><span class="info-label">Grubość</span><span class="info-val">${dz.grubosc} cm</span></div>
        ${wyniki ? `
          <div class="info-row"><span class="info-label">Powierzchnia planu</span><span class="info-val">${formatLiczby(wyniki.lacznaPowierzchnia)} m²</span></div>
          <div class="info-row"><span class="info-label">Masa planu</span><span class="info-val">${formatLiczby(wyniki.lacznaIloscMasy, 3)} Mg</span></div>
        ` : ''}
        ${wpisyDzialki.length > 0 ? `
          <div class="info-row"><span class="info-label">Wbudowano faktycznie</span><span class="info-val">${formatLiczby(sumaTonLive, 2)} Mg</span></div>
          <div class="info-row"><span class="info-label">Metrów wykonano</span><span class="info-val">${formatLiczby(sumaMetrLive)} m</span></div>
          <div class="info-row"><span class="info-label">Aut przybyło</span><span class="info-val">${wpisyDzialki.length}</span></div>
          ${wyniki ? `
            <div class="info-row">
              <span class="info-label">Bilans masy</span>
              <span class="info-val ${sumaTonLive - wyniki.lacznaIloscMasy > 0 ? 'red' : 'green'}">
                ${sumaTonLive > wyniki.lacznaIloscMasy ? '+' : ''}${formatLiczby(sumaTonLive - wyniki.lacznaIloscMasy, 2)} Mg
              </span>
            </div>
          ` : ''}
        ` : '<p style="color:#6B7280">Brak wpisów Live dla tej działki.</p>'}
      </div>

      ${wpisyDzialki.length > 0 ? `
        <h3>Tabela aut – ${dz.nazwa}</h3>
        <table>
          <thead><tr><th>#Auto</th><th>Tonaż</th><th>Metry</th><th>Godz.</th><th>Komentarz</th></tr></thead>
          <tbody>${tabelaAut}</tbody>
        </table>
      ` : ''}
    `;
  }).join('');

  const totalMasaPlan = plan.dzialki.reduce((sum, dz) => {
    const m = getMieszanka(dz.mieszankaId);
    if (!m) return sum;
    return sum + obliczWynikiDzialki(dz, m.ciezarObjetosciowy, plan.tonazAuta).lacznaIloscMasy;
  }, 0);
  const totalMasaLive = wpisyLive.reduce((s, w) => s + w.tonazPrzywieziony, 0);
  const totalMetrLive = wpisyLive.reduce((s, w) => s + w.przejechaneMetry, 0);

  const html = `
    <!DOCTYPE html>
    <html lang="pl">
    <head><meta charset="utf-8"/><style>${stylePDF}</style></head>
    <body>
      <h1>Raport dnia roboczego – Kalkulator MMA</h1>
      <div class="section-box">
        <div class="info-row"><span class="info-label">Data wbudowywania</span><span class="info-val">${formatujDatePl(plan.dataWbudowywania)}</span></div>
        <div class="info-row"><span class="info-label">Liczba działek</span><span class="info-val">${plan.dzialki.length}</span></div>
        <div class="info-row"><span class="info-label">Tonaż auta</span><span class="info-val">${plan.tonazAuta} t</span></div>
        <div class="info-row"><span class="info-label">Łączna masa (plan)</span><span class="info-val">${formatLiczby(totalMasaPlan, 2)} Mg</span></div>
        ${wpisyLive.length > 0 ? `
          <div class="info-row"><span class="info-label">Wbudowano faktycznie</span><span class="info-val">${formatLiczby(totalMasaLive, 2)} Mg</span></div>
          <div class="info-row"><span class="info-label">Łącznie metrów</span><span class="info-val">${formatLiczby(totalMetrLive)} m</span></div>
          <div class="info-row">
            <span class="info-label">Bilans końcowy</span>
            <span class="info-val ${totalMasaLive > totalMasaPlan ? 'red' : 'green'}">
              ${totalMasaLive > totalMasaPlan ? '+' : ''}${formatLiczby(totalMasaLive - totalMasaPlan, 2)} Mg
            </span>
          </div>
        ` : ''}
      </div>

      ${wierszeDzialek}

      <p style="color:#9CA3AF; font-size:10px; margin-top:20px;">
        Wygenerowano: ${new Date().toLocaleString('pl-PL')} | Kalkulator MMA
      </p>
    </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Udostępnij raport PDF' });
}
