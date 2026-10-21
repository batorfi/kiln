# ROADMAP.md — the `kiln-v1` firing program · **Roadmap gate: PENDING (proposal)**

> **Proposed, not admitted.** This is a **draft** of the program for the new KILN, written from scratch on 2026-10-20 from
> the PRD ([`docs/prd/kiln-prd.md`](../docs/prd/kiln-prd.md)) and the concept set in [`docs/concepts/`](../docs/concepts).
> It admits nothing. Only **human@batorfi**, at the **Roadmap gate** (internal id `gate0`), can admit it — with the moves
> **approve / revise / reject / edit-rows / add-row / drop-row**. Until then every row is `queued` and the gate is `pending`.
>
> **What it replaces.** The previous approved program — r1–r11, KILN as a Pi extension with a terminal UI — is archived,
> unchanged, at [`specs/archive/ROADMAP-2026-09-kiln-on-pi.md`](./archive/ROADMAP-2026-09-kiln-on-pi.md), with its full
> Gate 0 log. Its closed rows (r1, r2, r3, r7, r8) are the code this program reuses (PRD §10). Row ids here **continue from
> r12**, so every row id stays unique across the repository's history and its `specs/NNN-*` directories; the next Spec Kit
> feature directory is `specs/009-…`.
>
> **Head:** the structured block below is the source of truth, validated by `kiln/schemas/roadmap.schema.json` and
> `kiln/validate/roadmap.ts`. **Table:** a projection of the head for people; the validator does not gate on it.

