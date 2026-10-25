# r45 — Remote judges (judges-only hybrid)

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | kiln-v1.x |
| **Release** | `kiln-v1.x` — position 28 of 43 in the committed order |
| **Depends on** | [r32 — Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md) |
| **Unlocks** | [r33 — Models beyond the machine](./r33-models-beyond-the-machine.md) |
| **PRD requirements** | MOD-6, MOD-1 (remote), HITL-3 |
| **Proven when** | a code reviewer runs on a pinned remote model; a provider outage makes the judged step wait; the egress audit lists each request with model served, provider and cost |

## In one paragraph

Local judges are limited by memory; frontier models are not. This first `kiln-v1.x` row moves only the judges to a remote frontier model — workers and the planner stay local — so a 32–64 GB machine gets stronger review than any local judge, for a few dollars of judge tokens per feature.

## What it delivers

- the judge roles on a remote model through a direct provider or OpenRouter, **pinned**: approved providers only, no provider fallbacks, data collection denied, zero data retention where required, every parameter honoured
- judge-context egress: the diff, specification, design, touched files and their direct dependents' interfaces, configurable; KILN's own egress check first
- budgets that pause, never downgrade; policy stops in Needs you
- requested and served model, provider and cost recorded per request; a served-model mismatch on a judge a broken guarantee
- judge fallback only to a second provider of the same model; a missing judge waits

## Not in this row

- remote models for any role, profiles and the full catalog (r33)

## Requirements it carries

*As listed in the roadmap: MOD-6, MOD-1 (remote), HITL-3. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| MOD-6 | **Remote judges first** (judges-only hybrid, roadmap r45): the judge roles on a remote model through a direct provider or OpenRouter **pinned** — `only` approved providers, `allow_fallbacks: false`, `data_collection: deny`, `zdr` where required, `require_parameters: true`; no automatic model choice for judges; fallback only to a second provider of the **same** model; judge-context egress (diff, specification, design, touched files and their direct dependents' interfaces, configurable); requested and served model, provider and cost recorded per request, a served-model mismatch on a judge a broken-guarantee signal; workers and the planner stay local unless an Operator binds them remote. | Should |
| MOD-1 | **Model catalog**: locality (`local` · `private` · `remote`), pinned version, family, capabilities, cost, data handling, endpoint; credentials in the OS secret store. | Must (local) / Should (remote) |
| HITL-3 | **Policy stops** — blocked egress, budget reached, judge unavailable — arrive as decisions, never as workarounds. | Should |

## How it is proven

**Acceptance:** a code reviewer runs on a pinned remote model; a provider outage makes the judged step wait; the egress audit lists each request with model served, provider and cost.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~hybrid's open questions~~ — **decided 2026-10-22** (defaults): judges-only first; the planner stays local unless an Operator binds it remote; judge fallback only to a second provider of the same model; judge context = the diff, specification, design, touched files and their direct dependents' interfaces, configurable; insights show judge comparisons, never recommend; routers allowed pinned, provider identity recorded on every request (`hybrid-deployments.md` §10, `model-routers.md` §7)

## Rules it must keep

- **II** — the strongest judge, never silently downgraded
- **VIII** — egress only by recorded policy
- **VII** — every request recorded

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [Hybrid deployments](../../docs/concepts/hybrid-deployments.md)
- [Routers and gateways](../../docs/concepts/model-routers.md)
- [PRD MOD-6](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r32 — Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md) · [index](./README.md) · [r33 — Models beyond the machine](./r33-models-beyond-the-machine.md) →
