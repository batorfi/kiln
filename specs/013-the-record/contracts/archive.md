# Contract: the feature archive (FR-060…FR-064, CORE-7)

## 1. When

The row's **terminal commit** (the commit that records `walk.completed`, `walk.left-lane` or `walk.not-admitted` and ends the row) also creates one `kiln.archive` task for the feature, owned by the factory. Creating it is part of that commit, so a walk that ended always has its archive task, and an archive task exists only for a walk that ended. The end of the walk is never delayed or failed by archiving (FR-064): the task runs afterwards, on its own.

## 2. The task (`kiln.archive`)

| Phase | Does | Kill point after |
|---|---|---|
| `export` | reads the feature's documents, tasks, run events and referenced texts through the store; writes `<store>/archive/<feature>-<sha8>.kiln-archive` as canonical JSON lines (data-model §7) to a temporary file, `fsync`s, renames | `archive.export-written` |
| `verify` | re-reads the file, recomputes the SHA-256, compares with the export's; also checks the counts against the header | `archive.verified` |
| `commit` | **one commit**: appends `feature.archived {archive, sha256, bytes, counts}` (actor `system`, causation = the event that ended the walk), overwrites the tombstones (research R12), writes `kiln.archive/<feature>`, ends the task | `archive.commit-after-write` (mid-commit), `archive.committed` |

- Idempotent: the export is a pure function of the stored state, so a repeat writes identical bytes; the commit refuses to run twice (`kiln.archive/<feature>` present → the task just ends).
- A mismatch in `verify`, or an I/O failure, **throws**: the task is retried on restart and a report names it (`archive-checksum-mismatch`, `archive-io`). **Nothing is compacted before `verify` has passed.**
- The archive file is beside the store, never inside a git working tree the store sits in (the path is under the store directory, which `kiln` never adds to git).

## 3. What remains in the live store (FR-061, FR-062)

All events of the feature (the record is never archived). The tombstones of research R12: `kiln.brief` (digest + archive id), `kiln.move` (decider, kind, digest), `kiln.walk` (admittedBy, status, the **move keys** with a digest each), `kiln.gate` and `kiln.command` whole. Terminal tasks stay (their size is measured).

Consequences that are tested:
- a repeat of any command or move key of an archived feature is judged against the tombstones and the ledger exactly as before (`repeat` / `key-conflict` / `stale`), never as new;
- `feature admit` of the archived feature's name is refused (the `admittedBy` marker);
- `feature state` and `kiln record show --run` answer from the record unchanged.

## 4. Reading an archive

`kiln record archive-show --archive <file> [--verify]` (offline): prints the header, verifies the checksum, and prints documents, tasks, events or texts (`--kind`). It never re-hydrates the live store.
