// ============================================================
// GENERATOR INTERAKTYWNEGO HTML – offline kalkulator + tryb LIVE
// ============================================================

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Plan, WpisLive } from '../types';
import { formatujDatePl } from './dates';
import { formatLiczby, obliczTabeleAutPlanu } from './calculations';
import { obliczPodsumowaniePlanuDnia, budujSegmentyPlanu } from './planCiagly';
import { HTML_LIVE_SCRIPT } from './htmlLiveScript';

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

  const wpisy = (opcje?.wpisyLive ?? []).filter((w) => w.planId === plan.id).map((w, i) => ({
    _lid: w.id || `w${i}`,
    dzialkaId: w.dzialkaId,
    numerAuta: w.numerAuta,
    tonazPrzywieziony: w.tonazPrzywieziony,
    przejechaneMetry: w.przejechaneMetry,
    komentarz: w.komentarz,
    godzinaWybudowania: w.godzinaWybudowania,
  }));

  const ciezarPoMieszance = (mId: string) => mieszankiMap[mId]?.ciezarObjetosciowy;
  const tabeleAut = obliczTabeleAutPlanu(plan.dzialki, plan.rzuty ?? [], plan.tonazAuta, ciezarPoMieszance);
  const podsumowanieDnia = obliczPodsumowaniePlanuDnia(plan, ciezarPoMieszance, tabeleAut);
  const segmentyPlanu = budujSegmentyPlanu(plan.dzialki, ciezarPoMieszance);

  return {
    wersja: '3.1',
    plan,
    mieszanki: mieszankiMap,
    wpisyLive: wpisy,
    sesjeLive: [] as { planId: string; dzialkaId: string; zakonczona: boolean }[],
    autorRaportu: opcje?.autor ?? '',
    wygenerowano: new Date().toISOString(),
    podsumowanieDnia,
    segmentyPlanu,
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
  .live-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
  .live-tab { flex: 1; min-width: 80px; padding: 10px 8px; border-radius: 20px; border: 1px solid var(--border); background: #252535; color: var(--muted); font-weight: 600; font-size: 12px; cursor: pointer; }
  .live-tab.active { border-color: var(--green); background: rgba(34,197,94,0.15); color: var(--green); }
  .bilans-card { border-color: var(--green) !important; background: rgba(34,197,94,0.08) !important; }
  .bilans-card h2 { color: var(--green) !important; }
  .aktywna-dz { color: var(--green); font-weight: 600; font-size: 13px; margin-top: 8px; }
  .card-aktywna { border-color: var(--green) !important; border-width: 2px !important; }
  .live-tabela { margin-top: 10px; }
  .btn-mini { background: #3b82f6; color: #fff; border: none; border-radius: 6px; padding: 4px 8px; font-size: 12px; cursor: pointer; }
  .btn-danger-mini { background: var(--red); }
  .komentarz { font-size: 11px; color: var(--muted); font-style: italic; }
  .zakres-aut { font-size: 12px; color: var(--muted); margin-top: 8px; }
  .pusty { color: var(--muted); text-align: center; padding: 20px; }
  #live-opis { color: var(--muted); font-size: 13px; margin-bottom: 8px; }
  .pole-szare { background: #252535; border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; font-size: 16px; color: var(--muted); margin-top: 4px; }
  .karta-podsumowanie { border-color: var(--primary) !important; background: rgba(232,160,32,0.08) !important; }
  .karta-podsumowanie h2 { color: var(--primary) !important; }
  .fab { position: fixed; bottom: 16px; left: 16px; right: 16px; max-width: 568px; margin: 0 auto; z-index: 100; }
  .modal-tlo { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:200; align-items:flex-end; justify-content:center; }
  .modal-tlo.open { display:flex; }
  .modal-karta { background:var(--card); border-radius:20px 20px 0 0; padding:24px; width:100%; max-width:600px; border:1px solid var(--border); }
  .live-podsum { border: 1px solid #3b82f6; background: rgba(59,130,246,0.1); border-radius: 10px; padding: 12px; margin-top: 12px; }
  .szkic-wrap { max-height: 42vh; min-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 10px; background: #0a0a12; padding: 8px 4px; }
  .szkic-tresc { position: relative; margin-left: 28px; margin-right: 48px; }
  .szkic-fig { position: absolute; left: 0; right: 0; display: flex; align-items: stretch; }
  .szkic-pasek { flex: 1; background: rgba(232,160,32,0.08); border: 1.5px solid #E8A020; border-radius: 4px; position: relative; overflow: hidden; min-width: 40px; }
  .szkic-pass { position: absolute; bottom: 0; left: 0; right: 0; background: #000; }
  .szkic-nr { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); font-weight: 800; font-size: 11px; z-index: 1; }
  .szkic-m { position: absolute; right: -44px; top: 2px; font-size: 9px; color: var(--muted); }
  .szkic-dz-label { position: absolute; left: -4px; right: 0; font-size: 9px; font-weight: 700; color: var(--primary); border-top: 1px dashed var(--primary); padding-top: 2px; }
  .szkic-truck { position: absolute; left: -26px; background: #E8A020; color: #1a1a1a; border: none; border-radius: 4px; padding: 2px 5px; font-size: 10px; font-weight: 800; cursor: pointer; z-index: 3; }
  .szkic-paver { position: absolute; left: -4px; right: -4px; height: 2px; background: #E8A020; z-index: 2; }
  .btn-secondary { background: #555; }
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
<div class="card karta-podsumowanie">
  <h2>Podsumowanie całego dnia</h2>
  <div class="row"><span class="label">Działki robocze</span><span class="val">${dane.podsumowanieDnia.liczbaDzialek}</span></div>
  <div class="row"><span class="label">Łączna masa do wbudowania</span><span class="val bold-primary">${formatLiczby(dane.podsumowanieDnia.lacznaMasa, 3)} Mg</span></div>
  <div class="row"><span class="label">Łączna powierzchnia</span><span class="val">${formatLiczby(dane.podsumowanieDnia.lacznaPowierzchnia)} m²</span></div>
  <div class="row"><span class="label">Łącznie metrów</span><span class="val">${formatLiczby(dane.podsumowanieDnia.laczneMetry)} m</span></div>
  <div class="row"><span class="label">Samochodów (plan)</span><span class="val">${dane.podsumowanieDnia.lacznaIloscAut}</span></div>
</div>
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
  <div class="card">
    <h2>Kontrola całego dnia</h2>
    <p style="color:var(--muted);font-size:13px;margin-bottom:12px">Wpisz łączne tony i metry od startu pierwszej działki – program pokaże pozycję na całym odcinku.</p>
    <label>Wbudowane tony [Mg]<input type="number" id="tony_plan" step="0.01" oninput="obliczKontrolePlanu()" /></label>
    <label style="margin-top:10px;display:block">Gdzie powinniśmy dojechać</label>
    <div class="pole-szare" id="metry_planowane">— wpisz tony powyżej —</div>
    <label style="margin-top:10px;display:block">Przejechane metry [m] od startu<input type="number" id="metry_plan" step="0.1" oninput="obliczKontrolePlanu()" /></label>
    <div id="wynik_plan" style="margin-top:12px"></div>
  </div>
</div>

<div id="tab-tabela" class="tab-content">
${(() => {
  const tabele = obliczTabeleAutPlanu(
    plan.dzialki,
    plan.rzuty ?? [],
    plan.tonazAuta,
    (mId) => mieszanki.find((m) => m.id === mId)?.ciezarObjetosciowy,
  );
  let html = '<div class="card"><h2>Całość – ciągła numeracja aut</h2><table><thead><tr><th>#</th><th>Mg</th><th>∑ Mg</th><th>m</th><th>∑ m</th></tr></thead><tbody>';
  for (const w of tabele.calosc) {
    html += '<tr><td>' + w.numerAuta + '</td><td>' + w.masa.toFixed(2) + '</td><td>' + w.masaNarastajaco.toFixed(2) + '</td><td>' + w.metry.toFixed(2) + '</td><td>' + w.metryNarastajaco.toFixed(2) + '</td></tr>';
  }
  html += '</tbody></table></div>';
  for (const td of tabele.dzialki) {
    html += '<div class="card"><h2>' + td.nazwa + ' – auta ' + td.numerAutaOd + '–' + td.numerAutaDo + '</h2><table><thead><tr><th>#</th><th>Mg</th><th>∑ Mg</th><th>m</th><th>∑ m</th></tr></thead><tbody>';
    for (const w of td.wiersze) {
      html += '<tr><td>' + w.numerAuta + '</td><td>' + w.masa.toFixed(2) + '</td><td>' + w.masaNarastajaco.toFixed(2) + '</td><td>' + w.metry.toFixed(2) + '</td><td>' + w.metryNarastajaco.toFixed(2) + '</td></tr>';
    }
    html += '</tbody></table></div>';
  }
  return html;
})()}
</div>

<div id="tab-live" class="tab-content">
  <p style="color:var(--muted);font-size:13px;margin-bottom:12px">Tryb LIVE jak w aplikacji – jeden szkic planu dnia, metry rozdzielają się między działki. Dane w localStorage.</p>
  <div id="live-bilans"></div>
  <div id="live-szkic"></div>
  <div id="live-lista"></div>
  <div class="card" id="live-form">
    <h2 id="live-form-tytul">Nowe auto</h2>
    <p id="live-opis"></p>
    <label>Tonaż [Mg]<input type="number" id="live-ton" step="0.01" oninput="aktualizujMetryPlanowaneLive()" /></label>
    <div id="live-gdzie-label" style="margin-top:10px">
      <span style="color:var(--muted);font-size:13px;font-weight:600">Gdzie powinniśmy dojechać</span>
      <div class="pole-szare" id="live-metry-planowane">— wpisz tonaż powyżej —</div>
    </div>
    <div class="live-tabs" id="live-tryb-metrow" style="margin-top:10px">
      <button type="button" class="live-tab active" id="tab-met-zauta" onclick="przelaczTrybMetrowLive('zAuta')">Metry z auta</button>
      <button type="button" class="live-tab" id="tab-met-odstartu" onclick="przelaczTrybMetrowLive('odStartu')">Od startu planu</button>
    </div>
    <label style="margin-top:8px;display:block"><span id="live-met-label">Przejechane metry z auta [m]</span><input type="number" id="live-met" step="0.1" oninput="aktualizujMetryAuto()" /></label>
    <div id="live-metry-auto-wrap" style="margin-top:8px">
      <span id="live-metry-auto-label" style="color:var(--muted);font-size:13px;font-weight:600">Odległość od startu (auto)</span>
      <div class="pole-szare" id="live-metry-auto">—</div>
    </div>
    <label style="margin-top:8px;display:block">Godzina<input type="text" id="live-godz" placeholder="HH:MM" maxlength="5" /></label>
    <label style="margin-top:8px;display:block">Komentarz<input type="text" id="live-kom" /></label>
    <button class="btn btn-success" onclick="dodajWpisLive()">+ Dodaj auto</button>
    <button class="btn" style="background:#555;margin-top:6px;display:none" id="btn-anuluj-edycje" onclick="anulujEdycjeLive()">Anuluj edycję</button>
  </div>
  <div class="card" style="border-color:var(--red);background:rgba(239,68,68,0.06)">
    <h2 style="color:var(--red)">Zakończenie dniówki</h2>
    <p style="color:var(--muted);font-size:13px;margin-bottom:12px">Wyczyść wszystkie wpisy LIVE i zacznij od nowa, lub podpisz raport poniżej.</p>
    <button class="btn btn-secondary" onclick="wyczyscLivePlanu()">🗑 Wyczyść LIVE</button>
  </div>
</div>

<div class="modal-tlo" id="modal-auto" onclick="if(event.target===this)zamknijModalAuta()">
  <div class="modal-karta">
    <h2 id="modal-auto-tytul" style="margin-bottom:12px">Auto</h2>
    <div id="modal-auto-tresc"></div>
    <button class="btn btn-secondary" style="margin-top:16px" onclick="zamknijModalAuta()">Zamknij</button>
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
${HTML_LIVE_SCRIPT}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector('[onclick="switchTab(\\''+name+'\\')"]').classList.add('active');
  document.getElementById('tab-'+name).classList.add('active');
  if (name === 'live') renderLive();
}

function obliczKontrolePlanu() {
  const tony = parseFloat(document.getElementById('tony_plan').value) || 0;
  const metry = parseFloat(document.getElementById('metry_plan').value) || 0;
  const seg = MMA.segmentyPlanu || [];
  const elPlan = document.getElementById('metry_planowane');
  const elWynik = document.getElementById('wynik_plan');
  if (tony <= 0) {
    elPlan.textContent = '— wpisz tony powyżej —';
    elWynik.innerHTML = '';
    return;
  }
  const metryWgTon = metryOdMasyPlanu(seg, tony);
  elPlan.textContent = metryWgTon.toFixed(2) + ' m od startu';
  if (metry <= 0) { elWynik.innerHTML = ''; return; }

  const lacznaDl = round2(seg.reduce((s, x) => s + x.dl, 0));
  let lacznaPowPlan = 0, masaPlanWgGr = 0, grWaga = 0;
  for (const dz of PLAN.dzialki) {
    const mie = MIESZANKI[dz.mieszankaId]; if (!mie) continue;
    let powPlan = 0;
    for (const f of dz.figury) {
      if (f.typ === 'prostokat') powPlan += f.szerokosc * f.dlugosc;
      else if (f.typ === 'trapez') powPlan += ((f.szerokosc1 + f.szerokosc2) / 2) * f.dlugosc;
      else if (f.typ === 'trojkat') powPlan += (f.szerokosc * f.dlugosc) / 2;
      else if (f.typ === 'pierscien') powPlan += f.szerokosc * ((f.dlugoscZewnetrzna + f.dlugoscWewnetrzna) / 2);
      else if (f.typ === 'wjazd') powPlan += f.L * f.s + (f.R1 ** 2 + f.R2 ** 2) * 0.2146;
    }
    const gr = dz.gruboscWbudowywania || dz.grubosc;
    lacznaPowPlan += round2(powPlan);
    masaPlanWgGr += powPlan * (gr / 100) * mie.ciezarObjetosciowy;
    grWaga += powPlan * gr;
  }
  lacznaPowPlan = round2(lacznaPowPlan);
  const sredniaGruboscPlanu = lacznaPowPlan > 0 ? round2(grWaga / lacznaPowPlan) : 0;

  const zakrytaPow = powierzchniaOdMetrowPlanu(seg, metry);
  const lok = lokalizacjaNaPlanie(seg, metry);

  let denGr = 0, numGr = 0, cum = 0;
  for (const s of seg) {
    const doM = Math.min(s.dl, Math.max(0, metry - cum));
    if (doM > 0) {
      const pow = doM * (s.masaNaM / (s.ciezar * (s.grubosc / 100)));
      numGr += pow * s.grubosc * s.ciezar;
      denGr += pow * s.ciezar;
    }
    cum += s.dl;
    if (cum >= metry) break;
  }
  const uzyskanaGrubosc = zakrytaPow > 0 && denGr > 0 ? round2((tony / denGr) * 100) : 0;

  let sredniCiezar = 0, wPow = 0; cum = 0;
  for (const s of seg) {
    const doM = Math.min(s.dl, Math.max(0, metry - cum));
    if (doM > 0) {
      const pow = doM * (s.masaNaM / (s.ciezar * (s.grubosc / 100)));
      sredniCiezar += s.ciezar * pow;
      wPow += pow;
    }
    cum += s.dl;
  }
  const rho = wPow > 0 ? sredniCiezar / wPow : (seg[0]?.ciezar ?? 2.4);
  const masaWgPlanuNaZakrytej = round3(zakrytaPow * (sredniaGruboscPlanu / 100) * rho);
  const bilans = round3(tony - masaWgPlanuNaZakrytej);
  const pozostaloMetrow = round2(Math.max(0, lacznaDl - metry));
  const pozostaloPowierzchni = round2(Math.max(0, lacznaPowPlan - zakrytaPow));
  const srGr = uzyskanaGrubosc > 0 ? uzyskanaGrubosc : sredniaGruboscPlanu;
  const pozostaloMasyWgZalozen = round3(pozostaloPowierzchni * (sredniaGruboscPlanu / 100) * rho);
  const pozostaloMasyWgSredniej = round3(pozostaloPowierzchni * (srGr / 100) * rho);
  const czyOszcz = bilans < 0;

  let html = '';
  if (lok) {
    html += '<div class="row"><span class="label">Pozycja na planie</span><span class="val">' + lok.dzialkaNazwa + ', ' + lok.metryWDzialce.toFixed(2) + ' m w działce</span></div>';
  }
  html += '<div class="row"><span class="label">Metry od startu (fakt)</span><span class="val">' + (lok ? lok.metryGlobalne.toFixed(2) : metry.toFixed(2)) + ' m</span></div>';
  html += '<div class="row"><span class="label">Metry od startu (wg ton)</span><span class="val">' + metryWgTon.toFixed(2) + ' m</span></div>';
  html += '<div class="row"><span class="label">Zakryta powierzchnia</span><span class="val">' + zakrytaPow.toFixed(2) + ' m²</span></div>';
  html += '<div class="row"><span class="label">Uzyskana grubość</span><span class="val">' + uzyskanaGrubosc.toFixed(2) + ' cm</span></div>';
  html += '<div class="' + (czyOszcz ? 'wynik-green' : 'wynik-red') + '" style="margin-top:8px">Bilans masy: ' + (bilans > 0 ? '+' : '') + bilans.toFixed(2) + ' Mg</div>';
  html += '<div class="row" style="margin-top:12px"><span class="label">Do końca metrów (plan)</span><span class="val">' + pozostaloMetrow.toFixed(2) + ' m</span></div>';
  html += '<div class="row"><span class="label">Do wbudowania pow.</span><span class="val">' + pozostaloPowierzchni.toFixed(2) + ' m²</span></div>';
  html += '<div class="row"><span class="label">Do wbudowania wg planu (' + sredniaGruboscPlanu.toFixed(2) + ' cm)</span><span class="val">' + pozostaloMasyWgZalozen.toFixed(2) + ' Mg</span></div>';
  html += '<div class="row"><span class="label">Do wbudowania wg śr. (' + uzyskanaGrubosc.toFixed(2) + ' cm)</span><span class="val">' + pozostaloMasyWgSredniej.toFixed(2) + ' Mg</span></div>';
  elWynik.innerHTML = html;
}

function metryOdMasyPlanu(segmenty, masaMg) {
  if (masaMg <= 0) return 0;
  const seg = segmenty.map(s => ({ ...s }));
  let masaPozost = masaMg, metry = 0, i = 0;
  while (masaPozost > 0.0001 && i < seg.length) {
    const s = seg[i];
    if (s.masaNaM <= 0 || s.pozostalo <= 0) { i++; continue; }
    const maxM = s.pozostalo * s.masaNaM;
    const zuzyj = Math.min(masaPozost, maxM);
    const m = s.masaNaM > 0 ? zuzyj / s.masaNaM : 0;
    metry = round2(metry + m);
    s.pozostalo = round2(s.pozostalo - m);
    masaPozost = round3(masaPozost - zuzyj);
    if (s.pozostalo <= 0.001) i++;
  }
  return metry;
}

function powierzchniaOdMetrowPlanu(segmenty, metryGlobalne) {
  let pow = 0, metryCum = 0;
  for (const s of segmenty) {
    if (metryCum + s.dl <= metryGlobalne) {
      pow += s.dl * (s.masaNaM / (s.ciezar * (s.grubosc / 100)));
      metryCum += s.dl;
    } else {
      const ulamek = s.dl > 0 ? (metryGlobalne - metryCum) / s.dl : 0;
      pow += s.dl * ulamek * (s.masaNaM / (s.ciezar * (s.grubosc / 100)));
      break;
    }
  }
  return round2(Math.max(0, pow));
}

function lokalizacjaNaPlanie(segmenty, metryGlobalne) {
  if (!segmenty.length || metryGlobalne < 0) return null;
  let cum = 0;
  for (const s of segmenty) {
    if (cum + s.dl >= metryGlobalne - 0.001) {
      return { dzialkaNazwa: s.nazwa, metryWDzialce: round2(metryGlobalne - cum), metryGlobalne: round2(metryGlobalne) };
    }
    cum += s.dl;
  }
  const ostatni = segmenty[segmenty.length - 1];
  const laczna = round2(segmenty.reduce((a, x) => a + x.dl, 0));
  return { dzialkaNazwa: ostatni.nazwa, metryWDzialce: ostatni.dl, metryGlobalne: laczna };
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
  MMA.sesjeLive = SESJE;
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
  Wygenerowano: ${new Date().toLocaleString('pl-PL')} | Kalkulator MMA HTML v3.1
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
