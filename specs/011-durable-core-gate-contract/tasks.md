---

description: "Task list for the durable core and the gate contract (row r13)"
---

# Tasks: Durable core and the gate contract (row r13)

**Input**: Design documents from `/specs/011-durable-core-gate-contract/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md); [research.md](./research.md) (R1–R13), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: **Included — they are the acceptance.** The row's own words are "proven by kill-and-resume" (FR-060 … FR-063): the proof, the planted-violation tests of the checks and the control that shows the proof can fail are the deliverable, not decoration. Where a proof needs the code it judges, it comes **after** that code (the gate is built, then killed); where a unit test pins an interface, it comes **before**.

**Organization**: by user story, in the order the *implementation* needs them (all four P1 stories first: **US3 → US2 → US1 → US4**; then the P2 stories **US7 → US5 → US6 → US8**). The gate is one mechanism seen by three stories — *opening* (US3), *the move* (US2), *waiting and surviving* (US1) — so US3 and US2 build it and US1 attacks it. US7's channel is needed only by the *separate-process* variants of the proofs, which is why the earlier proofs run their completer **inside** the test-only child owner (a script).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1…US8 as in [spec.md](./spec.md); Setup, Foundational and Polish tasks have none
- Paths are relative to the repository root. `kiln/` is the codebase; `P/durable` below abbreviates `kiln/packages/durable`.

## Ground rules (from the plan and from r42's lessons)

- **Only `P/durable/src/library/` imports the library.** Nothing else — source or test — may; the checks and `seam.test.ts` say so.
- **No environment variable in product code can kill or fault a factory.** Kill points are injected `hooks`; the *test-only* child owner (`P/durable/tests/proof/support/owner-main.ts`) is the one file that reads arming from its environment, and it lives in a `tests/` directory (outside the network lint's scan roots).
- **Mutation checks are done on a committed tree and undone before anything else runs** (r42 found an uncommitted sabotage still in the tree). Never weaken an assertion to get a pass; fix the code or the harness.
- **The checks land before the code that needs them**, so `npm run check` is three `PASS` at every commit of the branch.
- Every phase ends with a commit and a recorded checkpoint in `specs/011-durable-core-gate-contract/baseline.md` (T001 creates it; later tasks append).
- Nothing here edits `specs/ROADMAP.md`: closing r13 is the human's Roadmap-gate move.

---

## Phase 1: Setup (the dependency, installed and still unused)

**Purpose**: take the "before" readings, pin the dependency, and prove that merely having it changes nothing r12 guaranteed.

- [X] T001 Take the **"before"** control readings and create `specs/011-durable-core-gate-contract/baseline.md`: Node and npm versions; `cd kiln && npm test` (exit code, the closing line `new: 184 tests · legacy: 500 tests (30 skipped)`); `npm run check` (three `PASS` with their file counts); `git rev-parse HEAD:legacy` (must be `20a82c7e214be256c804f6e8f1cd4cce9c8e9874`); `git diff --stat main -- legacy specs/ROADMAP.md` (empty) — each with the command that produced it. Taken **before** any file of this row under `kiln/` changes.
- [X] T002 Pin the dependency in `kiln/package.json`: `dependencies` = exactly `"@earendil-works/chord": "1.4.0"`, `"@earendil-works/pi-ai": "1.4.0"`, `"@earendil-works/pi-durable": "1.4.0"` (no `^`/`~`); `engines.node` = `"^22.19.0 || >=23.6.0"`; run `npm install --save-exact …` **in `kiln/`** (the one network act of this phase) to produce `kiln/package-lock.json`. Verify that every `integrity` of those three packages **equals** the one in `spikes/r42/package-lock.json` (r42's recorded triple: pi-durable `sha512-EtIyXH1M…`, pi-ai `sha512-hQM/C4+1…`, chord `sha512-dTbgyz4x…`) and that the lock lists 91 packages; record the comparison in `baseline.md`.
- [X] T003 Confirm `kiln/node_modules` is ignored (`git check-ignore kiln/node_modules`), then run `cd kiln && npm ci && npm test && npm run check` and compare with T001: **identical counts and three `PASS`** (the library is installed and imported by nothing). If anything differs — the install itself broke an r12 guarantee — stop and fix before going on. Append to `baseline.md`.

**Checkpoint**: the dependency is pinned, locked and inert; r12's readings are unchanged. Commit.

---

## Phase 2: Foundational (the checks first, then the seam's skeleton and the proof harness)

**Purpose**: everything every story needs, in the order that keeps `npm run check` green: the checks learn about the dependency (with planted-violation tests), then the seam's skeleton, the fresh-reader inspection, the oracle and the child-owner harness.

**⚠️ CRITICAL**: no user story starts until this phase is complete.

### The checks (contracts/checks-and-docs.md)

- [X] T004 [P] Edit `kiln/checks/boundaries.json`: add the layer edge `"cli": { "imports": [..., "durable"] }`; add `externals.pi-durable` with `specifiers` = `@earendil-works/pi-durable`, `@earendil-works/pi-durable/storage/sqlite/node`, `@earendil-works/chord/context`, `@earendil-works/pi-ai/models` **and `@earendil-works/pi-durable/package.json`** (the installed-version read of the store guard, FR-047) and `onlyIn: ["durable"]`.
- [X] T005 Extend `kiln/checks/boundaries.ts` with the three new failure codes — `boundary-dependency-unpinned` (a range, a tag, a URL or a path in `dependencies`), `boundary-dependency-undeclared` (a bare specifier whose package is not in `dependencies`, or a dependency no external seam names), `boundary-lock-mismatch` (`kiln/package-lock.json` absent or disagreeing on a name or version) — **inside the existing check** (it stays one of three; `CHECK_NAMES` unchanged). Keep every existing code and message.
- [X] T006 [P] Write `kiln/checks/tests/boundaries-dependencies.test.ts`: against a temporary tree, each of these **fails by name** — `^1.4.0`, `~1.4.0`, `latest`, a git URL, a file path; an import of a package absent from `dependencies`; a dependency no seam names; the library imported from `workers` — **in every import spelling** the lexer and r12's `network-spellings.test.ts` cover (`import x from`, `import "x"`, `import type`, `export … from`, dynamic `import()`, `require`, an aliased re-export) against **each** of the five declared specifiers (`boundary-bare-specifier` every time; SC-006's "100 %"); a missing lockfile; a lockfile that disagrees — and the real tree passes. Its assertions name the code, not the wording.
- [X] T007 Extend `kiln/checks/network-lint.ts`: (a) `network-external-dependency` no longer fires for a specifier that `boundaries.json → externals` opens **for the file's own package** (read the same rules file the boundary check uses; one source of truth) and still fires everywhere else; (b) a **local-IPC allowlist** (T008): in a listed file `node:net` is allowed, and the new codes `network-local-ipc-port` (a `listen`/`connect`/`createConnection` argument that is a number, an options object, or a string that is not an absolute path) and `network-local-ipc-other` (any other network module in a listed file) apply; `node:net` in an unlisted file stays `network-import`; (c) the allowlist's self-checks reuse `allowlist-bare-name` and `allowlist-missing-file`. Never-vacuous behaviour and every existing code unchanged.
- [X] T008 [P] Create `kiln/checks/local-ipc.json` (`{"schema": 1, "entries": ["packages/durable/src/channel/server.ts", "packages/durable/src/channel/client.ts"]}`, path-keyed like `network-allowlist.json`). The two files do not exist yet, so **create both as empty stub modules** (`export {};` with a header comment naming T053) in the same task: `allowlist-missing-file` then stays strict from the first commit and the allowlist is never leniently vacuous. T053 fills them.
- [X] T009 [P] Write `kiln/checks/tests/network-local-ipc.test.ts` and `kiln/checks/tests/network-externals.test.ts` — each **fails by name** on: `server.listen(8080)`, `listen({port: 1})`, `connect("example.com")`, `connect({host: "x"})`, `connect(3000, "localhost")`, `node:net` in an unlisted file, `node:http` in a listed file, a non-absolute socket path, a bare-name allowlist entry; and each **passes**: `connect(path)` with a variable, `listen("/tmp/x.sock")`, the declared specifier in `durable`, the same specifier refused in `workers`. Plus a regression test that r12's `network-strictly-stronger.test.ts` still holds.
- [X] T010 Run r12's own check tests and the real checks on the changed rules: `cd kiln && npm test -- checks/tests packages/cli/tests` and `npm run check` — **all green, three `PASS`**, counts ≥ T001 plus the new tests. Record in `baseline.md`.
- [X] T011 [P] Update the one stated responsibility of each package that changes: `kiln/packages/durable/kiln.json` ("The one seam over Pi Durable: …, the gate contract, task kinds, the command ledger, one owner per store and its local channel"), `kiln/packages/lane/kiln.json` (the lane task now arrives with r13), `kiln/packages/workers/kiln.json` ("the only importer of pi-ai **for model calls**"; the seam imports `createModels` only to satisfy the library's required option — R1).

### The seam's skeleton

- [X] T012 [P] Create `kiln/packages/durable/src/types.ts`: the contract's types in KILN's terms only (`GateSpec`, `Move`, `MoveRecord`, `Outcome`, `OpenOutcome`, `GateState`, `RefusalReason`, `Inspection`, `Report`, `TaskKind`, `Checkpoint`, `Key`, `OutboxEntry {seq, type, subject, at, actor, cause, data}`, the **`LaneApi` port** `{acquire, release, within}` and `Lease`) exactly as in `contracts/gate-contract.md` and `contracts/seam-api.md` and `data-model.md` §2–§4. No import of the library, no library name.
- [X] T013 [P] Create `kiln/packages/durable/src/hooks.ts`: `Hooks` (`at(point)`, `fault(point)`), the no-op default, and the **declared** `KILL_POINTS` and `FAULT_POINTS` constants listed in research R7 (`open.begin`, `open.after-write`, `open.committed`, `wait.registered`, `move.received`, `move.commit-begin`, `move.commit-after-read`, `move.commit-after-write`, `move.committed`, `move.ack-sent`, `gate.wake`, `gate.settled`, `recover.start`, and the unit and lane points added in T062/T066; fault point `store-write`).
- [X] T014 [P] Create `kiln/packages/durable/src/canonical.ts` (canonical JSON, `sha256Hex`, `briefRef`, `requestHash`) and `kiln/packages/durable/tests/hashing.test.ts`: key order and whitespace never change a hash; different content always does; non-JSON input is refused.
- [X] T015 Create `kiln/packages/durable/src/library/open.ts` — **the only place the library is opened**: open the Node-SQLite storage at `<store>/factory.sqlite`; `Harness.open` with `settings.restartLimit = Infinity` (FR-040), `models` = `createModels()` from `@earendil-works/pi-ai/models` **with no provider registered** (R1), the injected `now`, and `onReport` appending to a `reports` list; `resume()`; the clean `close()`. **Store-version guard (FR-047, research R14):** create `kiln/packages/durable/src/library/version.ts` (the installed version by a JSON import of `@earendil-works/pi-durable/package.json`, overridable only through `FactoryOptions.installedLibraryVersion`), have the commit that creates a store write `kiln.store`, and compare the recorded and installed versions **right after the storage opens and before `resume()`** — a difference throws `StoreVersionMismatch {store, recorded, installed}` and writes nothing. A header comment states the decisions (never park, no provider, one place, version guard).
- [X] T016 [P] Create `kiln/packages/durable/src/library/docs.ts` (document families `kiln.store`, `kiln.gate`, `kiln.brief`, `kiln.move`, `kiln.outbox`, `kiln.command`, `kiln.lane`, scope conversation, in the root conversation) and `kiln/packages/durable/src/library/tx.ts` (KILN's `Tx` wrapper: `read`, `write`, `createTask`, `append` — no clock, no sleep, no foreign task transition).
- [X] T017 [P] Create `kiln/packages/durable/src/library/tasks.ts`: `defineKilnTask(kind)` mapping a KILN `TaskKind` to the library's task definition and extension, carrying the required `abort` handler; `runtime.commit`, `outcomes`, `wait(slot)` and `signal` exposed as KILN's `Runtime`.
- [X] T018 Create `kiln/packages/durable/src/owner-lock.ts` and `kiln/packages/durable/tests/owner-lock.test.ts` (R5): exclusive-create `<store>/owner.lock` with `{pid, host, startedAt, socket}`; refuse a live same-host owner (**liveness here is pid existence only** — the channel probe is added in T055) with `StoreOwned {store, pid, host, socket}`; refuse a **foreign-host** lock (never take it); take over a **stale** lock by atomic rename + verify-and-put-back; clean close removes it. The unit test covers: fresh store, live owner (refused, message names all four fields), stale (dead pid) takeover, foreign host refused, close removes. (The 50-concurrent-starters stress is T052.)
- [X] T019 Create `kiln/packages/durable/src/factory.ts` (`openFactory`, `Factory`, `close`, `reports`, `ready`): take the lock, open the library (T015), register the extension's task kinds, call `hooks.at("recover.start")` first, resume, expose `gates`/`tasks`/`commands` as stubs filled by later tasks; `ready` resolves immediately for now (T035 gives it its real meaning).
- [X] T020 Create `kiln/packages/durable/src/inspect.ts` — `inspectStore(store)`: a **fresh reader** (no owner, no lock, no Harness): reads tasks, documents and the outbox through a read-only storage session and returns the `Inspection` of `data-model.md` §7 (**the task set with kind, owner and status — FR-005**; gate absent/waiting/settled; documents present including `gate.opened`, `move.committed` and `gate.settled` entries; records; decision status and match; timers; lane facts; command hashes). It also reports the store's recorded library version and contract number (`Inspection.store`, FR-047) **without** comparing it — a diagnosing reader must be able to read an old store.
- [X] T021 [P] Create `kiln/packages/durable/tests/proof/support/oracle.ts` (invariants **I1–I9** over an `Inspection` — I3 includes the outbox entries with actor and cause, and I8 the lane entries — plus `checkStability(before, after)` for I5/I6) and `kiln/packages/durable/tests/oracle.test.ts`: for **each** invariant a hand-built inspection that violates only it is reported with that code, and a clean one reports none (the oracle is shown able to fail before anything is judged by it).
- [X] T022 Create the child-owner harness: `kiln/packages/durable/tests/proof/support/owner-main.ts` (a **test-only** process that opens a factory through the seam, reads its arming — kill point, fault point, start delay, clock offset — from its environment, runs a **script** of steps given as JSON on argv (`open`, `submit`, `submitMany`, `state`, `createTask`, `wait`), prints each result as one JSON line and `ready`, and dies by `SIGKILL` at an armed point via `hooks.at`) and `kiln/packages/durable/tests/proof/support/harness.ts` (`makeStore`, `startOwner`, `killNow`, `restart`, `inspectAfter`, unconditional cleanup of every process, a hard per-start timeout, a `fired(point)` check from a kill log). A test that fails must never leak an owner or hang the run.
- [X] T023 [P] Write `kiln/packages/durable/tests/seam-skeleton.test.ts`: open a factory on an empty store and close it cleanly; reopen the same store; a second `openFactory` on an owned store throws `StoreOwned`; `reports` is empty; the child owner (T022) starts, prints `ready`, and is killed and restarted by the harness. **Store-version guard (FR-047):** create a store, close it, reopen it with `installedLibraryVersion: "9.9.9"` → `StoreVersionMismatch` naming `1.4.0` and `9.9.9`, **0 tasks resumed** (a gate task left `waiting` is not touched), and the store file byte-identical before and after; reopen with the real version → opens; a pure unit test of `checkStoreVersion(recorded, installed)` (equal passes; any difference, including a patch, refuses); `inspectStore` reports the recorded version for the mismatched store.

**Checkpoint**: the checks accept the dependency and refuse every planted violation; a factory opens, closes and reopens through the seam; a fresh reader and an oracle that can fail exist; a child owner can be killed and restarted. `npm run check` is three `PASS`. Commit.

---

## Phase 3: User Story 3 — A gate opens whole, with the brief exactly as it will be shown (Priority: P1) 🎯 MVP

**Goal**: opening commits the gate document, the brief as shown and `gate.opened` **together**; absent or whole after any crash; keyed.

**Independent Test**: kill the owner at every named step of opening; afterwards the gate is absent or whole; opening again with the same key yields one gate and one outbox entry.

### Tests first (they fail until the implementation)

- [X] T024 [P] [US3] Write `kiln/packages/durable/tests/proof/open-outcomes.test.ts` (in-process, no kills): `Opened`; `Repeat` (same key, equal spec); `key-conflict` (same key, different spec; another key for an existing gate id); `invalid-move` (gate key not in the flow, a gate absent from flow v1 such as `2a`, malformed id, a brief that is not JSON); exactly one `kiln.gate`, one `kiln.brief`, one `gate.opened` entry; the stored brief hashes to `briefRef`; the vocabulary snapshot equals the flow's `moveVocabulary` at opening.
- [X] T025 [P] [US3] Write `kiln/packages/durable/tests/ledger.test.ts`: the command ledger — first apply writes the entry and effect together; equal repeat returns the stored outcome and writes nothing; same key with another request hash is `key-conflict`; the ledger and the effect are in the **same commit** (an injected fault leaves neither).

### Implementation

- [X] T026 [US3] Create `kiln/packages/durable/src/outbox.ts` (append-only `kiln.outbox`, `seq` assigned in the commit; every entry `{type, subject, at, actor, cause, data}` — an entry **without actor or cause throws**; typed constructors for `gate.opened`, `move.committed`, `gate.settled`, `lane.acquired|released|swapped`) and `kiln/packages/durable/src/gate/documents.ts` (read/write helpers for `kiln.gate`, `kiln.brief`, `kiln.move`; immutability enforced: a second write of `kiln.gate` or `kiln.brief` is a programming error that throws).
- [X] T027 [US3] Create `kiln/packages/durable/src/commands.ts`: the **command ledger** helper `runCommand(key, kind, request, effect)` of research R4, used inside the effect's own commit; `CommandApi.run` on the factory.
- [X] T028 [US3] Create `kiln/packages/durable/src/gate/tasks.ts`: the `kiln.gate` task (phase `open`: create the decision child, park waiting on it; phase `settle`: read the decision's outcome, commit terminal) and the `kiln.decision` task definition (its waiting step is filled in T033; here it is registered with a placeholder that never commits). Names and checkpoints as in `data-model.md` §1.
- [X] T029 [US3] Create `kiln/packages/durable/src/gate/open.ts` — `openGate(key, spec)`: validate against `#contracts/flow/index.ts` (`hasGate`, `flowOf`, `moveVocabulary`) and the id charset; compute `briefRef`; **one commit** (through T027's ledger) writing `kiln.gate`, `kiln.brief`, the `gate.opened` outbox entry (**actor** = `spec.openedBy`, **cause** = the command key) and creating the gate task; `hooks.at("open.begin")`, `"open.after-write"` (after the writes, before the commit returns), `"open.committed"` (after it resolved); outcomes per `contracts/gate-contract.md`.
- [X] T030 [US3] Create `kiln/packages/durable/src/gate/state.ts` (`gateState`: `unknown` / `waiting`, read from the store never memory; `settled` is added in T035) and wire `factory.gates.open` and `factory.gates.state` in `kiln/packages/durable/src/factory.ts`.
- [X] T031 [US3] Write `kiln/packages/durable/tests/proof/open.test.ts` (child owner, kills): killed at `open.begin`, `open.after-write` and `open.committed` while opening, a fresh reader finds the gate **absent or whole** (document + brief + outbox entry — oracle I3/I4), a restarted owner agrees, and re-opening with the same key yields exactly one gate and one `gate.opened`; the point **fired** each time (never vacuous). Then settle it (T035) and read the move: it names the brief hash it was decided on. Also assert the `gate.opened` entry exists in every whole gate and carries a non-empty actor and cause (I3).

