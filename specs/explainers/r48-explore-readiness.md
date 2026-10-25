# r48 — Explore: readiness

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | kiln-v1.x |
| **Release** | `kiln-v1.x` — position 37 of 43 in the committed order |
| **Depends on** | [r46 — Explore: as-is specifications](./r46-explore-as-is-specifications.md), [r35 — The bench, part 2: spikes and candidates](./r35-the-bench-part-2-spikes-and-candidates.md) |
| **Unlocks** | [r40 — Existing codebases, the rest](./r40-existing-codebases-the-rest.md) |
| **PRD requirements** | EXPL-8, EXPL-10 |
| **Proven when** | the readiness report names candidate territories and first features with evidence and scores no person; adoption stages 0–2 are recorded |

## In one paragraph

A team moving toward an AI factory needs evidence of where it stands. This row makes the journey visible: spec coverage, the explore stages recorded with their evidence, and a readiness report that names where a factory could start — without scoring any person.

## What it delivers

- the spec-coverage map per module
- adoption stages 0–2 — explore, understand, specify as-is — recorded with their exit evidence
- change sizing (*what would it take*) as candidates with evidence
- the factory readiness report: health, understanding, specification, process fit, candidate territories, first features, gaps; exportable with restricted content redacted

## Not in this row

- the factory's own adoption stages, Rehearse to Own (r40)

## Requirements it carries

*As listed in the roadmap: EXPL-8, EXPL-10. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| EXPL-8 | **Spec coverage and readiness**: a spec-coverage map; adoption stages 0–2 (explore, understand, specify as-is) recorded with evidence; a factory readiness report (build and test health, understanding, specification, process fit, candidate territories, first features, gaps), exportable with restricted content redacted, scoring no person. | Should |
| EXPL-10 | **Change sizing**: *what would it take* for a considered change — modules, interfaces, data, tests, owners, risks, unknowns — as a candidate with evidence. | Should |

## How it is proven

**Acceptance:** the readiness report names candidate territories and first features with evidence and scores no person; adoption stages 0–2 are recorded.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~Explore's open questions~~ — **decided 2026-10-22** (defaults): the explore space is its own lightweight kind; knowledge shared as the vault and through the team space; MCP access via r44; as-is specifications drift-flagged like knowledge; legacy languages chosen by demand at r49; the readiness report exportable with restricted content redacted; no separate early release (`code-exploration.md` §15)

## Rules it must keep

- insights rules — no people scored or ranked
- **X** — evidence, never authority

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [Explore first §7](../../docs/concepts/code-exploration.md)
- [PRD EXPL-8, EXPL-10](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r47 — Explore: tours and archaeology](./r47-explore-tours-and-archaeology.md) · [index](./README.md) · [r49 — Explore: legacy languages](./r49-explore-legacy-languages.md) →
