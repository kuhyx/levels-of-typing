/* ---------- state & persistence ---------- */
const STORE_KEY = 'typinggame.v1';
const defaultState = () => ({version:1, unlocked:1, current:1, perLevel:{}, detector:null, slowWords:[], settings:{idleMs:5000}, dvorak:{os:null}, skipped:[]});
let S = defaultState();
function load(){
  try{ const raw=localStorage.getItem(STORE_KEY); if(raw){ const p=JSON.parse(raw); if(p && p.version===1) S=Object.assign(defaultState(),p); } }
  catch(e){ toast('Saved progress could not be read; starting fresh.'); }
}
function save(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
  catch(e){ toast(e && e.name==='QuotaExceededError' ? 'Storage is full; progress not saved.' : 'Could not save progress (private browsing?).'); }
}
const $ = id => document.getElementById(id);
let toastT; function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),2600); }
const lvl = () => LEVELS[S.current-1];
const perLevel = n => S.perLevel[n] || (S.perLevel[n]={bestNetWPM:0,bestAccuracy:0,passed:false,attempts:0});
