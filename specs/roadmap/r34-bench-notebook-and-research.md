# r34 — The bench, part 1: notebook and research

> **Roadmap row r34** · phase: kiln-v1.x · release: `kiln-v1.x` (after the release) · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Give engineers a place to think while factories work: a private notebook with explicit capture and promotion, keeper suggestions that never rewrite, research steps with cited results, and origin and maturity labels on all knowledge.

## What it delivers

- the notebook: a private vault per person, explicit capture
- keeper suggestions — links, contradictions, maturity — never rewriting
- promotion of notes into workshop, factory or team knowledge
- research steps: plan first, read-only tools, below feature work, cited results
- origin and maturity labels carried into briefs

## Why it exists

- Engineers spend much of their time researching and reading code; that work should leave a trace (`the-bench.md`).
- Ungated means ungated: bench output informs, never decides (PRD P13).

## Why it sits here

- **Depends on:** [r32](r32-kiln-v1-release.md)
- **Unlocks:** [r35](r35-bench-spikes-and-candidates.md)

After the release. The second bench row (r35) builds on it.

## How it is proven

**Acceptance:** A notebook entry promoted to knowledge keeps its origin; research results are cited.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

BENCH-1…4, BENCH-7 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no spikes or candidate list (r35)

## Decisions before it starts

- none open

## Risks

- Research competing with feature work for the lane. Mitigation: research runs below feature work, never on a held judge's lane.

## Read more

- [The bench](../../docs/concepts/the-bench.md)
- [Mockups 40, 41](../../docs/concepts/mockups/README.md)
