# r36 — Observability in full

> **Roadmap row r36** · phase: kiln-v1.x · release: `kiln-v1.x` (after the release) · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Complete the picture over time: one trace per feature, insights with honest numbers, time travel in the record explorer, a feature's journey, a diagnostics bundle, and an opt-in OpenTelemetry export to loopback.

## What it delivers

- traces: feature → gate → step → model request → tool call
- insights with counts and sample sizes; the few-cases rule; no rankings of people
- time travel: any view as of any sequence number
- a feature's journey: every gate, round, decider, machine time versus waiting
- watching the watcher and a content-free diagnostics bundle
- opt-in OTLP export to a loopback collector

## Why it exists

- Evidence over time improves decisions — where people wait, which gates send work back, whether judges earn their keep (`insights.md`).
- Honest numbers rules keep insights from turning into targets on people.

## Why it sits here

- **Depends on:** [r32](r32-kiln-v1-release.md)
- **Unlocks:** — (nothing depends on it)

After the release; the core metrics and Health ship in r27.

## What it builds on

- the record (r15) — every number traceable to events

## How it is proven

**Acceptance:** One trace per feature; insights with counts and sample sizes; time travel to any moment.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

OBS-2, OBS-4, OBS-6, EVT-6, GATE-7 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Decisions before it starts

- none open

## Risks

- Numbers read as performance scores. Mitigation: system measures only, personal figures private, targets never on people.

## Read more

- [Insights](../../docs/concepts/insights.md)
- [The record](../../docs/concepts/the-record.md)
- [Mockups 16, 17, 18, 72](../../docs/concepts/mockups/README.md)
