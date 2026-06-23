// ============================================================
// GENERATOR INTERAKTYWNEGO HTML – offline kalkulator + tryb LIVE
// ============================================================

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Plan, WpisLive } from '../types';
import { formatujDatePl } from './dates';
import { formatLiczby } from './calculations';

export interface OpcjeEksportuHTML {
  autor?: string;
  wpisyLive?: WpisLive[];
}

function budujDaneEksportu(
  plan: Plan,
  mieszanki: Array<{ id: string; rodzaj: string; ciezarObjetosciowy: number; wytwórnia?: string }>,
  opcje?: OpcjeEksportuHTML,
) {
  const mieszankiMap: Record<string, typeof mieszanki[0]> = {};
  for (const m of mieszanki) mieszankiMap[m.id] = m;

  const wpisy = (opcje?.wpisyLive ?? []).filter((w) => w.planId === plan.id).map((w) => ({
    dzialkaId: w.dzialkaId,
    numerAuta: w.numerAuta,
    tonazPrzywieziony: w.tonazPrzywieziony,
    przejechaneMetry: w.przejechaneMetry,
    komentarz: w.komentarz,
    godzinaWybudowania: w.godzinaWybudowania,
  }));

  return {
    wersja: '2.0',
    plan,
    mieszanki: mieszankiMap,
    wpisyLive: wpisy,
    autorRaportu: opcje?.autor ?? '',
    wygenerowano: new Date().toISOString(),
  };
}

