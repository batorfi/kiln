# r25 — One workshop, several factories

> **Roadmap row r25** · phase: Workshop · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Let one workshop run several factories: a factory registry, the model pool shared across them with a host scheduler, people and roles for a single user, and one Needs you across all factories.

## What it delivers

- the factory registry; one process and one store per factory, supervised
- the host scheduler: affinity across factories, admission control, concurrency cap, fair share
- workspace per factory; overlap between factories detected
- people and roles (single user); hand-over of a waiting decision
- Needs you across factories

## Why it exists

- One engineer often owns several codebases; one machine can run several kilns (`web-front-door.md` §12).
- Isolation — one process per factory — means one factory's failure cannot hurt another.
- A shared pool with a pinned judge keeps judging cheap for every factory.

## Why it sits here

- **Depends on:** [r20](r20-gates-on-the-web.md)
- **Unlocks:** [r26](r26-agents-and-flows.md)

On gates on the web (r20). Agents and flows (r26) build on it.

## What it builds on

- the lane and pool from r16; scheduler from r12

## How it is proven

**Acceptance:** Three factories on one host share the model pool; one Needs you across them.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

HOST-1, LANE-4, WORK-6, PPL-1 (single user), HITL-4 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no other hosts (r37)
- no team (r38)

## Decisions before it starts

- **Scope option B:** configuration layering (CFG-2) would move here if r26 moves to `kiln-v1.x`

## Risks

- Memory pressure with several resident models. Mitigation: a memory budget enforced by the pool; queue, never fail.

## Read more

- [Design §12 many kilns on one machine](../../docs/concepts/web-front-door.md)
- [Mockups 01, 15](../../docs/concepts/mockups/README.md)
