> Status: product requirements — draft for review (rev 5, 2026-10-21, consolidated) — **not admitted**
> Type: PRD (high level)
>
> Scope note: this document defines **the new KILN codebase** — what it must do, how it is organised, and which of the
> existing code it keeps — as the basis for a new roadmap. It consolidates the vision and the recent concepts into
> requirements; it does not repeat their reasoning. Where this PRD and a concept doc disagree on *intent*, the concept
> doc governs; where they disagree on *scope*, this PRD governs. Adopting it needs the Roadmap-gate decision; the
> constitution amendments listed in §15 were **adopted as constitution 2.0.0 on 2026-10-20**.
>
> Sources (concept docs govern intent):
>   - [Vision](../concepts/vision.md) (rev 6) — why and where to
>   - [The web front door — the design](../concepts/web-front-door.md) (rev 14) — the overall design; the map of all concepts
>   - [User experience](../concepts/user-experience.md) (rev 10) and [the mockups](../concepts/mockups/README.md) (77 illustrations)
>   - [KILN on Pi Durable](../concepts/pi-durable.md) — the durable substrate
>   - [The record](../concepts/the-record.md) — the event stream in depth
>   - [The director and Needs you](../concepts/the-director.md) — deterministic core, planner drafts, the inbox
>   - [Knowledge — factory and workshop wikis](../concepts/factory-wiki.md) (rev 5)
>   - [The bench](../concepts/the-bench.md) (rev 2) — notebook, research steps, spikes, the roadmap connection
>   - [Factories anywhere](../concepts/factories-anywhere.md) — hosts, placement, moves, sleeping hosts
>   - [The team space](../concepts/team-space.md) (rev 2) — personal workshops on one codebase
>   - [Configuration](../concepts/configuration.md) — hosts, providers, models and agents
>   - [An extensible flow](../concepts/extensible-flow.md) — the default flow and gates teams add
>   - [Insights](../concepts/insights.md) — measures, definitions, honest numbers
>   - [First run](../concepts/first-run.md) — setup: machine, models, workshop and storage, knowledge, team
>   - [The flow](../concepts/the-flow.md) — the default flow gate by gate, and where every move leads
>   - [KILN in an existing codebase](../concepts/brownfield.md) — brownfield adoption: profile, baseline, stages, territory
>   - [KILN in a new codebase](../concepts/greenfield.md) — greenfield: product brief, decisions, walking skeleton, slices
>   - [Devices and remote work](../concepts/devices-and-remote-work.md) — paired devices, private networks, step-up, offline
>   - [Health](../concepts/health.md) — the watcher, signals, broken guarantees, observe-never-act
>   - [The constitution](../../.specify/memory/constitution.md) (2.0.0, 2026-10-20) — the binding principles
>   - [The roadmap proposal](../../specs/ROADMAP.md) (r12–r42) — this PRD cut into feature-sized rows
>   - history: [the original concept](../concepts/concept.md) and [the gates — why, how, what](../concepts/gates-why-how-what.md)
>   - the existing codebase under [`kiln/`](../../kiln/) (r1–r9, ~5,900 lines of source, 85 test files)
>
> Rev 5 consolidates rev 4 with everything added since: first run and Spec Kit, the flow, brownfield and greenfield,
> health, devices, shaping the roadmap together, the constitution 2.0.0 and the retired terminal surface. It closes the
> traceability between requirements, milestones (§11) and roadmap rows, and lists what is still undecided (§14).

# KILN — product requirements for the new codebase

## 1. Product in one paragraph

KILN is a **self-run software factory**: AI agents do the work of building features, independent judges check it, and
a human decides at every one of ten gates — from *which features do we build?* to *do we ship this?*. Factories run
**local by default** and anywhere you choose — your machine, a team server, a cloud machine in your account — and are
reached through a **web front door** — from the workstation or any paired device. Every piece of work is **durable** (it survives crashes, moves and sleeping
machines), every change is an **event** in an ordered record, and every factory keeps a **knowledge base** that
explains how its code was built. Features follow **GitHub Spec Kit** and are measured against the project's **constitution**. The rules that make it trustworthy — *no silent approval, no model approves its own
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
| One person at one terminal | personal workshops in a **team space**; any paired device |
| Spec Kit used to build KILN | Spec Kit artifacts are **every factory's feature format**, new or existing codebase |

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
6. **Grows without redesign** — one factory → several → several hosts → a team of personal workshops sharing a team
   space, with the same concepts.
7. **Fits any codebase** — starts a new one with intent and a walking skeleton, or joins an existing one by scanning it
   into knowledge and earning trust in stages.

### 3.2 Non-goals

- A hosted KILN service, accounts or a KILN backend.
- Running several steps of one feature in parallel.
- Replacing engineering judgment, or optimising approval speed.
- Building its own agent harness, model server or knowledge viewer — KILN uses Pi Durable, Ollama/`pi-ai` providers,
  and Obsidian-compatible vaults.
- A terminal UI inside Pi (retired, constitution 2.0.0) or a KILN cloud relay for remote devices.

## 4. Users

*Concept: [UX §2 who uses KILN](../concepts/user-experience.md).*

| Persona | Primary needs | Key requirements |
|---|---|---|
| **Decider** (primary) | understand the work, decide well, never be bypassed | gate briefs (§6.8), moves, delegation, stepping in |
| **Operator** | set up hosts, models, policies, budgets | §6.10, §6.12, §6.13 |
| **Curator** | keep a factory's knowledge current and traceable | §6.11 |
| **Engineer at the bench** | research, prototype and understand the code while factories run, and keep what they learn | §6.15 |
| **Teammate** | see who builds what, avoid collisions, review each other's work, agree a team roadmap | §6.14 |
| **Engineer on the go** | triage, answer and decide from a notebook, tablet or phone, safely | §6.21 |
| **Observer** | see where things stand | read access to everything live |
| **Auditor** | reconstruct what happened, and on what evidence | the record, briefs *as seen*, time travel |
| **Evaluator** | judge models and policies by outcomes | insights, model and locality comparisons |

## 5. Product principles (requirements on every module)

*Concepts: [vision §3 what we believe](../concepts/vision.md) · [constitution 2.0.0](../../.specify/memory/constitution.md).*

Each product principle restates a constitution principle as a requirement on the code; where they differ, the
constitution governs.

