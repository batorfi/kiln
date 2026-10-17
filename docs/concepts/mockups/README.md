# KILN UX concept — illustrative mockups

> **Illustrations, not design decisions.** These mockups make the ideas in [`../user-experience.md`](../user-experience.md)
> concrete enough to discuss. They are not interaction design, a visual language or a layout to build. Every
> layout, control and colour here is open; what they are meant to show is the *content and the guarantees* the
> UX concept asks for.

All thirty-five share one scenario: one person (Zsolt) runs a **workshop** on a 128 GB Mac Studio-class machine (host
`studio-m5`, joined by a team server, a cloud machine and a spare server in 33–35) with four
factories — `kiln-v1` and `docs-site` (local-only), `billing-service` (hybrid, cloud judges) and `handbook` (new,
waiting for its first roadmap). Most mockups show the same morning after an overnight crash; those marked
*as it was* show an earlier moment from the record, and two show a later moment or a set of examples.

## The mockups

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

| # | Mockup | Illustrates |
|---|---|---|
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
| Gate brief, all ten parts | 02 · 03 · 07 · 08 · 09 · 10 |
| Gate headline wherever a gate appears | 01 · 05 · 13 · 20 |
| Every kind of gate: Roadmap, Specification, Implementation, Code review, Verification, Merge (Concept, Design, Work plan and Documentation share the generic brief) | 03 · 07 · 08 · 02 · 09 · 10 |
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
| Hosts, placement by people, fit checks, moves with handover, sleeping hosts, decisions applying on wake | 33 · 34 · 35 · 01 · 03 |
| Local, private and cloud models; profiles; per-role routing; cross-family judging | 14 · 04 · 06 · 16 |
| Egress policy, checks before sending, audit of what left | 14 · 04 · 06 · 10 · 12 |
| Budgets and spend | 14 · 04 · 10 · 12 |
| Events, causation, schema-versioned envelope | 18 · 17 |
| Time travel and replay | 18 · 06 · 07 · 08 · 11 |
| Tracing | 17 |
| Metrics and insights | 16 · 15 |
| Health without decisions | 19 |
| Factory-log as a validated projection | 18 · 19 |
| People, roles (including Curators), hand-over, identity on every decision | 20 · 02 · 03 |
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
