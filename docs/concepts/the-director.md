> Status: concept — **final** (2026-10-21, human@batorfi; previously a proposal, 2026-10-18). Open decisions were
> settled on 2026-10-21 and are recorded where they apply; what remains open is listed in
> [`open-decisions.md`](./open-decisions.md). Building it is admitted only at the Roadmap gate.
> Type: concept
>
> Scope note: this doc explains **the director** — what it is, which parts are deterministic and which use an LLM — and
> **how engineers work with KILN day to day**: the mental model, the ways they interact with the director, and what the
> **Needs you** inbox contains and how it is ordered. It draws together `web-front-door.md` §5 and §9, `user-experience.md`
> §6–§8, and the bench, knowledge and team-space concepts. It is a concept, not a design or a spec.
>
> **Update (2026-10-20):** roadmaps are **shaped together** — the engineer's own inputs, a conversation with the planner and
> direct edits sit beside the planner's draft, with every row's origin shown (§4.3).
>
> Companion docs:
>   - The design:                `web-front-door.md` (§5 the task graph, §9 working with the orchestrator)
>   - The user experience:       `user-experience.md` (§6 attention, §7 core experiences) and `mockups/46`–`48`
>   - The bench and the roadmap: `the-bench.md` (§8)
>   - The record:                `the-record.md`
>   - The PRD:                   `../prd/kiln-prd.md` (DIR-1…4)

# KILN — the director, and working with KILN

## 1. In one paragraph

The director is **deterministic code with an LLM helper**. Its core — the roadmap and row tasks — is ordinary,
deterministic code: it decides *what happens next* mechanically, by rules: which step runs, in which order, on which model,
what a move means, when a fix round starts, when a gate opens. When it needs *content* — a roadmap proposal, a work plan,
a split, an explanation that requires judgment — it asks its LLM helper, the **planner**, which runs as an ordinary,
visible step on the lane and whose output is always labelled as a draft. And it **never decides a gate**: people do.
Engineers work with KILN the way a lead works with a careful production planner: they set direction, decide at gates, ask
questions, and accept or reject proposals — mostly from one place, **Needs you**.

## 2. Deterministic or LLM? Both — with a clear line

| The director… | How | Why |
|---|---|---|
| orders steps by dependency and model affinity | **deterministic** — the existing scheduler | predictable, cheap, testable; the same inputs give the same order |
| opens gates, assembles briefs from committed facts, applies moves | **deterministic** — gate and row tasks | a gate's mechanics must never depend on a model's mood |
| runs fix rounds, enforces the cap of 2, ends delegation on a veto | **deterministic** | rules, not judgment |
| acquires the lane, swaps models, checks policies and fit | **deterministic** | safety and cost are rules |
| answers factual questions about the factory | **deterministic** — computed from the record, queue and knowledge index, with citations | instant, no model, always true to the record |
| drafts a roadmap proposal, a work plan, a split, a reason per row | **LLM** — the **planner** role, run as a step | content needs judgment; it is labelled a draft and decided by a person |
| answers open questions that need synthesis (*what would make this ready?*) | **LLM** — an *explain* step, offered first | synthesis needs a model; the person confirms the cost |
| suggests research or a spike when it cannot size something | **deterministic detection** of a gap; **the person** decides whether to run it | the director never spends compute on its own initiative for open-ended work |
| decides a gate | **never** | only people decide — or a recorded delegation on a clean path |

**The line in one sentence:** the director's *mechanics* are deterministic; its *drafts* come from the planner and are
labelled as such; its *decisions* do not exist — people make them.

### 2.1 The planner

- A role like any other: instructions in `agents/planner.md`, bound in the tier map, run as a **step** — on the lane, below
  feature work when it is not on the critical path, recorded, durable.
- It reads **the engineer's roadmap inputs** (§4.3), the factory's knowledge, the candidate list, the record and the team
  roadmap; it writes **drafts** with a reason for every choice and citations for every reason — and says which of the
  engineer's inputs each row answers, and which it could not satisfy.
- Its drafts are checked deterministically before anyone sees them: dependencies resolve, claims and protected paths are
  respected, policy and placement fit — a draft that fails is sent back to the planner, never shown as if valid.
- It never changes code, never settles anything, never creates conversations for other roles.

### 2.2 Why not an LLM director

An LLM in charge of orchestration would compete for the single lane on every question, make the same situation play out
differently twice, and make *why did KILN do that?* unanswerable. A deterministic core keeps the factory **predictable,
explainable from the record, and cheap**, and confines judgment to places where a person reviews it.