| ID | Principle | Enforced by | Constitution |
|---|---|---|---|
| **P1** | **No silent approval.** A gate is settled only by a human move, or by a recorded delegation on a clean path. Absence, a clock, a restart, a move, a sleeping host or a lost network never settles a gate. | gate task contract (§6.2); record validator (§6.5) | V |
| **P2** | **No model approves its own work.** Judges are separate roles; only the director creates conversations; steering never reaches a judge mid-verdict. | worker module (§6.3); director (§6.4) | I |
| **P3** | **One step at a time per factory**, on one host at a time. | lane task (§6.6) | III |
| **P4** | **Judges on the strongest model** available to the factory; never silently downgraded. | tier map (§6.3); fallback rules (§6.10) | II |
| **P5** | **Affinity is the local cost lever** — swap only when a tier demands it. | per-host scheduler (§6.6) | IV |
| **P6** | **The Roadmap gate is human-only**, per factory; delegation never crosses features or factories. | roadmap task (§6.2) | VI |
| **P7** | **Everything is recorded** in an ordered event stream committed with the state it describes; every view is a rebuildable projection. | event backbone (§6.5) | VII |
| **P8** | **Local by default** — egress, remote models, remote hosts and paired devices only by configured, recorded, policy-checked choice; no KILN cloud; a `local-only` factory provably makes no outbound call. | egress policy (§6.10); network checks (§7) | VIII |
| **P9** | **Surfaces are windows, never the source of truth** — the web front door (on any paired device) and the CLI are driven by events, never by polling; the terminal surface is retired. | server (§6.7) | IX |
| **P10** | **Knowledge is context, never authority** — every claim traceable to a source; no page settles a gate. | knowledge module (§6.11) | X |
| **P11** | **A factory is portable** — moving it never changes a decision. | hosts (§6.12) | XI |
| **P12** | **Workshops are sovereign** — no act from a team space or another workshop settles a gate; every act between workshops is signed by a person. | team space (§6.14) | XII |
| **P13** | **Ungated means ungated** — bench output never settles a gate; spike code never reaches `main`; only promoted knowledge is cited in a brief; capture is always explicit. | bench (§6.15) | — |
| **P14** | **Every gate keeps the gate contract** — whoever defines a gate, it is a durable task, settled only by a committed move from the closed set of move kinds, with a full brief and an independent judge where it judges work; the Roadmap gate is first, the Merge gate last, and no built-in gate can be removed. | flow (§6.17) | Default flow |

## 6. Capabilities

Requirements are numbered per area (`GATE-1`, …) for traceability into the roadmap. *Must* items define `kiln-v1`;
*Should* items may follow it.

### 6.1 Gate rail and moves

*Concepts: [the flow](../concepts/the-flow.md) · [gates — why, how, what](../concepts/gates-why-how-what.md) · [design §3.1 the default flow](../concepts/web-front-door.md) · [an extensible flow](../concepts/extensible-flow.md) · [UX §8 the gate brief](../concepts/user-experience.md)*

| ID | Requirement | |
|---|---|---|
| GATE-1 | The **default flow**: ten gates with plain names and one question each: **Roadmap gate**, Concept, Design, Specification, Work plan, **Implementation**, Code review, Verification, Documentation, **Merge**. Internal ids stay stable (`gate0`, `1-concept` … `9-pr`). | Must |
| GATE-2 | Each gate offers only its own moves (the existing move vocabulary), including the special cases: Implementation `approve · split+revise`; Code review `approve · restart`; Verification `approve · reject` with **2** automatic fix rounds; Merge `approve · reject`. | Must |
| GATE-3 | Triage may skip Concept and Design for small features, recorded with its reasoning. | Must |
| GATE-4 | The **unattended tail** may be armed only at the Specification gate, for Work plan → Documentation; merge excluded unless explicitly delegated; any judge's objection ends it. Auto-crossed gates are recorded as delegated, never as human. | Must |
| GATE-5 | Corrective moves carry a note that becomes the next step's instruction. | Must |
| GATE-6 | **Where moves lead** (proposed in `the-flow.md` §11, pending review): reject targets a fresh author at the same gate or an earlier gate named in the note — the roadmap at Concept and Merge; every gate after the target is **re-crossed**, its brief showing what changed; fix-round cap a factory setting (0–3, default 2). | Should |
| GATE-7 | **A feature's journey**: every gate, round, move and decider, machine time versus waiting, and where work went back — rebuilt from the record. | Should |

### 6.2 Durable core

*Concepts: [KILN on Pi Durable](../concepts/pi-durable.md) · [design §5 the factory as a durable task graph](../concepts/web-front-door.md)*

| ID | Requirement | |
|---|---|---|
| CORE-1 | The factory runs on **Pi Durable** behind **one KILN seam module**; no other module imports Pi Durable. | Must |
| CORE-2 | Durable task types: **roadmap** (holds the Roadmap gate), **row** (the director for one feature), **unit** (one step), **gate**, **lane**. | Must |
| CORE-3 | **Gate contract**: opening commits the gate document, the brief *as it will be shown*, and `gate.opened`; the move and the gate's completion are **one atomic commit**, keyed exactly-once; first move wins; stale moves are refused; no durable timer settles a gate. | Must |
| CORE-4 | Restart resumes every task from its last checkpoint; a waiting gate resumes as waiting; a half-done step never commits its result. | Must |
| CORE-5 | Exactly-once commands and moves via idempotency keys. | Must |
| CORE-6 | The "complete a waiting task from outside" primitive is settled with Pi Durable (upstream preferred); the gate contract does not depend on its exact API. | Must (early) |

### 6.3 Workers and roles

*Concepts: [design §7 workers as durable conversations](../concepts/web-front-door.md) · [configuration §6 agents](../concepts/configuration.md)*

| ID | Requirement | |
|---|---|---|
| WORK-1 | Each step is a durable **conversation** with its role's instructions (`agents/*.md`), its tier's model and only its permitted tools. | Must |
| WORK-2 | **Tier map**: roles bound to models in one place; judges (architecture critic, code reviewer, verifier, and the judges of added gates) bind only to the strongest model; a weaker binding fails closed. | Must |
| WORK-3 | Only the director creates conversations; workers have no subagent tool. | Must |
| WORK-4 | **Replay discipline**: read-only tools are replay-safe; writes and commands are not — the model is told of an interruption. | Must |
| WORK-5 | Deterministic `requestId` per step (feature, gate, step, attempt). | Must |
| WORK-6 | Workspace per factory (repository or worktree); overlap between factories detected and surfaced. | Must / Should |

### 6.4 Director and commands

*Concepts: [the director and Needs you](../concepts/the-director.md) · [design §9 working with the orchestrator](../concepts/web-front-door.md)*

| ID | Requirement | |
|---|---|---|
| DIR-1 | The director is **deterministic code** (the roadmap and row tasks); LLM-assisted proposals run as ordinary steps. | Must |
| DIR-2 | It proposes roadmaps (citing knowledge), plans units, orders them by affinity, applies moves, runs fix rounds, drafts record digests. It never decides a gate. | Must |
| DIR-3 | Commands — start a row, arm delegation, pause after step, abort step, accept/reject a proposal, move a factory — are idempotent commits. | Must |
| DIR-4 | A conversational interface to the director answers from the record with citations; talking never moves a gate. | Should |
| DIR-5 | The **planner** is an LLM role run as a step; its drafts (roadmap proposals, work plans, splits, synthesis answers) are labelled, checked by deterministic rules before display, and decided by people. | Must |
| DIR-6 | **Needs you**: one inbox per person across factories, workshop and team space, in three sections — waiting on you, suggestions, worth knowing — each item with its headline and what it blocks; ordered by stakes, blocking others, then waiting time; never decides or expires anything. | Must |
| DIR-7 | **Shaping the roadmap together**: a per-factory **roadmap brief** of the engineer's inputs (goals, must-haves, constraints, order preferences, appetite, own rows, pointers) read first by the planner; a recorded shaping conversation (planner questions, why/what-if, alternatives side by side); direct edits with **pins** the planner must respect and never silently change; versioned drafts with diffs; deterministic checks on every version; row origin shown in the Roadmap gate brief; approve bound to the version read; shaping possible at any time, never altering work in progress. | Must |

### 6.5 Event backbone and record

*Concepts: [the record](../concepts/the-record.md) · [design §6 events and observability](../concepts/web-front-door.md)*

