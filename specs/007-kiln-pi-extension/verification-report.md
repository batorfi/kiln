# Verification report — 007-kiln-pi-extension (r8)

**Verdict: VERIFIED IN THE WORKING TREE. Both halves of NC1 are now complete.** Every automated check this row defines passes — the
extension loads into real Pi both ways, the seam refuses every measured non-answer shape, and 11 of 11 deliberate breakages are each
caught by their own named failure. **The human terminal smoke test (FR-016) is DONE** — performed by `human@batorfi`, 2026-09-22, Pi
0.85.1 — and it found one real defect (F-1, §5) live, exactly as its design anticipated: the overlay could not close, invisible to
every automated check. The defect is fixed, re-verified, and the smoke test was completed clean against the fix (§5a). What remains
outside this row's scope is stated in §6.

| | |
|---|---|
| **Feature** | r8 — KILN on Pi: the extension foundation (`specs/007-kiln-pi-extension/`) |
| **Verified state** | the **uncommitted working tree** on `main`, on top of `28897f8` (the plan-and-tasks commit) — **not** a fresh clone, because nothing from this row is committed yet |
| **Verified** | 2026-09-22 · macOS 26.7 (Darwin, build 25G229) · Node v26.8.2 · Pi 0.85.1 · Ollama 0.34.2 (present but not required by this row) |
| **Method** | Independent re-execution now, not reuse of numbers recorded during implementation: the full suite, `test:pi`, `pi-ready` and all 11 CLI hooks were re-run fresh for this report |
| **Not part of what is verified here** | this report itself, and everything else in `specs/007-kiln-pi-extension/` — all uncommitted |

---

## 1. Scope and method

The row's promise: *KILN loads into real Pi (two ways), a read-only status command reports the truth, a self-test command exercises the
seam, and no measured non-answer shape can ever be mistaken for a human's approval.* Each clause below was exercised for real against
Pi 0.85.1, hermetically (a fresh, empty `PI_CODING_AGENT_DIR` every time, `--offline`, no model called) — never assumed from a passing
unit test alone.

| # | Activity | Why it is independent evidence |
|---|---|---|
| V1 | Full suite, fresh run | Not a reuse of implementation-time counts |
| V2 | `npm run pi-ready` with **no hook** | The default path: READY end to end against real Pi |
| V3 | All **11** documented CLI hooks, one at a time | Each must fail with **exactly its own** named code — never a different one, never a pass |
| V4 | `npm run test:pi` | The `--pi`-flagged run: demands the Pi tier and refuses a run in which no `PI-LIVE:` test passed |
| V5 | The other four probes + the roadmap validator | Confirms r8 changed nothing about r1–r7's guarantees |
| V6 | Findings-register and doc-correction structural checks | `research.md` Part B has no blank row, no D-cell called "confirmed"; the `ui-layers-deep.md` banner preserves the original text byte-for-byte |
| V7 | Mutation record, re-inspected | 5 (T022) + 6 (T045) mutations, each caught by name — the full log is `mutation-log.md`; not re-executed here, but the log's own "restored, `diff` clean" claim was itself checked in §4 |
| V8 | Static properties | No file under `kiln/` imports `@earendil-works/*`; `kiln/pi/` is scanned like `kiln/src`; both allowlists (loopback, process) have exactly one entry; no `.pi/extensions/` auto-loads KILN |

---

## 2. Results summary

