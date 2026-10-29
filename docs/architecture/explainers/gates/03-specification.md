# Gate 3 — Specification — *What exactly counts as done?*

> **Type:** explainer. **Phase:** contract. **Judge:** none (deterministic checks). **Delegable:** never — but it is where the tail is **armed**. **Internal id:** `3-spec`.
> **Status:** the gate, its moves and the arming point are [built] as data and a walk (r13–r14); the spec writer is [planned] (r16), the arming itself acts at [planned] r21.
> [← all twelve gates](./README.md) · [← 2a Experience design](./02a-experience-design.md) · next: [4 Work plan](./04-work-plan.md)

## What it decides

What "done" **means** — as numbered requirements, each with how it will be proven — and what the feature does *not* promise.

## Why it exists

Everything after this gate is measured against it. [Code review](./06-code-review.md) reads the diff against the specification; [Verification](./07-verification.md) runs each requirement. A fuzzy requirement here is a fuzzy judgement at every later gate, so it is the one document that is worth the most care.

## Before the gate

A **spec writer** turns the concept, the design and (where it applies) the approved experience into numbered requirements. **Deterministic checks** confirm that every requirement is testable and traces back to the concept. There is no judge: the checks are the yardstick, and they are not opinion.

## What the person sees first

Requirement by requirement: what done means and how it will be proven; what the specification does **not** promise; and the **arming option**.

## The moves

| Move | Note | Where it leads |
|---|---|---|
| **approve** | optional | Work plan |
| **revise** | required | the same spec writer, with the note |
| **reject** | required | a fresh spec writer — or an earlier gate the note names |
| *approve + arm the tail* | — | as approve, and delegation is armed for the gates after this one |

## The unattended tail

This is the **only** place delegation can be armed — never at the Roadmap gate, never at an added gate. By default it covers Work plan through Documentation; Merge only if the person includes it; **UI review is never covered**, so on an interface feature the tail stops there and waits.

On a covered gate with a clean path, the gate settles as *approved under delegation*, naming the delegation and never a person. **Any objection** ends it: a critic's objection, a code reviewer's `restart`, a verifier's `reject`, a proposed split, a blocked request, a reached budget. That gate and every gate after it then wait for a person, and the brief says why. **[planned]** (r21)

## In the running example

Three requirements: *R1* the export contains every row the page shows, in the page's order; *R2* a report of 100 000 rows downloads without the page freezing; *R3* a user without the right to see the report cannot export it. Each says how it will be proven. The brief says it does **not** promise Excel formatting. The person approves and arms the tail, leaving UI review and Merge for themselves.

## How it is built

`armsTail` is a flag on this gate's data, and the contract allows arming here only. The spec is a Spec Kit artifact in the feature's directory (`specs/NNN-name/`).

[← all twelve gates](./README.md) · [← 2a Experience design](./02a-experience-design.md) · next: [4 Work plan →](./04-work-plan.md)
