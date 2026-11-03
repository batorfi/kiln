# verifier — judges Verification

> **Type:** explainer. **Kind:** judge. **Judges:** [7 Verification](../gates/07-verification.md). **Tier:** strongest, always. **Status:** [data only].
> [← ui-reviewer](./ui-reviewer.md) · [all roles](./README.md) · next: [the producers →](./researcher.md)

## What it does

Proves whether the built feature actually works as specified — running or judging the proof — and, on a failure, diagnoses it so the workers' bounded fix rounds have something precise to act on.

## Why it exists

Code review judges the code by reading it; Verification judges it by running it. Keeping this a separate, independent judge means a convincing-looking diff still has to prove itself, and a failure gets a real diagnosis rather than a guess — the legacy design's own "must not guess; say so and recommend" discipline for this role.

## Tier and binding

Constitution II names the verifier directly among the five strongest-tier judges. This is also the one judge whose gate has an **automatic** move: `mitigate`, capped by the row's own `mitigationCap` (default 2, settable 0–3 at the Roadmap gate) — but `mitigate` belongs to the factory, never a person, and never changes who judges the result or at what tier.

## What it's bound to

Gate [7 Verification](../gates/07-verification.md) — `judge: "verifier"` in `flow/v2.ts`. A person's `reject` with no target sends the work back to the code itself (`@build`); the automatic `mitigate` is bounded and distinct from that person's move.

## Status

**Data only.** Named in the roster and in Gate 7's `judge:` field; no `agents/verifier.md` or real binding exists yet. Legacy folded "diagnosis" into this same role ("the verifier lives there too," per its own deep-dive) — the current roster keeps that: there is no separate diagnosis role in `flow/v2.ts`. r17 gives `verifier` its own real file.

## Where to read more

- [Gate 7 — Verification](../gates/07-verification.md)
- [The flow §2](../../../concepts/the-flow.md)
- [The constitution, explained — II](../kiln-constitution.md)
- Legacy: `docs/concepts/skills/reviewer.md` (the verifier/diagnosis role)
