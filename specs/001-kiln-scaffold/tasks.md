---
description: "Task list for KILN scaffold — planning contracts (Q1=C, Q2=A)"
---

# Tasks: 001-kiln-scaffold

**Input**: Design documents from `/specs/001-kiln-scaffold/`
(`plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`)

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/
**Tests**: **Included.** The spec's Success Criteria (SC-001/SC-005/SC-008) and
`quickstart.md` are *defined as `node --test` suites* — a validator plus a falsifiable
FiringReady check — so test tasks are part of the deliverable (they validate the
contracts). They are **static** assertions only: no lane fires, no gate advances
(Q1=C / SC-006), and **zero runtime/cloud dependency** (P-VIII / research §G).
**Organization**: Grouped by user story so each story is independently implementable
and testable. Story labels `[US1]`…`[US4]` map to `spec.md` priorities (US1 = P1/MVP,
US2 = P1, US3 = P2, US4 = P3).

## Format: `[ID] [P?] [Story?] Description`

- **[P] can run in parallel** (different files, no dependency on an incomplete task)
- **[Story]** label for user-story phases (Setup/Foundational/Polish — none)
- Exact file paths in every description; constraints quoted from
   `data-model.md` / `contracts/` so they are not left to implementation discretion.

> **Provenance:** the JSON Schemas, `gate-rail.md`, and the empty `ROADMAP.md`
> *already exist as design artifacts* under
> `specs/001-kiln-scaffold/contracts/` (produced by `/speckit.plan`). The Setup
> phase **promotes** them to canonical `kiln/` locations (research §H); user-story
> phases build the validator + `node --test` suites that consume them.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stand up the `kiln/` repo shape and promote the design contracts.

- [X] T001 Create the `kiln/` structure per `plan.md` (dirs `kiln/schemas`, `kiln/contracts`,
      `kiln/src`, `kiln/validate`, `kiln/tests` with subdirs `contract/`, `streaming/`,
      `negative/`, `firing-ready/`; **placeholder** `kiln/index.ts` explicitly **NOT wired**;
      **placeholder** `kiln/ROADMAP.md`) in `kiln/`
- [X] T002 [P] Initialize the Node/TypeScript config — `kiln/package.json` (**zero runtime
      dependencies**; `scripts.test` = `node --test`) and `kiln/tsconfig.json`; assert the module
      graph pulls no network at build or run (P-VIII / research §G) in `kiln/package.json`
