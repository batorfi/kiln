> Status: concept (proposal, 2026-10-19) — **not admitted**
> Type: concept
>
> Scope note: this doc describes **KILN's default flow end to end** — the Roadmap gate and Gates 1–9 — what happens
> between the gates, what every gate decides and on what evidence, where each corrective move sends the work, and how
> shortcuts, absence, restarts and teams change the walk. It is the fresh, self-contained description of the flow for
> the new concept; it replaces `gates-why-how-what.md` as the reference (that doc stays as history). It is a concept,
> not a spec.
>
> Settled elsewhere and only summarised here: gate names and phases (`web-front-door.md` §3.1), gates as durable tasks
> (§5), the gate brief (`user-experience.md` §8), added gates and flows (`extensible-flow.md`), the director
> (`the-director.md`).
>
> **Proposed here, for review** (§11): where a `reject` sends the work at each gate, what re-crossing a gate means, the
> fix-round cap as a factory setting, and answers to the open questions left in `gates-why-how-what.md`.
>
> Companion docs:
>   - Gate names and the durable gate contract: `web-front-door.md` §3.1, §5
>   - The gate brief:                           `user-experience.md` §8
>   - An extensible flow:                       `extensible-flow.md`
>   - The director and Needs you:               `the-director.md`
>   - The record:                               `the-record.md` · Insights: `insights.md`
>   - Knowledge at gates:                       `factory-wiki.md` · The bench: `the-bench.md` · Teams: `team-space.md`
>   - The user experience:                      `user-experience.md` (and `mockups/67`–`72`, with `02`, `03`, `07`–`10`)
>   - The PRD:                                  `../prd/kiln-prd.md`

# KILN — the flow: from roadmap to merge

## 1. In one paragraph

A KILN factory builds one feature at a time along a single lane. The **Roadmap gate** admits the next feature; then the
feature walks **nine gates** in four phases — **contract** (Concept, Design, Specification, Work plan), **build and
prove** (Implementation, Code review, Verification) and **release** (Documentation, Merge). Between gates, agents do the
work and independent judges check it; at every gate, a person reads a complete brief and makes a move. Every move has a
defined consequence: approve moves forward, a corrective move sends the work back a known distance, and nothing ever
moves forward on its own — not a clock, not a restart, not a missing screen. Merging the feature re-opens the Roadmap
gate for the next one.

## 2. What the flow is for

| Belief | What it means for the flow |
|---|---|
| **Cheap to stop early, expensive to stop late** | the gates are ordered so scope is decided before structure, structure before contract, contract before code |
| **The contract is the yardstick** | the Specification gate fixes what "done" means; Code review and Verification measure against it, never against taste |
| **No model approves its own work** | authors and judges are different roles; on the three judged gates the judge runs on the strongest model and holds the lane |
| **People decide, with the whole picture** | every gate presents a ten-part brief; advice is labelled as advice; no move is pre-selected |
| **One lane, one feature** | a single sequential lane keeps model swaps few, the record linear and the human's attention on one thing per factory |
| **Shortcuts are decisions, not defaults** | skipping and delegation exist, are bounded, are recorded — and any judge's objection ends them |

## 3. The flow at a glance

```
 PROGRAM          CONTRACT                                          BUILD AND PROVE                          RELEASE
 ┌────────┐   ┌─────────┐  ┌────────┐  ┌───────────────┐  ┌─────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────────┐  ┌───────────────┐  ┌───────┐
 │Roadmap │──►│1 Concept│─►│2 Design│─►│3 Specification│─►│4 Work   │─►│5 Implement-  │─►│6 Code      │─►│7 Verification│─►│8 Documentation│─►│9 Merge│──┐
 │ gate   │   │         │  │ judged │  │               │  │  plan   │  │  ation       │  │  review    │  │   judged     │  │               │  │       │  │
 └────────┘   └─────────┘  └────────┘  └───────────────┘  └─────────┘  └──────────────┘  │  judged    │  └──────────────┘  └───────────────┘  └───────┘  │
     ▲         ╰─ triage may skip both ─╯     │ arm the unattended tail ──────────────────┴────────────┴──── Gates 4–9 on a clean path ───────────────╯   │
     │                                         ▼                                                                                                      │
     └──────────────────────────────────────── the Roadmap gate re-opens after every merge ─────────────────────────────────────────────────────────────┘
```

