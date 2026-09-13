# Implementation Plan: 002-kiln-lane

**Branch**: `002-kiln-lane` | **Date**: 2026-09-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-kiln-lane/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition
describes the execution workflow.

## Summary

001 *declared* KILN's pre-lane contracts and **ran no lane**. This row, **r1** of the
admitted `kiln-v1` program ([specs/ROADMAP.md](../../ROADMAP.md)), is the **runtime
that executes them**: the **single lane** that holds exactly one resident model at a
time, the **gate primitive** that blocks the lane on a human event (degrading to a
durable headless `wait`), the **factory-log writer** that emits the R1–R6 record
001's validator checks, the **model-affinity scheduler** that holds the resident and
swaps only on a tier change, the **Flow HUD / Flow Popup** over one `FactoryState`,
and the **RuntimeReady** probe. It is the "kiln starts firing" row — the lane now
*produces* real `transition` / `gate-completion` records instead of only *declaring
their shapes* (spec §Scope).

**Approach (the load-bearing one):** prove the runtime **without a live model** by
driving it with a **deterministic stub resident** (NC2) and **replaying its emitted
JSONL through 001's `kiln/validate/log.ts`** — a **dogfood** invariant (FR-004,
SC-003): the row is *judged by* the contract 001 built. This keeps r1 **local-first**
(Principle VIII, no cloud) and **independently testable** with no Ollama. See
[research.md](./research.md) for the runtime-realization decisions and
[contracts/](./contracts/) for the runtime interface this row exposes (and the
dogfood boundary it is judged against).

## Technical Context

All unknowns resolved — inherited from **001's research.md U1–U8** (the canonical TS
+ `node --test` + JSONL + zero-dependency substrate) and **this spec's
Clarifications NC1–NC4** (UI-layer scope / stub resident / one human-event channel /
row granularity). No `NEEDS CLARIFICATION` remains; a small set of *runtime
realization* choices is pinned in [research.md](./research.md) (§D1–D8).

**Language/Version**: TypeScript (KILN's module shape, concept §9) · Node `>= 22.6`
(`kiln/package.json` engines) · `node --test` for the runtime + dogfood suites.
*Canonical contracts are 001's JSON Schemas + `kiln/contracts/move-vocabulary.ts` +
`kiln/src/roles.ts`; r1 imports them, it does not re-declare them.*

**Primary Dependencies**: **None at runtime** — r1 reuses 001's dependency-light
substrate (a hand-rolled validator, `node --test`, zero install surface; 001
research §B/§G). The stub resident is a **local test double**, not an Ollama call.
The *only* network permit in the program is r5's installer bootstrap (P-VIII
exception for the install step *only*, not this row).

