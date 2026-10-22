<p align="center"><img src="./docs/brand/kiln-logo.svg" alt="KILN" width="280"></p>

<p align="center"><b>A software factory you own.</b><br>
Agents research, design, write, review and verify. Independent judges check the work. <b>People decide at every gate.</b><br>
Durable, recorded, local by default — one feature at a time, in your own workshop.</p>

> **Status: design final, restart pending.** KILN is being rebuilt around a new design: a local **web front door** on
> **[Pi](https://pi.dev) and Pi Durable**, with gates as durable tasks, an event-based record, a knowledge base per factory,
> and teams of personal workshops. The concept documents, the PRD and the [constitution](./.specify/memory/constitution.md)
> (v2.0.1) were **finalized on 2026-10-21**, with every decision that shapes `kiln-v1` made and
> [recorded](./docs/concepts/open-decisions.md). The implementation has **not started yet** — its roadmap is a
> [proposal](./specs/ROADMAP.md) waiting for a human decision at the Roadmap gate. What runs today is the **foundation from the first program** (KILN as a Pi extension), which the
> restart reuses. See [Where things stand](#where-things-stand).

<p align="center"><a href="./docs/concepts/infographic/kiln-at-a-glance.png"><img src="./docs/concepts/infographic/kiln-at-a-glance.png" alt="KILN at a glance — the process, the architecture, the human's role, workshop and team, knowledge, the record, and the main journeys" width="820"></a><br>
<sub>KILN at a glance — click for the full-size infographic</sub></p>

## Why KILN

AI can now write most of a feature. What it cannot do is be accountable for it. Teams adopting coding agents meet the
same problems:

- **Trust** — a model that writes code and then judges it is grading its own homework.
- **Control** — agents that run for hours make thousands of small decisions; without points where a person decides, and
  where the work genuinely stops until they do, people only review a finished pile of changes they never shaped.
- **Ownership** — cloud agents send your code and intent to someone else's servers and bill per token.
- **Collaboration** — when everyone drives their own agents, nobody can see who is building what, or how a change was
  made.

KILN's answer is a factory with a **person at every gate**, **independent judges** that never review their own work, a
substrate that is **local by default**, and a **team space** where engineers who each run their own factory see each
other's work, share what they learn and review each other's changes.

## What KILN believes

1. **Humans decide; models work.** No model approves its own work, and no missing person ever counts as a yes.
2. **Independent judges hold the line.** Design, code review and verification are judged by separate agents on the
   strongest available model.
3. **You decide where your models run.** Local by default; private or cloud models only for the roles you choose, under a
   policy that records everything that leaves.
4. **Work is durable.** A crash, a reboot or a closed laptop interrupts work; it never loses it — and never approves
   anything.
5. **Everything is explainable.** Every decision, model swap and gate has a recorded cause and actor.
6. **Calm, sequential work.** One feature at a time per factory, in an order that keeps the right model loaded;
   parallelism happens between factories.
7. **Your workshop is yours; the team works in the open.** Teams coordinate by making work visible — never by deciding for
   each other.

## How it works

### The flow: ten gates, one feature at a time

A factory works on one codebase. The **Roadmap gate** admits the next feature; then the feature walks nine gates in three
phases. At every gate a person reads a complete **gate brief** and makes a move.

| Phase | Gate | The question |
|---|---|---|
| Program | **Roadmap** | Which feature next, in what order — and how does this factory run? |
| Contract | **Concept** | Is this worth building, on these premises? |
| | **Design** *(judged)* | Is this the right structure? |
| | **Specification** | What exactly counts as done? |
| | **Work plan** | In what pieces and order will it be built? |
| Build and prove | **Implementation** | Do we start from a safe point — and is this still one feature? |
| | **Code review** *(judged)* | Is the code right, measured against the specification? |
| | **Verification** *(judged)* | Does it actually work as specified? |
| Release | **Documentation** | Do the docs describe what was actually built? |
| | **Merge** | Do we ship it? |

Every move has a known consequence — *approve*, *revise*, *reject*, *restart*, *split* — and nothing moves forward on its
own: not a clock, not a restart, not a missing screen. Small features may skip Concept and Design; after the Specification
gate a person may delegate the routine gates, and any judge's objection ends the delegation. Teams can add gates of their
own — a threat model, a security review — without removing any. → [`the-flow.md`](./docs/concepts/the-flow.md)

### What you do

- **[Decide at the gates](./docs/concepts/user-experience.md)** — with a ten-part brief: what is being decided, the work, the yardstick, the judges' evidence,
  risks, provenance, history, and what each move would do next.
- **[Shape the roadmap](./docs/concepts/the-director.md)** — your goals and constraints first, then the planner's draft; edit, pin and decide together.
- **[Think at the bench](./docs/concepts/the-bench.md)** — a private notebook, research steps and throwaway spikes while factories work.
- **[Curate the knowledge](./docs/concepts/factory-wiki.md)** — keep each factory's knowledge base true.
- **[Configure](./docs/concepts/configuration.md)** — hosts, models, roles, flows and policies, as plain files.
- **[Work with the team](./docs/concepts/team-space.md)** — a team roadmap, claims on code, reviews across workshops.

Everything waiting on you is in one place, **[Needs you](./docs/concepts/the-director.md)**. Nothing decides itself.

<p align="center"><a href="./docs/concepts/infographic/kiln-engineer-at-the-center.png"><img src="./docs/concepts/infographic/kiln-engineer-at-the-center.png" alt="The engineer at the center — six roles, KILN's actors and the team, one real day, and the full agentic lifecycle" width="820"></a><br>
<sub>The engineer at the center — your roles, your crew and your team, one real day, and one feature's full lifecycle. Click for full size.</sub></p>

### What's inside

| Part | What it does |
|---|---|
| **[Web front door](./docs/concepts/web-front-door.md)** | a local, loopback-only web app with a per-launch secret: the live factory, gate briefs, Needs you, the record |
| **[Director](./docs/concepts/the-director.md)** | deterministic orchestration of each feature's flow, with an LLM **planner** whose drafts are checked and labelled — it never decides |
| **[Durable task graph](./docs/concepts/pi-durable.md)** | built on **Pi Durable**: gates are durable tasks; a move and its gate's completion are one atomic commit |
| **[Workers and judges](./docs/concepts/configuration.md)** | roles defined as files, bound to models; judges always on the strongest model; one generation at a time per factory |
| **[Spec-driven artifacts](./docs/concepts/first-run.md)** | **[GitHub Spec Kit](https://github.com/github/spec-kit)**: the constitution, the specification, plan and tasks of every feature, versioned in the repository |
| **[The record](./docs/concepts/the-record.md)** | every state change as an event with its cause and actor — the source of live views, audits, metrics, traces and health |
| **[Knowledge](./docs/concepts/factory-wiki.md)** | an LLM-written wiki per factory and one per workshop, curated by engineers, readable as an Obsidian vault or in any editor |
| **[Health](./docs/concepts/health.md)** | watches KILN's own machinery and says plainly when something looks wrong — and never acts on its own |

<p align="center"><a href="./docs/architecture/visualisations/kiln-platform-architecture.png"><img src="./docs/architecture/visualisations/kiln-platform-architecture.png" alt="KILN platform architecture — five layers, the team space, cross-cutting concerns and 25 numbered connections" width="820"></a><br>
<sub>The platform architecture — layers, components and connections. Explained in prose in the
<a href="./docs/architecture/explainers/kiln-architecture.md">architecture explainer</a>. Click for full size.</sub></p>

### Where it runs

On your machine by default — a 128 GB workstation can run several factories, one lane each. Factories can also run on
team servers or rented machines, placed by people at the Roadmap gate ([factories anywhere](./docs/concepts/factories-anywhere.md)). Models are local through
[Ollama](https://ollama.com) by default; private or cloud models only where a factory's policy allows
([models beyond the machine](./docs/concepts/web-front-door.md)).

### New and existing codebases

- **New codebase** — intent before code: a product brief, a constitution written from it, technology choices researched,
  spiked and decided by a person, and a **walking skeleton** first. → [`greenfield.md`](./docs/concepts/greenfield.md)
- **Existing codebase** — KILN arrives as a careful newcomer: a **full scan** of the code and its history into the
  knowledge base, a baseline of what is already broken, a territory it may change, and trust earned in stages through the
  team's own review process. → [`brownfield.md`](./docs/concepts/brownfield.md)

## What it looks like

<p align="center"><img src="./docs/concepts/mockups/02-gate-brief-code-review.png" alt="A Code review gate brief" width="820"><br>
<sub>A Code review gate brief — the judge's findings, the yardstick, the options and their consequences.
<a href="./docs/concepts/mockups/README.md">See all 72 mockups</a> (illustrative, not design decisions).</sub></p>

## What KILN is not

- **Not an autopilot** — nothing ships without a person's approval, live or explicitly delegated.
- **Not a hosted service** — no KILN account, no KILN backend; you run it.
- **Not a swarm** — the right agent, on the right model, one step at a time.
- **Not a control plane** — the team space coordinates; it decides no one's gates.
- **Not a replacement for engineering judgment** — it concentrates that judgment where it matters most.

## The design, document by document

All concept documents live in [`docs/concepts/`](./docs/concepts). Start with the vision; each doc below covers one area.

| Area | Document | What it covers |
|---|---|---|
| **Overview** | [What `kiln-v1` delivers](./docs/architecture/explainers/kiln-v1.md) | the release in one place: what ships, what does not, the 23 rows that build it, and when it is done |
| | [After `kiln-v1`](./docs/architecture/explainers/kiln-v1x.md) | what `kiln-v1.x` adds — cloud models, the bench, observability, factories anywhere, deeper brownfield and greenfield — and why it changes nothing built before |
| | [Decisions](./docs/concepts/open-decisions.md) | every design decision settled on 2026-10-21, and what is still open, by roadmap row |
| | [Vision](./docs/concepts/vision.md) | why KILN exists, what it believes, the human's role, the pillars, where it is going |
| | [The web front door](./docs/concepts/web-front-door.md) | the main design: Pi 1.0 and Pi Durable, the factory as a durable task graph, events, many factories, models beyond the machine |
| | [The user experience](./docs/concepts/user-experience.md) | personas, vocabulary, core experiences, the ten-part gate brief, trust and safety |
| **The process** | [The flow](./docs/concepts/the-flow.md) | the ten gates in depth, what runs between them, where every move leads |
| | [An extensible flow](./docs/concepts/extensible-flow.md) | gates teams add to the default flow, with the same guarantees |
| | [The director and Needs you](./docs/concepts/the-director.md) | deterministic orchestration, the planner, shaping the roadmap together, the one inbox |
| **Foundations** | [The constitution, explained](./docs/architecture/explainers/kiln-constitution.md) | the twelve principles, the flow's invariants and governance — what each rule means for the code you write |
| | [KILN on Pi Durable](./docs/concepts/pi-durable.md) | why durable tasks and conversations are the key enabler |
| | [The record](./docs/concepts/the-record.md) | events, the envelope, projections, replay and audit |
| | [Configuration](./docs/concepts/configuration.md) | hosts, providers, models and roles as files, checked and recorded |
| | [Health](./docs/concepts/health.md) | the watcher that observes and never acts; broken-guarantee signals |
| | [Insights](./docs/concepts/insights.md) | honest numbers about the work — evidence for people, never automatic change |
| **Knowledge and thinking** | [The factory wiki](./docs/concepts/factory-wiki.md) | an LLM-written, engineer-curated knowledge base per factory; implementation knowledge |
| | [The bench](./docs/concepts/the-bench.md) | notebook, research steps and spikes, and how they feed the roadmap |
| **Scale and teams** | [Factories anywhere](./docs/concepts/factories-anywhere.md) | hosts, placement, moves, sleeping hosts |
| | [The team space](./docs/concepts/team-space.md) | personal workshops on one codebase: team roadmap, claims, reviews, merging |
| **Models and machines** | [The model landscape](./docs/concepts/model-landscape.md) | open and closed models for KILN's roles, and local deployment scenarios S1–S6 (research snapshot, 2026-10) |
| | [Dev machines](./docs/concepts/dev-machines.md) | Apple silicon and Linux/PC configurations — cheap, medium, high end — with price estimates (research snapshot, 2026-10) |
| **Getting started** | [First run](./docs/concepts/first-run.md) | from install to a first Roadmap gate: models, workshop, Spec Kit, constitution, knowledge |
| | [New codebases](./docs/concepts/greenfield.md) | greenfield: product brief, decisions, walking skeleton, vertical slices |
| | [Existing codebases](./docs/concepts/brownfield.md) | brownfield: full scan into knowledge, baseline, territory, adoption in stages |
| **Visuals** | [Mockups](./docs/concepts/mockups/README.md) · [infographics](./docs/concepts/infographic/README.md) | 72 illustrative screens; KILN at a glance; the engineer at the center |

**From the first program** — kept as history and original rationale: [the original concept](./docs/concepts/concept.md) ·
[the kiln analogy](./docs/concepts/kiln-analogy.md) · [the nine gates — why, how, what](./docs/concepts/gates-why-how-what.md) ·
[process flow](./docs/concepts/process-flow.md) · [the roadmap (Gate 0)](./docs/concepts/roadmap.md) ·
[the terminal UI layers](./docs/concepts/ui-layers-deep.md) · [role skills](./docs/concepts/skills/README.md).

## Where things stand

| | State |
|---|---|
| **The design** | **final** (2026-10-21) as concepts: [vision](./docs/concepts/vision.md), [the flow](./docs/concepts/the-flow.md), [the web front door](./docs/concepts/web-front-door.md), [user experience](./docs/concepts/user-experience.md) and companions in [`docs/concepts/`](./docs/concepts); [decisions settled and still open](./docs/concepts/open-decisions.md) |
| **The product definition** | the [PRD](./docs/prd/kiln-prd.md), **final**: principles, requirements, architecture, what to keep from today's code, milestones |
| **The law** | the [constitution](./.specify/memory/constitution.md) **v2.0.1**, amended for the restart on 2026-10-21 — [explained for engineers](./docs/architecture/explainers/kiln-constitution.md) |
| **The roadmap** | a [proposal](./specs/ROADMAP.md) ([what `kiln-v1` delivers](./docs/architecture/explainers/kiln-v1.md)) of 31 feature-sized rows (r12–r42, with the r42 spike before r13 and the team space in `kiln-v1`), `kiln-v1` at r32 — **pending the Roadmap gate** |
| **The code** | the **foundation from the first program** (rows r1–r8, KILN as a Pi extension): the single-lane runtime, the gate and log machinery, a real local-model worker, KILN loading into Pi, validators and readiness probes, and the test suite — reused by the restart (PRD §10) |

The first program's roadmap and decision log are archived in
[`specs/archive/`](./specs/archive/ROADMAP-2026-09-kiln-on-pi.md).

## Try the foundation

The new KILN is not built yet. You can run and inspect the foundation the restart builds on.

**Requirements**

- **Node.js `^22.18.0 || >=23.6.0`** — TypeScript runs directly through Node's type-stripping, with no build step. If you
  see `ERR_UNKNOWN_FILE_EXTENSION`, your Node is too old. Verified on macOS only.
- **Git.** No runtime dependencies, nothing to `npm install`.
- *Optional:* [Ollama](https://ollama.com) with a model for the live tier (tests default to `gemma4:12b`; set
  `KILN_LIVE_MODEL` to use another).
- *Optional:* [Pi](https://github.com/earendil-works/pi) for the Pi tier — the foundation was measured against Pi `0.85.1`
  on macOS; without Pi, those tests skip with a printed reason.

**Run it** (the npm scripts live in `kiln/`):

```bash
git clone https://github.com/batorfi/kiln.git
cd kiln/kiln

npm test                                             # the suite; live and Pi tiers skip, each printing why
npm run runtime-ready                                # readiness probes — each fails by name when something is missing
npm run validate:roadmap -- ../specs/ROADMAP.md      # the project's own roadmap, judged by its own validator
npm run validate:log -- fixtures/r7-live-inference.jsonl   # the log of a real nine-gate run

ollama pull gemma4:12b && npm run ollama-ready       # with Ollama: a real walk on a local model
npm run pi-ready                                     # with Pi: starts a real Pi and loads KILN both ways
```

Any run that executes **zero** tests fails, so a mistyped path cannot pass silently.

## Repository layout

| Path | What is in it |
|---|---|
| [`docs/concepts/`](./docs/concepts) | the design: vision, the flow, the front door, user experience, and one doc per area — with [mockups](./docs/concepts/mockups/README.md) and the [infographics](./docs/concepts/infographic/README.md) (KILN at a glance, the engineer at the center) |
| [`docs/architecture/`](./docs/architecture) | the [architecture explainer](./docs/architecture/explainers/kiln-architecture.md), the [constitution explainer](./docs/architecture/explainers/kiln-constitution.md), the [`kiln-v1`](./docs/architecture/explainers/kiln-v1.md) and [`kiln-v1.x`](./docs/architecture/explainers/kiln-v1x.md) explainers, and the [platform architecture infographic](./docs/architecture/visualisations/README.md) |
| [`docs/prd/`](./docs/prd/kiln-prd.md) | the product requirements for the restart |
| [`docs/brand/`](./docs/brand/README.md) | the KILN mark and logos |
| [`specs/`](./specs) | [`ROADMAP.md`](./specs/ROADMAP.md) (the program, admitted by a person at the Roadmap gate), one directory per feature with its spec, plan, tasks and evidence, and the archived first program |
| [`kiln/`](./kiln) | the foundation's code: runtime, gate and log machinery, validators and probes, schemas and contracts, tests, and committed fixtures of real runs |
| [`.specify/`](./.specify), [`.pi/`](./.pi) | the Spec Kit scaffolding and Pi prompts the project is built with, and KILN's constitution |

## How the project is built

KILN is built by the process it describes: **spec-driven**, with Spec Kit on Pi, under its
[constitution](./.specify/memory/constitution.md). The program is a roadmap of rows; each row is one feature through the
gates, and **a person admits the program at the Roadmap gate and re-admits it between rows**. Each finished row leaves its
evidence next to its spec — for an example, read the [overview of r7](./specs/006-kiln-live-inference/overview.md), its
[verification report](./specs/006-kiln-live-inference/verification-report.md) and its
[code review report](./specs/006-kiln-live-inference/code-review-report.md), which record what was found wrong as well as
what was right.

## Read next

1. [Vision](./docs/concepts/vision.md) — why KILN exists and where it is going
2. [KILN at a glance](./docs/concepts/infographic/kiln-at-a-glance.png) — the whole concept on one page
3. [The engineer at the center](./docs/concepts/infographic/kiln-engineer-at-the-center.png) — the user experience on one page: roles, a real day, the full lifecycle
4. [The flow](./docs/concepts/the-flow.md) — the ten gates, gate by gate
5. [The user experience](./docs/concepts/user-experience.md) — what working with KILN is like, and the gate brief
6. [Platform architecture](./docs/architecture/visualisations/kiln-platform-architecture.png) and the [architecture explainer](./docs/architecture/explainers/kiln-architecture.md) — how KILN is built, and why
7. [The web front door](./docs/concepts/web-front-door.md) — the design on Pi Durable, events and the record
8. [First run](./docs/concepts/first-run.md) — from install to a first Roadmap gate
9. [The PRD](./docs/prd/kiln-prd.md) and [the roadmap proposal](./specs/ROADMAP.md)

## Contributing

There is no formal contribution process yet. Issues and questions are welcome. Because design decisions here go through
human gates, a proposal is best raised as an issue before any code.

## License

KILN is licensed under the [Apache License 2.0](./LICENSE). Copyright 2026 Zsolt Bátorfi — see [`NOTICE`](./NOTICE).

The Spec Kit scaffolding under `.specify/` and `.pi/` is © GitHub, Inc. under the MIT License; see
[`THIRD-PARTY-NOTICES.md`](./THIRD-PARTY-NOTICES.md).
