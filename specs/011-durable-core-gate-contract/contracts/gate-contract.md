# Contract: the gate (product form)

**Spec**: FR-010 … FR-018, FR-060 … FR-062 · **PRD**: CORE-3, CORE-5 · **Starts from**: [r42's post-spike port](../../010-external-completion-spike/contracts/gate-completion-port.md) (outcomes and refusals unchanged) · **Data model**: [../data-model.md](../data-model.md)

Stated in KILN's terms only: **no name of the library appears in this file or in the public types of the seam** (checked: SC-010). r42's port had three operations on a gate that already existed; r13's contract adds the **opening** and the **brief**, and generalises "a move" to the gate's whole life.

## Operations

```text
openGate(key, spec)             → Opened(gate) | Repeat(gate) | Refused(key-conflict | invalid-move | store-error | not-ready)
submitMove(gateId, key, move)   → Outcome                       // the only operation that can settle a gate
gateState(gateId)               → Waiting | Settled(record) | Unknown     // read from the store, never from memory
```

`spec = { gateId, gateKey, flow, brief: JSON, openedBy }`. `move = { kind, decidedBy, briefRef }`. `key` is the idempotency key of **this submission** (≤ 200 chars).

## `openGate`

One atomic commit writes the **gate document**, the **brief as shown** (content + its hash) and the **`gate.opened`** outbox entry (actor: the opener; cause: the command key); after any crash the gate is **absent or whole** (I3). Then a gate task and its decision task exist and the decision is waiting.

| Outcome | When | Store effect |
|---|---|---|
| `Opened(gate)` | new key, valid spec, gate id unused | the three records + the two tasks, in **one** commit |
| `Repeat(gate)` | same key, equal spec (before or after any restart) | none; the original outcome |
| `Refused(key-conflict)` | same key, different spec; **or** another key for a gate id that already exists | none |
| `Refused(invalid-move)` | gate key not in the flow, malformed id, brief not JSON | none |
| `Refused(store-error)` / `Refused(not-ready)` | as for moves | none |

(`invalid-move` is the contract's one refusal for "the request itself is wrong"; no code is added.)

## `submitMove` — outcomes (unchanged from r42; the brief rule is r13's, Clarification Q2)

| Outcome | When | Store effect |
|---|---|---|
| `Committed(record)` | gate waiting; move valid; this submission won | **one commit**: the move record, the `move.committed` outbox entry (actor `decidedBy`, cause the key) **and** the decision's completion |
| `Repeat(record)` | same key, **equal** move, any time, any restart | none; original record named |
| `Refused(lost-race, winner)` | the gate settled between arrival and commit, by another key | none; names the winner's key |
| `Refused(stale, winner)` | settled when it arrived, by another key | none; names the settling key |
| `Refused(key-conflict, original)` | same key, **different** move | none; never a repeat |
| `Refused(invalid-move)` | no decider (empty or blank), kind not in the gate's **vocabulary**, **no brief ref, or a brief ref other than the gate's** | none |
| `Refused(unknown-gate)` | no such gate | none; **no gate is created by a move** |
| `Refused(not-ready)` | owner up, not yet able to accept (start-up) | none; retry the same key |
| `Refused(store-error)` | the store failed at the moment of writing | none; gate still waiting; the same key commits once the fault is gone |
| *client side:* `Refused(store-error, connection-lost \| timeout)` | the owner died or did not answer | **outcome unknown** — retry the same key |

The gate task's later `settle` commit appends `gate.settled` (actor `factory`, cause the settling key) with its own terminal state; it may lag the move by a restart and is never the reason a gate looks settled.

**`Committed` means durable**: it is acknowledged only after the record and the completion are stored.

## Guarantees (each a test, over the gate as built)

| | Guarantee | Observable |
|---|---|---|
| **a** | opening is atomic; a move and the completion are one commit | after a kill at any named point: absent / waiting-with-no-record / settled-with-one-record; never a partial (I1–I3) |
| **b** | keyed exactly once | 100 submissions of one `(key, move)` ⇒ 1 `Committed` + 99 `Repeat`, 1 record, before and after a restart |
| **c** | first wins; every refusal names the winner and changes nothing | 100 distinct keys ⇒ 1 `Committed` + 99 refused, each naming the winner |
| **d** | no clock, timeout, restart or crash count settles **or parks** a gate | 10-year jumps either way; ≥ 7 consecutive kills; 0 timers on gate or decision (I6, I7) |
| **e** | resumes as it was | waiting stays waiting, settled stays settled with the same record (I5, I6) |
| **f** *(new)* | the brief is what was shown | the record's `briefRef` equals the gate's; the stored brief hashes to it; a mismatching move changes nothing |

## What a gate never does

It never settles on a timer, a restart, a clock or an absent person (constitution V). The **Roadmap gate** accepts no delegated move at all — there is no such field to set (constitution VI). A later row (r21) may add a *recorded delegation* that produces a distinct entry; this contract leaves room for it by keeping `move` extensible, and r13 adds nothing that settles without a named decider.
