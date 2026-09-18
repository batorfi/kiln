---
description: "Task list for KILN r3 — the first live-model smoke walk (US1 the live nine-gate walk, US2 the deferred live-TUI smoke, US3 the LiveModelReady probe)"
---

# Tasks: 004-kiln-live-walk (r3 — the first *live-model* smoke walk)

**Input**: Design documents from `/specs/004-kiln-live-walk/`
(`plan.md`, `spec.md`, `research.md` D1–D8, `data-model.md` E1–E5, `contracts/`
live-resident-api + live-walk + live-ready, `quickstart.md` S1–S8)

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/
**Tests**: **Included, and load-bearing.** r3 *fires* the kiln — and it is the first row to do so
**live** — so its Success Criteria (SC-001..007) are realized as **`node --test` suites**, with the
spine being the **dogfood**: a **full nine-gate live walk** over the throwaway
(`buildLiveWalk`) emits JSONL that is **replayed through 001's unmodified `kiln/validate/log.ts`
and must PASS** (FR-001 / SC-001; the live `gate-completion` carries a genuine human `decidedBy`,
and the `--live`/`--stub` selection rides the **existing** `transition`/`cost` union — **no new
`recordType`**, E3/D2) while a **broken no-silent-approval path FAILs it with a named R3 reason**
(FR-002 / SC-002→SC-003, the r1 `run.ts --broken` vector reused on the live emit). Tests are
written FIRST and watched to FAIL per user story, then implementations make them green. **This is
the row that breaks r1/r2's "prove it with a stub" convention** — a real (local, no-cloud) model,
**guaranteed** (NC2) with a **recorded** `--stub` fallback (never a *silent* stand-in, E3/
F-NOT-SILENT). **Still no cloud (P-VIII) and r3 admits no program / advances no Gate 0**
(P-VI / FR-010 / SC-007 — it *fires* the already-admitted `specs/ROADMAP.md` and *re-opens* Gate 0
at its own close).
**Organization**: Grouped by user story so each story is independently implementable and testable.
Story labels `[US1]`…`[US3]` map to `spec.md` priorities (US1 = P1 the live nine-gate walk, the
core "the kiln fires **live**"; **US2 = P1**, the *deferred* live-TUI smoke of Layers A/B/C — the
r1/r2 NC1 debt r3 was named to clear; US3 = P2, the `LiveModelReady` handoff probe).

## Format: `[ID] [P?] [Story? Description]`

- **[P] can run in parallel** (different files, no dependency on an incomplete task)
- **[Story]** label for user-story phases (Setup/Foundational/Polish — none)
- Exact file paths in every description; signatures quoted from
     `contracts/{live-resident-api,live-walk,live-ready}.md` / `data-model.md` / `research.md` so
   they are **not** left to implementation discretion.

