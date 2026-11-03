# code-reviewer — judges Code review

> **Type:** explainer. **Kind:** judge. **Judges:** [6 Code review](../gates/06-code-review.md). **Tier:** strongest, always. **Status:** [data only].
> [← design-critic](./design-critic.md) · [all roles](./README.md) · next judge: [ui-reviewer →](./ui-reviewer.md)

## What it does

Reads the diff the workers produced, measured against the specification and the design, and produces findings by severity for the person who decides Gate 6. It never edits — a `revise` goes to the workers, not to this role.

## Why it exists

An independent critique is cheaper than a failed proof and catches different things: a requirement quietly left unimplemented, a change that goes beyond the plan, a shortcut the tests do not notice. Keeping the reviewer from editing is what keeps author and judge different roles (constitution I) — a model that could fix what it finds could also quietly approve its own fix.

## Tier and binding

Constitution II names it directly, and `docs/architecture/explainers/gates/06-code-review.md` already describes the consequence: *"the reviewer never edits... that is what keeps judge and author different roles."* A weaker binding than `strongest` is a refused configuration.

## What it's bound to

Gate [6 Code review](../gates/06-code-review.md) — `judge: "code-reviewer"` in `flow/v2.ts`. `revise` sends the findings to the **workers**, not to this role (`REVISE_TO_WORKERS` in the flow data); a `restart` rebuilds from the restorable commit set at Implementation.

## Status

**Data only.** Named in the roster and in Gate 6's `judge:` field; no `agents/code-reviewer.md` or real binding exists under this name. r16's generic `reviewer` stand-in proved the mechanism (a judge refused below `strongest`, a real conversation holding the lane); r17 gives this specific role its own file.

## Where to read more

- [Gate 6 — Code review](../gates/06-code-review.md)
- [The flow §2](../../../concepts/the-flow.md)
- [The constitution, explained — I, II](../kiln-constitution.md)
- Legacy: `docs/concepts/skills/reviewer.md`
