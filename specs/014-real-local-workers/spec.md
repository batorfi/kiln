# Feature Specification: Real local workers (row r16)

**Feature Branch**: `014-real-local-workers`

**Created**: 2026-10-30

**Status**: Draft

**Input**: the row **`r16`** — *"Real local workers — conversations on local models through pi-ai, tool sets and replay discipline, the residency manager (explicit load/unload, loopback only) and the model pool on one host; a scripted feature walks with real workers and real judges."* Depends on **r13** (done, PR #6) and **r15** (done, PR #8), both satisfied. Requirements: **WORK-1, WORK-3, WORK-4, WORK-5, LANE-3** (all Must; LANE-3 scoped to one host). Concept: [`docs/concepts/web-front-door.md`](../../docs/concepts/web-front-door.md) §7, [`docs/concepts/model-landscape.md`](../../docs/concepts/model-landscape.md).

**Provenance (what r16 builds on, and does not re-open).**

- **r13** gave `kiln.unit` its checkpoint-then-commit discipline: the `work` phase commits `unit.started` once, then — for a unit that `needsLane` — acquires the lane lease, runs a scripted stand-in (`await sleep(stepMs)`), and commits `unit.settled` once at the end; a kill between the stand-in and its commit simply redoes the stand-in, because a timer is pure and cheap to repeat. r13 also gave the lane its `acquire`/`release` port and its `kiln.lane` document (`resident`, `hold`, `swaps`, `lease`) — but `resident` today is only a **name the lease-holder asserts**; nothing loads or unloads an actual model. The lane task's own `serve` phase is explicitly commented as "the home of its future scheduler (r16)."
- **r14** let a row be a flow **walk** instead of a flat script, so a unit is created per gate's step from flow data. r16 does not change which units a walk creates or when — only what the `work` phase of a unit that is a real worker or judge step actually does once it runs.
- **r15** gave every unit and lane change its event envelope and catalog: `unit.queued/started/settled/failed/aborted` and `lane.acquired/released/swapped/cost-recorded/transition` are already schemas in `kiln/schemas/events/`. `lane.transition` (kinds `load`, `hold`, `yield`, `swap`) is **declared but never emitted** — r15 named it for a row that performs real transitions; this is that row.
- **Nothing here changes how a gate is decided.** A worker or judge produces an artifact and evidence; the deciding move is still a person's, exactly as r14 built it (constitution I, V). r16 changes what a step's `work` phase *does*, never what a gate waits for.
- **r17 is not this row.** Configuration as files (`kiln.config/`, `agents/*.md`, the tier map as a reviewable change) ships in r17. Until then, r16's roster of roles, their permitted tools and their tier bindings exist only as this row's own provisional data (see Clarifications), explicitly replaced wholesale when r17 lands.

## Clarifications

### Session 2026-10-30

- Q: Before r17 ships configuration as files, what carries r16's role→tier→tool roster for its own proof? → A: **A small provisional roster module inside this row's own package** (`packages/workers/`), not a config file format and not scattered constants — one place r17 deletes and replaces wholesale. It declares, for each role this row proves (at least one producer and one judge): its tier, its permitted tools, and whether it is a judge (feeding the existing `isJudge`/`bindRole`). It is explicitly marked provisional in its own file header, and `kiln check` gets no new check *for* it (r17 owns validating the real config format).
- Q: Which local model(s) does the proof (and CI) require? → A: **One pinned default, overridable by an environment variable**, following the existing legacy convention (`KILN_LIVE_MODEL`, default `gemma4:12b` there) rather than inventing a new one. The proof walk may run a worker and a judge step on the *same* resident model when memory does not allow two residents on the test machine — this still proves every mechanism (real conversation, replay discipline, residency, tier refusal when the model is made unavailable) except a genuine tier-driven swap, which is proven separately with a second, smaller model asserted only where the test machine supports it. Readiness probes run against whatever models are actually installed and are skipped, by name, for a model that is not.
- Q: What is the minimal tool set r16 needs to prove replay discipline (WORK-4) without r17's full tool-configuration system? → A: **Two tools, hand-declared for this row's proof roles**: one read-only tool (reads a file in the feature's workspace) and one write tool (writes a file in the feature's workspace) — enough to exercise both branches of FR-010–FR-013 for real. No shell/command tool and no subagent tool are given to any role in this row (WORK-3 forbids the latter outright); a broader tool library is r17's and later rows'.
- Q: What should happen when a real model call simply never returns? → A: **A per-step timeout, configured per tier.** A step that exceeds it fails by name (`unit.failed`), releases the lane lease it holds, and the gate it belongs to simply keeps waiting for a person — a timeout ends a *step*, never a gate (constitution V: nothing settles on a clock).
- Q: Does this row need to record real per-step token usage and cost, or only detect whether a model is capable of reporting it? → A: **Capability-detection only.** The readiness probe (FR-040) reports whether a model *can* report usage; this row does not persist real token or cost figures per step. Actually recording and surfacing usage/cost is left to the rows that already own it — r27 (health) and r36 (full observability).
- Q: How much detail does the interruption notice (FR-012) give the resumed model? → A: **A structured list.** Each tool call made before the interruption is named with its arguments; a write or command call is explicitly flagged as already executed and must not be repeated. Specific enough to make "don't repeat this" an exact, testable instruction rather than prose the model might not heed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A step runs as a real, fresh conversation on a local model (Priority: P1)

Today a unit's `work` phase that `needsLane` runs a timer. An engineer who scripts or walks a feature now sees each worker or judge step become a **fresh pi-ai conversation**: seeded with its role's instructions, its tier's resident model, only the tools its role is permitted, and the step's explicit, recorded inputs — never a conversation shared with any other step.

**Why this priority**: this is WORK-1 and the row's whole reason to exist; every other story is a property of this one mechanism actually working.

**Independent Test**: replace one scripted unit's `stepMs` wait with a real worker call against a resident Ollama model, and show the unit still commits its result exactly once, in the same place `kiln.unit`'s `work` phase already commits it, now holding a real artifact instead of the label string the stand-in produces today.

**Acceptance Scenarios**:

1. **Given** a unit whose spec names a role and a tier, **When** its work phase runs, **Then** a new conversation opens with that role's instructions, the tier's resident model, and no tool beyond that role's permitted set.
2. **Given** two steps belonging to the same unit, **When** the second step runs, **Then** it opens its own fresh conversation; the only way a step continues a previous conversation is a recorded `revise`.
3. **Given** a worker's conversation, **When** it is opened, **Then** the director — and nothing else — opened it; nothing offered to the worker or the judge can open another conversation (no subagent tool, WORK-3).
4. **Given** a step's explicit inputs, **When** they are recorded, **Then** the record names which artifacts the conversation was given, never their text (consistent with r15 FR-006).

---

### User Story 2 - A crash mid-generation resumes without double-charging a tool (Priority: P1)

A timer is free to redo. A real generation is not: a kill between a tool call and the step's commit must not let that tool run twice. A read-only call the model already made before the kill is safe to redo; a write or a command the model already made is **not** re-issued — the resumed conversation is told, in its first turn, that it was interrupted and what is already known to have happened.

**Why this priority**: this is the second half of the row's own acceptance line ("a crash mid-generation resumes without double-charging a tool") and its hardest guarantee — WORK-4.

**Independent Test**: script a worker step that calls one read-only tool then one write tool; kill the owner right after the write tool executes but before the step's result commits; restart; show the write ran exactly once and the resumed conversation received an interruption notice instead of a second identical write.

**Acceptance Scenarios**:

1. **Given** a step mid-generation whose model already called a read-only tool, **When** the owner is killed and restarts, **Then** that call is safe to redo (replayed or its recorded result reused) and the conversation continues unaffected.
2. **Given** a step mid-generation whose model already called a write or command tool, **When** the owner is killed and restarts, **Then** that call is never re-issued; the resumed conversation's first turn tells the model it was interrupted and states what already happened.
3. **Given** a step that never called a non-replay-safe tool before the kill, **When** it resumes, **Then** it behaves exactly as an uninterrupted step would — no interruption notice is needed or given.
4. **Given** the step eventually finishes, **When** its result commits, **Then** it commits exactly once, in the same atomic checkpoint-then-commit discipline `kiln.unit` already uses (CORE-4): a half-done generation never commits a result.
5. **Given** a step's generation exceeds its tier's configured timeout, **When** the timeout fires, **Then** the step fails by name (`unit.failed`), releases the lane lease it holds, and the gate it belongs to continues waiting for a person — the timeout never settles a gate.

---

### User Story 3 - KILN owns residency; a model loaded outside it is a broken guarantee (Priority: P1)

The residency manager explicitly loads and unloads models on the host's Ollama, over loopback only. Nothing becomes resident except through it. Every model request the harness makes — including one it makes of itself, such as context compaction — goes through one KILN provider in front of Ollama that holds the lane lease and targets the resident model; a request for a different model is refused or recorded as a swap, never silently served.

**Why this priority**: LANE-3's "Must" line names this by construction, and OBS-5 names "a model loaded outside KILN's residency" as always critical.

**Independent Test**: load a model directly against Ollama's own API outside the KILN provider while a factory runs; show it is detected and recorded as a broken guarantee naming the mismatch. Separately, trigger the harness's own housekeeping and show it is served through the same provider, holding the same lane lease, not a bypass.

**Acceptance Scenarios**:

1. **Given** no model is resident, **When** a step asks for one, **Then** the residency manager loads it explicitly over loopback and the lane records the load (`lane.transition`, kind `load`).
2. **Given** a resident model is no longer needed, **When** released, **Then** the residency manager unloads it explicitly — except a model pinned for judges, which stays resident on purpose (LANE-3).
3. **Given** a model is loaded directly against Ollama outside the KILN provider, **When** the factory next checks, **Then** it is detected and recorded as a broken-guarantee event naming the mismatch.
4. **Given** the harness's own housekeeping needs a model call, **When** it runs, **Then** it goes through the same KILN provider, holds the lane lease for its step, and targets the resident model like any other request.
5. **Given** a named residency failure (model fails to load, Ollama unreachable, host out of memory), **When** it happens, **Then** it is reported by name, not retried silently forever.

---

### User Story 4 - A judge is never silently weaker than the strongest resident model (Priority: P1)

Constitution II, made real for the first time: when a unit's role is a judge, its conversation is bound to the **strongest** model the factory's (provisional) configuration allows. If that model cannot be made resident, the judged step **waits and says why** — it never runs on whatever happens to be loaded instead.

**Why this priority**: r13–r15 never made a real model call, so this rule was never provable before; it must now be shown impossible to violate.

**Independent Test**: configure a judge step whose strongest model is deliberately made unavailable (not installed, or failing its readiness probe); show the step waits and names the reason rather than running on a different resident model; make the model available and show it proceeds.

**Acceptance Scenarios**:

1. **Given** a unit whose role is a judge, **When** its tier is bound, **Then** `bindRole`/`isJudge` refuse anything but `strongest`, exactly as they already do for scripted units, and the real residency request names that exact model.
2. **Given** the strongest model cannot be made resident, **When** a judge step would start, **Then** it waits and names the reason; it does not fall back to a different model.
3. **Given** a judge and a worker needing different tiers in sequence, **When** the lane schedules them, **Then** a swap is recorded only when the required tier genuinely changed — the existing affinity logic in `affinity.ts` (LANE-2), reused unmodified.

---

### User Story 5 - The model pool stays inside a memory budget, with readiness known before a step starts (Priority: P2)

The host's model pool keeps its resident set within a configured memory budget. Before a role's tier is bound to a model, that model's readiness for what the role needs — tool calling, streaming, usage/token accounting, context window — is already known, not discovered mid-step.

**Why this priority**: LANE-3's budget clause and the row's own deliverable text name probes explicitly; P2 because User Stories 1–4 can be shown with one model already known to qualify.

**Independent Test**: run the readiness probes against every model the row's provisional configuration names on the test host; show a model lacking a capability a role needs is refused for that role, by name, before any step is scheduled on it.

**Acceptance Scenarios**:

1. **Given** a model named by the row's configuration, **When** its readiness is probed, **Then** the result records tool-calling support, streaming support, usage accounting and context-window size.
2. **Given** a role that needs tool calling, **When** it would bind to a model whose probe reports that capability absent, **Then** the binding is refused by name before any step runs.
3. **Given** the resident set would exceed the host's memory budget, **When** a new model is requested, **Then** the pool refuses or queues the request rather than exceeding the budget silently.

---

### User Story 6 - A scripted feature walks its gates with real workers and real judges (Priority: P1 — acceptance)

The row's own "Proven when" line. A feature already defined as a flow walk (r14) runs start to finish with every worker and judge step a real conversation on a resident Ollama model, producing real committed artifacts and real judge verdicts — while a person still decides every gate, unchanged from r14.

**Why this priority**: it is the literal acceptance criterion; every other story exists to make this one walk true end to end.

**Independent Test**: walk a small interface feature (reusing the fixtures r14/r15 already keep) through every applicable gate with real models configured, deciding each gate from the CLI as before; separately, kill the owner mid-generation at least once during the walk and show it resumes per User Story 2.

**Acceptance Scenarios**:

1. **Given** a feature admitted as a walk, **When** it runs with real workers and judges configured, **Then** every worker and judge step is a real conversation, not the scripted stand-in, and the walk reaches Merge exactly as a scripted walk reaches it structurally.
2. **Given** the walk is killed mid-generation at a named point, **When** the factory restarts, **Then** it resumes per User Story 2's guarantee and the walk still completes.
3. **Given** the walk completes, **When** the record is read, **Then** it is the same shape as a scripted walk's record (same event types, same envelope) — only the `lane.*` and `unit.*` events now reflect a real residency and a real generation.

---

### Edge Cases

- A model becomes unavailable mid-walk (Ollama stops, or the model is removed between steps): a named failure, never a silent substitute; a worker's step waits, a judge's step waits and never downgrades.
- A generation's inputs would exceed its model's context window: refused by name before the call, not silently truncated.
- Something else on the host already holds Ollama's resources when this factory's pool asks (the host scheduler that shares a pool across factories is LANE-4/r25, out of scope here): a named wait or refusal, never a crash.
- A write tool's effect is ambiguous after a kill (uncertain whether the write landed): the resumed conversation is told of the interruption regardless of certainty — never assumed safe because "it probably didn't run."
- The resident model is removed from Ollama between a judge's readiness probe and its actual step: detected and refused at the real acquire, not assumed still valid from an earlier probe (User Story 5, FR-042).
- The harness's own housekeeping (compaction) needs a model while its own step already holds the lane lease: it MUST share that lease, not acquire a second one.
- A model call hangs past its tier's configured timeout: the step fails by name, releases the lane, and the gate it belongs to keeps waiting for a person — never settled by the clock (constitution V).

## Requirements *(mandatory)*

### Functional Requirements

**Conversations (WORK-1, WORK-3, WORK-5)**

- **FR-001**: A worker or judge step that performs real work MUST open a **fresh** pi-ai conversation seeded with the role's instructions, the role's bound tier's resident model, and only the tools the role is permitted. A step MUST NOT share a conversation with any other step; the only continuation of an existing conversation MUST be a recorded `revise`.
- **FR-002**: A conversation's inputs MUST be the step's explicit, recorded references to artifacts (a document, a prior gate's evidence) — never free text assembled outside the record.
- **FR-003**: Only the director MUST be able to open a conversation; no tool offered to a worker or judge role MUST be able to open another conversation (no subagent tool).
- **FR-004**: Every step MUST carry a deterministic `requestId` derived from (feature, gate, step, attempt), so a redone request is identifiable as the same request, not a new one.
- **FR-005**: A role's permitted tool set MUST be enforced by what the conversation is actually offered, never by an instruction to the model alone.

**Timeouts and hung generations (reliability)**

- **FR-006**: A step's generation MUST have a timeout, configurable per tier; a step that exceeds it MUST be treated as a named failure (`unit.failed`), never left running indefinitely.
- **FR-007**: A step that times out MUST release the lane lease it holds before it fails, so a hung step never blocks a later step from acquiring the lane.
- **FR-008**: A timeout MUST NOT settle a gate: the gate the timed-out step belonged to MUST continue waiting for a person's move, exactly as it would after any other failed or stalled step (constitution V).

**Replay discipline (WORK-4)**

- **FR-010**: Every tool available to a role MUST be classified, once and declared (never inferred), as read-only (replay-safe) or write/command (not replay-safe).
- **FR-011**: When a step resumes after an interruption, a read-only tool call already made in that step's unfinished generation MAY be re-issued, or its recorded result reused, with no visible effect on the conversation.
- **FR-012**: When a step resumes after an interruption, a write or command tool call already made in that step's unfinished generation MUST NOT be re-issued. The resumed conversation's first turn MUST tell the model it was interrupted and give a **structured list** of every tool call already made — its name and arguments — with each write or command call explicitly flagged as already executed and not to be repeated.
- **FR-013**: A step's checkpoint MUST record enough about what the model did before an interruption — each tool call's name, arguments and replay-safety classification — to build FR-012's structured list and to tell replay-safe work apart from not-yet-replayed, unsafe work; a checkpoint that cannot make this distinction MUST NOT be committed.
- **FR-014**: A step's result MUST commit exactly once, in the same checkpoint-then-commit discipline `kiln.unit` already uses (CORE-4): a half-done generation MUST NOT commit a result.

**Residency and the lane (LANE-1, LANE-2, LANE-3)**

- **FR-020**: A residency manager MUST explicitly load and unload models on the host's Ollama; nothing MUST become resident except through it, and every load or unload MUST happen over loopback only (constitution VIII).
- **FR-021**: Every model request the harness makes — including a request it makes of itself, such as compaction or other housekeeping — MUST go through one KILN provider in front of Ollama; that request MUST hold the lane lease for the step it belongs to and MUST target the resident model.
- **FR-022**: A request naming a model that is not the resident one MUST be refused or MUST become a recorded `lane.swapped` event — never silently served by whatever happens to be loaded.
- **FR-023**: A swap MUST be counted and priced only when the resident model actually changes, reusing the existing affinity logic in `affinity.ts` (LANE-2) unmodified; asking for the already-resident model MUST NOT count as a swap, as the lane's `grant` already implements.
- **FR-024**: The strongest local model MAY be **pinned** so judges never cause it to be unloaded between judged steps; a pin MUST be visible in the lane's state, not implicit.
- **FR-025**: The resident set MUST stay within a configured per-host memory budget; a request that would exceed it MUST be refused or queued, never silently exceeded.
- **FR-026**: A model loaded outside the residency manager's path MUST be detectable and MUST be recorded as a broken-guarantee event (OBS-5) — always critical, never configurable away.
- **FR-027**: `lane.transition` (declared in the r15 catalog with kinds `load`, `hold`, `yield`, `swap`, never yet emitted) MUST be emitted for every real load, hold, yield and swap this row performs.

**Judges and tier policy (constitution II)**

- **FR-030**: A judge role's conversation MUST be bound only to the tier `strongest`, enforced by the existing `bindRole`/`isJudge` check; a weaker binding attempt MUST be refused before any conversation opens.
- **FR-031**: When the strongest model cannot be made resident (unavailable, fails readiness, load failure), a judged step MUST wait and name the reason; it MUST NOT run the judge on a different, resident model.
- **FR-032**: A producer role MAY bind to any tier its (provisional, pre-r17) role data names; only judge roles are constrained by FR-030.

**Readiness**

- **FR-040**: A readiness probe MUST exist for each model named by the row's provisional configuration, checking at least: tool-calling support, streaming support, usage/token-accounting **capability**, and context-window size.
- **FR-041**: A role requiring a capability (for example tool calling) MUST NOT be bound to a model whose readiness probe reports that capability absent; the refusal MUST name the missing capability.
- **FR-042**: A readiness result MUST be re-checked at the point a model is actually requested to become resident, not only cached from an earlier probe, so a model removed after its probe is caught at acquire time.
- **FR-043**: This row MUST NOT persist real per-step token usage or cost figures; the usage-accounting probe (FR-040) reports only whether a model is *capable* of reporting usage. Recording and surfacing real usage/cost is explicitly left to r27 (health) and r36 (full observability).

**The provisional roster (pending r17)**

- **FR-045**: This row's role-to-tier-to-tool roster MUST live in one provisional module inside `packages/workers/`, marked as provisional in its own file, declaring at least one producer role and one judge role, each with its tier, its permitted tools (classified per FR-010), and whether it is a judge. It MUST feed the existing `isJudge`/`bindRole` check unchanged.
- **FR-046**: The proof's tool set MUST include at least one read-only tool and one write tool, each scoped to the feature's own workspace; no shell/command tool and no subagent tool MUST be offered to any role in this row.

**What this row does not change**

- **FR-050**: Everything r13, r14 and r15 proved MUST still hold unchanged: a gate waits and settles only on a person's committed move (constitution V); the kill proofs pass; `legacy/` is untouched; no new network port, and no egress beyond loopback to Ollama (constitution VIII).
- **FR-051**: This row MUST NOT build configuration as files (`kiln.config/`, `agents/*.md`, tier-map review — r17), the director's deterministic core or planner (r18), several factories sharing one pool (LANE-4/r25), or remote models (r45/r33).

### Key Entities

- **Conversation**: a fresh, durable pi-ai session for one step — role instructions, bound model, permitted tools, explicit recorded inputs; ends when the step's result commits, or is continued only by a recorded `revise`.
- **Role**: a name with a tier (`strongest`/`standard`/`cheap`/`per-task`), a permitted tool set, and whether it is a judge (the existing `RoleRoster`/`isJudge`); for this row, provisional (FR-045), replaced wholesale by r17.
- **Tool**: a capability offered to a conversation, classified read-only (replay-safe) or write/command (not replay-safe) per FR-010.
- **Residency manager**: the sole path by which a model becomes or stops being resident on the host's Ollama, acting only over loopback.
- **KILN provider**: the one front for every model request — including the harness's own — enforcing that a request targets the resident model and holds the right lane lease.
- **Model pool**: the host's resident set within a memory budget; extends the existing `kiln.lane` document (`resident`, `hold`, `swaps`, `lease`) with real loads and unloads.
- **Readiness probe**: a per-model check of tool-calling, streaming, usage accounting and context window, run before a role may bind to that model and re-checked at acquire time.
- **Interruption notice**: the structured list a resumed conversation receives in its first turn after a kill — each prior tool call's name and arguments, with every write or command call flagged as already executed and not to be repeated.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A scripted feature (reusing the r14/r15 interface-feature fixture) walks every applicable gate with every worker and judge step a real pi-ai conversation against a resident Ollama model — **0** steps use the old `stepMs` stand-in — and reaches Merge with a person deciding every gate.
- **SC-002**: Killing the owner mid-generation at a named point and restarting resumes the walk to the same completed state as an uninterrupted run; across a named set of kill points, a write or command tool the model called before the kill executes exactly **once** — **0** double-executions — and **100%** of resumed steps that had a prior tool call receive a structured interruption notice naming that call and, for a write or command, flagging it as already executed.
- **SC-003**: Every judge step in the proof walk records a model that is the strongest the row's configuration allows; **100%** of attempts to bind a judge to a weaker tier are refused before any conversation opens.
- **SC-004**: A model loaded directly against Ollama outside the KILN provider is detected and recorded as a broken-guarantee event in **100%** of a negative suite's attempts.
- **SC-005**: Every model named by the row's configuration has a readiness result for tool calling, streaming, usage accounting and context window; **100%** of a negative suite's attempts to bind a role to a model failing a capability it needs are refused by name.
- **SC-006**: The resident set never exceeds the configured memory budget during the proof walk; a swap is counted only when the required tier actually changed, matching the existing affinity logic's prediction exactly, in every run.
- **SC-007**: Everything r13, r14 and r15 proved still passes (default tier, proof tier); `legacy/` and `specs/ROADMAP.md` are unchanged by the build; `kiln check` passes, with no new network port and no egress beyond loopback.
- **SC-008**: A step whose generation is made to exceed its tier's timeout fails by name in **100%** of trials, releases its lane lease before failing, and the gate it belonged to is never settled by the timeout — only by a person's later move.

## Assumptions

- **The provisional roster (decided, see Clarifications).** r16 declares its own small, explicitly provisional role roster inside `packages/workers/` — at least one producer role and one judge role, each with a tier, a permitted tool set and a judge flag — rather than anticipating r17's file format. `kiln check` gains no new check for this roster's shape; r17 replaces it wholesale and owns validating whatever format it introduces.
- **The pinned model and CI (decided, see Clarifications).** The proof follows the legacy convention of one pinned default local model overridable by an environment variable (`KILN_LIVE_MODEL`, legacy default `gemma4:12b`); a genuine tier-driven swap between two distinct resident models is proven only where the test host has memory for two residents, skipped by name otherwise. Readiness probes skip, by name, any model the configuration names but the host does not have installed.
- **The minimal tool set (decided, see Clarifications).** Exactly two hand-declared tools prove replay discipline for this row: one read-only (reads a file in the feature's workspace) and one write (writes a file in the feature's workspace). No shell/command tool and no subagent tool exist for any role in this row.
- **Workspace isolation is unchanged from r16's own explainer decision.** A KILN-managed worktree per factory and a branch per feature (PRD WORK-6) is assumed already available to a conversation as its working directory; this row does not build worktree lifecycle, only uses it as the conversation's cwd.
- **Session reuse stays `revise`-only (decided 2026-10-21, PRD WORK-1).** No new continuation mechanism is introduced; a step's only way to continue a previous conversation is the same recorded `revise` the flow already defines.
- **Model residency is a provider in front of Ollama, not a change to Ollama itself.** The residency manager and KILN provider sit entirely inside `packages/workers/`; nothing in this row modifies or depends on an unreleased Ollama capability.
- **LANE-4 (sharing the pool across factories) is explicitly out of scope.** This row's pool and budget are per host but proven with one factory; a second factory sharing the same pool is r25's to build and prove.
- **`pi-ai`'s exact conversation/tool-call API shape is confirmed during planning, not this spec.** `kiln/DEPENDENCIES.md` records the pinned version (`@earendil-works/pi-ai@1.4.0`) and that it is imported today only to satisfy a required constructor option with zero providers registered; this row is what first registers a real provider. The spec states requirements in terms of conversations, tools and replay discipline; how `pi-ai` is actually called is `plan.md`'s to settle.
