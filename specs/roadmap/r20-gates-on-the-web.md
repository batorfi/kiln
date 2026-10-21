# r20 — Gates on the web

> **Roadmap row r20** · phase: Front door · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Let a person decide every gate of a real feature in the browser — with the ten-part gate brief, a headline wherever a gate appears, moves bound to the state version they were made against, and one Needs you inbox.

## What it delivers

- the ten-part gate brief, complete before it is shown, honest about gaps
- the headline that travels wherever a gate appears
- move intake: authenticated, idempotent, bound to a state version; stale moves refused; the brief recorded as seen
- Needs you: waiting on you, suggestions, worth knowing
- where moves lead (GATE-6), once the flow proposals are decided

## Why it exists

- The gate brief is the core of the experience: a decision is only as good as what the person can see (`user-experience.md` §8).
- Binding a move to a state version makes the first-move-wins contract safe across tabs and devices.
- Needs you is the promise that the person never has to watch the factory.

## Why it sits here

- **Depends on:** [r18](r18-the-director.md), [r19](r19-web-front-door-read-only.md)
- **Unlocks:** [r21](r21-stepping-in.md), [r22](r22-shaping-the-roadmap-together.md), [r23](r23-factory-knowledge-base.md), [r25](r25-one-workshop-several-factories.md)

After the director (r18) and the read-only front door (r19). Everything that presents a decision later — roadmap shaping, knowledge in briefs, devices — builds on it.

## What it builds on

- the gate contract (r13); brief parts drawn from the record (r15)

## How it is proven

**Acceptance:** A person decides every gate of a real feature in the browser; a move on a stale state version is refused.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

BRIEF-1…4, WEB-3 (core), DIR-6, GATE-6 (pending the flow proposals) — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no delegation or steering yet (r21)
- no knowledge citations in briefs (r23)

## Decisions before it starts

- Whether KILN may recommend a move at a gate; limits on *request more evidence* (PRD §14)
- **Blocking:** the flow proposals P1–P6 (GATE-6)

## Risks

- A brief that hides an objection or pre-selects a move. Mitigation: the brief's *never* rules as tests (UX §8.6).

## Read more

- [UX §8 the gate brief](../../docs/concepts/user-experience.md)
- [The director §5 Needs you](../../docs/concepts/the-director.md)
- [The flow](../../docs/concepts/the-flow.md)
- [Mockups 02, 03, 07–10, 46, 68–71](../../docs/concepts/mockups/README.md)
