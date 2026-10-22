# r16 — Real local workers

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** in the [roadmap proposal](../ROADMAP.md), which awaits the Roadmap
> gate; nothing here is admitted. The row's own `specs/NNN-…` directory (spec, plan, tasks) is written when it is admitted.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Workers |
| **Release** | `kiln-v1` — position 6 of 41 in the proposed order |
| **Depends on** | [r13 — Durable core and the gate contract](./r13-durable-core-and-the-gate-contract.md), [r15 — The record](./r15-the-record.md) |
| **Unlocks** | [r17 — Configuration as files](./r17-configuration-as-files.md) |
| **PRD requirements** | WORK-1, 3–5, LANE-3 |
| **Proven when** | a feature walks with real local workers and judges on Ollama; a crash mid-generation resumes without double-charging a tool |

## In one paragraph

Until now the walks run on scripts. This row puts real local models to work: workers and judges as durable conversations on Ollama through `pi-ai`, with the lane making sure only one generation runs at a time and only KILN decides which model is loaded.

## What it delivers

- conversations on local models through `pi-ai` — a **fresh conversation per step**, with explicit inputs recorded; only `revise` continues one
- tool sets per role and replay discipline: read-only tools replay safely, writes are never repeated after a crash
- the residency manager: explicit load and unload, loopback only, named failures
- **every model request through the lane**, harness housekeeping included; a model loaded outside KILN is a broken guarantee
- the model pool on one host; readiness probes per supported model (tool calling, streaming, usage, context)
- a scripted feature walking with real workers and real judges

## Not in this row

- configuration as files (r17)
- several factories sharing the pool (r25)
- remote models (r45, r33)

## Requirements it carries

*As listed in the roadmap: WORK-1, 3–5, LANE-3. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| WORK-1 | Each step is a **fresh** durable **conversation** with its role's instructions (`agents/*.md`), its tier's model, only its permitted tools and explicit inputs referenced in the record; steps never share a conversation — the only continuation is `revise`; a shared preamble may come from forking a prepared base. | Must |
| WORK-3 | Only the director creates conversations; workers have no subagent tool. | Must |
| WORK-4 | **Replay discipline**: read-only tools are replay-safe; writes and commands are not — the model is told of an interruption. | Must |
| WORK-5 | Deterministic `requestId` per step (feature, gate, step, attempt). | Must |
| LANE-3 | **Model pool per host**: resident set within a memory budget; shared **leases**; KILN — not Ollama — owns residency (explicit load, pin, unload); the strongest local model may be pinned for judges. **Every** model request, including harness-internal ones (compaction), goes through a KILN provider in front of Ollama, holds the lane lease and targets the resident model; another model is refused or becomes a recorded swap; housekeeping runs on the resident model. | Must (one host) |

## How it is proven

**Acceptance:** a feature walks with real local workers and judges on Ollama; a crash mid-generation resumes without double-charging a tool.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~workspace isolation~~ — **decided 2026-10-21**: a KILN-managed worktree per factory, a branch per feature; row task cleans its branch, factory its worktree (PRD WORK-6)
- ~~model residency vs. harness requests~~ — **decided 2026-10-21**: every request through the lane via a KILN provider; housekeeping on the resident model (PRD LANE-3, OBS-5)
- ~~session reuse~~ — **decided 2026-10-21**: a fresh conversation per step; only `revise` continues one (PRD WORK-1)

## Rules it must keep

- **I** — authors and judges are different units and conversations
- **II** — judges on the strongest local model
- **III, IV** — one lane, few swaps
- **VIII** — loopback only

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [The web front door §7 — workers as durable conversations](../../docs/concepts/web-front-door.md)
- [The model landscape](../../docs/concepts/model-landscape.md)
- [PRD §6.3, §6.6](../../docs/prd/kiln-prd.md)
- [The roadmap proposal](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r15 — The record](./r15-the-record.md) · [index](./README.md) · [r17 — Configuration as files](./r17-configuration-as-files.md) →
