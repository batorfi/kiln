# `kiln.gate` and `kiln.decision` — two tasks that make one gate

> **Status:** [built] (r13) — the heart of the row. **Code:** `kiln/packages/durable/src/gate/{tasks,open,move,slots,state}.ts`. **Proof:** `tests/proof/{open,outcomes,exactly-once,kill-points,random-kill,storm,clock,negative,different-process}.test.ts`. **Contract:** [gate-contract](../../../../specs/011-durable-core-gate-contract/contracts/gate-contract.md). **See also:** [overview](./README.md) · [vocabulary §4](../../../vocabulary.md).

## What they are

A **gate** is where KILN hands a decision to a person and waits. It is built from **two** tasks, because the two jobs need different shapes:

| Task | Job | Owner |
|---|---|---|
| **`kiln.decision`** | *wait for one move, then record it and end — in one commit* | the gate task |
| **`kiln.gate`** | *be the thing other work waits on; follow the decision; record that the gate settled* | the factory |

A gate is **opened** with `gates.open(key, spec)` (not `tasks.create`): one atomic commit writes the gate document, the brief as shown, the `gate.opened` outbox entry, and creates the gate task. After any crash the gate is absent or whole.

## `kiln.decision` — the waiting step

Input `{gateId}`; one phase, **`wait`**:

```
 wait.before-register ─▶ register a single-shot SLOT in owner memory ─▶ wait.registered ─▶ await a move
                                                                                    │ a submitted move wakes the step
        ┌──────────────────────────────────────────────────────────────────────────┘
        ▼   ONE commit  (move.commit-begin → read the move document → move.commit-after-read)
             record already there? → write nothing: the move LOST (lost-race / stale)
             else:  write the MOVE RECORD  (kind, decidedBy, briefRef, key, decidedAt)
                  + outbox  move.committed {actor = the decider, cause = the move key}
                  + this task's own TERMINAL state {completed, {key}}        ← the move and the completion
                  (move.commit-after-write)                                   are the SAME commit
             then  move.committed → answer the caller → move.ack-sent
```

Four things to understand:

1. **Nothing sleeps.** The step `await`s a promise that only a move (or the factory closing) resolves. There is no timer on the decision or the gate; the oracle looks for one (I7) and the only acceptable answer is "none". A waiting gate runs no code and holds no model.
2. **The slot is memory, deliberately.** The runtime offers no durable "wait for an outside event", so the owner keeps a map `gateId → slot`. After a restart the step re-runs from its top and registers again; **until it has, a move gets `not-ready`**. Everything that matters is judged against the *stored* move record, never the slot — which is why answers are identical after any restart.
3. **First move wins.** The first submitter takes the slot; others wait for its commit and re-judge against the stored record: same key + equal move → `repeat`; same key + other move → `key-conflict`; other key → `stale` (record existed at arrival) or `lost-race` (appeared while waiting).
4. **A failed commit re-arms the slot.** If the commit throws (a real store error, or the injected `store-write` fault), the caller gets `store-error`, nothing was stored, and the step waits again. A step never returns without durable progress, or the runtime would fault it.

## `kiln.gate` — the projection

Input `{gateId}`; two phases:

* **`open`** — in one commit, create the `kiln.decision` child (owned by this gate) and park `waiting` on it, checkpoint `{phase:"settle", decisionId}`. The gate waits on a *task*, not a clock.
* **`settle`** — runs when the decision ends. Hook `gate.wake`; read the decision's outcome (the move key); in one commit append the `gate.settled` outbox entry (actor `factory`, cause the move key) and end `completed`. Hook `gate.settled`.

**"Settled" has a precise meaning:** the port's *settled* = *a move record exists* (that is what `gates.state()` and the fresh reader derive from the store). The gate **task** is a projection that converges a moment later — after a kill between the decision's commit and the gate's `settle`, the store shows a settled gate with a not-yet-terminal gate task, and the restart finishes the projection. The oracle encodes both: the record is the truth, the task must agree *eventually*.

## What survives a kill — the 14 gate kill points

`open.begin · open.after-write · open.committed · wait.before-register · wait.registered · move.received · move.commit-begin · move.commit-after-read · move.commit-after-write · move.committed · move.ack-sent · gate.wake · gate.settled · recover.start`

At every one, the owner dies by SIGKILL *at that point* and a fresh reader finds the gate **absent, waiting with no record, or settled with exactly one record** — never partial. A restarted owner agrees; the same keys are safe to retry; exactly one `gate.opened`, one `move.committed`, one `gate.settled` result. The same 14 are driven again with the completer a **separate process** (`kiln gate …`). Added to this: 300 random kills, a ≥ 7-kill restart storm (more than the runtime's own limit of 5), ±10-year clock jumps, and a deliberately half-applying gate that the oracle must catch.

## Why the library is told `restartLimit = Infinity`

The runtime parks a task that crashes too often. For an ordinary task that is a safety net; for a *waiting gate* it would turn "the factory crashed seven times" into "the gate is parked and nobody decided" — absence settling a gate, which constitution V forbids. The runtime is opened with an unbounded restart limit in the one place it is opened, and a mutation check proves the proof fails if the default (5) comes back.

## Not built yet

The ten-part brief is opaque JSON here; assembling it, the judged-gate evidence, delegation (`approved under delegation`), `applies_when` evaluation and the move semantics ("where the work goes") are the walk (r14) and the surfaces (r19).
