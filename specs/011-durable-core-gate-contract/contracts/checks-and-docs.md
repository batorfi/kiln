# Contract: changes to r12's checks, and to the statements about dependencies

**Spec**: FR-050 … FR-054, FR-063, SC-006, SC-009 · **Research**: R1, R6, R10 · **Principle**: r12's checks stay **never vacuous** and keep their own tests; this row only makes them *narrowly* more permissive, each widening with a planted-violation test.

## `kiln check boundaries` (extended; still one check)

Rules file `checks/boundaries.json` changes:

```jsonc
"layers": { …, "cli": { "imports": ["contracts","record","server","checks","durable"] } }   // the CLI is a client of the owner's channel
"externals": {
  "pi-durable": {
    "specifiers": ["@earendil-works/pi-durable", "@earendil-works/pi-durable/storage/sqlite/node",
                   "@earendil-works/chord/context", "@earendil-works/pi-ai/models",
                   "@earendil-works/pi-durable/package.json"],   // the installed-version read of the store guard (FR-047)
    "onlyIn": ["durable"]
  }
}
```

Responsibilities updated in `packages/durable/kiln.json` and `packages/lane/kiln.json`; `packages/workers/kiln.json` becomes "the only importer of pi-ai **for model calls**" (R1).

New failure codes (the existing ones keep their meaning):

| Code | When |
|---|---|
| `boundary-dependency-unpinned` | a `dependencies` entry in `kiln/package.json` is a range (`^`, `~`, `>`, `*`, `x`), a tag (`latest`), a URL or a path |
| `boundary-dependency-undeclared` | a bare specifier whose package is not in `dependencies`, **or** a dependency that no external seam names |
| `boundary-lock-mismatch` | `kiln/package-lock.json` is absent, or disagrees with `dependencies` on a name or version |
| `boundary-bare-specifier` *(existing)* | a bare specifier the seam does not open for that package — now also fires for the library outside `durable` |

The CLI's one use of `durable` is the channel **client**; a cli test asserts that no other `#durable/…` module is imported from `packages/cli` (the layer rule cannot express that).

## `kiln check network` (extended; still one check)

1. `network-external-dependency` stops firing for a specifier that `boundaries.json → externals` opens **for that file's package** — one source of truth. Everywhere else it fires as before.
2. A **local-IPC allowlist** (`checks/local-ipc.json`, path-keyed like the existing allowlist, with the same `allowlist-bare-name` / `allowlist-missing-file` self-checks) lists the files permitted to import `node:net`: exactly `packages/durable/src/channel/server.ts` and `…/client.ts`. In a listed file the import is allowed **and** these new codes apply: `network-local-ipc-port` for `listen`/`connect`/`createConnection` given a number, an options object, or a string that is not an absolute path (a host or a port); `network-local-ipc-other` for any other network module (`node:http`, `node:dgram`, …). `node:net` in any **unlisted** file is still `network-import`.
3. `node:child_process` stays denied in source (tests may spawn: `tests/` directories are outside the scan roots, as in r12).

**Negative suite (each fails by name, and r12's own tests stay green, including "strictly stronger than the first program's scan")**: `listen(8080)`, `listen({port})`, `connect("example.com")`, `connect({host})`, `node:net` in an unlisted file, `node:http` in a listed file, an undeclared external, the declared external imported from `workers`, a `^1.4.0` pin, a missing lockfile.

## Statements made true again (FR-053)

| Where | Now says |
|---|---|
| `kiln/package.json` `description`, `dependencies`, `engines.node` | three exact pins; `^22.19.0 \|\| >=23.6.0`; "one install step" |
| `README.md` §Node (line ~221) and the install/quick-start text | the new floor; `cd kiln && npm ci` is the one network act; the `node:sqlite` warning, documented |
| `specs/009-kiln-foundations-reset/quickstart.md:8` | **annotated**, not rewritten — "(as of r12; see r13)" — history stays history |
| `kiln/DEPENDENCIES.md` *(new)* | the recorded decision: each dependency, version, integrity, licence, the reason, the seam; kept in sync with `package.json` and the lock by a test |

## Floor and platform

`engines.node` = `^22.19.0 || >=23.6.0`. The new suite and `kiln check` are run on **22.19.0, 23.6.0, 24.1.0 and the installed Node** (r12's matrix, 22.18 replaced by 22.19), results in this row's `baseline.md`. macOS only; other platforms are not measured and the README says so (as r12).
