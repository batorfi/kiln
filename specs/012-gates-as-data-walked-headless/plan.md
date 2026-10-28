# Implementation Plan: Gates as data, walked headless (row r14)

**Branch**: `012-gates-as-data-walked-headless` | **Date**: 2026-10-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-gates-as-data-walked-headless/spec.md` (clarified 2026-10-27: three decisions recorded; two amendments made while planning — FR-025, FR-070 — noted under *Deviations*).

**Companions**: [research.md](./research.md) (R1–R17: the design decisions) · [data-model.md](./data-model.md) · [contracts/](./contracts/) (flow data and engine, the walk, `kiln check flow` and the CLI) · [quickstart.md](./quickstart.md) (the acceptance run).

## Summary

r14 makes the flow *run*. r12 left the twelve-gate flow as a table; r13 left a gate that waits and settles correctly but is opened by hand. This row adds, in three layers:

1. **A pure flow engine** in `contracts` — order, next gate, `applies_when` evaluation with a reproducible *reason*, the consequence of every move kind, the targets a reject may name, triage and cap rules, and `validateFlow`. The v2 data gains the facts the engine needs (move rules, triage, arming, delegability, restore point), all optional, all checked.
2. **A walk** in `durable` — `kiln.row` grown a `walk` form whose whole state is its checkpoint. After a person's move settles a gate the **owner** opens the next one (idempotently, by key), records *not applicable* / *skipped* once and in the same commit as the state it changes, runs the scripted units, applies the consequence (revise · reject · restart · split+revise · re-crossing), runs Verification's bounded fix rounds, and ends at Merge. A **feature-level reject** reaches an open gate through its decision slot and withdraws it in one commit. Gates, moves and the closed refusal vocabulary are r13's; the gate's *shape* gains optional `note`, `target`, `admit` and, at opening, `noteRequired` and `returnsTo`.
3. **`kiln check flow`** and its negative suite in `checks`, the CLI (`kiln feature admit|next|move|state`, `kiln gate move --note --target --admit`), and the rewritten `gate-rail.md` with its drift test.

The rest of the row is **proof**: two scripted walks (an interface feature through all eleven feature gates, a plain one through nine) driven only through the CLI; the r13 kill harness re-used with sixteen new named kill points and a fresh-reader oracle extended (withdrawn gates, walk equality); a deliberately weakened walk and a deliberately permissive check, each shown to be caught. Nothing of r15–r21 is pulled in: no event catalog, no workers, no arming or delegation behaviour, no browser.

## Technical Context

**Language/Version**: TypeScript run directly by Node's type stripping (as r12/r13). Node `^22.19.0 || >=23.6.0` unchanged. Type-stripping rules apply: no parameter properties, enums or namespaces.

**Primary Dependencies**: none added. The three pinned packages (r13) are reached only through `packages/durable/src/library/`; the engine, the walk's rules and the check use no library and no `node:` import in `contracts`.

**Storage**: the existing per-factory store. One new document family, `kiln.walk` (`DOC_NAMES`), and added fields on `kiln.gate`/`kiln.move` documents (open objects). No store-contract bump is needed (the contract number guards the library version, not document names); a test opens an r13-shaped store with the new owner.

**Testing**: r12's runner over `node --test`. New: pure unit tests (engine, glob, applicability, consequences), the check and its negative suite, walk tests in-process, the kill proof in child owners (SIGKILL at named points, fresh-reader oracle), the CLI walk driver. Two tiers (R16): default and `proof`; the runner prints which ran.

**Target Platform**: macOS (as r12/r13); other platforms not measured and said so.

**Project Type**: library + CLI in the existing layered `kiln/` monorepo.

**Performance Goals**: an in-process full walk of 12 gates < 3 s (scripted steps, `stepMs: 0`); `kiln check flow` < 100 ms; the default-tier kill proof within the remaining budget (see Risks).

**Constraints**: `v1` and every r13 test unchanged; the checks become four, each never-vacuous; no network port; no timer on a gate; no environment variable in product code can kill or fault a factory; `legacy/` byte-identical; `ROADMAP.md` untouched; no new dependency.

**Scale/Scope**: one factory per store; a walk is ≤ 12 gates × a few rounds; a store holds many walks. Out of scope: added gates and flows from files (r26), briefs and moves on the web (r20), arming and delegated crossings (r21), the event stream (r15), workers and models (r16), configuration (r17), the director (r18).

## Constitution Check

*GATE: passes before Phase 0 and again after Phase 1 design. `.specify/memory/constitution.md` v2.1.0.*

| Principle | Verdict | How the design meets it |
|---|---|---|
| **I** author / judge separation | pass | the walk runs a *judge* unit and an *author* unit as distinct tasks for every judged gate (a test asserts no unit is both); no unit decides a gate; the row has no path that writes a move record |
| **II** judges on the strongest model | n/a here | no model runs; the check verifies only that a gate's `judge` is a judge role (the tier rule is r17's) |
| **III** one lane, sequential | pass | walk units are `needsLane:false` (the CLI owner has no lane; r16 composes it); the walk runs one unit at a time, and r13's lane port is untouched |
| **IV** affinity | n/a | — |
| **V** a missing person never approves | **pass — the core** | every walk gate is an r13 gate: waiting is stored, nothing settles it but a committed move; the new windows (between a move and the next opening; a pin; a fix round; a withdrawal) are **named kill points**, each attacked; `restartLimit = Infinity` is r13's and its storm test is reused on a walk gate |
| **VI** Roadmap gate human-only | pass | every walk starts at a Roadmap-gate `approve` carrying `admit`; the gate0 vocabulary has no delegation, `Move` has no delegation field, and a test asserts both |
| **VII** everything recorded, atomically | pass for what r14 changes | every walk outcome is an outbox entry with actor and cause **in the commit of the state it records** (`walk.admitted`, `gate.not-applicable`, `gate.skipped`, `gate.became-applicable`, `gate.withdrawn`, `walk.returned`, `walk.fix-round`, `walk.split`, `walk.left-lane`, `walk.completed`). The catalog, stream and rebuild remain r15 — a tracked deferral below |
| **VIII** local by default | pass | no new IPC beyond r13's socket (three more operations on it); `contracts` has no `node:` import; the network lint and the boundary check run over every new file |
| **IX** one committed state; event-driven surfaces | pass | `feature next` waits on an in-process event and re-derives its answer from the store; **no polling anywhere**; the test driver uses it |
| **X** knowledge is not authority | n/a | — |
| **XI** a factory is portable | pass | all walk state is in the store (checkpoint + `kiln.walk`); nothing is in memory that a restart cannot rebuild, except r13's decision slots, which re-register |
| **XII** workshops sovereign | n/a | — |
| *The Flow* (anchors · built-ins never removed · closed move kinds · shortcuts are decisions) | **pass — the other core** | the engine and `kiln check flow` enforce anchors, presence and order, the closed set, triage = Concept and Architecture only, "not applicable" ≠ "skipped" ≠ "settled"; each rule has a negative-suite member that fails by code |
| *Dependencies* | pass | none added; the seam rule is unchanged |

**Gate evaluation:** no violation. Four tracked complexities below.

**Post-design re-check (after R1–R17, the data model and contracts):** two findings changed the design. (1) The feature-level move needed the decision slot, not a polled record — this made the `withdrawn` end-state and oracle I10 part of the row (R6). (2) `restart` at UI review would have let rebuilt code skip Code review — FR-025 was amended (R11). No principle is conflicted.

## Project Structure

### Documentation (this feature)

```text
specs/012-gates-as-data-walked-headless/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/ flow-data.md · walk-contract.md · check-flow.md
├── checklists/requirements.md
├── tasks.md          # /speckit-tasks
├── baseline.md       # before/after readings, suite time per tier (written during implementation)
├── notes.md          # mutation checks, decisions found on the way (written during implementation)
└── implementation-report.md   # at the end
```

### Source code (`kiln/`)

```text
kiln/
├── packages/
│   ├── contracts/
│   │   ├── gate-rail.md                       # REWRITTEN for constitution 2.1.0 (US8)
│   │   ├── src/flow/
│   │   │   ├── types.ts                       # + MoveRule, Target, origin, after, triage, armsTail, delegable, restorePoint, noTriageSkip
│   │   │   ├── v2.ts                          # + the rules, per contracts/flow-data.md §2   (v1.ts untouched)
│   │   │   ├── engine.ts                      # NEW  order · next · rule · targetsOf · consequence · triage · cap
│   │   │   ├── applies.ts glob.ts             # NEW  applicability + Reason · the pure path matcher
│   │   │   ├── validate.ts                    # NEW  validateFlow → Fault[]
│   │   │   └── index.ts                       # + re-exports
│   │   └── tests/ engine.test.ts consequences.test.ts applies.test.ts glob.test.ts validate.test.ts
│   │            gate-rail.test.ts flow-vs-constitution.test.ts   # EXTENDED (US8)
│   ├── durable/
│   │   ├── src/
│   │   │   ├── types.ts store.ts              # + Move{note,target,admit} · GateSpec/Document{returnsTo,noteRequired} · GateState.withdrawn · DocName "kiln.walk" · OutboxType additions
│   │   │   ├── gate/ open.ts move.ts tasks.ts state.ts slots.ts documents.ts   # EXTENDED (§3 of walk-contract)
│   │   │   ├── walk/                          # NEW
│   │   │   │   ├── input.ts                   #   WalkInput validation (by name)
│   │   │   │   ├── state.ts                   #   WalkCheckpoint · WalkState · reducers (pure)
│   │   │   │   ├── walk.ts                    #   the row's walk phases
│   │   │   │   ├── moves.ts                   #   FeatureMoveApi (§6)
│   │   │   │   └── watch.ts                   #   the in-process notifier behind `feature.state --after`
│   │   │   ├── tasks/row.ts validate.ts       # + the `walk` form
│   │   │   ├── channel/ protocol.ts server.ts client.ts                          # + feature.admit · feature.state · feature.move
│   │   │   ├── hooks.ts inspect.ts factory.ts index.ts                            # + KILL_POINTS · withdrawn · wiring · exports
│   │   └── tests/
│   │       ├── walk/ input · state · walk-inprocess · moves · triage · fix-rounds · feature-move · watch  (.test.ts)
│   │       └── proof/ walk-smoke · walk-storm · walk-clock · walk-negative (weakened walk) · walk-withdraw  (.test.ts)  ·  walk-kill-points · walk-every-gate · walk-kill-matrix · walk-random-kill  (.proof.test.ts)
│   │            support/ oracle.ts (+I10, W1–W4) · owner-main.ts (+walk script) · broken-walk.ts · walk-harness.ts
│   └── cli/
│       ├── src/ main.ts gate-commands.ts gate-usage.ts feature-commands.ts       # NEW feature-commands.ts
│       └── tests/ feature-cli.test.ts check-flow-cli.test.ts
├── checks/
│   ├── flow.ts                                # NEW  checkFlow
│   ├── index.ts                               # + "flow"
│   └── tests/ flow-negative.ts flow-check.test.ts
├── fixtures/ walk-interface.json walk-plain.json walk-interface.approve-all.json walk-plain.approve-all.json
├── tests/walk/drive.ts                        # the scripted CLI driver (test support)
├── package.json                               # + "proof" script
└── README.md · packages/durable/README.md     # the walk, the tiers, "four checks"
```

**Structure Decision.** Rules are pure and in `contracts`; effects are in `durable`; the check is in `checks`. No new package, no new layer edge: `checks → contracts` and `durable → contracts` already exist, `cli → durable` is r13's. The walk lives beside the gate it drives; the director (r18) will compose the same engine without moving it.

## Phases (implementation order — the tasks step turns each into numbered tasks)

| Phase | What | Checkpoint |
|---|---|---|
| **P0 Baseline and the check first** | `baseline.md` *before*; flow types + v2 data; `validate.ts`, `glob.ts`; `checks/flow.ts` registered; **the negative suite written before the data it judges is final**; "three checks" text updated to four | `npm run check` four PASS; engine/validate tests green; the accept-everything stub fails the suite; r12/r13 counts unchanged |
| **P1 The engine** | `engine.ts` (order, next, rule, targetsOf, consequence, triage, cap), `applies.ts`; the consequence table as a test against `the-flow.md` §7 | every (gate, kind) pair in the table; every applicability golden case; **no store yet** |
| **P2 The gate, extended** | `Move`/`GateSpec`/`GateDocument` fields; `submitMove` validations; `GateState.withdrawn`; decision-slot `withdraw` request; oracle I10; r13's whole proof re-run | r13's tests green **unchanged**; each new refusal by name; withdrawn proven by kill at its three points |
| **P3 The walk, approvals only** | `WalkInput`, `kiln.row` walk form, admission → pin → work → open → decide → consume; `kiln.walk`; `feature.*` channel ops + `kiln feature …` + `gate move --note --target --admit`; the CLI driver | the two scripted walks run through the CLI: 12 gates and 10 gates, once each (**US1, US2**); NA reasons exact; required gate; no polling |
| **P4 Kill and resume** | the sixteen `walk.*` points; `walk-smoke` (default) and `walk-kill-points`, `walk-every-gate`, `walk-kill-matrix`, `walk-random-kill` (proof tier); W1–W4 and walk equality; the **weakened walk** shown caught; storm on a walk gate | **US3**: the smoke at the default tier; the full matrix at the proof tier, run once and recorded |
| **P5 Where moves lead** | revise · reject (same gate / earlier / roadmap) · restart · split+revise · re-crossing with `changedSince`; notes become instructions | **US5**; every row of the consequence table through the CLI at least once |
| **P6 The feature-level move** | `FeatureMoveApi`, `kiln feature move`, withdraw + pending, the open-commit refusal while pending; kill at `walk.withdraw-*` | **US5.5/5.9**, FR-023, FR-026; first-wins between a gate move and a feature move |
| **P7 Triage and fix rounds** | triage proposal/override/refusals; Verification's bounded rounds, `mitigate` refused, cap 0–3 | **US6, US7**; each cap × verdicts matrix |
| **P8 The contract** | `gate-rail.md` rewritten; drift test extended; the two stale sentences asserted absent | **US8** |
| **P9 Close** | floor matrix (22.19 · 23.6 · 24.1 · installed); proof tier run and recorded; fresh-clone quickstart; README and statements; `baseline.md` *after*; implementation report; mutation checks re-run | quickstart §0–§8 as stated on a fresh clone; `legacy/` and `ROADMAP.md` unchanged |

**Ordering rules.** The check and its negative suite land **before** the data change they judge (P0), so the green tree is never one where the check passes because nobody tried to break it. The oracle's new invariants (P2) land **before** the walk's guarantees are claimed (P3/P4), and the weakened walk is shown failing before the real walk is shown passing. Mutation checks run on a committed tree and are undone before anything else (r13's lesson; the script asserts a clean tree after each revert). Each phase ends with a commit and its checkpoint recorded in `baseline.md`.

## Requirements → where they are proven

| Spec | Proven by |
|---|---|
| FR-001, 002, 003, SC-009 | `engine.test.ts` (order from data; a changed vocabulary changes the walk), `flow-check.test.ts`, the two CLI walks |
| FR-004 … 007 | `validate.test.ts`, `moves.test.ts` (vocabulary per gate; `mitigate` refused; scope of row edits), `gate-extensions.test.ts` |
| FR-010 … 016, SC-002 | `applies.test.ts` (goldens), `walk-inprocess.test.ts` (pin once; became-applicable; never reversed), the plain/interface/required walks |
| FR-020 … 026, SC-005, 006 | `consequences.test.ts` (the table), `moves.test.ts` (every row through the CLI), `feature-move.test.ts`, `walk-withdraw.test.ts` |
| FR-030, 031, SC-007 | `triage.test.ts` (7 and 9 gates; refusals; override; `no_triage_skip`) |
| FR-032, SC-008 | `fix-rounds.test.ts` (cap 0–3 × verdicts; `mitigate` refused; kill inside a round) |
| FR-040 … 043, SC-004, 011 | `flow-check.test.ts` + `flow-negative.ts` (one member per code, multi-fault members, the stub) |
| FR-044 | `validate.test.ts` (arming members), `gate-extensions.test.ts` (`Move` has no delegation field; the Roadmap gate's task input has none; `admit` is refused anywhere but gate0's `approve`) |
| FR-050 … 056, SC-001, 003, 011 | `feature-cli.test.ts`, `walk-smoke`, `walk-kill-points`, `walk-every-gate`, `walk-kill-matrix`, `walk-random-kill`, `walk-negative` (weakened walk), `watch.test.ts` (no polling) |
| FR-060, 061, SC-010 | `gate-rail.test.ts`, `flow-vs-constitution.test.ts` |
| FR-070, 071, SC-012 | r13's suite unchanged and green; `git diff` guard on `ROADMAP.md`/`legacy`; the tier line in the runner output |

## Risks

| Risk | Likelihood · impact | Mitigation |
|---|---|---|
| The kill matrix pushes `npm test` past r13's 180 s threshold (r13 left 14 s of margin on 24.1) | **certain if left in the default tier** · medium | decided at analysis (R16): the matrix, every-gate sweep, reject/re-cross script and 300 random kills are `*.proof.test.ts` from the start; the default tier is a four-point smoke, one storm, the clock test and the weakened-walk control; T057 only *verifies* the margin; the runner prints the tier; SC-003's evidence is the recorded proof run |
| The withdraw path (R6) disturbs r13's proved gate | medium · **high** | P2 re-runs r13's whole proof unchanged first; `withdraw` is a second request kind on the same slot, written as a branch that cannot run for a move; oracle I10 lands with it; mutation check: make the withdraw also write a move record → I10/I2 must fail |
| `feature next` waiting hides a polling loop in the owner | low · medium | the notifier is a plain event emitter set by the open commit and the walk's end; a test asserts zero timers on the waiting request and that an owner restart wakes it with a connection loss |
| A walk gate opens in the window between a pending feature move and `openGateId` | medium · high | the open commit **reads and sets** both in one transaction and refuses while pending; `walk.gate-opening`/`walk.withdraw-received` are killed on both sides, and a two-process race test runs a gate move against a feature move ×100 |
| Applicability reasons drift (byte-different text for the same facts) | low · medium | `Reason` is canonical JSON built from the rule and the three-valued facts; goldens compare bytes; a replay test evaluates twice across a restart |
| `kiln.row`'s `walk` form grows toward the director (r18) | medium · medium | scripted units only; no scheduling, no affinity, no planner; any behaviour not in the spec needs a spec line first (r13's rule) |
| Four checks break text and tests that say "three" | medium · low | grep-listed in P0 (`packages/cli/tests/check-boundaries.test.ts`, READMEs, r12/r13 quickstarts *annotated*, not rewritten) |

## Complexity Tracking

> Places where an earlier rule is deliberately stretched — each justified, each with a test.

| Stretch | Why needed | Simpler alternative rejected because |
|---|---|---|
| **`Move`, `GateSpec` and `GateDocument` gain optional fields** (r13's shape) | corrective moves must carry a note, a reject its target, and the Roadmap gate's approve its admission decisions — recorded atomically with the settlement (FR-013/020/022/032) | a side-channel document is two writes for one decision; free-text targets are parsing prose. Guarantees are untouched; r13's tests run unchanged (FR-070 amended to say "guarantees") |
| **A third end of a gate: `withdrawn`**, with oracle I10 | a feature-level reject must end an open gate without settling it (FR-023/026) and in one commit with the record of the move | leaving withdrawn gates waiting keeps zombie tasks alive and breaks I1; aborting from outside is not atomic with the record and the seam offers no such operation |
| **One new document family, `kiln.walk`** | the feature's `openGateId`, keyed feature moves and the pending move must be readable by the opening commit and by a fresh reader | the row's checkpoint alone cannot be read or written by a completer's command; a second source of truth beside it is avoided by keeping the walk state in the checkpoint and only the *cross-task* facts here |
| **A fourth check** (`flow`) where r12/r13 said three | FLOW-7 | none; the text that says "three" is updated, never the earlier checks |
| **`Reason` text and the glob dialect are fixed by r14** | determinism of "not applicable" (FR-010/015) | a library matcher is a new pinned dependency; free text cannot be compared byte for byte |
| **Event stream still minimal** (constitution VII, the part r14 does not meet) | the catalog, upcasting and rebuilds are r15 | recording every walk step as a catalogued event now would invent a schema r15 must migrate; r14 adds only the outbox types in data-model §6, each with actor and cause in the commit of its state |
| **The scripted decider is a stand-in** | no surface exists; r13 carried "nothing distinguishes a person from a program" to a later row | deciding it here would pre-empt r19/r20 identity; the record says `script:r14` and the report says no human decided |

## Deviations from the spec made while planning

1. **FR-025** — the spec said `restart` "returns to the gate it was made at"; planning found that lets rebuilt code skip Code review (a `restart` at UI review). It now **re-crosses every gate after the build**, and a Verification reject with no target means *rework on the current code, then the same re-crossing* (R11). Edited in `spec.md`.
2. **FR-070** — "MUST NOT change the r13 gate contract" became "MUST NOT weaken any guarantee…; MAY extend the shape". Edited in `spec.md`.
3. **Deferred items from the clarify pass, now decided:** a re-opened gate is a new round with a new id (R3); the remainder of a `split+revise` is an outbox entry `walk.split` carrying the proposal — nothing edits `ROADMAP.md`; the CLI commands are in [contracts/check-flow.md](./contracts/check-flow.md) §4.
4. **FR-023 ("stops at its checkpoint")** — met by making walk units single-step: a unit's only checkpoint is its end, it is not killed, and the walk ignores the finished result (R6). Written into `spec.md` (FR-023, Clarifications).
5. **FR-027 (new)** — the admission crossing's non-approve outcomes: revise and row edits open round + 1; `reject` ends the walk *not admitted* (R18, matching `the-flow.md`). For r14 the walk's admission gate **is** the Roadmap-gate crossing of the feature; the factory-level `kiln.roadmap` task is untouched and unifying them is r18/r22's.
6. **Late interface discovery is not recorded** — the spec's edge case now says so; surfacing it is the brief's (r20).
7. **Test tiers decided now** (R16): the kill matrix is `*.proof.test.ts` from the start; the default tier is a smoke. Spec Assumptions states that SC-003's evidence is the recorded proof run.
8. **Analysis remediation (2026-10-27)** — kill points are declared in the task that first fires them (so r13's declared-equals-used test never goes red); `keepTriage` became `overrideTriage`; `admit.require` is validated; a reject/re-cross walk is killed too (T065); the check's gate count is a note, not `scanned`.
