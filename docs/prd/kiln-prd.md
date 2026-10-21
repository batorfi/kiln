> Status: product requirements — **final** (2026-10-21, human@batorfi; previously a proposal, rev 4, 2026-10-18). Open decisions were
> settled on 2026-10-21 and are recorded where they apply; what remains open is listed in
> [`open-decisions.md`](../concepts/open-decisions.md). Building it is admitted only at the Roadmap gate.
> Type: PRD (high level)
>
> Scope note: this document defines **the new KILN codebase** — what it must do, how it is organised, and which of the
> existing code it keeps — as the basis for a new roadmap. It consolidates the vision and the recent concepts into
> requirements; it does not repeat their reasoning. Where this PRD and a concept doc disagree on *intent*, the concept
> doc governs; where they disagree on *scope*, this PRD governs. Adopting it needs the Roadmap-gate decision and the
> constitution amendments listed in §15.
>
> Sources (concept docs govern intent):
>   - [Vision](../concepts/vision.md) (rev 6) — why and where to
>   - [The web front door — the design](../concepts/web-front-door.md) (rev 14) — the overall design; the map of all concepts
>   - [User experience](../concepts/user-experience.md) (rev 10) and [the mockups](../concepts/mockups/README.md) (51 illustrations)
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
>   - [Health](../concepts/health.md) — the watcher, signals, broken guarantees, observe-never-act
>   - [The original concept](../concepts/concept.md) and [the gates — why, how, what](../concepts/gates-why-how-what.md)
>   - the existing codebase under [`kiln/`](../../kiln/) (r1–r9, ~5,900 lines of source, 98 test files)

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
6. **Grows without redesign** — one factory → several → several hosts → a team of personal workshops sharing a team
   space, with the same concepts.

### 3.2 Non-goals

- A hosted KILN service, accounts or a KILN backend.
- Running several steps of one feature in parallel.
- Replacing engineering judgment, or optimising approval speed.
- Building its own agent harness, model server or knowledge viewer — KILN uses Pi Durable, Ollama/`pi-ai` providers,
  and Obsidian-compatible vaults.

## 4. Users

*Concept: [UX §2 who uses KILN](../concepts/user-experience.md).*

| Persona | Primary needs | Key requirements |
|---|---|---|
| **Decider** (primary) — an engineer in a **small team**, each running their own workshop | understand the work, decide well, never be bypassed; see what teammates build | gate briefs (§6.8), moves, delegation, stepping in |
| **Operator** | set up hosts, models, policies, budgets | §6.10, §6.12, §6.13 |
| **Curator** | keep a factory's knowledge current and traceable | §6.11 |
| **Engineer at the bench** | research, prototype and understand the code while factories run, and keep what they learn | §6.15 |
| **Observer** | see where things stand | read access to everything live |
| **Auditor** | reconstruct what happened, and on what evidence | the record, briefs *as seen*, time travel |
| **Evaluator** | judge models and policies by outcomes | insights, model and locality comparisons |

## 5. Product principles (requirements on every module)

*Concepts: [vision §3 what we believe](../concepts/vision.md) · [constitution](../../.specify/memory/constitution.md).*

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
| **P12** | **Workshops are sovereign** — no act from a team space or another workshop settles a gate; every act between workshops is signed by a person. | team space (§6.14) |
| **P13** | **Ungated means ungated** — bench output never settles a gate; spike code never reaches `main`; only promoted knowledge is cited in a brief; capture is always explicit. | bench (§6.15) |
| **P14** | **Every gate keeps the gate contract** — whoever defines a gate, it is a durable task, settled only by a committed move from the closed set of move kinds, with a full brief and an independent judge where it judges work; the Roadmap gate is first, the Merge gate last, and no built-in gate can be removed. | flow (§6.17) |

## 6. Capabilities

Requirements are numbered per area (`GATE-1`, …) for traceability into the roadmap. *Must* items define `kiln-v1`;
*Should* items may follow it.

### 6.1 Gate rail and moves

*Concepts: [the flow](../concepts/the-flow.md) · [gates — why, how, what](../concepts/gates-why-how-what.md) · [design §3.1 the default flow](../concepts/web-front-door.md) · [an extensible flow](../concepts/extensible-flow.md) · [UX §8 the gate brief](../concepts/user-experience.md)*

| ID | Requirement | |
|---|---|---|
| GATE-1 | The **default flow**: ten gates with plain names and one question each: **Roadmap gate**, Concept, Design, Specification, Work plan, **Implementation**, Code review, Verification, Documentation, **Merge**. Internal ids stay stable (`gate0`, `1-concept` … `9-pr`). | Must |
| GATE-2 | Each gate offers only its own moves (the existing move vocabulary), including the special cases: Implementation `approve · split+revise`; Code review `approve · revise · restart` (revise goes to the workers); Verification `approve · reject` with **2** automatic fix rounds; Merge `approve · reject`. | Must |
| GATE-3 | Triage may skip Concept and Design for small features, recorded with its reasoning. | Must |
| GATE-4 | The **unattended tail** may be armed only at the Specification gate, for Work plan → Documentation; merge excluded unless explicitly delegated; any judge's objection ends it. Auto-crossed gates are recorded as delegated, never as human. | Must |
| GATE-5 | Corrective moves carry a note that becomes the next step's instruction. | Must |
| GATE-6 | **Where moves lead** (`the-flow.md` §7, §11–12, accepted 2026-10-21): reject targets a fresh author at the same gate or an earlier gate named in the note — the roadmap at Concept and Merge — and a person may make a reject to an earlier gate at any time; Code review offers `approve · revise · restart`, `revise` going to the workers; every gate after a reject's target is **re-crossed**, its brief showing what changed, with no lighter confirmation; triage never skips Documentation; fix-round cap a factory setting (0–3, default 2). | Must |
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
| CORE-6 | The "complete a waiting task from outside" primitive is settled with Pi Durable **in a time-boxed go/no-go spike before the durable core** (roadmap r42): natively if the library allows it; otherwise an upstream proposal and, until it lands, a KILN decision table committed in the same SQLite transaction as the task store, behind the seam. A no-go re-opens the Roadmap gate. The gate contract does not depend on its exact API. | Must (early) |
| CORE-7 | **One store per factory.** A closed feature's conversations and checkpoints are exported to a checksummed **feature archive** beside the store (never in git), recorded by `feature.archived` with its hash, and compacted out of the live store; archives move with the factory; kept forever unless an Operator sets an age-out (`transcript.aged_out`). The record is never archived, aged out or (in `kiln-v1`) segmented; r15 measures its size and rebuild time. | Must |

