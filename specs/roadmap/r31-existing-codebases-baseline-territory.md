# r31 — Existing codebases, part 2: baseline, territory, process

> **Roadmap row r31** · phase: Getting started · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Make KILN safe to work in someone's existing repository: record what is already broken, give each factory a territory, fit the team's own process, and show base drift before it becomes a conflict.

## What it delivers

- the baseline: failing and flaky tests, warnings, untested areas — refreshed at every Roadmap gate
- Code review and Verification separating new failures, pre-existing failures and *not provable*
- the territory: paths a factory may change; changes outside flagged
- fitting the team's process: conventions, CI as evidence, code owners, the Merge gate opening a pull request
- base drift shown in briefs; conflicts decided by a person

## Why it exists

- Without a baseline, old failures are blamed on new work and new failures hide behind old ones (`brownfield.md` §5.2).
- A territory and the team's own review process are what make KILN trustworthy in a shared codebase.

## Why it sits here

- **Depends on:** [r30](r30-existing-codebases-scan.md), [r21](r21-stepping-in.md)
- **Unlocks:** [r32](r32-kiln-v1-release.md), [r40](r40-existing-codebases-the-rest.md)

On the scan (r30) and stepping in (r21). Part of `kiln-v1` under both scope options A and B.

## How it is proven

**Acceptance:** A feature outside its territory is flagged at Code review; pre-existing failures never block on their own.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

BROWN-2, 3, 5, 8 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no preserved-behaviour specs or characterization tasks (r40)

## Decisions before it starts

- none open

## Risks

- Flaky suites hiding real regressions. Mitigation: repeated baseline runs separate flaky from failing.

## Read more

- [KILN in an existing codebase §5.2, §8, §9](../../docs/concepts/brownfield.md)
