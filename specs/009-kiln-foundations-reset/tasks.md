---

description: "Task list for the foundations reset (row r12)"
---

# Tasks: Foundations reset (row r12)

**Input**: Design documents from `/specs/009-kiln-foundations-reset/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md); [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: **Included.** The spec requires them (FR-015 — every ported module travels with its tests; SC-001…SC-008; every check has a falsify hook). Ported
tests are copies of the first program's cases; **new tests are written first** and must fail before the code that satisfies them exists.

**Organization**: grouped by user story. Priorities from the spec: **US1, US2 = P1; US3, US4 = P2; US5 = P3.** The contracts base, the record core and the `kiln check`
skeleton are Foundational because every story builds on them.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1…US5, only inside a story phase
- Paths are repository-relative. `legacy/` is the moved first-program tree and is **never edited**.
- Run Node from `kiln/` (or `legacy/`) with `/opt/homebrew/bin` on `PATH` if `node` is not found.

## Rules that hold in every task

- **Never edit a file under `legacy/`** (FR-004). If a task seems to need it, stop: the plan has a gap.
- **Nothing under `kiln/` imports from `legacy/`**; copy the code, don't reference it (NC2-A).
- **No runtime dependency** and no bare import specifier (FR-002).
- **`specs/ROADMAP.md` is not touched**, and no task records a gate decision (FR-021).
- Commit at the checkpoints below, small commits per package; the move is its own commit (research R15).

---

## Phase 1: Setup — the starting point and the move

**Purpose**: record where we start, then move the first program's tree without changing a byte.

- [X] T001 Record the starting point in `specs/009-kiln-foundations-reset/baseline.md`: the baseline commit (`git rev-parse 299b0a5`) and its `kiln/` tree id (`git rev-parse 299b0a5:kiln`), the Node and Pi versions, and the suite numbers measured before any change (`cd kiln && node tests/run.ts`: 500 tests, 477 pass, 15 skipped, 8 fail — all 8 in `tests/pi/pi-live.test.ts`, Pi 1.1.0 installed vs 0.85.1 measured). Confirm `git status` is clean and `.specify/feature.json` points at this feature.
- [X] T002 Move the first program's whole tree with `git mv kiln legacy` — a **move-only commit**: no file content changes, nothing added under `legacy/` (research R1, R15). Commit message names the baseline commit.
- [ ] T003 In `.gitignore`, replace the `kiln/factory-log/*` runtime-artifact patterns with `legacy/factory-log/*.jsonl`, `legacy/factory-log/*.log` and `!legacy/factory-log/.gitkeep` (the dogfood scripts now write there); keep the `kiln/factory-log/` patterns too for the new tree. Commit separately from the move.
- [ ] T004 Prove the move changed nothing: `cd legacy && KILN_PI=0 node tests/run.ts`. Expect **500 tests, 0 failures** (measured in research R1, layout A). Append the numbers to `specs/009-kiln-foundations-reset/baseline.md`. If anything fails, stop — a relative-path assumption was missed — and record it before continuing.

**Checkpoint**: `legacy/` exists, is green with the live-Pi tier off (500 tests, 0 failures), and no `kiln/` directory exists yet.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the new `kiln/` skeleton and the leaf modules every story needs.

**⚠️ CRITICAL**: no story work starts until this phase is complete.

- [ ] T005 Create `kiln/package.json`: `name` `kiln`, `private`, `type` `module`, `engines` `{"node": "^22.18.0 || >=23.6.0"}`, no dependencies; an `imports` map `#contracts/*`→`./packages/contracts/src/*`, `#record/*`, `#lane/*`, `#durable/*`, `#workers/*`, `#director/*`, `#server/*`, `#cli/*` (each → `./packages/<name>/src/*`) and `#checks/*`→`./checks/*`; scripts `test` (`node tests/run.ts`), `test:new` (`--new-only`), `test:legacy` (`--legacy-only`), `kiln` (`node packages/cli/src/main.ts`), `check` (`node packages/cli/src/main.ts check`), `validate:log` (`node packages/record/src/log.ts`), `validate:roadmap` (`node packages/record/src/roadmap.ts`). Contract: `specs/009-kiln-foundations-reset/contracts/runner.md`, research R2, R12.
- [ ] T006 [P] Create `kiln/tsconfig.json` for editors only (`noEmit`, `allowImportingTsExtensions`, `moduleResolution` `NodeNext`, `types` `["node"]`, `include` `["**/*.ts"]`) mirroring the `imports` map; copy the options from `legacy/tsconfig.json`.
- [ ] T007 [P] Create the ten `package.json` files that state each unit's single responsibility in `kiln.responsibility` (research R3) — `kiln/packages/{contracts,record,durable,lane,workers,director,server,web,cli}/package.json` and `kiln/checks/package.json` — each `{"name": "@kiln/<unit>", "private": true, "type": "module", "kiln": {"responsibility": "<one sentence>"}`. Sentences: contracts — gate ids, move kinds, versioned flow definitions, judge rosters, the tier policy, record types and JSON schemas, with no I/O; record — the factory-log and roadmap validators, report formatting and the deterministic clock; durable — the one seam over Pi Durable (arrives with r42/r13); lane — the affinity logic now, the lane task and residency later (r13/r16); workers — role conversations on models, the only importer of pi-ai (r16); director — deterministic orchestration and the planner's checked drafts (r18); server — the loopback front door (r19); web — the prebuilt front door assets (r19); cli — the `kiln` command, `kiln check` now; checks — named, falsifiable checks that never pass vacuously. The empty packages contain only this file.
- [ ] T008 [P] Create `kiln/packages/contracts/src/moves.ts` per `data-model.md` §1: `MOVE_KINDS` (approve, revise, reject, restart, split+revise, mitigate, edit-rows, add-row, drop-row), `GateKey`, `GateId`, `GATE_KEY_OF`, `FlowVersion`. Pure — no `node:` imports.
- [ ] T009 [P] Create `kiln/packages/contracts/src/flow/types.ts` with `GateDefinition`, `FlowDefinition` and `RoleRoster` exactly as in `data-model.md` §2–3.
- [ ] T010 Create `kiln/packages/contracts/src/flow/v1.ts`: the first program's rail frozen as data — `MOVE_VOCABULARY`, `GATE_NAME` and `MITIGATION_CAP` copied key for key from `legacy/contracts/move-vocabulary.ts` into a `FlowDefinition` (version `v1`, roster = architecture-critic, verifier, code-reviewer, docs-synthesizer; Code review = approve · restart). Depends on T008, T009.
- [ ] T011 Create `kiln/packages/contracts/src/roles.ts`: `Tier`, `bindRole(role, tier, roster, extraJudges?)`, `isJudge`, `weakerBindingRejected` per `data-model.md` §3, keeping the first program's message wording (`G2/L1 config error: judge role "…" cannot bind tier "…"; must be "strongest" (P-II)`). Source: `legacy/src/roles.ts`. Depends on T009.
- [ ] T012 Create `kiln/packages/contracts/src/flow/index.ts` per `contracts/flow-and-records.md` §1 with **v1 only for now**: `flows = { v1 }`, `flowOf`, `moveVocabulary(gate, flow = "v1")`, `moveAllowed`, `gateName`. (The default flips to v2 when v2 lands in the flow-data story.) Depends on T010.
- [ ] T013 [P] Create `kiln/packages/contracts/src/types.ts` — types only — copied from `legacy/src/types.ts`, importing `GateId` from `./moves.ts`. Depends on T008.
- [ ] T014 [P] Copy `legacy/schemas/factory-log.schema.json` and `legacy/schemas/roadmap.schema.json` byte-for-byte to `kiln/packages/contracts/schemas/` (the factory-log schema gains its optional `flow` property later, in the flow-data story).
- [ ] T015 [P] Create `kiln/packages/record/src/validate-core.ts` as a copy of `legacy/validate/_core.ts` (the dependency-free schema validator).
- [ ] T016 [P] Create `kiln/packages/record/src/report.ts` as a copy of `legacy/validate/_report.ts` (the `PASS` / `FAIL — …` formatter the checks and `kiln check` use).
- [ ] T017 [P] Create `kiln/packages/record/src/clock.ts` as a copy of `legacy/src/clock.ts` (deterministic time for replays).
- [ ] T018 Create `kiln/checks/index.ts`: the registry `kiln check` uses — `CheckName`, `CheckResult` (per `data-model.md` §9), `registry: Record<CheckName, () => CheckResult>` (empty until each story registers its check) and `runChecks(names)`. Contract: `contracts/cli-check.md`.
- [ ] T019 Create `kiln/packages/cli/src/main.ts`: `kiln check [name…] [--json]` — runs the named checks (all registered when none given, each even if an earlier one fails), prints one block per check with `T016`, prints `notes`, exit 0/1/2 as in `contracts/cli-check.md`; unknown name → usage error listing the known names. Depends on T018, T016.

