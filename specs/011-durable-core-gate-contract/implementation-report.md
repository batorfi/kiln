# Implementation report: Durable core and the gate contract (row r13)

**Branch**: `011-durable-core-gate-contract` | **Report date**: 2026-10-27 | **Last code commit**: `0dd753f` (Phase 10) | **Base**: `main`
**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Tasks**: [tasks.md](./tasks.md) · **Readings**: [baseline.md](./baseline.md) · **Lab notebook**: [notes.md](./notes.md) · **Technical overview**: [overview.md](./overview.md)
This file is about the *work*: what was built, how the design carries the contract, **how far the evidence can be trusted**, what changed from the plan, what went wrong on the way and what is still open. It **states**; closing the row (`r13` → `done`, `@PR#N`) is the human's Roadmap-gate move, and this row does not touch `specs/ROADMAP.md`.

> **Reading guide.** Five minutes: §1 and §8. Reviewing the code: §2–§3. Judging the evidence: §4–§5. Picking up the open items: §7–§8.

## 1. Status in one paragraph

**All 80 tasks are done** (none skipped). `kiln/` now has one seam over Pi Durable 1.4.0 and, on it, the gate contract (a gate opens whole; a move and its gate's completion are one commit; keyed exactly once; first move wins; nothing but a person's move settles a gate), the roadmap/row/unit/gate/decision/lane task kinds, one owner per store with a private local channel and a thin CLI, and a proof that attacks all of it by killing the owner. Measured on the finished tree: **`npm test` exit 0 with 472 new tests (r12: 184) and 500 legacy (30 skipped)**; `npm run check` three `PASS`; `legacy/` tree id unchanged; the guarded paths of `main` unchanged; the same 472 pass on **Node 22.19.0, 23.6.0, 24.1.0 and 25.9.0**; a fresh clone reproduces every quickstart scenario. The row meets SC-001 … SC-011 as stated (§6). What it deliberately is not: the walk of the flow (r14), the event stream (r15), workers and models (r16) — the task bodies are shells and the lane is scripted.

## 2. What exists

