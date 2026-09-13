---
description: "Task list for KILN lane runtime r1 — the execution spine (US1–US6 + polish)"
---

# Tasks: 002-kiln-lane (r1 — the lane runtime)

**Input**: Design documents from `/specs/002-kiln-lane/`
(`plan.md`, `spec.md`, `research.md` D1–D8, `data-model.md` E1–E7, `contracts/`
runtime-api + runtime-ready, `quickstart.md` S1–S7)

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/
**Tests**: **Included, and load-bearing.** r1 *runs* a lane, so unlike 001 (purely static
contracts) the Success Criteria (SC-001..007) are realized as **`node --test` suites**, with the
spine being the **dogfood**: a stub-resident walk emits JSONL that is **replayed through 001's
`kiln/validate/log.ts` and must PASS** (FR-004 / SC-003). Tests are written FIRST and watched to
FAIL per user story (D5), then implementations make them green. **Still no cloud and no real
feature** — the walk is a *stub* (NC2 ⇒ a live smoke walk is r3), and r1 **advances no gate /
admits no program** (P-VI / FR-012 / SC-007).
**Organization**: Grouped by user story so each story is independently implementable and testable.
Story labels `[US1]`…`[US6]` map to `spec.md` priorities (US1–US4 = P1 the spine; US5 = P2 the
watch; US6 = P3 the probe).

## Format: `[ID] [P?] [Story?] Description`

- **[P] can run in parallel** (different files, no dependency on an incomplete task)
- **[Story]** label for user-story phases (Setup/Foundational/Polish — none)
- Exact file paths in every description; constraints quoted from
   `data-model.md` / `contracts/` / `research.md` so they are not left to implementation
discretion.

> **Provenance:** r1 **realizes** what 001 *declared* and is **judged by** 001's
> `kiln/validate/log.ts` (the dogfood boundary). The canonical shapes — the two JSON Schemas,
> `kiln/contracts/move-vocabulary.ts`, `kiln/src/roles.ts`, and the `FactoryState` /
> `FactoryRecord` union in `kiln/src/types.ts` — are **imported, not re-declared** (001 stays
> canonical; the "001 declares, r1 runs, r1 is judged by 001" invariant). r1 *promotes* the single
> root by replacing 001's `not-wired` `kiln/index.ts` stub with the wired spine.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stand up the runtime module tree under the shared `kiln/` root and expose the
`runtime-ready` CLI. No story code yet beyond the shared test glob.

- [ ] T001 Create the runtime module tree per `plan.md` **Project Structure**: `kiln/ui/`
      (new — `factory-state.ts`, `hud.ts`, `popup.ts`, `twin.ts`); test subdirs
      `kiln/tests/{lane,gate,writer,scheduler,ui,runtime-ready,dogfood}/` with one
      `*.test.ts` each; leave `kiln/src/{roles.ts,types.ts}` and `kiln/validate/*`
      (001, unchanged) as-is in `kiln/`
- [ ] T002 [P] Add the `runtime-ready` + `dogfood` entry points to `kiln/package.json`
      (`"runtime-ready": "node kiln/validate/runtime-ready.ts"`, `"dogfood": "node
      kiln/tests/dogfood/run.ts"`); keep **zero runtime dependencies** (P-VIII — the new test dirs
      are auto-globbed by the existing `"node --test \"kiln/tests/**/*.test.ts\""` glob; assert
      the graph still pulls no network) in `kiln/package.json`

**Checkpoint**: module tree exists; `node --test` still passes the 001 baseline; `package.json`
exposes the two new CLIs without a dep.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The two shared, story-agnostic runtime pieces every story consumes — the deterministic
**stub resident** (E6 / NC2) and the monotonic **clock** the writer and walks need.

**⚠️ CRITICAL**: No user-story work begins until this phase is complete.

- [ ] T003 [P] Implement the **stub-resident interface + deterministic factory**
      `kiln/src/stub-resident.ts` (E6 / research D4): `export interface Resident { run(u:
      WorkUnit): unknown; model(): string; tier(): Tier }` and `makeStubResident(opts?: {
      model?: string; tier?: Tier }): Resident` — **fully deterministic** (fixed output per input
      ⇒ replayable through `log.ts`), **NO live Ollama / NO network**; it is **never the decider
      of a gate** (P-I/VI); a **live-model walk is r3, not here**. A `WorkUnit` shape
      (`{ id, role: Role, tier: Tier, work?, out? }`) is exported for the lane/scheduler to share.
      **depends on nothing new** (`Role`/`Tier` from `kiln/src/roles.ts`)
