# Contract: the gate-completion port

**Spec**: FR-002, FR-005, FR-006, FR-008 · **PRD**: CORE-3, CORE-5, CORE-6 · **Data model**: [../data-model.md](../data-model.md)

The port is what the durable core (r13) will call to complete a waiting gate. It is written in KILN's terms; **no operation, argument or error mentions Pi Durable.** Every *strategy* the spike tries (a native composition, or the
fallback) implements this port, and the **same tests run against each** — that is how "the fallback passes the same tests unchanged" (FR-007, SC-005) is made checkable, and how the contract outlives the library's API.

## Operations

```text
open(gateId)                        → opened | refused(unknown-gate | store-error)
submit(gateId, key, move)           → Outcome
state(gateId)                       → GateState        // read from the store, never from memory; `unknown` for a gate that was never opened
```

`GateState` is `waiting`, `settled` (with the one record), or `unknown` (never opened). `open` creates the gate in `waiting`. It is idempotent: opening an already-open gate changes nothing. `state` is a pure read.

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
| `refused(store-error, "connection-lost" \| "timeout")` | *(client side)* the owner died or did not answer: **the outcome is unknown** — the move may or may not have been committed; the caller must ask `state` or retry with the same key | none known |
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

---

## Post-spike form (2026-10-26, T055)

The spike ran this contract against four strategies (two test-only controls, two native attempts). **Nothing in the operations or in the refusal codes changed**; what follows is what the spike established and what r13 must therefore add around the port. Evidence: `spikes/r42/out/evidence.json`, tables in [spike-report.md](./spike-report.md).

**Codes.** No strategy needed a refusal code that is not in the table above. `refused(stale, winner)` names the key of the move that settled the gate (checked on every strategy, with a separate-process completer too). `refused(store-error)` was exercised by an injected store failure at the moment of writing: the gate stayed `waiting`, no record existed, the invariants held after a restart, and the same key committed once the fault was gone.

**`committed` means durable.** The acknowledgement is sent only after the record is stored. A strategy that acknowledges before the gate's completion is stored (the abort-driven composition did) leaves a window in which a caller is told "committed" while a reader of the store sees a half-applied move; such a strategy fails guarantee a and is not acceptable behind this port.

**`not-ready`, sharpened.** It is returned (a) while the owner starts, for a bounded time (about 0.2 s after a restart in the spike), and (b) when the gate cannot accept because the durable core has stopped re-running its waiting step — which is what happens when the host leaves the library's crash-loop guard at its default (see below). (a) is transient: retry the same key. (b) is a configuration error, not a transient condition.

**What the host must guarantee for the guarantees to hold (operating conditions).**

1. **The durable core must never park a waiting gate because of repeated crashes.** The library's default stops re-running a task that was cut off five times in a row without changing state; a gate killed more often than that over a long weekend would be parked and every move refused `not-ready`. The host sets that limit to "never". Observed: at the default, after 7 kills a valid move is refused; with the limit disabled it commits. This is a setting r13's seam always sets, not a property of the port.
2. **Exactly one process owns the store.** Completers are other processes (or other threads) and reach the gate through the owner. Nothing in the library or in the database stops a second process from opening the file and even taking the write lock while the owner is idle (observed), so the rule must be enforced structurally by r13 (a single server process, or a lock it owns).
3. **A move is delivered by the owner, not written by the completer.** The completer sends `(gateId, key, move)` to the owner and gets an `Outcome`; it never touches the store.
4. **Power loss is outside the guarantee.** Abrupt process death is covered (the spike kills the owner with SIGKILL at every named step and at random instants); loss of the host's power may lose the newest commit and was not tested.

**Which guarantees depend on a fallback.** None. No fallback was needed or built (T050): the native "signal into a running step" composition held a–e, including with the completer in a separate process. If upstream later offers a durable "wait for an outside event" state, only the strategy behind the port changes — the owner would no longer hold the wait in memory and the first caveat above would disappear — and the same scenarios judge it.

**If a fallback is ever added next to a native path.** The stored move record is authoritative (it is what `state` reads and what the invariants judge); the gate's task graph is a projection that converges to it on restart. The spike did not build a fallback, so no disagreement was observed.
