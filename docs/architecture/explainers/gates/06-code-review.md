# Gate 6 — Code review — *Is the code right, measured against the specification?*

> **Type:** explainer. **Phase:** build and prove. **Judge:** the code reviewer. **Delegable:** by default. **Internal id:** `6-review`.
> **Status:** the gate, its three moves and their consequences are [built] (r13–r14); the workers and the reviewer are [planned] (r16).
> [← all twelve gates](./README.md) · [← 5 Implementation](./05-implementation.md) · next: [6a UI review](./06a-ui-review.md)

## What it decides

Whether the code, as written, is **right against the specification** and the design — before anything is run as proof.

## Why it exists

An independent critique is cheaper than a failed proof and catches different things: a requirement quietly not implemented, a change that goes beyond the plan, a shortcut the tests do not notice. The reviewer reads; it does not build.

## Before the gate

**Workers** implement the tasks in order, running tests as they go; a person may watch and steer them. The **code reviewer** — strongest model, holding the lane — then reads the diff against the specification and the design.

## What the person sees first

The changes **mapped to requirements**; the findings by severity with locations; on a return round, how the previous note was addressed.

## The moves

| Move | Note | Where it leads |
|---|---|---|
| **approve** | optional | UI review if it applies, otherwise Verification. Open minor findings are carried forward and recorded as *accepted* |
| **revise** | required | the **workers**, on the current code, with the findings and the note; then a *fresh* reviewer conversation reviews the **whole** diff again |
| **restart** | required | a fresh build from the restorable commit, with the findings and the note — for when the approach itself is wrong |

**The reviewer never edits.** `revise` goes to the workers, never to the reviewer. That is what keeps judge and author different roles: no model approves its own work.

A `restart` re-opens Code review, UI review (if it applies), Verification, Documentation and Merge. Concept, design, specification, plan and the restorable commit are kept.

## Delegation

Delegable by default. A reviewer's **`restart`** is an objection that ends an armed tail.

## In the running example

The reviewer maps R1–R3 to the diff and finds that R3 (no export without the right) is enforced on the page but **not on the endpoint**. A severity-high finding. The person revises: *"enforce on the endpoint; the page check is not a security boundary."* The workers fix it on the current code; a fresh reviewer reads the whole diff again, and finds nothing. The person approves.

## How it is built

`revise` here uses a different consequence from `revise` at Specification (`workers` instead of `author`), declared in the gate's data and checked by `kiln check flow`. The `revise` move at this gate was added in constitution v2.0.1.

[← all twelve gates](./README.md) · [← 5 Implementation](./05-implementation.md) · next: [6a UI review →](./06a-ui-review.md)
