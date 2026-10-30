# Dependencies — the recorded decision

`kiln/` began (r12) with **no runtime dependency**. Row r13 admits three, as a deliberate and recorded decision (constitution, *Dependencies*): each is pinned to an exact version, locked by the committed `package-lock.json`, reached through **one seam** (`packages/durable/src/library/`), and described here. `packages/durable/tests/dependencies-record.test.ts` keeps this file equal to `package.json` and the lock: a dependency missing here, or a version or integrity that differs, fails the suite by name.

**Install:** `cd kiln && npm ci` — the one network act. (`npm test` and `npm run check` need nothing else; neither makes a network call.) The install is large (91 packages, ≈ 112 MB) because the runtime's model-provider SDKs come with it; they are present on disk and **unreachable**: KILN registers no provider, and `kiln check network` still scans every KILN source file.

## The three packages

### `@earendil-works/pi-durable`

- **Version:** `1.4.0`
- **Integrity:** `sha512-EtIyXH1MBSXdJSkodmy+CYXuwfve3gPrD4GNCZ0XmuRWLPupwRlNQ7fdaXjRcLoKb6SWkT/yEzK+sMmrqvYK+Q==`
- **Licence:** MIT
- **Why:** the durable runtime — tasks that checkpoint, wait and resume across process death, and documents committed atomically with them. It is what lets a gate wait without running code and settle in one commit (r42 verdict `go`, `specs/010-external-completion-spike/spike-report.md`).
- **Reached through:** `packages/durable/src/library/` only. `kiln check boundaries` refuses any other import; `packages/durable/tests/seam.test.ts` pins it to that directory and scans the exported declarations for the library's names.

### `@earendil-works/pi-ai`

- **Version:** `1.4.0`
- **Integrity:** `sha512-hQM/C4+1w8rHYACzDDf+0vQMnEnpzIop1tptIERVgR3ZeT/hHSzBNG8PaWPgxWQjqSeKCyBZSyp8uTT6eKK1pQ==`
- **Licence:** MIT
- **Why:** the runtime requires a `models` object when it opens, and this is the only way to build one. **A deliberate exception (research R1):** the `workers` package is described as "the only importer of pi-ai for model calls"; the seam imports `createModels` from it for that one purpose and registers **no provider**. A test asserts the object has none and that no model request path exists.
- **Reached through:** `packages/durable/src/library/open.ts`.

### `@earendil-works/chord`

- **Version:** `1.4.0`
- **Integrity:** `sha512-dTbgyz4xgDS5KAUFx1bFENqj0Cr1N3tYxJJOYStc6g6HS78FSBZydyoCwLoddiQRF+VgRS0fpgAi+iKxjZ3BQA==`
- **Licence:** MIT
- **Why:** the runtime's execution context (`BACKGROUND_CONTEXT`) that every call into it carries.
- **Reached through:** `packages/durable/src/library/open.ts`.

## Node's built-in SQLite — an accepted risk

The runtime's only durable storage is Node's built-in `node:sqlite`, which Node still marks **experimental** on the supported range and which prints `ExperimentalWarning: SQLite is an experimental feature` on first use there. This was **accepted, with its warning, on 2026-10-26** (spec Clarification Q1), and is bounded:

- **Opened in one place.** The storage is opened in one file (`library/open.ts`: `openStore` for the owner, `openReader` for a reader with no owner); the one other use is the owner lock (`owner-lock.ts`), a tiny separate database whose single transaction decides who owns a store. No other file touches `node:sqlite`.
- **Canary-tested.** `packages/durable/tests/canary-sqlite.test.ts` fails loudly, by name, if the module is missing or behaves differently on the running Node (open, write, read, close, and the transaction the lock depends on).
- **Floor.** `engines.node` is `^22.19.0 || >=24.1.0`; the new suite and `kiln check` are run on 22.19.0, 24.1.0 and the installed Node (`specs/011-durable-core-gate-contract/baseline.md`). The 23.x line is out of the range since r15: Node 23.6.0 ignores the busy-timeout option of `DatabaseSync`, so a second connection failed at once with "database is locked" while the owner committed; every Node in the range applies it, and `packages/durable/tests/busy-timeout.test.ts` fails by name on one that does not.
- **Platform.** macOS is the only platform measured.

## The upgrade rule

**An upgrade is a deliberate, recorded change with its own row and review — r13 offers no upgrade path.** Opening a store under a library version other than the one that created it is **refused** (FR-047): the message names both versions, no task is resumed, and the file is untouched. A version range, a floating tag or an undeclared package in `package.json` fails `kiln check boundaries`; so does a missing or out-of-step lockfile.

When a version does change, the change comes with: this file updated (version and integrity), the lock regenerated, the store-version contract number considered, the whole proof re-run (`npm test`), and the floor matrix repeated.
