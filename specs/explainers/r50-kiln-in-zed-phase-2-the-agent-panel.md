# r50 — KILN in Zed, phase 2: the Agent Panel

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | kiln-v1.x |
| **Release** | `kiln-v1.x` — position 40 of 42 in the committed order |
| **Depends on** | [r32 — Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md) |
| **Unlocks** | [r51 — KILN in Zed, phase 3: decide where the code is](./r51-kiln-in-zed-phase-3-decide-where-the-code-is.md) |
| **PRD requirements** | EDIT-4 |
| **Proven when** | a full gate brief read in Zed's Agent Panel with every citation followed in the editor; a held risky action approved there |

## In one paragraph

Phase 2 brings KILN into Zed's Agent Panel over the Agent Client Protocol — read-only at first. Engineers talk to the director, see what is waiting, and read full gate briefs whose citations jump to the code as they read.

## What it delivers

- the KILN agent in Zed's Agent Panel over ACP, installable from the ACP Registry, built on the Pi ACP adapter path
- talk to the director; Needs you and notices; slash commands
- full gate briefs with every citation as a followed location; diffs in Zed's diff view; explore questions
- risky-action approvals as ACP permission requests

## Not in this row

- gate moves in Zed (r51)

## Requirements it carries

*As listed in the roadmap: EDIT-4. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| EDIT-4 | **KILN in Zed's Agent Panel** (ACP), read-only: talk to the director, Needs you and notices, full gate briefs with citations as followed locations, diffs, explore questions, risky-action approvals as permission requests. | Should |

## How it is proven

**Acceptance:** a full gate brief read in Zed's Agent Panel with every citation followed in the editor; a held risky action approved there.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~Zed's open questions~~ — **decided 2026-10-22** (defaults): moves from Zed in phase 3, Code review first; factory worktree for factory work, the engineer's clone for knowledge; Zed first on editor-neutral protocols; adapter identity a session token in the OS keychain; MCP only for allowed clients; browser fallback if elicitation falls short (`zed-integration.md` §12)

## Rules it must keep

- **IX** — Zed reads the same projections
- **V** — no gate move from a permission prompt

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [KILN in Zed §5 (D2)](../../docs/concepts/zed-integration.md)
- [PRD EDIT-4](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r41 — New codebases, the rest](./r41-new-codebases-the-rest.md) · [index](./README.md) · [r51 — KILN in Zed, phase 3: decide where the code is](./r51-kiln-in-zed-phase-3-decide-where-the-code-is.md) →
