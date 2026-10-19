# Implementation Report — r9 (KILN's real UI on Pi)

**Trace**: [spec.md](./spec.md) · [plan.md](./plan.md) · [tasks.md](./tasks.md) (T001–T040) · [research.md](./research.md) ·
[data-model.md](./data-model.md) · [contracts/](./contracts).

**Status at this report**: implementation complete against the plan; **nothing is committed yet**. The row stays `queued` in
`specs/ROADMAP.md` — closing it, adding its `spec` pointer, and re-admitting r10 are the human's moves (P-VI), not this report's
(see [verification-report.md](./verification-report.md) and tasks.md T040's handback).

## What was built

- **`kiln/pi/ui/`** (new) — `present.ts` (the presentation wrapper, FR-015), `identity.ts` (`resolveIdentity`, NC1), `live-ctx.ts`
  (`makeLiveUICtx`, NC2 = A — the real `LiveUICtx` body), `keys.ts` (`registerKeys`, the shortcut-registration helper, FR-007).
- **`kiln/contracts/move-vocabulary.ts`** — one additive export, `GATE_NAME`/`gateName()` (research D3). Every existing export
  unchanged (`gate-name.test.ts` pins this).
- **`kiln/ui/overlay.ts`** — the one declared r1/r2 behaviour change (research D8): `rowLine`'s column widths are now computed
  from the row set before formatting, replacing hand-placed literal spaces. r2's own pre-existing overlay tests still pass
  unmodified.
- **`kiln/ui/keymap.ts`** — the three constant values changed (`M`/`g`/`?` → `alt+m`/`alt+g`/`alt+/`, research D10);
  `keymapIsConsistent()`'s shape is unchanged.
- **`kiln/validate/ui-ready.ts`** — the sixth probe (`UiReady`), composing on the same `RpcSession` primitives `PiReady` uses
  (not on `checkPiReady()` itself, per contract `ui-ready.md` U1). Eight named checks (a)–(h), three CLI falsify hooks.
- **`kiln/fixtures/pi/ui-ready-ext.ts`** and three mutant siblings (`ui-ready-no-identity.ts`, `ui-ready-gate0-leak.ts`,
  `ui-ready-not-exclusive.ts`) — fixture extensions `UiReady` drives, mirroring r8's `fixtures/pi/*.ts` pattern.
- **`kiln/tests/pi/ui/`** (new, 15 files) — foundational (gate-name, present, identity), US1 (live-ctx-status), US2
  (live-ctx-outcome, live-ctx-vocabulary, no-timeout, overlay-component), US3 (gate0-outcome, gate0-disjointness,
  gate0-plain-table), US4 (mutual-exclusion, keymap, keys), Phase 7 (ui-ready), Phase 8 (overlay-columns).
- **Nine additive value exports** from `kiln/index.ts`: `gateName`, `resolveIdentity`, `presentHud`/`presentPopup`/
  `presentOverlay`/`presentGate0Face`, `makeLiveUICtx`, `checkUiReady`/`reportUiReady` — pinned by an extension of r8's own
  `index-exports.test.ts` (77 + 7 + 9 = 93 total).
- **`kiln/package.json`**: one additive script, `"ui-ready"`.
- **`kiln/pi/README.md`**: r9's actual delivered homes replace r8's projection table entry for r9; the two corrections below are
  recorded there directly.
- **`README.md`** (repo root): `KILN_HUMAN` documented as required for answering a gate in Pi; `npm run ui-ready` added.
- **`specs/008-kiln-pi-ui/baseline.md`**: the pre-change baseline (T001) and the keymap re-confirmation (T002), including the
  Pi-version-drift finding below.

## Deviations from the plan, and why

1. **`port.ts` was NOT touched**, contrary to r8's own projection (`pi/README.md`, "port.ts gains the members r9 needs") and an
   early assumption in this row's own comments. `live-ctx.ts` and `keys.ts` each declare their own small, local structural types
   (`StatusUi`, `ShortcutApi`) for the two Pi methods `port.ts`'s canonical `PiUi` doesn't carry (`setStatus`, `registerShortcut`)
   — the same pattern `port.ts` itself uses for everything else. This keeps `port.ts` byte-for-byte unmodified, which is *safer*
   than the projection assumed, not a shortfall against it.

2. **`setStatus` maps to Pi's real `ctx.ui.setStatus(key, text)`, not `ctx.ui.notify`.** An early draft of this row (and of
   `pi/README.md`'s first pass) mapped Layer A's footer push to `output.ts`'s `emit()` (which uses `notify`), by analogy with
   `kiln-status`/`kiln-selftest`. Re-reading Pi's own `docs/rpc.md` while wiring `UiReady`'s check (a) surfaced that `setStatus`
   is a **distinct**, purpose-built fire-and-forget method ("Set or clear a status entry in the footer/status bar") — exactly
   what research D9 had actually decided ("Layer A uses `ctx.ui.setStatus`... not `ctx.ui.setFooter`'s custom-component path").
   Caught by `layout-note.test.ts`'s link/content checks failing during Polish, not by an earlier test — `live-ctx-status.test.ts`
   (T010) had been written and passed against the WRONG mechanism, because its own fake `ctx` never distinguished the two. Fixed
   in `live-ctx.ts`, and `live-ctx-status.test.ts` rewritten to assert `ctx.ui.setStatus` specifically; `ui-ready.ts`'s check (a)
   updated to wait for a `"setStatus"`-method UI event instead of `"notify"`. Re-verified against real Pi 0.87.0 after the fix —
   `UiReady` stayed READY. **Lesson, recorded for whoever reviews this row**: a fake `ctx` that implements every method the same
   way (all landing in one `notified` array) cannot catch a wrong-method call; the fix is a fake precise enough to distinguish
   `notify` from `setStatus` — which is what the rewritten test now does.

3. **Layer B/C's real decision is made via `askGate`/`ctx.ui.select`, not a custom-overlay's own list navigation** — a
   considered, documented departure from research D5's more aspirational framing ("the overlay IS the select," modelled on Pi's
   bundled `overlay-test.ts` example). Measured (M5, already known from r8, restated in `port.ts`'s own comment): `ctx.ui.custom()`
   resolves `undefined` with `handleInput` **never invoked** under `rpc`. Contract `ui-ready.md` U1 requires `UiReady` to run in
   RPC mode only; a decision mechanism built solely on `custom()`'s list navigation could never be proven by that probe. The
   `custom()` overlay is used only for the visible, dismiss-only card (mirroring r8's exact, already-tested `kiln-selftest`
   pattern); the actual choice goes through `askGate`, which **does** work over RPC (the same primitive `PiReady` itself already
   drives). T015's own test (`overlay-component.test.ts`) and its header comment record this decision explicitly.

4. **`keys.ts` is built but not wired into `pi/index.ts`.** `pi/index.ts` is r8-owned and canonical (the "MUST NOT be modified"
   list); it registers exactly two read-only commands and nothing else. Actually calling `pi.registerCommand`/`registerShortcut`
   with `keys.ts`/`live-ctx.ts` for a real, running lane is r11's job ("the director and commands," per `pi/README.md`'s own
   table) — r9 delivers a complete, tested unit (`keys.test.ts`) for that row to call, the same way r8 left three things
   explicitly for r9 in its own layout note.

