# Implementation report: Foundations reset (row r12)

**Branch**: `009-kiln-foundations-reset` | **Report date**: 2026-10-25 | **Head**: `719ee13` | **Base**: `main` @ `299b0a5`
**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Tasks**: [tasks.md](./tasks.md) · **Baseline log**: [baseline.md](./baseline.md)
**Companion**: [code-review-report.md](./code-review-report.md)

## 1. Status in one paragraph

**20 of 87 tasks were done when this report was first written (T001–T019 and T080); US1 (T020–T033) has since been completed — see §11.** Originally: **Phase 1 (Setup, T001–T004) and Phase 2 (Foundational, T005–T019).** The move is complete and proven: the first
program's tree now lives in `legacy/`, byte-identical to the baseline, and its suite is green. The new `kiln/` has its skeleton, the contracts base (move
kinds, flow **v1** as data, the tier policy, record types, both JSON schemas), the record core (schema validator, report formatter, clock), the check
registry and a `kiln check` command. **None of the five user stories is started** (Phases 3–7, T020–T077), and neither is Polish (T078–T087). The new
tree has **no tests and no test runner yet**, so `npm test` in `kiln/` does not run (§5). The MVP (US1 + US2) is 28 tasks away.

## 2. Task progress

| Phase | Tasks | Done | State |
|---|---|---|---|
| 1 Setup — baseline and the move | T001–T004 (4) | 4 | **complete** |
| 2 Foundational — skeleton and leaf modules | T005–T019 (15) | 15 | **complete** |
| 3 US1 — new layout, kept rules proven (P1) | T020–T033 (14) | 0 | not started |
| 4 US2 — legacy frozen and verifiable (P1) | T034–T047 (14) | 0 | not started |
| 5 US3 — flow v2 and judges as data (P2) | T048–T058 (11) | 0 | not started |
| 6 US4 — network lint (P2) | T059–T071 (13) | 0 | not started |
| 7 US5 — package boundaries (P3) | T072–T077 (6) | 0 | not started |
| 8 Polish | T078–T087 (10) | 0 | not started |
| **Total** | **87** | **19** | |

The task list's checkboxes agree with the commits (`git log main..HEAD`): T001, T002, T003, T004, T005–T007, T008–T019 each have a commit.

## 3. What was built

### 3.1 The move (T001–T004)

| Item | Result | Evidence |
|---|---|---|
| Baseline recorded | commit `299b0a5`, tree `20a82c7e…`, 168 files, Node 25.9.0, Pi 1.1.0 vs 0.85.1 measured | `baseline.md` |
| Move is pure | `git mv kiln legacy`; 168 renames at 100 %, 0 other | `git diff -M --name-status c4c3892 3298507` |
| Legacy tree identical to baseline | `git rev-parse HEAD:legacy` = `20a82c7e214be256c804f6e8f1cd4cce9c8e9874` = `git rev-parse 299b0a5:kiln` | re-measured 2026-10-25 |
| Legacy suite green | `cd legacy && KILN_PI=0 node tests/run.ts` → **500 tests, 470 pass, 0 fail, 30 skipped** | re-run 2026-10-25, working tree stayed clean |
| Ignore patterns | `legacy/factory-log/*.jsonl|*.log` ignored, `.gitkeep` kept; `kiln/factory-log/` patterns kept | `.gitignore:22-30`, `git check-ignore` |

### 3.2 The new `kiln/` skeleton (T005–T007)

- `kiln/package.json` — `private`, ESM, `engines` `^22.18.0 || >=23.6.0`, **no dependencies**, the `imports` map for nine `#…/*` aliases, and the eight scripts of
  `contracts/runner.md`.
- `kiln/tsconfig.json` — editors only (`noEmit`); equal to `legacy/tsconfig.json` except for whitespace.
- Ten `kiln.json` files (nine packages + `checks/`), each stating one responsibility. The task text says `package.json`; the commit chose `kiln.json` (research R3)
  and `tasks.md` T007 was updated to match.

### 3.3 Contracts base (T008–T014, `kiln/packages/contracts/`)

