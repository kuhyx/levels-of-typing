const {JSDOM} = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname,'..','dist','levels-of-typing.html'),'utf8');
let now = 0;
// jsdom >= 25: sendTo() became forwardTo(). jsdomErrors:"none" so an error is printed once, by our handler, not twice.
const {VirtualConsole}=require('jsdom'); const vc=new VirtualConsole(); vc.on('jsdomError',e=>console.log('JSDOM ERROR',e.message)); vc.forwardTo(console,{jsdomErrors:'none'});
const dom = new JSDOM(html, {url:'http://localhost/', runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc, beforeParse(w){
  w.performance.now = () => now;
  w.matchMedia = () => ({matches:false});
  w.confirm = () => true;
  w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL=()=>{};
}});
const w0 = dom.window, d = w0.document;
const w = new Proxy(w0,{get(t,k){ if(k in (t.__game||{})) return t.__game[k]; return t[k]; }});
const $ = id => d.getElementById(id);
let fails = 0;
const ok = (c, m) => { if(!c){ fails++; console.log('FAIL', m); } else console.log('ok  ', m); };

// QWERTY char -> {code, shift}
const Q = w.LAYOUTS.qwerty.charToCode;
function press(ch, dt=120, opts={}){
  now += dt;
  let code, shift=false, key=ch;
  if(opts.code){ code=opts.code; key=opts.key ?? ch; }
  else { const e = Q[ch]; code=e.code; shift=e.shift; }
  const down = new w.KeyboardEvent('keydown',{key, code, shiftKey:shift, bubbles:true, cancelable:true});
  d.dispatchEvent(down);
  if(!opts.hold){ now += 60; d.dispatchEvent(new w.KeyboardEvent('keyup',{key, code, bubbles:true})); }
}
function typeText(text, dt){ for(const ch of text) press(ch, dt); }
const S = () => w.S;
const results = () => $('results').classList.contains('on');

// ---- Level 1: keys mode
$('btnStart').click();
ok(!$('keyprompt').hidden && $('target').hidden, 'L1 shows key prompts');
let target = w.D.target;
ok(target.length===40, 'L1 has 40 prompts');
// one wrong key first, then all correct
press(target[0]==='a'?'b':'a', 100);
ok($('banner').classList.contains('error'), 'L1 wrong key shows error banner and does not advance');
for(const ch of target) press(ch, 100);
ok(results(), 'L1 results shown');
ok(S().perLevel[1].passed && S().unlocked===2, 'L1 passed at 40/41 (97.6%) and unlocked L2');
$('rActions').querySelector('.primary').click();
ok(S().current===2, 'moved to L2');

// ---- Level 2: diagnostic, hunt-and-peck style (slow, no rollover, occasional long pause)
$('btnStart').click();
target = w.D.target;
ok(target.length>=220, 'L2 passage >= 220 chars ('+target.length+')');
let i=0; for(const ch of target){ press(ch, (i++%17===0)?1800:500); }
ok(results(), 'L2 results shown');
let det = S().detector;
ok(det && det.bucket==='hunt', 'detector says hunt for slow/no-rollover typing (got '+det.bucket+', fluency '+det.fluency.toFixed(2)+')');
ok(!$('btnSkip'), 'no skip button for hunt-and-peck');
ok(S().perLevel[2].passed && S().unlocked===3, 'L2 passed (accuracy only)');
// override to fluent -> skip appears
$('ovFluent').click();
ok(!!$('btnSkip'), 'self-override to fluent exposes skip');
$('rActions').querySelector('.quiet').click(); // close
// redo diagnostic as a fluent typist with rollover
$('btnStart').click(); target=w.D.target;
for(const ch of target){ now+=110; const e=Q[ch]; d.dispatchEvent(new w.KeyboardEvent('keydown',{key:ch,code:e.code,shiftKey:e.shift,bubbles:true,cancelable:true})); now+=20; }
// release everything
for(const ch of target){ const e=Q[ch]; d.dispatchEvent(new w.KeyboardEvent('keyup',{key:ch,code:e.code,bubbles:true})); }
det = S().detector;
ok(det.bucket==='fluent' && det.confidence>=0.7, 'detector says fluent w/ rollover (fluency '+det.fluency.toFixed(2)+', conf '+det.confidence.toFixed(2)+')');
ok(!!$('btnSkip'), 'skip offered for fluent detection');
$('rActions').querySelector('.quiet').click();

// ---- Level 3: fail on WPM, then pass; check accuracy math and backspace
$('rActions'); $('ladder').querySelectorAll('.step')[2].click();
ok(S().current===3, 'moved to L3');
$('btnStart').click(); target=w.D.target;
typeText(target, 700); // ~17 wpm? 5 chars/word: 60000/700/5 = 17 wpm -> passes 15. use 900 to fail
ok(results(), 'L3 drill 1 finished');
let net1 = parseInt($('rGrid').querySelector('b').textContent);
$('rActions').querySelector('.quiet').click();
$('btnStart').click(); target=w.D.target;
typeText(target, 1000); // 12 wpm -> fail
ok(results() && $('rTitle').textContent==='Not yet', 'L3 fails below 15 wpm (net shown '+$('rGrid').querySelector('b').textContent+')');
$('rActions').querySelector('.quiet').click();
// pass with a corrected error and an idle gap
$('btnStart').click(); target=w.D.target;
press(target[0]==='x'?'y':'x', 200); // wrong
press('Backspace', 200, {code:'Backspace', key:'Backspace'});
ok(w.D.typed.length===0 && w.D.correctedErrors===1, 'backspace removes wrong char and counts corrected error');
i=0; for(const ch of target){ press(ch, i===10 ? 9000 : 200); i++; } // 9 s idle gap excluded
const m = S().perLevel[3];
ok(results() && m.passed, 'L3 passes at ~55 wpm despite 9 s idle gap (idle excluded)');
const accTxt = $('rGrid').querySelectorAll('b')[2].textContent;
ok(accTxt !== '100%', 'accuracy counts the corrected error ('+accTxt+')');
ok(S().unlocked===4, 'L4 unlocked');
$('rActions').querySelector('.quiet').click();

