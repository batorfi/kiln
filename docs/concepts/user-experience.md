> Status: concept — **final** (2026-10-21, human@batorfi; previously a proposal, rev 10, 2026-10-18). Open decisions were
> settled on 2026-10-21 and are recorded where they apply; what remains open is listed in
> [`open-decisions.md`](./open-decisions.md). Building it is admitted only at the Roadmap gate.
> Type: concept
>
> Scope note: this doc describes the **KILN user experience at the conceptual level** — who uses KILN, what they
> are trying to do, how they should think about it, what they must always be able to know and do, and how it
> should feel. It deliberately contains **no interaction design and no UI**: no screens, layouts, controls,
> flows of clicks or visual language. Those belong to a later design phase that this doc is meant to guide.
> It builds on `vision.md` (the why) and `web-front-door.md` (the design); where they disagree, they govern.
>
> **How to review this draft.** Each section ends with a **Review** block listing the choices most worth
> challenging. Answer them inline, or strike and rewrite anything. Decisions you make are collected in the
> decision log (§15) so later revisions can trace them.
>
> Companion docs:
>   - The vision:                        `vision.md`
>   - The design behind it:              `web-front-door.md`
>   - Human gates — why & how & what:    `gates-why-how-what.md`
>   - The factory wiki:                  `factory-wiki.md`
>   - Factories anywhere:                `factories-anywhere.md`
>   - Teams and the team space:          `team-space.md`
>   - The bench:                         `the-bench.md`
>   - The director and Needs you:        `the-director.md`
>   - Configuration:                     `configuration.md`
>   - An extensible flow:                `extensible-flow.md`
>   - Insights:                          `insights.md`
>   - First run:                         `first-run.md`
>   - The flow, gate by gate:            `the-flow.md`
>   - In an existing codebase:           `brownfield.md`
>   - In a new codebase:                 `greenfield.md`
>   - Health:                            `health.md`
>   - Illustrative mockups:              `mockups/` — seventy-two high-resolution illustrations covering every capability below. They
>     are discussion aids, not design decisions; this doc governs where they differ.

# KILN — the user experience, as a concept

## 1. The experience in one paragraph

Using KILN should feel like **running a calm workshop, not supervising a swarm**. The human sets the
direction, makes the decisions that matter, and otherwise trusts the factory to work — because they can always
see what it is doing, why, and what it needs from them. KILN asks for the human's attention **only when a
decision is genuinely theirs**, gives them everything they need to make it well, and never takes a decision
on their behalf that they did not explicitly hand over. When the human walks away, nothing goes wrong; when
they come back, they know within moments where everything stands.

> **Review:** Is "calm workshop, not supervising a swarm" the right north star? An alternative framing is
> "a cockpit": more control and density, less calm.

## 2. Who uses KILN

Personas are framed by the **job** a person does in KILN, not by their title. One person often plays several.

| Persona | Job in KILN | What they care about most |
|---|---|---|
| **The Decider** | approves the roadmap and decides at the gates of one or more factories | understanding the work quickly enough to decide well; never being bypassed |
| **The Operator** | sets up the workshop: models, profiles, policies, budgets, workspaces | that the factory runs reliably, within limits, without surprises |
| **The Observer** | follows progress without deciding — a lead, a stakeholder, a teammate | an honest picture of where things stand and why |
| **The Auditor** | reconstructs what happened after the fact — for compliance, a post-mortem, or curiosity | a complete, trustworthy record: who decided what, on what evidence, and what left the machine |
| **The Curator** | keeps a factory's wiki: chooses sources, talks ingests through with the LLM, edits pages, acts on lint findings, refines the schema | a knowledge corpus that is current, traceable and actually used by roadmaps and gates |
| **The Evaluator** | judges whether models and policies are good enough — local versus cloud, which role on which model | measured outcomes, comparable across models and over time |

The primary persona is the **Decider**. Every other persona's needs are served without competing with the
Decider's attention.

> **Decided 2026-10-21** (decisions 22–23): the primary user of `kiln-v1` is an engineer in a **small team** — each
> engineer a Decider in their own sovereign workshop, the team meeting in a team space (`team-space.md`), which is part of
> `kiln-v1`. Several Deciders never share one gate: one decision per gate, with teammates' agreement as required reviews.

## 3. The human's jobs

From the vision: *shape the program, decide at the gates, watch the kiln.* Expanded into the jobs the
experience must support, in order of importance:

1. **Decide at a gate.** Understand the artifact, the evidence and the judges' verdicts; choose a move; explain
   it when sending work back.
2. **Know what needs me.** At any moment, know which decisions are waiting, in which factory, for how long, and
   which matter most.
3. **Shape the program.** Agree the roadmap with the director; revisit it between features; start, pause and
   retire factories.
4. **Stay oriented.** Know where every feature stands, what the factory is doing right now, and whether anything
   is wrong — without having to ask.
5. **Step in.** Steer a working agent, approve or refuse a risky action, pause, abort — and know that stepping in
   never silently changes a decision.
6. **Delegate deliberately.** Hand over the routine — the unattended tail after the Specification gate — knowing
   exactly what was handed over and that any objection still comes back.
7. **Configure with confidence.** Choose where models run, what may leave the machine and what may be spent,
   and know these choices are enforced.
8. **Understand afterwards.** Reconstruct any feature, decision or moment from the record alone.
9. **Learn and improve.** See where time goes, which gates keep sending work back, which judges catch real
   problems, and which models earn their place.
10. **Curate the knowledge.** Keep the factory's wiki current and traceable, so roadmaps and gates work from
    everything the factory has learned.

> **Review:** Is the order right? In particular, should "know what needs me" (2) rank above "decide at a gate"
> (1) once several factories run?

