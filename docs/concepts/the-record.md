> Status: concept (proposal, 2026-10-18) — **not admitted**
> Type: concept
>
> Scope note: this doc describes **the KILN record** — the ordered, permanent stream of everything that happens in a
> factory, a workshop and a team space, with who caused it and why — and everything built from it. It consolidates and
> deepens `web-front-door.md` §6 (events and observability); where they differ, this doc is the more detailed statement of
> the same design. It is a concept, not a schema or a spec.
>
> Companion docs:
>   - The design:                `web-front-door.md` (§6 events and observability)
>   - The durable substrate:     `pi-durable.md`
>   - Knowledge:                 `factory-wiki.md` (`log.md` as a projection)
>   - Hosts and teams:           `factories-anywhere.md`, `team-space.md`
>   - The user experience:       `user-experience.md` (mockups 06, 17, 18, 19)
>   - The PRD:                   `../prd/kiln-prd.md` (EVT-1…6)

# KILN — the record

## 1. In one paragraph

The record is KILN's memory and its proof: **an ordered stream of events — everything that happened, who caused it, and
why**. Every state change in a factory writes its events **in the same atomic commit** as the change itself, so the record
can never disagree with what happened. Every screen, audit, metric, trace, health signal and knowledge log is a
**projection** built from it and can be rebuilt from it at any moment, for any moment in the past. It never contains
prompts, answers, transcripts, notes, code or secrets — only the facts and the references to them — so it can be kept for
ever, copied, audited and exported without leaking anyone's work.

## 2. Why KILN needs it

KILN makes promises that must be checkable after the fact: *no gate was approved silently*, *no model approved its own
work*, *judges ran on the strongest model*, *nothing left the machine without a rule*. A promise that cannot be verified
later is only a claim. The record makes each of them verifiable **from data alone**, without trusting the software that
produced it.

It grows out of the existing code. r1–r9's **factory-log** — JSONL with `seq`, `ts`, transition, gate-completion, wait and
pre-delegation records, checked by `validate/log.ts` — was the first record. It proved the rules; its weakness was that it
was written *beside* the state, so the two could drift. The new record is written *with* the state, and the factory-log
becomes one of its projections.

## 3. Principles

| | Principle | Meaning |
|---|---|---|
| **R1** | **Written with the state** | events are committed atomically with the change they describe — neither exists without the other |
| **R2** | **One writer, one order** | each factory's record has a single writer and a gap-free sequence |
| **R3** | **The record is the truth** | every view is a projection; if it is not in the record, it did not happen |
| **R4** | **Facts, never content** | no prompts, answers, transcripts, notes, code or secrets — only facts and references |
| **R5** | **Every event explains itself** | each carries its actor, its cause and the run it belongs to |
| **R6** | **Rebuildable** | any projection can be rebuilt from the record, as of any moment |
| **R7** | **Checked, never trusted** | events are validated when committed; streams and projections are validated afterwards; no check passes vacuously |

## 4. Where records live

| Scope | Holds | Written by | Order |
|---|---|---|---|
| **Factory record** | the factory's roadmap, features, gates, steps, lane, models, knowledge and bench activity | the factory's process, inside its durable store, on its host | total, gap-free |
| **Workshop record** | people, policies, hosts, placement and moves, the factory registry, the workshop wiki | the workshop | total, gap-free |
| **Team space history** | team roadmap, claims, requests and reviews, team rules, members | members' **signed commits** in the team-space repository | git history |

There is **no global order across factories**, and none is needed: views that span factories merge by time and say so.

## 5. How an event is written: the transactional outbox

1. A durable task changes factory state — for example, a gate task settles on a human move.
2. **In the same commit**, it appends the matching domain events to the factory's **outbox** — `move.committed`,
   `gate.settled`.
3. The commit lands, and state and events exist together — or it fails, and neither exists. There is no moment when the
   state has changed but the record does not know, and no event describes something that did not happen.
4. A **dispatcher** reads the outbox in commit order, assigns each event its `seq`, validates it against its schema, and
   delivers it to the consumers.

**An invalid event fails its commit.** A gate that tried to settle without a valid `decided_by` would produce an event that
does not validate; the commit would not happen; the gate would not settle. The existing log-writer's rule — no
gate-completion without a human or a distinct delegation — becomes a property of committing, not a check after it.

Events are produced by the KILN seam over Pi Durable (`pi-durable.md`): the outbox is a document in the factory's store, so
Pi Durable's atomic commits are the record's atomicity.

## 6. The envelope

Every event has the same envelope, shaped like CloudEvents so standard tools can read it:

```json
{
  "id": "0192f1c4-…",                    // UUIDv7 — unique and time-sortable
  "seq": 48388,                          // gap-free order within this record
  "type": "kiln.move.committed",
  "schema": "kiln.move.committed/1",     // versioned
  "time": "2026-10-17T11:02:15Z",
  "subject": "kiln-v1/row:r10/gate:verification",
  "actor": "human:zsolt",
  "correlation": "run:r10-2026-10-12",
  "causation": "evt:48302",
  "trace": "00-4bf9…-01",
  "privacy": "internal",
  "data": { "move": "approve", "brief": "brief:9c1…", "idempotency": "mv-7a2…" }
}
```

