# r22 — Shaping the roadmap together

> **Roadmap row r22** · phase: Front door · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Make roadmap creation a collaboration: the engineer's own inputs first, a conversation with the planner, direct edits and pins the planner never silently changes — and a Roadmap gate that admits exactly the version that was read.

## What it delivers

- the roadmap brief: goals, must-haves, constraints, order preferences, appetite, the engineer's own rows, pointers
- a recorded shaping conversation: planner questions, why and what-if, alternatives side by side
- direct edits; rows labelled by origin; pins every draft must respect
- versioned drafts with diffs; deterministic checks on every version
- the Roadmap gate brief showing each row's origin; approve bound to the version

## Why it exists

- A roadmap the engineer only approves is a roadmap they did not shape (`the-director.md` §4.3).
- Pins and origin labels keep authorship clear between person and planner.
- Binding admission to a version preserves the Roadmap gate's guarantee (constitution VI).

## Why it sits here

- **Depends on:** [r20](r20-gates-on-the-web.md)
- **Unlocks:** [r28](r28-first-run.md)

On gates on the web (r20). First run (r28) uses it for the first roadmap.

## What it builds on

- the planner role (r18)

## How it is proven

**Acceptance:** A roadmap shaped from inputs, conversation and pinned edits; approve admits exactly the version read.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

DIR-7 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no bench evidence or candidate list (r35)
- no team roadmap (r38)

## Decisions before it starts

- none open

## Risks

- A planner that drifts from pinned intent. Mitigation: pins checked deterministically on every version.

## Read more

- [The director §4.3](../../docs/concepts/the-director.md)
- [Mockups 03, 13, 45, 66](../../docs/concepts/mockups/README.md)