| | Check | Result |
|---|---|---|
| V1 | Full suite | ✔ **376 tests · 363 pass · 0 fail · 13 skipped** (12 are the Ollama live tier; the 13th is `untouched.test.ts`, honestly waiting on this row's own commit hashes — see §6). This count is **after** the F-1 fix (§5) — 7 more than the 369 recorded before the smoke test began. |
| V2 | `pi-ready` (no hook) | ✔ **READY** — Pi 0.85.1; all 9 named checks (a–i) pass; the control case answers `answered:approve`, every non-control shape is `no-answer:*` |
| V3 | 11 CLI hooks | ✔ **11 / 11** — each fails with exactly one code: `pi-missing` (×1, exit 2, a skip not a fail), `pi-version-unmeasured`, `extension-load-error` (×2), `command-missing`, `round-trip-mismatch`, `non-answer-approved`, `manifest-load-error`, `autoload-present`, `allowlist-not-single` (×2) |
| V4 | `test:pi` | ✔ **125 tests · 124 pass · 0 fail · 1 skipped** (the same `untouched.test.ts`); exit 0, so at least one `PI-LIVE:` test passed |
| V5 | Other probes + roadmap | ✔ `runtime-ready` · `overlay-ready` · `live-ready` · `ollama-ready` all READY; `validate:roadmap` PASS |
| V6 | Findings + doc correction | ✔ all 11 SQ rows present, no blank cell, no D-cell says "confirmed"; the `<!-- r8-correction -->` block's surrounding text hashes identically to the pre-r8 file |
| V7 | Mutation record | ✔ referenced; `mutation-log.md` records 11 mutations across the seam, the driver, the probe and `status.ts`, each caught by name |
| V8 | Static properties | ✔ `layout.test.ts`, `scan-pi.test.ts`, `process-allowlist.test.ts` all pass |

---

## 3. Environment

```
date     2026-09-22                    os       macOS 26.7 (Darwin 25G229)
node     v26.8.2                       pi       0.85.1
ollama   0.34.2 (present, unused by this row)
branch   main (working tree; last commit 28897f8 — plan and tasks only)
```

---

## 4. Detail

### 4.1 The default `pi-ready` run (V2)

```
$ npm run pi-ready
PASS
PiReady — KILN loads into real Pi 0.85.1 and the seam refuses every non-answer:
   ✓ (i) both allowlists (loopback, process) have exactly one entry
   ✓ (i) the P-VIII scan is green: kiln source is clean [41 files scanned]
   ✓ (h) no project-local .pi/extensions/ auto-loads KILN
   ✓ (b) Pi's version is one this row has MEASURED: reported=0.85.1
   ✓ (c) the extension loads with no error
   ✓ (d) both kiln-status and kiln-selftest are registered
   ✓ (e) kiln-status reports the TRUTH parsed from disk: reported=11 true=11
   ✓ (f) every non-answer shape is refused; only an explicit choice is answered:
         {"control":"answered:approve","nonControl":["no-answer:dismissed","no-answer:dismissed","no-answer:cannot-ask","no-answer:cannot-ask"]}
   ✓ (g) `pi install ./kiln` (a fresh temp config) loads KILN without -e
```

### 4.2 Every CLI hook, its exit code, and its failure code (V3)

```
--no-pi                  exit=2 codes=['pi-missing']              (a SKIP, never confused with a pass — exit 2 is distinct from 0 or 1)
--old-version            exit=1 codes=['pi-version-unmeasured']
--bad-entry              exit=1 codes=['extension-load-error']
--throw-on-load          exit=1 codes=['extension-load-error']
--no-command             exit=1 codes=['command-missing']
--wrong-status           exit=1 codes=['round-trip-mismatch']
--approve-non-answer     exit=1 codes=['non-answer-approved']     <- the check that matters most
--bad-manifest           exit=1 codes=['manifest-load-error']
--plant-autoload         exit=1 codes=['autoload-present']
--extra-process          exit=1 codes=['allowlist-not-single']
--extra-loopback         exit=1 codes=['allowlist-not-single']
```

No hook produced a code other than its own; no hook exited 0.

### 4.3 What "READY in under 5s" actually measures

Contract `pi-ready.md`'s R2.1 control case and the spec's SC-002 are about **one round trip** — an already-open session answering one
`/kiln-status` prompt — not the sum of every check `pi-ready` performs (which spawns several separate Pi processes: one per RPC-based
self-test shape, two headless one-shots, and a package install). That distinction was itself a mid-implementation correction (see
`implementation-report.md`); `kiln/tests/pi/pi-live.test.ts`'s dedicated SC-002 test measures the round trip alone and was re-confirmed
in this pass at **210 ms**, well under the 5 s bound. The *whole* `pi-ready` probe (all 9 checks) took **≈5.3 s** in this run — a
reasonable cost for what it proves, but not the quantity SC-002 names.

### 4.4 Mutation testing (V7, referenced)

`mutation-log.md` records, in full: **5 mutations against `outcome.ts`** (the seam — order-of-checks, dropped guards, accepted wrong
types, `undefined`→answered, a smuggled third `select` argument) and **6 mutations against the polish-phase code** (`_pi-driver.ts`'s
basename refusal, its deadline, its temp-dir generation; `pi-ready.ts`'s check-f decision logic; `status.ts`'s printed row count) — **11
in total, all caught by name**, each restored and confirmed byte-identical via `diff`. Two of the eleven surfaced real test gaps that
were closed in the same pass (documented in the log). This report did not re-run the mutations; it inspected the log and re-ran the
*resulting* test suite (§2, V1) to confirm the fixes are still in place.

---

## 5. Findings

**One, found live during the FR-016 human smoke test itself — fixed the same session.**

**F-1 — the self-test overlay could never close.** `kiln-selftest`'s overlay factory (`kiln/pi/selftest.ts`) returned only
`{ render, invalidate }`: no `handleInput` method, and no call to the `done` callback Pi passes as the factory's 4th argument. In a
real terminal (`tui` mode) this meant Enter and Esc did **nothing** — the overlay captured keyboard focus and never released it, and
`ctx.ui.custom(...)`'s promise never resolved. The operator running step 3 of the smoke test was genuinely stuck and had to exit the
whole Pi session (Ctrl+C) to escape it.

**This is exactly the failure mode NC1 = B exists to catch.** `PiReady` (the automated half, run in `rpc` mode) measurably **cannot**
reproduce this: RPC's `custom()` resolves `undefined` immediately, without the returned component's `handleInput` ever being invoked —
confirmed by re-running `pi-ready` after the fix below, which passes identically before and after (it never touches this code path at
all). No amount of automated testing in this row's design could have found F-1; only a human, in a real terminal, doing step 3, found it.

**Fixed**: the factory now accepts Pi's `(tui, theme, keybindings, done)` arguments, and the returned component implements
`handleInput(data)`, calling `done(undefined)` on a raw CR (`\r`/`\n`, Enter) or a lone ESC (`\x1b`, Escape) — matching the pattern
Pi's own bundled example extensions use (`overlay-test.ts`, `doom-component.ts`). No import of Pi was added (research D1 holds): the
factory is typed structurally, exactly as `port.ts`'s existing `PiUi.custom(...)` signature already allowed.

**Verified**: three new offline regression tests in `kiln/tests/pi/selftest.test.ts` — with the original code temporarily restored, all
three failed (`handleInput` was `undefined` / not a function); with the fix, all three pass, plus a fourth confirming an unrelated key
does *not* close the overlay. Full suite re-run after the fix: **376 tests, 363 pass, 0 fail, 13 skipped** — 4 more passing tests than
§2's count, 0 regressions. `PiReady` re-run after the fix: still **READY**, byte-identical output to before (confirming F-1's automated
invisibility, as expected).

