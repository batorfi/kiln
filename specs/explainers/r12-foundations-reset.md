# r12 — Foundations reset

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** in the [roadmap proposal](../ROADMAP.md), which awaits the Roadmap
> gate; nothing here is admitted. The row's own `specs/NNN-…` directory (spec, plan, tasks) is written when it is admitted.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Foundation |
| **Release** | `kiln-v1` — position 1 of 41 in the proposed order |
| **Depends on** | — |
| **Unlocks** | [r42 — Spike: completing a waiting task from outside](./r42-spike-completing-a-waiting-task-from-outside.md), [r13 — Durable core and the gate contract](./r13-durable-core-and-the-gate-contract.md) |
| **PRD requirements** | GATE-1/2, WORK-2, LANE-2, EVT-5 (validators) |
| **Proven when** | new layout builds; legacy frozen; every ported test green; `kiln check` runs the network check |

## In one paragraph

The restart reorganises the repository around the new design without throwing away what the first program proved. This row creates the package layout every later row builds in, freezes the old Pi extension in `legacy/`, and ports the code that still expresses a rule KILN holds — with its tests — so the new codebase starts with its guarantees already checked.

## What it delivers

- the package layout: `contracts`, `record`, `durable`, `lane`, `workers`, `director`, `server`, `web`, `cli`, `checks` (with room for `knowledge`, `workshop`, `team`, `explore`, `editor` later)
- the first program's Pi extension and terminal UI frozen in `legacy/`, with no feature work there
- the keep-list ported with its tests green: the standard flow and move kinds as data, the schemas, the log and roadmap validators, the affinity scheduler, the strongest-judge tier policy, the deterministic clock
- the hardened, never-vacuous network check generalised into `checks/`
- the legacy `kiln/contracts/gate-rail.md` rewritten for constitution v2.0.1 and the decided move set (with r14)
- the legacy live-Pi suite skipping with a printed reason on a Pi version it has not measured, instead of failing

## Not in this row

- no durable runtime yet (r13) and no new behaviour — this row moves and checks, it does not add features
- no user interface

## Requirements it carries

*As listed in the roadmap: GATE-1/2, WORK-2, LANE-2, EVT-5 (validators). Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| GATE-1 | The **default flow**: ten gates with plain names and one question each: **Roadmap gate**, Concept, Design, Specification, Work plan, **Implementation**, Code review, Verification, Documentation, **Merge**. Internal ids stay stable (`gate0`, `1-concept` … `9-pr`). | Must |
| GATE-2 | Each gate offers only its own moves (the existing move vocabulary), including the special cases: Implementation `approve · split+revise`; Code review `approve · revise · restart` (revise goes to the workers); Verification `approve · reject` with **2** automatic fix rounds; Merge `approve · reject`. | Must |
| WORK-2 | **Tier map**: roles bound to models in one place; judges (architecture critic, code reviewer, verifier, docs synthesizer) bind only to the strongest model; a weaker binding fails closed. | Must |
| LANE-2 | **Affinity scheduler** reused from the existing code: swap only on a genuine tier change; swaps are priced and recorded. | Must |
| EVT-5 | **Factory-log projection** in the existing schema; the existing validators run on it; a rebuild must be byte-identical to the live projection. | Must |

## How it is proven

**Acceptance:** new layout builds; legacy frozen; every ported test green; `kiln check` runs the network check.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~keep a terminal surface (the r9 work) or retire it~~ — **decided 2026-10-21: retired**; `legacy/` is frozen and retired, the terminal surface is the `kiln` CLI (PRD §14.1, WEB-6)
- the legacy `kiln/contracts/gate-rail.md` (old gate names, four line-of-defense roles, the 1.0.0 move table) is rewritten for constitution v2.0.1 and the decided move set — Code review `approve · revise · restart`, reject-to-earlier, three built-in judges — as r14 encodes the flow as data; `firing-ready` reads it, so it changes with its checks
- ~~the legacy live-Pi tests failing on Pi 1.1.0~~ — **decided 2026-10-22**: the suite skips with a printed reason on an unmeasured Pi version; re-measuring is a legacy chore

## Rules it must keep

- **II** — the strongest-judge policy survives the port
- **III, IV** — the scheduler's single-lane and affinity rules
- **VIII** — the network check that proves local-only
- *Dependencies* — the new layout keeps one seam per dependency

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [PRD §8.2 codebase layout and §10 what we keep](../../docs/prd/kiln-prd.md)
- [The constitution](../../.specify/memory/constitution.md)
- [What `kiln-v1` delivers](../../docs/architecture/explainers/kiln-v1.md)
- [The roadmap proposal](../ROADMAP.md) · [All row explainers](./README.md)

---

← — · [index](./README.md) · [r42 — Spike: completing a waiting task from outside](./r42-spike-completing-a-waiting-task-from-outside.md) →