| Field | Purpose |
|---|---|
| `id`, `seq` | identity and order |
| `type`, `schema` | what kind of event, which version of its shape |
| `time` | when it was committed |
| `subject` | what it is about — a factory, feature, gate, step, host, page |
| `actor` | **who** caused it: `human:<id>` (from the authenticated session, never from a request), `director`, `role:<name>@<model>`, `delegation:<ref>`, `system` |
| `correlation` | the feature run it belongs to — a feature's whole history is one query |
| `causation` | **why** — the event that led to this one |
| `trace` | the link to telemetry spans |
| `privacy` | `public` · `internal` · `sensitive` — which consumers and exports may see it |
| `data` | the type's payload — facts and references only |

`actor` keeps *a human approved* and *approved under a delegation* distinct facts. `causation` makes every event
explainable: following it backwards from a merge reaches the approval, the brief it was made on, the verification, the
restart note and the finding that started it.

## 7. The catalog

Each event type has a versioned JSON schema in `contracts/events/`.

| Group | Event types (examples) |
|---|---|
| **Roadmap** | `roadmap_gate.opened` · `roadmap_gate.decided` · `roadmap.amended` · `row.admitted` · `roadmap.correction_flagged` |
| **Feature** | `row.started` · `row.triaged` · `row.paused` · `row.resumed` · `row.closed` |
| **Gate** | `gate.opened` (brief reference) · `gate.waiting` · `move.committed` · `move.refused` · `gate.auto_approved` · `gate.vetoed` · `gate.settled` |
| **Step** | `unit.queued` · `unit.started` · `unit.steered` · `unit.settled` · `unit.failed` · `unit.aborted` · `unit.resumed_after_crash` |
| **Lane and models** | `lane.acquired` · `lane.released` · `lane.held` · `lane.swap_started` · `lane.swapped` · `model.request.started` · `model.request.settled` |
| **Delegation and fix rounds** | `delegation.armed` · `delegation.interdicted` · `mitigation.round_started` · `mitigation.exhausted` |
| **Human in the loop** | `tool_approval.requested` · `tool_approval.decided` · `egress.blocked` · `budget.reached` · `model.fallback` |
| **Commands** | `command.accepted` · `command.refused` |
| **Knowledge** | `wiki.ingest_started` · `wiki.ingest_completed` · `wiki.page_edited` · `wiki.reverted` · `wiki.lint_finding` · `wiki.digest_added` · `wiki.page_drifted` |
| **Bench** | `bench.note_captured` · `bench.note_promoted` · `bench.research_completed` · `bench.spike_concluded` · `bench.candidate_proposed` |
| **Hosts** | `host.joined` · `host.revoked` · `host.online` · `host.offline` · `host.suspended` · `factory.placed` · `factory.moved` |
| **Team** | `team.subscribed` · `team.published` · `team.claim_made` · `team.overlap_detected` · `team.response_signed` · `team.roadmap_vote` |
| **System** | `server.started` · `server.recovered` · `store.migrated` · `dependency.upgraded` |

Gate events carry the **flow key** and the **flow and gate versions** the feature was admitted with, and moves record
their **kind** as well as the team's label (`extensible-flow.md`), so validators check moves against the pinned flow.

The full lists live with the concepts that introduce them (`web-front-door.md` §6.4 and later sections). Adding an event
type is a MINOR change; changing a payload's meaning is a new schema version; removing a type needs the care of removing a
field from a public format.

## 8. What the record never contains

- **No prompts, answers, transcripts or note content.** These live in the durable store and the notebook. The record says
  *that* the verifier ran, on which model, for how long, and what it decided — not *what it said*.
- **No secrets** or credentials.
- **No code** beyond references — path, lines, commit.

When content is needed, the record **points** to it — a gate brief's id, a conversation's id, a commit. That boundary is
what lets the record be replicated to a workshop, exported and kept for years.

## 9. The record and the durable store

| | Durable store (Pi Durable) | The record |
|---|---|---|
| Holds | transcripts, tool calls, task checkpoints, documents | ordered domain events |
| Answers | *how did this step's work go, and where do we resume?* | *what happened, who decided, and why?* |
| Content | yes | never |
| Lifetime | can be compacted and archived | permanent |

They live in the same store and are written in the same commits, so they cannot disagree.

## 10. Projections: everything built from the record

Consumers read the record through the in-process backbone. Each keeps its own **cursor** (the last `seq` it processed),
processes events at least once and idempotently, catches up after a restart, and never blocks the factory.

