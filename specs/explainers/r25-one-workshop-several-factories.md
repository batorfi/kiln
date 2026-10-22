# r25 — One workshop, several factories

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** in the [roadmap proposal](../ROADMAP.md), which awaits the Roadmap
> gate; nothing here is admitted. The row's own `specs/NNN-…` directory (spec, plan, tasks) is written when it is admitted.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Workshop |
| **Release** | `kiln-v1` — position 15 of 41 in the proposed order |
| **Depends on** | [r20 — Gates on the web](./r20-gates-on-the-web.md) |
| **Unlocks** | [r26 — Agents and flows](./r26-agents-and-flows.md), [r38 — Team space, part 1](./r38-team-space-part-1.md) |
| **PRD requirements** | HOST-1, HOST-2 (in-process), LANE-4, WORK-6, PPL-1 (single user) |
| **Proven when** | three factories on one host share the model pool; one Needs you across them |

## In one paragraph

One machine, several factories: each keeps its own lane, store and gates, while a shared model pool and a host scheduler keep the right models loaded across all of them — and one Needs you shows everything waiting on the person.

## What it delivers

- the factory registry and per-factory deciders
- the model pool shared across factories with leases, a memory budget and a host scheduler (affinity host-wide)
- a KILN-managed worktree per factory, a branch per feature
- the host runtime in-process with the workshop
- people and roles for a single user
- Needs you across factories

## Not in this row

- several people in one workshop and the team space (r38, r39)
- other hosts (r37)

## Requirements it carries

*As listed in the roadmap: HOST-1, HOST-2 (in-process), LANE-4, WORK-6, PPL-1 (single user). Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| HOST-1 | **Several factories** in one workshop: a factory registry, a cross-factory gate inbox, per-factory deciders. | Must |
| HOST-2 | **Host runtime** separable from the workshop; a single machine runs both by default. | Must (in-process) / Should (separate) |
| LANE-4 | Host scheduler: affinity across factories, admission control (queue, never fail), concurrency cap, fair share, no mid-generation preemption. | Should |
| WORK-6 | **Workspace per factory**: one KILN-managed worktree per factory, never a person's working copy; one branch per feature (`kiln/<factory>/<row>`) cut at admission; the row task removes its branch after merge or tags an abandoned one (`kiln/abandoned/<row>`); the factory removes its worktree only when retired; Health flags orphans. Overlap between factories detected and surfaced. | Must / Should |
| PPL-1 | **People and roles** per factory: Decider, Operator, Curator, Observer, Auditor; identity on every decision. | Must (single user) / Should (team) |

## How it is proven

**Acceptance:** three factories on one host share the model pool; one Needs you across them.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Rules it must keep

- **III** — one lane per factory; the host budget bounds resident models
- **IV** — affinity across factories
- **VI** — the Roadmap gate per factory; delegation never crosses factories

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [The web front door §12 — many kilns on one machine](../../docs/concepts/web-front-door.md)
- [PRD §6.12](../../docs/prd/kiln-prd.md)
- [The roadmap proposal](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r24 — Implementation knowledge and the workshop wiki](./r24-implementation-knowledge-and-the-workshop-wiki.md) · [index](./README.md) · [r26 — Agents and flows](./r26-agents-and-flows.md) →