| ID | Requirement | |
|---|---|---|
| EVT-1 | **Transactional outbox**: every state change commits its domain events in the same commit; one writer per factory gives one total order. | Must |
| EVT-2 | **Envelope**: id, seq, type, schema version, time, subject, actor, correlation, causation, trace, privacy, data — never prompt or answer content. | Must |
| EVT-3 | **Catalog** with versioned JSON schemas (program/roadmap, row, gate, unit, lane, delegation, mitigation, tool approval, command, model, egress, wiki, host, system); an invalid event fails its commit. | Must |
| EVT-4 | In-process backbone with **durable consumer cursors**, at-least-once and idempotent; a slow consumer never blocks a factory. | Must |
| EVT-5 | **Factory-log projection** in the existing schema; the existing validators run on it; a rebuild must be byte-identical to the live projection. | Must |
| EVT-6 | **Time travel**: any projection rebuildable as of any `seq`. | Should |

### 6.6 Lane, model pool and scheduling

*Concepts: [design §5.4 the single lane, §12 many kilns on one machine](../concepts/web-front-door.md) · [factories anywhere](../concepts/factories-anywhere.md)*

| ID | Requirement | |
|---|---|---|
| LANE-1 | **Lane task** per factory: at most one running generation; holds resident model, hold flag (Design, Code review, Verification), swap count; survives restarts. | Must |
| LANE-2 | **Affinity scheduler** reused from the existing code: swap only on a genuine tier change; swaps are priced and recorded. | Must |
| LANE-3 | **Model pool per host**: resident set within a memory budget; shared **leases**; KILN — not Ollama — owns residency (explicit load, pin, unload); the strongest local model may be pinned for judges. | Must (one host) |
| LANE-4 | Host scheduler: affinity across factories, admission control (queue, never fail), concurrency cap, fair share, no mid-generation preemption. | Should |

### 6.7 Web front door

*Concepts: [user experience](../concepts/user-experience.md) · [mockups](../concepts/mockups/README.md) · [design §4 the shape, §19 security](../concepts/web-front-door.md)*

| ID | Requirement | |
|---|---|---|
| WEB-1 | A local server (Node, no runtime framework required) serving read models and a live event push; moves and commands as requests. | Must |
| WEB-2 | **Session security**: loopback bind, per-launch secret, Host/Origin checks, CSRF protection; `decided_by` from the session. Network-shared workshop: TLS and the team's identity provider; paired devices per DEV-2. | Must / Should |
| WEB-3 | Surfaces (from the mockups): workshop overview and *Needs you*; factory live view; **gate brief**; coming back; record and feature record; knowledge; insights; models & policy; agents; flows; hosts; health; people and devices; first run. | Must (core) / Should (rest) |
| WEB-4 | A reconnecting browser resumes from its last `seq`; no polling. | Must |
| WEB-5 | Notifications are information only — never decisions. | Must |

### 6.8 The gate brief

*Concepts: [UX §8 the gate brief](../concepts/user-experience.md) · mockups [02](../concepts/mockups/02-gate-brief-code-review.png), [03](../concepts/mockups/03-roadmap-gate.png), [07](../concepts/mockups/07-specification-gate-delegation.png)–[10](../concepts/mockups/10-merge-gate.png)*

| ID | Requirement | |
|---|---|---|
| BRIEF-1 | Every gate is presented with a **ten-part brief**: orientation, the decision, the work, the yardstick, the evidence, risks and open issues, provenance, history, options with consequences (and the moves not available, and why), other actions. | Must |
| BRIEF-2 | A **headline** travels wherever a gate appears; a move is possible only where the full brief is available. | Must |
| BRIEF-3 | Honest about gaps; complete before presentation; **recorded as seen** with the move. | Must |
| BRIEF-4 | Per-gate emphasis (Roadmap gate: proposal, knowledge context, profile, policy, budget, **host**; Merge gate: end-to-end story and what the feature added to knowledge). | Must |
| BRIEF-5 | *Context from the knowledge base* with citations, flagging stale, drifted or recently changed pages. | Should |

### 6.9 Human in the loop beyond gates

*Concepts: [design §8 human in the loop beyond gates](../concepts/web-front-door.md) · [UX §7.5 stepping in](../concepts/user-experience.md) · [the director §5 Needs you](../concepts/the-director.md)*

| ID | Requirement | |
|---|---|---|
| HITL-1 | **Steering** of work steps (never judges), recorded under the person's name. | Must |
| HITL-2 | **Risky-action approvals**: tool calls held by policy until a person allows or refuses; answers remembered across restarts; never a gate move. | Must |
| HITL-3 | **Policy stops** — blocked egress, budget reached, judge unavailable — arrive as decisions, never as workarounds. | Should |
| HITL-4 | **Hand-over** of a waiting decision to another permitted Decider. | Should |

### 6.10 Models beyond the machine

*Concepts: [design §13 models beyond the machine](../concepts/web-front-door.md) · [configuration §5 providers and models](../concepts/configuration.md)*

| ID | Requirement | |
|---|---|---|
| MOD-1 | **Model catalog**: locality (`local` · `private` · `remote`), pinned version, family, capabilities, cost, data handling, endpoint; credentials in the OS secret store. | Must (local) / Should (remote) |
| MOD-2 | **Profiles** per factory, chosen at the Roadmap gate: `local-only` (default, provable), `hybrid`, `remote-first`. | Should |
| MOD-3 | **Per-role routing**, cross-family judging where policy requires it. | Should |
| MOD-4 | **Egress policy** per factory: what may go to which locality; checks before every request (secrets scan, redaction); a violation blocks, never trims. | Should |
| MOD-5 | **Budgets** that pause, never skip or downgrade; **fallback** only by policy; a judge never silently falls back. | Should |

### 6.11 Knowledge

*Concepts: [knowledge — factory and workshop wikis](../concepts/factory-wiki.md)*

| ID | Requirement | |
|---|---|---|
| KNOW-1 | A **factory wiki** per factory and a **workshop wiki**, following Karpathy's LLM Wiki: immutable `raw/`, keeper-written `pages/`, `AGENTS.md` schema, `index.md`; `log.md` projected from events. | Must (factory) / Should (workshop) |
| KNOW-2 | **Ingest** (discussed, then written directly, one commit, revertible), **query** (cited; answers filed back), **lint** (strongest model, other family; findings, never edits). | Must |
| KNOW-3 | **Vault contract**: every wiki is a valid Obsidian vault — wikilinks, unique names, YAML properties, no plugin dependencies, readable in Zed; checked by lint. | Must |
| KNOW-4 | **Edit rights**: Curators edit factory wikis; anyone edits the workshop wiki; every change attributed, recorded, linted. | Must |
| KNOW-5 | **Implementation knowledge**: automatic implementation digests per gate; feature story, overview, explainers, how-tos, reference, learnings — grounded in code at a commit; drift and claim checks; explore by code. | Should |
| KNOW-6 | Workshop wiki included read-only in each factory vault (`workshop/`). | Should |

### 6.12 Workshop and hosts

*Concepts: [factories anywhere](../concepts/factories-anywhere.md) · [design §12 many kilns on one machine](../concepts/web-front-door.md) · [configuration §4 hosts](../concepts/configuration.md)*

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

*Concepts: [the record](../concepts/the-record.md) · [insights](../concepts/insights.md) · [design §6 events and observability](../concepts/web-front-door.md) · [UX §2 personas](../concepts/user-experience.md)*

