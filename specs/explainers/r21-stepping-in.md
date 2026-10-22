# r21 — Stepping in

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** in the [roadmap proposal](../ROADMAP.md), which awaits the Roadmap
> gate; nothing here is admitted. The row's own `specs/NNN-…` directory (spec, plan, tasks) is written when it is admitted.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Front door |
| **Release** | `kiln-v1` — position 11 of 41 in the proposed order |
| **Depends on** | [r20 — Gates on the web](./r20-gates-on-the-web.md) |
| **Unlocks** | [r31 — Existing codebases, part 2: baseline, territory, process](./r31-existing-codebases-part-2-baseline-territory-process.md), [r32 — Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md) |
| **PRD requirements** | HITL-1/2, GATE-4, WEB-5 |
| **Proven when** | an armed tail crosses clean gates as *delegated*, and stops at the first objection; a judge cannot be steered |

## In one paragraph

People should not have to watch every step. This row lets them step in when they choose and step back when they trust the path: delegation of the routine gates, steering of a worker mid-step, and approvals for risky tool calls — all bounded and recorded.

## What it delivers

- delegation (the unattended tail) armed only at the Specification gate, covering the approve side of later gates; **any objection ends it**
- steering of work steps — never of judges — recorded under the person's name
- risky-action approvals: tool calls held by policy until a person allows or refuses, remembered across restarts
- notifications that are information only, never decisions

## Not in this row

- hand-over to another decider (r39)
- policy stops for remote models (r45, r33)

## Requirements it carries

*As listed in the roadmap: HITL-1/2, GATE-4, WEB-5. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| HITL-1 | **Steering** of work steps (never judges), recorded under the person's name. | Must |
| HITL-2 | **Risky-action approvals**: tool calls held by policy until a person allows or refuses; answers remembered across restarts; never a gate move. | Must |
| GATE-4 | The **unattended tail** may be armed only at the Specification gate, for Work plan → Documentation; merge excluded unless explicitly delegated; any judge's objection ends it. Auto-crossed gates are recorded as delegated, never as human. | Must |
| WEB-5 | Notifications are information only — never decisions. Waiting gates never escalate or time out; each person chooses which gate kinds may interrupt them. | Must |

## How it is proven

**Acceptance:** an armed tail crosses clean gates as *delegated*, and stops at the first objection; a judge cannot be steered.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Rules it must keep

- *The Flow* — shortcuts are decisions, not defaults
- **V, VI** — delegation never inferred, never reaching the Roadmap gate
- **I** — judges cannot be steered

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [The flow §8](../../docs/concepts/the-flow.md)
- [The web front door §8](../../docs/concepts/web-front-door.md)
- [PRD §6.9](../../docs/prd/kiln-prd.md)
- [The roadmap proposal](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r20 — Gates on the web](./r20-gates-on-the-web.md) · [index](./README.md) · [r22 — Shaping the roadmap together](./r22-shaping-the-roadmap-together.md) →