export async function generujInteraktywnyHTML(
  plan: Plan,
  mieszanki: Array<{ id: string; rodzaj: string; ciezarObjetosciowy: number; wytwórnia?: string }>,
  opcje?: OpcjeEksportuHTML,
): Promise<void> {
  const dane = budujDaneEksportu(plan, mieszanki, opcje);
  const daneJSON = JSON.stringify(dane).replace(/</g, '\\u003c');

  const html = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Kalkulator MMA – ${formatujDatePl(plan.dataWbudowywania)}</title>
<style>
  :root { --primary: #E8A020; --bg: #0f0f1a; --card: #1e1e2e; --text: #f0f0f0; --muted: #9ca3af; --border: #374151; --green: #22c55e; --red: #ef4444; }
  * { box-sizing: border-box; margin: 0; padding: 0; word-break: normal; overflow-wrap: break-word; }
  body { background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; padding: 16px; max-width: 600px; margin: 0 auto; padding-bottom: 80px; }
  h1 { color: var(--primary); font-size: 20px; margin-bottom: 4px; }
  h2 { font-size: 15px; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
  .row { display: flex; justify-content: space-between; gap: 8px; padding: 5px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
  .row:last-child { border-bottom: none; }
  .label { color: var(--muted); flex-shrink: 0; }
  .val { font-weight: 700; text-align: right; }
  .bold-primary { color: var(--primary); font-weight: 800; font-size: 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
  th { background: var(--primary); color: #fff; padding: 6px; text-align: center; }
  td { padding: 5px; border-bottom: 1px solid var(--border); text-align: center; }
  .rzut-header { background: rgba(232,160,32,0.2); padding: 4px 8px; font-weight: 700; font-size: 11px; color: var(--primary); }
  input[type=number], input[type=text], input[type=time] { background: #252535; border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; font-size: 16px; color: var(--text); width: 100%; margin-top: 4px; }
  .wynik-green { background: rgba(34,197,94,0.15); border-radius: 8px; padding: 10px; text-align: center; color: var(--green); font-weight: 700; }
  .wynik-red { background: rgba(239,68,68,0.15); border-radius: 8px; padding: 10px; text-align: center; color: var(--red); font-weight: 700; }
  .btn { background: var(--primary); color: #fff; border: none; border-radius: 10px; padding: 12px 24px; font-size: 15px; font-weight: 700; cursor: pointer; width: 100%; margin-top: 8px; }
  .btn-danger { background: var(--red); }
  .btn-success { background: var(--green); }
  .tab-bar { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 16px; overflow-x: auto; }
  .tab { flex: 1; min-width: 70px; padding: 12px 6px; text-align: center; cursor: pointer; font-weight: 600; font-size: 13px; color: var(--muted); white-space: nowrap; }
  .tab.active { color: var(--primary); border-bottom: 2.5px solid var(--primary); }
  .tab-content { display: none; }
  .tab-content.active { display: block; }
  .logo { font-size: 12px; color: var(--muted); margin-bottom: 16px; }
  .autor-info { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
  .live-wpis { border: 1px solid var(--border); border-radius: 8px; padding: 10px; margin-bottom: 8px; }
  .fab { position: fixed; bottom: 16px; left: 16px; right: 16px; max-width: 568px; margin: 0 auto; z-index: 100; }
  .modal-tlo { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:200; align-items:flex-end; justify-content:center; }
  .modal-tlo.open { display:flex; }
  .modal-karta { background:var(--card); border-radius:20px 20px 0 0; padding:24px; width:100%; max-width:600px; border:1px solid var(--border); }
</style>
</head>
<body>
<h1>⬛ Kalkulator MMA</h1>
<p class="logo">Plan: ${formatujDatePl(plan.dataWbudowywania)}</p>
<p class="autor-info" id="autor-info">${dane.autorRaportu ? `Autor raportu: <strong>${dane.autorRaportu}</strong>` : 'Raport do wypełnienia na budowie'}</p>

<div class="tab-bar">
  <div class="tab active" onclick="switchTab('plan')">Plan</div>
  <div class="tab" onclick="switchTab('kontrola')">Kontrola</div>
  <div class="tab" onclick="switchTab('tabela')">Tabela aut</div>
  <div class="tab" onclick="switchTab('live')">● Live</div>
</div>

<div id="tab-plan" class="tab-content active">
${plan.dzialki.map((dz) => {
  const mie = dane.mieszanki[dz.mieszankaId];
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
    <div class="row"><span class="label">Grubość</span><span class="val">${dz.grubosc} cm</span></div>
    <div class="row"><span class="label">Masa</span><span class="val bold-primary">${masa.toFixed(3)} Mg</span></div>
    <div class="row"><span class="label">Samochodów</span><span class="val">${auta}</span></div>
  </div>`;
}).join('')}
</div>

<div id="tab-kontrola" class="tab-content">
${plan.dzialki.map((dz, dIdx) => `
  <div class="card">
    <h2>${dz.nazwa} – Szybka kontrola</h2>
    <label>Wbudowane tony [Mg]<input type="number" id="tony_${dIdx}" step="0.01" oninput="obliczKontrolę(${dIdx})" /></label>
    <label style="margin-top:10px;display:block">Przejechane metry [m]<input type="number" id="metry_${dIdx}" step="0.1" oninput="obliczKontrolę(${dIdx})" /></label>
    <div id="wynik_${dIdx}" style="margin-top:12px"></div>
  </div>`).join('')}
</div>

<div id="tab-tabela" class="tab-content">
${plan.dzialki.map((dz, dIdx) => {
  const mie = dane.mieszanki[dz.mieszankaId];
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
  const rzuty = plan.rzuty?.length ? plan.rzuty : [{ numerRzutu: 1, iloscSamochodow: Math.ceil(masa / plan.tonazAuta) }];
  let rows = '';
  let cumMasa = 0, cumMetry = 0, nr = 0;
  const metryNaTone = masa > 0 ? len / masa : 0;
  for (const rzut of rzuty) {
    rows += '<tr><td colspan="5" class="rzut-header">RZUT ' + rzut.numerRzutu + '</td></tr>';
    for (let i = 0; i < rzut.iloscSamochodow; i++) {
      nr++;
      const mAuto = Math.min(plan.tonazAuta, masa - cumMasa);
      cumMasa = Math.round((cumMasa + mAuto) * 1000) / 1000;
      const mMetry = Math.round(mAuto * metryNaTone * 100) / 100;
      cumMetry = Math.round((cumMetry + mMetry) * 100) / 100;
      rows += '<tr><td>' + nr + '</td><td>' + mAuto.toFixed(2) + '</td><td>' + cumMasa.toFixed(2) + '</td><td>' + mMetry.toFixed(2) + '</td><td>' + cumMetry.toFixed(2) + '</td></tr>';
    }
  }
  return '<div class="card"><h2>' + dz.nazwa + ' – Tabela aut</h2><table><thead><tr><th>#</th><th>Mg</th><th>∑ Mg</th><th>m</th><th>∑ m</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}).join('')}
</div>

<div id="tab-live" class="tab-content">
  <p style="color:var(--muted);font-size:13px;margin-bottom:12px">Wpisuj dane z wywrotek na budowie. Na koniec dnia podpisz raport i wyślij plik z powrotem.</p>
  <div id="live-selektor"></div>
  <div id="live-lista"></div>
  <div class="card" id="live-form">
    <h2 id="live-form-tytul">Nowe auto</h2>
    <label>Tonaż [Mg]<input type="number" id="live-ton" step="0.01" /></label>
    <label style="margin-top:8px;display:block">Metry [m]<input type="number" id="live-met" step="0.1" /></label>
    <label style="margin-top:8px;display:block">Godzina<input type="text" id="live-godz" placeholder="HH:MM" maxlength="5" /></label>
    <label style="margin-top:8px;display:block">Komentarz<input type="text" id="live-kom" /></label>
    <button class="btn btn-success" onclick="dodajWpisLive()">+ Dodaj auto</button>
    <button class="btn" style="background:#555;margin-top:6px;display:none" id="btn-anuluj-edycje" onclick="anulujEdycjeLive()">Anuluj edycję</button>
  </div>
</div>

<div class="fab">
  <button class="btn" onclick="otworzModalPodpisu()">✍ Podpisz i zapisz raport</button>
</div>

<div class="modal-tlo" id="modal-podpis" onclick="if(event.target===this)zamknijModalPodpisu()">
  <div class="modal-karta">
    <h2 style="margin-bottom:12px">Podpis raportu</h2>
    <p style="color:var(--muted);font-size:13px;margin-bottom:12px">Podaj imię i nazwisko osoby odpowiedzialnej za raport z budowy.</p>
    <label>Autor raportu<input type="text" id="input-autor" placeholder="np. Jan Kowalski" /></label>
    <button class="btn btn-success" style="margin-top:16px" onclick="zapiszPodpisanyRaport()">Zapisz i pobierz plik HTML</button>
    <button class="btn" style="background:#555;margin-top:8px" onclick="zamknijModalPodpisu()">Anuluj</button>
  </div>
</div>

<script type="application/json" id="mma-export-data">${daneJSON}</script>
<script>
const MMA = JSON.parse(document.getElementById('mma-export-data').textContent);
const PLAN = MMA.plan;
const MIESZANKI = MMA.mieszanki;
let WPISY = MMA.wpisyLive || [];
let AKTYWNA_DZIALKA = 0;
let EDYCJA_IDX = -1;
const KLUCZ_LS = 'mma_live_' + PLAN.id;

function zaladujZPamieci() {
  try {
    const z = localStorage.getItem(KLUCZ_LS);
    if (z) WPISY = JSON.parse(z);
  } catch(e) {}
}
function zapiszDoPamieci() {
  try { localStorage.setItem(KLUCZ_LS, JSON.stringify(WPISY)); } catch(e) {}
}
zaladujZPamieci();

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector('[onclick="switchTab(\\''+name+'\\')"]').classList.add('active');
  document.getElementById('tab-'+name).classList.add('active');
  if (name === 'live') renderLive();
}

function obliczKontrolę(dzIdx) {
  const dz = PLAN.dzialki[dzIdx];
  const mie = MIESZANKI[dz.mieszankaId];
  if (!mie) return;
  const tony = parseFloat(document.getElementById('tony_'+dzIdx).value) || 0;
  const metry = parseFloat(document.getElementById('metry_'+dzIdx).value) || 0;
  if (tony <= 0 || metry <= 0) { document.getElementById('wynik_'+dzIdx).innerHTML=''; return; }
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
  document.getElementById('wynik_'+dzIdx).innerHTML = '<div class="row"><span class="label">Uzyskana grubość</span><span class="val">' + grubosc_uz.toFixed(2) + ' cm</span></div><div class="' + (czyOszcz?'wynik-green':'wynik-red') + '">Bilans: ' + (bilans>0?'+':'') + bilans.toFixed(2) + ' Mg</div>';
}

function wpisyDlaDzialki(dzId) {
  return WPISY.filter(w => w.dzialkaId === dzId);
}

function renderLive() {
  const sel = document.getElementById('live-selektor');
  if (PLAN.dzialki.length > 1) {
    sel.innerHTML = '<div class="card" style="display:flex;gap:8px;flex-wrap:wrap">' +
      PLAN.dzialki.map((dz,i) => '<button class="btn" style="width:auto;flex:1;min-width:80px;background:' + (i===AKTYWNA_DZIALKA?'var(--primary)':'#333') + '" onclick="wybierzDz('+i+')">' + dz.nazwa + '</button>').join('') + '</div>';
  } else { sel.innerHTML = ''; }
  const dz = PLAN.dzialki[AKTYWNA_DZIALKA];
  const lista = wpisyDlaDzialki(dz.id);
  let html = '';
  lista.forEach((w, idx) => {
    html += '<div class="live-wpis"><div class="row"><span class="label">Auto #' + w.numerAuta + '</span><span class="val">' + w.tonazPrzywieziony + ' Mg / ' + w.przejechaneMetry + ' m</span></div>';
    html += '<div style="font-size:12px;color:var(--muted)">Godz. ' + w.godzinaWybudowania + (w.komentarz?' • '+w.komentarz:'') + '</div>';
    html += '<div style="margin-top:8px;display:flex;gap:8px"><button class="btn" style="width:auto;flex:1;background:#3b82f6;font-size:13px;padding:8px" onclick="edytujWpisLive('+idx+')">✎ Edytuj</button>';
    html += '<button class="btn btn-danger" style="width:auto;flex:1;font-size:13px;padding:8px" onclick="usunWpisLive('+idx+')">Usuń</button></div></div>';
  });
  document.getElementById('live-lista').innerHTML = html || '<p style="color:var(--muted);text-align:center;padding:20px">Brak wpisów – dodaj pierwsze auto poniżej.</p>';
  document.getElementById('live-form-tytul').textContent = EDYCJA_IDX >= 0 ? 'Edycja auta #' + lista[EDYCJA_IDX]?.numerAuta : 'Auto #' + (lista.length + 1);
}

function wybierzDz(i) { AKTYWNA_DZIALKA = i; EDYCJA_IDX = -1; wyczyscFormLive(); renderLive(); }

function wyczyscFormLive() {
  document.getElementById('live-ton').value = '';
  document.getElementById('live-met').value = '';
  document.getElementById('live-godz').value = '';
  document.getElementById('live-kom').value = '';
  document.getElementById('btn-anuluj-edycje').style.display = 'none';
}

function dodajWpisLive() {
  const dz = PLAN.dzialki[AKTYWNA_DZIALKA];
  const ton = parseFloat(document.getElementById('live-ton').value);
  const met = parseFloat(document.getElementById('live-met').value);
  const godz = document.getElementById('live-godz').value || new Date().toTimeString().slice(0,5);
  const kom = document.getElementById('live-kom').value;
  if (!ton || !met) { alert('Podaj tonaż i metry.'); return; }
  const lista = wpisyDlaDzialki(dz.id);
  if (EDYCJA_IDX >= 0) {
    const w = lista[EDYCJA_IDX];
    const globalIdx = WPISY.indexOf(w);
    WPISY[globalIdx] = { ...w, tonazPrzywieziony: ton, przejechaneMetry: met, godzinaWybudowania: godz, komentarz: kom || undefined };
    EDYCJA_IDX = -1;
  } else {
    WPISY.push({ dzialkaId: dz.id, numerAuta: lista.length + 1, tonazPrzywieziony: ton, przejechaneMetry: met, godzinaWybudowania: godz, komentarz: kom || undefined });
  }
  zapiszDoPamieci();
  wyczyscFormLive();
  renderLive();
}

function edytujWpisLive(idx) {
  const dz = PLAN.dzialki[AKTYWNA_DZIALKA];
  const w = wpisyDlaDzialki(dz.id)[idx];
  EDYCJA_IDX = idx;
  document.getElementById('live-ton').value = w.tonazPrzywieziony;
  document.getElementById('live-met').value = w.przejechaneMetry;
  document.getElementById('live-godz').value = w.godzinaWybudowania;
  document.getElementById('live-kom').value = w.komentarz || '';
  document.getElementById('btn-anuluj-edycje').style.display = 'block';
  renderLive();
}

function anulujEdycjeLive() { EDYCJA_IDX = -1; wyczyscFormLive(); renderLive(); }

function usunWpisLive(idx) {
  const dz = PLAN.dzialki[AKTYWNA_DZIALKA];
  const w = wpisyDlaDzialki(dz.id)[idx];
  if (!confirm('Usunąć auto #' + w.numerAuta + '?')) return;
  WPISY = WPISY.filter(x => x !== w);
  zapiszDoPamieci();
  renderLive();
}

function otworzModalPodpisu() {
  document.getElementById('input-autor').value = MMA.autorRaportu || '';
  document.getElementById('modal-podpis').classList.add('open');
}
function zamknijModalPodpisu() { document.getElementById('modal-podpis').classList.remove('open'); }

function zapiszPodpisanyRaport() {
  const autor = document.getElementById('input-autor').value.trim();
  if (!autor) { alert('Podaj autora raportu.'); return; }
  MMA.autorRaportu = autor;
  MMA.wpisyLive = WPISY;
  MMA.podpisano = new Date().toISOString();
  document.getElementById('mma-export-data').textContent = JSON.stringify(MMA);
  document.getElementById('autor-info').innerHTML = 'Autor raportu: <strong>' + autor + '</strong> • ' + new Date().toLocaleString('pl-PL');
  const html = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'raport_mma_' + PLAN.dataWbudowywania.slice(0,10) + '.html';
  a.click();
  zamknijModalPodpisu();
  alert('Raport zapisany. Wyślij plik z powrotem do biura.');
}
</script>
<p style="color:#4b5563;font-size:11px;text-align:center;margin-top:20px">
  Wygenerowano: ${new Date().toLocaleString('pl-PL')} | Kalkulator MMA v2.0
</p>
</body>
</html>`;

  const fileName = `plan_mma_${plan.dataWbudowywania.slice(0, 10)}.html`;
  const doc = new File(Paths.document, fileName);
  doc.write(html);
  await Sharing.shareAsync(doc.uri, { mimeType: 'text/html', dialogTitle: 'Udostępnij interaktywny plan HTML' });
}

export async function eksportujJSON(
  plan: Plan,
  mieszanki: Array<{ id: string; rodzaj: string; ciezarObjetosciowy: number; wytwórnia?: string }>,
  wpisyLive?: WpisLive[],
): Promise<void> {
  const dane = {
    wersja: '2.0',
    eksportowano: new Date().toISOString(),
    plan,
    mieszanki,
    wpisyLive: wpisyLive?.filter((w) => w.planId === plan.id) ?? [],
  };
  const json = JSON.stringify(dane, null, 2);
  const fileName = `plan_mma_${plan.dataWbudowywania.slice(0, 10)}.json`;
  const doc = new File(Paths.document, fileName);
  doc.write(json);
  await Sharing.shareAsync(doc.uri, { mimeType: 'application/json', dialogTitle: 'Eksportuj plan JSON' });
}