| ID | Requirement | |
|---|---|---|
| OBS-1 | **Metrics** derived from events (human loop, quality, cost, throughput, model behaviour). | Must (core) |
| OBS-2 | **Traces**: one per feature (row → gate → unit → model request → tool call), linked to events; opt-in OTLP export to an allowed collector. | Should |
| OBS-3 | **Health watcher** per host, observe-never-act: domains of `health.md` §4 (steps and lane, models, hosts, record and views, gates, policy and security, knowledge, configuration and dependencies, teams, bench); signals with headline, subject, severity, since, why it matters, evidence, likely cause, what a person could do, what the director already did, clearing condition; auto-resolve, acknowledge, snooze; baselines learned per host; thresholds in `health.yaml`. | Should |
| OBS-4 | **Insights**: evidence for people, never automatic change — measure families and definitions per `insights.md`; counts and sample sizes always shown; traceable to events; personal figures private to the person, no rankings of people; shown in context (briefs, Roadmap gate, candidates, configuration); **few-cases rule** (< 5 list cases · 5–19 rate with count · 20+ trends); **targets** only on system behaviour, never on human decision time, people or volume, with no automatic consequences; **team comparison** opt-in, system measures only, ≥ 3 contributing workshops, ranges not rankings. | Should |
| OBS-5 | **Broken-guarantee signals** (gate settled without a move, judge off the strongest model, disallowed egress reached, non-identical projection rebuild, two store owners): always critical, never snoozed or configurable, kept as domain events; the director's fail-closed checks stop the affected factory, attributed separately. | Must |
| OBS-6 | **Watching the watcher and diagnostics**: heartbeats, *unknown since* instead of healthy, recovery reports; `kiln health`; a local, content-free diagnostic bundle on request. | Should |
| PPL-1 | **People and roles** per factory: Decider, Operator, Curator, Observer, Auditor; identity on every decision. | Must (single user) / Should (team) |

### 6.14 Teams and the team space

*Concepts: [the team space](../concepts/team-space.md)*

| ID | Requirement | |
|---|---|---|
| TEAM-1 | **Team space repository**: a git repository holding the team roadmap, claims, team knowledge, published digests, decision requests and responses, team rules and members; every write a signed commit. | Should |
| TEAM-2 | **Subscribe and publish**: each workshop pulls and verifies the team space into events of its own record, and publishes by its policy; default level **coordination**. | Should |
| TEAM-3 | **Team roadmap** changed by a **quorum** of named deciders; factories adopt team features at their own Roadmap gate. | Should |
| TEAM-4 | **Claims**: made on adoption, refined at Work plan, released at merge, expiring when stale; **advisory by default**, exclusive on protected paths; **overlap detection** across workshops shown in both gate briefs. | Should |
| TEAM-5 | **Decisions across workshops**: opinions, required reviews, delegated deciders — signed, recorded on both sides; required reviews **mirrored** with the code host's pull request. | Should |
| TEAM-6 | **Merge gate in a team**: base drift, required reviews and checks, the code host's merge-queue position; no KILN queue. | Should |
| TEAM-7 | **Team knowledge** tier in the team space, editable by every member, included as `team/` in member vaults; merged-feature stories by the author's choice. | Should |
| TEAM-8 | **Identity**: personal signing keys, registered and revoked through the team's identity provider where one exists; shared workshops join as one member. | Should |
| TEAM-9 | **Shared hosts** serving several member workshops with isolated leases, stores and secrets. | Should |

### 6.15 The bench

*Concepts: [the bench](../concepts/the-bench.md)*

| ID | Requirement | |
|---|---|---|
| BENCH-1 | **Notebook**: a private, unruled vault per person under the vault contract; explicit capture from clipper, editor, terminal, KILN surfaces and local voice transcription. | Should |
| BENCH-2 | **Keeper suggestions** in the notebook — links, contradictions, maturity — never rewriting; used only for the owner's questions. | Should |
| BENCH-3 | **Promotion** of notes by ingest into the workshop, factory or team tier, linked back to the notes. | Should |
| BENCH-4 | **Research steps**: plan shown first; read-only tools; below feature work, never on a held judge's lane; results in the notebook with sources and labels; per-person caps. | Should |
| BENCH-5 | **Spikes**: worktree on a `spike/` branch, question and time box, engineer and/or agent, risky actions held; **no pull request to `main` from a spike branch**; archived on conclusion. | Should |
| BENCH-6 | **Spike report** with spike-measured results; *propose as a feature* seeds a roadmap entry and its Concept or Design brief. | Should |
| BENCH-7 | **Origin and maturity labels** on all knowledge, carried into briefs and director citations; lint ages exploratory knowledge faster. | Should |
| BENCH-8 | **Links to gates**, gate-time research suggestions, and focus mode (only judged gates and policy stops interrupt). | Should |
| BENCH-9 | **In a team**: research claims, sharing bench output by choice, handing a spike to a teammate. | Should |
| BENCH-10 | **Candidate list** per factory: candidates from notes, research and spike reports, links kept; editable by deciders and Curators; proposable to the team roadmap with evidence. | Should |
| BENCH-11 | **Roadmap-gate evidence view**: evidence and readiness (ready · thin · unknown) per proposed feature, unproven assumptions, *research this* / *spike this* actions; *what we learned since the last approval*; corrections flagged between gates. | Should |
| BENCH-12 | **Director suggests, never starts** research or spikes; proposals state when a candidate cannot be sized. | Should |

### 6.16 Configuration

*Concepts: [configuration](../concepts/configuration.md)*

| ID | Requirement | |
|---|---|---|
| CFG-1 | **Configuration as files** (`kiln.config/`): workshop, hosts, providers, model catalog, `agents/*.md`, `tiers.yaml`, policies, per-factory settings; the front door edits the same files; secrets only by reference. | Must |
| CFG-2 | **Layering**: team floor → workshop → factory, each stricter only. | Must (workshop/factory) / Should (team) |
| CFG-3 | **`kiln check config`**: all-or-nothing validation before apply — bindings, judge rules, capabilities, pins, allowlists, floors, no secrets; never vacuous. | Must |
| CFG-4 | **Applies from the next step**; host changes affect new leases only. | Must |
| CFG-5 | **Hosts**: join with Operator approval, `kiln host measure`, capacity, pins, sleep, `serves`, revoke. | Should |
| CFG-6 | **Providers and models**: provider entries via `pi-ai`; catalog with pinned versions and families; **`kiln check model`** measures capabilities and re-checks on version change. | Must (local) / Should (remote) |
| CFG-7 | **Agents**: role files with kind, line of defense, tools, replay, gate, version; version recorded per step; **try on a past feature** as an ungated replay; judge and team-shared role changes need an Operator and, if shared, the team quorum. | Must (roles, versions) / Should (try-runs) |
| CFG-8 | **History**: every change recorded with who, before and after; config events in the workshop record. | Must |

### 6.17 An extensible flow

*Concepts: [an extensible flow](../concepts/extensible-flow.md) · [configuration](../concepts/configuration.md)*

