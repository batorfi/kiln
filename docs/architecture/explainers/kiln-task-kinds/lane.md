# `kiln.lane` — the factory's one lane

> **Status:** [built] as a scripted lane (r13); the scheduler and real model residency are **[planned]** (r16; the pure affinity logic already exists in `packages/lane/src/affinity.ts`). **Code:** `kiln/packages/lane/src/lane-task.ts`; the port is `LaneApi` in `packages/durable/src/types.ts`. **Proof:** `packages/lane/tests/{lane-task,lane-proof}.test.ts`. **See also:** [overview](./README.md) · [vocabulary §7](../../../vocabulary.md).

## What it is

KILN runs **one generation at a time per factory** (constitution III): that is what keeps one model resident, makes swaps countable and priced, and makes a judge see every attempt on the same model. The **lane** is that rule made durable. Two things make it up:

* **The lane's stored facts** — one document `kiln.lane/main`: `{ resident, hold, swaps, lease }`.
* **The `kiln.lane` task** — the factory's single standing task for the lane, created once.

The lane is delivered by the `lane` package but used by the `durable` package's unit shell. Because the layer rule forbids `durable → lane`, the lane **implements a port** that durable defines, and whoever composes the factory wires them together:

```ts
const lane = createLane();                                   // { api: LaneApi, kinds(services) }
openFactory({ store, lane: lane.api, tasks: lane.kinds });
```

## The port and the facts

```ts
interface LaneApi {
  start?(): Promise<void>;     // ensure the ONE lane task; release a lease a dead generation left
  acquire(step, { model?, hold?, signal?, cause? }): Promise<Lease>;   // waits its turn
  release(step): Promise<void>;
}
```

| Fact | Meaning |
|---|---|
| `lease` `{holder, since}` or `null` | who holds the lane now; at most one |
| `resident` | the model currently loaded (`null` before the first load) |
| `hold` | the hold flag — a judge's model stays pinned (Architecture, Code review, Verification) |
| `swaps` | how many times a *resident* model was replaced by a *different* one |

## `acquire` and `release` are commits

**`acquire(step)`** — if the lane is held, the request **waits in owner memory**, in the order asked. When granted, ONE commit writes: the lease, the resident model, the hold flag, the swap count (+1 only if a resident model is replaced by a different one — the first load, and "same model again", are not swaps), and the outbox entries `lane.acquired` (and `lane.swapped`) with `actor = task:<step>` and a `cause`. Hooks: `lane.acquire-after-write` (written, not yet stored) and `lane.acquire-committed` (stored, generation not yet started).

**`release(step)`** — ONE commit clears the lease and appends `lane.released`; releasing a lane you do not hold is an error naming the holder. Hooks `lane.release-after-write`, `lane.release-committed`. Then the next waiter is granted.

An injected failure at the end of an acquire leaves the lane **exactly as it was**: no lease, no entries, resident/hold/swaps untouched — the facts and their record are one commit.

## The `kiln.lane` task

One phase, **`serve`**: it does nothing but stay alive until the factory closes (it returns without committing when the factory's abort signal fires). It exists so the factory has a durable, listable record that a lane exists (FR-030 — *one lane task per factory*) and as the home of the future scheduler. It is created by `start()` through the command ledger under the key `lane.create`, so **however many times the factory restarts, there is one**.

## `start()` — the restart rule (FR-032)

After a restart, a lease recorded in the store belongs to a generation that **died with the process** — nothing is running. So `start()`, called by `openFactory` after the store opens and before any step can ask, **clears the lease** and appends `lane.released` with `actor: "factory"`, `cause: "restart"`. Steps that were waiting are not stored; the resumed steps **ask again, ordered by task id** (deterministic). `resident`, `hold` and `swaps` are untouched.

## What survives a kill

| Killed at | Wreck | After restart |
|---|---|---|
| `lane.acquire-after-write` | previous state, 0 holders (nothing stored) | the step asks again |
| `lane.acquire-committed` | **1 holder — a dead generation** | lease released with an entry; 0 holders until a step asks |
| `lane.release-after-write` | still 1 holder (release not stored) | released at start |
| `lane.release-committed` | 0 holders | nothing to do |

In every case the restart reports **0 holders** until a resumed step re-acquires, `resident`/`hold`/`swaps` are exactly as before, and the oracle's **I8** — read as a running balance over the ordered outbox entries — never sees two holders or a release of nothing. 100 trials of two steps asking at once never had two generations running.

## A decision recorded: no `within(tx)`

The plan had a unit release the lane *inside its own step commit*. A release has to wake the next waiter *after* that commit succeeds, which code running inside someone else's transaction cannot know; and since the restart clears any lease a dead generation left, a separate release commit loses nothing. So the port has `acquire`/`release`, each its own commit. (Recorded in the row's `notes.md`.)

## Not built yet

Priority and affinity ordering across waiting steps, the model pool and real residency (load/pin/unload, "every model request goes through the lane"), and one host scheduler across factories — r16 and later. Until then every generation is scripted.
