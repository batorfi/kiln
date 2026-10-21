# r14 — Gates as data, walked headless

> **Roadmap row r14** · phase: Durable core · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Make the flow data, not code: the Roadmap gate and Gates 1–9 executed from definitions with the closed set of move kinds, checked by `kiln check flow`, and walked end to end by a scripted feature from the command line.

## What it delivers

- the standard flow as a data definition, with plain gate names and stable internal ids
- move kinds (approve, revise, reject, restart, split+revise, mitigate) and the per-gate move sets
- triage skip of Concept and Design, recorded with its reasoning
- the unattended tail as a durable delegation document, ended by any objection
- corrective moves whose note becomes the next step's instruction
- `kiln check flow` for the default flow, with a negative suite
- a scripted feature walking all ten gates headless, surviving kill-and-resume at every gate

## Why it exists

- Gates as data from the start make added gates (r26) cheap later without reworking the director (`extensible-flow.md` §12).
- The closed set of move kinds keeps the director deterministic and auditable (constitution, *The Default Flow*).
- A headless walk proves the whole rail before any UI exists — the old r3 smoke walk, now on the durable core.

## Why it sits here

- **Depends on:** [r13](r13-durable-core.md)
- **Unlocks:** [r15](r15-the-record.md), [r18](r18-the-director.md)

Directly on the durable core; before the record so that the first events have real gates to describe.

## What it builds on

- the standard flow ported in r12; `src/walk.ts` and `src/live-walk.ts` as the scripted-walk harness

## How it is proven

**Acceptance:** A scripted feature walks ten gates from the CLI; `kiln check flow` refuses every invalid flow in its negative suite.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

GATE-3/4/5, FLOW-1/2/3, FLOW-7 (default) — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no added gates or team flows (r26)
- no web briefs (r20) — moves come from the CLI and tests

## Decisions before it starts

- **Blocking:** the flow proposals P1–P6 (`the-flow.md` §11) — where reject goes, re-crossing, the fix-round cap — decide what this row builds

## Risks

- Encoding move semantics that later change. Mitigation: decide P1–P6 before the row starts.

## Read more

- [The flow](../../docs/concepts/the-flow.md)
- [An extensible flow](../../docs/concepts/extensible-flow.md)
- [Design §3.1 the default flow](../../docs/concepts/web-front-door.md)