**Checkpoint**: `node packages/cli/src/main.ts check` runs (no checks registered yet); `contracts` has v1 flow data, roles and types; the record core is in place. Commit.

---

## Phase 3: User Story 1 — Work in the new layout, with the kept rules already proven (Priority: P1) 🎯 MVP

**Goal**: the record validators, the pure affinity logic, the fixtures and a runner for the new suite, with the kept tests passing from their new homes.

**Independent Test**: a fresh clone runs `npm run test:new`; the 23 ported cases and 3 new affinity cases pass; `validate:log` and `validate:roadmap` print `PASS` on the committed evidence; a run that matches no test fails.

- [ ] T020 [P] [US1] Port `legacy/validate/roadmap.ts` to `kiln/packages/record/src/roadmap.ts`, importing `./validate-core.ts` and `./report.ts`; keep its CLI main so `npm run validate:roadmap -- <file>` works.
- [ ] T021 [P] [US1] Port `legacy/validate/log.ts` to `kiln/packages/record/src/log.ts`, importing `#contracts/flow/index.ts` (`moveAllowed`, v1 default), `./validate-core.ts` and `./report.ts`; keep rules G1, G3, R3–R5 and the CLI main so `npm run validate:log -- <file>` works. Behaviour unchanged in this task.
- [ ] T022 [P] [US1] Copy `legacy/fixtures/r7-live-inference.jsonl`, `r7-live-broken.jsonl` and `r7-live-inference.meta.json` byte-for-byte to `kiln/fixtures/` (research R14).
- [ ] T023 [P] [US1] Copy `legacy/ROADMAP.md` (the blank shipped roadmap) to `kiln/packages/record/tests/fixtures/roadmap-blank.md` for the ported roadmap contract tests.
- [ ] T024 [US1] Port `legacy/tests/contract/log.test.ts` (9 cases) to `kiln/packages/record/tests/log-contract.test.ts`: imports become `#record/…`, the schema path becomes `../../contracts/schemas/factory-log.schema.json`; expectations unchanged. Depends on T021, T014, T015.
- [ ] T025 [US1] Port `legacy/tests/contract/roadmap.test.ts` (3 cases) to `kiln/packages/record/tests/roadmap-contract.test.ts`, reading `./fixtures/roadmap-blank.md` (T023); expectations unchanged. Depends on T020.
- [ ] T026 [P] [US1] Port `legacy/tests/negative/no-silent-approval.test.ts` (4 cases) to `kiln/packages/record/tests/no-silent-approval.test.ts`; expectations unchanged. Depends on T021.
- [ ] T027 [P] [US1] Port `legacy/tests/negative/roadmap-m3.test.ts` (7 cases) to `kiln/packages/record/tests/roadmap-m3.test.ts`, schema path `../../contracts/schemas/roadmap.schema.json`; expectations unchanged. Depends on T020.
- [ ] T028 [P] [US1] Create `kiln/packages/lane/src/types.ts` with the `WorkUnit` interface (role, tier, name — copied from `legacy/src/stub-resident.ts`, not imported). Pure types.
- [ ] T029 [US1] Create `kiln/packages/lane/src/affinity.ts` — the pure part of `legacy/src/scheduler.ts` (research R8): `switchCount(units)`, `bindAll(units, roster)` (throws **synchronously**), `judgeUnitsBoundStrongest(units, roster)`; imports `#contracts/roles.ts` and `./types.ts`. `schedule` and anything touching the lane runtime stay in legacy. Depends on T028, T011.
- [ ] T030 [US1] Write `kiln/packages/lane/tests/affinity.test.ts` (3 new cases, tests first, from an in-test list of units — no resident): a same-tier boundary counts 0 swaps; a genuine tier change counts 1; a sub-strongest judge binding makes `bindAll` throw synchronously (assert with `assert.throws`, and that no promise is created). Depends on T029.
- [ ] T031 [US1] Create `kiln/tests/run.ts` — the new suite only for now: discovers `packages/*/tests/**/*.test.ts`, `checks/tests/**/*.test.ts` and `tests/**/*.test.ts` (excluding `tests/runner/fixtures/` and `tests/tools/`), runs them with `node --test`, works from any working directory, **fails a run that executed zero tests** with the first program's message, prints `new: N tests`. Flags accepted now: `--new-only`, paths. Source: `legacy/tests/run.ts`. Contract: `contracts/runner.md`.
- [ ] T032 [US1] Write `kiln/tests/runner/zero-tests.test.ts` (runner case R5): a path matching no test makes the runner exit non-zero with the zero-tests message. Depends on T031.
- [ ] T033 [US1] Run `cd kiln && npm run test:new`. Expect the 23 ported cases (log 9, roadmap 3, no-silent-approval 4, roadmap-m3 7) and the 3 new affinity cases to pass; run `npm run validate:log -- fixtures/r7-live-inference.jsonl` (expect `PASS`) and `npm run validate:roadmap -- ../specs/ROADMAP.md` (expect `PASS`). Note the counts in `baseline.md`.

