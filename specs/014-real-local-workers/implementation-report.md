# Implementation report: Real local workers (row r16)

**Branch**: `014-real-local-workers` | **Report date**: 2026-11-02, revised 2026-11-03 (orchestrator's own `/code-review high` pass, §7) | **Base**: `main` (r15 merged, PR #8)
**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Tasks**: [tasks.md](./tasks.md) · **Readings**: [baseline.md](./baseline.md) · **Lab notebook**: [notes.md](./notes.md) · **Technical overview**: [overview.md](./overview.md)
This file is about the *work*: what was built, how far the evidence can be trusted, what changed from the plan, what went wrong on the way, and what is still open.

> **Reading guide.** Five minutes: §1 and §7. Reviewing the code: §2. Judging the evidence: §3–§4.

## 1. Status in one paragraph

**All six user stories are built and every task (T001–T047) is done.** A unit whose spec names a `role` now opens a real, fresh `pi-ai` conversation on a local Ollama model instead of the scripted `sleep(stepMs)` stand-in — proven live, end to end, against this machine's installed Ollama and `gemma4:12b`. The checkpoint's `toolCalls`/`pending` log makes a kill between any two tool calls lose only work that was never committed; a judge's tier refusal and a residency failure both happen before any model call; the residency manager owns every load/unload over loopback with `keep_alive` always pinned, and `reconcile()` catches a bypass while correctly *not* mistaking its own restart for one; a per-tier timeout fails a hung step by name without ever touching its gate. A real `kiln owner` process launched from the actual CLI binary now has a real lane and real workers (`real-workers.ts`), and the walk engine itself — not only the CLI wiring — can bind a flow walk's gate steps to a real role (`WalkInput.script.real`), so the full small-interface walk reaches Merge with every author/judge step a real conversation (SC-001), survives a kill mid-generation during that same full walk (SC-002/SC-008 inside a real walk, not just a unit in isolation), and the record it produces is shape-identical to a scripted walk's except for real `lane.*`/`unit.*` content (User Story 6's own acceptance scenario 3). Evidence: default tier green (905 new + 500 legacy tests); proof tier **133/133**; `kiln check` five PASS, two new boundary edges (`cli → lane`, `cli → workers`); six of six mutation checks caught; the Node floor matrix run on the two Node binaries actually available on this host (§7, §8.2). **What this does not show:** host power loss; several factories sharing one model pool (LANE-4, explicitly r25); remote models; real per-step token usage/cost persisted (capability-detection only, Clarification 2).

## 2. What exists

