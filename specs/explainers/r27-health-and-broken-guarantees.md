# r27 — Health and broken guarantees

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Workshop |
| **Release** | `kiln-v1` — position 17 of 43 in the committed order |
| **Depends on** | [r19 — Web front door, read-only](./r19-web-front-door-read-only.md), [r15 — The record](./r15-the-record.md) |
| **Unlocks** | [r32 — Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md) |
| **PRD requirements** | OBS-1 (core), OBS-3, OBS-5, OBS-6 |
| **Proven when** | an injected broken guarantee is critical and recorded; a silent watcher shows *unknown*, never healthy |

## In one paragraph

KILN watches its own machinery and says plainly when something looks wrong — and never acts on its own. A broken guarantee, such as a gate settled without a move, is always critical and always recorded.

## What it delivers

- the observe-never-act health watcher per host, with signals, baselines per host and *unknown since* states
- broken-guarantee signals — always critical, never snoozed, kept in the record
- core metrics derived from events; `kiln health`
- pause-only director rules an Operator may write on health conditions
- a versioned, content-free diagnostic bundle

## Not in this row

- insights and traces (r36)

## Requirements it carries

*As listed in the roadmap: OBS-1 (core), OBS-3, OBS-5, OBS-6. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| OBS-1 | **Metrics** derived from events (human loop, quality, cost, throughput, model behaviour). | Must (core) |
| OBS-3 | **Health watcher** per host, observe-never-act: domains of `health.md` §4 (steps and lane, models, hosts, record and views, gates, policy and security, knowledge, configuration and dependencies, teams, bench); signals with headline, subject, severity, since, why it matters, evidence, likely cause, what a person could do, what the director already did, clearing condition; auto-resolve, acknowledge, snooze; baselines learned per host; thresholds in `health.yaml`. | Should |
| OBS-5 | **Broken-guarantee signals** (gate settled without a move, judge off the strongest model, disallowed egress reached, non-identical projection rebuild, two store owners, a model loaded outside KILN's residency): always critical, never snoozed or configurable, kept as domain events; the director's fail-closed checks stop the affected factory, attributed separately. | Must |
| OBS-6 | **Watching the watcher and diagnostics**: heartbeats, *unknown since* instead of healthy, recovery reports; `kiln health`; a local, content-free diagnostic bundle on request, in a versioned, documented format shown before export; acknowledged warnings re-surface once a day while they persist; baselines per host. **Pause-only director rules** on health conditions, written by an Operator and recorded — never settling, skipping or re-opening a gate, changing a model or resuming anything. | Should |

## How it is proven

**Acceptance:** an injected broken guarantee is critical and recorded; a silent watcher shows *unknown*, never healthy.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Rules it must keep

- **V** — health never settles anything
- **VII** — signals are events
- **IX** — a silent watcher shows *unknown*, never healthy

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [Health](../../docs/concepts/health.md)
- [PRD OBS-3, OBS-5, OBS-6](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r26 — Agents and flows](./r26-agents-and-flows.md) · [index](./README.md) · [r53 — The Feed](./r53-the-feed.md) →
