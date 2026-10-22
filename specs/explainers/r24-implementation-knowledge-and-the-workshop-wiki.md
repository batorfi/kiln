# r24 — Implementation knowledge and the workshop wiki

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** in the [roadmap proposal](../ROADMAP.md), which awaits the Roadmap
> gate; nothing here is admitted. The row's own `specs/NNN-…` directory (spec, plan, tasks) is written when it is admitted.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Knowledge |
| **Release** | `kiln-v1` — position 14 of 41 in the proposed order |
| **Depends on** | [r23 — The factory knowledge base](./r23-the-factory-knowledge-base.md) |
| **Unlocks** | [r30 — Existing codebases, part 1: profile and full scan](./r30-existing-codebases-part-1-profile-and-full-scan.md), [r44 — KILN in Zed, phase 1](./r44-kiln-in-zed-phase-1.md), [r38 — Team space, part 1](./r38-team-space-part-1.md), [r32 — Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md) |
| **PRD requirements** | KNOW-1 (workshop), 5, 6 |
| **Proven when** | a merged feature has a feature story grounded at a commit; a code change flags the pages it drifts |

## In one paragraph

As features are built, the factory writes down how: feature stories, overviews, explainers and how-tos grounded in the code at a commit — and flags them when the code moves on. A workshop wiki anyone may edit carries what every factory shares.

## What it delivers

- implementation digests per gate, ingested by the keeper while the factory waits
- feature stories, overviews, explainers and how-tos grounded in code at a commit; short cited excerpts
- reference pages generated from the code on merge, not written by the keeper
- drift flagged when cited code changes
- a workshop wiki anyone may edit, included read-only in every factory vault and pinned per feature

## Not in this row

- team knowledge (r39)
- brownfield knowledge from history and interviews (r40)

## Requirements it carries

*As listed in the roadmap: KNOW-1 (workshop), 5, 6. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| KNOW-1 | A **factory wiki** per factory and a **workshop wiki**, following Karpathy's LLM Wiki: immutable `raw/`, keeper-written `pages/`, `AGENTS.md` schema, `index.md`; `log.md` projected from events. | Must (factory) / Should (workshop) |
| KNOW-5 | **Implementation knowledge**: automatic implementation digests per gate; feature story, overview, explainers, how-tos, reference, learnings — grounded in code at a commit; drift and claim checks; explore by code. Code appears as short excerpts with path, lines and commit; **reference pages are generated from code** on merge; briefs flag a cited page unreviewed for 90 days (configurable) or drifted, contradicted or changed during the gate. | Should |
| KNOW-6 | Workshop wiki included read-only in each factory vault (`workshop/`), **pinned per feature** as of its admission; briefs note newer versions of cited pages. | Should |

## How it is proven

**Acceptance:** a merged feature has a feature story grounded at a commit; a code change flags the pages it drifts.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Rules it must keep

- **X** — every claim traceable to a source

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [The factory wiki §9](../../docs/concepts/factory-wiki.md)
- [PRD KNOW-5, KNOW-6](../../docs/prd/kiln-prd.md)
- [The roadmap proposal](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r23 — The factory knowledge base](./r23-the-factory-knowledge-base.md) · [index](./README.md) · [r25 — One workshop, several factories](./r25-one-workshop-several-factories.md) →