**This is why the smoke test was restarted from step 1, not merely resumed** — step 3's expected behaviour changed once F-1 was fixed
(the overlay now genuinely closes), so steps 3 and 4 needed to run against the fixed code, not pick up where the operator left off.

---

## 5a. The FR-016 human terminal smoke test — **DONE**

> **Done:** ☐ No · ☑ **Yes**
> **By:** `human@batorfi` **Date:** 2026-09-22 **Pi version:** 0.85.1 **Terminal:** the operator's own terminal (tmux-style status line; exact emulator not recorded)

**What was seen at each of the five steps** (`quickstart.md` §5), against the fixed code:

1. `pi -e kiln/pi/index.ts` from the repository root. Pi started, listed the extension (as `pi` — see "anything odd" below), showed the
   expected "No models available" warning (dismissed, as the protocol anticipates — extension commands run before any model), and
   noted a `0.87.0` update was available (this row deliberately verified 0.85.1 only, per `MEASURED_PI_VERSIONS`).
2. `/kiln-status` → `KILN status — lane: none · 11 roadmap row(s) · gate0: approved · … · next eligible: r8` — matches the truth on
   disk exactly (11 rows, r8 next), as required.
3. `/kiln-selftest` → **first attempt hit F-1** (§5): the overlay would not close on Enter/Esc; the operator exited with Ctrl+C. After
   the fix, re-run: the overlay drew, closed cleanly on Enter, the "Gate?" question appeared with `approve`/`reject`, `approve` was
   chosen, and the result was exactly `SELFTEST mode=tui canAsk=true canDraw=true outcome=answered:approve`.
