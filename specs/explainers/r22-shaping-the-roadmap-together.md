# r22 — Shaping the roadmap together

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Front door |
| **Release** | `kiln-v1` — position 12 of 42 in the committed order |
| **Depends on** | [r20 — Gates on the web](./r20-gates-on-the-web.md) |
| **Unlocks** | [r28 — First run](./r28-first-run.md) |
| **PRD requirements** | DIR-7 |
| **Proven when** | a roadmap shaped from inputs, conversation and pinned edits; approve admits exactly the version read |

## In one paragraph

A roadmap is shaped together, not handed over for a yes or no. The engineer writes their goals and constraints, talks them through with the planner, edits rows directly — and the Roadmap gate admits exactly the version they read.

## What it delivers

- the roadmap brief — the engineer's goals, must-haves, constraints, appetite, own rows and pointers
- a recorded shaping conversation with the planner; alternatives drafted one at a time with their cost shown
- direct edits and pins the planner never silently changes
- versioned drafts, each checked on every version
- row origins (from you, from the planner, from a candidate) shown in the Roadmap gate brief
- approve bound to the version read

## Not in this row

- evidence from the bench (r35)
- the team roadmap (r38)

## Requirements it carries

*As listed in the roadmap: DIR-7. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| DIR-7 | **Shaping the roadmap together**: a per-factory **roadmap brief** of the engineer's inputs (goals, must-haves, constraints, order preferences, appetite, own rows, pointers) read first by the planner; a recorded shaping conversation (planner questions, why/what-if, alternatives side by side); direct edits with **pins** the planner must respect and never silently change; versioned drafts with diffs; deterministic checks on every version; row origin shown in the Roadmap gate brief; approve bound to the version read; shaping possible at any time, never altering work in progress. Alternatives are drafted one at a time, each with its estimated machine time shown before it runs. | Must |

## How it is proven

**Acceptance:** a roadmap shaped from inputs, conversation and pinned edits; approve admits exactly the version read.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Rules it must keep

- **VI** — the Roadmap gate is human-only
- **I** — the planner drafts, the engineer decides

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [The director §4.3](../../docs/concepts/the-director.md)
- [PRD DIR-7](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r21 — Stepping in](./r21-stepping-in.md) · [index](./README.md) · [r23 — The factory knowledge base](./r23-the-factory-knowledge-base.md) →