- [ ] T004 [P] Implement a **deterministic monotonic clock** `kiln/src/clock.ts`: `makeClock(now:
      () => string = <ISO-stub>) → { now(): string /* non-decreasing, R2 */; wallClock(): string
      /* "HH:MM" matching /^([0-9]{2}:){1,2}[0-9]{2}$/ */ }` — the ts source for the writer and
      the `wallClock` field for `cost` records (the "closed terminal" prefix needs reproducible,
      non-decreasing ts; a fixed clock makes SC-003 deterministic). **depends on nothing new**

**Checkpoint**: foundation ready — every story can drive a walk with a stub resident over a
deterministic clock.

---

## Phase 3: User Story 1 — The single lane: hold / yield / resume (Priority: P1) 🎯 MVP

**Goal**: `kiln/src/lane.ts` realizes **E1** — one `FactoryState` (the single-resident store,
imported shape) with the **director as the scheduler** (P-III) that **holds, yields, and
reclaims** the lane; the invariant `F-SINGLE` (SC-001 / P-III) — *at most one resident AND one
running unit at any captured instant* — is asserted over **snapshots**, not just the final state.

**Independent Test**: `quickstart.md` **Scenario 1** (US1) — a **tiny 2-unit lane** driven by
`makeStubResident()` holds exactly one resident + one running unit at every snapshot; each
`yield` is followed by a matching `resume` before the next unit begins; **no parallel / duplicate
lane**; `switches = 0` for the same-tier 2-unit walk.

### Tests for User Story 1 (write FIRST; ensure they FAIL)

- [ ] T005 [P] [US1] **Contract test (F-SINGLE / SC-001)** — a `run(lane, [u1,u2],
      makeStubResident())` over a **2-unit same-tier** lane: capture `hold`/`yield`/`resume`
      snapshots; assert `assertSingleLane(snapshots)` holds (never two live residents / two
      running units); assert a `yield` is always matched by a `resume` before the next `yield`;
      assert `state.switches === 0` — in `kiln/tests/lane/lane.test.ts`
- [ ] T006 [P] [US1] **Negative test (F-SINGLE)** — `assertSingleLane` **throws** on a fabricated
      snapshot pair with two concurrent `running`/`resident` entries (a "foundry"), proving the
      check is real (US1 AC-3) — in `kiln/tests/lane/lane.test.ts`

### Implementation for User Story 1

- [ ] T007 [US1] Implement `kiln/src/lane.ts` per `contracts/runtime-api.md` — `makeLane(state?:
      Partial<FactoryState>): Lane` (fresh: `resident: null`, `queue: []`, `switches: 0`);
      `run(lane, units: WorkUnit[], resident: Resident): WalkResult` driving
      `load → hold → yield(unit) → resident.run → reclaim → resume → next`; `hold`/`yield_`/
      `resume` capturing a `FactoryState` snapshot each; `assertSingleLane(snapshots)` throwing on
      >1 resident/running; `run` emits each `transition` (`kind ∈
      {load,hold,yield,swap}`) via a passed-in **sink** callback `(rec: FactoryRecord) => void`
      (decouples lane from the writer — no cross-story coupling — D1). A `yield` is always
      reclaimed/matched before the next unit begins. **depends on T003**
- [ ] T008 [US1] Emit a `cost` record **only on a genuine tier change** (P-IV preview): a
      same-tier walk emits **0** `cost`/`swap`; the scheduler (US4) owns the full counter — keep
      lane's `switches` field authoritative for `run`'s result here so US1 is independently
      testable — **depends on T007**

**Checkpoint**: US1 functional + independently testable (`kiln/tests/lane` green; SC-001
provably one resident/one running at any instant).

---

## Phase 4: User Story 2 — The gate primitive: block; headless `wait`; token-resume (Priority: P1)

