# Gate 6a — UI review — *Does the built interface match the approved experience, and is it accessible and consistent?*

> **Type:** explainer. **Phase:** build and prove. **Judge:** the UI reviewer, with a deterministic UI checker. **Delegable:** never. **Applies:** when the feature touches the interface. **Internal id:** `6a-ui-review`.
> **Status:** the gate, its applicability rule (including the late switch-on) and its recording are [built] (r12–r14); the UI checker and the UI reviewer are [planned] (r16, r17).
> [← all twelve gates](./README.md) · [← 6 Code review](./06-code-review.md) · next: [7 Verification](./07-verification.md) · full definition: [ui-flow §5](../../../concepts/ui-flow.md)

## What it decides

Whether the interface that was **built** matches the interface that was **approved** at [Experience design](./02a-experience-design.md): accessibility, design tokens, states, structure and visual match.

## Why it exists

Code can be correct and the screen still wrong. A button that works but cannot be reached by keyboard, a colour that is not a token, a designed state that was never built: none of these fail a unit test. This gate compares approved against built, before anything is proved.

## Does it apply?

Like Experience design, it carries a deterministic rule: the same path and label predicates, **plus** what the diff actually changed — `ui_files_changed`, `tokens_changed` or `routes_changed`.

It is the **only gate that can turn on after admission**. If it was pinned *not applicable* at admission and nobody required it, the diff predicates are read at this gate's own slot; if one is true, the gate becomes applicable, is recorded as such, and opens. A feature that was expected to be backend-only but changed a stylesheet therefore still gets its UI review. **Nothing ever turns an applicable gate off.**

## Before the gate

The **UI checker** is deterministic — no model judging. It builds the feature in the factory's worktree, runs it on a loopback port and walks every screen and state in the approved `experience.md`, recording accessibility results, contrast and sizing, tokens, states, visual difference, content and structure. The **UI reviewer** (strongest model, holding the lane) reads that structured evidence against the experience and the charter, and reports findings by severity — including a deviation that is *better* than the mockup and should be adopted.

If the strongest model cannot read images, the reviewer judges from the structured evidence and the brief **says so**. It never hands screenshots to a weaker model and calls the result a judgement.

## What the person sees first

Approved against built, side by side, per screen and state; the check table with counts and locations; the reviewer's findings; whether the reviewer saw the images; any deviations accepted at Experience design.

## The moves

| Move | Note | Where it leads |
|---|---|---|
| **approve** | optional — use it to name *accepted deviations* | Verification |
| **revise** | required | the **workers** fix on the current code, the checker re-runs, a fresh reviewer looks again |
| **restart** | required | a fresh build from the restorable commit — or, if the *experience* was wrong, say so in the note and send the feature back to Experience design |

## Delegation

**Never delegable.** An armed tail stops here on an interface feature and waits for a person.

## In the running example

The checker finds the export button has no visible focus ring and its *failed* state, approved with a retry action, was built without one. The reviewer reports both. The person revises: *"focus ring from the token; retry on failed."* After the fix and a fresh check, they approve, naming the deferred empty-report case as an accepted deviation.

## How it is built

`check: "ui-checker"` and `judge: "ui-reviewer"` are both in the gate's data. The late switch-on is `atUiSlot()`, a pure function of the diff facts; the walk records the change exactly once.

[← all twelve gates](./README.md) · [← 6 Code review](./06-code-review.md) · next: [7 Verification →](./07-verification.md)
