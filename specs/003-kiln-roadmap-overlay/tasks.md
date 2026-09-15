---
description: "Task list for KILN Layer C — the Roadmap overlay r2 (US1–US5, headless + Gate 0)"
---

# Tasks: 003-kiln-roadmap-overlay (r2 — the Layer C roadmap overlay)

**Input**: Design documents from `/specs/003-kiln-roadmap-overlay/`
(`plan.md`, `spec.md`, `research.md` D1–D8, `data-model.md` E1–E6, `contracts/`
overlay-api + gate0-face + overlay-ready, `quickstart.md` S1–S7)

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/
**Tests**: **Included, and load-bearing.** r2 *draws* a program the human admits, so — like r1 —
its Success Criteria (SC-001..007) are realized as **`node --test` suites**, with the spine being
the **dogfood**: a **closed-row program walk** (`buildProgramWalk`) emits JSONL that is **replayed
through 001's `kiln/validate/log.ts` and must PASS** (FR-005 / SC-003; the gate-0 `gate-completion`
is additive — NC3/D3) while a **broken auto-approve path FAILs it with a named R3 reason** (the
SC-002→SC-003 negative). Tests are written FIRST and watched to FAIL per user story (D5), then
implementations make them green. **Still no cloud and no live model** — a *live TUI walk* is r3
(NC1), and r2 **advances no Gate 0 / admits no program** (P-VI / FR-014 / SC-007).
**Organization**: Grouped by user story so each story is independently implementable and testable.
Story labels `[US1]`…`[US5]` map to `spec.md` priorities (US1–US3 = P1 the core: the overlay, its
Gate-0 face, its headless twin; US4 = P2 inter-row re-entry; US5 = P3 the `OverlayCReady` probe).

## Format: `[ID] [P?] [Story? Description]`

- **[P] can run in parallel** (different files, no dependency on an incomplete task)
- **[Story]** label for user-story phases (Setup/Foundational/Polish — none)
- Exact file paths in every description; signatures quoted from
    `contracts/overlay-api.md` / `data-model.md` / `research.md` so they are not left to
   implementation discretion.

> **Provenance:** r2 **renders + records** what 001 *declared* and r1 *ran*, and is **judged by**
> 001's `kiln/validate/roadmap.ts` (the head it renders) **and** `kiln/validate/log.ts` (the
> dogfood boundary). The canonical shapes — 001's two JSON Schemas,
> `kiln/contracts/move-vocabulary.ts` (`moveVocabulary("gate0")`), `kiln/src/types.ts`
> (`RoadmapRow`/`RoadmapHead`/`Gate0`/`FactoryState`), `kiln/validate/log.ts` + `roadmap.ts`, and
> **r1's** `kiln/ui/{factory-state,hud,popup,twin}.ts` + `kiln/src/walk.ts` +
> `kiln/validate/runtime-ready.ts` — are **imported, not re-declared** (001 + r1 stay canonical; the
> "001 declares, r1 runs, r2 renders, r2 is judged by 001+r1" invariant, D8). r2 *extends* r1's
> `FactoryEvent` union and twin **additively** (E3/D4) and re-declares **no log record type**
>  (NC3/D3). Per P-VI/FR-014, r2 draws — it does **not** admit — `specs/ROADMAP.md`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stand up r2's overlay module tree under r1's `kiln/ui/` and expose the new CLIs. No
story code yet beyond the shared test globs and the (still-empty) new modules.

- [x] T001 Create the Layer-C module tree per `plan.md` **Project Structure**: **new**
       `kiln/ui/overlay.ts`, `kiln/ui/gate0-face.ts`, `kiln/ui/keymap.ts`,
       `kiln/validate/overlay-ready.ts`; **extend** `kiln/ui/factory-state.ts` (the `FactoryEvent`
       union), `kiln/ui/twin.ts`, and `kiln/src/walk.ts` (additively); test subdirs
       `kiln/tests/{overlay, gate0-face, twin, inter-row, overlay-ready}/` with one `*.test.ts`
       each, plus the **extended** `kiln/tests/dogfood/` (a `run-program.ts`); **leave unchanged as
      import targets** `kiln/src/types.ts` (001), `kiln/validate/{log,roadmap,runtime-ready}.ts`
      (001/r1), `kiln/contracts/move-vocabulary.ts` (001), and r1's `kiln/ui/{hud,popup}.ts`
      (FR-002 — Layer C composes with, never replaces, A/B)
