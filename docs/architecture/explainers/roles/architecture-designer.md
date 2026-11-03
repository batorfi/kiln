# architecture-designer — writes Architecture

> **Type:** explainer. **Kind:** producer. **Feeds:** [2 Architecture](../gates/02-architecture.md). **Tier:** standard (inferred — see Status). **Status:** [data only].
> [← concept-writer](./concept-writer.md) · [all roles](./README.md) · next: [ux-designer →](./ux-designer.md)

## What it does

Proposes a structure for the approved concept — module boundaries, data flow, the abstractions it introduces — and the alternatives it considered, then gets one answer round to the architecture critic's objections before the person sees anything.

## Why it exists

Separating the role that proposes a structure from the role that judges it (`architecture-critic`) is what makes the judgment independent (constitution I). The one answer round before the person sees anything means the person decides on a dialogue, not a raw objection the proposer never had a chance to address.

## Tier and binding

[The flow §2](../../../concepts/the-flow.md)'s table calls this role "designer"; `flow/v2.ts`'s roster spells it `architecture-designer` — the same role, the roster's own name for it. Producers may run cheaper than their judge *because* a strong judge and a person stand on the gate's far side (constitution II's rationale) — a specific tier is not yet decided.

## What it's bound to

Gate [2 Architecture](../gates/02-architecture.md), judged by [architecture-critic](./architecture-critic.md). A `reject` here may go to a fresh designer, or back to Concept if the note says the premise itself is wrong.

## Status

**Data only.** A name in `flow/v2.ts`'s `roster.producers`. No `agents/architecture-designer.md` or real binding exists. r17 gives it one.

## Where to read more

- [Gate 2 — Architecture](../gates/02-architecture.md)
- [The flow §2](../../../concepts/the-flow.md)
- Legacy: `docs/concepts/skills/designer.md`
