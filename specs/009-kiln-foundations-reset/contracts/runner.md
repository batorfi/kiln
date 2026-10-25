# Contract: the test runner and the Pi tier

**FR-003, FR-005, FR-006** · **Spec**: US1, US2 · **Data**: [../data-model.md](../data-model.md) §10 · **Decision**: [../research.md](../research.md) R11

## Usage

```text
node tests/run.ts [--new-only | --legacy-only] [--live] [--cost] [--serial] [--pi] [paths…]     # from kiln/
npm test                  # = node tests/run.ts          (new suite, then the legacy suite)
npm run test:new          # = node tests/run.ts --new-only
npm run test:legacy       # = node tests/run.ts --legacy-only
```

Also accepted: `--legacy-only` (exclusive with `--new-only`). Any other flag is a usage error (exit 2), never silently ignored. Works from any working directory (it resolves everything from its own location). `paths` restrict the **new** suite (relative to `kiln/`); the legacy suite runs
whole unless `--new-only`. `--live`, `--cost`, `--serial` and `--pi` are passed to the legacy runner unchanged — the new suite has no live tier yet.

## What it runs

| Suite | Discovery | Launched as |
|---|---|---|
| new | `packages/*/tests/**/*.test.ts`, `checks/tests/**/*.test.ts`, `tests/**/*.test.ts` (not the runner's own fixtures) | `node --test` child, `cwd = kiln/` |
| legacy | the first program's whole `tests/**/*.test.ts` | the frozen `legacy/tests/run.ts` as a second child, `cwd = legacy/` |

Each suite is held to the first program's rule: **a suite that executed zero tests fails** (`FAIL — the run executed ZERO tests …`), so a mistyped path or an
empty glob cannot pass silently. The exit code is non-zero if either suite fails. A one-line summary is printed at the end: `new: N tests · legacy: M tests`.

## The Pi tier decision (US2, FR-006)

Computed once, before the legacy suite starts, by the pure function `decidePiTier` ([data-model §10](../data-model.md)):

| Situation | Decision | Observable |
|---|---|---|
| `--pi` given, or `KILN_PI=1` | leave | the tier is demanded: tests run; on an unmeasured Pi they **fail by name** (`pi-version-unmeasured`) |
| `KILN_PI=0` | leave | already off; nothing extra printed |
| no `pi` binary found (`KILN_PI_BIN` or `pi`) | leave | the legacy gate skips with its own reason, as today |
| installed version ∈ measured list | leave | the tier runs as before |
| otherwise (an unmeasured version) | **switch off**: `KILN_PI=0` for the legacy child | one line: `live-Pi tier skipped: Pi 1.1.0 installed, measured [0.85.1]`; every live-Pi test is reported as skipped, none fails |

The legacy files are not touched: the legacy Pi gate already honours `KILN_PI=0` with a printed per-test reason.

**The measured list** is the constant `MEASURED_PI_VERSIONS` in `kiln/tests/measured-pi.ts`. A test asserts it equals the constant in `legacy/validate/_pi-driver.ts`
by reading that file's text (new code may not import legacy). When a later chore re-measures Pi 1.1.0, both lists change in one commit and the equality test keeps them honest.

**Test seam.** `KILN_LEGACY_RUNNER=<path>` replaces the frozen legacy runner with a probe, so the runner's own tests can observe the environment and arguments the legacy child receives without running 500 tests. It is for those tests only. A runner started inside a test strips `NODE_TEST_CONTEXT` (a nested `node --test` would otherwise print no summary and read as "zero tests").

## Required behaviours (each is a test)

| # | Given | Then |
|---|---|---|
| R1 | `decidePiTier` with each row of the table above | returns the decision shown (pure, no process spawned) |
| R2 | a stub `pi` script printing `1.1.0` on `KILN_PI_BIN` | the runner prints the skip line once and starts the legacy child with `KILN_PI=0` |
| R3 | the stub printing `0.85.1` | the legacy child's environment is unchanged |
| R4 | `--pi` and the stub printing `1.1.0` | `KILN_PI` is not switched off; the legacy runner's `--pi` rule applies |
| R5 | a path matching no new test | the new suite fails with the zero-tests message |
| R6 | the measured lists | the new constant equals the legacy one |
| R7 | `npm test` on this machine (Pi 1.1.0) | exit 0; 0 failures; the skip line appears once |