```json
{
 "deliverable": "kiln-v1 — the new KILN (local web front door on Pi Durable), per docs/prd/kiln-prd.md",
 "owner": "human@batorfi",
 "updated": "2026-10-20T12:00:00Z",
 "rows": [
  {
   "id": "r12",
   "short": "Foundations reset — the new codebase layout (packages: contracts, durable, record, lane, workers, director, server, web, cli, checks), the legacy Pi extension frozen in legacy/, and the keep-list ported with its tests green: standard flow and move kinds as data, schemas, validators, affinity scheduler, strongest-judge tier policy, the never-vacuous network check",
   "deps": [],
   "status": "queued"
  },
  {
   "id": "r42",
   "short": "Spike: completing a waiting task from outside — a time-boxed go/no-go on the pinned Pi Durable: a move committed from outside the gate task completes its decision task in one atomic commit, keyed exactly-once, first move wins, proven by kill-at-every-step tests; natively, or else an upstream proposal plus the named fallback (a KILN decision table in the same SQLite transaction as the task store, behind the seam); a spike report decides go, go-with-fallback or no-go, and a no-go re-opens the Roadmap gate before r13",
   "deps": [
    "r12"
   ],
   "status": "queued"
  },
  {
   "id": "r13",
   "short": "Durable core — the Pi Durable seam and the gate contract: roadmap, row, unit, gate and lane tasks; a move and its gate's completion in one atomic commit, first move wins, no clock settles a gate, headless means waiting; proven by kill-and-resume with nothing approved by a restart",
   "deps": [
    "r12",
    "r42"
   ],
   "status": "queued"
  },
  {
   "id": "r14",
   "short": "Gates as data, walked headless — the standard flow (Roadmap gate + Gates 1–9) executed from data with the closed set of move kinds and kiln check flow for the default flow; a scripted feature walks all ten gates from the CLI and survives kill-and-resume at every gate",
   "deps": [
    "r13"
   ],
   "status": "queued"
  },
  {
   "id": "r15",
   "short": "The record — transactional outbox, schema-versioned event envelope and catalog, backbone with consumer cursors; the factory-log as a projection rebuilt byte-identically; the old committed walks replayed as event streams",
   "deps": [
    "r14"
   ],
   "status": "queued"
  },
  {
   "id": "r16",
   "short": "Real local workers — conversations on local models through pi-ai, tool sets and replay discipline, the residency manager (explicit load/unload, loopback only) and the model pool on one host; a scripted feature walks with real workers and real judges",
   "deps": [
    "r13",
    "r15"
   ],
   "status": "queued"
  },
  {
   "id": "r17",
   "short": "Configuration as files — kiln.config/ with role files (agents/*.md), the tier map with judges bound to the strongest model, kiln check config and kiln check model, changes recorded with before and after and applied from the next step",
   "deps": [
    "r16"
   ],
   "status": "queued"
  },
  {
   "id": "r18",
   "short": "The director — the deterministic core executing a feature's pinned flow, affinity ordering, capped automatic fix rounds, and the planner role drafting proposals that are checked before anyone sees them; answers from the record",
   "deps": [
    "r14",
    "r17"
   ],
   "status": "queued"
  },
  {
   "id": "r19",
   "short": "Web front door, read-only — the loopback server with a per-launch secret and Host/Origin checks, read models with live push and resume-from-seq, and the first screens: workshop overview, factory live view, record explorer",
   "deps": [
    "r15"
   ],
   "status": "queued"
  },
  {
   "id": "r20",
   "short": "Gates on the web — the ten-part gate brief with its headline, moves bound to the state version they were made against, the brief recorded as seen, and Needs you; a person decides every gate of a real feature in the browser, and the same gates from the kiln CLI (status, needs, gate brief as text, moves)",
   "deps": [
    "r18",
    "r19"
   ],
   "status": "queued"
  },
  {
   "id": "r21",
   "short": "Stepping in — the unattended tail armed at the Specification gate and ended by any objection, steering of work steps (never judges), risky-action approvals held by policy, and notifications that are information only",
   "deps": [
    "r20"
   ],
   "status": "queued"
  },
  {
   "id": "r22",
   "short": "Shaping the roadmap together — the roadmap brief of the engineer's inputs, a shaping conversation with the planner, direct edits and pins the planner never silently changes, versioned drafts checked on every version, row origins in the Roadmap gate brief, approve bound to the version read",
   "deps": [
    "r20"
   ],
   "status": "queued"
  },
  {
   "id": "r23",
   "short": "The factory knowledge base — an LLM wiki per factory (raw sources, pages, schema, log as a projection) with ingest, query and lint as steps, the Obsidian vault contract readable in Zed, Curator edit rights, and knowledge cited in gate briefs",
   "deps": [
    "r20"
   ],
   "status": "queued"
  },
  {
   "id": "r24",
   "short": "Implementation knowledge and the workshop wiki — implementation digests per gate, feature stories, overviews, explainers and how-tos grounded in code at a commit with drift flagged; a workshop wiki anyone may edit, included read-only in every factory vault",
   "deps": [
    "r23"
   ],
   "status": "queued"
  },
  {
   "id": "r25",
   "short": "One workshop, several factories — the factory registry, the model pool shared across factories with the host scheduler, people and roles for a single user, and Needs you across factories",
   "deps": [
    "r20"
   ],
   "status": "queued"
  },
  {
   "id": "r26",
   "short": "Agents and flows — the Agents screen with role versions and try-runs on past features; added gates and flows from files, per-feature flow choice at the Roadmap gate, team-required gates, gate try-runs, kiln check flow for added gates",
   "deps": [
    "r18",
    "r25"
   ],
   "status": "queued"
  },
  {
   "id": "r27",
   "short": "Health and broken guarantees — the observe-never-act health watcher with signals, baselines and unknown-since states; broken-guarantee signals always critical and kept in the record; core metrics derived from events; kiln health",
   "deps": [
    "r19",
    "r15"
   ],
   "status": "queued"
  },
  {
   "id": "r28",
   "short": "First run — kiln init (browser or terminal) and kiln doctor: machine check, models recommended and checked, workshop and storage, a first factory from a repository with Spec Kit adopted or added and the constitution confirmed, knowledge bootstrap, and the first roadmap shaped together",
   "deps": [
    "r17",
    "r22",
    "r23"
   ],
   "status": "queued"
  },
  {
   "id": "r29",
   "short": "New codebases — start empty: create the repository with Spec Kit, the product brief, a constitution written from it, technology decisions recorded by a person, and a walking skeleton on the foundation flow verified from a clean clone",
   "deps": [
    "r26",
    "r28"
   ],
   "status": "queued"
  },
  {
   "id": "r30",
   "short": "Existing codebases, part 1 — the codebase profile and the full scan of code and repository history into the knowledge base: raw scan facts, codebase and module pages cited at the scanned commit, open questions, a scan report with coverage; durable, local, deep in the territory",
   "deps": [
    "r24",
    "r28"
   ],
   "status": "queued"
  },
  {
   "id": "r31",
   "short": "Existing codebases, part 2 — the baseline of failing and flaky tests, the factory's territory, fitting the team's process (conventions, CI as evidence, code owners, the Merge gate opening a pull request) and base drift shown in briefs",
   "deps": [
    "r30",
    "r21"
   ],
   "status": "queued"
  },
  {
   "id": "r32",
   "short": "Cut the kiln-v1 release — installer, newcomer docs, a demo factory replaying a committed walk through all ten gates, a release manifest and version tag; acceptance: a newcomer installs KILN, runs first setup on a real repository, and decides its first Roadmap gate in under an hour",
   "deps": [
    "r21",
    "r24",
    "r26",
    "r27",
    "r29",
    "r31"
   ],
   "status": "queued"
  },
  {
   "id": "r33",
   "short": "Models beyond the machine (kiln-v1.x) — the model catalog with locality, profiles, per-role routing with cross-family judging, egress policy checked before sending, budgets, fallback as policy, policy stops in Needs you",
   "deps": [
    "r32"
   ],
   "status": "queued"
  },
  {
   "id": "r34",
   "short": "The bench, part 1 (kiln-v1.x) — the private notebook with capture and promotion, keeper suggestions, research steps with cited results, origin and maturity labels",
   "deps": [
    "r32"
   ],
   "status": "queued"
  },
  {
   "id": "r35",
   "short": "The bench, part 2 (kiln-v1.x) — spikes in throwaway worktrees with spike reports, propose as feature, the candidate list with evidence and readiness at the Roadmap gate",
   "deps": [
    "r34"
   ],
   "status": "queued"
  },
  {
   "id": "r36",
   "short": "Observability in full (kiln-v1.x) — per-feature traces, insights with honest numbers, time travel in the record explorer, diagnostics bundle, the opt-in loopback OpenTelemetry export",
   "deps": [
    "r32"
   ],
   "status": "queued"
  },
  {
   "id": "r37",
   "short": "Factories anywhere (kiln-v1.x) — the host runtime and channel, host join and measure, placement decided at the Roadmap gate, moves with handover, sleeping hosts, network failure that never approves anything",
   "deps": [
    "r32"
   ],
   "status": "queued"
  },
  {
   "id": "r38",
   "short": "Team space, part 1 (kiln-v1.x) — the team-space repository with subscribe and publish, members' signing keys and signed acts, the team floor, the team roadmap decided by quorum",
   "deps": [
    "r37"
   ],
   "status": "queued"
  },
  {
   "id": "r39",
   "short": "Team space, part 2 (kiln-v1.x) — claims and protected paths with overlap at the Work plan gate, requests and mirrored reviews between workshops, the team-aware Merge gate with the code host's merge queue, published progress, team knowledge, shared hosts, and bench work shared in a team",
   "deps": [
    "r38"
   ],
   "status": "queued"
  },
  {
   "id": "r40",
   "short": "Existing codebases, the rest (kiln-v1.x) — preserved behaviour and characterization tests, adoption stages with rehearsal on past changes, brownfield knowledge from history and interviews, incremental re-scans, issues as candidates",
   "deps": [
    "r31",
    "r35"
   ],
   "status": "queued"
  },
  {
   "id": "r41",
   "short": "New codebases, the rest (kiln-v1.x) — conventions enforced from the second feature, vertical slices riskiest first, growing into brownfield practices by recorded decision, starting a new product as a team",
   "deps": [
    "r29",
    "r35",
    "r39"
   ],
   "status": "queued"
  }
 ],
 "ordering": [
  "r12",
  "r42",
  "r13",
  "r14",
  "r15",
  "r16",
  "r17",
  "r18",
  "r19",
  "r20",
  "r21",
  "r22",
  "r23",
  "r24",
  "r25",
  "r26",
  "r27",
  "r28",
  "r29",
  "r30",
  "r31",
  "r32",
  "r33",
  "r34",
  "r35",
  "r36",
  "r37",
  "r38",
  "r39",
  "r40",
  "r41"
 ],
 "chain_unattended": false,
 "gate0": {
  "status": "pending",
  "note": "PROPOSED, NOT ADMITTED. Drafted from the PRD (rev 4+) and the concept set on 2026-10-20 as a proposal for the Roadmap gate. Nothing here is admitted until human@batorfi decides at the Roadmap gate (approve / revise / reject / edit-rows / add-row / drop-row). The previous approved program (r1–r11, KILN as a Pi extension) is archived at specs/archive/ROADMAP-2026-09-kiln-on-pi.md; row ids continue from r12 so every id stays unique across the repository's history."
 },
 "trace": "P-VI (the Roadmap gate — gate0 — is the sole admission, human-only, always; this draft admits nothing), P-VII (recorded), P-IX (roadmap fields)"
}
```

