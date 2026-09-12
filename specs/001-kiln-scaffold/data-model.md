# Data Model: 001-kiln-scaffold

**Feature**: [spec.md](./spec.md) · **Research**: [research.md](./research.md)

Phase 1: the entities the contracts are built on, their fields, relationships,
validation rules, and state transitions. Q1=C scope — these are the *shapes* the
log validator and FiringReady check consume; the runtime that *populates* them is
a later row.

---

## Entity 1 — Factory-log record (one JSONL line)

The system of record (Principle VII) and headless-contract evidence (Principle V).
One JSON object per JSONL line; every record carries a `ts`.

**Field set (union; each `recordType` constrains its own fields):**

| field | type | appears in | notes / validation |
|-------|------|-----------|--------------------|
| `recordType` | enum | all | `transition` · `gate-completion` · `human-decision` · `cost` · `wait` · `pre-delegation` |
| `ts` | ISO-8601 string | all | monotonic, non-decreasing within a stream |
| `seq` | integer | all | strictly increasing; gaps = missing transition |
| `transition` | object | `transition` | `{ kind: load\|hold\|yield\|swap, from?, to?, reason? }` |
| `gate` | object | `gate-completion` | `{ gateId: gate0\|1..9, move }` where `move ∈ MoveVocabulary(gateId)` |
| `decidedBy` | string | `gate-completion`, `human-decision` | `human@token` (required) — **never empty at a decision record** |
| `artifact` | string (path) | `gate-completion` | e.g. `ROADMAP.md`, `concept.md` |
| `models` | object | `gate-completion`, `cost` | `{ producer?: tier, judge?: tier }` |
| `preDelegation` | object | `pre-delegation` | `{ of: gateId, by: spec#, at: ts, reviewer?: model, note: "no objections" }` |
| `cost` | object | `cost`, all `gate-completion` | `{ switches: int ≥ 0, wallClock: "HH:MM" }` |
| `wait` | object | `wait` | `{ gate: gateId\|n, token: g<id>, deadline: ts }` — **no** `approved` here |
| `note` | string | many | human-readable one-liner |

**Validation rules:**
- `R1 (well-formed)` — non-blank lines parse as JSON and match the record schema;
  a blank line is allowed (kept for stream hygiene) but contributes no record.
- `R2 (ordering)` — `seq` strictly increasing and gap-free; `ts` non-decreasing.
- `R3 (no-silent-approval, Principle V)` — **a `gate-completion` with
   `move = approve`/`restart`/merge MUST have a non-empty `decidedBy: human`**
  *or* be paired with a **distinct** `pre-delegation` record for the same
   `gateId`. Unresolved gates appear **only** as a `wait` record (never as a
   silent `approved`).
- `R4 (pre-delegation distinctness)** — a `pre-delegation` record is a *separate*
   ledger entry from a `human-decision`; both forms of "approved" are
   distinguishable (the factory-log can tell *which* a gate ran through).
- `R5 (local-first, Principle VIII)** — no record may carry a cloud/remote
   endpoint dependency; an `unavailable-resource` flag is a *valid, non-blocking*
  record shape.