**Checkpoint**: opening is atomic and keyed; T024/T025/T031 green. Commit.

---

## Phase 4: User Story 2 — A person's move settles a gate once, atomically, first move wins (Priority: P1) 🎯 MVP

**Goal**: the r42 composition, re-created in KILN's types: the decision step waits in the owner's memory and completes the gate in one commit; every outcome of the contract.

**Independent Test**: from the child owner's script, 100 identical moves, 100 competing moves, then a stale, an invalid, a conflicting and an unknown-gate move, a move during start-up and an injected store failure — exactly one record, every refusal named and harmless.

### Tests first

- [X] T032 [P] [US2] Write `kiln/packages/durable/tests/proof/outcomes.test.ts` (in-process): `Committed`; `Repeat`; `key-conflict`; `stale` naming the winner; `lost-race` (two submissions racing for the slot); `invalid-move` for **each** of: blank `decidedBy`, kind outside the gate's vocabulary, **no `briefRef`**, **a `briefRef` other than the gate's**; `unknown-gate` (and that no gate is created by it); `not-ready` before `ready`; `store-error` via the injected `store-write` fault, the gate still waiting, no record, and the same key committing afterwards. Each refusal asserts the store is unchanged (inspection equal before and after).

### Implementation

- [X] T033 [US2] Create `kiln/packages/durable/src/gate/slots.ts` (owner-level slot registry: `registered`, `taken`, `inflight`, single-shot delivery) and fill the **decision step** in `kiln/packages/durable/src/gate/tasks.ts`: register the slot; await it or the factory's abort signal; on a request run **one commit** that reads `kiln.move`, returns "lost" if a record exists, else writes `{gateId, key, move, decidedAt, seq: 1}` **and** appends the **`move.committed`** entry (actor = `decidedBy`, cause = the move's key) **and** returns the task's own terminal state; `hooks.at("move.commit-begin" | "move.commit-after-read" | "move.commit-after-write")`, `hooks.fault("store-write")` before the write, `hooks.at("move.committed")` after; a failed commit answers the caller `store-error` and **re-arms the slot** (the step never returns without durable progress); `hooks.at("wait.registered")` once registered.
- [X] T034 [US2] Create `kiln/packages/durable/src/gate/move.ts` — `submitMove(gateId, key, move)`: `hooks.at("move.received")`; validate (decider non-blank; kind in the gate's **stored** vocabulary; `briefRef` equals the gate's — refusing as `invalid-move`); read the stored record and judge it (`repeat` / `key-conflict` / `stale`); if none, require a registered slot (`not-ready` otherwise), take it or wait for the in-flight commit and re-judge (`lost-race`); map the commit result to the contract's outcomes; **acknowledge only after the commit resolved** (`hooks.at("move.ack-sent")`); `unknown-gate` never creates a gate.
- [X] T035 [US2] Complete `kiln/packages/durable/src/gate/state.ts` (`settled` with the record) and give `ready` in `kiln/packages/durable/src/factory.ts` its meaning (research R13): every live decision has re-registered **and** no gate task is `ready`/`running`, bounded at 5 s then honestly not-ready; a mutating call before `ready` answers `not-ready`; wire `factory.gates.submit`; the gate task's `settle` phase in `gate/tasks.ts` calls `hooks.at("gate.wake")` first, appends the **`gate.settled`** entry (actor `factory`, cause the settling move's key) **in its own terminal commit**, and calls `hooks.at("gate.settled")` after it.
- [X] T036 [P] [US2] Write `kiln/packages/durable/tests/proof/exactly-once.test.ts` (child owner scripts): **100** concurrent identical moves → exactly 1 `Committed`, 99 `Repeat`, 1 record; **100** distinct keys → 1 `Committed`, 99 refused each naming the winner (`lost-race` | `stale`), 1 record; **100** more identical moves after a SIGKILL and restart → 0 `Committed`, 100 `Repeat`; conflict; stale; invalid (all four kinds); unknown gate; a move during a delayed start (`not-ready`, then the same key commits); a start whose re-registration is **held back past 5 s** by an injected slow hook — the owner does **not** report ready and answers `not-ready` (FR-043's cap); injected `store-write` fault (gate waiting, 0 records after a restart, the same key then commits). Each case reads the store from a **fresh reader after killing the owner** (the count is the store's). Each committed move's store must show its `move.committed` entry in the same commit (a fresh-reader assertion, I3).

