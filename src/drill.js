/* ---------- drill ---------- */
let D=null;               // active drill
let downSet=new Set();    // physical keys currently held (non-modifier)
let warnedLayout=false;
let calib=null;           // pending Dvorak calibration callback
const IDLE = () => S.settings.idleMs;

function startDrill(kind){
  const l=lvl();
  if(l.n===7 && !S.dvorak.os){ runCalibration(()=>startDrill(kind)); return; }
  let target, mode=l.mode, isDiag=false;
  if(l.mode==='keys'){ target=keyPrompts(40).join(''); }
  else if(l.mode==='diagnostic'){ target=diagnosticPassage(); mode='text'; isDiag=true; }
  else if(kind==='alt' && l.slow){ target=wordsDrill(S.slowWords.map(x=>x.word),20); }
  else if(kind==='alt' && l.warmup){ target=sfbWarmup(); }
  else target=wordsDrill(l.words(),20);
  D={mode, kind, isDiag, target, typed:[], events:[], startTs:null, lastDownTs:null, activeMs:0, idle:false,
     correctKeystrokes:0, totalKeystrokes:0, correctedErrors:0, backspaces:0, rolloverCount:0, correct:0};
  downSet.clear();
  $('lesson').style.display='none'; $('drill').classList.add('on');
  $('stats').classList.toggle('show-rollover', !!(l.rollover||isDiag));
  $('keyprompt').hidden = mode!=='keys'; $('target').hidden = mode==='keys';
  $('banner').className='banner';
  renderDrill();
}
function abortDrill(){ if(!D && !calib) return; D=null; calib=null; $('banner').className='banner'; $('lesson').style.display='block'; $('drill').classList.remove('on'); showNext(); }
let tick=null;
function renderDrill(){
  if(!D) return;
  if(D.mode==='keys'){
    const ch=D.target[D.typed.length]; const done=D.typed.length>=D.target.length;
    $('keyprompt').innerHTML = done?'':(ch===' '?'␣<small>space bar</small>':ch+`<small>press this key · ${D.typed.length+1} of ${D.target.length}</small>`);
    showNext(ch);
    $('sProg').textContent=`${D.typed.length}/${D.target.length}`; $('sAcc').textContent=D.totalKeystrokes?Math.round(100*D.correctKeystrokes/D.totalKeystrokes)+'%':'100%';
    $('sWpm').textContent='—'; $('sTime').textContent='—';
    return;
  }
  const t=$('target'); const parts=[]; const pos=D.typed.length;
  for(let i=0;i<D.target.length;i++){
    const c=D.target[i]; const shown=c===' '?' ':c;
    if(i<pos){ const ok=D.typed[i].ch===c; parts.push(`<span class="${ok?'ok':'err'}${c===' '?' sp':''}">${ok||c!==' '?shown:D.typed[i].ch}</span>`); }
    else if(i===pos) parts.push(`<span class="cur">${shown}</span>`);
    else parts.push(`<span class="todo">${shown}</span>`);
  }
  t.innerHTML=parts.join('');
  t.classList.toggle('idle', D.idle);
  const nxt=D.target[pos], after=D.target[pos+1];
  showNext(nxt, (nxt!==undefined && after!==undefined && lvl().n===6 && isSFB(activeLayout,nxt,after)) ? after : null);
  const m=summarize(D, IDLE());
  $('sWpm').textContent=D.activeMs>0?Math.round(m.net):'0'; $('sAcc').textContent=Math.round(m.accuracy)+'%';
  $('sTime').textContent=(D.activeMs/1000).toFixed(1)+'s'; $('sProg').textContent=`${pos}/${D.target.length}`;
  $('sRoll').textContent=Math.round(m.rollover*100)+'%';
}
function onChar(ch, code, rollover){
  const now=performance.now();
  if(D.mode==='keys'){
    const want=D.target[D.typed.length]; const ok=ch.toLowerCase()===want;
    D.totalKeystrokes++; if(ok) D.correctKeystrokes++;
    flash(code);
    if(ok) D.typed.push({ch,ok:true}); else { $('banner').className='banner on error'; $('banner').textContent=`That was "${ch===' '?'space':ch}". Look for "${want===' '?'the space bar':want}" — it is highlighted below.`; renderDrill(); return; }
    $('banner').className='banner';
    if(D.typed.length>=D.target.length) finishDrill(); else renderDrill();
    return;
  }
  const pos=D.typed.length, ok=ch===D.target[pos];
  let iki=null;
  if(D.startTs===null){ D.startTs=now; }
  else { iki=now-D.lastDownTs; if(iki<=IDLE()) D.activeMs+=iki; }
  D.lastDownTs=now; D.idle=false;
  D.totalKeystrokes++; if(ok) D.correctKeystrokes++; if(rollover) D.rolloverCount++;
  D.typed.push({ch,ok}); D.events.push({t:now,iki,code,ch,ok,rollover,pos});
  flash(code);
  if(D.typed.length>=D.target.length) finishDrill(); else renderDrill();
}
function onBackspace(){ if(D.mode==='keys'||!D.typed.length) return; const last=D.typed.pop(); D.backspaces++; if(!last.ok) D.correctedErrors++; renderDrill(); }
function flash(code){ const k=keyEl(code); if(!k) return; k.classList.add('down'); setTimeout(()=>k.classList.remove('down'),90); }
tick=setInterval(()=>{ if(D && D.mode==='text' && D.startTs!==null && !D.idle && performance.now()-D.lastDownTs>IDLE()){ D.idle=true; $('target').classList.add('idle'); } },500);

