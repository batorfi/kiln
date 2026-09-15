# Implementation Plan: 003-kiln-roadmap-overlay

**Branch**: `003-kiln-roadmap-overlay` | **Date**: 2026-09-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-kiln-roadmap-overlay/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition
describes the execution workflow.

## Summary

r1 (`002-kiln-lane`) delivered the **runtime spine + the two per-lane surfaces** (Layer A
Flow HUD, Layer B Flow Popup) over one shared `FactoryState`, with a headless print twin and
the `RuntimeReady` probe — and it **deferred Layer C by NC1**, naming this row, **r2**. This row
is **Layer C, the Roadmap overlay**: the one surface *above* A/B that shows the **program
itself** — the ordered, human-admitted firing list (`roadmap: RoadmapRow[]`; admitted at Gate 0
in [specs/ROADMAP.md](../../ROADMAP.md)) — and where the in-flight row sits at its current gate
(`ui-layers-deep.md §5`). It **also carries Gate 0**, the program gate the constitution treats as
the one that no exception may silence (P-VI): the *pre-lane and inter-row* human decision to
admit the program, rendered on a **distinct Layer-C face** (NC2) with the **roadmap-level** move
vocabulary `moveVocabulary("gate0")`, never conflated with a per-gate card.

**Approach (the load-bearing one):** prove Layer C the same way r1 proved the spine —
**structurally / headless** (NC1). It is a **pure render over the one `FactoryState`** that
**recomputes only on fired events** (a new `gate0_open` / `roadmap_row_done` pair extend r1's
`FactoryEvent` union, D4), with a **printed roadmap-table twin** that **Gate 0 prints-and-`WAIT`s,
never auto-advances** (P-V/P-VI). A Gate-0 decision rides **additively on 001's existing
`gate-completion` at `gate:"gate0"`** (its `move ∈ moveVocabulary("gate0")` and `decidedBy: human@…`
are already validator-supported — D3), so r2 **adds no new log record type** and its emitted log
**PASSES 001's `kiln/validate/log.ts` unchanged**. A *broken* auto-approve path FAILs it with a
named reason (SC-002→SC-003). r2 **renders/records** a human Gate-0 move; it **never admits its own
program or advances Gate 0** (P-VI/FR-014/SC-007) — the admission is the human record in
`specs/ROADMAP.md`; the overlay is the one that never made it.

See [research.md](./research.md) for the design decisions D1–D8 and [contracts/](./contracts/) for
the overlay interface this row exposes (and the dogfood boundary it is judged against).

## Technical Context

All unknowns resolved — inherited from **001's research (U1–U8)** (the canonical TS + `node --test`
+ JSONL + zero-dependency substrate), from **r1's research (D1–D8)** (the runtime modules + the
dogfood), and from **this spec's Clarifications NC1–NC3** (Layer-C testability / Gate-0 face shape /
Gate-0 record encoding). No `NEEDS CLARIFICATION` remains; a small set of *overlay-realization*
choices is pinned in [research.md](./research.md) (§D1–D8). The single open *planning* item — the
`M` keymap vs `?`/`g` and overlay sizing (`ui-layers-deep.md §11#5`) — is resolved **here** to a
lean default (§D6) and stays a low-risk tweak.

**Language/Version**: TypeScript (KILN's module shape) · Node `>= 22.6` (`kiln/package.json`
engines) · `node --test` for the overlay + dogfood suites. *Canonical contracts are 001's JSON
Schemas + `move-vocabulary.ts` + `kiln/src/roles.ts` + r1's `kiln/ui/*.ts` + `kiln/src/types.ts`;
r2 imports them, it does not re-declare them.*

**Primary Dependencies**: **None at runtime** — r2 reuses r1's dependency-light substrate (a hand-
rolled validator, `node --test`, zero install surface). The overlay is a **pure function** over
`FactoryState`; there is **no TUI, no server, no poll** (P-IX). A *live-model TUI smoke walk* is
**r3**, not r2 (NC1).

**Storage**: **Files + in-memory** — the overlay reads the program from **`specs/ROADMAP.md`'s
structured head** (validated by `kiln/validate/roadmap.ts`, M1–M4) and from `FactoryState`
(`roadmap`/`current`/`gate0`/`gate`); a Gate-0 decision is recorded into the **JSONL factory-log**
(a `gate-completion` at `gate:"gate0"`) and mirrored in `ROADMAP.md`'s `gate0` block (P-VII). No
database.

**Testing**: `node --test` — the overlay / gate-0-face / twin / inter-row / `OverlayCReady` unit
suites **plus** the **dogfood** step (a closed-row program walk's emitted JSONL is run through
**001's** `kiln/validate/log.ts` and must PASS, and `ROADMAP.md` still validates under
`kiln/validate/roadmap.ts`) and the **falsifiable `OverlayCReady`** probe. A **broken
no-silent-approval path that would auto-approve a missing Gate 0** must make the emitted log
**FAIL** 001's validator with a named reason (SC-002→SC-003).

