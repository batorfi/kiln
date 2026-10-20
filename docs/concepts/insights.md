> Status: concept (proposal, rev 2, 2026-10-18) — **not admitted**
> Type: concept
>
> Scope note: this doc details **insights** — what KILN measures from its record, the questions those measures answer,
> how each measure is defined, where insights appear, and the rules that keep them honest and humane. It deepens
> `web-front-door.md` §6.6 (metrics) and the PRD's OBS-1 and OBS-4. It is a concept, not a metrics specification.
>
> Decisions taken by the human (2026-10-18): the *few cases* thresholds, the scope of targets, and the rules for team
> comparison in §11.
>
> Companion docs:
>   - The record:                `the-record.md` (the only data source)
>   - The design:                `web-front-door.md` (§6.6 metrics, §6.9 health)
>   - Health (now, not over time): `health.md`
>   - Extensible flow:           `extensible-flow.md` (insights for added gates)
>   - The bench:                 `the-bench.md` · Knowledge: `factory-wiki.md` · Teams: `team-space.md`
>   - The user experience:       `user-experience.md` §7.12, and mockups 15, 16, 44, 54, 60
>   - The PRD:                   `../prd/kiln-prd.md` (OBS-1, OBS-4)

# KILN — insights

## 1. In one paragraph

Insights turn KILN's record into **evidence for people**: where time goes, where people are the bottleneck, which gates
send work back, whether judges catch real problems, how models and localities compare, whether added gates earn their
place, whether knowledge is used, and what sharing a machine costs. Every number is **derived from the record**, defined
precisely, shown with how much data it rests on, and traceable to the events behind it. Insights **never change anything
on their own** — no gate, model, policy or roadmap is altered because a number moved — and they describe **the factory, not
the people in it**.

## 2. Principles

| | Principle | Meaning |
|---|---|---|
| **I1** | **Evidence, never action** | insights inform people; nothing in KILN acts on them automatically |
| **I2** | **From the record only** | every measure is a projection of events; nothing is measured that is not recorded |
| **I3** | **Defined, not vibes** | each measure has a written definition, shown beside it |
| **I4** | **Honest about size** | counts and sample sizes are always visible; small numbers are labelled as such; no false precision |
| **I5** | **Traceable** | any number opens to the events and features behind it |
| **I6** | **The system, not the person** | insights explain how the factory works; they are not a performance review — individual figures are visible to that individual, aggregates to the team |
| **I7** | **Context where decisions happen** | the most useful insights appear inside gate briefs, the Roadmap gate, the candidate list and configuration — not only on an insights page |
| **I8** | **Local and private** | computed on the machine; no content in any measure; export is opt-in, by policy |

## 3. Questions insights answer

| Audience | Questions |
|---|---|
| **Decider** | Where does my time go? Which gates take me longest? What does waiting on me cost the factory? |
| **Team lead / quorum** | Where do features loop? Which gates catch problems? Are our added gates worth their time? Where do we collide? |
| **Operator** | Which models and hosts earn their cost? What does sharing a machine cost? What did sleeping save? |
| **Curator** | Which knowledge is used? What is stale or never cited? Where are the gaps people ask about? |
| **Evaluator** | Is local good enough for each role? Do cloud judges catch more? Did a role's new version help? |
| **Engineer at the bench** | How much research and spiking went into a candidate? Did spike-measured evidence change outcomes? |

## 4. Measure families

Each measure below names its definition and its source events. "Feature" means a roadmap row; "gate" includes added gates.

### 4.1 The human loop

| Measure | Definition | Source |
|---|---|---|
| **Gate wait** | time from `gate.opened` (brief complete) to `move.committed`, per gate; median and spread | gate, move events |
| **Decision effort** | time the brief was open in the front door before the move — shown only to the decider themself | front-door session events |
| **Send-back rate** | share of gate decisions whose move kind is revise, reject or restart | move events |
| **Rework loops** | number of times a gate re-opened for the same feature after a corrective move | gate events, causation |
| **Delegation** | share of gates crossed under delegation; how often and by which judge delegation was interdicted | delegation events |
| **Lane idle on humans** | share of lane time with nothing running because the factory waited at a gate | lane, gate events |

### 4.2 Quality and the judges