**Goal**: `kiln/src/gate.ts` realizes **E2** — a gate that **holds the lane** at a frontier head
until a **human move ∈ `MoveVocabulary(gate)`** arrives (001's `move-vocabulary.ts`, G3), or
**degrades headless** to a **durable `wait`** ({`gate`,`token`,`deadline`, the only
unresolved-gate shape, R3) and **halts — never writing a `gate-completion`**; resumption is by
**token** (one channel, NC3). The unattended tail emits a **distinct `pre-delegation`** per
auto-crossed approve and **halts on any veto**.

**Independent Test**: `quickstart.md` **Scenario 2** (US2) — (a) headless gate-3 with no
decision ⇒ **exactly one `wait`**, **zero `gate-completion`**; (b) `applyMove(gate-6, "revise", …)`
**rejected** (review's set is `approve/restart`) — gate stays open; (c) a legal move with a
non-empty `decidedBy: human@…` emits a `gate-completion` and **the emitted log PASSES
`kiln/validate/log.ts`**; the unattended-tail variant emits a **distinct `pre-delegation`** and
halts on a veto.

### Tests for User Story 2 (write FIRST; ensure they FAIL)

- [ ] T009 [P] [US2] **Contract test (G3 + F-single channel)** — `headlessWait(gate3)` ⇒ one
      `wait` (`token` matches `/^g[0-9a-f]+$/`, no `gate-completion`); `applyMove(gate6,
      "revise", "human@x")` **throws / stays open** (illegal at review); `resumeByToken(gate,
      token, "human@x")` on a legal move yields a `gate-completion` with `decidedBy` non-empty —
      in `kiln/tests/gate/gate.test.ts`
- [ ] T010 [P] [US2] **Negative test (P-V headless never auto-approves)** — a headless gate with
      no human move and **no** `pre-delegation` **never** produces a `gate-completion` / `approved`
      (US2 SC-1; the headless contract, extended to a gate the human never saw); a **verifier
      `reject` / reviewer `restart` / checkpoint overflow in the unattended tail halts the cruise**
      and returns the lane to a human (US2 SC-4; auto-proceed authorizes only the approve side) —
      in `kiln/tests/gate/gate.test.ts`

### Implementation for User Story 2

- [ ] T011 [US2] Implement `kiln/src/gate.ts` per `contracts/runtime-api.md` —
      `import { moveAllowed, type GateId } from "../contracts/move-vocabulary.ts"` (**do NOT
      re-declare the move sets**, G3); `openGate(gate): "held" | wait-request`; `applyMove(gate,
      move, decidedBy)` throwing on `move ∉ MoveVocabulary(gate)` (the illegal move keeps the gate
      open, US2 AC-3); `headlessWait(gate)` printing the card + emitting **one** `wait` and
      **never** a `gate-completion`; `resumeByToken(gate, token, decidedBy)` resolving by the
      **single channel** and emitting a `gate-completion` (`move` ∈ the set, `decidedBy`
      non-empty) with a `cost` per 001's schema — **depends on T004**
- [ ] T012 [US2] Implement the **unattended tail + veto** in `kiln/src/gate.ts` — `preDelegation({
      of, by, at, reviewer?, note: "no objections" })` builds a **distinct `pre-delegation`
      record** (R4, a separate ledger entry from a `human-decision`) for each auto-crossed
      *approve*; a **veto** (`verifier reject` / `reviewer restart` / `checkpoint overload`)
      **halts** (returns to a `wait`, no auto-completion); **Gate 0 is never auto-approved here**
      (P-VI / FR-012 — the unattended tail pre-authorizes only the approve side of gates 4–9,
      never the program gate) — **depends on T011**

**Checkpoint**: US2 functional + independently testable (`kiln/tests/gate` green; a headless gate
is recorded, never resolved).

---

## Phase 5: User Story 3 — The factory-log writer: R1–R6-conformant emission + write-time guard (Priority: P1)

**Goal**: `kiln/src/log-writer.ts` realizes **E3** — the **emitter** whose output 001's
`kiln/validate/log.ts` is the *checker* for. It is the **single choke point** that enforces
**no-silent-approval at write time** (R3/R4 / D3): a `gate-completion` whose `move ∈ {approve,
restart, merge}` is written **only** with a non-empty `decidedBy: human@…` **or** a **distinct
`pre-delegation`**, else it **throws** and the line is never emitted. It fills `seq` **strictly
increasing / gap-free** and `ts` **non-decreasing** (R2).

**Independent Test**: `quickstart.md` **Scenario 3** (US3) + the **dogfood** — a full stub walk's
JSONL **PASSES** `kiln/validate/log.ts`; **truncated** at an arbitrary point it still
**PASSES the prefix** (F-RECON, the "closed terminal"); a **forced out-of-order / gap** stream
**FAILS with a named reason**; a `transition.kind=swap` is **bracketed** by a `cost.switches`
increment (greppable from the log alone).

### Tests for User Story 3 (write FIRST; ensure they FAIL)

- [ ] T013 [P] [US3] **Contract test (R1/R2)** — a full stub walk drained through `LogWriter`
      yields JSONL where every non-blank line conforms to `kiln/schemas/factory-log.schema.json`,
      `seq` is 0,1,2,… gap-free, `ts` non-decreasing (`kiln/tests/writer/writer.test.ts`)
- [ ] T014 [P] [US3] **Write-time no-silent-approval (R3/R4, the choke — SC-002)** —
      `writer.write(<approve gate-completion with NO decidedBy and NO distinct pre-delegation>)`
      **throws** and emits nothing; the **same** record with a `decidedBy: "human@…"` **or** a
      distinct `pre-delegation` record is emitted; `isSilentApproval(rec, preDelegated)` returns
      `true` exactly for approve/restart/merge lacking both — in
      `kiln/tests/writer/writer.test.ts`
- [ ] T015 [P] [US3] **Dogfood test (R1–R6 replay — SC-003)** — build a stub walk, `drain()` its
      JSONL, and: (a) `validateLog`/`validateLogFile` on the **complete** stream ⇒ **PASS**; (b)
      **truncate** at an arbitrary `seq` ⇒ the **prefix still PASSES**; (c) **force** the next
      transition out of order (a `seq` gap / `ts` rewind) ⇒ the validator **names** the R2
      violation (`missing seq N` / `ts … earlier …`) — via **001's unmodified
      `kiln/validate/log.ts`** (`import { validateLog, checkOrdering } from
      "../../validate/log.ts"`), in `kiln/tests/dogfood/dogfood.test.ts`

### Implementation for User Story 3

- [ ] T016 [US3] Implement `kiln/src/log-writer.ts` per `contracts/runtime-api.md` —
      `class LogWriter` with a monotonic `seq` (from T004's clock) + `write(rec)` that **fills
      `seq`/`ts`**, calls `enforceNoSilentApprovalOn` **before** emitting (D3 choke point), and
      `drain(): string[]` / `snapshot(): {seq, ts}`; `isSilentApproval(rec)` the internal
      R3/R4 predicate (true ⟺ approve/restart/merge with **no** `decidedBy` and **no** distinct
      `pre-delegation`). Emits a `cost` record that **brackets** every
      `transition.kind=swap` (P-IV preview; US4 owns the full counter). **depends on T004**
- [ ] T017 [US3] Add the **CLI-free dogfood runner** `kiln/tests/dogfood/run.ts` (T002's
      `"dogfood"` script) — builds a stub walk, writes `kiln/factory-log/<name>.jsonl`, invokes
      `kiln/validate/log.ts` over it, prints PASS/FAIL with the named reason — **depends on
      T016**

**Checkpoint**: US3 functional + the dogfood is real — a stub walk's emitted log **passes 001's
validator**, a prefix reconstructs, a silent-approve hole throws at write time (SC-002/SC-003).

---

## Phase 6: User Story 4 — The model-affinity scheduler: swap only on a tier change (Priority: P1)

**Goal**: `kiln/src/scheduler.ts` realizes **E4** — holds the resident and changes it **only when
the next unit's `tier` differs** (P-IV); a same-tier interior boundary **swaps 0**, a genuine
tier change **swaps 1**; the four **line-of-defense** roles bind **`strongest`** via 001's
`kiln/src/roles.ts` `bindRole` (P-II / G2 / L1), a **weaker binding rejected at schedule time**.

**Independent Test**: `quickstart.md` **Scenario 4** (US4) — a same-tier phase ⇒ `switches = 0`;
a single genuine boundary ⇒ `switches = 1` (landed **on** the boundary, not early/late); a
"no swap on an affinity-compatible boundary" probe confirms the counter is **not inflated**; the
four LoD units bind `strongest` and a **weaker binding is rejected at schedule time**.

### Tests for User Story 4 (write FIRST; ensure they FAIL)

- [ ] T018 [P] [US4] **Contract test (F-AFFINITY / SC-004)** — `switchCount(units)` returns **0**
      for an all-same-tier sequence and **1** for a sequence with a single tier change; the
      "affinity-compatible interior boundary" probe returns **0** for two adjacent same-tier
      units — in `kiln/tests/scheduler/scheduler.test.ts`
- [ ] T019 [P] [US4] **Negative test (P-II / G2)** — `schedule` binding any of the four
      line-of-defense units to a tier **below `strongest`** **throws a config error at schedule
      time** (reusing 001's `kiln/src/roles.ts`, a weaker binding is rejected, not accepted) — in
      `kiln/tests/scheduler/scheduler.test.ts`

### Implementation for User Story 4

- [ ] T020 [US4] Implement `kiln/src/scheduler.ts` per `contracts/runtime-api.md` —
      `import { bindRole, isLineOfDefense } from "../src/roles.ts"` (**reuse, do NOT re-declare,
      G2/L1**); `switchCount(units): number` = the count of **genuine tier boundaries** (== the
      emitted `switches`); `schedule(units, resident): WalkResult` that holds the resident and
      **binds each LoD role to `strongest`** (throwing on a weaker LoD binding at schedule time)
      and **emits a `cost` bracketing every `transition.kind=swap`**; a swap lands **on** the
      boundary, never early/late. The cost realized is `{ switches, wallClock }` — the switch
      count, **not** the gate count (P-IV) — **depends on T003**
- [ ] T021 [US4] Wire the switch-tax bracketing into `kiln/src/lane.ts`'s `run` (T008's
      authoritative `switches` counter is now the **realized** `switchCount` from the scheduler,
      emitting a `transition.kind=swap` + a bracketing `cost` per genuine boundary) so US4's
      counter and US1's state agree — **depends on T020**

**Checkpoint**: US4 functional + independently testable (`kiln/tests/scheduler` green; `switches`
is the minimum the tier sequence requires, LoD binds strongest).

---

## Phase 7: User Story 5 — The Flow HUD + Flow Popup: event-driven watch over one FactoryState (Priority: P2)

**Goal**: `kiln/ui/` realizes **E5** — **Layer A (Flow HUD)** = the footer strip
`rail / lane / switches / clock`; **Layer B (Flow Popup)** = the on-demand gate card; both
**pure reads** of the **one shared `FactoryState`**, redrawn **only on a fired event** — **no
timer, no socket, no server** (P-IX), with a **headless print twin** that prints the **identical
render** (a missing surface **hides the view, never the decision**). **Layer C (roadmap overlay)
is out of scope (NC1 ⇒ r2).**

**Independent Test**: `quickstart.md` **Scenario 5** (US5) — a fired event updates
`FactoryState` and `renderHud`/`renderPopup` **recompute** from it; a captured **identical** state
yields an **identical render**; an **inspection** over `kiln/ui/*.ts` finds **no
`setInterval`/`setTimeout`, no socket, no server**; with the UI **disabled** the content is
**printed by the twin** and a gate **still blocks** (SC-005).

### Tests for User Story 5 (write FIRST; ensure they FAIL)

- [ ] T022 [P] [US5] **Contract test (F-EVENTONLY / SC-005)** — `onEvent(state, ev)` returns a
      new state and `renderHud`/`renderPopup` over an **identical** `state` produce an
      **identical** string (one source of truth, deterministic read); `printHeadless(state)`
      returns the same string the surfaces would render — in `kiln/tests/ui/ui.test.ts`
- [ ] T023 [P] [US5] **No-poll / no-server inspection (P-IX)** — a test that **greps
      `kiln/ui/*.ts`** and asserts **no** `setInterval` / `setTimeout` / `new Server` /
      `require("net")` / `require("http")` / `fetch(` appears (F-EVENTONLY's testable half,
      SC-005), in `kiln/tests/ui/ui.test.ts`

### Implementation for User Story 5

- [ ] T024 [US5] Implement `kiln/ui/factory-state.ts` — `export type FactoryEvent =
      { kind: "transition" | "gate-open" | "gate-resolve" | "cost" | "wait" | "snapshot"; ... }`
      and `onEvent(state: FactoryState, ev: FactoryEvent): FactoryState` (event ⇒ new state,
      **pure over the store**; F1 — the store mutates **only** on events); a `disabled(state,
      ev)` twin path that **prints** instead of blocking — **depends on nothing new** (`types.ts`)
- [ ] T025 [P] [US5] Implement `kiln/ui/hud.ts` (`renderHud(state): string` — Layer A strip
      `rail / lane / switches / clock`) and `kiln/ui/popup.ts` (`renderPopup(state): string` —
      Layer B gate card), both **pure reads** of `FactoryState` — in `kiln/ui/hud.ts` +
      `kiln/ui/popup.ts`
- [ ] T026 [US5] Implement `kiln/ui/twin.ts` — `printHeadless(state): string` (prints the **same**
      render when a surface is absent; a missing Layer A/B **never auto-advances** a gate) —
      **depends on T024, T025**

**Checkpoint**: US5 functional + independently testable (`kiln/tests/ui` green; event-only
redraw, no timer/socket/server, headless twin blocks). Layer C remains un-built (r2).

---

## Phase 8: User Story 6 — The RuntimeReady probe: falsifiable, cloud-free (Priority: P3)

**Goal**: `kiln/validate/runtime-ready.ts` realizes **E7** — a **static `node --test` probe**,
the **extension of 001's `FiringReady`**, asserting (a) the lane/gate/writer/scheduler/ui
**exist and are wired** (`kiln/index.ts` no longer `not-wired`), (b) a **synthetic stub-resident
walk's emitted JSOn PASSES `kiln/validate/log.ts`** (the D5 dogfood), and (c) the runtime module
graph **pulls no cloud** (a zero-network grep, P-VIII). It **advances no gate and runs no real
feature** — a *probe*, not a *walk* — and **FAILs naming the broken element** (SC-006).

**Independent Test**: `quickstart.md` **Scenario 6** (US6) — the check **PASSES** when all three
hold; **removing/breaking exactly one** (the writer, a no-silent-approval hole, the wiring)
**FAILs and names** it; a **zero-network grep** over `kiln/` confirms **0** cloud round-trips.

### Tests for User Story 6 (write FIRST; ensure they FAIL)

- [ ] T027 [P] [US6] **Falsifiability test (SC-006)** — `checkRuntimeReady()` **PASSES** with the
      full runtime + a green dogfood; **omitting/breaking one element** (point a dep path at a
      missing module, break a no-silent-approval path, or stub `index.ts` `not-wired` again) makes
      it **FAIL and name the broken element** — in
      `kiln/tests/runtime-ready/runtime-ready.test.ts`

### Implementation for User Story 6

- [ ] T028 [US6] Implement `kiln/src/walk.ts` — a `buildStubWalk()` **driver** (E6 in action) that
      combines `makeLane` + the **stub resident** + a gate + the `LogWriter` to emit a complete,
      valid, cloud-free JSONL — the shared walk the dogfood (T015/T017) and the probe (T030) run —
      **depends on T007, T011, T016**
- [ ] T029 [US6] Implement `kiln/validate/runtime-ready.ts` — assert (a) **presence + wiring** of
      `kiln/src/lane,gate,log-writer,scheduler,stub-resident.ts` + `kiln/ui/*` and `kiln/index.ts`
      `laneIsWired() === true`; (b) **run `buildStubWalk()` and replay its JSONL through
      `kiln/validate/log.ts` ⇒ PASS** (D5); (c) a **zero-network grep** over `kiln/` finds **no**
      cloud/remote import (P-VIII) — a falsifiable **extension of `firing-ready.ts`**; emit a
      **traceability note** mapping each runtime piece to its principle(s) (runtime analogue of
      FR-009); on any gap **exit non-zero naming the broken element** — **depends on T028**
- [ ] T030 [US6] Wire the **CLI entry** `kiln/validate/runtime-ready` (a `node --test` run; prints
      `READY` or a named gap; runs **no gate, no real feature**) — used by `quickstart` Scenario
      6 — **depends on T029**

**Checkpoint**: US6 functional + falsifiable (`kiln/tests/runtime-ready` green; the kiln provably
*fires* on a stub, cloud-free).

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Wire the spine into the public index and record r1's compliance evidence.

- [ ] T031 Replace 001's **`not-wired` `kiln/index.ts` stub** with the **wired** spine — export
      `lane / gate / log-writer / scheduler / stub-resident / ui / walk` and set
      `WIRING_STATUS` to a *wired* value with `laneIsWired() === true`; it still emits **no
      `gate0` decision** and **admits no program** (P-VI / FR-012 / SC-007 — the admission is the
      human record in `specs/ROADMAP.md`) — **depends on T007–T030**
- [ ] T032 [P] Add a **runtime traceability cross-ref table** (E1–E7 ↔ constitution principle
      P-I…P-IX + SC-001..007) to `kiln/contracts/README.md` (the runtime analogue of FR-009 /
      T027 of 001) in `kiln/contracts/README.md` (001's index, extended for r1)
- [ ] T033 Run **all seven `quickstart` scenarios end-to-end** (S1–S7) and record results in
      `specs/002-kiln-lane/quickstart-run.md`; assert the **dogfood PASSES** (SC-003),
      **zero lane gate-advances / zero cloud calls** (P-VIII / SC-007), and that
      `runtime-ready` is green — in `specs/002-kiln-lane/quickstart-run.md`
- [ ] T034 Re-check **constitution** compliance (P-I…P-IX + governance / FR-009-analogue) against
      the delivered `kiln/` runtime and write a short **compliance note** in
      `specs/002-kiln-lane/compliance-note.md` — this slice **ran a lane on a stub** (not a real
      feature, NC2), added **no cloud / no parallelism / no server**, and the emitted **log is the
      compliance evidence** (P-VII) — in `specs/002-kiln-lane/compliance-note.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories** (the stub resident +
   deterministic clock are consumed by every walk-bearing story).
- **User Stories (Phase 3–8)**: US1, US2, US3, US4 are **independently** testable after
   Foundational (they share only the clock + stub resident from Phase 2 and 001's imported
   contracts). **US5** depends on the `FactoryState` shape (001) + Phase 2. **US6** (RuntimeReady)
   depends on **US1 + US2 + US3 + US4 + US5** — it asserts their *presence + wiring + green
   dogfood* — but asserts **no gate advance**.
- **Polish (Phase 9)**: Depends on all desired user stories; the `index.ts` wiring (T031) is what
   US6's check (a) asserts.

### User Story Dependencies

- **US1 (P1)**: After Foundational only (a stub resident + a clock).
- **US2 (P1)**: After Foundational only (001's `move-vocabulary.ts`; a clock for a `gate` token
   deadline).
- **US3 (P1)**: After Foundational (a clock for `seq`/`ts`); the dogfood test imports 001's
   `kiln/validate/log.ts`.
- **US4 (P1)**: After Foundational (001's `roles.ts`); re-touched by T021 to agree with US1's
   `run` counter.
- **US5 (P2)**: After Foundational (the `FactoryState` shape).
- **US6 (P3)**: After US1–US5 (its presence check + `buildStubWalk` dogfood + `index.ts` wiring
   assert the whole spine is real); **runs no gate** (a probe, not a walk).

### Within Each User Story

- **Tests are written and FAIL before implementation** (T005–T006 / T009–T010 / T013–T015 /
   T018–T019 / T022–T023 / T027).
- **Implementation before cross-cutting wiring**: lane (US1) before the scheduler agrees with it
   (T021); the writer choke (T016) before `buildStubWalk` (T028) and the RuntimeReady check (T029).
- The **dogfood** (T015/T017/T028/T029) must **PASS through 001's unmodified `log.ts`** at every
   checkpoint that emits a log (SC-003).

### Parallel Opportunities

- Setup: **T002** parallel with T001 (scripts vs structure).
- Foundational: **T003, T004** both parallel (independent files).
- Per story: the **test pair/trio** (T005–T006, T009–T010, T013–T015, T018–T019, T022–T023,
   T027) run in parallel, each then its implementation.
- Cross-story: **US2 / US3 / US5** are independent after Foundational and may be staffed
   separately; **US6** integrates all.

---

## Parallel Example: User Story 1

```text
# Launch US1 tests together (write each, then watch them FAIL):
Task: "T005 [P] [US1] F-SINGLE/SC-001 contract test — kiln/tests/lane/lane.test.ts"
Task: "T006 [P] [US1] F-SINGLE negative (a foundry snapshot throws) — kiln/tests/lane/lane.test.ts"

# Then implement (sequential within the story):
Task: "T007 [US1] kiln/src/lane.ts — makeLane/run/hold/yield_/resume/assertSingleLane (deps T003)"
Task: "T008 [US1] cost/swap bracketing preview in run (dep T007)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete **Phase 1: Setup** (module tree + the two new CLIs).
2. Complete **Phase 2: Foundational** — **CRITICAL, blocks all stories** (the stub resident +
   the deterministic clock).
3. Complete **Phase 3: User Story 1** — the single lane (tests first).
4. **STOP and VALIDATE**: run `quickstart` **Scenario 1** — one resident + one running unit at
   every snapshot; `switches = 0` for a same-tier 2-unit walk. This is the MVP: *one lane*.

### Incremental Delivery

1. Setup + Foundational → **foundation ready**.
2. **US1** → validate S1 (one resident/one running) → **the lane**.
3. **US2** → validate S2 (headless `wait`, illegal-move reject, token-resume) → **the gate**.
4. **US3** → validate S3 + the **dogfood** (a complete walk PASSES 001's validator; a prefix
   reconstructs; a silent-approve hole **throws at write time**) → **the writer (the spine that
   is judged by 001)**.
5. **US4** → validate S4 (`switches=0`/`=1`; LoD = strongest, weaker rejected) → **the cost lever**.
6. **US5** → validate S5 (event-only redraw, no timer/socket/server, twin blocks) → **the watch**.
7. **US6** → validate S6 (RuntimeReady is falsifiable; 0 cloud) → **the handoff probe**.
8. **Polish**: wire `kiln/index.ts` (T031), add the traceability cross-ref (T032), run S1–S7 +
   write the compliance note (T033/T034).
9. Each story adds value without breaking a prior one; **no story advances a gate or admits a
   program** (P-VI / SC-007), the walk is a **stub** (NC2 ⇒ r3 runs the first *live* model), and
   the whole build stays **local-first / cloud-free** (P-VIII).

### Parallel Team Strategy

With multiple developers (still one lane at runtime — parallelism is *authoring* only, P-III):

1. One role finishes Setup + Foundational (the shared clock + stub resident).
2. Once Foundational is done:
    - Developer A: **US1 lane** → **US4 scheduler** (they agree at T021).
    - Developer B: **US2 gate**.
    - Developer C: **US3 writer** (+ the dogfood) and **US5 watch**.
3. Stories integrate at **US6 / RuntimeReady** (asserts presence + wiring + a green dogfood) and
   the Phase-9 `index.ts` wiring + compliance note.

---

## Notes

- **[P]** tasks = different files, no dependency on an incomplete task.
- **[Story]** labels map each task to its user story for traceability.
- **Tests first**: write and *watch fail* before implementation, per user story.
- **The dogfood is the spine** (SC-003): the lane's emitted JSONL must **PASS 001's unmodified
   `kiln/validate/log.ts`** — a *prefix* reconstructs, a forced out-of-order stream **names** the
   R2 violation, and a **broken no-silent-approval path throws at write time** (SC-002⇒SC-003).
- **Scope guard**: this slice realizes the **runtime on a stub** (NC2); **no task fires a real
   feature or advances a gate / admits a program** (P-VI / FR-012 / SC-007), and the module graph
   pulls **no network** (P-VIII / SC-007).
- **Import, don't re-declare** (001 is canonical): the two JSON Schemas,
   `kiln/contracts/move-vocabulary.ts`, `kiln/src/roles.ts`, and `kiln/src/types.ts` are imported
   by r1 — 001 stays the source of truth; r1 is **judged by** it.
- **Layer C (roadmap overlay)** is **out of scope (NC1 ⇒ r2)**; a **live-model smoke walk is r3**.
- **Commit after each task or logical group.** Stop at any checkpoint to validate the story
   independently; a closed terminal leaves a reconstructable log (P-VII).
- **Avoid**: vague tasks, same-file conflicts (one writer per file per story, e.g. lane vs
   scheduler touch `lane.ts` → sequenced at T021), cross-story dependencies that break independence,
   re-declaring 001's shapes, and any cloud call (P-VIII).
