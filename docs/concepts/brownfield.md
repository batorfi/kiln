> Status: concept — **final** (2026-10-21, human@batorfi; previously a proposal, 2026-10-19). Open decisions were
> settled on 2026-10-21 and are recorded where they apply; what remains open is listed in
> [`open-decisions.md`](./open-decisions.md). Building it is admitted only at the Roadmap gate.
> Type: concept
>
> Scope note: this doc describes **how KILN is brought into an existing codebase** — one with history, a team, a CI
> pipeline, conventions, tests of mixed quality, partly stale docs, and knowledge that lives mostly in the code and in
> people's heads. It covers how KILN learns the codebase, how trust is earned in stages, how a factory is bounded to part
> of the code, how features that change existing behaviour are specified and proven, and how KILN fits the team's existing
> process instead of replacing it. It is a concept, not a spec.
>
> **Update (2026-10-20):** KILN supports a **full scan** of the existing codebase and repository — every file in scope and the
> whole history — whose outcome is written into the factory's knowledge base (§5.3).
>
> Companion docs:
>   - First run:              `first-run.md` (setup; this doc continues from its Step 4 for an existing repository)
>   - Explore first:          `code-exploration.md` (proposal: exploring before adopting — explore space, maps, tours,
>                             as-is specifications, adoption stages 0–2 before Observe-to-Own)
>   - New codebases:          `greenfield.md` (the counterpart; a greenfield factory grows into these practices)
>   - The flow:               `the-flow.md` · An extensible flow: `extensible-flow.md`
>   - Knowledge:              `factory-wiki.md` (§9 implementation knowledge, code grounded at a commit)
>   - The bench:              `the-bench.md` (candidate list) · The director: `the-director.md`
>   - Teams:                  `team-space.md` · Configuration: `configuration.md`
>   - The record, insights:   `the-record.md` · `insights.md`
>   - The PRD:                `../prd/kiln-prd.md`

# KILN in an existing codebase

## 1. In one paragraph

Most software is not new. KILN joins an existing codebase **as a careful newcomer**: it reads before it writes, changes
nothing until a person admits a feature, and works inside the team's process — its branches, CI, code owners, reviews and
merge rules — rather than around it. It starts with a quick **codebase profile**, then a **full scan** of the code and the
repository whose outcome becomes the factory's knowledge base — architecture, modules, interfaces, data, build, tests,
history, risks and open questions, each cited at a commit — and a **baseline** of what the build and tests do *today*,
including what is already failing or flaky. Trust is earned in **stages** — observe, rehearse, contribute, own — each with evidence a team can
check. A factory is given a **territory**: the parts of the code it may change. Features that touch existing behaviour are
specified with **what must not change**, and proven against it. Leaving KILN leaves the repository exactly as the team's
own merges made it.

## 2. What is different about brownfield

| Greenfield assumption | Brownfield reality | What KILN does |
|---|---|---|
| The specification is the whole truth | the code is the truth; behaviour nobody wrote down is relied on | specifications carry **preserved behaviour**, pinned by characterization tests (§7) |
| Tests are green and meaningful | some fail, some are flaky, some areas have none | a recorded **baseline**; Verification distinguishes new failures from old ones and says where it cannot prove (§5) |
| Docs describe the system | docs are partial and stale | knowledge pages say what they rest on — code, history or a person — and lint flags stale claims (§6) |
| KILN's flow is the process | the team already has a process | KILN fits it: branch names, commit style, PR templates, CI, code owners, merge queue (§8) |
| The factory owns the repository | many people change it every day | a factory has a **territory**; base drift and overlap are shown before they become conflicts (§9) |
| One model can hold the codebase in mind | it cannot | a **code map** first, then reading only what a step needs (§10) |
| Trust is assumed | trust must be earned | adoption in **stages**, each with evidence (§4) |

## 3. Principles

