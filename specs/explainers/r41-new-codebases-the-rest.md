# r41 — New codebases, the rest

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | kiln-v1.x |
| **Release** | `kiln-v1.x` — position 39 of 42 in the committed order |
| **Depends on** | [r29 — New codebases](./r29-new-codebases.md), [r35 — The bench, part 2: spikes and candidates](./r35-the-bench-part-2-spikes-and-candidates.md), [r39 — Team space, part 2](./r39-team-space-part-2.md) |
| **Unlocks** | — |
| **PRD requirements** | GREEN-6…9 |
| **Proven when** | conventions written by the skeleton are enforced from feature two; a team starts a product together |

## In one paragraph

A young codebase stays coherent as it grows: the conventions the skeleton wrote are enforced from feature two, work is planned in vertical slices riskiest first, brownfield practices switch on when their triggers are met, and a team can start a product together.

## What it delivers

- conventions checked by the code reviewer and CI from the second feature; changes are recorded decisions
- vertical slices, riskiest assumptions first; tests-first work plans by default
- director suggestions to switch on brownfield practices when triggers are met, decided at a Roadmap gate
- starting a product as a team in the team space

## Not in this row

- —

## Requirements it carries

*As listed in the roadmap: GREEN-6…9. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| GREEN-6 | **Conventions from day one**: written by the skeleton, checked by the code reviewer and CI from feature two; changes are recorded decisions. | Should |
| GREEN-7 | **Slices and risk**: the planner proposes vertical slices, riskiest assumptions first; tests-first work plans by default. | Should |
| GREEN-8 | **Growing into brownfield**: director suggestions, decided at a Roadmap gate, to switch on full scan, preserved behaviour and baseline, territories, code map when their triggers are met. | Should |
| GREEN-9 | **Starting as a team**: brief, constitution and decisions agreed in the team space; skeleton by one workshop; claims after it merges. | Could |

## How it is proven

**Acceptance:** conventions written by the skeleton are enforced from feature two; a team starts a product together.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Rules it must keep

- **VI** — every switch of practice is a Roadmap-gate decision
- **XII** — the team agrees; each workshop decides its gates

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [New codebases](../../docs/concepts/greenfield.md)
- [PRD GREEN-6…9](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r40 — Existing codebases, the rest](./r40-existing-codebases-the-rest.md) · [index](./README.md) · [r50 — KILN in Zed, phase 2: the Agent Panel](./r50-kiln-in-zed-phase-2-the-agent-panel.md) →