### 6.3 Workers and roles

*Concepts: [design §7 workers as durable conversations](../concepts/web-front-door.md) · [configuration §6 agents](../concepts/configuration.md)*

| ID | Requirement | |
|---|---|---|
| WORK-1 | Each step is a **fresh** durable **conversation** with its role's instructions (`agents/*.md`), its tier's model, only its permitted tools and explicit inputs referenced in the record; steps never share a conversation — the only continuation is `revise`; a shared preamble may come from forking a prepared base. | Must |
| WORK-2 | **Tier map**: roles bound to models in one place; judges (architecture critic, code reviewer, verifier, docs synthesizer) bind only to the strongest model; a weaker binding fails closed. | Must |
| WORK-3 | Only the director creates conversations; workers have no subagent tool. | Must |
| WORK-4 | **Replay discipline**: read-only tools are replay-safe; writes and commands are not — the model is told of an interruption. | Must |
| WORK-5 | Deterministic `requestId` per step (feature, gate, step, attempt). | Must |
| WORK-6 | **Workspace per factory**: one KILN-managed worktree per factory, never a person's working copy; one branch per feature (`kiln/<factory>/<row>`) cut at admission; the row task removes its branch after merge or tags an abandoned one (`kiln/abandoned/<row>`); the factory removes its worktree only when retired; Health flags orphans. Overlap between factories detected and surfaced. | Must / Should |

### 6.4 Director and commands

*Concepts: [the director and Needs you](../concepts/the-director.md) · [design §9 working with the orchestrator](../concepts/web-front-door.md)*

| ID | Requirement | |
|---|---|---|
| DIR-1 | The director is **deterministic code** (the roadmap and row tasks); LLM-assisted proposals run as ordinary steps. | Must |
| DIR-2 | It proposes roadmaps (citing knowledge), plans units, orders them by affinity, applies moves, runs fix rounds, drafts record digests. It never decides a gate. | Must |
| DIR-3 | Commands — start a row, arm delegation, pause after step, abort step, accept/reject a proposal, move a factory — are idempotent commits. | Must |
| DIR-4 | A conversational interface to the director answers from the record with citations; talking never moves a gate. | Should |
| DIR-5 | The **planner** is an LLM role run as a step; its drafts (roadmap proposals, work plans, splits, synthesis answers) are labelled, checked by deterministic rules before display, and decided by people. The planner runs on the **strongest** model by default (an Operator may bind it lower, recorded), and it never changes a row the engineer wrote — it may only propose a change. | Must |
| DIR-6 | **Needs you**: one inbox per person across factories, workshop and team space, in three sections — waiting on you, suggestions, worth knowing — each item with its headline and what it blocks; ordered by stakes, blocking others, then waiting time; never decides or expires anything. Each person may choose the order (oldest first by default, teammates first, by factory); ordering never hides an item. | Must |
| DIR-7 | **Shaping the roadmap together**: a per-factory **roadmap brief** of the engineer's inputs (goals, must-haves, constraints, order preferences, appetite, own rows, pointers) read first by the planner; a recorded shaping conversation (planner questions, why/what-if, alternatives side by side); direct edits with **pins** the planner must respect and never silently change; versioned drafts with diffs; deterministic checks on every version; row origin shown in the Roadmap gate brief; approve bound to the version read; shaping possible at any time, never altering work in progress. Alternatives are drafted one at a time, each with its estimated machine time shown before it runs. | Must |

### 6.5 Event backbone and record

*Concepts: [the record](../concepts/the-record.md) · [design §6 events and observability](../concepts/web-front-door.md)*

| ID | Requirement | |
|---|---|---|
| EVT-1 | **Transactional outbox**: every state change commits its domain events in the same commit; one writer per factory gives one total order. | Must |
| EVT-2 | **Envelope**: id, seq, type, schema version, time, subject, actor, correlation, causation, trace, privacy, data — never prompt or answer content. | Must |
| EVT-3 | **Catalog** with versioned JSON schemas (program/roadmap, row, gate, unit, lane, delegation, mitigation, tool approval, command, model, egress, wiki, host, system); an invalid event fails its commit. | Must |
| EVT-3a | **Schema evolution by upcasting on read**: stored events are never rewritten; each breaking version ships a pure, lossless upcaster from the previous one; consumers handle only the current version; additive optional fields need no new version; upcasters are proven by replaying the committed walks with byte-identical projections. | Must |
| EVT-4 | In-process backbone with **durable consumer cursors**, at-least-once and idempotent; a slow consumer never blocks a factory. | Must |
| EVT-5 | **Factory-log projection** in the existing schema; the existing validators run on it; a rebuild must be byte-identical to the live projection. | Must |
| EVT-6 | **Time travel**: any projection rebuildable as of any `seq`. | Should |

