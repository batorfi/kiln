# r40 — Existing codebases, the rest

> **Roadmap row r40** · phase: kiln-v1.x · release: `kiln-v1.x` (after the release) · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Deepen KILN in existing codebases: specifications that say what must not change, characterization tests first, adoption in stages with rehearsal on past changes, knowledge from history and interviews, incremental re-scans, and issues as candidates.

## What it delivers

- preserved behaviour in specifications; characterization tasks first
- adoption stages — Observe, Rehearse, Contribute, Own — with rehearsal on past changes
- brownfield knowledge from history and Curator interviews; docs-versus-code contradictions
- the *Add Spec Kit* pull request footprint
- incremental re-scans after each merge; people's edits never overwritten
- issues imported as candidates; review comments returned as notes

## Why it exists

- Changing existing behaviour safely needs a contract for what must stay the same (`brownfield.md` §7).
- Trust is earned in stages, with evidence a team can check.

## Why it sits here

- **Depends on:** [r31](r31-existing-codebases-baseline-territory.md), [r35](r35-bench-spikes-and-candidates.md)
- **Unlocks:** — (nothing depends on it)

On the baseline row (r31) and the bench (r35), whose candidates and evidence it uses.

## How it is proven

**Acceptance:** A rehearsal on a past change compares the judges' findings with what the team merged.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

BROWN-4, 6, 7, 9, 10, 12 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Decisions before it starts

- none open

## Risks

- Rehearsal costs without changing minds. Mitigation: rehearsal results feed insights as evidence for stage decisions.

## Read more

- [KILN in an existing codebase](../../docs/concepts/brownfield.md)
