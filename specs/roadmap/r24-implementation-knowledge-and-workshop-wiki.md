# r24 — Implementation knowledge and the workshop wiki

> **Roadmap row r24** · phase: Knowledge · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Make the factory explain its own code: digests written as features pass gates — feature stories, overviews, explainers, how-tos — cited at a commit and flagged when the code drifts; plus a workshop wiki anyone may edit, shared into every factory.

## What it delivers

- implementation digests per gate into `raw/record/`
- feature stories, technical overviews, explainers, how-tos, reference, learnings — grounded in code at a commit
- drift detection and claim checks
- the workshop wiki, open to everyone, included read-only in each factory vault

## Why it exists

- Generated code must stay understandable to the people who own it (vision §10).
- Citing code at a commit makes explanations checkable; drift flags make them honest over time.
- Learnings that span factories (models, machines) belong in one shared place.

## Why it sits here

- **Depends on:** [r23](r23-factory-knowledge-base.md)
- **Unlocks:** [r30](r30-existing-codebases-scan.md), [r32](r32-kiln-v1-release.md)

On the factory knowledge base (r23). The full scan (r30) builds on its code-grounded pages; the release depends on it.

## How it is proven

**Acceptance:** A merged feature has a feature story grounded at a commit; a code change flags the pages it drifts.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

KNOW-1 (workshop), 5, 6 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no team knowledge tier (r39)

## Decisions before it starts

- none open

## Risks

- Pages that go stale silently. Mitigation: drift is computed from the code, not remembered.

## Read more

- [The factory wiki §7a, §9](../../docs/concepts/factory-wiki.md)
- [Mockups 27–31](../../docs/concepts/mockups/README.md)