### 6.6 Lane, model pool and scheduling

*Concepts: [design §5.4 the single lane, §12 many kilns on one machine](../concepts/web-front-door.md) · [factories anywhere](../concepts/factories-anywhere.md)*

| ID | Requirement | |
|---|---|---|
| LANE-1 | **Lane task** per factory: at most one running generation; holds resident model, hold flag (Design, Code review, Verification), swap count; survives restarts. | Must |
| LANE-2 | **Affinity scheduler** reused from the existing code: swap only on a genuine tier change; swaps are priced and recorded. | Must |
| LANE-3 | **Model pool per host**: resident set within a memory budget; shared **leases**; KILN — not Ollama — owns residency (explicit load, pin, unload); the strongest local model may be pinned for judges. **Every** model request, including harness-internal ones (compaction), goes through a KILN provider in front of Ollama, holds the lane lease and targets the resident model; another model is refused or becomes a recorded swap; housekeeping runs on the resident model. | Must (one host) |
| LANE-4 | Host scheduler: affinity across factories, admission control (queue, never fail), concurrency cap, fair share, no mid-generation preemption. | Should |

### 6.7 Web front door

*Concepts: [user experience](../concepts/user-experience.md) · [mockups](../concepts/mockups/README.md) · [design §4 the shape, §19 security](../concepts/web-front-door.md)*

| ID | Requirement | |
|---|---|---|
| WEB-1 | A local server (Node, no runtime framework required) serving read models and a live event push; moves and commands as requests. | Must |
| WEB-2 | **Session security**: loopback bind, per-launch secret, Host/Origin checks, CSRF protection; `decided_by` from the session. Network-shared workshop: TLS and the team's identity provider. | Must / Should |
| WEB-3 | Surfaces (from the mockups): workshop overview and *Needs you*; factory live view; **gate brief**; coming back; record and feature record; knowledge; insights; models & policy; hosts; health; people. | Must (core) / Should (rest) |
| WEB-4 | A reconnecting browser resumes from its last `seq`; no polling. | Must |
| WEB-5 | Notifications are information only — never decisions. Waiting gates never escalate or time out; each person chooses which gate kinds may interrupt them. | Must |
| WEB-6 | **The CLI is the terminal surface**: `kiln status`, `kiln needs` and `kiln gate` show the same projections as the browser, the gate brief as plain text, and make moves through the same move intake under the same rules — a move only where the full brief has been shown, bound to the state version it was made against. | Must |

### 6.8 The gate brief

*Concepts: [UX §8 the gate brief](../concepts/user-experience.md) · mockups [02](../concepts/mockups/02-gate-brief-code-review.png), [03](../concepts/mockups/03-roadmap-gate.png), [07](../concepts/mockups/07-specification-gate-delegation.png)–[10](../concepts/mockups/10-merge-gate.png)*

| ID | Requirement | |
|---|---|---|
| BRIEF-1 | Every gate is presented with a **ten-part brief**: orientation, the decision, the work, the yardstick, the evidence, risks and open issues, provenance, history, options with consequences (and the moves not available, and why), other actions. | Must |
| BRIEF-2 | A **headline** travels wherever a gate appears; a move is possible only where the full brief is available. | Must |
| BRIEF-3 | Honest about gaps; complete before presentation; **recorded as seen** with the move. | Must |
| BRIEF-4 | Per-gate emphasis (Roadmap gate: proposal, knowledge context, profile, policy, budget, **host**; Merge gate: end-to-end story and what the feature added to knowledge). | Must |
| BRIEF-5 | *Context from the knowledge base* with citations, flagging stale, drifted or recently changed pages. | Should |
| BRIEF-6 | **No recommended move**: the brief never recommends or pre-selects a move; KILN's opinion only when asked, as a labelled planner step shown apart from the evidence. **Request more evidence** is additive — no verdict is ever replaced or hidden — costed before it runs, bounded by budget and policy (no count cap), and limited to models the policy allows; needing egress is a policy stop. | Must |

### 6.9 Human in the loop beyond gates

*Concepts: [design §8 human in the loop beyond gates](../concepts/web-front-door.md) · [UX §7.5 stepping in](../concepts/user-experience.md) · [the director §5 Needs you](../concepts/the-director.md)*