**Target Platform**: **Local workstation + CI** (the kiln chamber; macOS/Linux). The overlay is a
render over in-memory `FactoryState`; **excluded from r2's tests** is only the *live* TUI (NC1 →
**r3**).

**Project Type**: a **UI extension of r1's `kiln/ui/`** — it adds the **Layer C surface** and its
Gate-0 face and twin to r1's event-driven `FactoryState` watch (P-IX "Layer C = the Roadmap
overlay"), and an `OverlayCReady` probe alongside `runtime-ready.ts`. No new toolchain, no
web/mobile split.

**Performance Goals**: N/A as a throughput target. The watch stays **event-only** (SC-005):
**one `FactoryState`, one render, redrawn only on a fired event** — no timer/socket/server; a
captured identical state yields a **byte-identical** overlay render.

**Constraints**: **event-driven, no poll, no server** (P-IX); **Gate 0 never auto-approved, even
headless — enforced at render AND at write time** (P-V/P-VI; FR-007/FR-008); a **`merged`/`done`
row is never re-entered** — inter-row progression **waits on Gate 0** (FR-009); **additive, not a
re-declaration** — r2 extends r1's `FactoryEvent` union and reuses 001's log/roadmap schemas and
`move-vocabulary.ts` (FR-005/FR-014; NC3); **local-first, zero cloud dependency** (P-VIII);
**r2 renders a decision a human made but never admits its own program or advances Gate 0**
(P-VI/FR-014/SC-007).