**Storage**: **Files + in-memory** — the factory-log is **JSONL** written to
`kiln/factory-log/` (001's `kiln/factory-log/.gitkeep`); `FactoryState` is the
single in-memory store the two UI layers draw from. Both durable/greppable,
reconstructable from the log alone (Principle VII). No database.

**Testing**: `node --test` — the lane/gate/writer/scheduler/UI unit suites **plus**
the **dogfood** step (the emitted log is run through 001's
`kiln/validate/log.ts` and must PASS) and the **falsifiable RuntimeReady** suite
(quickstart, SC-001/SC-003/SC-006). A broken no-silent-approval path must make the
emitted log **FAIL** 001's validator with a named reason (SC-002 → SC-003).

**Target Platform**: **Local workstation + CI** (the kiln chamber; macOS/Linux).
Local Ollama models are the operator's concern; **excluded from r1's tests** by NC2
(a *live-model smoke walk* is **r3**).

**Project Type**: a **runtime extension of 001's `kiln/`** — it replaces the
documented `not-wired` `kiln/index.ts` stub (001, Q1=C / SC-006) with the real
event→state→log wiring. No new toolchain, no web/mobile split.

**Performance Goals**: N/A as a throughput target (no live model). The *cost
metric* the lane must *measure and emit* is `wall-clock = work + switching`, with
the **switch-term** the dominant local cost — `switches = 0` for a same-tier phase
and `= 1` per genuine tier boundary; **0** weaker line-of-defense bindings accepted
at schedule time (SC-004). The watch redraws must be **event-only** (SC-005).

**Constraints**: **One lane, one resident, one running unit at any instant**
(P-III/SC-001); **no silent approval, Gate 0 included — enforced at write time**
(P-V/FR-005/SC-002); **line-of-defense = `strongest`, always** (P-II, reused from
`kiln/src/roles.ts`); **event-driven, no poll, no server** (P-IX); **local-first,
zero cloud dependency in r1** (P-VIII); the **emitted log must pass 001's
`kiln/validate/log.ts`** (FR-004/SC-003); **r1 never admits its own program** —
Gate 0 stays the sole admission ([specs/ROADMAP.md](../../ROADMAP.md),
`gate0.status: approved`; FR-012/SC-007).

**Scale/Scope**: One runtime (US1–US4 the spine, US5 watch as P2, US6 probe as P3)
over **a stub resident**, not a live-model walk (NC2). Five runtime modules
(`lane`, `gate`, `log-writer`, `scheduler`, `ui`) + a `RuntimeReady` check, each
carrying a constitution traceability note (FR-011).

## Constitution Check

*GATE: passes before Phase 0; re-checked after Phase 1 below — result **PASS, no
violations**; the Complexity Tracking table is empty.*

| Principle | How r1 realizes / respects it |
|-----------|-------------------------------|
| **I** Author/judge sep. | The lane *runs* workers; **gates are judged by a human / the four line-of-defense roles**, never by the runtime. r1 *emits* a decision as a record; it never *decides* its own gate (the runtime analog of 001's "declared-not-judged"). (FR-002/FR-008/FR-012, SC-007) |
| **II** Strongest defense | The affinity scheduler **reuses `kiln/src/roles.ts` `bindRole`**: the four line-of-defense roles bind **`strongest`, always** (incl. local); a weaker binding is **rejected at schedule time** as a config error. (FR-006, SC-004, US4) |
| **III** One lane / director-scheduler | `FactoryState` is the single-resident store; the lane holds **exactly one resident and one running unit at any instant**; the director holds/yields/reclaims the lane. No parallel structure. (FR-001, SC-001, US1) |
| **IV** Affinity swap-only-on-tier | The scheduler holds the resident and **changes it only when the next unit's tier differs**; the emitted `switches` = the number of genuine tier boundaries (an affinity-compatible interior boundary swaps 0); a `cost` record brackets the swap. (FR-006, SC-004, US4) |
| **V** Headless never silently approves | The gate **blocks**; headless it **prints its card and emits a durable `wait`** (`gate`/`token`/`deadline`) and **never writes a `gate-completion`**. No-silent-approval is enforced **at write time** in the log-writer (a `gate-completion` with `approve`/`restart`/merge must reference a non-empty `decidedBy` or a *distinct* `pre-delegation`, else the writer throws). (FR-003/FR-005, SC-002, US2/US3) |
| **VI** Gate 0 human-only, always | r1 **never admits its own program** and emits **no `gate0` approval**; the admission lives in `specs/ROADMAP.md` (`gate0.status: approved`, a *human* move). r1's only gate-0 surface is a printed table + a `wait` if a headless run reaches it. (FR-012, SC-007) |
| **VII** Everything in the log | Every `transition`/`gate-completion`/`human-decision`/`cost`/`wait` is emitted as a **schema-conformant JSONL line** with `seq` strictly increasing/gap-free and `ts` non-decreasing; a terminal closing mid-feature leaves a **reconstructable prefix**. The emitted log *is* the compliance evidence. (FR-004/FR-011, SC-003, US3/US5) |
| **VIII** Local-first | No runtime path requires a cloud round-trip; a missing outside resource (e.g. web) is a **flagged, non-blocking** record. A **zero-network grep** over the runtime set confirms it (SC-006). (FR-010, SC-006/SC-007, US6) |
| **IX** Three layers, event-driven, no server | The HUD (Layer A) and Popup (Layer B) **recompute from one shared `FactoryState` only on fired events** — no timer, no socket, no server; a disabled UI **prints** the same content (the headless twin) and the gate **still blocks**. (FR-007, SC-005, US5) |
| **Governance / FR-009-analogue** | Each runtime module carries a **constitution traceability note**; the lane's emitted log is the **audit trail** a downstream gate verifies compliance from. (FR-011) |

## Project Structure

### Documentation (this feature)

```text
spec…e/
├── plan.md                 # this file (/speckit.plan)
├── research.md             # Phase 0 — runtime-realization decisions D1–D8 (no NEEDS CLARIFICATION; inherited from 001)
├── data-model.md           # Phase 1 — the stateful runtime entities (E1–E7), the *runtime* of 001's declarations
├── quickstart.md           # Phase 1 — the dogfood run guide (SC-001..SC-006/007, no live model)
├── contracts/              # Phase 1 — the runtime interface this row exposes + the dogfood boundary
│    ├── README.md                 # index: how r1 realizes 001's contracts; the "judge by 001" boundary
│    ├── runtime-api.md            # lane / gate / log-writer / scheduler / ui / stub-resident module surface
│    └── runtime-ready.md          # the RuntimeReady check = falsifiable extension of 001's FiringReady
└── contracts/draft-roadmap.md      # the pre-admission proposal (SUPERSEDED → ../../ROADMAP.md, frozen)
# (later) tasks.md — produced by /speckit.tasks, NOT by /speckit.plan
```

### Source Code (repository root, at `/speckit.implement` — research §D8)

r1 **promotes the shared root**: it replaces `kiln/index.ts`'s `not-wired` stub and
adds the runtime modules **under `kiln/`**, importing 001's contracts — *no re-
declaration of the schemas / move vocabulary / role table*.

```text
kiln/
├─ src/
│   ├─ lane.ts               # E1 — the single lane + director-as-scheduler (hold/yield/resume/reclaim)
│   ├─ gate.ts               # E2 — the gate primitive (block; headless `wait`; MoveVocabulary(gate), G3)
│   ├─ log-writer.ts         # E3 — monotonic seq emitter; the no-silent-approval WRITETIME choke point (R3/R4)
│   ├─ scheduler.ts          # E4 — affinity: hold resident, swap on tier change, Cost record, P-II binding
│   ├─ stub-resident.ts      # E6 — the deterministic resident-model *interface* + a test fake (NC2, no Ollama)
│   ├─ roles.ts              # (001) reused — bindRole / line-of-defense / Tier (G2/L1)
│   └─ types.ts              # (001) reused — FactoryState / FactoryRecord union
├─ ui/
│   ├─ factory-state.ts      # E5 (state side) — the single store the surfaces draw from (event-only mutation)
│   ├─ hud.ts                # E5 (Layer A) — the flow HUD strip, recompute on events, headless print twin
│   └─ popup.ts              # E5 (Layer B) — the on-demand gate card, no timer/socket, print twin
├─ validate/
│   ├─ log.ts                # (001) the validator r1 DOGFOODS its emitted log through (R1–R6)
│   ├─ roadmap.ts            # (001) M1–M4; the admitted program spec/ROADMAP.md validates here
│   └─ runtime-ready.ts      # E7 — the RuntimeReady probe (extension of 001's firing-ready.ts)
├─ index.ts                  # WIRED — replaces the 001 stub; exports lane/gate/writer/scheduler/ui/RuntimeReady
└─ tests/                    # node --test: lane/ gate/ writer/ scheduler/ ui/ dogfood/ runtime-ready/ negative/
```

**Structure Decision**: single-project (KILN = one `kiln/` extension, per 001
research §H). No web/mobile split. The runtime is **realized under `kiln/`** (the
shared import root) and **judged by** 001's `kiln/validate/log.ts` (the dogfood
boundary) — the runtime *produces* log lines the validator *consumes*; the two never
blur (Principle I). Planning docs stay in `specs/002-kiln-lane/`; the *importable /
judged* runtime + its contracts live under `kiln/` and `specs/002-kiln-lane/contracts/`.

## Complexity Tracking

> **No Constitution violations, so nothing to justify.** The design adds no cloud
> dependency, no second lane, no parallelism, and no server (P-III/VIII/IX). The
> "stub resident" (NC2) is *simpler* than a live-model walk, not more complex. The
> only runtime-specific structures (the gate-block + the write-time no-silent-
> approval choke point) are *required* to realize the constitution, not optional.
> No Complexity Tracking entries are required.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| *(none)*  | —          | —                                    |
