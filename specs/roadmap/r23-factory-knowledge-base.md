# r23 — The factory knowledge base

> **Roadmap row r23** · phase: Knowledge · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Give each factory a knowledge base in the LLM-Wiki pattern — raw sources, pages, a schema, a log projected from events — with ingest, query and lint as recorded steps, readable as an Obsidian vault, and cited in gate briefs as context, never authority.

## What it delivers

- a factory wiki: immutable `raw/`, keeper-written `pages/`, `AGENTS.md` schema, `index.md`, `log.md` from events
- ingest, query and lint as steps on the lane
- the vault contract: wikilinks, unique names, properties; readable in Obsidian and Zed
- Curator edit rights; every change attributed and recorded
- knowledge cited in briefs, with stale and contradicted pages flagged

## Why it exists

- Roadmaps and briefs need context that survives beyond one conversation (`factory-wiki.md`).
- Readable without KILN means the knowledge belongs to the engineers, not the tool.
- Knowledge is context, never authority (constitution X).

## Why it sits here

- **Depends on:** [r20](r20-gates-on-the-web.md)
- **Unlocks:** [r24](r24-implementation-knowledge-and-workshop-wiki.md), [r28](r28-first-run.md)

On gates on the web (r20), because its main use is context in briefs. Implementation knowledge (r24) and first run (r28) build on it.

## How it is proven

**Acceptance:** A wiki that opens cleanly in Obsidian and Zed; briefs cite pages and flag stale ones.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

KNOW-1 (factory), 2, 3, 4, BRIEF-5 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no implementation digests (r24)
- no codebase scan (r30)
- no notebook (r34)

## Decisions before it starts

- Wiki keeper as its own role or the researcher; when a page counts as stale; how much code pages reproduce (PRD §14)

## Risks

- An LLM-written wiki presented as truth. Mitigation: every claim sourced, origin labels, lint for contradictions.

## Read more

- [The factory wiki](../../docs/concepts/factory-wiki.md)
- [Mockups 22–27](../../docs/concepts/mockups/README.md)
