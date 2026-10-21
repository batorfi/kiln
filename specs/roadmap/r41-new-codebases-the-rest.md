# r41 — New codebases, the rest

> **Roadmap row r41** · phase: kiln-v1.x · release: `kiln-v1.x` (after the release) · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Carry new codebases past the skeleton: conventions enforced from the second feature, vertical slices with the riskiest assumptions first, growing into brownfield practices by recorded decision, and starting a product as a team.

## What it delivers

- conventions written by the skeleton, checked by the reviewer and CI
- the planner proposing vertical slices, riskiest first; tests-first work plans
- director suggestions to switch on scan, baseline, territories and code map when their triggers appear
- starting as a team: brief, constitution and decisions agreed in the team space

## Why it exists

- A new codebase becomes an existing one; the practices should switch on without a reset (`greenfield.md` §13).

## Why it sits here

- **Depends on:** [r29](r29-new-codebases.md), [r35](r35-bench-spikes-and-candidates.md), [r39](r39-team-space-collaboration.md)
- **Unlocks:** — (nothing depends on it)

On new codebases (r29), the bench (r35) and team collaboration (r39).

## How it is proven

**Acceptance:** Conventions written by the skeleton are enforced from feature two; a team starts a product together.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

GREEN-6…9 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Decisions before it starts

- none open

## Risks

- Switching practices on too late. Mitigation: triggers are suggested by the director as soon as they are met.

## Read more

- [KILN in a new codebase](../../docs/concepts/greenfield.md)
