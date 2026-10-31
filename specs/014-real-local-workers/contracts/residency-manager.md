# Contract: the residency manager and the KILN provider (`#lane`)

**Spec**: FR-020 … FR-027, FR-040 … FR-043 · **PRD**: LANE-3, OBS-5 · **Research**: R8, R9, R10

Types and signatures only. The residency manager and the KILN provider wrapper live in `packages/lane/src/`, alongside the existing `createLane()`/`LaneApi`. Neither imports `@earendil-works/pi-ai`'s request surface directly for making a worker's call (that stays in `#workers`, see `worker-conversation.md`); the residency manager calls Ollama's own HTTP API (model load/unload/list) directly, over loopback only — it is not making a *conversation*, only managing what is resident.

## Residency

```ts
interface Residency {
  load(model: string, opts?: { pin?: boolean; signal?: AbortSignal }): Promise<void>;     // explicit; emits lane.transition kind "load"
  unload(model: string): Promise<void>;                                                     // explicit; emits lane.transition kind "yield"; refused if pinned
  probe(model: string): Promise<Readiness>;                                                  // R8 — a real minimal request, re-run at acquire time (FR-042)
  reconcile(): Promise<BrokenGuaranteeReport | null>;                                        // R10 — compares Ollama's actual running set against this manager's own record
}
function createResidency(opts: { port?: number; budgetBytes: number }): Residency;            // one per host (single-factory scope this row, LANE-4 later)
```

`load`/`unload` are the **only** calls that change what is resident on Ollama; `createLane()`'s `grant()` path (today: records a name) calls `load()` before granting a lease that names a model not already resident, and `release()` calls `unload()` when the lane frees up and nothing pins the model (FR-020, FR-024). A `load()` that would push the resident set over `budgetBytes` is refused or queued (FR-025) — never silently exceeded.

`reconcile()` returns non-null exactly when Ollama's actual running-model list contains something this manager never asked to load; its caller commits the OBS-5 broken-guarantee event (FR-026) — `reconcile()` itself does not write to the store, keeping the pure-detection / impure-recording split the rest of the codebase already uses.

## The KILN provider

```ts
function requestThroughLane<T>(req: ProviderRequest<T>): Promise<T>;   // data-model.md §7 — the ONE function every model request goes through
```

- Resolves the resident model from `kiln.lane`'s current document.
- If the caller (via `req.requiredTier`) needs a different tier than is resident, routes through the **existing** `acquire()` (unchanged affinity/swap logic, FR-022/FR-023) rather than bypassing it.
- If the caller's step already holds the lease (the common worker/judge case — `unit.ts` already acquired it before calling `runTurn`), `requestThroughLane` does **not** acquire a second one; it shares the held lease (spec Edge Cases: housekeeping sharing a step's own lease).
- Invokes `req.call(model)` only after the above resolves; never calls `req.call` against a model other than the one the lease now names (FR-022's "never silently served").

This is the function `#workers`'s `runTurn` calls internally to actually reach `pi-ai`'s `Models.complete`/`stream`, and the function the harness's own housekeeping (compaction) calls when it needs a model — there is no second path (LANE-3's "every model request, including harness-internal ones").

## Timeout composition (R6, FR-006 … FR-008)

```ts
function withTierTimeout<T>(ms: number, signal: AbortSignal, work: (signal: AbortSignal) => Promise<T>): Promise<T>;
```

A small utility `#workers`'s `runTurn` wraps its `requestThroughLane` call in: races `work` against `AbortSignal.timeout(ms)` composed with the caller's own `signal` (a factory close still wins over a tier timeout). On timeout it throws `GenerationTimeoutError`, **not** `AbortError` — `unit.ts`'s existing `if (run.signal.aborted) return;` branches must not accidentally swallow a timeout as a factory-close (they are different signals; this is why the two are composed, not the same object). The caller (`unit.ts`) releases the lane and lets the task's `abort` phase commit `unit.failed`, exactly as any other step failure already does (FR-008: no gate is ever settled by this).