| ID | Requirement | |
|---|---|---|
| FLOW-1 | **Gates as data**: the director executes a feature's flow from definitions, not a constant rail; the default flow ships as data. | Must |
| FLOW-2 | **Anchors and invariants**: Roadmap gate first, Merge gate last, all built-in gates present in order; added gates only between built-in ones; skipping only as triage does today; nothing after Merge. | Must |
| FLOW-3 | **Move kinds**: a closed set (approve · revise · reject · restart · split+revise · mitigate) with team labels and rules (required note, `returns_to`, rounds); events record kind and label. | Must |
| FLOW-4 | **Gate definitions** (`gates/<id>.md`): question, phase and placement, artifact, author, judges, moves, delegable, hold lane, `applies_when`, deciders, brief emphasis, version. | Should |
| FLOW-5 | **Flows** (`flows/<name>.yaml`): extend the standard flow and add gates; factory default; team-required gates by path or label. | Should |
| FLOW-6 | **Per-feature flow**: proposed with reasons and decided at the Roadmap gate; pinned with gate versions at admission; gates may be added in flight by decision, never removed. | Should |
| FLOW-7 | **`kiln check flow`**: all-or-nothing validation of anchors, placement, roles and judges, move kinds, `returns_to`, restart and mitigate prerequisites, arming points, required gates, cycles. | Must (default flow) / Should (added gates) |
| FLOW-8 | **Try a gate on a past feature**: ungated replay showing the brief a decider would have seen. | Should |
| FLOW-9 | Changes by an **Operator**; team-shared gates and flows by the **team quorum**. | Should |

### 6.18 First run

*Concepts: [first run](../concepts/first-run.md) · [configuration](../concepts/configuration.md) · [knowledge](../concepts/factory-wiki.md)*

| ID | Requirement | |
|---|---|---|
| SETUP-1 | **`kiln init`**: guided setup in the browser (loopback, one-time secret) or the terminal (`--no-browser`), writing the same files; resumable after interruption; any step rerunnable (`--step`). | Must |
| SETUP-2 | **`kiln doctor`**: hardware, Node, git, Ollama, network and disk checks with fixes named; a measured recommendation (factories, model sizes, memory budget, concurrency); never installs system software. | Must |
| SETUP-3 | **Models at setup**: recommendations from hardware, installed models first, background downloads, `kiln check model` on each, `tiers.yaml` written; setup does not finish without a judge bound to the strongest checked model; remote providers off by default. | Must |
| SETUP-4 | **Workshop and storage**: name, owner, roles, a personal signing key; one KILN home shown before creation; disk budget, backups (off by default), retention defaults. | Must |
| SETUP-5 | **First factory** from a local clone, a remote or an empty repository; worktree mode by default; `local-only` and the standard flow by default; the repository read locally and never changed. | Must |
| SETUP-6 | **Knowledge bootstrap**: proposed sources, starter wiki `AGENTS.md`, ingest on the lane in the background, workshop knowledge seeded with measured models and the machine, an empty notebook. | Should |
| SETUP-7 | **First roadmap**: a goal or open issues → a planner draft citing knowledge → the first Roadmap gate; a read-only **demo factory** from a committed replay. | Must (gate) / Should (demo) |
| SETUP-8 | **Team at setup**: start (team-space repository, quorum, invite) or join (invite, key registration, team floor preview); joining never loosens the workshop. | Could |
| SETUP-9 | Setup recorded: `setup.step_completed` and the step's own events begin the workshop record. | Must |
| SETUP-10 | **Spec Kit**: `kiln doctor` checks `specify` (pinned range, `uv`, Python); setup **adopts** an existing `.specify/` (version, integration, templates against the manifest, existing `specs/`) or **adds** it (`specify init --here --ai pi`, with `--script ps` on Windows) only with approval — as a pull request in team codebases; the Pi integration installed for KILN's roles. | Must |
| SETUP-11 | **The constitution**: adopted as is, edited, or drafted with `speckit.constitution` from the repository's docs and conventions, approved before the first roadmap; briefs cite its principles. | Must |

### 6.19 Existing codebases

*Concepts: [KILN in an existing codebase](../concepts/brownfield.md) · [first run](../concepts/first-run.md) · [knowledge](../concepts/factory-wiki.md) · [the team space](../concepts/team-space.md)*

| ID | Requirement | |
|---|---|---|
| BROWN-1 | **Codebase profile**, read-only: shape, build and test commands, CI, conventions, code owners, existing guidance (including agent instruction files), history, risk areas; correctable by people; corrections win. | Must |
| BROWN-2 | **Baseline**: build and tests at the base commit, run repeatedly to separate failing from flaky; refreshed at each Roadmap gate; Code review and Verification report new failures, pre-existing failures and *not provable* separately. | Must |
| BROWN-3 | **Territory**: paths a factory may change, decided at the Roadmap gate; shared paths named per feature; changes outside flagged at Code review. | Must |
| BROWN-4 | **Preserved behaviour** in the specification and **characterization tasks** first in the work plan where it is untested. | Should |
| BROWN-5 | **Fitting the team's process**: branch and commit conventions, PR template, CI as evidence, code owners and required reviews shown and never bypassed; the Merge gate opens a pull request in stages 1–3. | Must |
| BROWN-6 | **Adoption stages** — Observe, Rehearse, Contribute, Own — recorded; **rehearsal** replays a past change, ungated, compared with what the team merged. | Should |
| BROWN-7 | **Brownfield knowledge**: ingest from code, history and docs with source labels; interview questions for Curators; docs-versus-code disagreements as lint findings. | Should |
| BROWN-8 | **Base drift**: rebase at defined points; drift in touched files shown in the next brief; conflicts decided by a person. | Must |
| BROWN-9 | **A small, reviewed footprint**: Spec Kit and the constitution enter through an *Add Spec Kit* pull request on entering Contribute (scratch worktree only before); opt-in committed `.kiln/` and `kilnignore`. | Should |
| BROWN-10 | Issues imported as bench candidates; review comments on KILN pull requests returned to the factory as notes. | Could |
| BROWN-11 | **Full scan** of the codebase and repository in seven passes — inventory, structure, repository history, build/CI/tests, understanding, reconciliation, synthesis — written into the factory knowledge base (`raw/scan/<commit>/` facts, `pages/codebase/` pages incl. one per module, open questions and a scan report with coverage); estimated before start, durable and resumable, local by default, deep in the territory and mapped elsewhere; pages cited at the scanned commit, labelled measured or inferred; no per-person rankings. | Must |
| BROWN-12 | **Keeping the scan true**: incremental re-scan after each merge to main; full re-scan on request or director suggestion; re-scans never overwrite people's edits — conflicts become contradictions. | Should |

### 6.20 New codebases

*Concepts: [KILN in a new codebase](../concepts/greenfield.md) · [first run](../concepts/first-run.md) · [the bench](../concepts/the-bench.md) · [shaping the roadmap](../concepts/the-director.md)*

| ID | Requirement | |
|---|---|---|
| GREEN-1 | **Start empty**: create the repository, add Spec Kit (files shown before the first commit), local-only and worktree mode by default. | Must |
| GREEN-2 | **Product brief**: problem, users, outcomes, non-goals, constraints, quality attributes, success measures — written or drafted with the planner, approved, a knowledge page *from a person*; feeds the roadmap brief. | Must |
| GREEN-3 | **Constitution written from the brief** with `speckit.constitution`, each principle citing its origin; approved before the first feature; amendments recorded and versioned. | Must |
| GREEN-4 | **Technology decisions**: open choices listed, evidence from research steps and spikes where the bench is available (M13), decided by a person, recorded as decision pages (and constitution amendments where binding); later Design gates measure against them. | Must |
| GREEN-5 | **Walking skeleton first**, on a **foundation flow** (standard + `no_triage_skip`): layout, build, tests, CI, formatter/linter, one end-to-end path, quickstart, conventions page; Verification from a clean clone. | Must |
| GREEN-6 | **Conventions from day one**: written by the skeleton, checked by the code reviewer and CI from feature two; changes are recorded decisions. | Should |
| GREEN-7 | **Slices and risk**: the planner proposes vertical slices, riskiest assumptions first; tests-first work plans by default. | Should |
| GREEN-8 | **Growing into brownfield**: director suggestions, decided at a Roadmap gate, to switch on full scan, preserved behaviour and baseline, territories, code map when their triggers are met. | Should |
| GREEN-9 | **Starting as a team**: brief, constitution and decisions agreed in the team space; skeleton by one workshop; claims after it merges. | Could |