- [X] T003 [P] Promote the two JSON Schemas (Draft 2020-12) byte-identically from
      `specs/001-kiln-scaffold/contracts/factor…ason` to
      `kiln/schemas/factor…ason` and re-validate them as JSON in `kiln/schemas/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core validator pieces every user story consumes.

**⚠️ CRITICAL**: No user-story work begins until this phase is complete.

- [X] T004 [P] Implement the hand-rolled **JSONL parser + minimal JSON-Schema (Draft 2020-12)
      validator core** in `kiln/validate/_core.ts` (**zero third-party deps**, P-VIII; a pinned
      library is *deferred* per research §B)
- [X] T005 [P] Promote the gate-rail contract — copy
      `specs/001-kiln-scaffold/contracts/gate-rail.md` → `kiln/contracts/gate-rail.md` **and** add
      the machine-readable `MoveVocabulary(gateId)` map in `kiln/contracts/move-vocabulary.ts`
      (gates `gate0` + `1..9`; per G1–G5: **checkpoint** = `split+revise` + `approve`, **no
      `reject`**; **review** = `approve`/`restart`, **no `revise`**; **verify** = `approve`/
      `reject` with **mitigation cap = 2**; **standard** = `approve`/`revise`/`reject`)
- [X] T006 [P] Implement the **named error-report** helper in `kiln/validate/_report.ts` that
      names the offending `seq` / record / `move` — powers SC-008 named failures (`missing seq N`,
      `record S: move X not in MoveVocabulary(<gate>)`, malformed-line)
- [X] T007 [P] Create the **TS type mirror** `kiln/src/types.ts` from the two promoted JSON Schemas
      (Entity-1 log records + Entity-4 `FactoryState` fields per F1 + role roles) — a convenience
      mirror; the JSON Schemas remain canonical

**Checkpoint**: Foundation ready — user-story implementation can begin in parallel.

---

## Phase 3: User Story 1 — Factory-log Schema + Validator (Priority: P1) 🎯 MVP

**Goal**: `kiln/schemas/factory-log.schema.json` validates a JSONL stream per-line under rules
**R1–R6** (data-model.md Entity 1), with a CLI that reports pass/fail with named reasons.

**Independent Test**: `quickstart.md` Scenarios **1–3** — a complete stream PASSES; deleting
`decidedBy` + the `pre-delegation` from an `approve` gate-completion FAILs (R3 no-silent-
approval); a missing/duplicate/non-increasing `seq` or a malformed line FAILs with a **named**
reason (R2). No lane runs.

### Tests for User Story 1 (write FIRST; ensure they FAIL)

- [X] T008 [P] [US1] **Contract test** — the JSONL record union
   (`transition` / `gate-completion` / `human-decision` / `cost` / `wait` / `pre-delegation`)
   validates each record type against `kiln/schemas/factor…ason`, blank lines ignored (R1) — in
   `kiln/tests/contract/log.test.ts`
- [X] T009 [P] [US1] **Negative test (R3)** — a `gate-completion` with `move=approve` and **no**
   `decidedBy` and **no** distinct `pre-delegation` FAILs; a `wait` (`gate`,`token`,`deadline`)
   remains the **only** valid unresolved shape — in `kiln/tests/negative/no-silent-approval.test.ts`
- [X] T010 [P] [US1] **Streaming test (R2)** — missing / duplicate / non-increasing `seq` and a
   malformed JSON line each FAIL with a **named** reason — in `kiln/tests/streaming/seq.test.ts`

### Implementation for User Story 1

- [X] T011 [US1] Implement the **per-line log validator** `kiln/validate/log.ts` enforcing **R1**
   (JSON parse + schema conformance), **R2** (`seq` strictly increasing, gap-free; `ts`
   non-decreasing), **R3** (an `approve`/`restart`/merge completion requires a `decidedBy:human@…`
   **or** a distinct `pre-delegation` record), **R4** (a `pre-delegation` entry is *distinct* from a
   `human-decision`), **R5** (no record carries a cloud/remote field; an `unavailable-resource`
   flag is a valid, non-blocking shape), **R6** (a `trace` note names the constitution
   principle(s)) — **depends on T004, T006**
- [X] T012 [US1] Wire the **CLI entry** `kiln/validate/log` (reads a `.jsonl`, prints `PASS` or a
   named `FAIL` reason) used by `quickstart` Scenarios 1–3 — **depends on T011**

**Checkpoint**: User Story 1 fully functional and testable independently (quickstart S1–S3 green).

---

## Phase 4: User Story 2 — ROADMAP.md Schema + Empty Artifact (Priority: P1)

**Goal**: `kiln/schemas/roadmap.schema.json` + the **shipped empty** `kiln/ROADMAP.md` (Q2=A)
validate under rules **M1–M4** (data-model.md Entity 2), with a CLI that **rejects** any committed
program that Gate 0 never admitted.

**Independent Test**: `quickstart.md` Scenario **4** — the empty roadmap
(`gate0.status=pending`, `rows=[]`, no committed `ordering`) PASSES; each *negative baseline*
mutation FAILs (approved `gate0` w/o a full human-decided record; unresolved / cyclic `ordering` or
`deps`; `gate` present iff `status=active`; `outcome: @PR#N` present iff `status=done`; table ≠
re-render(head)). No lane runs.

### Tests for User Story 2 (write FIRST; ensure they FAIL)

- [X] T013 [P] [US2] **Contract test** — the shipped empty roadmap
   (`gate0.status=pending`, `rows=[]`, `ordering` un-committed) validates against
   `kiln/schemas/roadmap.schema.json` — in `kiln/tests/contract/roadmap.test.ts`
