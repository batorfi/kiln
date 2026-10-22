# r15 — The record

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Durable core |
| **Release** | `kiln-v1` — position 5 of 41 in the committed order |
| **Depends on** | [r14 — Gates as data, walked headless](./r14-gates-as-data-walked-headless.md) |
| **Unlocks** | [r16 — Real local workers](./r16-real-local-workers.md), [r19 — Web front door, read-only](./r19-web-front-door-read-only.md), [r27 — Health and broken guarantees](./r27-health-and-broken-guarantees.md) |
| **PRD requirements** | EVT-1…5, EVT-3a, CORE-7 (archive; record size measured) |
| **Proven when** | factory-log rebuilt byte-identical from events; the first program's committed walks (closed rows r1–r3, r7, r8) replay as streams; old event versions upcast on read |

## In one paragraph

KILN's record is the ordered stream of domain events, committed with the state each one describes; every view — the factory-log included — is rebuilt from it. This row builds that record and proves it against the first program's real, committed walks.

## What it delivers

- the transactional outbox: every state change commits its events in the same commit
- the event envelope (id, seq, type, schema version, actor, causation, correlation…) and a catalog of versioned schemas — an invalid event fails its commit
- the backbone with durable consumer cursors
- the factory-log as a projection, rebuilt byte-identically
- schema evolution by upcasting on read; stored events never change
- closed features' transcripts archived beside the store; the record's size and rebuild time measured
- the first program's committed walks (rows r1–r3, r7, r8) replayed as event streams

## Not in this row

- traces, insights and time travel (r36)
- the read models the front door shows (r19)

## Requirements it carries

*As listed in the roadmap: EVT-1…5, EVT-3a, CORE-7 (archive; record size measured). Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| EVT-1 | **Transactional outbox**: every state change commits its domain events in the same commit; one writer per factory gives one total order. | Must |
| EVT-2 | **Envelope**: id, seq, type, schema version, time, subject, actor, correlation, causation, trace, privacy, data — never prompt or answer content. | Must |
| EVT-3 | **Catalog** with versioned JSON schemas (program/roadmap, row, gate, unit, lane, delegation, mitigation, tool approval, command, model, egress, wiki, host, system); an invalid event fails its commit. | Must |
| EVT-4 | In-process backbone with **durable consumer cursors**, at-least-once and idempotent; a slow consumer never blocks a factory. | Must |
| EVT-5 | **Factory-log projection** in the existing schema; the existing validators run on it; a rebuild must be byte-identical to the live projection. | Must |
| EVT-3a | **Schema evolution by upcasting on read**: stored events are never rewritten; each breaking version ships a pure, lossless upcaster from the previous one; consumers handle only the current version; additive optional fields need no new version; upcasters are proven by replaying the committed walks with byte-identical projections. | Must |
| CORE-7 | **One store per factory.** A closed feature's conversations and checkpoints are exported to a checksummed **feature archive** beside the store (never in git), recorded by `feature.archived` with its hash, and compacted out of the live store; archives move with the factory; kept forever unless an Operator sets an age-out (`transcript.aged_out`). The record is never archived, aged out or (in `kiln-v1`) segmented; r15 measures its size and rebuild time. | Must |

## How it is proven

**Acceptance:** factory-log rebuilt byte-identical from events; the first program's committed walks (closed rows r1–r3, r7, r8) replay as streams; old event versions upcast on read.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~store lifetime~~ — **decided 2026-10-21**: one store per factory; closed features archived beside it; the record unsegmented in `kiln-v1`, measured in r15 (PRD CORE-7)
- ~~event schema evolution~~ — **decided 2026-10-21**: upcast on read; stored events immutable (PRD EVT-3a)

## Rules it must keep

- **VII** — the event stream is the primary record; projections rebuild identically
- **IX** — surfaces will read projections of this stream

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [The record](../../docs/concepts/the-record.md)
- [PRD §6.5 and CORE-7](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r14 — Gates as data, walked headless](./r14-gates-as-data-walked-headless.md) · [index](./README.md) · [r16 — Real local workers](./r16-real-local-workers.md) →