## 4. The mental model

The experience stands or falls on a small, stable set of ideas the human can hold in their head. KILN uses
**the same words everywhere** — in the product, the docs and the record.

### 4.1 The nouns

| Term (user-facing) | What it is | Internal term in `web-front-door.md` |
|---|---|---|
| **Workshop** | the home of all factories; owns the people, the policies, and the single place where every waiting decision is visible | workshop |
| **Team space** | where a team's personal workshops meet: team roadmap, claims, team knowledge, published progress, requests | team space (`team-space.md`) |
| **Bench** | a person's own place for research, notes and prototypes, beside their factories | bench (`the-bench.md`) |
| **Notebook** | a private, messy vault where thinking matures into knowledge by promotion | notebook |
| **Spike** | an ungated, time-boxed experiment in real code that ends in a measured report | spike |
| **Claim** | *this feature is being built by this factory, touching these files* — visible to the whole team | claim |
| **Host** | a machine a factory runs on — this machine, a team server, a cloud machine, a container — with its own models; online, sleeping or offline | host (`factories-anywhere.md`) |
| **Factory** | one independent line of work with its own roadmap, its own record and its own deciders | factory (*flow* means only the sequence of gates) |
| **Roadmap** | the ordered list of features a factory will build, approved at the Roadmap gate | roadmap |
| **Feature** | one item on the roadmap, walked through the nine feature gates | row |
| **Gate** | a point where the factory stops until a human decides; each asks one question | gate task |
| **Move** | the human's decision at a gate — approve, send back, stop, and the gate-specific variants | move |
| **Step** | one piece of work done by one agent in one role, between two gates | unit |
| **Role** | the kind of agent doing a step — researcher, designer, worker, reviewer, verifier … | role |
| **Judge** | an independent agent whose verdict informs a judged gate (Design, Code review, Verification) | line-of-defense role |
| **Director** | the factory's orchestrator: plans steps, orders them, keeps the line moving; never decides a gate | row and roadmap tasks |
| **The lane** | the factory's single line of work: one step at a time | lane |
| **The record** | everything that happened, in order, with who caused it and why | event stream |
| **Knowledge** | a factory's knowledge: pages an LLM writes and Curators shape, every claim traced to a source — kept as a wiki | factory wiki (`factory-wiki.md`) |
| **Workshop knowledge** | knowledge every factory shares — models, tools, conventions — that anyone can improve | workshop wiki |
| **Source** | a document the knowledge is built from — added by a Curator, never changed afterwards | raw source |
| **Curator** | the person responsible for a factory's knowledge | Curator |

### 4.2 The ideas behind the nouns

- **A gate is a promise.** The factory stops at every gate and stays stopped until a human moves. Nothing — a
  clock, a crash, a closed browser, a missing person — counts as a yes.
- **Agents propose, judges advise, humans decide.** Three distinct voices, never blurred. A judge's verdict is
  evidence for the human, not a decision.
- **One line per factory.** A factory does one thing at a time, in an order chosen to keep the right model
  ready. Parallelism comes from running several factories, not from rushing one.
- **Durable by default.** Work and waiting survive anything short of deleting the record. Leaving is always safe.
- **The record is the truth.** What KILN shows is derived from what KILN recorded. If it is not in the record, it
  did not happen; if it happened, it is in the record.

> **Decided 2026-10-21** (decision 15): **Factory**, **Feature** and **Step** are the words people read. Internally,
> *flow* means only the sequence of gates (`extensible-flow.md`); *row* survives only as the roadmap's data field and
> ids; *unit* only in code. "Task" stays avoided because it collides with work-plan tasks and durable tasks.
> **Knowledge** is what people see (*knowledge page*, *workshop knowledge*); *wiki* names how it is kept — an LLM wiki
> readable as an Obsidian vault — in docs and in technical names (decision 16).

## 5. Experience principles

These principles decide trade-offs in later design. When two conflict, the earlier one wins.

1. **Never a silent yes.** No decision is ever taken for the human without their explicit, recorded
   delegation — and the experience must make the difference between "a human approved" and "approved under
   delegation" unmistakable.
2. **Attention is the scarcest resource.** Ask the human only for what is genuinely theirs to decide. Everything
   the factory can handle, it handles; everything it cannot, it brings with the evidence attached.
3. **Decide with evidence, not with faith.** Every gate comes with a **gate brief** (§8): the context, the work,
   what it is measured against, the evidence, the risks, the options and their consequences — enough to
   understand and decide without digging, and depth on request.
4. **Always oriented.** At any moment, from anywhere in the experience, the human can tell where things stand and
   what needs them. No state is hidden, and none has to be inferred.
5. **Honest about state.** The experience shows what is true, including what is uncomfortable: a failed
   step, an exhausted budget, a blocked request, a judge that disagreed, a crash that was recovered. Nothing is
   rounded off to "fine".
6. **Leaving is safe; returning is fast.** Walking away never costs anything. Coming back always starts with a
   clear answer to "what happened while I was gone, and what needs me now?"
7. **Calm by default.** Ambient information stays ambient. Only things that need the human interrupt them, and
   interruptions are proportionate to what is at stake.
8. **Explainable everywhere.** Every state can answer "why?" — which decision, rule or event led here.
9. **The human's words carry weight.** A note sent back with a move is the next agent's instruction. The
   experience treats it as such: it is preserved, visible and traceable to what it changed.
10. **Same words, same meanings.** The vocabulary in §4 is used consistently in the product, the docs and the
    record.

> **Review:** Is the precedence order right? The sharpest trade-off is between **calm** (7) and **honest about
> state** (5): how loudly should KILN surface problems that do not yet need the human?

## 6. Attention: what deserves the human

