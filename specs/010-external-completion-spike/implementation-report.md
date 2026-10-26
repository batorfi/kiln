# Implementation report: Spike — completing a waiting task from outside (row r42)

**Branch**: `010-external-completion-spike` | **Report date**: 2026-10-26 | **Head**: `87c9c9b` | **Base**: `main` (merge-base `39ed86a`)
**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Tasks**: [tasks.md](./tasks.md) · **Baseline log**: [baseline.md](./baseline.md)
**The product of the row**: [spike-report.md](./spike-report.md) (verdict and evidence; [explainer](../../docs/architecture/explainers/r42-spike-report.md)). **This file** is about the *work*: what was built, how it is put together, how far the evidence can be trusted, what went wrong on the way, and what is still open.

> **Reading guide.** Five minutes: §1 and §9. Reviewing the code: §2–§4 and §10. Judging the evidence: §5–§6. Picking up the open items: §8–§9.

## 1. Status in one paragraph

**63 of 65 tasks are done; the other two are T056 (blocked) and T065 (open only because of T056).** The spike answers the row's question — *can a move committed from outside a waiting gate complete it, atomically, exactly once, with no clock, surviving restarts, using Pi Durable 1.4.0?* — with **`go`**: one native composition (`native-signal`) holds all five guarantees at 10 of 10 named kill points, under 300 randomised kills and with the completer in a separate process, on **macOS / Node 25.9.0**, with one structurally enforceable caveat (`restartLimit = Infinity`). No fallback and no upstream proposal were needed. `kiln/`, `legacy/` and `specs/ROADMAP.md` are unchanged (`npm test` 184 + 500, `npm run check` three `PASS`, empty diff vs `main`). The spike's own suite is **87 tests, all green**; a fresh clone reproduces the evidence table, the tests and the report check. The time box (16 active hours) was kept with a wide margin: **1.35 h**. **Not done:** the evidence on Node 22.19.0 (denied by the session's permission check — §8), and the human confirmation of the verdict (the Roadmap gate's move, not this row's).

## 2. What exists

Everything is under `spikes/r42/` (outside `kiln/`, own `package.json`, exact pin, committed lockfile) plus the documents in this folder. **~2 700 lines of source and ~1 040 lines of tests**, no build step (Node type stripping).

```text
spikes/r42/
  src/
    port.ts            the gate-completion port in KILN's terms (types + pure helpers; no library import)
    invariants.ts      the oracle: I1–I7 over an Inspection read from a reopened store  (pure)
    kill.ts            killPoint(name) → SIGKILL self; faultPoint(name) → throw (injected store failure)
    owner.ts           the OWNER process: holds the store, runs a strategy, serves a Unix socket
    client.ts          the outside completer: a library AND a CLI (a separate OS process)
    completer.ts       in-process vs separate-process completer, one interface
    harness.ts         temp stores, start/kill/restart owners, unconditional cleanup
    strategy.ts        the Strategy interface + lazy loader (names are closed)
    strategies/
      control-sqlite.ts       CORRECT reference (Node SQLite, one transaction)      test-only
      broken-two-commit.ts    DELIBERATELY BROKEN (two transactions)                test-only
      native-signal.ts        C1 — the design the verdict rests on                  337 lines
      native-abort.ts         C2 — abort-driven; fails a, c, d                      190 lines
    scenarios/        kill-point · random-kill · no-clock · restart-limit · exactly-once · different-process (+ second-opener)
    status.ts verdict.ts table.ts evidence.ts install-check.ts report-check.ts   evidence machinery (never-vacuous)
  tests/              15 files, 87 tests
  TIMEBOX.md NOTES.md README.md   ledger · the lab notebook (source of the report's "what was tried") · how to run
specs/010-…/  spike-report.md · contracts/gate-completion-port.md (post-spike form) · baseline.md · tasks.md …
```

**How a scenario runs** (the one idea the whole harness is built on):

```text
  scenario ──(port: open / submit / state)──▶ completer ──socket──▶ OWNER process ──▶ strategy ──▶ SQLite file
     │                                         (this process,                │  killPoint("…") may SIGKILL the owner HERE
     │                                          or `node client.ts`)         ▼
     └──── after the kill: strategy.inspect(store)  — a FRESH reader, no owner, no memory ──▶ oracle (I1–I7)
```

The scenarios talk to the port only; the same scenario therefore runs unchanged against the controls, both native attempts and any future fallback (checked by `fallback-parity.test.ts`).

## 3. The design the verdict rests on — `native-signal` (C1)

Pi Durable's atomic `commit` can write documents and return a task's *own* next state, but cannot complete *another* task (research R2: `Tx` has no task transition). So the move must be written **by the task that is waiting**.

```text
 Gate task  (spike.gate)        open   → creates child Decision, parks `waiting` on it
                                settle → reads the child's outcome, commits `terminal`
 Decision task (spike.decision) wait   → registers a one-shot slot in an OWNER-LEVEL map and awaits it
                                          ┌────────────────────────────────────────────────────────────┐
   submit(gate,key,move) ──▶ slot ──▶     │ ONE runtime.commit:  write doc `spike.move` {key,move}      │
                                          │                      AND return { status: "terminal", … }   │
                                          └────────────────────────────────────────────────────────────┘
```

- **Atomicity (a)** is by construction: the record and the decision's completion are the same commit.
- **Exactly once / first wins (b, c):** the first caller takes the slot; everybody else is judged against the **stored record** (same key + equal move → `repeat`; same key + other move → `key-conflict`; other key → `stale` / `lost-race`, both naming the winner). Memory decides nothing.
- **No clock (d), resumes as it was (e):** nothing sleeps; after a kill the `running` decision is re-run from the top of its step and re-registers its slot. `start()` withholds `ready` until that has happened (178–197 ms in 5 observed restarts); a move arriving earlier gets `refused(not-ready)`.
- **The price:** the wait lives in the owner's memory, so (1) the library's crash-loop guard must be off — at the default of 5 consecutive crashes the decision is parked and every move is refused (**demonstrated**, §6), (2) the library's scheduler cannot tell this wait from a stuck task, (3) one owner per store is a rule r13 must enforce (**observed**: a second process can take the SQLite write lock).
- **A choice recorded, not hidden:** the port's "settled" is *a record exists*; the gate **task** is a projection that converges (decision terminal → gate wakes → settles). A kill at `gate-wake` leaves a record, a terminal decision and a gate task not yet advanced; the scheduler advances it on restart. Reading the gate from the task instead would have reported that lag as I1 — a stricter reading that was not tried (NOTES, Phase 4 note 2).

## 4. Why `native-abort` (C2) fails — in three lines

The decision task sleeps until the year 9999 (**a clock → I7**); a move commits the document, *then* marks the decision aborted, and the abort handler commits the completion (**two commits → I2/I3** at `between-record-and-abort`, `abort-marked`, `abort-handler-begin`); the owner acknowledges after the mark, before the completion (**ack-before-completion → c fails** when the owner is killed right after the ack). It was built to give the report evidence rather than assertion, and given every chance (start-up and repeat both re-issue the abort). Guarantees b and e still hold.

## 5. How far the evidence can be trusted

A harness that cannot fail proves nothing, so the machinery is built to refuse, and was *shown* to refuse.

| Safeguard | What it does | Shown by |
|---|---|---|
| **Never vacuous** | zero scenarios, zero kill points exercised, an empty declared list, or an install different from the lockfile **fails by name** (`evidence-zero-tests`, `-zero-kill-points`, `-install-mismatch`, …); an unbuilt strategy asked for by name exits 2 | `never-vacuous.test.ts` (11), fresh clone §5 |
| **Status rules** | `held` only if *every* targeting scenario ran and passed; a violation outranks missing evidence; random kills can condemn but never acquit | `status.test.ts` (7) |
| **Verdict rules** | never more favourable than the weakest claimed guarantee; test-only controls never count; a non-enforceable caveat blocks `go` | `verdict.test.ts` (8) |
| **Report check** | the report's table and verdict must equal `out/evidence.json`; section 5 must not name the library | `report-check.test.ts` (8) |
| **Control pair** | the correct control must read `held`, the broken one `not-held` at its seam and *only* there | `kill-points.test.ts` |
| **Mutation checks** | **17** deliberate sabotages, each committed-first and undone-first, each caught: 4 on the kill hook/oracle/control (P1), 7 on status/verdict/runner/install rules (P1′), 4 on the exactly-once cases (key-conflict as repeat; existing-record check removed; winner dropped from `stale`; injected failure swallowed), plus one planted strategy-name branch (FP2) and one planted `node:http` import (NN1) | `NOTES.md` per phase |
| **Different process** | a row can be `held` only if its separate-process (`node src/client.ts`) variant ran and passed | `different-process.test.ts` |
| **No network** | static scan of `src/` and `tests/` + `lsof` on the live owner (also after kill/restart); the probe is shown to see a real socket | `no-network.test.ts` |
| **Fresh clone** | `git clone` + `npm ci` + evidence + tests + report check + `kiln/` suites, all as in the working tree | `baseline.md`, report §9 |

**Limits of the evidence, stated plainly:** macOS and Node 25.9.0 only; SIGKILL, not power loss (WAL + `synchronous = NORMAL` — the library's own boundary); a genuinely full disk is simulated by an injected failure; the randomised kills are 300 seeded trials with delays 0–8 ms (the move takes a few ms, so they land on both sides of the commit — 201 settled / 99 waiting for `native-signal`) and are supporting evidence only.

## 6. Results

Pasted from the final full run (2026-10-26 11:33:32Z → 11:36:48Z; `out/evidence.json`; verbatim in the report §2).

| Strategy | a atomic | b once | c first wins | d no clock | e resumes | Kill points | Random |
|---|---|---|---|---|---|---|---|
| control-sqlite (control) | held | held | held | held | held | 6 of 6 | 300 |
| broken-two-commit (control) | **not-held** (I1, I3) | held | held | held | held | 7 of 7 | 300 |
| **native-signal** † | **held** | held | held | held | held | **10 of 10** | 300 (0 violations) |
| native-abort † | **not-held** (I2, I3, I7) | held | **not-held** (I2, I3, I7) | **not-held** (I7) | held | 11 of 11 | 300 (132 trials violated) |

† `native-signal`: d holds only with `restartLimit = Infinity` (enforceable by the seam). `native-abort`: waits on a clock (not enforceable).

Numbers worth quoting: 100 concurrent same-key submissions → **1 `committed`, 99 `repeat`, 1 record**; 100 distinct keys → **1 `committed`, 99 refused, every refusal naming the winner**; 100 more same-key submissions after a SIGKILL + restart → **0 `committed`, 100 `repeat`**; at the default restart limit, **7 kills → the next valid move is `refused(not-ready)`**, with `Infinity` it commits.

## 7. Progress against the plan

| Phase | Tasks | Done | Checkpoint |
|---|---|---|---|
| 1 Setup | T001–T007 | 7 | pin 91 packages, smoke on Node 25.9 and 22.19, control readings |
| 2 Harness | T008–T019 | 12 | port, kill hook, oracle, owner, client, two controls (21 tests) |
| 3 Evidence machinery | T020–T030 | 11 | status/verdict rules, runner, report checker + skeleton (55 tests) |
| 4 US2 — a, d, e | T031–T043 | 13 | control gate passed; C1 holds; C2 fails; C3 not tried (70 tests) |
| 5 US3 — b, c, other process | T044–T048 | 5 | exactly-once, different-process, second-opener (79 tests) |
| 6 US4 — decision | T049–T054 | 6 | **4 skipped by design** (T051–T054: fallback/proposal not needed) — ticked with their reason |
| 7 US5 — for r13 | T055–T059 | **4 of 5** | **T056 blocked** (Node 22.19 run) |
| 8 Polish + report | T060–T065 | 5 of 6 | T065 open only because of T056 (87 tests) |

Commit trail (24 commits since `main`): spec/plan/analysis (4) → `P0` pin → `P1` harness → `P1′` evidence machinery → `P2a` controls + C1 + C2 → `P2b` exactly-once → `P3` decision → `P4` findings → `P5` proofs, report, fresh clone → close-out. Each phase has a WIP commit and a checkpoint commit with the test count in its subject.

## 8. Open items — each needs a person

1. **T056 — the evidence on Node 22.19.0 (the library's floor).** `npx -y node@22.19.0 src/evidence.ts --strategy native-signal` downloads and runs an external package; the session's permission check denied it and no Node 22.19 is installed. Everything else about 22.19 is known (the smoke passed there in the first session; Node prints the `node:sqlite` experimental warning there). **Until it is run, the `go` is for Node 25.9.0.** Either run that command and record the result in `NOTES.md` (Phase 7 note 2) and the report §10, or provide a Node 22.19.
2. **Confirm the verdict.** `go` is the rules' output. The data model says a person confirms it at the Roadmap gate; this row never edits the roadmap. `r42` is still `queued`.
3. **Decisions the report hands to r13 (not made here):** raise the Node floor to ≥ 22.19 and repeat r12's Node-floor run; accept that `kiln/` stops being dependency-free (91 packages, 112 MB; amend the `externals` seam, the `network-external-dependency` rule, the "nothing to install" statements); accept, pin around or isolate the experimental `node:sqlite`; enforce one owner per store structurally.

## 9. Deviations from the plan and tasks (all recorded in `NOTES.md` as they happened)

| What | Why | Effect |
|---|---|---|
| `src/completer.ts`; kill-point and exactly-once scenarios take a completer | the same scenario must run in-process and as a separate OS process (FR-004) | no scenario knows which; variants report as kind `different-process` so a point is never counted twice |
| `second-opener` is informational: the runner lists it in a strategy's `notes` and keeps it out of every guarantee | the R-6 case is an observation, not a guarantee input | the runner changed by one filter and one line |
| `tests/report-check.test.ts` (8), `tests/native-strategies.test.ts` (3) | a checker nobody has seen fail is the thing the spike exists to avoid; pin C1/C2 results outside the full evidence run | test files 13 → 15, tests 87 |
| new error code `evidence-scenario-error` | a scenario that throws is a harness bug and must not read as a pass | contract list extended |
| `GateState` gained `unknown`; the client maps a dead owner to `refused(store-error)` (`connection-lost`/`timeout`) | `state` on a never-opened gate must not throw; "outcome unknown" must be distinguishable | contract updated |
| `restart-limit` sidecar file next to the store | `inspect` has no Harness, so it cannot know which limit the owner ran under (needed for I6) | documented; parking itself was also confirmed through the refused move |
| random-kill delays 0–8 ms (tasks said 0–50) | calibrated so kills land around the commit | recorded in the report |
| tasks T051–T054 skipped | their conditions were false | each ticked with its reason |

## 10. Problems found on the way (the honest log)

| # | What | How it was found | Fix |
|---|---|---|---|
| 1 | A failing test leaked its owner process and the whole run hung | mutation check on the correct control | `Store.cleanup()` kills every process started on the store; `--test-timeout=60000` as a backstop; test C5 |
| 2 | An **uncommitted edit had switched off the invariant check** in `no-clock.ts` (a mutation experiment never undone) | `git diff` at the start of this session | reverted before anything ran; since then every mutation is committed first and undone first |
| 3 | The random-kill figure read **600** — 300 trials counted once for a and once for e | writing the report | the runner counts each batch once; the report says 300 |
| 4 | Three ledger rows were missing or ahead of the clock | re-reading `date -u` against the ledger | corrected with new rows (nothing edited after the fact); total 1.35 h |
| 5 | `Case.connect(n)` — my own helper — tripped the no-network rule | first run of `no-network.test.ts` | helper renamed, **rule kept** |
| 6 | Node type stripping rejects constructor parameter properties | first run of the exactly-once scenarios | explicit fields |
| 7 | `client.ts` rejected an empty `decidedBy` as a usage error, so `invalid-move` was refused by the CLI, not the owner | designing the separate-process variant | the CLI now sends it; no assertion weakened |

No assertion was weakened to get a pass anywhere in the spike.

## 11. Where to look next

- **The verdict and the contract for r13:** [spike-report.md](./spike-report.md), [contracts/gate-completion-port.md](./contracts/gate-completion-port.md) (post-spike section at the end).
- **How we got here, in order, with every observation:** `spikes/r42/NOTES.md`. **The time box:** `spikes/r42/TIMEBOX.md`.
- **To re-run:** `cd spikes/r42 && npm ci && npm run evidence && npm test && npm run report-check` (about 4 minutes; macOS).
- **To read the code in the order that explains it:** `port.ts` → `invariants.ts` → `kill.ts` → `owner.ts` → `strategies/control-sqlite.ts` → `strategies/native-signal.ts` → `scenarios/kill-point.ts` → `scenarios/exactly-once.ts`.