- [X] T014 [P] [US2] **Negative test (M3)** — `gate0.status=approved` **without** `rows`/
   `decided_by`/`at` FAILs; an `ordering`/`deps` with an unresolved id or cycle FAILs; `gate` set
   with `status != "active"` FAILs; `status="done"` with no `outcome` matching `^@PR#[0-9]+$` FAILs —
   in `kiln/tests/negative/roadmap-m3.test.ts`

### Implementation for User Story 2

- [X] T015 [US2] Promote the **empty artifact** — copy
   `specs/001-kiln-scaffold/contracts/roadmap-empty.example.md` → `kiln/ROADMAP.md`, ensuring the
   structured head is schema-valid and `gate0.status=pending` (Q2=A: **no** approved rows, **no**
   committed ordering) — **depends on T013**
- [X] T016 [US2] Implement the **ROADMAP validator** `kiln/validate/roadmap.ts` enforcing **M1**
   (`deps`/`ordering` ids resolve to existing row ids; **cycle-free**), **M2** (eligibility is
   *expressible* — a row is eligible to fire iff its `deps` are `done` — without *committing* one),
   **M3** (a `gate0.status=approved` requires a full human-decided `gate0` record:
   `rows`/`decided_by:human@…`/`at`; a committed `ordering` requires matching `rows`; otherwise
   reject), **M4** (a rendered table, if present, must equal a re-render of the head — projection
   invariant) — **depends on T004, T006**
- [X] T017 [US2] Wire the **CLI entry** `kiln/validate/roadmap` (reads `kiln/ROADMAP.md`, prints
   `PASS` or a named `FAIL` reason) used by `quickstart` Scenario 4 — **depends on T016**

**Checkpoint**: User Stories 1 and 2 both work independently (quickstart S1–S4 green).

---

## Phase 5: User Story 3 — Gate-Rail Contract + Role Classification (Priority: P2)

**Goal**: Lock the **gate-rail contract** (`kiln/contracts/gate-rail.md` + the
`MoveVocabulary` map, rules **G1–G5**) and the **role classification**
(`kiln/src/roles.ts`, rules **L1/G2**), so a *weaker* line-of-defense binding is a **rejected
configuration error**.

**Independent Test**: `quickstart.md` Scenario **5** — the **four** line-of-defense roles
(Architecture Critic, Verifier/Diagnosis, Code Reviewer, Docs Synthesizer) are bound to
**`strongest`**, and binding any one to a sub-strongest tier is **rejected**. No lane runs.

### Tests for User Story 3 (write FIRST; ensure they FAIL)

- [X] T018 [P] [US3] **Contract test (G1–G5)** — every `gate`/`gate0` move ∈ `MoveVocabulary(gateId)`;
   **G1** `gate` vs `gate0` distinct; **checkpoint** `split+revise`+`approve`/no-`reject`;
   **review** `approve`/`restart` (no `revise`); **verify** mitigation **cap = 2** — in
   `kiln/tests/contract/gate-rail.test.ts`
- [X] T019 [P] [US3] **Negative test (G2/L1)** — binding any line-of-defense role to a tier below
   `strongest` is a **configuration error** that is rejected; a *work* role accepts a cheaper tier
   only upstream of its far-side gate — in `kiln/tests/negative/strongest-model.test.ts`

### Implementation for User Story 3

- [X] T020 [US3] Implement the **role-classification source** `kiln/src/roles.ts` — line-of-defense
   roles = `strongest, always, every substrate` (incl. local); work roles = a cheaper tier **only
   upstream** of the far-side gate (**L1**); a weaker line-of-defense binding **throws** (**G2**) —
   **depends on T018, T005**
- [X] T021 [US3] Finalize/review `kiln/contracts/gate-rail.md` against **G1–G5**, keeping the
   **Gate-5 reconciliation** from `research.md §D` (constitution governs over the
   `gates-why-how-what.md` doc; the discrepancy stays logged) — **depends on T005**

**Checkpoint**: User Stories 1–3 all work independently (quickstart S1–S5 green).

