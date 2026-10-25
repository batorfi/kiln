# KILN UX concept — illustrative mockups

> **Note (2026-10-25):** the mockups predate two changes to the flow — the *Design* gate is now the **Architecture** gate, and
> Experience design and UI review were added. They are illustrations and have not been redrawn.
>
> **Illustrations, not design decisions.** These mockups make the ideas in [`../user-experience.md`](../user-experience.md)
> concrete enough to discuss. They are not interaction design, a visual language or a layout to build. Every
> layout, control and colour here is open; what they are meant to show is the *content and the guarantees* the
> UX concept asks for.

All seventy-two share one scenario: one person (Zsolt) runs a **workshop** on a 128 GB Mac Studio-class machine (host
`studio-m5`, joined by a team server, a cloud machine and a spare server in 33–35) with four
factories — `kiln-v1` and `docs-site` (local-only), `billing-service` (hybrid, cloud judges) and `handbook` (new,
waiting for its first roadmap). Most mockups show the same morning after an overnight crash; those marked
*as it was* show an earlier moment from the record, and two show a later moment or a set of examples.

## The mockups

### Working with KILN — the director and Needs you

| # | Mockup | Illustrates |
|---|---|---|
| 46 | [Needs you](46-needs-you.png) *(Oct 24, 08:55)* | everything waiting on one person in three sections — waiting on you (a Roadmap gate, a policy stop, a team vote, a question from a step), suggestions, worth knowing — each with what it blocks; nothing decides itself |
| 47 | [The director at work](47-director-at-work.png) | the deterministic core (what it does next, and why, by rule), the planner's labelled draft checked by rules, and what only the person does |
| 48 | [Ask the director](48-ask-the-director.png) | answers *from the record* (instant, no model, cited) versus *needs a step* (offered, confirmed, labelled a draft); the director declining to approve a gate |

### The workshop

| # | Mockup | Illustrates |
|---|---|---|
| 01 | [Workshop overview](01-workshop-overview.png) | what needs you across factories, each gate with its headline; worth-knowing events; factories and their gate rails; the shared machine |
| 05 | [Coming back](05-coming-back.png) | the account after a night away and a crash: in flight, resumed, kept waiting, **nothing approved by the restart**, what needs you in which order |
| 15 | [Host studio-m5 and its model pool](15-machine-model-pool.png) | memory budget, resident and pinned models, leases per factory, the cross-factory queue, measured cost of sharing, fair share |
| 20 | [People and permissions](20-people-and-permissions.png) | deciders, operators, observers and auditors per factory; a hand-over; who decided what; the loopback session |

### Factories anywhere

| # | Mockup | Illustrates |
|---|---|---|
| 33 | [Hosts](33-hosts.png) *(this afternoon)* | one workshop and four hosts — local, team server, cloud VM, offline spare — with their models, capacity, cost, state and factories; host events; how hosts are kept safe |
| 34 | [Where a factory runs](34-placing-a-factory.png) | moving billing-service: each host checked for policy, model and capacity fit, with cost — the cloud host ruled out by billing's own policy; what moving does and never does |
| 35 | [Moving and sleeping](35-moving-and-sleeping.png) | the move in five steps with the Merge gate still waiting; the host asleep while it waits; a decision recorded as *applying on wake*; what sleeping saved |

### The bench — notebook, research steps, spikes, and the roadmap

