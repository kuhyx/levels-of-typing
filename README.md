# Levels of typing

A seven-level, single-file, offline typing game: keyboard basics → hunt-and-peck diagnosis → home row → finger zones → preloading/rollover → same-finger bigrams → Dvorak (remapped in the browser).

Built 2–3 Sep 2026 in claude.ai from a research design doc. Read this file, then `DOCS-decisions.md`, then `docs/DOCS-design.md`.

## Status

- `dist/levels-of-typing.html` — **working**, all 7 levels, verified by `tools/test.js` (46 assertions, all passing) and Chromium screenshots in `screenshots/`.
- **Not verified:** real physical-keyboard timing/rollover on a real machine; Firefox and Safari; detector thresholds against real users (they come from Dhakal et al. 2018 ranges — see `docs/DOCS-design.md` §4).
- Every product decision is locked in `DOCS-decisions.md`. Do not re-open those without asking Kuhy; the "Claude's calls" section lists what is fair game.

## Layout

```
dist/levels-of-typing.html      the deliverable (open in a browser; no server needed)
src/part1.html                  markup + CSS (dark theme, tokens in :root)
src/words.js                    generated per-level word lists (do not hand-edit; regenerate)
src/core.js                     layouts, finger maps, metrics, detector, level definitions — no DOM
src/state.js                    the one state object, localStorage load/save, $ and toast helpers
src/panel.js                    keyboard rendering, level ladder, lesson panel
src/drill.js                    drill lifecycle: start, render, keystroke accounting, finish, results
src/app.js                      Dvorak calibration, keydown dispatch, settings, boot (window.__game at the end)
tools/gen_words.py              regenerates src/words.js from data/ (needs /usr/share/dict/american-english)
tools/build.py                  concatenates the src/ parts (in PARTS order) into dist/, runs node --check
tools/test.js                   headless jsdom functional test that drives every level
tools/package.json              jsdom dependency for the test (exact-pinned; lockfile committed)
data/google-10000-english-usa-no-swears.txt   word source (Google Trillion Word Corpus derivative)
docs/DOCS-design.md             the research-backed design spec (sources at the end)
screenshots/                    what it looked like at handoff
scripts/                        thin shims to the shared gates in ~/utils (file length, md naming, deps)
```

The `src/*.js` parts are not modules: `build.py` concatenates them into one `<script>`, so they share one top-level scope and their order in `PARTS` is what resolves names. They are split only so no file exceeds the 250-line cap.

## Build and test

```sh
# Arch: sudo pacman -S words nodejs npm     (Debian: apt install wamerican nodejs npm)
scripts/install_hooks.sh                    # once per clone: pre-commit gates
python3 tools/gen_words.py                  # only if you change word rules; otherwise skip
python3 tools/build.py                      # -> dist/levels-of-typing.html
npm --prefix tools ci && node tools/test.js # headless functional test, expects "ALL PASSED"
```

`test.js` fakes `performance.now()` and `matchMedia`, dispatches KeyboardEvents on `document`, and reads state through `window.__game` (a small debug hook at the end of `src/app.js`).

## How the pieces fit

- **Input** is captured on `document` `keydown`, never an `<input>`, so paste can't inject text and so Level 7 can synthesise characters from `KeyboardEvent.code`. QWERTY levels use `e.key`; the Dvorak level uses `e.code` → `LAYOUTS.dvorak.map` unless calibration found the OS already types Dvorak.
- **Metrics** (`summarize` in core.js): 5 chars = 1 word; gross = chars/5/min; net = gross − uncorrected/min; accuracy = correct keystrokes / all printable keystrokes (a typo you backspace still costs accuracy). Timer starts on first keystroke; inter-key gaps above the idle threshold (default 5000 ms) contribute nothing.
- **Detector** (`detectStyle`): rollover ratio, mean IKI, IKI coefficient of variation, long-pause fraction → weighted fluency → hunt / mixed / fluent + confidence. Shown after Level 2 with a self-override. Never gates anything.
- **Pass** = one main drill with accuracy ≥ 95% and net WPM ≥ `LEVELS[n].wpm` (L1: 40 key prompts ≥95% correct; L2: accuracy only). Practice drills (slow words, bigram warm-up) never unlock.
- **Persistence**: one JSON blob in `localStorage['typinggame.v1']`; export/import in Settings; `QuotaExceededError` is caught and toasted.
- **Word lists** are filtered at build time by the QWERTY finger map: home-row-only (L3/L4), no same-finger bigram + hand alternation ≥ 0.6 (L5), contains a same-finger bigram (L6), Dvorak home-row-only (L7). `isSFB()` in core.js is the single definition of "same finger, different keys".

## Sensible next steps (none started)

1. Playtest on real hardware; tune detector thresholds and per-level WPM targets (DOCS-decisions.md #4 says revisit if pass rates <40% or >90%).
2. Colemak: add `LAYOUTS.colemak` tables, a finger map, recompute L3–L6 word lists against it, extend calibration. Engine needs no changes (DOCS-design.md §5).
3. Cross-browser check (Firefox, Safari): `getModifierState('CapsLock')`, `KeyboardEvent.code` on non-ANSI boards.