KILN separates what it shows into four levels. Later design decides *how* each level is presented; this doc
decides *what belongs where*.

| Level | Meaning | Examples |
|---|---|---|
| **Needs you now** | the factory is stopped on the human | a gate waiting; a risky action awaiting approval; a blocked egress request; a downgraded judge awaiting consent; a budget reached |
| **Worth knowing** | something changed that the human may want to act on | a judge objected and stopped the unattended tail; a step failed and was retried; recovery after a crash; two factories touching the same files |
| **Ambient** | the normal pulse of work | which step is running, which model is loaded, progress through the gates, time spent |
| **On request** | detail for when the human asks | full transcripts, traces, metrics, the complete record, the egress audit |

Rules:

- **Only "needs you now" may interrupt**, and it always says *which factory, which gate, how long it has waited,
  and what is at stake*.
- **Waiting is not urgency.** A gate does not become more urgent by waiting; it becomes more visible. KILN never
  pressures a decision with a clock.
- **The judged gates and the Roadmap gate carry more weight** than the others in what KILN surfaces, because their
  decisions are the most consequential.
- **Notifications are information, never decisions.** No reminder can approve anything.

> **Review:** Should a waiting gate ever escalate (be surfaced more prominently) over time, or should waiting
> stay flat? Should some gates be configurable to "do not interrupt"?

## 7. Core experiences

Each experience is described by its **purpose** and the **outcomes it must guarantee** — not by how it is
carried out.

### 7.1 Starting a factory

*Purpose:* turn an intention into a factory with an approved roadmap.
*Guarantees:*
- the human agrees the roadmap with the director; nothing starts before the Roadmap gate is approved;
- the factory's profile (where models run), egress policy and budget are chosen **here**, visibly, as part of the
  same decision — not discovered later in settings;
- the human knows, before approving, what the factory will do first and what it will need from them.

### 7.2 Deciding at a gate

*Purpose:* the central act of KILN — a human decision made well and recorded honestly.
*Guarantees:*
- the gate is always presented with its **gate brief** (§8): orientation, the decision and what it commits to, the
  work, the yardstick, the evidence, risks and open issues, provenance, history, the options with their
  consequences, and the other actions available;
- only the moves that make sense at this gate are offered — the human never meets a move the gate does not
  have — and each is explained by what will happen next;
- sending work back requires saying why, and that note becomes the next step's instruction;
- the decision is deliberate: it cannot be made by accident, by default or by timeout;
- after deciding, the human knows what the factory will do next.

### 7.3 Staying oriented

*Purpose:* know where everything stands without asking.
*Guarantees:*
- for every factory: the current feature, the current gate or step, the model in use, and whether it is waiting
  on the human;
- for the workshop: what needs the human across all factories, and whether anything is wrong;
- the "why" behind any state is one question away.

### 7.4 Watching work happen

*Purpose:* see the agents work, live, when the human wants to — and only then.
*Guarantees:*
- the running step's work is visible as it happens, including what it reads, writes and runs;
- watching is optional and never required to keep the factory moving;
- what is shown live is the same as what is recorded — no live-only truth.

### 7.5 Stepping in

*Purpose:* intervene in running work without breaking the rules.
*Guarantees:*
- the human can **steer** a working agent, **approve or refuse** a risky action, **pause** after the current step,
  or **abort** a step;
- every intervention is recorded under the human's name;
- **stepping in never moves a gate.** Steering an agent, approving an action, or talking to the director is never
  mistaken for a gate decision;
- judges are never steered mid-verdict — their independence is not negotiable.

### 7.6 Delegating the routine

*Purpose:* let simple features run to the end without stopping at every gate.
*Guarantees:*
- delegation is offered only after the Specification gate, and the human sees exactly which gates it covers and
  whether it includes the merge;
- any judge's objection ends the delegation and brings the human back, with the reason;
- gates crossed under delegation are always shown and recorded as such, never as the human's live approval;
- delegation never carries over to another feature or another factory.

### 7.7 Working with the director

*Purpose:* shape how the factory works — the roadmap, the order of work, pauses — through conversation and
proposals.
*Guarantees:*
- the human can ask the director why things are ordered as they are, and get an answer grounded in the record;
- the director proposes (a roadmap change, a split, a plan); the human accepts or rejects;
- **roadmaps are shaped together**: the human's own inputs — goals, constraints, preferences, their own features — come
  first; the planner asks where they are thin and drafts alternatives; the human edits and pins rows, which the planner
  never silently changes; every row shows where it came from (`the-director.md` §4.3);
- **talking to the director never decides a gate**; decisions remain moves at gates.

### 7.8 Coming back

*Purpose:* return after an hour, a night or a crash and be productive immediately.
*Guarantees:*
- a clear account of what happened while the human was away: gates passed, judges' objections, failures,
  recoveries, what was spent;
- what needs the human now, in order of importance;
- after a crash: what was in flight, what resumed, what was interrupted, and confirmation that **nothing was
  approved by the restart**.

### 7.9 Running several factories

*Purpose:* keep several factories productive with one human's attention.
*Guarantees:*
- one place shows every decision waiting across factories, each still clearly belonging to its own factory and
  decided under its rules;
- the human can see how the shared machine is being used and why a factory is waiting for capacity;
- each factory's identity (its roadmap, profile, policy, deciders) is never confused with another's.

### 7.10 Choosing where models run

*Purpose:* decide local, private or cloud — per factory and per role — and trust that the choice holds.
*Guarantees:*
- the profile of every factory is always apparent wherever the factory is;
- the human can see, for any feature, **what left the machine** — to whom, under which rule, carrying what;
- a blocked request, a reached budget, or a proposed fallback for a judge comes to the human as a decision,
  never as a quiet workaround;
