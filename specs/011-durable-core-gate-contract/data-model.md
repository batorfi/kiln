# Data model: Durable core and the gate contract (row r13)

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md) | **Contracts**: [contracts/](./contracts/)

Everything below lives in **one store per factory** (one SQLite file) owned by **one process**. "Document" means a typed JSON object committed atomically with tasks; names are KILN's (`kiln.*`), never the library's. Field lists are the *contract*, not a schema language; r15 formalises the outbox without migrating any of it.

## 1. Entities

| Entity | Identity | Lives in | Mutable? | Notes |
|---|---|---|---|---|
| **Factory** | the store directory | filesystem | — | exactly one store, one owner |
| **Owner lock** | `<store>/owner.lock` | filesystem | created/removed | `{pid, host, startedAt, socket}`; not in the store file |
| **Task** | task id (library-minted, opaque) | store | by commits | kinds below; has an owner (task or factory), input (immutable), checkpoint, outcome |
| **Gate document** `kiln.gate` | gate id | store (root conversation) | **never** after opening | see §2 |
| **Brief as shown** `kiln.brief` | gate id | store | **never** | content + its hash |
| **Move record** `kiln.move` | gate id | store | written once | at most one per gate (I4) |
| **Outbox** `kiln.outbox` | one per factory | store | append-only | `gate.opened` now; r15 adopts it |
| **Command ledger** `kiln.command` | command key | store | written once | first outcome + request hash |
| **Lane state** `kiln.lane` | one per factory | store | by lane commits | §5 |
| **Channel** | `<tmp>/kiln-<uid>/<hash>.sock` | filesystem | — | not in the store (R6) |

### Task kinds (names stored in the task record)

| Kind | Owned by | Input (fixed at creation) | Checkpoint | Outcome |
|---|---|---|---|---|
| `kiln.roadmap` | the factory | `{factory}` | `{phase: open \| await-gate \| done, gateId}` | `{move kind, key}` of the Roadmap gate |
| `kiln.row` | the factory (or roadmap) | `{feature, script: UnitSpec[]}` | `{phase, index, unitIds[]}` | `{units: n}` |
| `kiln.unit` | its row | `{label, steps, needsLane?}` | `{done: i}` | `{label, result}` — committed once |
| `kiln.gate` | whoever opened it | `{gateId}` | `{phase: open \| settle, decisionId}` | `{key}` of the settling move |
| `kiln.decision` | its gate | `{gateId}` | `{phase: wait}` | `{key}` |
| `kiln.lane` | the factory | `{factory}` | `{phase: serve}` | never terminal while the factory lives |

## 2. The gate

### 2.1 Gate document (`kiln.gate`, written once, in the opening commit)

```text
gateId        string   caller-supplied, deterministic: "gate:<feature>:<gateKey>:<round>"; [a-z0-9:._-], ≤ 160
gateKey       string   one of the flow's gate keys ("gate0", "3-spec", …)  — from #contracts
flow          string   "v1" | "v2"
vocabulary    string[] the move kinds the flow allows at this gate AS OF OPENING (snapshot of moveVocabulary)
briefRef      string   sha-256 hex of the canonical brief content
openedBy      string   who/what opened it (a task id or "factory")
openedAt      number   epoch ms from the injected clock — a fact, never a trigger
```

### 2.2 Brief as shown (`kiln.brief`, written once, same commit)

```text
briefRef      string   = sha-256(canonical JSON of content)
content       JSON     opaque to r13 (structure belongs to the gate-brief rows)
```

### 2.3 Move record (`kiln.move`, written once, in the move commit)

```text
gateId        string
key           string   the idempotency key of this submission (≤ 200)
move          { kind, decidedBy, briefRef }
decidedAt     number   injected clock; a fact
seq           1        always 1 (at most one record per gate)
```

`kind` ∈ the gate's `vocabulary`; `decidedBy` non-empty (trimmed); `briefRef` = the gate's `briefRef`.

### 2.4 Outbox entry (`kiln.outbox`, append-only)

```text
seq   number   1.. per factory, assigned in the commit
type  string   "gate.opened" (r13); r15 adds the rest of the catalog
subject string the gate id
at    number
data  JSON     { briefRef, gateKey }
```

### 2.5 Gate state (derived from the store, never from memory)

```text
unknown ── open(key, spec) ──▶ waiting ── move committed ──▶ settled(record)
  ▲                              │  ▲                          │
  └── (no such gate)             │  └─ any number of kills ────┘ (stays settled, same record: I5)
                                 └─ kills / clock / time: stays waiting, never parked (I6, I7)
```

