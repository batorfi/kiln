# r29 — New codebases

> **Roadmap row r29** · phase: Getting started · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Start a codebase from nothing with intent before code: a product brief, a constitution written from it, technology choices decided and recorded by a person, and a walking skeleton — built, tested, in CI — verified from a clean clone.

## What it delivers

- start empty: repository, Spec Kit, local-only and worktree defaults
- the product brief as a knowledge page from a person
- a constitution drafted from the brief, approved before the first feature
- technology decisions recorded as decision pages
- the walking skeleton on a foundation flow (no triage skip), verified from a clean clone

## Why it exists

- In a new codebase the risk is building the wrong thing on the wrong foundations (`greenfield.md`).
- A skeleton with tests, CI and conventions makes every later feature land on solid ground.
- Recorded decisions turn the knowledge base into the design record.

## Why it sits here

- **Depends on:** [r26](r26-agents-and-flows.md), [r28](r28-first-run.md)
- **Unlocks:** [r32](r32-kiln-v1-release.md), [r41](r41-new-codebases-the-rest.md)

On agents and flows (r26, for the foundation flow) and first run (r28). Under scope option B it moves to `kiln-v1.x`.

## How it is proven

**Acceptance:** An empty repository reaches a merged walking skeleton that builds and passes from a clean clone.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

GREEN-1…5 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no spike evidence until the bench lands (r35)
- no conventions enforcement or growing into brownfield (r41)

## Decisions before it starts

- **Blocking:** `kiln-v1` scope — option B defers this row

## Risks

- Decisions made without evidence before the bench exists. Mitigation: decision pages record their evidence, or its absence.

## Read more

- [KILN in a new codebase](../../docs/concepts/greenfield.md)
