# r21 — Stepping in

> **Roadmap row r21** · phase: Front door · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Give the person the controls between gates: delegate routine gates on purpose, steer a working step, approve or refuse a risky action — each recorded under their name and none of them able to settle a gate.

## What it delivers

- arming the unattended tail at the Specification gate; ended by any objection; delegated approvals recorded as delegated
- steering of work steps, never judges
- risky-action approvals held by policy, remembered across restarts
- notifications that are information only

## Why it exists

- People need to shape work without becoming its babysitter; these are the deliberate, recorded ways to do that (`web-front-door.md` §8).
- Delegation that any objection ends is the difference between *don't bother me* and *ship it anyway* (constitution, *Default Flow*).

## Why it sits here

- **Depends on:** [r20](r20-gates-on-the-web.md)
- **Unlocks:** [r31](r31-existing-codebases-baseline-territory.md), [r32](r32-kiln-v1-release.md)

On gates on the web (r20). The existing-codebase work (r31) and the release (r32) depend on it.

## What it builds on

- pre-delegation logic from `src/gate.ts`, now durable state (r13–r14)

## How it is proven

**Acceptance:** An armed tail crosses clean gates as *delegated*, and stops at the first objection; a judge cannot be steered.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

HITL-1/2, GATE-4, WEB-5 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no policy stops for egress or budgets (r33)
- no hand-over between Deciders (r25)

## Decisions before it starts

- none open

## Risks

- Delegation crossing a gate it should not. Mitigation: the delegation document is checked at every covered gate, and any veto ignores it.

## Read more

- [Design §5.6 and §8](../../docs/concepts/web-front-door.md)
- [Mockups 04, 07, 11, 21](../../docs/concepts/mockups/README.md)
