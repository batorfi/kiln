# Feature Specification: Foundations reset (row r12)

**Feature Branch**: `009-kiln-foundations-reset`

**Created**: 2026-10-22

**Status**: **Draft — CLARIFIED (2026-10-22); ready for `/speckit.plan`.** NC1 and NC2 were resolved by the human on
2026-10-22 and each landed on the recommended option — see *Clarifications* below. Roadmap row **`r12`** was admitted as the **next row** at the Roadmap gate (`human@batorfi`,
2026-10-22T12:20:22Z, entry 1 of `gate0.note` in [specs/ROADMAP.md](../ROADMAP.md)). It stays `queued` — never `active` —
until its own first gate opens (`chain_unattended=false`). **Nothing here admits a program, advances a gate, decides a gate
or edits the roadmap** (constitution VI).

**Input**: the row **`r12`** — *"Foundations reset — the new codebase layout (packages: contracts, durable, record, lane,
workers, director, server, web, cli, checks), the legacy Pi extension frozen in legacy/, and the keep-list ported with its
tests green: standard flow and move kinds as data, schemas, validators, affinity scheduler, strongest-judge tier policy, the
never-vacuous network check; the legacy live-Pi suite skips with a printed reason on a Pi version it has not measured."*
Explainer: [`specs/explainers/r12-foundations-reset.md`](../explainers/r12-foundations-reset.md). PRD requirements carried:
**GATE-1, GATE-2, WORK-2, LANE-2, EVT-5 (validators)**; PRD §8.2 (layout) and §10 (what we keep).

**Provenance (what r12 builds on).** The first program's closed rows, all on `main`: r1 `002-kiln-lane`, r2
`003-kiln-roadmap-overlay`, r3 `004-kiln-live-walk`, r7 `006-kiln-live-inference`, r8 `007-kiln-pi-extension`, plus the
unclosed r9 work (`008-kiln-pi-ui`), retired on 2026-10-21. Measured on 2026-10-22: the suite runs **500 tests — 477 pass,
15 skip, 8 fail**, all 8 in the live-Pi tier because the installed Pi is **1.1.0** and the tier was measured against
**0.85.1**; the same 8 fail on `main`.

---

## Why this row exists

The restart (PRD §2) reorganises the repository around the new design — a durable task graph, an event record, a web
front door — while **keeping every rule the first program proved**. Every later row builds inside the layout this row
creates, so it comes first. It adds no new behaviour: it **moves, freezes and checks**. Its value is that the new codebase
starts with its guarantees already tested, and that the old one stays verifiable without anyone working in it.

Two facts shape it:

- **The kept code encodes the old law.** The move vocabulary still gives Code review `approve · restart` (constitution
  v2.0.1 adds `revise`), and the role policy still names `docs-synthesizer` as a line-of-defense judge (v2.0.1 removed it;
  the Documentation gate is unjudged). Porting it means updating it to v2.0.1 — while the first program's committed walks,
  made under v1.0.0, must stay verifiable (NC1).
- **The legacy code depends on the code being ported** (the walk, gate and lane modules import the scheduler, roles,
  clock and move vocabulary). How the two trees relate decides whether "frozen" can really mean unchanged (NC2).

## Clarifications

### Session 2026-10-22 (resolved by human@batorfi)

- **NC1 — Historical records versus the new rules.** The ported move vocabulary and role policy follow constitution v2.0.1;
  the committed walks (`fixtures/r7-*`, the r1–r8 evidence) were made under v1.0.0 and would fail a v2.0.1-only validator.
  **Resolved: option A — versioned flow definitions.**

  | Option | Answer | Implications |
  |---|---|---|
  | **A (recommended)** | **Versioned flow definitions.** The standard flow is data with a version: **v1** reproduces the first program's rail exactly; **v2** is constitution v2.0.1. A record is validated against the flow version it was made under; all new work uses v2. | History stays verifiable without rewriting it (matches "the record is never rewritten" and gate events carrying flow and gate versions — `the-record.md`); r15's replay of the old walks needs this anyway. One more concept in the contracts. |
  | B | **Port only v2; leave historical validation in `legacy/`.** The legacy validators keep checking the old walks until r15 replays them as events. | Simplest port; history is checked by frozen code, and the new validators cannot read old records until r15. |
  | C | **Migrate the fixtures** to the v2 vocabulary. | One rule set — but it rewrites committed evidence, which the program has refused to do since r1. Not recommended. |

