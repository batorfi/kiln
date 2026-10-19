# Feature Specification: KILN's real UI on Pi (row r9)

**Feature Branch**: `008-kiln-pi-ui` *(provisional short-name; no git branch created)*

**Created**: 2026-09-22

**Status**: **Draft — CLARIFIED (2026-09-22); UI APPROVED (2026-09-23); ready for `/speckit.plan`.** NC1, NC2 and NC3 were resolved by the human on 2026-09-22
— see *Clarifications* below; each landed on the recommended option. The Layer A/B/C mockups were reviewed and approved on 2026-09-23 —
see [ui-mockups.md](./ui-mockups.md); header-wording simplification was folded into FR-015 as its third transform. Two items remain for the plan: column
alignment in `renderOverlay`, and whether Layer A's decorative border implies `setFooter` rather than `setStatus`.
Roadmap row **`r9`** was admitted at the r8 seam (`human@batorfi`, 2026-09-22T17:56:10Z, Gate-0 ledger entry 8 in [specs/ROADMAP.md](../ROADMAP.md)) and is
`queued`, `deps: ["r2", "r8"]` (both `done`). It stays `queued` — never `active` — until its own Gates 1–9 lane opens a live gate (`chain_unattended=false`).
**Nothing here admits a program, advances a gate, or edits the roadmap** (P-VI): the row carries no `spec` pointer yet; adding one is a Gate-0 edit the human makes.

**Input**: the row **`r9`** — *"kiln-v1 real UI — the three Flow layers (footer HUD, gate popup, roadmap overlay) on Pi's real `ctx.ui`, so a human answers a gate
in Pi and the move is recorded as a real human decision."*

**Provenance (what r9 builds on, all closed to `main`)**:
- **r1** `002-kiln-lane` — Layers A/B (`renderHud`, `renderPopup`) as pure, one-argument (`FactoryState → string`) renders; the gate primitive
  (`openGate`, `applyMove`, `headlessWait`, `resumeByToken`); `keymap.ts`'s **untested** key choices (`M`/`g`/`?`).
- **r2** `003-kiln-roadmap-overlay` — Layer C (`renderOverlay`) and the distinct Gate-0 face (`renderGate0Face`, `recordGate0Decision`), both pure renders
  over a `RoadmapHead`; Gate 0's move vocabulary is disjoint from a per-gate 1–9 vocabulary (`moveVocabulary`).
- **r3** `004-kiln-live-walk` — `live-tui.ts`'s **abstract** `LiveUICtx` (`setStatus(footer)`, `raiseOverlay(layer, content)`) and the event-only redraw
  contract (`LAYERC_REDRAW_TRIGGERS`); never run against real Pi.
