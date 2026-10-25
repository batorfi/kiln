# Implementation Plan: Foundations reset (row r12)

**Branch**: `009-kiln-foundations-reset` | **Date**: 2026-10-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-kiln-foundations-reset/spec.md` (clarified 2026-10-22 and 2026-10-23; three statements corrected
during this planning — see [Findings that changed the spec](#findings-that-changed-the-spec)).

**Status**: Plan complete through Phase 1 (research, data model, contracts, quickstart). `tasks.md` is the next step (`/speckit-tasks`). Roadmap row
**r12** stays `queued`; **nothing here advances or decides a gate** (constitution VI, FR-021).

## Summary

r12 reorganises the repository around the restart's design **without adding behaviour**: it *moves* the first program's whole tree to a repo-root
`legacy/` (byte-identical, proven by a manifest), *creates* the new `kiln/` codebase as nine packages plus `checks/` (the spec's ten units), wired by a Node `imports` map (no install, no
build), *ports* the keep-list with its tests under the current constitution (v2.1.0, amended 2026-10-25) — the flow as **versioned data** (v1 = the first program's ten-gate rail, v2 = the twelve-gate flow of v2.1.0),
the tier policy with a per-flow judge roster, the validators and schemas, the clock, the pure affinity logic and the network lint — and adds the
checks that make the layout enforceable (`kiln check network | boundaries | legacy`). The test runner runs both suites and switches the live-Pi tier
off through the legacy gate's own off switch when the installed Pi is unmeasured, so the default suite is green here (Pi 1.1.0 vs 0.85.1).

Every design choice was measured before it was written down — the layout on two scratch worktrees, the package wiring on a scratch tree, the flow
versions on the real validator — and the evidence is in [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript executed directly by Node's type stripping — no build step. Node `^22.18.0 || >=23.6.0` (PRD §7). Measured on Node 25.9.0.
The declared floor (22.18) is not installed here; verifying it is task **T-verify** ([research.md](./research.md) R2).

**Primary Dependencies**: **None** (FR-002). Node built-ins only. `node:test` for tests. The boundary check enforces *no bare specifiers* in every package.

**Storage**: Files only — checked-in JSON rule/record files (`boundaries.json`, `network-allowlist.json`, `legacy-manifest.json`, `legacy-copies.json`)
and the JSON schemas. No runtime state is created.

**Testing**: `node --test` through a new runner (`kiln/tests/run.ts`) that also launches the frozen legacy runner. 54 ported cases + new tests (flow, roster,
pure affinity, checks, runner); the 19 deferred cases keep running in legacy. Falsify hooks for every check.

**Target Platform**: macOS first, Linux next (PRD §7). POSIX paths; Windows is not a target of this row.

**Project Type**: Library packages + a small CLI (one command, `kiln check`) in a single repository — a restructuring of an existing codebase.

**Performance Goals**: None beyond "`kiln check` finishes in seconds" — it reads ~170 legacy files and ~100 new source files. No runtime behaviour changes.

**Constraints**: Legacy **byte-identical** to the baseline commit (SC-003); **no runtime dependency**; **no build step**; nothing under `kiln/` imports `legacy/`;
the admitted roadmap and the constitution untouched; every check fails by name and never passes having scanned nothing.

**Scale/Scope**: 168 legacy files moved; 9 packages under `packages/` (5 of them empty, with only a stated responsibility) plus `checks/`; 54 ported test cases + 19 deferred; 3 checks; 2 flow
definitions; 5 rule/record files.

No `NEEDS CLARIFICATION` remains.

## Constitution Check

*GATE: passed before Phase 0 and re-checked after Phase 1 design (below). Constitution **v2.1.0** (re-checked 2026-10-25 after the amendment below).*

| Principle | Applies to r12? | Evaluation |
|---|---|---|
| **I** Author/judge separation | tier policy only | **Pass.** `bindRole`/`isJudge` ported; judges (per roster) bind only to `strongest`; no model runs in this row |
| **II** Every judge on the strongest model | yes | **Pass.** Roster v2 = architecture critic, design critic, code reviewer, UI reviewer, verifier (+ added-gate judges); a weaker binding throws a named error; `docs-synthesizer` is a judge only under v1 (history). Falsified by F7, F8 |
| **III** One lane per factory | affinity logic only | **Pass.** No concurrency introduced; the pure logic ports unchanged |
| **IV** Affinity is the cost lever | partly | **Pass, scoped.** What counts as a swap and the swap counter port unchanged. Pricing and recording swaps live in the lane runtime (`run`), an adapt item — they arrive with r13/r16 (spec FR-010 adjusted, not a violation) |
| **V** A missing person never approves | log validator | **Pass.** The "no silent approval" rule (R3/R4 stream rules) and its 4 negative cases port unchanged |
| **VI** The Roadmap gate is human-only | yes | **Pass.** `specs/ROADMAP.md` untouched (FR-021); `gate0` keeps its six moves and no delegated move; no gate decision recorded |
| **VII** Everything recorded | schemas/validators | **Pass.** Factory-log schema and validators port; the optional `flow` field is additive; committed records are never rewritten; no new state |
| **VIII** Local by default | yes | **Pass.** No dependency, no socket; the network lint ports and gains a never-vacuous negative suite; allowlist starts empty |
| **IX** One committed state; surfaces decide nothing | the CLI | **Pass.** `kiln check` is read-only text; no surface holds state |
| **X–XII** Knowledge / portable / sovereign | no | **N/A.** Nothing touches knowledge, hosts or workshops |
| *Flow invariants* | flow data | **Pass.** v2: Roadmap gate first, Merge last, twelve gates in order, built-in gates present (Experience design and UI review carry a declared `applies_when`, never removed), closed move kinds, `mitigate` never a person's move |
| *Roles & Model Tiers* | roster | **Pass.** Tier rule encoded per roster; configuration files arrive in r17 |
| *Dependencies* | yes | **Pass.** None added; pinned/recorded/one-seam rules prepared in `boundaries.json` (`externals` empty) |
| *Governance* | yes | **Pass.** No amendment needed. **Not violations, recorded for honesty:** duplicated source until legacy retires (NC2-A); PRD §8.2's `kiln/legacy/` sketch amended to `legacy/` (a PRD edit, not a constitution one) |

**Result: no violations; Complexity Tracking below is empty.**

## Findings that changed the spec

Planning measured three things the clarified spec had assumed. Each is corrected in `spec.md` (marked *Adjusted during planning*) and decided here.

| # | The spec said | The code showed | Resolution |
|---|---|---|---|
| **P1** | NC1: the old walks "would fail a v2.0.1-only validator"; SC-008: "the same walks fail flow v2" | v2's move sets are a **superset** of v1's (Code review gains `revise`, nothing is removed). The committed r7 walk passes under **both**. The only record that differs is a Code review `revise`: **fails v1, passes v2** | The versioned-flow decision stands — a record is judged by the rules it was made under, and v1 must keep rejecting what it forbade — but its stated premise was overstated. SC-008 now asserts the real difference. *The cheaper alternative (v2 only, history checked by legacy until r15) remains available to the human; it was an option in NC1.* |
| **P2** | FR-010: the scheduler is ported "swap … priced and recorded" | `scheduler.ts` is half pure functions, half `schedule()`, which calls `run`/`makeLane` from the lane runtime; pricing and recording happen inside `run` | FR-010 now ports the **pure affinity logic** (swap rule, counter, schedule-time guard); `schedule` and the pricing/recording wait for the lane task. Three new tests cover the pure part |
| **P3** | Assumption: legacy at `kiln/legacy/` per PRD §8.2 | Nested one level deeper, the unmodified legacy suite shows 6 failures (3 tests, 3 test files that no longer load); at the old depth it shows 0 | Legacy is **`legacy/` at the repository root**; PRD §8.2 is amended (task T-docs) |

Also found, no spec change: the first program's G3 message prints `allowed: []` (a defect fixed in the ported copy only — R6); the network lint's denylist would flag a
`checks/` module that spawns `git`, so `kiln check legacy` is pure filesystem and the git evidence is a test (R4).

## Amendment 2026-10-25 — flow v2 is the twelve-gate flow (constitution v2.1.0)

`main` gained constitution **2.1.0** while this branch was being built (PR #1, *experience charter*). The human chose **option 1: v2 = the
twelve-gate flow now** (recorded in this branch's history). What changes, and what does not:

| # | Decision | Consequence |
|---|---|---|
| **A1** | v2 = Roadmap gate + 11 feature gates: Concept, **Architecture**, **Experience design**, Specification, Work plan, Implementation, Code review, **UI review**, Verification, Documentation, Merge | `data-model.md` §2 and `contracts/flow-and-records.md` §2 rewritten; F1 covers twelve gates |
| **A2** | New internal keys `2a-experience` and `6a-ui-review`; existing keys unchanged; the plain name of `2-architecture` is **Architecture** (was *Design*) in v2 (v1 keeps `architecture`) | `GateKey`/`GateId`/`GATE_KEY_OF` gain two entries. `GateId` gains the string ids `"2a"` and `"6a"` (they cannot be integers without renumbering the first program's 1…9) |
| **A3** | Moves: Experience design `approve · revise · reject`; UI review `approve · revise · restart` (from `ui-flow.md` §4.4, §5.4). "Approve with note" is an *approve* with a required note — a label, not a new kind, so the closed set of move kinds is unchanged | no new `MoveKind` |
| **A4** | Roster v2 = architecture-critic, design-critic, code-reviewer, ui-reviewer, verifier (constitution II). `docs-synthesizer` is not a judge; `ux-designer` is a producer; `ui-checker` is a deterministic check, not a model role, so it is on the gate (`check`) and not in the roster | F7/F8 cover the five judges |
| **A5** | `applies_when` is **declared as data** on the two gates (`paths`, `labels`, `journeys` / `diff`), mirroring `ui-flow.md` §4.1/§5.1; **no evaluation** in r12 | r14 evaluates it and records *not applicable*; r15 records `gate.not_applicable`. The shape is the only coupling |
| **A6** | Flow v1 has no `2a`/`6a`: `hasGate("2a","v1")` is false, `moveAllowed` is false, `moveVocabulary` throws a named error; the log validator reports it as a G3 failure naming gate and flow | the factory-log `gate` field (new schema copy only) admits `"2a"` and `"6a"`; legacy's schema is untouched |
| **A7** | The committed walks (gates 1…9) still pass under v1 **and** v2: v2 contains v1's gates, and its move sets contain v1's | SC-008 unchanged in meaning |
| **A8** | Out of scope here: the experience charter and design-system artifacts, `kiln check design-system` and `foundations`, evaluating `applies_when`, the *not applicable* outcome, triage-skip behaviour, `ROADMAP.md` (its rows were updated by the human's request in `60a2c7e` as `edit-rows` text, proposed for the next Roadmap gate — FR-021), the PRD's WORK-2 line (done in `60a2c7e`, T080) | listed in `verification-report.md` as known follow-ups |

Tasks affected: T008 and T009 (completed — their code is amended), T012, T048–T054, T055, T056, T058, T080–T082. Measured impact on the work already
done: v1 data and `bindRole` unchanged (parity script, 0 mismatches before and after).

## Project Structure

### Documentation (this feature)

```text
specs/009-kiln-foundations-reset/
├── spec.md                 # the specification (clarified; adjusted during planning)
├── plan.md                 # this file
├── research.md             # Phase 0 — decisions R1–R16 with measurements
├── data-model.md           # Phase 1 — flow, roster, manifest, copy record, rules, results
├── quickstart.md           # Phase 1 — runnable validation scenarios
├── contracts/
│   ├── README.md           # index + the stable failure names
│   ├── cli-check.md        # `kiln check`
│   ├── flow-and-records.md # flow API, the `flow` field, validators, the v2 gate-rail table
│   ├── boundaries.md       # boundaries.json and its checks
│   ├── legacy-identity.md  # manifest, copy record, what stays running
│   └── runner.md           # the test runner and the Pi tier decision
├── checklists/requirements.md
└── tasks.md                # Phase 2 — /speckit-tasks (NOT created by this command)
```

### Source Code (repository root)

```text
legacy/                                   # MOVED (git mv kiln legacy) — the first program, byte-identical; same depth as the old kiln/
├── contracts/ fixtures/ factory-log/ pi/ schemas/ src/ tests/ ui/ validate/
├── ROADMAP.md  index.ts  package.json  tsconfig.json
└── (nothing added, nothing edited — proven by checks/legacy-manifest.json)