## 3. The mental model for engineers

| KILN is… | You are… |
|---|---|
| a **production planner** (the director) that keeps the line moving by rules | the **owner**: you set direction and decide |
| a **crew** (roles on models) that does the work | the **reviewer of record** at every gate |
| **judges** that check the crew's work independently | the person who weighs their verdicts |
| a **record** that remembers everything | someone who can always ask *why* |
| a **bench** beside the line | a person who thinks, researches and prototypes |

What this means in practice:

- **You never have to drive it.** The director keeps every factory moving until it needs you; then it stops and waits.
- **You never have to watch it.** Everything that needs you comes to one place; everything else can wait for when you look.
- **You can always ask.** *Why this order? What is it doing? What changed?* — answered from the record, instantly.
- **You can always step in.** Steer a step, pause, abort, reorder at the next Roadmap gate — every intervention recorded.
- **It never acts for you.** No decision is made on your behalf without your explicit, recorded delegation.

## 4. How engineers interact with the director

| Interaction | Where | Who acts | What changes |
|---|---|---|---|
| **Decide a gate** | gate brief | you | the factory moves on — the only way a gate settles |
| **Shape the roadmap** | the roadmap, any time; the Roadmap gate | you and the planner, together | a new version of the proposed roadmap — never an admission (§4.3) |
| **Accept or reject a proposal** | Roadmap gate, Implementation gate (split), candidate list | you | the roadmap or work plan, by your decision |
| **Ask** | *Ask the director*, from anywhere | the director answers | nothing — answers are information |
| **Command** | buttons and commands: start, pause after step, abort step, arm delegation, move a factory | you | the lane — recorded, idempotent, never a gate |
| **Confirm a suggestion** | Needs you, candidate list | you | a research step or spike runs — at your choice |
| **Steer** | a running work step | you | the step's direction — recorded, never a gate |
| **Answer a question from a step** | Needs you | you | the step continues; nothing is decided |

### 4.1 Asking the director

*Ask the director* takes plain questions and answers in one of two ways — and always says which:

1. **Answered from the record** — instant, no model, with citations. Questions about state, order, history and cause:
   *why is Event backbone first?*, *what is the factory doing?*, *what changed since Tuesday?*, *who approved this?*,
   *why did delegation end?* The director computes the answer from the queue, the record's causation chains and the
   knowledge index; a sentence template phrases it.
2. **Needs a step** — for questions that require synthesis: *what would it take to make this candidate ready?*, *compare
   these two plans*. The director shows a small plan (role, model, sources, estimate) and runs an **explain step** only when
   you confirm. The answer arrives labelled as the planner's draft.

Talking to the director never moves a gate. *Approve it* typed in a conversation is answered with a link to the gate.

### 4.3 Shaping the roadmap together

A roadmap is not something the planner hands over for a yes or no. The engineer shapes it — with their own inputs, in
conversation with the planner, and by editing it directly — and the planner's draft is one voice in that work, not the
starting point it has to be.

**1. Your inputs — the roadmap brief.** A short, living document per factory that the engineer writes and the planner
must read first:

| Input | Example |
|---|---|
| **Goals** | *first runnable release: durable core, gates on the web, real local workers* |
| **Must-haves and must-nots** | *kill-and-resume before any UI work* · *no remote providers this quarter* |
| **Constraints** | a date, a dependency on another team, a freeze window, a budget, a host |
| **Order preferences** | *risky things early* · *one user-visible feature in every two* |
| **Appetite** | how large a feature may be before it should be split |
| **Your own features** | rows the engineer already has in mind, written in their own words |
| **Pointers** | knowledge pages, spikes, issues or notebook entries the planner should weigh |
| **The experience charter** | where the factory has one, the planner reads it with the brief: rows serving a journey cite its step ids, a journey with no row is flagged, and amendments are proposed here (`experience-charter.md` §6) |

The brief can be written before any draft exists, added to at any time, or grown out of the conversation below. Goals and
constraints worth keeping can be filed to the knowledge base as a *direction* page labelled *from a person*.

**2. A conversation with the planner.** A shaping session is a recorded conversation with the planner role:

- the planner **asks** where the inputs are thin or in tension — *the date and "kill-and-resume first" cannot both hold
  with three features ahead; which gives?* — and the answer becomes part of the brief;
