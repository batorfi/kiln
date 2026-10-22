# r31 — Existing codebases, part 2: baseline, territory, process

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** in the [roadmap proposal](../ROADMAP.md), which awaits the Roadmap
> gate; nothing here is admitted. The row's own `specs/NNN-…` directory (spec, plan, tasks) is written when it is admitted.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Getting started |
| **Release** | `kiln-v1` — position 23 of 41 in the proposed order |
| **Depends on** | [r30 — Existing codebases, part 1: profile and full scan](./r30-existing-codebases-part-1-profile-and-full-scan.md), [r21 — Stepping in](./r21-stepping-in.md) |
| **Unlocks** | [r39 — Team space, part 2](./r39-team-space-part-2.md), [r32 — Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md), [r40 — Existing codebases, the rest](./r40-existing-codebases-the-rest.md) |
| **PRD requirements** | BROWN-2, 3, 5, 8 |
| **Proven when** | a feature outside its territory is flagged at Code review; pre-existing failures never block on their own |

## In one paragraph

Before KILN changes existing code, it records what is already broken, agrees where it may work, and fits into the team's own process — so nothing old is blamed on new work and the team's reviews and CI stay in charge.

## What it delivers

- the baseline: failing and flaky tests found by repeated runs; flaky tests offered as candidate features
- the factory's territory, **enforced at the tool level** — writes outside are refused as risky-action requests — and checked at Code review
- fitting the team's process: conventions, CI as evidence, code owners and required reviews, the Merge gate opening a pull request
- base drift shown in briefs
- a teammate's edit to a KILN pull request recorded and re-verified

## Not in this row

- preserved behaviour, adoption stages and re-scans (r40)

## Requirements it carries

*As listed in the roadmap: BROWN-2, 3, 5, 8. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| BROWN-2 | **Baseline**: build and tests at the base commit, run repeatedly to separate failing from flaky; refreshed at each Roadmap gate; Code review and Verification report new failures, pre-existing failures and *not provable* separately. Flaky and failing tests are offered as candidate features *from the baseline*, decided by a person. | Must |
| BROWN-3 | **Territory**: paths a factory may change, decided at the Roadmap gate; shared paths named per feature; **writes outside refused at the tool level** (a risky-action request a person may allow once, recorded); changes outside also flagged at Code review. | Must |
| BROWN-5 | **Fitting the team's process**: branch and commit conventions, PR template, CI as evidence, code owners and required reviews shown and never bypassed; the Merge gate opens a pull request in stages 1–3. A teammate's edit to a KILN pull request is recorded with its author, shown in the Merge gate brief, and re-verified before Merge. | Must |
| BROWN-8 | **Base drift**: rebase at defined points; drift in touched files shown in the next brief; conflicts decided by a person. | Must |

## How it is proven

**Acceptance:** a feature outside its territory is flagged at Code review; pre-existing failures never block on their own.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~scan depth, history, discussions, territory, PR edits, flaky tests~~ — **decided 2026-10-21**: deep inside the territory and a map outside; 2 years of history in detail; titles and links unless opted in; territory enforced at the tool level; teammates' PR edits recorded and re-verified; flaky tests offered as candidates (BROWN-2, 3, 5, 11)

## Rules it must keep

- brownfield **B3** — the team's process stays in charge
- brownfield **B4, B5** — know the baseline; stay bounded
- **VII** — edits and refusals recorded

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [Existing codebases §5–§9](../../docs/concepts/brownfield.md)
- [PRD BROWN-2, 3, 5, 8](../../docs/prd/kiln-prd.md)
- [The roadmap proposal](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r44 — KILN in Zed, phase 1](./r44-kiln-in-zed-phase-1.md) · [index](./README.md) · [r38 — Team space, part 1](./r38-team-space-part-1.md) →
