# researcher — feeds Concept

> **Type:** explainer. **Kind:** producer. **Feeds:** [1 Concept](../gates/01-concept.md) (no gate of its own). **Tier:** cheap → standard, local-first (inferred — see Status). **Status:** [data only].
> [← the judges](./architecture-critic.md) · [all roles](./README.md) · next: [concept-writer →](./concept-writer.md)

## What it does

Gathers what the project's own history and permitted sources already say about a raw idea, before anyone writes what the feature is and why — the first thing on the lane for a new feature.

## Why it exists

Writing a concept from nothing risks re-deciding something the project already settled, or missing a constraint already on record. A dedicated, cheap first pass keeps that context-gathering from competing for the lane with the concept writer's own, more expensive pass.

## Tier and binding

The-flow.md names "researcher → concept writer" directly before Gate 1. No gate judges this role's output on its own — it feeds the concept writer, who in turn is judged (where applicable) downstream. The legacy role doc's own framing (cheap, local-first, deferring to connectivity for anything beyond the project's own history) is carried over here as a reasonable default, not yet a decided `tiers.yaml` binding.

## What it's bound to

Gate [1 Concept](../gates/01-concept.md) — named directly in [the flow §2](../../../concepts/the-flow.md)'s own table ("researcher → concept writer"), not a `judge:`/producer field `flow/v2.ts` itself declares (the roster validates judges per gate, not producers).

## Status

**Data only.** `researcher` is a name in `flow/v2.ts`'s `roster.producers`; nothing beyond that exists for it under its own name. r16's generic `worker` stand-in proved the real-conversation mechanism for *some* producer; r17 is where `researcher` gets its own `agents/researcher.md` file and tier.

## Where to read more

- [The flow §2](../../../concepts/the-flow.md)
- Legacy: `docs/concepts/skills/research.md`, `docs/concepts/skills/01-generic-roles.md` §1
