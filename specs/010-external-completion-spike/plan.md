# Implementation Plan: Spike — completing a waiting task from outside (row r42)

**Branch**: `010-external-completion-spike` | **Date**: 2026-10-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-external-completion-spike/spec.md` (clarified 2026-10-25: harness outside `kiln/`, Pi Durable 1.4.0 exactly, two-working-day time box).

**Status**: Plan complete through Phase 1 (research, data model, contracts, quickstart). `tasks.md` is the next step (`/speckit-tasks`). Roadmap row **r42** stays `queued`; **nothing here advances or decides a gate**
(constitution VI, FR-011): the report states a verdict, a person records it.

## Summary

r42 answers one question before anything is built on it: *can a person's move, arriving from outside the waiting gate, complete that gate in one atomic commit — keyed exactly once, first move wins, no clock involved, intact across a
kill at any instant — on Pi Durable?* The deliverable is a **spike report** with a verdict (`go` · `go-with-fallback` · `no-go`) and the evidence behind it.

**What desk research already established** ([research.md](./research.md), from reading `@earendil-works/pi-durable@1.4.0`, not running it): the library's atomic-commit handle (`Tx`) can read and create tasks but has **no operation that
completes another task**; a task can wait only on other tasks or on the clock; the only external entry points that touch a task are `abortTask` and `retryTask`; one process owns a storage and there is no cross-process locking.
So the primitive is **not offered under that name**, and the spike tests *compositions*: **C1** an in-process signal into a running phase that commits the move and its own `terminal` in one `runtime.commit` (the preferred native attempt),
**C2** an abort-driven completion, **C3** a keyed write-submission — and, if any guarantee fails, the **fallback**: the decision recorded as a Pi document (F1) or in a table on the shared connection (F2), with the task graph advanced
after and converging on restart. Every strategy implements one **gate-completion port** written in KILN's terms ([contracts/gate-completion-port.md](./contracts/gate-completion-port.md)), and **the same tests run against each** —
that is what makes "the fallback passes the same tests unchanged" checkable.

The evidence is built around **kill-at-every-step**: an *owner* process (opens the store, runs the tasks) is killed with SIGKILL at each named step boundary — deterministically, by a `killPoint(name)` hook — and at random instants;
a fresh owner reopens the file and an **oracle** (invariants I1–I7) decides. An *outside completer* in a **separate process** talks to the owner over a Unix-domain socket. Nothing about this touches `kiln/`.

## Technical Context

**Language/Version**: TypeScript executed directly by Node's type stripping — no build step, as in the rest of the repository. The spike declares `engines.node >=22.19.0` (Pi Durable's own floor). Measured on Node 25.9.0; the declared
floor is verified on 22.19.0 (quickstart §8).

**Primary Dependencies**: `@earendil-works/pi-durable` **1.4.0**, exact pin, **spike directory only** — together with `@earendil-works/pi-ai` and `@earendil-works/chord` at 1.4.0 (also exact; the spike imports them directly, as the library's quick start does); its transitive tree (chord, pi-ai, pi-codemode, pi-telemetry, photon, diff, typebox — each exact-pinned by the package) is fixed by a
committed `package-lock.json`. `node:test`, `node:net`, `node:child_process`, `node:fs`, `node:crypto` from Node. **`kiln/` gains no dependency.**

**Storage**: a local SQLite file per scenario, created in a private temporary directory and removed afterwards (`openNodeSqliteStorage`, WAL, `synchronous = NORMAL` — the library's default). For the fallback table (F2) the same
file through a shared connection. No state is written anywhere durable by the spike except `out/evidence.json`.

**Testing**: `node --test` through a small runner (`src/evidence.ts`) that **refuses to pass vacuously** (zero tests, zero kill points, install mismatch). Scenarios are parametrised over strategies; the harness's own oracle and kill hook
are tested, including a deliberately broken strategy that must be caught.

**Target Platform**: macOS (as r12; the report says so). POSIX paths and a Unix-domain socket; Windows is not a target.

**Project Type**: a time-boxed experiment (library harness + CLI evidence runner) in a new top-level directory; it produces a document, not product code.

**Performance Goals**: none. Wall-clock budget only: the full evidence run completes in minutes on a laptop (hundreds of kills at tens of milliseconds each); the time box is two working days of effort.

**Constraints**: the **two-working-day time box**; local only (no network except the one `npm ci`, recorded; tests use a Unix socket and no model); the owner is killed with SIGKILL (abrupt); `legacy/` byte-identical; `kiln/` and its three
checks untouched; `specs/ROADMAP.md` untouched by this row; nothing from the spike is product code unless the report says so.

**Scale/Scope**: 4 strategies (3 native attempts + the fallback in two variants, tried in order and stopped when a native strategy holds everything), ~10 kill points per strategy, ≥ 100 repeats and ≥ 100 competitors per strategy, a few
hundred random kills per strategy, one report, one upstream-proposal draft (if needed). ~25 source files (3 of them the report/evidence machinery), 12 test files, 64 tasks ([tasks.md](./tasks.md)).

No `NEEDS CLARIFICATION` remains.

## Constitution Check

*GATE: passed before Phase 0 and re-checked after Phase 1 design (below). Constitution **v2.1.0**.*

| Principle | Applies to r42? | Evaluation |
|---|---|---|
| **I** Author/judge separation | no | **N/A.** No model, no judge runs |
| **II** Every judge on the strongest model | no | **N/A** |
| **III** One lane per factory | no | **N/A.** The spike has no lane; one owner process per store |
| **IV** Affinity is the cost lever | no | **N/A** |
| **V** A missing person never approves | **core** | **Pass — it is the thing under test.** Guarantees (d) and (e) and invariants I6/I7: a kill, a restart, an elapsed clock or the restart limit must never settle a gate; a move with no decider is refused |
| **VI** The Roadmap gate is human-only | yes | **Pass.** The report states a verdict; it records no gate decision and edits no roadmap (FR-011, SC-008). A `no-go` re-opens the gate — a person's move |
| **VII** Everything is recorded | yes | **Pass, scoped.** The spike's record is its evidence and report; adopting the dependency is a **recorded decision** (pinned, lockfile, the report). The domain event stream is r15's |
| **VIII** Local by default | yes | **Pass.** Tests use a private Unix-domain socket and local files; no network, no model. Acquiring the dependency is the one network act (`npm ci`), recorded |
| **IX** One committed state; surfaces driven by events | partly | **Pass.** The oracle reads state from the store only; `state()` is never answered from memory (guarantee e) |
| **X** Knowledge is context, never authority | no | **N/A** |
| **XI** A factory is portable | no | **N/A** (the report notes the one-owner-per-storage rule for r13) |
| **XII** Workshops are sovereign | no | **N/A** |
| **Dependencies** | **core** | **Pass, by design.** "Every dependency is pinned, its adoption is a recorded decision, and it is reached through one seam." The spike pins exactly, locks the tree, keeps the dependency **outside `kiln/`**, and the port is the seam's contract. Adoption into the product is **r13's decision**, taken on the report |
| **The Flow** | yes | **Pass.** r42 is a row, walked through the standard flow; its Roadmap-gate effects are the human's |

No violation; **Complexity Tracking** is empty.

## Project Structure

### Documentation (this feature)

```text
specs/010-external-completion-spike/
├── spec.md              # the feature (clarified 2026-10-25)
├── plan.md              # this file
├── research.md          # Phase 0: what Pi Durable 1.4.0 declares, candidate compositions, kill method
├── data-model.md        # Phase 1: domain entities, state machine, invariants I1–I7, evidence entities
├── quickstart.md        # Phase 1: how to prove it works end to end
├── contracts/           # Phase 1: the gate-completion port, the report, the evidence command
├── checklists/requirements.md
├── tasks.md             # Phase 2 (/speckit-tasks — NOT created by this command)
└── spike-report.md      # the product of the row — written during implementation
```

### Source code (repository root)

```text
spikes/r42/                              # NEW, outside kiln/ — the harness (not product code)
├── package.json                         # private; engines >=22.19.0; dependency pinned EXACTLY; scripts: evidence · test · kill-list · report-check · smoke
├── package-lock.json                    # committed — the recorded decision (integrity + transitive pins)
├── README.md                            # what this is, how to run it, "not product code"
├── TIMEBOX.md                           # start instant, a checkpoint per phase, end instant
├── upstream-proposal.md                 # DRAFT, not filed — present only if the verdict is go-with-fallback
├── NOTES.md                             # the running lab notebook — what was tried and observed (feeds report §3)
├── src/
│   ├── smoke.ts                         # loads the pinned package, opens/closes a store; prints versions
│   ├── port.ts                          # the gate-completion port: types and the Outcome/Refusal codes (KILN terms only)
│   ├── kill.ts                          # killPoint(name): SIGKILL self when KILL_AT=name
│   ├── strategy.ts                      # the Strategy interface + lazy loadStrategy(name)
│   ├── owner.ts                         # the owner process: opens the store, builds the strategy, serves a Unix socket
│   ├── client.ts                        # the outside completer: a separate process, sends open/submit/state
│   ├── harness.ts                       # test helpers: start/kill/restart owners, private temp stores
│   ├── invariants.ts                    # I1–I7 over an Inspection (pure) 
│   ├── status.ts · verdict.ts · table.ts · install-check.ts   # status rules, verdict rules, rendering, install guard
│   ├── scenarios/                       # strategy-agnostic: kill-point · random-kill · no-clock · exactly-once · different-process
│   ├── evidence.ts                      # the runner: never-vacuous rules, out/evidence.json, the printed table
│   ├── report-check.ts                  # report ⇄ evidence consistency; no library names in the contract (SC-001, SC-009)
│   └── strategies/
│       ├── control-sqlite.ts            # test-only: a CORRECT single-transaction reference (proves the harness can say "held")
│       ├── broken-two-commit.ts         # test-only: records then completes in two commits (the oracle must catch it)
│       ├── native-signal.ts             # C1 — signal into a running phase, one runtime.commit
│       ├── native-abort.ts              # C2 — sleeping decision task + abortTask
│       ├── native-submission.ts         # C3 — keyed write-submission (only if C1/C2 leave a gap)
│       ├── fallback-document.ts         # F1 — decision as a Pi document; task advanced after, converging on restart
│       └── fallback-table.ts            # F2 — decision as a row on the shared connection
├── tests/
│   ├── kill-hook.test.ts · oracle.test.ts · owner-client.test.ts      # the harness itself
│   ├── status.test.ts · verdict.test.ts · never-vacuous.test.ts       # the evidence rules
│   ├── kill-points.test.ts · kill-random.test.ts · no-clock.test.ts   # guarantees a, d, e
│   ├── exactly-once.test.ts · different-process.test.ts               # guarantees b, c; the outside completer
│   └── fallback-parity.test.ts          # every strategy runs the identical scenarios; no strategy-name branches
└── out/                                 # git-ignored: evidence.json

