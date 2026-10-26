# Contract: the gate-completion port

**Spec**: FR-002, FR-005, FR-006, FR-008 · **PRD**: CORE-3, CORE-5, CORE-6 · **Data model**: [../data-model.md](../data-model.md)

The port is what the durable core (r13) will call to complete a waiting gate. It is written in KILN's terms; **no operation, argument or error mentions Pi Durable.** Every *strategy* the spike tries (a native composition, or the
fallback) implements this port, and the **same tests run against each** — that is how "the fallback passes the same tests unchanged" (FR-007, SC-005) is made checkable, and how the contract outlives the library's API.

## Operations

```text
open(gateId)                        → opened | refused(unknown-gate | store-error)
submit(gateId, key, move)           → Outcome
state(gateId)                       → GateState        // read from the store, never from memory
```

`open` creates the gate in `waiting`. It is idempotent: opening an already-open gate changes nothing. `state` is a pure read.

`submit` is the only operation that can settle a gate, and it is **one atomic step**: either the move is recorded *and* the gate is settled, or nothing at all is written.

## Outcomes of `submit`

| Outcome | When | Store effect |
|---|---|---|
| `committed` | the gate was `waiting` and `move` is valid; this submission won | exactly one `MoveRecord` written, the decision completed, **in one commit** |
| `repeat` | `key` was already committed with an **equal** move (before or after any restart) | none; the **original** outcome is returned, naming the original record |
| `refused(lost-race, winner)` | the gate settled between this submission's arrival and its commit, by a different key | none; names the winning key |
| `refused(stale, winner)` | the gate was already settled when the submission arrived, by a different key | none; names the key of the move that settled it |
| `refused(key-conflict, original)` | `key` was already committed with a **different** move | none; never treated as a repeat |
| `refused(invalid-move)` | `decidedBy` empty or `kind` outside the vocabulary | none — a move with no decider is refused (constitution V) |
| `refused(unknown-gate)` | no such gate | none |
| `refused(not-ready)` | the owner is up but cannot yet accept (a restart in progress) | none; the caller may retry with the same key |
| `refused(store-error, reason)` | the store failed when the move was written (tested by an injected failure; a genuinely full disk is not simulated) | none; the gate is still `waiting`, and the same key commits once the fault is gone |

## Guarantees (each is a test, for every strategy)

| | Guarantee | Observable |
|---|---|---|
| **a** | The move and the gate's completion are **one atomic commit** | after a kill at any point: invariants I1–I3 hold (waiting with no record, or settled with exactly one record) |
| **b** | **Keyed exactly once** | N submissions of one `(key, move)` ⇒ 1 `committed` + (N−1) `repeat`; records = 1 (I4) |
| **c** | **First move wins; stale and competing moves are refused** and change nothing | N competing moves ⇒ 1 `committed` + (N−1) `refused(lost-race | stale)`; records = 1; **every** loser's refusal names the winner |
| **d** | **No clock, timeout or restart settles a gate** | after a simulated 10-year clock jump, real elapsed time and more than the library's restart limit of consecutive kills: still `waiting` (I6, I7) |
| **e** | **A killed and restarted gate resumes as it was** | `waiting` stays `waiting`, `settled` stays `settled` with the same record (I5, I6) |

## What r13 may rely on, and what it must not

- **May rely on:** the operations, outcomes and refusals above; that `state` reflects the store; that a retried `submit` with the same `(key, move)` is safe at any time; the invariants I1–I7.
- **Must not rely on:** any name from the library; the number of commits a strategy uses internally; whether the strategy is native or the fallback (the report says which, and what replaces the fallback if upstream lands); in-memory
  state surviving a restart.
- **A strategy may add** refusals it needs internally only by mapping them onto the codes above; a new code is a contract change.