## Rendered table (projection of the head — a human view only)

| id | phase | feature | deps | PRD requirements | acceptance (what proves the row) |
|----|-------|---------|------|------------------|----------------------------------|
| r12 | Foundation | **Foundations reset** | — | GATE-1/2, WORK-2, LANE-2, EVT-5 (validators) | new layout builds; legacy frozen; every ported test green; `kiln check` runs the network check |
| r42 | Durable core | **Spike: completing a waiting task from outside** | r12 | CORE-6 | go / go-with-fallback / no-go decided by a spike report; kill-at-every-step tests show one atomic move + completion, first move wins; a no-go re-opens the Roadmap gate |
| r13 | Durable core | **Durable core and the gate contract** | r12, r42 | CORE-1…6, LANE-1 | kill the server at every step of a gate task: it resumes, waits, and settles only on a committed move |
| r14 | Durable core | **Gates as data, walked headless** | r13 | GATE-3/4/5, FLOW-1/2/3, FLOW-7 (default) | a scripted feature walks ten gates from the CLI; `kiln check flow` refuses every invalid flow in its negative suite |
| r15 | Durable core | **The record** | r14 | EVT-1…5 | factory-log rebuilt byte-identical from events; the committed r1–r11 walks replay as streams |
| r16 | Workers | **Real local workers** | r13, r15 | WORK-1, 3–5, LANE-3 | a feature walks with real local workers and judges on Ollama; a crash mid-generation resumes without double-charging a tool |
| r17 | Workers | **Configuration as files** | r16 | CFG-1, 3, 4, 6 (local), 7 (roles), 8 | a weaker judge binding is refused; a config change applies from the next step and is recorded with before/after |
| r18 | Director | **The director** | r14, r17 | DIR-1…5 | the same situation yields the same next step every time; planner drafts that fail checks never reach a person |
| r19 | Front door | **Web front door, read-only** | r15 | WEB-1, 2, 4, OBS-1 (basic) | a second browser tab without the secret sees nothing; a reconnect resumes from its last seq with no polling |
| r20 | Front door | **Gates on the web** | r18, r19 | BRIEF-1…4, WEB-3 (core), WEB-6, DIR-6 | a person decides every gate of a real feature in the browser and from the CLI; a move on a stale state version is refused |
| r21 | Front door | **Stepping in** | r20 | HITL-1/2, GATE-4, WEB-5 | an armed tail crosses clean gates as *delegated*, and stops at the first objection; a judge cannot be steered |
| r22 | Front door | **Shaping the roadmap together** | r20 | DIR-7 | a roadmap shaped from inputs, conversation and pinned edits; approve admits exactly the version read |
| r23 | Knowledge | **The factory knowledge base** | r20 | KNOW-1 (factory), 2, 3, 4, BRIEF-5 | a wiki that opens cleanly in Obsidian and Zed; briefs cite pages and flag stale ones |
| r24 | Knowledge | **Implementation knowledge and the workshop wiki** | r23 | KNOW-1 (workshop), 5, 6 | a merged feature has a feature story grounded at a commit; a code change flags the pages it drifts |
| r25 | Workshop | **One workshop, several factories** | r20 | HOST-1, LANE-4, WORK-6, PPL-1 (single user) | three factories on one host share the model pool; one Needs you across them |
| r26 | Workshop | **Agents and flows** | r18, r25 | CFG-2, CFG-7 (try-runs), FLOW-4…9 | an added gate defined, checked, tried on a past feature, and chosen for one feature at the Roadmap gate |
| r27 | Workshop | **Health and broken guarantees** | r19, r15 | OBS-1 (core), OBS-3, OBS-5, OBS-6 | an injected broken guarantee is critical and recorded; a silent watcher shows *unknown*, never healthy |
| r28 | Getting started | **First run** | r17, r22, r23 | SETUP-1…11 | from install to a first Roadmap gate in under an hour on a fresh machine, nothing leaving it |
| r29 | Getting started | **New codebases** | r26, r28 | GREEN-1…5 | an empty repository reaches a merged walking skeleton that builds and passes from a clean clone |
| r30 | Getting started | **Existing codebases, part 1: profile and full scan** | r24, r28 | BROWN-1, BROWN-11 | a full scan of this repository writes module pages, a coverage report and open questions; a crash mid-scan resumes |
| r31 | Getting started | **Existing codebases, part 2: baseline, territory, process** | r30, r21 | BROWN-2, 3, 5, 8 | a feature outside its territory is flagged at Code review; pre-existing failures never block on their own |
| r32 | Release | **Cut the kiln-v1 release** | r21, r24, r26, r27, r29, r31 | §3.1 goals, M14 | a newcomer installs KILN, runs first setup on a real repository and decides its first Roadmap gate in under an hour |
| r33 | kiln-v1.x | **Models beyond the machine** | r32 | MOD-1…5, HITL-3, CFG-6 (remote) | a hybrid factory's cloud judge sees only what policy allows; a local-only factory reaches nothing beyond loopback |
| r34 | kiln-v1.x | **The bench, part 1: notebook and research** | r32 | BENCH-1…4, BENCH-7 | a notebook entry promoted to knowledge keeps its origin; research results are cited |
| r35 | kiln-v1.x | **The bench, part 2: spikes and candidates** | r34 | BENCH-5, 6, 8, 10–12 | a spike's report becomes evidence on a candidate shown at the Roadmap gate; spike code never merges |
| r36 | kiln-v1.x | **Observability in full** | r32 | OBS-2, OBS-4, EVT-6 | one trace per feature; insights with counts and sample sizes; time travel to any moment |
| r37 | kiln-v1.x | **Factories anywhere** | r32 | HOST-2…7, WEB-2 (network), CFG-5 | a factory moves between hosts with handover; a network failure approves nothing |
| r38 | kiln-v1.x | **Team space, part 1** | r37 | TEAM-1, 2, 3, 8 | a team roadmap change takes effect only when the quorum has signed |
| r39 | kiln-v1.x | **Team space, part 2** | r38 | TEAM-4…7, TEAM-9, BENCH-9 | overlapping claims surface at the Work plan gate; the Merge gate uses the code host's queue |
| r40 | kiln-v1.x | **Existing codebases, the rest** | r31, r35 | BROWN-4, 6, 7, 9, 10, 12 | a rehearsal on a past change compares the judges' findings with what the team merged |
| r41 | kiln-v1.x | **New codebases, the rest** | r29, r35, r39 | GREEN-6…9 | conventions written by the skeleton are enforced from feature two; a team starts a product together |

