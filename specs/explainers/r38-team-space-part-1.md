# r38 — Team space, part 1

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** in the [roadmap proposal](../ROADMAP.md), which awaits the Roadmap
> gate; nothing here is admitted. The row's own `specs/NNN-…` directory (spec, plan, tasks) is written when it is admitted.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Team |
| **Release** | `kiln-v1` — position 24 of 41 in the proposed order |
| **Depends on** | [r24 — Implementation knowledge and the workshop wiki](./r24-implementation-knowledge-and-the-workshop-wiki.md), [r25 — One workshop, several factories](./r25-one-workshop-several-factories.md) |
| **Unlocks** | [r39 — Team space, part 2](./r39-team-space-part-2.md) |
| **PRD requirements** | TEAM-1, 2, 3, 8 |
| **Proven when** | a team roadmap change takes effect only when the quorum has signed |

## In one paragraph

A small team works on one codebase while each engineer keeps a sovereign workshop. The team space — a git repository — gives them one team roadmap, decided by a quorum of signatures, and the floor of rules every member workshop honours.

## What it delivers

- the team-space repository with subscribe and publish; coordination as the publishing floor
- members' signing keys and signed acts
- the team floor: policy floors, protected paths, shared roles, required gates
- the team roadmap decided by a majority quorum; rules, the decider list and the threshold changed only by the current quorum

## Not in this row

- claims, requests, reviews and the team-aware Merge gate (r39)
- shared hosts (r37)

## Requirements it carries

*As listed in the roadmap: TEAM-1, 2, 3, 8. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| TEAM-1 | **Team space repository**: a git repository holding the team roadmap, claims, team knowledge, published digests, decision requests and responses, team rules and members; every write a signed commit. | Must (v1) |
| TEAM-2 | **Subscribe and publish**: each workshop pulls and verifies the team space into events of its own record, and publishes by its policy; **coordination** is the floor for team-roadmap features, anything richer per item by the author's choice. | Must (v1) |
| TEAM-3 | **Team roadmap** changed by a **quorum** of named deciders; factories adopt team features at their own Roadmap gate. Default quorum: a majority of named deciders; team rules, the decider list and the threshold change only by the current quorum; an unmet quorum changes nothing. | Must (v1) |
| TEAM-8 | **Identity**: personal signing keys, registered and revoked through the team's identity provider where one exists; shared workshops join as one member. | Must (v1) |

## How it is proven

**Acceptance:** a team roadmap change takes effect only when the quorum has signed.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~quorum rules, claim expiry, publishing levels~~ — **decided 2026-10-21**: majority quorum (rules and membership by the same quorum); activity-renewed claims, 7 days / 48 hours; coordination as a floor (§14.10)

## Rules it must keep

- **XII** — workshops are sovereign; no team act settles a gate
- **V** — missing signatures are never agreement

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [The team space](../../docs/concepts/team-space.md)
- [PRD §6.14](../../docs/prd/kiln-prd.md)
- [The roadmap proposal](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r31 — Existing codebases, part 2: baseline, territory, process](./r31-existing-codebases-part-2-baseline-territory-process.md) · [index](./README.md) · [r39 — Team space, part 2](./r39-team-space-part-2.md) →
