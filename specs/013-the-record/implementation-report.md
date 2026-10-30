# Implementation report: The record (row r15)

**Branch**: `013-the-record` | **Report date**: 2026-10-29 | **Base**: `main` (r14 merged, PR #7)
**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Tasks**: [tasks.md](./tasks.md) · **Readings**: [baseline.md](./baseline.md) · **Lab notebook**: [notes.md](./notes.md) · **Technical overview**: [overview.md](./overview.md) · **Explainers**: [how the record works](../../docs/architecture/explainers/the-record.md), [the record store](../../docs/architecture/explainers/the-record-store.md)
This file is about the *work*: what was built, how far the evidence can be trusted, what changed from the plan, what went wrong on the way, and what is still open. It says what a reader should **not** conclude as plainly as what they can.

> **Reading guide.** Five minutes: §1 and §7. Reviewing the code: §2. Judging the evidence: §3–§4. Picking up the open items: §6–§7.

## 1. Status in one paragraph

**All seven user stories are built and every task is done.** Every state change the factory makes is now an event written in the commit that makes the change, validated against a versioned catalog of 42 closed schemas, numbered gap-free, stored in chunks of 256 with a head and a per-run index, and read back at the catalog's current version whatever version was stored. A backbone with durable cursors lets consumers follow the record with no timer; the first program's factory-log is one of them — a pure reducer over a run's events, rebuilt byte-identically by `kiln record rebuild-log`. Three of the five old named walks (r2, r3, r7 — five streams, 73 events) replay to their original bytes and verdicts; r1 and r8 never produced a stream and are reported by name. A finished feature is archived by the factory itself — a checksummed file, verified before any tombstone, with its move keys kept. Evidence: the default tier is green on Node 22.19.0, 24.1.0 and 25.9.0 (809–812 tests, 76–112 s; 23.6.0 was run too, and is why the floor was raised: §7); the proof tier is green (128 of 128, 467 s after the review fixes) on 25.9.0 and on 22.19.0 once the machine is not loaded (§4, §8); `kiln check` has its fifth check, `record`, with 25 negative members across 20 codes. **What this does not show:** nothing about loss of host power; nothing for r1 and r8; nothing about the library deleting (it cannot — §7). The Node floor was raised during this row from `^22.19.0 || >=23.6.0` to `^22.19.0 || >=24.1.0` (decided by a person, §7).

## 2. What exists

| Area | Where | What |
|---|---|---|
| Envelope, id, grammar | `contracts/src/events/{types,id,grammar}.ts` | the frozen envelope; a deterministic UUIDv7-shaped id from time and sequence; the actor grammar; the content pair `{ref, digest}`; forbidden keys |
| Catalog | `contracts/src/events/catalog/*.ts` | 42 types in 11 groups, closed schemas, privacy class, `legacy` read-only types; 24 committed by some code; `schemas/events/*.json` generated and kept equal by the check |
| Upcasting | `contracts/src/events/upcast.ts` | pure v0 → v1 upcasters with sibling context and an injected digest; a newer version fails by name; an unknown interim type becomes `record.unknown` |
| Validation | `record/src/events/validate.ts`, `durable/src/record/append.ts` | `appendEvent` in the caller's commit; `EventRejected` rolls the commit back |
| Storage and reading | `durable/src/record/{append,read,runs,refs}.ts` | chunks, head, run index, `legacyThrough`; `readRecord`, `readRun`, `headOf`; refs resolved from where the text lives (an archived feature's texts are read from the archive file with `readArchive`) |
| Backbone | `durable/src/record/{backbone,consumer,cursors}.ts`, `library/{tasks,open}.ts` | one loop per consumer, durable cursors, transactional and effect modes, a post-commit wake-up from the storage seam, no timer |
| Factory-log | `record/src/projections/factory-log.ts`, `contracts/src/events/factory-log-map.ts`, `durable/src/record/consumers/factory-log.ts` | the pure reducer; the declared event → record table (tested both ways); a live consumer writing one file per run atomically |
| Old walks | `record/src/{legacy-convert,replay}.ts`, `fixtures/walks/`, `spikes/015-capture-walks/` | five streams from the frozen walkers, converted, replayed, byte-identical |
| Archive | `durable/src/record/{archive,archive-task}.ts` | export → verify → commit as a task created in the commit that ends a walk; tombstones; key marker; `ensureArchives` at start |
| Tools | `durable/src/record/tools.ts`, `cli/src/record-commands.ts` | `kiln record show|status|verify|rebuild-log|archive-show` |
| Check | `checks/record.ts`, `tests/record-negative.ts` | the fifth check; never vacuous; 25 negative members across 20 codes |
| Proof | `durable/tests/proof/` | kill points `record.append-after-write`, 4× `backbone.*`, 4× `archive.*`; the record oracle E1–E7; 300 random kills; weakened implementations |
| Measurements | `tests/measure/{outbox-baseline,record,walk-time}.ts` | baseline.md §2, §11 |

## 3. How the design carries the contract

* **No state without its event** is a property of the *commit*, not of discipline: `appendEvent` takes the caller's transaction. A fault throws, the throw rolls back the state change too. E7 checks the equivalence after every kill.
* **The record is the source; the factory-log is a view.** The reducer is pure (time from the event, line numbers counted per file) and the same reducer serves the live consumer and `rebuild-log`, so they cannot differ; E4 checks it after every kill.
* **Nothing stored is edited.** Old entries stay in `kiln.outbox/main` byte for byte (checked on real r14 stores); readers see them through upcasters. `legacyThrough` and the chunk numbering make the seam exact.
* **The record holds facts and pointers.** Every closed schema refuses an unknown field and the forbidden keys are refused anywhere in `data`; a person's text lives in one place and the event carries `{ref, digest}`.
* **Archive before tombstone.** The task has three phases whose order is the guarantee; a weakened archive that compacts first is caught by E6.

## 4. How far the evidence can be trusted

| Evidence | What it shows | What it does not |
|---|---|---|
| Default tier (809 new tests, 500 legacy) on four Nodes | the behaviour, the check, the CLI, the fixtures | timing under load beyond a rough budget |
| Kill matrix: every r13/r14 point + 9 new points × hits | after an abrupt death at a named step a fresh reader finds E1–E7 hold | power loss; a kill *between* two instructions the points do not name |
| 300 random kills (seed 20261028) across walk, record, backbone, archive | the same invariants at random instants | an instant that never occurs in 300 draws |
| Mutation checks (12) | each named sabotage of the code is caught by a named test | sabotages nobody thought of |
| Weakened implementations (5) | the oracle fails when the writer skips validation, numbers from memory, a consumer acknowledges early, a projection reads the clock or numbers across runs, an archive compacts first | — |
| Replay of 5 real streams | the reducer and converter agree with the first program on real bytes | r1 and r8, which have no stream |
| Real r14 stores | an r14-written store opens, reads and continues | a store from a *future* version |

The evidence is **only as good as the oracle**; the oracle is itself shown able to fail (the weakened implementations and the negative suite). Two caveats on the proof tier: it is *load-sensitive* — under heavy machine load a freshly spawned owner can take longer than the harness waited to say `STARTED`, which fails a test with "the owner did not start", never with a wrong result; the wait is now 45 s (it was 15 s). And its time varies from 260 s to over 1,000 s with load.

## 5. Success criteria

| | Result |
|---|---|
| **SC-001** 100 % of state changes have exactly one event, gap-free, actor and cause on all, after every r14 kill point | met: oracle E1/E3/E7 after each point and 300 random kills |
| **SC-002** every committed type has a versioned schema; 100 % of the negative suite refused by name, state unchanged; an empty check fails | met: 24 committed types ⊆ 42; 25 negative members / 20 codes in the check plus the commit-time suite of 16; the check fails on zero types |
| **SC-003** the rebuilt factory-log byte-identical, per run, after a kill at every delivery and cursor point; validators pass | met (E4, `factory-log-kill`); a walk decided by `script:…` is refused by the validators as stated |
| **SC-004** every old walk with an original replays to its bytes; the broken one still fails; the run says how many of five | met: **3 of 5** (r2, r3, r7); r1 and r8 named with reasons; the broken twins still fail R3 |
| **SC-005** r13/r14 stores open; every entry reads as current; 0 stored bytes change | met: `store-compat` on real r14-written stores |
| **SC-006** a breaking version with its upcaster leaves replays byte-identical; a lossy or impure upcaster is caught | met: `record-evolution.test.ts` and the check |
| **SC-007** a stalled consumer changes nothing, walk < 3 s; a killed consumer resumes equal | met: walk 36 ms; `backbone-kill` |
| **SC-008** archived by the factory with no command, verified, tombstones only after, exactly once under kills, record unchanged, keys inside | met: `archive.test.ts`, `archive-kill` (4 points), E6; keys kept (marker and file) |
| **SC-009** size per event/walk, rebuild time for a year, walk overhead — reported with method | met, reported: baseline.md §11 (365 B/event; 94 events and 34,340 B per interface walk; 100,010 events 40 MB, read 115 ms, fold 105 ms; walk 25 → 36 ms). The live store's size before and after archiving was **not** measured (see §7) |
| **SC-010** r13/r14 proofs still pass, `legacy/` and ROADMAP unchanged, `kiln check` passes, never vacuous | met: legacy diff empty, tree id `20a82c7e…`, ROADMAP hash `2fd48236…`, `npm run check` 5 PASS; see §8 for the load-sensitive proof runs |

## 6. Deviations from the plan (all recorded in `notes.md` as they happened)

1. **Names kept.** The concept's spellings (`gate.settled` etc.) are examples; the ~150 existing assertions read the interim names, so the type names stay and only the *shape* is versioned (research R4).
2. **Tombstones, not deletion.** The pinned library has no delete for documents or tasks. "Compacted" means briefs become `{archived: true}` and a move's note text goes while its digest stays; terminal tasks stay. Raised for the dependency record.
3. **`trace` is present and `null`.** Telemetry arrives with r28.
4. **An effect consumer, not a transactional one, for the factory-log.** The plan wanted its lines in a document in the same commit; a synchronous file write there made walks 14× slower. The built consumer folds the run and writes the file asynchronously; `kiln.projection` is reserved and empty.
5. **The actor grammar is stricter than r13's tests assumed.** A person is `<name>@<token>`; a non-conforming decider is refused at submit; the CLI default actor is `system`. Test deciders were updated.
6. **Three of five old walks.** r1 and r8 have no stream; the spec said stop and report, and it did.
7. **Async writes everywhere a file is written.** Projection and archive use temp file, `fsync`, rename, awaited off the commit path.
8. **A fourth CLI → durable path.** The CLI reaches `durable` through the channel client, path, owner and now `record/tools.ts`; the layer rule and its tests were updated.
9. **The Node floor was raised** to `^22.19.0 || >=24.1.0` (§8.2, §7): Node 23.6.0 does not apply the SQLite busy-timeout option.

## 7. Open items and what this row did not decide

* **The Node floor — decided: raised** from `^22.19.0 || >=23.6.0` to `^22.19.0 || >=24.1.0`. Node 23.6.0 ignores the busy-timeout option of its SQLite module. A first fix set `PRAGMA busy_timeout` in the seam; the floor was raised instead and that code removed, so the seam and the owner lock set nothing: they refuse to open (by name) on a Node whose busy timeout is 0, and `tests/busy-timeout.test.ts` is the floor's proof (it passes on 22.18, 22.19, 24.1, 25.9 and fails by name on 23.6.0). Why `24.1.0` and not `24.0.0`: it is the lowest 24.x measured. Other 23.x releases (23.10+ may apply the option) were not measured and are excluded with the line. Documents that still quote the older range and were not edited because they are final or historical: the PRD (§7), `docs/concepts/first-run.md` and its mockup, the explainer `kiln-v1.md` §platform, and the older specs.
* **Roadmap gate: r1 and r8.** The row closes with 3 of 5 named walks replayed. Whether that is acceptable is for the Roadmap gate, as the spec says.
* **No deletion in the library.** Archiving frees text, not documents or tasks. A library capability to raise with the dependency record.
* **The live store's size before and after archiving** was not measured; only the archive file's size was.
* **The run index is O(run).** Fine at the measured shape (runs of about 90 events); a 100,000-event run costs ~1.6 ms per append. A chunked index is the follow-up if a different shape appears.
* **`kiln.projection`** is reserved and unused.
* **Only some catalogued types are committed.** 24 of 42; the experience, delegation, roadmap and system events are schema-only until their rows.
* **Power loss** is not covered, as for r13/r14.
* **Code review (T074).** `/code-review high` over the whole branch returned 10 findings; 9 were real and are fixed (§8.7), 1 is recorded here and not changed: **`readRun` re-reads and re-upcasts the whole old outbox for every call** on a store that carries r13/r14 entries, so the factory-log consumer's refold of a run costs O(old outbox) per batch and O(run) per refold. It is a cost, not a wrong answer; the measured catch-up of a generated year (8.2 s) had no old outbox. A per-run index of the old part, or caching the upcast outbox (it is never written again), would remove it.

## 8. What went wrong on the way (the honest log)

1. **Synchronous `fsync` in the projection** made the in-process walk 14× slower (25 → 347 ms). Found by `walk-time.ts`, fixed by async writes (36 ms). Lesson: measure the walk before and after adding any follower.
2. **Node 23.6.0 and "database is locked".** Found by the floor matrix, not by the default Node: 23.6.0 reports a busy timeout of 0 whatever the option says, so a second connection that met the owner mid-commit failed at once and could poison the owner's session in the withdraw kill tests. First fixed in the seam (`PRAGMA busy_timeout`), then — when a person raised the floor — by dropping the 23.x line instead; `tests/busy-timeout.test.ts` asserts the value on every supported Node. A first test that interleaved two connections in one process hung (node:sqlite is synchronous and the writer loop starved the event loop); it was dropped for the value assertion, which is the honest one.
3. **`tx.task()` after the first table write** failed row creation; creators now read before writing or take the correlation as an argument.
4. **A chunk-offset bug with legacy entries** (`inChunk` ignored `legacyThrough`) found by `store-compat`.
5. **Judges counting the archive task.** A walk's archive task exists the moment the walk ends, so "nothing left waiting" saw it; judges and `walkOutcomes` ignore `kiln.archive` and `feature.archived`.
6. **Load-sensitive proofs.** Under machine load the proof tier failed 13 of 128 tests on 22.19.0 and 2 tests of the default tier on 24.1.0 with 150–173 s stalls or "owner did not start within 15000 ms", none with a wrong result; every one passed when run alone, and the clean reruns were green except one random-kill test hitting the 15 s start wait. The wait is 45 s now. I did not hide this: the proof tier's pass is stated as "green when the machine is not loaded".
7. **The code review found nine real defects in code that all tests passed** — each now has a regression test or is covered by one: (a) a caller's command key that looks like an event reference (`evt:3`) was taken as a cause that points at event 3, so `appendEvent` now takes an earlier event as `causeEvent` and a `cause` is always a command key; (b) the archive's compacting commit did not check that the run was still what the file holds — an event landing between export and commit would have been tombstoned without being archived; the checkpoint now carries the file's last sequence number and the commit goes back to export if the run has moved on (a late event is in the final archive; test added); (c) a gate whose decision ended without a move threw in its settle step, which fails the task for good — it now ends aborted and writes no `gate.settled`; (d) event times came from clocks read before the commit, so a healthy record could fail `time-backwards` — the head now remembers the newest time and an event is never stamped earlier (test added); (e) a consumer-registration failure in `openFactory` left the lock and store open — registration is now inside the guarded section; (f) `verifyArchive` hashed the whole file on the owner's thread — it is asynchronous and streams; (g) `archive-show --archive` took only a file name — it now takes a path too; (h) a caller could send `noteDigest` with a move and make a move that only claimed to know the note's hash compare equal — it is refused as `invalid-move`; (i) `resolveRef` claimed an archive fallback it did not have — the comment now says what is true. Lesson: the record's own oracle checks what was written, not what a *caller* may supply; the review was worth a day.
8. **A failed `sed -i` on macOS** (needs `-i ''`) and a stash/pop episode — no loss.

## 9. Evidence

* **Readings**: [baseline.md](./baseline.md) §1–§12 (before, per-story checkpoints, measurements, the matrix).
* **Lab notebook**: [notes.md](./notes.md) §1–§11.
* **Mutations**: `mutations.json` (12 of 12 caught).
* **Commands**: `npm test` · `npm run proof` · `npm run check` · `node tests/measure/record.ts` · the quickstart ([quickstart.md](./quickstart.md), run from a fresh clone — baseline.md §12).
