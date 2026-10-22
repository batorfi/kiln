# r40 — Existing codebases, the rest

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** in the [roadmap proposal](../ROADMAP.md), which awaits the Roadmap
> gate; nothing here is admitted. The row's own `specs/NNN-…` directory (spec, plan, tasks) is written when it is admitted.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | kiln-v1.x |
| **Release** | `kiln-v1.x` — position 37 of 41 in the proposed order |
| **Depends on** | [r31 — Existing codebases, part 2: baseline, territory, process](./r31-existing-codebases-part-2-baseline-territory-process.md), [r35 — The bench, part 2: spikes and candidates](./r35-the-bench-part-2-spikes-and-candidates.md), [r48 — Explore: readiness](./r48-explore-readiness.md) |
| **Unlocks** | — |
| **PRD requirements** | BROWN-4, 6, 7, 9, 10, 12 |
| **Proven when** | a rehearsal on a past change compares the judges' findings with what the team merged |

## In one paragraph

Building on the scan, baseline and Explore's readiness, this row brings the rest of brownfield: specifying what must not change, earning trust in stages from Observe to Own, and keeping the knowledge true as the code moves.

## What it delivers

- preserved behaviour in specifications and characterization tasks first in the work plan
- adoption stages Observe → Rehearse → Contribute → Own, recorded; rehearsal replays a past change and compares with what the team merged
- brownfield knowledge from code, history, docs and interviews
- a small, reviewed footprint: Spec Kit enters through an *Add Spec Kit* pull request on entering Contribute
- incremental re-scans after each merge; issues and review comments as candidates and notes

## Not in this row

- —

## Requirements it carries

*As listed in the roadmap: BROWN-4, 6, 7, 9, 10, 12. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| BROWN-4 | **Preserved behaviour** in the specification and **characterization tasks** first in the work plan where it is untested. | Should |
| BROWN-6 | **Adoption stages** — Observe, Rehearse, Contribute, Own — recorded; **rehearsal** replays a past change, ungated, compared with what the team merged. | Should |
| BROWN-7 | **Brownfield knowledge**: ingest from code, history and docs with source labels; interview questions for Curators; docs-versus-code disagreements as lint findings. | Should |
| BROWN-9 | **A small, reviewed footprint**: Spec Kit and the constitution enter through an *Add Spec Kit* pull request on entering Contribute (scratch worktree only before); opt-in committed `.kiln/` and `kilnignore`. | Should |
| BROWN-10 | Issues imported as bench candidates; review comments on KILN pull requests returned to the factory as notes. | Could |
| BROWN-12 | **Keeping the scan true**: incremental re-scan after each merge to main; full re-scan on request or director suggestion; re-scans never overwrite people's edits — conflicts become contradictions. | Should |

## How it is proven

**Acceptance:** a rehearsal on a past change compares the judges' findings with what the team merged.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Rules it must keep

- brownfield **B1–B6**
- **X** — people's corrections win over re-scans
- **I** — rehearsal is evidence

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [Existing codebases](../../docs/concepts/brownfield.md)
- [PRD BROWN-4, 6, 7, 9, 10, 12](../../docs/prd/kiln-prd.md)
- [The roadmap proposal](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r49 — Explore: legacy languages](./r49-explore-legacy-languages.md) · [index](./README.md) · [r41 — New codebases, the rest](./r41-new-codebases-the-rest.md) →
