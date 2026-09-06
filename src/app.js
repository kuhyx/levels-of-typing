/* ---------- Dvorak calibration ---------- */
function runCalibration(then){
  calib=then;
  $('lesson').style.display='none'; $('drill').classList.add('on'); $('target').hidden=true; $('keyprompt').hidden=false;
  $('keyprompt').innerHTML='Q<small>Press the key with Q printed on it, so the game can check what your system already types.</small>';
  showNext();
}
function onCalibKey(e){
  if(e.key==='Escape'){ abortDrill(); return; }
  if(e.code!=='KeyQ'){ $('banner').className='banner on'; $('banner').textContent='That was a different key. Press the physical Q key.'; return; }
  const k=e.key.toLowerCase();
  S.dvorak.os = k==='q' ? 'qwerty' : k==="'" ? 'dvorak' : 'other';
  save(); const fn=calib; calib=null; $('banner').className='banner';
  if(S.dvorak.os==='dvorak') toast('Your system already types Dvorak. Browser remap is off.');
  else if(S.dvorak.os==='other') toast(`Your system typed "${e.key}" for Q. Remapping by physical key anyway.`);
  else toast('QWERTY system detected. Dvorak remap is on for this level.');
  fn();
}
const remapActive = () => lvl().layout==='dvorak' && S.dvorak.os!=='dvorak';

/* ---------- input ---------- */
document.addEventListener('keydown', e=>{
  if(e.target && (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')) return;
  if($('results').classList.contains('on')||$('settings').classList.contains('on')) return;
  if(calib){ e.preventDefault(); onCalibKey(e); return; }
  if(!D) return;
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='v'){ e.preventDefault(); toast('Paste is blocked in drills.'); return; }
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  if(e.key==='Escape'){ abortDrill(); return; }
  if(e.key==='Backspace'){ e.preventDefault(); onBackspace(); return; }
  if(e.repeat) return;
  if(e.getModifierState && e.getModifierState('CapsLock')){ const b=$('banner'); if(!b.classList.contains('error')){ b.className='banner on'; b.textContent='Caps Lock is on.'; } }
  else if($('banner').textContent==='Caps Lock is on.') $('banner').className='banner';
  let ch=null;
  if(remapActive()){ const L=LAYOUTS.dvorak; if(e.code in L.map){ ch=e.shiftKey?L.shift[e.code]:L.map[e.code]; if(e.getModifierState('CapsLock')&&/[a-z]/i.test(ch)) ch=e.shiftKey?ch.toLowerCase():ch.toUpperCase(); } else if(e.code==='Space') ch=' '; }
  else if(e.key.length===1) ch=e.key;
  if(ch===null) return;
  if(!remapActive() && !warnedLayout && /^Key[A-Z]$/.test(e.code) && /^[a-z]$/i.test(e.key) && e.key.toLowerCase()!==e.code[3].toLowerCase()){ warnedLayout=true; toast('Your system layout is not US QWERTY. Only US QWERTY is supported; results may be off.'); }
  e.preventDefault();
  const rollover=downSet.size>0;
  downSet.add(e.code);
  onChar(ch, e.code, rollover);
});
document.addEventListener('keyup', e=>{ downSet.delete(e.code); });
window.addEventListener('blur', ()=>downSet.clear());
document.addEventListener('paste', e=>{ if(D){ e.preventDefault(); toast('Paste is blocked in drills.'); } });
$('btnAbort').onclick=abortDrill;

/* ---------- settings ---------- */
$('btnSettings').onclick=()=>{ abortDrill(); $('idleMs').value=S.settings.idleMs; $('calibInfo').textContent=S.dvorak.os?`Detected: ${S.dvorak.os==='qwerty'?'QWERTY system, remap on':S.dvorak.os==='dvorak'?'Dvorak system, remap off':'other layout, remap by physical key'}`:'Not done yet. Runs automatically before the first Dvorak drill.'; $('settings').classList.add('on'); };
$('btnCloseSettings').onclick=()=>{ const v=parseInt($('idleMs').value,10); if(v>=1000&&v<=30000) S.settings.idleMs=v; save(); $('settings').classList.remove('on'); renderPanel(); };
$('btnRecalib').onclick=()=>{ S.dvorak.os=null; save(); $('calibInfo').textContent='Cleared. Runs before the next Dvorak drill.'; toast('Calibration cleared.'); };
$('btnExport').onclick=()=>{ const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='levels-of-typing-progress.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); };
$('btnImport').onclick=()=>{ try{ const p=JSON.parse($('importBox').value); if(!p||p.version!==1||typeof p.unlocked!=='number') throw 0; S=Object.assign(defaultState(),p); S.unlocked=Math.min(7,Math.max(1,S.unlocked)); S.current=Math.min(S.unlocked,Math.max(1,S.current)); save(); $('importBox').value=''; toast('Progress imported.'); }catch(e){ toast('That is not a valid export file.'); } };
$('btnReset').onclick=()=>{ if(confirm('Clear all progress and settings?')){ S=defaultState(); save(); toast('Reset.'); renderPanel(); } };

/* ---------- boot ---------- */
load();
if(matchMedia('(hover: none) and (pointer: coarse)').matches) $('gate').classList.add('on');
$('btnGateBypass').onclick=()=>$('gate').classList.remove('on');
renderPanel();
window.__game={LAYOUTS,isSFB,summarize,detectStyle,save,renderPanel,abortDrill,get S(){return S},set S(v){S=v},get D(){return D},get calib(){return calib}};
