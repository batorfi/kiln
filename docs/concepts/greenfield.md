> Status: concept — **final** (2026-10-21, human@batorfi; previously a proposal, 2026-10-20). Open decisions were
> settled on 2026-10-21 and are recorded where they apply; what remains open is listed in
> [`open-decisions.md`](./open-decisions.md). Building it is admitted only at the Roadmap gate.
> Type: concept
>
> Scope note: this doc describes **how KILN starts a codebase from nothing** — a new product, service or library with no
> code, no history, no tests and no conventions yet. It covers how intent is captured before any code, how technology
> choices are researched, tried and decided, why the first feature is a walking skeleton, how conventions and quality are
> set from day one, how the roadmap grows in vertical slices, and how a greenfield factory grows into the brownfield
> practices as the code and the team grow. It is the counterpart of `brownfield.md`; it is a concept, not a spec.
>
> Companion docs:
>   - First run:              `first-run.md` (setup; this doc continues from Step 4's *Start empty*)
>   - Existing codebases:     `brownfield.md`
>   - The flow:               `the-flow.md` · An extensible flow: `extensible-flow.md`
>   - Shaping the roadmap:    `the-director.md` §4.3 · The bench: `the-bench.md`
>   - Knowledge:              `factory-wiki.md` · Teams: `team-space.md` · Configuration: `configuration.md`
>   - The PRD:                `../prd/kiln-prd.md`

# KILN in a new codebase

## 1. In one paragraph

In a new codebase, the risk is not breaking what exists — it is building the wrong thing, on the wrong foundations, in a
shape that will hurt later. So KILN starts with **intent, not code**: a short **product brief** and a **constitution**
written from it. Key **technology choices** are researched, tried in spikes and **decided by a person**, each recorded as a
decision the factory and later readers can rely on. The first feature is a **walking skeleton** — the thinnest end-to-end
path through every layer, with build, tests, CI and conventions in place — so every later feature lands on solid ground and
is checked against real standards. After that the roadmap grows in **vertical slices**, riskiest assumptions first, and the
knowledge base grows with the code. As the code and the team grow, the factory takes on the brownfield practices — scan,
baseline, territory — without a break.

## 2. What is different about greenfield

| | Brownfield | Greenfield | What KILN does |
|---|---|---|---|
| **The truth** | the code | the intent | a **product brief** and a **constitution** come first (§5) |
| **Main risk** | breaking what works | building the wrong thing on the wrong foundations | research, spikes and recorded **decisions** before code (§6) |
| **Knowledge** | in the code and people's heads | in the brief, research and decisions — then in the code KILN writes | knowledge is seeded from intent and grows from implementation digests (§10) |
| **Conventions** | inferred from the code | chosen | written by the first feature, enforced from the second (§8) |
| **Tests and CI** | a baseline to respect | nothing yet | the walking skeleton brings them; every feature after adds to them (§7, §9) |
| **Structure** | exists; territories follow it | does not exist yet | the skeleton defines it; territories and claims come after (§12) |
| **Features** | changes to behaviour | new behaviour | vertical slices, each usable on its own (§9) |
| **Trust** | earned in stages | the repository is yours | no adoption stages; the factory owns the repository from the start |

## 3. Principles

| | Principle | Meaning |
|---|---|---|
| **G1** | **Intent before code** | no feature is admitted before a product brief and a constitution exist and a person has approved them |
| **G2** | **Decisions are explicit** | every foundational choice is a recorded decision with options, evidence and who made it — never an agent's default |
| **G3** | **Try before you commit** | a technology choice with real uncertainty is spiked before it is decided |
| **G4** | **Skeleton first** | the first feature is a walking skeleton: end to end, built, tested, in CI, following the conventions |
| **G5** | **Quality from day one** | tests, conventions, docs and knowledge are part of every feature from the first; there is no "later" for them |
| **G6** | **Thin vertical slices** | after the skeleton, each feature delivers something usable end to end; no big horizontal layers built ahead of use |
| **G7** | **Riskiest first** | the roadmap puts the assumptions most likely to be wrong where they are cheapest to test |
| **G8** | **Grow into brownfield** | as the code and the team grow, the factory adopts the brownfield practices on the way, without a reset |

## 4. Phases

| Phase | What happens | Ends when |
|---|---|---|
| **1. Frame** | the product brief; the constitution drafted from it; the first roadmap brief (`the-director.md` §4.3) | a person approves the brief and the constitution |
| **2. Explore** | research steps and spikes on the open technology choices; decisions recorded | every choice the skeleton depends on is decided |
| **3. Skeleton** | feature 1: the walking skeleton, through the full flow | it merges, and runs from a clean clone |
| **4. Build** | vertical slices, riskiest first; conventions and tests enforced; knowledge grows with every merge | — |
| **5. Grow** | others join, the code gets large, a first release ships — brownfield practices switch on (§13) | — |

Phases are not gates of their own: they are how the roadmap is shaped. *Frame* and *Explore* happen mostly at the bench
and at the Roadmap gate; *Skeleton* and *Build* are ordinary features through the flow.

## 5. Framing: the product brief and the constitution

### 5.1 The product brief

A short document the engineer writes — alone or in conversation with the planner — and the factory reads first:

| Part | Example |
|---|---|
| **Problem** | *teams lose track of which invoices were prorated and why* |
| **Users** | *billing operators; finance reviewers* |
| **Outcomes** | *every plan change produces an auditable proration in under a second* |
| **Non-goals** | *no payment processing; no tax calculation* |
| **Constraints** | platforms, licences, compliance, budget, dates, where it must run |
| **Quality attributes** | performance, security, accessibility, operability — with numbers where possible |
| **Success measures** | how the team will know it worked |

The brief is a page in the factory's knowledge base, labelled *from a person*; the roadmap brief's goals and constraints
start from it; briefs at the Concept and Specification gates cite it. For a product with an interface, the brief's users
and quality attributes are also the seed of the **experience charter** (§5.3).

### 5.2 The constitution

The constitution — Spec Kit's `.specify/memory/constitution.md` (`first-run.md` §8.2) — is **written, not adopted**:

- the planner drafts it with `speckit.constitution` from the product brief, its quality attributes and the workshop's
  standing preferences (for example, *local-first*, *no new dependency without a recorded decision*);
- each principle says where it came from; the person edits and approves it;
- it starts small and is amended as decisions are made — every amendment recorded, versioned, and visible at the next
  gates.

### 5.3 The experience charter

Where the product has an interface, the planner drafts the **experience charter** from the product brief — users and
situations, experience principles, top journeys, a screen map with high-level wireframes, content voice, accessibility
floor and design tokens — the person edits and approves it, and it is committed beside the constitution
(`experience-charter.md` §4). The walking skeleton cites it and the design tokens, so the first screens are built under it
and the built-in Experience design and UI review gates (`ui-flow.md`) have a yardstick from the first slice.

## 6. Technology decisions

Foundational choices — language and runtime, framework, data store, testing approach, packaging, how it runs and where —
are **decisions**, not things an agent picks while writing code.

1. **Open choices are listed** — the planner reads the brief and the constitution and lists the choices the skeleton
   depends on, each with candidate options; the person adds, removes or narrows them.
2. **Research** — a research step per choice (`the-bench.md`): documentation, known trade-offs, licences, maturity,
   fit with the constraints, prior experience from the **workshop wiki** (*we used X in billing-service; here is what we
   learned*). Cited, labelled *from research*.
3. **Spike** — where uncertainty is real, a spike tries the option against the constraint that matters most (*can the
   store hit 1,000 prorations per second on this machine?*). Ungated, throwaway, measured; the spike report is evidence.
4. **Decision** — the person decides, with the planner's recommendation shown as advice. The decision is recorded as a
   **decision page** in the knowledge base — context, options, evidence, choice, consequences, who and when — and, where it
   constrains all future work, as an amendment to the constitution.
5. **Used** — the Design gate of every later feature measures the design against the recorded decisions; changing one is a
   new decision, never a silent drift.

Decisions taken **before** the skeleton are made at the bench and confirmed at the Roadmap gate that admits the skeleton
(its readiness shows which choices are decided and which are not). Decisions that arise **inside** a feature are made at
its Design gate and recorded the same way.

## 7. The walking skeleton

The first feature is always a walking skeleton — proposed by the planner, shaped and admitted by the person like any other.

**It includes**

- the repository layout, package and module structure the decisions imply;
- the build, a test runner with the first real tests, and **CI** that runs them on every pull request;
- the formatter, linter and type checks, configured and passing;
- **one thin path end to end** through every layer — for example, an API call that writes to the store and is read back —
  with its tests;
- how to run it locally from a clean clone (the quickstart), and the first docs;
- Spec Kit's first feature directory, and the factory's conventions page.

**It runs a stricter flow.** The skeleton uses a **foundation flow** — the standard flow with `no_triage_skip` (Concept and
Design always run) — and its Specification includes *how we build*: test strategy, CI, conventions, quality-attribute
checks that can run from day one.

**It is proven from scratch.** Verification clones the repository fresh, builds it, runs the tests and walks the thin path —
nothing is accepted that only works in the factory's worktree.

## 8. Conventions from day one

- The skeleton **writes** the conventions: formatter and linter settings, commit message style, branch naming, test and
  docs layout, a pull request template, code owners where there is a team.
- They are recorded in the constitution (where they are principles) and on a **conventions page** in the knowledge base.
- From the second feature on, the code reviewer checks them and CI enforces them; a change to a convention is a recorded
  decision, applied to every feature after it.

## 9. Building in slices

- **Vertical slices.** After the skeleton, the planner proposes features that each deliver something usable end to end —
  not a data layer, then a service layer, then a UI. A horizontal piece is admitted only when a slice needs it.
- **Riskiest first.** Rows that test the biggest unknowns from the brief come early, while changing course is cheap; their
  readiness and evidence show at the Roadmap gate.
- **Shaped together.** The engineer's roadmap brief, the product brief and the decisions are the planner's first inputs;
  the person edits, pins and decides (`the-director.md` §4.3).
- **Specifications are the whole contract.** There is no behaviour to preserve; the specification says everything the
  feature must do, and Verification proves it.
- **Tests first by default.** The work plan puts tests for each requirement before the code that satisfies it; the
  baseline is simply the last merge.

## 10. Knowledge in a new codebase

| When | Sources | Label |
|---|---|---|
| **Frame** | the product brief, the constitution, the roadmap brief | *from a person* |
| **Explore** | research results, spike reports, documentation of the chosen technologies, workshop learnings from earlier projects | *from research* · *from docs* |
| **Decisions** | decision pages | *from a person*, with evidence linked |
| **Skeleton and after** | implementation digests: feature stories, the architecture overview (intended at Design, actual after Code review), explainers, how-tos (`factory-wiki.md` §9) | *factory-produced*, cited at a commit |

In a greenfield factory the knowledge base **is** the design record: anyone joining later reads why the foundations are
what they are, from the decisions and the feature stories, without archaeology. Lint checks decisions against the code
from the start, so drift between *what we decided* and *what we built* is caught while it is small.

## 11. Models and effort

- **Design matters most early.** The foundation decisions and the skeleton's design shape everything after them; their
  briefs carry the most evidence. Where policy allows, a team may ask for a **second critic from another model family** at
  the skeleton's Design gate (`user-experience.md` §8.4, *request more evidence*).
- **New code is larger.** Early features write more code than later ones; the Implementation gate's size check and
  `split+revise` keep features reviewable.
- **Spikes are cheap and disposable.** They run on the bench, ungated, and their code never merges.

## 12. Starting as a team

- **The team space first** (`team-space.md`): the product brief, the constitution and the decisions are team artifacts,
  agreed by the team's quorum.
- **One workshop builds the skeleton.** Claims on paths are impossible before the structure exists; the skeleton defines
  it. Teammates take part through the team roadmap, reviews and the decisions.
- **After the skeleton merges,** the team roadmap splits into slices; claims, territories and the merge queue work as in
  any team codebase.

## 13. Growing into brownfield

A greenfield factory does not stay greenfield. The brownfield practices (`brownfield.md`) switch on as they become useful —
each a recorded decision at a Roadmap gate, suggested by the director when its trigger is met:

| Trigger | Practice that switches on |
|---|---|
| code arrives that KILN did not write (other contributors, imported code) | a **full scan** of what the digests do not cover; incremental re-scans after each merge |
| the first release ships | **preserved behaviour** in specifications; the **baseline** includes released behaviour |
| a second factory or a teammate works in the same repository | **territories** and claims |
| the code outgrows what a step can read | the **code map** and per-step context (`brownfield.md` §10) |

There are no adoption stages to climb: the factory has owned the repository from its first commit.

## 14. Greenfield setup, step by step

Continuing from `first-run.md` Step 4 with *Start empty*:

1. **Create the repository** — local `git init`, optionally a remote; KILN works in its own worktree; local-only by default.
2. **Add Spec Kit** — `specify init --here --ai pi`; the files are shown before the first commit.
3. **Product brief** — written by the person, or drafted in conversation with the planner; approved.
4. **Constitution** — drafted from the brief with `speckit.constitution`; edited and approved.
4a. **Experience charter** (if there is an interface) — drafted from the brief; edited and approved by the experience owner or a Decider.
5. **Knowledge** — the brief, the constitution and any reference documents ingested; workshop learnings linked.
6. **Open choices** — listed by the planner, narrowed by the person; research and spikes started at the bench.
7. **First roadmap** — shaped together: the walking skeleton first (with the foundation flow), then the first slices;
   readiness shows which decisions are still open.
8. **Team** — start a team space now if the product will be built by a team (§12).

## 15. What the record and insights add

- **Events:** `brief.approved`, `constitution.approved`, `constitution.amended`, `decision.recorded`,
  `decision.superseded`, `skeleton.verified_from_clean_clone`, `practice.enabled` (scan, baseline, territory).
- **Insights** (`insights.md`): decisions made and revisited; spikes that changed a decision; rounds per gate in the
  skeleton versus later features; how often Design gates cite recorded decisions — evidence, never targets.

## 16. How it fits KILN's rules

| KILN rule | In a new codebase |
|---|---|
| **Humans decide** | the brief, the constitution, every foundational choice and every feature are decided by people |
| **No model approves its own work** | the planner recommends technologies; it never decides them; judges check the skeleton like any feature |
| **Everything recorded** | decisions, amendments and the skeleton's clean-clone proof are in the record |
| **Local by default** | research and spikes run locally; remote sources only by egress rule |
| **Spec-driven** | Spec Kit and the constitution exist before the first line of code |

## 17. Open questions

1. ~~Starter templates?~~ **Decided 2026-10-21** (human@batorfi): **no** — technology choices start open and are decided by a person with
   researched evidence; prior decisions in workshop knowledge may be cited as evidence, never pre-filled as defaults.
2. ~~How small may a library's skeleton be?~~ **Decided 2026-10-21** (human@batorfi): **build, test, CI, packaging and one public function exercised
   end to end through the public API** is enough for a library; a service still needs its full path.
3. ~~A Decisions gate before Design?~~ **Decided 2026-10-21** (human@batorfi): **no** — decision pages a person approves, shown in the Design gate
   brief; a team that wants a Decisions gate adds it as an added gate.
4. When should a greenfield factory **revisit** an early decision automatically suggested by evidence (for example, a
   spike-backed choice that later features keep fighting)?

## 18. One sentence

KILN starts a new codebase with intent before code — a product brief, a constitution and recorded, spike-tested decisions —
builds a walking skeleton with tests, CI and conventions first, grows in thin vertical slices with its knowledge base as the
design record, and takes on the brownfield practices as the code and the team grow.
