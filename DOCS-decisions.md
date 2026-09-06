# Decisions log — Levels of typing

Session: claude.ai mobile, 2–6 September 2026. Everything below was stated or confirmed by Kuhy unless marked "Claude's call".

## Original brief (verbatim)

> typing game
> you go through levels of understanding of typing
> that is keyboard
> how to use it
> what is look and pick method and why it is slow
> what is touch typing and how to learn it and what is home row
> what are finger zones - learn by typing words where preloading is not usefull at all like lass
> what is finger preloading - learning specific words and preloading fingers for them - improve on specific words
> what is breaking finger zones rules - learning words which have consecutive letters in same finger zone like - cent
> what are custom keyboards and custom layouts - learning custom layouts like Dvorak

## Round 1 clarifications

Claude's reading of the user's terms, confirmed by proceeding:
- Finger zones: standard QWERTY finger assignment. "lass" works because every letter is a home-row key — no finger moves, nothing to preload.
- Preloading: while one finger strikes, the others move to their next key in advance. Drills use words whose letters fall on different fingers/hands.
- Breaking the rules: consecutive letters on the same finger ("ce" in cent) force a sequential move — drilled as the hard case.

Answers:
1. Deliverable: research/design doc first, then build.
2. Each level = short explanation + drills; pass = ≥95% accuracy AND a per-level WPM target; passing unlocks the next level. The hunt-and-peck level must DETECT typing style.
3. Custom layouts: remap physical QWERTY keys to Dvorak in software (no OS change). Dvorak only for now (Colemak unanswered → Claude assumed Dvorak only; noted as easy to add).
4. "look and pick" = hunt and peck (standard term used).

## Round 2 — the 14 open decisions from the design doc (§8)

| # | Decision | Answer |
|---|---|---|
| 1 | Mobile / touch keyboards supported? | **No** — desktop physical keyboard only |
| 2 | Test-out for fluent typists after Level 2? | **Yes** (optional, never forced, never blocked on detector) |
| 3 | Pass-gate metric | **Net WPM** at ≥95% accuracy |
| 4 | Per-level WPM targets (L3:15, L4:20, L5:30, L6:25, L7:15) | **Ship as proposed, revisit if pass rates <40% or >90%** |
| 5 | Accuracy bar | **Gate 95%, coach 98%** |
| 6 | Wrong-finger detection | **Heuristic only, non-blocking** |
| 7 | Idle threshold | **5 s** (exposed as a setting) |
| 8 | Block paste | **Yes** |
| 9 | Caps Lock handling | **Default** (detect via getModifierState, warn) |
| 10 | Non-US / non-English keyboards | **US-English QWERTY only at launch** (warn on detected non-US) |
| 11 | Dvorak variant | **US Dvorak** |
| 12 | Home-row set for Levels 3–4 | **Include g/h** |
| 13 | Word source | **Embed** a trimmed permissively-licensed list, offline |
| 14 | User whose OS is already Dvorak | **Disable browser remap**, use OS output, inform user |

## Round 3 — remaining implementation gaps

1. Drill size / pass rule: **Default** → 20-word drills, a single drill meeting both criteria passes.
2. Test-out trigger: **Default** → detector bucket "fluent" with confidence ≥ 70% (or user self-labels "fluent").
3. Visual style: **Dark**.

## Claude's calls (not explicitly decided — change freely)

- **Escape** stops a running drill.
- Touch-device gate shows a **"Continue anyway (unsupported)"** link instead of a hard block (iPad + hardware keyboard case). Decision #1 said "No"; this is a softer reading.
- **Practice drills** (Level 5 "Drill my slow words", Level 6 "Bigram warm-up") show results and update bests but **never unlock** a level. Only the main drill passes.
- Level 1 is a key-finding drill: **40 prompts, ≥95% correct, no WPM** (from the design doc, unchallenged).
- Level 2 passage is built from a 10-sentence pool until ≥220 characters; pass = accuracy ≥95% only.
- Level 7 pass uses **Dvorak home-row words only** (a o e u i / d h t n s), WPM 15.
- Detector weights: rollover 0.4, mean IKI 0.3, IKI consistency 0.15, long-pause fraction 0.15. Buckets: <0.35 hunt, >0.65 fluent, else mixed. Thresholds come from Dhakal et al. 2018 ranges, **not tuned on real users**.
- Slow-word queue keeps the 30 slowest words seen in Level 5 main drills; practice drills refresh their timings.
- A `window.__game` debug hook is exposed at the end of app.js for the headless test. Harmless; remove if you want.
- Word validation uses the Debian `wamerican` dictionary; the 10k Google list alone had only 29 home-row words, so Level 3–4 use a hand-curated list of 63.

## Design-doc corrections to the original brief (accepted by proceeding)

- "Hunt and peck is slow" → reframed: it caps the ceiling, ties up the eyes (40% vs 20% looking down), hurts editing; self-taught 6-finger typists matched touch typists in Feit et al. 2016.
- "Finger preloading is a learnable skill" → reframed as emergent anticipation/rollover that drills can encourage and measure, not directly teach.
- Detector is a **fluency estimate with confidence**, not a technique classifier — timing cannot recover finger count.

## Mistakes made during the session (so they don't recur)

- Wired result-dialog buttons via `setTimeout` — fragile; fixed to synchronous wiring.
- Slow-word queue used `unshift` in sorted order, reversing it; fixed by sort-after-merge.
- Cleared the global idle-check interval on drill abort; fixed.
- CSS class rename (`.space` → `.w9`) missed the stylesheet on first pass; caught by screenshot.
- Ladder titles truncated at 900px; added short labels.
