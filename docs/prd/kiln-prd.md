> Status: product requirements — draft for review (2026-10-17) — **not admitted**
> Type: PRD (high level)
>
> Scope note: this document defines **the new KILN codebase** — what it must do, how it is organised, and which of the
> existing code it keeps — as the basis for a new roadmap. It consolidates the vision and the recent concepts into
> requirements; it does not repeat their reasoning. Where this PRD and a concept doc disagree on *intent*, the concept
> doc governs; where they disagree on *scope*, this PRD governs. Adopting it needs the Roadmap-gate decision and the
> constitution amendments listed in §15.
>
> Sources:
>   - `docs/concepts/vision.md` — why and where to
>   - `docs/concepts/web-front-door.md` — the design (rev 12)
>   - `docs/concepts/user-experience.md` — the experience (rev 7) and `docs/concepts/mockups/` (35 mockups)
>   - `docs/concepts/pi-durable.md` — the durable substrate
>   - `docs/concepts/factory-wiki.md` — knowledge (rev 4)
>   - `docs/concepts/factories-anywhere.md` — hosts
>   - `docs/concepts/concept.md`, `gates-why-how-what.md` — the original concept and gate rationale
>   - the existing codebase under `kiln/` (r1–r9, ~5,900 lines of source, 98 test files)

# KILN — product requirements for the new codebase

## 1. Product in one paragraph

KILN is a **self-run software factory**: AI agents do the work of building features, independent judges check it, and
a human decides at every one of ten gates — from *which features do we build?* to *do we ship this?*. Factories run
**local by default** and anywhere you choose — your machine, a team server, a cloud machine in your account — and are
reached through a **web front door**. Every piece of work is **durable** (it survives crashes, moves and sleeping
machines), every change is an **event** in an ordered record, and every factory keeps a **knowledge base** that
explains how its code was built. The rules that make it trustworthy — *no silent approval, no model approves its own
work, one step at a time per factory, everything recorded* — are enforced by the codebase, not by convention.

## 2. Why a restart

The existing codebase (r1–r9) proved KILN's core rules — the gate rail, the single lane, the record, a real local-model
worker, and checks that fail by name. But it was built for a different product: **a Pi extension** with a terminal UI,
an in-memory runtime, a hand-written log, one machine and one factory. The new concepts change the foundations:

| Then (r1–r9) | Now |
|---|---|
| KILN loads into Pi as an extension; Pi hosts the UI | KILN is the application; Pi Durable is the substrate; Pi powers the workers |
| Terminal layers (footer, popup, overlay) | a local web front door with rich gate briefs |
| In-memory lane and gates; a `WAIT` record and resume tokens | gates, the director and the lane are **durable tasks** |
| A factory-log written by hand, validated after the fact | an **ordered event stream** committed with state; the factory-log is a projection |
| One factory, one machine | many factories, a workshop, **hosts anywhere** |
| Local models only | local by default; private and cloud models by recorded choice |
| No knowledge base | factory and workshop **knowledge** (LLM wikis), including how the code was built |

A restart lets the codebase be organised around these foundations from the start, while **keeping every part of the
old code that still expresses a rule we keep** (§10).

## 3. Goals and non-goals

### 3.1 Goals

1. **A runnable factory** a person can point at a feature and walk through all ten gates, in a browser, on local models.
2. **Rules enforced by construction** — no silent approval, author/judge separation, one step at a time per factory,
   judges on the strongest model, everything recorded — each with a check that fails by name.
3. **Durable by default** — no crash, restart, move or sleeping host loses work or settles a gate.
4. **Explainable** — the ordered record rebuilds any view at any moment; the knowledge base explains how the code was
   built.
5. **Local by default, open by choice** — a `local-only` factory provably makes no outbound call; anything else is a
   configured, recorded, policy-checked choice.
6. **Grows without redesign** — one factory → several → several hosts → a team, with the same concepts.

### 3.2 Non-goals

