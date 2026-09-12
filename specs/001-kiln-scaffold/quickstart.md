# Quickstart — 001-kiln-scaffold (validation guide)

**What this is.** A run guide that **proves the delivered contracts hold** — the
factory-log schema + validator, the ROADMAP schema + empty artifact, the
gate-rail contract, and the FiringReady check — **without running a lane or
advancing a gate** (Q1=C / SC-006). Every "expect" maps to a success criterion.

**What this is NOT.** No lane fires, no gate opens, no UI. The guide *checks*
static contracts; the runtime that emits/blocks on them is a later row.

---

## Prerequisites

- Node (for the `node --test` suites referenced here — the runner from research
   §B; zero third-party deps for slice 1).
- This feature's contracts: [`contracts/`](./contracts/) —
   [factor…a.md](contracts/factory-log.schema.json),
   [roadmap.schema.json](contracts/roadmap.schema.json),
   [gate-rail.md](contracts/gate-rail.md),
   [roadmap-empty.example.md](contracts/roadmap-empty.example.md).
   (At `/speckit.implement` these are promoted to
    `kiln/schemas/`, `kiln/contracts/`, `kiln/ROADMAP.md`,
    `kiln/validate/`, `kiln/tests/`, per `contracts/README.md`.)

## Setup

1. Confirm the contracts exist and are well-formed (the FiringReady negative
   assertion):

   ```
   ls kiln/schemas/factor…hema.json kiln/schemas/roadmap.schema.json kiln/contracts/gate-rail.md kiln/ROADMAP.md
   ```

   **Expect:** all present. (A *missing* file → FiringReady **fails and names it**
    — SC-005.)

2. Confirm the shipped ROADMAP validates *as an empty program*:

   ```
   kiln/validate/roadmap kiln/ROADMAP.md
   ```

   **Expect:** PASS — schema-valid; `gate0.status: pending`; `rows: []`; no committed
    `ordering`. (M3 / SC-003.)

## Scenario 1 — A complete log stream validates (SC-001, R1–R6)

- Build a JSONL stream covering `transition`, `gate-completion`,
   `human-decision`, `cost`, `wait`, `pre-delegation` (see
   [data-model.md](./data-model.md) Entity 1 for the field set; the schema at
   [contracts/factory-log.schema.json](contracts/factor…ema.json) is the source
   of truth — **do not hand-copy it**).
- Run:

   ```
   kiln/validate/log stream.good.jsonl
   ```

- **Expect:** PASS. `seq` strictly increasing / gap-free; every
   `gate-completion` move ∈ its gate's `MoveVocabulary` (G3); the auto-approved
   gate-c…stinct `pre-delegation` record (R4).

## Scenario 2 — No-silent-approval (SC-002, R3)

- Take Scenario 1's stream; **delete the `decidedBy` + `pre-delegation`** from a
   `gate-completion` whose `move = approve`.
- Run:

   ```
   kiln/validate/log stream.silent.jsonl
   ```

- **Expect:** FAIL, naming the offending `seq`/`move` — an `approve` with no
   human decider and no distinct pre-delegation is rejected. A `wait` (gate
   `g<N>`) remains the *only* valid unresolved shape.

## Scenario 3 — Malformed / gap stream fails named (SC-008, R2)

- Introduce a **missing `seq`** (gap) and a **malformed record** (bad JSON / a move
   outside `MoveVocabulary`).
- Run both through `kiln/validate/log`.
- **Expect:** each FAILs with a **named reason** ("missing seq N" / "record S: move
   X not in MoveVocabulary(Gate 6)").

## Scenario 4 — Gate 0 cannot be pre-authorized (SC-003 / Q2=A, M3)

- Start from [contracts/roadmap-empty.example.md](contracts/roadmap-empty.example.md)
   (PASS). Apply **one** mutation from its *Negative baseline* table:

   ```
   gate0.status -> "approved"      (with no rows/decided_by/at)
   ordering:    [r1]               (with no matching row)
   a row with deps -> "r999"       (unresolved)
   ```

- Run: `kiln/validate/roadmap mutated.roadmap`
- **Expect:** each FAILs — the empty artifact validates, but **no** committed program
   validates without a full human-decided `gate0` record. This is the proof the
   scaffold *does not* admit a program.

## Scenario 5 — Line-of-defense strongest-model binding (SC-004 / SC-006, G2/L1)

- Against [contracts/gate-rail.md](contracts/gate-rail.md), assert each of the
   **four line-of-defense roles** is bound to **`strongest`**, and that a state
   binding, e.g., Code Reviewer to a `cheap` tier is **rejected** as a
   configuration error.
- FiringReady asserts these bindings are present; **it advances no gate.**
   **Expect:** bindings present; the weaker binding is rejected.

## Scenario 6 — FiringReady end-to-end (SC-005, falsifiable)

```
kiln/tests/firing-ready        # node --test
```
- **Expect:** PASS when all three contracts are present and consistent; **FAIL,
   naming the missing element**, when exactly one is removed — proving the probe
    is falsifiable and runs no lane.

## Done when

Every scenario above reproduces its "Expect." Because no lane runs and no gate
advances (SC-006), the guide is a **purely static** proof that the planning
contracts are complete, consistent, and constitution-traceable — ready for the
first runtime row to build on.