kiln/        # UNCHANGED — still dependency-free; its three checks and 184 + 500 tests are the SC-008 control
legacy/      # UNCHANGED — byte-identical
.gitignore   # + spikes/r42/node_modules/  spikes/r42/out/
```

**Structure Decision.** A single new top-level directory `spikes/r42/` with its own `package.json`, so the product tree keeps its zero-dependency, nothing-to-install guarantees while the answer is found (spec Clarification 1). The harness reuses the repository's
conventions — TypeScript by type stripping, `node:test`, never-vacuous runners — but imports nothing from `kiln/`. The port lives in the spike, in KILN's terms; r13 will recreate it in `kiln/packages/durable` (the single seam) from the report,
not by copying spike code (FR-012). `spikes/` is not scanned by `kiln check` (its roots are `packages/*` and `checks/` under `kiln/`), which is **verified, not assumed**, by SC-008.

## Design decisions at a glance

| # | Decision | Why (research) |
|---|---|---|
| D1 | One **port** (`open` · `submit` · `state`), every strategy implements it, **one suite** runs against all | FR-007/SC-005 become checkable; the contract outlives the API (CORE-6) — R3, R4 |
| D2 | Try **C1 first**, then C2, then (if a gap remains) C3, then the fallback F1, then F2; stop trying strategies once a native one holds a–e *and* the different-process case | time box; the report still states what was not tried and why — R3, R10 |
| D3 | **Owner process + outside client over a Unix-domain socket** | one process owns a storage, no cross-process locking — R5 |
| D4 | **Two kill methods**: named points (the proof) + random instants (supporting evidence) | a named point cannot reach the library's interior; randomness cannot prove absence — R6 |
| D5 | An **oracle on the reopened store** (I1–I7), never on memory | guarantee (e); constitution IX — R6 |
| D6 | **`restartLimit: Infinity`** in the harness, and a dedicated scenario that kills > 5 times | the library's default parks a task after 5 consecutive cuts — R3 (C1 c) |
| D7 | The evidence **derives** statuses; **held** needs scenarios that *ran* | never-vacuous (FR-013) — R8 |
| D8 | A **deliberately broken strategy** (two commits) in the harness's own tests | proves the oracle can fail — the same discipline as r12's falsifiable checks |
| D9 | The spike **reports `not-held`; it does not fail on it** (exit code means "I examined something") | a spike's job is to find out, not to be green |
| D10 | `upstream-proposal.md` is **drafted, never filed**; filing needs a person | FR-007 |

## Implementation phases (the shape `/speckit-tasks` will expand)

Sized to the two-working-day box ([research.md](./research.md) R10); a `TIMEBOX.md` checkpoint after each. *If the box ends, work stops and the report lists what is unproven (FR-009).*

| Phase | Work | Budget | Done when |
|---|---|---|---|
| **P0 — Setup and pin** | `spikes/r42/` skeleton; `package.json` with the exact pin; `npm ci`; `.gitignore`; `TIMEBOX.md` starts; record name/version/integrity; verify `kiln check` + suites unchanged (the SC-008 control, before) | ~0.25 d | `evidence-install-mismatch` can fire and doesn't; the "before" numbers are written down |
| **P1 — Port, owner, client, oracle, kill hook** | `port.ts`, `kill.ts`, `owner.ts`, `client.ts`, `invariants.ts`, `evidence.ts` skeleton; `broken-two-commit.ts`; the oracle and hook tests | ~0.5 d | the oracle catches the broken strategy (I3); a killed owner leaves a store a fresh owner can reopen |
| **P2 — Native strategies and the guarantees** | `native-signal` (C1) and its kill points; scenarios a–e; different-process; exactly-once at 100/100; no-clock; restart-limit; then `native-abort` (C2); `native-submission` (C3) only if a gap remains | ~0.75 d | every scenario kind runs for C1 and C2 and produces statuses |
| **P3 — Fallback (only if a guarantee is `not-held`/`not-proven` natively)** | `fallback-document` (F1), then `fallback-table` (F2) if F1 fails; the same tests unchanged; draft `upstream-proposal.md` | ~0.25 d | a–e `held` on a fallback, or the report says why none does |
| **P4 — The report** | derive the table from `out/evidence.json`; write the ten sections; the contract for r13; the findings (Node floor 22.19, tree, restart limit, owner rule, power-loss); fate of the code; the SC-008 control "after"; check on Node 22.19 | ~0.25 d | `spike-report.md` states one verdict; every status matches the evidence; the control equals the "before" |

## Requirement traceability

| Requirement | Design element | Verified by |
|---|---|---|
| FR-001 verdict + version | `spike-report.md` §1; `Evidence.pi-durable` | quickstart §6; report checked against `out/evidence.json` |
| FR-002 five guarantees, graded | `scenarios.ts` per guarantee; `GuaranteeStatus` rules | quickstart §2; `guarantees.test.ts` |
| FR-003 kill at every enumerated point, none ⇒ fail | `kill.ts`, `strategy.killPoints`, `evidence-zero-kill-points` | `kill-points.test.ts`, `never-vacuous.test.ts` |
| FR-004 different process; many repeats/competitors | `owner.ts`/`client.ts`; `exactly-once.test.ts` | `different-process.test.ts`, SC-003 counts |
| FR-005 repeat vs conflict | port outcomes `repeat`, `refused(key-conflict)` | `exactly-once.test.ts` |
| FR-006 stale/loser refused, store unchanged | `refused(stale\|lost-race)`; I4 | `guarantees.test.ts` (c) |
| FR-007 fallback under the same tests; proposal drafted not filed | one suite over strategies; `upstream-proposal.md` | quickstart §5 |
| FR-008 contract in KILN terms | `contracts/gate-completion-port.md`, report §5 | report review (SC-009): no library name in the contract |
| FR-009 time box | `TIMEBOX.md`; report §10 | the dates; "not proven" when the box ends |
| FR-010 outside `kiln/`, pinned, checks unchanged | `spikes/r42/`, exact pin, lockfile | quickstart §0, §7; SC-008 control |
| FR-011 no legacy/roadmap edit, no network in tests | no imports of `kiln/`/`legacy/`; Unix socket only | `git diff` empty for `legacy kiln specs/ROADMAP.md`; code review |
| FR-012 fate of the code | report §8; default "nothing" | report review |
| FR-013 one command, honest about not running | `npm run evidence`; `evidence-*` failures | quickstart §1–§4 |
| SC-001 … SC-009 | see [quickstart.md](./quickstart.md) §0–§8 | each scenario names its SC |

## Verification

1. The harness's own tests prove the **oracle can fail** (the broken strategy), the **kill hook is abrupt**, and the **never-vacuous rules fire**.
2. `npm run evidence` on a fresh clone after `npm ci` (quickstart §1–§5).
3. The SC-008 control: `kiln` `npm test` and `npm run check` and `git diff --stat -- legacy kiln specs/ROADMAP.md` **before** (P0) and **after** (P4) — equal.
4. The Node floor: the evidence on 22.19.0 (quickstart §8).
5. A review of the report against `out/evidence.json` — every status in the report appears there (SC-001) — and of the contract for any library name (SC-009).

## Risks

| # | Risk | Mitigation |
|---|---|---|
| R-1 | **The primitive does not exist natively** (research R2: `Tx` cannot complete a task) — the likely outcome is `go-with-fallback` | planned for: C1 is the attempt, F1/F2 the fallback under the same tests; the verdict follows the evidence either way |
| R-2 | C1 passes on Node but waiting **inside a phase** holds an invocation and the library discourages it (changelog) | report it as a caveat on guarantee (d)/(e) and let the verdict rule decide (`contracts/spike-report.md` §3); test the restart limit explicitly |
| R-3 | **Node floor**: Pi Durable needs ≥ 22.19, `kiln/` declares ^22.18 | the spike runs on its own floor; the finding goes to r13 and the report |
| R-4 | A kill *inside* the library cannot be named | the randomised kills; labelled supporting evidence; the report does not claim a proof there |
| R-5 | The time box ends before the fallback is proven | the order D2 puts native first, fallback second; unproven guarantees are reported as such and the verdict is no more favourable (FR-009) |
| R-6 | Two processes on one file corrupt it (no cross-process lock) | the outside client never opens the file; one negative case documents what happens, for r13 |
| R-7 | `npm ci` fails or the registry changes under the pinned version | lockfile with integrity; `evidence-install-mismatch`; the report records the install |
| R-8 | Flaky timing in the random kills | they are supporting evidence only; the proof is the enumerated points, which are deterministic |

## Complexity Tracking

*Empty — the Constitution Check has no violation.*

## Post-design Constitution Check

Re-checked after Phase 1 (data model, contracts, quickstart): no change. The design adds no dependency to `kiln/`, edits no gate or roadmap, uses no network or model in tests, and keeps the contract free of library names. **Pass.**
