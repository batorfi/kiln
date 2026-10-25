# r46 — Explore: as-is specifications

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | kiln-v1.x |
| **Release** | `kiln-v1.x` — position 35 of 43 in the committed order |
| **Depends on** | [r32 — Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md) |
| **Unlocks** | [r48 — Explore: readiness](./r48-explore-readiness.md) |
| **PRD requirements** | EXPL-6, EXPL-7 |
| **Proven when** | a module's as-is specification cites every requirement to code; a person confirms or corrects each; characterization-test proposals pin the confirmed ones |

## In one paragraph

The bridge from understanding to spec-driven development: KILN drafts specifications of what the code already does, with its business rules cited to the code, for people to confirm — the preserved-behaviour library every later change needs, and a gentle way to learn SDD on familiar code.

## What it delivers

- as-is specifications in Spec Kit's format: requirements and business rules cited to their code, open questions, characterization-test proposals
- confirmation, correction or dispute by a person; drift flags like knowledge pages
- a constitution discovered from the code and interviews
- past merged changes replayed as spec-driven worked examples
- nothing written to the repository except through the team's own pull request

## Not in this row

- readiness and adoption stages (r48)

## Requirements it carries

*As listed in the roadmap: EXPL-6, EXPL-7. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| EXPL-6 | **As-is specifications**: what the code does today in Spec Kit's format — requirements and business rules cited to their code, open questions, characterization-test proposals — confirmed or corrected by a person, drift-flagged like knowledge; added to the repository only through the team's own pull request. | Should |
| EXPL-7 | **Discovered constitution** from the code and interviews, each principle citing evidence; **past changes replayed** as spec-driven worked examples. | Should |

## How it is proven

**Acceptance:** a module's as-is specification cites every requirement to code; a person confirms or corrects each; characterization-test proposals pin the confirmed ones.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~Explore's open questions~~ — **decided 2026-10-22** (defaults): the explore space is its own lightweight kind; knowledge shared as the vault and through the team space; MCP access via r44; as-is specifications drift-flagged like knowledge; legacy languages chosen by demand at r49; the readiness report exportable with restricted content redacted; no separate early release (`code-exploration.md` §15)

## Rules it must keep

- **X** — recovered specs are candidates until a person confirms them
- **I** — people confirm

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [Explore first §6](../../docs/concepts/code-exploration.md)
- [PRD EXPL-6, EXPL-7](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r37 — Factories anywhere](./r37-factories-anywhere.md) · [index](./README.md) · [r47 — Explore: tours and archaeology](./r47-explore-tours-and-archaeology.md) →
