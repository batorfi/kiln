# r15 — The record

> **Roadmap row r15** · phase: Durable core · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Make every state change an event committed with it, give the factory one ordered record, and turn the factory-log into a projection that can be rebuilt byte for byte.

## What it delivers

- the transactional outbox: events in the same commit as the change
- the event envelope (id, seq, type, schema version, time, subject, actor, correlation, causation, trace, privacy, data — no content)
- the event catalog with versioned schemas; an invalid event fails its commit
- the in-process backbone with durable consumer cursors
- the factory-log projection in the existing schema, byte-identical on rebuild
- the first program's committed walks replayed as event streams

## Why it exists

- One record written with the change cannot drift from what happened (constitution VII).
- Every later view — live UI, briefs, metrics, health, knowledge log, insights — is a consumer of this stream; building it early means no view invents its own truth.
- Replaying the old walks proves the new record against real history (PRD *Migration*).

## Why it sits here

- **Depends on:** [r14](r14-gates-as-data.md)
- **Unlocks:** [r16](r16-real-local-workers.md), [r19](r19-web-front-door-read-only.md), [r27](r27-health-and-broken-guarantees.md)

After gates exist (r14), so gate events are real; before workers (r16) and the front door (r19), which consume it.

## What it builds on

- `schemas/factory-log.schema.json`, `validate/log.ts` run on the projection
- `ui/factory-state.ts` reducer → state projection
- `factory-log/*.jsonl`, `fixtures/r7-*` → replay fixtures

## How it is proven

**Acceptance:** Factory-log rebuilt byte-identical from events; the committed r1–r11 walks replay as streams.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

EVT-1…5 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no metrics, traces or insights yet (r27, r36)
- no time travel (r36)

## Decisions before it starts

- none open

## Risks

- A projection that differs from the live log in edge cases. Mitigation: the byte-identical rebuild is the acceptance test.

## Read more

- [The record](../../docs/concepts/the-record.md)
- [Design §6 events and observability](../../docs/concepts/web-front-door.md)