// ---- Level 5: slow words queue & practice drill doesn't pass
$('ladder').querySelectorAll('.step')[3].click(); $('btnStart').click(); typeText(w.D.target,150); $('rActions').querySelector('.quiet').click();
ok(S().unlocked>=5, 'L4 passed');
$('ladder').querySelectorAll('.step')[4].click();
ok($('btnAlt') && $('btnAlt').disabled, 'L5 slow-word button disabled before any drill');
$('btnStart').click(); target=w.D.target;
// make the 2nd word slow
const words = target.split(' '); let pos=0; let wi=0;
for(const ch of target){ press(ch, (wi===1)?600:150); pos++; if(ch===' ') wi++; }
ok(S().slowWords.length>=1 && S().slowWords[0].word===words[1], 'slowest word queued: '+S().slowWords[0].word);
ok(S().perLevel[5].passed, 'L5 passed at 150ms/key (~80 wpm)');
$('rActions').querySelector('.quiet').click();
// practice drill
S().slowWords.push({word:'test',iki:1},{word:'again',iki:1}); w.save(); w.renderPanel();
$('btnAlt').click(); ok(w.D && w.D.kind==='alt', 'practice drill started from slow words');
typeText(w.D.target, 150);
ok($('rTitle').textContent==='Practice drill done' && !$('rActions').querySelector('.primary'), 'practice drill does not offer level advance');
$('rActions').querySelector('.quiet').click();

// ---- Level 6: SFB highlight
$('ladder').querySelectorAll('.step')[5].click(); $('btnStart').click(); target=w.D.target;
// find a position where next two chars are SFB
let sfbSeen=false;
for(let k=0;k<target.length;k++){
  const a=target[k], b=target[k+1];
  if(b && w.isSFB('qwerty',a,b)){ ok($('kb').querySelectorAll('.sfb').length===2, 'SFB pair highlighted for "'+a+b+'"'); sfbSeen=true; break; }
  press(a,150);
}
ok(sfbSeen, 'found an SFB in L6 words');
w.abortDrill();
ok(!$('drill').classList.contains('on'), 'abort returns to lesson');
ok(w.isSFB('qwerty','c','e') && !w.isSFB('qwerty','s','s') && !w.isSFB('qwerty','t','h'), 'isSFB: ce yes, ss no, th no');
$('btnAlt').click(); ok(/^([a-z]{2} ){2}/.test(w.D.target), 'bigram warm-up target: '+w.D.target.slice(0,20)); w.abortDrill();

// ---- Level 7: calibration + remap
S().unlocked=7; w.save(); w.renderPanel(); $('ladder').querySelectorAll('.step')[6].click();
ok($('layoutTag').textContent.includes('Dvorak'), 'L7 keyboard shows Dvorak');
ok($('kb').querySelector('[data-code="KeyS"]').textContent==='o', 'physical S key labelled o on Dvorak');
$('btnStart').click();
ok(w.calib!==null, 'calibration pending');
press('q',100,{code:'KeyA',key:'a'}); ok(w.calib!==null && $('banner').classList.contains('on'), 'wrong key during calibration is rejected');
press('q',100,{code:'KeyQ',key:'q'});
ok(S().dvorak.os==='qwerty' && w.D, 'QWERTY system detected, drill started');
target=w.D.target;
// type using physical QWERTY codes that map to the Dvorak chars
const DV = w.LAYOUTS.dvorak.charToCode;
for(const ch of target){ const e=DV[ch]; press(ch,150,{code:e.code, key: w.LAYOUTS.qwerty.map[e.code]||' '}); }
ok(results() && S().perLevel[7].passed, 'Dvorak drill passes when physical keys are remapped');
ok($('rVerdict').textContent.includes('finished'), 'ladder finished message');
$('rActions').querySelector('.quiet').click();
// OS already Dvorak: remap off, e.key used directly
S().dvorak.os=null; w.save(); w.renderPanel(); $('btnStart').click();
press("'",100,{code:'KeyQ',key:"'"});
ok(S().dvorak.os==='dvorak' && w.D, 'Dvorak system detected -> remap off');
target=w.D.target; typeText(target,150); // press() uses QWERTY code for ch but key=ch: key path used
ok(results() && $('rTitle').textContent==='Passed', 'OS-Dvorak path uses e.key directly');
$('rActions').querySelector('.quiet').click();

// ---- persistence
const raw = w.localStorage.getItem('typinggame.v1');
const parsed = JSON.parse(raw);
ok(parsed.version===1 && parsed.unlocked===7 && parsed.perLevel[3].passed, 'state persisted in localStorage');
$('btnSettings').click(); $('importBox').value='{"nope":1}'; $('btnImport').click();
ok(S().unlocked===7, 'invalid import rejected');
$('importBox').value=JSON.stringify(Object.assign({},parsed,{unlocked:3,current:2})); $('btnImport').click();
ok(S().unlocked===3 && S().current===2, 'valid import applied');
$('btnCloseSettings').click();
ok(!$('settings').classList.contains('on'), 'settings closed');

// ---- paste blocked
$('btnStart').click();
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'v',code:'KeyV',ctrlKey:true,bubbles:true,cancelable:true}));
ok(w.D.typed.length===0, 'ctrl+v inserts nothing');
w.abortDrill();

console.log(fails ? `\n${fails} FAILURES` : '\nALL PASSED');
process.exit(fails?1:0);