- A hosted KILN service, accounts or a KILN backend.
- Running several steps of one feature in parallel.
- Replacing engineering judgment, or optimising approval speed.
- Building its own agent harness, model server or knowledge viewer — KILN uses Pi Durable, Ollama/`pi-ai` providers,
  and Obsidian-compatible vaults.

## 4. Users

| Persona | Primary needs | Key requirements |
|---|---|---|
| **Decider** (primary) | understand the work, decide well, never be bypassed | gate briefs (§6.8), moves, delegation, stepping in |
| **Operator** | set up hosts, models, policies, budgets | §6.10, §6.12, §6.13 |
| **Curator** | keep a factory's knowledge current and traceable | §6.11 |
| **Observer** | see where things stand | read access to everything live |
| **Auditor** | reconstruct what happened, and on what evidence | the record, briefs *as seen*, time travel |
| **Evaluator** | judge models and policies by outcomes | insights, model and locality comparisons |

## 5. Product principles (requirements on every module)

| ID | Principle | Enforced by |
|---|---|---|
| **P1** | **No silent approval.** A gate is settled only by a human move, or by a recorded delegation on a clean path. Absence, a clock, a restart, a move, a sleeping host or a lost network never settles a gate. | gate task contract (§6.2); record validator (§6.5) |
| **P2** | **No model approves its own work.** Judges are separate roles; only the director creates conversations; steering never reaches a judge mid-verdict. | worker module (§6.3); director (§6.4) |
| **P3** | **One step at a time per factory**, on one host at a time. | lane task (§6.6) |
| **P4** | **Judges on the strongest model** available to the factory; never silently downgraded. | tier map (§6.3); fallback rules (§6.10) |
| **P5** | **Affinity is the local cost lever** — swap only when a tier demands it. | per-host scheduler (§6.6) |
| **P6** | **The Roadmap gate is human-only**, per factory; delegation never crosses features or factories. | roadmap task (§6.2) |
| **P7** | **Everything is recorded** in an ordered event stream committed with the state it describes; every view is a rebuildable projection. | event backbone (§6.5) |
| **P8** | **Local by default** — egress, remote models and remote hosts only by configured, recorded, policy-checked choice; a `local-only` factory provably makes no outbound call. | egress policy (§6.10); network checks (§7) |
| **P9** | **The front door is a window, never the source of truth** — surfaces are driven by events, never by polling. | server (§6.7) |
| **P10** | **Knowledge is context, never authority** — every claim traceable to a source; no page settles a gate. | knowledge module (§6.11) |
| **P11** | **A factory is portable** — moving it never changes a decision. | hosts (§6.12) |

## 6. Capabilities

Requirements are numbered per area (`GATE-1`, …) for traceability into the roadmap. *Must* items define `kiln-v1`;
*Should* items may follow it.

### 6.1 Gate rail and moves

| ID | Requirement | |
|---|---|---|
| GATE-1 | Ten gates with plain names and one question each: **Roadmap gate**, Concept, Design, Specification, Work plan, **Implementation**, Code review, Verification, Documentation, **Merge**. Internal ids stay stable (`gate0`, `1-concept` … `9-pr`). | Must |
| GATE-2 | Each gate offers only its own moves (the existing move vocabulary), including the special cases: Implementation `approve · split+revise`; Code review `approve · restart`; Verification `approve · reject` with **2** automatic fix rounds; Merge `approve · reject`. | Must |
| GATE-3 | Triage may skip Concept and Design for small features, recorded with its reasoning. | Must |
| GATE-4 | The **unattended tail** may be armed only at the Specification gate, for Work plan → Documentation; merge excluded unless explicitly delegated; any judge's objection ends it. Auto-crossed gates are recorded as delegated, never as human. | Must |
| GATE-5 | Corrective moves carry a note that becomes the next step's instruction. | Must |

### 6.2 Durable core

