# r30 — Existing codebases, part 1: profile and full scan

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** in the [roadmap proposal](../ROADMAP.md), which awaits the Roadmap
> gate; nothing here is admitted. The row's own `specs/NNN-…` directory (spec, plan, tasks) is written when it is admitted.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Getting started |
| **Release** | `kiln-v1` — position 20 of 41 in the proposed order |
| **Depends on** | [r24 — Implementation knowledge and the workshop wiki](./r24-implementation-knowledge-and-the-workshop-wiki.md), [r28 — First run](./r28-first-run.md) |
| **Unlocks** | [r43 — Explore space](./r43-explore-space.md), [r31 — Existing codebases, part 2: baseline, territory, process](./r31-existing-codebases-part-2-baseline-territory-process.md) |
| **PRD requirements** | BROWN-1, BROWN-11 |
| **Proven when** | a full scan of this repository writes module pages, a coverage report and open questions; a crash mid-scan resumes |

## In one paragraph

KILN joins an existing codebase by reading before it writes: a quick profile, then a full scan of the code and its whole history into the knowledge base — every claim cited at the scanned commit and labelled measured or inferred.

## What it delivers

- the codebase profile, in minutes
- the full scan in seven passes: inventory, structure, repository history, build/CI/tests, understanding, reconciliation, synthesis
- codebase and module pages cited at the scanned commit, labelled measured or inferred; open questions; a scan report honest about coverage
- deep inside the territory, a map outside; two years of history in detail; code-host discussions as titles and links unless opted in
- durable (a crash mid-scan resumes) and local

## Not in this row

- the baseline, territory and process fit (r31)
- incremental re-scans and adoption stages (r40)

## Requirements it carries

*As listed in the roadmap: BROWN-1, BROWN-11. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| BROWN-1 | **Codebase profile**, read-only: shape, build and test commands, CI, conventions, code owners, existing guidance (including agent instruction files), history, risk areas; correctable by people; corrections win. | Must |
| BROWN-11 | **Full scan** of the codebase and repository in seven passes — inventory, structure, repository history, build/CI/tests, understanding, reconciliation, synthesis — written into the factory knowledge base (`raw/scan/<commit>/` facts, `pages/codebase/` pages incl. one per module, open questions and a scan report with coverage); estimated before start, durable and resumable, local by default, deep in the territory and mapped elsewhere; pages cited at the scanned commit, labelled measured or inferred; no per-person rankings. Deep inside the territory, a map outside (deep-scanned before Design when a feature will touch it); history read in detail for 2 years (configurable), summarised beyond; code-host discussions as titles, labels and links unless opted in. | Must |

## How it is proven

**Acceptance:** a full scan of this repository writes module pages, a coverage report and open questions; a crash mid-scan resumes.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~scan depth, history, discussions, territory, PR edits, flaky tests~~ — **decided 2026-10-21**: deep inside the territory and a map outside; 2 years of history in detail; titles and links unless opted in; territory enforced at the tool level; teammates' PR edits recorded and re-verified; flaky tests offered as candidates (BROWN-2, 3, 5, 11)

## Rules it must keep

- **X** — every claim cited
- **VIII** — local by default
- brownfield **B1** — read before write

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [Existing codebases §5](../../docs/concepts/brownfield.md)
- [PRD BROWN-1, BROWN-11](../../docs/prd/kiln-prd.md)
- [The roadmap proposal](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r29 — New codebases](./r29-new-codebases.md) · [index](./README.md) · [r43 — Explore space](./r43-explore-space.md) →