5. **A pre-existing Pi-version drift, not caused by this row**: the installed `pi` binary reports `0.87.0`; `_pi-driver.ts`'s
   `MEASURED_PI_VERSIONS` (canonical, unmodified) still lists only `0.85.1`. `PiReady`/`pi-ready` fail with `pi-version-unmeasured`
   on this machine (8 pre-existing `PI-LIVE:` test failures, recorded in `baseline.md`, not touched by r9). `UiReady` does not
   depend on this gate (per U1) and is confirmed READY end-to-end against `0.87.0`. The three re-declared shortcuts were
   re-checked against `0.87.0`'s own shipped `docs/keybindings.md` — still no conflict (T002).

6. **Shortcuts registered inside a command handler never fire — the root cause behind five wrong keymap choices.** The first real
   terminal session found that `alt+g`/`alt+m`/`alt+/` did nothing (Option typed a literal `©`), then `ctrl+shift+b/m//`, `ctrl+f9/10/11`,
   `ctrl+shift+home/end/delete` and `ctrl+alt+r/m/t` each did nothing too — in two different terminals (cmux, Terminal.app). Each got a
   plausible encoding theory; all were wrong. The smoke harness had registered every shortcut from inside `/kiln-smoke-init`'s handler.
   A diagnostic registering a free single-modifier key (`ctrl+h`) both ways settled it: **in-handler registration never fires; load-time
   registration fires immediately.** Pi accepts the dynamic call without error, which is why RPC-based checks saw "registered" and
   nothing else could see "never dispatched".
   - **Fix**: `registerKeys` now takes a `makeLive(ctx)` factory instead of a pre-built `LiveUICtx`, so it can be called at extension
     load (no `ctx` exists yet). The `LiveUICtx` is built lazily on the first shortcut press and memoized — one shared instance, which
     mutual exclusion needs (a fresh instance per press would reset `OverlayState`). `keys.test.ts` pins both properties.
   - **Result**: with load-time registration, `ctrl+alt+r` (gate popup) and `ctrl+alt+m` (distinct Gate-0 face) fired in the human's
     terminal on the first try. `ctrl+alt+t` (dismiss) is registered the same way and awaits a human keypress.
   - **Kept / withdrawn**: bare `alt+<letter>` composing a special character in macOS terminals is independently real, so `ctrl+alt+` stays.
     The encoding theories for the other attempts are withdrawn — never tested against a correctly-registered shortcut. A premature
     explanation of "why ctrl+alt doesn't work" given mid-session was wrong for the same reason. See `research.md` D10.

