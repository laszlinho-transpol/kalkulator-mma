// ============================================================
// GENERATOR PDF – Raport dnia roboczego (rozszerzone kolumny)
// ============================================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Plan, WpisLive } from '../types';
import { obliczWynikiDzialki, obliczPowierzchnioweOdStartu, formatLiczby } from './calculations';
import { formatujDatePl } from './dates';

interface GenerujPDFOptions {
  plan: Plan;
  wpisyLive: WpisLive[];
  mieszanki: Array<{ id: string; rodzaj: string; ciezarObjetosciowy: number; wytwórnia?: string }>;
  budowa?: { kodBudowy: string; nazwaInwestycji: string };
}

export async function generujRaportPDF({ plan, wpisyLive, mieszanki, budowa }: GenerujPDFOptions): Promise<void> {
  const getMieszanka = (id: string) => mieszanki.find((m) => m.id === id);

  const stylePDF = `
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; margin: 16px; }
    h1 { font-size: 16px; color: #E8A020; border-bottom: 2px solid #E8A020; padding-bottom: 5px; margin-bottom: 12px; }
    h2 { font-size: 13px; color: #2E86AB; margin-top: 16px; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px; }
    th { background-color: #E8A020; color: #fff; padding: 5px 6px; text-align: center; }
    td { padding: 4px 6px; border-bottom: 1px solid #E5E7EB; text-align: center; }
    tr:nth-child(even) td { background-color: #f9fafb; }
    .info-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #f0f0f0; }
    .lbl { color: #6B7280; }
    .val { font-weight: bold; }
    .section-box { border: 1px solid #E5E7EB; border-radius: 6px; padding: 10px; margin-top: 8px; }
    .green { color: #22C55E; font-weight: bold; }
    .red { color: #EF4444; font-weight: bold; }
    .orange { color: #E8A020; font-weight: bold; }
    .footer { color: #9CA3AF; font-size: 9px; margin-top: 14px; }
  `;

  // Oblicz grubość dla każdego wiersza
  const obliczGruboscWiersza = (
    wpisy: WpisLive[],
    idxW: number,
    dz: typeof plan.dzialki[0],
    ciezar: number,
  ): number => {
    const w = wpisy[idxW];
    const pow = obliczPowierzchnioweOdStartu(dz, w.przejechaneMetry);
    return pow > 0 ? (w.tonazPrzywieziony / (ciezar * pow)) * 100 : 0;
  };

  const wierszeDzialek = plan.dzialki.map((dz) => {
    const mie = getMieszanka(dz.mieszankaId);
    const wyniki = mie ? obliczWynikiDzialki(dz, mie.ciezarObjetosciowy, plan.tonazAuta) : null;
    const wpisyDz = wpisyLive.filter((w) => w.dzialkaId === dz.id);
    const sumaTon = wpisyDz.reduce((s, w) => s + w.tonazPrzywieziony, 0);
    const sumaMetr = wpisyDz.reduce((s, w) => s + w.przejechaneMetry, 0);

    // Śr. grubość łączna
    const powLaczna = mie ? obliczPowierzchnioweOdStartu(dz, sumaMetr) : 0;
    const srGrubosc = powLaczna > 0 && mie ? (sumaTon / (mie.ciezarObjetosciowy * powLaczna)) * 100 : 0;

    // Wiersze tabeli z narastającymi
    let cumTon = 0, cumMetr = 0;
    const wierszeTbl = wpisyDz.map((wp, idxW) => {
      cumTon += wp.tonazPrzywieziony;
      cumMetr += wp.przejechaneMetry;
      const gr = mie ? obliczGruboscWiersza(wpisyDz, idxW, dz, mie.ciezarObjetosciowy) : 0;

      // Średnia narastająca
      const powDotad = mie ? obliczPowierzchnioweOdStartu(dz, cumMetr) : 0;
      const srGrDotad = powDotad > 0 && mie ? (cumTon / (mie.ciezarObjetosciowy * powDotad)) * 100 : 0;

      const przepal = gr > dz.grubosc + 0.2;
      const niedomiar = gr < dz.grubosc - 0.2;
      const strzalka = przepal ? '▲' : niedomiar ? '▼' : '';
      const grKolor = przepal ? 'color:#EF4444' : niedomiar ? 'color:#F59E0B' : 'color:#22C55E';

      return `<tr>
        <td>${wp.numerAuta}</td>
        <td>${formatLiczby(wp.tonazPrzywieziony)}</td>
        <td>${formatLiczby(cumTon, 2)}</td>
        <td>${formatLiczby(wp.przejechaneMetry)}</td>
        <td>${formatLiczby(cumMetr)}</td>
        <td style="${grKolor}">${gr > 0 ? `${formatLiczby(gr)} ${strzalka}` : '–'}</td>
        <td style="color:#E8A020;font-weight:bold">${srGrDotad > 0 ? formatLiczby(srGrDotad) : '–'}</td>
        <td>${wp.godzinaWybudowania}</td>
        <td style="font-style:italic">${wp.komentarz ?? '–'}</td>
      </tr>`;
    }).join('');

    return `
      <h2>Działka: ${dz.nazwa}</h2>
      <div class="section-box">
        <div class="info-row"><span class="lbl">Mieszanka</span><span class="val">${mie?.rodzaj ?? '–'} (ρ = ${mie?.ciezarObjetosciowy.toFixed(3) ?? '–'} t/m³)</span></div>
        <div class="info-row"><span class="lbl">Grubość projektowana</span><span class="val">${dz.grubosc} cm</span></div>
        ${wyniki ? `<div class="info-row"><span class="lbl">Masa planu</span><span class="val">${formatLiczby(wyniki.lacznaIloscMasy, 3)} Mg</span></div>` : ''}
        ${wpisyDz.length > 0 ? `
          <div class="info-row"><span class="lbl">Wbudowano faktycznie</span><span class="val orange">${formatLiczby(sumaTon, 2)} Mg</span></div>
          <div class="info-row"><span class="lbl">Metrów wykonano</span><span class="val">${formatLiczby(sumaMetr)} m</span></div>
          <div class="info-row"><span class="lbl">Aut przybyło</span><span class="val">${wpisyDz.length}</span></div>
          <div class="info-row"><span class="lbl">Śr. grubość</span><span class="val ${Math.abs(srGrubosc - dz.grubosc) > 0.3 ? 'red' : 'green'}">${srGrubosc > 0 ? formatLiczby(srGrubosc) + ' cm' : '–'}</span></div>
          ${wyniki ? `<div class="info-row"><span class="lbl">Bilans masy</span><span class="val ${sumaTon > wyniki.lacznaIloscMasy ? 'red' : 'green'}">${sumaTon > wyniki.lacznaIloscMasy ? '+' : ''}${formatLiczby(sumaTon - wyniki.lacznaIloscMasy, 2)} Mg</span></div>` : ''}
        ` : '<p style="color:#6B7280;font-style:italic">Brak wpisów Live dla tej działki.</p>'}
      </div>
      ${wpisyDz.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>#Auto</th><th>Tonaż Mg</th><th>∑ Mg</th><th>Metry m</th><th>∑ m</th>
              <th>Grubość cm</th><th>Śr.gr. cm</th><th>Godz.</th><th>Komentarz</th>
            </tr>
          </thead>
          <tbody>${wierszeTbl}</tbody>
        </table>
      ` : ''}
    `;
  }).join('');

  const totalMasaPlan = plan.dzialki.reduce((s, dz) => {
    const m = getMieszanka(dz.mieszankaId);
    return m ? s + obliczWynikiDzialki(dz, m.ciezarObjetosciowy, plan.tonazAuta).lacznaIloscMasy : s;
  }, 0);
  const totalMasaLive = wpisyLive.reduce((s, w) => s + w.tonazPrzywieziony, 0);
  const totalMetrLive = wpisyLive.reduce((s, w) => s + w.przejechaneMetry, 0);
  const bilansFinalny = totalMasaLive - totalMasaPlan;

  const html = `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"/><style>${stylePDF}</style></head>
<body>
  <h1>Raport dnia roboczego – Kalkulator MMA</h1>
  ${budowa ? `<div class="section-box" style="border-color:#2E86AB"><div class="info-row"><span class="lbl">Budowa</span><span class="val">${budowa.kodBudowy} – ${budowa.nazwaInwestycji}</span></div></div>` : ''}
  <div class="section-box">
    <div class="info-row"><span class="lbl">Data wbudowywania</span><span class="val">${formatujDatePl(plan.dataWbudowywania)}</span></div>
    <div class="info-row"><span class="lbl">Liczba działek</span><span class="val">${plan.dzialki.length}</span></div>
    <div class="info-row"><span class="lbl">Tonaż auta</span><span class="val">${plan.tonazAuta} t</span></div>
    <div class="info-row"><span class="lbl">Łączna masa (plan)</span><span class="val">${formatLiczby(totalMasaPlan, 2)} Mg</span></div>
    ${wpisyLive.length > 0 ? `
      <div class="info-row"><span class="lbl">Wbudowano faktycznie</span><span class="val orange">${formatLiczby(totalMasaLive, 2)} Mg</span></div>
      <div class="info-row"><span class="lbl">Łącznie metrów</span><span class="val">${formatLiczby(totalMetrLive)} m</span></div>
      <div class="info-row"><span class="lbl">Bilans końcowy</span><span class="val ${bilansFinalny > 0 ? 'red' : 'green'}">${bilansFinalny > 0 ? '+' : ''}${formatLiczby(bilansFinalny, 2)} Mg</span></div>
    ` : ''}
  </div>
  ${wierszeDzialek}
  <p class="footer">Wygenerowano: ${new Date().toLocaleString('pl-PL')} | Kalkulator MMA</p>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Udostępnij raport PDF' });
}
