/** JavaScript trybu LIVE w eksporcie HTML – logika jak w aplikacji (liveProgress) */
export const HTML_LIVE_SCRIPT = `
function round2(n){return Math.round(n*100)/100;}
function round3(n){return Math.round(n*1000)/1000;}
function sumaMetrowDz(wpisy,dzId){return round2(wpisy.filter(w=>w.dzialkaId===dzId).reduce((s,w)=>s+w.przejechaneMetry,0));}
function lacznaDlugoscDz(dz){return round2(dz.figury.reduce((s,f)=>s+(f.dlugosc||f.L||((f.dlugoscZewnetrzna+f.dlugoscWewnetrzna)/2)||0),0));}
function liczAut(wpisy){return wpisy.length?new Set(wpisy.map(w=>w.numerAuta)).size:0;}
function nastepnyNr(wpisy){return liczAut(wpisy)+1;}
function przenumeruj(wpisy){
  if(!wpisy.length)return wpisy;
  const stare=[...new Set(wpisy.map(w=>w.numerAuta))].sort((a,b)=>a-b);
  const mapa=new Map(stare.map((s,i)=>[s,i+1]));
  return [...wpisy].sort((a,b)=>a.numerAuta-b.numerAuta||0).map(w=>({...w,numerAuta:mapa.get(w.numerAuta)}));
}
function czyDzWypelniona(dz,wpisy){return sumaMetrowDz(wpisy,dz.id)>=lacznaDlugoscDz(dz)-0.001;}
function czyDzZakonczona(dzId,wpisy){
  const k=PLAN.id+':'+dzId;
  if(SESJE.some(s=>s.planId+':'+s.dzialkaId===k&&s.zakonczona))return true;
  const dz=PLAN.dzialki.find(d=>d.id===dzId);
  return dz?czyDzWypelniona(dz,wpisy):false;
}
function znajdzAktywna(wpisy){
  for(let i=0;i<PLAN.dzialki.length;i++){
    const dz=PLAN.dzialki[i];
    if(!czyDzZakonczona(dz.id,wpisy))return {idx:i,dzialka:dz};
  }
  return null;
}
function rozdzielMetry(wpisy,metry,ton){
  const ak=znajdzAktywna(wpisy);
  if(!ak||metry<=0||ton<=0)return [];
  const seg=[]; let poz=metry;
  for(let i=ak.idx;i<PLAN.dzialki.length&&poz>0.001;i++){
    const dz=PLAN.dzialki[i];
    if(czyDzZakonczona(dz.id,wpisy))continue;
    const juz=sumaMetrowDz(wpisy,dz.id);
    const wolne=round2(Math.max(0,lacznaDlugoscDz(dz)-juz));
    if(wolne<=0.001)continue;
    const na=round2(Math.min(poz,wolne));
    seg.push({dzialkaId:dz.id,dzialkaIdx:i,metry:na,tonaz:0});
    poz=round2(poz-na);
  }
  const sm=seg.reduce((s,x)=>s+x.metry,0);
  if(sm<=0)return [];
  let tr=0;
  for(let i=0;i<seg.length;i++){
    if(i===seg.length-1)seg[i].tonaz=round2(ton-tr);
    else{seg[i].tonaz=round2(ton*(seg[i].metry/sm));tr=round3(tr+seg[i].tonaz);}
  }
  return seg;
}
function bilansPlanu(wpisy){
  let ton=0,met=0,zakr=0,powP=0,pozM=0,num=0,den=0;
  for(const dz of PLAN.dzialki){
    const mie=MIESZANKI[dz.mieszankaId]; if(!mie)continue;
    const wD=wpisy.filter(w=>w.dzialkaId===dz.id);
    const tD=wD.reduce((s,w)=>s+w.tonazPrzywieziony,0);
    const mD=wD.reduce((s,w)=>s+w.przejechaneMetry,0);
    let powD=0,cum=0;
    for(const f of dz.figury){
      let len=f.dlugosc||f.L||((f.dlugoscZewnetrzna+f.dlugoscWewnetrzna)/2)||0;
      let fp=0;
      if(f.typ==='prostokat')fp=f.szerokosc*f.dlugosc;
      else if(f.typ==='trapez')fp=((f.szerokosc1+f.szerokosc2)/2)*f.dlugosc;
      else if(f.typ==='trojkat')fp=(f.szerokosc*f.dlugosc)/2;
      else if(f.typ==='pierscien'){len=(f.dlugoscZewnetrzna+f.dlugoscWewnetrzna)/2;fp=f.szerokosc*len;}
      else if(f.typ==='wjazd'){len=f.L;fp=f.L*f.s+(f.R1**2+f.R2**2)*0.2146;}
      if(cum+len<=mD){powD+=fp;cum+=len;}
      else{const u=len>0?(mD-cum)/len:0;powD+=fp*u;break;}
    }
    powD=round2(powD);
    let powPlan=0;
    for(const f of dz.figury){
      if(f.typ==='prostokat')powPlan+=f.szerokosc*f.dlugosc;
      else if(f.typ==='trapez')powPlan+=((f.szerokosc1+f.szerokosc2)/2)*f.dlugosc;
      else if(f.typ==='trojkat')powPlan+=(f.szerokosc*f.dlugosc)/2;
      else if(f.typ==='pierscien')powPlan+=f.szerokosc*((f.dlugoscZewnetrzna+f.dlugoscWewnetrzna)/2);
      else if(f.typ==='wjazd')powPlan+=f.L*f.s+(f.R1**2+f.R2**2)*0.2146;
    }
    const gr=dz.gruboscWbudowywania||dz.grubosc;
    ton+=tD;met+=mD;zakr+=powD;powP+=round2(powPlan);
    pozM+=Math.max(0,powPlan-powD)*(gr/100)*mie.ciezarObjetosciowy;
    if(powD>0){num+=tD;den+=mie.ciezarObjetosciowy*powD;}
  }
  return {liczbaAut:liczAut(wpisy),lacznyTonaz:round2(ton),laczneMetry:round2(met),zakrytaPow:round2(zakr),pozPow:round2(Math.max(0,powP-zakr)),srGr:den>0?round2((num/den)*100):0,pozMasa:round3(pozM)};
}
function dzialkiDoZamk(wpisy,seg){
  const sim=[...wpisy];
  for(const s of seg)sim.push({dzialkaId:s.dzialkaId,przejechaneMetry:s.metry,tonazPrzywieziony:s.tonaz,numerAuta:0});
  const out=[];
  for(const s of seg){
    const dz=PLAN.dzialki.find(d=>d.id===s.dzialkaId);
    if(dz&&czyDzWypelniona(dz,sim)&&!out.includes(s.dzialkaId))out.push(s.dzialkaId);
  }
  return out;
}
let WPISY=MMA.wpisyLive||[];
let SESJE=MMA.sesjeLive||[];
let WIDOK_CALOSC=true;
let WYBRANA_DZ=0;
let EDYCJA_ID=null;
const KLUCZ_LS='mma_live_'+PLAN.id;
const KLUCZ_SES='mma_sesje_'+PLAN.id;
function zaladujPamiec(){
  try{const z=localStorage.getItem(KLUCZ_LS);if(z)WPISY=JSON.parse(z);}catch(e){}
  try{const s=localStorage.getItem(KLUCZ_SES);if(s)SESJE=JSON.parse(s);}catch(e){}
}
function zapiszPamiec(){
  try{localStorage.setItem(KLUCZ_LS,JSON.stringify(WPISY));}catch(e){}
  try{localStorage.setItem(KLUCZ_SES,JSON.stringify(SESJE));}catch(e){}
}
zaladujPamiec();

function renderLive(){
  const ak=znajdzAktywna(WPISY);
  const bil=bilansPlanu(WPISY);
  let sel='<div class="live-tabs">';
  sel+='<button class="live-tab'+(WIDOK_CALOSC?' active':'')+'" onclick="ustawWidokLive(true)">Całość ('+bil.liczbaAut+')</button>';
  PLAN.dzialki.forEach((dz,i)=>{
    const wD=WPISY.filter(w=>w.dzialkaId===dz.id);
    const n=liczAut(wD);
    sel+='<button class="live-tab'+(!WIDOK_CALOSC&&WYBRANA_DZ===i?' active':'')+'" onclick="ustawWidokLive(false,'+i+')">'+dz.nazwa+' ('+n+')</button>';
  });
  sel+='</div>';
  document.getElementById('live-selektor').innerHTML=sel;

  let bilansHtml='';
  if(WIDOK_CALOSC){
    bilansHtml='<div class="card bilans-card"><h2>Bilans całego planu</h2>';
    bilansHtml+='<div class="row"><span class="label">Aut (łącznie)</span><span class="val">'+bil.liczbaAut+'</span></div>';
    bilansHtml+='<div class="row"><span class="label">Wbudowano</span><span class="val">'+bil.lacznyTonaz.toFixed(2)+' Mg</span></div>';
    bilansHtml+='<div class="row"><span class="label">Przejechano</span><span class="val">'+bil.laczneMetry.toFixed(2)+' m</span></div>';
    bilansHtml+='<div class="row"><span class="label">Zakryta pow.</span><span class="val">'+bil.zakrytaPow.toFixed(2)+' m²</span></div>';
    if(bil.srGr>0)bilansHtml+='<div class="row"><span class="label">Śr. grubość</span><span class="val">'+bil.srGr.toFixed(2)+' cm</span></div>';
    bilansHtml+='<div class="row"><span class="label">Pozostało pow.</span><span class="val">'+bil.pozPow.toFixed(2)+' m²</span></div>';
    bilansHtml+='<div class="row"><span class="label">Do wbudowania</span><span class="val">'+bil.pozMasa.toFixed(2)+' Mg</span></div>';
    if(ak)bilansHtml+='<p class="aktywna-dz">● Aktywna działka: '+ak.dzialka.nazwa+'</p>';
    bilansHtml+='</div>';
  }
  document.getElementById('live-bilans').innerHTML=bilansHtml;

  const indeksy=WIDOK_CALOSC?PLAN.dzialki.map((_,i)=>i):[WYBRANA_DZ];
  let lista='';
  for(const idx of indeksy){
    const dz=PLAN.dzialki[idx];
    const wpD=WPISY.filter(w=>w.dzialkaId===dz.id);
    const sumM=sumaMetrowDz(WPISY,dz.id);
    const zakon=czyDzZakonczona(dz.id,WPISY);
    const nums=wpD.map(w=>w.numerAuta);
    const zOd=nums.length?Math.min(...nums):0;
    const zDo=nums.length?Math.max(...nums):0;
    lista+='<div class="card'+(ak&&ak.idx===idx?' card-aktywna':'')+'"><h2>'+dz.nazwa+(zakon?' ✓':'')+(ak&&ak.idx===idx?' ● aktywna':'')+'</h2>';
    lista+='<div class="row"><span class="label">Metry</span><span class="val">'+sumM.toFixed(2)+' m</span></div>';
    if(wpD.length){
      lista+='<table class="live-tabela"><thead><tr><th>#</th><th>Mg</th><th>m</th><th>Godz.</th><th></th></tr></thead><tbody>';
      let cum=0;
      wpD.forEach(w=>{
        cum+=w.przejechaneMetry;
        lista+='<tr><td>'+w.numerAuta+'</td><td>'+w.tonazPrzywieziony+'</td><td>'+w.przejechaneMetry+'</td><td>'+w.godzinaWybudowania+'</td>';
        lista+='<td><button class="btn-mini" onclick="edytujWpis(\\''+w._lid+'\\')">✎</button> <button class="btn-mini btn-danger-mini" onclick="usunWpis(\\''+w._lid+'\\')">✕</button></td></tr>';
        if(w.komentarz)lista+='<tr><td colspan="5" class="komentarz">💬 '+w.komentarz+'</td></tr>';
      });
      lista+='</tbody></table>';
      if(zOd)lista+='<p class="zakres-aut">Auta na działce: #'+zOd+(zOd!==zDo?'–'+zDo:'')+'</p>';
    }
    lista+='</div>';
  }
  document.getElementById('live-lista').innerHTML=lista||'<p class="pusty">Brak wpisów.</p>';

  const nr=EDYCJA_ID?WPISY.find(w=>w._lid===EDYCJA_ID)?.numerAuta:nastepnyNr(WPISY);
  document.getElementById('live-form-tytul').textContent=EDYCJA_ID?'Edycja auta #'+nr:'Auto #'+nr;
  document.getElementById('live-opis').textContent=EDYCJA_ID?'Edycja segmentu – metry nie są automatycznie rozdzielane.':(ak?'Program sam liczy pozycję od „'+ak.dzialka.nazwa+'” – metry mogą przejść na kolejne działki.':'Wszystkie działki zakończone.');
  document.getElementById('btn-anuluj-edycje').style.display=EDYCJA_ID?'block':'none';
}

function ustawWidokLive(calosc,idx){WIDOK_CALOSC=calosc;WYBRANA_DZ=idx??0;EDYCJA_ID=null;wyczyscFormLive();renderLive();}

function wyczyscFormLive(){
  document.getElementById('live-ton').value='';
  document.getElementById('live-met').value='';
  document.getElementById('live-godz').value='';
  document.getElementById('live-kom').value='';
}

function dodajWpisLive(){
  const ton=parseFloat(document.getElementById('live-ton').value);
  const met=parseFloat(document.getElementById('live-met').value);
  const godz=document.getElementById('live-godz').value||new Date().toTimeString().slice(0,5);
  const kom=document.getElementById('live-kom').value;
  if(!ton||!met){alert('Podaj tonaż i metry.');return;}
  if(EDYCJA_ID){
    const w=WPISY.find(x=>x._lid===EDYCJA_ID);
    if(w){w.tonazPrzywieziony=ton;w.przejechaneMetry=met;w.godzinaWybudowania=godz;w.komentarz=kom||undefined;}
    EDYCJA_ID=null;
  }else{
    const ak=znajdzAktywna(WPISY);
    if(!ak){alert('Plan ukończony.');return;}
    const seg=rozdzielMetry(WPISY,met,ton);
    if(!seg.length){alert('Brak miejsca na metry.');return;}
    const nr=nastepnyNr(WPISY);
    const doZ=dzialkiDoZamk(WPISY,seg);
    for(const s of seg){
      WPISY.push({dzialkaId:s.dzialkaId,numerAuta:nr,tonazPrzywieziony:s.tonaz,przejechaneMetry:s.metry,godzinaWybudowania:godz,komentarz:kom||undefined,_lid:Date.now()+Math.random()});
    }
    for(const dzId of doZ){
      const k=PLAN.id+':'+dzId;
      SESJE=SESJE.filter(s=>s.planId+':'+s.dzialkaId!==k);
      SESJE.push({planId:PLAN.id,dzialkaId:dzId,zakonczona:true});
    }
    if(seg.length>1||doZ.length)alert('Auto #'+nr+' zapisane'+(seg.length>1?' (kilka działek)':'')+(doZ.length?'. Działka ukończona.':''));
  }
  zapiszPamiec();
  wyczyscFormLive();
  renderLive();
}

function edytujWpis(lid){
  const w=WPISY.find(x=>x._lid===lid); if(!w)return;
  EDYCJA_ID=lid;
  document.getElementById('live-ton').value=w.tonazPrzywieziony;
  document.getElementById('live-met').value=w.przejechaneMetry;
  document.getElementById('live-godz').value=w.godzinaWybudowania;
  document.getElementById('live-kom').value=w.komentarz||'';
  renderLive();
}

function anulujEdycjeLive(){EDYCJA_ID=null;wyczyscFormLive();renderLive();}

function usunWpis(lid){
  const w=WPISY.find(x=>x._lid===lid); if(!w)return;
  if(!confirm('Usunąć auto #'+w.numerAuta+' (wszystkie segmenty)?'))return;
  WPISY=WPISY.filter(x=>x.numerAuta!==w.numerAuta);
  WPISY=przenumeruj(WPISY);
  zapiszPamiec();
  renderLive();
}
`;