function finishDrill(){
  const l=lvl(), p=perLevel(l.n); p.attempts++;
  let passed, grid=[], slowHtml='', detect=null;
  if(D.mode==='keys'){
    const acc=100*D.correctKeystrokes/D.totalKeystrokes; passed=acc>=95;
    grid=[['Correct keys',`${D.correctKeystrokes}/${D.totalKeystrokes}`],['Accuracy',Math.round(acc)+'%']];
    p.bestAccuracy=Math.max(p.bestAccuracy,acc);
  } else {
    const m=summarize(D, IDLE());
    passed = m.accuracy>=95 && m.net>=l.wpm;
    grid=[['Net wpm',Math.round(m.net)],['Gross wpm',Math.round(m.gross)],['Accuracy',Math.round(m.accuracy)+'%'],['Uncorrected errors',m.uncorrected],['Corrected errors',m.corrected],['Active time',(m.activeMs/1000).toFixed(1)+'s']];
    if(l.rollover||D.isDiag) grid.push(['Rollover',Math.round(m.rollover*100)+'%']);
    p.bestAccuracy=Math.max(p.bestAccuracy,m.accuracy); if(m.accuracy>=95) p.bestNetWPM=Math.max(p.bestNetWPM,m.net);
    const all=slowWords(D, IDLE()), sw=all.slice(0,3);
    if(sw.length && D.kind!=='alt' && l.mode==='text') slowHtml='Slowest words: '+sw.map(x=>`<code>${x.word}</code>`).join('')+`<span>(${Math.round(sw[0].iki)} ms/key)</span>`;
    if(l.slow && all.length){
      for(const x of all){ const i=S.slowWords.findIndex(y=>y.word===x.word); if(i>=0) S.slowWords[i]=x; }   // any drill refreshes known words
      if(D.kind!=='alt') for(const x of sw){ if(!S.slowWords.some(y=>y.word===x.word)) S.slowWords.push(x); }
      S.slowWords.sort((p,q)=>q.iki-p.iki); S.slowWords=S.slowWords.slice(0,30);
    }
    if(D.isDiag){ detect=detectStyle(D.events, IDLE()); S.detector={bucket:detect.bucket,fluency:detect.fluency,confidence:detect.confidence,n:detect.n,notes:detect.notes,userOverride:null}; }
  }
  const practice = D.kind==='alt';
  if(passed && !practice){ p.passed=true; if(l.n<7) S.unlocked=Math.max(S.unlocked,l.n+1); }
  save();
  showResults(passed, grid, slowHtml, detect, practice);
  D=null; $('lesson').style.display='block'; $('drill').classList.remove('on'); showNext();
}
function showResults(passed, grid, slowHtml, detect, practice){
  const l=lvl();
  $('rTitle').textContent = practice ? 'Practice drill done' : passed ? 'Passed' : 'Not yet';
  const v=$('rVerdict'); v.className='verdict '+(practice?'':passed?'pass':'fail');
  v.textContent = practice ? (passed?'That would have passed. Practice drills do not unlock levels; run the main drill.':'Practice drills do not unlock levels. Keep at it, then run the main drill.') : passed ? (l.n<7?`Level ${l.n+1} is unlocked.`:'You have finished the ladder.') : (l.wpm?`Need 95% accuracy and ${l.wpm} net wpm in one drill. Aim for 98% accuracy; speed follows.`:'Need 95% correct. Slow down and look for the highlighted key.');
  $('rGrid').innerHTML=grid.map(([k,val])=>`<div><small>${k}</small><b>${val}</b></div>`).join('');
  $('rSlow').innerHTML=slowHtml;
  const d=$('rDetect'); d.hidden=!detect;
  const acts=[];
  if(detect){
    const label=detect.bucket==='hunt'?'Your typing looks mostly hunt and peck':detect.bucket==='fluent'?'Your typing looks fluent':detect.bucket==='mixed'?'Your typing looks mixed':'Could not estimate your style';
    d.innerHTML=`<b>${label} <span style="color:var(--muted);font-weight:400">(confidence ${Math.round(detect.confidence*100)}%)</span></b>Timing alone cannot tell how many fingers you use; a fast six-finger typist looks identical to a touch typist here.<ul>${detect.notes.map(n=>`<li>${n}</li>`).join('')}</ul><div class="fix">This is wrong, I type: <button class="btn" id="ovHunt">hunt and peck</button><button class="btn" id="ovFluent">fluently</button></div>`;
    $('ovHunt').onclick=()=>{S.detector.userOverride='hunt';save();toast('Noted.');renderSkip();}; $('ovFluent').onclick=()=>{S.detector.userOverride='fluent';save();toast('Noted.');renderSkip();};
  }
  $('rActions').innerHTML='';
  const mk=(t,cls,fn)=>{const b=document.createElement('button');b.className='btn '+cls;b.textContent=t;b.onclick=fn;$('rActions').appendChild(b);return b;};
  mk(passed&&!practice?'Try again for a better score':'Try again','',()=>{const k=practice?'alt':'main';closeResults();startDrill(k);});
  if(passed && !practice && l.n<7) mk(`Go to level ${l.n+1}`,'primary',()=>{closeResults();S.current=l.n+1;save();renderPanel();});
  mk('Close','quiet',closeResults);
  function renderSkip(){ const old=$('btnSkip'); if(old) old.remove(); if(!skipEligible()) return; const b=mk('Skip to level 6 (test out)','',()=>{closeResults();S.unlocked=Math.max(S.unlocked,6);[3,4,5].forEach(n=>{if(!perLevel(n).passed&&!S.skipped.includes(n))S.skipped.push(n)});S.current=6;save();renderPanel();}); b.id='btnSkip'; }
  if(passed && l.n===2) renderSkip();
  $('results').classList.add('on');
}
function skipEligible(){ const d=S.detector; return !!d && perLevel(2).passed && (d.userOverride==='fluent' || (!d.userOverride && d.bucket==='fluent' && d.confidence>=0.7)); }
function closeResults(){ $('results').classList.remove('on'); renderPanel(); }
