# Code review report: Foundations reset (row r12), tasks T001–T019

**Branch**: `009-kiln-foundations-reset` @ `719ee13` | **Review date**: 2026-10-25 | **Scope**: everything on the branch that is code or configuration
**Companion**: [implementation-report.md](./implementation-report.md) · **Checked against**: [spec.md](./spec.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [tasks.md](./tasks.md)

## 1. Verdict

> **Update 2026-10-25:** finding 1 is **fixed** (`main.ts` now uses the `process.argv[1]` guard; verified on Node 22.18, 23.6, 24.1 and 25.9 — all print the `FAIL … check-not-registered` block and exit 1). Finding 3 is **addressed in `tasks.md`** (T021 and T050 reworded). Findings 2 and 4 are **fixed** (`TierPolicyError` in `roles.ts`; `Object.hasOwn` lookups in `flow/index.ts`; re-run parity: 0 mismatches, a wrong roster now surfaces a `TypeError`, `flowOf("toString")` throws `unknown flow`). Finding 5: F3's source is decided (parse the legacy file's text, as T044 does) and written into T053; the remaining parts (Phase 2 tests, the runner) arrive with their tasks.

**The work done so far is sound, with one defect that must be fixed before the next entry point is written.** The move is clean (tree id equal to the baseline,
legacy suite green), the copies are exact, and flow v1 / the tier policy reproduce the first program's behaviour with zero mismatches. The defect: the new CLI
exits 0 with **no output** on part of the Node range the package declares — a silent pass in the tool whose whole purpose is never to pass vacuously. Two
smaller correctness hazards and one forward-looking ordering risk are listed below. Nothing was edited in this review.

| # | Severity | Confidence | Area | Finding |
|---|---|---|---|---|
| 1 | **High — fixed** | Confirmed (run) | `cli` | `import.meta.main` is undefined on Node 23.6–24.1: `kiln check` prints nothing and exits 0 |
| 2 | Medium — fixed | Confirmed (run) | `contracts` | `weakerBindingRejected` treats every thrown error as a correct rejection |
| 3 | Medium — tasks reworded | Plausible (task order) | `contracts` / `record` | one `DEFAULT_FLOW` serves two meanings; T050 flips it before T052 makes T021's call explicit |
| 4 | Low — fixed | Confirmed (run) | `contracts` | plain-object lookups accept prototype keys (`flowOf("toString")`) |
| 5 | Low — F3 decided | Confirmed | process | no test covers any Phase 2 code; `npm test` in `kiln/` cannot start; F3 as written needs legacy data the new code may not import |
| 6 | Info | — | various | stale provenance comments in copied files; escaped em dashes; interim README |

## 2. What was reviewed and how

| Area | Method |
|---|---|
| The move and `legacy/` | `git rev-parse` tree ids; `git diff -M`; full legacy suite re-run (`KILN_PI=0`: 500 tests, 470 pass, 0 fail, 30 skipped) |
| Copies (schemas, `_core`, `_report`, `clock`, `types`) | `cmp` / `diff` against the originals |
| Flow v1, roles | a scratch script (outside the repo) importing both the new and the legacy modules: gate order, names, move sets per gate, `moveAllowed`, roster, producers, mitigation cap, and `bindRole` for all 12 roles × 4 tiers |
| Boundaries by hand | every `import` in `kiln/` read: `contracts` imports only itself and no `node:`; nothing imports `legacy/`; no bare specifier; `cli` imports only `checks` and `record` (both allowed for `cli` in `contracts/boundaries.md`) |
| CLI | exit codes and output for each path of `main`, from other working directories, on Node 25.9.0 and (via `npx`) 22.18.0, 23.6.0, 24.1.0 |
| Spec conformance | each completed task read against its wording and the contract it cites |

Not possible here: a type-check (`tsc` is not installed — the project has no dependencies), and the Node 22.18 `imports`-map run that T085 schedules.

## 3. Findings

### 1. [High · Confirmed] The CLI silently does nothing on Node 23.6–24.1

`kiln/packages/cli/src/main.ts:41`

```ts
if (import.meta.main) process.exitCode = main(process.argv.slice(2));
```

`import.meta.main` exists from Node 22.18 and 24.2; it is **undefined** on 23.x and 24.0–24.1. `kiln/package.json` declares `"node": "^22.18.0 || >=23.6.0"`
(FR-002), so those versions are supported on paper.

**Reproduced** (same file, same arguments):

| Node | `import.meta.main` | `kiln check legacy` |
|---|---|---|
| 22.18.0 | `true` | `FAIL legacy — … check-not-registered`, exit 1 |
| 23.6.0 | `undefined` | **no output, exit 0** |
| 24.1.0 | `undefined` | *(same guard, same result)* |

