# How the record works

> **Type:** explainer — for understanding, not a specification. **Audience:** engineers who will build on, review or debug
> KILN's event stream. **Status:** describes what row r15 built (branch `013-the-record`). Where this page and the contracts
> differ, the contracts govern: [event catalog](../../../specs/013-the-record/contracts/event-catalog.md) ·
> [backbone and projection](../../../specs/013-the-record/contracts/backbone-and-projection.md) ·
> [archive](../../../specs/013-the-record/contracts/archive.md) · [`kiln check record`](../../../specs/013-the-record/contracts/check-record.md).
> The design as built, on one page: [overview](../../../specs/013-the-record/overview.md).
>
> Companions: [the record store](./the-record-store.md) (where it lives on disk) · [architecture explainer](./kiln-architecture.md) · [`kiln-v1`](./kiln-v1.md) · [the durable package](../../../kiln/packages/durable/README.md)

## Contents

1. [The idea in one paragraph](#1-the-idea-in-one-paragraph)
2. [A worked example: one decision, from move to file](#2-a-worked-example-one-decision-from-move-to-file)
3. [What an event is](#3-what-an-event-is)
4. [The catalog: what may be said](#4-the-catalog-what-may-be-said)
5. [Writing: the event and the state change are one commit](#5-writing-the-event-and-the-state-change-are-one-commit)
6. [Storing and reading](#6-storing-and-reading)
7. [Events that change shape: upcasting](#7-events-that-change-shape-upcasting)
8. [The backbone: how anything follows the record](#8-the-backbone-how-anything-follows-the-record)
9. [The factory-log is a projection](#9-the-factory-log-is-a-projection)
10. [The first program's walks, replayed](#10-the-first-programs-walks-replayed)
11. [Archive: leaving the live store without leaving the record](#11-archive-leaving-the-live-store-without-leaving-the-record)
12. [How we know it is right](#12-how-we-know-it-is-right)
13. [What it costs](#13-what-it-costs)
14. [What it does not do](#14-what-it-does-not-do)
15. [Questions engineers usually ask](#15-questions-engineers-usually-ask)
16. [Where to look in the code](#16-where-to-look-in-the-code)

---

## 1. The idea in one paragraph

Every time the factory changes anything that matters — a gate opens, a person decides, a unit of work finishes, a lane
swaps its model, a feature ends — it writes an **event** *in the same database commit as the change itself*. The events
form one ordered, gap-free, permanent stream per factory: **the record**. Everything else that describes what happened —
the first program's `factory-log` files, a feature's archive, later the screens and the metrics — is a **projection**: a
view computed from the record, which can be thrown away and rebuilt, byte for byte. The record never holds a person's
words, a prompt, an answer, code or a secret; where a fact lives as text somewhere else in the store, the event carries a
**reference and a digest** instead.

```
  a state change ──▶ appendEvent(tx, draft) ──▶ checked against the catalog ──▶ stored (chunk, head, run index)
        │                    (inside the caller's commit — a fault throws and the whole commit rolls back)
        └───────────────────────────────────── after the commit resolves ──▶ wake-up ──▶ backbone
                                                                                           │
                    consumer A (effect and cursor in one commit)  ◀────────────────────────┤
                    consumer B (deliver, then cursor; idempotent) ◀────────────────────────┤
                    factory-log (rebuild a run's file from the record) ◀───────────────────┘
```

Three sentences to keep in mind for the rest of the page:

* **The state and its event are never apart.** Either both are stored or neither is.
* **The record is the source; everything else is a view.** If a view and the record disagree, the view is wrong.
* **The record holds facts and pointers, never text.** Text lives in one place and the record points at it.

---

## 2. A worked example: one decision, from move to file

A person approves gate 3 of the feature `search-filters`. Follow what happens.

**1. The move arrives.** `kiln gate move …` sends one request to the store's owner. The gate's *decision* task is
waiting for exactly this. Its step does **one database commit** containing:

* the **move record** (who decided, which kind of move, which command key, the digest of the note);
* the task's own terminal state;
* and the event **`move.committed`** — an `approve` decided by `ana@kiln`, caused by the command key `move-17`.

**2. A moment later, in its own commits, the rest follows — each change with its own event.**

| commit | state change | event appended in it |
|---|---|---|
| decision step | move record written | `move.committed` (seq 42) |
| the gate task's settle step | gate `waiting` → `settled` | `gate.settled` (seq 43) |
| the walk row, waking after the gate task ended | the next gate opened under a deterministic key (`walk:search-filters:open:gate4:1`) | `gate.opened` (seq 44) |

Every event is checked against the catalog **before its commit can complete**. If one is malformed — an unknown type, a
field the schema does not allow, the word `note` as a key — `appendEvent` throws `EventRejected`, that commit rolls back, and
its state change does not happen either. There is no way to have the move record without its event, or the event without the
move record. (The three commits are not one: a crash between them is repaired by the next owner reading the *stored* move
record and re-issuing the next step under the same key — that was r13/r14's design and r15 does not change it. What r15
guarantees is that each state change and its event are never apart.)

**3. Each commit resolves.** The caller of the move gets `committed`. The storage layer notices that the commit wrote an
event chunk and wakes the backbone — in memory, no timer.

**4. The factory-log consumer wakes.** It reads the events beyond its cursor (here 42–44), and rebuilds
`search-filters`' factory-log file *from the whole run* with a pure function, then replaces the file atomically. The file
is the first program's format, line for line.

**5. Later, a crash.** Suppose the process dies right after seq 44 is committed but before the file is rewritten. Nothing is
lost: the events are in the store, the consumer's cursor says "I have seen up to event 41", and at the next start the
backbone sees 42–44 beyond the cursor and runs the consumer again. The rebuilt file is identical to the one that would have
been written.

**6. Months later, the feature ends.** The commit that ends the walk also creates an *archive task*. The task writes a
checksummed file, re-reads it to verify, and only then compacts the live store (section 11).

---

## 3. What an event is

An event is a small JSON object in a **fixed envelope**. The envelope never changes shape (that is what makes it
future-proof); only `data` and `schema` vary by type.

```json
{
  "id":          "018f…-7…",          // UUIDv7-shaped, deterministic: made from the time and the sequence number only
  "seq":         43,                  // 1, 2, 3 … no gaps, ever
  "type":        "gate.settled",
  "schema":      "gate.settled/1",    // type + version
  "time":        "2026-10-28T09:14:03.512Z",
  "subject":     "gate:search-filters:gate3:1",
  "actor":       "ana@kiln",          // who: a person, script:…, task:…, factory, system, director, role:…, delegation:…
  "correlation": "run:search-filters", // which feature's run this belongs to (or null)
  "causation":   "cmd:move-17",       // what caused it: a command key, or an earlier event (evt:41)
  "trace":       null,                // reserved for telemetry; null until it exists
  "privacy":     "internal",
  "data":        { "key": "move-17", "move": "approve", "decidedBy": "ana@kiln" }
}
```

Things worth noticing:

* **`id` is deterministic.** Two replays of the same record produce the same ids, which is what lets a rebuilt view be
  byte-identical. There is no randomness in it.
* **`actor` has a grammar.** A person is `<name>@<token>`; the other forms are for programs. A delegated approval is
  `delegation:…` — a *different* event from a person's move, never disguised as one. A program may not pose as a person
  (the first program's validator refuses a walk "decided by" `script:r14`).
* **`causation` is required.** Every event says what made it. An `evt:n` cause must name an *earlier* event.
* **`data` holds facts and content pairs.** A content pair is `{ "ref": "move:<gate>#note", "digest": "<sha-256>" }`: where
  the text lives, and a fingerprint of what it said. Text itself is never in `data`.

---

## 4. The catalog: what may be said

The **catalog** (`packages/contracts/src/events/catalog/`) is the list of every event type, with a closed JSON schema each
(`additionalProperties: false` — an unexpected field is refused, which is also how content is kept out).

* **42 types in 11 groups:** gate, walk/row, mitigation, unit, lane, roadmap, delegation, command, feature, experience
  (charter and design system), system, and the record's own `record.unknown`.
* **24 are committed by code today.** The rest are **schema-only** — the experience, delegation, roadmap and system events
  whose behaviour belongs to later rows — or **legacy** types, which exist so that the first program's streams can be
  *represented* and are refused by `appendEvent` (`event-type-read-only`).
* **Forbidden everywhere in `data`:** the keys `prompt`, `answer`, `transcript`, `note`, `text`, `content`, `body`, `code`,
  and the first program's remote-endpoint keys. This is checked at commit time *and* by `kiln check record`.
* **Adding a type is a catalog change with a test.** Event types for later rows are not pre-declared.

The JSON schemas under `kiln/schemas/events/` are **generated** from the catalog; `kiln check record` fails if they drift.

---

## 5. Writing: the event and the state change are one commit

This is the **transactional outbox** pattern, with the outbox *being* the record.

`appendEvent(tx, draft)` takes the caller's open transaction, not its own. It:

1. refuses an unknown or read-only type, a wrong version, a forbidden key, data the schema does not allow, an actor outside
   the grammar, a missing or forward-pointing cause;
2. assigns the next sequence number **from the stored head** — never from memory;
3. writes the event into the current chunk, updates the head and the run's index.

Then the caller's commit goes through, or does not, as one unit. Consequences:

* **No state without its event, no event without its state** (oracle invariant E7 checks this after every kill).
* **Numbering is gap-free** even across crashes, because the number comes from the stored head inside the commit.
* **A rejected event is a rejected change.** A bug that emits a malformed event fails loudly in the test that triggers it,
  rather than silently corrupting the record.

The wake-up after the commit (`onAppended`) comes from the storage seam, and only for commits that actually wrote an event
chunk. A commit that rolled back wakes nobody.

---

## 6. Storing and reading

Events are kept in documents inside the same store, in three families:

| document | holds |
|---|---|
| `kiln.event/<n>` | a **chunk** of 256 events (`256n+1 … 256n+256`), complete envelopes |
| `kiln.record/head` | `next` (the next sequence number) and `legacyThrough` (see below) |
| `kiln.record/run:<feature>` | the sequence numbers belonging to one feature's run |

**Why chunks.** r13/r14 kept the whole outbox in *one* document, so every append rewrote everything and cost grew
linearly (0.11 ms → 0.89 ms across the measured range). Now an append rewrites the head, the *last* chunk and the run's
index: constant work. Measured at **0.18–0.25 ms from 10³ to 10⁵ events** (with runs of about 90 events — a single
100,000-event run grows to ~1.6 ms because the run index is O(run)).

**What happened to the old entries.** r13/r14 wrote their interim entries into `kiln.outbox/main`. r15 **never touches
them again** — verified byte for byte on real r14 stores. `legacyThrough` is the last sequence number that lives there; new
events continue after it. `readRecord` and `readRun` merge both and present *every* event at the catalog's current version.

**Reading.** `readRecord` (everything), `readRun` (one feature, via the run index), `headOf` (where the record ends).
`kiln record show|status|verify` is the command-line view.

---

## 7. Events that change shape: upcasting

Events are permanent, so their shape has to be allowed to change *without rewriting history*. The rule (**EVT-3a**):
**stored events are never edited; they are converted on read.**

* An entry with no `schema` is **version 0** (what r13/r14 wrote). A pure function — an **upcaster** — turns it into
  version 1: it adds the envelope (id from time and sequence, `schema`, `causation` from the old `cause`, `privacy` from the
  type), copies structured facts, **replaces any content by `{ref, digest}`**, and **drops rendered sentences**.
* Some old entries cannot be completed alone: a version-0 `gate.settled` is finished from its sibling `move.committed`, so
  upcasters receive a context with `siblings(seq, key)` and an injected `digest`.
* A **newer** version than the catalog knows fails by name — never a silent guess. An **unknown** interim type becomes
  `record.unknown` carrying only its name and a digest.
* Upcasters must be **pure** and **lossless**; `kiln check record` runs them over real events to prove both.

Reading code therefore only ever has to understand *the current version*. Old data is the upcaster's problem, in one place.

---

## 8. The backbone: how anything follows the record

Anything that reacts to events is a **consumer**, and the **backbone** runs them. Each consumer has:

* a **durable cursor** (`kiln.cursor/<name>`) — the last event it has fully handled;
* a **mode**:
  * **transactional** — `apply(tx, batch)`: the effect *and* the cursor advance are one commit, so the effect happens
    **exactly once**;
  * **effect** — `deliver(batch)`, then a cursor commit: **at least once**, so the consumer must be idempotent.

How a loop works: it waits on an in-memory signal (**no timer, no polling**), reads the events beyond its cursor, handles a
batch, advances the cursor, repeats. The signal is raised by the storage seam after a commit that wrote events.

Failure handling is deliberately plain:

* A consumer that **throws** stops *its own* loop, records `failed` in its cursor and shows up in `status()`; `retry`
  resumes it. It does not stop other consumers and does not hold up shutdown.
* A cursor **ahead of the record** (a restored older store) stops its consumer by name instead of silently skipping.
* A consumer whose **version** changed restarts from the beginning with a fresh cursor — that is how a projection is
  rebuilt after its logic changes.

**Lag** is `head − cursor`. `kiln record status` prints it per consumer.

---

## 9. The factory-log is a projection

The first program wrote a `factory-log` file per run. In the restart that file is no longer *written by the code that does
the work*; it is **computed from the record**.

* The computation is a **pure reducer** (`packages/record/src/projections/factory-log.ts`: `step`, `foldRun`). Same events
  in, same bytes out. It reads the time from the event, never the clock; it counts line numbers per file from 0; it knows
  the first program wrote the same gate three ways and reproduces the way the event says.
* A **declared table** (`contracts/src/events/factory-log-map.ts`) says which event type makes which log record. It is
  tested in both directions and against the reducer.
* The **live projection** is a consumer: when a run is touched, it rebuilds that run's *whole* file from the record and
  replaces it atomically (write to a temp file, `fsync`, rename — asynchronously; a synchronous `fsync` made a walk 14×
  slower).
* `kiln record rebuild-log` runs the *same reducer*, so a live file and a rebuilt file cannot differ. The oracle checks it
  after every kill (**E4**).

Why bother: the log is now disposable. If a format changes, delete and rebuild. If a file is damaged, rebuild. The record
is the only thing that has to be right.

---

## 10. The first program's walks, replayed

The first program (frozen under `legacy/`) produced real walks. r15 proves the new record can *represent* them:

* `spikes/015-capture-walks/capture.ts` runs the frozen walkers and copies the committed r7 files into
  `kiln/fixtures/walks/` as four files per walk: the **original** factory-log, the converted **events**, the **refs**
  (texts the events point at) and **meta**.
* Each stream **replays to its original bytes with its original verdict** — including the two deliberately broken streams,
  which still fail rule R3.
* **Three of the five named rows have an original** — r2, r3, r7 (five streams, 73 events). **r1 and r8 never produced a
  stream**; they are named in `MISSING.json` with the reason, and `kiln check record` prints
  `3 of 5 named rows replayed … missing: r1, r8`. It fails if a named row is neither replayed nor explained.

---

## 11. Archive: leaving the live store without leaving the record

A finished feature should not stay in the live store forever, but its history must stay verifiable. **CORE-7.**

When a walk ends, the *same commit* creates a `kiln.archive` task. It runs three phases:

1. **Export.** The feature's documents, its tasks, its run's events (a *copy* — the record keeps the originals) and every
   text its events point at are written into one canonical file, asynchronously (temp file, rename), named with the first 8
   hex digits of its SHA-256.
2. **Verify.** The file is re-read and its checksum recomputed.
3. **Commit.** Only now, in one commit: `feature.archived` (file name, checksum, size, counts), the **tombstones**, and the
   marker `kiln.archive/<feature>`.

Properties:

* **Nothing is compacted before the file verifies.** A weakened archive that did so is one of the oracle's test cases.
* **Idempotent and retryable.** The export is a pure function of the stored state, so a repeat writes identical bytes. A
  failure is recorded by name and retried at the next start (`ensureArchives`) — which is also how a walk that ended under
  r14 gets its archive.
* **Keys are kept.** A command key lives as long as the thing it created. The marker keeps a feature's move keys, so a
  repeated move is still judged `repeat`, `key-conflict` or `stale` — never "new" — and the feature name cannot be admitted
  again.
* **"Compacted" is modest.** The pinned library cannot delete a document or a task. So briefs become `{archived: true}`, a
  move's note text is gone and its digest stays, terminal tasks stay. This was measured and is stated as a limit, not hidden.

`kiln record archive-show` verifies a file against the checksum, size and counts that the record's `feature.archived`
event names (`FAIL archive-checksum-mismatch` exits 1; a missing file exits 3).

---

## 12. How we know it is right

Three layers of evidence, from cheap to expensive.

**`kiln check record`** — the fifth check, never vacuous. It examines the catalog (closed schemas, no forbidden key,
upcasters present and, over real events, pure and lossless), the source against the catalog (every committed type is
catalogued and vice versa), the generated schemas, and the committed walks' replay. It has **25 negative members across 20
codes**: broken inputs that must each be refused with their own code, so the check is proven able to fail.

**The record oracle** — seven invariants, judged by a *fresh reader* after every kill:

| | statement |
|---|---|
| E1 | sequence numbers 1…N: no gap, no repeat; head is N+1; each chunk holds exactly its range |
| E2 | every event validates against the schema it names |
| E3 | every event has an actor in the grammar and a cause |
| E4 | every run's factory-log equals a fresh fold of its events — in the document *and* on disk |
| E5 | every cursor ≤ head; a transactional consumer's documents equal a fresh fold |
| E6 | an archive file is present ⇔ it verifies against its event; `feature.archived` appears once; tombstones ⇔ the event |
| E7 | each piece of state has exactly its one event, and no such event lacks its state |

They run after every kill point of the r13/r14 matrix and after **300 random kills** across the walk, the record, the
backbone and the archive — the process is killed with `SIGKILL` at named steps and at random instants, then a new process
looks. New kill points: `record.append-after-write`, four `backbone.*`, four `archive.*`.

**Sabotage.** Twelve deliberate bugs in the code are each caught by a named test (mutation checks), and five *weakened
implementations* (a writer without validation, a writer that numbers from memory, a consumer that acknowledges early, a
projection that reads the clock or numbers across runs, an archive that compacts before verifying) are each caught by the
oracle. A suite that cannot fail proves nothing; these show this one can.

---

## 13. What it costs

All numbers are on one macOS machine; they are reports, not thresholds (see `specs/013-the-record/baseline.md`).

| thing | measure |
|---|---|
| Append, chunked | 0.18–0.25 ms from 10³ to 10⁵ events (single-document outbox: 0.11 → 0.89 ms, linear) |
| One full interface walk | 94 events, 34,340 bytes (~365 B/event) |
| A generated year of activity | 100,010 events, 40 MB; read 115 ms; fold 105 ms; live catch-up 8.2 s writing 1,370 files |
| One feature's archive | 62,238 bytes |
| The r14 in-process walk | 25 ms → 36 ms with the record (budget 3 s) |

---

## 14. What it does not do

* **No telemetry yet.** `trace` is present and `null`.
* **Most experience, delegation, roadmap and system events are schema only.** Their behaviour belongs to later rows.
* **No real deletion.** The pinned durable library cannot delete a document or a task, so an archive tombstones; it does not
  free the space those documents held. Raised for the dependency record.
* **r1 and r8 are not replayed**, because they never produced a stream to replay.
* **No power-loss claim.** Like r13/r14, the covered failure is abrupt process death, not loss of host power.
* **The record is not a place for text.** Anything that needs prose reads it from where it lives, through a ref.
* **No remote anything.** The record is local, like the rest of the factory.

---

## 15. Questions engineers usually ask

**Why not keep appending to the old single outbox document?**
Every append rewrote the whole document, so the cost grew with the record. Chunks make it constant, and `legacyThrough`
keeps the old entries exactly where they were.

**Why must an event never contain text?**
Because the record is permanent and widely read. A person's note, a prompt or a secret in it could never be removed. The ref
and digest let a reader *check* text without the record holding it, and let the text be archived or aged out on its own
schedule.

**Why is the id deterministic and not random?**
So a projection rebuilt from the record is byte-identical to the live one, and so a replay of the same events gives the same
ids. Uniqueness comes from the sequence number.

**Can a consumer miss an event?**
No: the cursor is durable, and the backbone re-reads from it on every wake-up and at start. A consumer can *see an event
twice* if it is an effect consumer and died between delivering and advancing — which is why effect consumers are
idempotent.

**What if the process dies after the commit but before the wake-up?**
The wake-up is only an optimisation. At the next start every consumer compares its cursor with the head and catches up.

**What if I change how the factory-log is computed?**
Bump the consumer's version; its cursor restarts from the beginning and every file is rebuilt from the record. Or run
`kiln record rebuild-log`.

**How do I add an event type?**
In the catalog: add a closed schema, say whether it is committed, its privacy class, (if it replaces an interim shape) the
upcaster, and the entry in the factory-log map if the first program had a matching record. `kiln check record` and the
catalog tests tell you what you forgot. Then emit it with `appendEvent` from inside the commit that changes the state.

**How do I add a consumer?**
Give it a name, a version and a mode, and pass it in the factory's `consumers` option. Choose *transactional* if its effect
is a write to the store (exactly once), *effect* if it touches the outside (idempotent, at least once).

**How do I change an existing event's shape?**
Add a new version to its catalog entry and an upcaster from the previous one; never edit the old version. Old stored events
keep reading through the upcaster.

**Is the record the same as the factory-log?**
No. The record is the source. The factory-log is one of the views built from it, kept in the first program's format so the
first program's validators still accept it.

---

## 16. Where to look in the code

```text
contracts/src/events/          envelope · id · grammar · upcast · factory-log-map · catalog/{gate,walk,unit,lane,command,feature,…}
record/src/                    events/validate · projections/factory-log (the pure reducer) · legacy-convert · replay
durable/src/record/            append · read · refs · runs · backbone · cursors · consumer · consumers/factory-log
                               archive · archive-task · tools
durable/src/library/           tasks.ts, open.ts — the seam: transaction hooks and the post-commit wake-up
checks/record.ts               kiln check record                     cli/src/record-commands.ts   kiln record …
fixtures/walks/                the captured streams                  schemas/events/              generated schemas
```

Commands: `kiln record show | status | verify | rebuild-log | archive-show`, and `kiln check record`.