| ID | Requirement | |
|---|---|---|
| CORE-1 | The factory runs on **Pi Durable** behind **one KILN seam module**; no other module imports Pi Durable. | Must |
| CORE-2 | Durable task types: **roadmap** (holds the Roadmap gate), **row** (the director for one feature), **unit** (one step), **gate**, **lane**. | Must |
| CORE-3 | **Gate contract**: opening commits the gate document, the brief *as it will be shown*, and `gate.opened`; the move and the gate's completion are **one atomic commit**, keyed exactly-once; first move wins; stale moves are refused; no durable timer settles a gate. | Must |
| CORE-4 | Restart resumes every task from its last checkpoint; a waiting gate resumes as waiting; a half-done step never commits its result. | Must |
| CORE-5 | Exactly-once commands and moves via idempotency keys. | Must |
| CORE-6 | The "complete a waiting task from outside" primitive is settled with Pi Durable (upstream preferred); the gate contract does not depend on its exact API. | Must (early) |

### 6.3 Workers and roles

| ID | Requirement | |
|---|---|---|
| WORK-1 | Each step is a durable **conversation** with its role's instructions (`agents/*.md`), its tier's model and only its permitted tools. | Must |
| WORK-2 | **Tier map**: roles bound to models in one place; judges (architecture critic, code reviewer, verifier, docs synthesizer) bind only to the strongest model; a weaker binding fails closed. | Must |
| WORK-3 | Only the director creates conversations; workers have no subagent tool. | Must |
| WORK-4 | **Replay discipline**: read-only tools are replay-safe; writes and commands are not — the model is told of an interruption. | Must |
| WORK-5 | Deterministic `requestId` per step (feature, gate, step, attempt). | Must |
| WORK-6 | Workspace per factory (repository or worktree); overlap between factories detected and surfaced. | Must / Should |

### 6.4 Director and commands

| ID | Requirement | |
|---|---|---|
| DIR-1 | The director is **deterministic code** (the roadmap and row tasks); LLM-assisted proposals run as ordinary steps. | Must |
| DIR-2 | It proposes roadmaps (citing knowledge), plans units, orders them by affinity, applies moves, runs fix rounds, drafts record digests. It never decides a gate. | Must |
| DIR-3 | Commands — start a row, arm delegation, pause after step, abort step, accept/reject a proposal, move a factory — are idempotent commits. | Must |
| DIR-4 | A conversational interface to the director answers from the record with citations; talking never moves a gate. | Should |

### 6.5 Event backbone and record

| ID | Requirement | |
|---|---|---|
| EVT-1 | **Transactional outbox**: every state change commits its domain events in the same commit; one writer per factory gives one total order. | Must |
| EVT-2 | **Envelope**: id, seq, type, schema version, time, subject, actor, correlation, causation, trace, privacy, data — never prompt or answer content. | Must |
| EVT-3 | **Catalog** with versioned JSON schemas (program/roadmap, row, gate, unit, lane, delegation, mitigation, tool approval, command, model, egress, wiki, host, system); an invalid event fails its commit. | Must |
| EVT-4 | In-process backbone with **durable consumer cursors**, at-least-once and idempotent; a slow consumer never blocks a factory. | Must |
| EVT-5 | **Factory-log projection** in the existing schema; the existing validators run on it; a rebuild must be byte-identical to the live projection. | Must |
| EVT-6 | **Time travel**: any projection rebuildable as of any `seq`. | Should |

### 6.6 Lane, model pool and scheduling

| ID | Requirement | |
|---|---|---|
| LANE-1 | **Lane task** per factory: at most one running generation; holds resident model, hold flag (Design, Code review, Verification), swap count; survives restarts. | Must |
| LANE-2 | **Affinity scheduler** reused from the existing code: swap only on a genuine tier change; swaps are priced and recorded. | Must |
| LANE-3 | **Model pool per host**: resident set within a memory budget; shared **leases**; KILN — not Ollama — owns residency (explicit load, pin, unload); the strongest local model may be pinned for judges. | Must (one host) |
| LANE-4 | Host scheduler: affinity across factories, admission control (queue, never fail), concurrency cap, fair share, no mid-generation preemption. | Should |

### 6.7 Web front door