| | Principle | Meaning |
|---|---|---|
| **B1** | **Read before write** | nothing in the repository changes before a person admits a feature at a Roadmap gate |
| **B2** | **The code is the first source of truth** | where docs and code disagree, KILN reports the disagreement; it never silently picks the docs |
| **B3** | **The team's process stays in charge** | CI, code owners, required reviews and the merge queue keep their authority; KILN adds gates, it does not bypass any |
| **B4** | **Know the baseline** | what is already broken is recorded before KILN changes anything, so nothing old is blamed on new work and nothing new hides behind old failures |
| **B5** | **Bounded** | a factory changes only its territory; everything else is read-only to it |
| **B6** | **Earn trust in stages** | every stage has an exit check a team can read; no stage is skipped by configuration alone |
| **B7** | **A small, reviewed footprint** | KILN adds to the repository only what spec-driven work needs — Spec Kit's scaffolding, the constitution and `specs/` — through a reviewed pull request, plus the changes its features make; anything else is opt-in and visible |
| **B8** | **Leave cleanly** | removing KILN leaves the repository, its history and its process as the team's merges made them — Spec Kit's files stay useful without KILN; the knowledge base stays readable as markdown |

## 4. Adoption in stages

*Before these stages:* a team can explore the codebase with no factory at all — an **explore space** (r43), then
understanding and as-is specifications (stages 0–2 of `code-exploration.md` §7, rows r46–r48). Observe below can start
from an explore space's knowledge and scan instead of redoing them.

| Stage | KILN does | It does not | Exit evidence |
|---|---|---|---|
| **1. Observe** | builds the codebase profile, runs the **full scan** into the knowledge base, records the baseline; answers questions about the code | change any file | the team reads the scan's pages and its coverage report and corrects them; Curators accept the conventions page |
| **2. Rehearse** | replays **past changes**: takes an issue the team already solved, runs the flow up to Code review and Verification in a scratch worktree, and compares with what the team merged | open pull requests | judges' findings compared with the team's own reviews and later bug fixes; the team decides whether the evidence is good enough |
| **3. Contribute** | runs real features in its territory; the Merge gate **opens a pull request** into the team's normal review | merge on its own; touch paths outside its territory | review outcomes, CI results, post-merge defects of KILN's pull requests — shown as insights with counts |
| **4. Own** | for a well-bounded area, may be granted the team's merge path (still through the code host's rules) | change its own territory or the team's rules | a team decision recorded in the team space, by quorum |

- A workshop can stay at any stage indefinitely; many teams will stay at **Contribute**.
- Moving between stages is a recorded decision at the factory's Roadmap gate (and, in a team, by the team quorum for
  **Own**). Going back is always allowed.
- **Rehearsal** is the brownfield counterpart of *try on a past feature* (`configuration.md` §6.3): ungated, changes
  nothing, decides nothing — it is evidence for people.

## 5. Learning the codebase

### 5.1 The codebase profile

Built locally, read-only, and shown before anything else:

| Area | What KILN finds |
|---|---|
| **Shape** | languages, size, modules and packages, entry points, generated and vendored code (excluded from changes) |
| **Build and test** | build and test commands, how long they take, how CI runs them (read from the CI configuration) |
| **Conventions** | formatter and linter settings, commit message style, branch naming, PR template, code owners |
| **Existing guidance** | `CONTRIBUTING`, ADRs, architecture notes — and existing agent instruction files (`AGENTS.md`, `CLAUDE.md`, editor rule files), offered as role context with their source shown |
| **History** | active and stale areas, files that change together, who maintains what (from history and code owners) |
| **Risk** | areas with no tests, files with frequent fixes, secrets-like strings (reported, never sent anywhere) |

The profile takes minutes. Where the code has an interface, the scan also inventories its screens, routes, flows and
conventions into a draft **experience charter** — labelled *measured* or *inferred*, with as-is journeys and wireframes
derived from the running screens — for the team to correct and approve (`experience-charter.md` §4). It likewise discovers or adopts the **design system** — tokens and components extracted from the code, or an external system recorded by pointer and mirrored read-only — as *measured* or *inferred* files the team confirms (`design-system.md` §7). It is the first page of the knowledge base and the plan for the full scan (§5.3); a person can
correct any of it, and the correction wins over inference.

