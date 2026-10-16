# Baseline — recorded before r9 implementation (T001)

**Recorded**: 2026-09-24 · **Base commit**: `a9067f1` (roadmap: close r8 at the Gate-0 seam; r9 admitted next)

## `cd kiln && npm test`

```
tests 376
pass 356
fail 8
cancelled 0
skipped 12
todo 0
```

**Not** the "376 tests, 0 fail" checkpoint r8's own close-out recorded. The 8 failures are **all** `PI-LIVE:` tests in
`tests/pi/pi-live.test.ts`, and are **pre-existing environment drift, unrelated to r9**:

- The `pi` binary on this machine's `PATH` reports version `0.87.0`.
- `kiln/validate/_pi-driver.ts`'s `MEASURED_PI_VERSIONS` (an r8-owned, canonical, MUST-NOT-MODIFY constant — tasks.md's own list) is still
  `["0.85.1"]`.
- Every live-Pi check in `PiReady` short-circuits at `pi-version-unmeasured` before it reaches the checks r9 would otherwise exercise, so
  the 8 failures are all `AssertionError` on `[{"code":"pi-version-unmeasured", ...}]` or a downstream `check f ran` assertion that never got
  the chance to run.
- This is **exactly** the kind of drift `docs/keybindings.md`'s own "Pi is pre-1.0 and moving" caution (research D10, r8's own lesson)
  anticipates. r9 does not touch `_pi-driver.ts` (canonical, unmodified) and does not attempt to fix this — it is out of scope for this row
  (bumping `MEASURED_PI_VERSIONS` to include `0.87.0` needs its own measurement pass across everything r8 already proved against `0.85.1`,
  which is not r9's job).
- **Consequence for r9's own `UiReady` probe (Phase 7)**: `ui-ready.ts` does **not** call `checkPiReady()` as a gate (contract `ui-ready.md`
  U1: "composes on `PiReady`... it does not re-prove that") — it drives its own `RpcSession` calls directly, the same low-level primitives
  `_pi-driver.ts` exports, so it is not blocked by the version check. `UiReady`'s own acceptance is unaffected by this drift.
- **Consequence for T009/T035** ("full suite green, matching T001's baseline"): the target baseline for r9's own new work is **356 pass / 8
  pre-existing fail / 12 skip**, plus r9's own new tests, all passing. A regression is a **new** failure beyond these 8 named,
  already-failing `PI-LIVE:` tests — not the pre-existing 8 themselves.

## `npm run validate:roadmap -- ../specs/ROADMAP.md`

```
PASS
```

## `npm run pi-ready`

**FAIL** — `pi-version-unmeasured` (reported=0.87.0, measured=[0.85.1]). Same root cause as above; not a regression introduced here.

## `pi --version`

```
0.87.0
```

(Not `0.85.1` as r8's plan.md/research.md recorded — see above.)

## T035 — full validation, after implementation

```
npm test              -> 491 tests, 468 pass, 8 fail (the SAME 8 pre-existing PI-LIVE version-drift failures above — 0 new), 15 skipped
                          (12 pre-existing + 3 new: tests/pi/ui/untouched.test.ts, not-yet-pinned per r7/r8's own deferred-pin pattern)
validate:roadmap       -> PASS
runtime-ready          -> READY
overlay-ready          -> READY
live-ready             -> READY
ollama-ready           -> READY
pi-ready               -> FAIL pi-version-unmeasured (unchanged, pre-existing — see above)
ui-ready               -> READY (all 8 checks a–h pass, real Pi 0.87.0, RPC); the three falsify hooks
                          (--no-identity, --gate0-vocabulary-leak, --overlay-not-exclusive) each fail with exactly their named code
```

**0 new failures beyond T001's own baseline.** The row's own new suite (`tests/pi/ui/`, 113 tests: 110 pass, 3 skipped pending the
close-out commit pin) is entirely green.

## T002 — the three chosen shortcuts, re-confirmed against the actually-installed Pi

`alt+g` / `alt+m` / `alt+/` (research D10) checked against
`~/.local/lib/node_modules/@earendil-works/pi-coding-agent/docs/keybindings.md` as shipped with the **installed** Pi (`0.87.0`, newer than
the `0.85.1` the plan measured against) — every table in that file was read in full. **No conflict**: none of the three appears as a
default binding for any action in this newer doc either (`grep -in "alt+g\|alt+m\|alt+/"` over the file returns nothing). The keymap
re-decision (D10/FR-007) stands unchanged; no re-pick needed.
