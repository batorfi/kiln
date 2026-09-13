# Runtime API — 002-kiln-lane (r1)

**Status**: design contract (Phase 1, D1–D8). The **module surface** r1 exposes to a
driver / test. Every signature is *behavioral* (what a caller may do and what the
invariants guarantee), not an implementation body — `tasks.md` / `/speckit.implement`
own the bodies. **Trace**: P-I … P-IX (per module).

**Golden rule (Principle I):** a module *produces or moves*; **no module decides its
own gate.** A gate's outcome is a **human move** (or a *recorded* pre-delegation);
the runtime only *emits* it.

---

## `kiln/src/lane.ts` — the single lane (E1 / US1, P-III) · `F-SINGLE`

The director-as-scheduler over one `FactoryState`. **No parallel structure.**

```ts
type WorkUnit = {
   id: string;
   role: Role;              // from kiln/src/roles.ts
   tier: Tier;              // the unit's required tier (P-II/IV)
   work?: unknown;          // input the stub resident consumes
   out?: unknown;           // fixed, deterministic output (D4)
   };

// Build a fresh single-lane state (resident null, queue empty, switches 0).
function makeLane(state?: Partial<FactoryState>): Lane;

// The director drives a walk of work units. The invariant F-SINGLE (SC-001) holds at
// every captured instant: at most one resident AND one running unit.
function run(lane: Lane, units: WorkUnit[], resident: Resident): WalkResult;

// Hold / yield / resume / reclaim (P-III). A yielded slot is always reclaimed before
// the next unit begins; a reclaimed slot may run the next affinity-compatible unit
// with NO swap.
function hold(lane: Lane): FactoryState;      // capture a snapshot
function yield_(lane: Lane, unit: WorkUnit): FactoryState;
function resume(lane: Lane, unit: WorkUnit): FactoryState;

// The single-lane check, asserted over snapshots (not just final state).
function assertSingleLane(snapshots: FactoryState[]): void;   // throws if >1 resident/running
```

**Guarantee:** `assertSingleLane` holds for every snapshot of a walk (US1 SC-1/3).
A `yield` is always followed by a matching `resume` before the next unit starts
(US1 SC-2).

---

## `kiln/src/gate.ts` — the gate primitive (E2 / US2, P-V) · one channel (NC3)

Holds the lane at a frontier head; degrades to a durable `wait` headless; enforces
`MoveVocabulary(gate)` (G3).

```ts
// Import the per-gate move set — do NOT re-declare it (move-vocabulary.ts is canonical).
import { moveAllowed, moveVocabulary, type GateId } from "../contracts/move-vocabulary.ts";

type Gate = {
   id: GateId;                       // gate0 | 1..9 (G1)
   open: boolean;
   move?: string;                    // ∈ MoveVocabulary(id), else rejected (SC-3)
   decidedBy?: string;               // human@… — required for approve/restart/merge (R3)
   preDelegation?: { of: string; by: string; at: string; reviewer?: string; note: "no objections" };
   wait?: { gate: string; token: string; deadline: string };   // the ONLY unresolved shape (R3)
   };

// Open a gate and hold the lane. Returns a "wait" request headless (never a gate-completion).
function openGate(gate: Gate): "held" | wait-request;

// Apply a human move. Illegal (move ∉ MoveVocabulary(id)) → REJECTED, gate stays open.
function applyMove(gate: Gate, move: string, decidedBy: string): Gate;        // throws on illegal move
// Headless: print the card, emit a `wait` (token+deadline), HALT — no gate-completion (US2 SC-1).
function headlessWait(gate: Gate): wait-record;
// Resume by token (the single channel, NC3): a `human-decision` for that token → resolve + advance.
function resumeByToken(gate: Gate, token: string, decidedBy: string): gate-completion | "still-open";
```

**Guarantee (US2):** headless → **exactly one `wait`**, **no `gate-completion`**
(SC-1); an illegal move is **rejected**, gate stays open (SC-3); a legal move with
a non-empty `decidedBy` emits a `gate-completion` and advances — and the resulting log
**PASSES `kiln/validate/log.ts`** (SC-4, the dogfood). The unattended tail (US2 SC-4)
pre-authorizes **only the approve side** of trailing gates and emits a **distinct
`pre-delegation`** per auto-crossed gate; any veto (critic / reviewer `restart` /
verifier `reject` / checkpoint overflow) **halts the cruise**.

---

## `kiln/src/log-writer.ts` — the factory-log writer (E3 / US3, P-V/VII) · the choke point

