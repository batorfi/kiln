# r35 — The bench, part 2: spikes and candidates

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | kiln-v1.x |
| **Release** | `kiln-v1.x` — position 31 of 43 in the committed order |
| **Depends on** | [r34 — The bench, part 1: notebook and research](./r34-the-bench-part-1-notebook-and-research.md) |
| **Unlocks** | [r54 — The Feed, the rest](./r54-the-feed-the-rest.md), [r48 — Explore: readiness](./r48-explore-readiness.md), [r40 — Existing codebases, the rest](./r40-existing-codebases-the-rest.md), [r41 — New codebases, the rest](./r41-new-codebases-the-rest.md) |
| **PRD requirements** | BENCH-5, 6, 8, 9, 10–12 |
| **Proven when** | a spike's report becomes evidence on a candidate shown at the Roadmap gate; spike code never merges |

## In one paragraph

Measured beats guessed. Spikes let engineers and agents try things in throwaway worktrees and report what they measured; the candidate list and the Roadmap gate's evidence view turn that into readiness for the next features.

## What it delivers

- spikes in throwaway worktrees on `spike/` branches, time-boxed; no pull request to `main` from a spike
- spike reports; *propose as a feature* seeds a roadmap entry
- the candidate list with evidence; the Roadmap gate's evidence and readiness view
- the director suggests, never starts, research and spikes
- bench work shared in a team

## Not in this row

- Explore's readiness report (r48)

## Requirements it carries

*As listed in the roadmap: BENCH-5, 6, 8, 9, 10–12. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| BENCH-5 | **Spikes**: worktree on a `spike/` branch, question and time box, engineer and/or agent, risky actions held; **no pull request to `main` from a spike branch**; archived on conclusion. | Should |
| BENCH-6 | **Spike report** with spike-measured results; *propose as a feature* seeds a roadmap entry and its Concept or Architecture brief. | Should |
| BENCH-8 | **Links to gates**, gate-time research suggestions, and focus mode (only judged gates and policy stops interrupt). | Should |
| BENCH-9 | **In a team**: research claims, sharing bench output by choice, handing a spike to a teammate. | Should |
| BENCH-10 | **Candidate list** per factory: candidates from notes, research and spike reports, links kept; editable by deciders and Curators; proposable to the team roadmap with evidence. | Should |
| BENCH-11 | **Roadmap-gate evidence view**: evidence and readiness (ready · thin · unknown) per proposed feature, unproven assumptions, *research this* / *spike this* actions; *what we learned since the last approval*; corrections flagged between gates. | Should |
| BENCH-12 | **Director suggests, never starts** research or spikes; proposals state when a candidate cannot be sized. | Should |

## How it is proven

**Acceptance:** a spike's report becomes evidence on a candidate shown at the Roadmap gate; spike code never merges.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- research and spike capacity on shared hosts; keeper suggestions off-switch; spike retention (§14.11)

## Rules it must keep

- PRD **P13** — spike code never reaches `main`
- **I** — evidence, never decisions

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [The bench](../../docs/concepts/the-bench.md)
- [PRD BENCH-5…12](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r34 — The bench, part 1: notebook and research](./r34-the-bench-part-1-notebook-and-research.md) · [index](./README.md) · [r54 — The Feed, the rest](./r54-the-feed-the-rest.md) →
