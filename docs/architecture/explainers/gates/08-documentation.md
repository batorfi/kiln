# Gate 8 — Documentation — *Do the docs describe what was actually built?*

> **Type:** explainer. **Phase:** release. **Judge:** none (unjudged since constitution v2.0.1). **Delegable:** by default. **Never skipped by triage.** **Internal id:** `8-docs`.
> **Status:** the gate and its moves are [built] (r13–r14); the techwriter and the knowledge-base work are [planned] (r16, r23, r24).
> [← all twelve gates](./README.md) · [← 7 Verification](./07-verification.md) · next: [9 Merge](./09-merge.md)

## What it decides

Whether the repository's documentation, and the factory's knowledge base, now describe what was **built** — not what was intended.

## Why it exists

The next feature, and the next person, will read these pages and trust them. Intent drifts from outcome during every build; this gate is where the two are put back together, after Verification has settled what the outcome is.

It is also where the knowledge base is completed: the feature's **implementation digest** — feature story, overviews, explainers, how-tos, learnings. That is why it is a gate of its own and not folded into Merge, even for a small feature, and why triage never skips it.

## Before the gate

A **techwriter** updates the repository's docs from the as-built code. A **wiki keeper** completes the digest. There is no judge; the check is whether the docs and the code agree.

## What the person sees first

What the docs now say compared with what was built; **gaps in both directions** — built and not documented, documented and not built; what the feature added to the knowledge base.

## The moves

| Move | Note | Where it leads |
|---|---|---|
| **approve** | optional | Merge |
| **revise** | required | the same techwriter, with the note |
| **reject** | required | a fresh techwriter — or an earlier gate the note names |

## Delegation

Delegable by default, and it is the gate an armed tail crosses most often — the docs of a clean feature are rarely controversial. The delegation still names itself in the record and shows in the Merge brief.

## In the running example

The techwriter adds a short guide, "Exporting a report as CSV", and updates the API page with the new endpoint. The brief shows one gap: the API page lists the endpoint, but the access rule from R3 is not mentioned. The person revises: *"say who can export."* The techwriter adds the line; the person approves.

## How it is built

A standard gate. Its only special property is on the other side: triage cannot skip it, which is why a "small" feature still passes Documentation.

[← all twelve gates](./README.md) · [← 7 Verification](./07-verification.md) · next: [9 Merge →](./09-merge.md)
