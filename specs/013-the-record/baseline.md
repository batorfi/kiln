# Baseline: The record (row r15)

Readings, before and after. Node v25.9.0, npm 11.14.1, macOS (Darwin 25.6.0). Newest section last.

## 1. "Before" (T001) — 2026-10-28, branch `013-the-record` at `b5deab7` (r14 merged, no r15 source)

| Reading | Value |
|---|---|
| `npm test` | exit 0 · `new: 648 tests · legacy: 500 tests (30 skipped)` · **108 s** |
| `npm run proof` | exit 0 · 92 tests, 92 pass · **260 s** (r14 recorded 233–276 s; this run overlapped other work, so read it as an upper bound) |
| `npm run check` | exit 0 · four `PASS`: network (88 files) · boundaries (88) · legacy (168) · flow (1) |
| `git rev-parse HEAD:legacy` | `20a82c7e214be256c804f6e8f1cd4cce9c8e9874` |
| `shasum -a 256 specs/ROADMAP.md` | `2fd48236de6caed7…` (first 16 hex) |

## 2. The single-document outbox (T004) — the "before" half of SC-009

`node tests/measure/outbox-baseline.ts`: one document `kiln.outbox/main` holding every entry; each append rewrites it.

| Entries | Average append over the last batch | One more append | Store bytes (db + wal) |
|---|---|---|---|
| 101 | 0.106 ms | 0.144 ms | 2.6 MB |
| 1 001 | 0.207 ms | 0.283 ms | 4.4 MB |
| 5 001 | 0.888 ms | 1.294 ms | 5.2 MB |

Growth is linear in the length of the record (this is what the chunked layout of research R2 removes). Same machine and Node as above.

## 3. Foundation checkpoint (T020) — the record exists and r13/r14 run on it

After T006–T019 (event type and id, grammar, catalog for the 21 types r13/r14 emit, `validateEvent`, `appendEvent` with chunked storage, `readRecord`/`readRun`, the version 0 upcasters, the twelve call sites switched, `inspect` and the walk view reading the record):

| Reading | Value |
|---|---|
| `npm test` | exit 0 · `new: 689 tests · legacy: 500 tests (30 skipped)` (648 before + 41 new) |
| `npm run proof` | exit 0 · 92 tests, 92 pass · 265 s |
| `npm run check` | exit 0 · four `PASS` (network 89 files · boundaries 89 · legacy 168 · flow 1) |

The only existing assertions that changed are listed in `notes.md` §3.

## 4. US2 checkpoint (T027) — the catalog is complete and an invalid event cannot commit

| Reading | Value |
|---|---|
| `npm test` | exit 0 · `new: 719 tests · legacy: 500 tests (30 skipped)` (689 + 30 new) · **345 s** — not comparable with the 108 s of §1: the machine was under other load during this run (load average 7.9 / 9.3 five and fifteen minutes before; no kiln process left over). Re-timed at T070 on a quiet machine. |
| `npm run check` | five `PASS`: network 98 files · boundaries 98 · legacy 168 · flow 1 · **record 90 files** (41 types, 18 committed types) |
| catalog | 41 types in 13 groups; `schemas/events/` holds 41 generated files; `emitted` is true only for types some code commits (unit, command and feature.archived flip when T028/T029/T060 add their emitters) |

## 5. US1 checkpoint (T037) — every state change is in the record, in one gap-free order

After T028–T036 (unit events, `command.accepted`, lane correlation, the stream rules, the record oracle E1–E3 + E7 wired into the walk judge, the `record.append-after-write` kill point, concurrency, smoke and weakened-writer tests):