| ID | Requirement | |
|---|---|---|
| WEB-1 | A local server (Node, no runtime framework required) serving read models and a live event push; moves and commands as requests. | Must |
| WEB-2 | **Session security**: loopback bind, per-launch secret, Host/Origin checks, CSRF protection; `decided_by` from the session. Network-shared workshop: TLS and the team's identity provider. | Must / Should |
| WEB-3 | Surfaces (from the mockups): workshop overview and *Needs you*; factory live view; **gate brief**; coming back; record and feature record; knowledge; insights; models & policy; hosts; health; people. | Must (core) / Should (rest) |
| WEB-4 | A reconnecting browser resumes from its last `seq`; no polling. | Must |
| WEB-5 | Notifications are information only — never decisions. | Must |

### 6.8 The gate brief

| ID | Requirement | |
|---|---|---|
| BRIEF-1 | Every gate is presented with a **ten-part brief**: orientation, the decision, the work, the yardstick, the evidence, risks and open issues, provenance, history, options with consequences (and the moves not available, and why), other actions. | Must |
| BRIEF-2 | A **headline** travels wherever a gate appears; a move is possible only where the full brief is available. | Must |
| BRIEF-3 | Honest about gaps; complete before presentation; **recorded as seen** with the move. | Must |
| BRIEF-4 | Per-gate emphasis (Roadmap gate: proposal, knowledge context, profile, policy, budget, **host**; Merge gate: end-to-end story and what the feature added to knowledge). | Must |
| BRIEF-5 | *Context from the knowledge base* with citations, flagging stale, drifted or recently changed pages. | Should |

### 6.9 Human in the loop beyond gates

| ID | Requirement | |
|---|---|---|
| HITL-1 | **Steering** of work steps (never judges), recorded under the person's name. | Must |
| HITL-2 | **Risky-action approvals**: tool calls held by policy until a person allows or refuses; answers remembered across restarts; never a gate move. | Must |
| HITL-3 | **Policy stops** — blocked egress, budget reached, judge unavailable — arrive as decisions, never as workarounds. | Should |
| HITL-4 | **Hand-over** of a waiting decision to another permitted Decider. | Should |

### 6.10 Models beyond the machine

| ID | Requirement | |
|---|---|---|
| MOD-1 | **Model catalog**: locality (`local` · `private` · `remote`), pinned version, family, capabilities, cost, data handling, endpoint; credentials in the OS secret store. | Must (local) / Should (remote) |
| MOD-2 | **Profiles** per factory, chosen at the Roadmap gate: `local-only` (default, provable), `hybrid`, `remote-first`. | Should |
| MOD-3 | **Per-role routing**, cross-family judging where policy requires it. | Should |
| MOD-4 | **Egress policy** per factory: what may go to which locality; checks before every request (secrets scan, redaction); a violation blocks, never trims. | Should |
| MOD-5 | **Budgets** that pause, never skip or downgrade; **fallback** only by policy; a judge never silently falls back. | Should |

### 6.11 Knowledge

| ID | Requirement | |
|---|---|---|
| KNOW-1 | A **factory wiki** per factory and a **workshop wiki**, following Karpathy's LLM Wiki: immutable `raw/`, keeper-written `pages/`, `AGENTS.md` schema, `index.md`; `log.md` projected from events. | Must (factory) / Should (workshop) |
| KNOW-2 | **Ingest** (discussed, then written directly, one commit, revertible), **query** (cited; answers filed back), **lint** (strongest model, other family; findings, never edits). | Must |
| KNOW-3 | **Vault contract**: every wiki is a valid Obsidian vault — wikilinks, unique names, YAML properties, no plugin dependencies, readable in Zed; checked by lint. | Must |
| KNOW-4 | **Edit rights**: Curators edit factory wikis; anyone edits the workshop wiki; every change attributed, recorded, linted. | Must |
| KNOW-5 | **Implementation knowledge**: automatic implementation digests per gate; feature story, overview, explainers, how-tos, reference, learnings — grounded in code at a commit; drift and claim checks; explore by code. | Should |
| KNOW-6 | Workshop wiki included read-only in each factory vault (`workshop/`). | Should |