- a `local-only` factory can show that nothing left.

### 7.11 Understanding afterwards

*Purpose:* reconstruct any feature, decision or moment.
*Guarantees:*
- for any feature: every gate, who decided, on what evidence, with which notes; every step, on which model; every
  delegation, objection and recovery;
- any past moment can be seen as it was;
- the account comes from the record alone, and reads the same to the Decider, the Observer and the Auditor.

### 7.12 Learning from the factory

*Purpose:* improve how the factory is run.
*Guarantees:*
- the human can see where time goes, which gates send work back most, which judges catch real problems, how
  models compare on outcomes, and what waiting on humans costs;
- insights are presented as **evidence for the human's judgment**, never as automatic changes;
- every number shows how much data it rests on and opens to the events behind it; personal figures are visible only to
  that person, and people are never ranked (`insights.md`).

### 7.13 Keeping the wikis

*Purpose:* keep the factory's and the workshop's knowledge current, traceable and worth reading.
*Guarantees:*
- a factory's Curators decide which sources enter its wiki; anyone can add sources to the workshop wiki;
- the person who starts an ingest talks the takeaways through with the keeper and can steer it; the LLM then writes the
  pages directly, as in Karpathy's pattern — there is no approval step;
- every ingest ends with a **summary**: the takeaways, every page changed with its diff, new pages, contradictions
  resolved or left open — and every ingest, edit and filed answer can be **reverted** as a whole;
- Curators **edit factory pages directly** — in KILN, Obsidian or any editor; anyone can edit the workshop wiki; every
  edit is attributed, recorded and checked by lint;
- lint findings arrive as decisions for the people who keep the wiki — fix, dismiss with a reason, or source;
- the people who keep a wiki can see which pages roadmaps and gate briefs actually cite, and which are stale;
- every wiki can **always be read without KILN**: an Obsidian vault with wikilinks, plain markdown that reads cleanly
  in an editor such as Zed — KILN offers to open it in either.

### 7.14 Asking the wikis

*Purpose:* get an answer from everything the factory and the workshop know, with sources.
*Guarantees:*
- every answer cites pages, labelled by wiki, and every page cites its sources — down to the original document;
- the person who asked can file a good answer back as a page, if they may edit that wiki;
- asking never decides anything, and asking while a gate is open leaves the gate waiting;
- citations are wikilinks, so any cited page can be opened in Obsidian or an editor as it is.

### 7.15 Understanding how the code was built

*Purpose:* let a person explore and understand code that agents wrote — while it is being built and long after.
*Guarantees:*
- every feature leaves a **feature story** — how it came to be, gate by gate, including rejected designs, findings,
  failed rounds, restarts and the steers people gave — plus **technical overviews**, **explainers**, **how-to guides**,
  **reference** and **learnings**, written as the factory works, not at the end;
- every claim about code shows the code it rests on, **at a commit**, and every page can be traced to the record events
  it describes;
- a person can start **from a file** and find every page that explains it, or start from a feature, a question, or a
  learning;
- a page whose code has changed since it was written is marked **drifted** wherever it appears;
- learnings that hold beyond one factory reach the workshop wiki;
- all of it reads the same in Obsidian or Zed.

> **Review:** Is anything missing from the core experiences? Candidates left out on purpose: onboarding a
> brand-new user; importing an existing project mid-way; collaborating on one gate decision with several
> Deciders.

### 7.16 Placing and moving factories

*Purpose:* run each factory where its hardware, data and budget say it should — and change that safely.
*Guarantees:*
- where a factory runs is decided by a person at the Roadmap gate, with the fit shown — policy, models, capacity and
  cost — and is visible wherever the factory is;
- a `local-only` factory can only run on a local host;
- moving a factory is a recorded request that checks fit first, waits for a step boundary, and never approves, skips
  or reopens a gate — waiting gates arrive on the new host still waiting, with the same brief;
- a host that sleeps while its factories wait shows what it saves; a decision made meanwhile shows as *decided,
  applying on wake* until it is applied;
- a host that goes offline is shown at once, with what that means: work continues to the next gate, and nothing can be
  decided on that host until it returns.

### 7.17 Working in a team space

*Purpose:* build one product with teammates who each keep their own workshop.
*Guarantees:*
- the Roadmap gate shows the team roadmap beside the factory's own — which features are free, claimed, or depend on
  someone else's work; adopting a team feature makes a **claim** the whole team sees;
- overlap with a teammate's work is shown from the Work plan gate on, in both workshops, with the person to talk to; a
  protected path held by someone else blocks with *ask or wait*, never silently;
- a person can ask a teammate for an **opinion**, receive a **required review**, or name a **delegated decider** — every one
  signed, recorded on both sides, and none able to move a gate the person did not grant;
- answering a teammate's request shows exactly what their policy shared, and the answer is signed and mirrored to the
  code host's pull request where it applies;
- what a workshop publishes is visible to its owner before it goes, and defaults to *coordination*;
- the team roadmap changes only by its quorum, visibly.

### 7.18 Thinking at the bench

*Purpose:* research, read, sketch and prototype while factories work — and keep what was learned.
*Guarantees:*
- capture into the **notebook** is one deliberate act from wherever the person is — browser, editor, terminal, a KILN
  screen, voice — and nothing is ever captured without it;
- the notebook stays **private** and unruled; the keeper may link, flag contradictions and suggest promotion, never rewrite;
- **promoting** a note is a short, guided conversation that ends in pages the author chose to write, in the tier they chose.

### 7.19 Handing research to the factory

