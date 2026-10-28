---

description: "Task list for the record (row r15)"
---

# Tasks: The record (row r15)

**Input**: Design documents from `/specs/013-the-record/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md); [research.md](./research.md) (R1–R16), [data-model.md](./data-model.md), [contracts/](./contracts/) (`event-catalog.md`, `backbone-and-projection.md`, `archive.md`, `check-record.md`), [quickstart.md](./quickstart.md).

**Tests**: **Included — they are the acceptance.** The row's own words are "rebuilt byte-identically" and "replayed as event streams" (FR-041, FR-051, SC-003, SC-004); a record that was never attacked proves nothing (r13/r14's lesson). The negative suites, the kill proofs and the weakened variants are tasks, not extras.

**Organization**: by user story, in the order the *implementation* needs them. After Setup and Foundational (the record exists, appends, reads, and r13/r14 are green on it): **US2 (the catalog and commit-time validation) → US1 (every state change, in order) → US6 (the backbone, which US3 needs) → US3 (the factory-log) → US4 (the old walks) → US5 (evolution) → US7 (the archive) → Polish**. Priorities in the spec are P1 for US1–US4 and P2 for US5–US7; the order here follows dependencies, and each phase ends in something that runs.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1…US7 as in [spec.md](./spec.md); Setup, Foundational and Polish tasks have none
- Paths are relative to the repository root. `kiln/` is the codebase. Abbreviations: `C/` = `kiln/packages/contracts/`, `R/` = `kiln/packages/record/`, `D/` = `kiln/packages/durable/`, `L/` = `kiln/packages/lane/`, `CLI/` = `kiln/packages/cli/`, `K/` = `kiln/checks/`, `T/` = `kiln/tests/`. `S/` = `specs/013-the-record/`.

## Ground rules (from the plan, r13/r14's lessons and the constitution)

- **Every r13/r14 test stays green at every commit.** Where an assertion must change (an entry count, `data.note`), T002's inventory says which and why, and the change adds precision — it never loosens a check.
- **Pure rules in `contracts`/`record`; effects in `durable`; the check imports only `contracts` and `record`.** `contracts` has no `node:` import (boundary check).
- **Nothing here writes a move record or settles a gate.** The backbone and the archive only read committed events and a finished walk. If a task seems to need otherwise, stop: the design is wrong.
- **No polling and no timer in product code** (constitution IX): consumers wake on an in-memory signal after a commit; the archive task is created in a commit, never scheduled.
- **No environment variable in product code can kill or fault a factory.** Kill points are injected `hooks`; only the test-only child owner arms one. Every new point is declared in `KILL_POINTS` **and** used in source (r13's declared-equals-used test).
- **The old walks are never invented** (Clarification Q3): a walk with no real original is listed missing, with its reason.
- **Mutation checks run on a committed tree and are undone before anything else runs**; `T/tools/mutate.ts` asserts a clean tree after each revert. Never weaken an assertion to get a pass.
- Every phase ends with a commit and a recorded checkpoint in `S/baseline.md`. Nothing here edits `specs/ROADMAP.md`: closing r15 is the human's Roadmap-gate move. `legacy/` is not touched.

---

## Phase 1: Setup (readings, inventories, fixtures that must be made *before* the code changes)

**Purpose**: record "before"; list what will churn; capture the one thing that can only be made with r14's code — a store r14 wrote.

- [ ] T001 Take the **"before"** readings and create `S/baseline.md`: Node and npm versions; `cd kiln && npm test` (exit code and the closing line `new: 648 tests · legacy: 500 tests (30 skipped)`), wall-clock seconds; `npm run proof` (exit code, `92 tests`, seconds); `npm run check` (four `PASS`); the `git rev-parse HEAD:legacy` tree id and the hash of `specs/ROADMAP.md`. Run with `PATH` including `/opt/homebrew/bin:/usr/sbin` (r14 lesson).
- [ ] T002 [P] Inventory the churn in `S/notes.md`: every file in `kiln/` that reads `kiln.outbox`, `Inspection.outbox`, `WalkView.history`, `appendOutbox`, `OutboxType` or `StoredOutboxEntry` (the 39 files found while planning), each classified **type-only** (stays), **count** (a gate open will also write `command.accepted`; filter by type), **content** (`data.note`, `data.reasoning`, `data.remainder` → a `…Ref`), or **shape** (reads `cause`, `at`). This list drives T016–T019 and T028–T029.
- [ ] T003 [P] Capture reconnaissance in `S/notes.md` (R10): for each of r1, r2, r3, r7, r8 say which frozen walker or committed file could give a deterministic original (`buildStubWalk`, `buildProgramWalk`, `buildLiveWalk` in stub mode in `legacy/src/`; `kiln/fixtures/r7-live-*.jsonl`; the inline streams of `legacy/tests/contract/log.test.ts`; what the Pi extension of r8 writes) by running each once from a scratch script **outside** the repo's tracked tree and diffing two runs for byte-equality. Record what runs, what does not, and why. This is information for T050, not the capture itself.
- [ ] T004 [P] Measure the **single-document outbox** cost on the unchanged code and commit the script as `T/measure/outbox-baseline.ts`: appends/ms at ~100, ~1 000, ~5 000 entries and the size of the store file; paste the figures into `S/baseline.md` (the planning probe read 0.10 / 0.23 / 1.07 ms). This is the "before" half of SC-009.
- [ ] T005 Generate the **r14-shaped store fixtures** with the unchanged r14 owner, before any source change: `kiln/fixtures/stores/r14-interface-done/` (a finished interface walk, 12 gates, owner stopped cleanly) and `kiln/fixtures/stores/r14-plain-waiting/` (a plain walk stopped with Specification waiting). Use a small script `T/tools/make-r14-store.ts` that runs the walk through the in-process factory with an injected clock and fixed keys, closes it, and copies `factory.sqlite` (checkpointed, no `-wal`). Write `kiln/fixtures/stores/README.md` (how they were made, from which commit `c09a5e1`, the outbox entry counts, their SHA-256). These are the inputs of T055.

---

## Phase 2: Foundational (the record exists; r13/r14 run on it)

**Purpose**: everything that blocks every story: the event type and id, a catalog for the types already emitted, validation, chunked storage, reading with version 0, and the switch of all twelve call sites with content turned into references. **No new behaviour is added here** — this phase ends with the full default tier green on the new write path.

**⚠️ CRITICAL**: no user story work begins until the checkpoint at T020.

- [ ] T006 [P] Add `C/src/events/types.ts`, `C/src/events/id.ts`, `C/src/events/index.ts` and export from `C/src/index.ts` (if one exists): the `Event` envelope, `Ctx {digest}`, `Privacy`, `uuid7(timeMs, seq)` — deterministic, UUIDv7-shaped, 48-bit time then the sequence in the counter fields, zero-fill elsewhere, no randomness, no `node:` import. Tests `C/tests/event-id.test.ts`: shape matches `^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`; same input → same id; ids sort by (time, seq); 10⁵ consecutive seq are unique. `Ctx` is `{digest(text), siblings(seq, key)}` (research R7).
- [ ] T007 [P] Add `C/src/events/grammar.ts`: the actor grammar (data-model §1), `FORBIDDEN_KEYS`, `REMOTE_KEYS`, the `{ref, digest}` pair shape and the ref locators (`move:<gateId>#note`, `walk:<feature>/moves/<key>#note`, `row:<feature>#triage.reasoning`) with a parser. Tests `C/tests/event-grammar.test.ts`: every actor form accepted (`human@x`, `director`, `system`, `factory`, `task:12`, `role:judge@m`, `delegation:d1`, `script:r14`), a near-miss refused; each forbidden key found at depth 3; each locator round-trips.
- [ ] T008 Add the **catalog skeleton and the schemas of the twelve types r13/r14 emit** (`gate.opened`, `move.committed`, `gate.settled`, `gate.withdrawn`, `gate.not-applicable`, `gate.became-applicable`, `gate.skipped`, `lane.acquired|released|swapped`, and `walk.admitted|returned|fix-round|split|left-lane|not-admitted|completed|move-ignored`) in `C/src/events/catalog/{gate,walk,lane}.ts` and `C/src/events/catalog/index.ts` per data-model §2 (`additionalProperties: false`; content fields as `{…Ref, …Digest}`; `gate.settled` requires `decidedBy` and `move`; `move.committed` requires `decidedBy` and `kind`). Tests `C/tests/catalog.test.ts`: one valid example per type validates; one invalid example per required field and per extra field fails.
- [ ] T009 [P] Add `R/src/events/validate.ts`: `validateEvent(event)` — the catalog entry exists, version is current, data validates (reusing `R/src/validate-core.ts`), actor and causation grammar, subject non-empty, time is an ISO instant, forbidden-key scan, content-pair rule — returning `[{code, path, message}]` with the codes of `contracts/event-catalog.md` §1. Tests `R/tests/validate.test.ts`: one case per code.
- [ ] T010 [P] Add the document families to `D/src/store.ts` (`kiln.event`, `kiln.record`, `kiln.cursor`, `kiln.projection`, `kiln.archive`) and keep `D/src/library/docs.ts` generic; update `D/tests/seam*.test.ts` expectations that enumerate `DOC_NAMES`. Test: the families open and round-trip a value in an in-process store.
- [ ] T011 [P] Add `D/src/record/refs.ts`: `refOf(kind, …)` builders, `digestOf(text)` (via `D/src/canonical.ts` `sha256Hex`), `resolve(store, ref)` reading the move record / walk document / row input; `ctx` for upcasters. Tests `D/tests/record/refs.test.ts`: a note stored in a move record resolves to the same text and digest; an unknown ref fails by name.
- [ ] T012 Implement `D/src/record/append.ts`: `appendEvent(tx, draft)` per `contracts/event-catalog.md` §1 — read/create `kiln.record/head` (taking `legacyThrough` from `kiln.outbox/main`'s last `seq` the first time, without writing that document), build the envelope (id via `uuid7`, `time` default `s.now()`, `correlation` derived from the subject, `privacy` from the catalog), `validateEvent`, throw `EventRejected{code,…}` before any write, append to the last chunk (new chunk every 256), advance `head`, extend `run:<feature>`; mark `services.record.appended`. Tests `D/tests/record/append.test.ts`: 700 appends cross two chunk boundaries with gap-free `seq`; a thrown rejection leaves `head` and the chunk unchanged; a hand-built r14-style `kiln.outbox/main` with 7 entries makes the first new event `seq` 8; `kiln.outbox/main` is byte-identical afterwards.
- [ ] T013 Add the version 0 → 1 upcasters for the twelve types plus `record.unknown` and `EventVersionUnknown` in `C/src/events/upcast.ts` (data-model §4; `contracts/event-catalog.md` §4; `gate.settled` takes `move`/`decidedBy` from its sibling `move.committed` (same subject, same cause key, earlier sequence) via `ctx.siblings`, failing `event-sibling-missing` if absent; content fields become `{ref, digest}` with the digest from `ctx.digest`; rendered sentences dropped). Tests `C/tests/upcast.test.ts` with samples copied from a real r14 walk's outbox (taken from T005's fixtures): each upcasts to an event that `validateEvent` accepts; a test-side `downcast` recovers every admitted field (**lossless**); calling twice gives equal output (**pure**); an unknown type becomes `record.unknown`; a stored `schema` of `…/9` throws `EventVersionUnknown`.
- [ ] T014 Add `D/src/record/read.ts`: `readRecord(src, range)` and `readRun(src, feature)` over a `Tx | Store | Reader` — v0 entries from `kiln.outbox/main` up to `legacyThrough` upcast on the way, then chunks; the **compat view** `interimView(event)` returning `{type, subject, at, actor, cause, data, seq}`. Tests `D/tests/record/read.test.ts`: order and range; a run read via its index equals the filtered record; the compat view of a v1 event has the fields r13/r14 tests read. It supplies `ctx.siblings` while streaming (a bounded window of the preceding `move.committed` events keyed by subject and cause), so an upcaster stays a pure function of its inputs; a test reads a v0 `gate.settled` and gets its `move` and `decidedBy`, and a stream truncated before the `move.committed` fails `event-sibling-missing` naming the entry.
- [ ] T015 Switch the **twelve call sites** to `appendEvent` — `D/src/gate/open.ts`, `D/src/gate/tasks.ts` (settle reads the move record to give `move` and `decidedBy`), `D/src/walk/walk.ts` (both `out.outbox` loops, `pin`, `verify`, the ignored-move entry with `why` from an enum), `D/src/walk/moves.ts`, `L/src/lane-task.ts` (4 sites) — turning each content field into `{ref, digest}` per R6 (`gate.opened` also carries `flow` and `round`); reduce `D/src/outbox.ts` to a read-only shim over `read.ts` and delete `appendOutbox`; export from `D/src/index.ts`. The lane events carry no correlation yet (T030).
- [ ] T016 Read through `readRecord` in `D/src/inspect.ts` and `D/src/walk/view.ts` (`Inspection.outbox` and `WalkView.history` keep their r14 shape as the compat view; `view.ts` uses `readRun`); update `D/src/types.ts` (`OutboxType` becomes the catalog's type names; `OutboxEntry` stays as the compat shape). Test: the r14 walk tests that read `history` pass unchanged except T017's list.
- [ ] T017 Update the durable tests flagged **content**/**count**/**shape** in T002 (`D/tests/walk/*.test.ts`, `D/tests/proof/walk-*.test.ts`, `D/tests/oracle.test.ts`, `D/tests/proof/commands.test.ts`, …): `data.note` → `data.noteRef` + digest equals `sha256(note)`, counts by filtered type. For each changed assertion write the reason in `S/notes.md`.
- [ ] T018 [P] Update `CLI/tests/feature-cli.test.ts`, `CLI/tests/feature-cli.proof.test.ts` (the `h.data.reasoning` assertion becomes the reference and digest) and any `check-*` count assertions.
- [ ] T019 [P] Update `L/tests/lane-task.test.ts`, `L/tests/lane-proof.test.ts` and `D/tests/proof/support/{oracle,walk-oracle,walk-harness,broken-gate}.ts` to read the record through `readRecord`/the compat view; the r13 oracle invariants I1–I10 and the walk invariants W1–W4 are unchanged in meaning.
- [ ] T020 **Checkpoint**: `npm test` and `npm run proof` and `npm run check` green on the new write path; append the readings to `S/baseline.md`; commit. (From here the record is real: every r13/r14 guarantee is proven on it.)

**Checkpoint**: the foundation is ready; user stories can begin.

---

## Phase 3: User Story 2 — every event type has a versioned schema, and an invalid event fails its commit (Priority: P1) 🎯 MVP

**Goal**: the catalog is complete for what the row names, and an invalid event is refused by name with the state unchanged.

**Independent Test**: feed the owner one valid event of every kind and one invalid event per rule; every valid one commits, every invalid one is refused by name, the state is unchanged; an empty catalog fails the check.

- [ ] T021 [P] [US2] Complete the catalog in `C/src/events/catalog/`: `unit.ts` (`unit.queued|started|settled|failed|aborted`), `command.ts` (`command.accepted`, `command.refused`), `feature.ts` (`feature.archived`, `transcript.aged-out`), `delegation.ts` (`delegation.armed`), `experience.ts` (`charter.approved|amended`, `design-system.approved|amended`), `system.ts` (`server.started|recovered`, `store.migrated`), `legacy.ts` (`gate.waiting`, `lane.held`, `lane.cost-recorded`) per data-model §2, each flagged `emitted` truthfully. Tests extend `C/tests/catalog.test.ts`: valid/invalid example per type, including `gate.not-applicable` with its reason and the four charter/design-system types (FR-011). Also add the roadmap group as schema-only types (`roadmap.amended`, `roadmap-gate.decided`; mark S) so FR-010's "program and roadmap" is real.
- [ ] T022 [P] [US2] The **commit-time negative suite** `D/tests/record/append-negative.test.ts`: one member per code of `contracts/event-catalog.md` §1 (`event-type-unknown`, `event-version-unknown`, `event-data-invalid`, `event-field-forbidden` — a `note` and a `url` — `event-actor-invalid`, `event-cause-missing`, `event-subject-invalid`, `event-time-invalid`) run **inside a real commit that also changes a document**; each asserts the named rejection **and** that the document, `head` and the chunk are unchanged. Add the member `event-cause-dangling` (an `evt:<n>` causation where `n` is not an earlier sequence number) — the commit is refused and the state is unchanged.
- [ ] T023 [US2] FR-014 through the gate: a test `D/tests/record/settle-decider.test.ts` using the `broken-gate` helper (extended) so that a settle attempt carrying no `decidedBy` fails its commit with `event-data-invalid`, the gate stays waiting, and no `gate.settled` exists; a move kind outside its gate's vocabulary is still refused at submit (r13) and a `move.committed` event for such a kind is refused by the stream rule in T031.
- [ ] T024 [P] [US2] Generate `kiln/schemas/events/<type>.<n>.json` from the catalog with `T/tools/gen-event-schemas.ts` (deterministic, sorted keys); commit them; test `R/tests/event-schemas-generated.test.ts` that the files equal the catalog's output byte for byte.
- [ ] T025 [US2] Add `kiln check record` (part 1: the catalog and the source scan) in `K/record.ts`, register it in `K/index.ts` (a fifth check), update `K/kiln.json`; it examines: every type has a current schema, no schema is open or declares a forbidden key, every version has its upcaster, the generated schemas are equal, every type passed to `appendEvent` in `kiln/packages` is in the catalog and every `emitted` type is passed by some file; prints `PASS record — examined: T types, S source files, …` and **fails when T or S is 0**. Tests `K/tests/record-check.test.ts`.
- [ ] T026 [US2] The check's negative members for part 1 in `K/tests/record-negative.ts`: `record-vacuous` (empty catalog), `catalog-schema-open`, `catalog-forbidden-key`, `catalog-upcaster-missing`, `catalog-unknown-emitted`, `catalog-dead-type`; a permissive stub check must fail the suite. Update every place that counts checks (T002's list from r14: "four" → "five") including `CLI/tests/check-boundaries.test.ts` and the README.
- [ ] T027 [US2] **Checkpoint**: default tier green; `npm run check` five `PASS`; commit; append to `S/baseline.md`.

