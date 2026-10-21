# r18 — The director

> **Roadmap row r18** · phase: Director · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Build the director as deterministic code that runs each feature's pinned flow — creating steps one at a time, ordering them by affinity, applying moves, running capped fix rounds — with the planner as an LLM role whose drafts are checked before anyone sees them.

## What it delivers

- roadmap and row tasks as the director
- affinity ordering of steps; capped automatic fix rounds
- the planner role: roadmap proposals, work plans, splits — labelled drafts, checked by rules
- commands: start, pause after step, abort step, arm delegation — idempotent commits
- answers *from the record* to factual questions

## Why it exists

- A deterministic director makes the same situation lead to the same next step, cheaply and explainably (`the-director.md` §2).
- Confining judgment to roles keeps the planner's output advice, never a decision.
- Affinity ordering is KILN's cost lever on local models (constitution IV).

## Why it sits here

- **Depends on:** [r14](r14-gates-as-data.md), [r17](r17-configuration-as-files.md)
- **Unlocks:** [r20](r20-gates-on-the-web.md), [r26](r26-agents-and-flows.md)

After gates as data (r14) and configuration (r17); before gates on the web (r20) and roadmap shaping (r22), which present its work.

## What it builds on

- `src/scheduler.ts` affinity scheduler (r12)

## How it is proven

**Acceptance:** The same situation yields the same next step every time; planner drafts that fail checks never reach a person.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

DIR-1…5 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no shaping conversation yet (r22)
- no Needs you inbox UI (r20)

## Decisions before it starts

- Whether the planner runs on the strongest model by default (PRD §14)

## Risks

- Planner drafts that look valid but are not. Mitigation: deterministic checks on every draft; failures never shown as valid.

## Read more

- [The director and Needs you](../../docs/concepts/the-director.md)
