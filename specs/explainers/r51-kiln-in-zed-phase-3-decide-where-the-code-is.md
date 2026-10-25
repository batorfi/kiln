# r51 — KILN in Zed, phase 3: decide where the code is

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | kiln-v1.x |
| **Release** | `kiln-v1.x` — position 41 of 42 in the committed order |
| **Depends on** | [r50 — KILN in Zed, phase 2: the Agent Panel](./r50-kiln-in-zed-phase-2-the-agent-panel.md) |
| **Unlocks** | [r52 — KILN in Zed, phase 4: ambient and team](./r52-kiln-in-zed-phase-4-ambient-and-team.md) |
| **PRD requirements** | EDIT-5, EDIT-6 |
| **Proven when** | a Code review gate decided in Zed on the full brief through the same intake as the browser; a stale move from Zed is refused |

## In one paragraph

The flagship editor experience: deciding the Code review gate where the code is. The full brief is shown in Zed, findings sit on their lines, and the move is made through the same intake as the browser — then the same for Verification and Implementation.

## What it delivers

- Code review, then Verification and Implementation, decided in Zed through ACP elicitation only after the full brief
- the same move intake, bound to the state version, with `decided_by` from a session token in the OS keychain
- a browser fallback if elicitation falls short
- following a worker in the factory's worktree and steering a worker step from the KILN thread

## Not in this row

- the language server and team review (r52)

## Requirements it carries

*As listed in the roadmap: EDIT-5, EDIT-6. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| EDIT-5 | **Decide in Zed**: Code review, then Verification and Implementation, decided through ACP elicitation only after the full brief is shown; the same move intake, bound to the state version, `decided_by` from a session token in the OS keychain; browser fallback if elicitation falls short. | Should |
| EDIT-6 | **Watch and steer**: follow a worker in the factory's worktree read-only; steer a worker step (never a judge) from the KILN thread. | Should |

## How it is proven

**Acceptance:** a Code review gate decided in Zed on the full brief through the same intake as the browser; a stale move from Zed is refused.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~Zed's open questions~~ — **decided 2026-10-22** (defaults): moves from Zed in phase 3, Code review first; factory worktree for factory work, the engineer's clone for knowledge; Zed first on editor-neutral protocols; adapter identity a session token in the OS keychain; MCP only for allowed clients; browser fallback if elicitation falls short (`zed-integration.md` §12)

## Rules it must keep

- **V** — a move only on the full brief
- **IX** — one intake for every surface
- **I** — judges cannot be steered

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [KILN in Zed §5 (D3, D6)](../../docs/concepts/zed-integration.md)
- [PRD EDIT-5, EDIT-6](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r50 — KILN in Zed, phase 2: the Agent Panel](./r50-kiln-in-zed-phase-2-the-agent-panel.md) · [index](./README.md) · [r52 — KILN in Zed, phase 4: ambient and team](./r52-kiln-in-zed-phase-4-ambient-and-team.md) →
