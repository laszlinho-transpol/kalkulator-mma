/** JavaScript trybu LIVE w eksporcie HTML – logika jak w aplikacji (liveProgress + planCiagly) */
export const HTML_LIVE_SCRIPT = `
function round2(n){return Math.round(n*100)/100;}
function round3(n){return Math.round(n*1000)/1000;}
function dlugoscFigury(f){
  if(f.typ==='prostokat')return f.dlugosc||0;
  if(f.typ==='trapez')return f.dlugosc||0;
  if(f.typ==='trojkat')return f.dlugosc||0;
  if(f.typ==='pierscien')return((f.dlugoscZewnetrzna||0)+(f.dlugoscWewnetrzna||0))/2;
  if(f.typ==='wjazd')return f.L||0;
  return f.dlugosc||f.L||0;
}
function sumaMetrowDz(wpisy,dzId){return round2(wpisy.filter(w=>w.dzialkaId===dzId).reduce((s,w)=>s+w.przejechaneMetry,0));}
function lacznaDlugoscDz(dz){return round2(dz.figury.reduce((s,f)=>s+dlugoscFigury(f),0));}
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
  if(!wpisy.length)return PLAN.dzialki.length?{idx:0,dzialka:PLAN.dzialki[0]}:null;
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
function powOdStartuDz(dz,mD){
  let pow=0,cum=0;
  for(const f of dz.figury){
    const len=dlugoscFigury(f);
    let fp=0;
    if(f.typ==='prostokat')fp=f.szerokosc*f.dlugosc;
    else if(f.typ==='trapez')fp=((f.szerokosc1+f.szerokosc2)/2)*f.dlugosc;
    else if(f.typ==='trojkat')fp=(f.szerokosc*f.dlugosc)/2;
    else if(f.typ==='pierscien')fp=f.szerokosc*((f.dlugoscZewnetrzna+f.dlugoscWewnetrzna)/2);
    else if(f.typ==='wjazd')fp=f.L*f.s+(f.R1**2+f.R2**2)*0.2146;
    if(cum+len<=mD){pow+=fp;cum+=len;}
    else{const u=len>0?(mD-cum)/len:0;pow+=fp*u;break;}
  }
  return round2(pow);
}
function powPlanDz(dz){
  let p=0;
  for(const f of dz.figury){
    if(f.typ==='prostokat')p+=f.szerokosc*f.dlugosc;
    else if(f.typ==='trapez')p+=((f.szerokosc1+f.szerokosc2)/2)*f.dlugosc;
    else if(f.typ==='trojkat')p+=(f.szerokosc*f.dlugosc)/2;
    else if(f.typ==='pierscien')p+=f.szerokosc*((f.dlugoscZewnetrzna+f.dlugoscWewnetrzna)/2);
    else if(f.typ==='wjazd')p+=f.L*f.s+(f.R1**2+f.R2**2)*0.2146;
  }
  return round2(p);
}
function obliczLacznaDlugoscPlanu(){
  return round2(PLAN.dzialki.reduce((s,dz)=>s+lacznaDlugoscDz(dz),0));
}
function budujFiguryPlanu(){
  const out=[]; let off=0;
  for(const dz of PLAN.dzialki){
    const mie=MIESZANKI[dz.mieszankaId]; if(!mie)continue;
    const gr=dz.gruboscWbudowywania||dz.grubosc;
    for(const f of dz.figury){
      out.push({figura:f,dzialkaId:dz.id,dzialkaNazwa:dz.nazwa,metryGlobalneStart:round2(off),grubosc:gr,ciezar:mie.ciezarObjetosciowy});
      off=round2(off+dlugoscFigury(f));
    }
  }
  return out;
}
function sortujWpisyPlanu(wpisy){
  return [...wpisy].sort((a,b)=>{
    if(a.numerAuta!==b.numerAuta)return a.numerAuta-b.numerAuta;
    const iA=PLAN.dzialki.findIndex(d=>d.id===a.dzialkaId);
    const iB=PLAN.dzialki.findIndex(d=>d.id===b.dzialkaId);
    if(iA!==iB)return iA-iB;
    return 0;
  });
}
function obliczMarkeryPlanuCiaglego(wpisy){
  const offsets=new Map(); let off=0;
  for(const dz of PLAN.dzialki){offsets.set(dz.id,off);off+=lacznaDlugoscDz(dz);}
  const markery=[]; let idx=0;
  for(const dz of PLAN.dzialki){
    const dzWp=wpisy.filter(w=>w.dzialkaId===dz.id).sort((a,b)=>a.numerAuta-b.numerAuta);
    let cumDz=0; const base=offsets.get(dz.id)||0;
    for(const w of dzWp){
      cumDz=round2(cumDz+w.przejechaneMetry);
      markery.push({wpis:w,metryKumulatywne:round2(base+cumDz),idxGlobalny:idx++});
    }
  }
  return markery;
}
function obliczPodsumowanieOdcinkaPlanu(numerAutaDo){
  const seg=MMA.segmentyPlanu||[];
  const lacznaDl=obliczLacznaDlugoscPlanu();
  const wpisyDo=sortujWpisyPlanu(WPISY).filter(w=>w.numerAuta<=numerAutaDo);
  const tonDo=round2(wpisyDo.reduce((s,w)=>s+w.tonazPrzywieziony,0));
  const markery=obliczMarkeryPlanuCiaglego(WPISY);
  const ostatni=[...markery].reverse().find(m=>m.wpis.numerAuta<=numerAutaDo);
  const metryDo=ostatni?ostatni.metryKumulatywne:0;
  const powDo=powierzchniaOdMetrowPlanu(seg,metryDo);
  let denGr=0,numGr=0,cum=0;
  for(const s of seg){
    const doM=Math.min(s.dl,Math.max(0,metryDo-cum));
    if(doM>0){
      const pow=doM*(s.masaNaM/(s.ciezar*(s.grubosc/100)));
      numGr+=pow*s.grubosc*s.ciezar;denGr+=pow*s.ciezar;
    }
    cum+=s.dl; if(cum>=metryDo)break;
  }
  const sredniaGrubosc=powDo>0&&denGr>0?round2((tonDo/denGr)*100):0;
  let masaPlan=0;cum=0;
  for(const s of seg){
    const doM=Math.min(s.dl,Math.max(0,metryDo-cum));
    if(doM>0){
      const pow=doM*(s.masaNaM/(s.ciezar*(s.grubosc/100)));
      masaPlan+=pow*(s.grubosc/100)*s.ciezar;
    }
    cum+=s.dl;
  }
  return {numerAutaDo,tonDo,metryDo,powDo,sredniaGrubosc,bilansMasy:round3(tonDo-masaPlan),pozostaloMetrow:round2(Math.max(0,lacznaDl-metryDo))};
}
function bilansPlanu(wpisy){
  let ton=0,met=0,zakr=0,powP=0,pozM=0,num=0,den=0;
  let sredniCiezar=0,wagaCiezar=0;
  for(const dz of PLAN.dzialki){
    const mie=MIESZANKI[dz.mieszankaId]; if(!mie)continue;
    const wD=wpisy.filter(w=>w.dzialkaId===dz.id);
    const tD=wD.reduce((s,w)=>s+w.tonazPrzywieziony,0);
    const mD=wD.reduce((s,w)=>s+w.przejechaneMetry,0);
    const powD=powOdStartuDz(dz,mD);
    const powPlan=powPlanDz(dz);
    const gr=dz.gruboscWbudowywania||dz.grubosc;
    ton+=tD;met+=mD;zakr+=powD;powP+=powPlan;
    pozM+=Math.max(0,powPlan-powD)*(gr/100)*mie.ciezarObjetosciowy;
    if(powD>0){num+=tD;den+=mie.ciezarObjetosciowy*powD;sredniCiezar+=mie.ciezarObjetosciowy*powD;wagaCiezar+=powD;}
  }
  const lacznaDl=obliczLacznaDlugoscPlanu();
  const pozPow=round2(Math.max(0,powP-zakr));
  const srGr=den>0?round2((num/den)*100):0;
  const rhoSr=wagaCiezar>0?sredniCiezar/wagaCiezar:0;
  const pozMasaSrednia=rhoSr>0&&srGr>0?round3(pozPow*(srGr/100)*rhoSr):round3(pozM);
  return {
    liczbaAut:liczAut(wpisy),lacznyTonaz:round2(ton),laczneMetry:round2(met),
    zakrytaPow:round2(zakr),pozPow,pozMasa:round3(pozM),pozMasaSrednia:pozMasaSrednia,
    srGr,lacznaDlugoscPlanu:lacznaDl,pozostaloMetrow:round2(Math.max(0,lacznaDl-round2(met))),
  };
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
function wysokosciFigur(figury){
  return figury.map(fp=>Math.max(12,Math.round(dlugoscFigury(fp.figura)*1.15)));
}
function metryDoY(figury,heights,metry){
  let cum=0;
  for(let i=0;i<figury.length;i++){
    const len=dlugoscFigury(figury[i].figura);
    if(cum+len>=metry-0.001){
      const frac=len>0?(metry-cum)/len:0;
      let y=0; for(let j=0;j<i;j++)y+=heights[j];
      return y+heights[i]*frac;
    }
    cum+=len;
  }
  return heights.reduce((a,b)=>a+b,0);
}
function aktualizujMetryPlanowaneLive(){
  const el=document.getElementById('live-metry-planowane');
  if(!el)return;
  if(EDYCJA_ID){el.textContent='— edycja wpisu —';return;}
  const ton=parseFloat(document.getElementById('live-ton').value)||0;
  const bil=bilansPlanu(WPISY);
  if(ton<=0){el.textContent='— wpisz tonaż powyżej —';return;}
  const seg=(MMA.segmentyPlanu||[]).map(s=>({...s}));
  const m=metryOdMasyPlanu(seg,bil.lacznyTonaz+ton);
  const zAuta=round2(Math.max(0,m-bil.laczneMetry));
  el.textContent=m.toFixed(2)+' m od startu / '+zAuta.toFixed(2)+' m z auta';
}
function aktualizujMetryAuto(){
  const el=document.getElementById('live-metry-auto');
  const lbl=document.getElementById('live-metry-auto-label');
  const inp=document.getElementById('live-met-label');
  if(!el||!lbl||!inp)return;
  if(EDYCJA_ID){el.textContent='—';lbl.style.display='none';return;}
  lbl.style.display='block';
  const bil=bilansPlanu(WPISY);
  const val=parseFloat(document.getElementById('live-met').value);
  if(isNaN(val)){el.textContent='—';return;}
  if(TRYB_METROW==='zAuta'){
    inp.textContent='Przejechane metry z auta [m]';
    lbl.textContent='Odległość od startu (auto)';
    el.textContent=round2(bil.laczneMetry+val).toFixed(2)+' m';
  }else{
    inp.textContent='Odległość od startu [m]';
    lbl.textContent='Metry z auta (auto)';
    el.textContent=round2(val-bil.laczneMetry).toFixed(2)+' m';
  }
}
function przelaczTrybMetrowLive(nowy){
  if(EDYCJA_ID||nowy===TRYB_METROW)return;
  const bil=bilansPlanu(WPISY);
  const val=parseFloat(document.getElementById('live-met').value);
  if(!isNaN(val)&&val>0){
    if(nowy==='odStartu')document.getElementById('live-met').value=round2(bil.laczneMetry+val);
    else document.getElementById('live-met').value=round2(Math.max(0,val-bil.laczneMetry));
  }
  TRYB_METROW=nowy;
  document.getElementById('tab-met-zauta').classList.toggle('active',nowy==='zAuta');
  document.getElementById('tab-met-odstartu').classList.toggle('active',nowy==='odStartu');
  aktualizujMetryAuto();
}
function rozwiazMetryWpisu(){
  const val=parseFloat(document.getElementById('live-met').value);
  if(isNaN(val))return null;
  if(EDYCJA_ID||TRYB_METROW==='zAuta')return val;
  const bil=bilansPlanu(WPISY);
  return round2(val-bil.laczneMetry);
}
let WPISY=MMA.wpisyLive||[];
let SESJE=MMA.sesjeLive||[];
let EDYCJA_ID=null;
let TRYB_METROW='zAuta';
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

function renderSzkicPlanu(bil,markery){
  const figury=budujFiguryPlanu();
  if(!figury.length)return '<p class="pusty">Brak figur w planie</p>';
  const heights=wysokosciFigur(figury);
  let cumH=0; const cumHeights=heights.map(h=>{const y=cumH;cumH+=h;return y;});
  const svgH=cumH+8;
  let html='<div class="szkic-wrap"><div class="szkic-tresc" style="height:'+svgH+'px">';
  for(let i=0;i<figury.length;i++){
    const fp=figury[i];
    const len=dlugoscFigury(fp.figura);
    const h=heights[i];
    const yFig=cumHeights[i];
    const passed=Math.min(Math.max(bil.laczneMetry-fp.metryGlobalneStart,0),len);
    const pct=len>0?(passed/len)*100:0;
    const stroke=i%2===0?'#E8A020':'#2E86AB';
    if(i===0||figury[i-1].dzialkaId!==fp.dzialkaId){
      html+='<div class="szkic-dz-label" style="top:'+(yFig-2)+'px">'+fp.dzialkaNazwa+'</div>';
    }
    html+='<div class="szkic-fig" style="top:'+yFig+'px;height:'+h+'px">';
    html+='<div class="szkic-pasek" style="border-color:'+stroke+'"><div class="szkic-pass" style="height:'+pct+'%"></div></div>';
    html+='<span class="szkic-nr" style="color:'+stroke+'">'+(i+1)+'</span>';
    html+='<span class="szkic-m">'+fp.metryGlobalneStart.toFixed(0)+' m</span>';
    html+='</div>';
  }
  for(const m of markery){
    const y=metryDoY(figury,heights,m.metryKumulatywne);
    html+='<button type="button" class="szkic-truck" style="top:'+(y-8)+'px" onclick="otworzModalAuta(\\''+m.wpis._lid+'\\')">🚛'+m.wpis.numerAuta+'</button>';
  }
  if(bil.laczneMetry>0){
    const paverY=metryDoY(figury,heights,Math.min(bil.laczneMetry,obliczLacznaDlugoscPlanu()));
    html+='<div class="szkic-paver" style="top:'+paverY+'px"></div>';
  }
  html+='</div></div>';
  return html;
}

function renderLive(){
  const ak=znajdzAktywna(WPISY);
  const bil=bilansPlanu(WPISY);
  const markery=obliczMarkeryPlanuCiaglego(WPISY);
  const mapaMetrow=new Map(markery.map(m=>[m.wpis._lid,m.metryKumulatywne]));
  const posortowane=sortujWpisyPlanu(WPISY);

  let bilansHtml='<div class="card bilans-card"><h2>Bilans całego planu</h2>';
  bilansHtml+='<div class="row"><span class="label">Aut (łącznie)</span><span class="val">'+bil.liczbaAut+'</span></div>';
  bilansHtml+='<div class="row"><span class="label">Wbudowano</span><span class="val">'+bil.lacznyTonaz.toFixed(2)+' Mg</span></div>';
  bilansHtml+='<div class="row"><span class="label">Przejechano</span><span class="val">'+bil.laczneMetry.toFixed(2)+' m</span></div>';
  bilansHtml+='<div class="row"><span class="label">Zakryta pow.</span><span class="val">'+bil.zakrytaPow.toFixed(2)+' m²</span></div>';
  if(bil.srGr>0)bilansHtml+='<div class="row"><span class="label">Śr. grubość</span><span class="val">'+bil.srGr.toFixed(2)+' cm</span></div>';
  bilansHtml+='<div class="row"><span class="label">Pozostało pow.</span><span class="val">'+bil.pozPow.toFixed(2)+' m²</span></div>';
  bilansHtml+='<div class="row"><span class="label">Do końca metrów</span><span class="val">'+bil.pozostaloMetrow.toFixed(2)+' m</span></div>';
  bilansHtml+='<div class="row"><span class="label">Do wbudowania (plan)</span><span class="val">'+bil.pozMasa.toFixed(2)+' Mg ('+round2(bil.lacznyTonaz+bil.pozMasa).toFixed(2)+' Mg)</span></div>';
  bilansHtml+='<div class="row"><span class="label">Do wbudowania (śr. grub.)</span><span class="val">'+bil.pozMasaSrednia.toFixed(2)+' Mg ('+round2(bil.lacznyTonaz+bil.pozMasaSrednia).toFixed(2)+' Mg)</span></div>';
  if(ak)bilansHtml+='<p class="aktywna-dz">● Aktywna działka: '+ak.dzialka.nazwa+'</p>';
  bilansHtml+='</div>';
  document.getElementById('live-bilans').innerHTML=bilansHtml;

  document.getElementById('live-szkic').innerHTML='<div class="card"><h2>Szkic planu dnia</h2><p style="color:var(--muted);font-size:13px;margin-bottom:8px">Jeden ciągły odcinek – przewiń w pionie. Kliknij auto na szkicu.</p>'+renderSzkicPlanu(bil,markery)+'</div>';

  let lista='';
  if(posortowane.length){
    lista+='<div class="card"><h2>Tabela aut – cały plan</h2>';
    lista+='<table class="live-tabela"><thead><tr><th>#</th><th>Mg</th><th>m</th><th>Gr.</th><th>Do końca m</th><th>Godz.</th><th>Działka</th><th></th></tr></thead><tbody>';
    for(const w of posortowane){
      const dz=PLAN.dzialki.find(d=>d.id===w.dzialkaId);
      const mie=dz?MIESZANKI[dz.mieszankaId]:null;
      const grPlan=dz?(dz.gruboscWbudowywania||dz.grubosc):0;
      const powJ= dz?powOdStartuDz(dz,w.przejechaneMetry):0;
      const grW=powJ>0&&mie?(w.tonazPrzywieziony/(mie.ciezarObjetosciowy*powJ))*100:0;
      const metKum=mapaMetrow.get(w._lid)||0;
      const doK=Math.max(0,bil.lacznaDlugoscPlanu-metKum);
      lista+='<tr><td>'+w.numerAuta+'</td><td>'+w.tonazPrzywieziony+'</td><td>'+w.przejechaneMetry+'</td>';
      lista+='<td>'+(grW>0?grW.toFixed(1)+(grW>grPlan+0.2?'▲':grW<grPlan-0.2?'▼':''):'–')+'</td>';
      lista+='<td>'+doK.toFixed(2)+'</td><td>'+w.godzinaWybudowania+'</td>';
      lista+='<td style="font-size:10px">'+(dz?dz.nazwa:'—')+'</td>';
      lista+='<td><button class="btn-mini" onclick="edytujWpis(\\''+w._lid+'\\')">✎</button> <button class="btn-mini btn-danger-mini" onclick="usunWpis(\\''+w._lid+'\\')">✕</button></td></tr>';
      if(w.komentarz)lista+='<tr><td colspan="8" class="komentarz">💬 '+w.komentarz+'</td></tr>';
    }
    lista+='</tbody></table>';
    lista+='<div class="live-podsum">';
    lista+='<div class="row"><span class="label">Pozostało pow.</span><span class="val">'+bil.pozPow.toFixed(2)+' m²</span></div>';
    lista+='<div class="row"><span class="label">Do końca metrów</span><span class="val">'+bil.pozostaloMetrow.toFixed(2)+' m</span></div>';
    lista+='<div class="row"><span class="label">Do wbudowania (plan)</span><span class="val">'+bil.pozMasa.toFixed(2)+' Mg</span></div>';
    lista+='</div></div>';
  }
  document.getElementById('live-lista').innerHTML=lista;

  const nr=EDYCJA_ID?WPISY.find(w=>w._lid===EDYCJA_ID)?.numerAuta:nastepnyNr(WPISY);
  document.getElementById('live-form-tytul').textContent=EDYCJA_ID?'Edycja auta #'+nr:'Auto #'+nr;
  document.getElementById('live-opis').textContent=EDYCJA_ID?'Edycja segmentu – metry nie są automatycznie rozdzielane.':(ak?'Program sam liczy pozycję od „'+ak.dzialka.nazwa+'” – metry mogą przejść na kolejne działki.':'Wszystkie działki zakończone.');
  document.getElementById('btn-anuluj-edycje').style.display=EDYCJA_ID?'block':'none';
  document.getElementById('live-gdzie-label').style.display=EDYCJA_ID?'none':'block';
  document.getElementById('live-tryb-metrow').style.display=EDYCJA_ID?'none':'flex';
  document.getElementById('live-metry-auto-wrap').style.display=EDYCJA_ID?'none':'block';
  aktualizujMetryPlanowaneLive();
  aktualizujMetryAuto();
}

function wyczyscFormLive(){
  document.getElementById('live-ton').value='';
  document.getElementById('live-met').value='';
  document.getElementById('live-godz').value='';
  document.getElementById('live-kom').value='';
  TRYB_METROW='zAuta';
  document.getElementById('tab-met-zauta')?.classList.add('active');
  document.getElementById('tab-met-odstartu')?.classList.remove('active');
  aktualizujMetryPlanowaneLive();
  aktualizujMetryAuto();
}

function dodajWpisLive(){
  const ton=parseFloat(document.getElementById('live-ton').value);
  const met=rozwiazMetryWpisu();
  const godz=document.getElementById('live-godz').value||new Date().toTimeString().slice(0,5);
  const kom=document.getElementById('live-kom').value;
  if(!ton||!met||met<=0){alert(TRYB_METROW==='odStartu'&&!EDYCJA_ID?'Odległość od startu musi być większa niż dotychczas przejechane metry.':'Podaj tonaż i metry.');return;}
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
  TRYB_METROW='zAuta';
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
  if(!WPISY.length)SESJE=[];
  zapiszPamiec();
  renderLive();
}

function wyczyscLivePlanu(){
  if(!WPISY.length){alert('Brak wpisów LIVE do usunięcia.');return;}
  if(!confirm('Usunąć wszystkie auta LIVE i zacząć od nowa?'))return;
  WPISY=[];SESJE=[];EDYCJA_ID=null;
  zapiszPamiec();wyczyscFormLive();renderLive();
}

function otworzModalAuta(lid){
  const w=WPISY.find(x=>x._lid===lid); if(!w)return;
  const dz=PLAN.dzialki.find(d=>d.id===w.dzialkaId);
  const mie=dz?MIESZANKI[dz.mieszankaId]:null;
  if(!dz||!mie)return;
  const grPlan=dz.gruboscWbudowywania||dz.grubosc;
  const powAuta=powOdStartuDz(dz,w.przejechaneMetry);
  const grAuta=powAuta>0?(w.tonazPrzywieziony/(mie.ciezarObjetosciowy*powAuta))*100:0;
  const bilansAuta=w.tonazPrzywieziony-powAuta*(grPlan/100)*mie.ciezarObjetosciowy;
  const odc=obliczPodsumowanieOdcinkaPlanu(w.numerAuta);
  let html='<p style="color:var(--muted);font-size:13px">Godz. '+w.godzinaWybudowania+' · '+dz.nazwa+'</p>';
  html+='<div class="live-tabs"><button type="button" class="live-tab active" id="modal-tab-sz" onclick="przelaczModalAuta(\\'sz\\')">Szczegóły auta</button>';
  html+='<button type="button" class="live-tab" id="modal-tab-od" onclick="przelaczModalAuta(\\'od\\')">Odcinek 1→'+w.numerAuta+'</button></div>';
  html+='<div id="modal-auto-sz"><div class="row"><span class="label">Tonaż</span><span class="val">'+w.tonazPrzywieziony+' Mg</span></div>';
  html+='<div class="row"><span class="label">Metry</span><span class="val">'+w.przejechaneMetry+' m</span></div>';
  html+='<div class="row"><span class="label">Zakryta pow.</span><span class="val">'+powAuta.toFixed(2)+' m²</span></div>';
  html+='<div class="row"><span class="label">Grubość</span><span class="val">'+grAuta.toFixed(2)+' cm</span></div>';
  html+='<div class="'+(bilansAuta>0?'wynik-red':'wynik-green')+'" style="margin-top:8px">Bilans: '+(bilansAuta>0?'+':'')+bilansAuta.toFixed(2)+' Mg</div>';
  if(w.komentarz)html+='<p class="komentarz" style="margin-top:8px">💬 '+w.komentarz+'</p></div>';
  else html+='</div>';
  html+='<div id="modal-auto-od" style="display:none"><p style="color:var(--muted);font-size:13px;margin-bottom:8px">Podsumowanie całego planu dnia od auta #1 do #'+w.numerAuta+'</p>';
  html+='<div class="row"><span class="label">Łączny tonaż</span><span class="val">'+odc.tonDo.toFixed(2)+' Mg</span></div>';
  html+='<div class="row"><span class="label">Metry od startu</span><span class="val">'+odc.metryDo.toFixed(2)+' m</span></div>';
  html+='<div class="row"><span class="label">Zakryta pow.</span><span class="val">'+odc.powDo.toFixed(2)+' m²</span></div>';
  html+='<div class="row"><span class="label">Śr. grubość</span><span class="val">'+odc.sredniaGrubosc.toFixed(2)+' cm</span></div>';
  html+='<div class="'+(odc.bilansMasy>0?'wynik-red':'wynik-green')+'" style="margin-top:8px">Bilans łączny: '+(odc.bilansMasy>0?'+':'')+odc.bilansMasy.toFixed(2)+' Mg</div>';
  html+='<div class="row" style="margin-top:12px"><span class="label">Do końca metrów</span><span class="val">'+odc.pozostaloMetrow.toFixed(2)+' m</span></div></div>';
  document.getElementById('modal-auto-tresc').innerHTML=html;
  document.getElementById('modal-auto-tytul').textContent='Auto #'+w.numerAuta;
  document.getElementById('modal-auto').classList.add('open');
}
function zamknijModalAuta(){document.getElementById('modal-auto').classList.remove('open');}
function przelaczModalAuta(tab){
  document.getElementById('modal-tab-sz').classList.toggle('active',tab==='sz');
  document.getElementById('modal-tab-od').classList.toggle('active',tab==='od');
  document.getElementById('modal-auto-sz').style.display=tab==='sz'?'block':'none';
  document.getElementById('modal-auto-od').style.display=tab==='od'?'block':'none';
}
`;