> **Provenance:** r3 **fires + records live** what 001 *declared*, r1 *ran* (with a stub), and r2
> *rendered* (headlessly), and is **judged by** 001's `kiln/validate/log.ts` (the dogfood boundary)
> **and** `kiln/validate/roadmap.ts` (the program head it fires) **plus** the composed
> `kiln/validate/live-ready.ts`. The canonical shapes — 001's two JSON Schemas,
> `kiln/contracts/move-vocabulary.ts` (`moveVocabulary("gate0")`), `kiln/src/types.ts`
> (`Resident`/`FactoryState`/`RoadmapRow`/`Gate0`/`FactoryRecord` union), `kiln/validate/log.ts` +
> `roadmap.ts`, **r1's** `kiln/src/{stub-resident,walk,log-writer,gate,scheduler,roles,clock}.ts` +
> `kiln/ui/{factory-state,hud,popup,twin,keymap}.ts` + `kiln/validate/runtime-ready.ts`, and
> **r2's** `kiln/ui/{overlay,gate0-face}.ts` + `kiln/validate/overlay-ready.ts` — are **imported /
> extended additively, not re-declared** (001 + r1 + r2 stay canonical; the "001 declares, r1 runs,
> r2 renders, **r3 fires live**, r3 is judged by 001+r1+r2" invariant, D8/NC3). r3 *adds* exactly
> the **live resident + the `--live`/`--stub` toggle (E1/E3)**, the **live-walk sibling (E2)**, the
> **live `ctx.ui` path over r1/r2's render (E4)**, and **`LiveModelReady` (E5)** — riding the
> existing `transition`/`cost`/`gate-completion` union (**no new log record type**, D2). Per
> P-VI/FR-010, r3 **fires — it does not admit —** `specs/ROADMAP.md`, and r3 stays **`queued`
> (M4)** until its lane starts; nothing here fires the model, admits a program, or advances Gate 0.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stand up r3's live module tree over r1/r2's `kiln/` spine and expose the new live CLIs.
No story code yet beyond the shared test globs and the (still-empty) new modules — the ancestors stay
**canonical import targets** (D8/NC3).

- [x] T001 Create the r3 live module tree per `plan.md` **Project Structure**: **new**
        `kiln/src/live-resident.ts` (E1 + the `--live`/`--stub` selector, E3),
       `kiln/src/live-walk.ts` (E2), `kiln/ui/live-tui.ts` (E4), `kiln/validate/live-ready.ts`
       (E5); **extend additively** `kiln/src/walk.ts` (the `buildLiveWalk` sibling / `--live`/
       `--stub` selector, D3) and `kiln/index.ts` (Phase 6); test subdirs
       `kiln/tests/{live-walk, live-tui, live-ready}/` with one `*.test.ts` each + the
       **extended** `kiln/tests/dogfood/` (a `run-live.ts` sibling to r1's `run.ts`) + a
       **`F-NOT-SILENT`** negative suite under `kiln/tests/negative/`; **leave unchanged as
       import targets** 001's `kiln/schemas/` + `kiln/validate/{log,roadmap}.ts` +
       `kiln/contracts/move-vocabulary.ts` + `kiln/src/types.ts`, **r1's**
       `kiln/src/{stub-resident,log-writer,gate,scheduler,roles,clock}.ts` +
       `kiln/ui/{factory-state,hud,popup,twin,keymap}.ts` + `kiln/validate/runtime-ready.ts`, and
       **r2's** `kiln/ui/{overlay,gate0-face}.ts` + `kiln/validate/overlay-ready.ts` (D8/NC3 —
       **import, never re-declare**)
- [x] T002 [P] Add the two live entry points to `kiln/package.json`
        (`"live-walk": "node kiln/tests/dogfood/run-live.ts"`,
       `"live-ready": "node kiln/validate/live-ready.ts"`); keep **zero runtime dependencies**
       (`dependencies: {}` — P-VIII: a new live adapter reaches a **local** model in-process, not a
       cloud). Assert the module graph **still pulls no network** after the additions (the new test
       dirs are auto-globbed by the existing `"node --test \"kiln/tests/**/*.test.ts\""` glob)

**Checkpoint**: module tree + the two new CLIs exist; `node --test` still passes the r1/r2 baseline
(**98 tests, no regression**).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The two shared, story-agnostic live pieces every story consumes — **E1 the live
resident** (a *live* impl of r1's `Resident` interface, the default head, NC2) and **E3 the
`--live`/`--stub` selector + its *recorded* selection** (`F-NOT-SILENT` — the selection *is in the
log*, never a silent stand-in). Without them US1 has no driveable live resident (and no recorded
toggle to falsify), and US3 has nothing to *assert*. They ride **001's existing `transition`/`cost`
union — no new `recordType`** (D2/D8).

**⚠️ CRITICAL**: No user-story work begins until this phase is complete.

- [x] T003 [P] Implement **`kiln/src/live-resident.ts` — E1** per `contracts/live-resident-api.md`:
        a **live implementation of r1's `Resident` interface** — `import { type Resident } from
       "./stub-resident.ts"` (do **not** re-declare it, D8). Members: `run(workUnit)` drives a
       **genuine inference on the live local model** (not the stub's fixed `out`) so the
       throwaway's checkpoints get *real* work product; `model()` returns a **real local-model
       head** (e.g. an Ollama-served local model — SC-001 "the kiln fires **live**", *not*
       `"stub-resident"`); `tier()` the model's tier, on which the line-of-defense roles bind
       **`strongest`** via the **inherited** `bindRole` (P-II / FR-005, unchanged from r1 — a
       cheaper LoD binding is *still* a config error the schedule rejects, **live and local
       alike**). **Local-only**, no cloud (P-VIII — a zero-network scan, E5, must stay green);
       when the local head is *unreachable* the resolver **flags + falls back to the recorded
       `--stub`** (NC2 belt-and-suspenders), **never silently**. **Depends on nothing new** (the
       `Resident` type is imported from r1's `stub-resident.ts`)
- [x] T004 Implement **E3 — the `--live`/`--stub` selector + its *recorded* selection** in
        `kiln/src/live-resident.ts` (extends T003's file; `F-NOT-SILENT`, D2/NC2): the selector
       picks E1 (**`--live`, the default**, NC2) or r1's stub (`--stub`, the recorded fallback).
       The **selection is *recorded*** in 001's existing union — **no new `recordType`** (D2/D8):
       `--live` → a `transition`/`cost` slot naming `resident: "live"` (+ the live model name);
       `--stub` → a `transition`/`cost` slot naming `resident: "stub (RECORDED fallback, NC2)"`, so
       a **closed terminal knows which resident ran** (P-V/P-VII). An **unlogged stand-in** (a
       `--stub` selection that emits **no** recorded marker) is the **violation** `LiveModelReady`
       later catches (`ready=false`, *named*) — the *precise opposite* of P-V's "a missing UI
       silently approves a gate." Selecting a resident is **not** a gate move (P-V/VIII): a live
       walk's gates still resolve on a **human `decidedBy`** (or a *distinct* `pre-delegation` on
       the tail), **never** the toggle/resident — **depends on T003**
- [x] T005 [P] **E3 recorded-selection unit test (`F-NOT-SILENT`, positive half / P-VII·SC-006)** —
        `selectResident("--stub")` emits a **recorded** `transition`/`cost` slot naming the stub
       fallback; `selectResident("--live")` (**default**) names `"live"` + the model; assert the
       **marker IS written** for both positions (the guard that makes an *unlogged* stand-in
       catchable later), and that the selection writes **`seq`/`ts`**-stamped records the way the
       writer already does — in `kiln/tests/negative/not-silent.test.ts` — **depends on T004**

**Checkpoint**: the live resident + the *recorded* `--live`/`--stub` selector exist on r1's
`Resident` interface; a `--stub` selection **appears in the log** (never silent). Every live story
can now drive a resident and record which it chose.

---

## Phase 3: User Story 1 — One live-model feature, end-to-end, through all nine gates (Priority: P1) 🎯 MVP

**Goal**: `kiln/src/live-walk.ts` realizes **E2** — the **live-walk sibling** of r1's
`kiln/src/walk.ts` — a `--live`/`--stub` **selector on the shared builder** (D3) that drives **E1**
through a **full Gates-1–9 lane** over the **throwaway** (§D4/NC1), emitting **001's existing log
union** (`transition` / `gate-completion` / `human-decision` / `cost` / `wait` / `pre-delegation`)
— **no new `recordType`** — plus the **recorded `--live`/`--stub` selection** (E3). Per §D7 it
walks the **entire rail live** (triage → 1 concept → 2 architecture/critic/LoD → 3 spec → 4 plan →
5 checkpoint → 6 review/reviewer/LoD → 7 verification/verifier/LoD ≤2 mitigation → 8 docs → 9
PR), with a **clean unattended-tail cruise of gates 4–9** via a **distinct `pre-delegation`** and
**≥1 line-of-defense veto fired and *halted*** ("the crack in the cool": a critic objection /
reviewer `restart` / verifier `reject` / checkpoint **overflow** halts the cruise and returns the
lane to a human). Every gate resolves on a **human `decidedBy`** (or the distinct pre-delegation);
the emitted log **PASSES 001's `kiln/validate/log.ts`** live with a real `decidedBy` per gate
(SC-001) and the **broken** no-`decidedBy` vector **FAILs R3, named** (SC-002/SC-003).

**Independent Test**: `quickstart.md` **S1** (live PASSES), **S2** (broken → named R3), **S3**
(`F-SINGLE` live), **S4** (switches == `switchCount` + LoD `strongest`), **S8** (no self-admission).

### Tests for User Story 1 (write FIRST; ensure they FAIL)

- [x] T006 [P] [US1] **Live-walk contract test (F-LIVE-WALK / SC-001↔SC-002)** —
        `buildLiveWalk()` (**`--live`, default**) over the **full nine gates** emits
       `transition` / `gate-completion` (**a human `decidedBy` per gate**) / `cost` / a **distinct**
       `pre-delegation` on the unattended tail + an **open-gate `wait`** + the **recorded
       `--live`/`--stub` selection** (E3); the **complete** stream **and** a **truncated
       prefix** **PASS 001's *unmodified* `kiln/validate/log.ts`** (R1–R6); a **`--broken`**
       variant (drop a gate's `decidedBy`, r1's `run.ts` vector reused on the live emit) **FAILs
       with a *named R3* reason** — in `kiln/tests/live-walk/live-walk.test.ts`
- [x] T007 [P] [US1] **F-SINGLE + switches + LoD-`strongest` (SC-003/SC-004, P-III·P-IV·P-II)** —
        `assertSingleLane` holds over the live walk's **per-step snapshots** (`F-SINGLE` — a forged
       two-residents-running case **throws**); realized switches **== `kiln/src/scheduler.ts`
       `switchCount`** for the live unit sequence (P-IV, one `cost` per genuine tier boundary,
       **live `wallClock`**); and **every line-of-defense role ran on `strongest`** via the
       inherited `bindRole` (P-II — a weaker binding is *still* a config error the schedule rejects);
       reuse r1's `kiln/tests/{lane,scheduler}/*.test.ts` over the live sequence — in
       `kiln/tests/live-walk/live-walk.test.ts` (extending r1's lane/scheduler tests)

### Implementation for User Story 1

- [x] T008 [US1] Implement **`kiln/src/live-walk.ts` — E2** per `contracts/live-walk.md` (**§D7**)
        — `buildLiveWalk(opts?: { resident?: "live" | "stub" | Resident; preDelegate?: boolean;
       haltOnVeto?: boolean }): { lines: string[]; jsonl: string; switches: number }`: a
       **`--live`** (default, E1) / **`--stub`** (E3, *recorded*) selector that drives the
       **§D7 full nine-gate rail** — incl. the **clean unattended-tail cruise of gates 4–9** via a
       **distinct `pre-delegation`** (the approve side pre-authorized; FR-011) and **≥1 halted
       line-of-defense veto** (critic objection / reviewer `restart` / verifier `reject` /
       checkpoint **overflow** → **halt the cruise + return to a human**, FR-007) — emitting the
       **same union r1 emitted + the recorded selection slot (E3)** — **depends on T003, T004**
- [x] T009 [US1] **Extend `kiln/src/walk.ts` additively** (D3): expose `buildLiveWalk` as a
        **selector on the shared builder** (import E1 from `live-resident.ts`); the emit sequence is
       **reused, not re-declared** — r1's `buildStubWalk` stays **unchanged** (NC2: the stub is the
       *recorded fallback*, still green), and the `--broken` splice targets the **live** emit
      (`kiln/factory-log/r3-live-broken.jsonl`) — **depends on T008**
- [x] T010 [US1] Add the **live dogfood runner** `kiln/tests/dogfood/run-live.ts` (T002's
        `"live-walk"` script): build the live walk, write `kiln/factory-log/r3-live-walk.jsonl`
       (+ `r3-live-broken.jsonl` via `--broken` — reuse r1's `run.ts` splice-of-a-missing-
        `decidedBy` on the live emit), invoke **001's *unmodified* `kiln/validate/log.ts`** over
       each, and print **`PASS`** / a **named `FAIL`** (SC-001/SC-002) — **depends on T008, T009**

**Checkpoint**: US1 functional + independently testable (`kiln/tests/live-walk` green; **S1 PASSes**
with a human `decidedBy` per gate, **S2 FAILs named R3**; **S3** `F-SINGLE` live; **S4** switches
== `switchCount` + every LoD role `strongest`; **S8** — `grep '"gate":"gate0"' r3-live-walk.jsonl`
shows a **recorded human** move only, no admission).

---

## Phase 4: User Story 2 — The deferred live TUI smoke walk of Layers A/B/C (Priority: P1, the r1/r2 NC1 debt)

**Goal**: `kiln/ui/live-tui.ts` realizes **E4** — the **live `ctx.ui` path** over r1/r2's
**pure** render + twin that r1 (`renderHud`/`renderPopup` + a print twin) and r2
(`renderOverlay`/`gate0-face` + a `WAIT`-on-Gate-0 twin) both **NC1-deferred** to r3 (NC3):
**Layer A** (`ctx.ui.setStatus` footer), **Layer B** (`ctx.ui.custom` per-gate popup), **Layer C**
(`ctx.ui.custom` roadmap overlay + its Gate-0 face), **redrawn on the live walk's *fired* events**
only (P-IX), reading **one shared `FactoryState`**, **composing** with r1/r2 (D8/NC3) and
**degrading to the printed twin** (r2's `disabledUi`) when the UI is **absent** — which **prints
the program + `WAIT`s** at an open Gate 0 (**`F-GATE0-BLOCK`**, P-V/P-VI lifted to the program
gate). **No `setInterval`/`setTimeout`/socket/server** — the `kiln/ui/*.ts` grep **stays green**
(`F-LIVE-TUI`, SC-005). The exact `ctx.ui.custom` / `handoff.ts` / `ctx.ui.confirm` wiring
(`ui-layers-deep.md §10`) is a **low-risk `implement` tweak, off r3's critical path** (D5 — r3
*smokes* the live TUI, it does not build the production overlay).

**Independent Test**: `quickstart.md` **S5** — live TUI **event-only** + **blocking headless Gate
0**.

### Tests for User Story 2 (write FIRST; ensure they FAIL)

- [x] T011 [P] [US2] **Event-only + byte-identical test (`F-LIVE-TUI` / SC-005 / P-IX)** — the
        live `ctx.ui` surface set (A/B/C) **redraws ONLY on a fired `FactoryEvent`**
       (`gate-open`/`gate-resolve` + r2's `gate0_open`/`roadmap_row_done`) over **one**
       `FactoryState`; a **`setInterval` / `setTimeout` / `Server` / `Socket` / `fetch` grep over
       `kiln/ui/*.ts` is GREEN** (no timer/socket/server); and a **captured identical state ⇒ a
       byte-identical `renderOverlay`** (one source of truth, **SC-005**) — in
       `kiln/tests/live-tui/live-tui.test.ts`
- [x] T012 [P] [US2] **Headless-degrade + blocking Gate 0 test (`F-GATE0-BLOCK` / P-V·P-VI, US2 AC-2 + F1)**
        — with the live UI **absent**, the twin **prints the program table** (the *same* rows
       `renderOverlay` shows — one source of truth) and an **open Gate 0** →
       `disabledUi(state).blocks === true` + **never a `gate0: approved`** (a **pre-delegated**
       gate-0 is **refused** — F1, a human decider only); a **captured identical state** renders
       **byte-identical** — in `kiln/tests/live-tui/live-tui.test.ts`

### Implementation for User Story 2

- [x] T013 [US2] Implement **`kiln/ui/live-tui.ts` — E4** per `data-model.md` E4 (**§D5**): the
        **live `ctx.ui` path composing on r1's `renderHud`/`renderPopup` + r2's
       `renderOverlay`/`renderGate0Face` + r2's `disabledUi` twin** — **Layer A** `setStatus`
       footer (`rail`/`lane`/`switches`/`clock`), **Layer B** `custom` per-gate popup (rises on
       `gate-open`, closes on `gate-resolve`), **Layer C** `custom` roadmap overlay + Gate-0 face
       (on `gate0_open`/`roadmap_row_done`, r2's two events); redraws **on fired events only**
       (`LAYERC_REDRAW_TRIGGERS` + r1's), **degrades to the print twin when `!ctx.hasUI`** (never
       auto-advances — `F-GATE0-BLOCK`); **does not re-declare** A/B/C (D8/NC3 — composes on the
       inherited modules). The `ctx.ui.custom` / `handoff.ts` / `ctx.ui.confirm` wiring is a
       **low-risk `implement` tweak, off the critical path** (D5). **Depends on nothing new**
       (imports r1/r2's `kiln/ui/*` + r2's event store on `FactoryState`)

**Checkpoint**: US2 functional + independently testable (`kiln/tests/live-tui` green; **S5** —
event-only + a **disabled UI prints the program and *blocks* Gate 0**; no timer/socket/server in
`kiln/ui/*.ts`).

---

## Phase 5: User Story 3 — `LiveModelReady`: the falsifiable, cloud-free, no-admission probe (Priority: P2)

**Goal**: `kiln/validate/live-ready.ts` realizes **E5** — a **falsifiable** `node --test` probe
that **composes on** r1's `runtime-ready.ts` (wiring + PASSES-emit + zero-network) **and** r2's
`overlay-ready.ts` (deterministic render + a blocking headless Gate 0 + F1 human-only), plus
**r3's two hooks**: (a) the **live resident (E1/E3) is wired** — and `--stub` is **allowed but
*recorded*** (its selection appears in the log; the **unlogged-stand-in** hook **fails** it,
*named* — `F-NOT-SILENT`), and (b) the falsify hooks **`--broken`** / **`--broken-render`** /
**`--broken-gate0`** / **`--stub-unlogged`**. It asserts the **live path exists + is wired +
emits a PASSES log + is deterministic + blocks a headless Gate 0 + pulls no cloud**. It **runs no
gate, admits no program, and runs no *real* feature** — a *probe*, not a *walk*
(`F-LIVEREADY`, SC-006) — the **r3 → r4 (publish) handoff proof**.

**Independent Test**: `quickstart.md` **S6** (`F-NOT-SILENT`) + **S7** (`LiveModelReady` + all
falsify hooks).

### Tests for User Story 3 (write FIRST; ensure they FAIL)

- [x] T014 [P] [US3] **Falsifiability test (`F-LIVEREADY` / SC-006)** — `checkLiveModelReady()`
        **PASSES** on the live walk + a **recorded** `--stub`; **omitting or breaking exactly one**
       element makes it **FAIL and NAME the broken element** — `--broken` → a **named R3** gap
       (the no-silent-approval hole, SC-002/SC-003); `--broken-render` (a non-deterministic
       overlay); `--broken-gate0` (an open auto-advance-of-Gate-0 hole / a non-human decider
       accepted — F1); **`--stub-unlogged`** (a `--stub` selection that emits **no** recorded
       marker — the *silent* stand-in) → `ready=false`, **named** (`F-NOT-SILENT`); a **missing
       module / a cloud import** → **named**; a **captured identical state ⇒ deterministic**; and a
       **zero-network scan over `kiln/{src,ui,validate,contracts}` ⇒ 0 cloud round-trips / no
       socket / no server** on **both** toggle positions — in
       `kiln/tests/live-ready/live-ready.test.ts`

### Implementation for User Story 3

- [x] T015 [US3] Implement **`kiln/validate/live-ready.ts` — E5** per `contracts/live-ready.md`
        (**§D6**) — `checkLiveModelReady()` as the **extension of r1's `runtime-ready.ts` + r2's
       `overlay-ready.ts` (compose on both, do *not* duplicate — D7/D8)**: (a) **live path wired**
       — `kiln/src/live-resident.ts` (E1/E3), `kiln/src/live-walk.ts` (E2), `kiln/ui/live-tui.ts`
       (E4), `kiln/validate/live-ready.ts` **exist + are importable**, and **`kiln/index.ts`
       exports them on top of r1+r2's spine**; (b) **PASSES-emit** — the **live** walk's JSONL
       **replays through 001's *unmodified* `kiln/validate/log.ts` and PASSes** with a **human
       `decidedBy` per gate** (`--broken` opens the no-`decidedBy` hole → **named R3**);
       (c) **deterministic render + a blocking headless Gate 0 + F1** (reuse r2's `overlay-ready`
       checks on a live state); (d) **recorded `--stub` / `F-NOT-SILENT`** — the `--stub`
       selection **appears in the log**, and an **unlogged** stand-in **fails, named**;
       (e) **no cloud** — a zero-network scan over `kiln/{src,ui,validate,contracts}` on **both**
       toggle positions. Emit a **traceability note** mapping each piece to its principle(s)
       (**P-I/P-VII** the human `decidedBy` + the *recorded* `--stub`; **P-V** the R3 falsify;
       **P-VI** the blocking headless Gate 0 + F1; **P-VIII/P-IX** zero-cloud + no poll); on any
       gap **exit non-zero, naming the broken element** — **depends on T008 (E2) + T013 (E4)**
- [x] T016 [US3] Wire the **CLI entry** `kiln/validate/live-ready.ts` (T002's `"live-ready"`
        script): print **`READY`** or a **named gap**; support **`--broken`** /
       `--broken-render` / `--broken-gate0` / `--stub-unlogged` (mirrors r1's `--broken` / r2's
       overlay-ready flags); **runs no gate, admits no program** (P-VI / SC-007) — used by
       `quickstart` **S7** — **depends on T015**

**Checkpoint**: US3 functional + falsifiable (`kiln/tests/live-ready` green; **S6/S7** —
`LiveModelReady` **READY**; every hook **names** its broken element; a recorded `--stub` is
accepted and an unlogged stand-in is **caught, named**; **0 cloud** on both toggle positions).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Wire the live path into the public index **over** r1/r2's spine and record r3's
compliance evidence — **without admitting a program or advancing Gate 0** (P-VI / SC-007).

- [x] T017 **Extend `kiln/index.ts` additively** — **also export** the live resident / the
        `--live`/`--stub` selector (E1/E3), `buildLiveWalk` (E2), the live `ctx.ui` path (E4), and
       `checkLiveModelReady` / `reportLiveModelReady` (E5) **on top of r1's + r2's spine exports**
       (no regression to the 98-test baseline); it **emits no `gate0` decision** and **admits no
       program** (P-VI / FR-010 / SC-007 — r3 *fires*, the human move in `specs/ROADMAP.md`
       *admitted*) — **depends on T008, T013, T015**
- [x] T018 [P] Add a **live-path traceability cross-ref table** (**E1–E5** ↔ constitution
        **P-I·P-II·P-III·P-IV·P-V·P-VI·P-VII·P-VIII·P-IX** + **SC-001..007**) to
       `kiln/contracts/README.md` (r1/r2's index, **extended** for r3 — the runtime analogue of
       001's T027 / FR-009; records which ancestor each E *imports* vs. which E r3 *adds*) — in
       `kiln/contracts/README.md`
- [x] T019 Run **all eight `quickstart` scenarios end-to-end** (**S1–S8**) and record the
        **observed** results in `specs/004-kiln-live-walk/quickstart-run.md` (the planning form is
       `quickstart.md`; this is the captured run, like r1/r2): assert the **live walk PASSES
       001's `kiln/validate/log.ts`** + the **broken FAILs with a named R3** (SC-001/SC-002), the
       **fired program head PASSES `kiln/validate/roadmap.ts`** (M3/M4 / SC-007), the **`--stub`
       selection is recorded** + the **unlogged stand-in is caught, named** (SC-006/`F-NOT-SILENT`),
       a **zero-network scan finds 0 cloud** (SC-006), and **zero program-admissions / zero
       gate-advances / r3 stays `queued`** (SC-007) — in
       `specs/004-kiln-live-walk/quickstart-run.md`
- [x] T020 Re-check **constitution** compliance (**P-I..P-IX** + governance / FR-013-analogue)
        against the delivered live path and write a short **compliance note** in
       `specs/004-kiln-live-walk/compliance-note.md` — this row **fired the kiln *live*** (the first
       genuinely live lane; a live local model, **guaranteed** NC2, with a **recorded** `--stub`
       — still **local-first / no cloud**), the **deferred live-TUI smoke of A/B/C** (NC3 debt
       cleared), and **`LiveModelReady`** — adding **no cloud / no second lane / no server / no new
       log record type** (E3 rides `transition`/`cost`; D8/NC3), and **admitting no program /
       advancing no Gate 0** (P-VI/SC-007 — r3 *re-opens* the seam; the emitted **live** log + its
       **recorded** `--stub` selection are the audit trail, P-VII) — in
       `specs/004-kiln-live-walk/compliance-note.md`
- [x] T021 [P] **P-VI / SC-007 governance guard** — assert **`specs/ROADMAP.md` has NO diff** (r3
        stays **`queued`**, M4 — authoring did **not** flip it to `active`; no live gate advanced),
       **zero model was fired as authoring** (the live walk is a *probe/dogfood*, not program
       admission), and `grep '"gate":"gate0"' kiln/factory-log/r3-live-walk.jsonl` shows **a
       recorded *human* `gate0` move only** — **no program admission** (S8; SC-007); this is the
       "r3 *fires* the admitted program + *re-opens* Gate 0, admitting nothing" check — in
       `specs/004-kiln-live-walk/quickstart-run.md` / the compliance note

**Checkpoint**: the live path is wired into `kiln/index.ts`; S1–S8 are captured; the compliance note
+ the P-VI guard record that r3 **drew + fired live** but **admitted nothing and advanced no gate**.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately (module tree + the two live CLIs).
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories** (E1 the live resident
   + E3 the *recorded* `--live`/`--stub` selection are consumed by US1 to *drive* and asserted by
   US3 to *falsify*; both ride 001's `transition`/`cost` union — **no new `recordType`**).
- **User Stories (Phase 3–5)**: **US1** (the live walk) and **US2** (the live TUI smoke) are
   **independently** testable after Foundational (US1 drives E1/E3; US2 composes on r1/r2's
   inherited `kiln/ui/*` + event store). **US3** (`LiveModelReady`) depends on **US1 (E2, T008) +
   US2 (E4, T013)** — it asserts their **presence + wiring + a PASSES-emit dogfood** — and asserts
   **no gate advance / no program admission** (a *probe*, not a *walk*).
- **Polish (Phase 6)**: Depends on all desired user stories; the `index.ts` wiring (T017) is what
   `LiveModelReady` (a) asserts; T019/T020/T021 record the SC + the P-VI guard.

### User Story Dependencies

- **US1 (P1)**: After Foundational (E1/E3, T003/T004) — the live nine-gate walk is the core
   ("the kiln fires **live**"); its `--broken` vector is the **named-R3** spine (SC-002/SC-003).
- **US2 (P1)**: After Setup (it **imports** r1/r2's `kiln/ui/*` + the event store — no new
   dependency on US1, though it is *validated* over the live walk in S5).
- **US3 (P2)**: After **US1 (E2, T008) + US2 (E4, T013)** — `LiveModelReady` (T015/T016) asserts
   their **presence + wiring + a green PASSES-emit + a blocking headless Gate 0 + zero-cloud**;
   it **runs no gate, admits no program**.

### Within Each User Story

- **Tests are written and FAIL before implementation** (T006–T007 / T011–T012 / T014).
- **Implementation before cross-cutting wiring**: the live-walk sibling (US1, T008/T009) before
   `LiveModelReady` asserts its PASSES-emit (US3, T015); the live TUI path (US2, T013) before the
   deterministic-render check (T014/T015); `buildLiveWalk` (US1) agrees with `kiln/index.ts`' live
   export (T017).
- The **live-walk dogfood** (T010/T016/T019) must **PASS through 001's *unmodified* `log.ts`** at
   every checkpoint that emits a live gate log (SC-001), and the **broken no-`decidedBy` vector
   must FAIL it, named R3** (SC-002/SC-003); a **`--stub` selection must appear in that log**, its
   absence **failing `LiveModelReady`, named** (`F-NOT-SILENT`, SC-006).

### Parallel Opportunities

- Setup: **T002** parallel with T001 (scripts vs structure).
- Foundational: **T003 [P]** is independent (E1, first write to `live-resident.ts`); **T004**
   **depends on T003** (same file — one writer); **T005 [P]** parallel (a separate test file).
- Per story: the **test pair** (T006–T007, T011–T012, T014) runs in parallel, each then its
   implementation.
- Cross-story: **US1 / US2** are independent after Foundational and may be staffed separately;
   **US3** integrates E2 + E4.

---

## Parallel Example: User Story 1

```text
# Launch US1 tests together (write each, then watch them FAIL):
Task: "T006 [P] [US1] F-LIVE-WALK/SC-001↔SC-002 — live nine-gate walk PASSES log.ts; --broken FAILs named R3 — kiln/tests/live-walk/live-walk.test.ts"
Task: "T007 [P] [US1] F-SINGLE + switches == switchCount + every LoD role strongest (live) — kiln/tests/live-walk/live-walk.test.ts (extends r1 lane/scheduler)"

# Then implement (sequential within the story):
Task: "T008 [US1] kiln/src/live-walk.ts — buildLiveWalk(): the --live/--stub selector on the full 9-gate rail + unattended tail + a halted veto (dep T003/T004)"
Task: "T009 [US1] extend walk.ts additively — expose buildLiveWalk; buildStubWalk unchanged (NC2)"
Task: "T010 [US1] kiln/tests/dogfood/run-live.ts — r3-live-walk.jsonl PASSES / r3-live-broken.jsonl FAILs R3 (dep T008/T009)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete **Phase 1: Setup** (live module tree + the two new CLIs; 98-test baseline intact).
2. Complete **Phase 2: Foundational** — **CRITICAL, blocks all stories** (E1 the **live resident**
   on r1's `Resident` interface + E3 the **recorded** `--live`/`--stub` selection, riding
   `transition`/`cost`).
3. Complete **Phase 3: User Story 1** — the **live nine-gate walk** (tests first): a full rail
   over the throwaway, an unattended tail, a halted veto, on the **live model** by default.
4. **STOP and VALIDATE**: run `quickstart` **S1–S4** — the **live** walk's log **PASSES
   001's unmodified `kiln/validate/log.ts`** with a **human `decidedBy` per gate** (SC-001), the
   **broken** path **FAILs named R3** (SC-002/SC-003), `F-SINGLE` holds and switches ==
   `switchCount` with every LoD role `strongest` (SC-003/SC-004). This is the MVP: **"the kiln
   fires *live*."**

### Incremental Delivery

1. Setup + Foundational → **foundation ready** (E1 + E3 — the live resident and the *recorded*
   toggle).
2. **US1** → validate **S1/S2/S3/S4/S8** (live walk **PASSES**; broken **FAILs named R3**;
   `F-SINGLE` live; switches == `switchCount` + LoD `strongest`; no admission) → **the live walk**.
3. **US2** → validate **S5** (live A/B/C **redraws on events only**, no timer/socket/server; a
   **disabled UI prints the program + blocks Gate 0**; byte-identical on a captured state) →
   **the deferred live-TUI smoke** (the r1/r2 NC1 debt, NC3, *cleared*).
4. **US3** → validate **S6/S7** (`LiveModelReady` **READY**; `--broken`/**`--broken-render`**/
   `--broken-gate0`/`--stub-unlogged` each **name** their broken element; **0 cloud** on both
   toggle positions) → **the handoff proof for r4**.
5. **Polish**: wire `kiln/index.ts` (T017), add the traceability cross-ref (T018), run **S1–S8** +
   write **`quickstart-run.md`** (T019) + the **compliance note** (T020); run the **P-VI guard**
   (T021) that `specs/ROADMAP.md` is **unchanged** and r3 **admits nothing / advances no gate**.
6. Each story adds value without breaking a prior one: the **98-test baseline stays green**
   (r3 *extends*, D8/NC3); **no story admits a program or advances Gate 0** (P-VI/FR-010/SC-007),
   and the whole build stays **local-first / cloud-free** (P-VIII) — the `--stub` is a
   **recorded, *never-silent*** fallback.

### Parallel Team Strategy

With multiple developers (still **one lane at runtime** — parallelism is *authoring* only, P-III;
`F-SINGLE` holds over every live snapshot):

1. One role finishes Setup + Foundational (E1 the live resident + E3 the *recorded* toggle).
2. Once Foundational is done:
      - Developer A: **US1 live walk** (T006–T010) — the dogfood spine.
      - Developer B: **US2 live-TUI smoke** (T011–T013) — it composes on r1/r2's `kiln/ui/*`, so it
        needs no dependency on A's `live-walk.ts` to *start*.
      - Developer C: **US3 LiveModelReady** (T014–T016) once A/B land (T015 asserts E2 + E4).
3. Stories integrate at **US3 / `LiveModelReady`** (asserts presence + wiring + a green PASSES-emit
   + zero-cloud) and the Phase-6 `index.ts` wiring + `quickstart-run.md` + compliance note +
   the **P-VI guard**.

---

## Notes

- **[P]** tasks = different files, no dependency on an incomplete task.
- **[Story]** labels map each task to its user story for traceability.
- **Tests first**: write and *watch fail* before implementation, per user story (T006–T007 /
   T011–T012 / T014).
- **The dogfood is the spine** (SC-001..SC-003): a **live, full-nine-gate** walk's emitted JSONL
   must **PASS 001's *unmodified* `kiln/validate/log.ts`** — the live `gate-completion` carries a
   **genuine human `decidedBy`** (or a **distinct** `pre-delegation` on the tail), the
   `--live`/`--stub` selection rides **001's existing `transition`/`cost` union (no new
   `recordType`**, E3/D2/D8), a *prefix* reconstructs, and a **no-`decidedBy` broken vector FAILs
   it with a named R3 reason** (SC-002→SC-003, P-V).
