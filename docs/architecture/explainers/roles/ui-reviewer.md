# ui-reviewer — judges UI review

> **Type:** explainer. **Kind:** judge. **Judges:** [6a UI review](../gates/06a-ui-review.md) *(conditional)*. **Tier:** strongest, always. **Status:** [data only].
> [← code-reviewer](./code-reviewer.md) · [all roles](./README.md) · next judge: [verifier →](./verifier.md)

## What it does

Checks whether the built interface actually matches the experience approved at Gate 2a — and is accessible and consistent with the design system — producing findings (alongside a deterministic `ui-checker`'s own results) for the person who decides Gate 6a.

## Why it exists

Code review (Gate 6) judges correctness against the specification; it does not judge whether the *built* interface still matches the *approved* experience. Without a separate judge here, a feature could pass Code review while silently drifting from the design Gate 2a approved — a different kind of gap than a functional bug.

## Tier and binding

Constitution II names `ui-reviewer` directly among the five judges requiring the strongest model. Unlike the other four, this gate pairs the judge with a **deterministic check** (`check: "ui-checker"` in `flow/v2.ts`) — the checker is not a model role and is not in the roster; it is a tool-level check the judge's evidence includes alongside its own verdict.

## What it's bound to

Gate [6a UI review](../gates/06a-ui-review.md) — `judge: "ui-reviewer"`, `check: "ui-checker"`, with the same `appliesWhen` interface rule as Experience design, plus a diff-based condition (`ui_files_changed`, `tokens_changed`, `routes_changed`). Unlike Gate 2a, this gate is **never delegable** even when an unattended tail is armed — someone always looks at the built interface directly.

## Status

**Data only.** Named in the roster and in Gate 6a's `judge:` field; no `agents/ui-reviewer.md` or real binding exists yet, and (like `design-critic`) this role is new with the twelve-gate flow — there is no legacy deep-dive to carry forward. r17 is where it gets a real file.

## Where to read more

- [Gate 6a — UI review](../gates/06a-ui-review.md)
- [The flow §2](../../../concepts/the-flow.md)
- [The constitution, explained — II](../kiln-constitution.md)