| Measure | Definition | Source |
|---|---|---|
| **Findings per review** | findings raised by each judge, by severity | judge step outputs (counts only) |
| **Confirmed problem** | a finding that led to a change in the following round, or was later corroborated in the record (a later finding, a verification failure, a fix referencing it) | causation chains |
| **Confirmation rate** | confirmed findings ÷ findings, per judge role and version | as above |
| **Approved despite objection** | gates approved while a judge's major finding was open | move + finding events |
| **Escapes** | problems found **after merge** that a judged gate could have caught | post-merge findings linked to features |
| **Mitigation outcomes** | verification fix rounds used; share that passed before the cap | mitigation events |

### 4.3 Cost: machine time, swaps and spend

| Measure | Definition | Source |
|---|---|---|
| **Machine time** | lane time by state: generating · loading models · idle waiting on people · idle with nothing queued | lane events |
| **Swaps** | count, total load time, and swaps **avoided by affinity** (what a naive order would have cost) | lane events, scheduler |
| **Spend** | remote model cost per feature, role and model; budget use | model request events |
| **Cost per feature** | machine time and spend from Roadmap gate to Merge gate | feature correlation |
| **Sharing cost** | throughput with other factories generating versus alone, per model and host | lane events, host events |
| **Sleep savings** | hours a host slept, and the money or energy it saved | host events, host cost model |

### 4.4 Flow and throughput

| Measure | Definition | Source |
|---|---|---|
| **Lead time** | Roadmap-gate admission to merge, per feature; median across features | feature events |
| **Time in gate and step** | per gate and per step kind | gate, unit events |
| **Paths taken** | process-mining view: which gate sequences features actually followed, where they looped | gate and move events |
| **Bottleneck** | the gate or step with the largest share of lead time across features | as above |
| **Triage** | how often Concept and Design were skipped, and how those features fared later | triage, feature events |

### 4.5 Models, localities and roles

| Measure | Definition | Source |
|---|---|---|
| **By model** | confirmation rate, findings, send-backs, time per step, tokens per second, failures, per model | step and model request events |
| **Local versus remote** | the same per role and locality — *is local good enough for this role?* | as above + catalog |
| **Role versions** | outcomes before and after a role's instruction change, and from try-runs | `agent.version_changed`, `agent.try_run` |

### 4.6 Gates and flows

