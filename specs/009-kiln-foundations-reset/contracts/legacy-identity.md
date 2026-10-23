# Contract: legacy is frozen

**FR-004, FR-005, FR-014, FR-015, FR-018** · **Spec**: US2 · **Data**: [../data-model.md](../data-model.md) §5–6 · **Decisions**: [../research.md](../research.md) R1, R4, R5, R15

## Layout

`legacy/` at the repository root holds the entire first-program tree — what was `kiln/` at the baseline commit — moved with `git mv` and never edited.
Beside it, `kiln/` is the new codebase. Nothing under `kiln/` imports from `legacy/` (boundaries, `boundary-legacy-import`); nothing under `legacy/` knows
`kiln/` exists (it is unchanged, so it cannot).

## The manifest — `kiln/checks/legacy-manifest.json`

Generated **once, immediately after the move-only commit**, from the git blobs of the **baseline commit** (not from the working tree) — so it records the original, whatever the tree looks like later.
Shape in [data-model §5](../data-model.md). Regenerating it is a deliberate act (`node tests/tools/make-legacy-manifest.ts <baseline-commit>`, which lives under `tests/` because it spawns `git` and the network lint does not scan `tests/`), reviewed like
any other change, and is expected only when legacy is **retired** — then the manifest and `legacy/` are deleted together.

## `kiln check legacy` — pure filesystem

| Condition | Failure | Reported as |
|---|---|---|
| a manifest file is absent under `legacy/` | `legacy-file-missing` | path |
| a file's SHA-256 differs from the manifest | `legacy-file-modified` | path, expected and actual prefix |
| a file under `legacy/` is not in the manifest and not matched by `ignore` | `legacy-file-added` | path |
| a `CopyRecord` names a `legacy` path not in the manifest, a missing `ported` path, or lacks `portedBy` for `kind: "wait"` | `legacy-copy-unlisted` | record |
| the manifest lists zero files | `legacy-zero-files` | — |

`ignore` = `factory-log/*.jsonl`, `factory-log/*.log` (runtime artifacts `.gitignore` already excludes). Nothing else is skipped.

## Evidence that needs git history — a test, not the command

`checks/tests/legacy-baseline.test.ts`: when the baseline commit is in the local history, `git rev-parse <commit>:kiln` equals `baseline.treeId`
(`legacy-baseline-mismatch` otherwise). Without history (a shallow clone, an exported archive) it **skips with a printed reason**. It lives outside the
lint's scan roots, so spawning `git` there is fine.

## The copy record — `kiln/checks/legacy-copies.json`

Lists every duplication (NC2-A): `kind: "ported"` pairs (legacy original ↔ new copy, allowed to differ) and `kind: "wait"` items (legacy tests and modules whose row has not
ported them yet — the 19 deferred cases of [research R13](../research.md) are listed **by file with `portedBy`**). `retiresWith` is always `legacy-retirement`.

## What stays running

The default suite runs the legacy suite through the frozen legacy runner (`legacy/tests/run.ts`) — FR-005 — with the Pi tier switched off by the new runner when
the installed Pi is unmeasured ([runner.md](./runner.md)). Legacy's own scripts work with `legacy/` as the working directory (`cd legacy && npm run runtime-ready`).

## Required behaviours (each is a test)

| # | Given | Then |
|---|---|---|
| L1 | the moved tree | `kiln check legacy` passes: every manifest file matches |
| L2 | one byte changed in a copy of `legacy/` | fails `legacy-file-modified` naming the file |
| L3 | a file deleted | fails `legacy-file-missing` |
| L4 | a file added (not under `ignore`) | fails `legacy-file-added`; a new `factory-log/x.jsonl` does **not** |
| L5 | the copy record pointing at a missing file / a `wait` without `portedBy` | fails `legacy-copy-unlisted` |
| L6 | the baseline commit in local history | `baseline.treeId` equals `git rev-parse <commit>:kiln`; otherwise the test skips and says why |
| L7 | the whole legacy suite, run through `kiln/tests/run.ts` with the Pi tier off | 0 failures; the same tests as the first program's last green run |
| L8 | the 19 deferred cases | each appears as a `wait` record with its `portedBy` row, and still passes in legacy |
