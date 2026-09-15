# Quickstart — 003-kiln-roadmap-overlay (r2) validation guide

**What this is.** A run guide that **proves Layer C is drawn** — the Roadmap overlay, its
Gate-0 face, the headless print-and-`WAIT` twin, and `OverlayCReady` — **without a live model**,
by driving a **closed-row program walk** and **replaying its emitted log through 001's
`kiln/validate/log.ts`** (the dogfood) while the **rendered head** validates through
**`kiln/validate/roadmap.ts`**. Each "Expect" maps to a success criterion.

**What this is NOT.** No live TUI smoke walk (NC1 → that is **r3**), **and r2 admits no program /
advances no Gate 0** (P-VI/FR-014/SC-007). The guide *renders + records* a program gate the *human*
makes; the overlay never admits `specs/ROADMAP.md` itself.

---

## Prerequisites

- **001 + r1 delivered and on branch** (the dogfood targets): `kiln/schemas/`,
   `kiln/validate/log.ts` (+ `roadmap.ts`), `kiln/contracts/move-vocabulary.ts`
    (`moveVocabulary("gate0")`), `kiln/src/types.ts`, and **r1's** `kiln/ui/{factory-state,
     hud,popup,twin}.ts` + `kiln/validate/runtime-ready.ts`.
- Node `>= 22.6` · `node --test`.
- r2's overlay modules, built at `/speckit.implement` per
    [overlay-api.md](./contracts/overlay-api.md):
    `kiln/ui/overlay.ts` + `kiln/ui/gate0-face.ts` (+ the **extended** `factory-state.ts` event
    union and `twin.ts`, `keymap.ts`), plus `kiln/validate/overlay-ready.ts` and
     `kiln/src/walk.ts`'s `buildProgramWalk`.
- The admitted program: [specs/ROADMAP.md](../../ROADMAP.md) (`gate0.status: approved`;
    **r2 is a row in it**, `deps: [r1]`) — this guide renders *this* program head.

## Setup

1. Confirm the overlay is **wired** on top of r1 (r1's stub is *not* replaced; r2's surface is added):

    ```
   ls kiln/ui/overlay.ts kiln/ui/gate0-face.ts kiln/validate/overlay-ready.ts
    ```
    **Expect:** all present; `kiln/index.ts` exports `renderOverlay` / `renderGate0Face` /
    `checkOverlayReady` **and** r1's spine (no regressions).

2. Confirm the dogfood **targets** still validate (the contracts r2 is judged **by**):

    ```
   kiln/validate/log  kiln/factory-log/r1-walk.jsonl     # r1 emits → PASS (no regression)
   kiln/validate/roadmap specs/ROADMAP.md                # the head r2 RENDERS
    ```
    **Expect:** both PASS — the `r1-walk` log is un-regressed (SC-003 stays green) and
    `specs/ROADMAP.md` carries its human-decided `gate0` record (M3/M4 / SC-007); r2 *renders*
    this head, it does **not** re-admit it.

---

## Scenario 1 — The overlay lists the whole program; one row is "here" (SC-001, US1)

- Render Layer C over a `FactoryState` whose `roadmap` is `r1..r6` with **r2 active at gate 3**.
- Run:

    ```
   kiln/tests/overlay         # node --test
    ```
- **Expect:** PASS. `renderOverlay(state)` lists **every** row as `id / status / short / deps /
   lane-gate`; **exactly one** row reads `at gate 3 — HERE`; the rest show `status` or
    `waits <dep>`; the `gate0` head shows `approved {rows: r1..r6, decided_by: human@batorfi, at:
    …}` at the top (§5.1). A **captured identical** `state` yields a **byte-identical** overlay
    (one source of truth — folds SC-005 into S1).

## Scenario 2 — The Gate-0 face is disjoint; its set is `moveVocabulary("gate0")` (SC-002, US2)

- (a) Render the Gate-0 face and read its move set.
- (b) Attempt to apply a **per-gate** move (e.g. `revise` at a 1–9 card shape) **at Gate 0**, and a
     **`gate0`** move **at a per-gate card**.
- Run:

    ```
   kiln/tests/gate0-face      # node --test
    ```
- **Expect:** PASS. The face shows **only** `moveVocabulary("gate0")`
    (`approve / revise / reject / edit-rows / add-row / drop-row`) on a **distinct** face (never
   Layer B's chrome); a per-gate move at Gate 0 **and** a `gate0` move at a per-gate card are
    **both rejected** (`gate0 ≠ gate`; a cross-application never applies). **0** per-gate moves at
   Gate 0; **0** `gate0` moves at a per-gate card.

## Scenario 3 — A human Gate-0 decision records additively and PASSES the dogfood (SC-003, US2/US3)

- Drive a **closed-row program walk** (`buildProgramWalk`); collect its emitted JSONL; **replay through
   001's validator**:

    ```
   kiln/validate/log  kiln/factory-log/<program-walk>.jsonl     # complete → PASS
   # negative: a broken path that auto-approves a missing Gate 0
   kiln/validate/log  kiln/factory-log/<program-broken>.jsonl   # FAIL, named R3
    ```
- **Expect:** PASS. The complete walk's **`gate-completion at gate:"gate0"`**
    (`move: approve`, `decidedBy: human@batorfi`) + `roadmap_row_done`→`gate0_open`/`wait` is
   **R1–R6** conformant — the complete stream and its **truncated prefix** **PASS**. **Then** the
    `brokenAutoApprove` vector (a `gate:"gate0"` `gate-completion` with **no** `decidedBy`) **FAILs**
   with a **named R3 reason** (`… no-silent-approval …`) — the SC-002→SC-003 negative. r2 adds **no
   new `recordType`** (D3); the union is 001's, unchanged.

## Scenario 4 — Inter-row re-entry: the unattended tail stops; a `merged` row is never re-entered (SC-004, US4)

- (a) `chain_unattended: false`: advance a closed row; (b) `chain_unattended: true` + a line-of-
   defense veto in the next row; (c) a `roadmap_row_done` for an already `done`/`merged` row.
- Run:

    ```
   kiln/tests/inter-row       # node --test
    ```
- **Expect:** PASS. With `false`, the tail **stops at the closed row's PR** and Gate 0 **re-opens**
    (a `gate0_open` / `WAIT`) before the next row begins. With `true` + a veto, the **cruise halts**
   and **Gate 0 is re-validated** at the boundary. A `roadmap_row_done` for a **`done`/`merged`** row
   **does nothing** — a `merged` row is **re-entered 0 times** (FR-009; "never re-enters a completed
   row").

## Scenario 5 — The watch: event-only redraw, no timer/server, the twin blocks Gate 0 (SC-005, US1/US3/US5)

- Fire `gate0_open` / `roadmap_row_done` on `FactoryState`; assert the overlay **redraws** and A/B
   **compose**; with the UI **disabled**, the roadmap table is **printed** and Gate 0 **blocks**.
- Run:

    ```
   kiln/tests/ui              # node --test; grep for timer/socket/server over kiln/ui/*.ts
    ```
- **Expect:** every redraw is **event-triggered**; an inspection finds **no `setInterval` /
    `setTimeout`, no socket, no server**; a captured identical state yields a **byte-identical**
    `renderOverlay`. With the UI **disabled**, `disabledUi(state).blocks === true` on an open
    Gate-0 — the twin **prints the program and `WAIT`s`, never auto-advancing (P-V/P-VI).