- **`F-NOT-SILENT` is r3's headline guard live** (`--stub` *recorded*, never silent): a `--stub`
   selection **appears in the log**; an **unlogged** stand-in **fails `LiveModelReady`, named**
   (SC-006, P-V/P-VII) — the *precise opposite* of the "a missing UI silently approves a gate."
- **P-VI is the guard the whole row respects**: r3 **fires the already-admitted `specs/ROADMAP.md`
   program** and **re-opens Gate 0 at its own close** — it **admits nothing and advances no gate**;
   the **P-VI guard** (T021) asserts `specs/ROADMAP.md` is **unchanged**, r3 stays **`queued`
   (M4)**, and **no model was fired as authoring**.
- **Import, don't re-declare** (001 + r1 + r2 are canonical): 001's two JSON Schemas,
   `kiln/contracts/move-vocabulary.ts`, `kiln/src/types.ts`, `kiln/validate/{log,roadmap}.ts`, and
   **r1's** `kiln/src/{stub-resident,walk,log-writer,gate,scheduler,roles,clock}.ts` +
   `kiln/ui/{factory-state,hud,popup,twin,keymap}.ts` + `kiln/validate/runtime-ready.ts`, plus
   **r2's** `kiln/ui/{overlay,gate0-face}.ts` + `kiln/validate/overlay-ready.ts`, are **imported /
   extended additively** — r3 is **judged by** them, and **re-declares no shape or log record type**
   (D8/NC3).
