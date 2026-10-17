> Status: vision (proposal, rev 3, 2026-10-17) — **not admitted**
> Type: vision
>
> Scope note: this is the *why* and the *where to* of KILN, written for anyone deciding whether KILN is worth
> building, using or contributing to. It describes what KILN aims to be, not how it is built. The design
> behind it lives in `web-front-door.md`; the original concept in `concept.md`. Where this vision departs from
> the constitution (Principles III, VII and IX), it needs a Roadmap gate decision and constitution amendments
> before it governs anything.
>
> Companion docs:
>   - The design behind this vision:   `web-front-door.md`
>   - The factory wiki:                `factory-wiki.md`
>   - The original concept:            `concept.md`
>   - Human gates — why & how & what:  `gates-why-how-what.md`

# KILN — vision

## 1. The vision in one paragraph

**KILN is a software factory that runs on your own machine, where AI agents do the work and a human makes
every decision that matters.** You give it a roadmap; it walks each feature through ten clear gates — from
"is this worth building?" to "do we ship it?" — on local models by default — and on private or cloud models only where you choose. Every piece of work
survives a crash, every decision is recorded with who made it and why, and the whole process is visible,
live, in a browser on your own machine. Each factory keeps a wiki — written by an LLM, curated by engineers — on top
of a workshop wiki everyone shares, remembering everything it has learned and gives every roadmap its context. On a large enough machine, several of these factories run side by
side, sharing models and keeping the human's attention, not the hardware, as the only real limit.

## 2. Why KILN exists

AI can now write most of a feature. What it cannot do is be accountable for it. Teams adopting coding agents
face the same three problems:

- **Trust.** A model that writes code and then judges its own code is grading its own homework. Without
  independent judges and a human who signs off, "the agent said it's done" is not a quality standard.
- **Control.** Agents that run for hours make thousands of small decisions. Without clear points where a
  human decides — and where the process genuinely stops until they do — the human is reduced to reviewing
  a finished pile of changes they never shaped.
- **Ownership.** Cloud agents send your code, your prompts and your intent to someone else's servers, and bill
  you per token. For many teams and many codebases, that is not acceptable — or not affordable at scale.

KILN's answer is a factory with a **human at every gate**, **independent judges** that never review their own
work, and a substrate that is **local by default** — with every model call that leaves the machine chosen,
checked and recorded by a human's policy.

## 3. What we believe

1. **Humans decide; models work.** Agents research, design, write, review and verify. A human approves the
   roadmap and every gate. No model ever approves its own work, and no missing human ever counts as a yes.
2. **Independent judges hold the line.** Design, code review and verification are judged by separate agents on
   the strongest available model — never by the agent that produced the work.
3. **You decide where your models run.** Local by default: your code, prompts and decisions stay on your
   machine, and a feature costs machine time, not a token bill. Private or cloud models when you choose —
   for the roles you choose, under a policy that says what may leave and records everything that does.
4. **Work should be durable.** A crash, a reboot or a closed laptop interrupts a firing; it never loses one.
   A gate waits as long as the human needs.
5. **Everything is explainable.** Every decision, every model swap, every gate has a recorded cause and an
   actor. Any moment of a run can be reconstructed later.
6. **Calm, sequential work beats noisy parallelism.** Inside one feature, work happens one step at a time, in
   an order chosen to keep the right model loaded. Parallelism happens between factories, never inside one.

## 4. The process, in plain words

A feature passes through ten gates. Each gate asks the human one question.

| Gate | The human's question |
|---|---|
| **Roadmap gate** | Which features do we build, in what order? |
| **Concept gate** | Is this worth building, on these premises? |
| **Design gate** | Is this the right structure? |
| **Specification gate** | What exactly counts as done? |
| **Work plan gate** | In what pieces, and in what order, will it be built? |
| **Implementation gate** | Do we start building — from a safe, restorable point — and is this still one feature? |
| **Code review gate** | Is the code right, measured against the specification? |
| **Verification gate** | Does it actually work as specified? |
| **Documentation gate** | Do the docs describe what was actually built? |
| **Merge gate** | Do we ship this feature? |

The first four gates settle *what to build* before any code exists. The next three *build it and prove it*. The
last two *describe it and ship it*. The Roadmap gate sits above all of them and is the only gate that is never
automatic.

For simple features the human can shorten the path: triage skips the Concept and Design gates, and after
approving the specification the human can let the remaining gates pass automatically — as long as every
judge agrees. Any objection from a judge stops the line and hands it back to the human.

## 5. The human's role

KILN is designed around what the humans actually do, which is four things:

- **Shape the program.** Agree with the factory's director on the roadmap: which features, in what order,
  with what dependencies. Revisit it between features.
- **Decide at the gates.** Read what the agents produced and what the judges said, then approve, send back
  with a note, or stop. The decision is a deliberate act, recorded under the human's name.