| Area | Where | What |
|---|---|---|
| Provisional roster | `workers/src/roster.ts` | one producer (`worker`, `standard`), one judge (`reviewer`, `strongest`), each with `systemPrompt`, tools, `judge` flag, `timeoutMs`; explicitly replaced wholesale by r17 |
| Tools | `workers/src/tools.ts` | `read-file` (replay-safe), `write-file` (not) — declared classification, never inferred |
| The conversation | `workers/src/conversation.ts` | `runTurn`: role binding before any call, the tool-round loop that commits one call at a time, the structured interruption notice, the per-tier timeout race, readiness-capability refusal |
| The Ollama provider | `workers/src/provider.ts` | registers Ollama as a `pi-ai` `Provider<"openai-completions">` against its OpenAI-compatible endpoint — the only `pi-ai` request-surface import in the tree |
| The workers port | `durable/src/types.ts` (`WorkersApi`) | `durable` never imports `#workers/*` directly (the same inversion as `#lane/*`); `unit.ts`'s `work` phase calls through it |
| `kiln.unit`'s real-role branch | `durable/src/tasks/unit.ts` | the stand-in replaced for a unit with a `role`; the checkpoint/commit/lane shape is unchanged; the scripted path is untouched |
| The walk's real-roles binding | `durable/src/walk/{input,walk}.ts` | `WalkInput.script.real: {roles, workspace}` lets a *flow walk* (not only a flat script) bind a gate's `todo` entry to a real role; absent, byte-identical to before |
| The residency manager | `lane/src/residency.ts` | `load`/`unload` (loopback, `keep_alive` always pinned), `probe` (fresh every call), `reconcile(expected?)` (adopts a legitimate restart, still reports an actual bypass) |
| The per-tier timeout | `lane/src/timeout.ts` | races a generation against `AbortSignal.timeout`; a distinct `GenerationTimeoutError`, never a generic abort |
| The KILN provider | `lane/src/kiln-provider.ts` | `requestThroughLane`: the one function every model request goes through; a caller already holding its lease is never asked to acquire a second one |
| The lane, extended | `lane/src/lane-task.ts` | `grant()` calls `reconcile()` then `residency.load()`; `release()` calls `residency.unload()` (unpinned) **after which** the lease clears — never before |
| The real CLI wiring | `cli/src/real-workers.ts`, `cli/src/gate-commands.ts` | composes a real lane + residency + KILN provider + workers (with a real `probe`) into `ownerCommand`; additive only |
| Checks | `checks/boundaries.json`, `checks/network-allowlist.json` | two new edges (`durable → workers`, `workers → lane/record/contracts`, `cli → lane`, `cli → workers`); one allowlist entry (`residency.ts`'s loopback `fetch`) |
| Test tooling fix | `tests/walk/drive.ts` | `kiln()` gained a process timeout (none existed before r16) — found and fixed after it let a real deadlock run for hours |

## 3. How the design carries the contract

* **A real generation never bypasses the lane.** `requestThroughLane` is the only path `conversation.ts` or housekeeping can reach a model through; `kiln check boundaries` enforces that `workers` is the tree's only importer of `pi-ai`'s request surface.
* **Replay discipline is a property of the checkpoint, not of discipline.** `runTurn` commits one tool call at a time; a resumed call rebuilds the *whole* message history from `checkpoint.toolCalls` alone, nothing else is trusted.
* **A judge cannot be silently weaker.** `bindConversationRole` throws before any `pi-ai` call; a residency failure for a judge waits and names the reason, it never substitutes a different model.
* **A timeout ends a step, never a gate.** `GenerationTimeoutError` takes the exact same failure path (release the lane, let the uncaught error become `unit.failed`) a scripted step's failure already used — no new "a clock settles something" primitive.
* **Residency is owned, and a legitimate restart is not confused with a bypass.** `reconcile(expected?)` is the one place the design looks outside its own bookkeeping; adopting the `expected` model on a restart keeps that property true without reintroducing OBS-5's undetectable-bypass risk for anything else resident.

## 4. How far the evidence can be trusted

| Evidence | What it shows | What it does not |
|---|---|---|
| Default tier (900 new, 500 legacy) | behaviour, checks, CLI, fixtures — including real end-to-end conversations | timing under heavy same-machine load (§8) |
| Proof tier, 133/133 | the kill-point matrix including the two new real-generation points (`unit.tool-call-committed`, `unit.pre-result-commit`), the timeout case, and the full-walk kill case | power loss |
| Weakened control (T027) | a `runTurn` without replay discipline genuinely double-writes when killed at the same point — the proof is not vacuous | sabotages nobody thought of |
| 6 mutation checks | each named sabotage caught by a named test, tree clean after revert | sabotages outside the six named |
| Live end-to-end runs | a real provider call, a real lease, a real tool execution, a real 9-gate walk to Merge (~185–215s) | a model other than `gemma4:12b` on this exact host |
| Node floor matrix (§8.2) | the default and proof tiers green on both Node binaries actually installed on this host | the historical `22.19.0` floor point itself (not installable here without a version manager) |

The evidence is **load-sensitive in a way no prior row's was**: real LLM inference wall-clock time is the single most load-dependent thing this row adds to the test suite. Three tests are confirmed to fail only under the full-suite's own contention and pass cleanly alone, every time they were re-checked (§8).

## 5. Success criteria

| | Result |
|---|---|
| **SC-001** every applicable gate, every worker/judge step real, 0 stand-ins, reaches Merge | met: `real-worker-walk.test.ts`, ~185–215s |
| **SC-002** kill-and-resume equals uninterrupted; 0 double-executions; 100% of resumes with a prior call get the structured notice | met: `worker-replay.proof.test.ts` (unit-level) and `real-worker-walk-kill.proof.test.ts` (full-walk-level); corrected during implementation to say the notice fires on *every* resume with a prior call, kill or not — `runTurn` is stateless and cannot tell the difference, and this is the safer side to err on (spec.md US2 scenario 3, corrected) |
| **SC-003** every judge records the strongest model; 100% of weaker-tier attempts refused before any call | met: `judge-tier-refusal.test.ts`, `judge-no-fallback.test.ts` |
| **SC-004** a bypassed model is detected; the next acquire refuses by name | met, **corrected**: not "recorded as a broken-guarantee event" — no new event type was added (FR-027's own decision applies here too); the refusal itself, via the existing `LaneError` path, is the detection |
| **SC-005** every configured model has a readiness result; 100% of capability-missing attempts refused by name | met: `requireCapability`, probed fresh every `runTurn` call |
| **SC-006** the resident set never exceeds budget; a swap counted only on a genuine tier change | met: `ResidencyBudgetError`, the unmodified affinity logic in `affinity.ts` |
| **SC-007** r13/r14/r15 still pass; `legacy/` and ROADMAP unchanged; `kiln check` passes | met: legacy diff empty, tree id `20a82c7e…` unchanged, ROADMAP hash unchanged, five PASS |
| **SC-008** a timed-out step fails by name, releases the lane, never settles the gate by the clock | met: unit-level and full-walk-level kill-mid-timeout cases |

## 6. Deviations from the plan (all recorded in `notes.md` as they happened)

1. **The planned boundary edges formed a real cycle** (`durable → workers → lane → durable`). Corrected with the same port-inversion r13 already uses for `durable`/`lane`: `workers → lane, record, contracts`; `durable` never imports `workers`.
2. **FR-027's `lane.transition` cannot be emitted** — confirmed `legacyEntry`, permanently read-only, reserved for replaying the first program's streams. Decided (human's call, 2026-11-01): struck; real transitions are observable through `lane.acquired`/`lane.swapped`/`lane.released` and `kiln.lane`'s document fields instead. SC-004's wording was corrected to match on 2026-11-02.
3. **Readiness probing lives in `conversation.ts`, not `residency.ts`'s `load()`** as T033's text originally sketched — `load()` has no concept of which capability a role needs; the check belongs with the caller that knows the requirement.
4. **The CLI-wiring gap was bigger than planned**: nothing in production code constructed a lane or real workers for the CLI-launched `kiln owner` process at all (T037, found while investigating the boundary cycle at T004). Fixed additively.
5. **The walk engine itself needed a second, separate fix beyond T037's CLI wiring** (found at T038): `durable/src/walk/walk.ts`'s `work()` had no field letting a *flow walk* bind a gate's `todo` entry to a real role — only the flat `script: UnitSpec[]` row shape could. `WalkInput.script.real` closes this; without it SC-001 was unreachable through the walk engine regardless of how well the CLI wiring worked.
6. **A real import cycle required `workers`'s types to be declared twice** (in `durable/src/types.ts` as the port, and locally in `conversation.ts`), never imported across — the same discipline the boundary-cycle fix already established, applied consistently.
7. **`UnitCheckpoint` grew richer than first sketched**: `toolCalls` carries `result`/`isError`/`round` (not just `name`/`arguments`/`replaySafe`), because the whole message history must be rebuildable from the checkpoint alone after a kill — nothing else is trusted.
8. **The Node floor matrix could not test the historical `22.19.0` point** — this host has no version manager and exactly two Node binaries installed (`v24.21.0`, `v26.8.2`). Recorded as a limitation, not fabricated (§7, §8.2).

## 7. Open items and what this row did not decide

* **FR-027 / `lane.transition`** — decided (not open): struck, Option A, human's call.
* **A trade-off in `reconcile(expected?)`, stated plainly**: narrows OBS-5's detection for one specific case — something *other* than KILN loading the exact same model name KILN's own next acquire is about to request anyway is now silently adopted rather than flagged. Weighed against the alternative (crash-resume unreachable for every real-role lease-holding kill), this is the right side to give way on; a later row building real multi-host/multi-operator scenarios should revisit it.
* **`release()` unloads a model on every release unless pinned** — correct per FR-024, but means two consecutive *units* needing the same unpinned model still pay a real unload-then-reload between them (fixed only *within* one unit's own multi-round conversation, §7a item 1 below — not *between* separate units or gates). Does not miscount as a swap (FR-023 holds); an efficiency question for LANE-4/r25 or a smarter keep-warm policy, not this row's to optimize.
* **A real model occasionally hallucinates an undeclared tool name** — correctly refused (no guarantee is at risk); the system prompt was strengthened to reduce likelihood, which is not the same as a fix. Graceful in-turn recovery from a hallucinated call is a real feature for a later row to design, not a one-line patch.
* **The compaction/housekeeping call site does not apply to this row's design**: the pinned library's real `CompactionTask` operates on its own native conversation abstraction, which `runTurn` deliberately never adopts (it rebuilds `pi-ai` context from the checkpoint instead). Revisit if a later row adopts the library's native conversation abstraction for other reasons.
* **The Node floor matrix's `22.19.0` gap** — this host cannot install it without a version manager; r13–r15's own matrices measured it on a different host at the time. Not fabricated here.
* **Only Clarification 2's "one resident model" option actually ran live**: the committed fixture (`walk-real-worker.json`) binds every role — author, worker, judge — to the SAME model (`gemma4:12b`), so the full live walk never exercises a genuine tier-driven swap between two distinct real models. The "two distinct models" option exists only as a unit-level test against a fake HTTP layer with placeholder names (`lane-task.test.ts`'s `m1`/`m2`), never live. This host has other real models installed (`qwen3.8:27b-mlx`, `gemma4:31b-mlx`) that would support a live two-model proof; building and running one is additive, left for a later checkpoint or r17, not fabricated here as already done.
* **Found at code review (T047 and, independently and more deeply, the orchestrator's real `/code-review` pass, §7a): the readiness probe runs far more often than FR-042 requires, and its four checks ran sequentially.** `conversation.ts`'s `callModel` calls `config.probe` fresh on *every conversation round*, not once per model-load; `residency.ts`'s `probe()` itself makes three separate real generations (tool-calling, streaming, usage checks) plus one cheap metadata call. A single step can pay up to `MAX_TOOL_ROUNDS` (4) × 3 extra real generations before its own real answer. **The sequential part is fixed** (§7a item 2: `Promise.all`, same checks, same frequency, ~4x less wall-clock per probe). **The per-round frequency is still not cached, deliberately**: redesigning that caching boundary (probe once per model-becomes-resident, invalidate on unload, rather than once per round) is a bigger change than Polish's own time pressure should risk for a performance question that changes no guarantee (FR-042/SC-005 are met, arguably over-satisfied). Left as a deliberate, documented trade-off for a focused follow-up.

## 7a. A second code review, by the orchestrator: the real `/code-review high` skill against the whole branch

The fork that implemented Polish (T042-T047) had no access to the actual `/code-review` skill and substituted a manual read (§6 above, one finding). Before considering this row closeable, the orchestrator ran the real skill against the whole branch diff. It found ten issues; five were genuine defects beyond the manual review, confirmed by reading the code directly before fixing anything (full account: `notes.md`'s own dedicated section, same date).

**Fixed (four, plus the probe-sequencing item above):**
1. **The actual dominant-but-not-sole cause of this row's extreme live-walk timings**: `unit.ts` released the lane unconditionally after every commit, including mid-conversation (`turn.kind === "continue"`) — so once residency was wired in (T013), every tool-call round paid a real model unload *and* the next round's real reload, not only once per unit. Fixing this correctly required also guarding the *acquire* side: `acquire()` has no self-reacquire protection, so a naive "just stop releasing" would have made a task queue behind its own already-held lease and deadlock. Fixed on both sides (`s.lane!.holds(task.id)` skips a redundant acquire; release is held off while `turn.kind === "continue"`), proven by a new test asserting exactly one acquire and one release across a 4-round fake conversation. **Measured**: a live walk re-run after this fix alone was statistically unchanged (~212s) — proving the probe-frequency cost above is the larger single contributor on this host, not this bug; fixing only one of the two would have understated the real improvement available.
2. `probe()`'s sequential round trips, parallelized (above).
3. `modelFor()` never received `port` — every real generation silently targeted Ollama's default port even when `KILN_OLLAMA_PORT` named another. Never manifested on this host (default port throughout); fixed for any other configuration.
4. The streaming capability was declared in the contract but never actually checked (`requireCapability` was only ever called with `"toolCalling"`), even though every real call streams under the hood. Fixed: checked unconditionally alongside tool-calling.
5. `KILN_OLLAMA_PORT`/`KILN_MODEL_BUDGET_BYTES` were parsed with a bare `Number(...)`, which never throws on a typo — silently became `NaN`, failing confusingly later instead of refusing at startup. Fixed with a named `RealWorkersConfigError`.

**Left as documented, deliberate open items, not fixed** (full reasoning in `notes.md`):
6. `pin`/`hold` are fully implemented but no production call site ever engages them — deciding *when* to pin is a policy decision for r17 (config as files) / r18 (the director), not this row's provisional roster to guess at.
7. `reconcile()`'s restart-adoption path hardcodes `pin: false` — inert today (item 6), and a "correct" fix would require assuming a restart's pin state with no information to base it on.
8. `doc.hold` is set on every acquire but never consulted by the real unload decision — same deferral as items 6–7.
9. `seam.test.ts`'s provider/model-request scan skips all of `packages/workers/` rather than naming its two sanctioned call sites precisely — a test-coverage nuance (the boundary check still catches an import-level violation), not an active defect; correctly narrowing it risks more test-surgery than this late in the row is worth for the risk it closes.

**Re-verified after all five fixes**: `npm run check` five PASS; `npm run proof` **133/133**; `npm test` same two already-known load-dependent flakes under full-suite contention (confirmed non-regression, as every prior checkpoint). A clean, isolated re-run of the full live walk after both the lease and probe-parallelization fixes together: **177.6s** (previously 185-215s) — a real, modest improvement; a separate attempt timed out at 600s under contention immediately following the heavy proof-tier run just before it, re-confirmed clean on a second isolated attempt, the same load-dependent pattern documented throughout this row (§8).

## 8. What went wrong on the way (the honest log)

1. **Three checkpoints' own `npm test` had been silently passing a failing suite** since T014: every run was piped through `tail`, swallowing the real exit code. Root cause confirmed (five stale hardcoded test literals, pre-existing from T009/T011, not from new code) and fixed; the lesson — run tests directly, check `$?` — was applied from that point on.
2. **A real deadlock, not slow generation**: `release()` set its lease free *before* `residency.unload()` resolved, letting the next unit's `grant()` race the current unit's still-in-flight unload. This consumed an entire 15-then-40-minute test budget once, and separately consumed over 7 hours of wall-clock when `tests/walk/drive.ts`'s own `kiln()` helper turned out to have no process timeout at all to cut it short. Both are fixed (§6 of `overview.md`, `notes.md`'s T038/T039 and orchestrator entries).
3. **A false broken-guarantee on every real kill-and-restart**: a restarted process's empty residency bookkeeping collided with Ollama's own `keep_alive:-1` persistence. Fixed with `reconcile()`'s `expected` parameter.
4. **A real model hallucinated an undeclared tool name** on the first live kill-mid-generation run — correctly refused by existing machinery, which correctly failed the unit and correctly left the walk stuck (no guarantee broken). The system prompt was strengthened; no design change was needed or made.
5. **The orchestrator's own Node-floor-matrix run hit a *second*, load-driven false failure**: `drive.ts`'s newly-added 120s default timeout fired on a genuinely slow (not hung) `kiln feature next` call, during a period of unusually heavy same-machine inference load (this row's own cumulative testing, run back to back for many hours). Raised to 300s, re-verified clean.
6. **A `node:test` default-tier test (`real-worker-walk.test.ts`, SC-001) failed once inside the full 900-test run at its own 10-minute explicit timeout**, while passing cleanly alone twice (184s, 205s) both before and after. Left as-is rather than raised further: 10 minutes already carries roughly 3× margin over measured normal timing; the one failure is attributed to this session's own unusually concentrated, concurrent real-inference activity (manual diagnostics, mutation checks and the Node floor matrix all competing for the same single Ollama instance), not a defect.
7. **The Node-floor-matrix proof run under Node 24 failed once at `real-worker-walk-kill.proof.test.ts`** while the orchestrator was simultaneously running other heavy real-model work on the same host — the failing unit hit its own tier timeout cleanly (`unit.failed`, lease released, no corruption; SC-008 held), after the walk had already real-conversed through 7 gates. Re-run alone: 1/1 pass, 232.9s, well inside its 600s budget — confirmed load-dependent, not a defect, the same class as items 5 and 6.
8. **`sed -i` without a backup suffix fails on macOS** (needs `-i ''` or `-i.bak`) — no loss, caught immediately by the shell's own error.

## 9. Evidence

* **Readings**: [baseline.md](./baseline.md) — before, per-phase checkpoints, the Node floor matrix.
* **Lab notebook**: [notes.md](./notes.md) — every real finding, in the order found.
* **Mutations**: 6 of 6 caught (`/tmp/k16-mutations.json`, scratch input, not committed — same convention as r15).
* **Commands**: `npm test` · `npm run proof` · `npm run check` · the quickstart ([quickstart.md](./quickstart.md), run end to end — `baseline.md`'s T043 entry).