| # | Gate | The question | Artifact | Author | Judge | Moves |
|---|---|---|---|---|---|---|
| — | **Roadmap** | Which features do we build, in what order — and how does this factory run? | the roadmap | planner | — | approve · revise · reject · edit/add/drop rows |
| 1 | **Concept** | Is this worth building, on these premises? | concept | researcher → concept writer | — | approve · revise · reject |
| 2 | **Design** | Is this the right structure? | design | designer | **architecture critic** | approve · revise · reject |
| 3 | **Specification** | What exactly counts as done? | specification | spec writer | — (deterministic checks) | approve · revise · reject · *arm the tail* |
| 4 | **Work plan** | In what pieces and order will it be built? | work plan | planner | — (deterministic checks) | approve · revise · reject |
| 5 | **Implementation** | Do we start building from a safe point — and is this still one feature? | restorable commit + size | director | — | approve · split+revise |
| 6 | **Code review** | Is the code right, against the specification? | diff + review notes | workers | **code reviewer** | approve · restart |
| 7 | **Verification** | Does it actually work as specified? | verification report | workers (fix rounds) | **verifier** | approve · reject |
| 8 | **Documentation** | Do the docs describe what was actually built? | doc changes + feature story | techwriter, wiki keeper | — | approve · revise · reject |
| 9 | **Merge** | Do we ship this feature? | pull request | PR writer | — (checks, team reviews) | approve (= merge) · reject |

## 4. Before the first gate

1. **Admission.** At the Roadmap gate a person admits **one** next feature, and with it decides the factory's profile,
   egress policy, budget and placement, and the feature's **flow** (the standard flow unless added gates apply —
   `extensible-flow.md` §7). Approving admits one feature only; there is no chaining.
2. **Triage.** The first step of the feature. It judges size and clarity and may **skip Concept and Design** for small,
   well-scoped features. The skip and its reasoning are recorded and shown in every later brief. A flow may forbid
   skipping (`no_triage_skip`); nothing else can skip a gate.
3. **The row starts.** The director creates the feature's row task and runs its steps one at a time on the lane.

*Artifacts.* Every feature is a Spec Kit feature directory (`specs/NNN-name/`): Spec Kit's commands produce the
specification, plan and tasks; KILN adds the concept, the design and the judges' reports, and every brief measures against
the constitution (`first-run.md` §8.1).

## 5. Anatomy of every gate

Every gate — built-in or added — goes through the same five moments:

| Moment | What happens | Guarantee |
|---|---|---|
| **1. Work** | the author's steps run on the lane; research steps may be added; a person may steer work roles | judges are never steered; risky actions wait for approval |
| **2. Evidence** | the judge (on judged gates) and deterministic checks run; on Verification, up to the capped fix rounds | the judge's verdict is evidence, never a decision |
| **3. Brief** | the ten-part brief is assembled: orientation, decision, work, yardstick, evidence, risks, provenance, history, options, other actions | the gate is not waiting for a person until its brief is complete |
| **4. Waiting** | the gate is a durable task in `waiting`; it appears in Needs you with its headline | no clock, restart or missing screen settles it |
| **5. Move** | a person makes a move; it and the gate's completion are one atomic commit; the first committed move wins | the brief as seen is recorded with the move |

Then the director applies the move (§7). A gate never takes the lane while it waits: waiting for a person holds no model —
except that the judged gates keep their judge's model **pinned** between the work and the verdict, and through fix
rounds, so the same judge sees every attempt.

## 6. The gates, one by one

Each gate below: **why it exists**, **what runs before it**, **what the brief puts first**, **the moves and where they
lead**, and **what it hands forward**.

### 6.0 Roadmap gate — *program*

- **Why.** Nothing is built that a person did not admit. It is the only gate that decides *what* a factory works on, and
  the only one delegation can never reach.
- **Before it.** The roadmap is **shaped together** (`the-director.md` §4.3): the engineer's roadmap brief — goals,
  must-haves, constraints, order preferences, their own rows — a conversation with the planner, and direct edits with
  pins, beside the planner's draft from the factory's knowledge, the bench's candidate list, the record and — in a team —
  the team roadmap. Every version is checked deterministically.
- **Brief first.** The features, order and dependencies, **each row's origin** (from you, the planner, a candidate, the team
  roadmap) and which of your inputs it answers; what changed since the last approval; evidence and readiness;
  what was learned since; how the factory runs (profile, policy, budget, host); the proposed flow per feature.
- **Moves.** approve (admits the next feature) · revise (the planner redrafts) · reject (nothing is admitted; the
  factory idles) · edit, add or drop rows (the person reshapes the roadmap directly). Approve applies to the exact version
  the brief was assembled for.