### 5.2 The baseline

Before the first feature, KILN runs the build and the tests at the base commit — several times, to tell flaky from
failing — and records:

- **passing**, **failing** (already broken) and **flaky** tests, with run counts;
- **build warnings** and **lint findings** already present;
- **areas without tests**.

The baseline is a recorded artifact, refreshed at every Roadmap gate. Every later Verification and Code review compares
against it: *new* failures are the feature's; *pre-existing* ones are shown as such and never block on their own; a
requirement in an untested area is marked **not provable by existing tests** until the feature adds tests for it.

### 5.3 The full scan

The full scan reads **the whole codebase and the whole repository** and writes what it learns into the factory's knowledge
base. It is the main way an existing codebase becomes knowledge KILN — and the team — can work from.

**What it covers**

| Pass | Reads | How |
|---|---|---|
| **1. Inventory** | every file in scope: languages, sizes, generated, vendored and binary files, `kilnignore` | deterministic |
| **2. Structure** | modules and packages, entry points, symbols, imports and the dependency graph, public interfaces (APIs, CLIs, events), configuration, schemas and migrations, third-party dependencies and their licences | deterministic tools and parsers |
| **3. Repository** | the full git history — commits, churn, files that change together, age of each area, tags and releases, branches; code owners; pull requests and issues only if the code host is connected and policy allows | deterministic |
| **4. Build, CI and tests** | build and CI configuration, the test inventory and what each suite covers; the **baseline** (§5.2) runs here | runs the commands |
| **5. Understanding** | module by module: what each part does, how data flows, the domain's terms, why the code looks the way it does — reading code, history and docs together | roles on the lane, every claim cited at a commit |
| **6. Reconciliation** | docs, ADRs, existing Spec Kit specs and agent instruction files checked against the code | contradictions become lint findings; gaps become questions for Curators |
| **7. Synthesis** | the overview, the architecture map, the index and the scan report | the wiki keeper |

**What lands in the knowledge base**

```
wiki/
  raw/scan/<commit>/          ← machine facts of this scan: inventory, dependency graph, history metrics, test map (immutable)
  pages/codebase/
    Codebase overview.md       Architecture map.md       Data model.md
    Build and CI.md            Test landscape.md         Dependencies and licences.md
    Interfaces.md              Conventions.md            History and evolution.md
    Ownership.md               Hot spots and risks.md    Glossary.md
    Open questions.md          Scan report <date>.md
    modules/<module>.md        ← one page per module: purpose, structure, interfaces, data, tests, history, risks
```

- **Grounded.** Every page cites code and history at the scanned commit and is a code-grounded page (`factory-wiki.md`
  §9.3): drift is flagged when the code moves on.
- **Labelled.** Pages carry their origin — *from scan* — and, per claim, whether it was **measured** (passes 1–4) or
  **inferred** (pass 5); briefs that cite a page show the label.
- **Linked.** Module pages link to each other along the dependency graph, to the interfaces they expose and to the history
  that shaped them — all wikilinks, readable in Obsidian or Zed like any other page.
- **Honest about coverage.** The **scan report** says what was read, what was skipped and why (generated, vendored, binary,
  too large, excluded), what could not be understood, how long it took, on which models, and what left the machine
  (nothing, by default).
- **People are not ranked.** Ownership is per module, from code owners and history taken together; there are no
  per-person counts, and review comments are not read unless the team allows it.

**How it runs**

- **Estimated first.** Before it starts, KILN shows the scope, the passes, the expected machine time on this host (e.g.
  *about 3 h 40 min for 120,000 lines on studio-m5*) and any budget; the person starts it.
- **Durable.** The scan is a durable task: each pass, and each module in pass 5, is a checkpointed step; a crash or a
  reboot resumes where it stopped.
- **Scoped.** By default it goes **deep in the factory's territory** and its direct dependencies, and **maps** the rest
  (inventory, structure, history, interfaces); a person can ask for deep everywhere.