### 6.12 Workshop and hosts

| ID | Requirement | |
|---|---|---|
| HOST-1 | **Several factories** in one workshop: a factory registry, a cross-factory gate inbox, per-factory deciders. | Must |
| HOST-2 | **Host runtime** separable from the workshop; a single machine runs both by default. | Must (in-process) / Should (separate) |
| HOST-3 | Hosts join by an Operator's approval, receive revocable identities, and talk over a mutually authenticated, encrypted host channel. | Should |
| HOST-4 | **Placement** at the Roadmap gate with fit checks (policy, models, capacity, cost); `local-only` factories only on local hosts. | Should |
| HOST-5 | **Moves** with handover (fit check, quiesce, transfer store/workspace/wiki, resume); never change a decision. | Should |
| HOST-6 | **Sleeping hosts**: suspend when all factories wait; decisions *applying on wake*, exactly once. | Should |
| HOST-7 | **Network failure**: hosts work on to the next gate; no gate settled while unreachable; records catch up in order. | Should |

### 6.13 Observability, people and security

| ID | Requirement | |
|---|---|---|
| OBS-1 | **Metrics** derived from events (human loop, quality, cost, throughput, model behaviour). | Must (core) |
| OBS-2 | **Traces**: one per feature (row → gate → unit → model request → tool call), linked to events; opt-in OTLP export to an allowed collector. | Should |
| OBS-3 | **Health watcher**: signals only — stuck steps, lagging views, slow loads, overlap, host offline, vault conformance. | Should |
| OBS-4 | **Insights**: evidence for people, never automatic change. | Should |
| PPL-1 | **People and roles** per factory: Decider, Operator, Curator, Observer, Auditor; identity on every decision. | Must (single user) / Should (team) |

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| **Runtime** | Node `^22.18.0 || >=23.6.0`, TypeScript run directly where possible; macOS first, Linux next. |
| **Dependencies** | Runtime dependencies are allowed and **pinned** (Pi Durable, `pi-ai`, `chord`, approved 2026-10-16); each new one is a recorded decision; experimental ones sit behind one seam. The web frontend may use build-time-only tooling, shipped prebuilt. |
| **Local-first** | A `local-only` factory on a single machine makes **no outbound connection**; a network check proves it per host from the configured allowlist. |
| **Durability** | Crash at any point: no lost decision, no double-applied move, no half-committed step. |
| **Determinism and replay** | Committed event streams replay through every projection to the same result; replays are regression fixtures. |
| **Performance** | Targets set by measurement, not assumption (swap cost, tokens per second, time to brief); recorded per model and host. |
| **Security** | Loopback by default; authenticated, encrypted channels beyond it; secrets never in the record, store, browser or logs. |
| **Privacy** | No prompt or answer content in events, metrics, traces or exports; restricted content never leaves its host. |
| **Portability** | Wikis are plain git + Obsidian vaults; factory stores move between hosts. |
| **Accessibility** | Everything readable without colour; text localisable. |
| **Testability** | Every principle in §5 has a named, falsifiable check (the existing `*-ready` pattern); checks never pass vacuously. |

## 8. Architecture

### 8.1 Shape

```
 Browser ──► server (front door, auth, read models, push, move & command intake)
               │
               ▼
 workshop  ── people · policies · registry · placement · workshop wiki · workshop record
               │  (in-process on one machine; host channel otherwise)
               ▼
 host      ── model pool · scheduler · factories
               │
 factory   ── durable store (Pi Durable): roadmap · row · unit · gate · lane tasks
               ├── event outbox ──► backbone ──► projections (state, factory-log, metrics, traces, health, knowledge log)
               ├── workers: conversations · roles · tools · providers (pi-ai: Ollama, private, cloud)
               ├── workspace (git)
               └── factory wiki (git, Obsidian vault)
```

### 8.2 Proposed codebase layout

