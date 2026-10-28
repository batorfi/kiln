# Contract: the backbone, cursors, the factory-log projection, and the record tools (FR-030…FR-043)

## 1. The backbone (research R8)

```ts
interface Backbone {
  register(c: Consumer): void;                    // before start(); a consumer is identified by name
  start(): void; stop(): Promise<void>;           // the factory calls these after ready / on close
  notify(): void;                                 // in-memory wake-up after a commit that appended events
  status(): Promise<ConsumerStatus[]>;            // {name, seq, head, lag, failed?}
  retry(name: string): Promise<void>;             // clears `failed` and resumes the loop
}
```

- Delivery order is sequence order; a batch is at most 256 events of one consumer; **no** commit awaits `notify`.
- **Transactional** consumer: `apply(tx, batch)` and the cursor advance are one commit → effect exactly once. **Effect** consumer: `deliver(batch)` then a cursor commit → at least once, idempotent by contract; the proof repeats each delivery.
- A consumer that throws stops at the failing event; `failed` is recorded in its cursor; the factory and the other consumers go on; `retry` or a restart tries again.
- No timer, no poll: the loop awaits the in-memory signal; on start it reads its cursor and catches up.
- Kill points: `backbone.batch-read`, `backbone.apply-after-write`, `backbone.committed`, `backbone.delivered`.

## 2. The consumers r15 registers

| Name | Mode | What |
|---|---|---|
| `factory-log` | transactional | folds each run's events into `kiln.projection/log:<feature>` (reducer: record/src/projections/factory-log.ts) |
| `factory-log-files` | effect | writes `<store>/projections/factory-log/<feature>.jsonl` from the projection documents, by temp-file-and-rename; idempotent |
| `archive-trigger` | — | not a consumer: the row's terminal commit creates the archive task (archive.md) |

## 3. The event → factory-log table (contracts/src/events/factory-log-map.ts)

See research R9. Tested **both ways**: for every legacy record type, `record → event → line` is the identity on bytes (the committed old walks); for every event type, the table names a record type or "none". A change to the table that alters any committed replay fails.

Line format: canonical JSON with the first program's key order (`recordType`, `ts`, `seq`, payload), one per line. `seq` counts from 0 per file. `ts` is the event time. `gate` is the flow's factory-log gate id (via `GATE_KEY_OF`); `flow` is stamped when the gate event says it.

## 4. Stream validators (record/src/streams.ts) — FR-043

Run on the **events** of a run (before projecting) and, through the first program's validators unchanged, on the **projected file**:

| Rule | On events | On the file |
|---|---|---|
| gap-free order | `seq` 1…N | `seq` 0…N−1 (R2) |
| time never backwards | reported by name (`time-backwards`) | R2 |
| no gate settled without a person or a distinct delegation | `gate.settled` has `decidedBy` that is `human@…` or a `delegation.armed` for the gate | R3/R4 |
| delegation distinct from a person's move | `delegation.armed` is its own event | R4 |
| no content or remote key | the forbidden set | R5 |
| every move in its gate's vocabulary for the pinned flow | `move.committed.kind` ∈ vocabulary(gate, flow) | G3 |
| never vacuous | an empty stream, or a check that examined no events, fails and says how many it examined | R6 |

## 5. Record tools (offline, a fresh reader — they never open the store as an owner)

```
kiln record show     --store <dir> [--run <feature>] [--from n] [--to n]     one JSON event per line
kiln record status   --store <dir>                                           head, chunks, per-consumer {seq, lag, failed}
kiln record verify   --store <dir> [--run <feature>]                         E1–E5 on the stored record; prints PASS/FAIL with counts examined
kiln record rebuild-log --store <dir> --run <feature> [--out <file>]         the reducer over the run; prints bytes or writes the file
```

Exit codes as the other commands: 0 answered, 2 usage, 3 store unreadable, 4 not used. `verify` examining zero events exits 1 and says so.