- **Local by default.** Passes 1–4 need no model; pass 5 runs on the factory's models under its egress policy.
- **On the lane, behind gates.** Pass 5 uses the lane only when no gate work is waiting, like a research step; it can be
  paused at any time.
- **Readable as it goes.** Pages appear as modules finish; the knowledge base is usable before the scan completes.

**Keeping it true**

- **Incremental re-scans** run after every merge to the main branch, for the changed files and the modules they touch:
  pages are updated, drift is cleared or flagged, the scan report gains an entry.
- **Full re-scans** run on request, or when the director suggests one (for example after a large refactor or a framework
  upgrade) — a suggestion in Needs you, never automatic.
- **People's corrections win.** A re-scan never overwrites a Curator's edit or a page labelled *from a person*; where the
  code now disagrees, it records a contradiction for a person to resolve.

**Who sees what.** The scan's pages are factory knowledge: in a team, they are published to the team space at the level
the team chose (`team-space.md` §10), so teammates read one shared understanding of the codebase instead of scanning it
again.

## 6. Knowledge from an existing codebase

In brownfield, the knowledge is mostly not in documents. The full scan (§5.3) writes the backbone; the factory wiki
(`factory-wiki.md`) is completed from more sources, each labelled with what it rests on:

| Source | What it gives | Label |
|---|---|---|
| **The code** | code map, module overviews, how things connect — cited at a commit | *from code* |
| **History** | why things changed: commit messages, pull request descriptions, linked issues — with permission and egress rules | *from history* |
| **Docs, ADRs, runbooks, post-mortems** | stated intent and past decisions | *from docs* — checked against the code; disagreements flagged |
| **People** | what nobody wrote down | *from a person* — see interviews below |
| **The bench** | research and spikes as the team works | *from research* |

- **Interviews.** The wiki keeper lists what it could not infer — *why does `billing/legacy/` exist?*, *is the retry in
  `sync.ts` deliberate?* — as questions for Curators. Answers become pages labelled *from a person*, with who and when.
  Nobody is obliged to answer; open questions stay visible as gaps.
- **Disagreements are findings.** When docs and code disagree, lint records a contradiction with both sides; it is
  resolved by a person, never silently.
- **Confidence is visible.** A page built only by inference says so. Briefs that cite it show the label.

## 7. Changing existing behaviour safely

### 7.1 Preserved behaviour in the specification

For a feature that touches existing code, the Specification gate's artifact has two parts:

- **What changes** — the requirements, as today.
- **What must not change** — the behaviour the feature must preserve: existing tests that must keep passing, public
  interfaces, data formats, performance budgets, and behaviour the team names explicitly.

### 7.2 Characterization first

Where preserved behaviour has no tests, the Work plan starts with **characterization tasks**: tests that pin what the code
does *today*, run and committed before any change, and reviewed at Code review like any other code. A characterization
test that reveals surprising behaviour is a question for the person, not a bug to fix silently.

### 7.3 Proving it

- **Code review** checks the diff against both parts of the specification, and flags changes outside the territory or to
  public interfaces.
- **Verification** proves the changed requirements and re-runs the preserved behaviour, comparing results with the
  baseline.
- The brief separates *new failures*, *pre-existing failures* and *not provable* — it never folds them together.

### 7.4 Brownfield work, as flows

Common brownfield work fits the default flow, with flows the team can choose per feature (`extensible-flow.md`):

| Kind of work | Flow |
|---|---|
| **Bug fix** | standard; triage usually skips Concept and Design; the specification starts with a failing test that reproduces the bug |
| **Refactor** | standard; the specification is *no behaviour change* plus the structural goal; characterization is required |
| **Dependency upgrade** | standard, plus an added gate where a team wants one (e.g. a licence check); changelogs of the dependency are research inputs |
| **Migration** | a team flow with an added rollout or data-migration gate before Merge's pull request is opened |
| **Test coverage** | standard; the requirements are the behaviours to pin; no production code changes allowed in the territory |

