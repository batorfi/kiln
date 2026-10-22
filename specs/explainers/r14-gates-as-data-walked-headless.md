# r14 — Gates as data, walked headless

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Durable core |
| **Release** | `kiln-v1` — position 4 of 41 in the committed order |
| **Depends on** | [r13 — Durable core and the gate contract](./r13-durable-core-and-the-gate-contract.md) |
| **Unlocks** | [r15 — The record](./r15-the-record.md), [r18 — The director](./r18-the-director.md) |
| **PRD requirements** | GATE-3/4/5/6, FLOW-1/2/3, FLOW-7 (default) |
| **Proven when** | a scripted feature walks ten gates from the CLI; `kiln check flow` refuses every invalid flow in its negative suite |

## In one paragraph

The default flow — the Roadmap gate and nine feature gates — becomes data the director executes, not a constant rail in code. A scripted feature walks all ten gates from the command line and survives being killed at every one, which makes the flow demonstrable long before any screen exists.

## What it delivers

- the standard flow as data, with the closed set of move kinds: approve, revise, reject, restart, split+revise, mitigate, and the Roadmap gate's row edits
- the decided move semantics: Code review offers `approve · revise · restart`; a reject may name an earlier gate at any time; every gate after the target re-opens; triage skips only Concept and Design
- the fix-round cap (default 2, settable 0–3)
- `kiln check flow` for the default flow, with a negative suite of invalid flows it must refuse
- a scripted feature walking all ten gates from the CLI, surviving kill-and-resume at every gate

## Not in this row

- added gates and flows from files (r26)
- the gate brief and moves in the browser (r20)

## Requirements it carries

*As listed in the roadmap: GATE-3/4/5/6, FLOW-1/2/3, FLOW-7 (default). Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| GATE-3 | Triage may skip Concept and Design for small features, recorded with its reasoning. | Must |
| GATE-4 | The **unattended tail** may be armed only at the Specification gate, for Work plan → Documentation; merge excluded unless explicitly delegated; any judge's objection ends it. Auto-crossed gates are recorded as delegated, never as human. | Must |
| GATE-5 | Corrective moves carry a note that becomes the next step's instruction. | Must |
| GATE-6 | **Where moves lead** (`the-flow.md` §7, §11–12, accepted 2026-10-21): reject targets a fresh author at the same gate or an earlier gate named in the note — the roadmap at Concept and Merge — and a person may make a reject to an earlier gate at any time; Code review offers `approve · revise · restart`, `revise` going to the workers; every gate after a reject's target is **re-crossed**, its brief showing what changed, with no lighter confirmation; triage never skips Documentation; fix-round cap a factory setting (0–3, default 2). | Must |
| FLOW-1 | **Gates as data**: the director executes a feature's flow from definitions, not a constant rail; the default flow ships as data. | Must |
| FLOW-2 | **Anchors and invariants**: Roadmap gate first, Merge gate last, all built-in gates present in order; added gates only between built-in ones; skipping only as triage does today; nothing after Merge. | Must |
| FLOW-3 | **Move kinds**: a closed set (approve · revise · reject · restart · split+revise · mitigate) with team labels and rules (required note, `returns_to`, rounds); events record kind and label. | Must |
| FLOW-7 | **`kiln check flow`**: all-or-nothing validation of anchors, placement, roles and judges, move kinds, `returns_to`, restart and mitigate prerequisites, arming points, required gates, cycles. | Must (default flow) / Should (added gates) |

## How it is proven

**Acceptance:** a scripted feature walks ten gates from the CLI; `kiln check flow` refuses every invalid flow in its negative suite.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- the legacy `kiln/contracts/gate-rail.md` (old gate names, four line-of-defense roles, the 1.0.0 move table) is rewritten for constitution v2.0.1 and the decided move set — Code review `approve · revise · restart`, reject-to-earlier, three built-in judges — as r14 encodes the flow as data; `firing-ready` reads it, so it changes with its checks

## Rules it must keep

- *The Flow* — fixed anchors, built-in gates never removed, closed move kinds
- **I** — a person decides every gate
- **V** — kill-and-resume never settles a gate

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [The flow](../../docs/concepts/the-flow.md)
- [An extensible flow](../../docs/concepts/extensible-flow.md)
- [The constitution, explained §9](../../docs/architecture/explainers/kiln-constitution.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r13 — Durable core and the gate contract](./r13-durable-core-and-the-gate-contract.md) · [index](./README.md) · [r15 — The record](./r15-the-record.md) →