**Checkpoint**: US1 complete and demonstrable on its own.

---

## Phase 4: User Story 2 — The old code is frozen, and still verifiable (Priority: P1) 🎯 MVP

**Goal**: `legacy/` provably unchanged, still running, and the live-Pi tier skipping — with its versions printed — instead of failing on an unmeasured Pi.

**Independent Test**: `kiln check legacy` passes and fails by name on a tampered copy; `npm test` exits 0 on this machine (Pi 1.1.0); `npm test -- --pi` fails by name.

- [ ] T034 [US2] Create `kiln/tests/tools/make-legacy-manifest.ts` (under `tests/` because it spawns `git`, which the network lint must not see): given a baseline commit, read every file of `<commit>:kiln/` with `git ls-tree -r` and `git cat-file blob`, compute SHA-256, byte size and blob id, and write the manifest per `data-model.md` §5 (paths relative to `legacy/`, sorted; `baseline` = commit, `sourcePath` `kiln/`, tree id; `ignore` = `["factory-log/*.jsonl", "factory-log/*.log"]`).
- [ ] T035 [US2] Generate `kiln/checks/legacy-manifest.json` with `node kiln/tests/tools/make-legacy-manifest.ts 299b0a5` — from the baseline commit's blobs, **not** from the working tree. Commit it on its own. Expect 168 files.
- [ ] T036 [US2] Create `kiln/checks/legacy-identity.ts`: `checkLegacy(root)` returning a `CheckResult` — pure filesystem, no process spawned: for each manifest file, `legacy-file-missing` / `legacy-file-modified`; walk `legacy/` for files not in the manifest and not matched by `ignore` → `legacy-file-added`; verify `legacy-copies.json` (a `legacy` path not in the manifest, a missing `ported` path, a `wait` record without `portedBy` → `legacy-copy-unlisted`); an empty manifest → `legacy-zero-files`. Contract: `contracts/legacy-identity.md`.
- [ ] T037 [US2] Create `kiln/checks/legacy-copies.json` (schema 1, per `data-model.md` §6): the `ported` records for everything ported so far (the `#contracts` base, the record core and validators, the lane affinity logic, the fixtures — legacy path ↔ new path) and the **19 `wait` records** by file: `negative/async-await.test.ts` (4), `negative/not-silent.test.ts` (5), `netscan/allowlist.test.ts` (6), `scheduler/scheduler.test.ts` (3), `switch-cost/switch-cost.test.ts` (1), each with `portedBy` (r16, r16, r16, r13, r16) per research R13; `retiresWith` `legacy-retirement`. Later stories append their ported records.
- [ ] T038 [US2] Register the `legacy` check in `kiln/checks/index.ts`. Depends on T036.
- [ ] T039 [P] [US2] Write `kiln/checks/tests/legacy-identity.test.ts` (L1–L5), tests first, using a temp copy of `legacy/`: the real tree passes; one byte changed → `legacy-file-modified` naming the file; a file deleted → `legacy-file-missing`; a file added → `legacy-file-added`, but a new `factory-log/x.jsonl` is not; a copy record pointing at a missing file, or a `wait` without `portedBy` → `legacy-copy-unlisted`. Depends on T036.
- [ ] T040 [P] [US2] Write `kiln/checks/tests/legacy-baseline.test.ts` (L6): when `299b0a5` is in the local history, `git rev-parse 299b0a5:kiln` equals the manifest's `baseline.treeId`, else fail `legacy-baseline-mismatch`; when the history is missing (shallow clone, archive) **skip with a printed reason**. Lives under `checks/tests/`, outside the lint's scan roots.
- [ ] T041 [US2] Write `kiln/packages/cli/tests/check-legacy.test.ts`: `kiln check legacy` on the real tree exits 0 and prints `PASS legacy`; on a temp copy with a modified legacy file it exits 1 and names the file. Depends on T038, T019.
- [ ] T042 [P] [US2] Create `kiln/tests/measured-pi.ts` exporting `MEASURED_PI_VERSIONS = ["0.85.1"]` and `kiln/tests/pi-tier.ts` with the pure `decidePiTier({ env, demanded, installedVersion, measured })` per `data-model.md` §10 and `contracts/runner.md`; copy the `pi --version` parser from `legacy/validate/_pi-driver.ts` (`version`).
- [ ] T043 [P] [US2] Write `kiln/tests/runner/pi-tier.test.ts` (R1): every row of the decision table — demanded via `--pi`, `KILN_PI=1`, `KILN_PI=0`, no Pi, measured version, unmeasured version — returns the stated decision. Depends on T042.
- [ ] T044 [P] [US2] Write `kiln/tests/runner/measured-equality.test.ts` (R6): read the text of `legacy/validate/_pi-driver.ts` (no import — new code may not import legacy), extract `MEASURED_PI_VERSIONS`, assert it equals `kiln/tests/measured-pi.ts`. Depends on T042.
- [ ] T045 [US2] Extend `kiln/tests/run.ts`: also launch the frozen `legacy/tests/run.ts` as a second child (`cwd` `legacy/`, flags `--live`, `--cost`, `--serial`, `--pi` forwarded); add `--new-only` / `--legacy-only`; before launching, resolve the Pi binary (`KILN_PI_BIN` or `pi`), run `decidePiTier` (T042), and on `switch-off` set `KILN_PI=0` for the legacy child and print once `live-Pi tier skipped: Pi <installed> installed, measured [<list>]`; hold the legacy suite to the zero-tests rule; print `new: N tests · legacy: M tests`; exit non-zero if either suite fails. Depends on T031, T042.
- [ ] T046 [US2] Write `kiln/tests/runner/pi-skip.test.ts` (R2–R4, R7): create a stub `pi` executable at runtime in a temp dir (`chmod 755`, prints a version) and point `KILN_PI_BIN` at it — a stub printing `1.1.0` → the runner prints the skip line once and the legacy child starts with `KILN_PI=0`; a stub printing `0.85.1` → the legacy child's environment is unchanged; `--pi` with the `1.1.0` stub → `KILN_PI` is **not** switched off. Depends on T045.
- [ ] T047 [US2] Run `cd kiln && npm test` on this machine (Pi 1.1.0). Expect exit 0, 0 failures, the skip line once, `legacy: 500 tests` (L7), and `npm run kiln -- check legacy` → `PASS`. Record the numbers in `baseline.md`. Then run `npm test -- --pi` and expect the live-Pi tests to **fail by name** (`pi-version-unmeasured`) — a demanded tier is never skipped (US2.4).

