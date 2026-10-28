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
