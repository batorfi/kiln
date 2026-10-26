# Spike report: completing a waiting task from outside (row r42)

**Branch**: `010-external-completion-spike` | **Status**: **FOR THE ROADMAP GATE — verdict derived by the rules, not yet confirmed by a person** | **Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Contract**: [contracts/spike-report.md](./contracts/spike-report.md)

> This is the **product** of row r42. It states a verdict; it never records a gate decision and never edits the roadmap (constitution VI) — a person does both at the Roadmap gate.
> Every status below is produced by `npm run evidence` and checked against `spikes/r42/out/evidence.json` by `npm run report-check`.

## 1. Verdict

**Verdict:** `go`

A person's decision can be made at the Roadmap gate on this basis: **one native composition of Pi Durable 1.4.0 — a waiting step that holds the "wait" in the owner process's memory and completes the gate in a single commit — keeps all five guarantees (atomic, keyed exactly once, first wins, no clock, resumes as it was), including with the completer in a different process**, at every one of its 10 named kill points and under 300 randomised kills. It holds them **with one caveat that r13 can enforce structurally: the library's crash-loop guard must be switched off (`restartLimit = Infinity`)** — at its default of 5, a gate killed 7 times in a row with no move is parked and every move is then refused. No fallback is needed and none was built; no upstream request is needed (§7).

What this verdict does **not** claim: it was run on **macOS, Node 25.9.0** only. The same evidence on the library's own floor, **Node 22.19.0, was not run** (§10, the run was blocked by a permission check, not by a failure), host power loss was not tested, and the `go` is the rules' output, awaiting a person's confirmation.

| | |
|---|---|
| Pinned library | `@earendil-works/pi-durable` **1.4.0**, integrity `sha512-EtIyXH1MBSXdJSkodmy+CYXuwfve3gPrD4GNCZ0XmuRWLPupwRlNQ7fdaXjRcLoKb6SWkT/yEzK+sMmrqvYK+Q==` (exact pin and committed lockfile, `spikes/r42/`) |
| Time box | limit **16 working hours** of active session time; started **2026-10-26T07:39:56Z**; ended **TIMEBOX_END**; ledger total **TIMEBOX_TOTAL** — **kept** (`spikes/r42/TIMEBOX.md`) |
| Platform | macOS (Darwin 25.6.0), Node v25.9.0, npm 11.14.1 |

## 2. The five guarantees

Pasted verbatim from `npm run evidence -- --markdown` (run 2026-10-26, 11:33:32Z → 11:36:48Z; `spikes/r42/out/evidence.json`). The two `control` rows are test-only: they exist to prove the harness can say *held* and *not-held*, and are never candidates for the verdict. A guarantee is `held` only if every scenario that targets it ran and passed — for every row, including the scenario that drives it from a separate process.

*@earendil-works/pi-durable 1.4.0 · node v25.9.0 · darwin · 2026-10-26T11:33:32.710Z → 2026-10-26T11:36:48.478Z*

| Strategy | a | b | c | d | e | Kill points | Random kills |
|---|---|---|---|---|---|---|---|
| control-sqlite (control) | held | held | held | held | held | 6 of 6 | 300 random |
| broken-two-commit (control) | not-held | held | held | held | held | 7 of 7 | 300 random |
| native-signal † | held | held | held | held | held | 10 of 10 | 300 random |
| native-abort † | not-held | held | not-held | not-held | held | 11 of 11 | 300 random |

- † native-signal: guarantee d holds only with settings.restartLimit = Infinity (the library parks a task cut off 5 times in a row) (enforceable by the seam)
- † native-abort: the gate waits on a clock: the decision task sleeps until the year 9999 (a deadline), so the gate is not clock-free (NOT enforceable structurally)
- note control-sqlite: second-opener: a second process opened control.sqlite while the owner ran and saw {"opened":true,"read":4,"writeLock":"obtained"}; the gate stayed "waiting" and a move still committed; 1 record(s)
- note broken-two-commit: second-opener: a second process opened control.sqlite while the owner ran and saw {"opened":true,"read":4,"writeLock":"obtained"}; the gate stayed "waiting" and a move still committed; 1 record(s)
- note native-signal: second-opener: a second process opened pi.sqlite while the owner ran and saw {"opened":true,"read":26,"writeLock":"obtained"}; the gate stayed "waiting" and a move still committed; 1 record(s)
- note native-abort: second-opener: a second process opened pi.sqlite while the owner ran and saw {"opened":true,"read":26,"writeLock":"obtained"}; the gate stayed "waiting" and a move still committed; 1 record(s)

Scenarios passed / run behind each cell (the evidence is `out/evidence.json`; the scenario names are in `spikes/r42/src/scenarios/`; each scenario kind has a test in `spikes/r42/tests/`):

