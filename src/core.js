/* ---------- layouts ---------- */
// Physical rows (KeyboardEvent.code). Finger index: 0 L-pinky .. 3 L-index, 4 R-index .. 7 R-pinky, 't' thumb.
const KB_ROWS = [
  ['Backquote','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0','Minus','Equal','Backspace'],
  ['Tab','KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY','KeyU','KeyI','KeyO','KeyP','BracketLeft','BracketRight','Backslash'],
  ['CapsLock','KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK','KeyL','Semicolon','Quote','Enter'],
  ['ShiftLeft','KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM','Comma','Period','Slash','ShiftRight'],
  ['ControlLeft','AltLeft','Space','AltRight','ControlRight'],
];
const CODE_FINGER = {};
(function(){
  const f = [0,1,2,3,3,4,4,5,6,7];
  ['KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY','KeyU','KeyI','KeyO','KeyP'].forEach((c,i)=>CODE_FINGER[c]=f[i]);
  ['KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK','KeyL','Semicolon'].forEach((c,i)=>CODE_FINGER[c]=f[i]);
  ['KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM','Comma','Period','Slash'].forEach((c,i)=>CODE_FINGER[c]=f[i]);
  ['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0'].forEach((c,i)=>CODE_FINGER[c]=f[i]);
  Object.assign(CODE_FINGER,{Backquote:0,Minus:7,Equal:7,BracketLeft:7,BracketRight:7,Backslash:7,Quote:7,
    Tab:0,CapsLock:0,ShiftLeft:0,ShiftRight:7,Enter:7,Backspace:7,Space:'t',ControlLeft:0,AltLeft:'t',AltRight:'t',ControlRight:7});
})();
const HOME_CODES = new Set(['KeyA','KeyS','KeyD','KeyF','KeyJ','KeyK','KeyL','Semicolon']);
const MOD_LABEL = {Tab:'tab',CapsLock:'caps',ShiftLeft:'shift',ShiftRight:'shift',Enter:'enter',Backspace:'⌫',Space:'',ControlLeft:'ctrl',AltLeft:'alt',AltRight:'alt',ControlRight:'ctrl'};
const KEY_WIDTH = {Backspace:'w2',Tab:'w15',Backslash:'w15',CapsLock:'w175',Enter:'w225',ShiftLeft:'w225',ShiftRight:'w275',Space:'w9',ControlLeft:'w15',AltLeft:'w15',AltRight:'w15',ControlRight:'w15'};

function mkLayout(rows, shiftedRows){
  const codes = [KB_ROWS[0].slice(0,13), KB_ROWS[1].slice(1,14), KB_ROWS[2].slice(1,12), KB_ROWS[3].slice(1,11)];
  const map = {}, shift = {};
  codes.forEach((row,ri)=>row.forEach((c,i)=>{ map[c]=rows[ri][i]; shift[c]=shiftedRows[ri][i]; }));
  const charToCode = {};
  Object.entries(map).forEach(([c,ch])=>{ charToCode[ch]={code:c,shift:false}; });
  Object.entries(shift).forEach(([c,ch])=>{ if(!(ch in charToCode)) charToCode[ch]={code:c,shift:true}; });
  charToCode[' ']={code:'Space',shift:false};
  return {map, shift, charToCode};
}
const LAYOUTS = {
  qwerty: mkLayout(
    ['`1234567890-=', 'qwertyuiop[]\\', "asdfghjkl;'", 'zxcvbnm,./'],
    ['~!@#$%^&*()_+', 'QWERTYUIOP{}|', 'ASDFGHJKL:"', 'ZXCVBNM<>?']),
  dvorak: mkLayout(
    ['`1234567890[]', "',.pyfgcrl/=\\", 'aoeuidhtns-', ';qjkxbmwvz'],
    ['~!@#$%^&*(){}', '"<>PYFGCRL?+|', 'AOEUIDHTNS_', ':QJKXBMWVZ']),
};
function charFinger(layoutName, ch){
  const e = LAYOUTS[layoutName].charToCode[ch.toLowerCase()] || LAYOUTS[layoutName].charToCode[ch];
  return e ? CODE_FINGER[e.code] : null;
}
function handOf(f){ return f==='t' ? 't' : (f<4 ? 'L' : 'R'); }
// same-finger bigram on two different keys
function isSFB(layoutName, a, b){
  if(a===b || a===' ' || b===' ') return false;
  const fa=charFinger(layoutName,a), fb=charFinger(layoutName,b);
  return fa!==null && fa===fb;
}