| Projection | Builds |
|---|---|
| **State** | `FactoryState` and every screen — overview, factory views, gate briefs' context |
| **Live push** | the browser stream; a reconnecting browser resumes from its last `seq` |
| **Factory-log** | the existing JSONL format, in the existing schema; the existing validators keep running on it |
| **Knowledge `log.md`** | each wiki's activity log — generated, so it cannot drift |
| **Metrics and insights** | gate wait times, send-back rates, veto rates, swap costs, local versus cloud outcomes |
| **Traces** | one per feature, linked through `trace` |
| **Health** | stuck steps, lagging consumers, overlaps, hosts offline, conformance failures |
| **Notifier** | *a gate is waiting for you* — information, never a decision |
| **Feature record** | every gate, decider, judge and egress of a feature, rebuilt from events alone |

**The rule: everything that is not the record can be rebuilt from it.** Dropping a projection and replaying from `seq` 0
gives the same result; for the factory-log, the rebuild must be **byte-identical** to the live file.

## 11. What the record makes possible

- **Time travel** — rebuild any projection as of any `seq`, and see a factory or the whole workshop exactly as it was.
- **Explanation** — follow `causation` from any event back to its root.
- **Audit** — replay a feature's events through the validators, and read every gate brief as it was seen when decided.
- **Process mining** — across features, see the paths rows actually take, where they loop, which gate is the bottleneck.
- **Regression and demo** — committed event streams (today's walk logs, converted) replay through every projection in
  tests, and drive the front door's demo mode.

## 12. How the record is checked

| Level | Check |
|---|---|
| **Each event** | validated against its schema at commit time; an invalid event fails the commit |
| **Each stream** | `seq` gap-free; time never runs backwards; no gate settles without a human or a distinct delegation; delegation records distinct from human ones; no content or remote-endpoint fields; every move in its gate's move vocabulary |
| **Each projection** | a rebuild matches the live projection; the factory-log rebuild is byte-identical |
| **Every check** | never vacuous — a check that reads no events fails, following the existing `*-ready` pattern |

## 13. Across hosts and teams

- **Hosts.** A factory's record lives on its host and is replicated to the workshop — without content, as always. When the
  network fails, the host keeps recording; the workshop's views catch up in order when it returns. When a factory moves,
  its record moves with its store; the move is one event naming both hosts (`factories-anywhere.md`).
- **Team space.** The team space keeps its own history as **signed git commits**. Each workshop verifies signatures when it
  pulls and turns what it finds into events in its own record — `team.claim_seen`, `team.response_signed` — so a factory's
  record also shows what it saw from the team, and when (`team-space.md`).

## 14. Telemetry is not the record

Traces and fine-grained metrics are **telemetry**: high-volume, best-effort, can be sampled or aged out, and carry no
authority. Every domain event carries the trace context of the span that produced it, so the two link — but losing a span
never loses a decision. Export of either is opt-in and, by default, only to the machine (`web-front-door.md` §6.7).

## 15. Who reads it, and how

| Person | Sees |
|---|---|
| **Decider** | *what happened while I was away*, a feature's story, why something is waiting |
| **Auditor** | the record explorer, causation chains, every brief as seen, the factory-log projection's validity |
| **Operator** | health, lag, host events, egress |
| **Evaluator** | insights derived from the record |
| **Everyone, outside KILN** | the knowledge `log.md` files, readable in any editor |

Mockups 06 (feature record), 17 (trace), 18 (record explorer) and 19 (health) illustrate these.

## 16. One decision, as the record sees it

Zsolt approves r10's Verification gate (mockup 17):

```
48302  gate.opened      subject …/gate:verification  actor director     data { brief: brief:9c1 }
48303  gate.waiting
       … 37 minutes, no events for this gate — a waiting gate runs no code …
48388  move.committed   actor human:zsolt  causation 48303  data { move: approve, brief: brief:9c1 }
48389  gate.settled     causation 48388
48390  unit.queued      causation 48389  data { role: techwriter }
48391  lane.acquired
```

These lines prove that the gate waited, who decided, on which brief, and that nothing happened in between — and because
48388 and 48389 were committed with the state change, it cannot be otherwise.

## 17. From today's code

| Existing | Becomes |
|---|---|
| `schemas/factory-log.schema.json` | the factory-log projection's schema, unchanged |
| `validate/log.ts`, `validate/_core.ts`, `validate/_report.ts` | stream and projection validators |
| `src/log-writer.ts` | the commit-time event validation in the outbox |
| `ui/factory-state.ts` | the state projection's reducer |
| `src/clock.ts` | deterministic time for replays |
| `factory-log/*.jsonl`, `fixtures/r7-*` | committed event streams for replay tests and demo mode |

## 18. Open questions

1. **Retention** — the record is permanent; on what schedule should telemetry and archived durable-store transcripts age out?
2. **Schema evolution** — upcast old events on replay, or keep every version's consumer logic?
3. **Export** — a standard export (CloudEvents JSONL) for teams with their own audit systems: opt-in, content-free, local by
   default.
4. **Size** — when a long-lived factory record should be segmented, and how segments stay rebuildable.

## 19. One sentence

The record is everything that happened in KILN, in order, with who caused it and why — written in the same breath as the
change it describes, free of anyone's content, and the single source every view, audit and explanation is rebuilt from.
