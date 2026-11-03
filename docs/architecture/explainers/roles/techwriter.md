# techwriter — writes Documentation

> **Type:** explainer. **Kind:** producer. **Feeds:** [8 Documentation](../gates/08-documentation.md). **Tier:** cheap (inferred — see Status). **Status:** [data only].
> [← worker](./worker.md) · [all roles](./README.md) · next: [pr-writer →](./pr-writer.md)

## What it does

Updates the repository's docs from the as-built code and writes the feature's story, for a person to decide at Gate 8.

## Why it exists

The Documentation gate has **no judge** in the default flow — the PRD's own record of constitution v2.0.0's enactment names exactly this change ("the Documentation gate is unjudged, so the Docs Synthesizer is no longer a line of defense," `docs/prd/kiln-prd.md`; not constitution.md itself, which states the rule but not this rationale). The person decides directly from what this role writes, measured against what was actually built, not against a judge's verdict.

## Tier and binding

[The flow §2](../../../concepts/the-flow.md) names "techwriter, wiki keeper" together at Gate 8 — this roster has `techwriter` but not a separate "wiki keeper" role; that concept, if built, is a later row's (the factory wiki, r23/r24). Legacy's own reasoning (cheap, a neighbor of pr-writer) is a reasonable carried-over default.

## What it's bound to

Gate [8 Documentation](../gates/08-documentation.md) — no `judge:` field in `flow/v2.ts`. `revise` here goes to a fresh techwriter pass.

## Status

**Data only.** A name in `flow/v2.ts`'s `roster.producers`. No `agents/techwriter.md` or real binding exists. r17 gives it one.

## Where to read more

- [Gate 8 — Documentation](../gates/08-documentation.md)
- [The flow §2](../../../concepts/the-flow.md)
- [The PRD — constitution v2.0.0's enactment note](../../../prd/kiln-prd.md) on Documentation's missing judge
- Legacy: `docs/concepts/skills/writer.md`