| Measure | Definition | Source |
|---|---|---|
| **Per gate** | runs, wait, send-back rate, confirmed problems caught, approved despite objection, machine and human time | gate, move, finding events |
| **Added gates** | the same for gates teams added — *does it earn its place?* (mockup 60) | as above + flow events |
| **Flows** | lead time and escapes per flow (standard, security-sensitive, …) | `flow.chosen`, feature events |
| **Gates added in flight** | how often, and why (team floor, decider's choice) | `flow.gate_added_in_flight` |

### 4.7 Knowledge and the bench

| Measure | Definition | Source |
|---|---|---|
| **Knowledge used** | citations per page in roadmaps and gate briefs; pages never cited | brief and proposal citations |
| **Knowledge health** | stale and drifted pages, lint findings opened and resolved | wiki events |
| **Gaps** | questions the knowledge base could not answer | `director.question_answered`, wiki query events |
| **Bench effort** | research steps and spikes per candidate, their time and outcomes | bench events |
| **Evidence quality** | outcomes of features admitted with *ready* versus *thin* readiness | candidate, feature events |

### 4.8 Teams and hosts

| Measure | Definition | Source |
|---|---|---|
| **Overlap** | overlaps detected, how early (at which gate), and how they ended | team events |
| **Review turnaround** | time from a required-review request to a signed answer — aggregated per team | team request and response events |
| **Merge friction** | rebase conflicts and re-verifications after teammates' merges | merge, unit events |
| **Hosts** | utilisation, lease waits, memory headroom, moves, offline time | host events |

## 5. Honest numbers

- **Counts first.** Every rate shows its count (*3 of 4*), and every chart its sample size.
- **Small numbers labelled.** Below 5 cases the cases are listed instead of a rate; from 5 to 19 a rate carries a *small
  sample* note; trends appear only from 20 cases (§11.1).
- **Each scale its own.** Measures of different kinds are never put on a shared axis.
- **Definitions beside numbers.** Every measure links to its definition (§4); changing a definition is a recorded change.
- **Comparisons are like-for-like.** Local versus remote, or v3 versus v4, compare the same role on comparable work, and say
  when they cannot.
- **No composite scores.** KILN does not invent an overall "productivity" or "quality" score.

## 6. The system, not the person

Insights exist to improve how the factory works. To keep them from becoming surveillance:

- **Personal figures are personal.** A person's own decision effort, gate wait and send-back rate are visible to them; others
  see team aggregates only.
- **No rankings of people.** KILN never orders people by speed, volume or any measure.
- **No activity tracking.** Nothing about keystrokes, presence, reading time or working hours is measured — only recorded
  KILN events.
- **Waiting is not blame.** Gate wait describes where the factory waits; it never becomes a reminder that escalates.

## 7. Where insights appear

| Place | What it shows | Mockup |
|---|---|---|
| **Insights** | the families above, filterable by factory, period, gate, model | 16 |
| **Added gates** | per-gate evidence for gate owners | 60 |
| **Host detail** | utilisation, sharing cost, sleep savings | 15, 33 |
| **Roadmap gate** | expected gate time a flow adds; readiness outcomes of past features | 54, 45 |
| **Candidate list** | time spent de-risking each candidate | 44 |
| **Gate brief** | provenance time and cost; typical wait and send-back for this gate | 02 |
| **Configuration** | try-run comparisons for roles and gates | 50, 55, 59 |
| **Knowledge** | most-cited and never-cited pages | 22, 25 |
| **Ask the director** | *Which gate takes longest? What did sleeping save?* — answered from the record | 48 |

## 8. How insights are computed

- **A projection of the record** (`the-record.md` §10): an insights consumer reads events in order with its own cursor,
  maintains aggregates, and can be rebuilt from `seq` 0 — so every number is reproducible.
- **Fine-grained telemetry** (token streams, spans) feeds model-behaviour measures but is not required for any decision
  measure; if telemetry is aged out, decision measures remain.
- **Across factories and hosts**: insights merge factory records by time, labelled as merged; team-level insights use only
  what workshops published to the team space.

## 9. Export

Insights can be exported — as CSV or a standard metrics format to a collector on the machine — by opt-in policy, filtered by
the event `privacy` field, never with content, and never to a destination the workshop's policy does not allow.

## 10. How it fits KILN's rules

| KILN rule | Insights |
|---|---|
| **Humans decide** | insights inform; nothing acts on them |
| **Everything recorded** | every number comes from the record and opens to its events |
| **Local by default** | computed locally; export opt-in and policy-checked |
| **Knowledge is context** | insights about knowledge help Curators; they never change pages |
| **Workshops are sovereign** | team insights use only published data |

## 11. Decisions on sample size, targets and team comparison

### 11.1 Few cases

One threshold everywhere, so people learn it once — a workshop setting with these defaults, changed like any
configuration and recorded:

| Cases | Shown as |
|---|---|
| **1–4** | the individual cases, listed and openable (*2 of 3 runs found a problem: b2, d8*) — no rate, no chart, no trend |
| **5–19** | a rate with its count (*4 of 6*) and a *small sample* note — no trend lines |
| **20 or more** | rates, charts and trends over time — still always with the count |

### 11.2 Targets

Targets are allowed as **intentions about the system**, never about people or speed of approval:

- **Allowed** — targets on factory behaviour: send-back rate at a gate, swap share of machine time, problems found after
  merge, share of merged features with a complete feature story.
- **Shown** as a reference line on the relevant insight, with the count — nothing more.
- **Set** by an Operator for a workshop, by the quorum for a team; recorded like configuration.
- **Not allowed** — targets on human decision time or approval speed; targets per person; targets on volume (features
  per week, steps per day).
- **No consequences** — a missed target sends no notification, changes nothing in Needs you, and has no effect on the
  director, delegation, flows or any gate.

### 11.3 Comparing with the team

- **Opt-in** — a workshop chooses to contribute its published, content-free aggregates to the team space; only contributors
  see the comparison.
- **System measures only** — swap share, send-back rate per gate, confirmation rate per judge role, problems found after
  merge, lead time per flow; never personal measures, never per-person breakdowns.
- **At least 3 contributing workshops** before any team aggregate is shown.
- **Ranges, not rankings** — *team: 18–35%*; never *you rank 2nd of 4*.
- **Like-for-like** — only between workshops on the same flow and similar models, with a note when they differ.

## 12. One sentence

Insights turn KILN's record into precise, traceable evidence about how the factory works — where time goes, which gates and
judges earn their place, how models and machines compare — shown where decisions are made, honest about how little or much
data stands behind them, and never acting on anyone's behalf or judging anyone.
