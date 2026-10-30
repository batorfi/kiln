# The record (row r15) — the design as built

One reading page. For *why* each choice was made read [research.md](./research.md); for what the evidence supports read [implementation-report.md](./implementation-report.md). Where this page and the plan differ, **this page describes the code**; the differences are listed in the report (§6).

## 1. What it is

Every state change the factory makes is an **event**, written in the *same commit* as the change. The events form one gap-free, permanent, ordered stream per factory — the **record**. Everything else that describes what happened — the factory-log the first program wrote, a feature's archive, later the screens and metrics — is a **projection** built from it and can be rebuilt from it. The record never holds a person's text, a prompt, an answer, code or a secret: where a fact lives as text elsewhere in the store, the event carries a **reference and a digest**.

```
  a state change ──▶ appendEvent(tx, draft) ──▶ validate against the catalog ──▶ chunk + head + run index
        │                      (inside the caller's commit; a fault throws and the commit rolls back)
        └──────────────────────────────────────── after the commit resolves ──▶ seam: onAppended ──▶ backbone.notify()
                                                                                          │
                       consumer A (transactional: effect + cursor, one commit) ◀──────────┤
                       consumer B (effect: deliver, then cursor; idempotent)     ◀──────────┤
                       factory-log (effect: rebuild a run's file from the record, replace it atomically) ◀─┘
```

## 2. The event and the catalog

* **Envelope** (`contracts/src/events/types.ts`): `id` (UUIDv7-shaped and **deterministic** — time and sequence only, no randomness) · `seq` · `type` · `schema` (`type/version`) · `time` · `subject` · `actor` · `correlation` (`run:<feature>` or null) · `causation` (`cmd:<key>` or `evt:<seq>`) · `trace` (present, null until telemetry exists) · `privacy` · `data`.
* **Catalog** (`contracts/src/events/catalog/`): 42 types in 11 groups, each a closed JSON schema (`additionalProperties: false`, so an unknown field — content included — is refused). 24 are committed by some code; the rest are *schema-only* (the experience events, delegation, system, roadmap), or **read-only legacy** types that exist to represent the first program's streams (`gate.completed`, `gate.waiting`, `lane.transition`, `lane.cost-recorded`) and which `appendEvent` refuses to commit. `schemas/events/*.json` are generated from it and `kiln check record` keeps them equal.
* **Commit-time validation** (`durable/src/record/append.ts`, `record/src/events/validate.ts`): type known and not read-only, current version, no forbidden key anywhere in the data, data valid, actor in the grammar (`<name>@<token>`, `script:<name>`, `task:<n>`, `factory`, `system`, `director`, `role:…`, `delegation:…`), a causation (an `evt:<n>` must be an earlier event), subject, time. A fault throws `EventRejected`, naming the rule; the throw rolls the commit back, so the state does not change.

## 3. Storage and reading

