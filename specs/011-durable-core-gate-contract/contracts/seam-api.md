# Contract: the seam's public surface (`@kiln/durable`)

**Spec**: FR-001 … FR-005, FR-020 … FR-022, FR-040 … FR-044 · **PRD**: CORE-1, CORE-2, CORE-4 · **Research**: R1, R7

Types and signatures only, in KILN's terms. **No library name appears in any of them** (SC-010: a test scans the package's exported declarations). Everything else in `kiln/` imports from `#durable/…` and nothing else; **only `packages/durable/src/library/` imports the library**.

## Opening a factory

```ts
interface FactoryOptions {
  store: string;                     // the store directory (one per factory)
  now?: () => number;                // the clock handed to records; never a trigger
  hooks?: Hooks;                     // test-only injection: at(point) and fault(point); a no-op by default
  tasks?: TaskKind[];                // extra task kinds (the lane registers itself here)
}
function openFactory(opts: FactoryOptions): Promise<Factory>;        // takes the ONE owner lock; refuses an owned store

interface Factory {
  readonly ready: Promise<void>;                                     // resolves when waiting gates can accept moves
  readonly reports: readonly Report[];                               // every task parked / faulted the library reported (must stay empty)
  gates: GateApi;
  tasks: TaskApi;
  commands: CommandApi;
  serve(): Promise<Channel>;                                         // starts the local channel (R6)
  inspect(): Promise<Inspection>;                                    // read through the owner, for diagnostics
  close(): Promise<void>;                                            // clean stop: removes lock and socket
}
function inspectStore(store: string): Promise<Inspection>;           // a FRESH reader: no owner, no lock, read-only; for the proof and for r15
```

`openFactory` sets, in the one place the library is opened: the crash-loop guard to *never park* (FR-040), the models option with **no provider** (R1), the injected clock, and `onReport` → `reports`. It resumes every task and withholds `ready` until R13's convergence holds.

## Gates and commands

```ts
interface GateApi {
  open(key: string, spec: GateSpec): Promise<OpenOutcome>;
  submit(gateId: string, key: string, move: Move): Promise<Outcome>;
  state(gateId: string): Promise<GateState>;
}
interface CommandApi {                                               // CORE-5
  run<T>(key: string, kind: string, request: JSON, effect: (tx: Tx) => Promise<T>): Promise<CommandOutcome<T>>;
}
```

`Tx` is KILN's own transaction handle: `read(doc)`, `write(doc, value)`, `createTask(kind, input, owner)`, `append(outbox, entry)` — a thin wrapper that **cannot** express a clock, a sleep or a task transition other than the task's own (the property r42 found in the library, made structural).

## Task kinds

```ts
interface TaskKind<I, C, R> {
  name: string;                      // "kiln.unit", "kiln.lane", …
  version: number;
  initial(input: I): C;
  phases: Record<C["phase"], (task: Running<I, C>, run: Runtime) => Promise<void>>;
  abort(task: Running<I, C>, run: Runtime): Promise<void>;           // required: how a task ends when aborted
}
function defineKilnTask<I, C, R>(kind: TaskKind<I, C, R>): TaskKind<I, C, R>;
```

`Runtime` offers `commit(change)` (one atomic commit that may return the task's own next state: *checkpoint*, *wait on tasks*, or *terminal*), `outcomes(ids)`, `wait(slot)` for an owner-level wait (the lane and the gate use it), and `signal` (aborted when the factory closes). **There is no `sleep`, no timer and no `settleOther`.**

The five kinds: `kiln.roadmap`, `kiln.row`, `kiln.unit`, `kiln.gate` (+ `kiln.decision`) are defined in `packages/durable`; `kiln.lane` is defined in `packages/lane` with `defineKilnTask` (layer rule `lane → durable`).

## Hooks (tests only)

```ts
interface Hooks { at(point: KillPoint): void; fault(point: FaultPoint): void }   // default: both no-ops
const KILL_POINTS: readonly KillPoint[];                                          // the DECLARED list; a test compares it to the calls in the source
```

No environment variable in the product can kill or fault a factory.

## Errors

`openFactory` on an owned store throws `StoreOwned { store, pid, host, socket }` (its message names all four). A malformed key or id throws `BadRequest`. Nothing else throws across the seam: outcomes are values.