7. **`keys.ts`'s `registerShortcut` call used the wrong argument shape**, found by building the human-smoke-test harness (not
   by the automated code review — RPC has no channel to exercise this path at all). Pi's real `registerShortcut(key, options)`
   takes an options object (`{ description?, handler: (ctx) => ... }`); `keys.ts` called it with a bare callback as the second
   argument. `keys.test.ts`'s own fake mirrored the same wrong shape instead of Pi's real one — the identical failure class as
   deviation 2. Fixed; see `code-review-report.md` finding 0 for the full writeup.

8. **Two defects found when the human could not pick `approve` (second smoke session).** (a) The dismiss-only card recognised only the
   legacy bytes `\r`/`\n`/`ESC`; Pi switches the terminal to the **Kitty keyboard protocol** when it is supported (Ghostty, hence cmux, does),
   and Esc then arrives as `ESC[27u` — the card could not be closed with Esc, the same bug class as r8's F-1. Fixed with `isDismissKey`
   (legacy bytes + CSI-u Enter/Esc/keypad-Enter, ignoring key-release and modified presses), pinned by new `overlay-component.test.ts`
   cases using the real escape forms. (b) A missing/malformed `KILN_HUMAN` skipped the move list **silently** — correct per L2 (no question
   without an identity) but a violation of FR-004's "refused with a *named* error": the operator could not tell "no identity" from "broken".
   `runGateFlow` now emits a visible message naming the reason and stating the gate is a durable WAIT; `UiReady` check (c) asserts it
   (verified against real Pi). Neither could be seen offline or over RPC (RPC never invokes `handleInput`; the identity message is only
   noticed by someone looking).

None of these change a functional requirement or a success criterion. (1) and (4) are scope clarifications; (2), (6) and (7)
are genuine bugs found and FIXED before commit — (6) and (7) specifically by the human terminal smoke test doing exactly the job
it exists to do; (3) is a documented, evidence-based design choice; (5) is environment drift outside this row's control,
explicitly out of scope to fix.

