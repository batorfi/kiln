# r30 — Existing codebases, part 1: profile and full scan

> **Roadmap row r30** · phase: Getting started · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Join an existing codebase as a careful newcomer: profile it, then run a full scan of the code and its whole history into the knowledge base — module pages, architecture, history, risks, open questions — cited at a commit, durable, local.

## What it delivers

- the codebase profile, read-only, correctable by people
- the full scan in seven passes: inventory, structure, repository history, build/CI/tests, understanding, reconciliation, synthesis
- `raw/scan/<commit>/` facts and `pages/codebase/` pages, one per module
- a scan report with coverage; open questions for Curators
- estimated before start; deep in the territory, mapped elsewhere

## Why it exists

- In brownfield, knowledge lives in the code and people's heads; the scan makes it readable for KILN and the team (`brownfield.md` §5.3).
- Labels — measured or inferred — keep scan output honest.
- Most first users will bring an existing repository.

## Why it sits here

- **Depends on:** [r24](r24-implementation-knowledge-and-workshop-wiki.md), [r28](r28-first-run.md)
- **Unlocks:** [r31](r31-existing-codebases-baseline-territory.md)

On implementation knowledge (r24, code-grounded pages) and first run (r28). The baseline and territory (r31) build on it.

## What it builds on

- code-grounded pages and drift (r24)

## How it is proven

**Acceptance:** A full scan of this repository writes module pages, a coverage report and open questions; a crash mid-scan resumes.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

BROWN-1, BROWN-11 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no incremental re-scans after merges (r40)
- no adoption stages or rehearsal (r40)

## Decisions before it starts

- Scan depth outside the territory; how far back history is read; whether review discussions are read (PRD §14)

## Risks

- Large repositories versus local models. Mitigation: map first, deep only in the territory, durable and resumable.

## Read more

- [KILN in an existing codebase §5](../../docs/concepts/brownfield.md)