*Purpose:* let the factory do the legwork of research while the person decides.
*Guarantees:*
- a **research step** shows its plan — sources, model, estimate, egress — before it runs, and can be cancelled;
- it never delays a feature step or a judge, and never changes code;
- its result arrives in the notebook with sources, confidence and what it could not find, labelled by origin and maturity.

### 7.20 Trying it in a spike

*Purpose:* prototype safely in real code and learn from it.
*Guarantees:*
- a **spike** starts with a question and a time box, in its own branch, and is labelled *ungated* everywhere;
- it can never reach `main` and never passes a gate; at its time box it stops and asks;
- concluding it produces a **spike report** with measured results, which can be promoted, shared, or proposed as a feature
  whose gates then start from that evidence.

### 7.21 Growing the roadmap from the bench

*Purpose:* turn what people learn into a better-founded roadmap — without the bench ever changing it.
*Guarantees:*
- any note, research result or spike report can become a **candidate**, with its links kept; the candidate list is visible
  to the factory's deciders and Curators, and is never the roadmap itself;
- the Roadmap gate shows **evidence and readiness** for every proposed feature, and offers *research this* or *spike this*
  without forcing either;
- after each merged feature, the Roadmap gate shows **what was learned since the last approval** and which queued features
  it affects;
- the director suggests research when it cannot size something; it never starts it.

### 7.22 Configuring hosts, models and agents

*Purpose:* set KILN up the way a team works — and change it safely.
*Guarantees:*
- configuration is plain, versioned files, and the front door edits the same files; secrets are never in them;
- every change is checked before it applies and names the problem when it fails — applying nothing;
- changes to how a factory runs apply from its next step; a running step is never altered;
- no configuration can weaken a judge, approve anything silently or let anything leave without a rule;
- a role change can be **tried on a past feature** before anyone depends on it; judge and team-shared roles need more than
  one person's say;
- every change is in the history with who made it and what it was before.

### 7.23 Adding a gate

*Purpose:* make KILN's flow match the team's SDLC conventions.
*Guarantees:*
- an added gate is defined in a file — question, artifact, author, judges, moves from the closed set with the team's own
  labels — and checked before it can be used;
- it can be **tried on a past feature** to see the brief a decider would have seen;
- each feature's flow is proposed with reasons and decided at the Roadmap gate; team-required gates are shown and cannot be
  dropped; a flow never changes for a feature in flight, though a gate can be added to it by decision;
- every added gate presents the full gate brief, and nothing about it can weaken the gate contract.

### 7.24 Getting started

*Purpose:* go from install to a first factory waiting at its first Roadmap gate in under an hour (`first-run.md`).
*Guarantees:*
- nothing leaves the machine during setup unless a remote provider is explicitly added;
- what the machine can run is measured and said plainly; every model is checked before a role can use it, and setup does
  not finish without a judge on the strongest model;
- every default — storage location, profile, flow, retention — is shown before it applies, and everything setup writes is
  plain files that can be read and changed later;
- Spec Kit is adopted if the repository uses it, or added only with approval, and the constitution every gate measures
  against is confirmed or drafted and approved before the first roadmap;
- the first knowledge base comes from the repository's own documents, readable in Obsidian or an IDE from its first page;
- setup can be interrupted and resumed, and any step redone later; it is recorded as the start of the workshop's record;
- the first real act is a decision at the Roadmap gate — or, first, a read-only demo of a whole feature; a team can be
  started or joined at the end or any time after, and joining never loosens the workshop.

## 8. The gate brief: rich context at every gate

A gate is the moment KILN hands a decision to a human. The quality of that decision depends on what the human
can see and understand at that moment. So **every time a gate is presented, it comes with a gate brief**: a
complete, self-contained account of the context, the decision, the options and the actions available. The brief
is a concept, not a screen — it defines *what the human must be able to read and understand*, and later design
decides how to present it.

### 8.1 Rules

1. **No gate without its brief.** A gate is never presented as a bare request for a yes or no. Wherever a gate
   appears — in the list of things waiting, in a notification, in the factory's own view — it carries at least the
   **brief's headline** (§8.3), and a **move can only be made where the full brief is available**.
2. **Self-contained.** The brief can be understood by someone who did not watch the work happen, has been away for
   days, or is new to this factory. It never assumes the human remembers earlier context.
3. **Layered.** It starts with what the human needs to orient and decide, and lets them go as deep as they want —
   down to the full artifact, every finding, every transcript — without leaving the brief.
4. **Same shape at every gate.** Every brief has the same parts in the same order (§8.2), so the human learns it
   once. What changes from gate to gate is the emphasis (§8.5), not the structure.
5. **Honest about gaps.** If a part is missing — a judge did not run, a test could not execute, a source was
   unavailable, a budget stopped a step — the brief says so explicitly. An absent section is never silently
   omitted.
6. **Complete before it is presented.** A gate opens for the human only when its brief is assembled. If evidence is
   still being produced, the gate is not yet waiting for the human, and the experience says what it is waiting
   for instead.
7. **Recorded as seen.** The brief the human saw is part of the record, together with the move made from it. Anyone
   reviewing the decision later — including an Auditor — sees exactly what the Decider saw.
8. **Advice is labelled as advice.** Judges' verdicts and any factory recommendation appear as clearly attributed
   evidence, never as a pre-selected answer.

### 8.2 What a gate brief contains