**A pattern worth naming**: three of the seven deviations above (2, 6, 7) are the SAME failure shape — an assumption about a
real Pi API's exact call convention or timing, encoded identically into both the implementation and its own offline test's fake, so the
test could not catch the assumption being wrong. Two were caught by things this row itself built (`UiReady`'s real-RPC check,
for 2) or by the human smoke test (6, 7) — none were caught by the offline unit-test layer alone. This is not a criticism of
offline testing (it caught everything else, including two multi-mutation guards) — it is a specific, narrow blind spot: a
hand-written fake cannot verify its own premise.

## The mutation record

- **T017** (the outcome table, `live-ctx.ts`'s Layer-B half): 5 mutations — (1) identity check moved to run after `applyMove`,
  (2) identity check dropped entirely, (3) a non-offered string mapped to `applyMove` anyway, (4) `applyMove` called twice for
  one answer, (5) `decidedBy` omitted — **all 5 caught by name** (mutations 3 was additionally caught by `applyMove`'s own
  defense-in-depth throw, a second, independent layer of protection). Each applied, confirmed failing, then reverted; the
  restored suite is green (85/85 in `tests/pi/ui/`, at the time of this pass).
- **T022** (the Gate-0/per-gate disjointness): 2 directions — a Gate-0 answer routed to `applyMove` (caught by the static test,
  `gate0-disjointness.test.ts`; the outcome test did not catch this direction, since it targets a different internal `Gate`
  object than the one the static test inspects by source) — and a per-gate answer routed to `recordGate0Decision` (caught by
  **both** the static test and the outcome table, `live-ctx-outcome.test.ts`'s `valid-move+ok-identity` row, since that mutation
  leaves the real per-gate `Gate` object's `.move` unset). Both applied, confirmed failing, then reverted.

## The findings register — r9's own completion of research.md Part B

| # | Question | This row's status |
|---|---|---|
| SQ1 | Real, free keybindings | **M** (registration, both this row's plan and its own T002 re-check against 0.87.0) — firing itself remains **T**, for the human terminal smoke (quickstart §5) |
| SQ2 | Overlay survival across `turn_end`/compaction | Still **T** — needs the human terminal smoke; not reachable from RPC |
| SQ3 | Operator identity | **Resolved by decision (D4), not by further Pi measurement** — closed, not deferred |
| SQ4 | Exact `overlayOptions` for the full-width modal | Still **D** — needs the human terminal smoke to confirm rendered width/position |
| SQ5 | Overlay stacking vs KILN's own guard | **Resolved by construction** (D6) — `live-ctx.ts`'s `OverlayState` mutual exclusion is built and proven offline (`mutual-exclusion.test.ts`) and over real Pi RPC (`UiReady` check f, including its `--overlay-not-exclusive` falsify hook) |
| SQ6 | A late answer after a session switch | Still **T** (reasoned in D7, not measured) — the human smoke's step 9 is the only place this can be exercised, and even there only "if practical without a real model" |

## What is still unverified

- **The rest of the human terminal smoke.** `ctrl+alt+r` (Layer B popup) and `ctrl+alt+m` (Layer C / Gate-0 face) are confirmed firing
  and drawing in a real terminal. Still to be done by a human: `ctrl+alt+t` (dismiss), answering the popup and seeing the applied
  `decidedBy`, answering the Gate-0 face, and the mutual-exclusion check — see [verification-report.md](./verification-report.md) §5.
  Visual acceptability of the overlays (SQ4), overlay survival across a turn boundary (SQ2) and the late-answer case (SQ6) remain
  untested; RPC cannot render a TUI.
- **Linux and Windows.** Verified on macOS only, same caveat as r7/r8 before it.
- **Any Pi version other than the ones actually run against.** This row's own work was verified against `0.87.0` (not the
  `0.85.1` the plan assumed) — see the Pi-version-drift deviation above. `MEASURED_PI_VERSIONS` (r8-owned, unmodified) still
  names only `0.85.1`; bumping it is out of scope for r9.
- **SQ2/SQ4/SQ6**, as above — all three need the human terminal, and SQ6 additionally may need a real model turn.
