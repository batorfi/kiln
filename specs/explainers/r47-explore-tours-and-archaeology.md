# r47 — Explore: tours and archaeology

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | kiln-v1.x |
| **Release** | `kiln-v1.x` — position 34 of 41 in the committed order |
| **Depends on** | [r32 — Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md) |
| **Unlocks** | — |
| **PRD requirements** | EXPL-4, EXPL-5 |
| **Proven when** | an expert-reviewed tour opens every stop at its line; recovered decisions are confirmed, corrected or rejected by a person |

## In one paragraph

Understanding a codebase is faster with a guide. KILN drafts tours through the code and recovers the decisions and history behind it; experts review and annotate them, because expert-guided tours teach far better than AI-only ones.

## What it delivers

- guided tours drafted by KILN and reviewed by an expert; tours per role (new joiner, on-call, product owner, auditor)
- why-it-is-like-this narratives per module from history
- recovered decisions drafted as ADRs for a person to confirm, correct or reject

## Not in this row

- —

## Requirements it carries

*As listed in the roadmap: EXPL-4, EXPL-5. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| EXPL-4 | **Tours**: drafted by KILN, reviewed and annotated by an expert; tours per role. | Should |
| EXPL-5 | **Archaeology**: why-it-is-like-this narratives per module; recovered decisions drafted as ADRs for a person to confirm, correct or reject. | Should |

## How it is proven

**Acceptance:** an expert-reviewed tour opens every stop at its line; recovered decisions are confirmed, corrected or rejected by a person.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~Explore's open questions~~ — **decided 2026-10-22** (defaults): the explore space is its own lightweight kind; knowledge shared as the vault and through the team space; MCP access via r44; as-is specifications drift-flagged like knowledge; legacy languages chosen by demand at r49; the readiness report exportable with restricted content redacted; no separate early release (`code-exploration.md` §15)

## Rules it must keep

- **X** — every claim cited and labelled

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [Explore first §5.2](../../docs/concepts/code-exploration.md)
- [PRD EXPL-4, EXPL-5](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r46 — Explore: as-is specifications](./r46-explore-as-is-specifications.md) · [index](./README.md) · [r48 — Explore: readiness](./r48-explore-readiness.md) →