- `R6 (traceability, FR-009)** — each record schema and the roadmap head carry a
   `trace` note naming the constitution principle(s) it encodes.

**State transitions (record-level, what a stream's sequence implies):**
`wait` (gate open) → `human-decision` (`decidedBy: human`) →
`gate-completion`, **or** `wait`/`pre-delegation` → `gate-completion`
(**the auto-approved path**). A `cost` record brackets transitions; a
`transition.kind = swap` implies a `cost.switches` increment.

---

## Entity 2 — Roadmap (`kILN/ROADMAP.md`)

The deliverable's *firing program* as a **persisted head + projected table**
(research §E). Shipped **empty** (Q2=A).

### 2a. Roadmap head (structured YAML; schema-validated)

| field | type | validation |
|-------|------|-----------|
| `deliverable` | string (id + name) | required |
| `owner` | human-id | required |
| `updated` | ts | required, monotonic |
| `rows` | `RoadmapRow[]` | present; the **empty** artifact has `rows: []` |
| `ordering` | `string[]` of row ids | must reference only existing row ids; **empty / none committed** in the shipped artifact |
| `chain_unattended` | boolean | default **false** |
| `gate0` | `Gate0` | the approval record; **`status: pending`** in the shipped artifact |
| `trace` | string | principle(s) encoded (FR-009) |

### 2b. RoadmapRow

| field | type | validation |
|-------|------|-----------|
| `id` | string (`r1`, `r2`, …) | unique within a roadmap |
| `short` | string | one-line human description |
| `deps` | `string[]` | each must name an existing row id; **`deps` cycle-free** |
| `status` | enum | `queued` · `active` · `revising` · `done` · `aborted` |
| `outcome` | string (`@PR#NN`) | **present iff `status = done`** (else absent) |
| `gate` | int (1..9) | **present iff `status = active`** (the in-flight row's live gate) |
| `spec` | string (path) | optional cross-ref to the row's lane |

**Roadmap validation rules:**
- `M1` — every `deps`/`ordering` id resolves to an existing row; no cycles.
- `M2 (dependency-gated eligibility)** — a row *eligible to fire* ⟺ all its
   `deps` are `done`; the schema *expresses* eligibility but the shipped artifact
   commits **no** firing decision.
- `M3 (Gate 0 = sole admission, Q2=A / Principle VI)** — the shipped artifact has
   `gate0.status: pending`, `rows: []` (or unapproved draft rows), and `ordering`
   **not committed**; **any** `gate0.status: approved` or committed ordering is
   **rejected** by validation (that is Gate 0's move, not the scaffold's).
- `M4 (projection invariant)** — the rendered table (if present) must equal a
   re-render of the head; a drifting table is a validation failure.

---

## Entity 3 — Gate contract (the rail)

A *declaration* (not a runtime), per research §D. Lives at
`kiln/contracts/gate-rail.md` + `kiln/schemas/gate-rail.schema.json`.

| gate | id label | moves (contract) | line-of-defense |
|------|----------|------------------|-----------------|
| 0 | `gate0` | approve / revise / reject + edit/add/drop rows | no (program-level) |
| 1 | `concept` | approve / revise / reject | no |
| 2 | `architecture` | approve / revise / reject | **yes (critic)** |
| 3 | `spec` | approve / revise / reject | no |
| 4 | `plan` | approve / revise / reject | no |
| 5 | `checkpoint` | **`split+revise` (+ `approve`); no `reject`** | no |
| 6 | `review` | **`approve` / `restart` (no `revise`)** | **yes (reviewer)** |
| 7 | `verify` | **`approve` / `reject`**, reject → auto-mitigate **≤ 2 rounds** → human WAIT | **yes (verifier)** |
| 8 | `docs` | approve / revise / reject | no |
| 9 | `pr` | approve / reject | no |

**Contract rules:**
- `G1 (gate vs gate0)** — `gate` (a row's live Gates 1–9) and `gate0`
   (the inter-row program gate) are **distinct** ids and **never conflated** in
   any record or state field.
- `G2 (role classification, Principle II)** — the four line-of-defense roles
   (Architecture Critic, Verifier/Diagnosis, Code Reviewer, Docs Synthesizer)
   are **bound to the strongest resident model, on every substrate**; a weaker
   substitution is **expressible as a configuration error**, accepted by no valid
   state.
- `G3 (move integrity)** — a `gate-completion` record's `move` must be a member
   of `MoveVocabulary(gateId)` above; a move not in the set is a
   `gate-completion` that fails against the rail schema.
- `G4 (mitigation cap)** — a `verify` gate's auto-mitigation is bounded at **2
   rounds**, after which the only valid continuation is a `wait`/human escalation
   (never an unbounded fix loop).
- `G5 (checkpoint semantics)** — `checkpoint` has `split+revise` and **no
   `reject`** (research §D; constitution governs).

---

## Entity 4 — `FactoryState` (shape, for the log; not implemented here)

Referenced by the log schema to fix field shape; the *store and event-driven
redraw* are later-runtime concerns.

| field | type | role |
|-------|------|------|
| `resident` | `{ model, tier } \| null` | head in the lane |
| `running` | `{ duId, role } \| null` | current work unit |
| `queue` | array | model-affinity queue |
| `switches` | int ≥ 0 | switch-tax counter (cost) |
| `wallClock` | string | lane clock |
| `roadmap` | `RoadmapRow[]` | Layer-C program |
| `current` | string | in-flight row id |
| `gate0` | `Gate` | pre-lane program gate |
| `gate` | `Gate` \| null | a row's open Gates 1–9 gate |

**Rule `F1`** — no surface may *poll or run a server*; the state is mutated only
by events (Principle IX). This slice fixes the *shape* (used in the log);
realization is later.

---

## Entity 5 — Role classification table (line-of-defense vs work)

| tier | role | model | rationale |
|------|------|-------|-----------|
| line-of-defense | Architecture Critic | **strongest, always** | is the design backgate |
| line-of-defense | Verifier / Diagnosis | **strongest, always** | proves behavior |
| line-of-defense | Code Reviewer | **strongest, always** | pre-merge judge |
| line-of-defense | Docs Synthesizer | **strongest, always** | cross-feature doc judge |
| work | Researcher | cheap → standard | feeds Concept; local-first |
| work | Concept Writer | standard | bounded by Concept gate |
| work | Architecture Designer | standard | bounded by critic + Gate 2 |
| work | ADR Maker | cheap | warm step between strong passes |
| work | Worker | per-task tier | bounded by its checkpoint gate |
| work | Techwriter / PR Writer | cheap | bounded by Docs/PR backgate |
| triage | Feature-size triage | cheap | bounded immediately by a human gate |

**Rule `L1`** — a work role may use a cheaper tier **only upstream of the gate on
its far side**; no line-of-defense role is ever bindable to a cheaper tier
(Principle II; `G2`).