## Scenario 6 — OverlayCReady: a drawn overlay, deterministic, a blocking Gate 0, no cloud (SC-006, US5)

- Run the **falsifiable probe** (extension of r1's `runtime-ready.ts`, composing on it):

    ```
   kiln/validate/overlay-ready           # or kiln/tests/overlay-ready   (node --test)
   # then the negatives:
   kiln/validate/overlay-ready --broken-render    # overlay render broken
   kiln/validate/overlay-ready --broken-gate0     # a Gate-0 auto-advance hole
    ```
- **Expect:** PASS when the overlay + face + twin are present/wired, render **deterministically**,
    **block a headless Gate 0**, and pull **no cloud**. **FAIL, naming the broken element**, when
    exactly one is broken. A **zero-network scan** over `kiln/{ui,validate,contracts}` confirms
    **0** cloud round-trips (P-VIII).

## Scenario 7 — r2 admits no program, advances no Gate 0 (SC-007 / P-VI, FR-014)

- Render the program and reach a `gate0` surface headless; inspect the emitted log:

    ```
   kiln/validate/overlay-ready
   grep -n '"gate": "gate0"' kiln/factory-log/<program-walk>.jsonl   # only a RECORDED human decision
    ```
- **Expect:** the overlay **renders** the program and **records** a `gate-completion at
    "gate0"` that carries a **human `decidedBy`** — it **emits no program admission of its own**. The
    admission is the **human record** in `specs/ROADMAP.md` (`gate0.status: approved`;
    `decided_by: human@batorfi`), and a headless r2 *prints the roadmap table and `WAIT`s on Gate 0*,
    it does not auto-approve it (P-V, P-VI).

---

## Done when

Every scenario reproduces its "Expect," and — the spine of r2 — a closed-row program walk's emitted
log **PASSES 001's `kiln/validate/log.ts`** (the gate-0 `gate-completion` is additive; D3) while a
**broken auto-approve path FAILs it with a named R3 reason**, and the **head r2 renders** validates
under **`kiln/validate/roadmap.ts`**. Because r2 renders *not runs* the program (and admits
nothing at Gate 0 — P-VI/SC-007), the guide proves *Layer C is drawn, its program-gate blocks
headless, and it re-declares nothing* — ready for **r3** (the first *live*-model smoke walk).
