# worker — does the build

> **Type:** explainer. **Kind:** producer. **Feeds:** [5 Implementation](../gates/05-implementation.md) through [7 Verification](../gates/07-verification.md) (the build phase generally). **Tier:** per-task (inferred — see Status). **Status:** [data only as a *named* role — see below].
> [← feature-size-triage](./feature-size-triage.md) · [all roles](./README.md) · next: [techwriter →](./techwriter.md)

## What it does

Implements the work plan's tasks in order, running tests as it goes, producing the diff that Code review and Verification judge and the UI review checks against (where it applies).

## Why it exists

This is the role every judge in the build-and-prove phase stands against: the workers write, [code-reviewer](./code-reviewer.md) and [ui-reviewer](./ui-reviewer.md) and [verifier](./verifier.md) each independently check, a person decides. [The flow §2](../../../concepts/the-flow.md) names "workers" (plural, generic) at Code review, UI review and Verification alike — this is the one producer role that spans the whole build phase, not a single gate's artifact.

## Tier and binding

Legacy's own reasoning holds: a per-task tier, the one long-running resident role on the lane while it builds. No judge stands directly over this role's *process* — only over what it produces, at each of the three gates above.

## What it's bound to

[5 Implementation](../gates/05-implementation.md) (no judge — the director decides whether to start from a safe point), [6 Code review](../gates/06-code-review.md) (judged by code-reviewer), [6a UI review](../gates/06a-ui-review.md) (judged by ui-reviewer, conditional), [7 Verification](../gates/07-verification.md) (judged by verifier; a `reject` with no target sends the work back here).

## Status

**This is the one role r16 actually proved real** — but as a **generic, provisional stand-in**, not as its own configured role. `workers/src/roster.ts`'s `PROVISIONAL_ROSTER.worker` entry is exactly this name, bound to tier `standard`, with `read-file`/`write-file` tools, running real conversations end to end (the row's own acceptance line). Its own file header says r17 replaces it wholesale with a real `agents/worker.md` and a real `tiers.yaml` binding — the mechanism is proven; the specific, final role file is not yet written.

## Where to read more

- [Gate 6 — Code review](../gates/06-code-review.md), [Gate 7 — Verification](../gates/07-verification.md)
- [The flow §2](../../../concepts/the-flow.md)
- `kiln/packages/workers/src/roster.ts` (the provisional stand-in this role replaces)
- Legacy: `docs/concepts/skills/01-generic-roles.md` §5