- **NC2 — Moving or copying the kept code.** The keep-list is used by both the new packages and the frozen legacy code.
  **Resolved: option A — copy.**

  | Option | Answer | Implications |
  |---|---|---|
  | **A (recommended)** | **Copy.** `legacy/` keeps a byte-identical, frozen copy of everything it uses; the ported copies in the packages evolve to v2.0.1. | "Frozen" really means unchanged; legacy tests keep passing untouched; v2.0.1 changes cannot break legacy. Cost: duplicated source until legacy is retired, recorded as such. |
  | B | **Move, and let legacy import from the packages.** | One home for each module — but every v2.0.1 change (Code review `revise`, three judges) changes legacy behaviour and breaks its tests, so legacy is no longer frozen. |

## User Scenarios & Testing *(mandatory)*

The users of this row are **the engineers who build KILN** — everyone who will work on r13 onwards — and the **reviewers**
who decide its gates.

### User Story 1 — Work in the new layout, with the kept rules already proven (Priority: P1)

An engineer opens the repository to start r13. The code is organised into the packages the PRD describes, each with a
stated responsibility; the rules the first program proved — the move vocabulary, the strongest-judge policy, the affinity
scheduler, the schemas and validators, the deterministic clock — are in their new homes, and their tests pass there.

**Why this priority**: every later row builds here; a wrong or untested foundation would be inherited by all of them.

**Independent Test**: run the suite on a fresh clone; every kept test runs from its new location and passes, and the count
of kept test cases is at least the count before the move.

**Acceptance Scenarios**:

1. **Given** a fresh clone with the supported Node version, **When** the engineer runs the default test command, **Then** every
   ported test runs from its package and passes, and the run reports a non-zero number of tests.
2. **Given** the PRD's package list, **When** the engineer looks for a responsibility (for example "the affinity scheduler"),
   **Then** it lives in exactly the package the PRD names, and that package states its responsibility in one place.
3. **Given** the first program's 73 kept test cases (contract, negative, network-scan, scheduler, switch-cost), **When** the
   port is complete, **Then** none has been dropped, and any whose expectation changed did so only because of a recorded
   constitution v2.0.1 rule.

---

### User Story 2 — The old code is frozen, and still verifiable (Priority: P1)

A reviewer wants proof that nothing of the first program was lost or silently changed. The Pi extension, the terminal UI
layers and everything not yet ported sit under `legacy/`, unchanged; their tests still run; and the live-Pi tier, instead
of failing on a Pi version it never measured, skips with a printed reason.

**Why this priority**: the restart promises that history is kept and that legacy work stops — both must be checkable.

**Independent Test**: compare `legacy/` with the pre-move tree; run the default suite on a host with an unmeasured Pi.

**Acceptance Scenarios**:

1. **Given** the tree before the move, **When** the legacy tree is compared with it, **Then** every legacy file is
   byte-identical to its original (only its location changed), and the comparison is itself a test.
2. **Given** Pi 1.1.0 installed (measured version 0.85.1), **When** the default suite runs, **Then** the live-Pi tests skip,
   each printing the installed and the measured version, and no live-Pi test fails.
3. **Given** Pi 0.85.1 installed, **When** the Pi tier is demanded, **Then** the live-Pi tests run as before.
4. **Given** the Pi tier is explicitly demanded on an unmeasured Pi version, **When** it runs, **Then** it fails by name
   (*pi-version-unmeasured*) rather than skipping — a demanded tier is never silently skipped.

---

### User Story 3 — The flow and the judges as data, under constitution v2.0.1 (Priority: P2)

An engineer building r14 needs the default flow — the Roadmap gate and nine feature gates — and each gate's moves as data,
matching constitution v2.0.1, and the role policy that binds every judge to the strongest model.

**Why this priority**: r14 executes this data; it must be right before anything walks it.

**Independent Test**: query the flow data for each gate's question, moves and judge; check them against the constitution
and the PRD.

**Acceptance Scenarios**:

1. **Given** the flow data, **When** it is read for the Code review gate, **Then** its moves are `approve · revise · restart`;
   Implementation `approve · split+revise`; Verification `approve · reject` with a fix-round cap of 2; Merge
   `approve · reject`; the Roadmap gate's row edits; and only the closed set of move kinds appears anywhere.
2. **Given** the role policy, **When** a judge role (architecture critic, code reviewer, verifier) is bound to a model weaker
   than the strongest available, **Then** the binding is refused by name; `docs-synthesizer` is not a judge.
3. **Given** a record made by the first program (for example the committed r7 walk), **When** it is validated, **Then** it is
   judged against flow v1, the version it was made under, and passes; a new record is judged against v2.
4. **Given** the ten gates, **When** their names are read, **Then** they are the plain names of GATE-1 with internal ids
   unchanged (`gate0`, `1-concept` … `9-pr`).

---

### User Story 4 — `kiln check` proves a run makes no outbound connection (Priority: P2)

An engineer runs `kiln check` to prove that local-only work stays on the machine. The first program's hardened network
scan — the one that cannot pass vacuously — runs through the new command, with its allowlist taken from configuration.

**Why this priority**: local-by-default (constitution VIII) must be provable from the first row of the new codebase.