- [x] T002 [P] Add the `overlay-ready` + `program-walk` entry points to `kiln/package.json`
       (`"overlay-ready": "node kiln/validate/overlay-ready.ts"`,
      `"program-walk": "node kiln/tests/dogfood/run-program.ts"`); keep **zero runtime
       dependencies** (P-VIII — the new test dirs are auto-globbed by the existing
       `"node --test \"kiln/tests/**/*.test.ts\""` glob; assert the graph still pulls no network)
       in `kiln/package.json`

**Checkpoint**: module tree + the two new CLIs exist; `node --test` still passes the r1 baseline
(77 tests, no regression).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The two shared, story-agnostic additive pieces every story consumes — the **two Layer-
C events** on r1's event store (E3/D4, `F-OVERLAY`'s redraw triggers) and the **Layer-C keymap**
(§D6 — a low-risk planning spike, **not** an E-entity). Without them US1/US3/US4 have no event to redraw on.

**⚠️ CRITICAL**: No user-story work begins until this phase is complete.

- [x] T003 Extend r1's `kiln/ui/factory-state.ts` **additively** per `contracts/overlay-api.md`
       (E3/D4): add **exactly two** events to the closed `FactoryEvent` union —
      `{ kind: "gate0_open" }` (raise the overlay / Gate-0 face; the lane **holds** for a human;
      **never advances** Gate 0) and
      `{ kind: "roadmap_row_done"; rowId: string }` (`onEvent` → `current` advances to the **next
      dep-eligible row**, `gate0` → a human **`WAIT`**; it **never fires the next row's gate 1**
      and **never re-enters a `merged`/`done` row**). Keep `onEvent` **pure** (identical state ⇒
      identical next state — SC-005). **Depends on nothing new** (`FactoryState`/`RoadmapRow` from
       `kiln/src/types.ts`, 001)