### 6.21 Devices and remote work

*Concepts: [devices and remote work](../concepts/devices-and-remote-work.md) · [web front door §19 security](../concepts/web-front-door.md) · [factories anywhere](../concepts/factories-anywhere.md)*

| ID | Requirement | |
|---|---|---|
| DEV-1 | **Pairing**: from a trusted device by one-time QR and code phrase; each device generates its own key (secure storage where available), vouched for by the person's signing key; class (primary · trusted · companion · read-only), limits and expiry; recorded. | Should |
| DEV-2 | **Remote access** off by default; loopback always; LAN and private overlay networks only when switched on; TLS with the workshop's certificate and mutual authentication by device key; never exposed to the public internet by default; no KILN relay. | Should |
| DEV-3 | **Moves from any device** only with the full brief (layered for small screens); **step-up** for high-stakes moves; the device id and class recorded with every move; the brief as seen on that device recorded. | Should |
| DEV-4 | **Revocation** ends sessions, rejects the key and erases cached data on next contact; session expiry by class. | Should |
| DEV-5 | **Notifications** content-free by default, through channels the person chooses (installed web app push with encrypted payloads, self-hosted service, e-mail, none); rules, quiet and focus hours as files; never a decision. | Should |
| DEV-6 | **Offline**: encrypted per-device cache under the content policy; stale state always visible; only notebook capture and **queued moves** offline, bound to a state version and refused if stale; no high-stakes moves queued. | Could |
| DEV-7 | **Continuity**: reading position, drafts and Needs you follow the person across devices; drafts never sent until the person sends them. | Could |
| DEV-8 | **Per-device content policy** enforced by the workshop; factory policy wins; caches follow policy. | Should |
| DEV-9 | **A sleeping workshop**: shown on every device; wake on request where the network allows; moving the workshop to an always-on host as a recorded handover. | Could |

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| **Runtime** | Node `^22.18.0 || >=23.6.0`, TypeScript run directly where possible. |
| **Platforms** | **macOS, Windows and Linux are all in scope for `kiln-v1`** (decided 2026-10-21) — for the workshop, hosts and the CLI. Every check and test runs on all three in CI; no feature is "done" on one platform only. Platform differences sit behind small adapters: the OS secret store (macOS Keychain, Windows Credential Manager, Linux Secret Service), local IPC (Unix sockets or Windows named pipes), paths and line endings, running as a background service (launchd, Windows service, systemd), and Spec Kit scripts (`sh` on macOS and Linux, `ps` on Windows). |
| **Dependencies** | Runtime dependencies are allowed and **pinned** (Pi Durable, `pi-ai`, `chord`, approved 2026-10-16; **GitHub Spec Kit** — the `specify` CLI, its templates and `speckit.*` commands for the Pi integration — for spec-driven artifacts, 2026-10-20); each new one is a recorded decision; experimental ones sit behind one seam. The web frontend may use build-time-only tooling, shipped prebuilt. |
| **Local-first** | A `local-only` factory on a single machine makes **no outbound connection**; a network check proves it per host from the configured allowlist. |
| **Durability** | Crash at any point: no lost decision, no double-applied move, no half-committed step. |
| **Determinism and replay** | Committed event streams replay through every projection to the same result; replays are regression fixtures. |
| **Performance** | Targets set by measurement, not assumption (swap cost, tokens per second, time to brief); recorded per model and host. |
| **Security** | Loopback by default on every platform; authenticated, encrypted channels beyond it (hosts, paired devices); step-up for high-stakes moves from remote devices; secrets never in the record, store, browser or logs. |
| **Privacy** | No prompt or answer content in events, metrics, traces or exports; restricted content never leaves its host. |
| **Portability** | Wikis are plain git + Obsidian vaults; factory stores move between hosts. |
| **Accessibility** | Everything readable without colour; text localisable. |
| **Testability** | Every principle in §5 has a named, falsifiable check (the existing `*-ready` pattern); checks never pass vacuously. |
| **Licences** | Every dependency's licence is compatible with Apache-2.0 and recorded with the decision that admits it; vendored files keep their notices (`THIRD-PARTY-NOTICES.md`). |
| **Migration** | The first program's factory-logs and committed walks are replayed as event streams and kept as fixtures; no other data is migrated; legacy code is frozen, never extended. |
| **Quality of KILN itself** | KILN is built by its own process: every roadmap row passes all ten gates under the constitution, leaves its spec, plan, tasks, code review and verification reports in `specs/NNN-name/`, and ends with its acceptance check passing. A release requires every `kiln-v1` Must with its check, and the clean-install acceptance test (roadmap r32). |

## 8. Architecture

*Concepts: [design §4 the shape](../concepts/web-front-door.md) · [KILN on Pi Durable](../concepts/pi-durable.md) · [the record](../concepts/the-record.md).*

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
    knowledge/     wikis: ingest / query / lint, vault contract, implementation knowledge, codebase scans
    workshop/      registry, people & roles, policies, placement, Needs you, paired devices & sessions
    host/          host runtime, host channel, moves, sleep
    team/          team-space repository: subscribe/publish, signatures, claims, requests, team rules
    bench/         notebook, capture, promotion, research steps, spikes and spike reports
    server/        HTTP, auth, read models, push, intake
    web/           the front door (prebuilt assets)
    cli/           kiln init · kiln doctor · kiln health · kiln serve · kiln host (join, measure) · kiln check (config, model) · kiln agents try · kiln replay
  agents/          role instructions (*.md)
  checks/          readiness probes and network checks (the *-ready pattern)
  fixtures/        committed event streams and replays
  legacy/          r1–r9 code, frozen until each part is ported; the Pi extension and terminal UI retired
