# Code review — r13 durable core and gate contract

**Branch:** `011-durable-core-gate-contract` (21 commits on `main`, 115 files, about 10,300 added lines)
**Reviewed:** 2026-10-27, at `e5a05c9`
**Method:** a read-through of all production code the branch adds or changes, a full run of the test suite, and two throwaway probe scripts to check suspected defects against the real code. The probes ran outside the repo and are deleted.

## Scope

| Read in full | Skimmed or not read |
|---|---|
| `packages/durable/src/**` (owner lock, factory, library seam, channel client/server/path/protocol, gate, commands, outbox, tasks, inspect, types) | `packages/durable/tests/**` and `packages/lane/tests/**` (read only for coverage of specific behaviours) |
| `packages/lane/src/lane-task.ts` | `docs/` explainers and vocabulary |
| `packages/cli/src/gate-commands.ts` and the `main.ts` change | the spec, plan, research and contracts under `specs/` (header and summary only) |
| the diffs of `checks/boundaries.ts`, `checks/network-lint.ts`, `checks/*.json`, `package.json`, `DEPENDENCIES.md` | `package-lock.json` (1,190 lines; checked only through the boundary check) |

## Verdict

**Sound, with one real defect to fix before the lane is used for anything beyond scripted units.**
The gate path, the command ledger, the owner lock and the channel are carefully built. Their invariants are enforced where they should be (inside one commit, judged against stored state, never against memory). I found no correctness defect in them.

The lane has one confirmed defect: a step that fails after taking the lane never gives it back, so the lane wedges until the owner restarts. Beyond that there are three design points worth a decision and a handful of low-severity items.

## Test results

`npm test` (Node 25.9.0): **470 pass, 0 fail, 30 skipped.** The skipped tests are the live tier, which needs `KILN_LIVE=1` and a local Ollama. The new suite is 472 tests, the legacy suite 500.
I did not re-run the Node-floor matrix (22.19, 23.6, 24.1) that the implementation report cites.

## Findings

### 1. A failed step leaks the lane lease, wedging the lane — **High, confirmed**

`packages/durable/src/tasks/unit.ts:24` acquires the lane; `:44` releases it only on the success path after the commit. There is no `try/finally` and no release in the unit's `abort` handler.

**Reproduced.** In a probe, a unit with `needsLane` had a hook throw once at `unit.step-after-work`, after the acquire:
- the unit went terminal with outcome `failed`;
- the inspected lane state showed `holders: 1`, with only `lane.acquired` in the outbox and no `lane.released`;
- a second `needsLane` unit created afterwards stayed `running` for the rest of the 4 s observation window. It was waiting on a lease nothing would release.

`LaneApi.start()` clears a stale lease, but only at the next owner start. In a running owner the lane stays wedged until someone restarts it.

This is reachable without fault injection from any store or commit error between acquire and release: a disk-full error, a busy database, or an exception in real work once r16 replaces the scripted steps. The lane tests cover kills and aborts while waiting, but not a failure while holding.

**Fix:** release in a `finally` (guarding the "does not hold" error), or have the lane release a holder whose task has ended. Add a test with a throw between acquire and commit.

### 2. Nothing distinguishes a person from a program as the decider — **Medium, design**

`move.ts:24` checks that `decidedBy` is a non-empty string, and nothing more. The channel is a 0600 socket in a 0700 directory, so it is limited to the same OS user. But any process running as that user, an agent included, can run `kiln gate move --by <anyone>` and settle the Roadmap gate. The constitution says only a person's move settles gate0.

The code is honest about what it enforces (no delegation field, no empty decider). It cannot tell a human from a script. That may be acceptable for r13, but the claim "nothing settles this gate but a person's committed move" (`roadmap.ts`) is stronger than what is enforced.

**Decision for you:** record this explicitly as a known limit and the row that owns it. Likely candidates are a per-session secret or a confirmation channel the agent processes cannot reach.

### 3. The owner lock refuses on any live pid, including a reused one — **Medium, known trade-off**

`owner-lock.ts` never steals from a live pid, which is the right default. If the recorded pid was reused by an unrelated process after a crash or reboot, the store stays refused until someone runs the `sqlite3 … DELETE FROM owner` command printed in the message. The error text names the escape hatch, but a reused pid is the common case after a reboot.

**Suggestion:** also compare the process start time recorded in the lock row (`started_at`) with the live process's start time where the platform allows it. If that is too fragile, keep the manual hatch and mention reboots in the durable README.

### 4. Socket path uses 32 bits of a SHA-1, and a start-up unlinks any socket there — **Low**

`channel/path.ts:13` truncates the store hash to 8 hex characters. `server.ts` unlinks an existing socket at that path on the grounds that the store's lock is held. If two different stores of one user ever collide, the second owner would delete the first one's live socket. The chance is about 1 in 10⁶ for 100 stores, so this is theoretical. Using 16 hex characters is free, though still bounded by the roughly 100-character socket path limit.

