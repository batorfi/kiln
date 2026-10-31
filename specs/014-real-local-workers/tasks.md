---

description: "Task list for real local workers (row r16)"
---

# Tasks: Real local workers (row r16)

**Input**: Design documents from `/specs/014-real-local-workers/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md); [research.md](./research.md) (R1–R10), [data-model.md](./data-model.md), [contracts/](./contracts/) (`worker-conversation.md`, `residency-manager.md`), [quickstart.md](./quickstart.md).

**Tests**: **Included — they are the acceptance.** The row's own words are "a crash mid-generation resumes without double-charging a tool" (SC-002) and "a judge is never silently weaker" (SC-003); a replay-discipline claim nobody tried to break proves nothing (r13–r15's lesson, carried forward). The kill-point proofs, the negative cases and the weakened variants are tasks, not extras.

**Organization**: by user story, in the order the *implementation* needs them, not the spec's P1/P1/P1/P1/P2/P1 display order. After Setup and Foundational (the roster, the tools, the Ollama provider registration, the residency manager, the KILN provider and the per-tier timeout all exist — `kiln.unit` still runs the scripted stand-in): **US4 (judge tier, thin — proves constitution II cheaply before the big mechanism) → US1 (the real conversation, the row's reason to exist) → US2 (replay discipline on top of US1's checkpoint) → US3 (residency ownership's remaining acceptance: broken-guarantee detection, housekeeping sharing a lease) → US5 (readiness probes wired into binding) → US6 (the full real walk — depends on US1–US5 all being done, it is not an independent slice) → Polish**. Spec priorities are P1 for US1–US4 and US6, P2 for US5; this order follows what each story's implementation actually needs to exist first.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1…US6 as in [spec.md](./spec.md); Setup, Foundational and Polish tasks have none
- Paths are relative to the repository root. `kiln/` is the codebase. Abbreviations: `C/` = `kiln/packages/contracts/`, `D/` = `kiln/packages/durable/`, `L/` = `kiln/packages/lane/`, `W/` = `kiln/packages/workers/`, `CLI/` = `kiln/packages/cli/`, `K/` = `kiln/checks/`, `T/` = `kiln/tests/`, `S/` = `specs/014-real-local-workers/`.

## Ground rules (from the plan, the Constitution Check and r13–r15's lessons)

- **Every r13/r14/r15 test stays green at every commit.** A scripted (no-role) `UnitSpec` is untouched: it still runs `sleep(stepMs)` exactly as before (plan.md's whole design is "replace the stand-in, not the discipline" — research R3).
- **One real call site.** Only `W/` imports `@earendil-works/pi-ai`'s request surface (`stream`/`complete`, `createModels`/`setProvider`); `D/src/library/open.ts`'s existing zero-provider `createModels()` call is untouched. `kiln check boundaries` is extended to assert this, never bypassed by convention alone (research R9).
- **No timer settles a gate (constitution V).** The per-tier timeout (Clarification 1, FR-006–008) fails a *step* through the exact terminal-outcome path a step failure already uses; it never reaches the gate the step belonged to. If a task seems to need a gate-level timeout, stop: the design is wrong.
- **No new egress beyond loopback (constitution VIII).** Every path to Ollama goes through `W/src/provider.ts` (conversations) or `L/src/residency.ts` (load/unload/probe/reconcile) — nothing else opens a socket to port 11434 or anywhere else.
- **The provisional roster stays exactly as small as the spec's Assumptions describe** (one producer, one judge) — it is explicitly replaced wholesale by r17; do not grow it "while we're at it."
- **A judge never silently downgrades (constitution II).** Every task that touches tier binding must prove the refusal happens *before* any `pi-ai` call, not after a failed one.
- **Kill points are declared and used, never invented informally.** Every new kill point lands in `D/src/hooks.ts` `KILL_POINTS` and the declared-equals-used test, exactly as r13–r15 require.
- **The record gains no new event type or field this row** (data-model.md §8): `lane.transition` is newly *emitted*, not newly *declared* — it was declared in r15's catalog for exactly this row. If a task seems to need a new schema, stop and check data-model.md §8 again before writing one.
- Every phase ends with a commit and a recorded checkpoint in `S/baseline.md`. Nothing here edits `specs/ROADMAP.md`: closing r16 is the human's Roadmap-gate move. `legacy/` is not touched.

---

## Phase 1: Setup

**Purpose**: readings, the `workers/` package's first real directories, the boundary edges the design needs, and the live-model test tier every later story's tests rely on.

- [ ] T001 Take the **"before"** readings and create `S/baseline.md`: Node/npm versions; `cd kiln && npm test` and `npm run proof` exit codes, counts and seconds (r15's closing state); `npm run check` (five `PASS`); `git rev-parse HEAD:legacy` and the hash of `specs/ROADMAP.md`.
- [ ] T002 [P] Inventory in `S/notes.md`: every call site that would change — `D/src/tasks/unit.ts`'s `work` phase stand-in, `L/src/lane-task.ts`'s `grant()`/`release()`, `L/src/types.ts`'s `WorkUnit`, `W/kiln.json`'s stub text — and what each becomes (research R2, R3).
- [ ] T003 [P] Scaffold `W/src/` and `W/tests/` (currently `W/kiln.json` only, no `src/`); confirm `#workers/*` already resolves via `kiln/package.json`'s `imports` map with a trivial import probe test `W/tests/package-resolves.test.ts`; rewrite `W/kiln.json`'s responsibilities text from "arrives with r16" to what this row actually gives it (research R2).
- [ ] T004 [P] Add the two new boundary edges to `K/boundaries.json`: `durable → workers` and `workers → lane, durable, contracts`; `lane` gains **no** edge to `workers` (data-model.md §9, research R2). Update `K/tests/boundaries.test.ts` and `K/tests/boundaries-dependencies.test.ts`'s expectations; a stray `lane → workers` import must still fail the check.
- [ ] T005 Add a **live-model test tier** to `T/run.ts`: gated on Ollama reachable at `127.0.0.1:11434` and `KILN_LIVE_MODEL` (default `gemma4:12b`, legacy's convention, Clarification 2) actually pulled; skip by name — never silently pass — when either is missing. Add `npm run test:live-models` to `kiln/package.json`. This is what every US1+ live-tier test below runs under.

**Checkpoint**: `npm test` and `npm run check` unaffected; `npm run test:live-models` prints a clean skip on a host with no Ollama.

---

## Phase 2: Foundational (the roster, the tools, the provider, the residency manager — blocking)

**Purpose**: everything every user story needs before `kiln.unit` can call anything real. **No behavioural change to `kiln.unit` yet** — this phase ends with the new machinery built and unit-tested in isolation, default tier still fully green.

**⚠️ CRITICAL**: no user story work begins until the checkpoint at T014.

- [ ] T006 [P] `W/src/roster.ts`: `PROVISIONAL_ROSTER` (research R7, data-model §1) — one producer (`worker`, tier `standard`, tools `["read-file","write-file"]`, `judge: false`, a `timeoutMs`) and one judge (`reviewer`, tier `strongest`, tools `["read-file"]`, `judge: true`, a `timeoutMs`); `judge` feeds `C/src/roles.ts`'s `isJudge` unchanged. Tests `W/tests/roster.test.ts`: the judge entry's tier is `strongest`; the module's own file header states it is provisional and r17 replaces it.
- [ ] T007 [P] `W/src/tools.ts`: `ToolDecl` for `read-file` (`replaySafe: true`) and `write-file` (`replaySafe: false`), each `run(args, {workspace})` scoped to the feature's workspace directory (data-model §2, FR-010, FR-046). Tests `W/tests/tools.test.ts`: `read-file` returns file content; `write-file` writes it; a path resolving outside `workspace` is refused by name for both tools (the workspace-scoping the data model names); classification is read from a declared field, never inferred from the tool's name or from what a given call happened to do.
- [ ] T008 `toolsFor(role, roster)` and `bindConversationRole(role, roster)` in `W/src/roster.ts` (contracts/worker-conversation.md "Role binding", "Tool offering"): `toolsFor` resolves `roster.tools` against T007's declared set, throwing a named config error for an unknown tool name; `bindConversationRole` re-throws `C/src/roles.ts`'s existing `TierPolicyError` unchanged when a judge's roster tier isn't `strongest` — both checked before any `pi-ai` call exists (depends on T006, T007). Tests `W/tests/roster.test.ts`: an unknown tool name is refused at this point, not mid-generation; a judge bound to `standard` throws here, not inside a conversation.
- [ ] T009 [P] `W/src/provider.ts`: register Ollama as a `Provider<"openai-completions">` (research R1) — `baseUrl: http://127.0.0.1:<port>/v1` (port from residency config, default 11434), a placeholder `api_key` auth (Ollama does not check it; every `pi-ai` provider declares an auth type), wired through `createModels()`/`MutableModels.setProvider()`. This is `W/`'s **only** import of `pi-ai`'s request surface. Tests `W/tests/provider.test.ts`: the registered provider's shape (unit-level, no live Ollama needed); a live-tier counterpart (T005's gating) that lists models against a real running Ollama.
- [ ] T010 [P] `L/src/timeout.ts`: `withTierTimeout(ms, signal, work)` (research R6, residency-manager.md "Timeout composition") — races `work` against `AbortSignal.timeout(ms)` composed with the caller's `signal` (a factory close still wins); throws a named `GenerationTimeoutError`, distinct from an abort. Tests `L/tests/timeout.test.ts`: `work` finishing first resolves normally; `ms` expiring first throws `GenerationTimeoutError`, not a generic abort; the caller's own `signal` firing first resolves as an abort, not a timeout — the two are never confused.
- [ ] T011 [P] `L/src/residency.ts`: `createResidency({port, budgetBytes})` → `{load, unload, probe, reconcile}` (research R8, R10, residency-manager.md). `load`/`unload` call Ollama's native API directly, loopback only, and are the **only** way a model becomes or stops being resident. `probe(model)` makes one real minimal round trip (a trivial tool offered, checked for a tool call; a streamed response consumed as a stream; `Usage`'s presence on the response — capability only, Clarification 2) and reads `contextWindow` from the `Model` entry's static field. `reconcile()` compares Ollama's actual running-model list (`/api/ps`) against this manager's own record and returns a `BrokenGuaranteeReport | null`, writing nothing itself. Tests `L/tests/residency.test.ts`: unit-level tests against a fake HTTP layer for `load`/`unload`/`reconcile`'s comparison logic and the budget check; a live-tier counterpart (T005) runs `probe` against a real Ollama and a real pulled model.
- [ ] T012 `L/src/kiln-provider.ts`: `requestThroughLane(req)` (research R9, residency-manager.md "The KILN provider") — resolves the resident model from `kiln.lane`'s document; a tier mismatch goes through the **existing**, unmodified `acquire()` swap path (FR-022/023); a caller whose step already holds the lease is never asked to acquire a second one (depends on T011). Tests `L/tests/kiln-provider.test.ts`: a caller holding its own lease is not re-acquired; a tier mismatch triggers exactly one `acquire()` call with the existing affinity logic unchanged (spied, not re-implemented); a request naming a non-resident model is refused before `req.call` runs.
- [ ] T013 Extend `L/src/lane-task.ts`'s `LaneDoc` with optional `pin`/`budgetBytes` (data-model §5, FR-024/025); `grant()` calls `residency.load()` before granting a lease for a model that is not yet resident, and `release()` calls `residency.unload()` when nothing pins the model; emit `lane.transition` (`kind: "load"|"hold"|"yield"|"swap"`) for every real transition — r15's catalog declared this type and named r16 as the row that would finally emit it (FR-027) (depends on T011, T012). Tests `L/tests/lane-task.test.ts`: a lease for a new model triggers `load()` and a `lane.transition` of kind `"load"`; a release with nothing pinning triggers `unload()` and kind `"yield"`; a pinned model survives a release with no `unload()` call; asking for the already-resident model triggers neither a load nor a swap count (unchanged r13 behaviour, reconfirmed).
- [ ] T014 **Checkpoint**: `npm test` green (T006–T013's new unit-level tests, default tier, no Ollama required); `npm run check` five `PASS` with the new boundary edges; commit; append to `S/baseline.md`.

**Checkpoint**: the machinery exists and is proven in isolation; no user story has touched `kiln.unit` yet.

---

## Phase 3: User Story 4 — a judge is never silently weaker than the strongest resident model (Priority: P1)

**Goal**: constitution II, provably impossible to violate: a judge's tier refusal happens before any `pi-ai` call, and a residency failure for a judge never falls back to a different model.

**Independent Test**: configure a judge step whose strongest model is deliberately made unavailable; show the step waits and names the reason rather than running on a different resident model; make it available and show it proceeds.

- [ ] T015 [P] [US4] Prove T008's `bindConversationRole` refusal happens before any `pi-ai` call: `W/tests/judge-tier-refusal.test.ts` with a spy on `W/src/provider.ts`'s request function — a judge entry bound to anything but `strongest` throws and the spy is never called.
- [ ] T016 [P] [US4] Prove a judge's residency failure never substitutes a different model: `L/tests/residency.test.ts` (or a new `L/tests/judge-no-fallback.test.ts`) — make the strongest model's `load()` reject (fake HTTP layer); the caller's step waits (no `unit.settled`, lane released per the existing failure path), and a later successful `load()` of the **same** model, on the walk's own re-ask, lets the step proceed — never a different, already-resident model instead (FR-031).
- [ ] T017 [US4] **Checkpoint**: green; commit; `S/baseline.md`.

**Checkpoint**: constitution II holds under the new machinery, proven before the big mechanism (US1) exists.

---

## Phase 4: User Story 1 — a step runs as a real, fresh conversation on a local model (Priority: P1) 🎯 MVP

**Goal**: `kiln.unit`'s `work` phase opens a real, fresh `pi-ai` conversation in place of `sleep(stepMs)`, through `requestThroughLane`, producing a real artifact where the stand-in produced `${label}:${i}`.

**Independent Test**: replace one scripted unit's wait with a real worker call against a resident Ollama model; the unit still commits its result exactly once, in the same place the stand-in did.

- [ ] T018 [US1] `TurnInput`/`TurnResult`/`runTurn` in `W/src/conversation.ts` (contracts/worker-conversation.md "Opening a turn"): assembles a fresh `pi-ai` `Context` per call — `systemPrompt` from the role's instructions, `messages` seeded from the step's `inputs: ArtifactRef[]` (FR-002, never inlined raw text), `tools` from T008's `toolsFor`; calls `requestThroughLane` (T012) with the role's required tier; returns `{kind:"continue", checkpoint}` or `{kind:"done", result}`. Tests `W/tests/conversation.test.ts` (mocked provider, no live Ollama): a fresh `Context` is built per call, never reused across steps (FR-001); the offered tools are exactly `toolsFor`'s result and nothing more (FR-005); the mock's recorded `Context.messages` contain only references, never raw artifact text.
- [ ] T019 [US1] `D/src/tasks/unit.ts`'s `work` phase: where the stand-in ran (`await new Promise(...)` on `stepMs`), call `workers.runTurn(...)` instead for a unit whose spec names a role (research R3); the surrounding commit/checkpoint/lane-acquire/release shape is **unchanged**; a unit with no role still runs the scripted stand-in untouched. Tests `D/tests/tasks/unit-worker.test.ts`: a real-role unit commits `unit.started` once, then `unit.settled` once holding a real result, never the stand-in's label string; the existing `D/tests/tasks/unit.test.ts` (scripted units) stays green **unmodified**.
- [ ] T020 [US1] Deterministic `requestId` from `(feature, gate, step, attempt)` in `W/src/conversation.ts` (FR-005 of PRD WORK-5). Tests `W/tests/conversation.test.ts`: the same four-tuple produces the same id across two calls; a redone call after a kill reuses it, never mints a new one.
- [ ] T021 [P] [US1] Prove no subagent tool exists anywhere a worker or judge can reach (WORK-3, FR-003): `W/tests/no-subagent.test.ts`, a source-level scan (mirroring `K/boundaries.ts`'s own technique) asserting nothing in `W/src/tools.ts`'s declared set imports `conversation.ts` or `pi-ai`'s request/provider surface.
- [ ] T022 [US1] **Checkpoint**: default tier green with mocked providers; `npm run test:live-models` runs T018–T021's live-tier counterparts against a real resident model when available, skipped by name otherwise; commit; `S/baseline.md`.

**Checkpoint**: a real conversation replaces the stand-in. **This is the MVP.**

---

## Phase 5: User Story 2 — a crash mid-generation resumes without double-charging a tool (Priority: P1)

**Goal**: a read-only tool call made before a kill is safe to redo; a write/command call is never re-issued; the resumed conversation is told, by a structured notice, what already happened; a hung generation fails by name without ever touching its gate.

**Independent Test**: script a worker step that calls a read-only tool then a write tool; kill the owner right after the write executes but before the step's result commits; restart; show the write ran exactly once and the resumed conversation received the interruption notice instead of a second identical write.

- [ ] T023 [US2] `UnitCheckpoint` grows `toolCalls?: Array<{id, name, arguments, replaySafe, executed: true}>` in `D/src/tasks/unit.ts` (research R4, data-model §3); appended **in the same commit** as each tool's result, before the model's next turn runs — never a separate commit (FR-013). Tests `D/tests/tasks/unit-worker.test.ts`: a tool call's entry exists in the checkpoint the instant its result is recorded, never before, never after a separate write; a scripted (no-role) unit's checkpoint shape is unchanged (no `toolCalls` field appears).
- [ ] T024 [US2] `buildInterruptionNotice(toolCalls)` in `W/src/conversation.ts` (research R5, contracts/worker-conversation.md): a pure function of the checkpoint's `toolCalls` log, producing the structured list (name, arguments, and — only for `replaySafe: false` entries — the "already executed, do not repeat" flag, Clarification 3); `runTurn` prepends its result to the conversation on the **first** turn of a resume with a non-empty log, and takes no special path when the log is empty. Tests `W/tests/conversation.test.ts`: the notice names every logged call; only non-replay-safe entries carry the "already executed" flag; a resume with an empty log produces no notice at all.
- [ ] T025 [US2] Wire T010's `withTierTimeout` around `requestThroughLane`'s call inside `runTurn` (research R6, FR-006–008); `D/src/tasks/unit.ts`'s `work` phase catches `GenerationTimeoutError` distinctly from `run.signal.aborted` (which already commits nothing), releases the lane if held, and lets the task's existing `abort`-phase commit of `unit.failed` run — the identical terminal-outcome shape a scripted step's failure already uses. Tests `D/tests/tasks/unit-worker.test.ts`: a `runTurn` that never resolves, raced against a short test timeout, fails the step by name within its tier's `timeoutMs`, releases the lane, and leaves the step's gate `waiting` — never settled by the timeout (FR-008).
- [ ] T026 [US2] Declare and fire two kill points in `D/src/hooks.ts` `KILL_POINTS`: `unit.tool-call-committed` (after a tool result and its `toolCalls` entry commit, before the model's next turn) and `unit.pre-result-commit` (the generation is done, its result not yet committed); extend `D/tests/kill-points-declared.test.ts`. Proof `D/tests/proof/worker-replay.proof.test.ts`: kill at `unit.tool-call-committed` right after a logged `write-file` call → restart → the write ran exactly once (its file's content and mtime unchanged by the resume, SC-002) and the resumed turn's first message is T024's notice naming `write-file` as already executed; kill mid-timeout → `unit.failed`, lane released, the step's gate still `waiting` (SC-008).
- [ ] T027 [P] [US2] Weakened variant `D/tests/proof/support/broken-worker.ts`: a `runTurn` that blindly re-issues a logged, non-replay-safe tool call on resume instead of building T024's notice. The proof (T026) must name it as the double-execution it is — add it to the proof's weakened-control matrix.
- [ ] T028 [US2] **Checkpoint**: default tier and proof green; commit; `S/baseline.md`.

**Checkpoint**: the row's hardest guarantee — a crash never double-charges a tool, and a hang never touches a gate — is proven under kill.

---

## Phase 6: User Story 3 — KILN owns residency; a model loaded outside it is a broken guarantee (Priority: P1)

**Goal**: the parts of residency ownership not already exercised by Foundational/US1/US2 — a bypassed load is detected and fails closed, and the harness's own housekeeping shares a step's lease rather than acquiring a second one.

**Independent Test**: load a model directly against Ollama's API outside the KILN provider; show it is detected; separately, trigger housekeeping that needs a model and show it shares the calling step's lease.

- [ ] T029 [US3] Wire T011's `reconcile()` immediately before every `residency.load()` call in `L/src/lane-task.ts`'s `grant()` (research R10). On a non-null `BrokenGuaranteeReport`, the load is refused and the mismatch is reported by name (fail-closed, the behaviour OBS-5 names) — **not** committed as a new domain event: the r15 catalog has no broken-guarantee event type, and that type belongs to r27 (Health), which owns the whole "broken-guarantee signals... kept as domain events" mechanism per the roadmap. Record this scoping decision in `S/notes.md` so r27 finds it, rather than inventing a type now that r27 would have to reconcile with its own. Tests `L/tests/residency.test.ts`: a model present in Ollama's list that this manager never asked to load causes the **next** `load()` attempt to refuse, naming the mismatch; it is never silently adopted as the new resident.
- [ ] T030 [P] [US3] Prove housekeeping shares a step's held lease rather than acquiring a second one (Edge Cases, LANE-3's "every model request, including harness-internal ones"): `L/tests/kiln-provider.test.ts`, a synthetic housekeeping caller whose step already holds the lease calls `requestThroughLane` and is **not** asked to acquire again (T012 already implements this; this task is the acceptance-level proof for US3 specifically). If the pinned runtime's own internal housekeeping (context compaction) turns out to have a real call site once a provider is registered, confirm it during implementation and wire it through this same seam rather than a parallel path; if no such call site exists at this pinned version, the synthetic test stands as the guarantee's proof.
- [ ] T031 [US3] **Checkpoint**: green; commit; `S/baseline.md`.

**Checkpoint**: residency is owned end to end — a bypass fails closed, and nothing reaches a model except through the one provider.

---

## Phase 7: User Story 5 — the model pool stays inside a memory budget, with readiness known before a step starts (Priority: P2)

**Goal**: a role needing a capability a model lacks is refused by name before any step runs; a readiness result is re-checked at the moment it is used, not trusted from an earlier probe; the resident set never exceeds its budget.

**Independent Test**: run the readiness probes against the installed models; a model lacking a needed capability is refused for a role that needs it, by name, before any step is scheduled on it.

- [ ] T032 [P] [US5] `requireCapability(model, need, readiness)` in `W/src/conversation.ts` (contracts/worker-conversation.md "Readiness refusal", FR-040/041): called before `runTurn` opens a conversation; throws a named `CapabilityRefused` naming the missing capability. Tests `W/tests/conversation.test.ts`: a role needing tool calling bound to a model whose probe reports it absent is refused here, never discovered by the conversation failing partway through.
- [ ] T033 [P] [US5] Re-check readiness at the moment a model is actually requested to become resident (FR-042): `L/src/residency.ts`'s `load()` re-runs `probe()` rather than trusting a result cached from an earlier call. Tests `L/tests/residency.test.ts`: a model that passed its probe, then is removed from Ollama before the matching `load()`, is caught at `load()` time, not assumed still valid.
- [ ] T034 [US5] Memory-budget enforcement (FR-025): a `load()` that would push the resident set over `budgetBytes` is refused or queued, never silently exceeded. Tests `L/tests/residency.test.ts`: a second model requested while the budget has no room is refused by name; releasing the first model and retrying succeeds.
- [ ] T035 [US5] **Checkpoint**: green; commit; `S/baseline.md`.

**Checkpoint**: a role never runs on a model that cannot do what it needs, and the pool never exceeds its budget.

---

## Phase 8: User Story 6 — a scripted feature walks its gates with real workers and real judges (Priority: P1 — acceptance; depends on US1–US5 all being done)

**Goal**: the row's own "Proven when" line, run for real: the small interface-feature fixture reaches Merge with every worker and judge step a real conversation, a person deciding every gate, and a kill mid-generation resumed per US2 — all inside one full walk, not just one unit in isolation.

**Independent Test**: walk the small interface feature with real models configured, through the CLI, with a person deciding each gate; kill the owner mid-generation at least once during the walk and show it resumes.

- [ ] T036 [P] [US6] `kiln/fixtures/walk-real-worker.json`: a minimal feature fixture naming the `worker` and `reviewer` roles from T006's roster on at least one gate each, for use by this phase and by `quickstart.md`'s step 1.
- [ ] T037 [US6] End-to-end: run the existing small-interface walk fixture with T036's real roles configured instead of the scripted stand-ins (depends on every prior phase). Test `D/tests/walk/real-worker-walk.test.ts` (live-model tier, T005): the walk reaches Merge with a person deciding every gate from the CLI; **0** steps use the `stepMs` stand-in (SC-001).
- [ ] T038 [US6] Kill the owner mid-generation at a named point during the full walk (not a unit in isolation) and restart. Test extends T037: the walk still completes, exercising US2's guarantee inside the full-walk context.
- [ ] T039 [P] [US6] Record-shape parity (spec User Story 6, acceptance scenario 3): a test comparing the set of event types produced by a real-worker run of T036's fixture against a scripted run of the same shape — identical types and envelope shape, only the `lane.*`/`unit.*` **content** differing.
- [ ] T040 [US6] **Checkpoint**: `npm run proof` green including T026's and T037's proof/live tests; commit; `S/baseline.md`.

**Checkpoint**: the row's acceptance line is true end to end.

---

## Phase 9: Polish

**Purpose**: the guardrails, the documents, the mutations, and the fresh-clone proof that the row is really there.

- [ ] T041 `npm run check` still five `PASS` with the new boundary edges; `kiln/DEPENDENCIES.md` unchanged — confirm the existing dependency-equality test still passes with `@earendil-works/pi-ai` at `1.4.0` and no fourth dependency added.
- [ ] T042 [P] Run `S/quickstart.md`'s nine scenarios end to end, ideally from a fresh clone (`git clone`, `cd kiln && npm ci`); record the outcome, including which scenarios ran live against Ollama versus printed a named skip, in `S/baseline.md`.
- [ ] T043 [P] Documents: `W/kiln.json`, `L/kiln.json` and `D/kiln.json` responsibilities brought up to date; `S/overview.md` (the design as built, one reading page) and `S/implementation-report.md` — including the broken-guarantee scoping decision (T029), the compaction-call-site uncertainty (T030), and which of Clarification 2's two tier-swap proofs (one resident model vs. two) the build host actually ran.
- [ ] T044 Mutation checks via `T/tools/mutate.ts` on a committed tree: `residency.load()` skipping the budget check; `grant()` skipping `residency.load()` entirely; `runTurn` swallowing a `GenerationTimeoutError` as an ordinary continuation; `buildInterruptionNotice` omitting the already-executed flag; `reconcile()` never called before a load. Each must be **caught** by a named test; record in `S/notes.md`.
- [ ] T045 [P] Re-run the existing Node floor matrix (`^22.19.0 || >=24.1.0`, unchanged by this row) for the default and proof tiers; record seconds against r15's baseline in `S/baseline.md`.
- [ ] T046 Final guardrails: `git diff main -- legacy` empty; `legacy/` tree id unchanged from T001; `specs/ROADMAP.md` hash unchanged from T001; `npm run check` five `PASS`; then the code review before the PR.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (1)**: none, but T005's live-model tier is what every later live-tier test runs under.
- **Foundational (2)**: after Setup; blocks everything. T006, T007, T009, T010, T011 are independent files and run in parallel; T008 needs T006+T007; T012 needs T011; T013 needs T011+T012; T014 last.
- **US4 (3)** after Foundational only — it needs T008 and T011/T012's failure path, nothing from US1.
- **US1 (4)** after Foundational — needs T008 (role binding, tools), T009 (provider), T012 (the KILN provider US1's `runTurn` calls through).
- **US2 (5)** after US1 — extends the same files (`unit.ts`, `conversation.ts`) US1 just changed; also needs T010 (timeout).
- **US3 (6)** after Foundational for its core (already built in T011–T013); this phase's tasks are its remaining acceptance-level proofs, so sequence it after US2 to keep `lane-task.ts` changes from colliding mid-flight.
- **US5 (7)** after US1 (needs `conversation.ts`'s `runTurn` to wire `requireCapability` into) and T011 (the probe).
- **US6 (8)** after **US1, US2, US3, US4, US5 all complete** — it is the integration story, not an independent slice (spec's own framing: "the row's own 'Proven when' line").
- **Polish (9)** after US6.

### Within each story

Tests ride with the code they judge; negative and weakened variants land in the same phase as the behaviour they attack, so `npm run check` and the default tier are green at every commit, never because nobody tried to break them.

### Parallel opportunities

- Setup: T002, T003, T004 together.
- Foundational: T006, T007, T009, T010, T011 together.
- US4: T015, T016 together.
- US1: T021 alongside T018–T020.
- US2: T027 alongside T023–T026.
- US3: T030 alongside T029.
- US5: T032, T033 together.
- US6: T036 and T039 can start as soon as the fixture format is agreed, ahead of T037/T038.
- Polish: T042, T043, T045 together.

---

## Parallel example: Foundational

```bash
# Launch together once Setup is done:
Task: "W/src/roster.ts — PROVISIONAL_ROSTER (T006)"
Task: "W/src/tools.ts — read-file/write-file with replay-safety (T007)"
Task: "W/src/provider.ts — register Ollama as a pi-ai provider (T009)"
Task: "L/src/timeout.ts — withTierTimeout (T010)"
Task: "L/src/residency.ts — load/unload/probe/reconcile (T011)"
```

---

## Implementation Strategy

### MVP first (Foundational + US4 + US1)

1. Setup, then Foundational → the machinery exists, unit-tested in isolation (**T014**).
2. US4 → constitution II proven cheaply. US1 → a real conversation replaces the stand-in (**T022**, the MVP).
3. **Stop and validate**: `npm test` green, `npm run test:live-models` runs for real when Ollama is present. This alone is a shippable improvement: one real step, safely, is better than none.

### Incremental delivery

4. US2 (replay discipline + the timeout) → US3 (residency's remaining proofs) → US5 (readiness wired into binding).
5. US6 → the full walk, real end to end — only once everything it depends on is green.
6. Polish.
7. Each phase's checkpoint re-runs the whole default tier; the live-model tier runs wherever Ollama is actually available.

### Stop conditions

- If a task needs a new event schema or field, stop: data-model.md §8 says this row adds none — re-check before writing one.
- If a task needs a timer that can settle a gate, stop: the design is wrong (constitution V).
- If T029's reconcile wiring tempts inventing a new committed event type for the broken-guarantee signal, stop and re-read the note there: that type is r27's.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] maps a task to a user story for traceability.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
- Same-file sequencing: `D/src/tasks/unit.ts` is touched by T019, T023, T025 (sequential); `L/src/lane-task.ts` by T013, T029 (sequential); `W/src/conversation.ts` by T018, T020, T024, T025, T032 (sequential).
- Avoid: vague tasks, same-file conflicts beyond those listed above, and treating US6 as independently startable before US1–US5 are done.