**Checkpoint**: US2 complete. With US1 this is the **MVP**: the move is safe, proven and green.

---

## Phase 5: User Story 3 — The flow and the judges as data, under constitution v2.0.1 (Priority: P2)

**Goal**: flow v2 (and v1 kept for history), the per-flow judge roster, records that name their flow, and tests that read the constitution and the PRD.

**Independent Test**: the contract tests F1–F9 pass; the committed walk validates under v1 and v2; a Code review `revise` fails v1 by name and passes v2.

- [ ] T048 [P] [US3] Write `kiln/packages/contracts/tests/flow-vs-constitution.test.ts` (F1, F2), tests first: read `.specify/memory/constitution.md` and `docs/prd/kiln-prd.md`; assert every move kind in the v2 data is in the constitution's *closed set of move kinds* sentence, the four GATE-2 gate sets equal the data, GATE-1's ten plain names and internal ids match, and `mitigate` appears only as an automatic kind. It fails until the v2 data exists.
- [ ] T049 [US3] Create `kiln/packages/contracts/src/flow/v2.ts` per `contracts/flow-and-records.md` §2: ten gates with the GATE-1 plain names and questions, internal keys unchanged, Code review = approve · revise · restart, Verification = approve · reject with automatic `mitigate` (cap default 2, range 0–3), the judge on each judged gate, roster = architecture-critic, code-reviewer, verifier. Depends on T009.
- [ ] T050 [US3] Update `kiln/packages/contracts/src/flow/index.ts`: add `v2` to `flows`, `CURRENT_FLOW = "v2"`, `DEFAULT_RECORD_FLOW = "v1"`, make `moveVocabulary(gate, flow = CURRENT_FLOW)` default to v2, export `MITIGATION_CAP_DEFAULT = 2`. Depends on T049.
- [ ] T051 [US3] Edit **only the new copy** `kiln/packages/contracts/schemas/factory-log.schema.json`: add the optional `flow` property (`enum` `v1`, `v2`) to the `gateCompletion` definition, with a description that an absent field means v1. `legacy/schemas/` is untouched. Depends on T014.
- [ ] T052 [US3] Update `kiln/packages/record/src/log.ts`: resolve each record's flow as `record.flow ?? options.defaultFlow ?? DEFAULT_RECORD_FLOW`; check G3 with `moveAllowed(gate, move, flow)`; make the G3 message name the flow and list the allowed moves (`… not in MoveVocabulary(gate=6, flow=v1); allowed: approve, restart`); add `--flow v1|v2` to the CLI. Contract: `contracts/flow-and-records.md` §4. Depends on T021, T050.
- [ ] T053 [P] [US3] Port `legacy/tests/contract/gate-rail.test.ts` (6 cases) to `kiln/packages/contracts/tests/gate-rail.test.ts`: the cases assert **flow v1** (the review case `approve/restart — NO revise` stays as a v1 assertion) and add one new v2 case for Code review `approve · revise · restart` citing constitution v2.0.1. Depends on T050.
- [ ] T054 [P] [US3] Port `legacy/tests/negative/strongest-model.test.ts` (5 cases) to `kiln/packages/contracts/tests/strongest-model.test.ts`, passing the **v1 roster** as the new third argument (a changed call site, not a changed expectation); add new cases for v2 (F7, F8): `docs-synthesizer` is a judge under v1 and not under v2; a judge declared by an added gate (`extraJudges`) is refused below `strongest` under either roster. Depends on T011, T049.
- [ ] T055 [P] [US3] Write `kiln/packages/record/tests/flow-records.test.ts` (F4–F6): the committed r7 walk (`kiln/fixtures/r7-live-inference.jsonl`) passes with v1 and with v2; a `gate: 6, move: "revise"` record fails v1 naming the flow and listing the allowed moves, and passes v2 and with `"flow": "v2"` in the record; a record's own `flow` wins over `defaultFlow`. Depends on T052, T022.
- [ ] T056 [P] [US3] Write `kiln/packages/contracts/gate-rail.md` (FR-019): the v2 contract — the gate table of `contracts/flow-and-records.md` §2, the flow invariants of constitution v2.0.1, the closed move kinds, the `flow` field rule — with a pointer to `legacy/contracts/gate-rail.md` for v1 and a note of the one difference (Code review gains `revise`).
- [ ] T057 [US3] Append to `kiln/checks/legacy-copies.json` the `ported` records for the flow v1/v2 data, roles, types, schemas and the gate-rail and strongest-model tests (legacy original ↔ new file).
- [ ] T058 [US3] Run `cd kiln && npm run test:new` and the quickstart §3 commands (`validate:log` on the r7 walk with and without `--flow v2`; the hand-made Code review `revise` record under v1 and v2). Expect F1–F9 green, ported cases now 34 (23 + gate-rail 6 + strongest-model 5), SC-004, SC-005 and SC-008 satisfied. Note in `baseline.md`.