- **Curate the knowledge.** Curators — engineers responsible for the factory's knowledge corpus — choose the
  sources that go into the factory's wiki, talk them through with the LLM, edit and correct pages, and keep the wiki
  healthy; everyone can improve the workshop wiki, so the
  director and every gate work from context that is current and traceable.
- **Watch the kiln.** See where every feature stands, what the agents are doing right now, which model is
  loaded, and where time is going — and step in when something looks wrong: steer a working agent, approve a
  risky action, pause, or abort.

Everything else — research, writing, coding, reviewing, verifying, maintaining the wiki, ordering the work,
loading and swapping models — is the factory's job.

## 6. The pillars

### 6.1 A local web front door

The human works in a **browser on their own machine**. KILN is the application; it shows the whole
process — roadmap, gates, live work, history — and accepts decisions only as deliberate, structured acts.
The browser is a window, never the source of truth: closing it changes nothing, and nothing is ever approved
because a screen was missing.

### 6.2 Durable agents and durable gates

Built on **Pi** and its **durable agent substrate**, every unit of work is a durable conversation and every
gate is a durable task. Work is saved before it is shown; a restarted machine resumes exactly where it
stopped — the agent mid-task, the gate still waiting, the director still knowing what comes next. Time spent
on a local model is expensive; KILN never throws it away.

### 6.3 Observable by design

Every meaningful change in the factory is an **event**, recorded in order, with who caused it and why. From
that one stream KILN builds everything it shows: the live view, the audit trail, metrics, traces and health
signals. It can answer the questions that matter — *where does the time go? which gate keeps sending work
back? are the judges catching real problems? what was happening when the machine went down?* — and it can
replay any past moment exactly. Observability is local too: nothing is exported unless the human chooses to,
and then only to their own machine.

### 6.4 One lane per factory, many factories per machine

Each factory runs **one feature at a time, one step at a time**, keeping the right model loaded and swapping
only when it must — because loading a model is the most expensive thing a local machine does. On a machine
with a large unified memory, several factories share one **workshop**: a common pool of loaded models, a fair
scheduler, and one place where the human sees every gate waiting for them. While one factory waits for a
human decision, another uses the machine. The human's attention, not the hardware, becomes the limit.

### 6.5 Local by default, open by choice

Out of the box, models run on the machine through Ollama and the only network traffic KILN makes is to
itself — provably. When a human configures it, KILN can also use models on **private infrastructure** (a team
GPU host) or from **cloud providers**, chosen per factory and per role: for example, local models for the
high-volume work and a frontier model for the judges, or judges from a different model family than the
author so they do not share its blind spots. Every model call that leaves the machine is checked against the
factory's policy before it goes, attributed after, and counted against a budget. KILN itself — the record,
the decisions, the web front door — always stays local.

### 6.6 A wiki for every factory, and one for the workshop

Every factory keeps its own **wiki**, and the workshop keeps one more for what all factories share — following the LLM
Wiki pattern published by Andrej Karpathy: raw sources that never change, a set of interlinked pages an LLM writes and
keeps current, and a schema that says how. Curators add a factory's sources — design notes, decisions, incidents,
customer requests, and digests of what the factory itself learned — talk the takeaways through with the LLM, and edit
pages whenever a person says it better; anyone can improve the workshop wiki. As factories build, they write back
what they learned and how the code was made — feature stories, technical overviews, explainers and how-to guides,
grounded in the code and the record — so code written by agents never becomes code nobody understands. Every wiki is a plain Obsidian vault,
readable in any editor. The director reads the wikis when it proposes a roadmap; gate briefs cite them. Knowledge compounds instead of leaving with each feature — and it stays **context, never
authority**: every claim traces back to a source, and no page ever decides a gate. (`factory-wiki.md`)

### 6.7 Factories anywhere

A factory can run wherever its hardware, data and budget say it should: on the machine in front of you, on a team GPU
server, on a virtual machine in your own cloud account, in a container. People still decide every gate from **one
workshop**; each factory keeps its single lane, its durable record, its wiki and its gates wherever it runs, and can
**move** between machines without losing a step. Because gates hold no model while they wait, a rented machine can
**sleep while its factories wait for a human** and wake when someone decides — paying only for work. The all-in-one
machine stays the default; everything else is a choice you make and the record shows. (`factories-anywhere.md`)

## 7. What KILN is not

- **Not an autopilot.** It never ships anything a human has not approved, directly or by explicit delegation.
- **Not a hosted service.** There is no KILN account and no KILN backend. You run it — on your laptop, your servers,
  or machines in your own cloud account; cloud models and cloud machines are options you configure, never a
  dependency.
- **Not a swarm.** It does not run dozens of agents at once on one feature; it runs the right agent, on the
  right model, at the right time.