- **Local-first, no cloud (P-VIII)**: "live" here means a **real *local* model** (e.g. Ollama-served,
   in-process), **guaranteed** (NC2) with a **recorded, dependency-free** `--stub` — a **zero-network
   scan over `kiln/{src,ui,validate,contracts}` finds 0 cloud round-trips** on **both** toggle
   positions (SC-006).
- **No-poll / no server (P-IX)**: the live TUI (E4) redraws **on fired events only** — a
   `setInterval`/`setTimeout`/`Server`/`Socket`/`fetch` **grep over `kiln/ui/*.ts` stays green**.
- **Scope guard**: r3 is the first genuinely **live** row, but it **smokes** the live net (a
   throwaway feature, §D4/NC1) — it **does not build a production overlay**, and the
   `ctx.ui.custom`/`handoff.ts`/`ctx.ui.confirm` wiring (ui-layers-deep §10) is a **low-risk
   `implement` tweak, off the critical path** (D5).
- **Commit after each task or logical group.** Stop at any checkpoint to validate the story
   independently; a closed terminal leaves a reconstructable **live** log (P-VII).
- **Avoid**: vague tasks, same-file conflicts (one writer per additive touch — `live-resident.ts`
   is T003 then T004; `walk.ts` is T009; `index.ts` is T017), cross-story dependencies that break
   independence, **re-declaring 001's/r1's/r2's shapes**, **advancing Gate 0 or admitting a program
   (P-VI/SC-007)**, and any **cloud** call (P-VIII).
</content>
</invoke>