All rows: status **queued**. One row = one feature through the ten gates; each row's Concept or Specification gate may
still split it (`split+revise` at the Implementation gate exists for exactly this).

## How the program is cut

**Principles used.** Every row ends usable and checked (PRD §11). Each row is one reviewable feature, not a milestone; the
PRD's larger milestones are split where one feature would be too big to review (M1 → r13/r14, M3 → r16/r17, M5 → r20–r22,
M7 → r23/r24, M8 → r25–r27, M13 → r34/r35, M12 → r38/r39, M15 → r30/r31/r40, M16 → r29/r41). Riskiest foundations first:
the durable gate contract (r13) and the record (r15) are what every later promise rests on — and the one unproven
primitive under the contract is spiked first (r42, id out of sequence because ids are never reused), so a no-go surfaces
before anything is built on it.

| Phase | Rows | Ends with |
|---|---|---|
| **Foundation** | r12 | the new layout with every kept rule ported and tested |
| **Durable core** | r42, r13–r15 | a feature walks ten gates headless, survives any crash, and is fully recorded |
| **Workers** | r16–r17 | real local models doing the work and judging it, configured as files |
| **Director** | r18 | deterministic orchestration with a checked planner |
| **Front door** | r19–r22 | a person runs a real feature from the browser — gates, briefs, delegation, steering, roadmap shaping |
| **Knowledge** | r23–r24 | a factory wiki and implementation knowledge readable in Obsidian and Zed |
| **Workshop** | r25–r27 | several factories, added gates and flows, health with broken-guarantee signals |
| **Getting started** | r28–r31 | first run, new codebases, existing codebases with a full scan |
| **Release** | r32 | **`kiln-v1`** |
| **kiln-v1.x** | r33–r41 | models beyond the machine, the bench, full observability, factories anywhere, team space, the rest of brownfield and greenfield |