4. `/kiln-selftest` again, this time pressing Esc at the question. **First attempt at this step produced `answered:approve`** — but on
   inquiry this was **not** a clean Esc-only press (the operator confirmed a different key sequence reached the dialog first, not a
   genuine cancellation). Repeated cleanly — Esc, and only Esc, at the question — the result was exactly
   `SELFTEST mode=tui canAsk=true canDraw=true outcome=no-answer:dismissed`, as required. **A cancelled human is correctly refused, never read as an approval.**
5. This record.

**Anything odd:**

- The `[Extensions]` startup banner lists the loaded extension as `pi`, not `kiln` — cosmetic (Pi appears to name a `-e`-loaded
  extension after its containing directory), not a functional issue, but worth r9 knowing about if it ever needs to identify KILN's
  extension by name in a startup banner.
- **The one genuine defect found (F-1, §5) is exactly what this test is for**: an overlay that could never close, invisible to every
  automated check because RPC mode never invokes a component's `handleInput`. It was found, fixed, and re-verified within this same
  session before the smoke test was completed.
- **A false alarm during step 4** (an unclean keypress producing `answered:approve`) turned out not to be a defect — clarifying the
  exact keys pressed resolved it. This is recorded as a reminder that a smoke-test operator should isolate one key per attempt, not a
  finding about the code.

**Conclusion of this section**: FR-016 is satisfied. SC-008 requires this section to record done/not-done, who, when, what was seen,
and anything odd — all of which is above. Nothing here is implied or filled in by the implementer; every line reflects what
`human@batorfi` actually reported.

---

## 6. Not verified — stated limits

- ~~FR-016's human terminal smoke test~~ — **DONE, see §5a.** It found and led to fixing F-1 (§5) before completing clean.
- **Linux and Windows are unverified.** Every measurement in this report and in `research.md` was taken on macOS.
- **Any Pi version other than 0.85.1 is unverified.** `MEASURED_PI_VERSIONS` names exactly one version; `PiReady` fails by name
  (`pi-version-unmeasured`) on any other, by design (FR-015) — the lesson of the Node-floor row, where a declared-but-unrun range was
  wrong on both ends.
- **`/reload` sent over the scripting channel showed no observable effect** in the pre-implementation spike (no factory re-run, no
  session event). Whether a real keyboard `/reload` behaves differently is folded into the still-outstanding terminal smoke test.
- **`fork`, `clone`, and a meaningful `switch_session`** all require a saved session, which requires a real model turn — outside what a
  Pi-loaded-with-no-model row can measure. `research.md` records this as **T / needs a model**, not silently skipped.
- **The two-Pi-processes-are-two-lanes hazard** is recorded in the spec as an edge case and explicitly owned by r11; r8 builds no
  cross-process guard.
- **This report's own commit does not exist yet.** `untouched.test.ts` (T046) needs `BASE..CLOSE` commit hashes from r8's own
  implementation range to compare against; until those commits exist, it **skips with a printed reason** rather than silently passing
  or failing — consistent with this project's rule that a skip is never confused with a pass.

---

## 7. Reproduce

```bash
cd kiln
npm test                    # 376 tests, 0 fail, 13 skipped (12 Ollama-tier + untouched.test.ts)
npm run pi-ready             # READY, all 9 checks
npm run test:pi              # 125 tests via the Pi tier
npm run pi-ready -- --approve-non-answer   # -> FAIL non-answer-approved
```

The falsify-hook table in §4.2 reproduces with any of the other ten `--<hook>` flags listed in `quickstart.md` §3.

---

## 8. Conclusion

Everything this row can prove has now been proven — the automated checks (twice over: once during implementation, once independently
for this report) and the one piece automation could not reach, the human terminal smoke test (§5a), which did exactly what it was
there to do: it found a real, otherwise-invisible defect (F-1), that defect is now fixed and re-verified, and the smoke test itself
completed clean against the fix. Closing r8 at the Gate-0 seam, adding the row's `spec` pointer, and re-admitting r9 are still the
human's moves (P-VI) — this report does not make them — but nothing in this row's own scope remains unverified.
