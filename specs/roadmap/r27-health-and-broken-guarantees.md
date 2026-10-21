# r27 — Health and broken guarantees

> **Roadmap row r27** · phase: Workshop · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Watch KILN's own machinery and say plainly when something looks wrong — with evidence and baselines — and treat any sign of a broken guarantee as critical, recorded, and impossible to configure away. Health observes; it never acts.

## What it delivers

- the health watcher per host: signals with headline, subject, severity, evidence, likely cause, what a person could do, clearing condition
- baselines learned from this machine; thresholds in `health.yaml`
- broken-guarantee signals — always critical, kept as domain events
- *unknown since* when the watcher cannot see; recovery reports after a crash
- core metrics derived from events; `kiln health`

## Why it exists

- A system that makes guarantees must notice when one may be broken (`health.md`).
- Observe-never-act keeps Health from becoming a second, uncontrolled decision-maker.
- *Unknown* instead of green is the honesty that makes the signal trustworthy.

## Why it sits here

- **Depends on:** [r19](r19-web-front-door-read-only.md), [r15](r15-the-record.md)
- **Unlocks:** [r32](r32-kiln-v1-release.md)

It needs only the record (r15) and the front door (r19); it sits in the workshop phase so it watches everything built before the release. It could move earlier — right after r19 — if you want it watching the durable core sooner.

## What it builds on

- validators and readiness probes from r12 as health inputs

## How it is proven

**Acceptance:** An injected broken guarantee is critical and recorded; a silent watcher shows *unknown*, never healthy.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

OBS-1 (core), OBS-3, OBS-5, OBS-6 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no traces, insights or diagnostics bundle (r36)

## Decisions before it starts

- **Blocking:** the broken-guarantee response — the director stops the factory at the next step boundary (recommended)

## Risks

- Alarm fatigue. Mitigation: quiet by default, de-duplicated, auto-resolving signals.

## Read more

- [Health](../../docs/concepts/health.md)
- [Mockups 05, 19](../../docs/concepts/mockups/README.md)
