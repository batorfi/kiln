# r39 — Team space, part 2

> **Roadmap row r39** · phase: kiln-v1.x · release: `kiln-v1.x` (after the release) · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Make day-to-day teamwork visible and safe: claims on paths with overlap shown at the Work plan gate, requests and mirrored reviews between workshops, a team-aware Merge gate on the code host's queue, team knowledge, shared hosts, and bench work shared by choice.

## What it delivers

- claims: advisory by default, exclusive on protected paths; overlap detection in both briefs
- decisions across workshops: opinions, required reviews, delegated deciders — signed
- the Merge gate in a team: base drift, required reviews, the code host's merge queue
- team knowledge included in member vaults
- shared hosts with isolated leases, stores and secrets
- research claims and handing a spike to a teammate

## Why it exists

- Collisions found at merge time are the most expensive kind (`team-space.md` §7).
- Teammates review each other through KILN without either deciding the other's gates.

## Why it sits here

- **Depends on:** [r38](r38-team-space-foundations.md)
- **Unlocks:** [r41](r41-new-codebases-the-rest.md)

On team space foundations (r38). New codebases' team start (r41) depends on it.

## How it is proven

**Acceptance:** Overlapping claims surface at the Work plan gate; the Merge gate uses the code host's queue.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

TEAM-4…7, TEAM-9, BENCH-9 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Decisions before it starts

- none open

## Risks

- Stale claims blocking work. Mitigation: claims expire when stale and are released at merge.

## Read more

- [The team space §7–§13](../../docs/concepts/team-space.md)
- [Mockups 37–39](../../docs/concepts/mockups/README.md)