**Checkpoint**: User Story 2 is complete — the record's shapes are enforced where it matters.

---

## Phase 4: User Story 1 — every state change is in the record, with its actor and cause, in one gap-free order (Priority: P1)

**Goal**: units and commands are recorded; lane events know their run; the record of a killed-and-resumed walk is whole.

**Independent Test**: walk both scripted features, with the owner killed along the way; a fresh reader finds one event per state change, gap-free, each with actor and cause.

- [ ] T028 [US1] Unit events: in `D/src/tasks/unit.ts` emit `unit.settled|failed|aborted` in the terminal commit and `unit.started` on the first step; emit `unit.queued` in the **creating** commit — `D/src/walk/walk.ts` `work()` and `D/src/tasks/row.ts` (script form) and `D/src/tasks/index.ts` (`task.create` of a unit). Update the **count** assertions from T002. Tests `D/tests/record/unit-events.test.ts`: a scripted unit gives queued → started → settled; a killed-and-resumed unit gives each exactly once.
- [ ] T029 [US1] `command.accepted`: in `D/src/commands.ts` `runCommand`'s applied branch append `{kind, requestHash}` with causation `cmd:<key>`; add an optional `actor` to `runCommand` and pass it from `D/src/gate/open.ts` (`spec.openedBy`) and `D/src/tasks/index.ts` (default `system`). A repeat appends nothing; a refusal appends nothing. Tests `D/tests/record/command-events.test.ts`; update `D/tests/proof/commands.test.ts` counts.
- [ ] T030 [US1] Lane correlation: in `L/src/lane-task.ts` set the event's correlation from the holder's owning row (`tx.task(id)` owner chain → `kiln.row` input `feature`) when there is one, else `null`; pass `correlation` through `appendEvent`'s draft. Tests in `L/tests/lane-task.test.ts`: a lane acquired by a unit of a walk's row carries `run:<feature>`; a bare unit carries `null`.
- [ ] T031 [P] [US1] The **stream rules** `R/src/streams.ts` (`backbone-and-projection.md` §4): gap-free, `time-backwards`, silent approval (a `gate.settled` whose `decidedBy` is not `human@…` and no `delegation.armed` for the gate), delegation distinct, forbidden key, move in vocabulary for the pinned flow (via `C/src/flow`), never vacuous (counts examined). Tests `R/tests/streams.test.ts`: a valid stream passes; each rule fails with its own code; an empty stream fails `record-vacuous`. Add the causation-chain rule `causation-chain-broken`: following `evt:<n>` backwards from any event reaches a `cmd:` root without a gap (FR-005); a test with a broken chain names the event.
- [ ] T032 [US1] The record oracle `D/tests/proof/support/record-oracle.ts` — **E1** (gap-free, `head.next`, chunk ranges), **E2** (every event valid at its version), **E3** (actor and causation) — wired into `checkInvariants`/`walk-oracle`; tests `D/tests/oracle.test.ts` gain a hand-corrupted store per invariant (a skipped seq, an extra field, a missing actor) that the oracle names. Add **E7** (state ⇔ event, the denominator of SC-001): each `kiln.gate` document has exactly one `gate.opened`; each move record exactly one `move.committed`; each terminal unit task exactly one `unit.settled|failed|aborted`; each lane acquire/release/swap exactly one `lane.*`; each `kiln.command` entry exactly one `command.accepted`; each walk outcome exactly one of `walk.completed|left-lane|not-admitted`; and every such event has its state. A hand-corrupted store (a gate document with its event removed; an event with no gate) is named by E7 in `D/tests/oracle.test.ts`.
- [ ] T033 [US1] Declare the kill point `record.append-after-write` (mid-commit, after the chunk is written, before the commit returns) in `D/src/hooks.ts` `KILL_POINTS`, fire it in `append.ts`, and extend `D/tests/kill-points-declared.test.ts`. Proof `D/tests/proof/record-kill-points.proof.test.ts`: both scripted walks killed at **every** walk point and the new point (the r14 harness, measured from a hit log); after restart a fresh reader finds E1–E3 and I1–I10 clean and the record's events equal the uninterrupted walk's (type, subject, actor, causation, canonical data — no clock).
- [ ] T034 [P] [US1] `D/tests/record/concurrency.test.ts`: two clients issue commands (gate opens, moves, task creates) concurrently, 200 each; `seq` is gap-free, no duplicates, each command's event has its key as causation.
- [ ] T035 [US1] Default-tier smoke `D/tests/proof/record-smoke.test.ts`: one kill at `record.append-after-write` per scripted walk plus the E1–E3 oracle; ≤ 10 s.
- [ ] T036 [US1] Weakened writer `D/tests/proof/support/broken-record.ts` (an `appendEvent` that skips validation, and one that allocates `seq` before the commit) and `D/tests/proof/record-weakened.test.ts`: E2 / E1 name each; the test fails if the weakened writer passes.
- [ ] T037 [US1] **Checkpoint**: default tier and proof green; commit; `S/baseline.md`.

