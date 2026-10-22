# r23 — The factory knowledge base

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** in the [roadmap proposal](../ROADMAP.md), which awaits the Roadmap
> gate; nothing here is admitted. The row's own `specs/NNN-…` directory (spec, plan, tasks) is written when it is admitted.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Knowledge |
| **Release** | `kiln-v1` — position 13 of 41 in the proposed order |
| **Depends on** | [r20 — Gates on the web](./r20-gates-on-the-web.md) |
| **Unlocks** | [r24 — Implementation knowledge and the workshop wiki](./r24-implementation-knowledge-and-the-workshop-wiki.md), [r28 — First run](./r28-first-run.md) |
| **PRD requirements** | KNOW-1 (factory), 2, 3, 4, BRIEF-5 |
| **Proven when** | a wiki that opens cleanly in Obsidian and Zed; briefs cite pages and flag stale ones |

## In one paragraph

Each factory gets a knowledge base in Karpathy's LLM-wiki pattern: a dedicated keeper writes and maintains pages, Curators shape them, and every claim is traced to a source. Gate briefs cite it — and say when a cited page is stale.

## What it delivers

- an LLM wiki per factory: immutable `raw/` sources, keeper-written `pages/`, an `AGENTS.md` schema, `index.md`, `log.md` as a projection
- ingest, query and lint as steps; a **dedicated keeper role**; lint on a different model family than the keeper
- the vault contract: every wiki a valid Obsidian vault, readable in Zed or any editor
- Curator edit rights; every edit attributed, recorded, linted
- knowledge cited in gate briefs, flagged when unreviewed for 90 days or drifted, contradicted or changed while the gate was open

## Not in this row

- implementation knowledge and the workshop wiki (r24)
- team knowledge (r39)

## Requirements it carries

*As listed in the roadmap: KNOW-1 (factory), 2, 3, 4, BRIEF-5. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| KNOW-1 | A **factory wiki** per factory and a **workshop wiki**, following Karpathy's LLM Wiki: immutable `raw/`, keeper-written `pages/`, `AGENTS.md` schema, `index.md`; `log.md` projected from events. | Must (factory) / Should (workshop) |
| KNOW-2 | **Ingest** (discussed, then written directly, one commit, revertible), **query** (cited; answers filed back), **lint** (strongest model, other family; findings, never edits). Ingest, query and digests run as a **dedicated keeper role**; lint on a different model than the keeper. | Must |
| KNOW-3 | **Vault contract**: every wiki is a valid Obsidian vault — wikilinks, unique names, YAML properties, no plugin dependencies, readable in Zed; checked by lint. | Must |
| KNOW-4 | **Edit rights**: Curators edit factory wikis; anyone edits the workshop wiki; every change attributed, recorded, linted. | Must |
| BRIEF-5 | *Context from the knowledge base* with citations, flagging stale, drifted or recently changed pages. | Should |

## How it is proven

**Acceptance:** a wiki that opens cleanly in Obsidian and Zed; briefs cite pages and flag stale ones.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~wiki keeper, review age, code reproduction~~ — **decided 2026-10-21**: dedicated keeper role; 90 days or drift; short excerpts, generated reference pages; workshop wiki pinned per feature (§14.2–4)

## Rules it must keep

- **X** — knowledge is context, never authority
- **VIII** — sources stay on the machine

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [The factory wiki](../../docs/concepts/factory-wiki.md)
- [PRD §6.11](../../docs/prd/kiln-prd.md)
- [The roadmap proposal](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r22 — Shaping the roadmap together](./r22-shaping-the-roadmap-together.md) · [index](./README.md) · [r24 — Implementation knowledge and the workshop wiki](./r24-implementation-knowledge-and-the-workshop-wiki.md) →
