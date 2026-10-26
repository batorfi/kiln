# Baseline and control readings: Spike r42

**Branch**: `010-external-completion-spike` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Tasks**: [tasks.md](./tasks.md)

This file records the numbers the spike is compared against (SC-008) and the facts measured while setting it up, each with the command that produced it. Entries are appended as tasks complete; none is ever edited after the fact.

## Before (T001) — 2026-10-26

Taken on branch `010-external-completion-spike` at the start of implementation, before any file under `spikes/` existed. `origin/main` is an ancestor of the branch (no divergence).

| Reading | Command | Result |
|---|---|---|
| New + legacy suites | `cd kiln && npm test` | exit **0** — `new: 184 tests · legacy: 500 tests (30 skipped)`; new 184 pass, 0 fail; legacy 470 pass, 0 fail, 30 skipped |
| Live-Pi tier | (printed by the runner) | `live-Pi tier skipped: Pi 1.4.0 installed, measured [0.85.1]` |
| The three checks | `cd kiln && npm run check` | exit **0** — `PASS network — scanned 22 files` · `PASS boundaries — scanned 22 files` · `PASS legacy — scanned 168 files` |
| `legacy/` tree id | `git rev-parse HEAD:legacy` | `20a82c7e214be256c804f6e8f1cd4cce9c8e9874` |
| Baseline tree id | `git rev-parse 299b0a5:kiln` | `20a82c7e214be256c804f6e8f1cd4cce9c8e9874` — **equal** |
| Difference from `main` in the three guarded paths | `git diff --stat main -- legacy kiln specs/ROADMAP.md` | **empty** |

### Environment

| | |
|---|---|
| Node | v25.9.0 (`node --version`) |
| npm | 11.14.1 (`npm --version`) |
| Pi CLI | 1.4.0 (`pi --version`) |
| Platform | macOS (Darwin 25.6.0) |
| `@earendil-works/pi-durable@1.4.0` integrity | `sha512-EtIyXH1MBSXdJSkodmy+CYXuwfve3gPrD4GNCZ0XmuRWLPupwRlNQ7fdaXjRcLoKb6SWkT/yEzK+sMmrqvYK+Q==` (`npm view @earendil-works/pi-durable@1.4.0 dist.integrity`) |

## Deviations from the task text (recorded as they happen)

| Task | Text said | Done instead | Why |
|---|---|---|---|
| T003 | `test` script `node --test tests/` | `node --test "tests/**/*.test.ts"` | measured 2026-10-26 in a scratch directory: `node --test tests/` fails with `Cannot find module '…/tests'` on **both** Node 25.9.0 and 22.19.0 (a directory is treated as a module); the glob form runs the tests on both. Note: a glob that matches nothing runs nothing — the same silent-pass class as r12's runner; the spike's own never-vacuous guard is the evidence runner (T022, T027), and `npm test` should only be trusted once it reports a non-zero count |

## Pin (T004) — 2026-10-26

`npm install --save-exact @earendil-works/pi-durable@1.4.0 @earendil-works/pi-ai@1.4.0 @earendil-works/chord@1.4.0` in `spikes/r42/` (first attempt succeeded; the registry had returned a transient 404 for `chord@1.4.0` earlier the same day, so the install was wrapped in a retry). This is **the one network act** of the spike. `package.json` has no `^` or `~`; `package-lock.json` (lockfile version 3) is committed.

| Package | Version | Integrity (from the lockfile) |
|---|---|---|
| `@earendil-works/pi-durable` | 1.4.0 | `sha512-EtIyXH1MBSXdJSkodmy+CYXuwfve3gPrD4GNCZ0XmuRWLPupwRlNQ7fdaXjRcLoKb6SWkT/yEzK+sMmrqvYK+Q==` |
| `@earendil-works/pi-ai` | 1.4.0 | `sha512-hQM/C4+1w8rHYACzDDf+0vQMnEnpzIop1tptIERVgR3ZeT/hHSzBNG8PaWPgxWQjqSeKCyBZSyp8uTT6eKK1pQ==` |
| `@earendil-works/chord` | 1.4.0 | `sha512-dTbgyz4xgDS5KAUFx1bFENqj0Cr1N3tYxJJOYStc6g6HS78FSBZydyoCwLoddiQRF+VgRS0fpgAi+iKxjZ3BQA==` |

**The installed tree** (input to the report's finding on the dependency tree, T057): **91 packages** in the lockfile (excluding the root), none dev-only; licences MIT 42 · Apache-2.0 35 · BSD-3-Clause 12 · Unlicense 1 · 0BSD 1; `node_modules` is **112 MB**; one deprecation notice (`node-domexception`, "use your platform's native DOMException"). *Correction:* the pre-implementation dry run reported "233 lines of `npm ls`" — that was a line count of the printed tree, not a package count; **91** is the package count.

## Smoke (T006) — 2026-10-26

`spikes/r42/src/smoke.ts` imports the pinned package, opens a SQLite store with `openNodeSqliteStorage` in a private temporary directory, closes it with `storage.close(BACKGROUND_CONTEXT)` and removes the directory. No network socket, no model.

| Node | Command | Exit | Output | `ExperimentalWarning: SQLite is an experimental feature`? |
|---|---|---|---|---|
| **v25.9.0** (installed) | `npm run smoke` | 0 | `@earendil-works/pi-durable 1.4.0 \| node v25.9.0 \| store created: true \| closed cleanly` | **no** |
| **v22.19.0** (the package's floor) | `npx -y node@22.19.0 src/smoke.ts` | 0 | `@earendil-works/pi-durable 1.4.0 \| node v22.19.0 \| store created: true \| closed cleanly` | **yes** — printed once on stderr |

The package loads and its storage works on both, so the verdict is not decided at the smoke step. The warning is the finding recorded for T057/T058 (the library's only durable storage rests on Node's built-in `node:sqlite`, experimental on the declared floor); the Node version at which it stops is to be located in T057.

## After setup (T007) — 2026-10-26

Re-taken with `spikes/r42/` present (including its 112 MB `node_modules`), commands as in T001.

| Reading | Result | Equal to T001? |
|---|---|---|
| `cd kiln && npm test` | exit **0** — `new: 184 tests · legacy: 500 tests (30 skipped)` | **yes** |
| `cd kiln && npm run check` | exit **0** — `PASS network — scanned 22 files` · `PASS boundaries — scanned 22 files` · `PASS legacy — scanned 168 files` | **yes** (same file counts: `spikes/` is outside the scan roots — verified, not assumed) |
| `git rev-parse HEAD:legacy` | `20a82c7e214be256c804f6e8f1cd4cce9c8e9874` | **yes** |
| `git diff --stat main -- legacy kiln specs/ROADMAP.md` | empty | **yes** |