The **single choke point** that enforces no-silent-approval **at write time** (D3)
and emits R1–R6-conformant JSONL to `kiln/factory-log/`.

```ts
// A monotonic, schema-conformant record emitter. ts non-decreasing; seq strictly increasing / gap-free.
class LogWriter {
  write(rec: FactoryRecord): void;              // throws if the record would violate R3/R4
  drain(): string[];                            // the emitted JSONL lines (to kiln/factory-log/)
   snapshot(): { seq: number; ts: string };        // the last emitted position (for F-RECON / truncation tests)
   enforceNoSilentApprovalOn(rec: FactoryRecord): void;   // throws pre-emit if an approve/restart/merge lacks decidedBy or a distinct pre-delegation
}
// The no-silent-approval predicate (R3/R4) — the writer's internal guard.
function isSilentApproval(rec: FactoryRecord): boolean;     // true ⟺ approve/restart/merge with NO decidedBy and NO distinct pre-delegation
```

**Guarantee (US3, SC-002/SC-003):** a complete walk's JSONL **PASSES**
`kiln/validate/log.ts` (R1–R6); a truncated prefix still **PASSES**; a forced
out-of-order/gap stream **FAILS with a named reason**. No `gate-completion` carries
`move ∈ {approve, restart, merge}` without a `decidedBy` or a distinct
`pre-delegation` — enforced *before* the line is written.

---

## `kiln/src/scheduler.ts` — the model-affinity scheduler + `Cost` (E4 / US4, P-IV/P-II)

Holds the resident; swaps **only on a tier change**; binds line-of-defense roles to
`strongest`.

```ts
// A "no swap on an affinity-compatible boundary" probe + the switch counter = #genuine boundaries.
function schedule(units: WorkUnit[], resident: Resident): WalkResult;   // F-AFFINITY
function switchCount(units: WorkUnit[]): number;            // # of genuine tier boundaries (== emitted switches)
// P-II / G2 / L1 — reuse roles.ts; a weaker binding on a LoD slot is a config error at schedule time.
import { bindRole, isLineOfDefense, weakerBindingRejected, type Tier } from "./roles.ts";
```

**Guarantee (US4, SC-004):** all-same-tier → `switches = 0`; one genuine boundary →
`switches = 1` (landed *on* the boundary); the four line-of-defense units each bind
`strongest` and **any weaker binding is rejected at schedule time**. Each swap is
bracketed by a `cost` record (`{ switches, wallClock }`).

---

## `kiln/ui/*.ts` — the watch over one `FactoryState` (E5 / US5, P-IX) · `F-EVENTONLY`

```ts
// One shared store; mutates ONLY on events (no timer, no socket, no server). F1.
import type { FactoryState } from "../src/types.ts";
function onEvent(state: FactoryState, ev: FactoryEvent): FactoryState;   // event → new state (pure over the store)
// Layers A/B are PURE reads of state; identical state ⇒ identical render (one source of truth).
export function renderHud(state: FactoryState): string;     // Layer A: rail / lane / switches / clock
export function renderPopup(state: FactoryState): string;   // Layer B: the gate card
// Headless twin: print the same render when a surface is absent; the gate still blocks.
export function printHeadless(state: FactoryState): void;
// The no-poll / no-server assertion (SC-005): inspection of this module set finds no timer/socket/server.
```

**Guarantee (US5, SC-005):** a fired event updates `FactoryState` and both surfaces
recompute from it; a captured identical state yields an identical render; **no timer,
no socket, no server** exists; with the UI disabled the content is **printed** and the
gate **still blocks**.

## `kiln/src/stub-resident.ts` — the deterministic resident (E6 / NC2)

```ts
// The resident-model INTERFACE the tests drive — NO live Ollama, NO network (D4 / P-VIII).
export interface Resident {  run(workUnit: WorkUnit): unknown;   model(): string;   tier(): Tier; }
// A deterministic stub the walk is driven with (outputs fixed per input ⇒ replayable through log.ts).
export function makeStubResident(opts?: { model?: string; tier?: Tier }): Resident;
// A genuine live-model smoke walk is r3 — NOT provided here (NC2).
```

---

## `kiln/index.ts` — the wiring (replaces 001's stub)

`kiln/index.ts` **is now wired** (001's `WIRING_STATUS = "not-wired …"` is false →
`laneIsWired() === true`), exporting the modules above. It emits **no `gate0`
decision** and **admits no program** (P-VI/FR-012); the admission is
`specs/ROADMAP.md`, a human move.
