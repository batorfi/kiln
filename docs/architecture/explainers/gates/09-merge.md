# Gate 9 — Merge — *Do we ship it?*

> **Type:** explainer. **Phase:** release. **Judge:** none (checks and, in a team, required reviews). **Delegable:** only **explicitly**. **Always last.** **Internal id:** `9-pr`.
> **Status:** the gate, its moves and the walk's end are [built] (r13–r14); the pull-request writer, the code-host integration and team reviews are [planned] (r16, r38).
> [← all twelve gates](./README.md) · [← 8 Documentation](./08-documentation.md) · [back to the Roadmap gate](./00-roadmap.md)

## What it decides

Whether the feature **ships**. This is the only point where "ship it" is authorised, and one person confirms the whole feature end to end.

## Why it exists

Every earlier gate decided a part. This one decides the whole, with every part's decision in view — including which were made by a person and which were *approved under delegation*. If an armed tail crossed gates, this is where the person finds out which, and why.

## Before the gate

A **PR writer** prepares the pull request. Checks run. In a team, the required reviews, the code host's merge queue and any base drift are gathered.

## What the person sees first

Every gate's decision and **by whom** (a person or a delegation); risks carried forward; what merging will do; what left the machine; what the feature added to the knowledge base.

## The moves

| Move | Note | Where it leads |
|---|---|---|
| **approve** | optional | **merge** — and the Roadmap gate re-opens for the next feature |
| **reject** | required | the gate the note names, or **out of the lane to the roadmap** |

Merge and [Concept](./01-concept.md) are the two gates whose reject may target the roadmap. A reject to an earlier gate re-opens that gate and every gate after it; a reject to the roadmap ends the feature's walk without a merge, and its work stays in the record.

## Delegation

Not covered by an armed tail **unless the person included it** when arming at Specification. If it is covered, the usual rule holds: any objection ends the delegation and the gate waits for a person.

## After Merge

The record closes the feature. The knowledge digest is finalised. Insights count the feature's rounds, waits and machine time. A finished feature is **archived by the factory** — a checksummed file, verified before any tombstone, with its move keys kept. And the Roadmap gate opens again.

## In the running example

The brief lists every gate's decision: all by the person, except Work plan and Documentation, which are named as *approved under delegation*. The carried risk is the empty-report case. Nothing left the machine. The person approves; the pull request merges; the Roadmap gate opens for the next row.

## How it is built

The walk ends at this gate. Its end — merged, rejected to the roadmap, or not admitted at the first gate — is the walk's recorded outcome, and the archive task is created the moment it ends. Archiving is built (r15); its output is the file the record's [explainer](../the-record.md#11-archive-leaving-the-live-store-without-leaving-the-record) describes.

[← all twelve gates](./README.md) · [← 8 Documentation](./08-documentation.md) · [back to the Roadmap gate](./00-roadmap.md)