- the engineer **asks back** — *why is r12 before r13?*, *what if billing export went first?* — answered from the record
  where possible, by the planner where it needs synthesis (§4.1);
- the engineer asks for **alternatives** — *a version that ships something user-visible this week* — and the planner drafts
  them side by side, each with its trade-offs.

**3. Direct edits.** The engineer can add, remove, reorder, split, merge or rename rows, or write a row from scratch.

- Rows the engineer writes or changes are labelled **from you**; the planner **never silently changes them** — it may
  propose a change, shown as a suggestion with its reason.
- The engineer can **pin** a row, an order or a constraint; every later draft must respect pins.
- Each edit or redraft makes a **new version** of the proposed roadmap; versions are kept and compared, so *what did I
  change, what did the planner change* is always answerable.

**4. Every version checked.** After each edit or redraft, deterministic checks run: dependencies resolve, pins and
constraints hold, claims and protected paths in a team are respected, readiness and flow are computed, the time ahead is
estimated against the factory's host, and — where there is a charter — the journey coverage map and the applicability of Experience design and UI review per row (`ui-flow.md` §6). A violation is shown at once, attributed to the edit or draft that caused it —
the engineer may keep an edit that breaks a planner preference, never one that breaks a rule.

**5. Then the decision.** Shaping never admits anything. When the engineer is ready, the Roadmap gate's brief is assembled
for **that version**, showing every row's origin — *from you*, *from the planner*, *from a candidate*, *from the team
roadmap* — and which inputs it answers; approve admits the next feature from exactly the version that was read. A move on
an older version is refused.

**Any time, not only at the gate.** The roadmap can be opened and shaped while the factory works; changes become the
proposal at the next Roadmap gate and never alter the feature in progress. In a team, shaping can propose changes to the
team roadmap, which the team space decides by quorum (`team-space.md` §6).

### 4.4 What the director tells you without being asked

- **At gates**, through briefs: what it did, why, and what each move would do next.
- **In Needs you**, when it needs a choice.
- **In *worth knowing***: corrections flagged for the next Roadmap gate, delegations ended, overlaps, recoveries.
- **In proposals**: a reason and citations for every row, every split, every order.
- **In the Feed**: anything you dropped in, sorted into drafted destinations you choose from — never a decision made for you (`the-feed.md`).

## 5. Needs you

**Needs you** is the one place that collects everything waiting on a person, across their factories, their workshop and
their team space. It is the heart of working with KILN: if Needs you is empty, nothing is waiting on you.

### 5.1 What can appear

| Kind | Example | Blocks | Source |
|---|---|---|---|
| **Gate decision** | Code review gate · kiln-v1 · r10 | that factory's lane | gate task |
| **Roadmap gate** | which features next · kiln-v1 | that factory's next feature | roadmap task |
| **Charter approval or amendment** | approve experience charter v1.0.0 · kiln-v1 (a charter amendment is taken at the Roadmap gate) | the factory's first Roadmap gate, or the amendment | charter task |
| **Risky action** | delete a tracked file · worker in step 2 | that step | tool approval |
| **Policy stop** | egress blocked · budget reached · judge unavailable | that step or lane | policy |
| **Question from a step** | a working agent asks how to proceed | that step | the step |
| **Delegated decision** | a teammate named you decider for their gate, for a time | their gate | team space |
| **Required review** | Zsolt asks you to review r10 before merging | their Merge gate condition | team space |
| **Team roadmap vote** | a change waiting for your signature in the quorum | the team roadmap change | team space |
| **Protected-path request** | Zsolt asks for `contracts/events/` | their adoption | team space |
| **Director suggestion** | *run research to size "Pin judges"* | nothing — optional | director |
| **Spike time box ended** | extend, conclude or abandon | that spike | bench |
| **Promotion suggestion** | *these notes look ready to promote* | nothing — optional | keeper |
| **Opinion request** | Anna asks your view on her Architecture | nothing — optional | team space |

### 5.2 Three sections

Needs you separates what is **blocking** from what is **optional**, so attention goes where it matters:

1. **Waiting on you** — something is stopped until you act: gates, the Roadmap gate, risky actions, policy stops,
   questions from steps, delegated decisions, required reviews, votes and requests teammates are blocked on, ended spike
   time boxes.
2. **Suggestions** — nothing is stopped; the director, the keeper or a teammate thinks you might want to act: research or
   spike suggestions, promotion suggestions, opinion requests.
3. **Worth knowing** — no action needed: corrections flagged, delegations ended, overlaps, recoveries, things shared.

