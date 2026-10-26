---

description: "Task list for the spike on completing a waiting task from outside (row r42)"
---

# Tasks: Spike — completing a waiting task from outside (row r42)

**Input**: Design documents from `/specs/010-external-completion-spike/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md); [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: **Included — they are the deliverable.** A spike's product is evidence; the kill tests, the exactly-once tests and the oracle's own tests are the work (FR-002, FR-003, FR-013, SC-002…SC-006). Tests are written **before** the
code they judge and must fail first. Every scenario is **strategy-agnostic** (it talks to the port only), so the same test runs against every strategy.

**Organization**: grouped by user story. Priorities from the spec: **US1, US2, US3 = P1; US4, US5 = P2.** US1 (the verdict you can trust) is the *machinery* — the runner, the status rules, the verdict rules, the never-vacuous guards;
its prose deliverable, the report, is written last (Phase 8) because it needs every other story's evidence.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1…US5, only inside a story phase
- Paths are repository-relative. The harness lives in `spikes/r42/`; documents in `specs/010-external-completion-spike/`.
- Run Node from `spikes/r42/` with `/opt/homebrew/bin` on `PATH` if `node` is not found. The one network act is `npm install`/`npm ci` (T004); every test after it is offline.

## Rules that hold in every task

- **The time box is 16 working hours of active session time** — "two working days", counted as active time and logged in a ledger, not as calendar days (spec Clarifications, 2026-10-26). T002 records the start and the ledger; each phase ends with a checkpoint line in `spikes/r42/TIMEBOX.md`. **When the box ends: stop, mark what is unfinished `not-proven`, go to Phase 8.** Never trade an When hours run short, cut stretch work in the order given in **Priority under the time box** below.
  unproven guarantee for a favourable verdict (FR-009).
- **Nothing under `kiln/`, `legacy/` or `specs/ROADMAP.md` is edited** (FR-010, FR-011). If a task seems to need it, stop: the plan has a gap.
- **Nothing in the spike imports from `kiln/` or `legacy/`**, and nothing under `kiln/` imports from the spike.
- **No network in any test** (T060 checks it). The owner listens on a Unix-domain socket in a private temporary directory; no model is called (`createModels()` gets no provider).
- **Every strategy runs the identical scenarios.** No assertion may branch on a strategy's name (T049 checks this).
- **A scenario that did not run is a failure, not a skip.** `not-proven` is a status, never a pass.
- **Commit before mutating** (r12's lesson): commit at each checkpoint; mutation checks of the oracle happen on committed code.
- **No gate is decided here.** The report states a verdict; a person records it at the Roadmap gate.

---

## Priority under the time box — the essential path (analysis T1)

Every task is in exactly one tier. The tier says **what to protect when the 16 hours run short**; it does not change the order in which tasks are done (that is the phases and dependencies below).

| Tier | Meaning | Tasks (54 · 3 · 8) |
|---|---|---|
| **E — essential** | without it there is no defensible, checkable verdict: the pin and control readings, the proven harness, the runner and rules, **C1 with guarantees a–e (including a different-process completer)**, the contract, the findings r13 needs, the report | T001–T004, T006–T029, T031, T033–T034, T036–T040, T043–T048, T050, T055–T065 |
| **R — required if triggered** | needed only when no native strategy holds a–e (T050 decides): the fallback's parity test, F1, and its evidence run | T049, T051, T053 |
| **S — stretch** | valuable, but the verdict does not stand on it; cut in the order below | T005, T030, T032, T035, T041–T042, T052, T054 |

**Cut order when hours run short** (earliest cut first). Never cut an E task, and never cut an R task whose trigger fired in order to keep an S task.

1. **T054** — the upstream proposal draft (the report then says "not drafted: time box" and lists FR-007 as unmet; the verdict is unaffected).
2. **T052** — fallback F2 (the shared-connection table). F1 alone is enough to hold or fail the fallback verdict; F2 only tests the roadmap's literal wording.
3. **T042** — C3 (the keyed write-submission). It is conditional anyway.
4. **T032 and T035** — the randomised kills. They are supporting evidence; the enumerated kill points are the proof.
5. **T041** — the C2 (abort-driven) run **if the fallback is triggered and hours are short**; the report then lists C2 as "not run: time box". If the fallback is *not* triggered, C2 runs as the clarification of 2026-10-26 requires.
6. **T005 and T030** — README/tsconfig polish and the contract line for the report checker.
7. Inside T045/T047, the *second-opener* negative case (R-6). Its absence is recorded in the report's "Unproven".

A cut task is **ticked `skipped: time box`** with the ledger total at the moment of the cut; whatever it would have proven is `not-proven` in the report.

---

## Phase 1: Setup — pin, install, start the clock, take the control reading

**Purpose**: bring the dependency in *outside `kiln/`*, record it, start the time box, and write down the numbers SC-008 will be compared to.

- [X] T001 Record the **"before" control** in `specs/010-external-completion-spike/baseline.md` (new): from `kiln/` run `npm test` (expect `new: 184 tests · legacy: 500 tests (30 skipped)`, exit 0) and `npm run check` (three `PASS`; 22 + 22 + 168 files); then `git rev-parse HEAD:legacy` (expect `20a82c7e214be256c804f6e8f1cd4cce9c8e9874`) and `git diff --stat main -- legacy kiln specs/ROADMAP.md` (expect empty). Also record `node --version`, `npm --version`, and `npm view @earendil-works/pi-durable@1.4.0 dist.integrity`. Heading: "Before (T001)". This is the SC-008 control.
- [X] T002 Start the time box: create `spikes/r42/TIMEBOX.md` with the start instant (`date -u +%Y-%m-%dT%H:%M:%SZ`), "16 working hours of active session time (two working days)" as the limit — a **ledger** (session start · session end · active hours · running total) that every work session appends to, with the rule that the box ends when the running total reaches 16 h —, the rule "when it ends, stop and list what is unproven", and an empty checkpoints table (phase · instant · note). Add the first checkpoint line "P0 started".
- [X] T003 Create `spikes/r42/package.json`: `"private": true`, `"type": "module"`, `"engines": {"node": ">=22.19.0"}`, `scripts` `evidence` (`node src/evidence.ts`), `test` (`node --test tests/`), `kill-list` (`node src/evidence.ts --kill-list`), `report-check` (`node src/report-check.ts`), `smoke` (`node src/smoke.ts`); no `dependencies` yet. Append to the repository `.gitignore`: `spikes/r42/node_modules/` and `spikes/r42/out/`. (Edits one existing file: the root `.gitignore`.)
- [X] T004 Install and **pin exactly** (the one network act): in `spikes/r42/` run `npm install --save-exact @earendil-works/pi-durable@1.4.0 @earendil-works/pi-ai@1.4.0 @earendil-works/chord@1.4.0` (the spike imports `pi-ai` and `chord` directly, as the library's quick start does). Confirm `package.json` has **no `^` or `~`**, commit `package-lock.json`, and record in `baseline.md` ("Pin (T004)"): the three names, versions, `integrity` from the lockfile, and the number of packages in the tree (`npm ls --all --parallel false | wc -l`). From now on use `npm ci`.
- [X] T005 [P] Create `spikes/r42/README.md` (what this is: a time-boxed experiment for row r42, **not product code**; how to run `npm ci && npm run evidence`; links to the spec, plan, quickstart and report) and `spikes/r42/tsconfig.json` (editors only, `noEmit`, equal to `kiln/tsconfig.json`).
- [X] T006 Write `spikes/r42/src/smoke.ts`: import `openNodeSqliteStorage` from `@earendil-works/pi-durable/storage/sqlite/node`, open a store in a private temporary directory, close it, delete it, and print the installed `@earendil-works/pi-durable` name and version read from its `package.json`. Run `npm run smoke` on the installed Node and on `npx -y node@22.19.0 src/smoke.ts`; record both results (or the first version at which it works) in `baseline.md` ("Smoke (T006)"), **including whether Node prints `ExperimentalWarning: SQLite is an experimental feature` on each** (observed on 22.19.0 in the pre-implementation dry run; the library's SQLite storage uses Node's built-in `node:sqlite`). If it does not load at all, stop and write that finding: it decides the verdict.
- [X] T007 Re-take the control with the spike present: from `kiln/` run `npm run check` and `npm test` again and append "After setup (T007)" to `baseline.md`; the counts and the three `PASS` lines must equal T001 (`spikes/` is outside `kiln check`'s scan roots — verified here, not assumed). Commit (`r42 P0: …`) and add the checkpoint "P0 done" to `TIMEBOX.md`.

**Checkpoint**: the dependency is pinned and recorded, `kiln/` is demonstrably unaffected, the clock is running.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the port, the kill hook, the oracle, the owner and client processes, and two control strategies — one correct, one deliberately broken — so the harness itself is proven before any native strategy is judged. **No story can start before this phase is complete.**

### Tests first (write them; they fail)

- [X] T008 [P] Write `spikes/r42/tests/kill-hook.test.ts`: with `KILL_AT` unset `killPoint("x")` returns and does nothing; with `KILL_AT=x` a spawned child that calls `killPoint("x")` dies by `SIGKILL` (exit signal, no `exit` handler ran, a sentinel file written in an `exit`/`beforeExit` handler does **not** exist); `KILL_AT=y` does not kill at `"x"`; the point name is recorded to a file given by `KILL_LOG` before dying so a test can see which point fired. Also `faultPoint`: unset ⇒ no-op; `FAULT_AT=x` ⇒ it throws at `"x"` only and the process keeps running.
- [X] T009 [P] Write `spikes/r42/tests/oracle.test.ts`: feed `checkInvariants(inspection)` synthetic `Inspection`s ([data-model.md](./data-model.md) §2) — one clean waiting, one clean settled, and **one per invariant violation** (record with waiting gate → I3; settled gate without record → I3; two records → I4; settled but decision task not terminal → I2; waiting with a record → I1; a timer on the task → I7; a `blocked`/`parked` waiting gate → I6) — and assert each is reported **by its number**, and that the clean ones report none.

### Implementation

- [X] T010 [P] Create `spikes/r42/src/port.ts`: the gate-completion port from [contracts/gate-completion-port.md](./contracts/gate-completion-port.md) — types `GateId`, `MoveKind` (`approve|revise|reject`), `Move`, `MoveKey`, `MoveRecord`, `Outcome` (`committed|repeat|refused`), `RefusalReason` (`lost-race|stale|key-conflict|invalid-move|unknown-gate|not-ready|store-error`), `GateState`, and `interface GateCompletion { open; submit; state; close }`, plus `validateMove(move)` (empty `decidedBy` or unknown kind ⇒ `refused(invalid-move)`). **Types and pure functions only; no import of the library.**
- [X] T011 [P] Create `spikes/r42/src/kill.ts`: `killPoint(name)` — if `process.env.KILL_AT === name`, append `name` to the file in `KILL_LOG` (synchronously, if set) and call `process.kill(process.pid, "SIGKILL")`; otherwise return. Also `faultPoint(name)`: if `process.env.FAULT_AT === name` it throws `new Error("injected store failure: <name>")` — a **non-abrupt** failure the strategy must turn into `refused(store-error)` — and `killPointsEnabled()` for the harness. Must make T008 pass.
- [X] T012 Create `spikes/r42/src/invariants.ts`: `interface Inspection { gate: "waiting"|"settled"; records: MoveRecord[]; decisionTask: "absent"|"live"|"terminal"; decisionOutcomeMatches: boolean; timers: string[]; blocked: boolean }` and `checkInvariants(i): ("I1"|…|"I7")[]` implementing [data-model.md](./data-model.md) §2 exactly. Pure; no I/O. Must make T009 pass.
- [X] T013 Create `spikes/r42/src/strategy.ts`: `interface KillPoint { name; where; phase: "move"|"completion"|"recovery" }`, `interface Strategy { name; native: boolean; killPoints: KillPoint[]; caveats: {text: string; enforceable: boolean}[]; start(opts:{store:string; now?():number; restartLimit?:number}): Promise<GateCompletion>; inspect(store:string, gateId:GateId): Promise<Inspection> }` — `inspect` opens the store **read-only and without an owner** (so it can run after a kill) — and `loadStrategy(name)` doing a **lazy dynamic import** so a strategy that does not need the library never loads it. A **caveat** is a condition under which a guarantee holds (for example "d holds only with `restartLimit: Infinity`"); `enforceable` is true only if r13 can guarantee the condition structurally.
- [X] T014 [P] Create `spikes/r42/src/strategies/control-sqlite.ts`: a **correct reference** strategy using only `node:sqlite` (no Pi Durable): one table `move(gate PRIMARY KEY, key, kind, decided_by, brief_ref)` and a `gate(id, state)` row updated in **one transaction** with the insert; `submit` returns every outcome of the port; call `faultPoint("store-write")` immediately before the insert (for the `store-error` scenario); declare 6 kill points (`idle-before-move`, `move-received`, `tx-begin`, `tx-after-write`, `tx-committed-before-ack`, `ack-sent`) with their `killPoint(...)` calls in the right places. Purpose: proves the harness reports `held` for a design known to be correct.
- [X] T015 [P] Create `spikes/r42/src/strategies/broken-two-commit.ts` (test-only): the same schema as T014 but `submit` **inserts the move in one transaction and marks the gate settled in a second**, with `killPoint("between-commits")` between them; declares that point plus those of T014. Purpose: the oracle must catch it (I3). Mark `native: false` and `testOnly: true`.
- [X] T016 Create `spikes/r42/src/owner.ts`: the **owner process** — args `--store <dir> --strategy <name> --socket <path>`; `loadStrategy(name).start(...)`; listens on a **Unix-domain socket** (`node:net`, path inside the private temp dir; never a TCP port); newline-delimited JSON requests `{id, op: "open"|"submit"|"state"|"ping", …}` → `{id, ok, outcome|state}`; prints one `ready` line to stdout when serving; calls `killPoint("move-received")` after reading a `submit` and before dispatching; refuses `not-ready` until the strategy has started; on `SIGTERM` closes cleanly (never used by kill tests).
- [X] T017 Create `spikes/r42/src/client.ts`: a library `connect(socketPath)` returning `{open, submit, state, close}` (one request/response per id, pipelined, with a per-request timeout that yields `refused(store-error)` rather than hanging) and a CLI `node src/client.ts --socket <path> submit <gate> <key> <kind> <decidedBy>` so a **separate process** can be the completer (FR-004).
- [X] T018 Create `spikes/r42/src/harness.ts`: test helpers — `makeStore()` (private temp dir, removed on cleanup), `startOwner({strategy, store, killAt?, killLog?})` (spawns `node src/owner.ts` with env `KILL_AT`/`KILL_LOG`, waits for `ready`, returns `{socket, pid, exited: Promise<{signal}>}`), `killNow(owner)` (`SIGKILL`), `restart(...)`, `withOwner(...)`, and `cleanup`. A start that does not print `ready` within 10 s fails `evidence-owner-failed` with the child's stderr.
- [X] T019 Write and run `spikes/r42/tests/owner-client.test.ts`: against `control-sqlite`, over the socket and **from a second process** (the client CLI), `open` → `state` is `waiting` → `submit` is `committed` → `state` is `settled` → kill the owner with `SIGKILL` → `restart` → `state` is still `settled` with the same record. Also: a malformed request line returns an error response and does not kill the owner.

**Checkpoint**: `npm test` passes T008, T009, T019; the broken strategy exists but is not yet run through scenarios. Commit and write the checkpoint "P1 done" to `TIMEBOX.md`.

---

## Phase 3: User Story 1 — A verdict I can trust at the Roadmap gate (Priority: P1) 🎯 MVP

**Goal**: one command runs every scenario against every strategy, derives each guarantee's status *only* from scenarios that ran, applies the verdict rules, prints the table, writes `out/evidence.json`, and refuses to pass vacuously. This is the machinery the report is built from.

**Independent Test**: `npm test` proves the status rules, the verdict rules and the never-vacuous failures on synthetic evidence; `npm run evidence` with **no scenario registered exits 1 `evidence-zero-tests`** (never a pass), and the table and the verdict render correctly from synthetic evidence in which every guarantee with no scenario reads `not-proven` (never `held`).

### Tests for User Story 1 (write first; they fail)

- [ ] T020 [P] [US1] Write `spikes/r42/tests/status.test.ts`: `deriveStatus(results)` returns **held** only if every result for the guarantee has `ran: true` and `passed: true` *and* there is at least one; **not-held** if any ran and violated an invariant; **not-proven** if there are none, or any did not run, or the strategy declared zero kill points, or `timeBoxEnded` is true and any is unfinished. Include the case "100 passes + 1 `ran: false` ⇒ not-proven" and "0 results ⇒ not-proven, never held".
- [ ] T021 [P] [US1] Write `spikes/r42/tests/verdict.test.ts`: `deriveVerdict(evidence)` per [contracts/spike-report.md](./contracts/spike-report.md) §3 — a native strategy with a–e held (including different-process) ⇒ `go`; none native but a fallback with a–e held ⇒ `go-with-fallback`; nothing holds all, or a CORE-3 guarantee `not-proven` everywhere ⇒ `no-go`; a native strategy that holds a–e **with caveats** ⇒ `go` only when **every** caveat it declares (`Strategy.caveats`, T013) is `enforceable`, else `go-with-fallback`; **never more favourable than the weakest claimed guarantee**.
- [ ] T022 [P] [US1] Write `spikes/r42/tests/never-vacuous.test.ts`: running the evidence with **no scenarios** exits 1 with `evidence-zero-tests`; selecting a strategy that declares **no kill points** (a stub) exits 1 `evidence-zero-kill-points`; a strategy whose declared points were not all exercised reports the shortfall and the guarantee `not-proven`; a missing/mismatched `node_modules` (simulated by pointing the check at a temp dir with a different version) exits 1 `evidence-install-mismatch`; a non-macOS platform string (injected) exits 1 `evidence-wrong-platform` yet still prints; an owner that cannot start exits `evidence-owner-failed`.

### Implementation for User Story 1

- [ ] T023 [P] [US1] Create `spikes/r42/src/status.ts` implementing `deriveStatus` as T020 states (types from [data-model.md](./data-model.md) §3: `ScenarioResult`, `GuaranteeStatus`).
- [ ] T024 [P] [US1] Create `spikes/r42/src/verdict.ts` implementing `deriveVerdict` as T021 states, returning `{verdict, because: string[]}` so the report can quote the reasons.
- [ ] T025 [P] [US1] Create `spikes/r42/src/install-check.ts`: reads `package.json`, `package-lock.json` and `node_modules/@earendil-works/pi-durable/package.json`; fails `evidence-install-mismatch` if the dependency is not exactly `1.4.0` (no range), the lockfile disagrees, or `node_modules` is absent or a different version. Returns the `{name, version, integrity}` triple for the evidence.
- [ ] T026 [P] [US1] Create `spikes/r42/src/table.ts`: renders `Evidence` as (a) the terminal table of [quickstart.md](./quickstart.md) §2 and (b) a Markdown table for the report (`renderMarkdown(evidence)`), one row per strategy, columns a–e, kill points exercised `N of N` plus the random-kill count, with a footnote marker and the text of each caveat the strategy declares.
- [ ] T027 [US1] Create `spikes/r42/src/evidence.ts`: the runner — flags `--strategy <name>`, `--only <kind>`, `--kill-list`, `--markdown`; runs `install-check`, then for each selected strategy every registered scenario (a registry `scenarios` that US2/US3 fill), builds `Evidence` ([data-model.md](./data-model.md) §3) with `startedAt`/`finishedAt`, node and platform, writes `out/evidence.json`, prints the table, and applies the never-vacuous rules of [contracts/evidence-cli.md](./contracts/evidence-cli.md) (exit 1 by name); exit 0 means "examined something and wrote the evidence" — **not** "everything held". `--kill-list` prints each strategy's declared points and phase. Must make T020–T022 pass.
- [ ] T028 [US1] Create `spikes/r42/src/report-check.ts` (`npm run report-check`): reads `specs/010-external-completion-spike/spike-report.md` and `spikes/r42/out/evidence.json` and fails by name if (a) any guarantee status written in the report's table differs from the evidence (`report-status-mismatch`), (b) the verdict differs from `deriveVerdict` (`report-verdict-mismatch`), (c) the report's section 5 ("contract for r13") contains any of: `pi-durable`, `@earendil-works`, `Harness`, `runtime.commit`, `defineTask`, `sleepUntil`, `abortTask`, `waitForTask` (`report-contract-names-library`, SC-009), or (d) a required section heading of [contracts/spike-report.md](./contracts/spike-report.md) §1 is missing (`report-section-missing`).
- [ ] T029 [US1] Create the report **skeleton** `specs/010-external-completion-spike/spike-report.md`: the ten headings of [contracts/spike-report.md](./contracts/spike-report.md) §1 in order, each with the line `_To be written in Phase 8 (T061)._` and the front matter (branch, date, status "DRAFT — evidence not yet gathered"). `npm run report-check` must fail on it with `report-section-missing`-or-status errors until T061 — that failure is intentional and is the reminder.
- [ ] T030 [US1] Add the missing line to [contracts/evidence-cli.md](./contracts/evidence-cli.md): `npm run report-check` (and its four failure names) and `npm run evidence -- --markdown`; keep the table format of that file.

**Checkpoint**: `npm test` green for T020–T022; `npm run evidence` with nothing registered exits 1 `evidence-zero-tests` (the runner never registers a placeholder scenario — the test registers a no-op one to prove the table path). Commit; "P1′ done" in `TIMEBOX.md`.

---

## Phase 4: User Story 2 — A move completes a waiting gate in one commit, or not at all (Priority: P1) 🎯 MVP

**Goal**: guarantees **a** (atomic), **d** (no clock settles) and **e** (resumes as it was) are exercised by kill-at-every-point and random kills, first on the two control strategies (to prove the harness), then on the native strategies of Pi Durable.

**Independent Test**: `npm run evidence -- --strategy control-sqlite --only kill-point` ⇒ every declared point exercised, a, d, e `held`; `--strategy broken-two-commit` ⇒ guarantee **a** `not-held`, `I3` named, at `between-commits`; then `--strategy native-signal` yields statuses for a, d, e.

### Tests for User Story 2 (write first; they fail)

- [ ] T031 [P] [US2] Write `spikes/r42/tests/kill-points.test.ts`: for each strategy in a list (`control-sqlite`, `broken-two-commit`, later each native strategy), for **each point in `strategy.killPoints`**: start an owner with `KILL_AT=<point>`, send an `open` then a `submit` (for `recovery`-phase points: kill once first, then restart the owner *with* `KILL_AT` set so it dies during recovery), assert the owner died by `SIGKILL` **at that point** (`KILL_LOG` names it), restart a clean owner, `inspect` the store, and assert `checkInvariants` is empty — **expecting violations for `broken-two-commit` at `between-commits` and none elsewhere**. The test fails (does not skip) if a strategy lists a point that never fired.
- [ ] T032 [P] [US2] Write `spikes/r42/tests/kill-random.test.ts`: for each strategy, ≥ 100 trials (a constant, default 300 in `evidence`, 100 in `npm test`): start an owner, `open`, send a `submit` without awaiting it, `SIGKILL` the owner after a random delay of 0–50 ms (seeded; the seed printed), restart, `inspect`, assert invariants. Record the delay histogram and how many trials the kill landed before/after the move; a trial in which the owner died *before it read the request* still counts but is tallied separately.
- [ ] T033 [P] [US2] Write `spikes/r42/tests/no-clock.test.ts`: (1) **clock jump**: start the strategy with an injected `now` that returns real time + 10 years after `open`; assert `state` is `waiting` and `inspect` shows no timer (I7); (2) **wall time**: wait 2 s real time, still `waiting`; (3) **restart limit**: kill the owner > 5 consecutive times (7) with no move and restart each time; assert `waiting`, `blocked: false`, no `parked` report (I6); (4) the same after a settled gate: stays settled (I5).

### Implementation for User Story 2

- [ ] T034 [US2] Create `spikes/r42/src/scenarios/kill-point.ts` implementing T031's procedure as a function `runKillPointScenarios(strategy): ScenarioResult[]` (one result per declared point, `ran: false` for any point not fired) and register it for guarantees **a** and **e** in the `scenarios` registry of `src/evidence.ts`.
- [ ] T035 [P] [US2] Create `spikes/r42/src/scenarios/random-kill.ts` implementing T032 (`kind: "random-kill"`, supporting evidence, guarantee a/e) and register it.
- [ ] T036 [P] [US2] Create `spikes/r42/src/scenarios/no-clock.ts` implementing T033, including the `restart-limit` scenario (`kind: "restart-limit"`, guarantee **d**/**e**), and register them.
- [ ] T037 [US2] Run `npm run evidence -- --strategy control-sqlite` and `--strategy broken-two-commit`. **Gate**: control ⇒ a, d, e `held` and every declared point exercised; broken ⇒ a `not-held` with `I3` at `between-commits`. If either is wrong, the **harness** is wrong — fix it before touching any native strategy; record both outputs in `spikes/r42/NOTES.md` (new: the running lab notebook; the source of report section 3).
- [ ] T038 [US2] Create `spikes/r42/src/strategies/native-signal.ts` — **C1**. Using `Harness.open(storage, {models: createModels() /* no provider */, registry, settings: {restartLimit: Infinity}, now}, BACKGROUND_CONTEXT)` with `openNodeSqliteStorage(<store>/pi.sqlite)`: install an extension `spike` (`defineExtension({name:"spike", tasks:[Gate, Decision]})`) with two `defineTask`s — **`Decision`** (`spike.decision`): phase `wait` registers a single-shot resolver for its gate in an owner-level `Map`, `await`s it (also resolving on `runtime.signal` abort without committing), then performs **one** `runtime.commit(async (tx) => { …read the gate's `spike.move` document (a `defineDoc`, scope `conversation`); if a record exists return undefined; else call `faultPoint("store-write")` and write `{gate,key,move,seq:1}`; return {status:"terminal", outcome:{status:"completed", result:{key}}} })`; **`Gate`** (`spike.gate`): phase `open` creates the `Decision` child with `tx.createTask(Decision, {gateId}, {ownership:{kind:"task", taskId}})` and returns `{status:"waiting", checkpoint:{phase:"settle"}, on:[decisionId], policy:"allSettled"}`; phase `settle` reads `runtime.outcomes([decisionId])` and commits `terminal`. `submit` maps outcomes per the port (first caller takes the slot and awaits the commit; others get `repeat` / `refused(lost-race|stale|key-conflict)` by comparing keys against the **committed record**, not memory). `state` reads the document and tasks from the store. All tasks and the document live in the **root conversation** (`await harness.root(BACKGROUND_CONTEXT)`; the spike never submits a model input). **Declares the caveat** `{text: "guarantee d holds only with settings.restartLimit = Infinity", enforceable: true}` (the seam sets it) and, if T040 shows it, one about waiting inside a phase. `inspect` opens the file read-only (no Harness) and reads the same facts. Handle the **startup race**: `submit` before the phase re-registered returns `refused(not-ready)`. Use `Harness.resume()` after open. Read `node_modules/@earendil-works/pi-durable/dist/types.d.ts` for exact signatures; if an API differs from this description, adapt and note it in `NOTES.md`.
- [ ] T039 [US2] Declare `native-signal`'s kill points in `src/strategies/native-signal.ts` with `killPoint(...)` calls at the matching places: `idle-before-move`; `move-received` (owner.ts); `commit-begin` (first line of the commit callback); `commit-after-read` (after reading the document, before writing); `commit-after-write` (after writing, before returning the next state — **mid-transaction**); `commit-returned` (after `runtime.commit` resolved, before the ack); `ack-sent`; `gate-wake` (decision terminal, gate not yet advanced — `phase: completion`); `gate-settled`; `recovery-start` (first line of owner startup after a previous kill — `phase: recovery`). Register the strategy in `loadStrategy`.
- [ ] T040 [US2] Run `npm run evidence -- --strategy native-signal`; fix harness or strategy bugs (never weaken an assertion); record in `NOTES.md`: each guarantee's status, **what failed and at which kill point**, the observed `restarts` counter behaviour with the default `restartLimit` (run once with the default 5 and show the gate park, then with `Infinity`), and whether a phase that awaits across a restart re-registers in time.
- [ ] T041 [US2] Create `spikes/r42/src/strategies/native-abort.ts` — **C2** (always built and run — clarification 2026-10-26 — but **after** C1's results are recorded in T040, and only within this phase's time budget): `Decision` parks `sleeping` with a far-future `until` (record the value and that it is a clock — I7); `submit` first commits the move document, then calls `Harness.abortTask(decisionId)`; `Decision`'s abort handler reads the document and commits `terminal`. Declare its kill points (including `between-record-and-abort`, `abort-marked`, `abort-handler-begin`). Run the same scenarios; record in `NOTES.md` exactly where it fails guarantee a (two commits) and d (the deadline), with the violated invariant numbers.
- [ ] T042 [US2] **Conditional — C3.** Only if after T040–T041 *no* native strategy holds a, d, e: create `spikes/r42/src/strategies/native-submission.ts` (the move as a keyed write-submission: `conversation.submit({type:"write", …, requestId: key})`, and whether a gate can be modelled on `Submission.wait`); run the same scenarios; record. If a native strategy already holds a, d, e: write "C3 not tried — C1 holds a, d, e (T040)" in `NOTES.md` and tick this task.
- [ ] T043 [US2] Checkpoint: commit; append to `NOTES.md` a table "guarantees a, d, e × strategy" copied from `out/evidence.json`; "P2a done" in `TIMEBOX.md`.

**Checkpoint**: statuses for a, d, e exist for C1 and C2 (and C3 if needed); the harness has been shown to report both `held` and `not-held` correctly.

---

## Phase 5: User Story 3 — Exactly once, first move wins, stale moves refused (Priority: P1) 🎯 MVP

**Goal**: guarantees **b** and **c**, and the **different-process completer** (FR-004, SC-004) for every strategy.

**Independent Test**: `npm run evidence -- --strategy control-sqlite --only repeat` (and `race`, `conflict`) ⇒ held with the exact counts; the same for `native-signal`.

### Tests for User Story 3 (write first; they fail)

- [ ] T044 [P] [US3] Write `spikes/r42/tests/exactly-once.test.ts`: (1) **repeat** — `submit(gate, K, M)` 100 times concurrently (a constant `REPEATS`, 100 minimum) ⇒ exactly one `committed`, the other 99 `repeat` naming the same record, `records == 1`; also once more **after a restart**; (2) **race** — 100 different `(key, move)` pairs concurrently for one gate ⇒ exactly one `committed`; 99 `refused(lost-race | stale)`, each naming the winner; `records == 1`; (3) **conflict** — after `committed(K, A)`, `submit(gate, K, B)` ⇒ `refused(key-conflict)` naming the original and nothing changed; (4) **stale** — a move to a settled gate ⇒ `refused(stale)` **naming the key of the move that settled it** (FR-006), nothing changed; (5) `invalid-move` (empty `decidedBy`) and `unknown-gate` ⇒ refused, nothing written; (6) `not-ready` during startup, then the same key succeeds once ready; (7) **store-error** (clarification 2026-10-26) — start the owner with `FAULT_AT=store-write` and submit a valid move ⇒ `refused(store-error)`, the gate is still `waiting`, no record, I1–I3 hold after a restart; then restart without the fault and the same key commits (the failed attempt left no trace). A genuinely full disk is not simulated.
- [ ] T045 [P] [US3] Write `spikes/r42/tests/different-process.test.ts`: every scenario of T044 and of the kill-point list is also run with the completer as **a separate process** (`node src/client.ts …`, not an in-process client); plus the negative case R-6: a **second process opening the store file directly** while the owner is running — assert only that it is *detected and reported* (what SQLite does: a busy/locked error or a read-only success) and never corrupts the gate; the observation goes to `NOTES.md` for report section 6 ("one owner per storage").

### Implementation for User Story 3

- [ ] T046 [US3] Create `spikes/r42/src/scenarios/exactly-once.ts` (`kind: "repeat" | "race" | "conflict" | "store-error"`, guarantees **b**, **c**; also `stale`, `invalid-move`, `unknown-gate`, `not-ready`) implementing T044 with the counts above, `ScenarioResult` carrying the observed numbers (`committed`, `repeat`, `refused`, `records`), and register them.
- [ ] T047 [P] [US3] Create `spikes/r42/src/scenarios/different-process.ts` (`kind: "different-process"`, attached to **every** guarantee row — a row is `held` only if its different-process variant also ran and passed) implementing T045; register it. The R-6 case is `kind: "second-opener"` and informational (not a guarantee input).
- [ ] T048 [US3] Run the full evidence for `control-sqlite`, `broken-two-commit`, `native-signal`, `native-abort` (and `native-submission` if it exists); fix harness/strategy bugs without weakening assertions; copy the results into `NOTES.md`; "P2b done" in `TIMEBOX.md`.

**Checkpoint**: every native strategy has a status for each of a–e with different-process included. The decision whether a fallback is needed can now be made from data.

---

## Phase 6: User Story 4 — If Pi Durable cannot do it, KILN can, and upstream knows (Priority: P2)

**Goal**: when no native strategy holds a–e, a fallback passes the **identical** scenarios, and an upstream proposal is drafted (not filed).

**Independent Test**: `npm run evidence -- --strategy fallback-document` (or `-table`) ⇒ a–e `held` with the same scenario list as the native strategies; `tests/fallback-parity.test.ts` passes; `upstream-proposal.md` exists, marked *not filed*.

- [ ] T049 [P] [US4] Write `spikes/r42/tests/fallback-parity.test.ts`: (1) every strategy is run over the **identical list of scenario ids** (compare the `scenarios` registry per strategy); (2) a static check that no file under `src/scenarios/` or `tests/` contains a conditional on a strategy name (`/strategy\.name\s*(===|==|!==|!=)/`, `/if\s*\(.*['"](native|fallback|control|broken)-/`); (3) the fallback strategies implement exactly the port (no extra exported operation used by a scenario). Fails now only if a scenario is skipped for a strategy.
- [ ] T050 [US4] **Decision task.** Read `out/evidence.json`, apply `deriveVerdict` to the *native* strategies only, and write the outcome in `NOTES.md`: "fallback **needed** because …" or "fallback **not needed** — `<strategy>` holds a–e incl. different-process (with caveat …)". If *not needed*: tick T051–T054 as `skipped: not needed (reason)`, still write `fallback-document` as "not tried" in the report (section 3), and go to Phase 7.
- [ ] T051 [US4] **Conditional.** Create `spikes/r42/src/strategies/fallback-document.ts` — **F1**: the decision lives in a Pi *document* written in the same commit as the gate's state; because no commit can complete another task (research R2), the document is authoritative and the task graph is **advanced after** and **converges on restart** (on `start`, the strategy reads the document and, if a record exists but the decision task is not terminal, completes it idempotently). Define the port semantics with the document as the truth (`state()` reads it). Declare its kill points (including `between-record-and-advance`, `recovery-converging`). Run the same scenarios.
- [ ] T052 [US4] **Conditional on F1 failing a guarantee, or on a need to test the literal "same SQLite transaction".** Create `spikes/r42/src/strategies/fallback-table.ts` — **F2**: a real table (`kiln_decision(gate PRIMARY KEY, key, …)`) on the **shared connection** (`openNodeSqliteDatabase` + `SqliteStorage.open(database, {prefix})`, research R4), written in a KILN-controlled transaction with the primary key giving exactly-once and first-wins; the task graph advanced after and converging on restart. Record in `NOTES.md` whether the table write and a Pi commit can share **one** transaction (expected: no, without wrapping the storage — F3) and what that means for the roadmap's wording.
- [ ] T053 [US4] **Conditional.** Run the evidence for each fallback built; fix without weakening; copy results to `NOTES.md`; verify T049 passes.
- [ ] T054 [US4] **Conditional on any guarantee not being held by any native strategy (FR-007) — whether the final verdict is `go-with-fallback` or `no-go`.** Write `spikes/r42/upstream-proposal.md`: a draft for a maintainer who has never heard of KILN — the use case (a person decides a gate days later, from another process), the gap (research R2: `Tx` has no task transition; tasks wait only on tasks or the clock; abort is the only external entry), what was tried (C1/C2 with the observed failure), and the smallest change that would close it (a keyed way to complete a task that is parked waiting for external completion, inside a commit). Header: **"DRAFT — NOT FILED. Filing needs a person's decision."** Target: `github.com/earendil-works/pi`, `packages/durable`. Do not open an issue or PR.

**Checkpoint**: either "fallback not needed" is written down with its reason, or a fallback holds a–e under the same scenarios and the proposal exists. Commit; "P3 done" in `TIMEBOX.md`.

---

## Phase 7: User Story 5 — r13 can start without rework, and the spike stays in its box (Priority: P2)

**Goal**: the contract r13 may rely on (in KILN's terms), the findings r13 must hear, the fate of the code, and an honest close of the time box.

**Independent Test**: someone can write r13's first tasks from the contract and findings without opening the library's documentation (SC-009), and `TIMEBOX.md` shows the box was kept or says what is unproven.

- [ ] T055 [US5] Update [contracts/gate-completion-port.md](./contracts/gate-completion-port.md) to its **post-spike form**: add any refusal code a strategy needed (mapping onto the existing codes unless truly new — a new code is a contract change and goes in the report); state which guarantees depend on the fallback and what replaces it if upstream lands; keep it free of library names (T028 checks section 5 of the report, this file is checked by `grep -nE 'pi-durable|@earendil-works|Harness|runtime\.commit|defineTask|sleepUntil|abortTask|waitForTask' ` returning nothing). Also state, for each fallback built, which source is **authoritative** if the fallback and a native path ever disagree, and why (spec edge case); confirm `stale` names the winner and `store-error` is exercised.
- [ ] T056 [P] [US5] Findings — **Node floor**: run `npx -y node@22.19.0 src/evidence.ts --strategy <the strategy the verdict rests on>` and, if the declared floor fails, find the first Node at which it works; write the result and "kiln/ declares ^22.18.0 → must become ≥ 22.19.0, and r12's Node-floor run (22.18) repeated" in `NOTES.md`.
- [ ] T057 [P] [US5] Findings — **dependency tree**: from `package-lock.json` count the packages, list the direct and notable transitive ones (`chord`, `pi-ai`, `pi-codemode`, `pi-telemetry`, `photon`, `diff`, `typebox`), their licences (`npm ls --all --long` or the lockfile) and the install size (`du -sh node_modules`); note that `kiln/` would stop being dependency-free and which of r12's rules (the `externals` seam in `kiln/checks/boundaries.json`, the `network-external-dependency` code, "nothing to install" in README) r13 would have to amend, and that this is r13's decision. Also record the **`node:sqlite` status**: it is Node's built-in SQLite (experimental on 22.19.0, where Node prints a warning), so the library's only durable storage rests on an experimental Node module on the declared floor — state on which Node versions the warning appears.
- [ ] T058 [P] [US5] Findings — **operating rules for r13**: `restartLimit: Infinity` and why (T040's observation); one owner per storage and the second-opener result (T045); the power-loss boundary (WAL + `synchronous = NORMAL`: abrupt process kill is covered, host power loss may lose the newest commit — **not tested**); waiting inside a phase and the changelog's caution; the startup race and `not-ready`. Add the **experimental `node:sqlite`** point: r13 must decide whether to accept it, pin a Node version where it is stable, or isolate it behind the seam.
- [ ] T059 [US5] **Fate of the code**: list every file of `spikes/r42/src/` as *becomes product code in row rN* / *discarded after r13* / *kept as the reproducible evidence* (default: nothing becomes product code; the port is **re-created** in `kiln/packages/durable` from the report, not copied); write it in `NOTES.md`. Then close `TIMEBOX.md`: end instant, whether the 16 working hours were kept (the ledger total), and every scenario left `not-proven` with the reason. "P4 done" checkpoint.

**Checkpoint**: the contract, findings, fate and time-box close are all written in notes; the report can now be assembled mechanically.

---

## Phase 8: Polish & the report

**Purpose**: write the report (the product), prove it matches the evidence, take the "after" control, and run everything once more from a fresh clone.

- [ ] T060 [P] Verify FR-011 — **no network in any test** (analysis E1): write and run `spikes/r42/tests/no-network.test.ts` — (1) **static**: scan every file under `spikes/r42/src/` and `spikes/r42/tests/` (excluding `node_modules`) and fail on `node:http`, `node:https`, `node:http2`, `node:dgram`, `node:dns`, `node:tls`, a global `fetch(`, `new WebSocket(`, and any `connect`/`listen`/`createConnection` call whose argument is a port number or a host (only a Unix-domain socket **path** is allowed); (2) **runtime**: start an owner for `control-sqlite` and for `native-signal`, exercise `open`/`submit`/`state`, and run `lsof -nP -a -i -p <ownerPid>` — assert it lists **no** network sockets (TCP/UDP), then repeat after a kill and restart. Record the result in `NOTES.md`; if the library opens a network socket, that is a finding and a caveat on the verdict.
- [ ] T061 Write `specs/010-external-completion-spike/spike-report.md` — all ten sections of [contracts/spike-report.md](./contracts/spike-report.md) §1, replacing every `_To be written_` line: the **verdict** (one of three) with its `because` from `deriveVerdict`, the pinned triple and the time box; the **tables** from `npm run evidence -- --markdown` pasted verbatim; **what was tried** from `NOTES.md` (every strategy, including those that failed and those not tried, with the reason); the **kill points** per strategy and the counts; **the contract for r13** (the post-spike port, no library names); **findings** (T056–T058); the **upstream proposal** reference or "not needed"; the **fate of the code** (T059); **reproduce** (`npm ci && npm run evidence`, expected output, platform macOS); **unproven** (possibly empty).
- [ ] T062 Run `npm run report-check`; it must pass. Fix the report (never the check) until it does. Then run `grep -nE 'pi-durable|@earendil-works|Harness|runtime\.commit|defineTask|sleepUntil|abortTask|waitForTask' specs/010-external-completion-spike/contracts/gate-completion-port.md` — no output.
- [ ] T063 Take the **"after" control** (SC-008): from `kiln/` run `npm test` and `npm run check`; run `git rev-parse HEAD:legacy` and `git diff --stat main -- legacy kiln specs/ROADMAP.md`; append "After (T063)" to `baseline.md` and state **equal / not equal** to T001. Not equal is a finding to resolve before the report is final.
- [ ] T064 [P] On a **fresh clone** of the branch (`git clone --branch 010-external-completion-spike … /tmp/kiln-r42-fresh`), run [quickstart.md](./quickstart.md) §0–§8; record each result in section 9 of the report and in `baseline.md`. Include the negative proofs of §4 (the broken strategy is caught; zero kill points fail by name).
- [ ] T065 Close out: tick `checklists/requirements.md` items still open; confirm `specs/ROADMAP.md` is unchanged by this row and `r42` is still `queued`; mark every task here `[X]` (skipped conditionals with their reason); commit. The report **states** a verdict; recording it is the human's Roadmap-gate move.

---

## Dependencies & execution order

### Phase dependencies

- **Setup (1)** → **Foundational (2)** → every story. Foundational blocks all stories.
- **US1 (3)** needs Foundational (it consumes the `Strategy` and `ScenarioResult` types) and nothing else; its tests use synthetic data.
- **US2 (4)** needs US1's runner (T027) and Foundational's control strategies. **US3 (5)** needs US2's `native-signal` (T038) to be worth running on a native strategy, but its scenarios (T046–T047) can be written against the control strategies first.
- **US4 (6)** is decided by the data of US2 + US3 (T050) and may be skipped wholesale.
- **US5 (7)** needs the evidence of US2 + US3 (+ US4 if built).
- **Polish (8)** needs everything; T061 is last of the writing, T063–T064 last of the checking.

### Why US1 is first but its report is last

US1 is the highest priority (P1) and is delivered first as **machinery** — the runner, status and verdict rules, never-vacuous guards, report checker — all independently testable on synthetic data. The **prose** report depends on every story's evidence and is therefore written
in Phase 8; the skeleton (T029) and checker (T028) make sure it cannot be forgotten or drift from the evidence.

### Within each story

Tests first and failing → scenario functions → strategies → run and record. Never weaken an assertion to get a strategy to pass; if a guarantee is `not-held`, that **is** the finding.

### Parallel opportunities

- Phase 1: T005 alongside T003–T004's wait for the install.
- Phase 2: T008, T009, T010, T011, T014, T015 are different files with no mutual dependency; T012 after T010; T016–T018 sequential (same files' interfaces).
- Phase 3: T020–T022 together; T023–T026 together; T027 after them.
- Phase 4: T031–T033 together; T035–T036 together after T034.
- Phase 5: T044–T045 together; T046–T047 together.
- Phase 7: T056–T058 together.

### Parallel example: Phase 3 tests, then implementation

```text
Task: "Write spikes/r42/tests/status.test.ts"
Task: "Write spikes/r42/tests/verdict.test.ts"
Task: "Write spikes/r42/tests/never-vacuous.test.ts"
…then…
Task: "Create spikes/r42/src/status.ts"
Task: "Create spikes/r42/src/verdict.ts"
Task: "Create spikes/r42/src/install-check.ts"
Task: "Create spikes/r42/src/table.ts"
```

## Implementation strategy

### MVP first (US1 + US2 + US3, all P1)

1. Phase 1 Setup, Phase 2 Foundational — the harness proven on a correct and a broken control.
2. Phase 3 US1 (machinery), Phase 4 US2 (a, d, e on C1/C2), Phase 5 US3 (b, c, different process).
3. **Stop and decide**: with C1 and C2's statuses in hand the *verdict can already be drafted*. If a native strategy holds a–e, skip US4 and go to US5; otherwise do US4.

### Time-box discipline

Budget (plan, at 8 h a day): P0 ≈ 2 h, P1 + US1 ≈ 4 h, US2 + US3 ≈ 6 h, US4 ≈ 2 h, US5 + report ≈ 2 h = 16 h. If the box ends mid-phase: stop, record the unfinished scenarios as `not-proven`, run Phase 8. **Cut by the tiers and the cut order in *Priority under the time box*; never cut an essential task, and never cut the evidence for a guarantee the verdict claims.**

### Finishing

The row closes only by the **human's** Roadmap-gate move; these tasks end with a report and a control reading, not a gate decision.

## Summary

- **Total tasks**: 65 — **54 essential · 3 required-if-triggered · 8 stretch** (see *Priority under the time box*)
- **Per phase**: Setup 7 · Foundational 12 · US1 11 · US2 13 · US3 5 · US4 6 · US5 5 · Polish 6
- **Conditional tasks**: T042 (C3), T051–T054 (the fallback and the proposal) — each records "skipped: reason" when its condition is false
- **Parallelisable ([P])**: 28 tasks
- **MVP scope**: Setup + Foundational + US1 + US2 + US3 (48 tasks) — the verdict can be drafted from that
- **Test files**: 13 in `spikes/r42/tests/`; **strategies**: 2 controls + 3 native attempts + 2 fallbacks

## Notes

- The strategies share one port and one scenario list; a strategy that "needs special treatment" in a test is a finding about the strategy, not a reason to branch the test (T049).
- `control-sqlite` exists to show the harness can say **held**; `broken-two-commit` exists to show it can say **not-held**. Without both, a green or a red table means nothing.
- Edit shared files deliberately: `src/evidence.ts` (the scenario registry, T027, T034–T036, T046–T047), `src/strategy.ts` (`loadStrategy`), `NOTES.md`, `TIMEBOX.md`. Do not parallelise tasks that edit the same one.
- Stop at any checkpoint to validate the story independently.