**The `kiln-v1` line.** r12–r32 deliver the PRD's definition of `kiln-v1`: M0–M8 plus the *Must* items of M9, M15 and M16,
and M14's release. The PRD lists M14 as depending on M1–M7 only; this draft makes the release depend on every `kiln-v1` row
(r21, r24, r26, r27, r29, r31 and, through them, the rest) — a correction to propose back into the PRD.

**After `kiln-v1`.** r33–r41 follow as `kiln-v1.x`. Each depends only on the release (or on its own earlier part), so their
order can be reshaped freely at later Roadmap gates without touching anything built before. r40 and r41 wait for the bench
(r35) because their evidence comes from research and spikes.

## Decisions needed before rows fire

From PRD §14, placed at the row that needs them:

| Before | Decision |
|---|---|
| **r12** | ~~keep a terminal surface (the r9 work) or retire it~~ — **decided 2026-10-21: retired**; `legacy/` is frozen and retired, the terminal surface is the `kiln` CLI (PRD §14.1, WEB-6) |
| **r42** | ~~how external completion of a waiting task is settled~~ — **decided 2026-10-21**: a time-boxed spike row before r13 with a go/no-go; default fallback an upstream proposal plus a KILN decision table in the same SQLite transaction (PRD CORE-6) |
| **r13 / r15** | ~~store lifetime~~ — **decided 2026-10-21**: one store per factory; closed features archived beside it; the record unsegmented in `kiln-v1`, measured in r15 (PRD CORE-7) |
| **r15** | ~~event schema evolution~~ — **decided 2026-10-21**: upcast on read; stored events immutable (PRD EVT-3a) |
| **r16** | ~~workspace isolation~~ — **decided 2026-10-21**: a KILN-managed worktree per factory, a branch per feature; row task cleans its branch, factory its worktree (PRD WORK-6) |
| **r16** | ~~model residency vs. harness requests~~ — **decided 2026-10-21**: every request through the lane via a KILN provider; housekeeping on the resident model (PRD LANE-3, OBS-5) |
| **r16** | ~~session reuse~~ — **decided 2026-10-21**: a fresh conversation per step; only `revise` continues one (PRD WORK-1) |
| **r18** | ~~the planner's limits~~ — **decided 2026-10-21**: strongest model by default; only proposes changes to rows the engineer wrote (PRD DIR-5) |
| **r19** | user-facing words: Factory / Feature / Step; *Knowledge* versus *wiki* (§14.5) |
| **r20** | whether KILN may recommend a move at a gate; limits on *request more evidence* (§14.6) |
| **r23** | wiki keeper as its own role or the researcher with a schema; review age before a brief flags a page; how much code implementation pages reproduce (§14.2–4) |
| **r26** | added gates as delegation arming points; `applies_when` on the diff; several Deciders on one gate (§14.7, §14.12) |
| **r33** | egress policy language and model-family identity (§14.9) |
| **r35** | research and spike capacity on shared hosts; keeper suggestions off-switch; spike retention (§14.11) |
| **r37** | hosts in several workshops; workspace moves; failover; container forms (§14.8) |
| **r38** | quorum rules, claim expiry, publishing levels (§14.10) |

