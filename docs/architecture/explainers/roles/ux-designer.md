# ux-designer — writes Experience design

> **Type:** explainer. **Kind:** producer. **Feeds:** [2a Experience design](../gates/02a-experience-design.md) *(conditional)*. **Tier:** standard (inferred — see Status). **Status:** [data only].
> [← architecture-designer](./architecture-designer.md) · [all roles](./README.md) · next: [feature-size-triage →](./feature-size-triage.md)

## What it does

Proposes the experience for a feature that touches the interface — flows, mockups, a states matrix — against the project's experience charter and design system, for the design critic to judge and the person to decide at Gate 2a.

## Why it exists

This role, and the gate and judge around it, are the twelve-gate flow's own addition over the legacy nine-gate design — a feature touching the interface gets a dedicated proposer and an independent judge of fit-to-charter, distinct from the structural proposal Architecture already covers.

## Tier and binding

[The flow §2](../../../concepts/the-flow.md) names "ux designer" directly for Gate 2a. No tier is yet decided in `tiers.yaml`; by the same producer/judge cost logic as `architecture-designer`, a cheaper tier is plausible here precisely because [design-critic](./design-critic.md) stands on the gate's far side.

## What it's bound to

Gate [2a Experience design](../gates/02a-experience-design.md) — conditional on the same interface rule (`appliesWhen`) the gate itself carries. A feature that never touches the interface records the gate **not applicable**, and this role never runs for it.

## Status

**Data only.** A name in `flow/v2.ts`'s `roster.producers`. This role is new with the twelve-gate flow — no legacy deep-dive exists to carry forward. r17 gives it a real file.

## Where to read more

- [Gate 2a — Experience design](../gates/02a-experience-design.md)
- [The flow §2](../../../concepts/the-flow.md)
