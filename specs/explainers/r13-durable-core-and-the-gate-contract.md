# r13 — Durable core and the gate contract

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** in the [roadmap proposal](../ROADMAP.md), which awaits the Roadmap
> gate; nothing here is admitted. The row's own `specs/NNN-…` directory (spec, plan, tasks) is written when it is admitted.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Durable core |
| **Release** | `kiln-v1` — position 3 of 41 in the proposed order |
| **Depends on** | [r12 — Foundations reset](./r12-foundations-reset.md), [r42 — Spike: completing a waiting task from outside](./r42-spike-completing-a-waiting-task-from-outside.md) |
| **Unlocks** | [r14 — Gates as data, walked headless](./r14-gates-as-data-walked-headless.md), [r16 — Real local workers](./r16-real-local-workers.md) |
| **PRD requirements** | CORE-1…5, CORE-7 (store), LANE-1 |
| **Proven when** | kill the server at every step of a gate task: it resumes, waits, and settles only on a committed move |

## In one paragraph

This row builds the durable heart of a factory on Pi Durable: the task graph that holds the roadmap, each feature, each step, each gate and the lane, and the gate contract that makes "no silent approval" a property of the substrate rather than a check scattered through code.

## What it delivers

- the Pi Durable seam — the only module that imports Pi Durable
- task types: **roadmap**, **row** (one feature), **unit** (one step), **gate**, **lane**
- the gate contract: opening commits the gate document, the brief as it will be shown and `gate.opened`; a move and the gate's completion are one atomic commit, keyed exactly once; first move wins; stale moves refused; no durable timer settles a gate
- restart resumes every task from its last checkpoint; a waiting gate resumes waiting
- exactly-once commands and moves through idempotency keys
- one durable store per factory

## Not in this row

- the flow as data and the CLI walk (r14)
- the event record and its projections (r15)
- real models (r16)

## Requirements it carries

*As listed in the roadmap: CORE-1…5, CORE-7 (store), LANE-1. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| CORE-1 | The factory runs on **Pi Durable** behind **one KILN seam module**; no other module imports Pi Durable. | Must |
| CORE-2 | Durable task types: **roadmap** (holds the Roadmap gate), **row** (the director for one feature), **unit** (one step), **gate**, **lane**. | Must |
| CORE-3 | **Gate contract**: opening commits the gate document, the brief *as it will be shown*, and `gate.opened`; the move and the gate's completion are **one atomic commit**, keyed exactly-once; first move wins; stale moves are refused; no durable timer settles a gate. | Must |
| CORE-4 | Restart resumes every task from its last checkpoint; a waiting gate resumes as waiting; a half-done step never commits its result. | Must |
| CORE-5 | Exactly-once commands and moves via idempotency keys. | Must |
| CORE-7 | **One store per factory.** A closed feature's conversations and checkpoints are exported to a checksummed **feature archive** beside the store (never in git), recorded by `feature.archived` with its hash, and compacted out of the live store; archives move with the factory; kept forever unless an Operator sets an age-out (`transcript.aged_out`). The record is never archived, aged out or (in `kiln-v1`) segmented; r15 measures its size and rebuild time. | Must |
| LANE-1 | **Lane task** per factory: at most one running generation; holds resident model, hold flag (Design, Code review, Verification), swap count; survives restarts. | Must |

## How it is proven

**Acceptance:** kill the server at every step of a gate task: it resumes, waits, and settles only on a committed move.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~store lifetime~~ — **decided 2026-10-21**: one store per factory; closed features archived beside it; the record unsegmented in `kiln-v1`, measured in r15 (PRD CORE-7)

## Rules it must keep

- **V** — absence, a crash or a clock never settles a gate
- **VI** — the roadmap task accepts no delegated move
- **VII** — moves are committed with their effects
- **XI** — the store is independent of its host

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [KILN on Pi Durable](../../docs/concepts/pi-durable.md)
- [The web front door §5](../../docs/concepts/web-front-door.md)
- [PRD §6.2](../../docs/prd/kiln-prd.md)
- [The roadmap proposal](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r42 — Spike: completing a waiting task from outside](./r42-spike-completing-a-waiting-task-from-outside.md) · [index](./README.md) · [r14 — Gates as data, walked headless](./r14-gates-as-data-walked-headless.md) →
