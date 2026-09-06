/* ---------- keyboard ---------- */
let activeLayout='qwerty';
function buildKeyboard(name){
  activeLayout=name; const L=LAYOUTS[name]; const kb=$('kb'); kb.innerHTML='';
  for(const row of KB_ROWS){
    const r=document.createElement('div'); r.className='row';
    for(const code of row){
      const k=document.createElement('div'); k.dataset.code=code;
      const f=CODE_FINGER[code]; k.className='key '+(f==='t'?'ft':'f'+f)+(KEY_WIDTH[code]?' '+KEY_WIDTH[code]:'')+(HOME_CODES.has(code)?' home':'');
      if(code in MOD_LABEL){ k.classList.add('mod'); k.textContent=MOD_LABEL[code]; }
      else k.textContent=L.map[code];
      r.appendChild(k);
    }
    kb.appendChild(r);
  }
  $('layoutTag').textContent='Layout: '+(name==='dvorak'?'Dvorak (remapped in browser)':'QWERTY');
}
const keyEl = code => $('kb').querySelector(`[data-code="${code}"]`);
function clearKeyClasses(cls){ $('kb').querySelectorAll('.'+cls).forEach(e=>e.classList.remove(cls)); }
function showNext(ch, sfbWith){
  clearKeyClasses('next'); clearKeyClasses('sfb');
  if(ch===undefined) return;
  const e=LAYOUTS[activeLayout].charToCode[ch]; if(!e) return;
  keyEl(e.code)?.classList.add('next');
  if(e.shift){ const sh = CODE_FINGER[e.code]<4 ? 'ShiftRight':'ShiftLeft'; keyEl(sh)?.classList.add('next'); }
  if(sfbWith){ const e2=LAYOUTS[activeLayout].charToCode[sfbWith]; keyEl(e.code)?.classList.add('sfb'); if(e2) keyEl(e2.code)?.classList.add('sfb'); }
}

/* ---------- ladder & panel ---------- */
function renderLadder(){
  const el=$('ladder'); el.innerHTML='';
  LEVELS.forEach(l=>{
    const p=S.perLevel[l.n]; const b=document.createElement('button');
    const locked=l.n>S.unlocked;
    b.className='step'+(locked?' locked':'')+(l.n===S.current?' active':'')+(p&&p.passed?' passed':'')+(S.skipped.includes(l.n)?' skipped':'');
    b.disabled=locked;
    b.innerHTML=`<span class="n">Level ${l.n}</span><span class="t">${l.short}</span><span class="b">${p&&p.bestNetWPM?Math.round(p.bestNetWPM)+' wpm':locked?'locked':'—'}</span>`;
    b.onclick=()=>{ if(!locked){ abortDrill(); S.current=l.n; save(); renderPanel(); } };
    el.appendChild(b);
  });
}
function renderPanel(){
  const l=lvl(); renderLadder();
  buildKeyboard(l.layout||'qwerty');
  $('title').textContent=`Level ${l.n}: ${l.title}`; $('subtitle').textContent=l.sub;
  const le=$('lesson'); le.style.display='block'; $('drill').classList.remove('on');
  let html=l.explain.map(p=>`<p>${p}</p>`).join('')+`<div class="note">${l.note}</div>`;
  const p=perLevel(l.n);
  html+=`<div class="criteria"><div><b>95%</b>accuracy to pass</div>${l.wpm?`<div><b>${l.wpm}</b>net wpm to pass</div>`:''}<div><b>${p.bestNetWPM?Math.round(p.bestNetWPM):'—'}</b>your best</div><div><b>${p.attempts}</b>attempts</div></div>`;
  html+=`<div class="actions"><button class="btn primary" id="btnStart">${l.drillLabel}</button>`;
  if(l.slow) html+=`<button class="btn" id="btnAlt" ${S.slowWords.length<3?'disabled title="Complete a drill first to collect slow words"':''}>${l.altLabel} (${S.slowWords.length})</button>`;
  if(l.warmup) html+=`<button class="btn" id="btnAlt">${l.altLabel}</button>`;
  if(l.n===2 && S.detector) html+=`<span style="color:var(--muted);font-size:14px">Last estimate: ${styleLabel(S.detector)}</span>`;
  html+='</div>';
  if(l.n===7){ const os=S.dvorak.os; html+=`<p style="margin-top:14px;color:var(--muted);font-size:14px">${os==='dvorak'?'Your system already types Dvorak, so the browser remap is off and your keys are used as they are.':os?'Remap is on: your physical QWERTY keys produce Dvorak letters here only.':'The first drill starts with a one-key calibration to check what your system already does.'}</p>`; }
  le.innerHTML=html;
  $('btnStart').onclick=()=>startDrill('main');
  const alt=$('btnAlt'); if(alt) alt.onclick=()=>startDrill('alt');
  showNext();
}
function styleLabel(d){ return d.userOverride ? `you said "${d.userOverride==='fluent'?'fluent':'hunt and peck'}"` : d.bucket==='hunt'?'likely hunt and peck':d.bucket==='fluent'?'likely fluent':d.bucket==='mixed'?'mixed':'unknown'; }