**Scale/Scope**: One surface + one face + one twin + one probe (US1–US3 the core = P1; US4
inter-row re-entry = P2; US5 `OverlayCReady` = P3) over **one `FactoryState`**, not a live-model
walk. Three new overlay modules (`overlay.ts`, `gate0-face.ts`, and the twin + two events folded
into r1's `ui/`) + an `OverlayCReady` check, each carrying a constitution traceability note (FR-013).

## Constitution Check

*GATE: passes before Phase 0; re-checked after Phase 1 below — result **PASS, no violations**; the
Complexity Tracking table is empty.*

| Principle | How r2 realizes / respects it |
|-----------|-------------------------------|
| **I** Author/judge sep. | The overlay *renders* and the gate-0 face *presents* the program; the **Gate-0 decision is a human move** r2 only **records** (`gate-completion` at `gate:"gate0"` with `decidedBy: human@…`). r2 never *decides* it (FR-005/FR-008/FR-014). |
| **II** Strongest defense | r2 is a *view*; it does not bind a judge, but it **reads the LoD posture** from `FactoryState.roadmap` and never downgrades a `merged`/`active` row's standing. No new judge surface (P-II unaffected). |
| **III** One lane / director-scheduler | Layer C is a **read-only view** of `FactoryState.roadmap`; it opens **zero** new lane — the single lane is r1's (`F-SINGLE` holds). The overlay never forks the chamber. (P-III unaffected; FR-002) |
| **IV** Affinity swap-only-on-tier | No new cost lever in r2; the overlay reflects r1's `switches`/`cost` in the program view. Unaffected. |
| **V** Headless never silently approves | The headline guard: with no UI, **Gate 0 prints the program and `WAIT`s`; a missing overlay never auto-advances**. No-silent-approval is enforced **at write time** — a broken auto-approve path makes the emitted log **FAIL 001's `log.ts`** (FR-007/FR-008, SC-003, US3). |
| **VI** Gate 0 human-only, always | r2 **renders Gate 0 as the program gate** (pre-lane + inter-row), with the canonical **roadmap-level move set** (`moveVocabulary("gate0")`), **never conflated** with a per-gate card (`gate0 ≠ gate`, G1); a `roadmap_row_done` **re-opens** it; r2 **never admits its own program** — the admission is `specs/ROADMAP.md`. (FR-004/FR-006/FR-009/FR-014, SC-002/SC-007, US2/US4) |
| **VII** Everything in the log | A Gate-0 decision and every `roadmap_row_done` land in the **JSONL** (a `gate-completion` at `gate:"gate0"` + the mirrored `ROADMAP.md` head), reconstructable from the log alone; the twin prints *recorded* state. (FR-013, SC-003) |
| **VIII** Local-first | No overlay/twin path requires a cloud round-trip; a missing outside resource is a **flagged, non-blocking** record; a **zero-network grep** over the overlay set confirms it (SC-006). (FR-012, SC-006/SC-007, US5) |
| **IX** Three layers, event-driven, no server | Layer C **composes** with A/B over **one `FactoryState`**, **redraws only on a fired event** (`gate0_open`/`roadmap_row_done`), a **headless twin prints** the roadmap table — no timer/socket/server. (FR-002/FR-003, SC-005, US1/US3/US5) |
| **Governance / FR-009-analogue** | Each overlay piece carries a **constitution traceability note**; the emitted log + the `ROADMAP.md` head are the **audit** a downstream gate verifies compliance from (`kiln/validate/roadmap.ts` M3/M4 guards the `gate0` head). (FR-013) |

## Project Structure

### Documentation (this feature)

```text
specs/003-kiln-roadmap-overlay/
├── plan.md                  # this file (/speckit.plan)
├── research.md              # Phase 0 — overlay-realization decisions D1–D8 (no NEEDS CLARIFICATION; inherited from 001/r1)
├── data-model.md            # Phase 1 — the Layer-C entities (E1–E6), the *render* of r1's + 001's declarations
├── quickstart.md            # Phase 1 — the dogfood run guide (SC-001..SC-007, no live model)
├── contracts/               # Phase 1 — the overlay interface this row exposes + the dogfood boundary
│    ├── README.md                  # index: how r2 realizes r1's + 001's contracts; the "judge by 001+r1" boundary
│    ├── overlay-api.md             # Layer C render + Gate-0 face + twin + the two new events (module surface)
│    ├── gate0-face.md              # the Gate-0 face: the canonical moveVocabulary("gate0") on a distinct face (NC2)
│    └── overlay-ready.md           # the OverlayCReady check = falsifiable extension of r1's RuntimeReady
└── contracts/               # (no draft-roadmap here — r1 owned that; r2 renders specs/ROADMAP.md as admitted)
# (later) tasks.md — produced by /speckit.tasks, NOT by /speckit.plan
```

### Source Code (repository root, at `/speckit.implement` — research §D8)

r2 **extends r1's `kiln/ui/`** — it adds the **Layer C surface + its Gate-0 face + the twin** and
**extend r1's `FactoryEvent` union additively**, plus `kiln/validate/overlay-ready.ts`. It imports
001's schemas + `move-vocabulary.ts` and r1's modules — *no re-declaration of the log/roadmap
schemas, the move vocabulary, `roles.ts`, or r1's `ui/` core*.

```text
kiln/
├─ ui/
│    ├─ factory-state.ts     # (r1) EXTENDED additively — the FactoryEvent union gains gate0_open / roadmap_row_done
│    ├─ hud.ts               # (r1) reused — Layer A (composes with C; FR-002)
│    ├─ popup.ts             # (r1) reused — Layer B (composes with C; FR-002)
│    ├─ overlay.ts           # E1 — Layer C renderOverlay(state): the roadmap zoom-out (in-flight highlighted)
│    ├─ gate0-face.ts        # E2 — Gate-0 face (NC2): renders moveVocabulary("gate0"); pre-lane + inter-row
│    ├─ twin.ts              # E4 (r1) EXTENDED — printHeadless also prints the Layer-C roadmap table + the Gate-0 WAIT
│    └─ keymap.ts            # §D6 planning spike (NOT an E-entity) — M raises Layer C; g/…/? unchanged (low risk)
├─ src/
│    ├─ walk.ts              # (r1) EXTENDED — buildProgramWalk(): a closed-row gate0 sequence r2 emits + judges
│    └─ types.ts             # (001) reused — FactoryState / RoadmapRow / RoadmapHead / Gate0 (imported, not changed)
├─ validate/
│    ├─ log.ts               # (001) the validator r2's emitted gate0 log DOGFOODS through (already accepts gate:"gate0")
│    ├─ roadmap.ts           # (001) M1–M4; the ROADMAP.md head r2 RENDERS is validated here
│    ├─ runtime-ready.ts     # (r1) reused — r2's OverlayCReady composes on it (or imports its checks)
│    └─ overlay-ready.ts     # E6 — the OverlayCReady probe (extension of r1's runtime-ready.ts)
├─ index.ts                 # EXTENDED — also exports overlay / gate0-face / overlay-ready (no gate0 decision admitted)
└─ tests/                    # node --test: overlay/ gate0-face/ twin/ inter-row/ overlay-ready/ dogfood/
```

**Structure Decision**: single-project (KILN = one `kiln/` extension, per 001 research §H + r1
§D8). No web/mobile split. The overlay is **realized under `kiln/ui/`** (the shared import root)
and **judged by** 001's `kiln/validate/log.ts` (dogfood) *and* `kiln/validate/roadmap.ts`
(the head it renders) — the overlay *renders + records* what a human decides; the two validators
*consume*, and the three never blur (Principle I). Planning docs stay in
`specs/003-kiln-roadmap-overlay/`; the *importable / judged* overlay + its contracts live under
`kiln/` and `specs/003-kiln-roadmap-overlay/contracts/`.

## Complexity Tracking

> **No Constitution violations, so nothing to justify.** The design adds no cloud dependency, no
> second lane, no parallelism, no server, and **no new log record type** (the Gate-0 decision
> reuses 001's `gate-completion` at `gate:"gate0"`; NC3/D3). The overlay + twin are *simpler*
> than the alternative they reject (a TUI smoke walk, which NC1 defers to r3). The only overlay-
> specific structures (the two new events + the additive `gate0` face) are *required* to realize
> the constitution (P-IX "Layer C", P-V/P-VI), not optional. No Complexity Tracking entries are
> required.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)*   | —            | —                                    |