| Part | Answers | Contents |
|---|---|---|
| **1. Orientation** | *Where am I?* | the factory, the feature, the gate and its place among the gates; what has been decided so far for this feature; how long the gate has been waiting; whether this is the first round or a return after a corrective move |
| **2. The decision** | *What am I deciding?* | the gate's question in plain words; what approving **commits to** and what it does **not**; what is at stake if the decision is wrong; whether this is a judged gate |
| **3. The work** | *What was produced?* | a plain summary of the artifact, then the artifact itself; on a return round, **what changed since last time** and **how the human's previous note was addressed** |
| **4. The yardstick** | *What is it measured against?* | the earlier approved artifacts this one must honour — the concept, the specification, the work plan — and how each requirement maps to the work and the evidence; **context from the wiki** — constraints, prior decisions, past incidents — with citations |
| **5. The evidence** | *Is it right?* | the judges' verdicts with their reasoning and findings, by severity; test and verification results; automatic fix rounds and their outcomes; anything the factory checked and how |
| **6. Risks and open issues** | *What should worry me?* | assumptions the agents made; questions they could not resolve; disagreements between author and judge; what could not be done (a missing source, a blocked request, an unavailable model); cited wiki pages that are **stale or contradicted** |
| **7. Provenance** | *Who did this, and how?* | the steps taken, by which roles, on which models and where they ran (local, private, cloud); the human interventions during the work — steering, approved or refused actions; time and cost; what left the machine for this work |
| **8. History** | *How did we get here?* | earlier rounds at this gate, with their moves and notes; related decisions at earlier gates; delegation state — and, if delegation was in force, **why this gate stopped for the human** |
| **9. The options** | *What can I decide, and what happens then?* | every move this gate allows, each with its meaning, its **consequence** (what the factory will do next, how far back the work goes, what is kept and what is redone), its cost in time, and whether a note is required; the moves this gate does **not** have, and why |
| **10. Other actions** | *What else can I do before deciding?* | actions that do not decide the gate (§8.4), each clearly marked as not a decision |

### 8.3 The headline

The headline is the brief in a few lines — the minimum that travels with a gate wherever it appears:

- **factory, feature and gate**, with the gate's question;
- **how long it has waited** and whether it is a return round;
- **the evidence in one line** — for example "all judges agree", "code reviewer objects: 2 major findings",
  "verification failed after 2 automatic fix rounds";
- **the moves available**;
- **anything that makes this gate unusual** — a gap in the evidence, a stopped delegation, a blocked request, a
  budget reached.

The headline is enough to understand what is waiting and how much attention it needs. It is never enough to
decide: deciding always happens with the full brief.

### 8.4 Actions besides deciding

At a gate the human can do more than choose a move. These actions are always available from the brief, and none
of them settles the gate:

- **Read deeper** — the full artifact, the full findings, the transcripts of the steps that produced the work, the
  relevant part of the record.
