# design-critic — judges Experience design

> **Type:** explainer. **Kind:** judge. **Judges:** [2a Experience design](../gates/02a-experience-design.md) *(conditional)*. **Tier:** strongest, always. **Status:** [data only].
> [← architecture-critic](./architecture-critic.md) · [all roles](./README.md) · next judge: [code-reviewer →](./code-reviewer.md)

## What it does

Reads the UX designer's proposed experience — flows, mockups, a states matrix — against the project's experience charter and design system, and produces evidence for the person who decides Gate 2a.

## Why it exists

Experience design and UI review are the twelve-gate flow's own addition over the legacy nine-gate flow — a feature that touches the interface gets an independent judgment of *fit to the charter*, not only a structural judgment (Architecture) or a correctness judgment (Code review). Without a separate judge here, nothing independent checks whether a design actually serves the users and journeys it claims to, before any code is written against it.

## Tier and binding

Constitution II names `design-critic` explicitly: *"the architecture critic at Architecture, **the design critic at Experience design**, the code reviewer at Code review, the UI reviewer at UI review, the verifier at Verification... must be bound to the strongest model."* Same refusal rule as every other judge: a weaker binding is refused, not warned; an unavailable strongest model makes the judged step wait, never substitutes.

## What it's bound to

Gate [2a Experience design](../gates/02a-experience-design.md) — `judge: "design-critic"` in `flow/v2.ts`, with the gate's own `appliesWhen` rule (paths under `web/**`, `app/**`, `**/*.tsx`, `**/*.vue`, `**/*.css`, `design/**`, or a `ui` label, or any named journey) deciding whether the gate — and so this judge's work — applies at all. A feature that never touches the interface records this gate **not applicable**, and `design-critic` never runs.

## Status

**Data only.** Named in `flow/v2.ts`'s roster and Gate 2a's `judge:` field; no `agents/design-critic.md` or real binding exists yet. This role did not exist in the legacy (first-program) flow at all — it is new with the twelve-gate flow of constitution 2.1.0, so there is no prior deep-dive to carry forward from. r17 is where it gets a real file.

## Where to read more

- [Gate 2a — Experience design](../gates/02a-experience-design.md)
- [The flow §2](../../../concepts/the-flow.md)
- [The constitution, explained — II](../kiln-constitution.md)
