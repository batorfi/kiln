---

description: "Task list for gates as data, walked headless (row r14)"
---

# Tasks: Gates as data, walked headless (row r14)

**Input**: Design documents from `/specs/012-gates-as-data-walked-headless/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md); [research.md](./research.md) (R1–R17), [data-model.md](./data-model.md), [contracts/](./contracts/) (`flow-data.md`, `walk-contract.md`, `check-flow.md`), [quickstart.md](./quickstart.md)

**Tests**: **Included — they are the acceptance.** The row's own words are "walks … and survives kill-and-resume at every gate" and "refuses every invalid flow in its negative suite" (FR-040 … 043, FR-051, FR-055). The negative suite, the kill proof, the weakened walk and the permissive-check stub are the deliverable, not decoration. Within a story, tests come **first and must fail for the right reason** before the code that satisfies them.

**Organization**: by user story, in the order the *implementation* needs them. After Setup and Foundational: **US4 (the check, first — "checks before the code that needs them") → US1 (the interface walk) → US2 (applicability) → US3 (kill and resume) → US5 (where moves lead, then the feature-level move) → US6 (triage) → US7 (fix rounds) → US8 (the contract)**. US1, US2, US3 and US4 are the four P1 stories; the rest are P2/P3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1…US8 as in [spec.md](./spec.md); Setup, Foundational and Polish tasks have none
- Paths are relative to the repository root. `kiln/` is the codebase. Abbreviations: `C/` = `kiln/packages/contracts/`, `D/` = `kiln/packages/durable/`, `CLI/` = `kiln/packages/cli/`, `K/` = `kiln/checks/`. `S/` = `specs/012-gates-as-data-walked-headless/`.

## Ground rules (from the plan, r13's lessons and the constitution)

- **`v1` and every r13 test stay unchanged and green at every commit** (FR-070). A task that would edit an r13 test edits it only to add a case, never to loosen one.
- **The rules are pure and live in `contracts`; effects live in `durable`; the check imports only `contracts`.** `contracts` has no `node:` import (the boundary check says so).
- **No environment variable in product code can kill or fault a factory.** Kill points are injected `hooks`; the test-only child owner (`D/tests/proof/support/owner-main.ts`) is the only file that arms one.
- **The row never writes a move record and has no path that completes a gate.** If a task seems to need one, stop: the design is wrong.
- **No polling in product code** (constitution IX): `feature next` waits on an in-process event. Tests may retry `not-ready` with a bounded, printed backoff, as r13's do.
- **Mutation checks are done on a committed tree and undone before anything else runs**; the script asserts a clean tree after each revert. Never weaken an assertion to get a pass.
- **The negative suite lands before the data it judges is final**, so `npm run check` is green at every commit and never because nobody tried to break it.
- Every phase ends with a commit and a recorded checkpoint in `S/baseline.md` (T001 creates it; later tasks append). Nothing here edits `specs/ROADMAP.md`: closing r14 is the human's Roadmap-gate move.

---

## Phase 1: Setup (readings and the tier plumbing)

**Purpose**: record "before", list what must change in text, and give the runner its two tiers so kill tests can be placed from the start.

- [X] T001 Take the **"before"** readings and create `S/baseline.md`: Node and npm versions; `cd kiln && npm test` (exit code and the closing line `new: 474 tests · legacy: 500 tests (30 skipped)`); wall-clock seconds of `npm run test:new`; `npm run check` (three `PASS` lines); `git rev-parse HEAD:legacy` (the frozen tree id); `git diff --stat main -- specs/ROADMAP.md legacy` (empty).
- [X] T002 [P] List, in `S/baseline.md`, every place that says there are **three** checks or "the three checks" (grep `kiln/`, `README.md`, `specs/009-*` and `specs/011-*` quickstarts, `K/kiln.json`, `CLI/tests/check-boundaries.test.ts`) with its file:line, and mark which are **tests/product text to update** (T024) and which are **history to annotate, not rewrite** (r12/r13 quickstarts).
- [X] T003 Add the proof tier to the runner: in `kiln/tests/run.ts` accept `--proof` (include files named `*.proof.test.ts`; without it they are excluded) and print one line `tier: default` or `tier: proof (N proof files)` before the suite; add `"proof": "node tests/run.ts --new-only --proof"` to `kiln/package.json`. Test in `kiln/tests/run-tier.test.ts` (new file): without `--proof` a `*.proof.test.ts` fixture is not run and the line says `default`; with it the file runs and the line says `proof`; a run that executed nothing still fails (r12's rule). Existing `run.ts` tests unchanged.

**Checkpoint**: baseline recorded, update list made, tiers exist. Commit.

---

## Phase 2: Foundational (flow data and engine core, the gate's extended shape, the kill-point list)

**Purpose**: the data and pure functions every story reads, and the additive shape changes to r13's gate, each with r13's whole suite still green.

**⚠️ CRITICAL**: no user story starts until this phase is complete.

### Flow data and the pure core (contracts/flow-data.md)

- [X] T004 [P] Extend `C/src/flow/types.ts` per data-model §1–§2: `Target`, `MoveRule`, and on `GateDefinition` the optional `origin`, `after`, `rules`, `triage`, `armsTail`, `delegable`, `restorePoint`; on `FlowDefinition` the optional `noTriageSkip`; plus `AdmissionFacts`, `BuiltFacts`, `Reason`, `Applicability`, `Fault`. All new fields optional; no `node:` import.
- [X] T005 Fill the new fields in `C/src/flow/v2.ts` exactly as `contracts/flow-data.md` §2 tabulates (rules per kind with `note`, `leads`, `targets`; `triage: "skippable"` on Concept and Architecture only; `armsTail` on Specification only; `delegable` per gate; `restorePoint` on Implementation). `C/src/flow/v1.ts` stays **byte-identical**.
- [X] T006 [P] Write `C/src/flow/glob.ts` (the dialect of `contracts/flow-data.md` §3: `**`, `*`, `?`, literals, `/` separators, case-sensitive; unsupported metacharacters reported, not guessed) and `C/tests/glob.test.ts` with a golden case for **every** pattern in `ui-flow.md` §4.1/§5.1 (`web/**`, `app/**`, `**/*.tsx`, `**/*.vue`, `**/*.css`, `design/**`) matching and not matching, `**` matching zero segments, and a pattern with `{a,b}` or `!` refused by name.
- [X] T007 [P] Write `C/src/flow/applies.ts`: `applicability(gate, facts, required)` and `atUiSlot(pinned, built)` per data-model §2 and research R7 (OR across predicates, absent = false with `absent` in the reason, `required` wins, `became-applicable` only from the slot, never the reverse); `Reason` is built from the rule and three-valued facts so the same inputs give the same canonical bytes. (Its tests are T041 in US2.)
- [X] T008 Write `C/src/flow/engine.ts` (core, no consequences yet): `order`, `rule`, `noteRequired`, `next(flow, state)` (skips pinned not-applicable and triage-skipped gates), `targetsOf(flow, gate, state)`, `triage(flow, proposal, keep)`, `cap(flow, requested)`; and `C/tests/engine.test.ts`: order equals the constitution's twelve; `next` over a pinned plain feature goes `…2-architecture → 3-spec`; `targetsOf` never offers a later, not-applicable or skipped gate, offers `@build` only from Verification-side gates and `roadmap` only at Concept and Merge; `triage` allows only Concept and Architecture and refuses Documentation and a flow with `noTriageSkip`; `cap` accepts 0–3 and refuses 4 and −1; **changing a vocabulary in a copy of the data changes `rule`/`next`'s answer with no other change** (SC-009).
- [X] T009 Re-export the new modules from `C/src/flow/index.ts`; run `cd kiln && npm test -- packages/contracts` — **r12's contract tests green unchanged** (`flow-vs-constitution`, `gate-rail`, `strongest-model`) and the new ones pass. Record counts in `S/baseline.md`.

### The gate's extended shape (contracts/walk-contract.md §3; research R5)

- [X] T010 Extend `D/src/types.ts` additively: `Admit`, `Move.{note,target,admit}`, `GateSpec.{returnsTo,walk}`, `GateDocument.{noteRequired,returnsTo}`, `GateState` gains `{state:"withdrawn"; key; by}`, `FeatureMove`, `FeatureMoveRecord`, `FeatureOutcome`, and the new `OutboxType` members of data-model §6. Nothing imports or names the library. `D/tests/seam.test.ts`'s public-types scan stays green.
- [X] T011 Add `"kiln.walk"` to `DOC_NAMES`/`DocName` in `D/src/store.ts` (the family list in `D/src/library/docs.ts` is generated from it) and write `D/tests/walk/store-compat.test.ts`: a store created by r13's code path (a gate opened and settled, no `kiln.walk`) opens under the new owner, resumes, and `inspectStore` reads it; a `kiln.walk` document can be created and read back by a fresh reader.
- [X] T012 Extend `D/src/gate/open.ts` so the opening commit stores `noteRequired` (from `noteRequired(flow, gateKey)`) and `returnsTo` (from the spec, default `[]`) in the gate document, beside `vocabulary`; a gate opened without `walk` is byte-for-byte r13's behaviour (the `walk` binding itself is T032).
- [X] T013 Extend `D/src/gate/move.ts` per walk-contract §3: validation order key → shape → decider → brief → vocabulary → **note** → **target** → **admit** → race; refusals are `invalid-move` with exactly the details the contract lists (`a corrective move needs a note`, `a target belongs to a reject`, `"<t>" is not a place this gate can send work (allowed: …)`, `admit belongs to the Roadmap gate's approve`, `fixRounds must be 0, 1, 2 or 3`, `"mitigate" is not a move a person can make`); `sameMove` compares `kind, decidedBy, briefRef, note, target, admit`; the record stores them. Write `D/tests/walk/gate-extensions.test.ts`: every refusal by name with nothing written; a changed note under the same key is `key-conflict`; an equal move with note and target is `repeat`; **`Move` has no delegation field** and the Roadmap task's input accepts none (assert the type's keys and `checkRoadmap`); `admit.require` is validated too: an entry that is not a conditional gate of the flow (unknown key, `gate0`, any built-in without `appliesWhen`) is refused `invalid-move` by name; `admit.overrideTriage` must be a boolean. r13's `outcomes.test.ts`, `open-outcomes.test.ts`, `exactly-once.test.ts` pass **unchanged**.
- [X] T014 [P] Extend `CLI/src/gate-commands.ts` and `CLI/src/gate-usage.ts`: `kiln gate move` accepts `--note <text>`, `--target <gate|@build|roadmap>` and `--admit <file.json>` (read and passed as given; the owner judges it); usage text updated; `CLI/tests/gate-move-flags.test.ts` (new): a missing flag value is usage exit 2, a malformed admit file is usage exit 2, a well-formed call reaches the owner and a refusal exits 0 with the JSON line.
- [X] T015 Prepare the kill-point lists **without declaring unused names**: change `GATE_KILL_POINTS`'s filter in `D/src/hooks.ts` to exclude `^(unit|lane|walk)\.` and add `WALK_KILL_POINTS = KILL_POINTS.filter((p) => p.startsWith("walk."))` (empty until T033); extend `D/tests/kill-points-declared.test.ts` only to assert `WALK_KILL_POINTS` has no duplicates. **No name is added here**: r13's test requires the declared set to equal the set the source uses, so each name is declared by the task that first fires it — T033 (eleven), T069 (three withdraw), T077 (two fix-round).
- [X] T016 Run r13's **whole** suite and the real checks: `cd kiln && npm test && npm run check` — r13's 474 tests all green, `legacy` 500 (30 skipped), three `PASS`. Record in `S/baseline.md`.

**Checkpoint**: flow data and pure core exist; the gate's shape is extended and r13 is unchanged. Commit.

---

## Phase 3: User Story 4 — `kiln check flow` refuses every invalid flow (Priority: P1) 🎯 first

**Goal**: the check, its stable codes, its negative suite, and the proof that the suite can fail.
**Independent Test**: `kiln check flow` passes on the shipped flow (12 gates examined); every negative member is refused with its code; the accept-everything stub fails the suite; two-fault members report both.

### Tests for User Story 4 (write first; they fail until T019–T020)

- [X] T017 [P] [US4] Write `K/tests/flow-negative.ts`: the `NEGATIVE` table of `contracts/check-flow.md` §3 — **at least one member per code** (`flow-anchor-first`, `-anchor-last`, `-after-merge`, `-builtin-missing`, `-builtin-order`, `-gate-duplicate`, `-conditional-placement`, `-conditional-unexpected`, `-glob-unsupported`, `-role-unknown`, `-judge-not-judge`, `-move-kind-unknown`, `-move-wrong-scope`, `-mitigate-person-move`, `-rule-missing`, `-note-not-required`, `-returns-to-invalid` (forward target, self target, roadmap at a gate that may not, `@build` before the restore point), `-restart-no-restore-point`, `-mitigate-cap-invalid`, `-mitigate-no-cap`, `-triage-forbidden` (Documentation skippable), `-arming-point` (none, wrong gate, two gates), `-arming-roadmap`, `-arming-added-gate`, `-delegable-invalid`, `-cycle` (two added gates whose `after` point at each other), `-vacuous`, `-version`) each a `mutate(def)` over a **deep copy** of `flowOf("v2")`; plus the two multi-fault members; plus `runNegativeSuite(check)` returning `{accepted, wrongCode, missed}`.
- [X] T018 [P] [US4] Write `K/tests/flow-check.test.ts` asserting, each by name: the shipped flow passes with the note `12 gates examined`; `accepted`, `wrongCode`, `missed` are all empty; for each member the **repaired** flow passes again (so the failure is the fault's); two-fault members report **both** codes; a flow with no gates fails `flow-vacuous`; **a stub check that accepts everything makes the suite fail with every member in `accepted`**; a check that always fails with one fixed code makes the suite fail `wrongCode`; `checkFlow({flow: flowOf("v1")})` is refused by name (the check is for the default flow).

### Implementation for User Story 4

- [X] T019 [US4] Write `C/src/flow/validate.ts`: `validateFlow(def): Fault[]` implementing every rule and code of `contracts/check-flow.md` §2 (collect all faults, never stop at the first), including the placement-graph cycle walk over `after` references and the glob-dialect check using T006; `C/tests/validate.test.ts` (new) proves the shipped v2 returns `[]` and each single-field mutation returns exactly its code.
- [X] T020 [US4] Write `K/flow.ts` (`checkFlow({flow?})`: maps faults to `{code, file, detail}`, `scanned` = the data files read, a note `N gates examined`, zero gates → `flow-vacuous`) and register it: `K/index.ts` `CheckName` gains `"flow"`, `CHECK_NAMES = ["network","boundaries","legacy","flow"]`, `registry.flow`; `K/kiln.json` responsibility text names four checks; `CLI/src/main.ts` needs no new branch (names come from `CHECK_NAMES`).
- [X] T021 [US4] Write `CLI/tests/check-flow-cli.test.ts`: `kiln check flow` exits 0 and prints a `PASS flow` line with the note `12 gates examined`, in under 100 ms; `kiln check` prints **four** `PASS` lines; a scratch copy of the tree with `9-pr` removed from `v2.ts` exits 1 and prints `flow-anchor-last` and `flow-builtin-missing`; `--json` carries the failures; an unknown name is refused as before.
- [X] T022 [US4] Run the negative suite and the real tree: `cd kiln && npm test -- checks/tests/flow-check.test.ts packages/contracts && npm run check` — fix `validate.ts`/the table (never the assertions) until all pass; **four** `PASS`. Record in `S/baseline.md`.
- [X] T023 [US4] Mutation checks on a **committed** tree, recorded in `S/notes.md` with the revert asserted clean: (a) delete one rule from `validate.ts` → the suite names that code in `missed`; (b) make `checkFlow` return `ok` for an empty fault list regardless → `flow-vacuous` member fails; (c) point the glob check at a permissive regexp → `flow-glob-unsupported` member fails.
- [X] T024 [US4] Apply the text updates listed by T002 that are **tests or product text** (`CLI/tests/check-boundaries.test.ts` title/expectation "all four checks", `kiln/README.md`, package `kiln.json` text); **annotate** (not rewrite) the r12/r13 quickstarts with a one-line "four since r14" note. `npm test` and `npm run check` green.

**Checkpoint**: `kiln check flow` is real and shown able to fail; `npm run check` = four `PASS`; r13 unchanged. Commit.

---

## Phase 4: User Story 1 — a feature walks every gate of the flow, from data, from the CLI (Priority: P1) 🎯 MVP

**Goal**: admit an interface feature and walk the Roadmap gate plus all eleven feature gates with approvals only, the owner opening each next gate from the flow data, driven only through the CLI.
**Independent Test**: `drive.ts` against a real owner process settles 12 gates in the flow's order, each by exactly one move; an out-of-vocabulary move is refused; two clean stores give identical walks.

### Tests for User Story 1 (write first)

- [X] T025 [P] [US1] Write `D/tests/walk/input.test.ts`: `WalkInput` validation by name — unknown field; `flow` other than `"v2"` (`"v1"` refused: FR-052); empty feature; `triage.skip` with empty `reasoning`; an unknown key in `script.sameContent`; `verifier` entries other than `pass|fail`; `script` and `walk` both given or neither on `kiln.row`; and that `tasks.create` refuses with nothing written.
- [X] T026 [P] [US1] Write `D/tests/walk/state.test.ts`: the pure reducers of `walk/state.ts` — from a pinned all-applicable state `next` yields the eleven feature gates in order; `approve` advances the cursor and records one `settled` outcome per gate; round numbering starts at 1; `artifactRev` is deterministic; no reducer reads a clock.
- [X] T027 [P] [US1] Write `D/tests/walk/walk-inprocess.test.ts` (in-process owner via `openFactory`): admit an interface feature through `tasks.create`; read the open gate via the feature-state reader; submit `approve` with `script:r14` as decider at each; after 12 gates the row's outcome is `completed {outcome:"merged"}`, `kiln.walk.status === "done"`, nothing is open, the outbox holds one `gate.opened`, one `move.committed` and one `gate.settled` per gate, and `walk.admitted` first, `walk.completed` last; a second walk of the same input on a second store has an identical outcome list; the 12-gate in-process walk takes under 3 s with `stepMs: 0`.
- [X] T028 [US1] Write `CLI/tests/feature-cli.test.ts` (real owner child process through the CLI): `feature admit` keyed → `created`, same key again → `repeat`, same key with another walk → `key-conflict`; `feature next` returns the admission gate; `gate move` with the wrong `--kind` for the gate is `invalid-move`; the walk is driven to `done` by `tests/walk/drive.ts` (T039).

### Implementation for User Story 1

- [X] T029 [P] [US1] Write `D/src/walk/input.ts`: `checkWalk(v)` (pure, by-name messages of T025) and the `WalkInput` type; extend `D/src/tasks/validate.ts` `checkRow` to accept exactly one of `script` / `walk`; creating a walk **first runs `validateFlow(flowOf("v2"))` and refuses by the fault's code if it returns any** (FR-054), tested in `input.test.ts` with a patched flow.
- [X] T030 [P] [US1] Write `D/src/walk/state.ts`: `WalkCheckpoint`, `WalkState`, `Outcome` (data-model §3.2) and the pure reducers — `start`, `pin` (using `applicability`/`triage`/`cap` from `contracts`; the full pin behaviour is exercised in US2/US6), `advance`, `record`, `artifactRev`. No I/O, no clock.
- [X] T031 [P] [US1] Write `D/src/walk/doc.ts`: the `kiln.walk` document type (`WalkDoc`, data-model §3.3) and the in-transaction helpers (`readWalk`, `setStatus`, `setOpenGate`) used by the row and the opening commit.
- [X] T032 [US1] Extend `D/src/gate/open.ts` for `GateSpec.walk`: in the **same** opening commit, read `kiln.walk/<feature>`, set `openGateId = gateId`, and refuse (internal `feature-moved`, surfaced as `stale`) while a move is `pending`; a gate with no `walk` is unchanged. Test in `D/tests/walk/gate-extensions.test.ts`: opening binds `openGateId` atomically (kill at `open.after-write` leaves both or neither); a pending move refuses the opening and leaves no gate.
- [X] T033 [US1] Extend `D/src/tasks/row.ts` with the `walk` form (the whole state in the checkpoint; the r13 `script` form untouched and still tested): phases `admit → admission → pin → work → open → decide → consume` per walk-contract §2, `hooks.at` calls at the named points and the eleven points **declared in `KILL_POINTS` in this task** (`walk.admit-opened`, `walk.admission-read`, `walk.pin-begin`, `walk.pin-after-write`, `walk.pin-committed`, `walk.unit-created`, `walk.gate-opening`, `walk.gate-opened`, `walk.settled-read`, `walk.consume-after-write`, `walk.consume-committed`), all walk units created **single-step** (`steps: 1`), the `pin` phase body pinning every gate applicable (US2 replaces it with evaluation), units created through keyed `tasks.create`-equivalent commits `walk:<f>:unit:<gate>:<round>:<role>` (author; **judge as a distinct unit** for gates with a `judge`), gates opened through `openGate` with key `walk:<f>:open:<gate>:<round>`; `decide` ends **only** because the gate task ended; `consume` reads the **stored** move record and applies `approve` (the other kinds are US5). Add `D/src/walk/walk.ts` for the phase bodies so `row.ts` stays a dispatcher.
- [X] T034 [US1] Write `D/src/walk/brief.ts`: the brief of walk-contract §4 (`kind, feature, gate, round, instruction, recross, triage, applicability, fix`), pure; the admission brief carries the per-interface-gate proposal. Unit test in `D/tests/walk/state.test.ts`.
- [X] T035 [US1] Write `D/src/walk/watch.ts` (an in-process notifier keyed by feature, signalled by the open commit and by the walk's end) and wire `feature.state` with `after` into `D/src/factory.ts` `Factory.walks` (`admit`, `state`, `next`): the reply is derived from the store, a waiting request holds **no timer** and ends with a connection loss if the owner stops. Test `D/tests/walk/watch.test.ts`: a request with `after = current` waits and resolves when the next gate opens; with `after` stale it resolves immediately; the inspection of the owner shows no timer; closing the owner ends the wait.
- [X] T036 [US1] Extend the channel: `D/src/channel/protocol.ts` (`feature.admit`, `feature.state`, ops list and `parseRequest`), `server.ts`, `client.ts`; the protocol stays one JSON line each way; refusals are results. Update `CLI/tests/channel.test.ts`'s op-list expectation by **adding** the new ops.
- [X] T037 [US1] Write `CLI/src/feature-commands.ts` (`admit`, `next`, `state`; one JSON line out; exit codes 0/2/3/4 as r13) and wire `kiln feature …` in `CLI/src/main.ts` (loaded on demand like `gate`); extend `CLI/src/gate-usage.ts` with the feature lines of `contracts/check-flow.md` §4.
- [X] T038 [P] [US1] Create the fixtures `kiln/fixtures/walk-interface.json` (`{feature:"f-ui", flow:"v2", facts:{paths:["web/app.tsx"], labels:["ui"], journeys:["J1.3"]}, built:{ui_files_changed:true}}`) and `kiln/fixtures/walk-interface.approve-all.json` (the driver script: `{"gate0": {"kind":"approve","admit":{}}, "*": {"kind":"approve"}}`).
- [X] T039 [P] [US1] Write `kiln/tests/walk/drive.ts`, the scripted CLI driver of `contracts/check-flow.md` §5: `admit` → loop `next --after <last>` → choose the move from the script → `gate move` (with `--brief-ref` from `next`) until the walk ends, printing every JSON line; `--by script:r14`; exits non-zero on any unexpected refusal.
- [X] T040 [US1] Run the interface walk through the CLI (quickstart §2): 12 gates, the flow's order, one move each, final state `done`, nothing after Merge; a `reject` at Implementation refused `invalid-move`; two clean stores give identical outcome lists. Record in `S/baseline.md`. Also run r13's whole suite again — unchanged.

**Checkpoint**: US1 works end to end through the CLI with approvals only; r13 green. Commit.

---

## Phase 5: User Story 2 — a non-interface feature walks nine; two are recorded "not applicable" (Priority: P1)

**Goal**: applicability pinned once at admission, recorded once with a reproducible reason; required gates; UI review's slot turning on; nothing ever reversing.
**Independent Test**: the plain walk settles 10 gates and records two `not-applicable` with reasons; the same facts give the same bytes; `--admit require` gives 11; a move on a not-applicable gate is refused.

### Tests for User Story 2 (write first)

- [X] T041 [P] [US2] Write `C/tests/applies.test.ts`: golden **bytes** of `Reason` for (paths match / no match / absent), (labels), (journeys any / none), OR combination, `required` over a false rule, `became-applicable` at the UI slot only when pinned not-applicable and not required and a diff predicate is true, never produced for an applicable gate, never produced for Experience design; evaluating twice gives identical canonical JSON; no clock or model is reachable (assert the module's imports).
- [X] T042 [P] [US2] Write `D/tests/walk/applicability.test.ts` (in-process): the plain walk has 10 gates and the outbox holds exactly one `gate.not-applicable` for each of `2a-experience` and `6a-ui-review`, each in the **same commit** as the pin (kill-injection at `walk.pin-after-write` leaves both or neither); a `submitMove` on a not-applicable gate id is `unknown-gate`; `admit.require:["2a-experience"]` gives 11 gates and `why:"required"`; a required gate cannot be un-required later; a plain feature whose `built.ui_files_changed` is true gets `gate.became-applicable` at UI review's slot and opens it; an applicable gate is never recorded not applicable whatever `built` says; Experience design never changes after admission; missing facts read as false with `absent` in the reason.

### Implementation for User Story 2

- [X] T043 [US2] Replace T033's all-applicable pin in `D/src/walk/walk.ts` with evaluation: read the stored admission record, take `admit.require`, evaluate both interface gates with `applicability`, then **one `run.commit`** writing `walk.admitted`, one `gate.not-applicable` per false gate (actor `factory`, cause `walk:<f>:pin`, data = the `Reason`), `kiln.walk.status = "active"` and the pinned state into the checkpoint; hooks `walk.pin-begin`, `walk.pin-after-write`, `walk.pin-committed`.
- [X] T044 [US2] Implement UI review's slot in the `work` phase: before opening `6a-ui-review`, if pinned not-applicable and not required, call `atUiSlot(pinned, built)`; on `became-applicable` write `gate.became-applicable` in the same commit as the checkpoint change, then open it; otherwise move on.
- [X] T045 [P] [US2] Create `kiln/fixtures/walk-plain.json` (facts that touch nothing in the interface: `paths:["src/lib/a.ts"]`, `labels:[]`, `journeys:[]`) and `walk-plain.approve-all.json`, plus `walk-plain-required.admit.json` (`{"require":["2a-experience"]}`) used with the driver's per-gate script.
- [X] T046 [US2] Extend `CLI/tests/feature-cli.test.ts`: the plain walk through the CLI shows 10 gates and `reason.text` naming the rule and the facts for both not-applicable gates (`feature state` history); `gate move` on `gate:f-plain:2a-experience:1` is `unknown-gate`; the required variant shows 11 and `why:"required"`.
- [ ] T047 [US2] Replay test in `D/tests/walk/applicability.test.ts`: evaluate, kill the owner after the pin commit, restart, finish — the `Reason` bytes in the outbox are identical to the uninterrupted run and appear **once**.

**Checkpoint**: US1 and US2 pass together; the two acceptance walks are 12 and 10 gates. Commit.

---

## Phase 6: User Story 3 — a walk survives a kill at every gate (Priority: P1)

**Goal**: both walks killed at every named step of every transition, restarted, finished equal to the uninterrupted walk, with nothing settled by a restart; and the proof shown able to fail.
**Independent Test**: for each declared `walk.*` point the killed-and-resumed walk's outcome list equals the uninterrupted walk's under a fresh-reader oracle; the weakened walk is caught by name.

### Tests and harness for User Story 3

- [ ] T048 [US3] Extend `D/src/inspect.ts` `Inspection` with the walk's view (the feature's `kiln.walk` document, the walk's task state, the ordered outcome list derived from outbox + document) and write the oracle additions in `D/tests/proof/support/oracle.ts`: **W1** (outcomes in order = the flow's order over pinned applicable gates plus re-crossings; no round has two `settled`), **W2** (each `not-applicable`/`skipped`/`became-applicable` exactly once, reason equal to the engine's recomputation), **W3** (no outcome's decider is a clock, a restart or the owner), **W4** (automatic rounds ≤ pinned cap, each `mitigate` by `factory`, none coincident with a `settled`), and `walkOutcomes(inspection)`; unit tests in `D/tests/oracle.test.ts` (extended) feeding hand-made inspections that violate each.
- [ ] T049 [US3] Extend the test-only child owner `D/tests/proof/support/owner-main.ts` and `D/tests/proof/support/harness.ts` with a walk mode (open the factory, serve the channel, optionally admit a feature from a fixture, arm `killAt`/`killNth`) and write `D/tests/proof/support/walk-harness.ts`: start an owner, drive it through the **CLI client** (not the store) with a move script, kill, restart on the same store, continue, and return the final `Inspection` plus the list of points that fired.
- [ ] T050 [US3] Add to the walk proof the guard that **every name in `WALK_KILL_POINTS` fired at least once** (fails by name on one that never did) and confirm `D/tests/kill-points-declared.test.ts` passes with the walk, withdraw and fix-round names declared by T033, T069 and T077 (the `hooks.at` calls themselves are placed by those tasks, not here).
- [ ] T051 [US3] Write `D/tests/proof/walk-kill-points.proof.test.ts` (**proof tier**): for every walk point that fires on the interface walk, kill there once, restart, finish; assert walk equality, the full oracle (I1–I9, W1–W4) clean, `owner.reports` empty, no gate settled by the restart, and the guard of T050.
- [ ] T052 [US3] Write `D/tests/proof/walk-smoke.test.ts` (**default tier**): four kills on the interface walk, one per phase group — `walk.pin-after-write`, `walk.gate-opening`, `walk.settled-read`, `walk.consume-after-write` — each restarted and finished; assert walk equality and the oracle (I1–I9, W1–W4) clean each time.
- [ ] T053 [US3] Write `D/tests/proof/walk-every-gate.proof.test.ts` (**proof tier**): for **both** walks (12 and 10 gates) kill at `walk.settled-read` and at `walk.gate-opening` once per gate (n = 1 … gates) — "every gate" at the two most dangerous points — and assert walk equality and the oracle each time.
- [ ] T054 [P] [US3] Write `D/tests/proof/walk-kill-matrix.proof.test.ts` (**proof tier**): every walk point × every gate × both walks; and `D/tests/proof/walk-random-kill.proof.test.ts` (**proof tier**): 300 random (point, n) kills on randomly chosen walk, as `random-kill.test.ts` does for the gate. The runner's tier line says `proof` when they run.
- [ ] T055 [P] [US3] Write `D/tests/proof/walk-storm.test.ts` (**default tier**, one gate, 7 kills; it joins the proof tier if T058 shows under 15 s of margin): a walk gate killed and restarted 7 times in a row with no move stays `waiting`, the walk has advanced nowhere, `reports` is empty, and the next valid move commits (r13's storm on a walk gate).
- [ ] T056 [P] [US3] Write `D/tests/proof/walk-clock.test.ts`: clock jumped ±10 years and a long real wait on a walk gate settle nothing; the inspection finds **no timer** on any gate, decision or walk task; `feature next` waiting holds no timer.
- [ ] T057 [US3] Write `D/tests/proof/support/broken-walk.ts` — a deliberately weakened row whose `decide` treats a restart as approval (settles by writing the next gate open without a move record) — and `D/tests/proof/walk-negative.test.ts`: the proof **fails by name** (W1/I2/W3) on it, and passes on the real walk with the same script (**default tier**, one kill); a run of the proof that executed no kill fails (never vacuous).
- [ ] T058 [US3] **Verify** the tier split (it was decided in research R16, not left to be discovered): run `npm run test:new` and record the default-tier wall-clock on the installed Node in `S/baseline.md`; it must stay under r13's **180 s** with **at least 15 s of margin**. If it does not, move the offender to the proof tier (rename to `.proof.test.ts`) and say so in the runner's tier line — never cut a case. Run `npm run proof` once and record the time, the point/gate counts and the random-kill seed(s): that recorded run is the evidence for SC-003.

**Checkpoint**: US3 passes — the smoke at the default tier, the full matrix at the proof tier (run once and recorded); the weakened walk is caught. Commit.

---

## Phase 7: User Story 5 — moves lead where they were decided to lead; work that goes back is re-crossed (Priority: P2)

**Goal**: revise · reject (same gate, earlier gate, roadmap) · restart · split+revise carried out from the data, with notes as instructions and every later gate re-crossed; then the feature-level reject at any time.
**Independent Test**: each row of `contracts/flow-data.md` §1.1 taken through the CLI at least once; a feature-level reject withdraws an open gate in one commit and records `pending` when none is open.

### 5a — where moves lead (tests first)

- [ ] T059 [P] [US5] Write `C/tests/consequences.test.ts`: the consequence table of `contracts/flow-data.md` §1.1 as **a test parsed from `docs/concepts/the-flow.md` §7** (rows `approve · revise · reject · revise (Code review) · reject to earlier · restart · split+revise`) and from the rule data; every (gate, kind) pair the data offers returns a consequence; a pair it does not offer throws by name; `recross` lists only pinned-applicable, non-skipped gates after the target.
- [ ] T060 [P] [US5] Write `D/tests/walk/moves.test.ts` (in-process walks): `revise` without a note → `invalid-move`; with a note → same gate round 2 and the note in the **next brief's `instruction`** and as the next step's unit input; `reject` no target at Work plan → Work plan round 2 (fresh author), nothing re-crossed; `reject --target 3-spec` at Work plan → Specification round 2, then Work plan, Implementation, Code review, … re-open one after another, each brief with `recross.changedSince`, `approved` for gates ≥ target cleared, earlier approvals kept; `reject --target roadmap` at Concept and at Merge → walk `left-lane`, task completes, `walk.left-lane`; the same at Work plan → `invalid-move`; Verification `reject` with no target → rework unit then Code review re-crossed (`@build`); `restart` at Code review → rebuild unit then Code review round 2; `restart` at UI review → rebuild then **Code review and UI review** re-crossed; `split+revise` at Implementation → `walk.split` with the remainder, Work plan re-opens, nothing edits `ROADMAP.md`; a re-crossed gate whose upstream revs equal its last-approved vector says "nothing this gate judges changed" (via `script.sameContent`); an interface gate recorded not applicable is not re-crossed and is never a refusal target's answer; a target that is not applicable is refused naming the nearest applicable earlier gate; `edit-rows` sent to Implementation and `split+revise` sent to the Roadmap gate are `invalid-move` and nothing is written (FR-007); at the **admission crossing** `revise` and `edit-rows`/`add-row`/`drop-row` open admission round 2 carrying the note, and `reject` ends the walk `not-admitted` (`walk.not-admitted`, row completes, no feature gate opened) — FR-027.

### 5a — implementation

- [ ] T061 [US5] Add `consequence(flow, gate, kind, target, state)` to `C/src/flow/engine.ts` (flow-data §1.1) and re-export it.
- [ ] T062 [US5] Complete `consume` in `D/src/walk/walk.ts` for every settled kind: compute the consequence, update `rounds`, clear `approved` for re-crossed gates, set `instruction` from the note, record `walk.returned` / `walk.split` / `walk.left-lane` in the same commit as the checkpoint (actor = the decider, cause = the move key), and route to `work` (author · workers · rebuild units) or end the task; at gate0 the four outcomes of FR-027 (`approve` → pin, `revise`/row edits → admission round + 1, `reject` → `not-admitted`, `kiln.walk.status` set accordingly); hook `walk.consume-after-write`/`-committed`.
- [ ] T063 [US5] Finish artifact revisions and `changedSince` in `D/src/walk/state.ts` and `D/src/walk/brief.ts` (research R9): `artifactRev` from `(gateKey, contentLabel, upstream revs, note)`, the vector recorded at approval, `recross.changedSince` and `unchanged`; `script.sameContent` makes a fresh author's content label identical.
- [ ] T064 [US5] Extend `CLI/tests/feature-cli.test.ts` so the CLI (`gate move --kind revise --note …`, `--kind reject --target …`, `--kind restart --note …`, `--kind split+revise --note …`) walks each row of the consequence table once and the final states are as `moves.test.ts` expects.
- [ ] T065 [US5] Add the script `kiln/fixtures/walk-interface.reject-recross.json` (approve to Code review, then `reject --target 3-spec`, then approve to Merge) and kill the owner at `walk.consume-after-write`, `walk.consume-committed`, `walk.gate-opening` and `walk.settled-read` for each re-opened gate: in `D/tests/proof/walk-smoke.test.ts` one kill per point (default tier) and the full cross in `walk-kill-matrix.proof.test.ts` (T054); assert walk equality with the uninterrupted re-crossing walk, the oracle (I1–I9, W1–W4) clean, and that no re-crossed gate is carried forward as approved (FR-051, SC-006).

### 5b — the feature-level move (tests first)

- [ ] T066 [P] [US5] Write `D/tests/walk/feature-move.test.ts` (in-process): a feature-level `reject` while Verification is open → the gate is `withdrawn` (state `withdrawn`, no move record, `gate.withdrawn` + `move.committed` in the same commit, the decision task terminal `{withdrawn:true}`), Architecture opens round 2, gates ≥ Architecture re-crossed; the same while a scripted step runs → `effect:"recorded"`, `pending` set, the **next open refuses** while pending, the row consumes it at the next wake and ignores the finished step's result; same key + equal move → `repeat`; same key + other move → `key-conflict`; another feature move while one is pending → `lost-race` naming the first key; after the walk is `done` or `left-lane` → `stale`; blank note, unknown target, non-reject kind → `invalid-move`; `submitMove` on a withdrawn gate → `stale` naming the feature move's key; a gate move that is committing wins over a feature move (judged against the stored record).
- [ ] T067 [P] [US5] Write `D/tests/proof/walk-withdraw.test.ts`: kill the owner at `walk.withdraw-received`, `walk.withdraw-after-write` and `walk.withdraw-committed` while a gate is open; after restart the gate is **either** waiting with no feature move recorded **or** withdrawn with exactly one record — never between; the oracle's **I10** is clean; a caller who did not get the answer retries the same key safely. And a two-process race: a gate move against a feature move ×100 — exactly one wins, the loser is refused naming it.

### 5b — implementation

- [ ] T068 [US5] Extend the gate for withdrawal: `D/src/gate/slots.ts` (`SlotRequest` gains `{kind:"withdraw", key, feature}`), `D/src/gate/tasks.ts` (the decision step's single commit for a withdraw: record + `kiln.move` withdrawal field + `gate.withdrawn` + `move.committed` + terminal `{withdrawn:true}`; a branch that **cannot** run for a move), `D/src/gate/state.ts` (`withdrawn`), `D/src/gate/move.ts` (`stale` naming the winner on a withdrawn gate), `D/src/inspect.ts` and the oracle (**I10**; I1–I3 learn the third end) with oracle unit tests feeding violating inspections.
- [ ] T069 [US5] Add the three withdraw kill points (`walk.withdraw-received`, `-after-write`, `-committed`) to `KILL_POINTS`/`WALK_KILL_POINTS` and fire them in the withdraw path; `kill-points-declared.test.ts` passes.
- [ ] T070 [US5] Write `D/src/walk/moves.ts` (`FeatureMoveApi.submit`, walk-contract §6: validation order, `targetsOf` against the walk state, delivery to the open gate's slot or the ledger command for `pending`) and wire it as `Factory.walks.move`; `consume` handles `withdrawn` and `pending` (record consumed, `pending` cleared in the same commit).
- [ ] T071 [US5] Add the `feature.move` channel op (`protocol.ts`, `server.ts`, `client.ts`) and `kiln feature move` in `CLI/src/feature-commands.ts` (always `reject`; `--target`, `--note`, `--by`, `--key` required); extend `CLI/tests/feature-cli.test.ts` with a feature-level reject through the CLI.
- [ ] T072 [US5] Mutation check, committed tree, in `S/notes.md`: make the withdraw path also write a move record → I10 and I2 fail by name; make `submitMove` accept a move on a withdrawn gate → `feature-move.test.ts` fails; revert, tree clean.

**Checkpoint**: US5 passes; r13's gate proof re-run **unchanged** is green; the walk proof still green. Commit.

---

## Phase 8: User Story 6 — triage skips Concept and Architecture, and nothing else (Priority: P2)

**Goal**: a proposal, an override, bounded skipping, and a distinct "skipped" outcome shown in every later brief.
**Independent Test**: a small plain walk has 7 feature gates, a small interface walk 9; any other skip is refused; `overrideTriage:true` opens Concept and Architecture.

- [ ] T073 [P] [US6] Write `D/tests/walk/triage.test.ts`: a small plain feature with `triage.skip` → Concept and Architecture recorded `skipped` (outbox `gate.skipped`, reasoning, **not** `not-applicable`) and the walk begins at Specification — 7 gates + the Roadmap gate; a small interface feature still opens Experience design and UI review (9); every later brief carries `triage`; `admit.overrideTriage:true` opens Concept and Architecture as normal; the engine's `triage()` refuses Documentation, Work plan or any judged gate after Architecture (`C/tests/engine.test.ts` case); a flow with `noTriageSkip` refuses (data case); triage cannot make an applicable gate not applicable (asserted on the pinned state).
- [ ] T074 [US6] Implement triage in the `pin` phase (`D/src/walk/walk.ts`): proposal from `WalkInput.triage` shown in the admission brief, `admit.overrideTriage` override, `gate.skipped` entries in the pin commit, `next()` skipping them; `kiln check flow`'s `flow-triage-forbidden` already covers the data side (US4).
- [ ] T075 [US6] Add the CLI case to `CLI/tests/feature-cli.test.ts` (`fixtures/walk-small-plain.json`, `walk-small-interface.json`, create them): 7 and 9 gates through the CLI.

**Checkpoint**: US6 passes. Commit.

---

## Phase 9: User Story 7 — Verification fixes itself a bounded number of times (Priority: P2)

**Goal**: automatic rounds as `mitigate` by the factory, bounded by the pinned cap, never a settlement, exactly once across kills.
**Independent Test**: for each cap in {0,1,2,3} and verdicts below/at/above the cap, rounds = min(cap, failures) and the gate opens for a person after them.

- [ ] T076 [P] [US7] Write `D/tests/walk/fix-rounds.test.ts`: cap 0 → gate opens at once; caps 1/2/3 × verdicts `fail,fail,fail,pass` → rounds taken = min(cap, failures), brief `fix.{cap,used,verdicts}`; each round is one `walk.fix-round` entry (kind `mitigate`, actor `factory`, cause `walk:<f>:fix:<round>:<n>`) in the same commit as its checkpoint; **no round settles Verification** (W4); `gate move --kind mitigate` is refused (`invalid-move`); `admit.fixRounds: 4` refused at admission; after a person's reject the next pass runs no automatic round; a kill at `walk.fix-round-begin` and `-committed` neither loses nor repeats a round and the cap holds.
- [ ] T077 [US7] Implement Verification's rounds in `D/src/walk/walk.ts` `work` phase per walk-contract §5 (worker unit under the keyed command `walk:<f>:fix:<round>:<n>`, verifier unit re-run, verdict consumed from `WalkInput.verifier`), with `used` pinned at the cap after a person's reject; hooks `walk.fix-round-begin`/`-committed`, **declared in `KILL_POINTS` in this task**.
- [ ] T078 [US7] Add the cap matrix and a fix-round kill case (a Verification-failing script, kill at `walk.fix-round-begin` and `walk.fix-round-committed`) to `D/tests/proof/walk-kill-points.proof.test.ts` so both fix-round points fire (**proof tier**); the cap matrix itself is T076 (default tier, in-process).

**Checkpoint**: US7 passes. Commit.

---

## Phase 10: User Story 8 — the gate-rail contract says what now executes (Priority: P3)

**Goal**: `gate-rail.md` rewritten for constitution 2.1.0 and tied to the data by the drift test.
**Independent Test**: changing one vocabulary in `v2.ts` or in `gate-rail.md` alone fails the drift test by gate and field.

- [ ] T079 [P] [US8] Extend `C/tests/flow-vs-constitution.test.ts` and `C/tests/gate-rail.test.ts` first: per gate compare name · question · vocabulary · judge · `appliesWhen` · cap · note rules · targets · triage · delegable with the contract's table; parse the move-consequence table of the contract against `the-flow.md` §7; assert the sentences `declared as data only`, `belongs to r14`, `r14/r15` are **absent**; a divergence names the gate and the field. They fail until T080.
- [ ] T080 [US8] Rewrite `C/gate-rail.md` for constitution 2.1.0 as the executing contract: the twelve gates with the full rule columns; the closed move kinds and where each leads (the §1.1 table); re-crossing; `applies_when` evaluation, pinning, the UI slot and the *not applicable* outcome; triage bounds; the cap; the arming rule as data (r21 acts on it); the headless contract; what changed from v1 and from r12's text. Keep v1 pointing at `legacy/contracts/gate-rail.md`. Run the drift tests until green.
- [ ] T081 [US8] Mutation check in `S/notes.md`: change one vocabulary in `v2.ts` only, then in `gate-rail.md` only — each fails the drift test naming gate and field; revert, tree clean.

**Checkpoint**: US8 passes. Commit.

---

## Phase 11: Polish and close-out

**Purpose**: the floor matrix, the full proof, the statements, a fresh-clone run, and the report. Nothing here changes behaviour.

- [ ] T082 [P] Run the whole new suite on **Node 22.19.0, 23.6.0, 24.1.0 and the installed Node** (as r13's matrix; the Node versions are managed the way r13's `baseline.md` records); fix what a floor reveals (never skip a case); append the table to `S/baseline.md`.
- [ ] T083 Run `npm run proof` (the proof tier) on the installed Node and on 22.19.0; record the tier line, the point × gate counts, the random-kill seed(s) and the time in `S/baseline.md`.
- [ ] T084 [P] Update statements: `README.md` and `kiln/README.md` (four checks; the walk; `kiln feature …`; the two tiers and `npm run proof`), `D/README.md` (the walk beside the gate, the withdrawn end, key retention for feature-move keys), and a "four since r14" annotation on `kiln/packages/*/kiln.json` where a responsibility text changed.
- [ ] T085 Re-run **all** mutation checks of `S/notes.md` (T023, T072, T081 and the weakened-walk control of T057) on a committed tree; each is caught by name; the tree is clean after each revert.
- [ ] T086 Fresh-clone run of `quickstart.md` §0–§8 in a scratch directory (`git clone`, `npm ci`, each command as written); fix the quickstart where it differs from reality and record the outcome in `S/baseline.md`.
- [ ] T087 Write the **"after"** readings in `S/baseline.md`: `npm test` (exit 0, new-suite count ≥ 474 + r14's, legacy 500/30 skipped), `npm run check` (**four** `PASS`), `git rev-parse HEAD:legacy` equal to T001, `git diff --stat main -- specs/ROADMAP.md legacy` empty, the default-tier time against 180 s.
- [ ] T088 Write `S/implementation-report.md`: what was built per story, measured results against SC-001 … SC-012, the deviations (FR-025, FR-070, anything found on the way, with `S/notes.md` references), the honest limits (macOS only; scripted steps and decider; briefs not assembled; arming not implemented; event stream minimal), and the open items for r15/r16/r18/r20/r21 — including what r13 carried forward and r14 did **not** decide (a person vs a program as decider; a reused pid).
- [ ] T089 Final gate for review: `cd kiln && npm test && npm run check` green on the branch head; `specs/ROADMAP.md` **untouched** (closing r14 is the human's Roadmap-gate move); every task above checked.

---

## Dependencies and execution order

- **Setup (1)** → **Foundational (2)** → **US4 (3)** → **US1 (4)** → **US2 (5)** → **US3 (6)** → **US5 (7)** → **US6 (8)** → **US7 (9)** → **US8 (10)** → **Polish (11)**.
- US4 depends only on Foundational and may run **in parallel with US1** by a second person; everything else follows the order above because US2 completes the `pin` phase US1 starts, US3 attacks the walk US1/US2 built, and US5–US7 extend `consume`/`work` in the same file (`D/src/walk/walk.ts`) — those tasks are therefore **not** `[P]` against each other.
- US8 touches only `contracts` and may start any time after T005, but its drift test is final only after US5–US7 settle the rules it describes; run it last.
- Within a story: tests (marked first) → pure code → effectful code → CLI → fixtures → the run recorded in `baseline.md`.

### Parallel opportunities

- Foundational: T004, T006, T007 (different files) in parallel; T010 with T004 (different packages).
- US4: T017 and T018 together; US1: T025, T026, T027, T029, T030, T031, T038, T039 are separate files; US2: T041, T042, T045; US3: T054, T055, T056; US5: T059, T060, T066, T067 (tests); US6/US7 tests (T073, T076) and US8's T079.
- Not parallel: anything editing `D/src/walk/walk.ts`, `D/src/gate/move.ts`, `D/src/tasks/row.ts` or `CLI/tests/feature-cli.test.ts` at the same time.

## Implementation strategy

- **MVP = Setup + Foundational + US4 + US1 + US2**: the flow is data, the check refuses bad data, and both acceptance walks run through the CLI. Stop there and validate (quickstart §1–§3) before the kill matrix.
- **Then US3**: the walk is only claimed once it is attacked. The weakened walk is shown failing **before** the real walk is shown passing (T057 is written before the matrix is trusted).
- **Then US5 → US7** in priority order; **US8** last. Each phase ends with a commit and a recorded checkpoint, so any phase can be reviewed or reverted alone.
- The kill matrix is in the proof tier from the start (research R16); if T058 finds the default tier short of its margin, the response is moving the offender to the proof tier — never fewer cases.

## Notes

- [P] tasks = different files, no dependencies. Every task names its path.
- Commit after each phase and each logical group; the subject carries the phase and the test count.
- Avoid: a second importer of the library, any timer on a gate, a row path that writes a move record, an assertion that depends on wall-clock luck without a printed retry bound, editing `ROADMAP.md`.

## Traceability (requirement → tasks)

| Requirement | Tasks |
|---|---|
| FR-001, FR-002, FR-003 | T004, T005, T008, T029–T040, T061 |
| FR-004, FR-005, FR-006, FR-007 | T005, T013, T019, T017, T060 |
| FR-010 … FR-016 | T007, T041–T047 |
| FR-020 … FR-026 | T013, T059–T072 |
| FR-027 | T060, T062 |
| FR-030, FR-031 | T008, T073–T075 |
| FR-032 | T013, T076–T078 |
| FR-040 … FR-043 | T017–T024 |
| FR-044 | T005, T013, T017, T019 |
| FR-050, FR-051 | T038–T040, T046, T048–T058, T052, T065 |
| FR-052, FR-053, FR-054 | T025, T029, T033, T055, T056 |
| FR-055 | T057 |
| FR-056 | T033, T035 |
| FR-060, FR-061 | T079–T081 |
| FR-070, FR-071 | T009, T016, T087, T089 |
| SC-001 | T040 · SC-002 T042, T046 · SC-003 T051–T058, T083 · SC-004 T018, T022 · SC-005 T059–T064 · SC-006 T060 |
| SC-007 | T073 · SC-008 T076 · SC-009 T008 · SC-010 T079–T081 · SC-011 T018, T057 · SC-012 T058, T087, T089 |
