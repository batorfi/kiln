# Code Review Report — r9 (KILN's real UI on Pi)

**Trace**: [tasks.md](./tasks.md) T038/T039 · [implementation-report.md](./implementation-report.md).

Run via the project's `/code-review` skill at `high` effort against the full diff this row introduces, with particular attention
(per T038) to the identity check's ordering, the mutual-exclusion guard's edge cases, and whether `renderOverlay`'s column-width
change could regress an uncovered fixture. Four findings surfaced; all four were triaged, three fixed, one deliberately left
unfixed with reasoning recorded below. **A fifth finding (0) surfaced afterward**, during the human's own first real-terminal
session (`quickstart.md` §5) — the human smoke test doing exactly the job it exists to do.

### 0. `keys.ts`'s `registerShortcut` call used the wrong argument shape — **FIXED**

**File**: `kiln/pi/ui/keys.ts`. Found while building a smoke-test harness for the human terminal session (not by the automated
`/code-review` pass above — RPC has no shortcut-firing channel at all to exercise this code path, confirmed by grepping
`docs/rpc.md` for any mention of "shortcut": none). `ShortcutApi.registerShortcut(key, handler)` called Pi's real
`registerShortcut` with a bare callback as the second argument; Pi's actual signature (measured against its own bundled
`preset.ts`/`plan-mode/index.ts` examples) is `registerShortcut(key, { description?, handler: (ctx) => ... })` — an OPTIONS
OBJECT. Calling the real API this way would have silently failed (Pi reading `.description`/`.handler` off a bare function,
both `undefined`) the first time anything actually invoked `registerKeys()` against a real `pi` object — which is exactly what
this row's own `keys.test.ts` never did, because its fake `pi.registerShortcut` mirrored the SAME wrong assumption instead of
Pi's real one. The identical failure shape as the `setStatus`/`notify` bug (deviation 2, `implementation-report.md`): a fake
built from an unverified assumption cannot catch that assumption being wrong. **Fix**: `ShortcutApi` and `registerKeys()`
corrected to the real options-object shape; `keys.test.ts` rewritten so its fake matches Pi's real call convention (and passes
a `ctx` argument to each handler, since Pi always does) rather than the code under test's own prior assumption. Re-verified via
a throwaway RPC harness (`specs/008-kiln-pi-ui/smoke-harness.ts`) that command registration, `setStatus`, and `notify` all still
work correctly after the fix; the fix itself could not be verified over RPC for the actual keypress path, since no RPC method
exists for it — that verification is the human smoke test's own job.

**Lesson worth generalizing**: this is the SECOND bug in this row found by exactly the same mechanism — a hand-written fake
that encodes the same wrong assumption as the code it's testing. Both `setStatus` and `registerShortcut` are Pi API calls this
row never ran against the real `pi` object until either `UiReady`'s own RPC check (for `setStatus`) or a human's real terminal
session (for `registerShortcut`) exercised them. Offline unit tests with hand-built fakes are necessary but not sufficient for
API-shape correctness against an external, evolving tool.

## Findings

### 1. `identity.ts`'s comment overclaimed equivalence with r1/r2's own checks — **FIXED**

**File**: `kiln/pi/ui/identity.ts`. The header comment said `resolveIdentity`'s `/^human@\S+$/` regex is "the SAME shape"
`applyMove`/`recordGate0Decision`/`resumeByToken` require. Measured: those three only check `decidedBy.startsWith("human@")` —
looser. `resumeByToken`/`recordGate0Decision` would accept the bare string `"human@"`; `resolveIdentity` correctly refuses it
(this is deliberate — data-model E3 declares the stricter regex). The comment was inaccurate, not the behaviour: a future
maintainer trusting the comment could "deduplicate" the checks and accidentally loosen `resolveIdentity` or drop a redundant-
looking check elsewhere. **Fix**: reworded the comment to state the real relationship (a strict subset of the same family, not
an identical check), pointing at `identity.test.ts`'s own explicit cross-check rather than re-asserting equivalence.

### 2. A test's title claimed a check its body no longer performed — **FIXED**

**File**: `kiln/tests/pi/index-exports.test.ts`. When extending r8's export-pinning test for r9's own nine additions, the r8-era
test ("r8 adds exactly the seam and PiReady value exports on top — nothing more, nothing unexpected") kept its old title but its
body was narrowed to only check for missing r8 exports — the "nothing more, nothing unexpected" half moved to the new,
r9-scoped test below it. A later maintainer trusting the old title could remove the newer, fuller check while "consolidating"
and never notice the stale one no longer covers what it claims. **Fix**: renamed the test to describe only what it now checks
("r8's declared additions are still present"); the "nothing unexpected" guarantee is documented as living in the r9-scoped test.

### 3. `presentOverlay`'s Gate-0 line swallowed a real, reachable "REOPENED" suffix into the formatted date — **FIXED**

