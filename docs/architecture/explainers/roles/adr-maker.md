# adr-maker — records a settled decision

> **Type:** explainer. **Kind:** producer, off-gate. **Feeds:** no gate — follows one. **Tier:** cheap (inferred — see Status). **Status:** [data only].
> [← pr-writer](./pr-writer.md) · [all roles](./README.md) · next: [docs-synthesizer →](./docs-synthesizer.md)

## What it does

Formalizes a decision a gate has just settled — if there is one worth a standing record — into a numbered, immutable architecture decision record. It does not decide anything itself; the decision already happened at the gate it follows.

## Why it exists

A gate's outcome is recorded in the event stream (constitution VII) regardless; this role exists for the *human-readable, standalone* record a later feature's designer or researcher can find and cite directly, without reconstructing it from the event history. The legacy role doc is explicit that this role must not be treated as a gate itself, and must not create a record for a non-decision.

## Tier and binding

Not a judge, not judged. Legacy's own framing: a cheap, "warm" unit the lane may run between strongest-tier passes — a reasonable default to carry forward, not yet decided in `tiers.yaml`.

## What it's bound to

No gate in `flow/v2.ts`. Not named anywhere in [the flow's](../../../concepts/the-flow.md) own gate-by-gate table — this page's mapping ("follows whichever gate just settled a decision worth recording") is carried over from the legacy role doc, not confirmed by any current flow data.

## Status

**Data only.** A name in `flow/v2.ts`'s `roster.producers`; nothing else exists for it. r17 gives it a real file, if this row's own scope reaches it — CFG-7's roles requirement does not name a priority order among the ten producers.

## Where to read more

- Legacy: `docs/concepts/skills/03-meta.md` §3, `docs/concepts/skills/01-generic-roles.md` §10 (its only documented home — this role has no current-flow companion page)
