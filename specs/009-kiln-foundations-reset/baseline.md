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

*(filled in as the row is implemented; each entry names the command and its result)*
