# architecture-critic — judges Architecture

> **Type:** explainer. **Kind:** judge. **Judges:** [2 Architecture](../gates/02-architecture.md). **Tier:** strongest, always. **Status:** [data only].
> [← all roles](./README.md) · next judge: [design-critic →](./design-critic.md)

## What it does

Reads the architecture designer's proposed structure and its considered alternatives, and produces evidence — objections by severity, and whether the designer's answer to each is accepted — for the person who decides Gate 2.

## Why it exists

A design can pass every later test and still put a dependency in the wrong direction, or choose an abstraction that will not hold the feature after it. Only a structural review, independent of the person who wrote the proposal, catches that kind of wrongness while it still costs a document, not a rewrite (constitution I: a producer is never also its own judge).

## Tier and binding

Constitution II: *"every judge role... must be bound to the strongest model available to the factory, on every substrate, including a purely local one. A weaker binding is a refused configuration, not a warning."* `flow/v2.ts`'s roster lists `architecture-critic` among its five judges; `contracts/src/roles.ts`'s `bindRole`/`TierPolicyError` already refuses any binding weaker than `strongest` for a roster judge — proven for real by r16's generic `reviewer` stand-in, not yet for this specific role name.

## What it's bound to

Gate [2 Architecture](../gates/02-architecture.md) — named directly in `flow/v2.ts` (`judge: "architecture-critic"`). The architecture designer gets one answer round to the critic's objections before the person sees anything (`docs/architecture/explainers/gates/02-architecture.md`).

## Status

**Data only.** `architecture-critic` is a name in `flow/v2.ts`'s roster, checked by `contracts/flow/validate.ts` against Gate 2's `judge:` field — nothing more exists for it under its own name. r16 proved the real-conversation and strongest-tier-refusal mechanism with a generic stand-in (`reviewer`); r17 ([`specs/015-configuration-as-files/`](../../../../specs/015-configuration-as-files/spec.md)) is where this role gets its own `agents/architecture-critic.md` file and a real binding in `tiers.yaml`.

## Where to read more

- [Gate 2 — Architecture](../gates/02-architecture.md)
- [The flow §2](../../../concepts/the-flow.md)
- [The constitution, explained — II](../kiln-constitution.md)
- Legacy (first program, not this role's current home): `docs/concepts/skills/03-meta.md` §2
