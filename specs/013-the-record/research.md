# Research: The record (row r15)

Decisions taken before design (each: **Decision · Rationale · Alternatives**). Nothing here re-opens r13's gate contract, r14's walk, or the four clarifications of the spec. Source reading: `kiln/packages/{contracts,record,durable,lane,cli}`, `kiln/checks`, `legacy/src/{walk,log-writer,live-walk}.ts`, `docs/concepts/the-record.md`, the pinned library's published surface. Two things were **measured** (not assumed) and are marked ◆.

## R1 — Where each part lives (the layer rules decide)

**Decision.** `checks/boundaries.json` allows `contracts → ∅` (and no `node:` builtins), `record → contracts`, `durable → contracts, record`, `checks → contracts, record`. So:

| Part | Package | Why there |
|---|---|---|
| Envelope type, event ids, the **catalog** (schemas as data), upcasters, the line-mapping table | `contracts/src/events/` | pure, shared by the writer, the reader and the checks |
| Event validation (JSON-schema subset + grammar + forbidden keys), stream validators, the **factory-log reducer** (events → lines), replay, legacy-line ↔ event converter | `record/src/` | the checks must replay committed streams **without** loading `durable` or the library |
| Append, chunked storage, the reader, the **backbone**, cursors, consumers, the archive task | `durable/src/record/` | needs the store |
| `kiln check record` | `checks/record.ts` | imports `contracts` + `record` only |
| `kiln record show\|status\|verify\|rebuild-log` | `cli` | thin, offline, via a fresh reader |

**Rationale.** It is the only split under which the new check can replay old walks the way the flow check validates the flow: pure, no library. **Alternatives.** Everything in `durable` (the check could not run without the library — refused by the layer rule); a new `events` package (an eighteenth layer for ~1 500 lines).

## R2 — Storage: chunked event documents, because one growing document does not scale ◆

**Measured.** With the current layout (one document `kiln.outbox/main` holding every entry), an append rewrites the whole document. On this machine: **0.10 ms** per append at ~100 entries, **0.23 ms** at ~1 000, **1.07 ms** average (1.6 ms for one append) at ~6 000 — linear growth. At the 10⁵–10⁶ events of a busy factory's year that is 25–250 ms **per commit**, in the single writer's path.

