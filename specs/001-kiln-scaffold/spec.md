# Feature Specification: KILN Scaffold — the pre-lane planning foundation

**Feature Branch**: `001-kiln-scaffold`

**Created**: 2026-09-12

**Status**: Draft

**Input**: User description: "I approve the constitution. Now prepare for the
implementation."

**Scope resolution (from 001 clarifications):**
- **Q1 = C — Planning artifacts only.** This feature delivers the *contracts and
   schemas* the rest of the build runs on — the **factory-log schema + validator**
   and the **ROADMAP.md schema** (plus the gate-rail *contracts* needed to define
   them) — and ships an **empty** ROADMAP.md for Gate 0 to fill. Per the
  clarifier, it does **no runtime lane / gate / UI wiring** and runs **no feature
 walk**; later rows build the runtime against these contracts.
- **Q2 = A — Empty ROADMAP.md.** The scaffold ships ROADMAP.md as a *schema*
  artifact with **zero approved rows / no committed program**; the director's
  first job at Gate 0 (a later row) is to author the program.

> **Context.** The KILN **constitution is ratified** (`constitution.md`, v1.0.0)
> and its deferred follow-up names the first artifacts: the runtime repo shape and
> the `ROADMAP.md` deliverable. This feature is the *pre-lane preparation* — but
> scoped, per Q1=C, to the **planning contracts** that make Gate 0 and the
> factory-log expressible **before any lane fires**. Gate 0 (human-only) sits
> *below/behind* this: nothing here advances a gate or runs a lane (Principle VI —
> Gate 0 is human-only *always* — and the C boundary forbid the scaffold from
> implementing or auto-advancing anything).
>
> This spec is written for the **human operator** who admits the program and for
> the **line-of-defense reviewers / verifier** who judge the contracts. It states
> *what* each artifact must express and *why*, per KILN principle I (author /
> judge separation — the scaffold *declares*, a later row *judges* and *runs* it)
> and the constitution's governance clause (every downstream gate verifies
> constitution compliance; the log schema is part of that evidence).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Define the factory-log schema and a validator (Priority: P1)

The operator and the downstream builder need one durable, greppable record of
**everything** the factory will do — every state transition, gate completion,
human decision, and cost number — and a way to check that such a record is
complete. This story delivers the **log schema** (the record shapes and fields)
and a **validator**, defined so a later runtime can emit into it.

**Why this priority**: Per Principle VII the log is *the* system of record and
the constitution-compliance evidence; no runtime row can be judged without the
shape of its audit trail already fixed. It is the single most load-bearing
contract in the scaffold.

**Independent Test**: With **no runtime present**, feed the validator two
candidate streams — a **complete, gap-free, well-formed** one and a **malformed
or gap** one — and check verdicts. No lane fires; only the schema and validator
are exercised.

**Acceptance Scenarios**:

1. **Given** the complete set of lane/gate/decision/cost transitions a walk would
   produce, **When** they are assembled into a stream and validated, **Then** the
   validator **passes** it as complete and gap-free.
2. **Given** a stream missing a required transition or carrying a malformed
   record, **When** validated, **Then** it **fails** and names *which*
   transition/record and *why*.
3. **Given** the log schema, **When** inspected, **Then** it can express every
   record type Principle VII lists — transition, gate completion, human decision,
   cost number (rail / resident model / **switch count** / wall-clock), the
     `WAIT` record (resume token + deadline), and the
    **"auto-approved under pre-delegation"** tag — with no required field
   missing.

---

### User Story 2 — Define the ROADMAP.md schema and ship an empty artifact (Priority: P1)

Gate 0 admits *the program* before any row fires, and the program is a written,
reviewed artifact — `ROADMAP.md`. This story delivers the **ROADMAP.md schema**
(rows, ordering, dependencies, per-row status, closing PR, and the Gate-0
approval record) and ships an **empty** artifact to it, per Q2=A.

**Why this priority**: Gate 0 (Principle VI, the most expensive decision) must
have a *shape* to decide on. Without the schema, there is nothing for Gate 0 to
approve and nothing for a later row to fill. P1 alongside the log because the two
contracts are one slice.

**Independent Test**: Load the shipped ROADMAP.md and validate it against the
schema. Confirm it **passes** as a well-formed *empty* program and that it
**contains zero approved rows and no committed ordering** — i.e. the program
exists as a blank slate, not a pre-decided one.

**Acceptance Scenarios**:

1. **Given** the ROADMAP.md schema, **When** the shipped empty artifact is
   validated, **Then** it passes and exposes **0 approved rows / 0 firing
    ordering**, with the row shape (id / short / deps / status / outcome) and the
   Gate-0 record (status / rows / decided_by / at / note) all present-but-empty.