- **Not a dashboard bolted onto an agent.** The process, the gates and the record come first; the web front
  door shows them.
- **Not a replacement for engineering judgment.** It concentrates the human's judgment where it has the most
  leverage — at the gates — instead of spreading it thinly across every line of output.

## 8. Who it is for

- **Engineers and small teams** who want agents to do real feature work on their own hardware, under their
  own control.
- **Organisations with sensitive code** that cannot send it to a hosted model, or need an auditable record of
  who approved what.
- **Teams evaluating local models** who need to see, measurably, whether those models are good enough —
  and where independent judges compensate for their weaknesses.
- **Engineers who own a system's knowledge** — Curators who want the context behind every roadmap to be current,
  traceable and maintained without the usual decay of a team wiki.
- **Teams that outgrow one machine** — who want factories on team servers or rented machines, one workshop for
  everyone, and placement that respects where their code may go.
- **Teams mixing local and cloud models** who want each role on the right model, with a hard line on what
  data may leave and a record of everything that did.

## 9. Where KILN is going

The path is a sequence of horizons, each admitted at the Roadmap gate in its own time.

| Horizon | What it delivers | Where it stands |
|---|---|---|
| **Foundation** | the single-lane runtime, the gates, the record, a real local-model worker, readiness checks | built and verified |
| **Pi integration** | KILN running inside Pi with its gates and roadmap on Pi's interface | built (r8), real UI in flight (r9) |
| **Web front door on durable agents** | KILN as its own local application; agents and gates as durable tasks on Pi's durable substrate | this vision |
| **Event-based observability** | the event stream, its views, metrics, traces, health, replay | this vision |
| **Roles and the director** | the full set of role agents on their model tiers; a director that turns an approved specification into gated work | planned (r10, r11), reshaped by this vision |
| **The workshop** | several factories on one machine, sharing a model pool, with one place to decide | this vision |
| **The factory wiki** | an LLM-maintained, Curator-curated wiki per factory that gives roadmaps and gates their context | this vision |
| **Factories anywhere** | one workshop, factories on any host — laptop, team server, cloud VM, container — placed by people, moved without losing a step, sleeping while they wait | this vision |
| **Models beyond the machine** | private and cloud models when configured: per-role routing, egress policy, budgets, an audit of what left the machine | this vision |
| **The `kiln-v1` release** | a runnable factory a newcomer can install and point at a feature | the goal |

KILN builds on Pi's durable substrate while it is still experimental, and evolves with it as it stabilises.

## 10. How we will know it works

- **Humans decide where it matters.** Most human time is spent at the gates where it changes outcomes, and
  almost none is spent babysitting agents.
- **The judges earn their keep.** Problems are caught at the Design, Code review and Verification gates, not
  after merge — and the record shows it.
- **Nothing is lost.** A crash costs minutes of rework at most, never a feature.
- **Every decision is explainable.** For any merged feature, anyone can see who approved each gate, what the
  judges said, and what the agents did — rebuilt from the record alone.
- **Local is enough — and where it is not, the record says so.** Features of real size reach the Merge gate
  on local models; where a team routes a role to a cloud model, the measured difference in outcomes justifies
  it.
- **Nothing leaves unseen.** For any feature, the record shows every model call that left the machine, to whom,
  and under which rule — and a `local-only` factory can show that nothing did.
- **Generated code stays understandable.** For any merged feature, an engineer can read how it was built and why the
  code is the way it is — and start from any file to find the pages that explain it.
- **Roadmaps are better informed over time.** The director's proposals cite the wiki, and the wiki keeps growing
  from every feature, incident and decision — while every cited claim still traces back to its source.
- **Hardware is never the ceiling.** A team adds a server or a rented machine and its factories run there — same
  gates, same record — and a rented machine costs nothing while its factories wait for people.
- **The machine is busy while the human thinks.** With several factories, time spent waiting for decisions is
  used for other work.

## 11. What this vision asks for

Adopting it needs deliberate, recorded human decisions:

- **Constitution amendments**: local by default with egress only by configured, recorded choice
  (Principle VIII); one lane *per factory* with a machine-wide model budget (Principle III); the
  event stream as the primary record (Principle VII); a local web front door in place of "no dashboard, no
  server" (Principle IX); the Roadmap gate's new name (Principle VI); and a new rule that knowledge is
  context, never authority.
- **A Roadmap gate amendment** that admits the new horizons and decides the future of the Pi-integrated UI.
- **Acceptance of new dependencies** — Pi's durable substrate and its companions — already approved in
  principle.

## 12. One sentence

KILN is a calm, local-by-default, accountable software factory: agents do the work, independent judges check it, a human
decides at every gate, a wiki remembers what every factory has learned — and every firing is durable, visible and
explainable, on your own machine.
