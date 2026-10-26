# Data model: Spike — completing a waiting task from outside (row r42)

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

The spike has two kinds of data. **Domain data** is the small model of a gate and its move, written in KILN's own terms so the report can hand it to r13 unchanged. **Evidence data** is what the harness produces and the report is
built from. Neither is product code; the domain data is the *contract the report proposes*.

## 1. Domain entities (KILN's own terms)

| Entity | Fields | Rules |
|---|---|---|
| **GateId** | opaque string | one per gate under test; the harness makes many (one per scenario) |
| **MoveKind** | `approve` · `revise` · `reject` | a small closed stand-in for the real vocabulary (the real set is r13's, `kiln/packages/contracts`); the spike only needs several distinct kinds to tell moves apart |
| **Move** | `kind: MoveKind` · `decidedBy: string` (e.g. `human@spike`) · `briefRef: string` (the brief as seen) | `decidedBy` must be non-empty; a move with no decider is refused (`invalid-move`) — a missing person never approves |
| **MoveKey** | opaque string chosen by the caller | the identity of one *submission*; the same key with an equal move is a **repeat**; the same key with a different move is a **conflict** |
| **MoveRecord** | `gateId` · `key` · `move` · `seq` (always 1 for a gate) · `outcomeOf: "committed"` | written **at most once per gate**; atomic with the completion of the gate's decision (guarantee a) |
| **Outcome** | `committed` · `repeat` · `refused(reason)` | returned to the caller for every submission, including those that lose |
| **RefusalReason** | `lost-race(winner)` · `stale(winner)` (gate already settled; names the key that settled it) · `key-conflict(original)` · `invalid-move` · `unknown-gate` · `not-ready` (owner not yet serving) · `store-error` | every refusal changes nothing (guarantee c) |
| **GateState** | `waiting` · `settled(record)` | derived from the store, never from memory (guarantee e) |

### Gate state machine

```text
 (opened) ──► waiting ──── committed move ────► settled(record)   [terminal for the spike]
                 ▲  │
                 │  └── kill / restart / any clock ──► waiting      (never settles by itself)
                 └───── refused submissions (lost-race, stale, conflict, invalid) change nothing
```

`waiting` and `settled` are the only two states an observer may ever see after a restart. Any other combination found in the store is a **half-applied move**, which is a failure of guarantee (a).

## 2. Store invariants — the oracle after every kill

Checked by `src/invariants.ts` on a store reopened read-only by a fresh process; **a violation fails the scenario** and is named by its number in the evidence.

| # | Invariant | Guarantee |
|---|---|---|
| **I1** | a `waiting` gate has **no** `MoveRecord` (the *waiting* half of "waiting ⇔ no record"; the *settled* half is I2) | a, e |
| **I2** | a `settled` gate has **exactly one** `MoveRecord` **and** its decision task is terminal with that move's outcome | a |
| **I3** | the **half-applied move** never exists: a record without a completed decision task, a completed decision task without a record, or a settled gate without a record | a |
| **I4** | the number of records per gate ≤ 1, whatever the number of submissions or restarts | b, c |
| **I5** | a settled gate stays settled, with the same record, across any further restarts | e |
| **I6** | a waiting gate stays waiting across **any number** of restarts without a move — including more than the library's `restartLimit` — and is never `blocked` or `parked` | d, e |
| **I7** | no timer, sleep or deadline is present on the gate task or the decision task | d |

*Refinement recorded 2026-10-26 (T009/T012):* the oracle works from three facts — **G** (the gate's state as the store derives it), **R** (the number of move records) and **D** (the decision task's status). I1 and I2 are the two halves of "G ⇔ R"; **I3 is the disagreement between R and D** (the move and its completion apart), which is what a kill between two commits produces. I5 and the unblocked half of I6 are properties *across* restarts, so they are checked by comparing two inspections taken with no move submitted between them (`checkStability`), not by a single one.

## 3. Evidence entities (what the harness produces)

| Entity | Fields | Notes |
|---|---|---|
| **Strategy** | `name` (`native-signal` · `native-abort` · `native-submission` · `fallback-document` · `fallback-table`) · `killPoints: KillPoint[]` · `caveats: Caveat[]` · implements the port |
| **Caveat** | `text` · `enforceable: boolean` | a condition under which a guarantee holds (for example "d holds only with `restartLimit = Infinity`"); `enforceable` ⇔ r13 can guarantee it structurally; a native strategy with a non-enforceable caveat cannot yield `go` | the list of kill points is part of the strategy and is printed |
| **KillPoint** | `name` · `where` (a sentence: "inside the commit, after the writes, before it returns") · `phase: "move" \| "completion" \| "recovery"` | each is a `killPoint(name)` call in the harness code |
| **Scenario** | `id` · `guarantee: a\|b\|c\|d\|e` · `strategy` · `kind: "kill-point" \| "random-kill" \| "repeat" \| "race" \| "conflict" \| "store-error" \| "different-process" \| "no-clock" \| "restart-limit"` | one test case |
| **ScenarioResult** | `scenario` · `ran: boolean` · `passed: boolean` · `violated: Ix[]` · `detail` | `ran = false` is a failure, not a skip |
| **GuaranteeStatus** | `held` · `not-held` · `not-proven` | `held` only if every targeting scenario ran (count > 0) and passed; `not-proven` if any did not run or the time box ended first; otherwise `not-held` |
| **Evidence** | `pi-durable: {name, version, integrity}` · `node` · `platform` · `startedAt` · `finishedAt` · `strategies: {name → {killPoints[], exercised, caveats[], guarantees: {a..e → {status, scenarios, counts}}}}` | serialised to `out/evidence.json`; a copy is embedded in the report |
| **Verdict** | `go` · `go-with-fallback` · `no-go` | derived by the rules in [contracts/spike-report.md](./contracts/spike-report.md) §3, then confirmed by a person |

## 4. Counts the criteria quantify

| Quantity | Where it is counted | Target (spec) |
|---|---|---|
| Enumerated kill points exercised, per strategy | `Evidence.strategies[*].exercised` | **100 %** of declared (SC-002); ≥ 1 per strategy or the run fails |
| Repeats of one move under one key | `repeat` scenario | ≥ **100**, exactly one `committed`, the rest `repeat`; records = 1 (SC-003) |
| Competing different moves for one gate | `race` scenario | ≥ **100**, exactly one `committed`, the rest `refused(lost-race)`; records = 1 (SC-003) |
| Randomised kills | `random-kill` scenarios | a few hundred per strategy (supporting evidence only) |
| Injected store failure at the moment of the move | `store-error` scenario | 1 per strategy: `refused(store-error)`, gate `waiting`, no record; same key commits after the fault is gone |
| Consecutive kills without a move | `restart-limit` scenario | **> 5** (the library's default limit), gate still `waiting` (I6) |

## 5. Mapping to the library (for the report, not for the contract)

| Domain term | Pi Durable 1.4.0 realisation the spike tries |
|---|---|
| gate task `G` | a `defineTask` whose phase commits `waiting` on `[D]` |
| decision task `D` | a `defineTask`; C1: a phase that awaits the owner's signal and commits move + `terminal` in one `runtime.commit`; C2: a `sleeping` task with an abort handler |
| MoveRecord | a document (`defineDoc`, scope: conversation) written in the same commit; or a row in a table on the shared connection (fallback F2) |
| MoveKey uniqueness | read the record inside the commit (C1/F1); a primary key (F2) |
| owner process | the process that holds `openNodeSqliteStorage(file)` and the `Harness` |
| outside completer | a separate process talking to the owner over a Unix-domain socket |

The real r13 names (`gate`, `decision`, tasks of kind `roadmap/row/unit/gate/lane`) are **not** used here; the spike has one stand-in gate task and one stand-in decision task (spec: out of scope).