2. **Given** a dependency edge (row r3 depends on r2), **When** the schema is
   read, **Then** it can represent *eligibility* — "a row becomes current only
     when its deps are `done`" — without itself declaring any row current.
3. **Given** an attempted program that commits an **approved** ordering into the
   shipped artifact, **When** validated, **Then** it is **rejected**: the empty
   artifact carries **no** human-decided program (Gate 0, not the scaffold, is
     the only admission — Principle VI).

---

### User Story 3 — Declare the gate-rail contracts the log and roadmap depend on (Priority: P2)

The log and the roadmap only make sense against a fixed **gate vocabulary**. This
story delivers the **contract declarations** that a later runtime row will
implement: the **Gate-0-vs-gate** distinction; the **per-gate move sets**
(including the three special cases); and the **role classification** (line-of-
defense vs work, with the strongest-model intent). Nothing is *wired*; these are
the contract the runtime will be judged against.

**Why this priority (P2)**: The runtime row can build faster and be judged
consistently when the moves, role tiers, and gate/gate0 split are already fixed
in writing. It is P2, not P1, because the log *shape* (US1) and the roadmap
*shape* (US2) stand even before these declarations are final — but they are
needed for any runtime to be *compliant*.

**Independent Test**: Independently of any runtime, check each contract is present
and self-consistent: the per-gate move sets match the constitution's rail; the
four line-of-defense roles are declared bound to the strongest model; a
substitution of a weaker model on any of them is *expressible as an error*.

**Acceptance Scenarios**:

1. **Given** the declared per-gate move vocabulary, **When** checked against the
   rail, **Then** standard gates carry `Approve/Revise/Reject`;
    **Checkpoint** carries `Split + Revise` and **no `Reject`**; **Review**
   carries `Approve/Restart` (**no `Revise`**); **Verification** carries
    `Approve/Reject` with **bounded auto-mitigation (≤ 2 rounds)** then a human
     `WAIT`.
2. **Given** the role classification, **When** inspected, **Then** the four
   line-of-defense roles (Architecture Critic, Verifier / Diagnosis, Code
    Reviewer, Docs Synthesizer) are declared bound to the **strongest resident
 model, on every substrate including the local one**, and a weaker substitution
   for any of them is expressible as a configuration error (Principle II).
