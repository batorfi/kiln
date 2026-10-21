# r35 — The bench, part 2: spikes and candidates

> **Roadmap row r35** · phase: kiln-v1.x · release: `kiln-v1.x` (after the release) · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Let engineers try things safely and turn what they learn into roadmap evidence: spikes in throwaway worktrees with measured reports, a candidate list per factory, and evidence and readiness shown at the Roadmap gate.

## What it delivers

- spikes on `spike/` branches with a question and a time box; never a pull request to `main`
- spike reports with measured results; *propose as a feature*
- the candidate list with evidence and readiness (ready · thin · unknown)
- the Roadmap gate's evidence view; the director suggests research, never starts it

## Why it exists

- The best roadmap evidence is a measured answer, not an opinion (`the-bench.md` §8).
- Readiness at the Roadmap gate shows what is known and what is assumed.

## Why it sits here

- **Depends on:** [r34](r34-bench-notebook-and-research.md)
- **Unlocks:** [r40](r40-existing-codebases-the-rest.md), [r41](r41-new-codebases-the-rest.md)

On the first bench row (r34). New- and existing-codebase follow-ups (r40, r41) use its evidence.

## How it is proven

**Acceptance:** A spike's report becomes evidence on a candidate shown at the Roadmap gate; spike code never merges.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

BENCH-5, 6, 8, 10–12 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no team research claims (r39)

## Decisions before it starts

- Spike capacity on shared hosts; keeper suggestions off-switch; spike retention (PRD §14)

## Risks

- Spike code leaking into `main`. Mitigation: no pull request from a spike branch, by construction.

## Read more

- [The bench §5, §8](../../docs/concepts/the-bench.md)
- [Mockups 42–45](../../docs/concepts/mockups/README.md)