kiln/                                     # NEW
├── package.json                          # "imports": #contracts/* #record/* #lane/* #cli/* #checks/* … ; scripts: test, test:new, test:legacy, kiln, check, validate:log, validate:roadmap
├── tsconfig.json                         # editor support; noEmit; mirrors the imports map
├── packages/
│   ├── contracts/                        # pure, no I/O
│   │   ├── kiln.json                     # responsibility
│   │   ├── gate-rail.md                  # the v2 contract (FR-019); points to legacy/contracts/gate-rail.md for v1
│   │   ├── schemas/{factory-log,roadmap}.schema.json
│   │   ├── src/{moves.ts, types.ts, roles.ts, flow/{index.ts, v1.ts, v2.ts}}
│   │   └── tests/                        # gate-rail (6, ported), strongest-model (5, ported), flow-vs-constitution, roster v2, …
│   ├── record/
│   │   ├── package.json
│   │   ├── src/{validate-core.ts, log.ts, roadmap.ts, report.ts, clock.ts}
│   │   └── tests/                        # log (9), roadmap (3), no-silent-approval (4), roadmap-m3 (7) — ported; fixtures/roadmap-blank.md
│   ├── lane/
│   │   ├── package.json
│   │   ├── src/{types.ts, affinity.ts}   # WorkUnit; switchCount, bindAll, judgeUnitsBoundStrongest (the pure part of scheduler.ts)
│   │   └── tests/                        # 3 new
│   ├── durable/ workers/ director/ server/ web/    # kiln.json only — responsibility stated, nothing else yet
│   └── cli/
│       ├── package.json
│       ├── src/main.ts                   # `kiln check [name…] [--json]`
│       └── tests/
├── checks/
│   ├── kiln.json                         # responsibility (checks is the tenth unit of FR-001)
│   ├── lex.ts                            # the tokenizer (from _netscan.ts), shared by the network lint and the boundary check
│   ├── network-lint.ts  loopback.ts  network-allowlist.json       # the first program's lint, ported; allowlist empty
│   ├── boundaries.ts    boundaries.json
│   ├── legacy-identity.ts  legacy-manifest.json  legacy-copies.json
│   ├── index.ts                          # the registry `kiln check` uses
│   └── tests/                            # bypass (7), hardened (7), strictly-stronger (3), untouched (3) — ported; + boundaries, legacy, legacy-baseline
├── fixtures/                             # r7-live-inference.jsonl, r7-live-broken.jsonl, r7-live-inference.meta.json (copies)
└── tests/{run.ts, measured-pi.ts, pi-tier.ts, runner/*.test.ts, tools/{make-legacy-manifest.ts, count-ported.ts}}   # tools/ spawns git: outside the lint's scan roots
```

**Structure Decision**: a repo-root `legacy/` beside a new `kiln/` (research R1, with measurements); packages wired by a single `imports` map in `kiln/package.json` (R2);
responsibilities in each package's `package.json` (R3); rule and record files in `kiln/checks/` (R4, R5, R9, R10). `agents/` is not created — it arrives with role files in r17.

## Design decisions at a glance

| # | Decision | Where decided |
|---|---|---|
| D1 | `legacy/` at the repo root; `git mv kiln legacy` in a move-only commit | R1, R15 |
| D2 | `imports` map, no install/build; packages declare responsibility in `kiln.json` | R2, R3 |
| D3 | Byte-identity by a manifest from the baseline's git blobs; `kiln check legacy` is pure filesystem; the git cross-check is a test | R4 |
| D4 | Duplication recorded in `legacy-copies.json`; ported files may differ | R5 |
| D5 | Flow v1/v2 as frozen data; optional `flow` on `gate-completion`; absent ⇒ v1; validators resolve per record | R6 |
| D6 | The judge roster belongs to the flow version; `bindRole` takes the roster | R7 |
| D7 | `scheduler.ts` splits: pure logic ported to `lane`, `schedule` waits | R8 |
| D8 | Network lint ported over `packages/*/src` and `checks/*.ts`; allowlist `[]`; loopback helper copied | R9 |
| D9 | One rule file for boundaries; no bare specifiers in r12; legacy unimportable | R10 |
| D10 | One runner for both suites; `decidePiTier` pure; measured list one constant, equality-tested against legacy | R11 |
| D11 | `kiln` via npm scripts and `node packages/cli/src/main.ts`; no `bin` until the installer (r32) | R12 |
| D12 | 54 ported / 19 wait, by file; wait items listed with the row that ports them | R13 |

## Implementation phases (the shape `/speckit-tasks` will expand)

Order matters; each phase leaves the repository green.

| Phase | Work | Proves |
|---|---|---|
| **P0 Baseline** | record the baseline commit, tree id and the starting suite numbers in `baseline.md`; **the manifest itself is generated right after P1** from the baseline commit's git blobs — the new `kiln/` cannot hold the generator until the old one has moved, and git objects are unaffected by the move, so the manifest stays independent of it | the starting point is on record |
| **P1 Move** | `git mv kiln legacy`; `.gitignore` patterns for `legacy/factory-log`; **no content change**; run the legacy suite (`KILN_PI=0`) | US2.1: 168 renames; 500 tests, 0 failures (measured) |
| **P2 Scaffold** | `kiln/package.json` with the `imports` map, `tsconfig.json`, the ten `kiln.json` files (responsibility), empty-package skeletons | FR-001, FR-002; US1.2 |
| **P3 contracts** | port `move-vocabulary` → flow v1/v2, roles/roster, types, schemas; ported `gate-rail` (6) and `strongest-model` (5) tests; new v2 / roster / constitution-and-PRD tests; write `gate-rail.md` (v2) | US3; SC-004, SC-005 |
| **P4 record** | port `_core`, `log`, `roadmap`, `_report`, `clock`; the `flow` field and per-record resolution; ported `log` (9), `roadmap` (3), `no-silent-approval` (4), `roadmap-m3` (7) cases; fixtures; G3 message fix | US3.3; FR-011..014; SC-008 |
| **P5 lane (pure)** | `types.ts`, `affinity.ts`; three new tests | FR-010 (adjusted) |
| **P6 checks** | port the network lint (+ `loopback.ts`, allowlist) and its 20 cases; `boundaries.ts` + `boundaries.json` + tests; `legacy-identity.ts` + `legacy-copies.json` + tests (incl. the git baseline test); `checks/index.ts` | US4, US5, US2.1; SC-003, SC-006, SC-007 |
| **P7 cli** | `kiln check [name…] [--json]`, exit codes, report format; tests | FR-016, FR-017, FR-018 |
| **P8 runner** | `tests/run.ts` (both suites, zero-test refusal), `measured-pi.ts`, `decidePiTier`; runner tests incl. the stub `pi` and the equality test | US2.2–2.4; SC-001 |
| **P9 docs** | README commands and paths; PRD §8.2/§10 amended; `kiln-v1` explainer §5.2; `legacy-copies.json` completed; `specs/explainers/r12-*.md` | spec edge cases; the PRD amendment (P3) |
| **P10 Verify** | quickstart scenarios 0–7 on a fresh clone; the Node 22.18 run; the SC table below | all SC |

## Requirement traceability

| FR | Realised by | Phase |
|---|---|---|
| FR-001 layout, responsibilities | nine packages + `checks/`, each `kiln.json` `responsibility`; `boundary-responsibility-missing` | P2 |
| FR-002 runtime, no dependency | `imports` map; `externals: {}`; `boundary-bare-specifier` | P2, P6 |
| FR-003 one runner, refuses zero tests | `kiln/tests/run.ts` ([runner.md](./contracts/runner.md)) | P8 |
| FR-004 legacy byte-identical + copy record | `git mv`; `legacy-manifest.json`; `legacy-copies.json`; `kiln check legacy` | P0, P1, P6 |
| FR-005 legacy tests keep running | the runner launches the frozen legacy runner | P8 |
| FR-006 Pi tier skips on an unmeasured Pi | `decidePiTier` → `KILN_PI=0`; equality test on the measured list | P8 |
| FR-007 flow as versioned data | `contracts/src/flow/{v1,v2}.ts` | P3 |
| FR-008 per-gate moves from the closed set | v2 data + F1/F2 | P3 |
| FR-009 judges on the strongest model | `roles.ts` + roster; F7/F8 | P3 |
| FR-010 pure affinity logic | `lane/src/affinity.ts` (adjusted) | P5 |
| FR-011 schemas, validators, report | `record/src/*`, `contracts/schemas/*` | P3, P4 |
| FR-012 validate against the record's flow | `flow` field, per-record resolution; F4–F6 | P4 |
| FR-013 deterministic clock | `record/src/clock.ts` | P4 |
| FR-014 committed walks kept | `kiln/fixtures/` copies; legacy copies untouched | P4 |
| FR-015 tests travel; none dropped | census R13; 54 ported, 19 `wait` records | P3–P6 |
| FR-016 network lint via `kiln check` | `checks/network-lint.ts`; allowlist `[]` | P6, P7 |
| FR-017 boundary check | `checks/boundaries.ts` + `boundaries.json` | P6, P7 |
| FR-018 every check fails by name | stable codes ([contracts/README.md](./contracts/README.md)); falsify hooks | P6, P7 |
| FR-019 gate-rail contract superseded | `contracts/gate-rail.md` (v2), legacy file stays | P3, P9 |
| FR-020 WORK-2 as corrected | roster v2; PRD already corrected 2026-10-22 | P3 |
| FR-021 roadmap and gates untouched | no task edits `specs/ROADMAP.md`; quickstart "Done when" | all |

## Verification

| Criterion | Settled by | Verified |
|---|---|---|
| **SC-001** 0 failures with an unmeasured Pi and with the measured Pi | quickstart §1; runner tests R2/R3/R7; the legacy suite through the new runner | ✔ (measured-Pi half stub-tested) |
| **SC-002** ≥ 54 ported cases; all 73 pass | the census ([research R13](./research.md)); per-file counts in each phase's commit; legacy still runs all 73 | ✔ 54 of 54, 19 of 19 |
| **SC-003** 100% of legacy byte-identical | `kiln check legacy` (L1–L5); baseline test (L6) | ✔ |
| **SC-004** flow data matches v2.1.0 for all twelve gates | contract tests F1, F2 (read the constitution, the PRD and `docs/concepts/ui-flow.md`) | ✔ twelve gates |
| **SC-005** a weaker judge binding refused 100% (each of the five v2 judges); `docs-synthesizer` never a judge under v2 | F7, F8 | ✔ |
| **SC-006** the lint catches every disallowed construct; fails on zero files | bypass/hardened ports + the negative suite; quickstart §4 | ✔ |
| **SC-007** the boundary check catches every forbidden import | B1–B10; quickstart §5 | ✔ |
| **SC-008** committed walks pass v1 (and v2); a Code review `revise` fails v1, passes v2 | F3–F6; quickstart §3 | ✔ |

## Risks

| Risk | Likelihood · impact | Mitigation |
|---|---|---|
| Node 22.18 (the declared floor) behaves differently from 25.9 for `imports` + type stripping | low · medium | T-verify with `npx -y node@22.18.0`; fallback = relative cross-package imports (specifier change only) |
| README edits break a legacy test (`readme-pi-version` reads README) | medium · low | run the legacy suite after every README change; keep the measured-Pi sentence |
| Legacy tests that read the live repo (`status.test.ts` reads `specs/ROADMAP.md`) react to later roadmap edits | low · low | the tests derive expectations from the file itself; passes today with 41 rows; re-run when the human changes the roadmap |
| Review size: 168 renames + new code in one branch | medium · low | move-only commit first; one commit per package; `git log -C` links copies |
| `imports` specifier typos are not type-checked (no `tsc` in the loop) | medium · low | the boundary check and the tests resolve every specifier; `tsconfig.json` mirrors the map for editors |
| `pi --version` output format changes | low · medium | the runner copies the first program's parser; the stub-`pi` tests pin the format |
| The deferred 19 cases are forgotten | low · medium | listed by file with `portedBy` in `legacy-copies.json`; `kiln check legacy` fails if a record is incomplete |

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

*None — the Constitution Check found no violations.* (Accepted costs, not violations: duplicated source until legacy is retired, recorded in
`legacy-copies.json`; the PRD §8.2 layout sketch amended.)

## Post-design Constitution Check

Re-evaluated against the Phase 1 artifacts: the data model adds only static, checked-in structures and one optional record field; the contracts add one read-only command
and one runner; no principle's evaluation changed. **Still no violations.**

## Implementation notes (2026-10-25)

What was built differs from the plan above in the ways listed here; each has its reason, and none changes a requirement.

| # | Plan said | Built | Why |
|---|---|---|---|
| 1 | each package states its responsibility in its `package.json` | in a `kiln.json` (nine packages and `checks/`) | a `package.json` in a package directory would make Node treat it as a package boundary for the `imports` map (research R3, decided before coding) |
| 2 | the manifest generated at P0 | generated right after the move, from the baseline commit's blobs, by `kiln/tests/tools/make-legacy-manifest.ts` | the new `kiln/` could not hold the generator until the old one had moved; git objects are unaffected by the move |
| 3 | flow v2 = constitution v2.0.1, ten gates | **twelve gates**, five judges, `applies_when` declared (Amendment 2026-10-25, A1–A8) | constitution v2.1.0 landed on `main` mid-row; the human chose v2 = the twelve-gate flow |
| 4 | one default flow constant | `CURRENT_FLOW` (v2, for calls) and `DEFAULT_RECORD_FLOW` (v1, for records) | code-review finding 3: a single default would have silently judged history by v2 |
| 5 | `weakerBindingRejected` returns true when a binding throws | returns true only for `TierPolicyError`; anything else rethrows | code-review finding 2 |
| 6 | the CLI's entry guard unspecified | `record/src/entry.ts` (`isEntryPoint`: realpath on both sides), used by the CLI, both validators and the manifest generator | `import.meta.main` is missing on Node 23.x/24.0–24.1; the first program's `argv[1] === import.meta.url` idiom fails through a symlinked path (macOS temp dirs) — both would exit 0 silently |
| 7 | `validateLog(text)` | the first program's API kept: `validateLog(records, schema?, options?)`, `validateLogFile(path, …)`; `nameMove` in `report.ts` now names the flow | keeps the ported tests' call sites; the contract was corrected |
| 8 | `checks/legacy-identity.ts` takes a root | `checkLegacy({legacyDir?, kilnDir?, manifest?, copies?})` | lets tests tamper with a temporary copy; the CLI test runs from a copy of `kiln/` + `legacy/` |
| 9 | the runner has `--new-only`, forwarded flags | also `--legacy-only`, exclusive flags, unknown flags exit 2, `KILN_LEGACY_RUNNER` (a probe for the runner's own tests), `NODE_TEST_CONTEXT` stripped for nested runs | the legacy suite takes ~35 s; the runner's tests must observe the Pi decision without running it three times |
| 10 | the lint keeps the first program's "alias" rule whole | `globalThis[…]` is `network-computed`; `#…` imports are internal; imports are read from an offset-aligned `masked` view; the one-entry allowlist rule and the Pi-driver exemption dropped | the task and quickstart name `network-computed`; the new tree uses the imports map; B7 needs a statement inside a string not to be read as an import |
| 11 | failure names of the contracts | added: `legacy-manifest-invalid`, `network-external-dependency`, `network-nonloopback-url`, `network-allowlist-invalid`, `boundary-rules-invalid`, `check-not-registered` | every failure path must have a name; documented in the contracts |
| 12 | copy-record shape | `cases` added to `wait` records (the 19 are summed from it) | lets `kiln check legacy` and the census tool state the 19 without reading legacy tests |
| 13 | phases P0–P10 in one order | built by user story (US1…US5), then polish | the tasks' organisation; every phase still left the repository green except between T019 and T031, when `npm test` in `kiln/` had no runner yet |
| 14 | tests listed per package | more tests than planned: 170+ new/ported in the new suite (the plan counted 54 ported + a few new) | every check has a falsify hook and every new module a mutation-checked test |

Not done in this row, by design: evaluating `applies_when`, the *not applicable* outcome, the experience charter and design-system artifacts, `kiln check flow` (r14), `agents/` (r17).