| File | What it holds | Relation to the first program |
|---|---|---|
| `src/moves.ts` (32 lines) | `MOVE_KINDS` (9, the closed set), `GateKey`, `GateId`, `GATE_KEY_OF`, `FlowVersion` | new, per `data-model.md` §1 |
| `src/flow/types.ts` (34) | `GateDefinition`, `FlowDefinition`, `RoleRoster` | new, per §2–3 |
| `src/flow/v1.ts` (32) | the first program's rail as data: 10 gates, names, judges, cap 2, roster | transcribed from `legacy/contracts/move-vocabulary.ts` + `legacy/src/roles.ts` |
| `src/flow/index.ts` (37) | `flows`, `flowOf`, `moveVocabulary`, `moveAllowed`, `gateName`, `DEFAULT_FLOW`, `MITIGATION_CAP_DEFAULT` | v1 only (v2 arrives in T049–T050) |
| `src/roles.ts` (27) | `Tier`, `isJudge`, `bindRole`, `weakerBindingRejected`; roster is an argument | adapted from `legacy/src/roles.ts`; message now says "judge role" (data-model §3) |
| `src/types.ts` (94) | record and roadmap types | `legacy/src/types.ts` with one import line changed |
| `schemas/*.schema.json` | factory-log and roadmap schemas | byte-identical to `legacy/schemas/` (`cmp`) |

`contracts` imports nothing but its own files and uses no `node:` module (FR: I/O-free).

### 3.4 Record core (T015–T017, `kiln/packages/record/src/`)

`validate-core.ts`, `report.ts`, `clock.ts` — byte-identical copies of `legacy/validate/_core.ts`, `legacy/validate/_report.ts`, `legacy/src/clock.ts` (`cmp`).
The validators themselves (`log.ts`, `roadmap.ts`) are US1 work and do not exist yet.

### 3.5 Check registry and CLI (T018–T019)

- `kiln/checks/index.ts` — `CheckName`, `CheckResult` (data-model §9), `CHECK_NAMES`, an **empty** `registry`, and `runChecks`, which runs every name even if an
  earlier one fails and reports an unregistered name as the failure `check-not-registered`.
- `kiln/packages/cli/src/main.ts` — `kiln check [name…] [--json]`, text blocks in the contract's format, `--json` on one line, exit 0 / 1 / 2.

Behaviour measured on Node 25.9 and 22.18 (no checks are registered, so every check fails closed):

| Invocation | Output | Exit |
|---|---|---|
| `check` | three `FAIL … check-not-registered` blocks | 1 |
| `check legacy --json` | one-line JSON array | 1 |
| `check bogus` | `unknown check "bogus"; known: …` + usage, stderr | 2 |
| *(no command)* | usage, stderr | 2 |
| `check network` from `/tmp` | works from any working directory | 1 |
| `check legacy` on Node 23.6.0 / 24.1.0 | was: no output, exit 0 (code-review finding 1). **Fixed 2026-10-25**; now identical to 22.18 | 1 |

## 4. Requirement and success-criterion coverage

"Delivered" means satisfied and evidenced at head; "Partly" means the groundwork exists; "Open" means no code yet.