* `kiln.event/<n>` holds events 256n+1…256n+256 (a chunk), `kiln.record/head` `{next, legacyThrough}`, `kiln.record/run:<feature>` indexes one run. An append rewrites the head and the last chunk (and the run's index): constant work, however long the record — measured at 0.18–0.25 ms from 10³ to 10⁵ events with runs of ~90 events, against 0.11→0.89 ms (and linear) for the single document r13/r14 used.
* Entries r13/r14 wrote stay in `kiln.outbox/main`, **never touched again** (checked byte-for-byte on real r14 stores). `legacyThrough` is the last sequence number held there; new events continue after it.
* `readRecord` / `readRun` merge both, and present **every** event at the catalog's current version: a version 0 entry goes through a pure upcaster (envelope added, content replaced by `{ref, digest}`, rendered sentences dropped, a `gate.settled` completed from its sibling `move.committed`); a newer version than the catalog knows fails by name; an unknown interim type is `record.unknown` (name and digest only).

## 4. The backbone and the consumers

`Backbone` (`durable/src/record/backbone.ts`): one async loop per consumer, each with a durable cursor `kiln.cursor/<name>`. A loop waits on an in-memory signal — **no timer, no poll** — and re-reads the store. The signal is raised by the *seam* (`library/tasks.ts`, `library/open.ts`) after any commit that wrote an event chunk, whether it was made by a task step (`run.commit`) or by the store (`store.commit`); a commit that rolled back never wakes anyone.
* **Transactional** consumer: `apply(tx, batch)` and the cursor advance are one commit — the effect happens exactly once.
* **Effect** consumer: `deliver(batch)`, then a cursor commit — at least once; the consumer is idempotent.
* A consumer that throws stops its own loop, records `failed` in its cursor and is shown by `status()`; `retry` resumes it. A cursor ahead of the record (a restored older store) stops its consumer by name. A stalled consumer holds nothing but itself and does not hold up `close()`.

## 5. The factory-log

`record/src/projections/factory-log.ts` is a **pure reducer** from one run's events to the first program's lines (`foldRun`, `step`): time from the event, the line number counted per file from 0, the gate in the form the event says (the first program's streams wrote the same gate three ways), a `cost` derived from the lane swaps and the elapsed time when the event carries none, the flow stamped on a settlement. A declared table (`contracts/src/events/factory-log-map.ts`) says which type makes which record, tested both ways and against the reducer. The live projection (`durable/src/record/consumers/factory-log.ts`) rebuilds a touched run's whole file from the record and replaces it atomically (asynchronously — a synchronous `fsync` made walks 14× slower); `kiln record rebuild-log` runs the same reducer, so the live file and a rebuild cannot differ. The first program's validator accepts the files of real walks, v2-only gates included; a walk decided by `script:r14` is refused — a program is not a human.

## 6. The first program's walks

`spikes/015-capture-walks/capture.ts` (outside `kiln/` and `legacy/`) runs the frozen walkers and copies the committed r7 files into `kiln/fixtures/walks/` as original + events + refs + meta. **Three of the five named rows have an original** — r2 (the lane runtime's stub walk), r3 (the overlay's program walk and its deliberately broken twin), r7 (the committed live pair) — five streams, 73 events; each replays to its original bytes with its original verdict (the broken ones still fail R3). **r1 and r8 have no original stream** and are reported by name with the reason in `MISSING.json`; `kiln check record` prints `3 of 5 named rows replayed … missing: r1, r8` and fails if a named row is neither replayed nor explained.

## 7. The archive

When a walk ends, the same commit creates a `kiln.archive` task. Phases: **export** (the feature's documents, tasks, the run's events and the texts they name → a canonical file, written asynchronously, temp-file-and-rename, named with the first eight hex digits of its SHA-256) → **verify** (re-read, recompute) → **commit** (one commit: `feature.archived`, the tombstones, `kiln.archive/<feature>`). The pinned library cannot delete a document or a task, so "compacted" means: briefs become `{archived: true}`, a move's note text is gone and its digest stays, terminal tasks stay. A repeat of an archived move is judged by the note's digest (`repeat` / `key-conflict` / `stale`, never new) and the feature name cannot be admitted again. A failure is recorded by name and retried at the next start (`ensureArchives`), which is also how a walk that ended under r14 gets its archive.

## 8. How it is checked

`kiln check record` (the fifth check, never vacuous): the catalog (closed schemas, no forbidden key, upcasters present and — over real events — pure and lossless), the source against the catalog (every committed type is catalogued; every type marked committed is), the generated schemas, the committed walks' replay. 25 negative members across 20 codes, each refused with its own code (plus the commit-time suite of 16 for `appendEvent`). The record oracle (E1 gap-free · E2 valid · E3 actor and cause · E4 factory-log == rebuild · E5 cursors and consumers · E6 archive · E7 state ⇔ event) is judged by a fresh reader after every kill of the whole r13/r14 matrix and of 300 random kills across the walk, the record, the backbone and the archive. Twelve sabotages of the code are each caught by a named test; five weakened implementations (a writer without validation, a writer that numbers from memory, a consumer that acknowledges early, a projection that reads the clock or numbers across runs, an archive that compacts before verifying) are each caught by the oracle.

## 9. Files

```text
contracts/src/events/          types · id · grammar · upcast · factory-log-map · catalog/{gate,walk,unit,lane,command,feature,delegation,experience,system,roadmap,record,files}
record/src/                    events/validate · streams · replay · legacy-convert · projections/factory-log
durable/src/record/            append · read · refs · runs · unit-events · consumer · cursors · backbone · archive · archive-task · tools · consumers/factory-log
durable/src/library/           tasks.ts open.ts — the seam: hooks into every transaction and the post-commit wake-up
checks/record.ts               kiln check record            cli/src/record-commands.ts   kiln record show|status|verify|rebuild-log|archive-show
fixtures/walks/                the captured streams         fixtures/stores/             r14-written stores and entries (made by r14's own code)
schemas/events/                generated schemas            spikes/015-capture-walks/    the capture command
```