**Checkpoint**: US3 complete; 34 of the 54 ported cases live.

---

## Phase 6: User Story 4 — `kiln check` proves the source makes no unapproved network call (Priority: P2)

**Goal**: the first program's network lint, ported, over the new packages with an empty path-keyed allowlist.

**Independent Test**: `kiln check network` passes on the real tree and fails by name, file and construct on each scratch violation; an empty scan fails.

- [ ] T059 [P] [US4] Create `kiln/checks/lex.ts`: the tokenizer from `legacy/validate/_netscan.ts` (strings, template literals with `${}` nesting, regex literals, both comment forms) exposed as functions both the network lint and the boundary check use to read code without being fooled by strings and comments. Source: the tokenizer section of `legacy/validate/_netscan.ts`.
- [ ] T060 [P] [US4] Create `kiln/checks/loopback.ts` with `isLoopbackHost` copied from `legacy/src/ollama-resident.ts` (a small pure function) — never imported from `legacy/` (research R9).
- [ ] T061 [P] [US4] Create `kiln/checks/network-allowlist.json`: `{"schema": 1, "entries": []}` (empty in r12; r16 adds the residency module as the first entry).
- [ ] T062 [P] [US4] Write `kiln/checks/tests/network-lint.test.ts`, tests first (the failure names of `contracts/cli-check.md`): `fetch(` → `network-call`; importing `node:http` or `node:child_process` → `network-import`; aliasing `fetch` → `network-alias`; `globalThis["fe" + "tch"]` → `network-computed`; an empty scan root → `network-zero-files`; an allowlist entry that is a bare name → `allowlist-bare-name`; an entry naming a missing file → `allowlist-missing-file`; `fetch(` inside a string or comment is not a violation. Each failure names the file and the construct.
- [ ] T063 [US4] Create `kiln/checks/network-lint.ts` — port of `legacy/validate/_netscan.ts` using `./lex.ts` and `./loopback.ts`: call-based detection, the network/process module denylist, alias and computed-access detection, the never-vacuous guard, allowlist loading from `network-allowlist.json` (path-keyed, never bare names), scan roots `kiln/packages/*/src` and `kiln/checks/*.ts` (non-test) — **not** `legacy/`; returns a `CheckResult` with the named failures. Drop the first program's "exactly one allowlist entry" rule (research R9). Depends on T059, T060, T061.
- [ ] T064 [P] [US4] Port `legacy/tests/netscan/bypass.test.ts` (7 cases) to `kiln/checks/tests/network-bypass.test.ts`, importing `../network-lint.ts`; expectations unchanged. Depends on T063.
- [ ] T065 [P] [US4] Port `legacy/tests/netscan/hardened.test.ts` (7 cases) to `kiln/checks/tests/network-hardened.test.ts`; the "real directory is not a file / zero files fails" case points at a real `packages/contracts/src` directory (a path change, not an expectation change). Depends on T063.
- [ ] T066 [P] [US4] Port `legacy/tests/netscan/strictly-stronger.test.ts` (3 cases) to `kiln/checks/tests/network-strictly-stronger.test.ts`, importing the type from `#contracts/types.ts`. Depends on T063, T013.
- [ ] T067 [P] [US4] Port `legacy/tests/netscan/untouched.test.ts` (3 cases) to `kiln/checks/tests/netscan-untouched.test.ts` unchanged — historical git-range assertions about r7 that do not depend on location; it skips with a printed reason without history.
- [ ] T068 [US4] Register the `network` check in `kiln/checks/index.ts`. Depends on T063.
- [ ] T069 [US4] Write `kiln/packages/cli/tests/check-network.test.ts` (quickstart §4): `kiln check network` on the real tree exits 0 and reports the files scanned and the allowlist; on a temp copy with `packages/lane/src/oops.ts` calling `fetch(` it exits 1 naming that file; with `globalThis["fe" + "tch"]` it exits 1 with `network-computed`. Depends on T068, T019.
- [ ] T070 [US4] Append to `kiln/checks/legacy-copies.json` the `ported` records for the network lint, tokenizer, loopback helper and the four ported netscan test files (the `netscan/allowlist` file stays a `wait` record).
- [ ] T071 [US4] Run `cd kiln && npm run test:new && npm run kiln -- check network legacy`. Expect the ported cases now **54** (34 + bypass 7 + hardened 7 + strictly-stronger 3 + untouched 3), every negative case failing by its own name, and quickstart §4 behaving as written. Note in `baseline.md`.

