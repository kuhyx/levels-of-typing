# Design Document: "Levels of Typing" — A Progressive Web-Based Typing Game

**Status:** Design specification (pre-implementation). Target: single-file HTML/JS app. Author: Lead Researcher. Date: 2 September 2026.

## 1. Executive Summary

This document specifies a seven-level progressive typing game that teaches typing as a hierarchy of skills, from "what a keyboard is" through touch typing, finger zones, anticipatory movement, same-finger bigrams, and finally an alternative layout (Dvorak). Research strongly supports the game's core accuracy-first, drill-based, deliberate-practice structure, and supports isolating specific sub-skills (home-row-only words, same-finger bigrams). However, two of the user's premises conflict with the best available evidence and must be reframed: (a) the claim that hunt-and-peck is inherently slow is only partly true — Feit, Weir & Oulasvirta (CHI 2016) found self-taught typists using ~6 fingers matched touch typists in speed and accuracy; and (b) "finger preloading" is not cleanly a separately teachable skill — in the motor-control literature it is an emergent property of skilled typing (anticipatory coarticulation) that appears with practice, though drills CAN encourage it. The hunt-and-peck **detector** is feasible but must be presented as a confidence-scored "typing fluency" estimate, because the true discriminator (looking at the keyboard) is invisible to keystroke logging, and a fast few-finger typist is genuinely indistinguishable from a touch typist on timing alone. The Dvorak remap is straightforward using `KeyboardEvent.code`, with an important OS-layout-conflict detection step. Below, each level is specified with objectives, drills, algorithmic word-list rules, and pass criteria; followed by detection, remap, metrics, persistence, and open-decision specs.

## 2. Where the User's Assumptions Conflict with Evidence

