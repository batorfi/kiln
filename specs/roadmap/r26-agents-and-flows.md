# r26 — Agents and flows

> **Roadmap row r26** · phase: Workshop · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Let teams fit KILN to their own process: an Agents screen with role versions and try-runs on past features, and added gates and flows — a threat model, a security review — chosen per feature at the Roadmap gate and checked before use.

## What it delivers

- the Agents screen: roles, instructions, versions, bindings, try-runs on a past feature
- configuration layering: team floor → workshop → factory, stricter only
- gate definitions (`gates/<id>.md`) and flows (`flows/<name>.yaml`) that extend the standard flow
- per-feature flow choice at the Roadmap gate, pinned with gate versions
- `kiln check flow` for added gates; gate try-runs; changes by an Operator

## Why it exists

- SDLC conventions differ; added gates bring them inside KILN with an author, a judge, a brief and a record (`extensible-flow.md`).
- Try-runs on past features let a team learn whether a change helps before any gate depends on it.
- Fixed anchors and the closed move set mean extensibility never weakens the guarantees.

## Why it sits here

- **Depends on:** [r18](r18-the-director.md), [r25](r25-one-workshop-several-factories.md)
- **Unlocks:** [r29](r29-new-codebases.md), [r32](r32-kiln-v1-release.md)

On several factories (r25) and the director (r18). Under scope option B it moves to `kiln-v1.x`.

## What it builds on

- gates as data (r14) — added gates need no director rework

## How it is proven

**Acceptance:** An added gate defined, checked, tried on a past feature, and chosen for one feature at the Roadmap gate.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

CFG-2, CFG-7 (try-runs), FLOW-4…9 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no team-shared gates by quorum (r38–r39)

## Decisions before it starts

- Several Deciders on one gate; added gates as delegation arming points; `applies_when` on the diff (PRD §14)
- **Blocking:** `kiln-v1` scope — option B defers this row

## Risks

- Added gates that slow features without catching problems. Mitigation: gate insights (mockup 60) as evidence for owners.

## Read more

- [An extensible flow](../../docs/concepts/extensible-flow.md)
- [Configuration §6](../../docs/concepts/configuration.md)
- [Mockups 49–60](../../docs/concepts/mockups/README.md)
