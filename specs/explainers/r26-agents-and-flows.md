# r26 — Agents and flows

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** in the [roadmap proposal](../ROADMAP.md), which awaits the Roadmap
> gate; nothing here is admitted. The row's own `specs/NNN-…` directory (spec, plan, tasks) is written when it is admitted.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Workshop |
| **Release** | `kiln-v1` — position 16 of 41 in the proposed order |
| **Depends on** | [r18 — The director](./r18-the-director.md), [r25 — One workshop, several factories](./r25-one-workshop-several-factories.md) |
| **Unlocks** | [r29 — New codebases](./r29-new-codebases.md), [r32 — Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md) |
| **PRD requirements** | CFG-2, CFG-7 (try-runs), FLOW-4…9 |
| **Proven when** | an added gate defined, checked, tried on a past feature, and chosen for one feature at the Roadmap gate |

## In one paragraph

Teams build software their own way. This row lets them see and change their agents safely — role versions, try-runs on past features — and add gates of their own, such as a threat model or a security review, chosen per feature at the Roadmap gate.

## What it delivers

- the Agents screen with role versions and **try-runs on past features**; a judge's instruction change applies only after a try-run
- added gates and flows from files, checked by `kiln check flow`
- per-feature flow choice at the Roadmap gate; gates added in flight by decision, never removed
- team-required gates; gate try-runs
- the Specification gate as the only arming point; `applies_when` with deterministic diff predicates

## Not in this row

- team-shared flows decided by quorum (r38)

## Requirements it carries

*As listed in the roadmap: CFG-2, CFG-7 (try-runs), FLOW-4…9. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| CFG-2 | **Layering**: team floor → workshop → factory, each stricter only; `kiln.config/` always lives per workshop, the team floor in the team space. | Must (workshop/factory) / Should (team) |
| CFG-7 | **Agents**: role files with kind, line of defense, tools, replay, gate, version; version recorded per step; **try on a past feature** as an ungated replay; judge and team-shared role changes need an Operator and, if shared, the team quorum. A **judge** instruction change applies only after a try-run on a past feature (enforced from r26); old role versions are kept forever. | Must (roles, versions, judge try-runs) / Should (other try-runs) |
| FLOW-4 | **Gate definitions** (`gates/<id>.md`): question, phase and placement, artifact, author, judges, moves, delegable, hold lane, `applies_when` (paths, labels, and deterministic diff predicates — never an LLM), deciders, brief emphasis, version; an added gate is never an arming point. | Should |
| FLOW-5 | **Flows** (`flows/<name>.yaml`): extend the standard flow and add gates; factory default; team-required gates by path or label. | Should |
| FLOW-6 | **Per-feature flow**: proposed with reasons and decided at the Roadmap gate; pinned with gate versions at admission; gates may be added in flight by decision, never removed. | Should |
| FLOW-7 | **`kiln check flow`**: all-or-nothing validation of anchors, placement, roles and judges, move kinds, `returns_to`, restart and mitigate prerequisites, arming points, required gates, cycles. | Must (default flow) / Should (added gates) |
| FLOW-8 | **Try a gate on a past feature**: ungated replay showing the brief a decider would have seen. | Should |
| FLOW-9 | Changes by an **Operator**; team-shared gates and flows by the **team quorum**. | Should |

## How it is proven

**Acceptance:** an added gate defined, checked, tried on a past feature, and chosen for one feature at the Roadmap gate.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~added gates as arming points; `applies_when` on the diff~~ — **decided 2026-10-21**: Specification only; deterministic diff predicates; judge instruction changes need a try-run from r26 on (§14.12, CFG-7) · ~~several Deciders on one gate~~ — **decided 2026-10-21**: one decision per gate; agreement as required reviews that condition *approve* (§14.7)

## Rules it must keep

- *The Flow* — anchors fixed, built-in gates never removed, closed move kinds
- **II** — added-gate judges on the strongest model

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [An extensible flow](../../docs/concepts/extensible-flow.md)
- [Configuration §6.3](../../docs/concepts/configuration.md)
- [PRD §6.17](../../docs/prd/kiln-prd.md)
- [The roadmap proposal](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r25 — One workshop, several factories](./r25-one-workshop-several-factories.md) · [index](./README.md) · [r27 — Health and broken guarantees](./r27-health-and-broken-guarantees.md) →