## 8. Fitting the team's process

| The team's | KILN |
|---|---|
| **Branching and commits** | uses the team's branch naming and commit style, read from the profile or set in the factory file |
| **Pull requests** | the Merge gate's *approve* opens a pull request using the team's template; its description carries a short gate summary and a link to the feature's record (redacted to what the team may see) |
| **CI** | CI results are evidence in Verification and the Merge gate; KILN never marks a required check as passed |
| **Code owners and required reviews** | shown at the Work plan gate (who will be asked) and the Merge gate (who has approved); never bypassed |
| **Merge queue** | the code host's queue decides when the pull request merges (`team-space.md` §12) |
| **Issue tracker** | issues can be imported as **candidates** on the bench's candidate list, with their labels and links; status updates back are opt-in |
| **Teammates without KILN** | KILN's pull requests are ordinary pull requests: reviewable, commentable, revertable; review comments on them return to the factory as notes |

In stages 1–3, *ship it* at the Merge gate authorises **opening** the pull request; the team's review authorises the merge.

## 9. A factory's territory

- **Territory** — the paths a factory may change, set at its Roadmap gate (e.g. `services/billing/**`, `docs/billing/**`).
  Everything else is readable context, never written.
- **Shared paths** — lock files, build configuration, CI files — are outside every territory by default; a feature that
  needs them names them in its work plan, and the Merge gate shows them separately.
- **Monorepos** — several factories, each with its own territory and lane, in one repository; in a team, claims
  (`team-space.md` §7) keep them from overlapping.
- **Base drift** — other people keep changing the repository. The factory rebases at defined points (before the
  Implementation gate and before opening the pull request); drift in files the feature touches is shown in the next brief,
  and a conflict is a decision for a person, not something a worker resolves on its own.

## 10. Large codebases and local models

- **Map first.** The code map (from the profile) tells each step where to look; steps read the files they need, not the
  repository.
- **Context per step.** Roles get the territory's map, the relevant knowledge pages and the files named in their task —
  bounded by the model's measured context.
- **Search over memory.** Workers and judges use read and search tools inside the territory and its dependencies.
- **Honest limits.** When a step could not read something it needed (too large, excluded, unavailable), the brief says so.

## 11. What KILN adds to the repository

KILN depends on Spec Kit (`first-run.md` §8.1), so spec-driven work needs Spec Kit's files in the repository:

- **Observe and Rehearse** — Spec Kit lives only in the factory's scratch worktree; nothing reaches the team's branches.
- **Entering Contribute** — the first pull request is **"Add Spec Kit and the constitution"**: `.specify/`, `.pi/prompts/speckit.*`
  a constitution drafted from the team's conventions and, if the team wants one, the confirmed experience charter, reviewed and merged by the team like any change. If the team
  already uses Spec Kit with another integration, KILN adds the Pi integration beside it and changes nothing else.
- **Every feature after that** — its `specs/NNN-name/` directory travels in the feature's pull request.

| Default | Opt-in |
|---|---|
| Spec Kit's scaffolding, the constitution and each feature's `specs/` directory, plus the code changes — all through pull requests | a small committed `.kiln/` folder with the factory's flow and conventions overrides, for teams who want them versioned with the code |
| everything else in the workshop (`~/kiln/`) and, in a team, the team space | a `kilnignore` for paths KILN must never read (in addition to `.gitignore`) |

The knowledge base stays in the workshop by default; a team may choose to publish parts of it into the repository's
`docs/` through ordinary pull requests.

## 12. Brownfield setup, step by step

Continuing from `first-run.md` Step 4, with an existing repository:

1. **Point at the repository** — local clone or remote; KILN works in its own worktree; local-only by default.
2. **Profile** — read-only, minutes; the person reviews and corrects it.
3. **Full scan** — estimated, then started by the person; durable, local, deep in the territory; pages appear in the
   knowledge base as it runs; the baseline is recorded in its fourth pass; the scan report closes it.