/* ---------- metrics ---------- */
// keystrokes: [{ch, ok, iki, rollover, code}] in order (iki=null for first). idleMs: gaps above this are excluded.
function summarize(drill, idleMs){
  const typed = drill.typed, target = drill.target;
  let uncorrected = 0;
  for(let i=0;i<target.length;i++){ if(!typed[i] || typed[i].ch!==target[i]) uncorrected++; }
  const minutes = drill.activeMs/60000;
  const gross = minutes>0 ? (typed.length/5)/minutes : 0;
  const net = minutes>0 ? Math.max(0, gross - uncorrected/minutes) : 0;
  const accuracy = drill.totalKeystrokes ? 100*drill.correctKeystrokes/drill.totalKeystrokes : 100;
  const n = drill.events.length;
  const rollover = n>1 ? drill.rolloverCount/(n-1) : 0;
  return {gross, net, accuracy, uncorrected, corrected:drill.correctedErrors, rollover,
          activeMs:drill.activeMs, keystrokes:drill.totalKeystrokes, kspc: typed.length? (drill.totalKeystrokes+drill.backspaces)/typed.length : 0};
}
// mean IKI per target word, using events that landed on the right position
function slowWords(drill, idleMs){
  const words = []; let start=0;
  for(let i=0;i<=drill.target.length;i++){
    if(i===drill.target.length || drill.target[i]===' '){ if(i>start) words.push({w:drill.target.slice(start,i),s:start,e:i}); start=i+1; }
  }
  const out = [];
  for(const w of words){
    const ikis = drill.events.filter(ev=>ev.pos>w.s && ev.pos<w.e && ev.iki!==null && ev.iki<=idleMs).map(ev=>ev.iki);
    if(ikis.length>=2) out.push({word:w.w, iki:ikis.reduce((a,b)=>a+b,0)/ikis.length});
  }
  return out.sort((a,b)=>b.iki-a.iki);
}

/* ---------- hunt-and-peck detector ---------- */
// Timing can't recover finger count; this estimates typing FLUENCY and reports honest confidence.
function detectStyle(events, idleMs){
  const ikis = events.filter(e=>e.iki!==null && e.iki<=idleMs).map(e=>e.iki);
  const n = events.length;
  if(ikis.length<20) return {bucket:'unknown', fluency:0, confidence:0, n, notes:['Not enough keystrokes to estimate.']};
  const mean = ikis.reduce((a,b)=>a+b,0)/ikis.length;
  const sd = Math.sqrt(ikis.reduce((a,b)=>a+(b-mean)**2,0)/ikis.length);
  const cv = sd/mean;
  const sorted = [...ikis].sort((a,b)=>a-b), median = sorted[Math.floor(sorted.length/2)];
  const longPause = ikis.filter(x=>x>3*median).length/ikis.length;
  const roll = n>1 ? events.filter(e=>e.rollover).length/(n-1) : 0;
  const lin = (x,lo,hi)=>Math.max(0,Math.min(1,(x-lo)/(hi-lo)));
  const sRoll = lin(roll,0.05,0.35);          // Dhakal 2018: slow ~8%, fast 40-70%
  const sMean = 1-lin(mean,150,450);          // fast ~120-180 ms, slow >450 ms
  const sCv   = 1-lin(cv,0.4,1.0);            // consistency
  const sPause= 1-lin(longPause,0.03,0.15);   // search pauses (visual-search proxy)
  const fluency = 0.4*sRoll + 0.3*sMean + 0.15*sCv + 0.15*sPause;
  const bucket = fluency<0.35 ? 'hunt' : fluency>0.65 ? 'fluent' : 'mixed';
  const edge = Math.min(Math.abs(fluency-0.35), Math.abs(fluency-0.65));
  const confidence = Math.min(0.95, 0.5 + 2*edge) * Math.min(1, n/200);
  const notes = [];
  notes.push(`${Math.round(roll*100)}% of keypresses overlapped the previous one`);
  notes.push(`${Math.round(mean)} ms between keys on average, consistency ${cv<0.5?'high':cv<0.8?'medium':'low'}`);
  notes.push(`${Math.round(longPause*100)}% of gaps were long pauses (a proxy for looking down)`);
  return {bucket, fluency, confidence, n, notes, features:{roll,mean,cv,longPause}};
}