```
kiln/
  packages/
    contracts/     gate rail, move vocabulary, event catalog + schemas, roles & tiers   (pure, no I/O)
    record/        event envelope, outbox, backbone, projections, factory-log, validators
    durable/       THE Pi Durable seam: task types, gate contract, commands, resume
    lane/          lane task, affinity scheduler, model pool, residency (Ollama)
    workers/       conversations, role instructions, tool sets, replay policy, providers, egress checks
    director/      roadmap & row tasks, planning, fix rounds, digests
    knowledge/     wikis: ingest / query / lint, vault contract, implementation knowledge
    workshop/      registry, people & roles, policies, placement, gate inbox
    host/          host runtime, host channel, moves, sleep
    server/        HTTP, auth, read models, push, intake
    web/           the front door (prebuilt assets)
    cli/           kiln serve · kiln host · kiln check · kiln replay
  agents/          role instructions (*.md)
  checks/          readiness probes and network checks (the *-ready pattern)
  fixtures/        committed event streams and replays
  legacy/          r1–r9 code, frozen, until each part is ported or retired
```

**Dependency direction:** `contracts` ← `record` ← `durable` ← `lane`, `workers` ← `director` ← `workshop`, `host` ←
`server` ← `web`/`cli`. Only `durable` imports Pi Durable; only `workers` imports `pi-ai`; only `lane` talks to Ollama's
management API; only `server` and `host` open network listeners.

## 9. Data and storage

| Store | What | Where |
|---|---|---|
| Factory durable store (SQLite, Pi Durable) | tasks, conversations, documents, outbox | on the factory's host |
| Factory event stream | ordered domain events | in the factory store; replicated to the workshop |
| Factory-log | JSONL projection, existing schema | on the host; rebuildable |
| Workspace | the code (git) | on the factory's host |
| Factory wiki | git + Obsidian vault | on the factory's host; reachable as a git remote |
| Workshop store | registry, people, policies, placement, workshop events | with the workshop |
| Workshop wiki | git + Obsidian vault | with the workshop; included read-only in factory vaults |
| Secrets | provider keys, host identities | OS / host secret store only |

## 10. What we keep from the existing code

The rule: **keep code that expresses a rule we still hold; adapt code whose rule holds but whose mechanism changes;
retire code tied to the Pi-extension host or the terminal UI.** Existing tests travel with the code they test.

### 10.1 Keep — port with little change

| Existing | Becomes | Why |
|---|---|---|
| `contracts/move-vocabulary.ts`, `contracts/gate-rail.md` | `packages/contracts` (gate names added; ids unchanged) | the gate rail and move sets are unchanged (GATE-1/2) |
| `src/roles.ts` | `packages/contracts` tier policy | strongest-model guard for judges (WORK-2) |
| `src/scheduler.ts` | `packages/lane` affinity scheduler | "swap only on a genuine tier change" is unchanged (LANE-2) |
| `src/clock.ts` | `packages/record` | deterministic time for replays |
| `schemas/factory-log.schema.json`, `schemas/roadmap.schema.json` | `packages/record` / `packages/contracts` | the factory-log stays as a projection (EVT-5) |
| `validate/_core.ts`, `validate/log.ts`, `validate/roadmap.ts`, `validate/_report.ts` | `packages/record` validators | no-silent-approval and ordering checks run on the projection |
| `validate/_netscan.ts` | `checks/` network check, generalised to per-host allowlists | the hardened, never-vacuous scan is exactly what P8 needs |
| `factory-log/*.jsonl`, `fixtures/r7-*` | `fixtures/` — converted to event streams, kept as regression replays | committed evidence of real walks |
| `tests/contract`, `tests/negative`, `tests/netscan`, `tests/scheduler`, `tests/switch-cost` | with their modules | they test rules we keep |

### 10.2 Adapt — keep the rule, change the mechanism

