// ============================================================
// GENERATOR INTERAKTYWNEGO HTML – samodzielny offline kalkulator
// ============================================================

import { writeAsStringAsync, EncodingType } from 'expo-file-system';
import { Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Plan } from '../types';
import { formatujDatePl } from './dates';
import { formatLiczby } from './calculations';

export async function generujInteraktywnyHTML(
  plan: Plan,
  mieszanki: Array<{ id: string; rodzaj: string; ciezarObjetosciowy: number; wytwórnia?: string }>,
): Promise<void> {
  const mieszankiMap: Record<string, typeof mieszanki[0]> = {};
  for (const m of mieszanki) mieszankiMap[m.id] = m;

  const planJSON = JSON.stringify(plan);
  const mieszankiJSON = JSON.stringify(mieszankiMap);

  const html = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Kalkulator MMA – ${formatujDatePl(plan.dataWbudowywania)}</title>
<style>
  :root { --primary: #E8A020; --bg: #0f0f1a; --card: #1e1e2e; --text: #f0f0f0; --muted: #9ca3af; --border: #374151; --green: #22c55e; --red: #ef4444; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; padding: 16px; max-width: 600px; margin: 0 auto; }
  h1 { color: var(--primary); font-size: 20px; margin-bottom: 4px; }
  h2 { font-size: 15px; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
  .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
  .row:last-child { border-bottom: none; }
  .label { color: var(--muted); }
  .val { font-weight: 700; }
  .bold-primary { color: var(--primary); font-weight: 800; font-size: 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
  th { background: var(--primary); color: #fff; padding: 6px; text-align: center; }
  td { padding: 5px; border-bottom: 1px solid var(--border); text-align: center; }
  .rzut-header { background: rgba(232,160,32,0.2); padding: 4px 8px; font-weight: 700; font-size: 11px; color: var(--primary); }
  /* Kontrola */
  input[type=number] { background: #252535; border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; font-size: 16px; color: var(--text); width: 100%; margin-top: 4px; }
  .wynik-green { background: rgba(34,197,94,0.15); border-radius: 8px; padding: 10px; text-align: center; color: var(--green); font-weight: 700; }
  .wynik-red { background: rgba(239,68,68,0.15); border-radius: 8px; padding: 10px; text-align: center; color: var(--red); font-weight: 700; }
  .btn { background: var(--primary); color: #fff; border: none; border-radius: 10px; padding: 12px 24px; font-size: 15px; font-weight: 700; cursor: pointer; width: 100%; margin-top: 8px; }
  .tab-bar { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 16px; }
  .tab { flex: 1; padding: 12px; text-align: center; cursor: pointer; font-weight: 600; font-size: 14px; color: var(--muted); }
  .tab.active { color: var(--primary); border-bottom: 2.5px solid var(--primary); }
  .tab-content { display: none; }
  .tab-content.active { display: block; }
  .logo { font-size: 12px; color: var(--muted); margin-bottom: 16px; }
</style>
</head>
<body>
<h1>⬛ Kalkulator MMA</h1>
<p class="logo">Plan: ${formatujDatePl(plan.dataWbudowywania)}</p>

<div class="tab-bar">
  <div class="tab active" onclick="switchTab('plan')">Plan</div>
  <div class="tab" onclick="switchTab('kontrola')">Kontrola</div>
  <div class="tab" onclick="switchTab('tabela')">Tabela aut</div>
</div>

<!-- TAB: PLAN -->
<div id="tab-plan" class="tab-content active">
${plan.dzialki.map((dz) => {
  const mie = mieszankiMap[dz.mieszankaId];
  if (!mie) return '';
  const pow = dz.figury.reduce((s: number, f: any) => {
    if (f.typ === 'prostokat') return s + f.szerokosc * f.dlugosc;
    if (f.typ === 'trapez') return s + ((f.szerokosc1 + f.szerokosc2) / 2) * f.dlugosc;
    if (f.typ === 'trojkat') return s + (f.szerokosc * f.dlugosc) / 2;
    if (f.typ === 'pierscien') return s + f.szerokosc * ((f.dlugoscZewnetrzna + f.dlugoscWewnetrzna) / 2);
    if (f.typ === 'wjazd') return s + f.L * f.s + (f.R1 ** 2 + f.R2 ** 2) * 0.2146;
    return s;
  }, 0);
  const masa = pow * (dz.grubosc / 100) * mie.ciezarObjetosciowy;
  const auta = Math.ceil(masa / plan.tonazAuta);
  return `
  <div class="card">
    <h2>${dz.nazwa}</h2>
    <div class="row"><span class="label">Mieszanka</span><span class="val">${mie.rodzaj}</span></div>
    <div class="row"><span class="label">Ciężar obj.</span><span class="val">${mie.ciezarObjetosciowy.toFixed(3)} t/m³</span></div>
    <div class="row"><span class="label">Grubość</span><span class="val">${dz.grubosc} cm</span></div>
    <div class="row"><span class="label">Figury</span><span class="val">${dz.figury.length}</span></div>
    <div class="row"><span class="label">Powierzchnia</span><span class="val">${pow.toFixed(2)} m²</span></div>
    <div class="row"><span class="label">Masa</span><span class="val bold-primary">${masa.toFixed(3)} Mg</span></div>
    <div class="row"><span class="label">Samochodów</span><span class="val">${auta}</span></div>
  </div>`;
}).join('')}
</div>

<!-- TAB: KONTROLA -->
<div id="tab-kontrola" class="tab-content">
${plan.dzialki.map((dz, dIdx) => {
  const mie = mieszankiMap[dz.mieszankaId];
  if (!mie) return '';
  return `
  <div class="card">
    <h2>${dz.nazwa} – Szybka kontrola</h2>
    <label>Wbudowane tony [Mg]<input type="number" id="tony_${dIdx}" step="0.01" placeholder="0.00" oninput="obliczKontrolę(${dIdx})" /></label>
    <label style="margin-top:10px;display:block">Przejechane metry [m]<input type="number" id="metry_${dIdx}" step="0.1" placeholder="0.0" oninput="obliczKontrolę(${dIdx})" /></label>
    <div id="wynik_${dIdx}" style="margin-top:12px"></div>
  </div>`;
}).join('')}
</div>

<!-- TAB: TABELA AUT -->
<div id="tab-tabela" class="tab-content">
${plan.dzialki.map((dz, dIdx) => {
  const mie = mieszankiMap[dz.mieszankaId];
  if (!mie) return '';
  const pow = dz.figury.reduce((s: number, f: any) => {
    if (f.typ === 'prostokat') return s + f.szerokosc * f.dlugosc;
    if (f.typ === 'trapez') return s + ((f.szerokosc1 + f.szerokosc2) / 2) * f.dlugosc;
    if (f.typ === 'trojkat') return s + (f.szerokosc * f.dlugosc) / 2;
    if (f.typ === 'pierscien') return s + f.szerokosc * ((f.dlugoscZewnetrzna + f.dlugoscWewnetrzna) / 2);
    if (f.typ === 'wjazd') return s + f.L * f.s + (f.R1 ** 2 + f.R2 ** 2) * 0.2146;
    return s;
  }, 0);
  const len = dz.figury.reduce((s: number, f: any) => {
    if (f.typ === 'prostokat' || f.typ === 'trapez' || f.typ === 'trojkat') return s + (f.dlugosc ?? 0);
    if (f.typ === 'pierscien') return s + ((f.dlugoscZewnetrzna + f.dlugoscWewnetrzna) / 2);
    if (f.typ === 'wjazd') return s + (f.L ?? 0);
    return s;
  }, 0);
  const masa = pow * (dz.grubosc / 100) * mie.ciezarObjetosciowy;
  const rzuty = plan.rzuty && plan.rzuty.length > 0 ? plan.rzuty : [{ numerRzutu: 1, iloscSamochodow: Math.ceil(masa / plan.tonazAuta) }];
  let rows = '';
  let cumMasa = 0; let cumMetry = 0; let nr = 0;
  const metryNaTone = masa > 0 ? len / masa : 0;
  for (const rzut of rzuty) {
    rows += `<tr><td colspan="5" class="rzut-header">RZUT ${rzut.numerRzutu}</td></tr>`;
    for (let i = 0; i < rzut.iloscSamochodow; i++) {
      nr++;
      const mAuto = Math.min(plan.tonazAuta, masa - cumMasa);
      cumMasa = Math.round((cumMasa + mAuto) * 1000) / 1000;
      const mMetry = Math.round(mAuto * metryNaTone * 100) / 100;
      cumMetry = Math.round((cumMetry + mMetry) * 100) / 100;
      rows += `<tr><td>${nr}</td><td>${mAuto.toFixed(2)}</td><td>${cumMasa.toFixed(2)}</td><td>${mMetry.toFixed(2)}</td><td>${cumMetry.toFixed(2)}</td></tr>`;
    }
  }
  return `
  <div class="card">
    <h2>${dz.nazwa} – Tabela aut</h2>
    <div class="row"><span class="label">Do wbudowania</span><span class="val">${masa.toFixed(2)} Mg</span></div>
    <table>
      <thead><tr><th>#</th><th>Mg</th><th>∑ Mg</th><th>m</th><th>∑ m</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}).join('')}
</div>

<script>
const PLAN = ${planJSON};
const MIESZANKI = ${mieszankiJSON};

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector('[onclick="switchTab(\\''+name+'\\')"]').classList.add('active');
  document.getElementById('tab-'+name).classList.add('active');
}

function obliczKontrolę(dzIdx) {
  const dz = PLAN.dzialki[dzIdx];
  const mie = MIESZANKI[dz.mieszankaId];
  if (!mie) return;
  const tony = parseFloat(document.getElementById('tony_'+dzIdx).value) || 0;
  const metry = parseFloat(document.getElementById('metry_'+dzIdx).value) || 0;
  if (tony <= 0 || metry <= 0) { document.getElementById('wynik_'+dzIdx).innerHTML=''; return; }

  // Oblicz powierzchnię od startu do metry
  let pow = 0, cumM = 0;
  for (const f of dz.figury) {
    let len = f.dlugosc || f.L || ((f.dlugoscZewnetrzna+f.dlugoscWewnetrzna)/2) || 0;
    let fpow = 0;
    if (f.typ==='prostokat') fpow = f.szerokosc*f.dlugosc;
    else if (f.typ==='trapez') fpow = ((f.szerokosc1+f.szerokosc2)/2)*f.dlugosc;
    else if (f.typ==='trojkat') fpow = (f.szerokosc*f.dlugosc)/2;
    else if (f.typ==='pierscien') { len=(f.dlugoscZewnetrzna+f.dlugoscWewnetrzna)/2; fpow=f.szerokosc*len; }
    else if (f.typ==='wjazd') { len=f.L; fpow=f.L*f.s+(f.R1**2+f.R2**2)*0.2146; }
    if (cumM + len <= metry) { pow += fpow; cumM += len; }
    else { const frac = len>0?(metry-cumM)/len:0; pow += fpow*frac; break; }
  }
  pow = Math.round(pow*100)/100;

  const grubosc_uz = pow>0 ? Math.round((tony/(mie.ciezarObjetosciowy*pow))*10000)/100 : 0;
  const masa_plan = Math.round(pow*(dz.grubosc/100)*mie.ciezarObjetosciowy*1000)/1000;
  const bilans = Math.round((tony-masa_plan)*1000)/1000;
  const czyOszcz = bilans < 0;

  const totalMetry = dz.figury.reduce((s,f)=>{
    if(f.typ==='pierscien') return s+(f.dlugoscZewnetrzna+f.dlugoscWewnetrzna)/2;
    return s+(f.dlugosc||f.L||0);
  },0);
  const totalPow = dz.figury.reduce((s,f)=>{
    if(f.typ==='prostokat') return s+f.szerokosc*f.dlugosc;
    if(f.typ==='trapez') return s+((f.szerokosc1+f.szerokosc2)/2)*f.dlugosc;
    if(f.typ==='trojkat') return s+(f.szerokosc*f.dlugosc)/2;
    if(f.typ==='pierscien') return s+f.szerokosc*(f.dlugoscZewnetrzna+f.dlugoscWewnetrzna)/2;
    if(f.typ==='wjazd') return s+f.L*f.s+(f.R1**2+f.R2**2)*0.2146;
    return s;
  },0);

  const pozostMetry = Math.max(0,totalMetry-metry);
  const pozostPow = Math.max(0,totalPow-pow);
  const pozostMasaPlan = Math.round(pozostPow*(dz.grubosc/100)*mie.ciezarObjetosciowy*1000)/1000;
  const pozostMasaSr = Math.round(pozostPow*(grubosc_uz/100)*mie.ciezarObjetosciowy*1000)/1000;

  document.getElementById('wynik_'+dzIdx).innerHTML = \`
    <div class="row"><span class="label">Zakryta powierzchnia</span><span class="val">\${pow.toFixed(2)} m²</span></div>
    <div class="row"><span class="label">Uzyskana grubość</span><span class="val" style="color:\${Math.abs(grubosc_uz-dz.grubosc)>0.3?'#ef4444':'#22c55e'}">\${grubosc_uz.toFixed(2)} cm \${grubosc_uz>dz.grubosc?'▲':grubosc_uz<dz.grubosc?'▼':''}</span></div>
    <div class="\${czyOszcz?'wynik-green':'wynik-red'}" style="margin:8px 0">Bilans: \${bilans>0?'+':''}\${bilans.toFixed(2)} Mg (\${czyOszcz?'oszczędność':'przepał'})</div>
    <div class="row"><span class="label">Pozostało metrów</span><span class="val">\${pozostMetry.toFixed(1)} m</span></div>
    <div class="row"><span class="label">Do wbudowania (plan \${dz.grubosc}cm)</span><span class="val">\${pozostMasaPlan.toFixed(2)} Mg</span></div>
    <div class="row"><span class="label">Do wbudowania (śr. grubość)</span><span class="val">\${pozostMasaSr.toFixed(2)} Mg</span></div>
  \`;
}
</script>
<p style="color:#4b5563;font-size:11px;text-align:center;margin-top:20px">
  Wygenerowano: ${new Date().toLocaleString('pl-PL')} | Kalkulator MMA
</p>
</body>
</html>`;

  const fileName = `plan_mma_${plan.dataWbudowywania.slice(0, 10)}.html`;
  const filePath = `${Paths.cache.uri}${fileName}`;
  await writeAsStringAsync(filePath, html, { encoding: EncodingType.UTF8 });
  await Sharing.shareAsync(filePath, { mimeType: 'text/html', dialogTitle: 'Udostępnij interaktywny plan HTML' });
}

/**
 * Eksportuje plan jako JSON i udostępnia przez system share sheet
 */
export async function eksportujJSON(
  plan: Plan,
  mieszanki: Array<{ id: string; rodzaj: string; ciezarObjetosciowy: number }>,
): Promise<void> {
  const dane = { wersja: '1.0', eksportowano: new Date().toISOString(), plan, mieszanki };
  const json = JSON.stringify(dane, null, 2);
  const fileName = `plan_mma_${plan.dataWbudowywania.slice(0, 10)}.json`;
  const filePath = `${Paths.cache.uri}${fileName}`;
  await writeAsStringAsync(filePath, json, { encoding: EncodingType.UTF8 });
  await Sharing.shareAsync(filePath, { mimeType: 'application/json', dialogTitle: 'Eksportuj plan JSON' });
}