Decided 2026-10-21, before r14 encodes them: the flow's proposals P1–P6 (`the-flow.md` §11) are accepted and its open
questions answered (§12) — Code review offers `approve · revise · restart`, a reject may name an earlier gate at any time,
no lighter re-crossing, no Documentation skip; the move kinds stay closed. Still open: health's director-rule question
(`health.md` §15) at **r27**.

## What the Roadmap gate is asked to decide

1. **The program** — the rows, their order and dependencies, and the `kiln-v1` line at r32.
2. **The first row** — on approval, **r12** is the admitted next row; nothing else is chained (`chain_unattended=false`).
3. ~~**The open decision before r12** — terminal surface kept or retired.~~ Decided 2026-10-21: retired; the CLI is the
   terminal surface. Also enacted before this gate: **constitution v2.0.0**, under which this program is admitted.
4. **Optional reshaping** — for example: pull **r27 Health** earlier (right after r19) if broken-guarantee signals should
   watch the durable core from the start; or move **r30/r31 Existing codebases** ahead of **r29 New codebases** if KILN's
   first real users bring existing repositories.

## Guardrails this draft keeps

- **It admits nothing.** `gate0.status` is `pending`; no row is `active` or `done`; the draft's author is not its decider.
- **History is kept.** The previous program is archived unchanged with its Gate 0 log; no closed row is rewritten.
- **Ids are unique.** New rows start at r12; `specs/001–008` stay the record of the old rows.
- **Valid by construction.** Every dependency names an existing row and appears earlier in the ordering, so the graph is
  acyclic (M1); no approved state is claimed (M3); no row carries a gate or an outcome (M4).
