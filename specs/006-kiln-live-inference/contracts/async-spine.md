# Contract — the async spine (r7's one declared signature change)

**Trace**: NC1 = B · FR-015, FR-015a · P-II, P-III, P-IV, P-IX · [research.md](../research.md) D1–D3

This is the **only** upstream signature r7 widens. It is declared here so the change is reviewable at
gate 2 rather than discovered in a diff.

## A1 — The widened interface

```
// kiln/src/stub-resident.ts (the canonical interface; r1)
run(workUnit: WorkUnit): unknown | Promise<unknown>     // was: unknown
```

**Union, not replacement** (D1). Consequences that are part of the contract:

- `makeStubResident` (r1) and `makeLiveResident` (r3) remain **conforming and unedited**. Any change
  to either is a contract violation for this row.
- Callers **must** `await`. `await` on a non-Promise is a pass-through, so the stub path is unchanged
  behaviourally.

## A2 — The propagation set (closed)

**Async**: `lane.yield_`, `lane.run`, `scheduler.schedule`, `walk.buildStubWalk`,
`live-walk.buildLiveWalk`, `runtime-ready.checkRuntimeReady`,
`overlay-ready.checkOverlayReady`, `live-ready.checkLiveModelReady`, `ollama-ready.checkOllamaReady`.

**Must remain synchronous**: `makeLane`, `hold`, `resume`, `assertSingleLane`, `hasSwapTransition`,
`walk.buildProgramWalk` *(it awaits no resident — it only emits records; corrected during implement)*,
`switchCount`, `lodUnitsBoundStrongest`, `bindRole`, `bindAll`, the whole of `kiln/ui/*`,
`log-writer`, `clock`, every `gate.*` helper, and every `kiln/validate` module that only *reads*
(`log.ts`, `roadmap.ts`, `_core.ts`, `_report.ts`).

Adding a function to the async set is a contract change requiring a gate.

## A3 — `bindAll` stays a synchronous throw

```
bindAll(units: WorkUnit[]): void        // sync; throws on a sub-strongest LoD binding
schedule(units, resident): Promise<WalkResult>   // NOT `async`: calls bindAll() synchronously FIRST, then returns run()
```

**Rule**: a line-of-defense role bound below `strongest` throws **synchronously**, before any I/O — *including via
`schedule` itself*, because `schedule` is a plain function returning a promise, not an `async` one (a throw inside an
`async` function would become a rejection).
P-II's guarantee is that a weak judge is rejected *at schedule time, before anything runs*; a rejected
promise would weaken that and would make `assert.throws` silently pass on an unrejected promise
object (`tests/scheduler/scheduler.test.ts:35,40`).

## A4 — Invariants that must hold identically after the change

| Invariant | Rule |
|---|---|
| `F-SINGLE` (P-III) | Exactly one unit in flight at every awaited instant; a forged two-running snapshot still throws. |
| **No concurrency** (FR-015a) | No `Promise.all`, no overlapping units, no parallel residents. Sequentiality is the thesis, not an implementation detail. |
| `switchCount` (P-IV) | Realized swaps still equal the pure counter. |
| Byte-identical render (P-IX) | Identical state ⇒ identical render; no surface awaits anything. |
| Emitted record shapes | 001's union only; **no new `recordType`**. |

## A5 — A forgotten `await` must fail loudly

**Rule**: a probe or walk handed a `Promise` where it expects a resolved result **fails, named**. It
may not read `undefined` fields as absent-and-fine.

**Why it is a contract, not a nicety**: 9 of the ~40 affected call sites are inside the `*-ready`
probes — the P-V/P-VIII proofs themselves. An un-awaited walk there would report a **green** check on
an **unbuilt** walk: a false green of exactly the class this row exists to eliminate. r7 must not ship
a new way to be silently wrong (D8).

## A6 — CLI exit discipline

Every probe CLI (`runtime-ready`, `overlay-ready`, `live-ready`, `ollama-ready`) must exit **non-zero**
on a rejected promise. An unhandled rejection that exits 0 is a contract violation — it converts a
failed proof into a passing command.


## Amendment after code review (2026-09-20) — the failure path (CR-3)

The async spine originally had no failure path: a rejected `resident.run` left `lane.running` claimed and, because the walk's ledger lived only in memory,
left **no record**. Now:

- **`run` reclaims the slot** in a `catch` and throws **`LaneRunError`** (`unitId`, `cause`, and `partial` — the snapshots, transitions, costs and outputs so far).
  `F-SINGLE` holds over the partial snapshots, and the lane is reusable afterwards.
- **`buildLiveWalk` records the halt** — a `hold` transition naming the unit and the failure **code** (never the error text, which may quote server output) and a
  durable **`wait`** at the gate that unit feeds — then throws **`WalkHaltedError`** (`unit`, `code`, and `walk`: the partial `LiveWalk` with its ledger, which passes
  001's `log.ts`). It is deliberately still an exception: a caller that ignores it cannot mistake a halted walk for a finished one.
- `WalkHaltedError` is the **only** new async-set surface; the synchronous set (A2) is unchanged.
