# The record store: where the record lives and how it is kept

> **Type:** explainer — for understanding, not a specification. **Audience:** engineers who debug a store, restore one,
> write a consumer or a tool that reads it, or change the storage. **Status:** describes what row r15 built (branch
> `013-the-record`). This page is about *storage*; for the idea, the catalog and the consumers read
> [how the record works](./the-record.md) first. Where this page and the code differ, the code governs.
>
> Companions: [how the record works](./the-record.md) · [the durable package](../../../kiln/packages/durable/README.md) ·
> [design as built](../../../specs/013-the-record/overview.md) · [data model](../../../specs/013-the-record/data-model.md)

## Contents

1. [The store in one picture](#1-the-store-in-one-picture)
2. [What the database gives us, and what it does not](#2-what-the-database-gives-us-and-what-it-does-not)
3. [The document families](#3-the-document-families)
4. [The event chunks, in numbers](#4-the-event-chunks-in-numbers)
5. [The head and the run index](#5-the-head-and-the-run-index)
6. [The old outbox, left where it was](#6-the-old-outbox-left-where-it-was)
7. [Reading: how a sequence number becomes an event](#7-reading-how-a-sequence-number-becomes-an-event)
8. [Cursors and projection files](#8-cursors-and-projection-files)
9. [The archive file](#9-the-archive-file)
10. [What a crash leaves behind](#10-what-a-crash-leaves-behind)
11. [Source of truth and everything derived](#11-source-of-truth-and-everything-derived)
12. [Inspecting, backing up, restoring](#12-inspecting-backing-up-restoring)
13. [Limits, stated](#13-limits-stated)
14. [Questions engineers usually ask](#14-questions-engineers-usually-ask)

---

## 1. The store in one picture

A factory's store is **a directory**. Its heart is one SQLite file, written by one process at a time; around it sit a few
files that can all be rebuilt or verified from it.

```
<store>/
├── factory.sqlite              THE source of truth: documents + tasks (the durable library's file)
│     ├─ kiln.event/<n>         the record, in chunks of 256 events
│     ├─ kiln.record/head       where the record ends
│     ├─ kiln.record/run:<f>    which events belong to feature <f>'s run
│     ├─ kiln.outbox/main       what r13/r14 wrote — read, never written again
│     ├─ kiln.cursor/<name>     how far each consumer has read
│     ├─ kiln.archive/<f>       the marker an archived feature leaves
│     └─ …                      gates, briefs, moves, walks, commands (the state the events describe)
├── projections/
│     └─ factory-log/<f>.jsonl  the first program's log, computed from the record      (derived)
├── archive/
│     └─ <f>-<8 hex>.kiln-archive   a finished feature, checksummed                    (verified copy)
└── (owner lock and socket: who owns this store now — not part of the record)
```

Two properties organise everything below:

* **The state and its events share a database, and so a transaction.** That is the whole reason the record can promise "no
  change without its event".
* **Files are never the truth.** The factory-log is recomputed; the archive is checked against the checksum the record
  holds. Lose the files and nothing is lost; lose the database and the files are only a partial copy.

---

## 2. What the database gives us, and what it does not

KILN does not talk SQL. It talks to a durable library (Pi Durable, pinned) through *one* directory, `src/library/`, that
exposes **documents** (named JSON objects with a key) and **tasks** (resumable steps with a checkpoint). SQLite is inside
the library.

What matters for the record:

| fact | consequence |
|---|---|
| Every library transaction is `BEGIN IMMEDIATE` — **one writer at a time**. | The record is single-writer by construction: sequence numbers cannot race. The *owner* process is the only writer anyway (one owner per store). |
| A commit is atomic. | A chunk, the head, a run index and the state they describe become visible together or not at all. |
| `tx.doc(name, key, seed)` returns a draft you mutate; the library writes it at commit. | `appendEvent` pushes onto a chunk and bumps the head; nothing is stored until the caller's commit completes. |
| A document is read and written **whole**. | Writing an event rewrites its chunk. This is why chunks are bounded (section 4). |
| **No delete** for documents or tasks (in the pinned version). | An archive cannot free documents; it can only overwrite them with smaller ones (section 9). |
| A task step that throws ends the task **failed, for good**. | Anything that must be retried (the archive) catches its own failure and records it. |
| A task cannot read after its first table write (`tx.task()`). | Writers read what they need *before* writing; creators pass the correlation explicitly. |

One more thing the database does *not* give on every Node: **a wait for a lock.** Node 23.6.0 ignores the `timeout`
option of `DatabaseSync` (busy timeout stays 0), so a second connection that met the owner mid-commit failed at once with
"database is locked". The seam (`library/open.ts`) therefore sets `PRAGMA busy_timeout = 5000` on the owner's connection
and on every reader's, and `tests/busy-timeout.test.ts` checks it on whatever Node runs the suite.

**Readers.** Tools such as `kiln record show` and the proofs' judges open the store *without* being its owner
(`openReader`): read-only snapshots of documents and tasks, never a write. They are what lets a test look at a store "as a
crash left it".

---

## 3. The document families

`DocName` in `src/store.ts` is the closed list of document families. Those the record uses:

| family | key | holds | written by |
|---|---|---|---|
| `kiln.event` | chunk number `n` | `{ events: Event[] }` — complete envelopes, in sequence order | `appendEvent`, inside the caller's commit |
| `kiln.record` | `head` | `{ next, legacyThrough }` | `appendEvent` |
| `kiln.record` | `run:<feature>` | `{ seqs: number[] }` — sequence numbers of that run | `appendEvent`, when the event has a correlation |
| `kiln.outbox` | `main` | `{ next, entries: Entry0[] }` — r13/r14's version 0 entries | **nobody, from r15 on** |
| `kiln.cursor` | consumer name | `{ seq, version, failed? }` | the backbone |
| `kiln.archive` | `<feature>` | `{ status, archive, sha256, bytes, counts, keys, … }` | the archive task's commit |
| `kiln.projection` | — | *declared and reserved; nothing writes it.* The data model planned the factory-log's lines in a document; the built consumer folds the run each time and writes only the file. | — |

The state the events describe lives in the older families: `kiln.gate`, `kiln.brief`, `kiln.move`, `kiln.walk`,
`kiln.command`, `kiln.lane`, `kiln.store`. The record does not replace them: **a gate is still a gate document**; the
record says that it opened, who settled it and when.

---

## 4. The event chunks, in numbers

Event `seq` lives in chunk **`floor((seq − 1) / 256)`**, key as a string.

```
chunk "0"   events   1 … 256
chunk "1"   events 257 … 512
chunk "2"   events 513 … 768
…
```

An append reads the last chunk, pushes one event, and the commit writes the chunk back. So an append costs the size of **one
chunk**, never the size of the record:

* a full chunk holds 256 events; at the measured ~365 bytes per event that is about **93 KB** (an estimate from the average,
  not a measurement of one chunk);
* the old single document grew with every event — 0.11 ms at 10³ events to 0.89 ms at 10⁵ — while a chunked append
  measured **0.18–0.25 ms across the same range**.

Chunks are *complete* once the 257th event arrives: after that the chunk is never written again (an event, once stored, is
never edited), so old chunks are cold data.

---

## 5. The head and the run index

**The head** (`kiln.record/head`) is two numbers:

* `next` — the sequence number the next event will get. The record has events `1 … next−1`.
* `legacyThrough` — the last sequence number held in the old outbox (0 for a store that never had one).

Numbering always comes from the stored head, *inside* the commit, never from memory. That is what keeps the numbers
gap-free across crashes, and why a writer that numbered from memory is one of the weakened implementations the oracle must
catch.

**The run index** (`kiln.record/run:<feature>`) is a list of the sequence numbers that belong to one feature's run.
`readRun` uses it to fetch one feature's events without scanning the record. Its cost is honest: the list is rewritten on
each append to that run, so it is *O(length of the run)*. A full interface walk is 94 events; one generated 100,000-event
run measured ~1.6 ms per append instead of 0.2 ms. No real feature gets near that.

Events with no feature (lane events not owned by a row, the factory's own) have `correlation: null` and no index entry; they
are reachable through `readRecord` only.

---

## 6. The old outbox, left where it was

r13/r14 wrote their interim entries into one document, `kiln.outbox/main`: `{ next, entries[] }`, entry *k* at position
*k−1*. r15 does not migrate it:

* On the **first append under the new owner**, the writer reads `kiln.outbox/main`, sets `legacyThrough = next − 1` and
  `next = next`, and from then on appends to chunks. The old document is never written again — checked byte for byte on
  real r14 stores (`fixtures/stores/`).
* The chunk numbering does not shift. If `legacyThrough` is 40, event 41 is the first event in **chunk 0**, at position 0;
  chunk 0 therefore holds events 41–256 and chunk 1 starts at 257 as always. The reader's rule is
  `first = max(256n + 1, legacyThrough + 1)`.
* Old entries are **version 0**: no `schema`, `at` in milliseconds, `cause` instead of `causation`, sentences and notes in
  the data. They are upcast on read (see [how the record works §7](./the-record.md#7-events-that-change-shape-upcasting)).
  The store keeps the original bytes; only the reader sees version 1.

---

## 7. Reading: how a sequence number becomes an event

`readRecord(src, {from, to})` (in `src/record/read.ts`) is the one reader; the backbone, the walk's view, `kiln record show`
and the archive all use it.

```
headOf(src)                     → { next, legacyThrough }
for seq in from … to:
    seq ≤ legacyThrough ?  entry = kiln.outbox/main.entries[seq − 1]  →  upcastEntry(entry)
                        :  chunk = kiln.event/<floor((seq−1)/256)>    →  upcastStored(chunk.events[seq − first])
    yield the event at the catalog's current version
```

Details that matter when debugging:

* **A source of documents, not a database handle.** `src` is anything with `get(name, key)`: an open store, or a fresh
  reader with no owner. The same code reads a live store and a crashed one.
* **Chunks are fetched once per run of events**, not once per event.
* **Version 0 entries need their neighbours.** A `gate.settled` is completed from its sibling `move.committed`; the reader
  keeps a window of the previous 512 events for that, and starts that far back when you ask for a range inside the old part.
* **A missing event is an error, never a gap.** If the head says an event exists and the chunk does not hold it, the reader
  throws `record-corrupt: chunk n has no event s`. Likewise, an index naming a sequence number its chunk lacks. The oracle's
  E1 and the `verify` command exist to find exactly that.
* **`readRun`** reads the old part by scanning (version 0 entries have no index), then the indexed chunks.
* **Nothing here writes.** Reading a store never changes it.

---

## 8. Cursors and projection files

**A cursor** (`kiln.cursor/<name>`) is `{ seq, version, failed? }`: the last event that consumer has fully handled. It lives
in the same database, so a transactional consumer can advance it *in the same commit* as its effect, which is what makes
"exactly once" true for it. An effect consumer delivers first and advances after, and is therefore idempotent.

Three situations a reader of a store should recognise:

| cursor says | meaning |
|---|---|
| `seq = head.next − 1` | caught up |
| `seq < head.next − 1` | lagging — normal for a moment after a commit; the backbone catches it up at the next wake-up or start |
| `failed: { seq, error }` | the consumer threw at that event and stopped itself; `retry` resumes it |
| `seq > head.next − 1`, `error: cursor-ahead-of-head` | a *restored older store*: the consumer refuses to skip forward and stops by name |

**The factory-log** is not in the database. The consumer rebuilds a run's *whole* file from `readRun` and replaces
`projections/factory-log/<feature>.jsonl` atomically: write a temp file, `fsync`, rename — asynchronously, because a
synchronous `fsync` in the commit's tick made a walk 14× slower (25 → 347 ms). A reader of that directory therefore sees the
old file or the new file, never a half-written one.

---

## 9. The archive file

When a walk ends, a `kiln.archive` task writes `archive/<feature>-<first 8 hex of the checksum>.kiln-archive` — **one file
of canonical JSON lines**, in a fixed order, so the same state always gives the same bytes:

```
{"kind":"header","format":1,"feature":"…","headSeq":…,"docs":…,"tasks":…,"events":…,"texts":…}
{"kind":"doc","name":"kiln.walk","key":"…","value":{…}}            ← documents, sorted by (name, key)
{"kind":"doc","name":"kiln.gate", …}  {"kind":"doc","name":"kiln.brief", …}  {"kind":"doc","name":"kiln.move", …}
{"kind":"doc","name":"kiln.command", …}                              ← the feature's command-ledger entries
{"kind":"task","id":…,"taskKind":…,"owner":…,"status":…,"input":…,"checkpoint":…,"outcome":…}   ← by id
{"kind":"event","event":{…}}                                         ← the run's events, a COPY, by seq
{"kind":"text","ref":"…","digest":"…","text":"…"}                    ← every text an event's *Ref names, by ref
```

The record also holds the file's name, SHA-256 and size (`feature.archived`) and the marker `kiln.archive/<feature>` holds
the same plus the **move keys** the archive carries. Three consequences:

* **Verification is mechanical.** Re-read the file, hash it, compare with the event: that is `verify` before anything is
  compacted and `kiln record archive-show --verify yes` afterwards.
* **The archive is where the text goes.** Notes and reasoning are in the live store only until the archive verifies; after
  that their text is in the file, and the live store keeps only the digest and the ref. `resolveRef` falls back to the
  archive for an archived feature.
* **The live store shrinks only in the text, not in the number of documents.** The library cannot delete, so after the
  verified archive the commit overwrites briefs with `{archived: true}` and drops a move's note text (keeping the digest).
  Gate, move and walk documents, terminal tasks and every event stay. The keys stay too: a repeated move is judged by the
  note's digest (`repeat` / `key-conflict` / `stale`, never new), and the feature name cannot be admitted again.

---

## 10. What a crash leaves behind

The abrupt death of the owner process (SIGKILL, a crash, an out-of-memory kill) is the covered failure — at every named step
and at 300 random instants. What each storage layer shows afterwards:

| the process dies… | the store shows | what repairs it |
|---|---|---|
| mid-commit, event and state written but not committed | **neither** — the commit is atomic | nothing to repair; the caller retries the same key |
| after the commit, before consumers ran | events beyond every cursor | the backbone catches up at start |
| after a consumer delivered, before its cursor advanced (effect consumer) | cursor behind the effect | the batch is delivered again; the consumer is idempotent |
| after a projection file's temp write, before the rename | the old file plus a stray `*.tmp-<pid>` | the next rebuild replaces the file; the temp name is per-process |
| after the archive file was written, before it was recorded | an `archive/` file nothing refers to | the task re-exports the same content: same bytes, same name |
| after the archive verified, before the compacting commit | file and live store both whole | the task resumes at its `commit` phase |
| mid-archive commit | **neither** `feature.archived` nor the tombstones, or both | atomic |

What is **not** covered: loss of host power or a kernel crash. The most recent commits may be missing afterwards; none is
ever half-applied, and a move acknowledged moments before may need to be retried under the same key.

---

## 11. Source of truth and everything derived

| thing | status | if lost |
|---|---|---|
| `factory.sqlite` (documents + tasks) | **truth** | everything not in an archive is gone — back it up as a unit |
| `kiln.event/*`, `kiln.record/*` | truth (the record) | not rebuildable from anything else |
| `kiln.outbox/main` | truth (the old part of the record) | same |
| `kiln.cursor/*` | derived bookkeeping | consumers restart from the beginning of their `from` and re-derive |
| `projections/factory-log/*.jsonl` | **derived** | `kiln record rebuild-log --run <feature>` recomputes a run's file, byte-identically |
| `archive/*.kiln-archive` | verified copy | a missing or damaged file is *reported* by `archive-show` (a missing file exits 3, a damaged one `archive-checksum-mismatch`); the record's events still hold the checksum and the live store still holds the digests |

The practical rule: **back up the whole store directory, or at least `factory.sqlite` and `archive/`.** Never restore
`factory.sqlite` from one moment and `archive/` from another without `kiln record verify` and `archive-show --verify yes` afterwards.

---

## 12. Inspecting, backing up, restoring

Every command takes `--store <dir>` and reads through a fresh reader — never as an owner, so it is safe beside a running
factory.

| to… | do |
|---|---|
| see the record | `kiln record show --store <dir> [--run <feature>] [--from <seq>] [--to <seq>]` — one JSON event per line |
| see how far consumers are | `kiln record status --store <dir>` — head, and cursor, lag and failure per consumer |
| prove the record is whole | `kiln record verify --store <dir> [--run <feature>]` — gap-free, valid, up to the head (`PASS record — examined: N events …`) |
| rebuild a factory-log | `kiln record rebuild-log --store <dir> --run <feature>` (same reducer as the live consumer) |
| check an archive | `kiln record archive-show --store <dir> --archive <file-name> [--verify yes]` |
| check the repository's own guarantees | `kiln check record` (catalog, upcasters, schemas, replay of the committed walks) |

Exit codes: 0 answered · 1 a verification failed (or examined nothing) · 2 usage · 3 the store cannot be read.

**Restoring an older copy** is safe in one specific way: a consumer whose cursor is *ahead* of the restored head stops by
name (`cursor-ahead-of-head`) instead of silently skipping events it has never seen. Fix by resetting that consumer's cursor
(a version bump does it) and letting it catch up; the factory-log is simply rebuilt.

**Moving a store to a machine with a different Node** is fine within the supported range (`^22.19.0 || >=23.6.0`); the
database file is the same, only the connection's busy-timeout setup differs, and the seam sets it explicitly.

---

## 13. Limits, stated

* **No deletion.** Documents and tasks stay; archive compaction is an overwrite with smaller content. If the library gains a
  delete, the archive task is where it would be used — raised for the dependency record.
* **A run's index is O(run).** Fine at the measured scale (runs of ~90 events); a different shape of work would want a
  chunked index.
* **An append rewrites a chunk of up to 256 events.** Bounded and measured, but not free; the chunk size is a constant
  (`CHUNK` in `append.ts`) that, once stored events exist, can never change without a migration.
* **One writer.** The record has a single sequence by design; a second writer is refused by the owner lock, not merged.
* **`kiln.projection` is reserved and empty.** Left in the closed list of names so that a later projection that wants a
  document does not need a store-contract change.
* **Local only.** Nothing here is replicated or shipped anywhere.

---

## 14. Questions engineers usually ask

**Why not one table of events with an index?**
The library offers documents and tasks, not tables, and KILN reaches it through one narrow seam so that the library can be
replaced. Chunked documents give constant-cost appends and atomic commits with the state using only what the seam exposes.

**Why chunks of 256?**
Large enough that chunk fetches are rare when reading a long run, small enough that the rewrite per append stays a few tens of
kilobytes. The number is a constant; the *shape* (chunks plus a head) is the decision.

**What if the head and the chunks disagree?**
That is corruption, and it is reported by name: `record-corrupt` from the reader, and `kiln record verify` and the oracle's E1
find it. The writer never repairs by guessing.

**Can I read the record while the factory is running?**
Yes. A reader opens its own connection and sees a consistent snapshot; with the busy timeout it waits for a lock rather than
failing. It sees events up to the last commit, so a consumer may be a moment behind it.

**Why is the archive a file beside the store and not another document?**
The point of archiving is to take bulk out of the live database while keeping it verifiable. A file with a checksum can be
copied, stored elsewhere and checked without opening the store. It never goes into git.

**Why are old entries not migrated into chunks?**
Moving them would rewrite history r13/r14 wrote and make "unchanged byte for byte" impossible to test. Reading them through
an upcaster keeps both: history is untouched, readers see one shape.

**If the factory-log is derived, why keep a file at all?**
Because the first program's validators read files, and the restart keeps them as a check on itself. The file is a *view*
of the record, with the guarantee that it equals a rebuild.

**Where do I add a new family of documents?**
In `DocName` and `DOC_NAMES` in `src/store.ts`, with a test that keeps them in step with the source. If it is state the
events describe, also say which event records each change to it — the oracle's E7 will otherwise find the gap.