---

## Phase 6: User Story 4 — FiringReady Check (Priority: P3)

**Goal**: A **static, falsifiable** `kiln/validate/firing-ready.ts` that asserts all three contracts
exist, are mutually consistent, and carry `trace` notes — **advancing no gate and running no lane
(SC-006, Q1=C)**, with a non-zero exit naming any omitted element.

**Independent Test**: `quickstart.md` Scenario **6** — the check PASSES when all three contracts are
present + consistent; removing `kiln/schemas/factory-log.schema.json` (or the roadmap schema, the
gate-rail contract, or a `trace` note) makes it **FAIL and name** the missing element.

### Tests for User Story 4 (write FIRST; ensure they FAIL)

- [X] T022 [P] [US4] **FiringReady negative test** — removing
   `kiln/schemas/factory-log.schema.json` **or** `kiln/schemas/roadmap.schema.json` **or**
   `kiln/contracts/gate-rail.md` **or** a `trace` note (R6/M3) makes the check **fail and name the
   omitted element**; a fully-present set passes — in
   `kiln/tests/firing-ready/firing-ready.test.ts`

### Implementation for User Story 4

- [X] T023 [US4] Implement `kiln/validate/firing-ready.ts` — assert **presence** of both schemas +
   the gate-rail contract + the empty `kiln/ROADMAP.md`; **mutual consistency**; and **trace notes**
   on each contract (R6 / M3); on any gap, **exit non-zero naming the missing element**; **must run
   no lane and advance no gate (SC-006)** — **depends on T011, T016, T020**
- [X] T024 [US4] Wire the **CLI entry** `kiln/validate/firing-ready` (a `node --test` run) used by
   `quickstart` Scenario 6 — **depends on T023**
- [X] T025 [US4] Replace the `kiln/index.ts` placeholder with a **wiring STUB** that *references* the
   three contracts (log + roadmap + gate-rail) but is **explicitly documented as NOT wired / NOT
   advancing anything** (Q1=C — the lane runtime is a later row) — **depends on T023**

**Checkpoint**: All user stories independently functional (quickstart S1–S6 green).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that span the user stories.

- [X] T026 [P] Promote the index — copy
   `specs/001-kiln-scaffold/contracts/README.md` → `kiln/contracts/README.md` (canonical index +
   composition diagram + `kiln/` placement from research §H)
- [X] T027 [P] Add a **traceability cross-ref table** (each contract ↔ constitution principle:
   P-I..IX, FR-009/`trace`) to `kiln/contracts/README.md`
- [X] T028 Run **all six `quickstart` scenarios end-to-end** (S1–S6) and record results in
   `specs/001-kiln-scaffold/quickstart-run.md`; assert **zero lane advances** (SC-006) and **zero
   cloud/network calls** (P-VIII / SC-005)
- [X] T029 Re-check **constitution** compliance (P-I..IX + governance / FR-009) against the delivered
   `kiln/` and write a short **compliance note** in
   `specs/001-kiln-scaffold/compliance-note.md` (this slice advanced no gate, added no cloud /
   parallelism / server — P-V/VI/III/VIII/IX; principle-II strongest-model binding verified in
   T020/T019)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories** (the validator core,
   the move vocabulary, the error reporter, and the type mirror are consumed by every story).
- **User Stories (Phase 3–6)**: All depend on Foundational, then proceed in priority order
   P1 (US1) → P1 (US2) → P2 (US3) → P3 (US4). Each adds value and is independently testable.
- **Polish (Phase 7)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: After Foundational only — no story dependencies (MVP).
- **US2 (P1)**: After Foundational only — consumes the shared core/move-vocabulary but **no** US1
   output; independently testable.
- **US3 (P2)**: After Foundational only (reuses `T005` move-vocabulary) — **no** US1/US2 output.
- **US4 (P3)**: Depends on US1 + US2 + US3 because FiringReady asserts *presence/consistency of all
    three contracts* — but it asserts **no** gate advance (SC-006).

### Within Each User Story