| # | Mockup | Illustrates |
|---|---|---|
| 40 | [The notebook](40-notebook.png) *(Oct 22, Anna's workshop)* | a private, messy notebook with deliberate capture; the keeper linking a note to knowledge, flagging a contradiction and suggesting promotion — or a spike |
| 41 | [A research step](41-research-step.png) | the plan shown first (sources, no web for a local-only factory, read-only, estimate); the step running on idle lane time; a labelled draft that says what it could not determine |
| 42 | [A spike](42-spike.png) | an ungated, time-boxed experiment in a `spike/` branch: the agent and Anna working, steering, a risky action approved, live measurements, the no-merge guard |
| 43 | [The spike report](43-spike-report.png) | the answer and spike-measured results replacing unverified figures; promote, share or hand on; propose as a feature whose Design brief starts from the report |
| 44 | [The candidate list](44-candidate-list.png) *(Oct 24, Zsolt's workshop)* | candidates from a spike, a team roadmap, a notebook and a knowledge gap, each with stage, labelled evidence and readiness; one closed by evidence; the director suggesting — not starting — research |
| 45 | [Roadmap gate with evidence](45-roadmap-gate-evidence.png) | evidence and readiness per proposed feature, an unproven assumption, *research this* / *spike this*; what we learned since the last approval; a correction to a queued feature |

### Teams — personal workshops and a team space

| # | Mockup | Illustrates |
|---|---|---|
| 36 | [The team space](36-team-space.png) *(Oct 21)* | three workshops on one codebase — two personal, one shared — the team roadmap with a quorum vote, claims (one exclusive on a protected path), an overlap, requests, published progress, team rules |
| 37 | [Adopting a team feature](37-adopting-a-team-feature.png) | a Roadmap gate with the team roadmap beside it; the claim adopting would make; a protected path held by a teammate (*ask or wait*) and an advisory overlap |
| 38 | [A teammate's review](38-teammate-review.png) | seen from Anna's own workshop: what Zsolt's policy shared, the review mirrored with the pull request, signing with her personal key — not her gate |
| 39 | [Merge gate in a team](39-merge-gate-in-a-team.png) | the team's merge conditions (review met, checks, provenance, the code host's merge queue), base drift and re-verification, what will be published |

### An extensible flow

*Concept: `../extensible-flow.md`.*

| # | Mockup | Illustrates |
|---|---|---|
| 52 | [Flows](52-flows.png) *(Oct 26)* | the standard flow and two team flows — fixed anchors, built-in gates, added gates, a team-required gate, triage-skippable gates; the added gates, when they join automatically, and the closed set of move kinds |
| 53 | [An added gate's brief](53-threat-model-gate.png) | a team's Threat model gate in the full brief: its artifact, an independent security critic's objection, moves with the team's labels (*Accept with residual risk* = approve + note), what it does not offer |
| 54 | [Roadmap gate choosing flows](54-roadmap-gate-flows.png) | a flow proposed per feature with reasons — standard, standard + a gate joined by path, security-sensitive with a team-required gate — and what each adds |
| 55 | [Adding a gate](55-adding-a-gate.png) | defining an Accessibility review gate, `kiln check flow` refusing a judge who is the author, the fix, a try-run on a past feature that would have caught a real issue, proposing it to the team |
| 56 | [Gate library](56-gate-library.png) *(Oct 27)* | every gate a flow can use — built-in, team and workshop gates with placement, judges, moves, when they join, which flows use them, how often they ran; a draft not yet in any flow |
| 57 | [Flow builder](57-flow-builder.png) | dragging a gate into a flow: anchors and built-in gates locked, only valid gaps accept it, a live `kiln check flow`, the YAML it would write — and a warning that a team flow can only use team gates |
| 58 | [A gate added in flight](58-gate-added-in-flight.png) | a Work plan that touches `src/auth/` adds the team-required Security review (shown, not declinable) and suggests a Licence check (your choice); nothing is ever removed |
| 59 | [Changing a gate's version](59-gate-version-change.png) | Security review v2 → v3: the diff, try-runs on past features, features pinned to v2 unaffected, and the team quorum vote |
| 60 | [Do added gates earn their place?](60-gate-insights.png) | per added gate: runs, confirmed problems caught, approvals despite objection, machine and human time — evidence for owners, never automatic change |

### First run

*Concept: `../first-run.md`. These show the start of the scenario: the morning Zsolt installs KILN on `studio-m5`.*

| # | Mockup | Illustrates |
|---|---|---|
| 61 | [The machine](61-first-run-machine.png) | `kiln doctor`: hardware, Node, git, Spec Kit, Ollama missing (KILN never installs system software), network and disk; what this machine can run, measured; the steps ahead |
| 62 | [Models](62-first-run-models.png) | a work model and a stronger judge recommended for 128 GB; downloads continuing in the background; `kiln check model` results; roles bound to models in `tiers.yaml`; remote providers off and collapsed |
| 63 | [Workshop and storage](63-first-run-workshop.png) | name, owner and roles; a personal signing key; the KILN home shown before it is created; disk budget, backups, retention; setup recorded as the first events |
| 64 | [First factory](64-first-run-factory.png) | a local clone, a separate worktree, `local-only`, the standard flow; what KILN found; **Spec Kit adopted** (version, Pi integration, templates against the manifest, existing features); how the gates use Spec Kit; **the constitution** adopted, with the principles that predate the new concept flagged |
| 65 | [Knowledge](65-first-run-knowledge.png) | choosing sources to ingest; bootstrap ingest in progress on the lane; first pages, `index.md` and starter `AGENTS.md`; workshop knowledge and an empty notebook; Obsidian and Zed from the first page |
| 66 | [First roadmap](66-first-run-roadmap.png) | **your inputs** — goal, must-have, constraint, a feature of your own; **the planner asking** where they are in tension; the roadmap **shaped together** — version 3, each row's origin (*planner* or *you*, pinned), the inputs it answers, a planner suggestion on your row shown but not applied, readiness per feature; *Open the Roadmap gate* or the demo factory; starting or joining a team, optional |

### The flow, gate by gate

*Concept: `../the-flow.md`. The four built-in gates without a brief elsewhere, the whole flow on one page, and one feature's
journey. 68–70 are moments from r10's record; 71 is later today; 72 is the same moment as 21.*

| # | Mockup | Illustrates |
|---|---|---|
| 67 | [The standard flow](67-the-flow.png) | all ten gates in four phases — each gate's question, author, judge and moves; triage skip; where the tail can be armed and what it covers; where every move leads; the five moments of every gate |
| 68 | [Concept gate](68-concept-gate.png) *(as it was, Oct 12)* | problem and proposal; premises with what each rests on — proven, sourced, unproven; scope in and out; reject sends the feature back to the roadmap; *spike this* while the gate waits |
| 69 | [Design gate](69-design-gate.png) *(as it was, Oct 13)* | the structure and the alternatives rejected; the critic's objections, the designer's one answer, and which the critic accepts; an unresolved objection carried forward |
| 70 | [Work plan gate](70-work-plan-gate.png) *(as it was, Oct 15)* | tasks traced to requirements; deterministic checks instead of a judge; the model order the plan implies, machine time and swaps; claims |
| 71 | [Documentation gate](71-documentation-gate.png) *(later today, 12:37)* | doc changes; what was built mapped to where it is documented; an open question documented as built; what the feature added to the knowledge base |
| 72 | [A feature's journey](72-feature-journey.png) | r10 gate by gate — rounds, moves, who decided, machine time versus waiting; two restarts to the same restorable commit; one objection traced from Design to Code review to the code being written now |

### Gate briefs — one for each kind of gate

| # | Mockup | Illustrates |
|---|---|---|
| 03 | [Roadmap gate](03-roadmap-gate.png) | the director's proposed roadmap change with evidence; profile, egress policy and budget decided at the same gate; the program-level moves |
| 07 | [Specification gate — arming delegation](07-specification-gate-delegation.png) *(as it was)* | requirements with how each will be verified; arming the unattended tail: exactly which gates, merge excluded, objections always stop it |
| 08 | [Implementation gate — split](08-implementation-gate-split.png) *(as it was)* | the restorable starting point; size of the work ahead; the director's proposed split; `split+revise` and why there is no reject |
| 02 | [Code review gate](02-gate-brief-code-review.png) | the full ten-part brief on a judged gate in round 2: commitments, how your note was addressed, requirement-by-requirement yardstick, findings, gaps, options and consequences |
| 09 | [Verification gate — fix rounds exhausted](09-verification-gate-fix-rounds.png) | results per requirement; the two automatic fix rounds and the cap; the delegation the rejection ended; a yardstick that may itself be wrong |
| 10 | [Merge gate](10-merge-gate.png) *(later today)* | the whole feature end to end: every gate, human or delegated; risks carried forward; what merging will do; what left the machine |

### Running work, and stepping in

| # | Mockup | Illustrates |
|---|---|---|
| 04 | [Factory — live](04-factory-live.png) | a cloud verifier working, with what was sent under which rule; armed delegation and where it stops; steering unavailable for judges; what comes next |
| 21 | [Implementation — live](21-live-implementation.png) *(later today)* | a worker rebuilding after your restart: the note and findings it works from, the code being written, a failing test written first, tasks from the findings, changes so far, steering, the lane |
| 11 | [Stepping in](11-stepping-in.png) *(as it was)* | steering a working agent; a risky action held for approval, with the agent's reason, KILN's own checks and reversibility; a tool approval is never a gate move |
| 12 | [Decisions that are not gates](12-policy-stops.png) *(examples)* | blocked egress in a local-only factory; a reached budget; a judge whose provider is down — and why KILN asks instead of working around |
| 13 | [Working with the director](13-director-conversation.png) | shaping a new factory's roadmap in conversation; explanations with citations; proposals; the director declining to approve |

### The wikis

| # | Mockup | Illustrates |
|---|---|---|
| 22 | [Factory wiki home](22-wiki-home.png) | kiln-v1's wiki: the three layers, `index.md`, recent activity (the generated `log.md`), the pages roadmaps and briefs cite most, what is worth a Curator's look |
| 23 | [Ingest summary](23-wiki-ingest-summary.png) | an ingest written directly, as in Karpathy's pattern: the takeaways as discussed, how the Curator steered it, every page changed, a contradiction resolved on a page cited at an open gate — edit, ask for a change, or revert |
| 32 | [Adding research to knowledge](32-adding-research.png) | an engineer adds personal research on new dependencies for a future feature: the source, the keeper talking the takeaways through and catching an outdated assumption, where each page will go (factory or workshop), unverified claims marked, how the director and Design gate will use it |
| 27 | [Workshop wiki](27-workshop-wiki.png) | the wiki every factory shares and anyone can edit: what belongs there, recent changes by different people, inclusion in every factory vault, lint suggesting knowledge to move up |
| 24 | [Lint findings](24-wiki-lint.png) | contradictions, stale pages, pages resting only on factory-produced sources, missing concepts, orphans — each a decision for the Curator; lint on a different model family |
| 26 | [The wiki in Obsidian and Zed](26-wiki-in-obsidian-and-zed.png) | the same page opened outside KILN: an Obsidian vault with properties, wikilinks, backlinks and graph; the plain markdown file in Zed; the vault contract |
| 25 | [Asking the wiki](25-wiki-query.png) | a question asked while a gate is open, answered with citations down to the sources, proposed for filing back; how the factory uses the wiki |

### Implementation knowledge — how the code was built

| # | Mockup | Illustrates |
|---|---|---|
| 28 | [How a feature was built](28-feature-knowledge.png) *(this afternoon)* | r10's feature story from the record — including two restarts — the pages written so far by type (overview, explainers, how-to, reference, learnings) and the code they explain, while the feature is still at Verification |
| 29 | [An explainer](29-explainer.png) | why the lane refuses to unload a held judge's model: short answer, a diagram with its sentence, the code excerpt at a commit, how the code came to be, claims checked against the code |
| 30 | [How-to and exploring by code](30-howto-and-code-map.png) | start from a file and find every page that explains it; a how-to whose steps are each proven by a test, the last waiting for Verification |
| 31 | [Learnings and drift](31-learnings-and-drift.png) | learnings recorded the moment they were revealed, across factories, some moving up to the workshop wiki; pages drifted from the code; a claim the code does not support |

### Configuration

*Configuration concept: `../configuration.md`.*

| # | Mockup | Illustrates |
|---|---|---|
| 49 | [Agents](49-agents.png) *(Oct 25)* | roles with kind, model binding, version and source (shared team roles); a new security-reviewer judge; its rule checks, including a refused weaker binding |
| 50 | [Trying a role change](50-trying-a-role-change.png) | code-reviewer v4 replayed on r10's past review as an ungated try-run: findings both / v4 only / v3 only, the instruction diff, and proposing it to the team quorum |
| 51 | [Configuration history](51-configuration-history.png) | every config change with who, before and after; a failed check that applied nothing; `kiln check config`; when changes apply |
| 14 | [Models and policy](14-models-and-policy.png) | profiles; the model catalog with locality, family and data handling; roles → models with cross-family judging; egress rules; budgets; the network allowlist |

### Understanding and improving

| # | Mockup | Illustrates |
|---|---|---|
| 06 | [Feature record](06-feature-record.png) | a merged feature rebuilt from the record: gates and deciders, human versus delegated decisions, the objection that ended delegation, the egress audit |
| 16 | [Insights](16-insights.png) | where humans are the bottleneck, which gates send work back, local versus cloud judges, where machine time goes — evidence, never automatic change |
| 17 | [Trace](17-trace.png) | one trace per feature: steps, model requests, tool calls, swaps and the human's wait, linked to the events they produced |
| 18 | [Record explorer](18-record-explorer.png) | the ordered event stream, a causation chain, one event's envelope, time travel to the moment of the crash, projection validity |
| 19 | [Health](19-health.png) | signals worth knowing — overlap, slow loads, refused destinations, recovery — and the views catching up; health observes, never acts |

## Coverage

Every capability in [`../web-front-door.md`](../web-front-door.md) and [`../user-experience.md`](../user-experience.md),
and where it is illustrated:

| Capability | Mockups |
|---|---|
| The whole flow: phases, gates, judges, moves and where they lead; one feature's journey | 67 · 72 |
| Gate brief, all ten parts | 02 · 03 · 07 · 08 · 09 · 10 · 68 · 69 · 70 · 71 |
| Gate headline wherever a gate appears | 01 · 05 · 13 · 20 |
| Every kind of gate: Roadmap, Concept, Design, Specification, Work plan, Implementation, Code review, Verification, Documentation, Merge | 03 · 68 · 69 · 07 · 70 · 08 · 02 · 09 · 71 · 10 |
| Moves per gate, including those a gate does **not** have | 02 · 03 · 07 · 08 · 09 · 10 |
| Triage skipping Concept and Design | 01 · 04 · 06 · 07 · 10 |
| Unattended tail: arming, running, ending on an objection | 07 · 04 · 09 · 10 · 06 · 18 |
| Automatic fix rounds and their cap | 09 · 17 |
| A corrective move becoming the next step's instructions | 21 · 02 · 09 |
| Split at the Implementation gate | 08 |
| Watching implementation live: code, tests, tasks, changes | 21 |
| Factory wiki: layers, index, log, Curators | 22 · 20 |
| Wiki ingest written directly, steered and revertible; contradictions | 23 · 32 |
| Personal research as a source; context for future roadmap features | 32 |
| Workshop wiki, open to everyone, included in every factory vault | 27 · 22 · 26 |
| Implementation knowledge: feature stories, overviews, explainers, how-tos, reference, learnings | 28 · 29 · 30 · 10 |
| Code-grounded pages: excerpts at a commit, exploring by code, drift and claim checks | 29 · 30 · 31 |
| Wiki lint: contradictions, stale, orphans, missing concepts, echo-chamber check | 24 |
| Asking the wiki; filing answers back; context, never authority | 25 · 03 |
| Wiki readable without KILN: Obsidian vault, wikilinks, plain markdown in Zed; conformance checks | 26 · 22 · 24 |
| Steering a work step; judges never steered | 11 · 21 · 04 |
| Risky actions held for approval | 11 · 02 |
| Policy stops: blocked egress, budget, judge fallback | 12 · 05 · 19 |
| Working with the director; the director never decides | 13 · 08 |
| Durable work: crash, resume, nothing approved by a restart | 05 · 18 · 19 |
| Several factories, one workshop, one place for what needs you | 01 · 05 · 15 |
| Model pool, leases, pinned judge, memory budget, scheduler | 15 · 01 |
| Director: deterministic core, planner drafts, asking the director; Needs you sections and ordering | 46 · 47 · 48 · 01 · 05 |
| Hosts, placement by people, fit checks, moves with handover, sleeping hosts, decisions applying on wake | 33 · 34 · 35 · 01 · 03 |
| Local, private and cloud models; profiles; per-role routing; cross-family judging | 14 · 04 · 06 · 16 |
| Egress policy, checks before sending, audit of what left | 14 · 04 · 06 · 10 · 12 |
| Budgets and spend | 14 · 04 · 10 · 12 |
| Events, causation, schema-versioned envelope | 18 · 17 |
| Time travel and replay | 18 · 06 · 07 · 08 · 11 |
| Tracing | 17 |
| Metrics and insights (`../insights.md`) | 16 · 15 · 60 |
| Health without decisions (`../health.md`) | 19 · 05 · 01 |
| Factory-log as a validated projection | 18 · 19 |
| Extensible flow: gate definitions, flows, per-feature flow choice, team-required gates, `kiln check flow`, try a gate | 52 · 53 · 54 · 55 · 56 · 57 |
| Flow changes over time: gates added in flight, gate versions and pins, whether added gates earn their place | 58 · 59 · 60 |
| Configuration: files, layering, agents and versions, try-runs, checks, history | 49 · 50 · 51 · 14 · 33 |
| People, roles (including Curators), hand-over, identity on every decision | 20 · 02 · 03 |
| Bench: notebook and promotion, research steps, spikes and spike reports, origin and maturity labels | 40 · 41 · 42 · 43 |
| Bench and the roadmap: candidate list, evidence and readiness at the Roadmap gate, what we learned, corrections | 44 · 45 |
| Team space: team roadmap by quorum, claims and protected paths, overlap, requests, mirrored reviews, merge queue, publishing | 36 · 37 · 38 · 39 |
| First run: machine check, models, workshop and storage, first factory, knowledge bootstrap, first roadmap, team start or join | 61 · 62 · 63 · 64 · 65 · 66 |
| Loopback-only session security | 20 |

## Regenerating

The sources are plain HTML and CSS in [`src/`](src/) (shared styles in `src/kiln-mock.css`). Edit a source and run:

```sh
sh docs/concepts/mockups/src/render.sh
```

It renders each page with headless Google Chrome at 2× device scale (3200 px wide PNGs) into this folder.

The KILN mark in every sidebar comes from [`docs/brand/kiln-mark.svg`](../../brand/kiln-mark.svg), referenced by the shared stylesheet — change the logo there and re-render.

Chart colours (mockups 16 and 17) use a two-colour palette checked for colour-blind separation and contrast; every
chart carries a legend or direct labels, so no meaning depends on colour alone.

> **Note (2026-10-25):** the mockups use the earlier warm palette with an ember accent and the earlier ember arch logo. KILN's design system now proposes the
> **teal-and-sand** theme (`../design-system.md` §12.1); newer samples (`../feed/`) are drawn in it. The mockups stay
> illustrations of layout and flow, not of colour.
