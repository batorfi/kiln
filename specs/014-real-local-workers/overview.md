# Real local workers (row r16) — the design as built

One reading page. For *why* each choice was made read [research.md](./research.md); for what the evidence supports read [implementation-report.md](./implementation-report.md). Where this page and the plan differ, **this page describes the code**; the differences are listed in the report.

## 1. What it is

Until this row, every worker and judge step in a walk was a scripted stand-in: `kiln.unit`'s `work` phase just slept for `stepMs` and committed a fake result. r16 replaces that stand-in, for any unit whose spec names a `role`, with a real, fresh conversation on a local model — reached through Ollama, residency-managed by KILN rather than left to Ollama's own defaults, and bound to a tier a judge can never silently escape below `strongest`. A real `kiln owner` process launched from the actual CLI binary now has a real lane and real workers; a flow walk (not only a flat scripted list) can bind one of its gate's steps to a real role; a crash mid-generation never re-issues a tool call that already ran. Everything *around* the real call — the checkpoint-then-commit discipline, the lane lease, the kill-point hooks — is exactly what the scripted stand-in already used; a unit with no `role` still runs that original path, untouched.

```
  UnitSpec{role, model, workspace, inputs} (flat script) or WalkInput.script.real (a flow walk)
        │
        ▼
  kiln.unit's work phase ──(needsLane)──▶ lane.acquire ──▶ reconcile() ──▶ residency.load() [keep_alive:-1 pinned] ──▶ Ollama
        │                                                       │
        ▼                                                       ▼
  s.workers.runTurn(...) ─────────▶ requestThroughLane ──▶ pi-ai Models.complete() (openai-completions, Ollama's /v1)
        │                                (shares the step's lease; never a second acquire; races the tier's timeout)
        ▼
  pending tool call? ──yes──▶ run ONE call ──▶ commit {toolCalls:[...]} ──▶ return "continue" (one commit per call)
        │no — ask the model for a fresh round
        ▼
  tool call(s) in the reply? ──yes──▶ run the FIRST, queue the rest as `pending` ──▶ commit, return "continue"
        │no
        ▼
  commit {status:"completed", result} ──▶ unit.settled ──▶ lane.release ──▶ residency.unload() (unless pinned)

  A kill anywhere above loses only work that was never committed. On resume, a non-empty `toolCalls` log is
  rendered as a structured interruption notice ("X already executed, do not repeat") before the model is asked
  anything else.
```

## 2. The conversation and the workers port

- **The provisional roster** (`workers/src/roster.ts`) — one producer (`worker`, tier `standard`) and one judge (`reviewer`, tier `strongest`), each with a `systemPrompt`, a permitted tool list, a `judge` flag feeding the existing `isJudge`/`bindRole` (`contracts/src/roles.ts`, unchanged), and a `timeoutMs`. Explicitly provisional — its own file header says r17's configuration-as-files replaces it wholesale.
- **Two tools** (`workers/src/tools.ts`) — `read-file` (replay-safe) and `write-file` (not replay-safe), each scoped to the feature's workspace directory. Classification is a declared field, never inferred.
- **The conversation** (`workers/src/conversation.ts`) — `runTurn` resolves the role (refusing a judge bound weaker than `strongest` *before* any call, constitution II), offers exactly its tools, assembles a fresh `pi-ai` `Context` by rebuilding the whole message history from the checkpoint's `toolCalls` log (nothing else is trusted), and calls through `requestThroughLane` so the request always holds the right lane lease, targets the resident model, and races the role's tier timeout. It does **at most one** of: run the single next `pending` tool call and commit it, or ask the model for a fresh round and commit only the *first* tool call it makes, queuing the rest — so a kill between any two tool calls can only ever lose work that was never committed.
- **The workers port** (`durable/src/types.ts`'s `WorkersApi`) — `durable` never imports `#workers/*` directly, the same inversion r13 already uses so `durable` never imports `#lane/*` directly either. `unit.ts`'s `work` phase calls `s.workers!.runTurn(...)` through this port.
- **`UnitSpec` grew `role`, `workspace`, `inputs`** (a flat script); **`WalkInput.script` grew an optional `real: {roles, workspace}`** so a *flow walk*, not only a flat script, can bind a gate's `todo` entry (`author`/`check`/`judge`/a fix-round's `workers`/`judge`) to a real role — found necessary beyond the originally-scoped CLI wiring (notes.md). Absent, every existing walk is byte-identical.
- **The structured interruption notice** (`buildInterruptionNotice`) — a pure function of the checkpoint's `toolCalls` log, naming every prior call with its arguments and flagging non-replay-safe ones as already executed. Shown on *every* resume with a non-empty log (the function is stateless — it cannot tell a real kill from an ordinary next round), which is the deliberately conservative choice: the safety guarantee never depended on the notice's timing, only on a logged call never being re-asked.

Proven live, end to end, against this machine's installed Ollama and `gemma4:12b`: a real provider registration, a real lease, a real tool execution, a real multi-gate walk to Merge.

## 3. Residency and the lane