```

**Dependency direction:** `contracts` ← `record` ← `durable` ← `lane`, `workers` ← `director` ← `workshop`, `host` ←
`server` ← `web`/`cli`; `team` sits beside `workshop`. Only `durable` imports Pi Durable; only `workers` imports `pi-ai`; only `lane` talks to Ollama's
management API; only `server` and `host` open network listeners.

## 9. Data and storage

*Concepts: [the record §9 the record and the durable store](../concepts/the-record.md) · [factories anywhere §9 where data lives](../concepts/factories-anywhere.md) · [configuration §3](../concepts/configuration.md).*

| Store | What | Where |
|---|---|---|
| Factory durable store (SQLite, Pi Durable) | tasks, conversations, documents, outbox | on the factory's host |
| Factory event stream | ordered domain events | in the factory store; replicated to the workshop |
| Factory-log | JSONL projection, existing schema | on the host; rebuildable |
| Workspace | the code (git) | on the factory's host |
| Spec-driven artifacts | Spec Kit scaffolding (`.specify/`, `.pi/prompts/`), the constitution, `specs/ROADMAP.md`, one `specs/NNN-name/` per feature with KILN's concept, design and judges' reports | in the repository, versioned with the code |
| Factory wiki | git + Obsidian vault | on the factory's host; reachable as a git remote |
| Workshop store | registry, people, policies, placement, workshop events | with the workshop |
| Workshop wiki | git + Obsidian vault | with the workshop; included read-only in factory vaults |
| Team space | team roadmap, claims, team knowledge, digests, requests, rules, members' public keys | a shared git repository, signed commits |
| Secrets | provider keys, host identities, members' private signing keys | OS / host secret store only |

## 10. What we keep from the existing code

*Concepts: [the record §17 from today's code](../concepts/the-record.md) · [the existing codebase](../../kiln/).*

The rule: **keep code that expresses a rule we still hold; adapt code whose rule holds but whose mechanism changes;
retire code tied to the Pi-extension host or the terminal UI.** Existing tests travel with the code they test.

### 10.1 Keep — port with little change

| Existing | Becomes | Why |
|---|---|---|
| `contracts/move-vocabulary.ts`, `contracts/gate-rail.md` | `packages/contracts` — the **standard flow as data** plus the closed set of move kinds; gate names added; built-in ids unchanged | the default rail and move sets are unchanged; they become the first flow definition (GATE-1/2, FLOW-1/3) |
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
| `pi/` (r8 extension), `pi/ui/` (r9 real UI), `index.ts` extension entry | **frozen in `legacy/` and retired** — the terminal surface is retired (decided 2026-10-20; constitution 2.0.0, Principle IX) |
| `ui/hud.ts`, `ui/popup.ts`, `ui/overlay.ts`, `ui/gate0-face.ts`, `ui/live-tui.ts`, `ui/twin.ts`, `ui/keymap.ts` | **retired** with the terminal surface; pure text renderers may be reused for `kiln check` / CLI summaries |
| `tests/pi`, `tests/live-tui`, `tests/ui`, `tests/overlay*`, `tests/gate0-face` | retire with their code |

## 11. Phasing — candidate roadmap

*Concepts: [design §21 roadmap consequences](../concepts/web-front-door.md) · [the roadmap proposal, r12–r42](../../specs/ROADMAP.md).*

Milestones group requirements; the roadmap cuts them into feature-sized rows, each one walk of the flow (last column).
Every milestone ends usable and checked. A requirement appears in exactly one milestone's key requirements (split
priorities, such as *Must (local) / Should (remote)*, may appear twice).

| # | Milestone | Delivers | Depends on | Key requirements | Roadmap rows |
|---|---|---|---|---|---|
| **M0** | **Foundations reset** | new layout; legacy frozen; contracts, schemas, validators, scheduler, roles and network check ported with their tests green | — | GATE-1/2, WORK-2, LANE-2, EVT-5 (validators) | r12 |
| **M1** | **Durable core, headless** | Pi Durable seam; roadmap/row/unit/gate/lane tasks; the gate contract; a scripted feature walks ten gates from the CLI, survives kill-and-resume; **gates as data** with the default flow | M0 | CORE-1…6, LANE-1, GATE-3/4/5, FLOW-1/2/3, FLOW-7 (default) | r13, r14 |
| **M2** | **Record** | outbox, envelope, catalog, backbone, cursors; factory-log projection byte-identical on rebuild; old walks replayed as event streams | M1 | EVT-1…5 | r15 |
| **M3** | **Real workers** | conversations on local models via `pi-ai`; tier map; tool sets; replay discipline; residency manager; model pool (one host); `kiln.config/` with roles, tier map and `kiln check config` / `kiln check model` | M1, M2 | WORK-1…5, LANE-3, CFG-1, CFG-3, CFG-4, CFG-6 (local), CFG-7 (roles), CFG-8 | r16, r17 |
| **M4** | **Front door, read-only** | server, session security, read models, live push; overview, factory live, record views | M2 | WEB-1/2/4, OBS-1 (basic) | r19 |
| **M5** | **Gates on the web** | full gate brief, moves, delegation, steering, risky-action approvals | M3, M4 | BRIEF-1…4, HITL-1/2, WEB-3/5, DIR-6, GATE-6 (pending `the-flow.md` §11) | r20, r21 |
| **M6** | **Director** | deterministic planning, affinity ordering, fix rounds, director conversation, shaping the roadmap together | M3 | DIR-1…5, DIR-7 | r18, r22 |
| **M7** | **Knowledge** | factory wiki (ingest/query/lint, vault contract), knowledge in briefs; then workshop wiki and implementation knowledge | M5, M6 | KNOW-1…6, BRIEF-5 | r23, r24 |
| **M8** | **Workshop** | several factories, gate inbox, host scheduler, people and roles; Agents screen and role try-runs; **added gates and flows**, per-feature flow choice, gate try-runs | M5 | HOST-1, LANE-4, WORK-6, PPL-1, HITL-4, CFG-2, CFG-7 (try-runs), FLOW-4…9 | r25, r26 |
| **M9** | **Observability** | metrics, traces, health, insights, time travel | M2, M4 | OBS-1…6, EVT-6, GATE-7 | r27 (Musts), r36 |
| **M10** | **Models beyond the machine** | catalog, profiles, routing, egress policy, budgets, fallback, policy stops | M3, M5 | MOD-1…5, HITL-3, CFG-6 (remote) | r33 |
| **M11** | **Factories anywhere** | host runtime and channel, placement, moves, sleeping hosts, network failure | M8 | HOST-2…7, WEB-2 (network), CFG-5 | r37 |
| **M12** | **Team space** | team-space repository, signed acts and keys, team roadmap by quorum, claims and overlap, requests and mirrored reviews, team-aware Merge gate, team knowledge | M7, M8 | TEAM-1…9 | r38, r39 |
| **M13** | **The bench** | notebook and capture, keeper suggestions, promotion; research steps; spikes, spike reports, propose as feature; origin and maturity labels; candidate list and roadmap evidence | M3, M7 | BENCH-1…12 | r34, r35 |
| **M14** | **`kiln-v1` release** | installer, `kiln init` and `kiln doctor` (SETUP-1…11), newcomer docs, demo mode from committed replays | M0–M8 and the *Must* items of M9, M15, M16 | SETUP-1…11, §3.1 goals | r28, r32 |
| **M15** | **Existing codebases** | profile, **full scan into the knowledge base**, baseline, territory, team-process fit and base drift (the Musts, after M7 and first run); then preserved behaviour, adoption stages and rehearsal, brownfield knowledge | M3, M5, M7 | BROWN-1…12 | r30, r31, r40 |
| **M16** | **New codebases** | start empty, product brief, constitution from the brief, technology decisions, walking skeleton on the foundation flow (the Musts, after M8 and first run; research and spike evidence for decisions once M13 lands); then conventions enforcement, slices, growing into brownfield, team start | M3, M5, M7 | GREEN-1…9 | r29, r41 |
| **M17** | **Devices and remote work** (`kiln-v1.x`) | pairing and device keys, remote access over private networks, step-up, revocation, content-free notifications, per-device content policy; then offline and queued moves, continuity, waking a sleeping workshop | M5, M11 | DEV-1…9 | r42 |

**`kiln-v1`** = M0–M8 plus the *Must* items of M9, M15 and M16, released by M14 — roadmap rows **r12–r32**. M10–M13 and
M17 follow as `kiln-v1.x` (r33–r42) without changing anything built before them, because the single-machine, local-only,
single-person workshop is their degenerate case. Whether `kiln-v1` keeps all of r29–r31 is an open decision (§14).

## 12. Success measures

*Concept: [vision §10 how we will know it works](../concepts/vision.md).*

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
| Scope: the concepts describe a lot; `kiln-v1` is 21 rows and 83 Musts | strict Must/Should; `kiln-v1` ends at r32; candidates to defer named in §14 |
| Two products during the transition | `legacy/` frozen; no feature work there |
| Security surface grows with servers and hosts | loopback default; network modes opt-in, behind M11 |
| Teams collide on shared code | claims and overlap detection from the Work plan gate; protected paths; base drift at merge |
| Spec Kit changes its templates or commands | pinned version range; adopt or upgrade as a recorded decision per factory; KILN never forks Spec Kit |
| Local models too weak to judge well | measured by `kiln check model` and insights; profiles allow a stronger private or remote judge by policy |
| Three platforms from the start: Pi, Pi Durable, Ollama and Spec Kit behave differently, and Windows is the least proven for the substrate | verify the substrate on all three in r12–r13 before building on it; a CI matrix from the first row; platform adapters behind one seam each |
| Remote device access widens the attack surface | off by default; private networks only; device keys, step-up, revocation (M17, after `kiln-v1`) |

## 14. Open decisions

Consolidated from the concept docs. **Blocking** items must be decided before the roadmap is admitted; the others before
the milestone or row named.

**Decided**
- ~~Keep a terminal surface (r9) or retire it~~ — **retired** (2026-10-20); surfaces are the web front door and the CLI.
- ~~Constitution amendments~~ — **adopted as 2.0.0** (2026-10-20; §15).
- ~~Platforms~~ — **macOS, Windows and Linux** are all in scope for `kiln-v1` (2026-10-21; §7).

**Blocking — before the Roadmap gate admits the program**
1. **The flow proposals P1–P6** (`the-flow.md` §11): where reject goes, re-crossing, the fix-round cap as a factory
   setting, Documentation and Merge kept separate, the designer's answer round, "leave the lane" not a move kind — shape
   r14 and r20 (GATE-6).
2. **Broken-guarantee response** (`health.md` §4.1): the director's fail-closed checks stop the affected factory at its
   next step boundary (OBS-5) — confirm.
3. **`kiln-v1` scope**: keep r12–r32 as proposed, or move r26 (agents and flows), r29 (new codebases) or r31 (existing
   codebases, part 2) to `kiln-v1.x`.

**Before a milestone or row**

| # | Decision | Before |
|---|---|---|
| 4 | The Pi Durable primitive for completing a waiting task from outside (CORE-6) — upstream first | M1 · r13 |
| 5 | User-facing words: Factory / Feature / Step; *Knowledge* versus *wiki* in docs | M4 · r19 |
| 6 | Whether KILN may recommend a move at a gate; limits on *request more evidence* | M5 · r20 |
| 7 | Whether the planner runs on the strongest model by default | M6 · r18 |
| 8 | Wiki keeper as its own role or the researcher with a schema; when a page counts as stale; how much code pages reproduce | M7 · r23 |
| 9 | Several Deciders on one gate; added gates as delegation arming points; `applies_when` on the diff | M8 · r26 |
| 10 | Spec Kit upgrades: at the next Roadmap gate as a recorded decision, or only on request; other agent integrations beside Pi | M14 · r28 |
| 11 | Full-scan depth outside the territory; how far back history is read; whether review discussions are read | M15 · r30 |
| 12 | Egress policy language and model-family identity | M10 · r33 |
| 13 | Research and spike capacity on shared hosts; keeper suggestions off-switch; spike retention | M13 · r35 |
| 14 | Hosts in several workshops; workspace moves; workshop failover; container forms | M11 · r37 |
| 15 | Quorum rules, claim expiry, publishing levels; whether the team space shares `kiln.config/` | M12 · r38 |
| 16 | A KILN-shipped private network or only the engineer's own; a native mobile app; moves impossible from companion devices | M17 · r42 |

## 15. Constitution amendments

**Adopted as constitution 2.0.0 on 2026-10-20** by decision of human@batorfi (`.specify/memory/constitution.md`; 1.0.0
archived unchanged in `.specify/memory/archive/`). The constitution's amendment history records each change, its level
and the migration note; in summary:

| Principle | Change | Level |
|---|---|---|
| I · author/judge separation | role names; "only the director creates conversations" testable | PATCH |
| II · strongest judges | strongest model *available to the factory*, possibly remote; cross-family where required; never silently downgraded; line of defense = judges of the judged and added gates (the docs synthesizer is no longer one) | MAJOR |
| III · single lane | one lane **per factory**; resident models bounded per host | MAJOR |
| IV · affinity | local models, within and across factories; remote spend by budgets | MINOR |
| V · nothing approves by absence | the durable gate contract: first move wins, stale moves refused, no clock | MINOR |
| VI · the Roadmap gate | renamed from Gate 0; shaped together, admits the version read | PATCH |
| VII · everything recorded | the event stream is the record; the factory-log is a projection | MAJOR |
| VIII · local by default | remote models, hosts, devices and networks only by recorded, policy-checked choice; no KILN cloud | MAJOR |
| IX · surfaces are views | the web front door and the CLI; the terminal surface retired | MAJOR |
| X · XI · XII (new) | knowledge is context, never authority · a factory is portable · workshops are sovereign | MINOR |
| Default flow | plain names, fixed anchors, added gates, closed move kinds, the full brief | MINOR |
| Roles & substrate | Pi Durable, `pi-ai`, Ollama, Spec Kit; dependencies pinned and recorded; configuration as code | MINOR |

## 16. Glossary

*Concept: [UX §4 the mental model](../concepts/user-experience.md).*

| User-facing | Internal | Meaning |
|---|---|---|
| Workshop | workshop | where people work: front door, people, policies, gate inbox |
| Host | host | a machine factories run on |
| Team space | team space | the shared git repository where a team's personal workshops meet |
| Claim | claim | a factory's signed note of which team feature it builds and which code it touches |
| Bench | bench | a person's place for notes, research steps and spikes |
| Notebook | notebook | a private vault where notes mature into knowledge by promotion |
| Spike | spike | an ungated, time-boxed experiment that ends in a measured report |
| Factory | factory (*flow* in the design doc §12) | one roadmap, one lane, one record |
| Feature | row | one roadmap item, walked through nine gates |
| Step | unit | one piece of work by one role |
| Gate | gate task | a stop that waits for a human move |
| Flow | flow | the gates a feature passes: the default ten plus any the team added |
| Move kind | move kind | the fixed meaning behind a move — approve, revise, reject, restart, split+revise, mitigate |
| Move | move | a human decision at a gate |
| Gate brief | brief | the full context presented with a gate |
| Record | event stream | everything that happened, in order |
| Knowledge | factory / workshop wiki | LLM-written, people-curated knowledge |
| Curator | Curator | keeper of a factory's knowledge |
| Needs you | inbox | everything waiting on a person, across factories, workshop and team space |
| Roadmap brief | roadmap inputs | the engineer's goals, constraints and own rows the planner reads first |
| Constitution | constitution | the principles every gate and every Spec Kit command measures work against |
| Feature directory | `specs/NNN-name/` | a feature's Spec Kit artifacts plus KILN's concept, design and judges' reports |
| Territory | territory | the paths a factory may change in an existing codebase |
| Baseline | baseline | what the build and tests do before a factory changes anything |
| Full scan | scan | reading a whole existing codebase and its history into knowledge |
| Product brief | product brief | the intent a new codebase starts from |
| Walking skeleton | skeleton | the first feature of a new codebase: thin, end to end, built, tested, in CI |
| Paired device | device | a notebook, tablet or phone with its own revocable key, a window onto the workshop |
| Step-up | step-up | an on-device confirmation required for high-stakes moves |