| ID | Subject | State | Note |
|---|---|---|---|
| FR-001 | Packages of PRD §8.2 needed now | **Delivered** (structure) | nine packages + `checks/` with responsibilities; boundary *enforcement* is US5 |
| FR-002 | Node floor, no build, no runtime dependency, no bare specifier | **Partly** | no dependency and no bare specifier today; the CLI's `import.meta.main` guard broke the floor on Node 23.6–24.1; fixed 2026-10-25 (code-review finding 1) |
| FR-003 | One way to run the suite, zero-test refusal | Open | `kiln/tests/run.ts` not written (T031) |
| FR-004 | `legacy/` byte-identical | **Delivered** (tree id equal) | the *test* that proves it (T036/T039) is open |
| FR-005 | Legacy tests keep running | **Delivered** from `legacy/`; Open from `kiln/` (T045) |
| FR-006 | Pi tier switched off for unmeasured Pi | Open | T042–T047 |
| FR-007 | Flow versioned data; v1 exact, v2 = constitution | **Partly** | v1 done and measured equal to legacy (0 mismatches over 10 gates × names × moves × roster × cap); v2 open |
| FR-008 | Each gate only its own moves; Code review `approve · revise · restart` | **Partly** | closed set in code; v2 data open |
| FR-009 | Judges bind only to strongest | **Partly** | `bindRole` done, behaviour equal to legacy for all 12 roles × 4 tiers; tests open (T054) |
| FR-010 | Pure affinity logic | Open | T028–T030 |
| FR-011 | Schemas, validators, report ported | **Partly** | schemas, core, report done; `log.ts`/`roadmap.ts` open |
| FR-012 | Records validated under their own flow | Open | T052 |
| FR-013 | Clock ported | **Delivered** | |
| FR-014 | r7 walks kept as fixtures | Open | T022 (`kiln/fixtures/` exists but is empty) |
| FR-015 | Every ported module travels with its tests | **Not yet** | five modules ported, none with tests; they arrive with US1/US3 |
| FR-016–FR-018 | Checks: network, boundaries, never-vacuous | **Partly** | registry and CLI skeleton, fail-closed on an unregistered check; no check exists |
| FR-019 | v2 gate-rail contract | Open | T056 |
| FR-020 | PRD WORK-2 corrected | Done before the row (2026-10-22) | |
| FR-021 | Roadmap untouched, no gate decision | **Delivered** | `git diff main -- specs/ROADMAP.md` is empty |
| SC-001 | Suite green on unmeasured Pi | Open | needs T045 |
| SC-002 | ≥54 ported cases + all 73 accounted | Open | 0 of 54 ported |
| SC-003 | 100 % of legacy bytes identical, by a test | **Measured, not yet a test** | tree id equal today |
| SC-004–SC-008 | Flow/judge/lint/boundary/walk criteria | Open | |

## 5. State of the repository at head

| Question | Answer |
|---|---|
| Is `legacy/` green? | **Yes** — 500 tests, 0 failures with `KILN_PI=0`; 8 live-Pi failures remain if `KILN_PI` is unset (measured at baseline, not re-run today; not a regression) |
| Does `cd kiln && npm test` work? | **No** — `tests/run.ts` does not exist (`MODULE_NOT_FOUND`). `plan.md` says "each phase leaves the repository green"; this is true of `legacy/` only |
| Do `npm run validate:log` / `validate:roadmap` work? | No — `log.ts` and `roadmap.ts` are US1 |
| Does `npm run check` work? | It runs and exits 1: all three checks are unregistered |
| Is the README accurate? | No — it still says `cd kiln/kiln` and lists legacy scripts; scheduled for T078 |
| Are there new tests? | **0** |
| Working tree | clean |

## 6. Departures from the written plan

