# r49 — Explore: legacy languages

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | kiln-v1.x |
| **Release** | `kiln-v1.x` — position 36 of 41 in the committed order |
| **Depends on** | [r32 — Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md) |
| **Unlocks** | — |
| **PRD requirements** | EXPL-9 |
| **Proven when** | a scan of a legacy-language repository reports exactly which files were parsed and which only inferred |

## In one paragraph

Legacy systems are where exploration is worth most and is hardest. This row adds deterministic parsing for the first legacy languages teams ask for, and makes scan reports exact about what was parsed and what was only inferred.

## What it delivers

- deterministic parsing for the first legacy languages, chosen by demand
- model reading labelled *inferred* where no parser exists
- scan reports that list exactly what was parsed and what was only inferred

## Not in this row

- —

## Requirements it carries

*As listed in the roadmap: EXPL-9. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| EXPL-9 | **Legacy languages**: deterministic parsing for the first legacy languages chosen by demand; model reading labelled inferred elsewhere; scan reports that say exactly what was parsed and what was only inferred. | Should |

## How it is proven

**Acceptance:** a scan of a legacy-language repository reports exactly which files were parsed and which only inferred.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~Explore's open questions~~ — **decided 2026-10-22** (defaults): the explore space is its own lightweight kind; knowledge shared as the vault and through the team space; MCP access via r44; as-is specifications drift-flagged like knowledge; legacy languages chosen by demand at r49; the readiness report exportable with restricted content redacted; no separate early release (`code-exploration.md` §15)

## Rules it must keep

- **X** — measured and inferred never blurred
- Explore **E6** — honest about gaps

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [Explore first §8](../../docs/concepts/code-exploration.md)
- [PRD EXPL-9](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r48 — Explore: readiness](./r48-explore-readiness.md) · [index](./README.md) · [r40 — Existing codebases, the rest](./r40-existing-codebases-the-rest.md) →
