# Implementation Plan: 001-kiln-scaffold

**Branch**: `001-kiln-scaffold` | **Date**: 2026-09-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-kiln-scaffold/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

The constitution is **ratified**; this slice is the **pre-lane preparation**,
*scoped to planning artifacts only* (clarification **Q1=C**), shipping an empty
program (**Q2=A**). It fixes the **contracts later runtime rows import**: the
**factory-log schema + validator**, the **ROADMAP.md schema + empty artifact**,
and the **gate-rail contract** (Gate 0 + Gates 1–9, role classification, move
vocabulary, headless/no-silent-approval invariant). No lane fires, no gate
advances (SC-006). Approach: **JSON Schema Draft 2020-12** as the canonical
machine contract, **JSONL** per-line log records, a **dependency-light validator
( TypeScript + `node --test`) ** with **zero runtime/cloud dependency**, and a
**falsifiable "FiringReady" static check**. See
[research.md](./research.md) for decisions and [contracts/](./contracts/) for the
delivered interfaces.

## Technical Context

All unknowns resolved (see [research.md](./research.md), U1–U8); no `NEEDS
CLARIFICATION` remains.

**Language/Version**: TypeScript (KILN's module shape, concept §9) · Node
(`node --test`) for the validator + FiringReady suites. *Canonical contracts are
language-agnostic JSON Schema; a TS `types.ts` mirror is convenience only.*

**Primary Dependencies**: **None at runtime for slice 1** — a dependency-light,
hand-rolled JSONL + schema validator keeps zero install surface (research §B, §G).
A pinned third-party JSON-Schema validator is **deferred** (acceptable later if
the schema grows) and is a *logged change*, never a cloud round-trip.

**Storage**: **Files** — `factory-log` as **JSONL**; `ROADMAP.md` as a
   structured head + projected table. Both on-disk, greppable, reconstructable
   (Principle VII).

**Testing**: `node --test` — contract conformance (schemas), streaming (gap /
  malformed / no-silent-approval), and the falsifiable FiringReady suite
   (quickstart, SC-001/SC-005/SC-008).

**Target Platform**: **Linux/macOS workstation + CI** (the local kiln chamber).
  Local models Ollama-served are the operator's concern; **out of scope** for
  slice 1 (research §G).

**Project Type**: **planning / contract-delivery slice** that seeds KILN's
   `kiln/` extension repo shape (schemas, contracts, empty artifact, validator
   stubs). No runtime lane/gate/UI (Q1=C).

**Performance Goals**: N/A for slice 1 (no runtime). The *cost model* the
  contracts will serve is `wall-clock = work + switching`, with the switch tax
   (model swaps) the dominant local term (Principle IV) — captured as a `cost`
   record field, not a runtime metric here.

**Constraints**: **No cloud round-trip** (P-VIII); **no silent approval,
  Gate 0 included** (P-V/VI); **line-of-defense roles always strongest** (P-II);
  **single lane / director-as-scheduler** (P-III); **event-driven, no server /
   poll** (P-IX).

**Scale/Scope**: One deliverable program (`kiln-v1`), empty; a fixed, small
   schema surface (6 log record types × R1–R6; one roadmap head × M1–M4; one
   gate-rail × G1–G5). Deliberately **not** a feature walk (Q1=C).

## Constitution Check

*GATE: re-checked after Phase 1 design below. Result: **PASS — no violations**; the
Complexity Tracking table is empty.*

| Principle | How this slice satisfies / respects it |
|-----------|----------------------------------------|
| **I** Author/judge sep. | The scaffold *declares* contracts; a later row *judges* & *runs* them (Q1=C). No artifact self-approves. (SC-006) |
| **II** Strongest defense | Gate-rail contract binds the 4 line-of-defense roles to `strongest`, always; weaker bindings are a *rejected* config error. (SC-006) |
| **III** One lane / director-scheduler | `FactoryState` shape encodes the single resident + affinity queue; no parallel structure. Runtime realization deferred. |
| **IV** Affinity swap-only-on-tier | Encoded as the `cost.switches` field + the "no swap on affinity-compatible boundary" invariant; honored by later runtime, fixed here. |
| **V** Headless never silently approves | Log schema makes `wait` the *only valid unresolved-gate shape*; `approve` requires a `decidedBy` human or a distinct `pre-delegation` record (R3/R4). (Scenario 2/4) |
| **VI** Gate 0 human-only, always | `roadmap.schema.json` M3 guards that a *shipped/empty* artifact has `gate0.status: pending` and no committed ordering; a committed program requires a full human-decided `gate0` record (Q2=A). (Scenario 4 / SC-003) |
| **VII** Everything in the log | Factory-log schema is the system of record (R1–R6, F1); FiringReady asserts presence + traceability (R6 / FR-009). (SC-001/SC-005/SC-008) |
| **VIII** Local-first | Zero runtime/cloud dep; `unavailable-resource` is a *valid, non-blocking* record (R5). (research §G) |
| **IX** Three layers, event-driven, no server | `FactoryState` shape fixed *for the log* (F1: events-mutate, no poll/server); UI realization deferred. |
| **Governance / FR-009** | Each carried contract carries a `trace` note naming its principle(s); FiringReady asserts the notes exist. |

**Doc reconciliation logged (not a violation):** `gates-why-how-what.md §1` marks
Gate 5 as `approve/reject`, while the *constitution* says checkpoint carries
`Split+Revise` and **no `Reject`**. Per the governance clause the constitution
governs, so the contract records `split+revise / no reject` (research §D) and
flags the doc discrepancy for the docs track.

## Project Structure

### Documentation (this feature)

```text
spec…f/
├── plan.md               # this file (/speckit.plan)
├── research.md           # Phase 0 — U1–U8 resolved
├── data-model.md         # Phase 1 — 5 entities, R1–R6 / M1–M4 / G1–G5 / F1 / L1
├── quickstart.md         # Phase 1 — static validation scenarios (SC-001..008)
├── contracts/            # Phase 1 — the DELIVERED interface contracts
│    ├── README.md           # index + canonical placement + composition
│    ├── factory-log.schema.json   # canonical (JSONL record union, R1–R6)
│    ├── roadmap.schema.json       # canonical (head + M3 admission guard)
│    ├── gate-rail.md           # Gate 0 + 1..9 moves, roles, headless (G1–G5)
│    └── roadmap-empty.example.md  # the SHIPPED empty artifact (Q2=A) + negative baseline
└── checklists/requirements.md    # spec quality (all items pass)
# (later) tasks.md — produced by /speckit.tasks, NOT by this command
```

### Source Code (repository root, at /speckit.implement — research §H)

The contracts **promoted** here so later rows import a shared root, not a
completed feature dir. (This slice produces the *design contracts under
`contracts/`; promotion to `kiln/` is an implement step.)

```text
kiln/
├─ schemas/
│   ├─ factory-log.schema.json   (== contracts/factory-log.schema.json)
│   └─ roadmap.schema.json       (== contracts/roadmap.schema.json)
├─ contracts/
│   └─ gate-rail.md              (== contracts/gate-rail.md)
├─ src/
│   └─ types.ts                  (TS mirror of the two JSON Schemas; convenience)
├─ validate/
│   ├─ log.ts                    (JSONL, per-line R1–R6 + gap/malformed reasons)
│   ├─ roadmap.ts                (head vs roadmap.schema.json + M1–M4)
│   └─ firing-ready.ts           (static, falsifiable; advances NO gate)
├─ tests/                        (node --test)
│   ├─ contract/  streaming/  negative/
├─ ROADMAP.md                    (SHIPS the empty head; Q2=A; kiln/…example.md)
└─ index.ts                      (wire stub — NOT wired; runtime = later row)
```

**Structure Decision**: single-project (KILN = one `kiln/` extension). No web/
mobile split. Planning docs stay under `specs/001-kiln-scaffold/`; the *shared,
importable* contracts live under `kiln/` so later rows depend on the root, not on
a finished feature.

## Complexity Tracking

> **No Constitution violations, so nothing to justify.**

*The design adds no cloud dependency, no second lane, no parallelism, and no
server (P-III/VIII/IX). The only "extra structure" — a hand-rolled validator
instead of a library — is *simpler*, to keep slice 1 zero-dependency. No
Complexity Tracking entries are required.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| *(none)*  | —          | —                                    |
