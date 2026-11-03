# concept-writer — writes Concept

> **Type:** explainer. **Kind:** producer. **Feeds:** [1 Concept](../gates/01-concept.md). **Tier:** standard (inferred — see Status). **Status:** [data only].
> [← researcher](./researcher.md) · [all roles](./README.md) · next: [architecture-designer →](./architecture-designer.md)

## What it does

Writes the concept — what the feature is and why it is worth building, on what premises — from the researcher's gathered context, for a person to decide at Gate 1.

## Why it exists

Gate 1 asks "is this worth building, on these premises?" before anything about structure or code is decided; a dedicated writer keeps that question answered on its own terms, not folded into whoever happens to design the architecture next.

## Tier and binding

Gate 1 has no judge in the default flow — the person decides directly from the concept itself. The legacy role doc's reasoning for a non-cheap tier here ("not cheap — its back-gate is Architecture") still applies loosely: a weak concept costs an expensive Architecture-gate round-trip to catch. Not yet a decided `tiers.yaml` value.

## What it's bound to

Gate [1 Concept](../gates/01-concept.md) — named directly in [the flow §2](../../../concepts/the-flow.md)'s table. Triage may skip this gate (and Architecture) for a small, well-scoped feature; when skipped, this role's output is skipped with it.

## Status

**Data only.** A name in `flow/v2.ts`'s `roster.producers`. No `agents/concept-writer.md` or real binding exists. r17 gives it one.

## Where to read more

- [Gate 1 — Concept](../gates/01-concept.md)
- [The flow §2](../../../concepts/the-flow.md)
- Legacy: `docs/concepts/skills/writer.md`
