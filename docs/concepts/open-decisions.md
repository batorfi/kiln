> Status: index — **final** (2026-10-21, human@batorfi)
> Type: decision index
>
> Scope note: the one list of KILN's design decisions — what was settled when the concept set was finalized on
> 2026-10-21, and what is still open, each placed at the roadmap row that needs it. Each decision is recorded in full in
> the doc it belongs to; this page only points there. Nothing here admits a row: the program is admitted only at the
> **Roadmap gate** (`specs/ROADMAP.md`).

# KILN — decisions, settled and open

## 1. Settled on 2026-10-21

Decided by human@batorfi, in order of priority. The PRD (§14, and the requirement named) and the roadmap's *Decisions
needed before rows fire* table carry the same decisions.

| # | Decision | Recorded in | Row |
|---|---|---|---|
| 1 | **Constitution v2.0.1** — II every judge on the strongest model; III one lane per factory; VII the event stream is the record; VIII local by default; IX a loopback front door, never a source of truth; new X knowledge is context, XI a factory is portable, XII workshops are sovereign; the flow and roles as invariants; pinned dependencies; the closed move kinds | [constitution](../../.specify/memory/constitution.md) | before the Roadmap gate |
| 2 | The Pi-embedded terminal UI (r9) is **retired**; the `kiln` CLI is the terminal surface | PRD §14.1, WEB-6 · [user-experience](./user-experience.md) 14 | r12, r20 |
| 3 | Completing a waiting Pi Durable task from outside is settled in a **go/no-go spike** before the durable core; fallback: upstream, then a KILN decision table in the same transaction | PRD CORE-6 · [pi-durable](./pi-durable.md) §12 | r42 |
| 4 | **The move set**: Code review offers `approve · revise · restart`; a reject may name an earlier gate at any time; no lighter re-crossing; no Documentation skip; proposals P1–P6 accepted | [the-flow](./the-flow.md) §11–12 · PRD GATE-2 | r14 |
| 5 | **One store per factory**; closed features archived beside it; the record never archived and unsegmented in `kiln-v1`; telemetry 90 days | PRD CORE-7 · [the-record](./the-record.md) §18 | r13, r15 |
| 6 | Event schemas evolve by **upcasting on read**; stored events are immutable | PRD EVT-3a · [the-record](./the-record.md) §18 | r15 |
| 7 | **A KILN-managed worktree per factory, a branch per feature**; never a person's clone; the row cleans its branch, the factory its worktree | PRD WORK-6 · [web-front-door](./web-front-door.md) §12.7 | r16 |
| 8 | **Every model request goes through the lane**, harness housekeeping included; a model loaded outside KILN is a broken guarantee | PRD LANE-3, OBS-5 · [pi-durable](./pi-durable.md) §12 | r16 |
| 9 | **A fresh conversation per step**; only `revise` continues one | PRD WORK-1 · [web-front-door](./web-front-door.md) §7 | r16 |
| 10 | The planner runs on the **strongest model** by default and only **proposes** changes to the engineer's rows | PRD DIR-5 · [the-director](./the-director.md) §8 | r18 |
| 11 | **Factory, Feature, Step**; *flow* means only the gate sequence; people see **Knowledge**; the kiln metaphor stays in the name and docs | PRD §14.5 · [user-experience](./user-experience.md) 15–17 | r19 |
| 12 | The brief **never recommends a move** (KILN's opinion only when asked); more evidence is additive, costed and policy-bound | PRD BRIEF-6 · [user-experience](./user-experience.md) 18–21 | r20 |
| 13 | **One decision per gate**; agreement among several people as required reviews that condition *approve* | PRD §14.7 · [user-experience](./user-experience.md) 22 | r13, r26 |
| 14 | A **small team** is the primary user: personal workshops joined by a team space, which is part of `kiln-v1` | PRD §11 · [user-experience](./user-experience.md) 23 | r38, r39 |
| 15 | Team space: **majority quorum** (rules and membership by the same quorum); claims renewed by activity, 7 days / 48 hours; **coordination as a floor** | PRD TEAM-2…4 · [team-space](./team-space.md) 11–14 | r38, r39 |
| 16 | Knowledge: a **dedicated keeper role**; stale at 90 days or on drift; the workshop wiki pinned per feature; reference pages generated from code | PRD KNOW-2, 5, 6 · [factory-wiki](./factory-wiki.md) §14 | r23, r24 |
| 17 | Flows and agents: **Specification is the only arming point**; deterministic diff predicates in `applies_when`; judge changes need a try-run; `kiln.config/` per workshop | PRD CFG-2, CFG-7, FLOW-4 · [extensible-flow](./extensible-flow.md), [configuration](./configuration.md) | r17, r26 |
| 18 | Health: **pause-only director rules**; daily re-surfacing; per-host baselines; a standard diagnostic bundle | PRD OBS-6 · [health](./health.md) §15 | r27 |
| 19 | First run: demo **downloaded on request**; **32 GB minimum, 64 GB recommended**; Spec Kit upgrades offered at the Roadmap gate; other integrations coexist | PRD SETUP-2, 7, 10 · [first-run](./first-run.md) §15 | r28 |
| 20 | New codebases: **no starter templates**; a minimal library skeleton; no built-in Decisions gate | PRD GREEN-4, 5 · [greenfield](./greenfield.md) §17 | r29 |
| 21 | Existing codebases: **territory enforced at the tool level**; deep scan inside, a map outside; 2 years of history in detail; teammates' PR edits re-verified; flaky tests offered as candidates | PRD BROWN-2, 3, 5, 11 · [brownfield](./brownfield.md) §15 | r30, r31 |
| 22 | Experience: waiting gates **never escalate**; a **direct, plain** voice; **WCAG 2.2 AA** and localisable text; Needs you order per person; one roadmap alternative at a time | [user-experience](./user-experience.md) 24–26 · [the-director](./the-director.md) §8 | r19–r22 |

## 2. Still open

None of these blocks a `kiln-v1` row. Each is decided at, or measured in, the row named.

| Question | Where it is discussed | Settled at |
|---|---|---|
| How local models behave through `pi-ai` — tool calling, streaming, usage, context limits — per supported model | [pi-durable](./pi-durable.md) §12 | **measured** in r16 (readiness probes) |
| Multi-factory host sizing — memory budget, per-model concurrency, factory limit | [web-front-door](./web-front-door.md) §20 | **measured** in r25 |
| The factory-to-workshop channel and how leases survive a supervisor restart | [web-front-door](./web-front-door.md) §20 | designed in r25 |
| How many factual question templates before a question falls through to an explain step | [the-director](./the-director.md) §8 Q3 | designed in r18 |
| Egress policy language; model-family identity for cross-family judging | [web-front-door](./web-front-door.md) §20 · PRD §14.9 | r33 (`kiln-v1.x`) |
| Research and spike capacity on shared hosts; switching off keeper suggestions; archived spike retention; importing an Obsidian vault as the notebook | [the-bench](./the-bench.md) §11 · [first-run](./first-run.md) §15 Q3 | r34–r35 (`kiln-v1.x`) |
| How a factory's workspace moves; workshop failover; container forms; other Pi Durable storage adapters | [factories-anywhere](./factories-anywhere.md) §13 · PRD §14.8 | r37 (`kiln-v1.x`) |
| Rehearse required before Contribute, or recommended | [brownfield](./brownfield.md) §15 Q1 | r40 (`kiln-v1.x`) |
| When a greenfield factory revisits an early decision suggested by evidence | [greenfield](./greenfield.md) §17 Q4 | r41 (`kiln-v1.x`) |
| Migrating a workshop created by an earlier KILN version | [first-run](./first-run.md) §15 Q4 | the first release after `kiln-v1` |
| Post-merge gates and the Merge gate's authority | [extensible-flow](./extensible-flow.md) §14 Q3 · PRD §14.12 | out of scope until post-merge gates are admitted |
| A standard, content-free audit export (CloudEvents JSONL) | [the-record](./the-record.md) §18 Q3 | not yet placed |
| A mature wiki as training data for a smaller local model | [factory-wiki](./factory-wiki.md) §14 Q5 | not yet placed |
| Positioning: from "a factory *for Pi*" to "a factory *built on* Pi's durable substrate" | [web-front-door](./web-front-door.md) §20 | release messaging (r32) |

## 3. One sentence

Every decision that shapes `kiln-v1` was made by a person and is recorded where it applies; what remains open is either
measured in the row that builds it or belongs to a later horizon.
