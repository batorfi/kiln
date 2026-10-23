# Contract: package boundaries

**FR-001, FR-002, FR-017, FR-018** · **Spec**: US5 · **Data**: [../data-model.md](../data-model.md) §7 · **Decision**: [../research.md](../research.md) R10

## The rule file

`kiln/checks/boundaries.json` is the single source of truth. Initial content (the PRD §8.2 chain; later rows extend it in the diff that adds the package):

```jsonc
{
  "schema": 1,
  "layers": {
    "contracts": { "imports": [],                                            "builtins": "none" },
    "record":    { "imports": ["contracts"] },
    "durable":   { "imports": ["contracts", "record"] },
    "lane":      { "imports": ["contracts", "record", "durable"] },
    "workers":   { "imports": ["contracts", "record", "durable"] },
    "director":  { "imports": ["contracts", "record", "durable", "lane", "workers"] },
    "workshop":  { "imports": ["contracts", "record", "durable", "lane", "workers", "director"] },
    "host":      { "imports": ["contracts", "record", "durable", "lane", "workers", "director"] },
    "server":    { "imports": ["contracts", "record", "durable", "lane", "workers", "director", "workshop", "host"] },
    "web":       { "imports": ["server"] },
    "cli":       { "imports": ["contracts", "record", "server", "checks"] },
    "editor":    { "imports": ["server"] },
    "team":      { "imports": ["contracts", "record", "durable"] },
    "explore":   { "imports": ["contracts", "record", "durable", "lane", "workers", "knowledge"] },
    "knowledge": { "imports": ["contracts", "record", "durable", "workers"] },
    "bench":     { "imports": ["contracts", "record", "durable", "workers", "knowledge"] },
    "checks":    { "imports": ["contracts", "record"] }
  },
  "externals": {},
  "forbidden": { "legacyRoot": "legacy/" }
}
```

(Packages that have no directory yet are declared so a row that creates one finds its place already agreed; a directory under `packages/` that is **not**
declared fails `boundary-package-undeclared`. `cli` importing `server` is declared for r19; in r12 `cli` imports only `contracts`, `record` and `checks`.)

## Scan

For every non-test `.ts` file under `packages/*/src` and `checks/*.ts`: read import specifiers with the lint's tokenizer (so a specifier inside a string or
comment is not an import) — `import … from "x"`, `export … from "x"`, `import("x")`, `require("x")` — and classify each:

| Specifier | Class | Rule |
|---|---|---|
| `./…`, `../…` | relative | resolved to a path; within the same package ⇒ fine; into another package ⇒ treated as that package's import (same rule as `#`); into `legacy/` ⇒ `boundary-legacy-import` |
| `#<pkg>/…` | package import | `<pkg>` must be in this package's `imports` list, else `boundary-forbidden-import` |
| `node:<module>` | builtin | `contracts` (`builtins: "none"`) may import **none** — `boundary-contracts-io`; others free |
| anything else | bare | `boundary-bare-specifier`, unless an `externals` entry allows that specifier **in that package** (empty in r12: FR-002) |

## Failures

| Code | Meaning | Reported as |
|---|---|---|
| `boundary-forbidden-import` | a package imports one not in its allowed list, or a sibling | file, specifier, what it may import |
| `boundary-bare-specifier` | a non-relative, non-`#`, non-`node:` import with no open seam | file, specifier |
| `boundary-legacy-import` | anything under `kiln/` importing from `legacy/` | file, specifier |
| `boundary-contracts-io` | `contracts` importing a `node:` module | file, specifier |
| `boundary-package-undeclared` | a `packages/<dir>` not in `layers` | directory |
| `boundary-responsibility-missing` | a directory under `packages/`, or `checks/`, without a non-empty `kiln.responsibility` in its `package.json` | directory |
| `boundary-zero-files` | the scan examined no file | — (never-vacuous) |

## Required behaviours (each is a test with a scratch tree)

| # | Given | Then |
|---|---|---|
| B1 | the real packages | passes, and reports the rules and the number of files checked |
| B2 | `record` importing `#lane/…` | fails `boundary-forbidden-import` naming the file |
| B3 | `lane` importing `#workers/…` (a sibling) | fails `boundary-forbidden-import` |
| B4 | `contracts` importing `node:fs` | fails `boundary-contracts-io` |
| B5 | any package importing `"left-pad"` | fails `boundary-bare-specifier` |
| B6 | a file importing `../../../legacy/src/x.ts` | fails `boundary-legacy-import` |
| B7 | `"#lane/x.ts"` inside a string or comment | is **not** read as an import |
| B8 | a `packages/` directory not in `layers` | fails `boundary-package-undeclared` |
| B9 | a package whose `package.json` lacks `kiln.responsibility` | fails `boundary-responsibility-missing` |
| B10 | an empty scan root | fails `boundary-zero-files` |
