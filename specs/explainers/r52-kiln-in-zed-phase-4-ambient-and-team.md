# r52 — KILN in Zed, phase 4: ambient and team

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | kiln-v1.x |
| **Release** | `kiln-v1.x` — position 42 of 42 in the committed order |
| **Depends on** | [r51 — KILN in Zed, phase 3: decide where the code is](./r51-kiln-in-zed-phase-3-decide-where-the-code-is.md) |
| **Unlocks** | — |
| **PRD requirements** | EDIT-7, EDIT-8 |
| **Proven when** | editing a claimed path warns in the buffer; a teammate's required review given from a shared Zed workspace is mirrored into the owner's record |

## In one paragraph

The last phase makes KILN ambient in the editor: a language server surfaces territory, claims, knowledge, drift and preserved behaviour right in the code, and teammates give their required reviews from a shared Zed workspace.

## What it delivers

- a KILN language server: territory and claims, knowledge on hover, drift, preserved behaviour, judges' findings, code actions
- teammates' required reviews from a shared Zed workspace, mirrored into the owning workshop's record

## Not in this row

- —

## Requirements it carries

*As listed in the roadmap: EDIT-7, EDIT-8. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| EDIT-7 | **KILN language server**: territory and claims, knowledge on hover, drift, preserved behaviour, judges' findings, code actions. | Could |
| EDIT-8 | **Team review in Zed**: a teammate's required review given from a shared Zed workspace and mirrored into the owner's record. | Could |

## How it is proven

**Acceptance:** editing a claimed path warns in the buffer; a teammate's required review given from a shared Zed workspace is mirrored into the owner's record.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~Zed's open questions~~ — **decided 2026-10-22** (defaults): moves from Zed in phase 3, Code review first; factory worktree for factory work, the engineer's clone for knowledge; Zed first on editor-neutral protocols; adapter identity a session token in the OS keychain; MCP only for allowed clients; browser fallback if elicitation falls short (`zed-integration.md` §12)

## Rules it must keep

- **XII** — a teammate's review is evidence
- **VIII** — the language server is local

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [KILN in Zed §5 (D5, D8)](../../docs/concepts/zed-integration.md)
- [PRD EDIT-7, EDIT-8](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r51 — KILN in Zed, phase 3: decide where the code is](./r51-kiln-in-zed-phase-3-decide-where-the-code-is.md) · [index](./README.md) · — →