- **The residency manager** (`lane/src/residency.ts`) is the *only* path by which a model becomes or stops being resident: `load()`/`unload()` call Ollama's native API directly, loopback only. `load()` pins `keep_alive:-1` (confirmed live: Ollama's own default unloads a model after ~5 minutes with no KILN-caused event). `probe()` makes one real round trip to check tool-calling, streaming and usage-accounting capability, re-run fresh on every `runTurn` call — never cached. `reconcile(expected?)` compares Ollama's actual running set against the manager's own record to catch a bypass; an `expected` model (the one the caller is about to request) is **adopted** rather than flagged, so a process restarted after a kill — whose own in-memory bookkeeping starts empty while Ollama, honoring `keep_alive:-1`, still has the model loaded — doesn't mistake its own legitimate restart for someone else's bypass.
- **The KILN provider** (`lane/src/kiln-provider.ts`) — `requestThroughLane` is the one function every model request, including the harness's own housekeeping, must go through. A caller already holding its step's lease is never asked to acquire a second one.
- **`kiln.lane`'s document** grew `pin` and `budgetBytes` — plain fields, not new events: `grant()` now calls `reconcile()` then `residency.load()` before granting a lease for a model not yet resident; `release()` calls `residency.unload()` unless the model is pinned, **after** which — not before — the lane's own `holder` is cleared, so a release's real unload and the next acquire's real load can never race for the same lane.
- **The per-tier timeout utility** (`lane/src/timeout.ts`) races a generation against `AbortSignal.timeout(ms)`, throwing a distinctly-named `GenerationTimeoutError`; `unit.ts`'s existing generic failure path (release the lane, let the pinned library turn the uncaught error into `unit.failed`) handles it with no special case — a hang fails the *step*, never the gate (constitution V).

## 4. The real CLI wiring

`packages/cli/src/real-workers.ts` composes a real `createLane()` + `createResidency()` + `createKilnProvider()` + `createWorkers()` (with a real `probe` wired to `residency.probe`, required for FR-040/041/042's guarantee to actually hold) and `gate-commands.ts`'s `ownerCommand` passes them into `startOwner`. Additive only — a feature with no `role` unit never touches any of it, exactly as every pre-r16 caller's behaviour is unchanged. `KILN_OLLAMA_PORT` and `KILN_MODEL_BUDGET_BYTES` (default 64 GiB) are the two environment knobs.

## 5. A judge is never silently weaker

`bindConversationRole`'s tier refusal happens *before* any provider call (a spy on the request path never fires for a misbound judge), and a judge's residency failure never substitutes a different, already-resident model — only a retry of the *same* model can let the step proceed.

## 6. Real bugs found and fixed while proving this for real

- **A race in `release()`**: `holder = null` was set *before* `residency.unload()` resolved, letting the next unit's `grant()` run concurrently with the current unit's still-in-flight unload — a genuine infinite retry loop (Ollama idle, 0% CPU), not real generation time. Fixed by moving the clear to after the unload resolves.
- **A false broken-guarantee on every real restart**: a restarted process's `own` bookkeeping starts empty, but `keep_alive:-1` means Ollama never forgot a model the dead process had loaded — so `reconcile()` reported every legitimate crash-resume as a bypass. Fixed with `reconcile()`'s `expected` parameter (above) — narrowed, not disabled: anything resident that is *not* the expected model is still reported.
- **A small local model occasionally hallucinates an undeclared tool name** — correctly refused (FR-005: enforced by what's offered, never by instruction alone), correctly failing the unit. The system prompt was strengthened to reduce the likelihood, which changes no guarantee.
- **The test tooling's own missing timeout**: `tests/walk/drive.ts`'s `kiln()` helper had no process timeout at all, unlike its twin in `support/kiln.ts` — the gap that let the first bug above consume hours of wall-clock instead of failing loudly. Fixed with a 120s default SIGKILL.

## 7. Two real corrections to the plan

- **An import-cycle in the planned boundary edges** (`durable → workers → lane → durable`) — `checks/boundaries.ts` caught it correctly. Fixed with the same port-inversion pattern r13 already established for `durable`/`lane`: `workers → lane, record, contracts`; `durable` never imports `workers` directly.
- **FR-027's `lane.transition` turned out to be unsatisfiable** — it's `legacyEntry` in the real catalog, permanently read-only, reserved for replaying the first program's streams. Decided (human's call): real residency transitions are observable through the already-committable `lane.acquired`/`lane.swapped`/`lane.released` events and `kiln.lane`'s document fields instead; no new event type was added.

## 8. Files

```text
workers/src/            roster · tools · conversation · provider    workers/tests/   roster · tools · provider · conversation · no-subagent · judge-tier-refusal
lane/src/               timeout · residency · kiln-provider · lane-task (extended)    lane/tests/      timeout · residency · kiln-provider · judge-no-fallback · lane-task-residency
durable/src/tasks/      unit.ts (the role branch)   durable/src/walk/    input.ts, walk.ts (real-roles binding)   durable/src/types.ts   (WorkersApi, UnitCheckpoint/UnitResult)
cli/src/                real-workers.ts (new) · gate-commands.ts (extended)   cli/tests/   owner-wiring.test.ts
checks/                 boundaries.json (workers + cli edges) · network-allowlist.json (residency.ts)
fixtures/               walk-real-worker.json
```