**Independent Test**: run `kiln check` on a clean run and on a run that attempts a disallowed connection.

**Acceptance Scenarios**:

1. **Given** a run that contacts only loopback, **When** `kiln check` runs the network check, **Then** it passes and says
   what it observed.
2. **Given** a run that attempts a connection outside the allowlist, **When** the check runs, **Then** it fails, naming the
   destination.
3. **Given** a check that observed nothing at all (no run, no capture), **When** it completes, **Then** it fails — a check
   that saw nothing never passes.

---

### User Story 5 — Package boundaries are checked, not hoped for (Priority: P3)

A reviewer at a later row wants confidence that the dependency direction of PRD §8.2 holds — `contracts` pure with no I/O,
and the seam rules (only `durable` imports Pi Durable, only `workers` imports `pi-ai`, only `lane` talks to Ollama's
management API, only `server` and `host` open listeners) — without reading every import.

**Why this priority**: boundaries erode silently; a check now is cheap and every later row benefits.

**Independent Test**: add a forbidden import in a scratch change; the check fails by name.

**Acceptance Scenarios**:

1. **Given** the packages, **When** the boundary check runs, **Then** it passes and lists the rules it checked.
2. **Given** a package that imports from a package later in the dependency direction, or `contracts` performing I/O,
   **When** the check runs, **Then** it fails, naming the file and the rule.

### Edge Cases

- **A kept test depended on its old location** (a relative path, a fixture lookup): it must be fixed to resolve from its
  own module, never by keeping a copy of the old tree around.
- **A legacy module imports kept code**: it imports its own frozen copy (NC2-A); it must never import from the new packages,
  and a boundary check says so.
- **The two copies drift on purpose**: the legacy copy never changes, the ported copy follows v2.0.1. The duplication is
  recorded (which files, since which commit) and ends when legacy is retired.
- **A run that executes zero tests** must still fail, as today, from the new layout too.
- **The empty shipped `ROADMAP.md` fixture** (`kiln/ROADMAP.md`) and the firing-ready probe that reads it move to legacy
  together; the admitted program stays at `specs/ROADMAP.md` and is untouched by this row.
- **Pi not installed at all**: the live-Pi tier skips with its existing reason, as today.
- **A future Pi version measured later**: adding it to the measured list re-enables the tier without code changes.

## Requirements *(mandatory)*

### Functional Requirements

**Layout**
- **FR-001**: The codebase MUST be organised into the packages of PRD §8.2 needed now — `contracts`, `record`, `durable`,
  `lane`, `workers`, `director`, `server`, `web`, `cli`, `checks` — each stating its single responsibility; packages that later
  rows add (`knowledge`, `workshop`, `team`, `explore`, `editor`, `host`, `bench`) MAY be created empty or later.
- **FR-002**: The supported runtime MUST stay as today (Node `^22.18.0 || >=23.6.0`, TypeScript run directly, no build step),
  and the row MUST add **no runtime dependency** (Pi Durable and `pi-ai` arrive in r42/r13 and r16).
- **FR-003**: There MUST be one way to run the whole suite from any working directory, and it MUST refuse a run that executed
  no tests (the existing runner's guarantee).

**Legacy**
- **FR-004**: The whole first-program tree MUST live under `legacy/`, byte-identical to its pre-move original — including a
  frozen **copy** of every module that is also ported (NC2-A) — with no feature work there; a test MUST prove the byte-identity
  against the pre-move tree, and a record MUST list the duplicated files.
- **FR-005**: Legacy tests MUST keep running in the default suite until their code is retired.
- **FR-006**: The live-Pi tier MUST skip, printing the installed and measured versions, when the installed Pi version is not in
  its measured list; when the tier is demanded explicitly it MUST fail by name instead of skipping.

**The keep-list (PRD §10.1)**
- **FR-007**: The standard flow MUST be data and **versioned**: **v1** reproduces the first program's rail exactly (for verifying
  its records); **v2** is constitution v2.0.1 — ten gates with GATE-1's plain names and one question each, internal ids unchanged.
  All new work uses v2.