- **Hands forward.** One admitted feature, its flow (pinned with gate versions), and the factory's settings.
- *Mockups:* 03 · 45 · 54 · 66.

### 6.1 Concept gate — *contract*

- **Why.** The cheapest place to stop a wrong idea: scope, intent and premises are judged before any structure exists.
- **Before it.** A researcher gathers what the knowledge base, the code and permitted sources say; the concept writer
  states the problem, the premises, the scope and what is out of scope.
- **Brief first.** The problem and premises; what the concept rests on (cited pages, research, spikes) and which
  premises are unproven; what is explicitly out of scope.
- **Moves.** approve → Design · revise (note → the same writer) · reject → back to the **Roadmap gate**: the feature
  leaves the lane, its work stays in the record (§11, P1).
- **Hands forward.** The concept: the premises every later gate inherits.
- *Mockup:* 68.

### 6.2 Design gate — *contract · judged*

- **Why.** Catch a build that would work but have the wrong shape — module boundaries, data flow, abstractions — while
  changing it costs a document, not a rewrite.
- **Before it.** The designer proposes a structure with alternatives; the **architecture critic** (strongest model, lane
  held) reviews it; the designer may answer the critic's objections once before the gate opens.
- **Brief first.** The structure and the alternatives considered; the critic's objections by severity and how the
  design answers each; which answers the critic accepts and which it does not.
- **Moves.** approve → Specification · revise (note → the same designer; the critic re-runs) · reject → a fresh designer,
  or back to Concept if the note says the premise is wrong.
- **Hands forward.** The approved structure the specification must respect.
- *Mockup:* 69.

### 6.3 Specification gate — *contract*

- **Why.** Fix what "done" means. Everything after this gate is measured against it; a fuzzy specification poisons every
  later gate.
- **Before it.** The spec writer turns concept and design into numbered requirements, each with how it will be verified;
  deterministic checks confirm every requirement is testable and traces to the concept.
- **Brief first.** Requirement by requirement, what done means and how it will be proven; what the specification does
  not promise; the arming option.
- **Moves.** approve → Work plan · revise · reject → a fresh spec writer, or back to Design · **and, with approve, the
  option to arm the unattended tail** (§8.2).
- **Hands forward.** The yardstick for Code review and Verification.
- *Mockup:* 07.

### 6.4 Work plan gate — *contract*

- **Why.** Decide how the work is cut and ordered — which also decides the model order on the lane and so its switching
  cost, and in a team, which paths will be claimed.
- **Before it.** The planner cuts the specification into tasks, each tracing to requirements; the director computes the
  model order, expected swaps and machine time; in a team, overlap with teammates' claims is checked.
- **Brief first.** The tasks and their order, mapped to requirements; the model order and expected cost; overlap with
  claims and protected paths; tasks that touch paths an added gate applies to.
- **Moves.** approve → Implementation gate · revise · reject → a fresh plan, or back to Specification.
- **Hands forward.** The task queue the lane will follow, and (in a team) the claims it publishes.
- *Mockup:* 70.

### 6.5 Implementation gate — *build and prove*

- **Why.** The go-ahead to write code — from a clean, restorable commit — and the one chance to say *this is really two
  features*. It is a control gate: nothing is judged yet.
- **Before it.** The director records the restorable commit, runs the tests at it, and sizes the work from the plan;
  if the work is larger than usual, it proposes a split.
- **Brief first.** The starting point and its test state; the size of the work ahead against past features; what a split
  would look like.
- **Moves.** approve → building starts · split+revise → the feature keeps part of the work; the rest becomes a new
  roadmap feature; the work plan is revised and returns here. **No reject**: a feature about to be built is not "done
  wrong" — to stop it, pause the factory and revisit the roadmap.
- **Hands forward.** The restorable commit that `restart` will return to.
- *Mockup:* 08.

### 6.6 Code review gate — *build and prove · judged*

- **Why.** An independent critique of the code against the specification before anything is run as proof.
- **Before it.** Workers implement the tasks in order, running tests as they go (a person can watch and steer); the
  **code reviewer** (strongest model, lane held) reads the diff against the specification and the design.
- **Brief first.** The changes mapped to requirements; findings by severity with locations; on a return round, how the
  previous note was addressed.
- **Moves.** approve → Verification (open minor findings carried forward, recorded as accepted) · restart → rebuild from
  the restorable commit with the findings and the note. **No revise**: the reviewer judges, it never edits.