3. **Given** the state vocabulary, **When** read, **Then** `gate0` (the
   program-gate *between* rows) and `gate` (one row's live Gates 1–9) are
    **distinct** and never conflated.

---

### User Story 4 — A "firing-ready" check that the contracts are complete (Priority: P3)

A later row must be able to answer, *before it starts building the runtime*,
"are the log schema, the roadmap schema, and the gate contracts complete enough to
build against — and constitution-compliant?" This story provides that
**FiringReady check**: a static gate-check over the three contracts.

**Why this priority (P3)**: Valuable as a handoff gate between "plan" and
"first runtime row," but it depends on US1–US3 being done; on its own it proves
nothing. P3.

**Independent Test**: Run the check with (a) a complete contract set → **pass**;
(b) one contract left incomplete (e.g. the `WAIT` record type omitted, or a
line-of-defense role missing its strongest-model binding) → **fail** naming the
gap.

**Acceptance Scenarios**:

1. **Given** a complete, mutually-consistent contract set (US1+US2+US3), **When**
   FiringReady runs, **Then** it passes and emits a traceability note mapping
   each contract to the constitution principle(s) it encodes.
2. **Given** a contract set missing one required element, **When** FiringReady
   runs, **Then** it fails and **names the specific missing element**.

---

### Edge Cases

- **Empty / unsupplied program.** The shipped ROADMAP.md (Q2=A) must be a valid
  *blank*: zero approved rows, expressible dependencies, no committed ordering.
- **Malformed or gap log stream.** The validator must fail it with a *named*
  reason, distinguishing "missing transition" from "malformed record."
- **Approval without a human move.** No log record may express a gate `approved`
  without a recorded human move or a **distinct** pre-delegation entry; the
  `WAIT` record is the only shape a headless gate may take.
- **Weaker model at a line-of-defense slot.** Must be expressible as a
  configuration error; the strongest-model intent is declared on every
  substrate, including the local one.
- **Pre-delegated (unattended-trail) gate.** Its record must be a **distinct
  ledger entry** (`auto-approved under pre-delegation`, reviewing model, "no
   objections" note), distinguishable from a keyboard-human decision.
- **Closed terminal.** Because everything is reconstructable from the log schema,
   a partial walk is reconstructable to the exact gate/cost it reached; no shape
   may be lost to a close.
- **Cloud reference.** No contract may require a cloud round-trip; a missing
   outside resource (e.g. web) must be expressible as a *flagged, non-blocking*
  record (Principle VIII).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The scaffold MUST deliver the **factory-log schema** — the record
  shapes and fields for **every** transition, gate completion, human decision, and
  cost number (rail, resident model, **switch count**, wall-clock), including the
  **`WAIT` record** (resume token + deadline) and the
  **"auto-approved under pre-delegation"** tag — defined completely and
  unambiguously (Principle VII).
- **FR-002**: The scaffold MUST deliver a **log validator** that **passes** a
  complete, gap-free, well-formed stream and **fails** a stream missing a needed
  transition or carrying a malformed record, naming *which* and *why*.
- **FR-003**: The log schema MUST make the **no-silent-approval invariant**
  expressible: a gate `approved` record MUST require a recorded human move **or**
  a **distinct** pre-delegation entry; a `WAIT` record MUST be the only shape an
  unresolved gate may take (Principle V).
- **FR-004**: The scaffold MUST deliver the **ROADMAP.md schema** — rows
   (`id / short / deps / status / outcome`), `ordering`, and the Gate-0 record
   (`status / rows / decided_by / at / note`) — and MUST ship an **empty
    artifact** to it (Q2=A).
- **FR-005**: The ROADMAP schema MUST enforce that **Gate 0 is the only admission
  of the program**: the shipped artifact contains **zero approved rows and no
   committed ordering**, while remaining able to *express* dependency-gated
   eligibility (Principle VI).
- **FR-006**: The scaffold MUST deliver the **gate-rail contract declarations**:
  the **Gate-0-vs-gate** distinction; the **per-gate move set** (standard
    `Approve/Revise/Reject`; **Checkpoint** = `Split + Revise`, no `Reject`;
   **Review** = `Approve/Restart`; **Verification** = `Approve/Reject`, ≤ 2
   auto-mitigation rounds then human `WAIT`); and the **role classification**
  (four line-of-defense roles bound to the strongest model; work roles bounded by
  the far gate).
- **FR-007**: The scaffold MUST provide a **FiringReady check** — a static
  validation that the log schema, the ROADMAP schema, and the gate contracts are
  mutually consistent and complete enough for a later runtime row to build
  against — which **must not itself run any lane or advance any gate**.
- **FR-008**: Every schema and contract MUST be **local-first and cloud-
  independent** (Principle VIII): no artifact may require a cloud round-trip, and
  a missing outside resource MUST be expressible as a **flagged, non-blocking**
  record.
- **FR-009**: Each schema and contract MUST carry a **constitution
  traceability note** naming the principle(s) it encodes (Principle I, VII,
  governance), so a downstream gate can verify compliance.
- **FR-010**: The scaffold as delivered MUST **advance no gate and run no lane**;
  it is a *planning / contracting* artifact set only (the Q1=C boundary), and MUST
  not implement, wire, or auto-advance any runtime behavior.

### Key Entities

- **Factory-log record**: one durable, time-stamped, greppable entry; types are
  *transition / gate-completion / human-decision / cost / `WAIT` /
  pre-delegation-tag*. The system of record and the compliance evidence
   (Principle VII).
- **Log validator**: the contract that accepts a complete/gap-free/well-formed
  stream and rejects the rest with a named reason.
- **Roadmap / RoadmapRow → ROADMAP.md**: the deliverable's *ordered firing
  program* as a written, reviewed artifact; each row = one full Gates 1–9 lane,
  names its `deps`, and carries a status and (when done) its closing PR. Shipped
  **empty** (Q2=A); human-authored at Gate 0.
- **Gate contract**: the declaration of `gate` (one row's live Gates 1–9) vs
  `gate0` (the program gate *between* rows), and the per-gate move vocabulary.
- **Role classification**: line-of-defense (Architecture Critic, Verifier /
  Diagnosis, Code Reviewer, Docs Synthesizer — strongest model, always, every
  substrate) vs work roles (a tier bounded by the gate on the far side).
- **FiringReady check**: a static completeness check over the three contracts; the
  handoff gate between "plan" and "first runtime row."
- **`FactoryState`/surface fields** (roadmap / current / gate0 / resident /
  running / queue / switches / wall-clock): **referenced by the log schema to fix
  its shape**, not implemented as a runtime state store in this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **100%** of the record types Principle VII requires (transition,
  gate completion, human decision, cost, `WAIT`, pre-delegation tag) are
  represented in the log schema; the validator returns the *correct* verdict
  (pass/fail-with-reason) on **100%** of a fixed suite of candidate streams
   (complete / gap / malformed).
- **SC-002**: **0** log records express a gate `approved` without either a
  recorded human move or a **distinct** pre-delegation entry — verifiable by
  inspection of the schema's allowed record shapes (the static analogue of the
  no-silent-approval contract).
- **SC-003**: The shipped ROADMAP.md validates against its schema and contains
  **0 approved rows and 0 committed ordering**; **0** schema/contract references
  any cloud endpoint or outbound dependency (Principle VIII).
- **SC-004**: **100%** of the gate-rail invariants of Principles I, II, and IX
  are encoded in the gate contracts — the checkpoint `Split+Revise/no-Reject`,
  review `Approve/Restart`, verification `≤ 2` mitigation, the `gate`/`gate0`
  split, and the four line-of-defense strongest-model bindings.
- **SC-005**: The FiringReady check is **falsifiable** — it passes only when all
  three contracts are complete and mutually consistent, and fails naming the
  missing element when exactly one is omitted.
- **SC-006**: **0** gate advances and **0** lane runs occur in producing this
  feature — the scaffold advances nothing (Q1=C; Principle VI), verifiable by
  inspection that it contains no execution/advance path.

## Assumptions

- **Substrate.** KILN is a single-lane, gate-railed, locally-served
   (Ollama-style) factory on the pi coding-agent **harness**, with no cloud
   dependency (constitution Principles III, VIII). This feature fixes the
   *contracts* the substrate's log and roadmap must have; the substrate's UI and
   lane *runtime* are out of scope.
- **Guidance vs. law.** The runtime concept docs (`docs/concepts/`) are guidance;
  the ratified **constitution governs** where they disagree. Where a doc is
   "draft/pre-implementation," this feature treats its **invariants** as binding
   and its **module/file names and UI primitives as not** — those belong to later
   runtime rows.
- **Scope of "prepare for the implementation" (Q1=C).** "Prepare" = the **planning
  contracts and schemas** (log + validator, ROADMAP.md schema, gate-rail
  contracts, FiringReady check). **No runtime lane / gate / UI wiring, no smoke
   walk, no advancing of any gate** — all deferred to later rows.
- **First ROADMAP.md (Q2=A).** Shipped **empty**: zero approved rows, no committed
  program; the director's first Gate-0 job (a later row) is to *author* it.
- **Model availability.** Local models are the operator's concern; per Principle
  VIII a missing outside resource (e.g. web) is **flagged, not blocking**, and the
  schema must be able to express that flag.
- **Role & UI bodies deferred.** Only the role **classification/contract** and the
  `FactoryState` field **shape (for the log)** are in scope; role bodies, the UI
  layers' rendering, the event-driven redraw, and the headless-print twins'
   *runtime* are out of scope (later rows).
- **Dates.** Constitution ratification and this spec date are taken as
  2026-09-12 (repo install manifest + system clock).

## Out of Scope

- Any **runtime lane / gate / UI execution**, event-driven redraw, or **smoke
  walk** that fires a feature or advances a gate (Q1=C).
- The **bodies** of individual roadmap-row features and the full **role SKILL
  bodies** — later fires.
- Authoring the **first program's content** (the actual roadmap rows / ordering /
  dependencies) — Gate 0 does this at kickoff; this feature ships the *empty*
  artifact and *schema* (Q2=A).
- Any **cloud backend** or **web dashboard** (KILN has none).
- Resolving the UI **implementation spikes** (overlay lifetime, keymap,
  confirm-vs-select) and the exact **module/file layout** — later runtime rows.

## Traceability to the Constitution

- **Principle I (author / judge sep.)** → FR-003/FR-005/FR-010 (the scaffold
  *declares*; a later row *judges* and *runs*; nothing self-advances) — US1/US2.
- **Principle II (strongest defense)** → FR-006/FR-009 (line-of-defense
  classification bound to the strongest model), SC-004 — US3.
- **Principle III (one lane / director-scheduler)** → FR-006 (contracts encode the
  single-lane shape) — US3.
- **Principle IV (affinity swap only on tier change)** → the switch-count field in
  the FR-001 cost record, fixed for the later runtime to honor.
- **Principle V (headless never silently approves)** → FR-003/FR-008 (`WAIT` is
  the only unresolved-gate shape; no-silent-approval made expressible), SC-002 —
  US1.
- **Principle VI (Gate 0 human-only, always)** → FR-005/FR-010 (empty roadmap,
  no committed program, no advance), SC-003/SC-006 — US2/US4.
- **Principle VII (everything in the log)** → FR-001/FR-002/FR-004, SC-001/
    SC-005 — US1/US4.
- **Principle VIII (local-first)** → FR-008/SC-003 — edge cases.
- **Principle IX (three layers, event-driven, no server)** → the `FactoryState`
   field shape is fixed *for the log* here; the runtime realization is deferred,
  with the no-server invariant reserved (SC-006/§ Out of Scope).
