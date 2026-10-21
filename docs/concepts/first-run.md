> Status: concept — **final** (2026-10-21, human@batorfi; previously a proposal, 2026-10-19). Open decisions were
> settled on 2026-10-21 and are recorded where they apply; what remains open is listed in
> [`open-decisions.md`](./open-decisions.md). Building it is admitted only at the Roadmap gate.
> Type: concept
>
> Scope note: this doc describes **KILN's first-use experience** — how an engineer goes from nothing to a first factory
> waiting at its first Roadmap gate: installing, checking the machine, setting up models, creating the workshop and its
> storage, adding a first factory **with Spec Kit and its constitution**, initialising knowledge, and starting or joining a
> team. It is a concept, not an installer specification.
>
> **Update (2026-10-20):** KILN depends on **GitHub Spec Kit** for its spec-driven artifacts — the constitution, the
> specification, plan and task templates, the per-feature `specs/` directories and the `speckit.*` commands its roles run.
> Setup now checks for it (§5), adopts or adds it in the repository (§8.1), and settles the constitution (§8.2).
>
> Companion docs:
>   - Configuration:             `configuration.md` (the files setup writes)
>   - Models beyond the machine: `web-front-door.md` §13
>   - Knowledge:                 `factory-wiki.md` · The bench: `the-bench.md`
>   - Teams:                     `team-space.md` · Hosts: `factories-anywhere.md`
>   - The record:                `the-record.md`
>   - The user experience:       `user-experience.md` (and `mockups/61`–`66`)
>   - The PRD:                   `../prd/kiln-prd.md`

# KILN — first run: setting up models, the workshop, knowledge and a team

## 1. In one paragraph

A new engineer should go from **install to a first factory waiting at its Roadmap gate in under an hour**, most of it spent
downloading models, without reading a manual and without anything leaving their machine. `kiln init` checks the machine,
sets up local models and measures them, creates the workshop and its storage, adds a first factory from an existing
repository — adopting **Spec Kit** if the repository already uses it, or adding it with the person's approval — settles the
project's **constitution**, seeds its knowledge from the repository's own documents, and lets the director propose a first
roadmap. Every
step writes plain configuration files, is checked before it applies, can be resumed after an interruption, and can be redone
later. A team can be started — or joined — at the end, or any time after.

## 2. Principles

| | Principle | Meaning |
|---|---|---|
| **F1** | **Local and private from the first minute** | nothing leaves the machine during setup unless the person explicitly adds a remote provider; the network check runs before the first model is used |
| **F2** | **Safe defaults, visible** | every default (local-only, standard flow, single person, storage location) is shown and explained, never hidden |
| **F3** | **Everything is files** | setup writes `kiln.config/` in the workshop and — only with approval — Spec Kit's scaffolding in the repository; nothing that can't be read, reviewed or changed later |
| **F4** | **Checked before it counts** | models, providers and configuration are checked (`kiln check model`, `kiln check config`) before setup moves on |
| **F5** | **Resumable and repeatable** | setup is a sequence of recorded steps; interrupting it loses nothing; any step can be rerun later |
| **F6** | **Learn by doing** | the first real decision is the first Roadmap gate; a demo factory replays a recorded walk for those who want to see the whole flow first |
| **F7** | **Honest about the machine** | what the hardware can and cannot run is measured and said plainly, with options |

## 3. The path

```
install ──► kiln init ──► 1 machine ──► 2 models ──► 3 workshop & storage ──► 4 first factory + Spec Kit ──► 5 knowledge ──► 6 first roadmap
                                                                                                                     │
                                                                                     7 team (optional: start or join)◄┘
```

Setup runs in the browser on the machine (`kiln init` opens `http://127.0.0.1:…` with a one-time session secret) or fully in
the terminal (`kiln init --no-browser`); both write the same files.

## 4. Install

- **One command** installs the KILN CLI and the host runtime; KILN needs Node (`^22.18 || >=23.6`) and git.
- **Spec Kit** — the `specify` CLI (Python ≥ 3.11, installed with `uv`) — is a required dependency, pinned to a supported
  range (today 1.0.x). If it is missing, setup shows the exact install command and runs it only when the person confirms.
- **Ollama is not bundled**: if it is missing, setup says so, links to it, and waits — KILN never installs system software
  silently.
- **Nothing runs in the background** until setup finishes; `kiln serve` starts the workshop afterwards.