| Reading | Value |
|---|---|
| `npm test` | exit 0 · `new: 748 tests · legacy: 500 tests (30 skipped)` · **110 s** (a quiet machine; §4's 345 s was load, not code) |
| `npm run proof` | exit 0 · **95 tests**, 95 pass · 288 s (92 + the 3 of `record-kill-points.proof.test.ts`) |
| `npm run check` | five `PASS`: network 101 files · boundaries 101 · legacy 168 · flow 1 · record 93 |
| the oracle | `judge()` of every walk proof now also runs E1, E2, E3 and E7 on the final store; every r14 kill proof (the whole matrix) passes with them |

## 6. US6 checkpoint (T043) — consumers follow the record with durable cursors

After T038–T042 (the `Backbone`, cursors, `Consumer`, four backbone kill points, test consumers, E5, the backbone kill proof, the weakened consumer):

| Reading | Value |
|---|---|
| `npm test` | exit 0 · `new: 759 tests · legacy: 500 tests (30 skipped)` · **111 s** |
| `npm run proof` | exit 0 · **104 tests**, 104 pass · 263 s (95 + 9 of `backbone-kill.proof.test.ts`) |
| `npm run check` | five `PASS`: network 104 files · boundaries 104 · legacy 168 · flow 1 · record 96 |

## 7. US3 checkpoint (T049) — the factory-log is a projection, rebuilt byte-identically

After T044–T048 (the catalog's read-only legacy types, the pure reducer and mapping table, the legacy converter, the live `factory-log` consumer, `kiln record show|status|verify|rebuild-log`, E4, the factory-log kill proof, the weakened projections):

| Reading | Value |
|---|---|
| `npm test` | exit 0 · `new: 781 tests · legacy: 500 tests (30 skipped)` · **129 s** (machine busy: load averages 10 / 13 / 15 during the run; 109–111 s on a quiet one) |
| `npm run proof` | exit 0 · **120 tests**, 120 pass · **525 s** under load (15-minute average 15.6). A first run under heavier load took 1125 s and failed four tests with "the owner did not start within 15000 ms"; the same four passed on the rerun and no code changed in between. The quiet-machine figure is re-taken at T070. |
| `npm run check` | five `PASS`: network 110 files · boundaries 110 · legacy 168 · flow 1 · record 102 |

## 8. US4 checkpoint (T054) — the old walks replay as event streams, byte-identical

After T050–T053 (converter, capture command and fixtures, replay module, `kiln check record` part 2 with its walk members):

| Reading | Value |
|---|---|
| `npm test` | exit 0 · `new: 787 tests · legacy: 500 tests (30 skipped)` · 131 s (load averages 7 / 10 / 13) |
| `npm run check` | five `PASS`; record: `walks: 3 of 5 named rows replayed (r2, r3, r7), 5 streams, 73 events; missing: r1 (scaffold), r8 (Pi extension)` |
| the capture | `node spikes/015-capture-walks/capture.ts` twice → identical bytes; `legacy/` unchanged |

**What the Roadmap gate is asked to accept (Clarification Q3):** the row's text names r1–r3, r7 and r8. Three of those five rows have a real original and replay byte-for-byte with their verdicts (r2 the lane runtime's stub walk, r3 the overlay's program walk and its deliberately broken twin, r7 the committed live-inference pair); **r1 and r8 have no original stream** — r1's contract tests hold single per-line records for a schema test, and the Pi extension (r8) states in `legacy/pi/outcome.ts` that it does not touch the factory-log — and are reported by name with those reasons, not reconstructed.

## 9. US5 checkpoint (T058) — events keep their meaning as their shape changes

After T055–T057 (the r14 stores opened by the new owner, a breaking version with its upcaster in a test catalog, the check's proof that an upcaster is pure and lossless over real events, the refusals on the read path):

| Reading | Value |
|---|---|
| `npm test` | exit 0 · `new: 797 tests · legacy: 500 tests (30 skipped)` · 133 s (load averages 6 / 8 / 11) |
| `npm run check` | five `PASS` (record 103 files; walks: 3 of 5 named rows replayed) |
| SC-005 | both r14-written stores open with the new owner; `kiln.outbox/main` is **byte-identical** after the owner opened, followed and closed it, and after the waiting walk was driven to Merge on top of it |

## 10. US7 checkpoint (T066) — a finished feature leaves the live store in a checksummed archive, automatically

After T059–T065 (the archive file, the `kiln.archive` task and its tombstones, the start-up safety net, the failure paths, E6 and the archive kill proof, the weakened archive, `kiln record archive-show`):

| Reading | Value |
|---|---|
| `npm test` | exit 0 · `new: 807 tests · legacy: 500 tests (30 skipped)` · **113 s** (load averages 4.7 / 7.2 / 6.6) |
| `npm run proof` | exit 0 · **127 tests**, 127 pass · **393 s** (load averages 2.9 / 7.1 / 6.4 at the end) |
| `npm run check` | five `PASS`: network 113 files · boundaries 113 · legacy 168 · flow 1 · record 105 (42 types, 24 committed types) |