| ID | Requirement | |
|---|---|---|
| HITL-1 | **Steering** of work steps (never judges), recorded under the person's name. | Must |
| HITL-2 | **Risky-action approvals**: tool calls held by policy until a person allows or refuses; answers remembered across restarts; never a gate move. | Must |
| HITL-3 | **Policy stops** — blocked egress, budget reached, judge unavailable — arrive as decisions, never as workarounds. | Should |
| HITL-4 | **Hand-over** of a waiting decision to another permitted Decider — a person in the same workshop (PPL-1 team) or a teammate the workshop explicitly names (TEAM-5); hidden in a one-person workshop with no team space. | Should |

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
| KNOW-2 | **Ingest** (discussed, then written directly, one commit, revertible), **query** (cited; answers filed back), **lint** (strongest model, other family; findings, never edits). Ingest, query and digests run as a **dedicated keeper role**; lint on a different model than the keeper. | Must |
| KNOW-3 | **Vault contract**: every wiki is a valid Obsidian vault — wikilinks, unique names, YAML properties, no plugin dependencies, readable in Zed; checked by lint. | Must |
| KNOW-4 | **Edit rights**: Curators edit factory wikis; anyone edits the workshop wiki; every change attributed, recorded, linted. | Must |
| KNOW-5 | **Implementation knowledge**: automatic implementation digests per gate; feature story, overview, explainers, how-tos, reference, learnings — grounded in code at a commit; drift and claim checks; explore by code. Code appears as short excerpts with path, lines and commit; **reference pages are generated from code** on merge; briefs flag a cited page unreviewed for 90 days (configurable) or drifted, contradicted or changed during the gate. | Should |
| KNOW-6 | Workshop wiki included read-only in each factory vault (`workshop/`), **pinned per feature** as of its admission; briefs note newer versions of cited pages. | Should |

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
| OBS-5 | **Broken-guarantee signals** (gate settled without a move, judge off the strongest model, disallowed egress reached, non-identical projection rebuild, two store owners, a model loaded outside KILN's residency): always critical, never snoozed or configurable, kept as domain events; the director's fail-closed checks stop the affected factory, attributed separately. | Must |
| OBS-6 | **Watching the watcher and diagnostics**: heartbeats, *unknown since* instead of healthy, recovery reports; `kiln health`; a local, content-free diagnostic bundle on request, in a versioned, documented format shown before export; acknowledged warnings re-surface once a day while they persist; baselines per host. **Pause-only director rules** on health conditions, written by an Operator and recorded — never settling, skipping or re-opening a gate, changing a model or resuming anything. | Should |
| OBS-4 | **Insights**: evidence for people, never automatic change — measure families and definitions per `insights.md`; counts and sample sizes always shown; traceable to events; personal figures private to the person, no rankings of people; shown in context (briefs, Roadmap gate, candidates, configuration); **few-cases rule** (< 5 list cases · 5–19 rate with count · 20+ trends); **targets** only on system behaviour, never on human decision time, people or volume, with no automatic consequences; **team comparison** opt-in, system measures only, ≥ 3 contributing workshops, ranges not rankings. | Should |
| PPL-1 | **People and roles** per factory: Decider, Operator, Curator, Observer, Auditor; identity on every decision. | Must (single user) / Should (team) |

### 6.14 Teams and the team space

*Concepts: [the team space](../concepts/team-space.md)*

| ID | Requirement | |
|---|---|---|
| TEAM-1 | **Team space repository**: a git repository holding the team roadmap, claims, team knowledge, published digests, decision requests and responses, team rules and members; every write a signed commit. | Must (v1) |
| TEAM-2 | **Subscribe and publish**: each workshop pulls and verifies the team space into events of its own record, and publishes by its policy; **coordination** is the floor for team-roadmap features, anything richer per item by the author's choice. | Must (v1) |
| TEAM-3 | **Team roadmap** changed by a **quorum** of named deciders; factories adopt team features at their own Roadmap gate. Default quorum: a majority of named deciders; team rules, the decider list and the threshold change only by the current quorum; an unmet quorum changes nothing. | Must (v1) |
| TEAM-4 | **Claims**: made on adoption, refined at Work plan, released at merge; **renewed by activity**, stale after 3 quiet days, expired after 7 (exclusive: 48 hours), expiry releasing the claim only; **advisory by default**, exclusive on protected paths; **overlap detection** across workshops shown in both gate briefs. | Must (v1) |
| TEAM-5 | **Decisions across workshops**: opinions, required reviews, delegated deciders — signed, recorded on both sides; required reviews **mirrored** with the code host's pull request. | Must (v1) |
| TEAM-6 | **Merge gate in a team**: base drift, required reviews and checks, the code host's merge-queue position; no KILN queue. | Must (v1) |
| TEAM-7 | **Team knowledge** tier in the team space, editable by every member, included as `team/` in member vaults; merged-feature stories by the author's choice. | Must (v1) |
| TEAM-8 | **Identity**: personal signing keys, registered and revoked through the team's identity provider where one exists; shared workshops join as one member. | Must (v1) |
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
| CFG-2 | **Layering**: team floor → workshop → factory, each stricter only; `kiln.config/` always lives per workshop, the team floor in the team space. | Must (workshop/factory) / Should (team) |
| CFG-3 | **`kiln check config`**: all-or-nothing validation before apply — bindings, judge rules, capabilities, pins, allowlists, floors, no secrets; never vacuous. | Must |
| CFG-4 | **Applies from the next step**; host changes affect new leases only. | Must |
| CFG-5 | **Hosts**: join with Operator approval, `kiln host measure`, capacity, pins, sleep, `serves`, revoke. | Should |
| CFG-6 | **Providers and models**: provider entries via `pi-ai`; catalog with pinned versions and families; **`kiln check model`** measures capabilities and re-checks on version change. | Must (local) / Should (remote) |
| CFG-7 | **Agents**: role files with kind, line of defense, tools, replay, gate, version; version recorded per step; **try on a past feature** as an ungated replay; judge and team-shared role changes need an Operator and, if shared, the team quorum. A **judge** instruction change applies only after a try-run on a past feature (enforced from r26); old role versions are kept forever. | Must (roles, versions, judge try-runs) / Should (other try-runs) |
| CFG-8 | **History**: every change recorded with who, before and after; config events in the workshop record. | Must |

### 6.17 An extensible flow

*Concepts: [an extensible flow](../concepts/extensible-flow.md) · [configuration](../concepts/configuration.md)*

| ID | Requirement | |
|---|---|---|
| FLOW-1 | **Gates as data**: the director executes a feature's flow from definitions, not a constant rail; the default flow ships as data. | Must |
| FLOW-2 | **Anchors and invariants**: Roadmap gate first, Merge gate last, all built-in gates present in order; added gates only between built-in ones; skipping only as triage does today; nothing after Merge. | Must |
| FLOW-3 | **Move kinds**: a closed set (approve · revise · reject · restart · split+revise · mitigate) with team labels and rules (required note, `returns_to`, rounds); events record kind and label. | Must |
| FLOW-4 | **Gate definitions** (`gates/<id>.md`): question, phase and placement, artifact, author, judges, moves, delegable, hold lane, `applies_when` (paths, labels, and deterministic diff predicates — never an LLM), deciders, brief emphasis, version; an added gate is never an arming point. | Should |
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
| SETUP-2 | **`kiln doctor`**: hardware, Node, git, Ollama, network and disk checks with fixes named; a measured recommendation (factories, model sizes, memory budget, concurrency) against a **32 GB minimum / 64 GB recommended** for local-only; never installs system software. | Must |
| SETUP-3 | **Models at setup**: recommendations from hardware, installed models first, background downloads, `kiln check model` on each, `tiers.yaml` written; setup does not finish without a judge bound to the strongest checked model; remote providers off by default. | Must |
| SETUP-4 | **Workshop and storage**: name, owner, roles, a personal signing key; one KILN home shown before creation; disk budget, backups (off by default), retention defaults. | Must |
| SETUP-5 | **First factory** from a local clone, a remote or an empty repository; always a KILN-managed worktree; `local-only` and the standard flow by default; the repository read locally and never changed. | Must |
| SETUP-6 | **Knowledge bootstrap**: proposed sources, starter wiki `AGENTS.md`, ingest on the lane in the background, workshop knowledge seeded with measured models and the machine, an empty notebook. | Should |
| SETUP-7 | **First roadmap**: a goal or open issues → a planner draft citing knowledge → the first Roadmap gate; a read-only **demo factory** from a committed replay, downloaded on request (a recorded, one-off download). | Must (gate) / Should (demo) |
| SETUP-8 | **Team at setup**: start (team-space repository, quorum, invite) or join (invite, key registration, team floor preview); joining never loosens the workshop. | Could |
| SETUP-9 | Setup recorded: `setup.step_completed` and the step's own events begin the workshop record. | Must |
| SETUP-10 | **Spec Kit**: `kiln doctor` checks `specify` (pinned range, `uv`, Python); setup **adopts** an existing `.specify/` (version, integration, templates against the manifest, existing `specs/`) or **adds** it (`specify init --here --ai pi`) only with approval — as a pull request in team codebases; the Pi integration installed for KILN's roles; other agents' integrations coexist and are never touched; a new pinned Spec Kit version is offered at the next Roadmap gate, never applied automatically. | Must |
| SETUP-11 | **The constitution**: adopted as is, edited, or drafted with `speckit.constitution` from the repository's docs and conventions, approved before the first roadmap; briefs cite its principles. | Must |

### 6.19 Existing codebases

*Concepts: [KILN in an existing codebase](../concepts/brownfield.md) · [first run](../concepts/first-run.md) · [knowledge](../concepts/factory-wiki.md) · [the team space](../concepts/team-space.md)*

| ID | Requirement | |
|---|---|---|
| BROWN-1 | **Codebase profile**, read-only: shape, build and test commands, CI, conventions, code owners, existing guidance (including agent instruction files), history, risk areas; correctable by people; corrections win. | Must |
| BROWN-2 | **Baseline**: build and tests at the base commit, run repeatedly to separate failing from flaky; refreshed at each Roadmap gate; Code review and Verification report new failures, pre-existing failures and *not provable* separately. Flaky and failing tests are offered as candidate features *from the baseline*, decided by a person. | Must |
| BROWN-3 | **Territory**: paths a factory may change, decided at the Roadmap gate; shared paths named per feature; **writes outside refused at the tool level** (a risky-action request a person may allow once, recorded); changes outside also flagged at Code review. | Must |
| BROWN-4 | **Preserved behaviour** in the specification and **characterization tasks** first in the work plan where it is untested. | Should |
| BROWN-5 | **Fitting the team's process**: branch and commit conventions, PR template, CI as evidence, code owners and required reviews shown and never bypassed; the Merge gate opens a pull request in stages 1–3. A teammate's edit to a KILN pull request is recorded with its author, shown in the Merge gate brief, and re-verified before Merge. | Must |
| BROWN-6 | **Adoption stages** — Observe, Rehearse, Contribute, Own — recorded; **rehearsal** replays a past change, ungated, compared with what the team merged. | Should |
| BROWN-7 | **Brownfield knowledge**: ingest from code, history and docs with source labels; interview questions for Curators; docs-versus-code disagreements as lint findings. | Should |
| BROWN-8 | **Base drift**: rebase at defined points; drift in touched files shown in the next brief; conflicts decided by a person. | Must |
| BROWN-9 | **A small, reviewed footprint**: Spec Kit and the constitution enter through an *Add Spec Kit* pull request on entering Contribute (scratch worktree only before); opt-in committed `.kiln/` and `kilnignore`. | Should |
| BROWN-10 | Issues imported as bench candidates; review comments on KILN pull requests returned to the factory as notes. | Could |
| BROWN-11 | **Full scan** of the codebase and repository in seven passes — inventory, structure, repository history, build/CI/tests, understanding, reconciliation, synthesis — written into the factory knowledge base (`raw/scan/<commit>/` facts, `pages/codebase/` pages incl. one per module, open questions and a scan report with coverage); estimated before start, durable and resumable, local by default, deep in the territory and mapped elsewhere; pages cited at the scanned commit, labelled measured or inferred; no per-person rankings. Deep inside the territory, a map outside (deep-scanned before Design when a feature will touch it); history read in detail for 2 years (configurable), summarised beyond; code-host discussions as titles, labels and links unless opted in. | Must |
| BROWN-12 | **Keeping the scan true**: incremental re-scan after each merge to main; full re-scan on request or director suggestion; re-scans never overwrite people's edits — conflicts become contradictions. | Should |

### 6.20 New codebases

*Concepts: [KILN in a new codebase](../concepts/greenfield.md) · [first run](../concepts/first-run.md) · [the bench](../concepts/the-bench.md) · [shaping the roadmap](../concepts/the-director.md)*

| ID | Requirement | |
|---|---|---|
| GREEN-1 | **Start empty**: create the repository, add Spec Kit (files shown before the first commit), local-only by default; always a KILN-managed worktree. | Must |
| GREEN-2 | **Product brief**: problem, users, outcomes, non-goals, constraints, quality attributes, success measures — written or drafted with the planner, approved, a knowledge page *from a person*; feeds the roadmap brief. | Must |
| GREEN-3 | **Constitution written from the brief** with `speckit.constitution`, each principle citing its origin; approved before the first feature; amendments recorded and versioned. | Must |
| GREEN-4 | **Technology decisions**: open choices listed, evidence from research steps and spikes where the bench is available (M13), decided by a person, recorded as decision pages (and constitution amendments where binding); later Design gates measure against them. No starter templates: choices start open; prior decisions in workshop knowledge are evidence, never defaults; no built-in Decisions gate (decision pages appear in the Design brief). | Must |
| GREEN-5 | **Walking skeleton first**, on a **foundation flow** (standard + `no_triage_skip`): layout, build, tests, CI, formatter/linter, one end-to-end path, quickstart, conventions page; Verification from a clean clone. For a library, build, test, CI, packaging and one public function end to end through the public API is a complete skeleton. | Must |
| GREEN-6 | **Conventions from day one**: written by the skeleton, checked by the code reviewer and CI from feature two; changes are recorded decisions. | Should |
| GREEN-7 | **Slices and risk**: the planner proposes vertical slices, riskiest assumptions first; tests-first work plans by default. | Should |
| GREEN-8 | **Growing into brownfield**: director suggestions, decided at a Roadmap gate, to switch on full scan, preserved behaviour and baseline, territories, code map when their triggers are met. | Should |
| GREEN-9 | **Starting as a team**: brief, constitution and decisions agreed in the team space; skeleton by one workshop; claims after it merges. | Could |

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| **Runtime** | Node `^22.18.0 || >=23.6.0`, TypeScript run directly where possible; macOS first, Linux next. |
| **Dependencies** | Runtime dependencies are allowed and **pinned** (Pi Durable, `pi-ai`, `chord`, approved 2026-10-16; **GitHub Spec Kit** — the `specify` CLI, its templates and `speckit.*` commands for the Pi integration — for spec-driven artifacts, 2026-10-20); each new one is a recorded decision; experimental ones sit behind one seam. The web frontend may use build-time-only tooling, shipped prebuilt. |
| **Local-first** | A `local-only` factory on a single machine makes **no outbound connection**; a network check proves it per host from the configured allowlist. |
| **Durability** | Crash at any point: no lost decision, no double-applied move, no half-committed step. |
| **Determinism and replay** | Committed event streams replay through every projection to the same result; replays are regression fixtures. |
| **Performance** | Targets set by measurement, not assumption (swap cost, tokens per second, time to brief); recorded per model and host. |
| **Security** | Loopback by default; authenticated, encrypted channels beyond it; secrets never in the record, store, browser or logs. |
| **Privacy** | No prompt or answer content in events, metrics, traces or exports; restricted content never leaves its host. |
| **Portability** | Wikis are plain git + Obsidian vaults; factory stores move between hosts. |
| **Accessibility** | Everything readable without colour; full keyboard operation; WCAG 2.2 AA for the front door; a screen-reader-friendly CLI; all text localisable (English first, no strings in code). |
| **Testability** | Every principle in §5 has a named, falsifiable check (the existing `*-ready` pattern); checks never pass vacuously. |

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
    knowledge/     wikis: ingest / query / lint, vault contract, implementation knowledge
    workshop/      registry, people & roles, policies, placement, gate inbox
    host/          host runtime, host channel, moves, sleep
    team/          team-space repository: subscribe/publish, signatures, claims, requests, team rules
    bench/         notebook, capture, promotion, research steps, spikes and spike reports
    server/        HTTP, auth, read models, push, intake
    web/           the front door (prebuilt assets)
    cli/           kiln status · kiln needs · kiln gate (brief, move) · kiln init · kiln doctor · kiln health · kiln serve · kiln host (join, measure) · kiln check (config, model) · kiln agents try · kiln replay
  agents/          role instructions (*.md)
  checks/          readiness probes and network checks (the *-ready pattern)
  fixtures/        committed event streams and replays
  legacy/          r1–r9 code, frozen, until each part is ported or retired
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
| `pi/` (r8 extension), `pi/ui/` (r9 real UI), `index.ts` extension entry | **frozen in `legacy/`, then retired** (decided 2026-10-21, §14.1); the terminal surface is the `kiln` CLI (WEB-6) |
| `ui/hud.ts`, `ui/popup.ts`, `ui/overlay.ts`, `ui/gate0-face.ts`, `ui/live-tui.ts`, `ui/twin.ts`, `ui/keymap.ts` | text renderers may be reused by the CLI (WEB-6) for status, Needs you and gate briefs as text; the Pi-hosted layers retire |
| `tests/pi`, `tests/live-tui`, `tests/ui`, `tests/overlay*`, `tests/gate0-face` | retire with their code |

## 11. Phasing — candidate roadmap

*Concepts: [design §21 roadmap consequences](../concepts/web-front-door.md) · [the roadmap proposal, r12–r42](../../specs/ROADMAP.md) (cut from these milestones into feature-sized rows).*

Each milestone is a candidate roadmap row with its own gates. Every milestone ends usable and checked.

| # | Milestone | Delivers | Depends on | Key requirements |
|---|---|---|---|---|
| **M0** | **Foundations reset** | new layout; legacy frozen; contracts, schemas, validators, scheduler, roles and network check ported with their tests green | — | GATE-1/2, WORK-2, LANE-2, EVT-5 (validators) |
| **M1** | **Durable core, headless** | Pi Durable seam; roadmap/row/unit/gate/lane tasks; the gate contract; a scripted feature walks ten gates from the CLI, survives kill-and-resume; **gates as data** with the default flow | M0 | CORE-1…7, LANE-1, GATE-3/4/5/6, FLOW-1/2/3, FLOW-7 (default) |
| **M2** | **Record** | outbox, envelope, catalog, backbone, cursors; factory-log projection byte-identical on rebuild; old walks replayed as event streams | M1 | EVT-1…5, EVT-3a |
| **M3** | **Real workers** | conversations on local models via `pi-ai`; tier map; tool sets; replay discipline; residency manager; model pool (one host); `kiln.config/` with roles, tier map and `kiln check config` / `kiln check model` | M1, M2 | WORK-1…5, LANE-3, CFG-1, CFG-3, CFG-4, CFG-6 (local), CFG-7 (roles), CFG-8, MOD-1 (local) |
| **M4** | **Front door, read-only** | server, session security, read models, live push; overview, factory live, record views | M2 | WEB-1/2/4, OBS-1 (basic) |
| **M5** | **Gates on the web** | full gate brief, moves, delegation, steering, risky-action approvals | M3, M4 | BRIEF-1…4, BRIEF-6, HITL-1/2, WEB-3/5/6, DIR-6 |
| **M6** | **Director** | deterministic planning, affinity ordering, fix rounds, director conversation, shaping the roadmap together | M3 | DIR-1…5, DIR-7 |
| **M7** | **Knowledge** | factory wiki (ingest/query/lint, vault contract), knowledge in briefs; then workshop wiki and implementation knowledge | M5, M6 | KNOW-1…6, BRIEF-5 |
| **M8** | **Workshop** | several factories, gate inbox, host scheduler, people and roles; Agents screen and role try-runs; **added gates and flows**, per-feature flow choice, gate try-runs | M5 | HOST-1, HOST-2 (in-process), LANE-4, WORK-6, PPL-1, CFG-2, CFG-7 (try-runs), FLOW-4…9 |
| **M9** | **Observability** | metrics, traces, health, insights, time travel | M2, M4 | OBS-1…6, EVT-6, GATE-7 |
| **M10** | **Models beyond the machine** | catalog, profiles, routing, egress policy, budgets, fallback, policy stops | M3, M5 | MOD-1 (remote), MOD-2…5, HITL-3, CFG-6 (remote) |
| **M11** | **Factories anywhere** | host runtime and channel, placement, moves, sleeping hosts, network failure | M8 | HOST-2 (separate), HOST-3…7, WEB-2 (network), CFG-5, TEAM-9 |
| **M12** | **Team space** | team-space repository, signed acts and keys, team roadmap by quorum, claims and overlap, requests and mirrored reviews, hand-over to a named teammate, team-aware Merge gate, team knowledge (shared hosts move to M11) | M7, M8 | TEAM-1…8, HITL-4 |
| **M13** | **The bench** | notebook and capture, keeper suggestions, promotion; research steps; spikes, spike reports, propose as feature; origin and maturity labels; candidate list and roadmap evidence | M3, M7 | BENCH-1…12 |
| **M14** | **`kiln-v1` release** | installer, `kiln init` and `kiln doctor` (SETUP-1…11), newcomer docs, demo mode from committed replays | M0–M8, M12 and the *Must* items of M9, M15, M16 | §3.1 goals |
| **M15** | **Existing codebases** | profile, **full scan into the knowledge base**, baseline, territory, team-process fit and base drift (the Musts, built alongside M5–M8); then preserved behaviour, adoption stages and rehearsal, brownfield knowledge | M3, M5, M7 | BROWN-1…12 |
| **M16** | **New codebases** | start empty, product brief, constitution from the brief, technology decisions, walking skeleton on the foundation flow (the Musts, alongside M5–M8; research and spike evidence for decisions once M13 lands); then conventions enforcement, slices, growing into brownfield, team start | M3, M5, M7 | GREEN-1…9 |

**`kiln-v1`** = M0–M8 and **M12 (the team space, without shared hosts)** plus the *Must* items of M9, M15 and M16 —
M12 joined on 2026-10-21, when a small team became the primary user. M10, M11 and M13 (and TEAM-9, shared hosts) can follow
as `kiln-v1.x` without changing anything built before them, because the single-machine, local-only workshop is their
degenerate case.

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
| External completion of a waiting task is not a published primitive | go/no-go spike before M1 (r42); upstream first, local decision table as the named fallback |
| Local-model capability (tool calling, streaming) varies | per-model readiness probes; measured, recorded |
| Scope: the concepts describe a lot | strict Must/Should; `kiln-v1` ends at M8 |
| Two products during the transition | `legacy/` frozen; no feature work there |
| Security surface grows with servers and hosts | loopback default; network modes opt-in, behind M11 |
| Teams collide on shared code | claims and overlap detection from the Work plan gate; protected paths; base drift at merge |

## 14. Open decisions

Consolidated from the concept docs; each needs an answer before the milestone that depends on it.

1. ~~Keep a terminal surface (r9) or retire it — before M4.~~ **Decided 2026-10-21 (human@batorfi): retired.** The
   Pi-embedded surface (`pi/`, `pi/ui/`) is frozen in `legacy/` and retired; the terminal surface is the `kiln` CLI
   (WEB-6). r9 closes as *superseded*.
2. ~~Wiki keeper: dedicated role or researcher with a schema — before M7.~~ **Decided 2026-10-21:** a dedicated keeper role.
3. ~~How long a knowledge page may go unreviewed before a brief flags it — M7.~~ **Decided:** 90 days (configurable), and
   always on drift, contradiction or change during the gate.
4. ~~How much code implementation pages reproduce versus reference — M7.~~ **Decided:** short cited excerpts; reference
   pages generated from code. Also: the workshop wiki is pinned per feature (KNOW-6).
5. ~~User-facing words: Factory / Feature / Step; *Knowledge* versus *wiki* in docs — before M4.~~ **Decided 2026-10-21:**
   Factory, Feature, Step; *flow* means only the gate sequence; people see *Knowledge*, *wiki* names the format; the kiln
   metaphor stays in the name and docs (`user-experience.md` decisions 15–17).
6. ~~Whether KILN may recommend a move at a gate, and limits on *request more evidence* — M5.~~ **Decided 2026-10-21:**
   no recommendation in the brief, only on request and labelled; more evidence additive, costed and policy-bound (BRIEF-6).
7. ~~Several Deciders collaborating on one gate — M8.~~ **Decided 2026-10-21:** one decision per gate (CORE-3, first
   move wins); agreement among several people is modelled as required reviews that condition *approve*, never as several
   settling moves; no quorum gates in `kiln-v1`.
8. ~~Hosts in several workshops~~ (answered: yes, `team-space.md` §13); how workspaces move; workshop failover; container
   forms — M11.
9. Egress policy language and model-family identity — M10.
10. ~~Exact quorum rules, exclusive-claim expiry, publishing levels beyond coordination — M12.~~ **Decided 2026-10-21:**
   majority quorum by default (rules, deciders and threshold change by the same quorum); claims renewed by activity,
   advisory stale at 3 days and expired at 7, exclusive expired at 48 hours; coordination as a floor, extras per item by
   the author's choice (TEAM-2…4).
11. Research and spike capacity on shared hosts; switching off keeper suggestions; archived spike retention — M13.
12. ~~Added gates as delegation arming points; `applies_when` on the diff~~ — **Decided 2026-10-21:** Specification only;
   deterministic diff predicates allowed. Still open: post-merge gates when they come into scope — M8.

## 15. Constitution amendments required

*Concepts: [design §11 constitution impact](../concepts/web-front-door.md) · [constitution](../../.specify/memory/constitution.md).*

> **Enacted 2026-10-21 as constitution v2.0.0** (approved by human@batorfi), with two additions to the table below:
> Principle II now binds **every judge role** — built-in or added — to the strongest model (the Documentation gate is
> unjudged, so the Docs Synthesizer is no longer a line of defense), and the flow and role sections keep **invariants
> only** (the per-gate moves live in the gate-rail contract, roles in `kiln.config/`). The table is kept as the record of
> what was asked for.

| Principle | Change |
|---|---|
| III Single lane | one lane **per factory**; resident models bounded per host (MAJOR) |
| IV Affinity | the cost lever for local models, per host; remote spend governed by budgets |
| VI Gate 0 | renamed **the Roadmap gate** (PATCH) |
| VII Everything recorded | the ordered event stream is the primary record; the factory-log is a projection (MAJOR) |
| VIII Local-first | local by default; egress, remote models and hosts only by configured, recorded, policy-checked choice; authenticated, encrypted connections beyond loopback (MAJOR) |
| IX No dashboard | a web front door that is never a source of truth; real authentication when shared over a network (MAJOR) |
| *Gate rail* | a **default flow** with fixed anchors (Roadmap gate first, Merge gate last, built-in gates kept), extensible by recorded decision; every gate keeps the gate contract (MINOR) |
| *new* | knowledge is context, never authority (MINOR) · a factory is portable — moving it never changes a decision (MINOR) · workshops are sovereign — no act from a team space or another workshop settles a gate (MINOR) |
| *dependency stance* | runtime dependencies allowed, pinned, recorded |

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
| Factory | factory | one roadmap, one lane, one record |
| Feature | row (roadmap field and ids only) | one roadmap item, walked through nine gates |
| Step | unit (code only) | one piece of work by one role |
| Gate | gate task | a stop that waits for a human move |
| Flow | flow | the gates a feature passes: the default ten plus any the team added |
| Move kind | move kind | the fixed meaning behind a move — approve, revise, reject, restart, split+revise, mitigate |
| Move | move | a human decision at a gate |
| Gate brief | brief | the full context presented with a gate |
| Record | event stream | everything that happened, in order |
| Knowledge · Workshop knowledge | factory wiki · workshop wiki | LLM-written, people-curated knowledge, kept as a wiki |
| Curator | Curator | keeper of a factory's knowledge |
