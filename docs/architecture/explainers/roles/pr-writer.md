# pr-writer — writes Merge's pull request

> **Type:** explainer. **Kind:** producer. **Feeds:** [9 Merge](../gates/09-merge.md). **Tier:** cheap (inferred — see Status). **Status:** [data only].
> [← techwriter](./techwriter.md) · [all roles](./README.md) · next: [adr-maker →](./adr-maker.md)

## What it does

Writes the pull request description — the change, why it was made, one verification summary — from the docs and the diff, for the person who decides Gate 9 (where **approve means merge**).

## Why it exists

Merge is the last gate and the only one where "approve" has an irreversible, externally visible consequence. A dedicated, narrow writer keeps that description accurate to what the docs and diff already say, without adding claims no earlier gate actually judged.

## Tier and binding

[The flow §2](../../../concepts/the-flow.md) names "PR writer" directly at Gate 9. Legacy's own framing — "must not add explanation beyond what the doc + diff already say," "must not merge on the writer's say-so" — carries over as the role's boundary regardless of tier; a specific `tiers.yaml` value is not yet decided, but the legacy default (cheap, the tail of the lane) is a reasonable one.

## What it's bound to

Gate [9 Merge](../gates/09-merge.md) — no `judge:` field; the gate's own checks and any required team reviews stand in its place. A `reject` here may target the roadmap (one of only two gates, with Concept, where that target is allowed).

## Status

**Data only.** A name in `flow/v2.ts`'s `roster.producers`. No `agents/pr-writer.md` or real binding exists. r17 gives it one.

## Where to read more

- [Gate 9 — Merge](../gates/09-merge.md)
- [The flow §2](../../../concepts/the-flow.md)
- Legacy: `docs/concepts/skills/writer.md`, `docs/concepts/skills/03-meta.md` §4