**Checkpoint**: every outcome of the contract returned correctly, in-process and across a restart. T032/T036 green. Commit.

---

## Phase 5: User Story 1 — A gate waits for a person as long as it takes, whatever happens (Priority: P1) 🎯 MVP

**Goal**: attack the gate — every named point, random instants, a restart storm, clocks — and show it can be caught failing.

**Independent Test**: kill at every named point of open and move, and ≥ 7 consecutive times with no move; fresh-reader inspection after each; the gate is never settled, parked or half-applied, and the next valid move commits.

- [X] T037 [US1] Write `kiln/packages/durable/tests/kill-points-declared.test.ts`: a static scan of `kiln/packages/durable/src/**` collects every name passed to `hooks.at(…)`/`hooks.fault(…)`; the set **equals** `KILL_POINTS` ∪ `FAULT_POINTS` (a point cannot be forgotten or invented); also asserts no `process.env` read anywhere under `src/` (no kill switch in product code).
- [X] T038 [US1] Write `kiln/packages/durable/tests/proof/kill-points.test.ts`: for **every declared point** of open and move (and `gate.wake`, `gate.settled`, `recover.start`): arm it in the child owner and drive it — for the `move` and `completion` points, drive the open and the move; for the `recovery`-phase point **`recover.start`**, open a gate, kill the owner once, then restart **with the point armed** so it dies during recovery — confirm the owner died by `SIGKILL` **at that point** (kill log), read the store with a fresh reader (oracle I1–I9 clean), restart a clean owner, read again (`checkStability`), and assert the owner's own `state` equals the store's; a point that never fires is `ran: false` → **the test fails by name** (never vacuous); the run prints `exercised N of N`. The oracle's I3 now also fails a `move.committed` or `gate.opened` entry missing for its record, or a terminal gate task missing `gate.settled` (a record whose gate task has not yet advanced is the legitimate convergence window).
- [X] T039 [P] [US1] Write `kiln/packages/durable/tests/proof/random-kill.test.ts`: **300** seeded trials (the seed printed): send a move, `SIGKILL` the owner after a seeded delay of 0–8 ms, restart, inspect; oracle clean every time; the tally of "kill landed before / after the commit" is printed and both are non-zero (a run where every kill landed on the same side proves little — fail by name).
- [X] T040 [P] [US1] Write `kiln/packages/durable/tests/proof/storm.test.ts`: open a gate; kill and restart the owner **7 times** in a row with no move; after each restart the oracle is clean, `reports` is empty (nothing parked or faulted) and the gate is `waiting`; then a valid move **commits** (FR-040/FR-022 proven behaviourally); repeat once on a **settled** gate (it stays settled with the same record — I5).
- [X] T041 [P] [US1] Write `kiln/packages/durable/tests/proof/clock.test.ts`: the injected clock jumps **+10 years** and **−10 years** while a gate waits, and the owner restarts with the clock 10 years ahead; plus 2 s of real time; the gate is still `waiting`, the inspection lists **0** timers/sleeps/deadlines on gate and decision (I7), and a move still commits. A **headless** run (no completer attached for the whole test) leaves the gate waiting — nothing is auto-approved.
- [X] T042 [US1] Create `kiln/packages/durable/tests/proof/support/broken-gate.ts`: a **deliberately half-applying** gate for the tests only (it records the move in one commit and completes the decision in a second, with an injected hook between them) and write `kiln/packages/durable/tests/proof/negative.test.ts`: the oracle reports **I2 and I3** for it at its seam and **nowhere else**; the same kill-point scenario fails by name when its declared list is empty, when it exercises none, and when one declared point never fires. This is the control that shows the proof can fail (FR-061).
- [X] T043 [US1] **Mutation checks** on the real gate, each on a **committed** tree and undone before anything else runs, recorded in `specs/011-durable-core-gate-contract/notes.md`: (1) write the record without completing the decision; (2) skip the brief-ref check; (3) judge the stored record by memory instead; (4) drop the `key-conflict` branch; (5) let a restart re-open a settled gate; (6) swallow the injected fault; (7) set `restartLimit` to the default 5. Each must be **caught by a named test**; if one is not, the missing assertion is added (never the mutation removed).

