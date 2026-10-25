# r36 — Observability in full

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | kiln-v1.x |
| **Release** | `kiln-v1.x` — position 33 of 43 in the committed order |
| **Depends on** | [r32 — Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md) |
| **Unlocks** | — |
| **PRD requirements** | OBS-2, OBS-4, EVT-6, GATE-7 |
| **Proven when** | one trace per feature; insights with counts and sample sizes; time travel to any moment |

## In one paragraph

Honest numbers about how the factory works, and the ability to see any moment again: traces per feature, insights with their sample sizes, a feature's whole journey, and time travel through the record.

## What it delivers

- one trace per feature, linked to events; opt-in OpenTelemetry export to an allowed collector
- insights with counts and sample sizes, the few-cases rule, no rankings of people, never automatic change
- a feature's journey: every gate, round, move and decider; machine time versus waiting
- time travel: any projection as of any point in the record

## Not in this row

- health and core metrics are already in `kiln-v1` (r27)

## Requirements it carries

*As listed in the roadmap: OBS-2, OBS-4, EVT-6, GATE-7. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| OBS-2 | **Traces**: one per feature (row → gate → unit → model request → tool call), linked to events; opt-in OTLP export to an allowed collector. | Should |
| OBS-4 | **Insights**: evidence for people, never automatic change — measure families and definitions per `insights.md`; counts and sample sizes always shown; traceable to events; personal figures private to the person, no rankings of people; shown in context (briefs, Roadmap gate, candidates, configuration); **few-cases rule** (< 5 list cases · 5–19 rate with count · 20+ trends); **targets** only on system behaviour, never on human decision time, people or volume, with no automatic consequences; **team comparison** opt-in, system measures only, ≥ 3 contributing workshops, ranges not rankings. | Should |
| EVT-6 | **Time travel**: any projection rebuildable as of any `seq`. | Should |
| GATE-7 | **A feature's journey**: every gate, round, move and decider, machine time versus waiting, and where work went back — rebuilt from the record. | Should |

## How it is proven

**Acceptance:** one trace per feature; insights with counts and sample sizes; time travel to any moment.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Rules it must keep

- **VII** — every view a projection
- **VIII** — export only to an allowed collector
- insights never act

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [Insights](../../docs/concepts/insights.md)
- [The record](../../docs/concepts/the-record.md)
- [PRD OBS-2, OBS-4, EVT-6, GATE-7](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r54 — The Feed, the rest](./r54-the-feed-the-rest.md) · [index](./README.md) · [r37 — Factories anywhere](./r37-factories-anywhere.md) →