**Decision.** The record is stored as **chunks**: `kiln.event/<n>` holds events `256·n+1 … 256·(n+1)` as complete envelopes; `kiln.record/head` holds `{next, legacyThrough}`; the writer reads and rewrites only the head and the last chunk (constant cost). A per-run index `kiln.record/run:<feature>` lists the sequence numbers of one feature run (so a feature's history is read without scanning the record). Entries r13/r14 already wrote stay **exactly where they are** in `kiln.outbox/main` and are never touched again: `legacyThrough` is the last sequence number in that document, taken from it in the first append commit under the new owner (no migration commit, nothing rewritten). New events continue at `legacyThrough + 1`.

**Rationale.** Gap-free, one writer, one logical stream; no event ever rewritten; old stores open unchanged (FR-021, SC-005). "Never segmented" in CORE-7 means no retention segments that drop or detach history; chunks are a storage layout inside one document family, all kept, all addressable by sequence number. **Alternatives.** One document per event (a document per fact: tens of thousands of rows; scans cost more than a chunk read); keep the single document and accept the cost (measured above — rejected); move the record to its own file (a second store: two commits can no longer be one).

## R3 — The envelope and event identity

**Decision.** Fields: `id`, `seq`, `type`, `schema` (`"<type>/<n>"`), `time` (ISO from the commit's clock), `subject`, `actor`, `correlation`, `causation`, `trace`, `privacy`, `data`.
- `id` is UUIDv7-shaped and **deterministic**: the 48-bit millisecond time and the sequence number fill the fields a UUIDv7 gives to time and counter; the remaining bits are zero-filled by a fixed rule. No randomness: a rebuild, an upcast of a version 0 entry and a replay on another machine give the same id; it sorts by time then sequence. (`contracts` has no `node:crypto`, and a random id would make killed and uninterrupted runs differ.)
- `actor` keeps the identities in use: `human@<token>` (the validator's pattern), `director`, `system`, `factory`, `task:<id>`, `role:<name>@<model>`, `delegation:<ref>`, and `script:<name>` (a scripted decider — recorded as what it is; the log validator correctly refuses a `script:` approval as not human).
- `correlation` is `run:<feature>` for anything belonging to a feature run (a gate id `gate:<feature>:…` yields it); `null` for the factory's own events (lane without a feature holder, system).
- `causation` is `cmd:<key>` (a command or move key) or `evt:<seq>` (an earlier event); the r13/r14 `cause` string is kept verbatim in the upcast as `cmd:<cause>` — no event reference is invented for a version 0 entry.
- `trace` is present and **`null` until telemetry exists** (r28); `privacy` is `internal` by default and `public`/`sensitive` per type.

**Rationale.** EVT-2 and the concept §6, with the determinism the proofs need. **Alternatives.** Random UUIDv7 (breaks equality of killed/uninterrupted runs and of rebuilds); `evt:<seq>` as the id (not unique across merged records; no time order for consumers outside the factory).

## R4 — Names: the interim names are the catalog's names

**Decision.** The type names r13 and r14 chose (`gate.opened`, `move.committed`, `gate.settled`, `gate.withdrawn`, `gate.not-applicable`, `gate.became-applicable`, `gate.skipped`, `lane.acquired|released|swapped`, `walk.admitted|returned|fix-round|split|left-lane|not-admitted|completed|move-ignored`) **stay**. New types follow the same style (`unit.queued`, `command.accepted`, `feature.archived`, `charter.approved`, `design-system.amended`, …). What changes between version 0 and version 1 is the **shape**: the envelope, and content leaving the payload (R6). The concept's example spellings (`gate.not_applicable`, `row.admitted`) are examples, not a contract (concept §7: "examples").

**Rationale.** ~150 existing assertions in r13/r14 tests and the oracle read these names; renaming buys nothing and costs a week of churn. **Spec impact (a deviation recorded in the plan):** the Assumption that says the catalog's name differs from the interim one is amended — they are the same; only the version differs. **Alternatives.** Rename to the concept's spelling and upcast (real upcasters, but churn in every test for no reader benefit).

## R5 — Commit-time validation: `appendEvent` replaces `appendOutbox`

**Decision.** One function, `appendEvent(tx, draft)`, builds the envelope and validates it **before** writing, inside the caller's commit. It checks, in order: the type is in the catalog; the version is the current one; the data validates against that version's schema (`additionalProperties: false` everywhere, so an unknown field — including any content field — is refused); the actor matches the grammar; a cause/causation is present; no key anywhere in `data` is in the forbidden set (content: `prompt`, `answer`, `transcript`, `note`, `text`, `content`, `body`, `code`; remote: the first program's list `url`, `http(s)`, `endpoint`, …); a content-bearing fact is a `{ref, digest}` pair. A failure throws an `EventRejected` naming the rule, type and field; the throw rolls the whole commit back, so the state does not change (FR-013).
- FR-014 (a gate cannot settle without a decider; a move in its gate's vocabulary) is carried by the schemas: `gate.settled` requires `decidedBy` and `move`; `move.committed` requires `kind` and `decidedBy`; the gate task's settle phase now reads the move record to fill them.

**Rationale.** The log-writer's rule becomes a property of committing (concept §5). **Alternatives.** Validate in the dispatcher after commit (the concept's own words: "an invalid event fails its commit" — rejected); validate only in tests (not a guarantee).

## R6 — Content leaves the payload; references stay

**Decision (Clarification Q1).** The fields r14 wrote inline become references:

| r14 field | Event | Now |
|---|---|---|
| `note` of a person's move | `walk.returned`, `walk.left-lane`, `walk.not-admitted`, `walk.split` (`remainder`), `gate.withdrawn`, `walk.move-ignored` | `noteRef` + `noteDigest` |
| `reasoning` (triage) | `gate.skipped` | `reasoningRef` + `reasoningDigest` |
| `reason.text` (a rendered sentence) | `gate.not-applicable`, `gate.became-applicable` | dropped: the structured `reason` (`rule`, `evaluated`, `verdict`) stays; the sentence is re-rendered from it by the reader that wants it |
| `because` (a sentence) | `walk.move-ignored` | replaced by an enumerated `why` (`walk-ended-merged`, `walk-ended-left-lane`, …) |

A **ref** is a locator string: `move:<gateId>#note`, `walk:<feature>/moves/<key>#note`, `row:<feature>#triage.reasoning`. The digest is the SHA-256 of the text. The text stays where it already is (the move record, the walk document, the row's input) and goes into the archive with the feature. A `resolve(ref)` function in `durable` reads it; a consumer that needs text (the factory-log projection for an old walk whose `human-decision` carries a `note`) is handed a resolver — the committed streams ship the referenced texts in a sidecar so a replay needs no store.

**Alternatives.** Digest only (nothing to resolve to); inline short notes (Q1 option B — declined).

## R7 — Upcasting: version 0 is the interim entry

**Decision.** An upcaster is `(entry, ctx) → Event`, pure given `ctx = {digest}` (SHA-256 is injected because `contracts` has no `node:crypto`; the function is pure for a given digest function). A stored entry with no `schema` field is **version 0**. The registry has one upcaster per interim type that maps it to the current shape: wraps it in the envelope (id from `at`+`seq`; `time` from `at`; `correlation` from the subject; `causation = cmd:<cause>`; `privacy = internal`; `trace = null`), keeps the structured facts, and replaces each content field by its `{ref, digest}` (the digest of the inline text, computed by `ctx.digest`; the ref by the rule of R6). The inline text stays on disk, unread. An unknown interim type becomes `record.unknown/1` carrying only `originalType` and the digest of its canonical JSON. A stored `schema` newer than the reader's catalog throws `EventVersionUnknown`.
- **Lossless**, precisely: for every sample of every version 0 type, a test-side `downcast(upcast(e))` recovers every field the catalog admits, and the dropped content fields are exactly those R6 lists. **Pure**: same entry, same output, no clock, no store.
- The first **breaking** version (a test catalog with `gate.opened/2`) proves the machinery before there is a real one: its upcaster and its replay are test fixtures (FR-020, SC-006).

**Alternatives.** Rewriting old entries on first open (forbidden: "never rewritten"); a runtime branch in every consumer (consumers "handle only the current version").

## R8 — The backbone: notify after commit, cursors in the store, no polling

**Decision.** `Backbone` lives in `durable`, started by the factory after `ready` and stopped by `close()`. A **consumer** is `{name, version, mode, from}` plus either `apply(tx, events)` (**transactional**) or `deliver(events)` (**effect**).
- The writer calls `backbone.notify()` after any commit that appended events (an in-memory signal — the `Watch` pattern of r14; nothing polls, no timer).
- Each consumer has its own async loop and its own cursor document `kiln.cursor/<name>` = `{seq, failed?}`. The loop reads the events after `seq` (from the chunks, upcast), in batches of at most 256, and:
  - **transactional**: one commit runs `apply(tx, batch)` and sets `seq` — the effect and the cursor advance are one commit, so the effect happens **exactly once** and a repeat after a kill is impossible by construction;
  - **effect**: `deliver(batch)`, then a commit sets `seq` — **at least once**; the consumer must be idempotent (a test repeats every delivery).
- Independent loops: a consumer that never returns holds only its own loop; no commit awaits any consumer (FR-032). A throwing consumer stops at that event, records `failed:{seq, error}` in its cursor, and is reported by `backbone.status()`; it retries on restart. Lag = head − `seq`.
- A new consumer starts at `from` (default 1) and catches up in order (FR-033).
- Kill points: `backbone.batch-read`, `backbone.apply-after-write`, `backbone.committed`, `backbone.delivered`.

**Rationale.** The library has no durable "wait for an outside event" (r13 R2), so a durable consumer *task* would have to poll or sleep — both forbidden (IX). A cursor document plus an in-memory wake-up is the same shape as r13's decision slots: memory only wakes, the store decides. **Alternatives.** A consumer as a durable task (needs a timer or a poll); a push from the writer's commit callback (couples a commit to a consumer — the opposite of FR-032).

## R9 — The factory-log projection: one file per run, built by a pure reducer

**Decision (Clarification Q2).** The reducer `foldRun(events, resolver) → lines` is pure and lives in `record`. A line is made from an event by a **declared table** (`contracts/src/events/factory-log-map.ts`), tested both ways:

| Event(s) | Record type | Notes |
|---|---|---|
| `lane.acquired` / `lane.swapped` / `lane.released` / `lane.held` | `transition` (`load` / `swap` / `yield` / `hold`) | facts `from`, `to`, `reason` |
| `lane.cost-recorded` | `cost` | `{switches, wallClock}` |
| `move.committed` (a person's move on a gate) | `human-decision` | `{gate, decidedBy, move}`; a `note` is added only if the event has a `noteRef` the resolver can read |
| `gate.settled` | `gate-completion` | `{gate, move, cost, decidedBy}` or `preDelegation`; `cost` is **derived** (`switches` = swaps so far in the run, `wallClock` = elapsed `mm:ss` from the run's first event to this one) unless the event carries it (old walks do) |
| `gate.waiting` | `wait` | only old walks (r14 gates have no deadline) |
| `delegation.armed` | `pre-delegation` | distinct from any move (constitution VI) |

Every other event produces no line. `ts` is the event's `time`; `seq` is a per-file counter from 0 (the first program's convention); `flow` is stamped from the gate's flow when the event says it. The reducer reads nothing but events and the resolver — no clock, path, pid or ordering of unrelated work — so a rebuild is byte-identical anywhere.
- **Live** form: a transactional consumer `factory-log` keeps, per run, `kiln.projection/log:<feature>` = `{state, lines}`; an effect consumer `factory-log-files` writes `<store>/projections/factory-log/<feature>.jsonl` by temp-file-and-rename from that document (idempotent; a kill leaves the old or the new whole file, and the repeat fixes it).
- **Rebuild** form: `kiln record rebuild-log` and the proof run the reducer over the run's events from sequence 1 and compare bytes with the live file.

**The decider.** `humanId` in the schema is `^human@`; r14's scripted walks decide as `script:r14`, which the validator would (rightly) refuse as an approval by a non-human. r15's walks for SC-003 therefore decide as `human@r15-script`; r14's fixtures and tests are unchanged. That a program can carry a `human@` name is r13's carried item (no identity yet) and stays open.

**Alternatives.** One whole-factory file (Q2, declined); the projection holding no state and folding in memory at each start (O(N) at every start).

## R10 — The old walks: captured by a one-off command outside `legacy/` and `kiln/`

**Decision (Clarification Q3).** The frozen first-program walkers cannot be imported by `kiln/` (`kiln check boundaries` forbids it) and `legacy/` must stay byte-identical, so the capture is `spikes/015-capture-walks/capture.ts`, run by hand once, importing `legacy/src/*` and writing into `kiln/fixtures/walks/`: `<name>.jsonl` (the original, byte for byte), `<name>.events.jsonl` (the converted event stream), `<name>.refs.json` (texts for any `noteRef`), `<name>.meta.json` (how it was made, from which walker, with which options; the original's SHA-256). The converter (`record/src/legacy-convert.ts`, pure) is the inverse of R9's table.

Reconnaissance (the capture task confirms or corrects each line, and anything it cannot run is **reported, not built**):

| Old row | Original | Source found |
|---|---|---|
| r7 live inference | the committed `r7-live-inference.jsonl` and the deliberately invalid `r7-live-broken.jsonl` | already files — used as they are |
| r3 roadmap overlay | the closed-row program walk and its `brokenAutoApprove` twin | `buildProgramWalk()` (`legacy/src/walk.ts`), deterministic clock |
| r2 lane runtime | the stub rail walk (lane switches, 8 gate completions) | `buildStubWalk()` (`legacy/src/walk.ts`), stub resident |
| r1 scaffold | the contract's own fixture streams | inline in `legacy/tests/contract/log.test.ts` — to be extracted if they are whole streams |
| r8 Pi extension | the extension's walk output | wraps the stub/program walkers; no separate stream found — expected to be reported missing |

**Alternatives.** Hand-converting (declined: nothing independent to compare with); importing the walkers from `kiln/tests` (breaks the boundary rule and the "legacy is frozen" guarantee).

## R11 — Units and commands become events (the catalog must cover what changes)

**Decision.** r13/r14 record gates, moves, the lane and the walk but not units or commands, though FR-001 and FR-010 name them. r15 adds emitters: `unit.queued` (in the creating commit), `unit.started` (first step), `unit.settled` / `unit.failed` / `unit.aborted` (terminal commit), and `command.accepted` (in `runCommand`'s applied branch: `{kind, requestHash}`; actor = the issuer where the caller names one, else `system`; cause = the key). A refused command has no committed state and writes nothing; `command.refused` is catalogued, not emitted.

**Cost.** Tests that count outbox entries (a gate open now writes `command.accepted` + `gate.opened`) must filter by type; the plan lists them (see tasks later). **Alternatives.** Leave units/commands unrecorded (contradicts FR-001/SC-001).

## R12 — The archive: a durable task per ended walk; compaction is overwrite, because the library cannot delete ◆

**Measured.** The library's published surface offers no delete or prune of a document or a task. A document family opened with `history: latest` keeps only the latest value: writing 2 MB and then overwriting it with a few bytes left the file at 2.1 MB after a *second* 2 MB document was added — the first 2 MB was reused, not retained. Terminal tasks (and their checkpoints, inputs, outcomes) cannot be altered or removed. The file itself does not shrink without a `VACUUM`, which the seam does not expose.

**Decision.** Compaction means **replacing a feature's documents by tombstones in one commit**, after the archive is verified:

| Document | Tombstone keeps | Goes to the archive |
|---|---|---|
| `kiln.brief/<gateId>` | `briefRef` (the digest of the content) and `archive` id | the brief content |
| `kiln.move/<gateId>` | gate id, key, kind, decider, time; `noteDigest` | the note text |
| `kiln.walk/<feature>` | `admittedBy`, `status`, and the **set of move keys** with the digest of each move | the full move records and notes |
| `kiln.gate/<gateId>` | whole (small, immutable) | copied |
| `kiln.command/<key>` | whole (the ledger is the key retention) | copied |

Tasks stay in the store (their checkpoints are small — measured in the baseline) and are **listed** in the archive. The honest limit is stated in the spec's Assumptions: r15 compacts documents; compacting task checkpoints (and the conversations r16 will add) needs a capability the library does not offer and is raised with the dependency's record, not worked around in SQL.
- **Trigger and steps (Clarification Q4).** The row's terminal commit creates a `kiln.archive` task in the same commit as the walk's last events. Phases: `export` → writes `<store>/archive/<feature>-<sha8>.kiln-archive` (canonical JSON lines, header first) by temp-file-and-rename and `fsync`; `verify` → re-reads, recomputes SHA-256, compares; `commit` → one commit appends `feature.archived` `{archive, sha256, bytes, counts}`, writes the tombstones and `kiln.archive/<feature>`, and ends the task. Kill points: `archive.export-written`, `archive.verified`, `archive.commit-after-write`, `archive.committed`. Re-running a phase after a kill rewrites identical bytes; the commit step is guarded by `kiln.archive/<feature>` already existing.
- A failure in `export` or `verify` throws; the task retries on restart; a mismatch is reported by name, nothing is compacted (FR-060, SC-008).

**Alternatives.** Direct SQL on the store file (bypasses the seam and the experimental-SQLite guard); archiving on request (Q4, declined); doing it inside the walk's last commit (an unbounded commit that can fail the walk's end — FR-064 forbids).

## R13 — Reading the record: one reader, three callers

**Decision.** `readRecord(src, range)` merges version 0 entries (from `kiln.outbox/main`, up to `legacyThrough`) and the chunks, upcasts, and yields current-version events in order. `src` is either a transaction, a store, or a fresh reader (the same function serves the backbone, `view.ts` and `inspect.ts`). `readRun(src, feature)` uses the run index. `Inspection.outbox` and `WalkView.history` keep their r14 shape as a **compat view** of the events (`type`, `subject`, `at`, `actor`, `cause`, `data`, `seq`) so r13/r14 tests and the oracle read the same fields; tests that assert on `data.note` are updated to the reference.

## R14 — Proof: extend the kill harness, add a stream oracle

**Decision.** Reuse r13/r14's kill harness (SIGKILL at named points, a fresh reader as judge). New oracle invariants: **E1** sequence numbers 1…N gap-free and chunk contents consistent with `head`; **E2** every event valid against the catalog at its version; **E3** no event without actor and cause; **E4** every run's events reduce to the same factory-log bytes as the live file; **E5** cursors never ahead of `head`, a consumer's effect equals a fresh fold; **E6** archive: file exists once ⇔ `feature.archived` once ⇔ tombstones (or none yet), checksum matches. New kill points (declared in `KILL_POINTS` and used in source): `record.append-after-write`, `backbone.*` (4), `archive.*` (4). Proof files are `*.proof.test.ts`; a 10-test smoke runs in every `npm test`. The weakened variants to be caught: a writer that skips validation; a consumer that advances its cursor before applying; a projection that reads the clock; an archive that compacts before verifying.

## R15 — Measurements (CORE-7) — reported, not thresholded

**Decision.** `kiln/tests/measure/record.ts` (run on demand, results written to `baseline.md`): bytes per event and per full interface walk; append latency at 10³ / 10⁴ / 10⁵ events on chunked storage (against the single-document figures above); factory-log rebuild time from sequence 1 for a generated 10⁵-event record (a "year": 12 gates × 30 features/week × 52 weeks ≈ 20 000 gate events plus unit/lane/command events ≈ 10⁵ — the method is stated with the numbers); overhead of the record on the r14 in-process walk (r14: 12 gates, 0.2 s; budget 3 s kept). Archive size and the store's size before/after.

## R16 — The scripted decider and the identity gap

**Decision.** Unchanged and stated: nothing distinguishes a person from a program as the decider of a move. r15 records the `actor` the move named and no more; the identity row (r19/r20) decides. The validator's `^human@` is a format, not authentication.
