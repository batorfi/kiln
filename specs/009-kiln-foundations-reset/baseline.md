# Baseline and progress record: Foundations reset (row r12)

**Branch**: `009-kiln-foundations-reset` | **Started**: 2026-10-23 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Tasks**: [tasks.md](./tasks.md)

This file records the starting point before any change (task T001) and the numbers measured at each checkpoint, so every claim of the
verification report can be traced to a command.

## Starting point (T001, 2026-10-23)

| Item | Value |
|---|---|
| Baseline commit (first program's tree = `kiln/` at this commit) | `299b0a567fc74e09e2582d42789ad12adca57c9e` (`299b0a5`, the tip of `main` when r12 started) |
| Baseline `kiln/` tree id | `20a82c7e214be256c804f6e8f1cd4cce9c8e9874` |
| Branch head when implementation started | `9544ae8151b1f496bf150258a89349737b192f6c` |
| Tracked files under `kiln/` | 168 |
| Node | v25.9.0 (`/opt/homebrew/bin/node`); declared floor `^22.18.0 || >=23.6.0` — verified in T-node22 |
| Pi | 1.1.0 installed; the live-Pi tier was measured against 0.85.1 |
| Checklist `checklists/requirements.md` | 16/16 |
| `.specify/extensions.yml` | absent — no hooks |

**Suite before any change** (`cd kiln && node tests/run.ts`, `/tmp/r12-baseline-suite.log`):

| Tests | Pass | Fail | Skipped |
|---|---|---|---|
| 500 | 477 | 8 | 15 |

All 8 failures are in `tests/pi/pi-live.test.ts` (`PI-LIVE: …`): the installed Pi (1.1.0) is not one the tier was measured against (0.85.1),
so the probe reports `pi-version-unmeasured` inside each test. The same 8 fail on `main`. Task T045 (the runner switches the tier off) is what turns them into
reported skips.

## Checkpoints

*(each entry names the command and its result)*

### After the move (T002–T004, 2026-10-23)

| Check | Command | Result |
|---|---|---|
| The move is pure | `git diff -M --name-status c4c3892 3298507` | **168 renames at 100%, 0 other** |
| Legacy runs unmodified from its new location | `cd legacy && KILN_PI=0 node tests/run.ts` (`/tmp/r12-legacy-after-move.log`) | **500 tests, 470 pass, 0 fail, 30 skipped** — the 15 live-Pi tests are skipped by the legacy gate's off switch with its printed reason; identical to the research R1 measurement (layout A) |
| Working tree after the run | `git status -s` | clean — the suite writes no tracked file |
| Ignore patterns | `git check-ignore -v legacy/factory-log/x.jsonl` | ignored; `legacy/factory-log/.gitkeep` stays tracked |

### After US1 (T020–T033, 2026-10-25)

| Check | Command | Result |
|---|---|---|
| New suite | `cd kiln && npm run test:new` | **30 tests, 30 pass, 0 fail**: 23 ported (log 9, roadmap 3, no-silent-approval 4, roadmap-m3 7) + 3 new affinity + 4 runner (zero-tests R5, unknown flag, any working directory) |
| Affinity tests can fail | three mutants of `affinity.ts` (swap rule inverted; guard removed; `bindAll` made `async`) | each fails ≥ 1 of the 3 tests; restored → 3 pass |
| Zero-tests refusal | `node tests/run.ts packages/zzz` | exit 1, `FAIL — the run executed ZERO tests …` |
| Works from any directory | `cd /tmp && node …/kiln/tests/run.ts packages/lane/tests` | 3 tests, exit 0 |
| Validators on the evidence | `npm run validate:log -- fixtures/r7-live-inference.jsonl`; `npm run validate:roadmap -- ../specs/ROADMAP.md` | `PASS`, `PASS`; the broken fixture exits 1 |
| Copies exact | `cmp` of the three r7 fixtures and the blank roadmap against `legacy/` | identical |
| Legacy untouched | `git diff --stat -- legacy` | empty; tree id still `20a82c7e…` |

### After US2 (T034–T047, 2026-10-25)

| Check | Command | Result |
|---|---|---|
| Manifest | `node tests/tools/make-legacy-manifest.ts 299b0a5` | **168 files**, baseline `299b0a5…`, tree `20a82c7e…`; every hash equals the working tree's `legacy/` |
| Identity check | `npm run kiln -- check legacy` | `PASS legacy — scanned 168 files`; 2 ignored globs; 19 deferred cases listed |
| Tamper cases | `checks/tests/legacy-identity.test.ts` (13), `legacy-baseline.test.ts` (2), `packages/cli/tests/check-legacy.test.ts` (2) | modified / missing / added / copy-unlisted / zero-files / invalid each fail by name; the CLI on a tampered copy exits 1 naming the file; four mutants of the check each fail ≥ 1 test |
| Baseline cross-check | `legacy-baseline.test.ts` | treeId and all 168 blob ids equal git's (skips with a printed reason without history) |
| Pi decision | `tests/runner/pi-tier.test.ts` (8), `pi-skip.test.ts` (9), `measured-equality.test.ts` (1); two mutants of `decidePiTier` each fail ≥ 2 | stub `pi` 1.1.0 → skip line once, legacy child `KILN_PI=0`; stub 0.85.1 / `--pi` / `KILN_PI=1` / `KILN_PI=0` / no Pi → unchanged |
| **L7 / R7** `npm test` here (Pi 1.1.0) | `cd kiln && npm test` | **exit 0**; `live-Pi tier skipped: Pi 1.1.0 installed, measured [0.85.1]` once; **`new: 67 tests · legacy: 500 tests`** (new 67 pass; legacy 470 pass, 0 fail, 30 skipped) |
| Demanded tier (US2.4) | `npm test -- --pi` | **exit 1**; no skip line; legacy 500 tests, 477 pass, **8 fail**, 15 skipped — the 8 `PI-LIVE:` tests fail by name `pi-version-unmeasured` (the baseline's numbers exactly) |
| Legacy untouched | `git rev-parse HEAD:legacy` | `20a82c7e…` |

### After US3 (T048–T058, 2026-10-25)

| Check | Command | Result |
|---|---|---|
| New suite | `cd kiln && npm run test:new` | **107 tests, 107 pass, 0 fail** (was 67 after US2) |
| Ported cases | gate-rail 6 + strongest-model 5 added to US1's 23 | **34 of 54** |
| v2 equals the documents | `packages/contracts/tests/flow-vs-constitution.test.ts` (7 cases) | reads the constitution, PRD GATE-1/GATE-2 and `ui-flow.md` §4.1/§5.1 as text; every extraction asserts it found something. Five mutants of `v2.ts` (old name *Design*, wrong judge, Code review without `revise`, cut diff predicates, three-judge roster) each fail ≥ 1 case |
| Flow handling | six mutants (record flow beaten by the default, history defaulting to v2, absent-gate check off, `moveAllowed` without `hasGate`, swallow-all `catch`, prototype lookup) | each fails ≥ 1 test |
| SC-008 (quickstart §3) | `validate:log` on the r7 walk, no flag and `--flow v2` | `PASS`, `PASS` |
| F5 | a hand-made Code review `revise` record | v1: `FAIL — G3 … move "revise" not in MoveVocabulary(gate=6, flow=v1); allowed: approve, restart` (exit 1); `--flow v2`: `PASS` |
| F3 | v1 data against the legacy `MOVE_VOCABULARY` and `GATE_NAME`, parsed from the legacy file's text | equal, 10 gates |
| `kiln check legacy` | `npm run kiln -- check legacy` | `PASS`, 30 records in the copy record |

