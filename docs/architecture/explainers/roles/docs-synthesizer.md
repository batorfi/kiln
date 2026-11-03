# docs-synthesizer — cross-feature synthesis, off-lane

> **Type:** explainer. **Kind:** producer (status changed from legacy — see below). **Feeds:** no gate — a human-invoked, cross-feature pass. **Tier:** not yet decided (legacy's own framing no longer applies as-is — see below). **Status:** [data only].
> [← adr-maker](./adr-maker.md) · [all roles](./README.md) · back to: [the judges](./architecture-critic.md)

## What it does

Writes broad, synthesized documentation from the project's **full history** — every feature's specs, plans, decisions, the factory-log, the current code — not an incremental per-feature update (that is [techwriter](./techwriter.md)'s job). It is not scheduled by any feature's walk; a person invokes it directly, across features.

## Why it exists — and a status change worth knowing

Legacy (the first program) treated this as a **fourth line-of-defense role**, alongside the architecture critic, the verifier and the code reviewer: *"a line-of-defense, cross-feature role... run on the strongest resident model, even on a local setup... its backgate is not a model on the next lane step; it is the human who reviews the draft."*

**Correction**: an earlier draft of this page attributed a direct quote to "constitution II's own 'watch out for'" — the constitution file itself (`.specify/memory/constitution.md`) contains no such phrase. The real source is the PRD's own record of constitution v2.0.0's enactment: *"Principle II now binds every judge role... to the strongest model (the Documentation gate is unjudged, so the Docs Synthesizer is no longer a line of defense)"* (`docs/prd/kiln-prd.md`, the note above the constitution-impact table, §"Enacted 2026-10-21 as constitution v2.0.0"). The causal chain is: the Documentation gate itself became unjudged in v2.0.0 — not a rule naming this role individually — and `flow/v2.ts`'s roster places `docs-synthesizer` among the **producers**, not the judges, confirming the demotion followed through. This role no longer carries the strongest-tier guarantee the other four backstops do.

## Tier and binding

Not yet decided. Since it is no longer a line-of-defense role, the strongest-model requirement constitution II states for the five roster judges does **not** apply to it by rule — a `tiers.yaml` binding for it is a real, open choice for whoever writes `agents/docs-synthesizer.md`, not a foregone conclusion either way.

## What it's bound to

No gate — not one of the twelve. Not named in [the flow's](../../../concepts/the-flow.md) own gate-by-gate table at all; its existence is attested only by `flow/v2.ts`'s roster and the legacy role doc.

## Status

**Data only.** A name in `flow/v2.ts`'s `roster.producers`; nothing else exists for it. r17 gives it a real file, if this row's own scope reaches it.

## Where to read more

- [The PRD — constitution v2.0.0's enactment note](../../../prd/kiln-prd.md), [the constitution, explained — II](../kiln-constitution.md)
- Legacy: `docs/concepts/skills/docs-synthesizer.md`, `docs/concepts/skills/03-meta.md` (describes the *superseded* line-of-defense framing — read for history, not current status)
