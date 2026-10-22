# r42 — Spike: completing a waiting task from outside

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** in the [roadmap proposal](../ROADMAP.md), which awaits the Roadmap
> gate; nothing here is admitted. The row's own `specs/NNN-…` directory (spec, plan, tasks) is written when it is admitted.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Durable core |
| **Release** | `kiln-v1` — position 2 of 41 in the proposed order |
| **Depends on** | [r12 — Foundations reset](./r12-foundations-reset.md) |
| **Unlocks** | [r13 — Durable core and the gate contract](./r13-durable-core-and-the-gate-contract.md) |
| **PRD requirements** | CORE-6 |
| **Proven when** | go / go-with-fallback / no-go decided by a spike report; kill-at-every-step tests show one atomic move + completion, first move wins; a no-go re-opens the Roadmap gate |

## In one paragraph

Every gate in KILN depends on one primitive: a person's move, committed from outside the waiting gate task, completes that task in the same atomic commit — so a crash can never leave a move half-applied and nothing but a move settles a gate. Pi Durable does not publish this primitive, so this time-boxed spike settles it before anything is built on it.

## What it delivers

- a time-boxed spike against the pinned Pi Durable version
- kill-at-every-step tests proving one atomic commit for a move and its gate's completion, keyed exactly once, first move wins
- if the library lacks it: an upstream proposal, and the named fallback prototyped — a KILN decision table committed in the same SQLite transaction as the task store, behind the seam
- a spike report that decides **go**, **go with fallback** or **no-go**

## Not in this row

- no production feature code; the spike's prototype lives behind the seam or is thrown away
- a **no-go** does not continue to r13 — it re-opens the Roadmap gate

## Requirements it carries

*As listed in the roadmap: CORE-6. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| CORE-6 | The "complete a waiting task from outside" primitive is settled with Pi Durable **in a time-boxed go/no-go spike before the durable core** (roadmap r42): natively if the library allows it; otherwise an upstream proposal and, until it lands, a KILN decision table committed in the same SQLite transaction as the task store, behind the seam. A no-go re-opens the Roadmap gate. The gate contract does not depend on its exact API. | Must (early) |

## How it is proven

**Acceptance:** go / go-with-fallback / no-go decided by a spike report; kill-at-every-step tests show one atomic move + completion, first move wins; a no-go re-opens the Roadmap gate.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~how external completion of a waiting task is settled~~ — **decided 2026-10-21**: a time-boxed spike row before r13 with a go/no-go; default fallback an upstream proposal plus a KILN decision table in the same SQLite transaction (PRD CORE-6)

## Rules it must keep

- **V** — a missing person never approves
- **VII** — a move and its effect are one recorded commit
- *Dependencies* — a dependency never weakens a principle; it is reached through one seam

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [KILN on Pi Durable §12](../../docs/concepts/pi-durable.md)
- [The web front door §5.2 — the gate contract](../../docs/concepts/web-front-door.md)
- [PRD CORE-6](../../docs/prd/kiln-prd.md)
- [The roadmap proposal](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r12 — Foundations reset](./r12-foundations-reset.md) · [index](./README.md) · [r13 — Durable core and the gate contract](./r13-durable-core-and-the-gate-contract.md) →