4. **Territory** — choose the paths this factory may change; shared paths shown separately (the scan's architecture map
   and ownership pages help choose).
5. **Knowledge** — remaining sources (docs, ADRs, runbooks) ingested on top of the scan; interview questions collected
   for Curators.
6. **Process** — branch and commit conventions, PR template, code owners and CI checks confirmed from the profile; Spec
   Kit found and adopted, or prepared in the scratch worktree with a drafted constitution, to be proposed on entering
   **Contribute**.
7. **Stage** — the factory starts at **Observe**. Rehearsal can be started on a chosen past change.
8. **First roadmap** — when the team moves to **Contribute**, the director proposes from imported issues and the
   knowledge base; small, well-understood changes first.

## 13. What the record and insights add

- **Events:** `scan.estimated`, `scan.started`, `scan.pass_completed`, `scan.module_written`, `scan.completed` (coverage),
  `scan.incremental`, `codebase.profiled`, `codebase.profile_corrected`, `baseline.recorded`, `territory.changed`,
  `adoption.stage_changed`, `rehearsal.started`, `rehearsal.completed`, `pr.opened`, `pr.review_received`,
  `pr.merged_by_team`.
- **Insights** (`insights.md`), per stage and with counts: rehearsal findings that matched the team's own reviews or later
  fixes; KILN pull requests merged, changed in review, or reverted; post-merge defects traced to KILN features;
  pre-existing failures fixed along the way. Evidence for the team's stage decisions — never automatic promotion.

## 14. How it fits KILN's rules

| KILN rule | In an existing codebase |
|---|---|
| **Humans decide** | stages, territory and every feature are admitted by people; the team's reviewers keep the merge |
| **No model approves its own work** | KILN's judges add to the team's review; they never replace a required human review |
| **Everything recorded** | profile, baseline, territory, stage changes and rehearsals are in the record |
| **Local by default** | profiling, history and knowledge ingest run on the machine; history or issues reach a remote model only by egress rule |
| **Honest about gaps** | baseline failures, untested areas, inferred knowledge and unread code are always labelled |

## 15. Open questions

1. Should **Rehearse** be required before **Contribute**, or a recommendation?
2. ~~How far back does the scan read history?~~ **Decided 2026-10-21** (human@batorfi): the last **2 years in detail** (configurable per factory);
   older history **summarised per module** — authors, churn, major changes, reverts.
3. ~~Fix pre-existing flaky tests?~~ **Decided 2026-10-21** (human@batorfi): **reported in the baseline, and offered as candidate features** labelled
   *from the baseline* — on the candidate list once the bench has it, until then as a planner proposal at the Roadmap gate.
   A person decides; nothing is fixed silently inside another feature.
4. ~~A teammate edits a KILN pull request?~~ **Decided 2026-10-21** (human@batorfi): **recorded and re-verified** — the edit is shown in the Merge
   gate brief as a person's change with its author, and checks (and Verification, if code changed) re-run before Merge can
   be approved. No new feature round.
5. ~~How deep outside the territory?~~ **Decided 2026-10-21** (human@batorfi): **deep inside, a map outside** (structure, interfaces, owners,
   dependencies); a feature that will touch a mapped module gets a deep scan of it before its Design gate.
6. ~~PR and issue discussions?~~ **Decided 2026-10-21** (human@batorfi): **titles, labels, states and links by default**; full discussions only by a
   recorded opt-in, and always under the egress policy when the code host is remote.
7. ~~Territory at the tool level?~~ **Decided 2026-10-21** (human@batorfi): **yes** — workers' write tools refuse paths outside the territory; the
   refusal arrives as a risky-action request a person may allow once (recorded) or answer by widening the territory at the
   next gate. Code review still checks the diff.

## 16. One sentence

KILN enters an existing codebase as a careful newcomer — it scans the code and its history into a knowledge base the team
can read, records what is already broken, earns trust
in stages, changes only its territory, specifies what must not change, and works through the team's own process — so a
team can adopt it one area at a time and leave it without a trace.