**Checkpoint**: US4 complete; **all 54** ported cases live.

---

## Phase 7: User Story 5 — Package boundaries are checked, not hoped for (Priority: P3)

**Goal**: PRD §8.2's dependency direction, seam rules and "no bare specifiers" enforced by a rule file and a check.

**Independent Test**: `kiln check boundaries` passes on the real tree and fails by file and rule on each scratch change.

- [ ] T072 [P] [US5] Create `kiln/checks/boundaries.json` with exactly the content in `specs/009-kiln-foundations-reset/contracts/boundaries.md` (17 layers following PRD §8.2, `contracts` with `builtins: "none"`, `externals: {}`, `forbidden.legacyRoot: "legacy/"`).
- [ ] T073 [P] [US5] Write `kiln/checks/tests/boundaries.test.ts` (B1–B10), tests first, building scratch trees in a temp dir against the real `boundaries.json`: the real packages pass and the report names the rules and file count; `record` importing `#lane/…` → `boundary-forbidden-import`; `lane` importing a sibling `#workers/…` → the same; `contracts` importing `node:fs` → `boundary-contracts-io`; any package importing `"left-pad"` → `boundary-bare-specifier`; `../../../legacy/src/x.ts` → `boundary-legacy-import`; `#lane/x.ts` inside a string or comment is not an import; an undeclared `packages/` directory → `boundary-package-undeclared`; a package (or `checks/`) without `kiln.responsibility` → `boundary-responsibility-missing`; an empty scan root → `boundary-zero-files`.
- [ ] T074 [US5] Create `kiln/checks/boundaries.ts`: read import specifiers of non-test `.ts` files under `kiln/packages/*/src` and `kiln/checks/*.ts` with `./lex.ts`, classify them (relative → resolved to a package; `#pkg/…`; `node:`; bare) and apply `boundaries.json` per `contracts/boundaries.md`; verify every `packages/*` directory and `checks/` is declared and has a non-empty `kiln.responsibility`; return a `CheckResult` with the named failures, failing on zero files. Depends on T059, T072.
- [ ] T075 [US5] Register the `boundaries` check in `kiln/checks/index.ts`. Depends on T074.
- [ ] T076 [US5] Write `kiln/packages/cli/tests/check-boundaries.test.ts` (quickstart §5): `kiln check boundaries` on the real tree exits 0; on a temp copy with `packages/record/src/oops.ts` importing `#lane/affinity.ts` it exits 1 naming that file and `boundary-forbidden-import`. Depends on T075, T019.
- [ ] T077 [US5] Run `cd kiln && npm run check` (all three checks) and `npm run test:new`. Expect `PASS network`, `PASS boundaries`, `PASS legacy`, exit 0; quickstart §5 behaves as written. Note in `baseline.md`.

