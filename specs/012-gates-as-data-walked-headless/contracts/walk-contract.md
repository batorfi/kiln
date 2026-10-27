# Contract: the walk, the gate extensions and the feature-level move

**Packages**: `durable/src/walk/` (new), `durable/src/gate/` (extended), `durable/src/channel/` (three operations) · **Requirements**: FR-001 … FR-007, FR-020 … FR-032, FR-050 … FR-056 · Data: [data-model.md](../data-model.md) · Decisions: [research.md](../research.md) R2–R7, R10–R11.
**Inherited and unchanged**: [r13's gate contract](../../011-durable-core-gate-contract/contracts/gate-contract.md) — open whole, move + completion in one commit, keyed exactly once, first move wins, no clock, closed refusal vocabulary.

## 1. Starting a walk

`tasks.create(key, "kiln.row", {feature, walk}, owner)` through the command ledger (so the CLI's `feature admit` is keyed exactly once). The input is validated **before anything is written**; refusals are `invalid-move` with a named detail: unknown field · `flow` other than `"v2"` · empty feature · a `triage.reasoning` empty when `skip` · unknown gate key in `script.sameContent` · `verifier` entries other than `pass|fail`. Both `script` and `walk` given, or neither, is refused.

## 2. The row's phases (resume points; all state in the checkpoint)

| Phase | Does | Commit |
|---|---|---|
| `admit` | opens `gate:<f>:gate0:1` (brief = the **admission proposal**: per interface gate whether it applies and why, the triage proposal, the cap default, the facts) under key `walk:<f>:open:gate0:1`; creates `kiln.walk/<f>` `{status:"admitting"}` in the same commit | open (keyed) then checkpoint `admission` |
| `admission` | waits on the gate task (the library's wait-on-child). **`approve`** continues; `revise` and a row edit (`edit-rows` · `add-row` · `drop-row`) open admission round + 1 with the note as the proposal's instruction; **`reject` ends the walk** as *not admitted* (outbox `walk.not-admitted`, `kiln.walk.status = "not-admitted"`, the row completes `{outcome:"not-admitted"}`; no gate of the feature opens) — FR-027 | — |
| `pin` | reads the stored gate0 record; takes `admit` (require · overrideTriage · fixRounds); evaluates both interface gates (`applicability`), triage (`triage`) and the cap; **one `run.commit`**: `walk.admitted`, one `gate.not-applicable` / `gate.skipped` per outcome, `kiln.walk.status="active"`, the pinned state into the checkpoint | atomic |
| `work` | for the cursor gate, runs the scripted units (author; judge where the gate has a judge; workers where the consequence says so; the Verification fix rounds — §5) as `kiln.unit` tasks under keyed creation; waits on them | per unit |
| `open` | `openGate` with `walk:{feature}`, `returnsTo = targetsOf(...)`, `noteRequired`, brief (§4), key `walk:<f>:open:<gate>:<round>` | atomic with `openGateId` |
| `decide` | waits on the gate task. Terminal either way: *settled* (a move record exists) or *withdrawn* (a withdrawal exists) | — |
| `consume` | reads the **stored** record (never memory); `settled` → `consequence()`; `withdrawn` → the pending feature move; one `run.commit` writes the new `WalkState`, the outbox entry, clears `pending`, and either goes to `work` for the next cursor or ends the task (`done` · `left-lane`) | atomic |

The row **never** writes a move record and has no path that completes a gate: `decide` ends only because the gate task ended. A kill in any phase re-runs that phase; every phase is idempotent by key or by being one commit.

## 3. Gate extensions (additive; a gate opened without `walk` is r13's)

- `GateSpec.returnsTo`, `GateSpec.walk`; `GateDocument.noteRequired`, `GateDocument.returnsTo` (stored once at opening).
- `submitMove` additionally refuses, as `invalid-move` with this detail: `a corrective move needs a note` · `a target belongs to a reject` · `"<t>" is not a place this gate can send work (allowed: …)` · `admit belongs to the Roadmap gate's approve` · `fixRounds must be 0, 1, 2 or 3` · `"<k>" is not a move a person can make` (for `mitigate`, which is in no vocabulary).
- Order of validation: key → shape → decider → brief → vocabulary → note → target → admit → race. Nothing is written by a refusal.
- `GateState` gains `withdrawn`. `submitMove` on a withdrawn gate returns `stale` naming the feature move's key as `winner`.

## 4. The brief the walk attaches (opaque JSON to the store; fixed shape for the walk)

```json
{ "kind": "gate", "feature": "f", "gate": "6-review", "round": 2,
  "instruction": { "from": "gate:f:6-review:1", "note": "…" },
  "recross": { "target": "3-spec", "changedSince": [ { "gate": "3-spec", "from": "…", "to": "…" } ], "unchanged": false },
  "triage": { "skipped": ["1-concept","2-architecture"], "reasoning": "…" },
  "applicability": { "2a-experience": { "applies": true, "why": "rule" } },
  "fix": { "cap": 2, "used": 2, "verdicts": ["fail","fail","fail"] } }
```
`recross` is `null` on a first crossing; `unchanged:true` with an empty `changedSince` is the plain "nothing this gate judges changed since the approval on …" case (FR-024). `fix` appears at Verification only. Assembling the ten-part brief is r20.

## 5. Verification's automatic rounds

Before Verification opens: `verdict = verifier[i++]`; `while verdict = fail ∧ used < cap`: run a `worker` unit (key `walk:<f>:fix:<round>:<n>`), append `walk.fix-round` (`mitigate`, actor `factory`), re-run the verifier unit and take the next verdict. The gate then opens with the verdicts and the counts. After a person's `reject`, the next pass has `used` pinned at the cap (no more automatic rounds, `the-flow.md` §6). A kill inside a round re-runs it from its key: the entry and the count appear once.

## 6. The feature-level move

`FeatureMoveApi.submit(feature, key, move)` → `FeatureOutcome` = `{status:"committed"|"repeat", record} | Refusal` (the closed vocabulary):

| Check | Refusal |
|---|---|
| owner not ready | `not-ready` |
| key invalid · decider blank · kind ≠ `reject` · note blank · target not in `targetsOf(...)` | `invalid-move` (detail names which) |
| no such walk | `unknown-gate` (detail: `no walk "<f>"`) |
| the walk is `done` or `left-lane` | `stale` |
| a different feature move is already `pending` | `lost-race` / `stale` naming its key |
| same key, equal move | `repeat`; same key, other move | `key-conflict` |
| the open gate's slot was taken by a gate move that is committing | judged against the stored record: `stale` naming that move's key |
| store failure | `store-error` |

Effect when a gate is open: delivered to its decision slot (the same single-shot slot a gate move uses); **one commit** = `FeatureMoveRecord(effect:"withdrew")` + withdrawal + `gate.withdrawn` + `move.committed` + decision terminal. When none is open: one ledger command = `FeatureMoveRecord(effect:"recorded")` + `pending` + `move.committed`, and `openGateId` stays `null`; the **next** `open` commit refuses while `pending` is set, and the row's next wake consumes it (`consume` with no gate: `work` result discarded; walk units are created single-step (`steps: 1`), so a unit's only checkpoint is its end: it is not killed, and the row ignores its finished result (FR-023).

## 7. Channel operations (added to r13's five; the protocol stays one JSON line each way)

| op | request | result |
|---|---|---|
| `feature.admit` | `{key, feature, walk}` | `TaskCreateOutcome` |
| `feature.state` | `{feature, after?: gateId}` | `{ status, openGate: {gateId, gateKey, round, briefRef, vocabulary, returnsTo, noteRequired, brief} \| null, history }` — with `after`, the reply **waits** (event, never a poll) until `openGateId` differs from `after` or the walk ends; an owner restart ends the wait with a connection loss the client retries |
| `feature.move` | `{key, feature, move}` | `FeatureOutcome` |

Exit codes as r13: 0 any answered request, 2 usage, 3 unreachable, 4 outcome unknown (retry the **same** key).

## 8. Kill points added (`KILL_POINTS`; each fires at a hook, none by environment variable)

`walk.admit-opened` · `walk.admission-read` · `walk.pin-begin` · `walk.pin-after-write` · `walk.pin-committed` · `walk.unit-created` · `walk.gate-opening` · `walk.gate-opened` · `walk.settled-read` · `walk.consume-after-write` · `walk.consume-committed` · `walk.fix-round-begin` · `walk.fix-round-committed` · `walk.withdraw-received` · `walk.withdraw-after-write` · `walk.withdraw-committed`.
A static test asserts the names used in the source equal this list (as r13's `kill-points-declared`), and the proof fails by name when a declared point never fired.