| Existing | Becomes | Change |
|---|---|---|
| `src/gate.ts` | `packages/durable` gate task | WAIT/token/pre-delegation logic becomes gate-task steps (CORE-3) |
| `src/lane.ts` | `packages/lane` lane task | single-lane invariant enforced by a durable lane task (LANE-1) |
| `src/log-writer.ts` | `packages/record` outbox validator | the write-time no-silent-approval check moves to event commit |
| `src/ollama-resident.ts` | `packages/lane` residency manager | loopback-only, explicit load/unload, named failures kept; inference moves to `pi-ai` |
| `src/types.ts` | `packages/contracts` types | extended for the event catalog |
| `ui/factory-state.ts` | `packages/record` state projection | the pure event reducer becomes a projection consumer |
| `validate/*-ready.ts` | `checks/` readiness probes | same pattern; `pi-ready`/`ui-ready` become Pi Durable and server probes |
| `validate/_pi-driver.ts` (`RpcSession`) | `packages/workers` fallback driver | a Pi 1.x RPC worker path if the durable substrate is unavailable |
| `src/walk.ts`, `src/live-walk.ts`, `src/stub-resident.ts`, `src/live-resident.ts` | `fixtures/` + test harness, demo mode | the scripted walks become deterministic scenarios for tests and the front door's demo |

### 10.3 Retire, or keep frozen

| Existing | Decision |
|---|---|
| `pi/` (r8 extension), `pi/ui/` (r9 real UI), `index.ts` extension entry | **frozen in `legacy/`**; retired unless the Roadmap gate keeps a terminal surface (open decision) |
| `ui/hud.ts`, `ui/popup.ts`, `ui/overlay.ts`, `ui/gate0-face.ts`, `ui/live-tui.ts`, `ui/twin.ts`, `ui/keymap.ts` | text renderers may survive for a `kiln check` / CLI summary; the terminal surface itself retires |
| `tests/pi`, `tests/live-tui`, `tests/ui`, `tests/overlay*`, `tests/gate0-face` | retire with their code |

## 11. Phasing — candidate roadmap

Each milestone is a candidate roadmap row with its own gates. Every milestone ends usable and checked.

| # | Milestone | Delivers | Depends on | Key requirements |
|---|---|---|---|---|
| **M0** | **Foundations reset** | new layout; legacy frozen; contracts, schemas, validators, scheduler, roles and network check ported with their tests green | — | GATE-1/2, WORK-2, LANE-2, EVT-5 (validators) |
| **M1** | **Durable core, headless** | Pi Durable seam; roadmap/row/unit/gate/lane tasks; the gate contract; a scripted feature walks ten gates from the CLI, survives kill-and-resume | M0 | CORE-1…6, LANE-1, GATE-3/4/5 |
| **M2** | **Record** | outbox, envelope, catalog, backbone, cursors; factory-log projection byte-identical on rebuild; old walks replayed as event streams | M1 | EVT-1…5 |
| **M3** | **Real workers** | conversations on local models via `pi-ai`; tier map; tool sets; replay discipline; residency manager; model pool (one host) | M1, M2 | WORK-1…5, LANE-3 |
| **M4** | **Front door, read-only** | server, session security, read models, live push; overview, factory live, record views | M2 | WEB-1/2/4, OBS-1 (basic) |
| **M5** | **Gates on the web** | full gate brief, moves, delegation, steering, risky-action approvals | M3, M4 | BRIEF-1…4, HITL-1/2, WEB-3/5 |
| **M6** | **Director** | deterministic planning, affinity ordering, fix rounds, director conversation | M3 | DIR-1…4 |
| **M7** | **Knowledge** | factory wiki (ingest/query/lint, vault contract), knowledge in briefs; then workshop wiki and implementation knowledge | M5, M6 | KNOW-1…6, BRIEF-5 |
| **M8** | **Workshop** | several factories, gate inbox, host scheduler, people and roles | M5 | HOST-1, LANE-4, PPL-1 |
| **M9** | **Observability** | metrics, traces, health, insights, time travel | M2, M4 | OBS-1…4, EVT-6 |
| **M10** | **Models beyond the machine** | catalog, profiles, routing, egress policy, budgets, fallback, policy stops | M3, M5 | MOD-1…5, HITL-3 |
| **M11** | **Factories anywhere** | host runtime and channel, placement, moves, sleeping hosts, network failure | M8 | HOST-2…7, WEB-2 (network) |
| **M12** | **`kiln-v1` release** | installer, newcomer docs, demo mode from committed replays | M1–M7 (+ chosen Shoulds) | §3.1 goals |

