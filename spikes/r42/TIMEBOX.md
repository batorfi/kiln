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
| 3 | 2026-10-26T07:58:18Z | 2026-10-26T08:02:22Z | 0.07 | 0.28 h | Phase 3 (T020–T030); no time spent waiting for a person |
| 4 | 2026-10-26T08:02:22Z | 2026-10-26T08:11:42Z | 0.16 | 0.44 h | T031–T036 (kill-point, random-kill, clock and restart-limit scenarios). **Row added late**: no row was written at the time; the end is the commit instant of 05925d5, the start is the previous row's end (an upper bound). |
| 5 | 2026-10-26T10:50:00Z | 2026-10-26T11:10:00Z | 0.33 | 0.77 h | T037–T043: control gate, `native-signal` (C1), `native-abort` (C2). **Start and end are estimates** (first evidence run 10:55:38Z; end = the last command, 11:09:54Z); the time between 08:11 and 10:50 was no session and is not counted. |
| 6 | 2026-10-26T11:10:00Z | 2026-10-26T11:22:00Z | 0.20 | 0.97 h | T044–T048 (exactly-once, different-process, second-opener, full evidence). Start = the previous row's end; end estimated from the last command (11:21:12Z). |

## Checkpoints

| Phase | Instant (UTC) | Ledger total | Note |
|---|---|---|---|
| P0 started | 2026-10-26T07:39:56Z | 0 h | T001 control reading taken first; T002 creates this file |
| P0 done | 2026-10-26T07:43:55Z | 0.07 h | T001–T007 complete; `kiln/` unchanged (control equal to T001); dependency pinned (91 packages); smoke passes on Node 25.9.0 and 22.19.0 |
| P1 done | 2026-10-26T07:55:53Z | 0.21 h | T008–T019 complete: 21 tests green; the harness shown to catch 4 sabotages (kill hook, I3, I4, a control that never commits) |
| P1′ done | 2026-10-26T08:02:22Z | 0.28 h | T020–T030 complete: 55 tests green; 7 more sabotages of the status/verdict/runner/install rules all caught; report skeleton fails report-check on purpose |
| P2a done | 2026-10-26T11:10:00Z | 0.77 h | T031–T043 complete: control gate passed; C1 `native-signal` holds a, d, e (with restartLimit = Infinity); C2 `native-abort` fails a (I2, I3) and d (I7); C3 not tried |
| P2b done | 2026-10-26T11:22:00Z | 0.97 h | T044–T048 complete: b and c exercised on all four strategies; native-signal holds a–e incl. different-process; native-abort fails a, c, d; 79 tests green |
