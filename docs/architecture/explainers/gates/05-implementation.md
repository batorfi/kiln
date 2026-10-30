# Gate 5 — Implementation — *Do we start from a safe point — and is this still one feature?*

> **Type:** explainer. **Phase:** build and prove. **Judge:** none — a control gate. **Delegable:** by default. **Has no reject.** **Internal id:** `5-checkpoint`.
> **Status:** the gate, the restore point and `split+revise` are [built] (r13–r14); sizing the work from a real plan is [planned] (r16–r18).
> [← all twelve gates](./README.md) · [← 4 Work plan](./04-work-plan.md) · next: [6 Code review](./06-code-review.md)

## What it decides

Two things at once: **the go-ahead to write code**, from a clean commit that can be returned to; and the one chance to say *"this is really two features."*

## Why it exists

Code review and UI review can send the work back to *rebuild*. A rebuild needs somewhere to rebuild **from**. This gate makes that commit — the **restorable commit** — records its test state, and puts it in front of a person. It is also the cheapest moment to notice that the plan is bigger than one feature should be: nothing has been built yet, so splitting costs a revision of the plan.

## Before the gate

The director records the restorable commit, runs the tests at it and sizes the work from the plan against past features. If the work is larger than usual, it **proposes a split** and shows what the split would look like. Nothing is judged — there is nothing to judge yet.

## What the person sees first

The starting point and its test state; the size of the work ahead compared with past features; what a split would look like.

## The moves

| Move | Note | Where it leads |
|---|---|---|
| **approve** | optional | building starts |
| **split+revise** | required | the feature keeps part of the work; the rest becomes a **new roadmap row**; the work plan is revised and returns through Work plan and this gate again |

**There is no reject.** A feature about to be built is not "done wrong". To stop it, pause the factory and revisit the roadmap — that is a different decision, taken at a different gate, and not a move kind.

## Delegation

Delegable by default; a **proposed split** is an objection that ends an armed tail, so a feature that looks too big always reaches a person.

## In the running example

The restorable commit is `a1b2c3d`, with the tests green. The plan is two days of work, about the median. No split is proposed. The person approves, and `restart` at Code review would now return to `a1b2c3d`.

If instead the plan had also asked for *PDF export*, the director would propose a split: this feature keeps CSV, and "PDF export" becomes a new roadmap row.

## How it is built

`restorePoint: true` in the gate's data is what makes `restart` legal at all: the flow checker refuses a flow that has a `restart` move with no restore point before it.

[← all twelve gates](./README.md) · [← 4 Work plan](./04-work-plan.md) · next: [6 Code review →](./06-code-review.md)
