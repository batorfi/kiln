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