**2.1 "Hunt-and-peck is slow."** Partly false. Feit, Weir & Oulasvirta (2016, "How We Type," CHI '16, N=30 motion capture) found that self-taught typists using ~6 fingers reached speeds comparable to touch typists — in their sample, non-touch typists averaged 58.9 WPM (using 6.24 fingers) vs 57.8 WPM for touch typists (8.54 fingers), with no significant difference in speed, IKI, or error rate. Logan, Ulrich & Lindsey (2016, JEP:HPP) found in a lab sample that standard typists were faster (79.99 vs 65.63 WPM) but nonstandard typists were "almost as fast" *as long as they could see the keyboard*. What is reliably true: hunt-and-peck relies on **visual search** — Feit found non-touch typists spent 40% of the time looking at the keyboard vs 20% for touch typists — which hurts error-detection and complex editing, and one/two-finger pecking has a lower *ceiling* and more finger travel. **Recommendation:** Reframe Level 2's message from "hunt-and-peck is slow" to "hunt-and-peck works, but it caps your ceiling, forces you to look down, and makes editing and proof-reading harder — touch typing frees your eyes and raises the ceiling." This is both more accurate and more motivating.

**2.2 "Finger preloading is a distinct learnable skill."** Mostly an emergent property, not a discrete skill. In motor-control terms the user's "preloading" is **anticipatory movement / coarticulation** — skilled typists move fingers toward upcoming keys before striking the current one, and overlap keypresses ("rollover"). Feit (2016) identified "active preparation of upcoming keystrokes" as one of three predictors of high performance (the others being unambiguous finger-to-key mapping and minimal global hand motion). Salthouse (1986) formalised anticipation as the eye-hand span, testing a four-component model whose anticipatory spans shrink from input (~8.1 characters) to execution (~1.4 characters). But this behaviour *emerges* from practice and automatisation (Logan & Crump 2011's hierarchical two-loop control — an outer loop producing words and an inner loop executing keystrokes; Rumelhart & Norman 1982's parallel-activation model) rather than being consciously installed. **Recommendation:** Keep the level, but frame it honestly: drills that reward hand-alternation and rollover (pressing the next key before releasing the last) *encourage* anticipation to develop; you cannot directly "teach" someone to preload, but you can create conditions that grow it and measure it (rollover ratio).

**2.3 "The game must DETECT hunt-and-peck vs touch typing."** Feasible only as a probabilistic fluency estimate, not a reliable technique classifier — see §4. Be honest in-product about confidence and failure modes.

**2.4 Accuracy-first at 95%.** Fully supported; if anything, evidence supports a slightly higher bar (98%) during drills. Keep 95% as the *pass* gate but nudge toward 98% in practice feedback.

## 3. Level-by-Level Specification

Global conventions used below: WPM = (characters ÷ 5) ÷ minutes; accuracy is character-level; targets are *net* WPM at ≥95% accuracy unless noted. Beginner reference points from Dhakal et al. (2018, N=168,000): overall mean 51.56 WPM (SD 20.2); slowest 10% <26 WPM (≈21 mean), fastest 10% >78 WPM (≈89 mean); a common beginner band is 20–30 WPM.

### Level 1 — The Keyboard
- **Learning objective:** Understand what a keyboard is, key groupings (letters, space, shift, backspace, enter, modifiers), and that keys type lowercase by default with capitals produced via Shift.
- **Explanation content (teach, 2–4 sentences):** A keyboard is a grid of keys; the main letter block plus the space bar produce almost all text. The bump-marked F and J keys are landmarks your index fingers use to orient without looking. Shift makes capitals and the upper symbols; Backspace deletes; Enter confirms.
- **Drill design:** Guided key-finding — the game highlights a key on the on-screen keyboard, the player presses it; then short single-key and space-separated sequences. No WPM pressure.
- **Word-list rule:** N/A (single keys and the words "as", "space", key names). Introduce the space bar explicitly.
- **Pass criteria:** ≥95% correct key identifications across ~40 prompts; no WPM target (target = 0/omit). Rationale: this level is orientation, not speed.
- **On-screen keyboard behaviour:** Full keyboard with the next target key pulsing; finger-zone colours shown but not yet emphasised.

### Level 2 — Hunt-and-Peck (what it is and its trade-offs) + STYLE DETECTION
- **Learning objective:** Recognise hunt-and-peck vs touch typing; understand the real trade-offs (visual search, ceiling, editing) rather than a blanket "it's slow."
- **Explanation content:** Hunt-and-peck means searching for each key, usually with one or two fingers per hand, glancing down as you go. It can be surprisingly fast for some people, but it ties up your eyes on the keyboard (about 40% of the time vs 20% for touch typists — Feit 2016), which slows editing and hides errors, and it raises finger travel and fatigue. Touch typing keeps your eyes on the screen and raises your ceiling.
- **Drill design:** A free-typing passage (~2–3 sentences) whose sole purpose is to feed the detector (§4). Then the game shows the player their estimated style and confidence and routes them: fluent typists can test out of Levels 3–4; others proceed.
- **Word-list rule:** Ordinary English sentences from a frequency-based sentence pool (e.g., Enron-mobile-style short sentences as used by Dhakal et al.), 3–8 words each, simple punctuation only.
- **Pass criteria:** Completion of the diagnostic passage at ≥95% accuracy; WPM recorded but not gated. Detection is informational, never a hard gate (given its known unreliability).
- **On-screen keyboard behaviour:** Optionally display a live rollover meter and a "looking-down proxy" (long-pause) indicator to make the concept concrete.

### Level 3 — Touch Typing & the Home Row
- **Learning objective:** Learn the home row (ASDF / JKL;), the F/J bumps, eyes-on-screen, and fingers returning to home.
- **Explanation content:** Touch typing places eight fingers on the home row (ASDF for the left hand, JKL; for the right) and returns each finger home after every keystroke, so you never lose your place. The raised bumps on F and J let you find home without looking. The key discipline is eyes on the screen, not the keys. Accuracy comes first; speed follows.
- **Drill design:** Home-row key isolation (single keys → alternating pairs → home-row words), all with eyes-up prompts; the on-screen keyboard substitutes for looking down. Short, focused sets.
- **Word-list rule:** Home-row-only words (see Level 4 rule; e.g., "as", "ask", "dad", "sad", "lad", "fall", "flask", "salad", "glass").
- **Pass criteria:** ≥95% accuracy AND ≥15 net WPM. Rationale: this is early skill acquisition; 15 WPM is a realistic home-row-only threshold well below the 20–30 WPM beginner band because the character set is tiny.
- **On-screen keyboard behaviour:** Home row emphasised; finger-zone colours on; a hand/finger diagram indicates which finger owns the highlighted key.

### Level 4 — Finger Zones (no preloading benefit)
- **Learning objective:** Internalise the standard QWERTY finger-to-key map by drilling words where *no* finger has to move off its home key, so the mapping — not travel or anticipation — is what's exercised.
- **Explanation content:** On a standard QWERTY keyboard each key belongs to a specific finger (the coloured zones). Words built only from home-row keys let you feel the correct finger for each letter without any reaching. Isolating the mapping this way builds the finger-to-key association that all later speed depends on.
- **Drill design:** Home-row-only words and short phrases; emphasise correct finger via the on-screen highlight; flag suspected wrong-finger use only heuristically (we cannot verify the physical finger — see §4 caveat).
- **Word-list generation rule:** From a frequency list, keep words whose letters ⊆ {a,s,d,f,g,h,j,k,l} (home-row set, including g/h reached by index fingers). Examples: "lass", "flask", "salads", "gash", "hall", "gall", "shall", "haggis". Prefer higher-frequency and pronounceable words for motivation.
- **Pass criteria:** ≥95% accuracy AND ≥20 net WPM.
- **On-screen keyboard behaviour:** Finger-zone colours prominent; live per-key finger hint.

### Level 5 — Finger Preloading (anticipation / hand alternation / rollover)
- **Learning objective:** Grow anticipatory, overlapping movement by drilling words spread across different fingers and both hands, where hand alternation and rollover pay off; "improve on specific words" the player is slow on.
- **Explanation content:** As you get fluent, your fingers begin moving toward upcoming keys before you finish the current one, and you may press the next key before releasing the last — this "rollover" is the single strongest timing correlate of fast typing (Dhakal et al. 2018 found rollover ratio correlated with WPM at r=0.73; fast typists used it on 40–70% of keypresses). Alternating hands also helps: Salthouse (1986) reported that successive keystrokes on alternate hands are 30–60 ms faster than same-hand keystrokes (the "alternate-hand advantage"). You can't force anticipation, but these drills grow it.
- **Drill design:** Words/phrases high in hand alternation and free of same-finger bigrams; adaptive "slow-word" queue that re-drills the specific words/bigrams where the player's inter-key interval spikes (deliberate practice on weaknesses). Encourage rollover by rewarding overlap where safe.
- **Word-list generation rule:** From a frequency list, keep words with (a) no same-finger bigrams (no adjacent letters sharing a finger under the QWERTY finger map) and (b) high hand-alternation ratio (many adjacent letters switch hands). Examples: "the", "and", "their", "flame", "eight", "signal", "auditor", "problem", "penalty", "dormant". (Hand-alternation bigrams such as an/th/or.)
- **Pass criteria:** ≥95% accuracy AND ≥30 net WPM. Rationale: 30 WPM is the top of the typical-beginner band and a credible "fluent-beginner" gate.
- **On-screen keyboard behaviour:** Colours on; live rollover meter (fraction of overlapping keypresses) to make anticipation visible.

### Level 6 — Breaking Finger-Zone Rules (same-finger bigrams)
- **Learning objective:** Handle the hard case where consecutive letters use the *same finger*, forcing sequential (non-overlapping) movement, e.g., "cent" (c and e both left-middle finger).
- **Explanation content:** Some letter pairs are typed by the same finger — like the c→e in "cent" or e→d in "bed" — so that finger must move twice in a row and cannot preload. These "same-finger bigrams" are the slowest transitions. Even the ordinary same-hand penalty is real (Salthouse 1984 data reported by Bengi & Karcıoğlu: mean inter-key time is 144 ms for two-hand digraphs vs 193 ms for same-hand digraphs — a ~49 ms penalty), and same-*finger* sequences are far worse: US Patent 6,053,647 reports a same-finger sequence causes a drop "more than seven times larger, almost 43% (122 to 70)" versus a remote-finger sequence. Drilling them separately builds control for the words that break the smooth rhythm.
- **Drill design:** Words containing target same-finger bigrams; slow-and-deliberate pass first, then speed; isolate the bigram itself as a micro-drill (e.g., "ededed", "ununun") before re-embedding in words.
- **Word-list generation rule:** From a frequency list, keep words containing at least one same-finger bigram under the QWERTY finger map. Target bigrams: ce, ec, ed, de, un, nu, my, ny, lo, ol, ft, gt, br, se, sw, az, etc. Examples: "cent", "decent", "bed", "hunt", "funny", "my", "lot", "bright", "swing", "greatest". Validate each candidate against the finger map at build time.
- **Pass criteria:** ≥95% accuracy AND ≥25 net WPM. Rationale: deliberately *lower* than Level 5 because same-finger bigrams are intrinsically slower; gating at Level 5's 30 would punish the hard case.
- **On-screen keyboard behaviour:** Highlight the two keys of the same-finger bigram in a warning colour and show that one finger must handle both.

### Level 7 — Custom Layouts: Dvorak
- **Learning objective:** Experience an alternative layout (Dvorak) via in-software remapping, understanding why layouts differ (vowels on the left home row, high hand alternation) without changing OS settings.
- **Explanation content:** Keyboard layouts are just software mappings from physical keys to letters. The Dvorak layout puts all vowels on the left home row and common consonants on the right, maximising hand alternation and home-row use — Carpalx (M. Krzywinski) reports "62% of successive keystrokes on Dvorak do not use the same hand… In contrast, with QWERTY only 51% of successive keystrokes do not use the same hand," yielding roughly a 30% reduction in total typing effort. We remap your QWERTY keystrokes to Dvorak in the browser so you can try it without touching your operating system. Expect to feel slow at first — this is normal.
- **Drill design:** Dvorak home row first (a,o,e,u,i / d,h,t,n,s), then progressive rows, mirroring Levels 3–5 but on Dvorak; on-screen keyboard shows Dvorak legends.
- **Word-list generation rule:** Reuse Levels 3–5 rules but computed against the Dvorak finger map; start with Dvorak home-row-only words.
- **Pass criteria:** ≥95% accuracy AND ≥15 net WPM on Dvorak. Rationale: matches empirical Dvorak relearning curves — most learners reach ~20–30 WPM in the first weeks and take 2–4 months to recover full QWERTY speed; a 15 WPM gate is achievable in a few focused sessions.
- **On-screen keyboard behaviour:** Dvorak legends and finger-zone colours; a QWERTY↔Dvorak toggle for reference.

### Cross-level pedagogy notes (sourced)
- **Accuracy first, then speed:** widely supported; slowing to protect accuracy is the standard plateau fix. Keep the 95% gate; recommend 98% in practice feedback.
- **Drill length / spacing:** short, focused, frequent sessions beat long unfocused ones; deliberate practice targets specific weaknesses at the edge of ability. Implement the adaptive slow-word queue.
- **Plateaus:** driven by unstable accuracy and a few weak keys/bigrams; fixes are isolate-and-drill weak transitions, brief over-speed bursts then slow to lock in accuracy, vary material, and rest. Levels 5–6 embody this.
- **Hours to proficiency:** touch typing "can be learned rather quickly" but reaching high speed needs hundreds of hours of deliberate practice (Feit 2016); adults commonly go 30→60+ WPM in weeks to a few months of daily practice. Set expectations accordingly in-product. Note Yechiam et al. (2003): training gains decay without continued practice — so build in review.

## 4. Hunt-and-Peck Detection Spec

**Goal:** From keystroke timing alone (no camera), estimate whether the player types fluently (touch-type-like) or hunt-and-peck-like, as a confidence-scored estimate.

**What the game can log per keystroke:** `keydown`/`keyup` timestamps, `event.code` (physical key), `event.key` (produced char). From these derive: inter-key interval (IKI = keydown[n] − keydown[n−1]), keypress duration (keyup − keydown), rollover events (keydown[n] before keyup[n−1]), per-bigram timing, and hand/finger assignment (via the QWERTY code→finger map).

**Features (ranked by evidentiary strength):**

| Feature | Touch-type-like | Hunt-and-peck-like | Source anchor |
|---|---|---|---|
| Rollover ratio (fraction of keypresses overlapping previous) | 40–70% (fast); overall mean 25% | <10% | Dhakal 2018 (r=0.73 w/ WPM; fast 49.9%, slow 7.6%; overlap ~30 ms, up to 100 ms) |
| Mean IKI | ~120–180 ms | ~400–480+ ms | Dhakal 2018 (mean 238.66; fast ~120 (SD ~12), slow >480) |
| IKI variance / consistency (SD) | low (~11–45 ms) | high (>100 ms) | Dhakal 2018; keystroke-dynamics lit. |
| Repetition-vs-alternation sign test: (repetition IKI − alternation IKI) | positive (repetition slower by ~20–40 ms) | negative (repetition faster by >150 ms) | Dhakal 2018 (sign flips slow↔fast) |
| Bimodality / long search pauses before "hard" keys (numbers, punctuation, capitals, rare letters) | absent/mild; tight unimodal | present; bimodal | Feit 2016 (visual-search mechanism) |
| Keypress hold duration | ~80–150 ms | ~80–150 ms (**do NOT use** — invariant) | Dhakal 2018 (mean 116.25, r=−0.29) |

**Dhakal 2018 8-cluster context (unsupervised k-medoids on normalised bigram IKIs only; WPM/finger-count were NOT inputs):** clusters separate by rollover, hand-alternation efficiency and error rate, spanning Cluster 1 ("slow, careful," ~46.5 WPM, ~20% rollover) to Cluster 8 ("fast rollovers," ~68.4 WPM, ~38% rollover, lowest errors). This confirms rollover + IKI + consistency as the usable axes — but note the clustering detects *performance/fluency*, not finger count.

**Algorithm (concrete):**
1. Collect ≥ ~200 keystrokes of free/transcription typing (Level 2 passage).
2. Discard IKIs > 5000 ms (idle) and the first keystroke of each phrase (start latency).
3. Compute: rollover ratio R; mean IKI μ; IKI SD σ; alternation-vs-repetition sign S; long-pause fraction P (IKIs > 3×median, especially preceding number/punct/rare-letter keys).
4. Score each feature to [0,1] "fluency" via thresholds above; combine (weighted mean, rollover weighted highest). Map to three buckets: **likely hunt-and-peck / mixed / likely fluent**, plus a numeric confidence.
5. Display as: "Your typing looks *mostly hunt-and-peck* (confidence ~70%)." Never a hard gate.

**Confidence display:** Always show confidence and a one-line explanation of what was measured (e.g., "few overlapping keypresses, long pauses before numbers"). Offer a "this is wrong" button that lets the user self-label and skip.

**Known failure modes (be blunt, in-product and in docs):**
- **Finger count is not recoverable from timing.** A fast self-taught 6-finger typist is *indistinguishable* from a touch typist on every timing metric (Feit 2016: 58.9 vs 57.8 WPM, no significant difference). The detector really measures *fluency/consistency*, not technique.
- **The true discriminator — looking at the keyboard — is invisible to keystroke logging** (Feit 2016; Logan 2016). We can only proxy it via long search pauses.
- **People can't reliably self-report their own fingers** (Logan 2016; Feit: "It just happens"), so user self-labels are weak ground truth. Even the My(o) side-channel study labelled styles by observation, not timing.
- **Browser timing floor ~10–15 ms** (`date.now`/`performance.now` precision + ~10 ms USB polling), so design thresholds with ≥15 ms margins; sub-15 ms effects are noise.
- **Short samples are unreliable;** require a minimum keystroke count and show lower confidence below it.

## 5. Dvorak Remap Spec

**Core approach:** Listen for `keydown`, read `event.code` (physical key, layout-independent — e.g., the physical Q key is always `"KeyQ"` regardless of OS layout), look up the intended output character in a QWERTY-code→Dvorak-char table, `preventDefault()` the native input, and insert the mapped character yourself. Do **not** use `event.key` for the mapping (it already reflects the OS layout).

**Why `code` not `key`:** per MDN/WICG, `event.code` encodes the physical key location and "ignores the user's keyboard layout," locale and modifier state; `event.key` gives the produced character after the OS layout is applied. For a software remap we want the physical key, then apply *our* layout.

**Shift / punctuation / symbols:** Maintain two tables (unshifted and shifted) keyed by `code`; select via `event.shiftKey`. Dvorak relocates punctuation heavily (QWERTY's `-`, `=`, `[`, `]`, `;`, `'`, `,`, `.`, `/` all move), so the table must cover the full writing-system key set, not just letters. Caps Lock affects letters only — handle by upper-casing mapped letters when `getModifierState("CapsLock")` is true, but not symbols.

**Dead keys / IME:** US Dvorak has no dead keys, so ignore for now; but guard against `event.isComposing` / `keyCode === 229` (IME composition) and disable remap during composition. Note this in the Colemak/i18n extension.

**Non-US physical keyboards:** `code` values are defined against a US physical layout; a few keys differ on ISO/JIS keyboards (extra `IntlBackslash`, `IntlRo`, `IntlYen`). Map the standard writing-system keys and fall back gracefully (pass through) for `Intl*` codes.

**OS-layout-conflict detection (important):** A user may have *already* set Dvorak (or another layout) at the OS level. Detect by comparing `code` and `key` on a known key during a calibration keystroke: if the user presses the physical key at `"KeyQ"` and `event.key` is `"q"`, the OS is QWERTY (safe to remap). If `event.key` is `"'"` (apostrophe), the OS is already Dvorak — in that case *disable* our remap (or the user would get double-mapped) and inform them: "Your system is already in Dvorak; we'll use it directly." Where available, `navigator.keyboard.getLayoutMap()` can retrieve the actual per-key labels for display; note it is **Chromium-only** (not supported in Firefox/Safari) and requires a fallback (assume US QWERTY, and/or rely on the code/key comparison).

**On-screen keyboard:** Render Dvorak legends from the mapping table (independent of `getLayoutMap`), so it works cross-browser.

**Colemak extensibility (what would change):** Structure the layout as a pluggable table: `LAYOUTS = { dvorak: {unshifted, shifted, fingerMap}, colemak: {...} }`. To add Colemak: (1) add its code→char tables; (2) add its finger map (Colemak keeps QWERTY's bottom-left ZXCV and most punctuation, so fewer punctuation entries change and Ctrl-shortcuts stay put — a selling point, and its learning curve is gentler: community reports ~4–6 weeks to recover speed vs ~8–12 for Dvorak); (3) recompute Levels 3–6 word lists against the Colemak finger map; (4) extend OS-conflict detection to recognise a Colemak OS setting. No engine changes needed — only data tables.

## 6. Core Metrics Spec

- **Word definition:** 1 word = 5 characters (including spaces and punctuation) — the universal typing-test convention.
- **Gross WPM:** (characters typed ÷ 5) ÷ minutes.
- **Net WPM:** gross WPM − (uncorrected errors ÷ minutes). Use net WPM for pass gates (it rewards accuracy).
- **Accuracy:** (correct characters ÷ total characters typed) × 100, character-level. Pass gate ≥95%; recommend 98% in feedback.
- **Error model:** Classify via edit distance against target (substitution/omission/insertion), as in Dhakal/Wobbrock TextTest. Distinguish **corrected** vs **uncorrected** errors: corrected errors already cost time (which lowers WPM naturally) so they are not double-penalised; uncorrected errors drive the net-WPM penalty and the accuracy percentage.
- **Backspace handling:** Backspace/Delete are non-scribed keystrokes — excluded from the character count and from WPM, but logged (their frequency indicates correction behaviour). Track KSPC (keystrokes per character; Dhakal mean ~1.17) as a secondary signal.
- **Timer rules:** Start the clock on the **first keystroke**, not on prompt display (standard practice; Dhakal measured "from the first to the last keypress"). Stop on the last keystroke of the passage.
- **Idle handling:** Exclude idle gaps from WPM — pause the timer when IKI exceeds an idle threshold (e.g., >5000 ms, matching Dhakal's IKI cutoff), so a distraction doesn't tank the score.

## 7. Data & Persistence Spec

- **Store:** Use `localStorage` for a single-file app: it's synchronous, persists across sessions, and needs no backend. Per MDN's "Storage quotas and eviction criteria" (updated Jan 5, 2026), "Browsers can store up to 5 MiB of local storage… per origin," throwing a `QuotaExceededError` once reached — ample for progress/settings but a reason to cap any raw keystroke logging. Keep one JSON blob under a versioned key (e.g., `typinggame.v1`).
- **Schema (illustrative):** `{ version, currentLevel, perLevel: { n: { bestNetWPM, bestAccuracy, passed, attempts } }, detector: { lastStyle, confidence, userOverride }, layout: "qwerty"|"dvorak", slowWords: [ ... ], settings: { ... } }`.
- **Save cadence:** Write on level completion and on each drill result; debounce mid-drill writes.
- **Alternatives / edge cases:** `localStorage` is per-origin and cleared by "clear browsing data"; offer JSON export/import for backup and cross-device transfer. `IndexedDB` is only needed if storing full keystroke logs; if so, cap and prune. Private-browsing may block or clear storage — detect a failed write (catch `QuotaExceededError`) and warn.

## 8. Open Decisions the User Must Make (with recommended defaults)

*All 14 were answered on 3 Sep 2026 — see DOCS-decisions.md. Kept here for the rationale.*

1. **Mobile / touch keyboards:** Should mobile be supported? *Default: **No — desktop physical keyboard only** at launch.* Rationale: soft keyboards use 1–2 thumbs, `event.code` is unreliable/absent, IME composition interferes, and the finger-zone/touch-typing pedagogy is inapplicable. Show a "use a computer with a physical keyboard" gate on touch devices.
2. **Test-out for fluent typists:** Should the detector let strong typists skip Levels 3–5? *Default: **Yes**, offer an optional skip after Level 2 if fluency confidence is high, but never force skipping and never block on the detector.*
3. **Pass-gate metric — net vs gross WPM:** *Default: **net WPM** at ≥95% accuracy.*
4. **Exact WPM targets:** The proposed targets (L3:15, L4:20, L5:30, L6:25, L7:15) are defaults; tune from playtest data. *Default: ship as above; revisit if pass rates are <40% or >90%.*
5. **Accuracy bar:** 95% pass vs 98% recommended-in-practice — keep both, or raise the gate to 98%? *Default: gate 95%, coach 98%.*
6. **Wrong-finger detection:** Attempt to flag wrong-finger use in Levels 3–6? *Default: **heuristic-only, non-blocking** — we cannot verify the physical finger from a keystroke; show gentle hints, never fail a drill for it.*
7. **Idle threshold:** *Default 5000 ms* (matches Dhakal's cutoff); expose as a setting.
8. **Paste prevention:** Block paste into drills? *Default: **Yes** — intercept `paste` and Ctrl/Cmd+V, since paste would corrupt WPM/accuracy.*
9. **Caps Lock handling / warning:** *Default: detect Caps Lock via `getModifierState` and warn if it's on during lowercase drills.*
10. **Non-English / non-US physical keyboards:** Support beyond US-English at launch? *Default: **US-English QWERTY only** at launch; pass through and warn on detected non-US layouts; note i18n as future work.*
11. **Dvorak variant:** US Dvorak vs programmer/UK Dvorak? *Default: **US Dvorak**.*
12. **Home-row set for Levels 3–4:** Include g and h (index-finger reaches) or strict ASDF/JKL; only? *Default: include g/h* to enlarge the usable word list (enables "flask", "gash", etc.).
13. **Word source & offline bundling:** Which frequency list to embed? *Default: embed a trimmed, permissively-licensed list (see §9) filtered per level at build time, so the single-file app runs offline.*
14. **Handling already-Dvorak OS users:** disable remap vs adapt. *Default: **detect and disable** our remap, use OS output directly, and inform the user.*

## 9. Sources

- Feit, A. M., Weir, D., & Oulasvirta, A. (2016). *How We Type: Movement Strategies and Performance in Everyday Typing.* CHI '16, 4262–4273. DOI 10.1145/2858036.2858233. (Self-taught ≈ touch typists: 58.9 vs 57.8 WPM; 6.24 vs 8.54 fingers; 3 predictors — consistent mapping, preparation, minimal hand motion; 40% vs 20% look-at-keyboard.) https://userinterfaces.aalto.fi/how-we-type/resources/HowWeType_CHI16.pdf
- Dhakal, V., Feit, A. M., Kristensson, P. O., & Oulasvirta, A. (2018). *Observations on Typing from 136 Million Keystrokes.* CHI '18. DOI 10.1145/3173574.3174220. (N=168,000; mean 51.56 WPM, IKI 238.66 ms, keypress duration 116.25 ms, KSPC ~1.17; rollover r=0.73 with WPM, fast 49.9%/slow 7.6%; 8 clusters; bigram predictiveness.) https://acris.aalto.fi/ws/portalfiles/portal/21495207/ELEC_Dhakal_et_al_Observations_CHI2018.pdf
- Logan, G. D., Ulrich, J. E., & Lindsey, D. R. B. (2016). *Different (Key)Strokes for Different Folks…* JEP:HPP 42(12), 2084–2102. DOI 10.1037/xhp0000272. (Standard 79.99 vs nonstandard 65.63 WPM; visual-guidance dependence; Fitts vs Hick.)
- Logan, G. D., & Crump, M. J. C. (2011). *Hierarchical control of cognitive processes: The case for skilled typewriting.* (Two-loop control; outer produces words, inner executes keystrokes.)
- Salthouse, T. A. (1984, *Effects of age and skill in typing*, JEP:General 113, 345–371; 1986, *Perceptual, cognitive, and motoric aspects of transcription typing*, Psych. Bulletin 99, 303–319). (Eye-hand span; alternate-hand advantage 30–60 ms; same-hand vs two-hand digraph 193 vs 144 ms; four-component anticipation model, spans 8.1→1.4 chars.)
- Rumelhart, D. E., & Norman, D. A. (1982). *Simulating a skilled typist.* (Parallel activation; hand-alternation benefit; error patterns.)
- Yechiam, E., Erev, I., Yehene, V., & Gopher, D. (2003). (Touch-typing training gains and decay without practice.)
- Carpalx (M. Krzywinski, bcgsc.ca); Colemak/Norman layout analyses; Deskthority wiki. (Dvorak hand-alternation 62% vs QWERTY 51%; ~30% effort reduction; same-finger bigrams; rolls.)
- US Patent 6,053,647 (keyboard-layout digraph analysis). (Same-finger sequence causes a drop "more than seven times larger, almost 43% (122 to 70)" vs remote-finger.)
- MDN Web Docs: *KeyboardEvent.code*, *Keyboard API / getLayoutMap* (Chromium-only), *Storage quotas and eviction criteria* (5 MiB/origin, QuotaExceededError). WICG keyboard-map explainer. (Physical-key vs produced-char; remap approach.)
- Standard WPM/accuracy formulas (SpeedTypingOnline, typing.com): 5 chars = 1 word; gross vs net; accuracy = correct ÷ total. https://www.speedtypingonline.com/typing-equations
- Dvorak/Colemak relearning-curve reports (community; Turkish-keyboard learning-curve study, arXiv:1905.11791): ~20–30 WPM in early weeks, 2–4 months to recover QWERTY speed; Colemak ~4–6 weeks vs Dvorak ~8–12 weeks.
- Word-frequency resources: google-10000-english (Google Trillion Word Corpus); SCOWL/Aspell (permissive Kevin Atkinson licence — "Permission to use, copy, modify, distribute and sell these word lists… is hereby granted without fee"); wordfreq (rspeer); Moby Words II (public domain).