- **control-sqlite:** a 13/13 · b 6/6 · c 12/12 · d 5/5 · e 15/15
- **broken-two-commit:** a **12/15, violated I1 and I3** · b 6/6 · c 12/12 · d 5/5 · e 17/17 — the deliberate break, caught at its seam `between-commits` (and only there)
- **native-signal:** a 21/21 · b 6/6 · c 12/12 · d 5/5 · e 23/23
- **native-abort:** a **6/23, violated I2, I3, I7** · b 6/6 · c **5/12, violated I2, I3, I7** · d **0/5, violated I7** · e 25/25

The invariants (`spec`'s data model §2): I1 waiting ⇔ no record · I2 settled ⇔ one record and the decision terminal with that move · I3 no half-applied move · I4 at most one record · I5 settled stays settled · I6 waiting stays waiting and is never parked · I7 no timer, sleep or deadline on the gate or its decision.

How the cases map to the guarantees: **a** (atomic) — every named kill point, killed with SIGKILL and read by a fresh reader with no owner, plus 300 randomised kills (supporting only); **b** (keyed exactly once) — 100 concurrent same-key submissions, 100 more after a restart, same key with a different move; **c** (first wins) — 100 distinct keys at once, a stale move, an invalid move, an unknown gate, a move during startup, an injected store failure; **d** (no clock) — a clock jump of ten years, two seconds of real time, a restart with the clock ten years ahead, 7 consecutive kills (the library's limit is 5); **e** (resumes as it was) — the second reading of every kill-point scenario and the restart cases. Each guarantee also has the **different-process** variant (`node src/client.ts …` as the completer).

## 3. What was tried

In the order they were run. Nothing is omitted because it failed.

1. **`control-sqlite` (test-only control).** Plain Node SQLite, the record and the settlement in one transaction with a primary key. Purpose: prove the harness can say `held`. Result: a–e `held`, 6 of 6 kill points. If the harness had said anything else here, the harness would have been wrong (the T037 gate).
2. **`broken-two-commit` (test-only control).** The same design with the record and the settlement in two transactions and a kill point between them. Purpose: prove the harness can say `not-held`. Result: guarantee a `not-held`, **I3** (with its shadow I1) at `between-commits`, and nowhere else; b–e `held` — the break is only about atomicity.
3. **`native-signal` — C1, "signal into a running step" (the first native attempt).** A gate task owns a decision task. The decision's step registers a single-shot slot in the owner's memory and waits; a move makes it perform **one commit** that writes the move document and returns the task's own terminal state; the gate task wakes and settles. Duplicates and competitors are judged against the **stored record**, never memory. **Result: a–e `held`** at 10 of 10 kill points, 300 random kills, and the separate-process cases. It costs: the restart limit must be disabled (§5, §6), a move arriving before the step has re-registered after a restart gets `not-ready` (178–197 ms in 5 observed restarts), and the library's own scheduler cannot tell this wait from a stuck task.
4. **`native-abort` — C2, "abort-driven" (always built, run after C1).** The decision task sleeps until the year 9999; a move first commits the move document, then marks the decision task aborted, and its abort handler commits the completion. **Result: a `not-held` (I2, I3 at `between-record-and-abort`, `abort-marked`, `abort-handler-begin`), c `not-held` (the acknowledgement precedes the completion), d `not-held` (I7 — the sleep is a deadline, and a ten-year clock jump does not reach it, so the failure is structural), b and e `held`.** A far-future sleep is still a clock; two commits are not one.
5. **`native-submission` — C3 (the move as a keyed write-submission): not tried.** Its condition (no native strategy holds a, d, e) was false once C1 held them.
6. **`fallback-document` (F1) and `fallback-table` (F2): not tried.** Their condition (no native strategy qualifies) was false (T050). The research (R4) described them; nothing was built.

## 4. Kill points

Every point is a named `killPoint(...)` in the harness code; the owner is started armed with it and dies by SIGKILL there (no cleanup). A point that never fires is `ran: false`, never a pass; the run fails if a strategy exercised none. **All declared points were exercised for every strategy.**

| Strategy | Exercised | Randomised kills (supporting evidence only) |
|---|---|---|
| control-sqlite | 6 of 6 | 300 (280 settled, 20 waiting; 0 violations) |
| broken-two-commit | 7 of 7 | 300 |
| native-signal | **10 of 10** | **300 (201 settled, 99 waiting; 0 violations)** |
| native-abort | 11 of 11 | 300 (132 trials with violations) |

The randomised kills send a move and kill the owner a seeded random 0–8 ms later (the whole move takes a few milliseconds, so the kills land on both sides of the commit: for `native-signal` 201 trials ended settled and 99 waiting). They can show a violation; a few hundred clean trials prove nothing about absence, so they never make a guarantee `held` on their own.

The points of the strategy the verdict rests on, in sequence (`npm run kill-list` prints all strategies):

| `native-signal` kill point | Phase | Where the process dies |
|---|---|---|
| `idle-before-move` | move | submit entered; nothing read or written |
| `move-received` | move | request read; not yet dispatched |
| `commit-begin` | move | first line of the commit callback |
| `commit-after-read` | move | inside the commit, after reading the move document, before writing |
| `commit-after-write` | move | inside the commit, after writing, before returning the terminal state (mid-transaction) |
| `commit-returned` | completion | the commit resolved (the move is stored); no acknowledgement yet |
| `ack-sent` | completion | the acknowledgement has been written |
| `gate-wake` | completion | the decision is terminal; the gate task has woken but not advanced |
| `gate-settled` | completion | the gate task's own terminal commit resolved |
| `recovery-start` | recovery | first line of an owner's start after a previous kill |

`native-abort` adds the three points that expose its two commits — `between-record-and-abort`, `abort-marked`, `abort-handler-begin` — and those are where it fails.

## 5. The contract for r13

The port, after the spike, in KILN's terms only. The full text, including the table of outcomes and the operating conditions, is [contracts/gate-completion-port.md](./contracts/gate-completion-port.md); no operation, argument or error in it names the library.

- **Operations.** `open(gate)` creates a gate in `waiting` (idempotent). `submit(gate, key, move)` is the only operation that can settle a gate, and it is one atomic step: the move is recorded and the gate settled, or nothing is written. `state(gate)` reads the store, never memory, and answers `waiting`, `settled` (with the one record) or `unknown`.
- **Outcomes of `submit`.** `committed`; `repeat` (the same key with an equal move, before or after any restart — the original record is returned); `refused` with `lost-race` or `stale` (both name the key of the move that settled the gate), `key-conflict` (names the original; never treated as a repeat), `invalid-move` (a move with no decider is refused), `unknown-gate`, `not-ready` (the owner cannot yet accept; retry the same key) and `store-error` (the store failed when writing: nothing recorded, the gate still waiting, the same key commits once the fault is gone). **No refusal code was added by the spike.**
- **`committed` means durable.** The acknowledgement is sent only after the record is stored. A strategy that acknowledges earlier fails guarantee a and is not acceptable behind this port.
- **Operating conditions the host must guarantee.** (1) The durable core never parks a waiting gate because of repeated crashes (its crash-loop guard is switched off). (2) Exactly one process owns the store; completers reach the gate through the owner and never touch the store — nothing else prevents a second process from opening the file (§6). (3) A move is delivered by the owner, not written by the completer. (4) Power loss is outside the guarantee; an abrupt process death is inside it.
- **Which guarantees depend on a fallback.** None. If upstream later offers a durable "wait for an outside event", only the strategy behind the port changes — the owner would stop holding the wait in memory and the first condition would disappear — and the same scenarios judge it.
- **If a fallback is ever added next to a native path, which source is authoritative?** The stored move record: it is what `state` reads and what the invariants judge; the gate's task graph is a projection that converges to it after a restart. The spike built no fallback, so no disagreement was observed.

## 6. Findings for r13

1. **Node floor.** The library declares `engines.node >= 22.19.0`; `kiln/` declares `^22.18.0 || >=23.6.0`. Adopting the library makes the floor **≥ 22.19.0**, and r12's Node-floor verification (done on 22.18.0) must be repeated on 22.19.0. The spike's own evidence on 22.19.0 was **not run** (§10); a smoke check (open and close a store) passed there in the first session.
2. **Dependency tree.** 91 packages in the lockfile (3 direct: `chord`, `pi-ai`, `pi-durable`, all 1.4.0); the library's own runtime dependencies are `chord`, `pi-ai`, `pi-codemode`, `pi-telemetry` (1.4.0), `@silvia-odwyer/photon` 0.3.3 (Apache-2.0), `diff` 8.0.4 (BSD-3-Clause) and `typebox` 1.3.27 (MIT); the bulk of the rest arrives through `pi-ai` (provider SDKs: `openai` 27 MB, `@anthropic-ai/sdk` 14 MB, `@google/genai` 11 MB). Licences: MIT 42, Apache-2.0 35, BSD-3-Clause 12, 0BSD 1, Unlicense 1. Install size **112 MB**, of which `pi-durable` itself is 4.2 MB. `kiln/` would **stop being dependency-free**. r12's rules r13 would have to amend: the `externals` seam in `kiln/checks/boundaries.json` (empty today), the `network-external-dependency` code of the network lint, and the "nothing to install" statements of r12's quickstart and implementation report. **That is r13's decision.**
3. **The storage rests on an experimental Node module.** Durable storage uses Node's built-in `node:sqlite`; on Node 22.19.0 Node prints `ExperimentalWarning: SQLite is an experimental feature and might change at any time` (observed); on 25.9.0 it printed nothing. Other versions were not checked. r13 must decide: accept it, pin a Node where it is stable, or isolate it behind the seam.
4. **`restartLimit: Infinity` (the caveat of the verdict).** At the library's default of 5, a gate cut off by 5 consecutive crashes without a state change is parked; after 7 kills the next valid move was refused `not-ready` (observed) and the library reported the task parked. With the limit disabled the gate waited through any number of kills and the move committed. The seam must always set it.
5. **One owner per storage.** A second process opened the store file while the owner ran and was granted the **write lock** (observed on both SQLite files; rolled back). Neither the library nor SQLite refuses it. r13 must make the rule structural (a single server process, or a lock it owns).
6. **Power loss.** WAL with `synchronous = NORMAL`: abrupt process death is covered (SIGKILL at 10 named points and at random instants); host power loss may lose the newest commit and was **not tested**.
7. **Waiting inside a step.** The accepted composition keeps the wait in the owner's memory; the library's scheduler sees the decision as `running`. The library's changelog discourages waiting inside a step for this reason. It is paid in two ways: the restart limit (4) and a short window after a restart before the step re-registers, answered `not-ready`. Not a failed guarantee; a cost to design around (the CLI and server must treat `not-ready` as "retry the same key").
8. **For the roadmap's wording.** The roadmap names the fallback as "a KILN decision table committed in the same SQLite transaction as the task store". The spike found that the *native* path needs no such table: the move is a document committed in the same commit as the decision task's completion. The fallback was not built, so whether a table could share one transaction with the task store was **not tested**.
9. **A harness lesson worth keeping.** A mutation check left uncommitted nearly shipped a switched-off assertion in the scenarios (found and reverted before the control gate); every mutation since is committed first and undone first. The random-kill count was first reported twice (300 trials counted once per guarantee); the runner now counts distinct trials.

## 7. Upstream proposal

**Not needed.** The verdict is `go`: a native strategy holds every guarantee, so the condition for a proposal (a guarantee held by no native strategy, FR-007) is false, and no draft was written. Nothing was filed anywhere. (For a person's judgement, not a requirement: a durable "wait for an outside event" in the library would remove the first operating condition and the in-step wait; the evidence for how much that matters is in §3 (C1's costs) and §6.)

## 8. Fate of the code

Default applied: **nothing becomes product code.** The port is re-created in `kiln/packages/durable` from §5 and the contract file, not copied. `spikes/r42/src/` is kept as the reproducible evidence; `strategies/native-signal.ts` is discarded after r13 re-creates the design; the controls (`control-sqlite`, `broken-two-commit`), `native-abort` and all scenarios, the oracle and the kill hook stay as evidence — and the *technique* (a named kill point that SIGKILLs the process; the invariants I1–I7) is what r13's own crash tests should re-create. The file-by-file table is in `spikes/r42/NOTES.md`, Phase 7 note 6.

## 9. Reproduce

```text
git clone --branch 010-external-completion-spike <repository> kiln-r42 && cd kiln-r42/spikes/r42
npm ci                      # the one network act; installs the exact, locked tree
npm run evidence            # about 3.5 minutes; prints the table of §2, writes out/evidence.json
npm test                    # 87 tests
npm run report-check        # compares this report with out/evidence.json
```

Expected: the table of §2 (the `held` / `not-held` cells are the claim). **Platform of record: macOS (Darwin 25.6.0), Node v25.9.0.** The evidence refuses to claim another platform. FRESH_CLONE

## 10. Unproven

- **The whole evidence on Node 22.19.0** (the library's floor). `npx -y node@22.19.0 src/evidence.ts --strategy native-signal` was denied by the session's permission check (it downloads and runs an external package) and no Node 22.19 is installed. *Effect on the verdict:* the `go` is for Node 25.9.0 on macOS until a person runs that command and records the result; the library's own floor makes ≥ 22.19.0 the requirement anyway.
- **Host power loss** — outside the library's guarantee; not tested. *Effect:* none on the verdict, a boundary r13 must state.
- **Platforms other than macOS.** *Effect:* none claimed.
- **`native-submission`, `fallback-document`, `fallback-table`** — not tried, because C1 held every guarantee. *Effect:* none on the verdict; they matter only if the verdict is reversed.
- **A genuinely full disk** — an injected store failure at the moment of writing stands in for it.
- **Whether the library's own Node-version warning (`node:sqlite`) appears on versions other than 22.19.0 and 25.9.0.**
- **The verdict itself** is derived from the rules (`deriveVerdict`); the data model says a person confirms it at the Roadmap gate.