/* ---------- levels ---------- */
const SENTENCES = [
  'The quick brown fox jumps over the lazy dog.',
  'She sold small shells by the sea shore, and it went well.',
  'My uncle bought a used car last week for a very good price.',
  'Please send the report before noon on Friday.',
  'Every morning he walks the dog around the park twice.',
  'The train to the city leaves at nine, so we should hurry.',
  'I think the new phone has a much better camera.',
  'Bring a jacket, because the evening might get cold.',
  'Our team fixed the bug and shipped the update on time.',
  'Nobody knew why the lights kept flickering all night.',
];
function pick(arr, n){ const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a.slice(0,n); }
function wordsDrill(list, n=20){
  const out=[]; while(out.length<n){ for(const w of pick(list,list.length)){ if(out.length>=n) break; if(out[out.length-1]!==w || list.length<2) out.push(w); } }
  return out.join(' ');
}
function diagnosticPassage(){ let s=[], len=0; for(const x of pick(SENTENCES,SENTENCES.length)){ s.push(x); len+=x.length+1; if(len>=220) break; } return s.join(' '); }
function keyPrompts(n=40){ const keys='abcdefghijklmnopqrstuvwxyz  '.split(''); const out=[]; while(out.length<n){ const k=keys[Math.floor(Math.random()*keys.length)]; if(k!==out[out.length-1]) out.push(k); } return out; }
function sfbWarmup(){
  const pairs=['ed','de','ce','ec','un','nu','my','lo','ol','br','ft','sw']; const out=[];
  for(const p of pick(pairs,6)) out.push((p+' ').repeat(3).trim());
  return out.join(' ');
}

