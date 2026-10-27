# Baseline and control readings: row r13

**Branch**: `011-durable-core-gate-contract` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Tasks**: [tasks.md](./tasks.md)

The numbers this row is compared against (spec FR-063, SC-009) and the facts measured while building it, each with the command that produced it. Entries are appended as tasks complete; none is edited after the fact.

## Before (T001) — 2026-10-26

Taken on branch `011-durable-core-gate-contract` after the specification, plan and tasks were committed and **before any file under `kiln/` changed**. `main` is `811a495` (r42 closed, PR #5 merged).

| Reading | Command | Result |
|---|---|---|
| New + legacy suites | `cd kiln && npm test` | exit **0** — `new: 184 tests · legacy: 500 tests (30 skipped)` |
| Live-Pi tier | (printed by the runner) | `live-Pi tier skipped: Pi 1.4.0 installed, measured [0.85.1]` |
| The three checks | `cd kiln && npm run check` | exit **0** — `PASS network — scanned 22 files` · `PASS boundaries — scanned 22 files` · `PASS legacy — scanned 168 files` |
| `legacy/` tree id | `git rev-parse HEAD:legacy` | `20a82c7e214be256c804f6e8f1cd4cce9c8e9874` |
| Difference from `main` in the guarded paths | `git diff --stat main -- legacy specs/ROADMAP.md` | **empty** |

### Environment

| | |
|---|---|
| Node | v25.9.0 |
| npm | 11.14.1 |
| Platform | macOS (Darwin 25.6.0) |

## Pin (T002) — 2026-10-26

`npm install --save-exact @earendil-works/pi-durable@1.4.0 @earendil-works/pi-ai@1.4.0 @earendil-works/chord@1.4.0` in `kiln/` (the one network act of this phase); `engines.node` → `^22.19.0 || >=23.6.0`. `package.json` has no `^` or `~`; `package-lock.json` (new, committed) lists **91 packages**.

| Package | Version | Integrity vs r42's lock |
|---|---|---|
| `@earendil-works/pi-durable` | 1.4.0 | **equal** |
| `@earendil-works/pi-ai` | 1.4.0 | **equal** |
| `@earendil-works/chord` | 1.4.0 | **equal** |

**Finding:** the fresh install resolved one *transitive* package differently from r42's lock: `@smithy/core` 3.37.0 (new) vs 3.36.2 (r42). The library pins its own direct dependencies exactly, but this one floats beneath `pi-ai`. r42's evidence was produced on 3.36.2, so `kiln/package-lock.json` was **aligned to r42's tree** (that one entry copied) and re-verified: **0 of 91 packages differ** from `spikes/r42/package-lock.json`, and `npm ci` accepts it. A later `npm update` would drift it again; that is exactly what the pinned lock and the `boundary-lock-mismatch` rule (T005) are for.

## After the install, nothing else changed (T003) — 2026-10-26

`cd kiln && rm -rf node_modules && npm ci && npm test && npm run check`; `node_modules` is ignored (`git check-ignore node_modules`).

| Reading | Result | Equal to T001? |
|---|---|---|
| `npm test` | exit **0** — `new: 184 tests · legacy: 500 tests (30 skipped)` | **yes** |
| `npm run check` | exit **0** — three `PASS` (22 · 22 · 168 files) | **yes** |

## Phase 2 checkpoint (T004–T023) — 2026-10-26

The checks learned about the dependency (each widening with planted-violation tests), the seam's skeleton exists, a fresh-reader inspection and an oracle that can fail exist, and a child owner can be killed and restarted.

| Reading | Result |
|---|---|
| `npm test` | exit **0** — `new: 324 tests · legacy: 500 tests (30 skipped)` (r12: 184; +140: 68 boundary-dependency, 31 network-local-ipc/externals, 6 hashing, 21 oracle, 7 owner-lock, 7 skeleton) |
| `npm run check` | three `PASS` (38 · 38 · 168 files); notes: `1 external seam`, `3 dependencies, exact and locked`, `local-IPC allowlist: 2 files` |
| `git rev-parse HEAD:legacy` | `20a82c7e214be256c804f6e8f1cd4cce9c8e9874` — unchanged |

**Findings recorded as they happened**
- r12's own `check-boundaries.test.ts` asserted the real tree had "0 external seams"; r13 admits exactly one, so that expectation was updated to "1 external seam" + "3 dependencies, exact and locked" (a deliberate change, not a loosening).
- A new failure code, `boundary-package-json-invalid`, was added beside the three in the contract (an unreadable `package.json` must fail by name, not silently skip the dependency rules).
- The oracle test first expected two records on a settled gate to be "I4 only"; the oracle correctly said I2 **and** I4 (a settled gate needs *exactly one* record). The test was corrected, not the oracle.
- The two channel files exist as empty stubs (T008) so `allowlist-missing-file` has been strict since the first commit.

## Phase 3–4 checkpoint (T024–T036): the gate opens whole and settles once — 2026-10-26

| Reading | Result |
|---|---|
| `npm test` | exit **0** — `new: 355 tests · legacy: 500 tests (30 skipped)` |
| `npm run check` | three `PASS` (47 · 47 · 168 files) |

What is proven so far (child owner, SIGKILL, fresh reader):
- **Opening** killed at `open.begin`, `open.after-write`, `open.committed`: the gate is absent or whole — never partial — and re-opening with the same key yields one gate and one `gate.opened`.
- **The move**, 100 concurrent identical → **1 committed, 99 repeat, 1 record**; 100 different keys → **1 committed, 99 refused naming the winner**; 100 more after a SIGKILL and restart → **0 committed, 100 repeat**; conflict, stale, invalid (no decider, kind outside the vocabulary, no brief, another brief), unknown gate (no gate created), not-ready during start-up then the same key commits, injected store failure then the same key commits.
- Events: `gate.opened` (actor opener, cause key), `move.committed` (actor decider, cause key) in the move's commit, `gate.settled` (actor factory) in the gate task's terminal commit.

**Findings recorded as they happened**
- A library behaviour not in r42's notes: **values assigned into a document draft become part of its overlay and are unusable once the commit settles** ("Cannot use a settled overlay"). Every value that crosses the commit boundary (a stored ledger outcome, an outbox entry, a gate document, a move record) is therefore copied through JSON (`plain()`) on the way in and on the way out. The first run of the ledger repeat path crashed on exactly this.
- The not-ready test first failed because it had no gate to find after the restart (`unknown-gate` is the correct answer to a gate that does not exist): the test was rewritten to open the gate first, close the factory, then reopen with registration held back.
- The decision step's `wait.before-register` hook returns a promise so a test can hold registration back deterministically (FR-043); `Hooks.at` is therefore `void | Promise<void>` and the product awaits it.

## Phase 5 checkpoint (T037–T043): the gate is attacked and holds — MVP of the row — 2026-10-26

| Reading | Result |
|---|---|
| `npm test` | exit **0** — `new: 387 tests · legacy: 500 tests (30 skipped)`; wall time **2 min 38 s** for the whole run (≈ 125 s the new suite; T074's 3-minute budget not yet exceeded) |
| `npm run check` | three `PASS` (47 · 47 · 168 files) |

The proof, as run:
- **Every declared kill point fires** — `kill points exercised: 14 of 14` (`open.begin`, `open.after-write`, `open.committed`, `wait.before-register`, `wait.registered`, `move.received`, `move.commit-begin`, `move.commit-after-read`, `move.commit-after-write`, `move.committed`, `move.ack-sent`, `gate.wake`, `gate.settled`, `recover.start`). After each: the wreck is clean (I1–I9), a restart changes nothing it should not (I5/I6), the same keys are safe to retry (`repeat` if stored, `committed` if not), and in the end exactly one `gate.opened`, one `move.committed`, one `gate.settled`, one record.
- **300 random kills** (seed 20261026, 0–60 ms): 14 absent · 60 waiting-whole · 226 settled — 0 violations.
- **7 consecutive kills** with no move: waiting each time, `reports` empty, the next valid move **commits**; on a settled gate the record is unchanged.
- **Clock ±10 years**, 2 s of real time, a headless gate: still waiting, **0 timers**; `decidedAt` is the injected clock (a fact).
- **Controls:** the deliberately half-applying gate is caught as **I2 + I3** at its seam and clean elsewhere; a vacuous run fails by name (`proof-zero-kill-points`, `proof-no-point-fired`, `proof-point-not-fired`); the declared list equals the points the source uses; no `process.env` under `src/`.
- **7 mutation checks**, all caught (see `notes.md`).

## Phase 6 checkpoint (T044–T051): one seam, the task kinds, scale — 2026-10-27

- **One door (T044):** across every file of every package — source *and* tests — the library is named only under `packages/durable/src/library/`; the package's exported declarations contain none of its names (SC-010); the models object is built with no argument and nothing in the tree registers a provider or can make a model request; `durable` imports nothing above it.
- **The task kinds have a life (T045–T050):** unit, row and roadmap are created through the seam (keyed), killed mid-life, restarted, and finish with the outcome they would have had. The roadmap opens gate0, waits through two restarts with no move, and settles **only** through a person's move; a move with no decider is `invalid-move`; any input but `{factory}` — a delegation among them — is refused by name. A fresh reader sees every task's kind, owner and status.
- **Scale (T051, SC-005):** 100 open gates + 20 live units, SIGKILL, restart → **ready in 42 ms**; 99 further moves committed in 55 ms; none `not-ready`; the 20 units resumed. Budget 2000 ms.
- **`npm run check`:** three `PASS` (53 · 53 · 168 files).

**Findings recorded as they happened**
- The roadmap test caught a defect in the first version of the roadmap shell: it passed the library's task id (a **number**) where a string actor was required, so opening the Roadmap gate was refused and the task ended `failed`. Nothing was approved (a failed task settles nothing), but the shell was wrong, and so were the types: **`TaskId` is now an opaque number** everywhere (the library mints numeric ids), and the roadmap's actor is `task:<id>`.
- `stepMs` of a scripted unit is capped at 60 000 ms by validation; the scale test's first run used 600 000 and was correctly refused.

## Phase 7 checkpoint (T052–T059): one owner, a private channel, a thin CLI — 2026-10-27

| Reading | Result |
|---|---|
| `npm test` | exit **0** — `new: 439 tests · legacy: 500 tests (30 skipped)`; whole run ≈ **3 min** — the 3-minute budget of T074 is now used up, so T074 must decide on a split |
| `npm run check` | three `PASS` (57 · 57 · 168 files) |

- **The owner lock (T018, T052).** 50 real simultaneous starters: exactly **one** owner and 49 refusals naming it — on a fresh store, on a stale lock (three rounds) and on a torn lock file. The first design (hard-link create, rename-and-put-back takeover) failed this test (two owners in 2 of 5 rounds); the lock is now one `BEGIN IMMEDIATE` transaction on a small lock database (`notes.md`).
- **Channel and CLI (T053–T057).** Every contract outcome comes back from a separate `kiln gate …` process (exit 0 for any answered request); **20** attempts to own an owned store → 20 refusals naming store, pid, host and socket, the first owner unharmed; after SIGKILL a new process takes over on its first attempt; owner SIGKILLed mid-move → exit 4 *outcome unknown* at once (`connection-lost`), a silent owner → exit 4 after the full 5 s (`timeout`), and the same key then finishes the job; socket `0600` in a `0700` directory; a symlink, a wrong-mode directory and (over a stat result) a directory owned by someone else are each refused with `ChannelUnsafe`; a 200-character store path gives a short socket path; a clean SIGTERM removes socket and lock.
- **No network (T058).** `lsof -nP -a -i -p <owner>` is empty while serving, after a move and after a SIGKILL and restart; the control sees a real TCP listener; the static scan finds exactly the two channel calls and none with a port or host.
- **Different process (T059).** The five exactly-once cases (100 identical + 100 after restart; 100 competing; every refusal; a move during start-up; an injected store failure) and **14 of 14** kill points, with the completer a separate process: 20 tests, ≈ 100 s.

**Findings recorded as they happened**
- The first full run of the phase failed 8 tests, two causes, both real: (1) `main.ts` imported the CLI's gate commands at load time, which loaded the durable package and the library — so `kiln check` crashed in the check tests' copy of the tree (which has no `node_modules`); the commands are now loaded on demand. (2) The test owner printed `DONE` before its `reports` line and the harness kills a child the moment it reads `DONE` — the storm tests failed under load; the line now comes first.
- The second full run failed one test: `kiln owner` installed its SIGTERM handler *after* printing `ready`, so a signal sent the moment `ready` was read killed the owner with no clean close (a product defect, not only a test one). The handlers are now installed before anything is announced.

## Phase 8 checkpoint (T060–T063): a unit's step is redone, never half-recorded; every command happens once — 2026-10-27

| Reading | Result |
|---|---|
| `npm test` | exit **0** — `new: 453 tests · legacy: 500 tests (30 skipped)` |
| `npm run check` | three `PASS` (57 · 57 · 168 files) |

- **Units (T060, T062).** Three unit kill points (`unit.step-begin`, `unit.step-after-work`, `unit.step-committed`) × each of 3 steps = **9 of 9** cases fire; at every one the owner dies by SIGKILL at the point, a fresh reader sees one unit with no result (except after the *final* commit, where the result is whole), and a restart finishes with exactly the uninterrupted result (`scan:0, scan:1, scan:2` — each step's output once). The never-vacuous test fails by name if a case did not fire. The static test still holds (declared == used) with the three new names.
- **Commands (T061).** `task.create` ×100 at once → 1 created + 99 repeat; ×100 after a SIGKILL and restart → 100 repeat; one task; one request hash under the key (I9). Same key with another input or another kind → `key-conflict`, nothing written, before and after a restart. `gate.open` and `gate.move` keys obey the same rule.
- **Documents (T063).** `packages/durable/README.md`: what the seam is, the contract links, the key-retention rule, the power-loss boundary (process death covered; host power loss not).
- **Harness.** The test owner learned `KILL_NTH` (die at the n-th time a point is reached) and `createMany`; the gate proofs now iterate `GATE_KILL_POINTS` so unit and lane points are driven by their own proofs.