- [x] T004 [P] Implement **`kiln/ui/keymap.ts`** (**§D6** — research §D6; the resolved low-risk keymap spike, **not** an E-entity):
       `export const LAYERC_KEY = "M"` (raise the Roadmap overlay / Gate-0 face),
      `LAYERB_KEY = "g"` (r1's popup), `TOGGLE_KEY = "?"`; wide full-width overlay is the lean
      sizing default (a compact strip is a deferred render tweak). **Depends on nothing new**

**Checkpoint**: the event store carries the two Layer-C events and `onEvent` handles them
purely; the keymap exists. Every overlay story can now redraw on a fired event.

---

## Phase 3: User Story 1 — The Layer C Roadmap overlay: the program-level zoom-out (Priority: P1) 🎯 MVP

**Goal**: `kiln/ui/overlay.ts` realizes **E1** — `renderOverlay(state: FactoryState): string`, the
**pure render** of `roadmap / current / gate0 / gate` that lists **every** `RoadmapRow` as
`id / status / short / deps / lane-gate`, highlights the in-flight `current` row
**"at gate N — HERE"**, and shows the `gate0` head at the top. It is **additive** — a fired event
redraws A, B, **and** C together (FR-002) — and **redraws only on a fired event** (`F-OVERLAY`,
SC-005 / P-IX): a captured identical state yields a **byte-identical** overlay.

**Independent Test**: `quickstart.md` **Scenario 1** (US1) — `renderOverlay` over a 6-row
`FactoryState` with **r2 active at gate 3** lists all rows, marks **exactly one** "at gate 3 —
HERE" with the rest `waits <dep>`, shows `gate0: approved {rows, decided_by, at}` on top; a
**re-render of a captured identical state is byte-identical**.

### Tests for User Story 1 (write FIRST; ensure they FAIL)

- [x] T005 [P] [US1] **Contract test (F-OVERLAY / SC-001, SC-001↔SC-005)** —
       `renderOverlay` over `roadmap = r1..r6` with **r2 active at gate 3**: lists every row as
      `id / status / short / deps / lane-gate`; **exactly one** reads `at gate 3 — HERE`; blocked
      rows read `waits <dep>`; the `gate0` head shows `approved {rows: r1..r6, decided_by:
      human@batorfi, at: …}`; **and** a captured identical `state` renders **byte-identical**
       (one source of truth) — in `kiln/tests/overlay/overlay.test.ts`
- [x] T006 [P] [US1] **No-poll / no-server inspection (SC-005 / P-IX)** — a test that **greps
       `kiln/ui/*.ts`** and asserts **no** `setInterval` / `setTimeout` / `new Server` /
      `require("net")` / `require("http")` / `fetch(` (mirrors r1 `kiln/tests/ui/ui.test.ts`'s
       SC-005 assertion, extended to the overlay set) — in `kiln/tests/overlay/overlay.test.ts`

### Implementation for User Story 1

- [x] T007 [US1] Implement **`kiln/ui/overlay.ts`** — `renderOverlay(state: FactoryState): string`
       per `contracts/overlay-api.md` (E1): a **pure** render of `roadmap / current / gate0 /
      gate` (list every row; highlight `current` "at gate — HERE"; `waits <dep>` on blocked rows;
       `gate0` head on top; footer distills r1's `switches`/`wallClock` — not re-computed).
       **Composes** with A/B (never replaces/hides them, FR-002); **never forks a lane** (P-III,
       `F-SINGLE` holds) — **depends on T003**

**Checkpoint**: US1 functional + independently testable (`kiln/tests/overlay` green; SC-001 the
**complete, unambiguous zoom-out**, SC-005 the byte-identical deterministic read).

---

## Phase 4: User Story 2 — The Gate 0 face: the pre-lane + inter-row human-decision surface (Priority: P1)

**Goal**: `kiln/ui/gate0-face.ts` realizes **E2** — the **distinct** Layer-C face that renders the
proposed/admitted program (`renderGate0Face`) with the **roadmap-level** move set
`moveVocabulary("gate0")` `[approve, revise, reject, edit-rows, add-row, drop-row]` (**never**
Layer B's per-gate chrome — NC2, `gate0 ≠ gate`, G1), and `recordGate0Decision` that writes a Gate-
0 move **additively** as a `gate-completion` at `gate:"gate0"` with a non-empty
`decidedBy: human@…` — **no new log record type** (NC3/D3), so 001's `kiln/validate/log.ts`
**already accepts it**. A move `∉ moveVocabulary("gate0")` is **rejected** and the face **stays
open** (G3); a per-gate move at Gate 0 — and a gate0 move at a per-gate card — is **never
accepted** (SC-002).

**Independent Test**: `quickstart.md` **Scenario 2** (US2) + the **additive-recording** half of
**Scenario 3** — the face shows **only** `moveVocabulary("gate0")`; a per-gate move at Gate 0 **and**
a gate0 move at a per-gate card are **both rejected**; a human `approve` (with `decidedBy`) emits a
gate-0 `gate-completion` that **PASSES `kiln/validate/log.ts`**, while a `decidedBy`-less one
**FAILs** with a **named R3** reason.

### Tests for User Story 2 (write FIRST; ensure they FAIL)

- [x] T008 [P] [US2] **Disjoint-vocabulary test (SC-002 / FR-006, G1)** — `renderGate0Face` shows
       **only** `moveVocabulary("gate0")` on a **distinct** face (not Layer B chrome); a **per-
      gate** move applied at Gate 0 **and** a **`gate0`** move applied at a per-gate card are
      **both rejected** (`gate0 ≠ gate` — a cross-application never applies); assert **0** per-gate
      moves at Gate 0 and **0** `gate0` moves at a per-gate card — in
      `kiln/tests/gate0-face/gate0-face.test.ts`
- [x] T009 [P] [US2] **Additive-recording dogfood test (SC-003 / D3)** — `recordGate0Decision(
       roadmap, { move: "approve", decidedBy: "human@batorfi" })` emits a `gate-completion` at
      `gate:"gate0"` that **PASSES 001's `kiln/validate/log.ts`** (R1–R6; **no new recordType** —
      the union is 001's, unchanged); the **same** decision **without a `decidedBy` FAILs** the
      validator with a **named R3 reason** (`no-silent-approval`) — in
      `kiln/tests/gate0-face/gate0-face.test.ts` (drives the shared program-walk of T016/T017)

### Implementation for User Story 2

- [x] T010 [US2] Implement **`kiln/ui/gate0-face.ts`** per `contracts/gate0-face.md` +
       `overlay-api.md` (E2): `import { moveVocabulary, moveAllowed } from
      "../contracts/move-vocabulary.ts"` (**do NOT re-declare the set — 001 canonical**);
      `renderGate0Face(roadmap: RoadmapHead): string` renders the §5.2 program table +
      `moveVocabulary("gate0")` on a **distinct** face (never Layer B's chrome, NC2);
      `recordGate0Decision(roadmap, decision: { move: string; decidedBy: string }): FactoryRecord`
      emits **only when** `decidedBy` is non-empty **and** `move ∈ moveVocabulary("gate0")`,
      producing a `gate-completion { gate: "gate0", move, decidedBy, cost }` — otherwise it
      **stays open (throws; no record)**, so a `decidedBy`-less auto-approve never emits (P-V/P-VI); and
      **unlike r1's per-gate `gate`, a gate-0 approval rides a *human `decidedBy` only* — a
      **recorded `pre-delegation` is rejected here** (P-VI: Gate 0 is "the one gate no exception may
   silence"; the R3 `pre-delegation` escape does **not** apply at `gate0`, F1) — **depends on T003**
- [x] T011 [US2] Implement the **disjointness guard** — a Gate-0 face **rejects** a per-gate 1–9
       move and a per-gate card **rejects** a `gate0` move (the two vocabularies are disjoint,
      G1/SC-002); an illegal move `∉ moveVocabulary("gate0")` **keeps the face open** (G3) —
      **depends on T010**

**Checkpoint**: US2 functional + independently testable (`kiln/tests/gate0-face` green; SC-002 the
**disjoint** road-level move set, SC-003 the **additive** gate-0 record PASSES the log / a broken
one FAILs it).

---

## Phase 5: User Story 3 — The headless roadmap twin: print the program; Gate 0 prints-and-`WAIT`s (Priority: P1)

**Goal**: r1's `kiln/ui/twin.ts` is **extended additively** (E4) so the disabled surface also
handles Layer C: with **no UI**, the roadmap **table is printed** (the *same* rows/status/deps
`renderOverlay` shows — one source of truth) and **Gate 0 *prints the program and emits a `wait`*,
never a `gate0: approved`** — `disabledUi(state).blocks` reports an **open Gate 0 / open row-gate**
even when the overlay is absent (**`F-GATE0-BLOCK`**, P-V/P-VI lifted to the program gate; a broken
auto-approve path is the **SC-002→SC-003** test vector that **FAILs `kiln/validate/log.ts`**).

**Independent Test**: `quickstart.md` **Scenario 5** (US3) — the overlay **disabled**, the roadmap
**table is printed** identical to the overlay's; **Gate 0 blocks** (`disabledUi(...).blocks ===
true`) and never auto-advances; a **broken** no-silent-approval path makes the emitted log **FAIL
001's `kiln/validate/log.ts`** with a **named** reason.

### Tests for User Story 3 (write FIRST; ensure they FAIL)

- [x] T012 [P] [US3] **F-GATE0-BLOCK test (SC-002/SC-003 / P-V·P-VI)** — with the overlay
       **absent**: `printHeadless(state)` prints the **same** roadmap table `renderOverlay` shows
      (one source of truth); `disabledUi(state).blocks === true` on an **open** Gate 0; and a
      **broken** auto-approve (a gate-0 `gate-completion` **without** a `decidedBy`) **FAILs 001's
      `kiln/validate/log.ts`** with a **named R3 reason** — in `kiln/tests/twin/twin.test.ts`
- [x] T013 [P] [US3] **Negative (P-V/P-VI, US3 AC-2 + F1)** — (a) a headless Gate 0 with **no
      human move** emits **exactly one `wait`** (token + deadline) and **no `gate0: approved`** —
      "recorded, never resolved"; **and** (b) a **pre-delegated** gate-0 approval (a distinct
      `pre-delegation` record with **no** human decider) is **rejected / emits nothing** — Gate 0
      admits a **human decider only**; the R3 `pre-delegation` escape does **not** apply at `gate0`
      (P-VI: the one gate no exception may silence; **F1 resolved**) — in `kiln/tests/twin/twin.test.ts`

### Implementation for User Story 3

- [x] T014 [US3] **Extend `kiln/ui/twin.ts` additively** per `overlay-api.md` (E4): `printHeadless`
       **also prints the Layer-C roadmap table** (via `renderOverlay`, T007 — the overlay hidden,
      never the data); `disabledUi(state).blocks` **extends** r1's `blocksOn` to report an **open
      Gate 0 / open row-gate** even when the overlay is absent (**`F-GATE0-BLOCK`**: a missing Layer
      C hides the *view*, never the *decision*) — **depends on T007, T003**

**Checkpoint**: US3 functional + independently testable (`kiln/tests/twin` green; a missing Layer C
**prints the program and blocks Gate 0**, the broken auto-approve **FAILs the log**).

---

## Phase 6: User Story 4 — Inter-row re-entry: `roadmap_row_done` re-opens Gate 0; the tail stops (Priority: P2)

**Goal**: `kiln/src/walk.ts` gains **`buildProgramWalk()`** (E3, an additive extension of r1's
`buildStubWalk`) that emits a **closed-row program walk** — a row's closing `gate-completion`
(`gate 9 → @PR#N`), a **gate-0 `gate-completion`** (via T010's `recordGate0Decision`), and
`roadmap_row_done` → `gate0_open` / `wait` — so r2 can **judge a row close + a Gate-0 re-entry**
by 001's `log.ts`. The unattended tail **stops at `chain_unattended: false`** (the safe default)
and a **`merged`/`done` row is re-entered 0 times** (FR-009/FR-010).

**Independent Test**: `quickstart.md` **Scenario 4** (US4) + the **program-walk** half of
**Scenario 3** — `chain_unattended: false` → the tail **stops at the closed row's PR** and Gate 0
**re-opens** before the next row; `chain_unattended: true` + a line-of-defense **veto halts** and
Gate 0 is **re-validated**; a `roadmap_row_done` for a `done`/`merged` row **does nothing**.

### Tests for User Story 4 (write FIRST; ensure they FAIL)

- [x] T015 [P] [US4] **Inter-row test (SC-004 / FR-009·FR-010)** — (a) `chain_unattended: false`:
       a closed row ⇒ Gate 0 **re-opens** (`gate0_open`/`WAIT`) before the next row; (b)
      `chain_unattended: true` + a **line-of-defense veto** (`reviewer restart` / `verifier reject`
      / checkpoint overflow) ⇒ the **cruise halts** and Gate 0 is **re-validated** at the boundary;
      (c) a `roadmap_row_done` for a **`done`/`merged`** row ⇒ **no re-entry** (re-entered **0
      times**) — in `kiln/tests/inter-row/inter-row.test.ts`
- [x] T016 [P] [US4] **Program-walk dogfood test (SC-003 / D3)** — `buildProgramWalk()` emits a
       `gate-completion { gate: "gate0", move: "approve", decidedBy: "human@batorfi", cost }` +
      `roadmap_row_done` → `gate0_open` + a `wait`; the **complete** stream and its **truncated
      prefix** **PASS 001's `kiln/validate/log.ts`**; `buildProgramWalk({ brokenAutoApprove:
      true })` (a gate-0 decision **without** `decidedBy`) **FAILs** with a **named R3** reason —
      in `kiln/tests/inter-row/inter-row.test.ts` (or `kiln/tests/dogfood/`)

### Implementation for User Story 4

- [x] T017 [US4] **Extend `kiln/src/walk.ts` additively** per `overlay-api.md` —
       `buildProgramWalk(opts?: { gate0By?: string; brokenAutoApprove?: boolean }): { lines:
      string[]; jsonl: string }`: a closed-row gate-0 sequence reusing **T010's
      `recordGate0Decision`** for the gate-0 `gate-completion` and emitting `roadmap_row_done` →
      `gate0_open` + a `wait` (R1–R6 conformant); `brokenAutoApprove: true` **drops the gate-0
      `decidedBy`** so the log FAILs R3 — **depends on T010, T003**
- [x] T018 [US4] Add the **program-walk dogfood runner** `kiln/tests/dogfood/run-program.ts`
       (T002's `"program-walk"` script): build the walk, write
      `kiln/factory-log/<program-walk>.jsonl` + `<program-broken>.jsonl`, invoke **001's
      `kiln/validate/log.ts`** over each, print PASS/FAIL with the **named reason** — **depends on
      T017**
- [x] T019 [US4] **Wire `roadmap_row_done` handling** in `onEvent` (T003) so `current` → **next
       dep-eligible row** + `gate0` → a human **WAIT**, gated by `chain_unattended` (the unattended
      tail **stops when `false`**); a **`merged`/`done` row is never re-entered** (FR-009);
      **agree with `buildProgramWalk`** (T017) so the walk and the store tell the same story —
      **depends on T003, T017**

**Checkpoint**: US4 functional + independently testable (`kiln/tests/inter-row` green; SC-004 — the
unattended tail **stops** and a `merged` row is **re-entered 0 times**).

---

## Phase 7: User Story 5 — OverlayCReady: the falsifiable, cloud-free, no-admission probe (Priority: P3)

**Goal**: `kiln/validate/overlay-ready.ts` realizes **E6** — a **static `node --test` probe**, the
**extension of r1's `runtime-ready.ts`** (composing on its wiring + zero-network + valid-log
checks), asserting the Layer-C pieces **exist, render deterministically, block a headless Gate 0,
and pull no cloud** — **advancing no gate, admitting no program, running no *real* feature** (a
*probe*, not a *walk*; `F-OVERLAYREADY`, SC-006).

**Independent Test**: `quickstart.md` **Scenario 6** (US5) — the probe **PASSES** when the overlay
+ face + twin are present/wired, render deterministically, block a headless Gate 0, and pull no
cloud; **remove or break exactly one** → **FAIL, naming the broken element**; a **zero-network
scan** over `kiln/{ui,validate,contracts}` confirms **0** cloud round-trips.

### Tests for User Story 5 (write FIRST; ensure they FAIL)

- [x] T020 [P] [US5] **Falsifiability test (F-OVERLAYREADY / SC-006)** — `checkOverlayReady()`
       **PASSES** with the full overlay + face + twin + a green program-walk dogfood; **omitting or
      breaking exactly one element** (point a dep path at a missing module, break the overlay
      render's determinism, open an auto-advance-of-Gate-0 hole, stub the overlay, or add a cloud
      import) makes it **FAIL and NAME the broken element** — in
      `kiln/tests/overlay-ready/overlay-ready.test.ts`

### Implementation for User Story 5

- [x] T021 [US5] Implement **`kiln/validate/overlay-ready.ts`** — `checkOverlayReady()` as the
       **extension of r1's `kiln/validate/runtime-ready.ts`** (compose on it, do **not** duplicate
      — D7): (a) **presence + wiring** of `kiln/ui/overlay.ts` (`renderOverlay`),
      `kiln/ui/gate0-face.ts` (`renderGate0Face`) and the **extended** twin, plus **`kiln/index.ts`
       exports them on top of r1's spine**; (b) **deterministic render + a blocking headless Gate
      0** — a captured `state` ⇒ byte-identical `renderOverlay`, and with the overlay **absent**
       Gate 0 **prints + `WAIT`s` and never emits a `gate0: approved`**, replayed through
      `kiln/validate/log.ts` (`F-OVERLAY` + `F-GATE0-BLOCK`); (c) a **zero-network scan** over
       `kiln/{ui,validate,contracts}` (reuses r1's scan, D7). Emit a **traceability note** mapping
      each Layer-C piece to its principle(s) (**P-IX** E1/E3; **P-V/P-VI** E4; **P-VIII** E6 — the
       runtime analogue of FR-009); on any gap **exit non-zero, naming the broken element** —
      **depends on T014, T017**
- [x] T022 [US5] Wire the **CLI entry** `kiln/validate/overlay-ready.ts` (T021; T002's
       `"overlay-ready"` script): print **`READY`** or a **named gap**; support
      `--broken-render` / `--broken-gate0` flags (mirrors r1's `--broken`); runs **no gate, admits
      no program** (P-VI / FR-012 / SC-007) — used by `quickstart` **Scenario 6** — **depends on
      T021**

**Checkpoint**: US5 functional + falsifiable (`kiln/tests/overlay-ready` green; the overlay
provably *drawn*, deterministic, a blocking headless Gate 0, cloud-free).

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Wire Layer C into the public index over r1's spine and record r2's compliance evidence.

- [x] T023 **Extend `kiln/index.ts` additively** — **also export** `renderOverlay` /
       `renderGate0Face` / `recordGate0Decision` / `buildProgramWalk` / `checkOverlayReady` on top
       of r1's spine exports (no regression to r1); it **emits no `gate0` decision** and **admits
      no program** (P-VI / FR-014 / SC-007 — r2 *renders*, the human move in `specs/ROADMAP.md`
      *admitted*) — **depends on T007, T010, T017, T021**
- [x] T024 [P] Add a **Layer-C traceability cross-ref table** (E1–E6 ↔ constitution
       **P-V/P-VI/P-IX/P-VIII** + **SC-001..007**) to `kiln/contracts/README.md` (r1's index,
      extended for r2 — the runtime analogue of 001's T027 / FR-009) in
      `kiln/contracts/README.md`
- [x] T025 Run **all seven `quickstart` scenarios end-to-end** (S1–S7) and record results in
       `specs/003-kiln-roadmap-overlay/quickstart-run.md`; assert the **program-walk PASSES
      001's `kiln/validate/log.ts`** + the **broken auto-approve FAILs with a named R3** (SC-003),
      the **rendered head validates under `kiln/validate/roadmap.ts`** (M3/M4 / SC-007), and
      **zero program-admissions / zero gate-advances** inside r2 (SC-007) — in
      `specs/003-kiln-roadmap-overlay/quickstart-run.md`
- [x] T026 Re-check **constitution** compliance (P-I..P-IX + governance / FR-013-analogue) against
       the delivered Layer-C overlay and write a short **compliance note** in
      `specs/003-kiln-roadmap-overlay/compliance-note.md` — this slice **drew Layer C headlessly**
      (a render, not a live walk, NC1⇒r3), added **no cloud / no second lane / no server / no new
      log record type** (NC3/D3), and **admitted no program** (P-VI/FR-014/SC-007); the emitted
      log + the `ROADMAP.md` head are the compliance evidence (P-VII) — in
      `specs/003-kiln-roadmap-overlay/compliance-note.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately (module tree + the two CLIs).
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories** (the two Layer-C
   events on the store + the keymap are consumed by every overlay story).
- **User Stories (Phase 3–7)**: **US1**, **US2**, **US3** are **independently** testable after
   Foundational (US1→US3 share the events from T003; US3's twin composes on US1's overlay at
   **T014**). **US4** (inter-row) depends on **US2** (`recordGate0Decision`, T010) + the events;
   **US5** (`OverlayCReady`) depends on **US1 + US2 + US3 + US4** — it asserts their *presence +
   wiring + a green program-walk dogfood* — but asserts **no gate advance / no program admission**.
- **Polish (Phase 8)**: Depends on all desired user stories; the `index.ts` wiring (T023) is what
   `OverlayCReady` (a) asserts.

### User Story Dependencies

- **US1 (P1)**: After Foundational only (the event store T003).
- **US2 (P1)**: After Foundational (001's `move-vocabulary.ts`, gate-0 face shape).
- **US3 (P1)**: After **US1** (the twin prints `renderOverlay`'s table, T014) + the events.
- **US4 (P2)**: After **US2** (`recordGate0Decision` feeds `buildProgramWalk`) + the events;
   T019 **agrees with T017** (walk ↔ store).
- **US5 (P3)**: After US1–US4 (its presence check + the program-walk dogfood + `index.ts` wiring
   assert the whole overlay is real); **runs no gate, admits no program** (a probe, not a walk).

### Within Each User Story

- **Tests are written and FAIL before implementation** (T005–T006 / T008–T009 / T012–T013 /
   T015–T016 / T020).
- **Implementation before cross-cutting wiring**: the overlay (US1) before the twin prints it (US3,
   T014); `recordGate0Decision` (US2, T010) before `buildProgramWalk` (US4, T017) and the probe
   (US5, T021).
- The **program-walk dogfood** (T016/T017/T018/T021) must **PASS through 001's unmodified
   `log.ts`** at every checkpoint that emits a gate-0 log (SC-003), and the **broken auto-approve
   vector must FAIL it, named** (R3).

### Parallel Opportunities

- Setup: **T002** parallel with T001 (scripts vs structure).
- Foundational: **T004** (keymap) parallel with **T003** (independent files).
- Per story: the **test pair/trio** (T005–T006, T008–T009, T012–T013, T015–T016, T020) runs in
   parallel, each then its implementation.
- Cross-story: **US1 / US2** are independent after Foundational and may be staffed separately;
   **US3** composes on US1; **US5** integrates all.

---

## Parallel Example: User Story 1

```text
# Launch US1 tests together (write each, then watch them FAIL):
Task: "T005 [P] [US1] F-OVERLAY/SC-001 contract test — kiln/tests/overlay/overlay.test.ts"
Task: "T006 [P] [US1] SC-005 no-poll/no-server inspection of kiln/ui/*.ts — kiln/tests/overlay/overlay.test.ts"

# Then implement (sequential within the story):
Task: "T007 [US1] kiln/ui/overlay.ts — renderOverlay(state) pure over FactoryState, composes w/ A/B (dep T003)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete **Phase 1: Setup** (overlay module tree + the two new CLIs).
2. Complete **Phase 2: Foundational** — **CRITICAL, blocks all stories** (the two Layer-C events on
   the store + the keymap).
3. Complete **Phase 3: User Story 1** — the Layer C overlay (tests first).
4. **STOP and VALIDATE**: run `quickstart` **Scenario 1** — the overlay lists the **whole** program,
   marks **exactly one** row "at gate — HERE", and renders **byte-identical** on a captured state.
   This is the MVP: *the roadmap is drawn.*

### Incremental Delivery

1. Setup + Foundational → **foundation ready** (events + keymap).
2. **US1** → validate S1 (every row listed; one in-flight "here"; deterministic) → **the overlay**.
3. **US2** → validate S2 (Gate-0 face = `moveVocabulary("gate0")`, disjoint; additive gate-0
   record PASSES the log; a broken one FAILs named) → **the Gate-0 face**.
4. **US3** → validate S5 (overlay disabled ⇒ roadmap **printed** + Gate 0 **blocks**; broken auto-
   approve **FAILs the log**) → **the headless twin** (P-V/P-VI lifted to the program gate).
5. **US4** → validate S4 (+ the program-walk of S3: `buildProgramWalk` PASSES the log; a `merged`
   row re-entered **0 times**; the unattended tail **stops**) → **the inter-row seam**.
6. **US5** → validate S6 (`OverlayCReady` is falsifiable; **0 cloud**) → **the handoff probe**.
7. **US7/S7** → the **no-self-admission** check (`grep '"gate": "gate0"'` shows **only a recorded
   human decision**; r2 admits nothing) → **SC-007**.
8. **Polish**: wire `kiln/index.ts` (T023), add the traceability cross-ref (T024), run S1–S7 +
   write the compliance note (T025/T026).
9. Each story adds value without breaking a prior one; **no story admits a program or advances Gate
   0** (P-VI/FR-014/SC-007), a **live-model smoke walk is r3** (NC1), and the whole build stays
   **local-first / cloud-free** (P-VIII).

### Parallel Team Strategy

With multiple developers (still one lane at runtime — parallelism is *authoring* only, P-III):

1. One role finishes Setup + Foundational (the shared events + keymap).
2. Once Foundational is done:
     - Developer A: **US1 overlay** → **US3 twin** (they compose at T014).
     - Developer B: **US2 Gate-0 face** → **US4 inter-row** (T010 feeds T017).
     - Developer C: **US5 OverlayCReady** once A/B land.
3. Stories integrate at **US5 / OverlayCReady** (asserts presence + wiring + a green dogfood) and
   the Phase-8 `index.ts` wiring + compliance note.

---

## Notes

- **[P]** tasks = different files, no dependency on an incomplete task.
- **[Story]** labels map each task to its user story for traceability.
- **Tests first**: write and *watch fail* before implementation, per user story.
- **The dogfood is the spine** (SC-003): a closed-row **program walk's** emitted JSONL must
   **PASS 001's unmodified `kiln/validate/log.ts`** — the gate-0 `gate-completion` is **additive**
   (D3/NC3: **no new record type**), a *prefix* reconstructs, and a **broken auto-approve of a
   missing Gate 0 FAILs it with a named R3 reason** (SC-002→SC-003, P-V/P-VI).
- **Gate 0 is human-only, no exception (F1 resolved)**: a `gate0: approved` rides a
     **`decidedBy: human@…` only** — a **recorded `pre-delegation` does *not* admit Gate 0** (P-VI:
    the one gate no exception may silence; the generic R3 pre-delegation escape is for gates 1–9, not
    `gate0`). Enforced at `recordGate0Decision` (T010 / FR-008 / the gate-0-face "no exception"
    invariant) and proved falsifiably in T013(b) + T009.
- **Scope guard**: this slice **drew Layer C headlessly** (NC1 ⇒ a *live*-model walk is **r3**);
   **no task runs a real feature, admits a program, or advances Gate 0** (P-VI / FR-014 / SC-007),
   and the module graph pulls **no network** (P-VIII / SC-007).
- **Import, don't re-declare** (001 + r1 are canonical): 001's two JSON Schemas,
   `kiln/contracts/move-vocabulary.ts`, `kiln/src/types.ts`, `kiln/validate/{log,roadmap}.ts`, and
   **r1's** `kiln/ui/{factory-state,hud,popup,twin}.ts` + `kiln/src/walk.ts` +
   `kiln/validate/runtime-ready.ts` are **imported / extended additively** — r2 is **judged by**
   them, not a re-declaration of any shape or log record type (D8 / NC3).
- A **live-model TUI smoke walk** (NC1) and the `overlay M` keymap final choice / sizing
   (`ui-layers-deep.md §11#5`) are **out of scope** for r2's tests (the keymap is a resolved low-
   risk spike at T004; the live walk is **r3**).
- **Commit after each task or logical group.** Stop at any checkpoint to validate the story
   independently; a closed terminal leaves a reconstructable log (P-VII).
- **Avoid**: vague tasks, same-file conflicts (one writer per additive touch — `factory-state.ts`
   is T003 then T019; `walk.ts` is T017; `twin.ts` is T014; `index.ts` is T023), cross-story
   dependencies that break independence, re-declaring 001's/r1's shapes, and any cloud call
   (P-VIII).
