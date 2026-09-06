#!/usr/bin/env python3
"""Regenerates src/words.js from data/google-10000-english-usa-no-swears.txt.

Level rules (see docs/DOCS-design.md §3):
  WORDS_HOME_Q        Level 4 — letters ⊆ {a s d f g h j k l} (curated list below; the 10k list only had 29)
  WORDS_HOME_Q_SHORT  Level 3 — same, length ≤ 4
  WORDS_NO_SFB        Level 5 — no same-finger bigram on different keys, hand-alternation ≥ 0.6, len 3–8
  WORDS_SFB           Level 6 — contains at least one same-finger bigram on different keys, len 3–9
  WORDS_HOME_D        Level 7 — letters ⊆ Dvorak home row {a o e u i d h t n s}, len 3–9

Words are validated against /usr/share/dict/american-english (Debian package `wamerican`, SCOWL-based)
to drop abbreviations and junk. Run from the repo root: python3 tools/gen_words.py
"""
import json, re, os, sys

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'data', 'google-10000-english-usa-no-swears.txt')
OUT = os.path.join(ROOT, 'src', 'words.js')
DICT_PATH = '/usr/share/dict/american-english'

# finger index: 0 Lpinky 1 Lring 2 Lmid 3 Lidx 4 Ridx 5 Rmid 6 Rring 7 Rpinky
FINGERS = [0,1,2,3,3,4,4,5,6,7]
QWERTY = {ch: f for row in ["qwertyuiop", "asdfghjkl;", "zxcvbnm,./"] for ch, f in zip(row, FINGERS)}
DVORAK = {ch: f for row in ["',.pyfgcrl", "aoeuidhtns", ";qjkxbmwvz"] for ch, f in zip(row, FINGERS)}

def hand(f): return 0 if f < 4 else 1
def sfb(word, fm):  # same finger, different keys
    return any(a != b and fm[a] == fm[b] for a, b in zip(word, word[1:]))
def alt_ratio(word, fm):
    pairs = list(zip(word, word[1:]))
    return sum(hand(fm[a]) != hand(fm[b]) for a, b in pairs) / len(pairs) if pairs else 0

if not os.path.exists(DICT_PATH):
    sys.exit(f"missing {DICT_PATH} — install `wamerican` (Debian/Ubuntu) or `words` (Arch: pacman -S words)")
DICT = {w.strip() for w in open(DICT_PATH) if re.fullmatch(r"[a-z]+", w.strip())}
TWO_OK = {"as", "ha", "ah", "ad"}
words = [w.strip() for w in open(SRC) if re.fullmatch(r"[a-z]+", w.strip())]
words = [w for w in words if w in DICT and (len(w) >= 3 or w in TWO_OK)]

# Curated by hand (the 10k list yields only 29 home-row words). Excludes slurs and obscure entries.
HOME_Q = ("as ad ah ha add adds ads alas all ash ask asks dad dads dash fad fads fall falls flag flags flak flash "
          "flask flasks gag gags gal gala gall gals gas gash glad glass had hag half hall halls has hash jag jags "
          "lad lads lag lags lash lass sad sag saga sagas sags salad salads salsa sash shall slag slash alfalfa").split()
assert all(set(w) <= set("asdfghjkl") for w in HOME_Q)

DHOME = set("aoeuidhtns")
home_d = [w for w in words if set(w) <= DHOME and 3 <= len(w) <= 9]
no_sfb = [w for w in words if 3 <= len(w) <= 8 and not sfb(w, QWERTY) and alt_ratio(w, QWERTY) >= 0.6]
with_sfb = [w for w in words if 3 <= len(w) <= 9 and sfb(w, QWERTY)]

out = "\n".join([
    f"const WORDS_HOME_Q = {json.dumps(HOME_Q)};",
    f"const WORDS_HOME_Q_SHORT = {json.dumps([w for w in HOME_Q if len(w) <= 4])};",
    f"const WORDS_NO_SFB = {json.dumps(no_sfb[:320])};",
    f"const WORDS_SFB = {json.dumps(with_sfb[:320])};",
    f"const WORDS_HOME_D = {json.dumps(home_d[:220])};",
])
open(OUT, "w").write(out)
print(f"home_q {len(HOME_Q)}  no_sfb {len(no_sfb)}→320  with_sfb {len(with_sfb)}→320  home_d {len(home_d)}→220  -> {OUT}")
assert sfb("cent", QWERTY) and not sfb("lass", QWERTY) and alt_ratio("the", QWERTY) == 1.0
