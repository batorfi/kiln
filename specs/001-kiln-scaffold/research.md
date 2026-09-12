# Research & Resolved Unknowns: 001-kiln-scaffold

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Date**: 2026-09-12

Phase 0 output. Resolves every `NEEDS CLARIFICATION` from the plan's Technical
Context and pins the technical decisions the Phase 1 contracts depend on. Per
Q1=C (planning artifacts only) every decision here is scoped to *schemas and
their validator*; nothing here wires a lane, gate, or UI.

---

## Unknowns extracted from the plan Technical Context

| ID | Unknown (from plan) | Type | Resolved in |
|----|---------------------|------|-------------|
| U1 | Schema representation language for the factory-log records & ROADMAP.md | technology choice | §A |
| U2 | Validator implementation language / runner | technology choice | §B |
| U3 | How the "FiringReady" gate-check is invoked | integration | §C |
| U4 | Gate-5 Checkpoint move set (`gates-why-how-what.md` says approve/reject; constitution says Split+Revise/no-Reject) | open question | §D |
| U5 | ROADMAP.md: persisted artifact vs. projection (`roadmap.md` §9 open Q9) | open question | §E |
| U6 | Log line format (JSONL vs other) | dependency/precedent | §F |
| U7 | Cloud-dependency vs. dev-tooling under Principle VIII | constraint | §G |
| U8 | Where these planning artifacts live in the repo | structure | §H |

---

## A. U1 — Schema representation language

**Decision:** **JSON Schema Draft 2020-12** as the canonical machine-readable schema for
the factory-log record set; the ROADMAP.md head is validated with a JSON-Schema
`--` object for its *structured YAML head* plus a **structural contract** for the
rendered table (a table is a *projection*, so it is checked by re-rendering the
head, not by schema). Types are mirrored as a lightweight TS contract module
(`types.ts`) so a later runtime row can import them.