**File**: `kiln/pi/ui/present.ts`. The header-wording regex for the `gate0 · status · decided_by · at` line used a greedy `(.+)$`
for the date capture. `kiln/ui/overlay.ts`'s real output appends `" · REOPENED at the inter-row seam"` when `gate0Open` is true —
a state `tests/inter-row/inter-row.test.ts` confirms is genuinely reachable (the inter-row seam re-opening Gate 0). No fixture in
`present.test.ts` had `gate0Open: true`, so this shape was untested and the greedy capture would have absorbed the REOPENED
clause into what the code presents as just "the formatted date." **Fix**: the date group is now non-greedy, with an optional
trailing REOPENED group captured and preserved verbatim (it is not one of FR-015(c)'s four declared header-wording
replacements, so P1's "no others" rule keeps it as-is, consistent with P4's degrade-gracefully contract). A `gate0Open: true`
fixture was added to `present.test.ts`'s shared `FIXTURES` array (so every generic test — P2's reconstruction, P4's
never-throws — now exercises it too), plus a dedicated regression test asserting the REOPENED clause survives, trailing and
unmangled.

### 4. `ui-ready.ts` spawns its Pi RPC sessions strictly sequentially — **REVIEWED, NOT CHANGED**

**File**: `kiln/validate/ui-ready.ts`. Each check opens its own hermetic `pi` child process; most checks are logically
independent of each other and could run concurrently via `Promise.all`, which would meaningfully cut `npm run ui-ready`'s
wall-clock time (each session costs several seconds). **Decision: left sequential.** Several checks (`checkApply`,
`checkNonAnswerApproved`, `checkNonAnswerShapes`, and the outer `checkUiReady` body itself) mutate the SHARED
`process.env.KILN_HUMAN` around their own session's spawn, relying on the fact that `RpcSession`'s constructor captures
`process.env` once at spawn time. Parallelizing these would race that shared mutable global — two checks needing opposite
`KILN_HUMAN` states could spawn concurrently and one would silently get the wrong identity, corrupting exactly the
control-vs-refusal distinction check (b)/(c) exist to prove. Fixing the race properly (e.g. threading `env` as an explicit
`RpcSession` constructor override instead of a global mutation) is a reasonable follow-up but is out of scope for this pass —
recorded here rather than silently deferred, per the project's own "no others" discipline against sneaking in unrelated
changes.

## Areas specifically re-checked per T038's own instructions, with no findings

- **The identity check's ordering** (must run BEFORE any move is applied, not just before the gate opens): confirmed in
  `runGateFlow` (`live-ctx.ts`) — `doResolveIdentity()` is called before the informational overlay is even drawn, and the
  `!identity.ok` branch returns via `headlessWait` strictly before `askGate` is ever invoked. Verified by the mutation pass
  (T017, `implementation-report.md`) and by `live-ctx-outcome.test.ts`'s dedicated "THE ROW'S ONE NEW REFUSAL" test.
- **The mutual-exclusion guard's edge cases**: re-walked `evictCurrent`/`runGateFlow`'s `cancelSignal`/`Promise.race` logic for
  a double-eviction (B evicts C evicts B again) and a same-layer re-raise mid-flight; both are covered by
  `mutual-exclusion.test.ts` and pass. The one known, honestly-documented limitation (a LATE answer to an already-evicted
  layer's dangling `select()` request has no effect, by construction, not by chance — confirmed live over real Pi RPC by
  `UiReady` check (f)) is recorded in `implementation-report.md`, not silently assumed.
- **`renderOverlay`'s column-width change regressing an uncovered fixture**: re-ran r2's own pre-existing
  `tests/overlay/overlay.test.ts` unmodified (still green) and checked `computeColumnWidths` against a one-row roadmap, a
  roadmap with `deps: []` on every row, and rows of wildly different `short`-field lengths — all covered by
  `overlay-columns.test.ts`, no regression found.

## Outcome

3 of 4 findings fixed; 1 reviewed and deliberately left, with reasoning recorded rather than silently skipped. Full suite
re-run after fixes: 492 tests, 469 pass, 8 fail (the same pre-existing `PI-LIVE:` version-drift failures throughout this report,
0 new), 15 skipped. `npm run ui-ready` re-confirmed READY against real Pi 0.87.0 after the `present.ts` fix.

### 0b. `registerKeys` could only be called from inside a handler — and shortcuts registered there never fire — **FIXED**

**File**: `kiln/pi/ui/keys.ts`. Found by the human terminal smoke test (not the automated review): `registerKeys` took a pre-built `LiveUICtx`,
which needs a `ctx`, which only exists inside a command/event handler — forcing every caller to register shortcuts dynamically after load, which
Pi accepts silently and never dispatches. Five keymap changes were wrongly made chasing this. **Fix**: `registerKeys(pi, makeLive, opts)` takes a
factory; registration needs no `ctx`; the `LiveUICtx` is built on the first press and memoized (a fresh one per press would reset
`OverlayState` and break mutual exclusion). `keys.test.ts` pins load-time registration, laziness and memoization. Same failure class as 0 and as
deviation 2: an assumption about Pi no offline fake could contradict.
