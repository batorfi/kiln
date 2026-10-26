# Time box — spike r42

**Limit: 16 working hours of active session time** — "two working days" (spec Clarifications, 2026-10-25 and 2026-10-26), counted as *active time*, not calendar days.
**Start: 2026-10-26T07:39:56Z** — the start of the first implementation session, taken *before* T001 so that T001's work counts inside the box.
**The box ends when the running total in the ledger reaches 16 h.** At that instant: stop, mark every unfinished scenario `not-proven`, and go to Phase 8 (`tasks.md`). Whatever is cut follows the cut order in `tasks.md` → *Priority under the time box*.

## How the ledger is kept

- Every work session appends one row: when it started, when it ended, and the **active hours** in between (idle time, waiting for a person to answer a question, and time between sessions do **not** count).
- The running total is the sum of the active-hours column. A session that is still open has no end and is closed at its next checkpoint.
- Time spent *waiting for a person* (for example a question put to the user) is not active time; it is noted in the row's note and subtracted.
- Nothing in this file is edited after the fact; a correction is a new line saying what it corrects.

## Ledger

| # | Session start (UTC) | Session end (UTC) | Active hours | Running total | Note |
|---|---|---|---|---|---|
| 1 | 2026-10-26T07:39:56Z | 2026-10-26T07:43:55Z | 0.07 | 0.07 h | Phase 1 (T001–T007); no time spent waiting for a person |
| 2 | 2026-10-26T07:47:13Z | 2026-10-26T07:55:53Z | 0.14 | 0.21 h | Phase 2 (T008–T019); no time spent waiting for a person |

## Checkpoints

| Phase | Instant (UTC) | Ledger total | Note |
|---|---|---|---|
| P0 started | 2026-10-26T07:39:56Z | 0 h | T001 control reading taken first; T002 creates this file |
| P0 done | 2026-10-26T07:43:55Z | 0.07 h | T001–T007 complete; `kiln/` unchanged (control equal to T001); dependency pinned (91 packages); smoke passes on Node 25.9.0 and 22.19.0 |
| P1 done | 2026-10-26T07:55:53Z | 0.21 h | T008–T019 complete: 21 tests green; the harness shown to catch 4 sabotages (kill hook, I3, I4, a control that never commits) |