`waiting` ⇔ gate document exists **and** no move record (I1). `settled` ⇔ exactly one move record **and** the decision task terminal with that move's key (I2). Anything else found in a store is a **half-applied** state — a failure of the contract (I3).

### 2.6 Invariants (the oracle, re-created from r42 [data-model §2])

| # | Invariant |
|---|---|
| I1 | a waiting gate has no move record |
| I2 | a settled gate has exactly one move record **and** its decision task terminal with that record's key |
| I3 | no half-applied state: a record without a completed decision, a completed decision without a record, a settled gate without a record, **a gate document without its brief or its `gate.opened` entry (new in r13)**, a brief or an outbox entry without its gate document |
| I4 | at most one move record per gate; at most one gate document per gate id |
| I5 | a settled gate stays settled with the same record across restarts |
| I6 | a waiting gate stays waiting across any number of restarts and is never parked or blocked |
| I7 | no timer, sleep or deadline on a gate or its decision |
| I8 *(new)* | the lane never records two holders; after a restart it records none until a resumed step re-acquires |
| I9 *(new)* | every command key maps to exactly one outcome; the same key never has two different request hashes |

## 3. The command ledger (`kiln.command`)

```text
key          string   caller-supplied, ≤ 200
kind         string   "gate.open" | "task.create" | "gate.move" (moves keep their own record too)
requestHash  string   sha-256 of canonical JSON {kind, request}
outcome      JSON     the first outcome, returned verbatim on every repeat
```

Rule (inside the effect's own commit): absent → apply + write; present, equal hash → return stored outcome, write nothing; present, other hash → `key-conflict`, write nothing.

## 4. Outcomes and refusals (the closed vocabulary — spec FR-016)

```text
Outcome  = committed(record) | repeat(record) | refused(reason, winner?, original?, detail?)
reason   = lost-race | stale | key-conflict | invalid-move | unknown-gate | not-ready | store-error
```

`winner` accompanies `lost-race` and `stale` (the settling key). `original` accompanies `key-conflict`. **Client-side only** (never stored): `store-error` with detail `connection-lost` or `timeout` means *outcome unknown* — retry the same key.

For **gate opening** the outcomes are `opened(gate)`, `repeat(gate)` (same key, equal request), `refused(key-conflict | invalid-move | store-error | not-ready)`; `invalid-move` here means an unknown gate key, a gate not in the flow, or a brief that is not JSON.

## 5. The lane (`kiln.lane`)

```text
resident   string | null   the model held (a name; scripted in r13)
hold       boolean         Architecture, Code review, Verification hold flag
swaps      number          count of resident-model changes
lease      { holder: taskId, since: number } | null
```

Transitions (each a commit, atomic with the step that causes it where one exists):

```text
free ── acquire(step, {model?, hold?}) ──▶ held(step)        resident/hold/swaps updated in the same commit
held ── release(step) ──▶ free
held ── owner restart ──▶ free                                the generation died with the process (FR-032)
```

A second `acquire` while held **waits in the owner's memory** (R9). The wait queue is not stored; after a restart steps re-request in task-id order. I8 is checked by the oracle after every kill in the lane scenarios.

## 6. The owner lock and the channel

```text
owner.lock   { pid: number, host: string, startedAt: number, socket: string }   (in <store>/, created exclusively)
channel      <tmp>/kiln-<uid>/<sha1(realpath(store))[0..8]>.sock                (dir 0700, socket 0600)
requests     {id, op: "ping"|"ready"|"gate.open"|"gate.move"|"gate.state", …}   one JSON object per line
replies      {id, ok, result?|error?}                                           see contracts/owner-channel.md
```

## 7. Inspection (read by a fresh reader, no owner)

```text
Inspection {
  gate:        "absent" | "waiting" | "settled"
  documents:   { gate: bool, brief: bool, outboxEntry: bool }       ← I3 for opening
  records:     MoveRecord[]                                         ← I1, I2, I4
  decision:    "absent" | "live" | "terminal"
  decisionMatchesRecord: boolean
  timers:      string[]                                             ← I7
  blocked:     boolean                                              ← I6
  lane:        { holders: number, resident, hold, swaps }           ← I8
  commands:    { key → hashes[] }                                   ← I9
}
```

`blocked` cannot be read by a reader with no owner (a parked task is a fact of a live scheduler, not of the file). It is therefore established two ways: **(1)** the owner's `reports` list (the seam records every `task_parked` / `task_faulted` the library reports) must be empty after each restart, and **(2)** the behavioural check — after the storm, the next valid move on the gate **commits**. The spike had to infer parking from a restart counter and a sidecar file; r13 does not, because `restartLimit = Infinity` is set where the library is opened and (2) proves it.