Recorded here so T082 (the plan's "Implementation notes") has them in one place.

1. **`kiln.json`, not `package.json`, per package** (T007) — decided in research R3; `tasks.md` already reflects it.
2. **`registry` is `Partial<Record<CheckName, …>>`**, not `Record<CheckName, …>` as T018 words it, because it starts empty; `runChecks` adds a failure code,
   `check-not-registered`, that is not in the `cli-check.md` failure list.
3. **`flow/index.ts` already exports `MITIGATION_CAP_DEFAULT`** (T050 lists it) and names its single default `DEFAULT_FLOW` where the contract names two
   (`CURRENT_FLOW`, `DEFAULT_RECORD_FLOW`). Consequence in code-review finding 3.
4. **`weakerBindingRejected` takes an optional fourth parameter** (`extraJudges`) beyond the contract's three — a superset, needed by F8.
5. **`kiln/fixtures/` and `kiln/tests/` exist as empty directories** locally; git does not track them, so a fresh clone lacks them until T022/T031.

## 7. How this was measured

| Claim | Command |
|---|---|
| Legacy tree equals baseline | `git rev-parse HEAD:legacy` vs `git rev-parse 299b0a5:kiln` |
| Legacy suite | `cd legacy && KILN_PI=0 node tests/run.ts` |
| Copies are exact | `cmp` of schemas, `_core`, `_report`, `clock`; `diff` of `types.ts` (one import line) |
| Flow v1 / roles equal legacy | scratch script in `/tmp/r12-review/parity.ts` (outside the repo) importing both trees; 0 mismatches |
| CLI behaviour | `node packages/cli/src/main.ts check …` on Node 25.9.0, and `npx node@22.18.0` / `node@23.6.0` / `node@24.1.0` |
| Roadmap untouched | `git diff main -- specs/ROADMAP.md` |

## 8. Next steps

1. ~~Fix the CLI entry guard~~ — done. Still to decide: whether T085 should also run Node 23.6 and 24.1.
2. **T020–T033 (US1)**: ports of the validators, fixtures and the first runner. Pass `"v1"` explicitly in `log.ts` (finding 3).
3. **T034–T047 (US2)** completes the MVP: manifest, `legacy` check, `decidePiTier`, runner extension.
4. Then US3 → US4 → US5 → Polish as ordered in `tasks.md`.

The row stays `queued` in `specs/ROADMAP.md`; closing it is the human's Roadmap-gate move (FR-021).

## 9. Amendment 2026-10-25 — flow v2 is the twelve-gate flow

After this report was first written, `main` gained constitution **v2.1.0** (PR #1), and the human chose **option 1: v2 = the twelve-gate flow now**. Done:

- **Documents:** `spec.md` (status block, US3, FR-007/008/009/015/019/020, SC-004/005/008), `plan.md` (new *Amendment 2026-10-25* section A1–A8, constitution check),
  `data-model.md` §1–4, `contracts/flow-and-records.md` (§1–5, new rows F10, F11), `research.md` (R6/R7 amended, new R16), `quickstart.md`, the checklist note,
  and `tasks.md` (T008, T009, T011, T012, T048–T056, T058, T080–T082; the count stays 87).
- **Code already delivered, amended:** `moves.ts` (`GateKey` and `GateId` gain `2a-experience`/`6a-ui-review` and `"2a"`/`"6a"`; `GATE_KEY_OF` has 12 entries),
  `flow/types.ts` (`AppliesWhen`, `GateDefinition.appliesWhen` and `check`), `flow/index.ts` (`hasGate`; `moveAllowed` is false for a gate the flow lacks).
- **Re-measured:** v1/legacy parity script — 0 mismatches; `hasGate("2a"|"6a","v1")` false, `hasGate(6,"v1")` true; an unknown id still throws `unknown gate id`; the CLI exit codes
  are unchanged.
- **Not done, by design (FR-021 and scope):** `specs/ROADMAP.md` (its r14 text still says "ten gates" — an `edit-rows` proposal for the next Roadmap gate), the PRD's WORK-2 line (T080),
  the explainers (T081), `v2.ts` and the tests (US3, T048–T058), evaluating `applies_when`, and the `kiln check design-system` / `foundations` checks.

## 10. Roadmap and PRD updated (2026-10-25, commit `60a2c7e`)

At the human's request, after the twelve-gate decision:
- **`specs/ROADMAP.md`** — the `edit-rows` text of the three concept docs' proposals (charter §11, design system §14, interface gates §13) was folded into rows **r12, r14, r15, r17, r19, r20, r22, r28, r29, r30, r32, r43** (and the prose "ten gates" → the
  twelve-gate flow; the r12/r14 decision row now says constitution v2.1.0, five judges). No row, dependency or order changed; `gate0` and its log are untouched; the header says plainly the text is *proposed for the next
  Roadmap gate* (the precedent of r53). `legacy/validate/roadmap.ts` → PASS.
- **`docs/prd/kiln-prd.md`** — §8.2 (`legacy/` at the repository root, with the measurement), WORK-2 (five judges, v2.1.0), GATE-2 (the two interface gates' moves), M1, goal 1, the status line (T080 done).
- **Explainers** regenerated (`_generate.py`): only the eight files for the edited rows changed. FR-021 and T086 now name `60a2c7e` as the baseline.

## 11. User Story 1 completed (2026-10-25, T020–T033)

14 tasks, 34 of 87 done. What exists now, beyond §3:

| Piece | Where | Notes |
|---|---|---|
| Roadmap and log validators | `kiln/packages/record/src/roadmap.ts`, `log.ts` | ported with paths, imports and usage text changed; behaviour unchanged. `log.ts` passes flow `"v1"` explicitly (finding 3) and keeps the `process.argv[1]` entry guard (finding 1). The first program's API is kept (`validateLog(records)`, `validateLogFile(path)`); `contracts/flow-and-records.md` §4 was corrected to say so |
| Fixtures | `kiln/fixtures/r7-live-*`, `packages/record/tests/fixtures/roadmap-blank.md` | byte-identical (`cmp`) |
| Ported tests | `packages/record/tests/` | 23 cases, expectations unchanged |
| Lane (pure) | `packages/lane/src/types.ts`, `affinity.ts`, `tests/affinity.test.ts` | `switchCount`, `bindAll` (throws synchronously), `judgeUnitsBoundStrongest`, each taking the flow's roster; 3 new tests, mutation-checked |
| Runner | `kiln/tests/run.ts`, `tests/runner/zero-tests.test.ts` | discovers tests itself (no shell glob), fails a run with zero tests, rejects unknown flags, strips `NODE_TEST_CONTEXT` so it can run inside a test |

Measured: `npm run test:new` — **30 tests, 0 failures**; `validate:log` and `validate:roadmap` print `PASS` on the r7 walk and on the (updated) roadmap; the broken fixture exits 1. Details in `baseline.md`.

Not yet: `npm test` also runs the legacy suite (T045); `legacy-copies.json` records for these ports (T037); the manifest check. Two things to know for later: (1) the runner flags `--live`, `--cost`, `--serial`, `--pi` are rejected until T045 forwards them;
(2) the runner found a real pitfall — a nested `node --test` inside a test reads as "zero tests" unless `NODE_TEST_CONTEXT` is removed.

## 12. User Story 2 completed — the MVP (2026-10-25, T034–T047)

47 of 87 tasks done (T001–T047 and T080 — 48 with the PRD task). **US1 + US2 is the MVP the plan defined: the move is safe, proven and green.**

| Piece | Where |
|---|---|
| Manifest generator and manifest (168 files, from the baseline commit's blobs) | `kiln/tests/tools/make-legacy-manifest.ts`, `kiln/checks/legacy-manifest.json` |
| `kiln check legacy` (pure filesystem) and the copy record (27 records: 20 ported pairs, 5 `wait` files = the 19 deferred cases) | `kiln/checks/legacy-identity.ts`, `legacy-copies.json`; registered in `checks/index.ts` |
| Pi tier: measured list, `decidePiTier`, version probe | `kiln/tests/measured-pi.ts`, `pi-tier.ts` |
| Runner: both suites, zero-test rule on each, `--new-only` / `--legacy-only`, forwarded legacy flags, the skip line | `kiln/tests/run.ts` |

**Defects found and fixed on the way (worth knowing):**
1. **The entry guard was unsafe through symlinks** — and so is the first program's idiom. `import.meta.url` is a real path; `process.argv[1]` is as typed; on macOS temp dirs (`/var` → `/private/var`) they differ and a command would run nothing and exit 0. Found by the tamper test, fixed once in `packages/record/src/entry.ts` (`isEntryPoint`, realpath on both sides) and used by the CLI, both validators and the manifest generator; a regression test runs them through a symlink and a mutant of the old guard fails it. This is the same silent-pass class as code-review finding 1.
2. `git ls-tree` filters to the working directory's prefix: run from `kiln/` it listed zero files. The generator now uses `--full-tree` and refuses an empty listing.
3. A nested `node --test` inherits `NODE_TEST_CONTEXT` (US1 finding) — the runner strips it for both children.
4. While mutation-testing I reverted my own uncommitted runner with `git checkout`; I rebuilt it from the same content and committed immediately. Lesson kept: commit before mutating.

**Contract updates:** `runner.md` (exclusive flags, `KILN_LEGACY_RUNNER` seam), `legacy-identity.md` (`legacy-manifest-invalid`), `data-model.md` §6 (`cases`).

Full numbers: `baseline.md`. Next: US3 (T048–T058, the twelve-gate flow data and tests), US4 (T059–T071, the network lint), US5 (T072–T077, boundaries), Polish (T078–T087, minus T080).

## 13. User Story 3 completed — the twelve-gate flow as data (2026-10-25, T048–T058)

58 of 87 tasks done. New suite: **107 tests, 0 failures**; **34 of the 54** ported cases live.

| Piece | Where |
|---|---|
| Flow v2: twelve gates, five judges, `applies_when` declared on the two interface gates | `kiln/packages/contracts/src/flow/v2.ts`; `flow/index.ts` now has `CURRENT_FLOW` = v2 and `DEFAULT_RECORD_FLOW` = v1 (the two defaults the contract names; the single `DEFAULT_FLOW` is gone) |
| The test that reads the governing documents | `packages/contracts/tests/flow-vs-constitution.test.ts` — constitution (default-flow sentence, Principle II, closed set), PRD GATE-1/GATE-2, `ui-flow.md` |
| Ports | `gate-rail.test.ts` (6 → v1, plus v2, F3, F10 cases), `strongest-model.test.ts` (5 → v1 roster, plus F7, F8, invalid-roster cases) |
| Records | schema copy: `flow` (v1/v2, absent = v1) and gate ids `"2a"`/`"6a"`; `log.ts` resolves `record.flow ?? defaultFlow ?? v1`, fails an absent gate or unknown flow by name, prints the contract's G3 message, `--flow v1|v2`; `flow-records.test.ts` |
| The v2 contract document | `kiln/packages/contracts/gate-rail.md` |

**Review findings paid off:** finding 3 (the default-flow trap) is closed — `log.ts` never relies on a default; finding 4 and 2 have named tests. **Observed while building:** the PRD's own GATE-1 row now matches the constitution, so the test's extraction of the twelve names is a real cross-check, not a restatement.

Known deviations recorded in `legacy-copies.json`: `report.ts`'s `nameMove`, `log.ts` and the schema copy are no longer byte-identical to their originals (by design, noted per record).

Next: US4 (T059–T071, the network lint — ports 20 cases, so ported total becomes 54), US5 (T072–T077, boundaries), then Polish (T081–T087).

## 14. User Story 4 completed — the network lint (2026-10-25, T059–T071)

71 of 87 tasks done. New suite **150 tests, 0 failures**; **all 54 ported cases are live** (SC-002's census).

| Piece | Where |
|---|---|
| Tokenizer (comments, strings, templates with nested `${}`, regex literals) with a new offset-aligned `masked` view, and `moduleSpecifiers` | `kiln/checks/lex.ts` |
| `isLoopbackHost` (copied, not imported) | `kiln/checks/loopback.ts` |
| The lint: call / import / alias / computed detection, never-vacuous guard, path-keyed allowlist, loopback-literal rule for allowlisted modules; `checkNetwork()` over `packages/*/src` and `checks/*.ts` | `kiln/checks/network-lint.ts`, `network-allowlist.json` (empty), registered in `checks/index.ts` |
| Tests | 4 ported files (20 cases), `network-lint.test.ts` (19), `check-network.test.ts` (4) |

**Departures from the first program's lint, all recorded in `legacy-copies.json`:** the "exactly one allowlist entry" rule and the Pi-driver process exemption are gone (research R9); `globalThis["fe"+"tch"]` is now `network-computed` (the task and quickstart require it) rather than lumped with aliasing; imports starting `#` (this package's imports map) are internal, not "external dependencies"; and import detection runs on `masked`, so a whole `import x from "left-pad"` written inside a string is no longer mistaken for an import (this matters to the boundary check, B7). New codes added to `cli-check.md`: `network-external-dependency`, `network-nonloopback-url`, `network-allowlist-invalid`.

**Caught on the way:** a `*/` inside a doc comment (`packages/*/src`) ended it early and broke the file — the same shape of trap the tokenizer exists to avoid; and one of my own CLI assertions passed for the wrong reason (the scratch copy had no sibling `legacy/`), so I rewrote it to say what it means.

Next: US5 (T072–T077, `kiln check boundaries`), then Polish (T081–T087).

