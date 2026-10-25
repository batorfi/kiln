# Code review report: Foundations reset (row r12), the whole branch (T001–T087)

**Branch**: `009-kiln-foundations-reset` @ `906c587` | **Review date**: 2026-10-25 | **Scope**: everything on the branch that is code or configuration — 76 tracked files in `kiln/` (1,775 lines of source, 1,843 lines in 25 test files) plus the unchanged `legacy/` tree
**Companions**: [implementation-report.md](./implementation-report.md) · [verification-report.md](./verification-report.md) · **Checked against**: [spec.md](./spec.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [tasks.md](./tasks.md)
**Supersedes**: the first version of this report (tasks T001–T019 only). Its findings and what became of them are in §6.

## 1. Verdict

**The branch is sound and can go to the human's gate.** The move is pure, `legacy/` is byte-identical to the baseline, every spec requirement is met (see the verification report), and the three checks and the runner fail closed in every negative case I tried. I found **no defect that makes a green result wrong for the code as it is written today**. What I found is a set of **gaps in what the checks can see** — the lint and the boundary check read source by pattern, and a few ordinary spellings of an import slip past them *silently*. For checks whose job is to never pass vacuously, that is the finding worth acting on. Nothing was edited in this review.

| # | Severity | Confidence | Area | Finding |
|---|---|---|---|---|
| 1 | **Medium** | Confirmed (run, through the CLI) | `checks/lex.ts`, `network-lint.ts` | Import/require spellings the specifier scan does not recognise pass `kiln check network` and `kiln check boundaries` with no output |
| 2 | **Medium** — inherited, outside r12's scope | Confirmed (run) | `record/log.ts` | A `pre-delegation` record *after* an approval still authorises it (R3/R4 ignore order) |
| 3 | Low | Confirmed (run) | `checks/` | The scan roots leave holes: `checks/<subdir>/`, files outside `src/`, and relative imports into `kiln/tests/` |
| 4 | Low | Confirmed (run) | `tests/run.ts` | On a shallow clone or archive the run exits 0, prints `new: 170 tests`, and does not say 5 of them skipped — including the baseline cross-check |
| 5 | Low | Confirmed (run) | toolchain | No type-check exists; a strict `tsc` run finds 4 errors in the new tree (none changes behaviour) |
| 6 | Info | Confirmed | docs | `check-not-registered` is still missing from `cli-check.md`; the quickstart names Pi 1.1.0; a comment in `entry.ts` promises behaviour no caller has |
| 7 | Info | — | various | Gate range hard-coded in `log.ts`; inherited indentation; `CheckResult` and `registry` notes |

## 2. What was reviewed and how

| Area | Method |
|---|---|
| The move, `legacy/`, SC-003 | `git rev-parse HEAD:legacy` = `299b0a5:kiln` = `20a82c7e…`; `kiln check legacy`; tamper, delete, add and ignored-file cases on a scratch copy |
| Authored source read in full | `checks/` (`index`, `lex`, `network-lint`, `boundaries`, `legacy-identity`, `loopback`), `tests/` (`run`, `pi-tier`, `tools/count-ported`), `packages/cli`, `packages/record` (`log`, `entry`), `packages/contracts` (`moves`, `roles`, `flow/*`), `packages/lane` (`affinity`) |
| Contracts against code | every failure code the checks emit, searched for in `contracts/*.md` |
| Adversarial probes | 17 spellings of imports, aliases and loads fed to `scanTextDetailed` and to the real CLI on a scratch copy; three log streams to the real validator; a shallow clone; a removed `legacy/`; an unregistered-check path |
| Types | `tsc 5.x --strict` from a scratch install in `/tmp/tscheck` (outside the repository — it has no dependencies and gets none), `@types/node` 22, on `kiln/` and on `legacy/` for a baseline |
| Test health | `skip`/`only`/`todo` search; the ported-case census; boundary and lint coverage of the test directories |
| Whole-suite runs | fresh clone, Node 22.18, 23.6, 24.1, 25.9 (verification report) |

## 3. Findings

### 1. [Medium · Confirmed] The specifier scan misses ordinary spellings, and the checks pass in silence

`kiln/checks/lex.ts:102` (`MODULE_REFERENCE`) and `kiln/checks/network-lint.ts:35` (`COMPUTED_LOAD`), used by both `kiln check network` and `kiln check boundaries`.

I fed each line below to the real lint and then, for three of them, planted it in a scratch copy of the tree and ran the real CLI. The right-hand column is what the check said.

| Source line | Why a person would write it | `moduleSpecifiers` | Lint result |
|---|---|---|---|
| `import http from "node:http"` | *(control)* | `node:http` | `network-import` ✔ |
| `import ("node:http")` | a space before `(` | none | **pass** |
| `require ("http")` | the same | none | **pass** |
| `import("node:" + "http")` | a built-up specifier | none | **pass** |
| `require("ht" + "tp")` | the same | none | **pass** |
| ``import(`node:http`)`` | a template literal | none | **pass** |
| `import{request}from"node:http"` | minified / unspaced | none | **pass** |
| `export{request}from"node:http"` | the same | none | **pass** |
| `const a = 1;import http from "node:http"` | two statements on one line | none | **pass** |

Through the CLI, on a scratch copy of the tree:

```text
printf 'import{a}from"#lane/affinity.ts";export const z=a;\n' > packages/record/src/oops.ts
kiln check boundaries   →  PASS boundaries — scanned 23 files        (record may import only contracts)
printf 'export const m = () => import ("node:http");\n'      > packages/lane/src/oops2.ts
kiln check network      →  PASS network — scanned 24 files
printf 'export const m = () => import("node:" + "http");\n'  > packages/lane/src/oops2.ts
kiln check network      →  PASS network — scanned 24 files
```

**Why it matters.** `COMPUTED_LOAD` exists to catch a load whose target cannot be read from the source (`network-computed`; the negative suite proves `import(name)`). Its lookahead `(?!["'`])` excludes any argument that *starts* with a quote, so a concatenation that starts with a literal reads as "not computed" — and the specifier regex requires the literal to be followed directly by `)`, so it is not read either. `MODULE_REFERENCE` was written for this port (it runs on the new `masked` view) and demands whitespace after `import`/`export` and before `from`, and no whitespace between `import` and `(`. The files being checked will be written largely by agents; most will be formatted, but "most" is not what a check that fails closed promises. `network-lint.ts` states one limit honestly (a *determined* hiding attempt, e.g. `globalThis[String.fromCharCode(…)]`); a concatenated string or a missing space is not that, and it is exactly the class CR-4 of the first program set out to close. `COMPUTED_LOAD` is inherited unchanged from `legacy/validate/_netscan.ts:64`; `MODULE_REFERENCE` is new.

**Why SC-006/SC-007 still hold.** Both criteria are scoped to "the constructs in its negative suite", and every one of those is caught. The verification report is accurate; this finding is that the suite does not yet contain these constructs.

**Fix** (small, in `lex.ts` and `network-lint.ts`, with a negative case per row above in the same commit):

- allow optional whitespace everywhere: `\bimport\s*\(`, `\brequire\s*\(`, `(?:^|[^\w$.])(?:import|export)\b[^;'"]*?\bfrom\s*["']`, and the side-effect form `import\s*["']`;
- decide "literal" by shape, not by first character: an argument is a literal only when it is exactly one quoted string (or a backtick string with no `${`) followed by `)`; anything else is `network-computed`.

### 2. [Medium · Confirmed · inherited, outside r12's scope] A pre-delegation after the approval still authorises it

`kiln/packages/record/src/log.ts:95-101, 134`

`checkDecisions` first collects every `pre-delegation` record in the whole stream, then accepts any approving gate-completion whose gate is in that set. Order is never compared.

```text
{"seq":1, … "gate-completion": {"gate":6,"move":"approve", no decidedBy}}
{"seq":2, … "recordType":"pre-delegation", "preDelegation":{"of":"6","by":"human@x"}}
→ PASS   (exit 0)
```

The control — the same approval with no pre-delegation at all — fails `R3 … (no-silent-approval)` as it should. A pre-delegation that arrives *after* the decision it is meant to authorise is a record written to excuse an approval, not a delegation of authority; the constitution's rule is that a gate may not silently approve, and a later record is the silent approval being made respectable. The port preserved the first program's behaviour exactly (FR-011: "behaviour unchanged"), so this is **not a regression and not a defect of r12** — but r12 now owns the validator that the rest of the roadmap leans on, and the right moment to say so is now.

**Suggestion**: not in r12. Record it as a proposal for the next row that touches the log: a pre-delegation must have a lower `seq` than the completion it authorises, name the same gate (and, ideally, the same scope), and `R4` should say so in words. A negative case belongs with the fix. (A self-asserted `preDelegation: {}` inside the completion is not a gap: the schema refuses it for lack of `of`/`by`/`at`.)

### 3. [Low · Confirmed] The scan roots leave holes

`kiln/checks/network-lint.ts:149-168` (`networkScanFiles`, shared by the lint and the boundary check) · `kiln/checks/boundaries.ts:123-130`

- **`checks/<subdir>/`**: only `.ts` files *directly* in `checks/` are scanned. `checks/lib/net.ts` containing `fetch("http://example.com")` → `PASS network — scanned 22 files` (22 before, 22 after: the file is invisible).
- **Outside `src/`**: a package's code under `packages/<p>/` but not `src/` is outside both checks. Today no package has any.
- **Relative imports out of the package tree**: `packages/lane/src` importing `../../../tests/pi-tier.ts` → `PASS boundaries`. The resolved path is neither `packages/…` nor `checks/…`, so `toPackage` is never called and nothing says no. That includes `fixtures/`, and the (unscanned) `tests/` helpers, which spawn processes and read the network-adjacent `pi`.
- **Dot-directories** (`collect` skips every name that starts with `.`) are skipped by design for `.git`; `packages/x/src/.hidden/evil.ts` is skipped too.

None of this is reachable by accident in a tree of this size, but each is a silent pass in a check whose responsibility is "never pass vacuously". **Fix**: scan `checks/**` minus `checks/tests/`; make a relative import that resolves inside `kiln/` but outside `packages/` and `checks/` a `boundary-forbidden-import`; state the dot-directory rule in the check's note line.

### 4. [Low · Confirmed] Skipped tests are invisible at the end of a run

`kiln/tests/run.ts:92-93, 150` · `kiln/checks/tests/legacy-baseline.test.ts:14-30` · `kiln/checks/tests/netscan-untouched.test.ts:20-24`

`git clone --depth 1 --branch 009-kiln-foundations-reset` then `node tests/run.ts --new-only`:

```text
ℹ tests 170   ℹ pass 165   ℹ fail 0   ℹ skipped 5
new: 170 tests            exit 0
```

Five tests skip when git history is missing: the two **L6** tests (the manifest's tree id and blob ids against the baseline commit — the half of SC-003 that is "proved by a test" against git itself) and the three r7 history tests. Each prints a reason, but only inside the test stream; the runner's closing line counts them as tests that ran and the exit code is 0. `kiln check legacy` still guards the content against the manifest, so no tampering goes undetected; what is lost silently is the proof that the manifest *is* the baseline. This is the "skipped, never silent" rule applied to a tier the runner does not manage.

**Fix**: parse `ℹ skipped N` the way `ran` is parsed and print `new: 165 tests, 5 skipped`; optionally let `--strict` (or `CI=1`) fail when the L6 tests skip.

### 5. [Low · Confirmed] There is no type-check, and strict `tsc` finds four errors

`kiln/tsconfig.json` exists "for editors"; no script runs it, and the project may not add a dependency. I ran `tsc --strict --noEmit` from a scratch install outside the repository:

| File | Error | Note |
|---|---|---|
| `packages/contracts/tests/gate-rail.test.ts:40` | `string` is not a `MoveKind` (`m.includes(mv)`) | test-only; a cast fixes it |
| `packages/record/src/validate-core.ts:161, 164` | `instance` is `unknown` | a byte copy of `legacy/validate/_core.ts` — inherited |
| `packages/record/tests/roadmap-m3.test.ts:71` | `assert.equal` called with four arguments; the fourth (`"a proper Gate-0 admission must pass"`) is dropped | harmless; the failure text is still printed |

None changes behaviour (Node strips the types), and `legacy/` has far more (`tsc --strict` there reports 44). It is recorded because the earlier review said a type-check was "not possible here" and the hole is now measured: **4 errors, 0 in `contracts` source, 0 in `checks/`, `cli/` or `tests/run.ts`**. **Suggestion**: document `npx -y -p typescript tsc --noEmit -p kiln` as an optional step (it adds nothing to the repository) and fix the three test/cast lines when someone touches those files.

### 6. [Info · Confirmed] Documents that no longer match

- `contracts/cli-check.md` does not list `check-not-registered`, the code `runChecks` returns for a name with no entry (open since the first review). It cannot occur with all three registered, but a future `CheckName` without an entry will emit it.
- `quickstart.md` §1 says "on a machine with Pi 1.1.0 … `live-Pi tier skipped: Pi 1.1.0 installed`". This host now has **Pi 1.4.0** and printed `live-Pi tier skipped: Pi 1.4.0 installed, measured [0.85.1]` — the runner behaves correctly, the example is stale. Say "Pi <installed>".
- `packages/record/src/entry.ts:6` says a guard that cannot tell "must say no rather than throw — and callers print usage when argv is empty". No caller does: `main.ts`, `log.ts`, `roadmap.ts` all run their command *only if* the guard says yes, so a guard that fails to resolve `argv[1]` ends in silence and exit 0 — the original silent-pass class. The realistic triggers are few (a nonexistent `argv[1]`), but the comment should either be true or be removed.

### 7. [Info] Smaller observations

- `log.ts:117` hard-codes the valid gate ids (`gate0`, 1…9, `2a`, `6a`) next to `GATE_KEY_OF` in `contracts`; a third flow would need both edited. `hasGate` already answers "is it in this flow".
- `log.ts`, `validate-core.ts` and `roadmap.ts` carry the first program's irregular indentation; they are copies and are meant to be (see `legacy-copies.json`).
- `checks/index.ts`: `registry` is `Partial<Record<CheckName, …>>` (a departure noted in the implementation report); a check that *throws* (an unreadable file) ends the CLI with a stack trace and exit 1 — fail-closed, but the remaining checks do not run, unlike a check that returns a failure.
- `KILN_LEGACY_RUNNER` replaces the legacy runner in the runner's production path. It is documented as a test seam (`contracts/runner.md:44`) and is environment-controlled, like `KILN_PI_BIN`; no change recommended.

## 4. Checked and found correct

| Claim | Evidence |
|---|---|
| The move changed nothing | `HEAD:legacy` = `299b0a5:kiln` = `20a82c7e…`; 168 renames at 100 %; `git diff --stat main...HEAD -- legacy` shows additions only (it is the moved tree) |
| `kiln check legacy` is falsifiable | one byte appended → `legacy-file-modified`; file removed → `legacy-file-missing`; file added → `legacy-file-added`; a new `factory-log/x.jsonl` is ignored; `legacy/` renamed away → 168 `legacy-file-missing`, exit 1 |
| Flow data equals the governing documents | `flow-vs-constitution.test.ts` reads constitution v2.1.0, PRD GATE-1/GATE-2 and `ui-flow.md` as text: twelve gates, eleven names in order, five judges, closed move set; `v2.ts` read against them line by line |
| Judges bind to strongest only; the helper no longer swallows errors | `TierPolicyError` + rethrow in `weakerBindingRejected`; `roles.ts:25-33` |
| Lookups are own-key | `Object.hasOwn` in `flowOf`, `keyOf`, `log.ts:112`, `boundaries.ts:93, 115, 119` |
| Records are judged under their own flow; a gate the flow lacks fails by name | `validateLog…` `G3 … gate 2a is not in flow v1`; `revise` at gate 6 fails v1, passes v2 |
| The runner refuses to pass vacuously | zero files, zero tests, zero legacy tests, an unknown flag, `--new-only` with `--legacy-only`; run from other working directories |
| A demanded Pi tier is never switched off | `decidePiTier` `leave` for `--pi` and `KILN_PI=1`; `npm test -- --pi` → exit 1, 8 `PI-LIVE:` tests fail by name `pi-version-unmeasured` |
| The entry guard survives symlinks and every declared Node | `entry.ts` realpaths both sides; Node 22.18, 23.6, 24.1, 25.9 all print and exit correctly |
| `contracts` is I/O-free; nothing imports `legacy/`; no dependency, no bare specifier | `boundaries.json` + `kiln check boundaries`; the only `legacy` import strings in `kiln/` are in negative-test fixtures |
| Every other failure code is in the contracts | 24 of 25 codes found in `contracts/*.md` (the 25th is finding 6) |
| The census cannot lose a case | `count-ported.ts` fails when a ported file has fewer cases than its original; 54 of 54, 19 of 19 |
| Accepted limits of the lint, as its header says | `const { fetch: f } = globalThis`, `Reflect.get(globalThis, "fetch")`, `process.binding` are not detected; this is "a LINT, not a sandbox" and is documented; runtime enforcement is r16 |
| FR-021 | `specs/ROADMAP.md` differs from `main` only by the human-requested edits of `60a2c7e`; every row `queued`; `gate0` unchanged |

## 5. Recommended order

1. **Finding 1** — before r13 builds more code under these checks; it is a few regexes and one negative case per row of the table.
2. **Finding 3 and 4** — alongside, in the same files; both are "make a silent pass loud".
3. **Finding 2** — a Roadmap-gate proposal, not an r12 change (it alters the first program's behaviour).
4. **Finding 5 and 6** — whenever those files are next touched.

None of the findings changes the spec or the plan. Findings 1, 3 and 4 would each add a negative case and a line to a contract; none needs a decision from the human.

## 6. What became of the earlier review's findings

| # | Earlier finding | State at `906c587` |
|---|---|---|
| 1 | High — `import.meta.main` undefined on Node 23.6–24.1; CLI silently did nothing | **Fixed** (shared `isEntryPoint`); a second defect of the same class (symlinked temp directories) was found later and fixed there too; a regression test runs the CLIs through a symlink; verified on 22.18, 23.6, 24.1, 25.9 |
| 2 | Medium — `weakerBindingRejected` counted any error as a rejection | **Fixed** (`TierPolicyError`), with named tests |
| 3 | Medium — one `DEFAULT_FLOW` for two meanings | **Fixed**: `CURRENT_FLOW` = v2 and `DEFAULT_RECORD_FLOW` = v1; `log.ts` resolves `record.flow ?? defaultFlow ?? v1` and never relies on a function default |
| 4 | Low — prototype keys in flow lookups | **Fixed** (`Object.hasOwn`), with tests |
| 5 | Low — Phase 2 untested; runner missing; F3's source | **Fixed**: 170 tests; the runner exists; F3 parses the legacy file's text (T053) |
| 6 | Info — stale headers, `check-not-registered` undocumented, README | README rewritten (T078); copied-file headers left by design (the copy record ties them to origin); `check-not-registered` **still open** → finding 6 above |
| addendum | The schema admitted only `gate0`/1…9 until T051 | **Fixed** in T051 (`flow` field, `2a`/`6a`); a v1 record naming `2a` fails G3 by name |