- **Hands forward.** Reviewed code and any accepted findings.
- *Mockups:* 02 · 21.

### 6.7 Verification gate — *build and prove · judged*

- **Why.** Prove — not assume — that the feature does what the specification says.
- **Before it.** The **verifier** (strongest model, lane held) checks each requirement by running it. On failure, the
  factory runs up to **two automatic fix rounds** (a worker fixes, the same verifier re-checks) before the gate opens.
- **Brief first.** Results per requirement; the fix rounds already tried and what they changed; the verifier's
  diagnosis — including when the requirement itself may be wrong.
- **Moves.** approve → Documentation (any failed requirement recorded as accepted by the person) · reject (note) → back
  to implementation on the current code with the note and diagnosis, or back to Specification if the note says the
  yardstick is wrong. No more automatic rounds after a person rejects.
- **Hands forward.** A verified build, or a build with recorded, accepted failures.
- *Mockup:* 09.

### 6.8 Documentation gate — *release*

- **Why.** The docs and the knowledge base must describe what was actually built, not what was intended — the next
  feature, and the next person, will read them.
- **Before it.** The techwriter updates the repository's docs from the as-built code; the wiki keeper completes the
  feature's **implementation digest** — feature story, overviews, explainers, how-tos, learnings (`factory-wiki.md`).
- **Brief first.** What the docs now say compared with what was built; gaps (something built and not documented,
  documented and not built); what the feature added to the knowledge base.
- **Moves.** approve → Merge · revise · reject → a fresh techwriter.
- **Hands forward.** Docs and knowledge that match the code.
- *Mockup:* 71.

### 6.9 Merge gate — *release*

- **Why.** The only point where *ship it* is authorised. One person confirms the whole feature, end to end.
- **Before it.** The PR writer prepares the pull request; checks run; in a team, required reviews, the code host's merge
  queue and base drift are gathered.
- **Brief first.** Every gate's decision and by whom (human or delegated); risks carried forward; what merging will do;
  what left the machine; what the feature added to the knowledge base.
- **Moves.** approve → merge; the Roadmap gate re-opens · reject (note) → back to the gate the person names, or out of
  the lane to the Roadmap gate.
- *Mockups:* 10 · 39.

## 7. Where the moves lead

| Move | Where the work goes | What is kept | What is redone |
|---|---|---|---|
| **approve** | the next gate | everything | nothing |
| **revise** (note) | the same author conversation, with the note | the conversation and its context | the artifact, then this gate's checks and judge |
| **reject** (note) | a fresh author at this gate — or an earlier gate the note names (§11, P1) | every gate approved before the target | the target gate's artifact and every gate after it |
| **restart** (Code review) | a fresh build from the restorable commit, with the findings | concept, design, specification, work plan, restorable commit | the code, then Code review |
| **split+revise** (Implementation) | the feature shrinks; the rest becomes a new roadmap feature | everything approved so far, for the kept part | the work plan, then this gate |
| **automatic fix round** (Verification) | a worker fixes; the same verifier re-checks; at most 2 | everything | the failing parts |

**Re-crossing.** When work goes back, every gate after the target opens again — gates are never carried across a change
they did not see. A brief on a re-crossed gate says what changed since the last approval and what did not; if nothing it
judges changed, it says so plainly, and the decision is still a person's (§11, P2).

## 8. Shortcuts — and what ends them

### 8.1 Triage skip

For small, well-scoped features, triage skips Concept and Design. Recorded with its reasoning; shown in every later
brief; impossible where the flow sets `no_triage_skip`. Small features still pass Gates 3–9.

### 8.2 The unattended tail

At the Specification gate, the person who approves may **arm** delegation for the gates after it — Work plan through
Documentation by default, Merge only if explicitly included. Then, on each covered gate:

- **Clean path** — the gate settles with an *approved under delegation* move that names the delegation, never a person.
- **Any objection** — a architecture critic objection, a code reviewer `restart`, a verifier `reject`, a split proposed at the
  Implementation gate, a blocked request, a reached budget — **ends the delegation**: that gate and every gate after it
  wait for a person, and the brief says why.

Delegation never reaches the Roadmap gate and is never inferred from absence.

### 8.3 Steering and research between gates

A person can steer a working author, approve or refuse a held risky action, or add a research step — none of which is a
gate move, and all of which appear in the next brief's provenance (`web-front-door.md` §8, `the-bench.md`).

