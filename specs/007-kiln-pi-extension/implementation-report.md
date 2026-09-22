# Implementation Report — r8 (KILN on Pi: the extension foundation)

**Trace**: [spec.md](./spec.md) · [plan.md](./plan.md) · [tasks.md](./tasks.md) (T001–T047 complete; T048–T052 close out) · [checkpoint-t047.md](./checkpoint-t047.md)

**Status at this report**: implementation complete against the plan; **nothing is committed yet**. The row stays `queued` in `specs/ROADMAP.md` — closing it, adding its `spec` pointer, and re-admitting r9 are the human's moves (P-VI), not this report's (see [verification-report.md](./verification-report.md) and the handback in tasks.md T052).

## What was built

- **`kiln/pi/`** — the extension: `port.ts` (KILN's own structural view of Pi, zero imports), `outcome.ts` (the seam), `status.ts` (`kiln-status`), `selftest.ts` (`kiln-selftest`), `output.ts` (mode → channel), `index.ts` (the entry, `makeKilnExtension`), `README.md` (the layout note for r9–r11).
- **`kiln/validate/_pi-driver.ts`** — the one module allowed to spawn a process; a hermetic launcher, an RPC session, headless one-shot runs, `install()`.
- **`kiln/validate/pi-ready.ts`** — the `PiReady` probe: 9 named checks, 11 CLI hooks, a pure `evaluateShapes` decision function.
- **`kiln/fixtures/pi/`** — six deliberately broken things for the falsify hooks.
- **`kiln/tests/pi/`** — 19 test files, ~125 tests.
- **`kiln/tests/_pi-gate.ts`** and a `--pi` flag on `kiln/tests/run.ts`, plus a `test:pi` npm script.
- **Two scan changes** in `kiln/validate/_netscan.ts`: `"pi"` joined `SCAN_DIRS`; a new, single-entry `PROCESS_ALLOWLIST`.
- **Nine additive value exports** from `kiln/index.ts` (the seam and `PiReady`'s public surface — not `kiln/pi/index.ts` itself, which stays behind the manifest).
- **A `<!-- r8-correction -->` banner** on `docs/concepts/ui-layers-deep.md`, appended, original text preserved (SHA-256 pinned by a test).
- **README.md**: Pi as an optional external requirement, the measured version, `npm run pi-ready` / `test:pi`.
- **`specs/007-kiln-pi-extension/compliance-note.md`** — the P-V operational-definition record (NC3 = A).
- **`research.md` Part B completed** — SQ1–SQ11 all answered (measured, documented, or deferred with an owning row) and Part A gained D11/D12 from what the spike itself found.

## Deviations from the plan, and why

1. **`evaluateShapes` was extracted as a new, pure, exported function** (not in the original design). The T045 mutation sweep found that no test protected the "a probe whose control never answers proves nothing" invariant (contract R2.1) — the pull-out made it directly, offline unit-testable without adding a 12th CLI hook to the fixed 11-name set `pi-ready.md` R6 pins.
2. **`status.ts`'s printed-line row count gained a dedicated test** (`status.test.ts`, T045) checking the number embedded in the *line*, not just the structured `report.rows.total` field — the same sweep found a canned line count could hide behind an honest structured field.
3. **A driver bug fixed mid-build, not anticipated in research.md**: `RpcSession.waitForUi("notify", …)` originally re-matched a *stale* notification left over from an earlier prompt in the same session (e.g. `kiln-status`'s notify satisfying a later `kiln-selftest` wait). Fixed with a `sinceIndex` cursor; `promptNoWait` now returns the pre-send event count for callers to pass through.
4. **Pi's stdin, left open, blocks `-p`/`--mode json`.** The driver originally spawned with `stdio: ["pipe", "pipe", "pipe"]` unconditionally; Pi's headless one-shot modes wait for stdin EOF, which never arrived. Fixed to default `stdio[0]` to `"ignore"` unless a caller explicitly supplies input — matching the pattern the pre-spec spike already used (`stdin=DEVNULL`) but that the driver had drifted from.
5. **Pi's spawn `cwd` was not pinned**, so `ctx.cwd` inside the extension silently inherited whatever directory the *calling* script ran from — `kiln-status` reported "no roadmap found" when the suite ran `npm test` from `kiln/`, since `specs/ROADMAP.md` lives at the repo root. Fixed with an explicit `REPO_ROOT` constant, defaulted on every spawn, pinned by a dedicated offline test.
6. **`-ne` (no extension discovery) also blocks a package-installed extension**, not just `.pi/extensions/` auto-discovery — measured while wiring `openRpcFromPackage`. `openRpc` (explicit `-e`, meant to be isolated) still passes it; the package-install path does not. `research.md` SQ1 was updated with this finding.
7. **The `wrong-status.ts` fixture's `kiln-selftest` was rewritten to delegate to the real seam** instead of a no-op handler — the no-op made check (f) time out for tens of seconds on every run of that fixture, for no reason connected to what the fixture is meant to prove (check e).
8. **Found live, during the FR-016 human smoke test itself: `kiln-selftest`'s overlay could never close.** The factory returned only `{ render, invalidate }` — no `handleInput`, no call to Pi's `done` callback — so in a real terminal, Enter and Esc did nothing and the overlay hung forever; the operator had to Ctrl+C out of Pi. `PiReady` (RPC mode) could not have found this: RPC's `custom()` resolves `undefined` without ever invoking the component's `handleInput`, confirmed by re-running `pi-ready` after the fix with byte-identical output. Fixed by implementing `handleInput` to detect a raw Enter (`\r`/`\n`) or Esc (`\x1b`) and call `done`, matching Pi's own bundled example components; verified with three new regression tests that fail against the original code and pass against the fix. Full detail: `verification-report.md` §5 (recorded as finding F-1 there).

None of these change a functional requirement or a success criterion; all are either bugs found and fixed during wiring (4–6), or test-coverage strengthening the T045 sweep specifically asked for (1–2, 7).

## The mutation record

- **T022** (the seam, `outcome.ts`): 5 mutations, all caught by name. See [research.md](./research.md) via the seam's own test suite and the summary in the original conversation; the file-level log is [mutation-log.md](./mutation-log.md) §"the seam".
- **T045** (the polish sweep — the driver, the probe, `status.ts`): 6 mutations (A–F), all caught by name, each applied and restored with a byte-identical `diff` check. Two of the six surfaced real, now-closed test gaps. Full detail: [mutation-log.md](./mutation-log.md).

## The findings register — final state

All eleven SQ rows in [research.md](./research.md) Part B carry a status. Summary:

- **Measured (M)**: SQ1, SQ2 (partially), SQ3 (partially), SQ4 (rpc/json/print), SQ7, SQ9 (empty-config only), SQ10, SQ11.
- **Documented only (D)**: SQ2 (autocompletion), SQ5, SQ6, SQ8, SQ9 (the Ollama-provider API).
- **Needs the terminal (T)**: SQ3 (`/reload`'s observable effect), SQ4 (the `tui` column), SQ5 (overlay survival, hosting a `select`).
- **Needs a model turn, out of r8's scope (T)**: SQ3 (`fork`, `clone`, a meaningful `switch_session`).
- **Deferred with a named owner (→rN)**: SQ2/autocomplete → r11; SQ3's answer-application logic → r9/r11; SQ5's survival/hosting → r9; SQ6 → r9; SQ8's redraw-triggering events → r9; SQ9's KILN-resident-vs-Pi-model decision → r10.

No row is blank; no **D** cell is described as *confirmed* (`findings.test.ts` pins both).

## What is still unverified

- **The terminal (`tui`) mode itself.** Every measurement here is `rpc`, `json` or `print`. RPC's `custom()` resolves `undefined` with no request even emitted, so no automated check can prove an overlay draws. This is exactly what FR-016's human smoke test (quickstart.md §5) exists to cover — **it has not been performed**; see [verification-report.md](./verification-report.md).
- **Linux and Windows.** Verified on macOS only, same caveat as the Node floor before it.
- **Any Pi version other than 0.85.1.** `MEASURED_PI_VERSIONS` names exactly one version; `PiReady` fails by name (`pi-version-unmeasured`) on any other.
- **The two-Pi-processes-are-two-lanes hazard** the spec records as an edge case, owned by r11 — r8 does not build a cross-process guard.