Once checks are registered, `npm run check` on those versions would report success having run nothing — exactly the vacuous pass FR-018 and the
"never passes vacuously" responsibility of `checks/` forbid. The first program used the portable form
(`process.argv[1] === fileURLToPath(import.meta.url)`, e.g. `legacy/validate/firing-ready.ts:110`); the port departed from it.

**Fix** (either): use the legacy idiom in `main.ts` and in the CLIs of the coming `log.ts` / `roadmap.ts` (T020, T021), **or** narrow `engines` to
`^22.18.0 || >=24.2.0` and update FR-002/the spec. The first keeps the declared range honest and is two lines. Also extend T085 to run `check` on Node 23.6 and 24.1,
not only 22.18, and add a test that spawns the CLI with a command that must produce output.

### 2. [Medium · Confirmed] `weakerBindingRejected` counts any error as a rejection

`kiln/packages/contracts/src/roles.ts:20-27`

```ts
try { bindRole(role, weaker, roster, extraJudges); return false; } catch { return true; }
```

Any exception — not only the `G2/L1 config error` — makes it return `true` ("correctly refused"). The first program had the same shape, but its signature took no
roster; the new one does, so a wrong argument is now a realistic way to throw. **Reproduced**: passing a `FlowDefinition` instead of its `roster` made
`weakerBindingRejected` return `true` for all 48 combinations (12 roles × 4 tiers), including `strongest` and non-judge roles. The negative tests ported in T054
assert `weakerBindingRejected(...) === true`, so a mistaken call site would pass them.

**Fix**: throw a dedicated error class (or check the message prefix) in `bindRole` and rethrow anything else in the helper:

```ts
} catch (e) { if (e instanceof TierPolicyError) return true; throw e; }
```

Add a case to T054: a non-judge role, and an invalid roster, must not read as "rejected".

### 3. [Medium · Plausible] One `DEFAULT_FLOW` for two meanings, and a task order that flips it under `log.ts`

`kiln/packages/contracts/src/flow/index.ts:9, 27, 31, 35` · `tasks.md` T021, T050, T052

The contract has two defaults: `moveVocabulary(gate, flow?)` defaults to `CURRENT_FLOW` (**v2**, for new work) while a *record* that names no flow means
`DEFAULT_RECORD_FLOW` (**v1**, history). The code has one constant, `DEFAULT_FLOW = "v1"`, used for both. T021 ports `log.ts` using "`moveAllowed`, v1 default";
T050 then flips the default to v2; only T052 (after T050) makes `log.ts` pass the flow explicitly. Between T050 and T052 — and for any T021 call site T052
misses — the validator would check **committed history against v2**, whose move sets are a superset of v1's. A `gate: 6, move: "revise"` record would then
*pass*; nothing fails loudly, and the committed r7 walks (which pass under both) would not reveal it.

**Fix**: in T021, call `moveAllowed(gate, move, "v1")` explicitly; in T050, split the constant as the contract does and keep `DEFAULT_RECORD_FLOW` as the only
default `record` reads; add the F5 test (revise fails under v1) in the same commit as T021 rather than T055.

### 4. [Low · Confirmed] Prototype keys resolve in the flow lookups

`kiln/packages/contracts/src/flow/index.ts:14, 20`

`flows` and `GATE_KEY_OF` are plain objects. `flowOf("toString")` returns a function instead of throwing `unknown flow`, and the next access then fails with a
`TypeError` rather than a named error. Once T052 reads `record.flow` from log JSON, a record carrying `"flow": "constructor"` would crash the validator unless
the schema enum runs first. **Fix**: `Object.hasOwn(flows, version)` (and the same for `GATE_KEY_OF`), or `Map`s. Cheap, and it keeps "every failure is named".

### 5. [Low · Confirmed] No tests for Phase 2, no runner, and F3 as written needs legacy data

- Phase 2 added ~230 authored lines (and ~410 copied) with **no test**: `flowOf`, `moveAllowed`, `bindRole`, `runChecks`, `main`'s exit codes and usage errors are
  unexercised in the repository. The review's parity script covers them once; it lives in `/tmp` and will not survive. The tests arrive with US1/US2/US3, but
  until then `npm test` in `kiln/` is `MODULE_NOT_FOUND` and `plan.md`'s "each phase leaves the repository green" holds for `legacy/` only.
  **Suggestion**: land T031 (runner) with the first new tests, and add a small `main` test (exit 2 on a bad name; exit 1 on an unregistered check) in T019's place.