### 5.3 What every item shows

Every item carries its **headline** (`user-experience.md` §8.3): what it is, which factory or teammate, the question, how
long it has waited, the evidence in one line, the available moves or choices — and **what is blocked by it**. Opening it
leads to the full brief or request; nothing can be decided from the headline alone.

### 5.4 Ordering

Within *Waiting on you*, by default: **judged gates and policy stops first** (their stakes are highest), then items blocking
**someone else** (a teammate waiting on your review), then by how long they have waited. The order is a convenience; it
never changes what an item means, and **waiting never decides anything** — an item does not become more urgent by waiting,
only more visible. People can sort, filter by factory or kind, or hand an item to another permitted person.

### 5.5 What Needs you never does

- decide, approve or expire anything;
- show an item it cannot back with a full brief or request;
- hide a blocking item behind a suggestion;
- interrupt for suggestions or *worth knowing* — only items *waiting on you* may notify, and only judged gates and policy
  stops break focus mode.

## 6. A morning working with KILN

1. **08:30 — candidates.** The candidate list shows a director suggestion: *run research to size "Pin judges"*. Zsolt
   confirms; the research step runs at 08:40 on spare lane time.
2. **08:44 — a merge.** r11 merges; the Roadmap gate re-opens and the planner drafts a proposal, checked deterministically.
3. **08:55 — Needs you.** Four items wait on him: the Roadmap gate, a budget stop in billing-service, a team roadmap vote,
   and a question from a handbook step. Suggestions: another research offer, Anna's opinion request, notes ready to
   promote. *Worth knowing*: the correction flagged overnight, the merge, the research result.
4. **09:00 — ask.** *Why is Event backbone first?* — answered from the record in under a second: the exporter depends on it,
   and its protected path is free since yesterday.
5. **09:05 — decide.** The Roadmap gate brief shows evidence and readiness per feature; he approves.
6. **09:10 — bench.** He opens his notebook while Event backbone's Concept step runs.
7. **11:30 — a risky action.** The worker wants to add a dependency; Needs you shows it with the policy and the worker's
   reason; he allows it.
8. **17:00 — leaving.** Needs you shows only suggestions; the factory keeps working to its next gate and will wait.

## 7. How it fits KILN's rules

| KILN rule | The director and Needs you |
|---|---|
| **Humans decide** | the director drafts and applies; only people decide — Needs you collects their decisions, never makes them |
| **No model approves its own work** | the planner drafts; deterministic checks and people review; judges are separate roles |
| **One lane per factory** | planner and explain steps are steps on the lane; factual answers use no model at all |
| **Everything recorded** | every proposal, question, answer kind, suggestion confirmed or declined is an event |
| **Explainable** | every director choice has a reason computed from rules or cited by the planner |

**New events:** `director.proposal_drafted`, `director.proposal_checked`, `director.question_answered` (*from record* or
*by step*), `director.suggestion_made`, `director.suggestion_confirmed`, `director.suggestion_declined`.

## 8. Open questions

1. ~~Tune Needs you's order?~~ **Decided 2026-10-21** (human@batorfi): **yes, per person** — oldest first by default, or teammates first, or by
   factory; ordering never hides an item and never changes what a gate needs.
2. ~~Should the planner run on the strongest model by default?~~ **Decided 2026-10-21** (human@batorfi): **yes, by default.** Its drafts shape the
   most expensive decisions, and its steps are rare and often run while the strongest model is already pinned for judges.
   An Operator may bind it lower in `tiers.yaml` (recorded); it stays a producer, so the judges' never-downgraded rule
   does not apply.
3. How many factual question templates should exist before a question falls through to an explain step?
4. ~~Should the planner be allowed to re-order rows the engineer wrote?~~ **Decided 2026-10-21** (human@batorfi): **only propose.** The
   deterministic check flags the broken dependency on the engineer's edit; the planner may propose a re-order with its
   reason; only the engineer applies it (§4.3).
5. ~~Limit alternatives per shaping session?~~ **Decided 2026-10-21** (human@batorfi): **one at a time, cost shown** — each alternative is a planner
   step with its estimated machine time shown before it runs; several asked for at once queue below feature work.

## 9. One sentence

The director is deterministic where it acts and LLM-assisted only where it drafts, it never decides — and engineers work
with it from one place, Needs you, which shows everything waiting on them, separates what blocks from what merely helps,
and never decides anything by itself.
