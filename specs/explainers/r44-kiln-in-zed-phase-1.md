# r44 — KILN in Zed, phase 1

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Editor |
| **Release** | `kiln-v1` — position 23 of 43 in the committed order |
| **Depends on** | [r20 — Gates on the web](./r20-gates-on-the-web.md), [r24 — Implementation knowledge and the workshop wiki](./r24-implementation-knowledge-and-the-workshop-wiki.md), [r43 — Explore space](./r43-explore-space.md) |
| **Unlocks** | [r32 — Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md) |
| **PRD requirements** | EDIT-1, EDIT-2, EDIT-3 |
| **Proven when** | every citation in a brief opens at its line in Zed; KILN tasks run from Zed; an engineer's own agent asks KILN's MCP server who is building a path, and the response is recorded |

## In one paragraph

Engineers read code in their editor. Phase 1 of the Zed integration removes the cheapest context switches: every citation KILN shows opens in Zed at its line, KILN's CLI runs from Zed's tasks, vaults and specs are Zed projects, and the engineer's own coding agent can ask KILN what it knows.

## What it delivers

- deep links both ways: *Open in Zed* on every citation (the factory's worktree for factory work, the engineer's clone for knowledge, with a drift warning)
- task templates and keybindings for `kiln needs`, `kiln status`, `kiln gate` and more
- vaults and specifications as Zed projects, with wikilink navigation
- a read-only KILN MCP server — knowledge, ask, trace, module for file, claims, territory, status — filtered by egress policy, every response recorded, allowed clients only

## Not in this row

- the KILN agent in Zed's Agent Panel (r50)
- gate moves in Zed (r51)
- the language server (r52)

## Requirements it carries

*As listed in the roadmap: EDIT-1, EDIT-2, EDIT-3. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| EDIT-1 | **Deep links both ways**: every citation KILN shows opens in Zed at its line (the factory's worktree for factory-produced work, the engineer's clone for knowledge, with a drift warning); task templates and keybindings for the `kiln` CLI. | Must |
| EDIT-2 | **Vaults and specifications as Zed projects**: per-vault project settings with wikilink navigation; tours as Zed-openable links. | Should |
| EDIT-3 | **KILN MCP server**, read-only: knowledge search, ask, trace, module for file, claims, territory, status; filtered by the factory's egress policy; every response recorded; only clients the workshop has allowed. | Must |

## How it is proven

**Acceptance:** every citation in a brief opens at its line in Zed; KILN tasks run from Zed; an engineer's own agent asks KILN's MCP server who is building a path, and the response is recorded.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~Zed's open questions~~ — **decided 2026-10-22** (defaults): moves from Zed in phase 3, Code review first; factory worktree for factory work, the engineer's clone for knowledge; Zed first on editor-neutral protocols; adapter identity a session token in the OS keychain; MCP only for allowed clients; browser fallback if elicitation falls short (`zed-integration.md` §12)

## Rules it must keep

- **IX** — Zed is a surface, never a source of truth
- **VIII** — MCP served to a cloud agent is egress

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [KILN in Zed](../../docs/concepts/zed-integration.md)
- [PRD §6.22](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r43 — Explore space](./r43-explore-space.md) · [index](./README.md) · [r31 — Existing codebases, part 2: baseline, territory, process](./r31-existing-codebases-part-2-baseline-territory-process.md) →