- **Tests are written and FAIL before implementation** (T008–T010 / T013–T014 / T018–T019 /
   T022).
- **Validator (implementation) before CLI entry** (T011→T012, T016→T017, T023→T024).
- **Core implementation before the cross-contract FiringReady check** (US1/US2/US3 before US4).
- Story complete before moving to the next priority.

### Parallel Opportunities

- Setup: **T002, T003** parallel (config + schema promotion); T001 (structure) first.
- Foundational: **T004, T005, T006, T007** all parallel (different files, all after Setup).
- Per story: the **test trio/pair** (T008–T010, T013–T014, T018–T019, T022) run in parallel.
- Polish: **T026, T027** parallel; T028/T029 last.
- Cross-story: US1 and US2 are independent after Foundational and may be staffed separately.

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (write each, then watch them FAIL):
Task: "T008 [P] [US1] Contract test — JSONL record union, kiln/tests/contract/log.test.ts"
Task: "T009 [P] [US1] Negative test (R3), kiln/tests/negative/no-silent-approval.test.ts"
Task: "T010 [P] [US1] Streaming test (R2), kiln/tests/streaming/seq.test.ts"

# Then implement + wire (sequential within the story):
Task: "T011 [US1] Per-line validator kiln/validate/log.ts (R1–R6; deps T004,T006)"
Task: "T012 [US1] CLI entry kiln/validate/log (dep T011)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete **Phase 1: Setup** (structure + config + promote schemas).
2. Complete **Phase 2: Foundational** — **CRITICAL, blocks all stories**
    (validator core, move vocabulary, error reporter, type mirror).
3. Complete **Phase 3: User Story 1** (log schema + validator, tests first).
4. **STOP and VALIDATE**: run `quickstart` Scenarios **1–3** — a complete stream passes; a silent
   approval, a gap, and a malformed line each fail **named**. This is the MVP: the factory-log
   contract a closed terminal would leave behind, proven without running a lane.

### Incremental Delivery

1. Setup + Foundational → **foundation ready**.
2. Add **US1** → validate S1–S3 → **MVP**.
3. Add **US2** → validate S4 (empty roadmap passes; committed program rejected) → the **Gate-0
   admission guard** now provable.
4. Add **US3** → validate S5 (strongest-model binding enforced) → the **P-II defense contract**
   provable.
5. Add **US4** → validate S6 (FiringReady is falsifiable) → the **handoff gate** to the first
   runtime row.
6. **Polish**: promote the index/README, run all scenarios, write the compliance note.
7. Each story adds value without breaking a prior one; **no** story runs a lane (SC-006) and the
   whole build stays **local-first / cloud-free** (P-VIII).

### Parallel Team Strategy

With multiple developers (still one lane at runtime — parallelism here is *authoring* only):

1. One role finishes Setup + Foundational (the shared core).
2. Once Foundational is done:
   - Developer A: **US1** (log validator)
   - Developer B: **US2** (roadmap validator)
   - Developer C: **US3** (gate-rail + roles) — then **US4** depends on A+B+C.
3. Stories integrate at **US4 / FiringReady** and the Phase-7 compliance note.

---

## Notes

- **[P]** tasks = different files, no dependency on an incomplete task.
- **[Story]** labels map each task to its user story for traceability.
- **Tests first**: write and *watch fail* before implementation (T008–T010 / T013–T014 /
   T018–T019 / T022).
- **Scope guard**: this slice delivers **planning contracts only** (Q1=C) — every task validates /
   promotes / wires a *stub*; **no task fires a lane or advances a gate** (SC-006), and the module
   graph pulls **no network** (P-VIII / SC-005).
- **Provenance**: canonical schemas / gate-rail / empty `ROADMAP.md` **already exist** under
    `specs/001-kiln-scaffold/contracts/`; the Setup/US tasks **promote** them to `kiln/`.
- **Commit after each task or logical group.** Stop at any checkpoint to validate the story
   independently.
- **Avoid**: vague tasks, same-file conflicts (only one writer per file per story), cross-story
    dependencies that break independence.