- **FR-008**: Each gate MUST offer only its own moves from the closed set of move kinds (approve, revise, reject, restart,
  split+revise, mitigate, and the Roadmap gate's row edits), per GATE-2 and constitution v2.0.1 — including Code review
  `approve · revise · restart`.
- **FR-009**: The role tier policy MUST bind every judge role — architecture critic, code reviewer, verifier, and any judge on
  an added gate — only to the strongest model, refusing a weaker binding by name (WORK-2, constitution II).
- **FR-010**: The affinity scheduler MUST be ported with its behaviour unchanged: a swap only on a genuine tier change, every
  swap priced and recorded (LANE-2, constitution IV).
- **FR-011**: The factory-log and roadmap schemas, the log and roadmap validators and their report formatting MUST be
  ported, and the validators MUST run on the factory-log as before (EVT-5, validators part).
- **FR-012**: A record MUST be validated against the flow version it was made under (NC1-A): the first program's committed walks
  against v1, new records against v2; a record that names no version is treated as v1; nothing in a committed record is rewritten.
- **FR-013**: The deterministic clock MUST be ported for replays.
- **FR-014**: The committed real walks (`fixtures/r7-*`) MUST be kept as regression fixtures, unmodified.
- **FR-015**: Every ported module MUST travel with its tests; no kept test case is dropped, and any changed expectation MUST
  cite the constitution v2.0.1 rule that changed it.

**Checks**
- **FR-016**: `kiln check` MUST run the hardened network scan with its allowlist taken from configuration; it MUST fail by name on
  a disallowed destination and MUST fail when it observed nothing.
- **FR-017**: A boundary check MUST enforce PRD §8.2's dependency direction and seam rules, failing by file and rule.
- **FR-018**: Every check MUST fail by its own name when its condition is not met (the `*-ready` pattern).

**Contracts and records**
- **FR-019**: The legacy gate-rail contract MUST be superseded by a contract matching constitution v2.0.1 in the `contracts`
  package; the legacy file stays with the legacy probe that reads it.
- **FR-020**: The PRD's WORK-2 was corrected on 2026-10-22 to drop `docs-synthesizer` as a judge, matching constitution
  v2.0.1; this row MUST implement the corrected requirement.
- **FR-021**: The row MUST leave the admitted program (`specs/ROADMAP.md`) unchanged and MUST NOT record any gate decision.

### Key Entities

- **Package** — a unit of the new layout with one responsibility and a place in the dependency direction.
- **Legacy tree** — the frozen first-program code and tests, byte-identical to their originals.
- **Keep-list item** — a module (with its tests) ported from the first program: move vocabulary, gate rail, roles and tiers,
  scheduler, clock, schemas, validators, network scan, committed walks.
- **Flow definition** — the standard flow as data: gates, names, questions, moves, judges, fix-round cap; versioned if NC1-A.
- **Move kind** — one of the closed set, with its fixed consequence; labels may vary, kinds may not.
- **Role tier policy** — which roles are judges and the rule that judges bind only to the strongest model.
- **Check** — a named, falsifiable probe (network, boundaries, legacy byte-identity) that fails by its own name.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a fresh clone, the default suite reports **0 failures** on a host with an unmeasured Pi (today's 8 live-Pi
  failures become named skips), and **0 failures** on a host with the measured Pi.
- **SC-002**: The number of kept test cases after the port is **at least 73** (the pre-move count in the kept directories),
  and every legacy test that passed before still passes.
- **SC-003**: **100%** of legacy files are byte-identical to their pre-move originals, proven by a test.
- **SC-004**: The flow data matches constitution v2.0.1 for **all ten gates** — names, moves and judges — checked by a test
  that reads the constitution's move-kind list and the PRD's GATE-1/GATE-2.
- **SC-005**: A judge bound to a weaker model is refused in **100%** of the negative cases, and `docs-synthesizer` is never
  accepted as a judge.
- **SC-006**: `kiln check` detects **every** disallowed destination in its negative suite and fails when it observed nothing.
- **SC-007**: The boundary check catches **every** forbidden import in its negative suite.
- **SC-008**: The first program's committed walks validate **unchanged** against flow v1, and the same walks fail flow v2 by
  name (*flow-version-mismatch*) — proving the two versions differ where constitution v2.0.1 says they do.

## Assumptions

- The new layout lives where PRD §8.2 places it: `kiln/packages/…`, with `kiln/legacy/`, `kiln/checks/`, `kiln/fixtures/` and
  `kiln/agents/` beside it; the plan may refine names, not responsibilities.
- "Adapt" items of PRD §10.2 (the gate primitive, the lane, the log writer, the Ollama residency code, the state reducer, the
  readiness probes, the Pi RPC driver, the scripted walks) stay in `legacy/` in this row and are adapted by the rows that need
  them (r13–r16, r19).
- The measured Pi versions list starts as `[0.85.1]`; re-measuring against Pi 1.1.0 is a later legacy chore, not part of r12.
- No user-visible surface is added; `kiln check` is the only new command, and its output is text.
- The spec's success is verified offline; the live Ollama and Pi tiers remain optional, skipping with printed reasons.

## Out of Scope

- The Pi Durable seam, task types and gate contract (r42, r13); executing the flow (r14); the event record (r15); real
  workers (r16); configuration files (r17) — beyond the data and policies this row ports.
- Any change to `specs/ROADMAP.md`, the constitution, or a gate's state.
- Re-measuring the legacy live-Pi tier on Pi 1.1.0.
