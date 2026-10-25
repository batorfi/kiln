# Contract: `kiln check`

**FR-016, FR-017, FR-018** · **Spec**: US4, US5, US2 (identity) · **Data**: [../data-model.md](../data-model.md) §9

## Invocation

```text
npm run kiln -- check [<name>…] [--json]        # from kiln/
npm run check                                    # same as `check` with no names
node packages/cli/src/main.ts check [<name>…]    # from anywhere, given the path
```

`<name>` ∈ `network`, `boundaries`, `legacy`. With no name, **all** r12 checks run, in that order, and every check runs even when an earlier one
fails (a reviewer sees every failure at once). An unknown name is a usage error (exit 2) listing the known names. (`flow` joins in r14, `config`
and `model` in r17.)

## What each check does

| Name | Examines | Passes when | Fails by |
|---|---|---|---|
| `network` | non-test source anywhere under `packages/<name>/` and `checks/` (recursively), with the allowlist in `checks/network-allowlist.json` | no file calls a network API, imports a network or process module, or evades the lint, outside the allowlist — and **at least one file was scanned** | `network-call` · `network-import` · `network-alias` · `network-computed` · `network-zero-files` · `allowlist-missing-file` · `allowlist-bare-name` — and, added in US4: `network-external-dependency` (a bare third-party specifier), `network-nonloopback-url` (a remote URL literal in an allowlisted module), `network-allowlist-invalid` (unreadable or not schema 1) |
| `boundaries` | import specifiers of the same files, against `checks/boundaries.json` | every import respects the dependency direction and seam rules; every package declares a responsibility — and at least one file was scanned | see [boundaries.md](./boundaries.md) |
| `legacy` | `legacy/` against `checks/legacy-manifest.json`, and `checks/legacy-copies.json` | every manifest file exists with its recorded hash; no unlisted file outside the manifest's `ignore` globs; the copy record is consistent | see [legacy-identity.md](./legacy-identity.md) (adds `legacy-manifest-invalid`) |

## Output (text, to stdout)

One block per check, in the first program's report format:

```text
PASS network — scanned 41 files; allowlist: 0 entries
FAIL boundaries — 2 failures
  boundary-forbidden-import packages/record/src/log.ts: imports #lane/affinity.ts (record may import: contracts)
  boundary-bare-specifier  packages/lane/src/x.ts: imports "left-pad" (no external seams are open)
PASS legacy — 168 files match the manifest (baseline 299b0a5…); 2 ignored globs; 19 deferred cases listed
note: the baseline-commit cross-check is a test (npm test), not part of this command
```

- `notes` (anything skipped, and why) are printed, never dropped — **a skipped sub-check is stated, not silent**.
- `--json` prints the array of `CheckResult` objects (data-model §9) on one line, for tooling; the exit code is unchanged.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | every requested check passed |
| 1 | at least one check failed |
| 2 | usage error (unknown name, bad flag) |

A check that **scanned nothing** is a failure (exit 1), never a pass: `network-zero-files`, `boundary-zero-files`.

A name with no registered check is a failure too, never a pass: `check-not-registered` (it cannot occur while all three names are registered; it is what a future `CheckName` without an entry reports).

`network-computed` covers any `import()`/`require()` whose argument is not exactly one string literal — `import(name)`, `import("node:" + "http")`, ``import(`x${y}`)`` — because the module it loads cannot be read from the source.

## Guarantees

- Read-only: `kiln check` writes no file, opens no socket and spawns no process.
- Deterministic: same tree ⇒ same output order (files sorted by path).
- Local: no network — the `network` check's own source is scanned by itself.
- Every check has a **falsify hook** in its tests: a scratch change that must make it fail by its own name (the `*-ready` pattern).