- **Ask** — put a question to the director or about the work ("why was this approach chosen?", "which requirement
  does this test cover?"). An answer that needs an agent to do work runs as a step of its own, visible and
  recorded, and the gate keeps waiting.
- **Request more evidence** — ask for an additional check, a second judge, or a judge from another model family,
  where the factory's policy allows it. The estimated time and cost are shown before it runs; it runs as a recorded
  step within the factory's budget. The gate stays open; the brief is updated when the evidence arrives, and the update
  is marked as such. **Evidence is additive**: a new verdict never replaces or hides an earlier one, so asking again can
  add a *yes* but never erase a *no*. Only models the factory's policy allows are used; a request that would need egress
  becomes a policy stop, and changing the profile is a Roadmap-gate decision.
- **Ask what KILN would do** — only on request: the answer runs as a recorded planner step, labelled as the planner's
  opinion, shown apart from the evidence and never in the headline. The brief itself never recommends a move.
- **Leave it waiting** — decide later. Waiting has no penalty and no deadline that decides for the human.
- **Hand it over** — pass the decision to another person allowed to decide this factory's gates, with a note.
  Available once a workshop has more than one person; hidden in a one-person workshop.
- **Pause or stop the factory** — when the issue is bigger than this gate.

Every one of these actions is recorded, and the brief shows what was done while the gate was open.

### 8.5 Emphasis per gate

*For built-in gates, as below; for added gates, from the `brief.emphasis` in their definition (`extensible-flow.md` §4). The
Roadmap gate brief also shows the **flow** proposed for each feature, with reasons and any team-required gates.*

The structure is fixed; the emphasis follows the gate's question.

| Gate | The brief puts first |
|---|---|
| **Roadmap gate** | the features, their order and dependencies; what changed since the last approval; **the wiki context behind the proposal, with citations**; **evidence and readiness per proposed feature** (ready · thin · unknown), unproven assumptions, and **what was learned since the last approval** from the bench; what the next feature needs from the human; the factory's profile, egress policy, budget — and **where it runs**, with the fit of each candidate host |
| **Concept gate** | the problem, the premises and the scope; the research it rests on; what is explicitly out of scope |
| **Design gate** | the proposed structure and its alternatives; the architecture critic's objections and how the design answers them |
| **Specification gate** | what "done" means, requirement by requirement; how each will be verified; that this is where the unattended tail can be armed, and what arming it would cover |
| **Work plan gate** | the pieces and their order; the model order this implies and its expected cost in time and swaps; **overlap with teammates' claims** |
| **Implementation gate** | the restorable starting point; the size of the work ahead; whether it is still one feature, and what a split would look like |
| **Code review gate** | the changes, mapped to the specification; the code reviewer's findings by severity; what `revise` (workers fix on the current code) and `restart` (rebuild from the restorable commit) would each redo |
| **Verification gate** | requirement-by-requirement results; the automatic fix rounds already attempted and what they changed; the verifier's diagnosis |
| **Documentation gate** | what the documentation now says, compared with what was built |
| **Merge gate** | the whole feature end to end — every gate's decision and by whom; open risks carried forward; what left the machine; what merging will do; **what the feature added to the wiki**, starting with its feature story; in a team: **required reviews and checks, base drift, the code host's merge-queue position, and what will be published** |

### 8.6 What the brief must never do

- **Pre-select a move** or make one option easier to take without reading than another.
- **Hide disagreement** — a judge's objection is never summarised away.
- **Replace the artifact** — summaries help orient, but the actual work is always one step away.
- **Overwhelm by default** — depth is available, not imposed.
- **Change after the decision** — the brief recorded with the move is the one the human saw.

> **Decided 2026-10-21** (decisions 18–21): the brief never recommends a move — KILN gives its opinion only when asked,
> labelled and apart from the evidence; requests for more evidence are additive, costed and policy-bound, never capped by
> count; they never reach a model the factory's policy forbids; hand-over arrives with multi-person workshops.

## 9. Trust and safety in the experience

What the human must be able to rely on, as properties of the experience itself:

- **The rules cannot be bypassed through the experience.** Whatever the presentation, a gate is settled only by
  a deliberate move from someone allowed to decide it.
- **Identity is real.** Every decision is attributed to the person who made it, and only people allowed to
  decide a factory's gates can.
- **Delegation and automation are always labelled.** The human can always distinguish their own decisions, their
  delegated ones, and the factory's own actions.
- **Policy is visible where it applies.** Where a model runs, what may leave, and what may be spent are apparent at
  the point where they matter — not hidden in configuration.
- **Problems are surfaced, not smoothed over.** Failures, objections, blocked requests and recoveries are shown
  plainly.
- **Privacy is respected inside the experience.** Content such as transcripts is available to those entitled to it,
  and never leaks into places meant for summary, export or sharing.

> **Review:** Do we need explicit roles and permissions (Decider, Operator, Observer) in the first version, or is
> a single trusted local user enough until teams arrive?

## 10. How it should feel

| Quality | Meaning | Not |
|---|---|---|
| **Calm** | quiet when things are fine; clear when they are not | silent about problems, or noisy about non-problems |
| **Confident** | the human trusts what they see and what they decide | reassuring without evidence |
| **Serious** | decisions feel like decisions — weighty where they matter | bureaucratic, or full of ceremony at low-stakes gates |
| **Transparent** | every "why" has an answer | overwhelming detail by default |
| **Respectful** | of the human's time, judgment and words | presumptuous — deciding "for convenience" |
| **Crafted** | the kiln metaphor gives a sense of care and patience | whimsical or cute at the cost of clarity |

> **Decided 2026-10-21** (decision 17): the metaphor stays in the **name, the brand and the docs** (`kiln-analogy.md`).
> The product speaks plainly — factory, gate, step, record; no *firing*, *chamber* or *heat* in the UI or in briefs.
> *Workshop* stays: it is a plain word for the place where people work.

## 11. Language and voice

- **Plain words first.** Gates are named by what they decide (§4, and `web-front-door.md` §3.1). Internal terms —
  rows, units, durable tasks, outbox, leases — never reach the human.
- **Questions, not codes.** A gate presents its question ("Is this the right structure?"), not its number.
- **Actors are always named.** "Approved by *you*", "approved under *your delegation of …*", "objected by *the code
  reviewer on model X*" — never a passive "was approved".
- **Honest verbs.** "Waiting for you", "blocked by policy", "interrupted by a crash and resumed" — not "pending",
  "error", "processing".
- **One language across product, docs and record.** A word in the experience means the same in the record.

> **Decided 2026-10-21** (decision 25): **direct and plain** — second person, short sentences, active voice (*Code review
> is waiting for you*), no hedging and no cheerleading. In a team, *you* is always the person reading; others are named.

## 12. Experience across scales

The same concepts must work from the smallest to the largest setup, without a mode switch:

| Scale | What changes in the experience | What does not |
|---|---|---|
| **One person, one factory, local only** | the workshop is nearly invisible; everything is about one roadmap | gates, moves, the record |
| **One person, several factories** | "what needs me" spans factories; capacity becomes visible | each factory's rules and identity |
| **A team sharing a workshop** | who may decide which factory; whose decision it was | the meaning of every move |
| **Engineers at the bench** | notebook, research steps and spikes beside the factories; promoted knowledge with origin labels | the gates decide; bench output is context |
| **Personal workshops with a team space** | the team roadmap, claims and overlap, teammates' requests, published progress | each workshop's gates and rules are its own |
| **Factories on several hosts** | where each factory runs, host health and sleep, moves between hosts | the gates, the record, one place to decide |
| **Hybrid or cloud models** | where models run and what left becomes part of orientation and of gate evidence | the human decides; policy is enforced |

> **Review:** Is the team case in scope for the first experience concept, or should it be a follow-up doc?

## 13. Anti-goals

The experience deliberately does **not**:

- **gamify** throughput — no streaks, scores or pressure to approve faster;
- **optimise for approval speed** at the expense of understanding;
- **hide the machine** — models, swaps, costs and policy are part of the truth, not noise;
- **pretend to be autonomous** — it never presents delegated or automated outcomes as if a human had decided;
- **become a chat app** — conversation with the director exists, but decisions are never made in conversation;
- **require constant watching** — the factory must be safe to leave.

> **Review:** Anything here you would *want* — for example, any form of approval-speed metric for teams?

## 14. Open questions

Collected for review; each needs a decision before the interaction design phase.

1. ~~Primary persona and the solo-versus-team balance (§2, §9, §12).~~ Decided 2026-10-21 — decision 23.
2. ~~User-facing vocabulary: Factory, Feature, Step (§4).~~ Decided 2026-10-21 — decisions 15 and 16.
3. ~~Whether waiting gates ever escalate, and whether interruptions are configurable per gate (§6).~~ Decided 2026-10-21 —
   decision 24.
4. ~~Onboarding and the very first factory as its own core experience (§7).~~ Answered by `first-run.md`.
5. ~~Several Deciders collaborating on one gate.~~ Decided 2026-10-21 — decision 22.
6. ~~How much of the kiln metaphor reaches the experience (§10).~~ Decided 2026-10-21 — decision 17.
7. ~~Direct versus neutral voice (§11).~~ Decided 2026-10-21 — decision 25.
8. ~~Whether KILN offers its own recommended move at a gate, and the limits on requesting more evidence (§8).~~ Decided
   2026-10-21 — decisions 18–21.
9. ~~Whether the Pi-integrated terminal experience (r9) remains a supported secondary surface.~~ Decided 2026-10-21 —
   see decision 14.
10. ~~Accessibility and language commitments.~~ Decided 2026-10-21 — decision 26.

## 15. Decision log

| # | Date | Decision | Section | Decided by |
|---|---|---|---|---|
| 1 | 2026-10-16 | The user experience is a local web front door; Pi powers the agents (from `web-front-door.md`) | §1 | human |
| 2 | 2026-10-16 | The pre-lane gate is called the **Roadmap gate**; the nine feature gates have plain names | §4, §11 | human |
| 3 | 2026-10-16 | Gate 5 is called the **Implementation gate** | §4 | human |
| 4 | 2026-10-16 | Every gate is presented with a **gate brief**: rich, self-contained context, the options and their consequences, and the other actions available; a move can only be made where the full brief is available | §8 | human |
| 5 | 2026-10-17 | Every factory keeps a **wiki** in Karpathy's LLM Wiki pattern, maintained by an LLM and curated by **Curators**; the wiki is context, never authority | §2, §4, §7.13–7.14, §8 | human |
| 6 | 2026-10-17 | The wikis **follow Karpathy**: the LLM writes directly, with no approval step | §7.13 | human |
| 7 | 2026-10-17 | **Curators may edit** factory wiki pages directly | §7.13 | human |
| 8 | 2026-10-17 | A **workshop wiki** sits alongside the factory wikis, and **anyone** in the workshop can edit it | §4, §7.13 | human |
| 9 | 2026-10-17 | Factories write **implementation knowledge** into their wikis as they build — feature stories, overviews, explainers, how-tos, reference, learnings | §7.15 | human |
| 10 | 2026-10-17 | Factories can **run anywhere** — on any host — placed by people at the Roadmap gate, movable, sleeping while they wait | §4, §7.16 | human |
| 11 | 2026-10-17 | Teams work in **personal workshops joined by a team space** (git repository first; team roadmap by quorum; advisory claims; required reviews mirrored in the code host; coordination publishing by default; personal keys plus identity provider) | §4, §7.17 | human |
| 12 | 2026-10-18 | The **bench** — notebook, research steps and spikes — is adopted | §4, §7.18–7.20 | human |
| 13 | 2026-10-18 | The bench feeds roadmaps through a **candidate list**, evidence and **readiness** at the Roadmap gate, and *what we learned since the last approval* | §7.21, §8.5 | human |
| 14 | 2026-10-21 | The Pi-integrated terminal surface (r9) is **retired**; the terminal surface is the **`kiln` CLI** — status, Needs you, the gate brief as text and moves, under the same rules as the browser | §14 Q9 | human |
| 15 | 2026-10-21 | **Factory, Feature, Step** are the user-facing words; internally *flow* means only the sequence of gates, *row* only the roadmap field, *unit* only code | §4.1 | human |
| 16 | 2026-10-21 | People see **Knowledge** (knowledge page, workshop knowledge); *wiki* names the format in docs and technical names | §4.1 | human |
| 17 | 2026-10-21 | The kiln metaphor stays in the **name, brand and docs**; the product speaks plainly | §10 | human |
| 18 | 2026-10-21 | The brief **never recommends a move**; KILN's opinion only when asked, as a labelled planner step shown apart from the evidence | §8.4 | human |
| 19 | 2026-10-21 | **Request more evidence** is additive (never erases a verdict), costed before it runs, bounded by budget and policy, not by a count | §8.4 | human |
| 20 | 2026-10-21 | Extra evidence uses only models the factory's policy allows; egress becomes a policy stop | §8.4 | human |
| 21 | 2026-10-21 | **Hand it over** arrives with multi-person workshops, hidden in a one-person workshop | §8.4 | human |
| 22 | 2026-10-21 | **One decision per gate**: the first committed move wins and later moves are refused with *decided by …*; when several people must agree, that is a set of **required reviews** — recorded evidence that must exist before *approve* is offered — never several settling moves; no quorum gates in `kiln-v1` | §7, §8.4, §12 | human |
| 23 | 2026-10-21 | The primary user is an engineer in a **small team**: personal workshops joined by a team space, both parts of which are in `kiln-v1` (roadmap r38, r39); shared hosts and team bench work stay in `kiln-v1.x` | §2 | human |
| 24 | 2026-10-21 | Waiting gates **never escalate** and never time out; each person chooses which gate kinds may interrupt them; Needs you shows how long each has waited; Health may note unusually long waits as information | §6 | human |
| 25 | 2026-10-21 | The voice is **direct and plain**: second person, active, no hedging or cheerleading; in a team *you* is the reader and others are named | §11 | human |
| 26 | 2026-10-21 | **Accessibility and language**: everything readable without colour, full keyboard operation, WCAG 2.2 AA for the front door, a screen-reader-friendly CLI, all text localisable (English first, no strings in code) | §14 Q10 | human |
| 27 | | *(your decisions from this review)* | | |

## 16. One sentence

The KILN experience lets one human run a calm, trustworthy software workshop: it asks for their attention only
when a decision is truly theirs, gives them the evidence to make it well, never decides in their place, and always
lets them leave safely and return knowing exactly where things stand.
