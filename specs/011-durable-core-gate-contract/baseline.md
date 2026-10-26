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