### 5. Smaller items

| # | Where | Issue |
|---|---|---|
| a | `lane-task.ts:104` | `start()` ignores the outcome of `runCommand` for the lane task. A `refused` or `store-error` result is dropped silently, and `started` is set anyway. |
| b | `lane-task.ts:104` | The ledger key `"lane.create"` shares one namespace with caller keys. A caller using that key gets a `key-conflict`. |
| c | `move.ts:10` | `sameMove` compares only `kind`, `decidedBy` and `briefRef`, but `submit` stores `{ ...request.move }`. A move with extra fields is stored with them. A repeat that differs only in extras counts as `repeat` and the stored copy wins. Validate the move shape or store only the three known fields. |
| d | `cli/src/gate-commands.ts:38` | `stop` is `owner.stop().finally(resolve)` with no `catch`. If `stop()` rejects, the result is an unhandled rejection rather than a clean exit code. |
| e | `validate.ts:12` vs `:39` | The comment says `stepMs` is 0–5000, but the check allows 0–60000. |
| f | `tasks/index.ts` | `tasks.create` does not validate `owner`. It is reachable only in-process (the CLI does not expose it), and a bad owner surfaces as `store-error`. Worth a check before another caller is added. |
| g | `library/open.ts` | If `Harness.open` throws, the already-opened storage is not closed. Only the version-mismatch path closes it, via `harness.close`. |
| h | `checks/network-lint.ts` | `LOCAL_IPC_PORT` judges only literal first arguments. `listen(port)` with a variable passes. The file comment already says it is a lint. A one-line mention in the check's notes would keep a future reader from relying on it more than it offers. |
| i | `lane-task.ts:116` | A waiter cancelled while its grant commit is in flight is rejected, but the commit still lands. This happens only while the factory is closing, and `start()` clears the lease on restart, so it is benign today. |

## Checked and found sound

- **Command ledger.** The effect and the ledger entry share one commit. A `Refuse` throw rolls back everything, and a repeat returns the stored outcome without writing. Key conflicts are judged on a canonical hash, and `canonicalJson` rejects non-plain values and cycles.
- **Move submission.** The first caller takes the slot and everyone else is judged against the stored record. The `taken`/`inflight` handshake is race-free in a single event loop. A failed commit re-arms the slot instead of returning without progress.
- **Owner lock.** Decide-and-claim is one `BEGIN IMMEDIATE` transaction. Release deletes only the caller's own row. Other hosts are refused, never taken over.
- **Channel.** It uses socket paths only. The directory (0700, real directory, own uid) and the socket (0600) are checked. A pre-existing path owned by someone else is refused. Request lines are capped at 4 MiB, and an unanswered request resolves to an explicit outcome-unknown value instead of hanging.
- **Roadmap restart.** I suspected a task killed before its gate opened might call `openGate` before `ready` and wedge the owner. I tested it: the owner became ready, the task retried, and the gate opened. The design leans on the library retrying the phase, which is acceptable but worth knowing.
- **Dependency hygiene.** Exact pins, a lock that must agree with `package.json`, one import seam enforced by the boundary check, and `DEPENDENCIES.md` kept in step by a test.

## Suggested order of work

1. Fix finding 1 and add the failing-while-holding test.
2. Decide finding 2: record it as a known limit, or schedule the fix.
3. Take the quick wins in 5a, 5c, 5d, 5e and widen the socket hash (finding 4).
4. Revisit finding 3 when the owner is first run unattended.

## Resolution (2026-10-27)

Fixed in the working tree (not committed):

| Finding | Change |
|---|---|
| 1 | `tasks/unit.ts`: a step that fails while it holds the lane now releases it before rethrowing. It skips this when the factory is closing, since restart clears the lease. New test `a unit whose step fails while it holds the lane gives the lane back` in `lane-task.test.ts`. It fails on the old code (the second unit waits) and passes now. |
| 4 | `channel/path.ts`: the socket name uses 16 hex characters of the hash instead of 8. |
| 5a | `lane-task.ts`: `start()` throws a `LaneError` if creating the lane task is refused. |
| 5c | `gate/move.ts`: a move is reduced to `kind`, `decidedBy` and `briefRef` before it is stored or compared. New test `durable/tests/move-shape.test.ts`. |
| 5d | `cli/src/gate-commands.ts`: a failing `stop()` is reported and `kiln owner` exits 1 instead of leaving an unhandled rejection. |
| 5e | `tasks/validate.ts`: the comment now says 0–60000. |

Result: `npm test` gives 474 new tests passing, 0 failing, and `npm run check` passes (network, boundaries, legacy).

Not changed, deliberately:
- **2 (person vs program)** and **3 (reused pid)** are design decisions and need an owner.
- **5b (`lane.create` key namespace), 5f (`tasks.create` owner validation), 5g (storage closed if `Harness.open` throws), 5h and 5i** were left alone. They are either not reachable today, need the library's close API, or are documentation points.
