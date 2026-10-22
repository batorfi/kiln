# r43 — Explore space

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** in the [roadmap proposal](../ROADMAP.md), which awaits the Roadmap
> gate; nothing here is admitted. The row's own `specs/NNN-…` directory (spec, plan, tasks) is written when it is admitted.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Explore |
| **Release** | `kiln-v1` — position 21 of 41 in the proposed order |
| **Depends on** | [r30 — Existing codebases, part 1: profile and full scan](./r30-existing-codebases-part-1-profile-and-full-scan.md) |
| **Unlocks** | [r44 — KILN in Zed, phase 1](./r44-kiln-in-zed-phase-1.md), [r32 — Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md) |
| **PRD requirements** | EXPL-1, EXPL-2 (core), EXPL-3 (ask, trace) |
| **Proven when** | an explore space answers a new joiner's questions with citations and draws the architecture map — and writes nothing to the repository |

## In one paragraph

Teams that are not ready for a factory can still start with KILN: an explore space on any repository — no roadmap, no gates, nothing written to it — that draws the codebase and answers questions about it with citations. It is the on-ramp for teams new to spec-driven work, and its knowledge becomes a factory's starting point later.

## What it delivers

- an explore space: durable store, record, lane and knowledge base, with no roadmap and no gates
- built on the profile and full scan (r30)
- the architecture map, hot spots and the test landscape
- questions and traces answered with citations to file, line and commit, labelled measured or inferred; good answers filed back as knowledge
- zero footprint: nothing written to the team's repository, branches or CI

## Not in this row

- as-is specifications, tours, archaeology, readiness and legacy languages (r46–r49)

## Requirements it carries

*As listed in the roadmap: EXPL-1, EXPL-2 (core), EXPL-3 (ask, trace). Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| EXPL-1 | **Explore space**: a lightweight space with a durable store, record, lane and knowledge base but **no roadmap and no gates**; it writes nothing to the team's repository, branches or CI; its knowledge, scan and baseline become a factory's starting point. | Must |
| EXPL-2 | **Maps and signals**: architecture map, hot spots, test landscape (core); change coupling, ownership per module (never per person), dead-code candidates, dependencies and licences. | Must (core) / Should (rest) |
| EXPL-3 | **Ask and trace**: questions answered with citations to file, line and commit, labelled measured or inferred; traces of a request, job or event end to end; data lineage; good answers filed back as knowledge. | Must (ask, trace) / Should (lineage) |

## How it is proven

**Acceptance:** an explore space answers a new joiner's questions with citations and draws the architecture map — and writes nothing to the repository.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~Explore's open questions~~ — **decided 2026-10-22** (defaults): the explore space is its own lightweight kind; knowledge shared as the vault and through the team space; MCP access via r44; as-is specifications drift-flagged like knowledge; legacy languages chosen by demand at r49; the readiness report exportable with restricted content redacted; no separate early release (`code-exploration.md` §15)

## Rules it must keep

- **X** — knowledge informs, never decides
- **VIII** — local by default
- PRD **P13** — ungated means ungated

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [Explore first](../../docs/concepts/code-exploration.md)
- [PRD §6.21](../../docs/prd/kiln-prd.md)
- [The roadmap proposal](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r30 — Existing codebases, part 1: profile and full scan](./r30-existing-codebases-part-1-profile-and-full-scan.md) · [index](./README.md) · [r44 — KILN in Zed, phase 1](./r44-kiln-in-zed-phase-1.md) →