**Checkpoint**: US5 complete; `npm run check` is green with all three checks.

---

## Phase 8: Polish & cross-cutting concerns

**Purpose**: documentation, the PRD amendment, the numbers, and verification on a fresh clone.

- [ ] T078 Update `README.md`: the "Try the foundation" commands (`cd kiln` instead of `cd kiln/kiln`; the legacy scripts become `cd legacy && npm run <script>`), the repository-layout table (`legacy/` and the new `kiln/`), the "where things stand" code row; keep the measured-Pi sentence that `legacy/tests/pi/readme-pi-version.test.ts` reads. A note maps old `kiln/…` paths in historical specs to `legacy/…`.
- [ ] T079 Run `cd kiln && npm test` again after the README edit: the legacy suite must still be green (the README is read by a legacy test). Depends on T078.
- [ ] T080 [P] Amend `docs/prd/kiln-prd.md` §8.2 (the codebase layout: `legacy/` at the repository root, not `kiln/legacy/`, with the reason in one line) and the §10 tables that mention `legacy/`; note the amendment date and that a measurement drove it (`specs/009-kiln-foundations-reset/research.md` R1).
- [ ] T081 [P] Update `docs/architecture/explainers/kiln-v1.md` §5.2 (layout and the `legacy/` row) and `docs/architecture/explainers/kiln-architecture.md` §13 (the codebase tree) to the new layout; update the r12 narrative in `specs/explainers/_generate.py` (layout, versioned flow, checks) and regenerate with `python3 specs/explainers/_generate.py .`.
- [ ] T082 [P] Compare the phase table and source tree in `specs/009-kiln-foundations-reset/plan.md` with what was actually built; where they differ, edit `plan.md` and add a short "Implementation notes" section listing each departure and why (the manifest generated after the move and the generator under `kiln/tests/tools/` are already recorded).
- [ ] T083 Create `kiln/tests/tools/count-ported.ts` and run it: list the ported test files with their case counts (`test(`/`it(` per file) and compare with the census in `research.md` R13 — **54 ported**, the 19 `wait` cases still present and passing in `legacy/`. Record the output in `baseline.md` (SC-002).
- [ ] T084 On a fresh clone of the branch (`git clone <repo> /tmp/kiln-fresh && cd /tmp/kiln-fresh/kiln`) run every scenario of `quickstart.md` §0–§6 and record the results in `specs/009-kiln-foundations-reset/verification-report.md` (one row per success criterion SC-001…SC-008 with the command and its output).
- [ ] T085 Run `npx -y node@22.18.0 tests/run.ts --new-only` (quickstart §7) and record the result in `verification-report.md`. If the `imports` map or type stripping fails on 22.18, switch cross-package imports to relative specifiers (research R2 fallback), update `boundaries.ts` accordingly, and re-run.
- [ ] T086 Confirm `git diff main -- specs/ROADMAP.md` is empty and row r12 is still `queued` in the roadmap — the row's close is the human's Roadmap-gate move (FR-021, constitution VI). Record this in `verification-report.md`.
- [ ] T087 Final run from `kiln/`: `npm test` (exit 0, 0 failures) and `npm run check` (three PASS). Add the closing numbers to `verification-report.md`, tick the checklist in `specs/009-kiln-foundations-reset/checklists/requirements.md`, and commit.

