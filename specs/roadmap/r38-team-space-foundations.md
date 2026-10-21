# r38 — Team space, part 1

> **Roadmap row r38** · phase: kiln-v1.x · release: `kiln-v1.x` (after the release) · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Let a team of personal workshops meet in a shared git repository: subscribe and publish, members' signing keys and signed acts, the team floor, and a team roadmap that changes only when a quorum signs.

## What it delivers

- the team-space repository; every write a signed commit
- subscribe and publish at the level each workshop chooses
- members' signing keys, registered and revoked through the team's identity provider
- the team floor: rules workshops may make stricter, never looser
- the team roadmap changed by a quorum

## Why it exists

- Teams need to coordinate without anyone losing authority over their own work (constitution XII).
- A git repository needs no central service and keeps every act signed and versioned (`team-space.md`).

## Why it sits here

- **Depends on:** [r37](r37-factories-anywhere.md)
- **Unlocks:** [r39](r39-team-space-collaboration.md)

After factories anywhere (r37). The second team row (r39) builds on it.

## How it is proven

**Acceptance:** A team roadmap change takes effect only when the quorum has signed.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

TEAM-1, 2, 3, 8 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no claims, reviews or team-aware merge yet (r39)

## Decisions before it starts

- Quorum rules; claim expiry; publishing levels; whether the team space shares `kiln.config/` (PRD §14)

## Risks

- A team space that starts deciding for people. Mitigation: no event from it can complete a gate task.

## Read more

- [The team space](../../docs/concepts/team-space.md)
- [Mockup 36](../../docs/concepts/mockups/README.md)