## 9. When nobody is there, and when things crash

- **Away.** A waiting gate waits. Needs you orders what is waiting; nothing decides itself, and no deadline settles a gate.
- **Headless.** No screen means `waiting` — the same state, recorded the same way. The Roadmap gate commits its roadmap
  table as the gate document and waits like any gate.
- **Restart.** Every gate, step and fix round resumes from its last durable checkpoint. A waiting gate resumes waiting; a
  restart never approves anything (`pi-durable.md`).

## 10. After Merge, and in a team

- **After Merge.** The record closes the feature; the knowledge digest is finalised; insights count the feature's
  rounds, waits and machine time; the bench's candidates are re-scored; the **Roadmap gate re-opens** for the next
  feature.
- **In a team** (`team-space.md`). The Roadmap gate shows the team roadmap and claims; the Work plan gate shows overlap
  with teammates' claims; team-required gates join matching features; teammates may be asked to review at Code review
  (mirrored, advisory by default); the Merge gate uses the code host's merge queue and required reviews. Each person
  still decides their own factory's gates.
- **Added gates** (`extensible-flow.md`). A flow can add gates between built-in ones, with the same five moments, brief
  and move kinds; nothing here changes for them.

## 11. Proposed in this revisit — for review

| # | Proposal | Why |
|---|---|---|
| **P1** | **Where reject goes.** By default a reject replaces the artifact with a fresh author **at the same gate**. The note may name an **earlier gate** of the same feature as the target. At **Concept** and **Merge**, the target may also be **the roadmap** — the feature leaves the lane and the Roadmap gate re-opens. Verification's reject targets implementation on the current code (or Specification). This gives the built-in gates the `returns_to` that added gates already have. | today "reject" means different things at different gates; one rule, with named exceptions, is easier to learn and to audit |
| **P2** | **Re-crossing**: every gate after a reject's target opens again; nothing is carried across a change it did not see; briefs show what changed. | an approval is an approval *of something*; it must not silently cover new work |
| **P3** | **Fix-round cap** stays **2** by default; a factory may set it to 0–3 at the Roadmap gate; the brief always shows the cap and the rounds used. | some factories want every failure in front of a person; a hard upper bound prevents loops |
| **P4** | **Documentation and Merge stay separate**, even for small features; under delegation, Documentation is the gate most often crossed automatically. | the Documentation gate is where the knowledge base is completed — merging it into Merge would hide it |
| **P5** | The Design gate gives the designer **one answer round** to the critic before the person sees it; the brief shows the objection, the answer and whether the critic accepts it. | the person decides on a dialogue, not on a raw objection the author never saw |
| **P6** | **"Leave the lane"** — at any gate, *pause the factory* plus a Roadmap-gate decision is the way to stop a feature; it is not a move kind. | keeps the move kinds closed (`extensible-flow.md` §5) |

What this revisit settles from the open questions of `gates-why-how-what.md` §5:

| Old question | Answer |
|---|---|
| Does revise always go to the same author? | yes — the same conversation, with the note (`web-front-door.md` §5.5) |
| Is `restart` a re-run from the Implementation gate or from the Work plan? | from the restorable commit confirmed at the Implementation gate |
| Is the mitigation cap fixed? | P3 |
| Merge Documentation and Merge for small features? | no — P4 |
| Headless default? | always `waiting`; never an allowlist of auto-approvable gates |
| Which gates can the tail cover; does it include Merge? | Gates 4–8 by default, Merge only if explicitly included; any objection ends it |
| Is the Roadmap gate ever delegable? | never |
| Chaining features? | no chaining — each Roadmap approve admits one feature |
| Is the roadmap a persisted artifact? | yes — committed as the Roadmap gate's document |

## 12. Open questions

1. Should a person be able to **re-open an approved gate** without a reject at a later one — for example, to amend the
   specification mid-build?
2. Should the Code review gate offer **revise to the workers** (keep the code, fix the findings) alongside `restart`, as
   a distinct move kind from the reviewer's verdict?
3. When a re-crossed gate's artifact did not change, should the brief offer a **lighter** confirmation — and would that
   invite rubber-stamping?
4. Should triage be allowed to skip the **Documentation** gate for changes with no user-visible effect?

## 13. One sentence

KILN's flow admits one feature at a time at the Roadmap gate and walks it through nine gates — contract, build and prove,
release — where agents work, independent judges check, and a person decides every move with a complete brief and a
known consequence, until Merge ships it and the roadmap opens again.