const LEVELS = [
  {n:1, short:'Keyboard', title:'The keyboard', sub:'What the keys are and where they live', wpm:0, mode:'keys',
   explain:[
    'A keyboard is a grid of keys. The main letter block plus the space bar produce almost all text you will ever type.',
    'The small bumps on F and J are landmarks. Your index fingers rest on them so both hands can find their place without looking.',
    'Shift makes capitals and the upper symbols. Backspace deletes the last character. Enter confirms or starts a new line.',
   ], note:'This level is orientation, not speed. Find the key the game shows, press it, repeat 40 times.', drillLabel:'Find 40 keys'},
  {n:2, short:'Hunt and peck', title:'Hunt and peck', sub:'What it is, what it costs, and how you type right now', wpm:0, mode:'diagnostic',
   explain:[
    'Hunt and peck means searching for each key, usually with one or two fingers per hand, glancing down as you go.',
    'It can be fast. In a motion-capture study (Feit, Weir & Oulasvirta, 2016) self-taught typists using about six fingers matched touch typists at roughly 58 wpm.',
    'The cost is elsewhere: hunt-and-peck typists spent 40% of the time looking at the keyboard versus 20% for touch typists. Eyes on the keys means slower editing, missed errors, more finger travel, and a lower ceiling.',
   ], note:'Type the passage the way you normally type. The game will estimate your style from timing alone, so it reports a confidence, not a verdict. It cannot see your fingers.', drillLabel:'Type the passage'},
  {n:3, short:'Home row', title:'Touch typing and the home row', sub:'Eight fingers, eight home keys, eyes on the screen', wpm:15, mode:'text', words:()=>WORDS_HOME_Q_SHORT,
   explain:[
    'Touch typing rests eight fingers on the home row: A S D F for the left hand, J K L ; for the right. Every finger returns home after each key, so you never lose your place.',
    'The bumps on F and J let you find home by feel. From here the discipline is simple: look at the screen, not the keys, and let the on-screen keyboard below be your map.',
    'Accuracy first. Speed is a side effect of correct movements repeated; fast wrong movements only get faster at being wrong.',
   ], note:'Short home-row words only. Rest your fingers on the home keys and keep them there.', drillLabel:'Start drill'},
  {n:4, short:'Finger zones', title:'Finger zones', sub:'Each key belongs to one finger', wpm:20, mode:'text', words:()=>WORDS_HOME_Q,
   explain:[
    'On a QWERTY keyboard each key belongs to a specific finger: the coloured strips below show the zones. The index fingers cover two columns each; the others cover one.',
    'Words built only from home-row keys, like "lass" or "flask", let you feel the right finger for each letter with no reaching. Nothing has to move ahead of time, so the only thing being trained is the finger-to-key mapping.',
    'That mapping is the foundation. Every later speed gain rides on it being automatic.',
   ], note:'The game can only see which key you pressed, not which finger pressed it. Finger hints are guidance, never a fail.', drillLabel:'Start drill'},
  {n:5, short:'Preloading', title:'Finger preloading', sub:'Fingers move to the next key before the current one is done', wpm:30, mode:'text', words:()=>WORDS_NO_SFB, rollover:true, slow:true,
   explain:[
    'As you get fluent, fingers start moving toward upcoming keys early, and you press the next key before releasing the last. That overlap is called rollover, and in a study of 168,000 typists (Dhakal et al., 2018) it was the strongest timing correlate of speed: fast typists overlapped 40 to 70% of keypresses.',
    'Alternating hands helps too. Salthouse (1986) measured keystrokes on alternate hands as 30 to 60 ms faster than same-hand keystrokes.',
    'You cannot force this; it grows with practice under the right conditions. These words spread letters across fingers and hands so preloading pays off. Words that slow you down are queued so you can drill them on their own.',
   ], note:'Watch the rollover meter. It rises on its own as movements overlap.', drillLabel:'Start drill', altLabel:'Drill my slow words'},
  {n:6, short:'Same finger', title:'Breaking the zones', sub:'Two letters in a row on the same finger', wpm:25, mode:'text', words:()=>WORDS_SFB, warmup:true,
   explain:[
    'Some letter pairs are typed by the same finger on two different keys: c then e in "cent", e then d in "bed", u then n in "hunt". That finger has to move twice in a row and cannot preload. These same-finger bigrams are the slowest transitions on the keyboard.',
    'The penalty is large. Same-hand digraphs already run about 50 ms slower than two-hand ones (Salthouse, 1984), and same-finger sequences are far worse again.',
    'Drilling them on their own builds control for the words that break your rhythm. The target below outlines the two keys in red when the next pair shares a finger.',
   ], note:'The pass target is lower than the last level on purpose. These words are slower for everyone.', drillLabel:'Start drill', altLabel:'Bigram warm-up'},
  {n:7, short:'Dvorak', title:'Custom layouts: Dvorak', sub:'A layout is just software', wpm:15, mode:'text', words:()=>WORDS_HOME_D, layout:'dvorak',
   explain:[
    'A layout is a mapping from physical keys to characters. Change the mapping and the same keyboard types a different alphabet.',
    'Dvorak puts all the vowels on the left home row and the common consonants on the right, so hands alternate far more often: about 62% of successive keystrokes switch hands on Dvorak versus 51% on QWERTY.',
    'The game remaps your keystrokes in the browser, so nothing changes on your computer. Expect to feel slow. Everyone does for the first weeks.',
   ], note:'Home-row words on Dvorak: a o e u i on the left, d h t n s on the right. The on-screen keyboard shows the Dvorak legends.', drillLabel:'Start drill'},
];
