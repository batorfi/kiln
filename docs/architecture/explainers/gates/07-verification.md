# Gate 7 — Verification — *Does it actually work as specified?*

> **Type:** explainer. **Phase:** build and prove. **Judge:** the verifier. **Delegable:** by default. **Internal id:** `7-verification`.
> **Status:** the gate, its two person moves, the bounded fix rounds and their recording are [built] (r13–r14); the verifier and real fix rounds are [planned] (r16).
> [← all twelve gates](./README.md) · [← 6a UI review](./06a-ui-review.md) · next: [8 Documentation](./08-documentation.md)

## What it decides

Whether the feature does what the specification says — **proved by running it**, not assumed from reading it.

## Why it exists

Code review reads; Verification runs. A requirement is only met when something has demonstrated it. And the answer is not always "the code is wrong": sometimes the requirement was.

## Before the gate: the fix rounds

The **verifier** (strongest model, holding the lane) checks each requirement by running it. On failure the factory does not go straight to a person. It runs up to **cap** automatic **fix rounds**: a worker fixes, and *the same verifier* checks again.

* The cap is **2** by default and can be set from **0 to 3** at the Roadmap gate. A factory that wants every failure in front of a person sets 0.
* Each round is a **mitigate** — the factory's move, never a person's. It is recorded in the commit that starts it and it never settles the gate.
* After a **person's** reject there are no more automatic rounds.
* The brief always shows the cap and the rounds used.

## What the person sees first

The result per requirement; the fix rounds already tried and what each changed; the verifier's diagnosis — **including when the requirement itself may be wrong**.

## The moves

| Move | Note | Where it leads |
|---|---|---|
| **approve** | optional | Documentation. Any requirement that still failed is recorded as *accepted by the person* |
| **reject** | required | **the code**: back to implementation on the current code with the note and diagnosis — or to Specification, if the note says the yardstick is wrong |
| *mitigate* | — | automatic, bounded by the cap; a worker fixes and the same verifier re-checks |

A reject to the code re-opens Code review, UI review (if it applies), Verification, Documentation and Merge. A reject to Specification re-opens everything from Specification on.

## Delegation

Delegable by default. A verifier's **`reject`** is an objection that ends an armed tail. A clean pass under delegation settles as *approved under delegation*.

## In the running example

R1 and R3 pass. R2 fails: a 100 000-row report freezes the tab for nine seconds. Round 1: a worker moves the formatting out of the request handler; the verifier re-runs — still 4 seconds. Round 2: streaming rows; the same verifier re-runs — passes. The gate opens with the evidence of both rounds. The person approves.

Had round 2 also failed, the gate would open for a person with the diagnosis *"R2's limit may be unrealistic for this database"* — and rejecting to Specification would be the right move.

## How it is built

`mitigationCap: { default: 2, min: 0, max: 3 }` is in the gate's data and `kiln check flow` refuses a flow whose cap is outside 0–3. A person's reject with no target goes `@build`: the code itself, after the restore point and before Code review.

[← all twelve gates](./README.md) · [← 6a UI review](./06a-ui-review.md) · next: [8 Documentation →](./08-documentation.md)