**Checkpoint (MVP)**: the gate is opened, settled and attacked; SC-001, SC-002, SC-003 (in-process child), SC-004 met; the broken control is caught. Commit; append the counts to `baseline.md`.

---

## Phase 6: User Story 4 — Everything durable goes through one seam, and the five task types exist (Priority: P1)

**Goal**: CORE-1 and CORE-2: the seam is the only door; roadmap, row and unit exist as shells; gate/decision exist; the lane arrives in Phase 9.

**Independent Test**: the boundaries check passes and fails by name on a planted violation; each task kind is created, run, killed and resumed using only the seam's types.

- [X] T044 [P] [US4] Write `kiln/packages/durable/tests/seam.test.ts`: (a) a scan of `kiln/packages/**` (source **and** tests) finds the library's specifiers **only** under `packages/durable/src/library/`; (b) the package's exported declarations (`types.ts`, `factory.ts`, `hooks.ts`, `index.ts`, the channel files) contain **0** names from the library (`pi-durable`, `@earendil-works`, `Harness`, `defineTask`, `sleepUntil`, `abortTask`, `waitForTask`, `runtime.commit`) — SC-010; (c) the factory's models object has **no provider** and the seam exposes no model-request path.
- [X] T045 [P] [US4] Create `kiln/packages/durable/src/tasks/unit.ts`: the `kiln.unit` shell (`input {label, steps, needsLane?}` — **a unit with `needsLane` calls the injected `LaneApi` port and never imports the lane package; creating one with no port is refused by name**, checkpoint `{done: i}`, each step a phase that does scripted work then commits its checkpoint; the **result is committed once**, at the end; `abort` handler) — no hooks yet (T062 adds them).
- [X] T046 [P] [US4] Create `kiln/packages/durable/src/tasks/row.ts`: the `kiln.row` shell (`input {feature, script: UnitSpec[]}`; creates child units one at a time through the ledger, waits for each, completes when all have; checkpoint `{phase, index, unitIds}`).
- [X] T047 [P] [US4] Create `kiln/packages/durable/src/tasks/roadmap.ts`: the `kiln.roadmap` shell — opens **gate0** through the gate API and waits on it; settles with the person's move kind; its input and checkpoint have **no delegation field** (constitution VI), asserted by T050.
- [X] T048 [US4] Create `kiln/packages/durable/src/tasks/index.ts` and `kiln/packages/durable/src/index.ts` (the package's public barrel: types, `openFactory`, `inspectStore`, `KILL_POINTS`, `defineKilnTask`); wire `factory.tasks.create(key, kind, input, owner)` through the **command ledger** (`task.create`) in `factory.ts`; register the three shells plus gate/decision.
- [X] T049 [US4] Make the **lane extension point** real: `FactoryOptions.tasks` and **`FactoryOptions.lane` (the `LaneApi` port)** in `kiln/packages/durable/src/factory.ts` register additional `TaskKind`s and the lane implementation (used by `packages/lane` in T066) and `kiln/packages/durable/tests/proof/support/owner-main.ts` accepts a module list to load them.
- [X] T050 [P] [US4] Write `kiln/packages/durable/tests/tasks-lifecycle.test.ts`: for **each** of roadmap, row, unit — create through the seam (keyed), run, `SIGKILL` the owner mid-life with the harness, restart, finish with the outcome it would have had without the crash; the roadmap settles **only** through a person's move on gate0 (a move with no decider is `invalid-move`; the input type has no delegation field); a row runs its two-unit script to completion across a kill. Also assert, from a fresh reader, that the task set with kinds, owners and statuses equals what was created (FR-005).
- [X] T051 [US4] Write `kiln/packages/durable/tests/proof/scale.test.ts` now that units exist (SC-005; the criterion drives the design of `ready`, so it is measured here, not last): a factory with **100 open gates and 20 units** is SIGKILLed and restarted; the time to `ready` and to the first accepted move on **every** waiting gate is **printed** and asserted ≤ 2 s; a move sent earlier is `not-ready` and the same key then commits; if it exceeds 2 s parallelise the decisions' re-registration (research R13) — never relax the criterion. Then run the real checks on the tree as it now stands: `cd kiln && npm run check` → three `PASS` with the library imported by `library/` only; then the planted violations of T006/T009 again as a regression; record in `baseline.md`.

**Checkpoint**: one seam, five kinds (lane pending), checks green. All four P1 stories done — the **MVP of the row** is complete. Commit.

---

## Phase 7: User Story 7 — One store per factory, one owner per store, a local channel (Priority: P2)

**Goal**: another process can deliver a move, through the owner, over a private local socket; a second owner is refused; no network port exists.

**Independent Test**: start an owner; a second owner is refused 20 times; kill the first and a new process takes over; a separate-process CLI completer reaches every outcome; `lsof` finds no network socket.

- [X] T052 [P] [US7] Extend `kiln/packages/durable/tests/owner-lock.test.ts`: **50 simultaneous starters** on one stale lock produce **exactly one** owner and 49 refusals naming it; a stale lock from a dead pid is taken over on the first attempt; a lock from a foreign host is refused with the host named. If the verify-and-put-back takeover (R5) cannot be made reliable here, switch the lock to a lock **directory** (`mkdir` is atomic) and record why in `notes.md`.
- [X] T053 [US7] Create `kiln/packages/durable/src/channel/protocol.ts` (the five operations, request/reply framing, `bad-request` errors — `contracts/owner-channel.md`) and `kiln/packages/durable/src/channel/server.ts` (the **only** `node:net` server: socket at `<tmp>/kiln-<uid>/<sha1(realpath store)[0..8]>.sock`, directory `0700`, socket `0600`, **with the safe-directory rule (`lstat`: a real directory, not a symlink, owned by the current uid, mode exactly `0700` — otherwise refuse with `ChannelUnsafe` naming the path and problem), as a pure function over a stat result**, a stale socket removed under the lock; `ping` answered before ready; mutating ops `not-ready` before `ready`; domain refusals returned as results unchanged). Fill the two stub modules created in T008 (`allowlist-missing-file` has been strict since T008).
- [X] T054 [US7] Create `kiln/packages/durable/src/channel/client.ts` (the **only** `node:net` client: connect by path only; a request whose connection is lost or that has no answer within **5 s** resolves to `refused(store-error)` with `detail` `connection-lost` | `timeout` — outcome unknown; never hangs; never opens the store file).
- [X] T055 [US7] Add `serve()` to `kiln/packages/durable/src/factory.ts` (starts the channel, records the socket path in the lock, removes socket and lock on clean `close()`, prints nothing); `openFactory` records the socket path **before** it begins serving so a probing starter can find it. Add the **channel liveness probe** to the lock's liveness test (pid exists **and** the channel answers, research R5) and extend `owner-lock.test.ts` accordingly.
- [X] T056 [US7] Extend `kiln/packages/cli/src/main.ts` and create `kiln/packages/cli/src/gate-commands.ts`: `kiln owner --store <dir>` (open, serve, print `listening` then `ready`, run until SIGTERM, clean close) and `kiln gate open|move|state` over the channel client exactly as in `contracts/owner-channel.md`; one JSON line out; exit `0` for any answered request, `3` owner unreachable, `4` outcome unknown, `2` usage. `kiln check` unchanged. The CLI imports **only** `#durable/channel/client.ts` from the durable package. Create `kiln/fixtures/demo-brief.json` (a small JSON brief) for the quickstart and the CLI tests.
- [X] T057 [P] [US7] Write `kiln/packages/cli/tests/channel.test.ts`: spawn `kiln owner`; every contract outcome from **separate CLI processes**; **20** attempts to own an owned store → 20 refusals (message names store, pid, host, socket), the first owner unharmed; SIGKILL the first → a new process takes over on its first attempt; a request whose owner is SIGKILLed mid-way ends with *outcome unknown* (exit 4) within 5 s; the socket mode is `0600` in a `0700` directory; **a pre-created symlink, a wrong-mode directory and (as a unit test over a stat result) a directory owned by someone else are each refused with `ChannelUnsafe`**; a **200-character store path** still yields a usable (short) socket path; a scan asserts `packages/cli/src` imports no `#durable/…` module except the channel client.
- [X] T058 [P] [US7] Write `kiln/packages/cli/tests/no-network.test.ts`: `lsof -nP -a -i -p <ownerPid>` lists **no** network socket while serving, after a SIGKILL and restart, and after a move; a control proves the probe sees a real TCP listener (so an empty answer means something); a static scan of `packages/*/src` finds no `listen`/`connect` with a port or host (the lint's rule, asserted independently).
- [X] T059 [US7] Write `kiln/packages/durable/tests/proof/different-process.test.ts`: re-run the **exactly-once** cases of T036 and the **kill-point** scenario of T038 with the completer a **separate process** (`kiln gate …` through the channel) — same oracle, same counts; reported as their own results so a point is not counted twice; the run fails by name if the separate-process variant of any case did not run.

**Checkpoint**: SC-006 and SC-007 met; quickstart §4 and §6 run by hand. Commit; append to `baseline.md`.

---

## Phase 8: User Story 5 — A half-done step never commits its result, and every command happens once (Priority: P2)

**Goal**: CORE-4 and CORE-5 for everything that is not a gate.

**Independent Test**: a scripted unit killed at every named point resumes and commits one result; a command repeated 100 times, before and after restarts, takes effect once.

- [X] T060 [P] [US5] Write `kiln/packages/durable/tests/proof/units.test.ts` (child owner): a unit with 3 scripted steps killed at each of `unit.step-begin`, `unit.step-after-work` and `unit.step-committed` for each step index → after restart it resumes from its last checkpoint and finishes; the fresh reader **never** sees a result before the final commit and sees exactly **one** result at the end; the work of an unfinished step is redone, never half-recorded. The fresh reader's task listing (T020) shows the unit's kind, owner and status at each point.
- [X] T061 [P] [US5] Write `kiln/packages/durable/tests/proof/commands.test.ts`: `task.create` repeated **100** times concurrently and 100 more after a SIGKILL and restart → one task, 199 `repeat`; the same key with another request → `key-conflict`; `gate.open` and `gate.move` keys obey the same rule; I9 holds in the inspection (every key maps to one outcome and one request hash).
- [X] T062 [US5] Add the unit hooks to `kiln/packages/durable/src/tasks/unit.ts` (`unit.step-begin`, `unit.step-after-work`, `unit.step-committed`) and to `KILL_POINTS` in `kiln/packages/durable/src/hooks.ts`; the static test T037 must stay green (declared == used).
- [X] T063 [US5] Document the **key-retention rule** in code and docs (research R4): a command key lives as long as the thing it created exists in the live store; a comment at the top of `kiln/packages/durable/src/commands.ts` and a new short `kiln/packages/durable/README.md` (what the seam is, a link to the contract, the retention rule, the power-loss boundary of FR-044).

**Checkpoint**: SC-001 for units; "half-done never commits" demonstrated. Commit.

---

## Phase 9: User Story 6 — The lane: at most one running generation, surviving restarts (Priority: P2)

**Goal**: LANE-1 with scripted generations.

**Independent Test**: two steps ask for the lane at once — exactly one holds it; kill mid-lease — the lane's state is as it was, no generation counts as running, the waiting step proceeds.

- [X] T064 [P] [US6] Write `kiln/packages/lane/tests/lane-task.test.ts` (in-process): free → `acquire(step)` held → `release(step)` free; a second `acquire` waits and is granted on release (FIFO); `resident`, `hold` and `swaps` change **in the same commit** as the step (`within(tx)`); a swap is counted only when the resident model actually changes.
- [X] T065 [US6] Create `kiln/packages/lane/src/lane-task.ts` (research R9): the `kiln.lane` task and the `lane` API on the seam's `defineKilnTask` — state in the `kiln.lane` document (`resident`, `hold`, `swaps`, `lease`), each acquire, release and swap appending its `lane.*` outbox entry (actor the step's task id, cause its key) **in the same commit**, owner-memory wait for a held lane, **lease cleared at owner start** (FR-032), waiting steps re-request in task-id order; imports only `#durable/…`, `#contracts/…`, `#record/…` (the layer rule).
- [X] T066 [US6] Add the lane hooks (`lane.acquire-after-write`, `lane.release-after-write`) to `kiln/packages/lane/src/lane-task.ts` and to `KILL_POINTS`; have the lane module **implement the `LaneApi` port** and register it through `FactoryOptions.lane` and `FactoryOptions.tasks` (T049) — the unit shell's `needsLane` path (T045) then acquires before its work and releases after, and **durable never imports lane**; wire both in `kiln/packages/durable/tests/proof/support/owner-main.ts`.
- [X] T067 [US6] Write `kiln/packages/lane/tests/lane-proof.test.ts`: **≥ 100** trials of two steps asking at once → **0** instants with two holders (oracle I8); a kill after `lane.acquire-after-write` and after `lane.release-after-write` → the fresh reader sees ≤ 1 holder, a restart reports **0** until the resumed step re-acquires; the lane's resident model, hold flag and swap count are exactly as before the kill. Every `lane.acquired`/`released`/`swapped` entry has its lane commit and vice versa (I8).

**Checkpoint**: SC-008 met. Commit.

---

## Phase 10: User Story 8 — Adopting the dependency without weakening r12 (Priority: P2)

**Goal**: the recorded decision, the true statements, the experimental-SQLite posture, the floor matrix.

**Independent Test**: on a fresh clone the documented install, the suite and the three checks pass on the new floor; a planted second dependency, an unpinned version or an import outside the seam each fail a check by name.

- [ ] T068 [P] [US8] Create `kiln/DEPENDENCIES.md` — the **recorded decision** (constitution *Dependencies*): for each of the three packages its version, integrity (from the lock), licence (MIT), why it is needed, the seam that reaches it (`packages/durable/src/library/`), and the upgrade rule ("a deliberate, recorded change with its own review"); the **`node:sqlite` posture** (Clarification Q1: accepted, warning documented, opened in one place, canary-tested); the install line; the deliberate `pi-ai` exception of R1. State the upgrade rule: **opening a store under another library version is refused (FR-047); an upgrade is a deliberate, recorded change with its own row and review — r13 offers no upgrade path.**
- [ ] T069 [US8] Write `kiln/packages/durable/tests/dependencies-record.test.ts`: every dependency in `kiln/package.json` appears in `DEPENDENCIES.md` with the same version and an integrity equal to the lockfile's; a dependency missing from the record, or a mismatching version, fails by name.
- [ ] T070 [P] [US8] Write `kiln/packages/durable/tests/canary-sqlite.test.ts` (FR-054): the built-in SQLite module opens an in-memory database, writes and reads a row and closes on the running Node; and the seam's storage opens through **one** function (`library/open.ts`) — asserted by a scan. It fails loudly (by name) if the module is missing or behaves differently; it does **not** assert the version-dependent warning.
- [ ] T071 [US8] Make the statements true (FR-053; `contracts/checks-and-docs.md`): `kiln/package.json` `description` (drop "Zero runtime dependencies, nothing to install"; say three pinned dependencies, one install step); the repository `README.md` Node line (≈ 221) and install/quick-start text (the new floor, `cd kiln && npm ci` as the one network act, the `node:sqlite` experimental warning documented, macOS only); and **annotate** (do not rewrite) `specs/009-kiln-foundations-reset/quickstart.md:8` with "(as of r12; see r13)". Add a test line to T069's file that the old phrases are absent from the live files.
- [ ] T072 [US8] Run the **floor matrix** and append the results to `specs/011-durable-core-gate-contract/baseline.md`: `npx -y node@22.19.0 tests/run.ts --new-only` and `… packages/cli/src/main.ts check`; the same `--new-only` on `node@23.6.0` and `node@24.1.0`; and the installed Node — same pass counts everywhere, and the 22.19 warning noted. *(The local settings allow `npx -y node@22.19.0 *`; 23.6.0 and 24.1.0 need the same rule or a person to run them — if refused, record "not run" and why; do not work around it.)*

**Checkpoint**: the adoption is recorded and checked; SC-009 on the matrix. Commit.

---

## Phase 11: Polish & Cross-Cutting Concerns

- [ ] T073 Re-run `kiln/packages/durable/tests/proof/scale.test.ts` (written in T051) on the finished tree and on the floor-matrix Nodes, and **record the measured numbers** in `baseline.md`; assert ≤ 2 s again. If it regressed since T051, find out why before anything else.
- [ ] T074 Measure the new suite's wall time (`time npm test`): if the new suite exceeds **3 minutes**, move `random-kill.test.ts` and `storm.test.ts` into a `proof` script (`kiln/package.json` → `"proof": "node tests/run.ts --new-only packages/durable/tests/proof"`), have the runner print which tier ran, and record the decision; otherwise record "all in `npm test`: N s" in `baseline.md`. Never skip a proof silently.
- [ ] T075 [P] Verify SC-010 and the contract files: `grep -nE 'pi-durable|@earendil-works|Harness|runtime\.commit|defineTask|sleepUntil|abortTask|waitForTask|Pi Durable' specs/011-durable-core-gate-contract/contracts/{gate-contract,seam-api,owner-channel}.md` prints nothing; `kiln/packages/durable/src/index.ts` and `types.ts` likewise.
- [ ] T076 Take the **"after"** readings exactly as T001: `cd kiln && npm test` (counts **≥ 184 new + 500 legacy** plus this row's tests, exit 0), `npm run check` (three `PASS`), `git rev-parse HEAD:legacy` (unchanged), `git diff --stat main -- legacy specs/ROADMAP.md` (empty); append "After" to `baseline.md` and state **equal / greater / not equal** against T001 for each. Not equal is a finding to resolve before the row can close.
- [ ] T077 On a **fresh clone** of the branch (`git clone --branch 011-durable-core-gate-contract … /tmp/kiln-r13-fresh`): run [quickstart.md](./quickstart.md) §0–§9 and §11, record each result in `baseline.md`; include the negative proofs of §8 (the broken gate is caught; a vacuous run fails by name; every planted violation fails by name).
- [ ] T078 [P] Re-read the **Complexity Tracking** table of the plan against what was built (the `cli → durable` edge pinned to the channel client; the `pi-ai` import with no provider; the network exemptions narrow and tested; the statements corrected) and record, for each, "as planned" or what changed and why, in `notes.md`.
- [ ] T079 Write `specs/011-durable-core-gate-contract/implementation-report.md` for human technical readers (as r42's: status in a paragraph, what was built, the design that carries the contract, **how far the proof can be trusted** — controls, mutation checks, never-vacuous guards, the floor matrix — deviations from the plan, problems found on the way, open items), and update `checklists/requirements.md` if any item changed.
- [ ] T080 Close out: all tasks above `[X]` (a conditional or skipped one ticked with its reason); `specs/ROADMAP.md` **unchanged** (`git diff --stat main -- specs/ROADMAP.md` empty) and `r13` still `queued`; commit. The report **states**; recording the outcome — `r13` → `done`, `@PR#N` — is the human's Roadmap-gate move.

---

## Dependencies & Execution Order

### Phase dependencies

```text
Setup (T001–T003)
   └─▶ Foundational (T004–T023)            checks first, then the seam skeleton, then the proof harness
          └─▶ US3 open (T024–T031)
                 └─▶ US2 move (T032–T036)
                        └─▶ US1 attack (T037–T043)          ← MVP of the gate
                               └─▶ US4 seam + shells (T044–T051)   ← all P1 done
                                      ├─▶ US7 owner/channel/CLI (T052–T059)
                                      ├─▶ US5 units & commands (T060–T063)     (after US4's shells)
                                      └─▶ US6 lane (T064–T067)                 (after US4; unit shell uses it)
                                             └─▶ US8 adoption record + floor (T068–T072)
                                                    └─▶ Polish (T073–T080)
```

- **US7, US5, US6 are independent of one another** once US4 is done (US6 touches the unit shell in T066 — sequence it after T062 if one person does both). US8 can start any time after Phase 2 for its documents (T068–T071) but its **floor matrix (T072) needs everything built**.
- Within a story: the unit/in-process tests first (T024, T025, T032), then the implementation, then the kill proofs.
- T031 needs T035 (settle) for its last assertion — write it with that step skipped, enable it at T035.
- T043 (mutation checks) needs the whole of US1's tests green first; T042's broken gate is built **before** the real gate is declared proven.
- The two channel files exist as **empty stubs from T008**, so the local-IPC allowlist's self-check is strict from the first commit; T053 fills them.

### Parallel opportunities

- Phase 2: T004, T006, T008, T009, T011, T012, T013, T014, T016, T017, T021, T023 touch different files and can run together once their inputs exist (T005 before T006; T007 before T009; T015 before T016/T017/T019).
- US3: T024 ∥ T025; US2: T032 ∥ T036 (after T035); US1: T039 ∥ T040 ∥ T041; US4: T044 ∥ T045 ∥ T046 ∥ T047; US7: T052 ∥ T057 ∥ T058; US5: T060 ∥ T061.

### Parallel example: User Story 1 (after T038)

```bash
Task: "T039 random-kill proof in kiln/packages/durable/tests/proof/random-kill.test.ts"
Task: "T040 restart-storm proof in kiln/packages/durable/tests/proof/storm.test.ts"
Task: "T041 clock and headless proof in kiln/packages/durable/tests/proof/clock.test.ts"
```

## Implementation Strategy

### MVP first (the gate)

1. Setup → Foundational (checks green, skeleton, harness) → **US3 → US2 → US1** → STOP and validate: the gate opens whole, settles once, survives every named kill, and the broken control is caught. That is the row's promise (constitution V) proven in-process-child.
2. Add **US4** (the seam proofs and the shells): all P1 done; this is the point at which r14 *could* start (a gate and tasks to walk).

### Incremental delivery

3. **US7** (channel, CLI, one owner) → the proofs re-run from a separate process; the first moment a person could really deliver a move.
4. **US5** and **US6** (units, commands, lane) in either order.
5. **US8** (record, statements, floor matrix) → **Polish** (scale, "after", fresh clone, report).

### Cuts, if the row must be narrowed (in this order; none touches US1–US4)

1. The 23.6.0 and 24.1.0 legs of the floor matrix (keep 22.19.0 and the installed Node) — say so in the report.
2. The scale proof's 100-gate size to the largest that fits, with the measured number reported honestly (SC-005 then reads "not proven at 100").
3. US6 (the lane) to a follow-up row — only with a recorded Roadmap decision; LANE-1 would then be `not-proven` for r13.

## Notes

- [P] tasks = different files, no dependency on an unfinished task.
- The proof's child owner is a **test-only** file; nothing in `src/` reads the environment.
- A failing proof means the **code or the harness** is wrong — never relax an assertion. Say what failed and at which kill point.
- Commit after each phase and each logical group; the commit subject carries the phase and the test count.
- Avoid: a second importer of the library, a timer anywhere near a gate, an assertion that depends on wall-clock luck without a retry bound printed in the test.

## Traceability (requirement → tasks)

*(Added after the 2026-10-26 analysis so coverage can be checked without reading every task.)*

| Requirement | Tasks |
|---|---|
| FR-001, FR-002 | T004–T006, T012, T015, T044 |
| FR-003, FR-004, FR-005 | T028, T045–T050, T020, T060, T065 |
| FR-010, FR-011 | T024, T026–T031, T033, T041 |
| FR-012 … FR-016, FR-018 | T032–T036 |
| FR-017 | T059 |
| FR-019 (events with actor and cause) | T012, T021, T026, T029, T031, T033, T035, T038, T065, T067 |
| FR-020, FR-021, FR-022 | T027, T040, T050, T060, T061 |
| FR-030 … FR-033 | T064–T067 |
| FR-040 | T015, T040, T043 |
| FR-041, FR-042 | T018, T052, T054, T057 |
| FR-043 | T035, T036, T051 |
| FR-044 | T063 |
| FR-045, FR-046 | T053–T058 |
| FR-050 … FR-052 | T002, T004–T010, T044, T072 |
| FR-053, FR-054 | T068–T071 |
| FR-047 (store-version guard) | T004, T015, T016, T020, T023, T068 |
| FR-060 … FR-062 | T037–T043, T059 |
| FR-063 | T003, T010, T076 |
| SC-001 | T038, T039, T060 · SC-002 T040 · SC-003 T036, T059 · SC-004 T041 · SC-005 T051, T073 |
| SC-006 | T006, T044 · SC-007 T057 · SC-008 T067 · SC-009 T072, T076, T077 · SC-010 T044, T075 |
| SC-011 | T023 |
