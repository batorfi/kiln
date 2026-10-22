# r17 — Configuration as files

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** in the [roadmap proposal](../ROADMAP.md), which awaits the Roadmap
> gate; nothing here is admitted. The row's own `specs/NNN-…` directory (spec, plan, tasks) is written when it is admitted.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Workers |
| **Release** | `kiln-v1` — position 7 of 41 in the proposed order |
| **Depends on** | [r16 — Real local workers](./r16-real-local-workers.md) |
| **Unlocks** | [r18 — The director](./r18-the-director.md), [r28 — First run](./r28-first-run.md) |
| **PRD requirements** | CFG-1, 3, 4, 6 (local), 7 (roles), 8, MOD-1 (local) |
| **Proven when** | a weaker judge binding is refused; a config change applies from the next step and is recorded with before/after |

## In one paragraph

Roles, the tier map and the local model catalog become plain files under `kiln.config/`, checked before they apply and recorded when they change — so a factory's configuration is reviewable like code, and a rule such as "judges on the strongest model" cannot be configured away.

## What it delivers

- `kiln.config/` with role files (`agents/*.md`) and the tier map
- judges bound to the strongest model; a weaker binding refused, not warned
- the local model catalog: family, size, context, capabilities — the basis for the strongest-judge and other-family rules
- Ollama `:cloud` tags recorded as remote and refused under `local-only`
- `kiln check config` and `kiln check model`
- changes recorded with before and after, applied from the next step

## Not in this row

- role try-runs and added gates (r26)
- remote providers (r45, r33)

## Requirements it carries

*As listed in the roadmap: CFG-1, 3, 4, 6 (local), 7 (roles), 8, MOD-1 (local). Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| CFG-1 | **Configuration as files** (`kiln.config/`): workshop, hosts, providers, model catalog, `agents/*.md`, `tiers.yaml`, policies, per-factory settings; the front door edits the same files; secrets only by reference. | Must |
| CFG-3 | **`kiln check config`**: all-or-nothing validation before apply — bindings, judge rules, capabilities, pins, allowlists, floors, no secrets; never vacuous. | Must |
| CFG-4 | **Applies from the next step**; host changes affect new leases only. | Must |
| CFG-6 | **Providers and models**: provider entries via `pi-ai`; catalog with pinned versions and families; **`kiln check model`** measures capabilities and re-checks on version change. Ollama **`:cloud` / `-cloud` tags are recorded as remote** and refused under `local-only`; the per-host network allowlist excludes `ollama.com`. | Must (local) / Should (remote) |
| CFG-7 | **Agents**: role files with kind, line of defense, tools, replay, gate, version; version recorded per step; **try on a past feature** as an ungated replay; judge and team-shared role changes need an Operator and, if shared, the team quorum. A **judge** instruction change applies only after a try-run on a past feature (enforced from r26); old role versions are kept forever. | Must (roles, versions, judge try-runs) / Should (other try-runs) |
| CFG-8 | **History**: every change recorded with who, before and after; config events in the workshop record. | Must |
| MOD-1 | **Model catalog**: locality (`local` · `private` · `remote`), pinned version, family, capabilities, cost, data handling, endpoint; credentials in the OS secret store. | Must (local) / Should (remote) |

## How it is proven

**Acceptance:** a weaker judge binding is refused; a config change applies from the next step and is recorded with before/after.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~Ollama `:cloud` tags under `local-only`~~ — **decided 2026-10-22**: recorded as remote and refused; `kiln doctor` checks Ollama's cloud features; the network allowlist excludes `ollama.com` (CFG-6, SETUP-2)

## Rules it must keep

- **II** — configuration can never weaken a judge
- **VII** — every change recorded
- **VIII** — `:cloud` tags cannot slip past local-only

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [Configuration](../../docs/concepts/configuration.md)
- [Routers and gateways §5.6 — the `:cloud` trap](../../docs/concepts/model-routers.md)
- [PRD §6.16](../../docs/prd/kiln-prd.md)
- [The roadmap proposal](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r16 — Real local workers](./r16-real-local-workers.md) · [index](./README.md) · [r18 — The director](./r18-the-director.md) →