- **r7** `006-kiln-live-inference` — the async spine everything above already runs on.
- **r8** `007-kiln-pi-extension` — KILN loads into real Pi; `kiln/pi/port.ts` (KILN's own structural view of Pi, no import of Pi); `kiln/pi/outcome.ts` (the
  seam: `detectCapability`, `interpret`, `askGate`, `resolveAsk` — turns a Pi dialog result into `answered(option)` or `no-answer`, and a `no-answer` becomes
  r1's `headlessWait`, **never applied**); a human terminal smoke test that found and fixed a real defect (an overlay with no `handleInput` could never close).
  **r8 left three things explicitly for r9**, recorded in `kiln/pi/README.md`'s layout note and `docs/concepts/ui-layers-deep.md`'s correction banner: the
  `LiveUICtx` → Pi mapping, overlay survival across `turn_end`/compaction, and hosting a selectable list inside an overlay.

---

## Why this row exists

Every UI KILN has built is a **pure string render** or a **push through an interface KILN invented for itself** (`LiveUICtx`). r3's "live TUI smoke" ran that
abstract interface, never Pi. r8 proved KILN can load into Pi and answer a **read-only** command — but it also proved, live, in a human's own terminal, that
building against assumption rather than measurement produces bugs that only a human at a keyboard can catch (`kiln-selftest`'s overlay could not close). r9 is
the row where that lesson has to hold for real, user-facing surfaces: the footer, the gate popup, and the roadmap overlay, **drawn with Pi's real `ctx.ui`**,
answering **real gates** — including Gate 0's `add-row`/`edit-rows`/`approve` moves — with a decision that actually reaches r1's log.

**What is already measured (from r8, reused here, not re-derived):**

| Fact | Evidence |
|---|---|
| `ctx.ui.setStatus` takes `(key, text)`, not `LiveUICtx`'s one-argument `setStatus(footer)` | `docs/concepts/ui-layers-deep.md` banner; `research.md` SQ4 |
| `ctx.ui.custom(factory, {overlay})` returns a **Promise resolved by `done`**, not `LiveUICtx`'s fire-and-forget `raiseOverlay(layer, content \| null)` | same |
| An overlay component is **disposed on close**; showing it again means calling `custom()` again with a **fresh** factory, never reusing the old instance | `docs/tui.md` "Overlay Lifecycle" |
| `ctx.ui.confirm` conflates "No", cancelled, timed-out and headless into one `false` — never usable for a gate | `research.md` SQ7 |
| RPC mode's `custom()` resolves `undefined` with **no `handleInput` ever invoked** — an overlay bug is invisible to any RPC-only test | r8 F-1, found by the human smoke test |
| A registered command survives a session change; **module-level state and event handlers do not reset — they accumulate** | `research.md` D12 |

**What is measured now, newly, for this row** (Pi's docs, read but not yet run against a live terminal — the spike below re-measures against real Pi):

- **A `ctx.ui.custom` component can implement its own selectable list** (arrow-key navigation, `handleInput` deciding on Enter) — Pi's own bundled
  `overlay-test.ts` example does exactly this. This **resolves half of `ui-layers-deep.md` §11 Q2** ("can the overlay host a select") without needing a nested
  `ctx.ui.select` call: the overlay *is* the select. The remaining half — whether an overlay can *also* trigger `ctx.ui.select` from inside itself — is
  unmeasured and likely unnecessary once the above is used.
- **`registerShortcut` needs a `modifier+key` combination** (`docs/keybindings.md`, "Key Format"); a **bare** letter is not a valid shortcut on its own — it
  would only ever reach an extension as ordinary editor text. **`kiln/ui/keymap.ts`'s existing choices (`M`, `g`, `?`, all bare) were never checked against
  this and are very likely wrong for a real Pi binding.** This is a load-bearing finding: r9 cannot wire Layer B/C's raise-keys as currently declared without
  first re-deciding them.
- **`escape` is Pi's own default binding for `app.interrupt`** (cancel the current turn) — not reserved by a KILN overlay unless the overlay is focused and
  capturing input, per `docs/tui.md` "Overlay Focus". An open KILN overlay already owns focus while visible, so this is consistent with r8's measured
  Esc-cancels-a-dialog behaviour, but any KILN shortcut binding must avoid this key.

**The unresolved, load-bearing question this row cannot spec around:** *when a human answers a gate in Pi, what identity does `recordGate0Decision` / r1's
`applyMove` record as `decidedBy`?* Every existing `human@…` string in this project (`human@batorfi`, the roadmap's `owner`) was written by a person editing a
file, never produced by running code. Pi's extension API, as measured in r8 and read here, exposes **no logged-in-human identity** to an extension — `ctx`
carries a model, a mode, a cwd, and a UI, not an operator identity. Recording *anything* here without measuring what is actually available would repeat r3's
original mistake (claiming a decision was real when nothing backed it). This is **NC1** below.

## What r9 is *not*

- **Not r10.** No role agents, no tier→model mapping, no real model swap. r9's commands run against whatever model (or no model) the operator's Pi session
  already has.
- **Not r11.** No director, no lane-starting command, no acceptance walk on a real feature. r9 wires the *display and decision* surfaces; starting a lane is
  r11's job.
- **Not a re-opening of r1/r2/r3's delivered scope.** `renderHud`, `renderPopup`, `renderOverlay`, `renderGate0Face`, `applyMove`, `headlessWait`,
  `resumeByToken`, `moveVocabulary`, and the factory-log schema are **reused unmodified**. r9 adds a real `ctx.ui` binding around them; it does not rewrite them.
- **Not a re-opening of r8's seam contract.** `kiln/pi/outcome.ts`'s rule — only an explicit offered choice, from a mode that can ask, is `answered`; everything
  else is `no-answer` → `headlessWait` — is **extended**, never weakened: r9 adds what happens *after* `answered`, it does not change when `answered` occurs.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — The footer shows the factory's state, live, in Pi (Priority: P1)

An operator running Pi with KILN loaded sees a persistent, always-on status line — Layer A — that reflects the current `FactoryState`, updating only when a
real event fires, never on a timer.

**Why this priority**: it is the simplest of the three layers (r1's `renderHud` already exists; only the *push* is new) and it proves the event-only redraw
contract against real Pi before the harder overlay layers are attempted.

**Independent Test**: with KILN loaded in a real Pi terminal, trigger a state-changing event; observe the footer update; confirm nothing changes it absent an
event (no polling — grep the module for a timer/interval, the way r3's own no-poll test already does for the abstract path).

**Acceptance Scenarios**:
1. **Given** KILN is loaded into Pi and a lane is idle, **When** the extension starts, **Then** the footer shows `renderHud`'s exact text for the idle state.
2. **Given** the footer is showing, **When** a `FactoryEvent` fires that r1's `onEvent` would change, **Then** the footer updates to the new `renderHud` text
   within one redraw — no delay, no polling interval.
3. **Given** no event has fired, **When** any amount of wall-clock time passes, **Then** the footer text is byte-identical to its last render (P-IX).

### User Story 2 — A human answers a per-feature gate, in Pi, and it is a real decision (Priority: P1)

An operator sees Layer B (the gate popup) rise when a feature's lane opens a gate, picks a move from the gate's real vocabulary, and that choice is recorded
in the factory-log as a human decision — not merely reported back as a string, the way r8's `kiln-selftest` stopped short of doing.

**Why this priority**: this is the row's central promise, and the hardest part is not drawing the popup — r1 already renders it — it is closing the loop from
"Pi returned an option" to "the factory-log has a human `gate-completion`" without inventing a second, weaker notion of "human" along the way.

**Independent Test**: open a gate in a real Pi session (a scripted, non-throwaway feature is out of scope here — r9 tests against a fixture-driven gate, not a
real lane, since starting one is r11's job); answer it; inspect the resulting factory-log entry.

**Acceptance Scenarios**:
1. **Given** a gate is open, **When** Layer B rises, **Then** it renders `renderPopup`'s exact card and offers exactly the gate's real move vocabulary
   (`moveVocabulary(gate.id)`) — never a hand-written list that could drift from it.
2. **Given** the popup is showing, **When** the human picks a move, **Then** `applyMove` is called with a `decidedBy` that resolves NC1, and the resulting
   `gate-completion` record passes 001's **unmodified** `log.ts`.
3. **Given** the popup is showing, **When** the human presses Esc or the dialog is otherwise cancelled, **Then** r8's seam reports `no-answer`, and the gate
   becomes a durable `WAIT` via `headlessWait` — **never** an `applyMove` call, and never any move at all.
4. **Given** Pi reports a mode/capability combination that cannot ask (per r8's `detectCapability`), **When** a gate would need Layer B, **Then** the gate
   degrades to a printed twin plus a `WAIT`, exactly as the headless path already does — a missing UI still never approves (P-V).

### User Story 3 — A human acts at Gate 0, in Pi, on the *distinct* Gate-0 face (Priority: P1)

An operator sees Layer C (the roadmap overlay) on demand, and when Gate 0 itself is open, sees the **distinct** Gate-0 face — never Layer B's per-gate card —
offering only Gate-0's own move vocabulary, and a chosen move is recorded exactly the way `recordGate0Decision` already defines.

**Why this priority**: Gate 0 is the one gate the constitution will not let go silent under any circumstance (P-VI), and it is the gate this whole roadmap's
own history has been recorded through by hand until now — the first row where a Gate-0 decision could be made *by a human clicking through Pi* is a real
milestone, and getting its "never a per-gate card" invariant wrong would blur the one gate that must never be confused with another.

**Independent Test**: with a `RoadmapHead` fixture carrying `gate0.status: "pending"`, raise Layer C in a real Pi session; confirm the Gate-0 face (not a
per-gate card) appears; pick a move; inspect the resulting record.

**Acceptance Scenarios**:
1. **Given** `gate0.status` is `pending`, **When** Layer C is raised, **Then** the Gate-0 face (`renderGate0Face`'s content) is shown, offering exactly
   `moveVocabulary("gate0")` — `approve`, `revise`, `reject`, `edit-rows`, `add-row`, `drop-row` — never a per-gate 1–9 move.
2. **Given** the Gate-0 face is showing, **When** the human picks `approve`, **Then** `recordGate0Decision` is called with a **human, non-pre-delegated**
   `decidedBy` (P-VI: Gate 0 admits no recorded exception, unlike a per-gate approval), and the record passes `log.ts` unmodified.
3. **Given** no gate is open and Gate 0 is not pending, **When** the operator raises Layer C on demand, **Then** the plain roadmap table (`renderOverlay`) is
   shown — read-only, no move offered, the same content r2 already renders headlessly.
4. **Given** Layer C is raised (either face), **When** the operator dismisses it, **Then** it collapses back to Layer A — never a silent state where neither
   the footer nor an overlay reflects the truth.

### User Story 4 — Every layer degrades safely with no UI, and every measured Pi quirk is defended against (Priority: P1)

Whatever Pi's real dialogs and overlays do — including everything r8 already measured them doing wrong — the surfaces built here never let a missing,
cancelled, or silent human look like a decision.

**Why this priority**: this is the same P-V property r8 built for a read-only command; here the stakes are a **real** decision reaching a **real** log record,
so a gap here is a worse failure than anything r8 could produce.

**Independent Test**: feed the real-Pi-measured non-answer shapes (from r8's `_seam-rows.ts`, extended for whatever this row's own spike adds) through the
Layer B/C wiring; assert every one becomes a `WAIT`, never a move.

**Acceptance Scenarios**:
1. **Given** any of r8's measured non-answer shapes (cancelled, timed-out headless mode, an unreachable UI), **When** it reaches Layer B or the Gate-0 face,
   **Then** the outcome is `no-answer` → `WAIT` — the same seam r8 built, not a second one.
2. **Given** `kiln/ui/keymap.ts`'s existing bare-letter keys are confirmed unusable as real Pi shortcuts (per the finding above), **When** r9's own spike
   re-decides the bindings, **Then** the new bindings are declared in exactly one place and a test asserts they are valid `modifier+key` strings.
3. **Given** an overlay component throws during render or `handleInput`, **When** that happens, **Then** the failure is visible (a named error, not a hang) —
   never a repeat of r8's F-1 (a component that could not close and gave no signal why).

### Edge Cases

- **Two overlays would want focus at once** (e.g., Layer B rises while Layer C is already up) — `docs/tui.md`'s "Overlay Focus" describes stacking and
  `unfocus()`; r9 must decide and test the actual behaviour, not assume one.
- **A session change (`/reload`, `/new`, `/resume`) happens while a gate is open** — r8 measured (research SQ3) that module state and event handlers survive
  and *accumulate* across a session change, and that an answer delivered *after* a switch is still applied to the stale handler. A live gate popup left open
  across such a switch must not let a late answer apply to the wrong gate.
- **The operator's Pi session has no model at all** (measured normal in r8's spike environment) — Layers A/B/C must work identically, since none of them
  should ever need a model call.
- **A `FactoryEvent` fires while an overlay's own `custom()` promise is still pending** (the human hasn't answered yet) — must not double-raise or corrupt the
  pending overlay; the redraw contract (`LAYERC_REDRAW_TRIGGERS`) needs a defined interaction with an open dialog.
- **The chosen `decidedBy` identity scheme (NC1) turns out to be spoofable or ambiguous in a shared machine** — recorded as a known limit if the resolved
  option carries one; not a blocking condition for this row, but must be stated plainly, not silently assumed safe.

## Requirements *(mandatory)*

### The spike questions (opens r9's own lane, mirroring r8's practice)

| # | Question | Why r9, not before |
|---|---|---|
| **SQ1** | What real Pi keybindings are available and free for Layer B's raise-key, Layer C's raise-key, and the dismiss key — replacing `keymap.ts`'s unmeasured bare letters? | needs `registerShortcut` run against real Pi, not just its docs |
| **SQ2** | Does an overlay survive a `turn_end` or an auto-compaction while open (`ui-layers-deep.md` §11 Q1)? | r8 could not measure this — no overlay of r8's stayed open across a turn boundary in its own smoke test |
| **SQ3** | What identity, if any, can an extension read for the operator (§ NC1)? Is there a Pi-native concept of "logged in user," or must KILN's `decidedBy` come from something else entirely (an env var, a config file, an explicit first-run prompt)? | genuinely unmeasured; r8 never needed a `decidedBy` at all |
| **SQ4** | Exactly which `overlayOptions` produce the full-width modal `ui-layers-deep.md` §5.1 describes, and does `nonCapturing` matter for Layer A staying visible under an overlay? | needs a real terminal, not RPC |
| **SQ5** | What happens when Layer B and Layer C would both want to be raised at once — does Pi's overlay stacking (`unfocus`/refocus) do the right thing automatically, or must KILN enforce "one overlay at a time" itself? | `ui-layers-deep.md`'s own invariant (§9) assumes mutual exclusion; never tested against Pi's real stacking |
| **SQ6** | Does a late-arriving answer after a session switch (measured in r8 to be delivered to the stale handler) ever reach `applyMove`, and if so, does it carry a stale gate token that `resumeByToken`'s existing `"still-open"` refusal already protects against, or is a new guard needed? | requires wiring `applyMove`/`resumeByToken` for the first time against a live Pi session |

### Functional Requirements

- **FR-001** Layer A SHALL be pushed to Pi's real `ctx.ui.setStatus` on every `FactoryEvent` r1's `onEvent` recognises, using `renderHud`'s existing output
  unmodified, and on no other trigger (no timer, no poll, no socket — P-IX). *(US1)*
- **FR-002** Layer B SHALL be raised via `ctx.ui.custom(...)` only when a per-gate 1–9 gate opens, rendering `renderPopup`'s content and offering exactly
  `moveVocabulary(gate.id)` as choices — never a hand-maintained list. *(US2)*
- **FR-003** Layer C SHALL be raised on demand (a key, per SQ1) and SHALL render `renderGate0Face`'s content **and only** `moveVocabulary("gate0")` when
  `gate0.status` is `pending`; otherwise it SHALL render `renderOverlay`'s plain, read-only table. The two faces are **disjoint by construction** (r2's
  existing invariant) — this row's wiring MUST NOT introduce a code path where a per-gate move reaches the Gate-0 face's vocabulary or vice versa. *(US3)*
- **FR-004** A human's explicit choice, once it is `answered(option)` per r8's seam, SHALL be applied via r1's real `applyMove` (for a per-gate move) or r2's
  real `recordGate0Decision` (for a Gate-0 move) — **never** a new, parallel "apply" path — with a `decidedBy` resolved from an **explicit, required,
  session-level identity** *(NC1 = A)*: a value the operator sets before answering any gate (e.g. `KILN_HUMAN=human@batorfi`), read once and, if absent,
  refused with a **named error** rather than guessed from the OS account or left blank — a missing identity degrades to the same `WAIT` a `no-answer` would
  (FR-005); it never invents a decider. *(US2, US3)*
- **FR-005** Every `no-answer` outcome from r8's seam, reached through Layer B or the Gate-0 face, SHALL become a durable `WAIT` via the existing
  `headlessWait` — the seam built in r8 is **reused**, not re-implemented, and no new "apply" path may bypass it. *(US4)*
- **FR-006** Gate 0's admission decision SHALL require a **non-pre-delegated, human** `decidedBy` (P-VI, matching `recordGate0Decision`'s existing contract);
  a per-gate 1–9 decision MAY ride a distinct `pre-delegation` where r1's existing rules already allow it. This row does not weaken either rule. *(US3)*
- **FR-007** `kiln/ui/keymap.ts`'s raise-keys SHALL be re-declared as valid Pi `modifier+key` shortcut strings (per `docs/keybindings.md`'s Key Format),
  resolved by SQ1, and a test SHALL assert every declared key parses as a legal `registerShortcut` binding. The old bare-letter constants are corrected, not
  silently kept alongside a second, real set. *(US4)*
- **FR-008** Only one of Layer B / the Gate-0 face / the plain Layer-C table may be visible at a time (r2's existing mutual-exclusion invariant); SQ5's
  measurement decides whether this needs an explicit guard or Pi's own overlay stacking already enforces it, and the decision SHALL be recorded either way —
  never assumed. *(US3, edge case)*
- **FR-009** A `FactoryEvent` that fires while an overlay's `custom()` promise is pending SHALL NOT corrupt, double-raise, or silently drop the pending
  dialog; the exact behaviour is measured by SQ2/SQ5 and specified in the plan, not assumed here. *(edge case)*
- **FR-010** An answer that arrives after a session switch (measured in r8 to reach a stale handler) SHALL NOT be applied as a decision unless it still
  matches an open gate's live token — `resumeByToken`'s existing `"still-open"` refusal is reused; SQ6 decides whether that is sufficient or a new guard is
  needed at the Pi-wiring layer. *(edge case, US4)*
- **FR-011** No file outside `kiln/pi/` (or a new `kiln/pi/ui/` per the layout note) reads a Pi type; the P-VIII scan continues to cover every new file the
  same way it covers `kiln/pi/` today. *(all; P-VIII)*
- **FR-012** `kiln/ui/live-tui.ts`'s abstract `LiveUICtx` is **superseded**, not deleted outright: *(NC2 = A)* **implemented against a real-Pi-backed body,
  keeping the same interface**. `LiveUICtx`'s two methods do not match Pi's real shapes (`setStatus` takes one argument here, two in Pi; `raiseOverlay` is a
  fire-and-forget push, Pi's `custom()` returns a Promise) — so the body is rewritten as a translation layer, and r3's existing event-driven-redraw tests
  keep running against it **unchanged**, as the regression net for the *event → redraw* contract, which this row does not touch. *(all)*
- **FR-013** A probe in the `*Ready` family (mirroring `PiReady`) SHALL exist for this row's own acceptance test. *(NC3 = B)*: **automated** (RPC mode,
  reusing r8's proven dialog-answering pattern, for the seam and the applied-decision logic) **plus one recorded human terminal smoke test** — RPC cannot
  draw an overlay any better here than it could in r8, so a human, once, in a real terminal, is what proves Layers B/C actually render and a real decision
  actually lands. *(all)*
- **FR-014** Nothing existing changes behaviour outside what this row explicitly wires: r1/r2/r3/r7/r8's suites stay green; `roadmap.ts` still PASSes; the
  only edits to existing files are additive wiring plus FR-007's keymap correction, FR-012's resolution, and FR-015's additive export. *(all)*
- **FR-015** A **presentation wrapper** SHALL sit between the pure renders and what is actually pushed to Pi, applying exactly three display-only
  transforms, and no others without a new requirement: **(a) gate names** — show the gate's **human-readable name** (e.g. `spec`, not the bare numeric id
  `3`), confirmed against `kiln/contracts/move-vocabulary.ts`'s existing id→name mapping (`1-concept` … `9-pr`), which is **not currently exported** and
  SHALL gain a new, additive export for this; **(b) timestamps** — a raw ISO-8601 value (`state.wallClock`, `gate0.at`) SHALL be shown as a **time-only**
  reading (e.g. `18:31:12`) where the field is a live "clock=" tick, and as a **full local date-and-time** reading (e.g. `22 Sep 2026, 17:56 UTC`) where the
  field is a point-in-time record such as `gate0.at` — never the raw `T…Z` form; **(c) header wording** — Layer B's header line drops its trailing
  `— moves […]` clause (redundant once the same moves are shown as the selectable list itself — FR-002), and Layer C's two headers drop internal-only tokens
  (the `Layer C` label, a `gate0.rows` bookkeeping range, raw `gate0 ·`/`decided_by`/`at` field-name style, and any constitution-principle citation such as
  `P-VI`) in favour of the plain wording approved in [ui-mockups.md](./ui-mockups.md) — a fixed, tested set of substitutions, not free-form rewriting. All
  three transforms run **after** `renderHud`, `renderPopup`, `renderOverlay` and `renderGate0Face` return; those four functions stay **byte-for-byte
  unmodified**. This qualifies FR-001/FR-002/FR-003's "unmodified content": the render functions' own return values are unmodified, and the **displayed**
  text additionally carries these three substitutions. *(US1, US2, US3)*

### Key Entities

- **The real `ctx.ui` binding** — whatever concrete module replaces (or implements) `LiveUICtx` against Pi's measured `setStatus`/`custom` shapes.
- **A resolved `decidedBy`** — the human identity NC1 produces, and how it is threaded from a Pi dialog answer through to `applyMove`/`recordGate0Decision`.
- **The Gate-0 / per-gate face disjointness guard** — whatever code or test enforces that the two move vocabularies never mix (FR-003).
- **The re-declared keymap** — real `modifier+key` strings for Layer B raise, Layer C raise, and dismiss, replacing `keymap.ts`'s bare letters.
- **The presentation wrapper** — the single module applying FR-015's two display-only transforms (gate names, via a new additive `move-vocabulary.ts`
  export; timestamp formatting) to what Layers A/B/C actually push to Pi, leaving the pure renders themselves untouched.

## Success Criteria *(mandatory)*

- **SC-001** Layer A's footer, observed in a real Pi terminal, matches `renderHud`'s output for at least three distinct `FactoryState`s — modulo FR-015's
  gate-name substitution — updating only on a fired event (measured: no change over an idle wall-clock interval with no event).
- **SC-002** A human, in a real terminal, answers at least one per-gate move through Layer B, and the resulting factory-log entry passes `log.ts` unmodified
  and carries the `decidedBy` NC1 resolves.
- **SC-003** A human, in a real terminal, makes a Gate-0 admission move through the distinct Gate-0 face, and the resulting record passes `log.ts`
  unmodified, is **not** a pre-delegation, and is provably never reachable through the per-gate popup's code path.
- **SC-004** **0** of the measured non-answer shapes (r8's set, plus whatever SQ2/SQ5/SQ6 add) ever produce an `applyMove`/`recordGate0Decision` call; a
  deliberate mutation that makes one do so is caught by name.
- **SC-005** `kiln/ui/keymap.ts`'s (or its successor's) raise-keys all parse as legal Pi `modifier+key` shortcut strings; **0** bare, unvalidated letters remain
  declared as a real binding.
- **SC-006** **0** new runtime dependencies; the existing suite is green with **0** newly failing tests; **0** existing behaviours changed outside this row's
  own wiring.
- **SC-007** A human reviewer, reading the resolution of NC1, can state in one sentence what `decidedBy` means in this row and how it could be checked or
  disputed later — it is not left implicit.
- **SC-008** Every pushed line naming a gate shows its human-readable name, never a bare numeric id; every pushed timestamp is shown in one of FR-015's two
  human-friendly forms, never a raw `T…Z` value; and Layer C's headers match the wording approved in `ui-mockups.md`, never the raw field-name/citation
  style. `kiln/ui/hud.ts`, `kiln/ui/popup.ts`, `kiln/ui/overlay.ts`, `kiln/ui/gate0-face.ts` and `kiln/contracts/move-vocabulary.ts`'s existing exports are
  byte-for-byte unmodified (a diff against r8's close-out commit is empty) — all three substitutions live entirely in the new export and r9's own
  presentation wrapper (FR-015).

## Clarifications

### Session 2026-09-22 — **RESOLVED** (decided by `human@batorfi`)

All three were decided on **2026-09-22**, on the measured and documented evidence above rather than on description. Each landed on the recommended option.

| # | Question | Resolution |
|---|---|---|
| **NC1** | What identifies the human for `decidedBy`? | **Option A — an explicit, required, session-level identity** (e.g. `KILN_HUMAN=human@batorfi`), read once, refused with a named error if absent |
| **NC2** | Replace or retire `LiveUICtx`? | **Option A — implement a real-Pi-backed body, keep the interface**; r3's event-driven-redraw tests keep running unchanged |
| **NC3** | What proves "a human answered a gate in Pi"? | **Option B — automated (RPC) plus one recorded human terminal smoke test**, the same shape as r8's FR-016 |

#### The evidence each was decided on

- **NC1.** Pi exposes no login identity to an extension at all (measured in r8). Deriving one from the OS account (option B) would silently conflate
  "whoever's OS account this is" with "the accountable human" — exactly the kind of untested assumption r3's stand-in resident and r8's own F-1 both warn
  against. An interactive first-answer prompt (option C) adds a dialog on the row's most important path. Option A is explicit, auditable, and fails loudly
  (P-V) rather than guessing — the same shape as r7's "fail loudly when the operator explicitly asked for a tier" decision.
- **NC2.** `LiveUICtx`'s two methods don't match Pi's real shapes at all (`setStatus` takes one argument here, two in Pi; `raiseOverlay` is a fire-and-forget
  push, Pi's `custom()` returns a Promise) — so "same interface" needs a translation layer either way. Keeping the interface preserves r3's smoke tests as a
  regression net for the *event → redraw* contract, which this row does not touch; only the *push mechanism* underneath changes.
- **NC3.** RPC cannot draw an overlay any better here than it could in r8 — the same measured limit — and r8's own experience shows the terminal is exactly
  where a real, otherwise-invisible defect was found. A pty/terminal-emulation harness (option C) was rejected for the same reason it was in r8: a large,
  timing-sensitive build for one row.

## Assumptions

- Pi `0.85.1` remains the only measured version; this row inherits r8's `MEASURED_PI_VERSIONS` discipline and does not widen it without new measurement.
- Verified on **macOS only**, same caveat as r8.
- r9 does not start a real lane on a real feature — its test gates are fixture-driven, the same way r8's `kiln-selftest` exercised the seam without ever
  starting one. Starting a real lane is r11's acceptance criterion.
- The keymap re-decision (FR-007) is scoped to *this row's* three keys; it does not attempt to design r10/r11's eventual command surface.
- `docs/tui.md` and `docs/keybindings.md` were read for this spec but not yet run against a live terminal in this row's own spike; every claim sourced from
  them is marked **documented, not yet measured by r9** in the findings register the plan will carry forward, mirroring r8's own M/D/T marking discipline.
