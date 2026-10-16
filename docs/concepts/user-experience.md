> Status: concept draft for review (2026-10-16) — **not admitted**
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
> decision log (§14) so later revisions can trace them.
>
> Companion docs:
>   - The vision:                        `vision.md`
>   - The design behind it:              `web-front-door.md`
>   - Human gates — why & how & what:    `gates-why-how-what.md`

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
| **The Evaluator** | judges whether models and policies are good enough — local versus cloud, which role on which model | measured outcomes, comparable across models and over time |

The primary persona is the **Decider**. Every other persona's needs are served without competing with the
Decider's attention.

> **Review:** Is the Decider the right primary persona? For a solo engineer the Decider and the Operator are
> the same person; for a team they may not be. Should "several Deciders in one factory" be a first-class case,
> or an edge case?

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

> **Review:** Is the order right? In particular, should "know what needs me" (2) rank above "decide at a gate"
> (1) once several factories run?

## 4. The mental model

The experience stands or falls on a small, stable set of ideas the human can hold in their head. KILN uses
**the same words everywhere** — in the product, the docs and the record.

### 4.1 The nouns

| Term (user-facing) | What it is | Internal term in `web-front-door.md` |
|---|---|---|
| **Workshop** | the machine-wide home of all factories; owns the shared models, the policies, and the single place where every waiting decision is visible | workshop (supervisor) |
| **Factory** | one independent line of work with its own roadmap, its own record and its own deciders | flow |
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

> **Review:** User-facing words are the main choice here. Are **Factory** (not "flow"), **Feature** (not
> "row") and **Step** (not "unit" or "task") right? "Task" was avoided because it collides with work-plan tasks
> and durable tasks.

## 5. Experience principles

These principles decide trade-offs in later design. When two conflict, the earlier one wins.

1. **Never a silent yes.** No decision is ever taken for the human without their explicit, recorded
   delegation — and the experience must make the difference between "a human approved" and "approved under
   delegation" unmistakable.
2. **Attention is the scarcest resource.** Ask the human only for what is genuinely theirs to decide. Everything
   the factory can handle, it handles; everything it cannot, it brings with the evidence attached.
3. **Decide with evidence, not with faith.** At a gate, the human sees what was produced, against what it was
   measured, what the judges said, and what it cost — enough to decide without digging.
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
- the gate's question is stated plainly (§3.1 of `web-front-door.md`), together with the artifact under judgment,
  what it is measured against (concept, specification, plan), who produced it on which model, what the judges
  concluded, and what it cost;
- only the moves that make sense at this gate are offered — the human never meets a move the gate does not
  have;
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
- insights are presented as **evidence for the human's judgment**, never as automatic changes.

> **Review:** Is anything missing from the core experiences? Candidates left out on purpose: onboarding a
> brand-new user; importing an existing project mid-way; collaborating on one gate decision with several
> Deciders.

## 8. Trust and safety in the experience

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

## 9. How it should feel

| Quality | Meaning | Not |
|---|---|---|
| **Calm** | quiet when things are fine; clear when they are not | silent about problems, or noisy about non-problems |
| **Confident** | the human trusts what they see and what they decide | reassuring without evidence |
| **Serious** | decisions feel like decisions — weighty where they matter | bureaucratic, or full of ceremony at low-stakes gates |
| **Transparent** | every "why" has an answer | overwhelming detail by default |
| **Respectful** | of the human's time, judgment and words | presumptuous — deciding "for convenience" |
| **Crafted** | the kiln metaphor gives a sense of care and patience | whimsical or cute at the cost of clarity |

> **Review:** How much of the kiln metaphor should reach the experience itself (firing, chamber, heat, workshop)
> versus staying in the docs? The risk is charm over clarity.

## 10. Language and voice

- **Plain words first.** Gates are named by what they decide (§4, and `web-front-door.md` §3.1). Internal terms —
  rows, units, durable tasks, outbox, leases — never reach the human.
- **Questions, not codes.** A gate presents its question ("Is this the right structure?"), not its number.
- **Actors are always named.** "Approved by *you*", "approved under *your delegation of …*", "objected by *the code
  reviewer on model X*" — never a passive "was approved".
- **Honest verbs.** "Waiting for you", "blocked by policy", "interrupted by a crash and resumed" — not "pending",
  "error", "processing".
- **One language across product, docs and record.** A word in the experience means the same in the record.

> **Review:** Should the experience address the human directly ("waiting for you") or neutrally ("waiting for a
> decision")? Direct address is warmer for one person and awkward for teams.

## 11. Experience across scales

The same concepts must work from the smallest to the largest setup, without a mode switch:

| Scale | What changes in the experience | What does not |
|---|---|---|
| **One person, one factory, local only** | the workshop is nearly invisible; everything is about one roadmap | gates, moves, the record |
| **One person, several factories** | "what needs me" spans factories; capacity becomes visible | each factory's rules and identity |
| **A team sharing a workshop** | who may decide which factory; whose decision it was | the meaning of every move |
| **Hybrid or cloud models** | where models run and what left becomes part of orientation and of gate evidence | the human decides; policy is enforced |

> **Review:** Is the team case in scope for the first experience concept, or should it be a follow-up doc?

## 12. Anti-goals

The experience deliberately does **not**:

- **gamify** throughput — no streaks, scores or pressure to approve faster;
- **optimise for approval speed** at the expense of understanding;
- **hide the machine** — models, swaps, costs and policy are part of the truth, not noise;
- **pretend to be autonomous** — it never presents delegated or automated outcomes as if a human had decided;
- **become a chat app** — conversation with the director exists, but decisions are never made in conversation;
- **require constant watching** — the factory must be safe to leave.

> **Review:** Anything here you would *want* — for example, any form of approval-speed metric for teams?

## 13. Open questions

Collected for review; each needs a decision before the interaction design phase.

1. Primary persona and the solo-versus-team balance (§2, §8, §11).
2. User-facing vocabulary: Factory, Feature, Step (§4).
3. Whether waiting gates ever escalate, and whether interruptions are configurable per gate (§6).
4. Onboarding and the very first factory as its own core experience (§7).
5. Several Deciders collaborating on one gate: supported, deferred, or out of scope (§7, §11).
6. How much of the kiln metaphor reaches the experience (§9).
7. Direct versus neutral voice (§10).
8. Whether the Pi-integrated terminal experience (r9) remains a supported secondary surface, and how this concept
   applies to it.
9. Accessibility and language commitments to make at the concept level (for example: everything readable without
   colour; all text localisable).

## 14. Decision log

| # | Date | Decision | Section | Decided by |
|---|---|---|---|---|
| 1 | 2026-10-16 | The user experience is a local web front door; Pi powers the agents (from `web-front-door.md`) | §1 | human |
| 2 | 2026-10-16 | The pre-lane gate is called the **Roadmap gate**; the nine feature gates have plain names | §4, §10 | human |
| 3 | 2026-10-16 | Gate 5 is called the **Implementation gate** | §4 | human |
| 4 | | *(your decisions from this review)* | | |

## 15. One sentence

The KILN experience lets one human run a calm, trustworthy software workshop: it asks for their attention only
when a decision is truly theirs, gives them the evidence to make it well, never decides in their place, and always
lets them leave safely and return knowing exactly where things stand.
