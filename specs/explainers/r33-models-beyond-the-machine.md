# r33 — Models beyond the machine

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | kiln-v1.x |
| **Release** | `kiln-v1.x` — position 28 of 42 in the committed order |
| **Depends on** | [r45 — Remote judges (judges-only hybrid)](./r45-remote-judges.md) |
| **Unlocks** | — |
| **PRD requirements** | MOD-1 (remote), MOD-2…5, HITL-3, CFG-6 (remote) |
| **Proven when** | a hybrid factory's cloud judge sees only what policy allows; a local-only factory reaches nothing beyond loopback |

## In one paragraph

Building on remote judges, factories may use private and cloud models for any role the policy names — with a full model catalog, profiles, per-role routing, cross-family judging and an egress policy checked before every request.

## What it delivers

- the full model catalog: locality, pinned version, family, capabilities, cost, data handling, endpoint
- profiles per factory: `local-only` (default, provable), `hybrid`, `remote-first`
- per-role routing with cross-family judging where policy requires it
- the egress policy language: what may go where, secrets scan and redaction, a violation blocks
- budgets, fallback only by policy, policy stops; routers allowed pinned

## Not in this row

- factories on other hosts (r37)

## Requirements it carries

*As listed in the roadmap: MOD-1 (remote), MOD-2…5, HITL-3, CFG-6 (remote). Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| MOD-1 | **Model catalog**: locality (`local` · `private` · `remote`), pinned version, family, capabilities, cost, data handling, endpoint; credentials in the OS secret store. | Must (local) / Should (remote) |
| MOD-2 | **Profiles** per factory, chosen at the Roadmap gate: `local-only` (default, provable), `hybrid`, `remote-first`. | Should |
| MOD-3 | **Per-role routing**, cross-family judging where policy requires it. | Should |
| MOD-4 | **Egress policy** per factory: what may go to which locality; checks before every request (secrets scan, redaction); a violation blocks, never trims. | Should |
| MOD-5 | **Budgets** that pause, never skip or downgrade; **fallback** only by policy; a judge never silently falls back. | Should |
| HITL-3 | **Policy stops** — blocked egress, budget reached, judge unavailable — arrive as decisions, never as workarounds. | Should |
| CFG-6 | **Providers and models**: provider entries via `pi-ai`; catalog with pinned versions and families; **`kiln check model`** measures capabilities and re-checks on version change. Ollama **`:cloud` / `-cloud` tags are recorded as remote** and refused under `local-only`; the per-host network allowlist excludes `ollama.com`. | Must (local) / Should (remote) |

## How it is proven

**Acceptance:** a hybrid factory's cloud judge sees only what policy allows; a local-only factory reaches nothing beyond loopback.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- egress policy language and model-family identity (§14.9)

## Rules it must keep

- **VIII** — local by default
- **II** — judges never downgraded
- **IV** — affinity for local models, budgets for remote

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [The web front door §13](../../docs/concepts/web-front-door.md)
- [Hybrid deployments](../../docs/concepts/hybrid-deployments.md)
- [PRD §6.10](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r45 — Remote judges (judges-only hybrid)](./r45-remote-judges.md) · [index](./README.md) · [r34 — The bench, part 1: notebook and research](./r34-the-bench-part-1-notebook-and-research.md) →