**`kiln-v1`** = M0–M8 plus the *Must* items of M9; M10 and M11 can follow as `kiln-v1.x` without changing anything
built before them, because the single-machine, local-only workshop is their degenerate case.

## 12. Success measures

From the vision, made measurable:

- **Humans decide where it matters** — share of human time spent at gates versus monitoring.
- **Judges earn their keep** — problems caught at Design, Code review and Verification versus found after merge.
- **Nothing is lost** — rework after a crash or move, in minutes; zero lost decisions.
- **Every decision is explainable** — any merged feature fully reconstructed from the record alone.
- **Local is enough, or the record says why** — outcomes per model and locality.
- **Generated code stays understandable** — share of merged features with a complete feature story and no drifted pages.
- **The machine is busy while people think** — machine time used while a gate waits; money saved by sleeping hosts.

## 13. Risks

| Risk | Mitigation |
|---|---|
| Pi Durable is experimental and moves | one seam; pinned versions; contract outlives API; RPC fallback driver |
| External completion of a waiting task is not a published primitive | settle in M1, upstream first |
| Local-model capability (tool calling, streaming) varies | per-model readiness probes; measured, recorded |
| Scope: the concepts describe a lot | strict Must/Should; `kiln-v1` ends at M8 |
| Two products during the transition | `legacy/` frozen; no feature work there |
| Security surface grows with servers and hosts | loopback default; network modes opt-in, behind M11 |

## 14. Open decisions

Consolidated from the concept docs; each needs an answer before the milestone that depends on it.

1. Keep a terminal surface (r9) or retire it — before M4.
2. Wiki keeper: dedicated role or researcher with a schema — before M7.
3. How long a knowledge page may go unreviewed before a brief flags it — M7.
4. How much code implementation pages reproduce versus reference — M7.
5. User-facing words: Factory / Feature / Step; *Knowledge* versus *wiki* in docs — before M4.
6. Whether KILN may recommend a move at a gate, and limits on *request more evidence* — M5.
7. Several Deciders collaborating on one gate — M8.
8. Hosts in several workshops; how workspaces move; workshop failover; container forms — M11.
9. Egress policy language and model-family identity — M10.

## 15. Constitution amendments required

| Principle | Change |
|---|---|
| III Single lane | one lane **per factory**; resident models bounded per host (MAJOR) |
| IV Affinity | the cost lever for local models, per host; remote spend governed by budgets |
| VI Gate 0 | renamed **the Roadmap gate** (PATCH) |
| VII Everything recorded | the ordered event stream is the primary record; the factory-log is a projection (MAJOR) |
| VIII Local-first | local by default; egress, remote models and hosts only by configured, recorded, policy-checked choice; authenticated, encrypted connections beyond loopback (MAJOR) |
| IX No dashboard | a web front door that is never a source of truth; real authentication when shared over a network (MAJOR) |
| *new* | knowledge is context, never authority (MINOR) · a factory is portable — moving it never changes a decision (MINOR) |
| *dependency stance* | runtime dependencies allowed, pinned, recorded |

## 16. Glossary

| User-facing | Internal | Meaning |
|---|---|---|
| Workshop | workshop | where people work: front door, people, policies, gate inbox |
| Host | host | a machine factories run on |
| Factory | flow | one roadmap, one lane, one record |
| Feature | row | one roadmap item, walked through nine gates |
| Step | unit | one piece of work by one role |
| Gate | gate task | a stop that waits for a human move |
| Move | move | a human decision at a gate |
| Gate brief | brief | the full context presented with a gate |
| Record | event stream | everything that happened, in order |
| Knowledge | factory / workshop wiki | LLM-written, people-curated knowledge |
| Curator | Curator | keeper of a factory's knowledge |