About **2 150 lines of source** (`packages/durable/src` ≈ 1 880, `packages/lane/src/lane-task.ts` 169, the CLI's `gate-commands.ts` + `gate-usage.ts` 95) and **≈ 3 300 lines of tests** (durable ≈ 2 600, lane 256, CLI 437), plus r12's three checks extended and three documents (`DEPENDENCIES.md`, the durable README, this folder). No build step (Node type stripping).

```text
kiln/packages/durable/src/
  types.ts hooks.ts canonical.ts      the contract in KILN's words · kill/fault points · canonical JSON + hashes
  store.ts services.ts                what the rest of the package may do to a store (no library names)
  library/{open,tasks,docs,version}   THE SEAM: the only importer of the runtime; restartLimit = Infinity; no model provider
  gate/{documents,flow,open,move,state,slots,tasks}   open whole · one-commit move · judged against the stored record · decision + gate tasks
  commands.ts outbox.ts               the command ledger (exactly once) · the outbox (actor + cause, same commit)
  tasks/{roadmap,row,unit,validate,index}              the shells · input validation by name · keyed creation
  factory.ts inspect.ts store-version.ts               openFactory/ready/serve/close · the fresh reader · the library-version guard
  owner-lock.ts owner.ts channel/{path,protocol,server,client}   one owner · private Unix socket · safe-directory rule
kiln/packages/lane/src/lane-task.ts   the lane: createLane() → LaneApi port + the kiln.lane task kind
kiln/packages/cli/src/{gate-commands,gate-usage,main}.ts      kiln owner · kiln gate open|move|state
kiln/checks/…                         boundaries + network extended (pins, lock, one external seam, local-IPC allowlist), each with planted-violation tests
kiln/DEPENDENCIES.md                  the recorded dependency decision, kept equal to package.json and the lock by a test
```

The behaviour is explained in [overview.md](./overview.md) and, kind by kind, in [the task-kind explainers](../../docs/architecture/explainers/kiln-task-kinds/README.md); the words are in [docs/vocabulary.md](../../docs/vocabulary.md).

## 3. The design that carries the contract

* **The gate is two tasks.** `kiln.decision` waits in an owner-memory *slot* and, when a move arrives, does **one commit**: the move record, the `move.committed` outbox entry and its own terminal state. `kiln.gate` follows it and records `gate.settled`. "Settled" means *a move record exists* — read from the store, never from memory — and the gate task is a projection that converges (the r42 `native-signal` composition, re-created in KILN's types).
* **Every answer is judged against the stored record.** Repeat, key-conflict, stale, lost-race are decided by reading what is stored, so they are the same after any restart. The outcome vocabulary is the contract's, closed; r13 added no refusal code.
* **Documents, not transcripts.** Gate, brief, move, command ledger, lane and outbox are document families in the root conversation, committed atomically with tasks. The brief's identity is the sha-256 of its canonical JSON, so "the move names the brief it was decided on" is an equality of two hashes.
* **Commands happen once.** The ledger entry and the effect are one commit; same key + equal request → the first outcome again, same key + other request → `key-conflict`.
* **No timer anywhere on a gate; no kill switch in the product.** The decision step awaits a promise only a move resolves; `restartLimit = Infinity` is set where the runtime is opened; kill points are *injected hooks* (14 gate, 3 unit, 4 lane) armed only by the test-only child owner.
* **One owner, reached through one door.** The owner lock is a single `BEGIN IMMEDIATE` transaction on a small database; a live pid is never taken from. The channel is a `0600` socket in a `0700`, safe-checked directory; a completer sends one request and exits.
* **The seam is a directory.** The runtime is imported from `packages/durable/src/library/` only — enforced by the boundary check, a directory test and a scan of the public declarations (0 library names).

## 4. How far the evidence can be trusted

A proof that cannot fail proves nothing, so the machinery refuses to be vacuous, and was *shown* to refuse.

| Safeguard | What it does | Shown by |
|---|---|---|
| **Declared == used** | the kill points named in `hooks.ts` must equal the names the source calls; a point nothing calls, or a call never declared, fails | `kill-points-declared.test.ts` (scans durable *and* lane source) |
| **Never vacuous** | zero declared points, none fired, or one declared point that never fired **fails by name** and prints `exercised N of N` (gate 14/14, unit 9/9 cases, lane 4/4) | `guard.ts`, `negative.test.ts`, each proof's last test |
| **Broken-gate control** | a deliberately half-applying gate (two commits) must read as violating I2 + I3 *at its own seam and nowhere else* | `negative.test.ts` |
| **Fresh reader + oracle** | tests judge the store as a crash leaves it, read with no owner, against invariants I1–I9 (I8 as a running balance over ordered entries) | `inspect.ts`, `oracle.ts`, `oracle.test.ts` |
| **Mutation checks** | 7 sabotages on a clean tree, each caught by a named test, each undone and the tree verified clean: record without completing the decision · brief check skipped · repeat judged by memory · key-conflict branch dropped · restart un-settles a gate · store failure swallowed · crash-loop guard at the library default | `notes.md` |
| **Separate process** | the exactly-once cases and all 14 kill points re-run with `kiln gate …` as the completer, reported under their own names; the run fails by name if any variant did not run | `different-process.test.ts` |
| **Observed, not promised** | `lsof` on the owner lists no network socket while serving, after a move, after SIGKILL and restart; a control proves the probe sees a real TCP listener | `no-network.test.ts` |
| **Checks that bite** | each planted violation (`listen(8080)`, a host in `connect`, `node:net` in an unlisted file, `node:http` in a listed one, an undeclared external, the runtime imported from `workers`, a `^` pin, a missing lock) fails by name | `check-*.test.ts`, `checks/tests/` |
| **The floor matrix** | the same suite on four Node versions; it found three real problems the installed Node hid (§9) | `baseline.md` |
| **Fresh clone** | clone + `npm ci` + every quickstart scenario | `baseline.md` (T077) |

**Limits of the evidence, stated plainly.**
* **Process death, not power loss.** SIGKILL, crash and out-of-memory are covered; loss of host power may lose the newest commit and is not tested (FR-044; stated in the durable README).
* **macOS only.** Node 22.19.0 – 25.9.0 on one machine; other platforms are not measured.
* **Random kills are seeded and skewed late.** 300 trials, seed `20261026`, delays 0–60 ms: 14 wrecks absent, 60 waiting-whole, 226 settled (the recorded run). They straddle the commit but a tail of the opening window is thin; the 14 named points are what cover every step.
* **The lane and units are scripted.** The proofs show the *structure* (one holder; redo and commit once; release on restart); no real generation, token or model is involved.
* **The suite is long.** The new suite takes 142–166 s (§7).

## 5. Results

| Claim | Evidence |
|---|---|
| A gate survives a kill at every named step | **14 of 14** gate points fire and hold (absent / waiting-whole / settled-whole, never partial; the restart agrees; the same keys finish it once) — in-process **and** from a separate process |
| …and at random instants | 300 kills, 0 violations |
| …and repeated crashes never park it | 7 consecutive kills: still waiting, `reports` empty, next move commits; on a settled gate the record is unchanged |
| No clock settles anything | ±10-year jumps and 2 s of real time: still waiting; the fresh reader finds 0 timers; `decidedAt` is the injected clock |
| Once, first wins | 100 identical → 1 committed + 99 repeat; 100 competing → 1 committed + 99 refused naming the winner; 100 more after SIGKILL → 0 committed — also from 25 concurrent command-line processes |
| One owner | 50 simultaneous real starters → exactly 1 owner; 20 refusals of an owned store naming store, pid, host, socket; takeover after SIGKILL on the first attempt; outcome unknown (exit 4) within 5 s |
| No network | `lsof` empty in every state; static scan finds only the two channel calls, both on socket paths |
| A unit never half-commits | 3 points × 3 steps = 9 of 9; the result equals the uninterrupted one, each step's output once |
| Commands once | 100 concurrent + 100 after a restart → 1 task, 199 repeat; conflicts write nothing |
| The lane | 100 trials of two steps asking at once → max 1 generation; 4 of 4 lane points; 0 holders after each restart until a step asks; resident/hold/swaps unchanged |
| Scale | 100 gates + 20 units: ready in **40 ms** alone (≤ 436 ms inside the full suite); budget 2 000 ms |
| Nothing else moved | `legacy/` tree id `20a82c7e…` unchanged; `git diff --stat main -- legacy specs/ROADMAP.md` empty; legacy suite 500 (30 skipped) as before |

**Success criteria.** SC-001 … SC-008 and SC-011: met as measured above (SC-011 by the store-version guard test: both versions named, 0 tasks resumed, file untouched). SC-006/SC-010: one directory imports the runtime; 0 library names in the public types and contract files (grep prints nothing). SC-009: 472 new + 500 legacy, three `PASS`, on a fresh clone, on the new floor.

## 6. Progress against the plan

| Phase | Tasks | State |
|---|---|---|
| 1 Baseline and dependency | T001–T003 | done |
| 2 Foundations (checks, skeleton, guard, inspection, oracle, harness) | T004–T023 | done |
| 3–4 Gate opens whole; settles once | T024–T036 | done |
| 5 The gate is attacked | T037–T043 | done |
| 6 One seam, shells, scale | T044–T051 | done |
| 7 One owner, channel, CLI | T052–T059 | done |
| 8 Units and commands | T060–T063 | done |
| 9 The lane | T064–T067 | done |
| 10 Adoption record and floor | T068–T072 | done |
| 11 Close-out | T073–T080 | done |

New-test count by checkpoint: 324 (P2) → 355 (P4) → 387 (P5) → 439 (P7) → 453 (P8) → 466 (P9) → **472** (P10).

## 7. Open items

1. **Closing the row** is the human's Roadmap-gate move: `r13` stays `queued` in `ROADMAP.md` until a person records `done` and the PR.
2. **Suite time.** 142–166 s for the new suite against a 180 s threshold; the margin on 24.1.0 is 14 s. If a later row crosses it, the planned move is a `proof` script (`random-kill`, `storm`, `different-process`) with the runner printing which tier ran — never a silent skip.
3. **`kiln owner` has no lane wired.** `createLane()` is composed by whoever builds a factory with a lane (the test owner does); the CLI's owner does not yet, because lane composition belongs with the host (r16+). A unit with `needsLane` is refused at creation on a CLI-started owner, by name.
4. **The lane task is a placeholder.** `kiln.lane` stays alive and does nothing until the scheduler (r16); priority/affinity ordering of waiting steps is FIFO here.
5. **The brief is opaque JSON.** Assembling the ten-part brief, applies-when evaluation, delegation and the move semantics (where work goes after `revise`/`reject`) are r14/r19.
6. **Key retention.** Command keys live as long as what they created; r15's archive must keep them (documented in the durable README and `commands.ts`).
7. **No upgrade path for the runtime.** A store created under another library version is refused by name; an upgrade is a deliberate, recorded change with its own row.
8. **A reused pid blocks start-up.** If a dead owner's pid is reused by an unrelated live process, the starter is refused with a message giving the command that empties the lock row (by design — see §8).
9. **`node:sqlite` is experimental** on the whole supported range; accepted, recorded, canary-tested, and warned about on 22.x.

## 8. Deviations from the plan (all recorded in `notes.md` as they happened)

1. **The owner lock became a transaction.** The plan (R5) was an exclusive-create file with rename-and-verify takeover. It passed light tests and failed the 50-process stress test — two owners in two of five rounds. A look-then-act on a file always has a window. The lock is now one `BEGIN IMMEDIATE` transaction on a small database. Same pattern as the plan's stated fallback (an atomic primitive), using the one engine the row already depends on.
2. **A live pid is never taken from.** R5 allowed taking a lock whose pid is alive but whose channel is silent; that would let a starter steal from an owner that is merely slow, producing two owners. The probe now only enriches the refusal.
3. **The CLI imports three durable modules, not one:** the channel client, the pure socket-path arithmetic and the owner runner (`kiln owner` *is* the owner). A completer uses only the first two. Tested by a scan; `kiln check` never loads the durable package (the gate commands are loaded on demand).
4. **The lane port was reshaped.** `within(tx)` dropped (a release inside someone else's transaction cannot wake the next waiter after the commit succeeds, and a restart clears dead leases anyway); `start()` added. Two extra lane kill points (`…-committed`) cover the case that matters: a lease held by a generation that no longer exists.
5. **Storage is opened in one *file*, two functions** (the owner's store and the ownerless reader), not one function.
6. **Unit hooks and a few harness additions** beyond the task text: `KILL_NTH` in the test owner (die at the n-th hit), `createMany`, `SERVE=1` (so a separate process can complete gates).
7. **Oracle I8 sharpened** to a running balance over ordered entries.

## 9. Problems found on the way (the honest log)

* **A settled draft is unusable** ("Cannot use a settled overlay"): every value handed to a commit is now a plain copy.
* **The roadmap shell passed a numeric task id where a string was required** — caught by its lifecycle test; `TaskId` became an opaque number and the actor `task:<id>`.
* **The mutation script's reverts used the wrong path**, so mutations accumulated (`tree clean after: False`); restored from git, and the script now asserts a clean tree after every revert. All seven were re-run and caught.
* **The lock race** (above) — found by the stress test the plan told us to write.
* **Two tests of the first full run of Phase 7 failed for real reasons:** `main.ts` loaded the gate commands (and with them the runtime) at start-up, so `kiln check` crashed in the check tests' copy of the tree (no `node_modules`); and the test owner printed `DONE` before its `reports` line while the harness kills on `DONE`. Fixed: lazy loading; line order.
* **`kiln owner` installed its SIGTERM handler after printing `ready`**: a signal sent the instant a client saw `ready` killed it with no clean close. A product defect found by a test; handlers are now installed first.
* **The Node-floor matrix found three things the installed Node hid:** `DatabaseSync`'s `timeout` option is ignored on 23.6.0 (a real defect: starters failed with `database is locked` instead of waiting — now `PRAGMA busy_timeout`); `rmSync` refuses a symlink to a directory on 23.6/24.1 (test cleanup); and a stress round saw two "owners" on 24.1.0 because the winner released after a fixed hold and a slow-booting starter acquired legitimately (starters now hold until all have tried, so a second owner would now be a true violation).
* **Smaller:** a spot-check test expected only I4 where I2 + I4 is right; r12's tests expected "0 external seams"; a kill-point test compared a restart that also resubmitted the move; a `stepMs` of 600 000 was correctly refused; a foreground random-kill run was declined by the user and run in the background instead.

## 10. Where to look next

* The contract a next-row author needs: [contracts/gate-contract.md](./contracts/gate-contract.md), [seam-api.md](./contracts/seam-api.md), [owner-channel.md](./contracts/owner-channel.md).
* The behaviour of each kind of task: [docs/architecture/explainers/kiln-task-kinds/](../../docs/architecture/explainers/kiln-task-kinds/README.md); the words: [docs/vocabulary.md](../../docs/vocabulary.md).
* The proof, in this order: `packages/durable/tests/proof/support/oracle.ts` → `kill-points.test.ts` → `exactly-once.test.ts` → `different-process.test.ts` → `packages/lane/tests/lane-proof.test.ts`.
* The numbers: [baseline.md](./baseline.md) (a checkpoint per phase, the floor matrix, the fresh-clone run). What the work learned: [notes.md](./notes.md).