**Rationale:**
- JSON Schema 2020-12 is the recommended draft for new projects (most feature-rich:
 `prefixItems`, `unevaluatedProperties`, conditional/`if-then` — needed for
  "approved ⟺ human-move OR pre-delegation" and "WAIT is the only unresolved-gate
  shape"). It keeps the log *language-agnostic* and auditable.
- The factory-log is the constitution's audit trail (Principle VII); a widely
   interoperable, vendor-neutral schema keeps the trail decodable long after any
  single implementation changes.
- A TS `types.ts` mirror is *convenience for downstream rows*, not a second
  source of truth; the JSON Schema stays canonical.

**Alternatives considered:**
- **YAML-native validation** — flexible for humans but ambiguous to machine-check;
  rejected because Principle VII demands a *greppable, unambiguous* audit trail.
- **TS-only structural types** — type-check-time only, not runtime-verifiable
  against a persisted log; rejected because the validator must check a *written* log.
- **Draft 2019-09 / 7** — still fine, but 2020-12 is preferred for new work and
  its conditional keywords model the headless contract more cleanly.

---

## B. U2 — Validator implementation language / runner

**Decision:** A **dependency-light validator** in **TypeScript**, invoked via
**Node's built-in test runner** (`node --test`), with **zero runtime cloud
dependency**. Per-line JSONL validation: each non-blank line must parse as JSON
and conform to the union of factory-log record schemas.

**Rationale:**
- KILN's repo shape (concept §9) is TS modules (`index.ts`, `lane.ts`, …); TS is
  the natural substrate, and a later runtime row reuses the same `types.ts`.
- Node has no first-class built-in JSON-Schema validator as of 2026-04, so the
  validator is either a *pinned dev dependency* or a *minimal hand-rolled* one.
  For a first-slice scaffold, a **minimal hand-rolled validator** over the
  specific record schemas is chosen: it is fully local, has no install step, and
  the schema surface here is small and fixed. If a later row needs richer
  semantics, it may introduce a pinned library — a *change*, recorded in the log.
- Per-line JSONL schema validation is the standard pattern for log ingestion;
  `node --test` keeps it local, scriptable, and CI-friendly.

**Alternatives considered:**
- **Pinned third-party JSON-Schema library now** — rejected for slice 1 to keep
  zero install surface; acceptable later if the schema grows.
- **Shell/awk validator** — rejected: cannot reliably model conditional
  `if-then` semantics the headless contract needs.

---

## C. U3 — How "FiringReady" is invoked

**Decision:** FiringReady is a **static check** run as a **`node --test` suite**
(`tests/firing-ready/`) that asserts (a) every factory-log record schema exists;
(b) the ROADMAP schema + a validating **empty** ROADMAP.md exist; (c) the gate
contracts (gate-vs-gate0 split, per-gate move sets, line-of-defense strongest-
model bindings) are present and self-consistent; and (d) the **traceability**
note on each artifact names its constitution principle(s). It exits non-zero on
any missing piece, naming it.

**Rationale:**
- A falsifiable negative (omit one piece → fail with a named reason) *is* the
  acceptance of US4 / SC-005; a static check is the only thing that can assert it
  without running a lane (Q1=C; SC-006 "advances no gate").
- Folding it into `node --test` reuses the same runner as the validator (§B),
  keeping one local entry point.

**Alternatives considered:**
- **A dedicated CI YAML job** — deferred; the *check itself* is in scope,
  *where* it's wired into CI is a later runtime concern.
- **Firing a synthetic walk as "firing-ready proof"** — rejected under Q1=C
  (no smoke walk; SC-006).

---

## D. U4 — Gate 5 Checkpoint move set (reconciliation)

**Decision:** **Gate 5 Checkpoint = `Split + Revise` (grow) only, no `Reject`**,
per the **constitution** (the governing law) and KILN's checkpoint-as-control-gate
semantics. The constitution *supersedes* the runtime concept docs where they
disagree (governance clause).

**Rationale:**
- Two source docs disagree: `gates-why-how-what.md §1` marks Gate 5 as
  `approve / reject` (it frames checkpoint as the "git-checkpoint" control base),
  while the **constitution's gate-rail section** states Checkpoint carries
  `Split + Revise` and has **no `Reject`** — "a checkpoint is not done wrong, it
   may become two… the one move that grows a feature."
- Constitution governs (governance clause; FR-009 traceability). So the
   **contract** records Checkpoint = `Split + Revise` (+ implicit `Approve` to
  proceed), **no `Reject`**.
- **Carried forward as a documented gap:** this disagreement with
  `gates-why-how-what.md` is logged as a *constitution-vs-doc* inconsistency to
  resolve in the docs-track (a later row), not left to the runtime to guess. The
  runtime checkpoint-gate's actual behavior is a later runtime row; this slice
  only fixes the *contract* per the constitution.

**Alternatives considered:**
- **Adopt the doc's `approve/reject`** — rejected; contradicts the governing law.
- **Leave unresolved** — rejected; FR-009 requires a decision, and a self-
  consistent contract is the point of this slice.

---

## E. U5 — ROADMAP.md: persisted artifact vs. projection

**Decision:** **Both** — the **structured head** (`deliverable / owner / updated /
  rows / ordering / chain_unattended / gate0`) is a **persisted, reviewed
  artifact** (human-authored at Gate 0, status updated as rows close), and the
  **rendered table** is a **projection** of that head. The validator checks the
  head against the JSON Schema; table correctness is checked by *re-rendering the
  head* (a projection invariant), and `gate0.status = approved` carries the
  admitted program.

**Rationale:**
- `roadmap.md §2/§4` and open-Q9 lean "both: human-authored at Gate 0, status
  projected"; this slice pins that as the contract.
- A projection invariant (table must equal re-render(head)) keeps the human
   *reads the summary, structured head sits behind it* invariant machine-checkable
   without a UI.

**Alternatives considered:**
- **Pure projection (recomputed from lane state)** — rejected: the constitution
  requires the program to be a *reviewed, committed* artifact, not ephemeral.
- **Pure artifact, no projection invariant** — weaker; a hand-edited table could
  drift from the head undetected.

---

## F. U6 — Log line format

**Decision:** **JSONL** (one JSON object per line) for the factory-log, per the
 concept ("factory-log JSONL (rich)"). Field set per record covers
 `transition`, `gate-completion`, `human-decision`, `cost`, `WAIT`, and the
 `auto-approved-under-pre-delegation` tag, each with `ts`, plus gate/move-specific
 fields (decider, artifact, models-each-side, switches, wall-clock).

**Rationale:**
- "JSONL (rich)" is explicit in concept §2; JSONL is greppable + streamable —
  exactly the "durable / greppable / reconstructable from the log alone" property
   Principle VII demands.
- Per-line validity (`§B`) keeps a malformed line a *named* failure, matching
   SC-001/SC-008.

**Alternatives considered:**
- **NDJSON alias** — identical to JSONL; standardized on JSONL naming.
- **One big JSON array** — rejected; not streamable/greppable per-line, breaks
   "reconstruct from partial log" (edge case "closed terminal").

---

## G. U7 — Cloud-dependency vs. dev-tooling under Principle VIII

**Decision:** **Zero runtime/cloud dependency.** All validator + FiringReady tooling
is **local and, for slice 1, dependency-free (hand-rolled validator, `node --test`)
**. A *dev-time* one-off fetch (e.g. installing a pinned library later) is
 **out of scope for this slice** and would itself be a logged change; it is *not*
 a "cloud round-trip" of the factory. Missing outside resources (e.g. web) are
 flagged **unavailable, not blocking**.

**Rationale:**
- Principle VIII: "no cloud API dependency" for the factory itself. A dev-time
   npm install is a build concern, not a factory runtime round-trip — but to keep
  slice 1 honest and trivially runnable *anywhere*, we go dependency-free.
- "Flag-not-block" (Principle VIII) is itself encoded as a *valid* record shape:
  an `unavailable-resource` flag is well-formed and non-terminating.

**Alternatives considered:**
- **Permit a pinned JSON-Schema dev-dependency now** — acceptable, deferred
   (§B): revisit only if the schema surface grows.

---

## H. U8 — Where the planning artifacts live

**Decision:** Under the KILN repo shape (concept §9), the *schemas and contracts*
 land in `kiln/` (the extension root) and this feature's *per-feature spec docs*
 stay in `specs/001-kiln-scaffold/`. Concretely:
- `kiln/schemas/factory-log.schema.json`, `kiln/schemas/roadmap.schema.json`
- `kiln/contracts/gate-rail.md` (the move vocabulary + role classification as
  a human-readable contract), `kiln/contracts/factory-state.md`
- `kiln/ROADMAP.md` — the **empty** shipped artifact (Q2=A)
- `kiln/src/types.ts` — the TS type mirror (canonical = the JSON Schemas)
- `kiln/validate/` — the hand-rolled per-line validator + `firing-ready` check
- `kiln/tests/` — `node --test` suites (contract / streaming / negative)
- `specs/001-kiln-scaffold/` keeps the plan, research, data-model, quickstart,
   contracts/ index (a pointer into `kiln/`), and (later) tasks.

**Rationale:**
- Concept §9 fixes `kiln/` as the extension root and `specs/` as per-feature
   working dirs; routing schemas into `kiln/` keeps the *delivered contract*
   where later rows import it, while the *spec docs* stay with the feature.
- A `contracts/` index in the feature dir keeps Phase-1 discoverable from the
   plan tree without duplicating the canonical files in `kiln/`.

**Alternatives considered:**
- **Keep schemas only under `specs/001-kiln-scaffold/contracts/`** — rejected: a
  later runtime row would have to reach into a *completed* feature's dir for its
  contract; the contract belongs at the shared root.

---

## Summary of resolved decisions

- U1 → JSON Schema Draft 2020-12 (+ TS `types.ts` mirror).
- U2 → dependency-light TS validator, `node --test`, per-line JSONL.
- U3 → FiringReady = static `node --test` suite, falsifiable, no lane advance.
- U4 → Gate 5 = `Split + Revise`, no `Reject` (constitution governs); doc
   discrepancy logged.
- U5 → ROADMAP.md = persisted head + projected table (both).
- U6 → JSONL.
- U7 → zero runtime/cloud dependency; flag-not-block; dev-only fetches deferred.
- U8 → schemas/validator live under `kiln/`; spec docs under
   `specs/001-kiln-scaffold/`.