- Contract row **F3** says v1 must equal "the first program's `MOVE_VOCABULARY`, key for key". New code may not import `legacy/` (NC2-A, boundaries), so T053 has
  nothing to compare to. Options: parse the object literal out of `legacy/contracts/move-vocabulary.ts` as text (as T044 does for the Pi list), or commit a snapshot
  literal in the test. Decide before T053; the parity script of this review is the reference for what to assert.

### 6. [Info] Cosmetics and interim state

- Copied files keep headers that now mislead: `report.ts` ("kiln/validate/_report.ts — T006 … Consumed by log.ts / roadmap.ts / firing-ready.ts"), `clock.ts`
  ("kiln/src/clock.ts — T004"), `types.ts` ("kiln/src/types.ts … schemas in kiln/schemas/"). They are byte copies by design (T015–T017), so the comments will
  be fixed only if the "copy" rule is relaxed; the `legacy-copies.json` record (T037) is what ties each to its origin.
- `clock.ts` and `types.ts` carry irregular indentation inherited from the originals; `legacy`'s tsconfig whitespace differs from the new one — no effect.
- The ten `kiln.json` files store the em dash as `—`; valid, but less readable than the literal.
- `CheckName` lists `network` / `boundaries` / `legacy`, so usage text advertises checks that currently fail with `check-not-registered`. Fail-closed is right; the
  code `check-not-registered` is not in `cli-check.md`'s failure list and should be added there (and the `Partial` type noted against T018).
- `main.ts` renders `FAIL <name> — …` itself and imports only `PASS` from `report.ts`; T019 says it uses the report formatter. The output matches the contract's
  example, so this is a wording gap in the task, not a defect.
- `README.md` still says `cd kiln/kiln` and lists legacy-only scripts; `kiln/package.json` scripts point at files that do not exist yet. Both are scheduled
  (T078; US1–US2) and are noted here so they are not mistaken for regressions.

## 4. Checked and found correct

| Claim | Evidence |
|---|---|
| The move changed nothing | `HEAD:legacy` tree = `299b0a5:kiln` tree = `20a82c7e…`; 168 renames at 100 % |
| `legacy/` is never edited | tree id equal; zero commits touch `legacy/` content after the move |
| Legacy suite is green | 500 tests · 470 pass · 0 fail · 30 skipped (`KILN_PI=0`); working tree clean afterwards |
| Both schemas, `_core`, `_report`, `clock` are exact copies | `cmp` identical |
| `types.ts` differs only by its import line | `diff`: 1 line |
| Flow v1 equals the first program | 0 mismatches: 10 gates in order, plain names, move sets, `moveAllowed(…, "revise")`, 4 judges, producers, mitigation cap 2 |
| Every v1 move is in the closed set | `MOVE_KINDS` check, 0 outside |
| `bindRole` behaves as legacy | 12 roles × 4 tiers equal; message wording matches data-model §3 (`judge role "…"`), which keeps the substrings the old tests assert |
| Unknown gate id throws a named error | `moveVocabulary(10)` → `unknown gate id: 10` |
| `contracts` is I/O-free | no `node:` import; no import of `record`, `lane` or `legacy` |
| No dependency, no bare specifier | `package.json` `dependencies` empty; all specifiers relative, `#…` or absent |
| `kiln check` usage errors | unknown name / flag / command → stderr + exit 2; fail-closed on an unregistered check; runs from other working directories |
| FR-021 | `git diff main -- specs/ROADMAP.md` empty |

## 5. Recommended order of fixes

1. Finding 1 now (two lines; blocks every later entry point).
2. Finding 2 and 4 with the first contracts test file (T054 / T053 are the natural place).
3. Finding 3 inside T021 and T050 — edit the task text so the order cannot be followed wrongly.
4. Finding 5: decide F3's source of truth before T053; add the `main` exit-code test with the first runner (T031).

None of the findings changes the plan's architecture or the spec; 1 and 3 change a task's wording or a Node-range statement.

## 6. Addendum 2026-10-25 — review of the twelve-gate amendment

The amendment touched three completed files. Re-checked: v1/legacy parity still 0 mismatches; `bindRole` and the finding-2 and finding-4 fixes unchanged; `contracts`
remains I/O-free with no new import; `hasGate` and `moveAllowed` fail closed for a gate a flow lacks, and an id that is no gate still throws a named error. **One thing to watch
in US3:** the copied factory-log schema still admits only `gate0` and 1…9 until T051, so a v2 record naming `"2a"`/`"6a"` is rejected by the schema, not G3, until then (T051 is
before T052/T055 in the task order, which is why no change is needed).