## 5. Step 1 — the machine

`kiln doctor` measures, and setup shows, what this machine can do:

| Check | Example |
|---|---|
| **Hardware** | 128 GB unified memory · Apple M5 Max · 1.6 TB free |
| **Ollama** | found, 0.13, listening on 127.0.0.1:11434 |
| **git** | 2.47 · user and signing configured? |
| **Node** | 24.1 — supported |
| **Spec Kit** | `specify` 1.0.6 — in the supported range; `uv` and Python 3.12 found |
| **Network** | loopback reachable; no outbound connections needed for a local-only setup |
| **Recommendation** | *a workshop with 2–3 factories, a 30B work model and a 27B judge pinned* |

Each failed check names what is missing and how to fix it; setup cannot continue until the blocking ones pass.

## 6. Step 2 — models

KILN needs at least one **work model** and one **judge model** — judges must run on the strongest available model.

- **Recommendations from the hardware** — for example a coding model for work and a stronger general model for judges,
  sized to the memory budget, with download size, memory use and what each will be used for.
- **Use what is already installed** — models already in Ollama are offered first.
- **Download** — through Ollama, with progress; setup continues with other steps meanwhile.
- **Measure** — `kiln check model` runs on each: tool calling, streaming, context size, tokens per second. A model that fails
  a capability cannot be bound to a role that needs it.
- **Bind roles** — setup writes `tiers.yaml`: work roles to the work model, judges to the strongest, and shows the binding
  rules it enforces.
- **Remote models: off by default.** A *Add a private or cloud provider* option exists but is collapsed; using it explains
  what would leave the machine and sets the factory profile accordingly (`web-front-door.md` §13).

## 7. Step 3 — the workshop and its storage

### 7.1 The workshop

- **Name** and **owner** — the person setting up.
- **Identity** — a **personal signing key** is generated on the machine (or an existing git signing key is used); every
  decision is recorded under it. Registering it with a team's identity provider comes later, if ever.
- **Roles** — the owner is Operator, Decider and Curator; more people come with a team.

### 7.2 Storage

Everything lives under one **KILN home** (default `~/kiln/`), shown before it is created:

```
~/kiln/
  kiln.config/            ← configuration (a git repository)
  factories/<name>/
    store.sqlite          ← the factory's durable store and record (Pi Durable)
    factory-log.jsonl     ← the factory-log projection
    wiki/                 ← the factory's knowledge (git + Obsidian vault)
  workshop/
    store.sqlite          ← workshop record: people, hosts, registry
    wiki/                 ← workshop knowledge
  notebook/               ← the owner's private notebook (bench)
  archive/                ← archived spikes, closed stores
```

Workspaces — the code — stay where the repositories already are; KILN records their paths, it does not move them. The
spec-driven artifacts — `.specify/`, the constitution and `specs/` — live **in the repository**, versioned with the code
(§8.1); the workshop keeps only the record, the stores and the knowledge.

Setup shows and lets the person choose:

| Setting | Default |
|---|---|
| **KILN home** | `~/kiln/` |
| **Disk budget** | warn at 80% of a chosen size; nothing is deleted automatically |
| **Backups** | off by default; *back up `kiln.config/` and the stores to a folder or a git remote you choose* |
| **Retention** | the record is permanent; telemetry kept 90 days; archived transcripts kept until removed by a person |

## 8. Step 4 — the first factory, Spec Kit and the constitution

- **Point at a repository** — an existing local clone (most common), a remote to clone, or a new empty one.
- **Workspace** — KILN creates its own worktree of this repository and works only there, one branch per feature; it
  never checks out branches or writes files in your clone (decided 2026-10-21, `web-front-door.md` §12.7).
- **Profile** — `local-only` (default), with a one-line explanation of what that guarantees.
- **Flow** — the standard flow; added gates come later (`extensible-flow.md`).
- **Name** — suggested from the repository.

### 8.1 Spec Kit in the repository

KILN's artifacts follow Spec Kit: the constitution in `.specify/memory/constitution.md`, one directory per feature under
`specs/NNN-name/` (spec, plan, research, data model, contracts, quickstart, tasks, checklists), the roadmap in
`specs/ROADMAP.md`, and the `speckit.*` commands — installed for the **Pi integration** in `.pi/prompts/`, because KILN's
workers are Pi sessions. Setup finds one of three cases:

| Found | What setup does |
|---|---|
| **Spec Kit already initialised** (`.specify/` present) | **adopt**: reads the version, integration, feature numbering and the constitution; checks the templates against Spec Kit's manifest and shows any local changes (allowed, never overwritten); lists existing `specs/` features and `ROADMAP.md` as history and knowledge sources; offers to add the Pi integration if another one is installed |
| **Initialised with an unsupported version** | shows the gap and the upgrade Spec Kit would make, file by file; nothing changes without approval; the factory can still be created read-only |
| **No Spec Kit** | **add**: prepares what `specify init --here --ai pi --script sh` would write — `.specify/` and `.pi/prompts/speckit.*.md` — in the factory's worktree, shows every file, and commits it on the factory branch only when the person approves; in an existing team codebase it is proposed as a pull request instead (`brownfield.md` §11) |

How the gates use it:

| Gate | Spec Kit | KILN adds |
|---|---|---|
| **Roadmap** | `specs/ROADMAP.md`; admitting a feature creates its `specs/NNN-name/` directory (Spec Kit's `create-new-feature`, sequential numbering) | readiness, flow and placement per feature |
| **Concept · Design** | — | `concept.md`, `design.md` in the feature directory; the approved design is input to the plan |
| **Specification** | `speckit.specify` → `spec.md`; `speckit.clarify` questions go to the person as step questions; `speckit.checklist` as evidence | preserved behaviour (`brownfield.md` §7), the arming option |
| **Work plan** | `speckit.plan` → `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`; `speckit.tasks` → `tasks.md`; `speckit.analyze` as a consistency check | model order, swaps, claims |
| **Implementation → Verification** | workers carry out `tasks.md` (the `speckit.implement` discipline: tasks in order, ticked as done) | restorable commit, judges, `code-review-report.md`, `verification-report.md` in the feature directory |
| **Every gate** | every command reads the constitution | briefs cite constitution principles in *the yardstick* |

KILN does not fork Spec Kit: it runs its commands and templates as installed, records the Spec Kit version on every
feature, and treats a template change like any configuration change — visible, recorded, applied from the next feature.

### 8.2 The constitution

Every Spec Kit command, and every KILN brief, measures work against the project's **constitution**. Setup settles it before
the first roadmap:

- **Adopt** — an existing constitution is shown with its principles and version; the person confirms it.
- **Draft** — if there is none, the planner drafts one with `speckit.constitution` from the repository's docs and
  conventions, starting from Spec Kit's template, each principle citing where it came from; the person edits and approves
  it. Nothing is committed before that.
- **Later changes** go through a feature or a recorded configuration change — and in a team through review, like any
  change to the repository.

Setup reads the repository **locally** — its languages, size, test command, existing docs — to prepare the next two steps;
it changes nothing in it. For an existing codebase with a team, history and CI, setup continues as described in
`brownfield.md` §12: profile and baseline, territory, process, and the Observe stage. For *Start empty*, it continues as
described in `greenfield.md` §14: product brief, constitution, open technology choices, and a walking skeleton first.

## 9. Step 5 — knowledge

The factory's knowledge base starts from what the repository already knows, following the LLM Wiki pattern
(`factory-wiki.md`):

1. **Sources proposed** — README, `docs/`, ADRs, CHANGELOG, architecture notes, `CONTRIBUTING`, **the constitution and
   existing `specs/` features**: listed with sizes; the person ticks what to ingest. Code is not ingested as a source; it is
   read when needed.
2. **Schema** — a starter `AGENTS.md` for the wiki, with the page types and conventions; editable later.
3. **Bootstrap ingest** — the wiki keeper ingests the chosen sources one by one on the lane, talking through takeaways only
   when the person wants to; the result is a first `index.md`, overview and concept pages, each citing its sources.
4. **Workshop knowledge** — seeded with pages KILN already knows to be true: the measured models and the machine.
5. **Notebook** — created empty, private.
6. **Readable at once** — *Open in Obsidian* and *Open in Zed* work from the first commit.

Bootstrap ingest runs while the person continues; the first roadmap can start before it finishes, citing what is ready.

## 10. Step 6 — the first roadmap

- **Your inputs** — the start of the factory's roadmap brief: the goal in a few sentences, and optionally must-haves,
  constraints, order preferences and features already in mind — or *let the director propose from the repository's open
  issues and TODOs*.
- **Shape it together** — the planner drafts a first roadmap (two to four features) from those inputs and the new knowledge
  base, with readiness per feature and the inputs each row answers; it asks where the inputs are thin; the person edits,
  reorders, writes or pins rows and asks for alternatives, and every version is checked (`the-director.md` §4.3).
- **The first Roadmap gate** opens — the first real decision, presented with a short guide to what a gate brief is.
- **Or the demo** — *See a whole feature first*: downloaded on request, a demo factory replays a committed walk through all ten gates, read-only,
  so the person can see every gate, brief and the record before deciding anything real.

## 11. Step 7 — a team (optional)

At the end of setup, or any time after (`kiln team`):

| Start a team | Join a team |
|---|---|
| create a **team space** git repository (or point at an empty one) | open the **invite** (a team-space URL plus a short code from a teammate) |
| name the **quorum** for the team roadmap (e.g. 2 of 3) | **register the personal key** — signed and, where the team uses one, through its identity provider |
| choose **shared roles and flows** to start with (e.g. publish this workshop's judges as team roles) | review the **team floor** — policy floors, protected paths, required gates, shared roles — and see what it changes in this workshop |
| set the **publishing default** (coordination) | choose the **publishing level** (coordination by default) and which factories join |
| **invite** teammates | the team roadmap appears beside each factory's Roadmap gate |

Joining never loosens anything in the workshop: the team floor can only make it stricter, and the person sees every change
before accepting.

## 12. After setup

- `kiln doctor` re-runs the machine and configuration checks any time.
- **Settings** in the front door — models, hosts, agents, flows — edit the same files.
- **Add a factory** reuses steps 4–6.
- **Add a host** (`kiln host join`) when the team grows beyond one machine.

## 13. What setup records

Setup writes `kiln.config/` and the first workshop and factory stores — and, with approval, Spec Kit's scaffolding and the
constitution in the repository — and records each step as an event: `setup.step_completed` (step, choices),
`model.checked`, `config.changed`, `factory.created`, `speckit.adopted` or `speckit.initialized` (version, integration,
template changes), `constitution.approved`, `wiki.ingest_completed`, `team.member_joined` — so the record begins with how
the workshop was created.

## 14. How it fits KILN's rules

| KILN rule | At first run |
|---|---|
| **Local by default** | nothing leaves the machine unless a remote provider is explicitly added; checked before the first model call |
| **Judges on the strongest model** | setup will not finish without a judge binding that passes the rule |
| **Everything recorded** | setup itself is the first part of the record |
| **Configuration is code** | setup writes plain files; nothing it does is hidden |
| **Readable without KILN** | knowledge is an Obsidian vault from its first commit |
| **Humans decide** | the first real act is a decision at the Roadmap gate; Spec Kit and the constitution enter the repository only with approval |
| **Spec-driven** | every feature is a Spec Kit feature directory, measured against the constitution |

## 15. Open questions

1. ~~Ship the demo factory or download it?~~ **Decided 2026-10-21** (human@batorfi): **downloaded on request** — a recorded, one-off download the
   person asks for, which keeps the install small; the demo then runs offline from its committed replay.
2. ~~Minimum hardware?~~ **Decided 2026-10-21** (human@batorfi): **32 GB** of (unified) memory runs one local-only factory with a ~12B judge;
   **64 GB or more** is recommended; 128 GB runs several factories. Below 32 GB setup says plainly that local-only will be
   slow or limited and suggests a smaller judge — or, once models beyond the machine arrive, a hybrid profile. `kiln doctor`
   measures and records it.
3. Should setup offer to import an existing Obsidian vault as the notebook?
4. How should setup migrate a workshop created by an earlier KILN version?
5. ~~Spec Kit upgrades?~~ **Decided 2026-10-21** (human@batorfi): a new pinned version is **offered at a factory's next Roadmap gate** with what
   changes in its templates; adopting it is a recorded decision, never automatic.
6. ~~Other Spec Kit integrations?~~ **Decided 2026-10-21** (human@batorfi): **coexist, don't manage** — KILN manages only the Pi integration and
   never breaks other agents' command files; the constitution and specifications are the common ground.

## 16. One sentence

KILN's first run takes an engineer from install to a first factory at its first Roadmap gate in under an hour — measuring
the machine, setting up and checking local models, creating the workshop and its storage, adopting or adding Spec Kit and
settling the constitution, seeding knowledge from the repository's own documents, and offering a team — all in plain files,
all on the machine, every step checked and recorded.