**Checkpoint**: User Stories 1 and 2 — the record is whole, ordered and valid. **This is the MVP.**

---

## Phase 5: User Story 6 — consumers follow the record with durable cursors and never block the factory (Priority: P2; built before US3 because the projection is its first consumer)

**Goal**: an in-process backbone with durable cursors, at-least-once, idempotent, non-blocking.

**Independent Test**: kill a consumer's host at each step of delivery and cursor advance — it ends equal to an uninterrupted one; a stalled consumer leaves a walk's outcome and time unchanged.

- [ ] T038 [US6] Add `D/src/record/consumer.ts` (the `Consumer` interface), `D/src/record/cursors.ts` (`kiln.cursor` read/advance) and `D/src/record/backbone.ts` (`register`, `start`, `stop`, `notify`, `status`, `retry`; one async loop per consumer; batches ≤ 256; transactional = `apply` + cursor in one commit; effect = `deliver` then cursor; a throw records `failed` and stops that loop only; **no timer, no poll** — a loop awaits an in-memory signal). Wire it in `D/src/factory.ts`: construct with `Services`, `start()` after `ready`, `stop()` first in `close()`, make **every** commit wake it — the walk row, gate decision and unit tasks commit through the task runtime (`run.commit`), not `store.commit`, so the seam does it: `wrapTx` in `D/src/library/tasks.ts` marks a transaction that called `appendEvent`, and both `runtimeOf.commit` (`D/src/library/tasks.ts`) and the root `commit` (`D/src/library/open.ts`) call an `onAppended` callback (a new `OpenStoreOptions` field in `D/src/store.ts`, set by `factory.ts` to `backbone.notify`) **after the commit resolves**; a commit that throws or rolls back never notifies. A consumer whose cursor is **ahead of `head`** stops and is reported `cursor-ahead-of-head` in `status()` (never skips forward). Test: a walk row's own commit wakes a registered consumer (no restart), and a forged cursor ahead of `head` is named. Tests `D/tests/record/backbone.test.ts` (in-process, with a test consumer): ordered delivery; catch-up after a reopen; a late consumer from 1.
- [ ] T039 [US6] Declare and fire the kill points `backbone.batch-read`, `backbone.apply-after-write`, `backbone.committed`, `backbone.delivered` in `D/src/hooks.ts` and `backbone.ts`; extend the declared-equals-used test.
- [ ] T040 [P] [US6] More backbone tests in `D/tests/record/backbone.test.ts`: a repeat delivery of every batch to an effect consumer changes nothing; a consumer that never returns leaves a 12-gate walk's outcome identical and its time under 3 s in-process, with its lag visible in `status()`; a throwing consumer is isolated, reported by name, and `retry` resumes it; **no timers** (the r13 `timers` list in `inspect` stays empty; a source scan of `backbone.ts` finds no `setTimeout`/`setInterval`).
- [ ] T041 [US6] E5 in the record oracle (every cursor ≤ head; a transactional consumer's documents equal a fresh fold to its cursor); proof `D/tests/proof/backbone-kill.proof.test.ts`: kill at each backbone point with a counting transactional consumer and a counting effect consumer; after restart each has seen every event at least once, the transactional one exactly once, and both equal an uninterrupted run.
- [ ] T042 [US6] Weakened consumer (`broken-record.ts`: advances its cursor before applying): E5 / the proof names it; add to `record-weakened.test.ts`.
- [ ] T043 [US6] **Checkpoint**: green; commit; `S/baseline.md`.

---

## Phase 6: User Story 3 — the factory-log is a projection, rebuilt byte-identically (Priority: P1)

**Goal**: one factory-log file per feature run, built from the record, identical to its own rebuild, accepted by the first program's validators.

**Independent Test**: run a walk with the projection live; delete the file; rebuild from the first event; compare bytes; run the validators on both.

- [ ] T044 [P] [US3] `C/src/events/factory-log-map.ts` (the table of research R9) and `R/src/projections/factory-log.ts` (`foldRun(events, resolver) → string[]`, pure: `ts` = event time, per-file `seq` from 0, `gate` via `GATE_KEY_OF`, `flow` stamped when the event says, derived `cost` for `gate.settled` unless the event carries it, `note` only if a ref resolves). Tests `R/tests/reducer.test.ts` and `R/tests/mapping-table.test.ts`: every event type names a record type or "none"; the reducer is a pure function (same input, same bytes, no `Date`/`process` use — a source scan); a hand-made event run folds to expected bytes.
- [ ] T045 [US3] The consumers `D/src/record/consumers/factory-log.ts` (transactional; `kiln.projection/log:<feature>` = `{state, lines, seq}`) and `D/src/record/consumers/files.ts` (effect; writes `<store>/projections/factory-log/<feature>.jsonl` by temp-file-and-rename, idempotent), registered in `D/src/factory.ts`. Tests `D/tests/record/factory-log.test.ts`: run the plain and interface walks deciding as `human@r15-script`; the live file equals `foldRun` over the run's events from 1 **byte for byte**; `R/src/log.ts` `validateLog` passes on it; the same walk decided as `script:r14` is **refused by R3** (a scripted decider is not a human — documented, not hidden); a run with no feature (a bare lane event) produces no file.
- [ ] T046 [P] [US3] `CLI/src/record-commands.ts` — `kiln record show|status|verify|rebuild-log` over a fresh reader (`D/src/library/open.ts` `openReader`), exit codes per the contract, **`verify` examining zero events exits 1**; wire in `CLI/src/main.ts`, `CLI/src/gate-usage.ts`; tests `CLI/tests/record-cli.test.ts`: against a store produced by a walk; `rebuild-log --out` equals the live file; `verify` prints PASS with counts. `rebuild-log` and `verify` print the `seq` they reached (a rebuild while the factory is writing reads a consistent prefix and says so); test it against a store with a writer appending.
- [ ] T047 [US3] E4 in the record oracle (for every run the reducer over its events equals the live `lines` and the live file) and proof `D/tests/proof/factory-log-kill.proof.test.ts`: kill at the walk points, the backbone points and `record.append-after-write` with the projection live; after restart `rebuild-log` equals the live file for every run; includes a kill **between** the transactional commit and the file write (the file consumer's repeat repairs it).
- [ ] T048 [US3] Weakened projection (`broken-record.ts`: a reducer reading `Date.now()`, and one that depends on the order of unrelated runs): E4 names it; add to `record-weakened.test.ts`.
- [ ] T049 [US3] **Checkpoint**: green; commit; `S/baseline.md`.

---

## Phase 7: User Story 4 — the old walks replay as event streams, byte-identical (Priority: P1)

**Goal**: the first program's walks become committed event streams; each replays to its original bytes; the stream kept because it fails still fails. Walks without a real original are reported, never faked.

**Independent Test**: for each captured walk, replay the stream and compare bytes, then run the validators and compare the verdict with `meta.expect`.

- [ ] T050 [US4] `R/src/legacy-convert.ts` — the inverse of the mapping table: `recordToEvent(record, ctx)` (transition→`lane.*`, human-decision→`move.committed`, gate-completion→`gate.settled`, wait→`gate.waiting`, pre-delegation→`delegation.armed`, cost→`lane.cost-recorded`; ids from `uuid7(ts, seq)`, `correlation` from the stream name, `actor` from `decidedBy`, a `note` becoming a `noteRef` with the text in a returned sidecar map) and `eventToRecord`; tests `R/tests/legacy-convert.test.ts` on `kiln/fixtures/r7-live-inference.jsonl` and `r7-live-broken.jsonl`: `eventToRecord(recordToEvent(r))` is byte-equal for all 25 lines of each.
- [ ] T051 [US4] The capture command `spikes/015-capture-walks/capture.ts` + `README.md`: imports the frozen walkers from `legacy/src/` (this directory is outside `kiln/` and `legacy/`; `kiln check boundaries` does not scan it), runs those T003 found deterministic, writes `kiln/fixtures/walks/<name>.{jsonl,events.jsonl,refs.json,meta.json}` as in data-model §8, and prints a table of what it captured and what it could not and why. **Run it**; commit the outputs. The r7 pair are copied with `meta.json` (`expect: "valid"` / `"R3"`). Update `S/notes.md` with the final inventory: for each of r1, r2, r3, r7, r8 — captured (from which walker/file) or **missing, with the reason**.
- [ ] T052 [US4] `R/src/replay.ts` and `R/tests/replay.test.ts`: for each stream in `kiln/fixtures/walks/` — events validate; `foldRun` reproduces `<name>.jsonl` **byte for byte**; `validateLog` gives `meta.expect` (the broken r7 still fails R3, naming it); the stream rules hold; a run examining zero walks fails.
- [ ] T053 [US4] `kiln check record` part 2 in `K/record.ts`: replays the committed walks, prints `W of 5 named walks (M missing: <names, why>)`, fails when W = 0, when a replay differs by one byte, or when a named walk is neither replayed nor listed with a reason; negative members `stream-gap`, `causation-chain-broken`, `stream-time-backwards`, `stream-silent-approval`, `stream-delegation-merged`, `stream-content-key`, `stream-move-not-in-vocabulary`, `replay-differs`, `replay-verdict-differs`, `walk-missing-unexplained` in `K/tests/record-negative.ts` (18 members in all with T026's, including `causation-chain-broken`); the permissive stub fails the suite. Time the check on the committed streams: it finishes in under 2 s (the plan's budget).
- [ ] T054 [US4] **Checkpoint** and **decision note**: green; commit; in `S/notes.md` state plainly how many of the five walks are replayed and which are missing — this is what the Roadmap gate will be asked to accept (Clarification Q3).

---

## Phase 8: User Story 5 — events keep their meaning as their shape changes (Priority: P2)

**Goal**: stores written by r13/r14 open and read as current; a breaking version is absorbed by an upcaster the committed replays prove.

**Independent Test**: open the r14-shaped stores with the new owner; add a breaking version in a test catalog and replay.

- [ ] T055 [US5] `D/tests/record/store-compat.test.ts` using T005's fixtures (copied to a temp dir): open with the new owner; every stored entry reads as a current-version event; `kiln.outbox/main` is **byte-identical** after open and after a further walk step; the waiting gate of `r14-plain-waiting` still takes a move and the walk goes on, its first new event at `legacyThrough + 1`; `kiln record verify` passes; `r14-interface-done` rebuilds a factory-log whose validator verdict is stated (its decider is `script:r14`, so R3 refuses it — recorded as the expected verdict in the test).
- [ ] T056 [P] [US5] A **test catalog** with a breaking `gate.opened/2` and its upcaster in `C/tests/fixtures/catalog-v2.ts`; `R/tests/evolution.test.ts`: v1 events read as v2 through the upcaster; every committed replay (T052) stays byte-identical under the v2 catalog; consumers see only v2. Add an **additive** case: an optional field added to a type in the test catalog needs no new version and no upcaster, and every replay stays byte-identical (FR-020).
- [ ] T057 [P] [US5] Negative members `catalog-upcaster-lossy` (drops an admitted field) and `catalog-upcaster-impure` (reads a clock) in `K/tests/record-negative.ts` with the check logic in `K/record.ts` (round-trip over the committed v0/v1 samples; call-twice equality); an event of a newer version than the reader knows fails the read by name (`D/tests/record/read.test.ts`); an unknown interim type reads as `record.unknown` and is never turned into a known type.
- [ ] T058 [US5] **Checkpoint**: green; commit; `S/baseline.md`.

---

## Phase 9: User Story 7 — a finished feature leaves the live store in a checksummed archive, automatically (Priority: P2)

**Goal**: when a walk ends the factory archives it, verifies before compacting, leaves the record whole, and keeps the keys.

**Independent Test**: let a scripted walk end; watch the archive appear; kill at each archive step; compare the record before and after; read the keys back.

- [ ] T059 [US7] `D/src/record/archive.ts`: the archive file (data-model §7) — `exportFeature(store, feature)` (deterministic: documents in a fixed order, tasks by id, the run's events, referenced texts), `writeArchive` (temp file, `fsync`, rename), `verifyArchive(file)` (recompute SHA-256 and counts), `readArchive(file)`. Tests `D/tests/record/archive-file.test.ts`: export is a pure function of the stored state (twice → identical bytes); a flipped byte fails `archive-checksum-mismatch`.
- [ ] T060 [US7] `D/src/record/archive-task.ts`: the `kiln.archive` task kind (phases `export` → `verify` → `commit`; the commit appends `feature.archived`, writes the tombstones of research R12 and `kiln.archive/<feature>` and ends the task; a repeat after the marker exists just ends), registered in `D/src/tasks/index.ts`/`D/src/factory.ts` (`builtinKinds`); the row's **terminal commits** (`D/src/walk/walk.ts` `decide` end branches and the admission reject) create it in the same commit; declare and fire `archive.export-written`, `archive.verified`, `archive.commit-after-write`, `archive.committed`. A tombstoned move keeps `noteDigest`; `D/src/gate/move.ts` `sameMove` and the walk document's feature-move comparison compare the **digest** when the stored note text is gone, so a legitimate retry of an archived move key with the same note is `repeat` and with another note is `key-conflict`.
- [ ] T061 [US7] `D/tests/record/archive.test.ts`: a walk that ends (merged; left the lane; not admitted) archives with no command; `feature.archived` names the checksum; **the record is unchanged** (events before = events after, plus the one); `feature state` and `kiln record show --run` answer as before; a repeat of a move key and a command key of the feature is `repeat`/`key-conflict`/`stale`, never new; `feature admit` of the name is refused; the tombstones keep `briefRef`, deciders and the keys; the live store holds no brief content or note text for the feature. Add the retry case: an archived move key retried with the same note → `repeat`; with a different note → `key-conflict`.
- [ ] T062 [US7] Failure paths in `D/tests/record/archive.test.ts`: a damaged archive is reported by name and **nothing is compacted**; an I/O failure retries on restart; the end of the walk and other features are not delayed (a second feature walks while the first archive task is held back by a hook).
- [ ] T063 [US7] E6 in the record oracle (file present ⇔ verifies against `feature.archived.sha256`; the event appears once per feature; tombstones present ⇔ the event is) and proof `D/tests/proof/archive-kill.proof.test.ts`: kill at each archive point and at the walk's last-commit points; after restart exactly one archive and one event, the live store either whole or compacted-after-verify, never neither.
- [ ] T064 [US7] Weakened archive (`broken-record.ts`: compacts before verifying): E6 / the proof names it; add to `record-weakened.test.ts`.
- [ ] T065 [P] [US7] `kiln record archive-show --archive <file> [--verify] [--kind doc|task|event|text]` in `CLI/src/record-commands.ts`; test in `CLI/tests/record-cli.test.ts`.
- [ ] T066 [US7] **Checkpoint**: green; commit; `S/baseline.md`.

---

## Phase 10: Polish, measurement and proof

**Purpose**: the numbers, the full proof, the floor matrix, the documents, the mutations.

- [ ] T067 `T/measure/record.ts` (run on demand, not in the suite): bytes per event and per full interface walk; append latency on chunked storage at 10³ / 10⁴ / 10⁵ events (against T004's figures); `foldRun` rebuild time for a **generated** 10⁵-event record (method stated: 12 gates × 30 features/week × 52 weeks plus unit/lane/command events); the archive size and the store size before/after archiving; the r14 in-process walk time with the record (budget 3 s). Write all numbers and the method to `S/baseline.md` — SC-009 asks for the report, not a threshold.
- [ ] T068 Full proof: `npm run proof` with the new `*.proof.test.ts` files (`record-kill-points`, `backbone-kill`, `factory-log-kill`, `archive-kill`, and a `record-random-kill.proof.test.ts` of 300 random kills, seed recorded); record exit code, test count and seconds.
- [ ] T069 [P] Mutation checks `S/mutations-us2.json`, `-us1`, `-us6`, `-us3`, `-us4`, `-us7` run with `T/tools/mutate.ts` on a committed tree: e.g. `appendEvent` skips validation; the chunk boundary off by one; `legacyThrough` ignored; the cursor advanced before `apply`; the reducer reading the clock; the mapping table dropping a record type; the archive compacting before `verify`; the check passing on zero walks. Each must be **caught** by a named test; record in `S/notes.md`.
- [ ] T070 Floor matrix: the default tier on Node 22.19.0, 23.6.0, 24.1.0 and the proof tier on 22.19.0; record the seconds against the budget in `S/baseline.md` (r14: 75–78 s default).
- [ ] T071 [P] Documents: `D/README.md` (the record section: chunked storage, `legacyThrough`, the backbone, the archive, key retention for archived features — r14's carried item closed), root `README.md`, the `kiln.json` responsibilities of `contracts`, `record`, `durable`, `checks` and `cli`, `D/kiln.json`; `kiln/DEPENDENCIES.md` is unchanged (a test already keeps it equal).
- [ ] T072 [P] Amend `S/spec.md`'s Assumptions to what was built (names kept, tombstones, trace null) — they were amended while planning; make the final pass — and write `S/overview.md` (the design as built, one reading page) and `S/implementation-report.md` (what exists, how far the evidence can be trusted, deviations, what went wrong, open items — including the missing old walks and the library's no-delete limit raised for the dependency record).
- [ ] T073 Run `S/quickstart.md` start to finish from a **fresh clone** of the branch (`git clone`, `cd kiln && npm ci`); record the outcome in `S/baseline.md`.
- [ ] T074 Final guardrails: `git diff main -- legacy` is empty, `legacy/` tree id equals T001's, `specs/ROADMAP.md` hash equals T001's, `npm run check` five `PASS`, no file under `kiln/` imports `legacy/`; then the code review (`/code-review` or the r14 method) before the PR.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (1)**: none. T005 must run before any source change (it needs r14's code).
- **Foundational (2)**: after Setup; blocks everything. T006–T011 parallel; T012 needs T006–T010; T013 needs T006–T009 and T005; T014 needs T012–T013; T015 needs T012, T011; T016 needs T014–T015; T017–T019 need T016; T020 last.
- **US2 (3)** after Foundational. **US1 (4)** after Foundational; benefits from US2's full catalog (T021 before T028–T029 emit new types).
- **US6 (5)** after Foundational. **US3 (6)** needs US6 (the backbone) and US2's catalog (`gate.waiting`, `lane.held`…).
- **US4 (7)** needs US3 (the reducer) and T005's fixtures untouched. **US5 (8)** needs Foundational's upcasters and US4's replays. **US7 (9)** needs Foundational, US1 (record) and benefits from US3's refs resolution.
- **Polish (10)** after the stories it measures.

### Within each story

Tests ride with the code they judge; negative suites and weakened variants land in the same phase as the behaviour they attack, so `npm run check` and the default tier are green at every commit and never because nobody tried to break them.

### Parallel opportunities

- Setup: T002, T003, T004 together (T005 first or alone).
- Foundational: T006, T007, T009, T010, T011 together; T018 and T019 together.
- US2: T021, T022, T024 together. US1: T031, T034 together. US3: T044 and T046 together. US5: T056, T057 together.
- Polish: T069, T071, T072 together.

---

## Parallel example: Foundational

```bash
# Launch together once Setup is done:
Task: "Add C/src/events/types.ts and id.ts with tests (T006)"
Task: "Add C/src/events/grammar.ts with tests (T007)"
Task: "Add the document families to D/src/store.ts (T010)"
Task: "Add D/src/record/refs.ts with tests (T011)"
```

---

## Implementation Strategy

### MVP first (User Stories 2 and 1)

1. Setup, then Foundational → the record exists and r13/r14 run on it (**T020**).
2. US2 → the shapes are enforced; US1 → every state change is recorded and ordered, proven under kills.
3. **Stop and validate**: `npm test`, `npm run proof`, `npm run check` (five `PASS`), and `kiln record verify` on a walk's store. This alone is a shippable improvement: the interim outbox is now a frozen, validated, scalable record.

### Incremental delivery

4. US6 (backbone) → US3 (factory-log byte-identical) → US4 (old walks) — the constitution's "testable as" for VII.
5. US5 (evolution) → US7 (archive) → Polish.
6. Each story adds value without breaking the earlier ones: every checkpoint re-runs the whole default tier.

### Stop conditions

- If a task needs the row to write a move record, settle a gate, poll, or edit `legacy/`, stop: the design is wrong.
- If T051 finds that fewer than two of the five walks can be captured, stop and put the decision to the human before T052–T054: the row's acceptance wording ("the old committed walks replayed") is then at stake.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] maps a task to a user story for traceability.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
- Avoid: vague tasks, same-file conflicts (`D/src/walk/walk.ts` is touched by T015, T028, T060 — sequential), and cross-story dependencies that break independence beyond those listed above.
