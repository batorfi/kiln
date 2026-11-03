# feature-size-triage — proposes whether a feature may skip Concept and Architecture

> **Type:** explainer. **Kind:** producer (status changed from legacy — see below). **Feeds:** the walk's admission step, not a gate of its own. **Tier:** cheap (inferred — see Status). **Status:** [data only].
> [← ux-designer](./ux-designer.md) · [all roles](./README.md) · next: [worker →](./worker.md)

## What it does

Reads a raw feature and proposes whether it is small and well-scoped enough to skip the Concept and Architecture gates — a size, and the reasoning behind it. The walk engine, not this role, decides whether the skip is actually recorded (constitution V: nothing but a committed state change settles anything).

## Why it exists — and a status change worth knowing

Legacy (the first program, nine gates) treated this as **triage, a gate itself**: *"Triage is a gate, not a worker: it runs first... its verdict decides which gates this feature walks."* The current, twelve-gate flow does **not** implement triage as a gate: `flow/v2.ts` has no `triage` gate at all. Instead, `1-concept` and `2-architecture` each carry a `triage: "skippable"` property, and the walk evaluates and records *skipped* (with the reasoning) from a **producer's proposal** — this role — not from a person's move at a gate of its own. The roster places `feature-size-triage` among the **producers**, confirming this is now a proposal a deterministic step evaluates, not a decision this role or any gate makes.

## Tier and binding

Legacy called this "the single cheapest decision in the whole pipeline" and "the lane's cost optimization" — a reasonable default to carry forward, not yet a decided `tiers.yaml` value. No judge examines this role's proposal; the walk's own deterministic evaluation is what the flow actually checks (`contracts/flow/engine.ts`'s applicability logic), and a person sees the recorded reasoning in every later brief.

## What it's bound to

No gate of its own. The real-worker fixture's own shape (`kiln/fixtures/walk-real-worker.json`) already carries a `triage: {skip, reasoning}` field at the feature level — this role is the producer whose output would fill that field for a real (not scripted) walk.

## Status

**Data only.** A name in `flow/v2.ts`'s `roster.producers`; nothing beyond that exists for it under its own name. r17 gives it a real file.

## Where to read more

- [The flow §3 — skipping](../../../concepts/the-flow.md)
- Legacy: `docs/concepts/skills/triage.md` (describes the *old*, gate-based design — read for rationale, not for how this works today)
