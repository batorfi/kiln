# Research: Real local workers (row r16)

Decisions taken before design (each: **Decision · Rationale · Alternatives**). Nothing here re-opens r13's gate contract, r14's walk, r15's record, or the three clarifications of the spec. Source reading: `kiln/packages/{lane,durable,contracts,workers}`, `kiln/checks`, `kiln/DEPENDENCIES.md`, `kiln/node_modules/@earendil-works/pi-ai/dist/*.d.ts` (installed and read directly — not assumed), `docs/concepts/web-front-door.md` §7.

## R1 — `pi-ai` has no Ollama provider; Ollama is reached as an OpenAI-completions-compatible server ◆

**Confirmed by reading the installed package.** `pi-ai`'s `dist/api/` has one module per concrete chat API: `anthropic-messages`, `openai-completions`, `openai-responses`, `azure-openai-responses`, `openai-codex-responses`, `bedrock-converse-stream`, `google-generative-ai`, `google-vertex`, `mistral-conversations`, `pi-messages`. There is no `ollama.ts`. Ollama's own server exposes an OpenAI-compatible endpoint at `http://127.0.0.1:11434/v1` (chat completions), which matches the `openai-completions` API's shape exactly.

**Decision.** `packages/workers/src/provider.ts` registers Ollama as a `Provider<"openai-completions">`:
```ts
const provider: Provider<"openai-completions"> = {
  id: "kiln-ollama",
  name: "Ollama (local)",
  baseUrl: `http://127.0.0.1:${port}/v1`,          // port from residency config, default 11434
  auth: { type: "api_key", /* static placeholder credential: Ollama does not check it, but every
                               provider declares an auth type (pi-ai's own invariant) */ },
  models: [],                                       // static baseline empty; see R8 for how models are listed
};
models.setProvider(provider);                        // models: MutableModels, from createModels()
```
A call becomes `models.complete(model, context, options)` or `models.stream(...)` where `model: Model<"openai-completions">` names one Ollama model (`id`, `contextWindow`, `maxTokens`, `compat` — R8). This is the **only** place `packages/workers/` imports `pi-ai`'s request surface; `packages/durable/src/library/open.ts` keeps importing `createModels` only to satisfy the runtime's required constructor option with zero providers (unchanged — r16 does not touch that seam, it gives `packages/workers/` its *own* `Models` instance for real calls).

**Rationale.** Reusing the OpenAI-completions API means `pi-ai` handles message formatting, streaming, tool-call parsing and retries the same way it does for every other provider — no bespoke Ollama client to maintain. **Alternatives.** Ollama's native `/api/chat` endpoint directly (a hand-rolled client duplicating what `pi-ai` already does for the OpenAI-compatible shape, for no benefit); waiting for `pi-ai` to ship a native Ollama provider (not this row's to wait on — the pinned version is fixed at `1.4.0`, DEPENDENCIES.md).

## R2 — Where each new part lives (the layer rules extend, they don't bend)

**Decision.** `checks/boundaries.json` today allows `lane → durable, contracts` and nothing yet names `workers`. r16 adds:

| Part | Package | Why there |
|---|---|---|
| Role roster (tier/tools/judge flag, provisional), tool declarations + replay-safety classification, the `pi-ai` Context assembly, the Ollama provider registration, the interruption-notice builder | `workers/src/` | the only package that imports `pi-ai`'s request surface (`stream`/`complete`), per the stub's own stated intent |
| Residency manager (explicit load/unload, readiness probes, memory budget), the KILN provider wrapper (enforces lease + resident-model targeting for every request, including housekeeping) | `lane/src/` | residency is the lane's own future scheduler, named as such in r13's comment; the `kiln.lane` document already lives here |
| `unit.ts`'s `work` phase: replace `sleep(stepMs)` with a call through `workers`'s conversation API, inside the unchanged checkpoint/commit shape | `durable/src/tasks/unit.ts` | the task kind itself stays in `durable`; it now depends on `workers` for real work the way it already depends on `lane` for the lease |

New boundary edges needed: `durable → workers` (a unit's work phase calls into workers), `lane → workers`? — **no**: the residency manager's job is loading/unloading a *model name* on Ollama and running readiness probes against it; it does not need to open a conversation, so `lane` does **not** import `workers`. Instead `workers` depends on `lane` (`workers → lane, durable, contracts`) to acquire/release the lease around a conversation and to ask the residency manager for the model it needs — which is itself exposed as a port on `lane`'s existing `LaneApi`-style boundary (data-model.md §3), the same inversion r13 used so `durable` never imports `lane` directly.

**Rationale.** Keeps the one-real-call-site property explicit and checkable (`kiln check boundaries` already fails a stray import by name, as it does for `legacy`). **Alternatives.** Put the conversation logic in `durable/src/tasks/unit.ts` directly (couples the task kind to `pi-ai`, so every future task kind that needs a real call duplicates it, and the "nothing but workers imports pi-ai's request surface" check from the stub's own kiln.json becomes unenforceable).

## R3 — `kiln.unit`'s work phase: the stand-in is replaced, the discipline is not

**Decision.** Today's `work` phase (`kiln/packages/durable/src/tasks/unit.ts`) does, per step `i`: acquire the lane (if `needsLane`) → run the stand-in (`sleep(stepMs)`) → commit (`i+1 < steps` ? checkpoint-and-continue : `unit.settled` + terminal) → release the lane. r16 changes exactly one line of behaviour: where the stand-in ran, a **conversation turn** runs instead — `workers.runTurn(step.id, { role, tier, model, inputs, checkpoint })` — which returns either `{ kind: "continue", checkpoint }` (more turns needed: more tool calls or more of the model's reply), `{ kind: "done", result }` (the step's result — a real artifact, replacing the stand-in's `${label}:${i}` string), or throws (a replay-unsafe interruption mid-turn, or the timeout of R6). Everything *around* that call — `hooks.at("unit.step-begin")`, the lane acquire/release, the commit discipline, the `unit.started`/`unit.settled`/`unit.aborted` events — is **untouched**.

**Rationale.** FR-014 and CORE-4 ("a half-done step never commits a result") are already proven properties of the existing phase; re-deriving them for a real call instead of reusing the exact same commit boundary would be re-litigating r13's proof for no reason. **Alternatives.** A new task kind `kiln.conversation` parallel to `kiln.unit` (duplicates the checkpoint/commit machinery `kiln.unit` already has proven; the spec's Provenance explicitly says r16 "does not change which units a walk creates," only what `work` does).

## R4 — The checkpoint grows a tool-call log; this is what makes FR-012/013 possible

**Decision.** `UnitCheckpoint` (today `{ phase: "work", done: number, results: string[], started?: true }`) gains, for a unit whose role performs real work: `toolCalls: Array<{ id: string; name: string; arguments: JsonObject; replaySafe: boolean; executed: true }>` — appended **in the same commit** as each tool result is recorded, before the model's next turn runs. On resume, `workers.runTurn` is handed this list and:
- for each entry with `replaySafe: true`, it is free to re-issue the call (or, cheaper, hand the model the recorded result directly without re-calling the tool — research leaves this an implementation choice, not a spec constraint);
- for each entry with `replaySafe: false`, it is **never** re-issued; it goes into the structured interruption notice (R5) instead.

**Rationale.** FR-013 requires the checkpoint to "record enough ... to tell replay-safe work apart from not-yet-replayed, unsafe work" — a log of calls with their classification is the minimal structure that does this and that a kill-and-resume test can assert against directly (count of entries, their flags). **Alternatives.** Re-deriving safety from the tool's name alone at resume time without a log (works only if the tool roster never changes between a crash and a restart — a fragile assumption `workers`'s own roster module (R7) would otherwise have to guarantee by freezing itself, which is a bigger constraint than just logging what happened).

## R5 — The structured interruption notice (Clarification 3, made concrete)

**Decision.** On resume, before the conversation's next turn, `workers` prepends one synthetic `UserMessage` (or, where `pi-ai`'s `Context` conventions prefer it, a `ToolResultMessage` per outstanding call — confirmed against the actual message ordering `pi-ai` expects during implementation, not invented here) whose text is generated from the checkpoint's `toolCalls` log:
```
You were interrupted before this step finished. Here is what already happened:
- read-file({"path":"notes.md"}) — already ran; its result is in your history above.
- write-file({"path":"out.md","content":"…"}) — ALREADY EXECUTED. Do not call it again with the same effect.
Continue from here.
```
Each line names the tool, its arguments (from the log, R4), and — only for a `replaySafe: false` entry — the explicit "already executed, do not repeat" flag FR-012 requires.

**Rationale.** A model told only "you were interrupted, be careful" in prose has no guarantee it infers *which* call not to repeat; naming each one by its logged arguments makes the instruction checkable by the test (does the notice's text contain the exact tool name and argument the log recorded) rather than a matter of prompting luck. **Alternatives.** A single generic sentence (Clarification 3's rejected Option B — less testable, and the spec explicitly chose the structured form).

## R6 — The per-tier timeout fails a step, never a gate

**Decision.** `workers.runTurn` is raced against a timeout (`AbortSignal.timeout(ms)` composed with the task's own `run.signal`, so a factory close still wins). `ms` comes from the role's tier via the provisional roster (R7) — a config value, not hardcoded in `unit.ts`. On expiry, `runTurn` rejects with a named `GenerationTimeoutError`; `unit.ts`'s `work` phase catches exactly this error (distinct from an aborted-by-factory-close signal, which commits nothing, matching the existing `if (run.signal.aborted) return;` branches) and takes the **same path the existing `catch` block already takes for any step failure**: release the lane if held, then let the error propagate to the task's `abort` phase's commit of `unit.failed` — the identical terminal-outcome shape the scripted stand-in already uses for a failure, with no new "clock settles something" primitive (constitution V; FR-008).

**Rationale.** r13's own rule — "there is no `sleep`, no timer and no `settleOther`" (seam-api.md) — is about the *durable task runtime*, not about an in-process race inside one `work` invocation; `AbortSignal.timeout` here only ends the HTTP-level wait for one step's own `work` call, exactly as a kill would, and the outcome is written through the same commit the runtime already requires. **Alternatives.** A durable timer task that fails the unit from outside (re-introduces the "a clock causes a settlement" shape the constitution forbids and r13 deliberately avoided); no timeout, operator-abort only (the spec's Clarification 1 explicitly rejected this as Option B).

## R7 — The provisional roster (Clarification 1 from the spec itself, made concrete)

**Decision.** `packages/workers/src/roster.ts` exports one frozen object, explicitly commented as provisional and replaced wholesale by r17:
```ts
export const PROVISIONAL_ROSTER: Record<string, RoleEntry> = {
  worker:   { tier: "standard",  tools: ["read-file", "write-file"], judge: false, timeoutMs: 120_000 },
  reviewer: { tier: "strongest", tools: ["read-file"],                judge: true,  timeoutMs: 180_000 },
};
```
`judge` feeds `isJudge`/`bindRole` (`contracts/src/roles.ts`, unchanged); `tools` is checked against `tools.ts`'s declared set (R-below) at conversation-open time — a role naming an undeclared tool is a configuration error caught before any `pi-ai` call, the same "refused, not silently accepted" shape FR-030 already requires for tier.

**Rationale.** Two roles are the minimum the spec's own User Stories need: one producer, one judge (spec Assumptions). **Alternatives.** A roster per feature fixture (over-engineering a structure r17 deletes anyway); roles hardcoded inline in `unit.ts` (scatters what should be one small, clearly-provisional module — harder for r17 to find and delete wholesale).

## R8 — Readiness probes: a real request against the running Ollama, not a static table

**Decision.** `lane/src/residency.ts` exposes `probe(modelId): Promise<Readiness>` where `Readiness = { toolCalling: boolean; streaming: boolean; usageAccounting: boolean; contextWindow: number }`. It is implemented as one minimal real request to the model through the same provider (R1): a tiny prompt with one trivial tool offered, checked for a successful tool call in the response (`toolCalling`), a streamed response consumed as a stream (`streaming`), the presence of a `Usage` object in the `AssistantMessage` (`usageAccounting` — this is pure capability-detection per Clarification 2, no figures are persisted), and `contextWindow` read directly from the `Model<"openai-completions">` entry's static field (not probed — it is declared, not discovered). A probe result is **not cached across the row's own process lifetime** past the point FR-042 names: it is re-run at the moment a model is actually requested to become resident, so a model removed between a probe and an acquire is caught.

**Rationale.** Ollama's own model listing (`/api/tags`) reports installed models but not whether a given one actually supports tool calling in practice (small/older local models often don't, even if the Modelfile claims chat support) — only a real round trip proves it, matching the spec's own FR-040 wording ("checking at least ... tool-calling support"). **Alternatives.** Trust a static per-model-family table (the spec's own Edge Cases name a model being "removed between a probe and a step" as a case the design must catch — a static table can't).

## R9 — The KILN provider: one wrapper, one place every request is forced through

**Decision.** `lane/src/kiln-provider.ts` exports `requestThroughLane(step: TaskId, call: (model: Model<Api>) => Promise<T>): Promise<T>` — the **only** way `workers/src/conversation.ts` (and the harness's own housekeeping, e.g. compaction, when it needs a model) is allowed to reach a model. It: resolves the resident model from the `kiln.lane` document; if the caller's required tier does not match, it goes through the existing `acquire()` path (a swap, FR-022/FR-023, unmodified affinity logic) rather than bypassing it; then invokes `call(model)` while holding the lease the caller already has (or acquires one, for a caller — like compaction — that does not yet hold one, sharing the lease if its own step already does, per the spec's Edge Case on this exact scenario).

**Rationale.** LANE-3's "Must" line ("**Every** model request, including harness-internal ones ... goes through a KILN provider") is only checkable if there is exactly one function in the codebase that can make the call — `kiln check boundaries` extended to assert `workers` is the only importer of `pi-ai`'s request surface, and this function is the only caller of *that*, closes the loop structurally rather than by convention. **Alternatives.** Each caller acquiring the lease and calling `pi-ai` directly (re-implements the enforcement at every call site; exactly the shape OBS-5's "model loaded outside KILN's residency" broken-guarantee signal is designed to catch when it slips).

## R10 — Detecting a model loaded outside the residency manager's path

**Decision.** `residency.ts` periodically (and always immediately before a new load) reconciles its own record of what it asked Ollama to load against Ollama's actual running-models list (`/api/ps`, the native endpoint — the OpenAI-compat surface has no equivalent, so this one call goes to Ollama's native API, read-only, still loopback-only). A model present in Ollama's list that the residency manager never asked for is reported as the OBS-5 broken-guarantee event, naming the mismatch; it is never silently adopted as "the new resident."

**Rationale.** This is the one place the design must look *outside* its own bookkeeping, because the whole point of US3 is catching a bypass — trusting only the `kiln.lane` document would make the broken-guarantee undetectable by construction. **Alternatives.** No reconciliation, trust the document (defeats OBS-5's purpose for this exact signal).
