# Real local workers (row r16) — the design as built so far

**Snapshot, not final.** This row is mid-implementation (T001–T022 of 47 done and pushed; T023–T028 in progress as this page is written). It describes what the code actually does today, not what `plan.md` proposed before building it — where the two differ, the differences are each recorded in [`notes.md`](./notes.md) with why. This page is refreshed once more at the row's close (T044).

One reading page. For *why* each choice was made read [research.md](./research.md); for the acceptance evidence read [baseline.md](./baseline.md) (there is no `implementation-report.md` yet — that lands with Polish).

## 1. What it is

Until this row, every worker and judge step in a walk was a scripted stand-in: `kiln.unit`'s `work` phase just slept for `stepMs` and committed a fake result. r16 replaces that stand-in, for any unit whose spec names a `role`, with a real, fresh conversation on a local model — reached through Ollama, residency-managed by KILN rather than left to Ollama's own defaults, and bound to a tier that a judge can never silently escape below `strongest`. Everything *around* the call — the checkpoint-then-commit discipline, the lane lease, the kill-point hooks — is exactly what the scripted stand-in already used; a unit with no `role` still runs that original path, untouched.

```
  UnitSpec{role, model, workspace, inputs}
        │
        ▼
  kiln.unit's work phase ──(needsLane)──▶ lane.acquire ──▶ residency.load() [keep_alive pinned] ──▶ Ollama
        │                                                         │
        ▼                                                         ▼
  s.workers.runTurn(...) ──────────▶ requestThroughLane ──▶ pi-ai Models.complete() (openai-completions, Ollama's /v1)
        │                                  (shares the step's lease; never a second acquire)
        ▼
  tool call? ──yes──▶ run the tool ──▶ commit {toolCalls: [...]} ──▶ ask again (in progress: T023)
        │no
        ▼
  commit {status: "completed", result} ──▶ unit.settled ──▶ lane.release ──▶ residency.unload() (unless pinned)
```

## 2. The conversation and the workers port (T006–T022, done)

- **The provisional roster** (`workers/src/roster.ts`) — one producer (`worker`, tier `standard`) and one judge (`reviewer`, tier `strongest`), each with a `systemPrompt`, a permitted tool list, and a `judge` flag feeding the existing `isJudge`/`bindRole` (`contracts/src/roles.ts`, unchanged). Explicitly provisional — its own file header says r17's configuration-as-files replaces it wholesale.
- **Two tools** (`workers/src/tools.ts`) — `read-file` (replay-safe) and `write-file` (not replay-safe), each scoped to the feature's workspace directory. Classification is a declared field, never inferred.
- **The conversation** (`workers/src/conversation.ts`) — `runTurn` resolves the role (refusing a judge bound weaker than `strongest` *before* any call, constitution II), offers exactly its tools, assembles a fresh `pi-ai` `Context`, and calls through `requestThroughLane` so the request always holds the right lane lease and targets the resident model.
- **The workers port** (`durable/src/types.ts`'s `WorkersApi`) — `durable` never imports `#workers/*` directly, the same inversion r13 already uses so `durable` never imports `#lane/*` directly either. `unit.ts`'s `work` phase calls `s.workers!.runTurn(...)` through this port; whoever composes the factory (test harnesses today, the CLI once T037 lands) wires in the concrete implementation.
- **`UnitSpec` grew `role`, `workspace`, `inputs`** — `model` is reused rather than duplicated, since it already meant "the model this generation needs resident."

Proven live, end to end, against this machine's installed Ollama and `gemma4:12b`: a real provider registration, a real lease, a real tool execution — not mocked.

## 3. Residency and the lane (T006–T014, done)

- **The residency manager** (`lane/src/residency.ts`) is the *only* path by which a model becomes or stops being resident: `load()`/`unload()` call Ollama's native API directly, loopback only. `load()` pins an explicit `keep_alive` (confirmed live: Ollama's own default unloads a model after ~5 minutes with no KILN-caused event — a real finding made while preparing for implementation, not assumed). `probe()` makes one real round trip to check tool-calling, streaming and usage-accounting capability; `reconcile()` compares Ollama's actual running set against the manager's own record to catch a bypass.
- **The KILN provider** (`lane/src/kiln-provider.ts`) — `requestThroughLane` is the one function every model request, including the harness's own housekeeping, must go through. A caller already holding its step's lease is never asked to acquire a second one.
- **`kiln.lane`'s document** grew `pin` and `budgetBytes` — plain fields, not new events: `grant()` now calls `residency.load()` before granting a lease for a model not yet resident; `release()` calls `residency.unload()` unless the model is pinned.
- **The per-tier timeout utility** (`lane/src/timeout.ts`) races a generation against `AbortSignal.timeout(ms)`, throwing a distinctly-named `GenerationTimeoutError` — wiring it into `unit.ts` so a hang fails the *step*, never the gate, is T025 (in progress).

## 4. A judge is never silently weaker (T015–T017, done)

`bindConversationRole`'s tier refusal is proven to happen *before* any provider call (a spy on the request path never fires for a misbound judge), and a judge's residency failure is proven to never substitute a different, already-resident model — only a retry of the *same* model can let the step proceed.

## 5. What's next

- **US2 — replay discipline (T023–T028, in progress):** the checkpoint grows a `toolCalls` log so a kill between two tool calls never re-issues a write; a structured interruption notice tells a resumed conversation exactly what already happened; the timeout gets wired in; two new kill points land in the proof tier.
- **US3's remaining proofs, US5's readiness wiring, US6's full real walk (including a found-and-fixed gap: nothing in production code wires a lane or real workers into the CLI-launched `kiln owner` process today — that's T037), and Polish** are still ahead (T029–T047).

## 6. Two real corrections made during implementation

- **An import-cycle in the planned boundary edges** (`durable → workers → lane → durable`) — `checks/boundaries.ts` caught it correctly. Fixed with the same port-inversion pattern r13 already established for `durable`/`lane`: `workers → lane, record, contracts`; `durable` never imports `workers` directly.
- **FR-027's `lane.transition` turned out to be unsatisfiable** — it's `legacyEntry` in the real catalog, permanently read-only, reserved for replaying the first program's streams. Decided (human's call): real residency transitions are observable through the already-committable `lane.acquired`/`lane.swapped`/`lane.released` events and `kiln.lane`'s document fields instead; no new event type was added.

## 7. Files

```text
workers/src/            roster · tools · conversation · provider    workers/tests/   roster · tools · provider · conversation · no-subagent
lane/src/               timeout · residency · kiln-provider · lane-task (extended)    lane/tests/      timeout · residency · kiln-provider · judge-no-fallback · lane-task-residency
durable/src/tasks/      unit.ts (extended: the role branch)   durable/src/types.ts   (extended: WorkersApi, UnitCheckpoint/UnitResult moved here)
checks/                 boundaries.json (workers edges) · network-allowlist.json (residency.ts)
```
