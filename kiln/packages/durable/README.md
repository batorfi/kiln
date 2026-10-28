# @kiln/durable — the durable core and its one seam

Everything KILN keeps across crashes goes through this package: **gates** (a person's decision, waited for as long as it takes), **tasks** (roadmap, row, unit; the lane arrives with the lane task), **commands** (each happens once), the **outbox** (what the core changed, with actor and cause), and the **one owner** of a store with its private local channel.

The durable runtime underneath is reached from **one directory only**, `src/library/`. Nothing else in `kiln/` imports it, and nothing exported from this package names it: the contract is written in KILN's own words (gate, move, key, outcome, refusal, task, checkpoint) so that it outlives the runtime's API. `kiln check boundaries` refuses any other import by name; `tests/seam.test.ts` pins the directory and scans the exported declarations.

**The contracts** (read these, not the code, to build on this package):
[gate](../../../specs/011-durable-core-gate-contract/contracts/gate-contract.md) ·
[seam API](../../../specs/011-durable-core-gate-contract/contracts/seam-api.md) ·
[owner channel and CLI](../../../specs/011-durable-core-gate-contract/contracts/owner-channel.md) ·
[data model](../../../specs/011-durable-core-gate-contract/data-model.md) ·
[technical overview](../../../specs/011-durable-core-gate-contract/overview.md).

## In one screen

```ts
import { openFactory } from "@kiln/durable";            // the `#durable/…` import map inside kiln/

const factory = await openFactory({ store: "/path/to/store" });  // takes the one owner lock; refuses a store of another runtime version
await factory.ready;                                               // waiting gates accept moves from here on (before: `not-ready`)

const opened = await factory.gates.open("open-1", { gateId, gateKey: "gate0", flow: "v2", brief, openedBy: "factory" });
const outcome = await factory.gates.submit(gateId, "move-1", { kind: "approve", decidedBy: "person@example", briefRef });
// outcome.status: "committed" | "repeat" | { "refused": lost-race | stale | key-conflict | invalid-move | unknown-gate | not-ready | store-error }
```

From another process, through the owner: `kiln owner --store <dir>` and `kiln gate open|move|state …` (exit 0 answered, 3 owner unreachable, 4 outcome unknown — retry the same key).

## Rules this package keeps

* **A gate is settled only by a person's move** that names a decider and the brief it was decided on. No timer, timeout, restart, crash count or clock settles anything; a waiting gate is a stored state with no deadline.
* **A move and its gate's completion are one commit.** Either both are stored or nothing is. `committed` means *durable*.
* **First move wins; keys are exactly-once.** Same key and equal request → the first outcome again (`repeat`). Same key, other request → `key-conflict`. A refusal never changes the store.
* **Judged against the store, never memory.** Every answer is the same after any restart.
* **One owner per store.** A second process is refused with the store, pid, host and socket named. A live owner is never taken from; a dead owner's lock is taken over atomically; a lock of another host is never taken.
* **Completers never open the store.** `kiln gate …` is one request to the owner over a private Unix-domain socket (mode `0600`, directory `0700`, no network port, ever).

## The key-retention rule

A command key lives **as long as the thing it created exists in the live store.** A task-creation key lasts as long as the task; a gate-open key as long as the gate; a move key as long as the gate's move record — that is, forever. Anything that later archives or compacts the store (r15) may drop a key **only together with what it created**, and must keep the keys of anything still referenced. A dropped key whose thing still exists would let a retried command run twice; the ledger's `requestHash` comparison is what turns a reused key with a different request into a `key-conflict` instead of a silent second effect.

## The walk (r14)

`kiln.row` has a `walk` form: one feature walked through the flow's data (`src/walk/`; the pure rules are in `packages/contracts/src/flow/`). After a person's move settles a gate, **the owner** opens the next one under a deterministic key (`walk:<feature>:open:<gate>:<round>`), so a kill between the move and the next opening is repaired by the same key coming back as a `repeat`. The row never writes a move record and has no path that completes a gate.
A gate can also end **withdrawn**: a feature-level `reject` (any time, `kiln feature move`) is delivered into the open gate's decision slot and the decision step's one commit writes the withdrawal — no move record, never `gate.settled`. Feature-move keys live as long as the walk's `kiln.walk` document, i.e. forever in the live store: the r15 archive must keep them with it, like command keys.
Contracts: `specs/012-gates-as-data-walked-headless/contracts/`.

## The power-loss boundary

What is covered: **abrupt death of the owner process** — `SIGKILL`, a crash, an out-of-memory kill — at every named step of a gate's life and of a unit's step, and at random instants (see the proof in `tests/proof/`). After any such death a fresh reader finds each gate absent, waiting with no record, or settled with exactly one record, never partial.

What is **not** covered, and not tested: **loss of host power or a kernel crash**. Durability here is the storage engine's own: a commit acknowledged to a caller has been handed to the operating system, and on power loss the newest commit(s) may be lost. Nothing is ever *half*-applied by that either (the commit is atomic), but a move acknowledged moments before the power went may not be there afterwards — retry the same key.

Other stated limits: macOS is the only platform measured; the storage rests on Node's built-in SQLite, which is experimental on the supported Node range (`^22.19.0 || >=23.6.0`) and prints a warning there, accepted and recorded.

## Kill points (tests only)

The product calls `hooks.at("<point>")` at each named step; the default does nothing and **no environment variable under `src/` can kill or fault a factory**. The declared lists are in `src/hooks.ts` (gate points, unit points, later lane points) and a test keeps them equal to the names the source uses. Arming a point is the job of the test-only child owner in `tests/proof/support/owner-main.ts`.