---

## Dependencies & execution order

### Phase dependencies

- **Setup (1)** → **Foundational (2)** → the five stories → **Polish (8)**. The move (Setup) precedes everything: the manifest is generated from the baseline commit's blobs right after it (US2).
- **US1** needs the Foundational contracts base and record core. **US2** needs the Foundational CLI/registry skeleton and the runner from US1. **US3** extends the contracts and validators from Foundational and US1. **US4** needs the Foundational skeleton (`ctypes`, registry, CLI). **US5** needs `checks/lex.ts` from US4.
- Stories are otherwise independent: US3, US4 and US5 can proceed in parallel once US1 and US2 are done and their shared files (`kiln/checks/index.ts`, `kiln/checks/legacy-copies.json`) are not edited by two people at once.

### Within each story

- New tests first (they fail); ported tests next to their ported module; the check is registered last; the story's verify task closes it.
- `kiln/checks/index.ts` and `kiln/checks/legacy-copies.json` are shared files: edit them one story at a time.

### Parallel opportunities

- Foundational: T006 with T007, T008, T009, T013, T014, T015, T016, T017 (all different files).
- US1: T020, T021, T022, T023 together; then T026, T027, T028 together.
- US3: T048, T053, T054, T055, T056 together once T050 and T052 exist.
- US4: T059, T060, T061, T062 together; then the four ported netscan tests together.
- US5: T072 with T073.

### Parallel example: User Story 4

```text
Task: "Create kiln/checks/lex.ts (tokenizer)"
Task: "Create kiln/checks/loopback.ts (isLoopbackHost copy)"
Task: "Create kiln/checks/network-allowlist.json"
Task: "Write kiln/checks/tests/network-lint.test.ts (negative suite, failing)"
```

## Implementation strategy

### MVP first (US1 + US2, both P1)

1. Phase 1 Setup — record the baseline, move the tree, prove it green.
2. Phase 2 Foundational — the skeleton and leaf modules.
3. Phase 3 US1, then Phase 4 US2.
4. **Stop and validate**: `npm test` exits 0 here; `kiln check legacy` passes and fails by name when tampered; the 23 record cases pass. The repository is now in its new shape, provably intact.

### Incremental delivery

US3 (flow v2 and the roster) → US4 (network lint) → US5 (boundaries) → Polish. Each story adds a check or a contract without breaking the previous ones; `npm test` stays green after each.

### Finishing

The row closes only by the **human's** Roadmap-gate move; these tasks end with a verification report, not with a gate decision.

## Summary

- **Total tasks**: 87
- **Per phase**: Setup 4 · Foundational 15 · US1 14 · US2 14 · US3 11 · US4 13 · US5 6 · Polish 10
- **Parallelisable ([P])**: 39 tasks
- **MVP scope**: Setup + Foundational + US1 + US2 (47 tasks)
- **Ported test cases**: 54 across US1 (23), US3 (11) and US4 (20); 19 deferred cases stay in `legacy/`, listed in `legacy-copies.json` with the row that ports each.

## Notes

- Every ported test keeps its expectation; the only changed expectation is the Code review case in `gate-rail`, which cites constitution v2.0.1.
- A task that edits a shared file (`checks/index.ts`, `legacy-copies.json`, `kiln/package.json`) says so; do not parallelise those.
- Stop at any checkpoint to validate the story independently.
