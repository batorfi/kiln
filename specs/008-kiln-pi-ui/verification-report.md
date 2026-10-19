# Verification Report — r9 (KILN's real UI on Pi)

**Trace**: [quickstart.md](./quickstart.md) · [spec.md](./spec.md) Success Criteria SC-001–SC-008.

This report runs `quickstart.md`'s five sections in order. §1–§4 were run by the implementer (automated, reproducible, real Pi
0.87.0, RPC/hermetic — see `baseline.md`). **§5, the human terminal smoke, is left for the human to fill — it is never filled or
implied by the implementer.**

## §1 — The presentation wrapper, offline (SC-001, SC-008)

```
cd kiln && node --test tests/pi/ui/present.test.ts
```

**Result: PASS.** 37/37 tests pass (see the full-suite run in `baseline.md`'s T035 section). Every fixture's diff from the raw
render is explained entirely by one of the three named transforms (gate name, timestamp, header wording) — verified by an
independent reconstruction of the expected output, not by re-using `present.ts`'s own internals. `renderHud`/`renderPopup`/
`renderOverlay`/`renderGate0Face` are unmodified as functions (P3); `renderOverlay`'s column-width change (research D8) is the
one declared exception, separately verified (`overlay-columns.test.ts`, r2's own pre-existing overlay tests re-run unmodified).

## §2 — Identity resolution, offline (SC-002, SC-007)

```
KILN_HUMAN=human@batorfi node --test tests/pi/ui/identity.test.ts   # ok:true, decidedBy="human@batorfi"
node --test tests/pi/ui/identity.test.ts                             # KILN_HUMAN unset -> ok:false, a named reason
KILN_HUMAN=nobody node --test tests/pi/ui/identity.test.ts           # malformed (no "human@" prefix) -> ok:false
```

**Result: PASS.** All three shapes behave exactly as specified; the accepted shape is cross-checked against `resumeByToken`'s
and `recordGate0Decision`'s own (unmodified) requirement in the same test file.

## §3 — `UiReady`, the automated half of NC3 (SC-002–SC-004)

```
npm run ui-ready                              # -> READY
npm run ui-ready -- --no-identity             # -> FAIL non-answer-approved
npm run ui-ready -- --gate0-vocabulary-leak   # -> FAIL gate0-vocabulary-leak
npm run ui-ready -- --overlay-not-exclusive   # -> FAIL overlay-not-exclusive
```

**Result: PASS, against real Pi 0.87.0** (not `0.85.1` — see `baseline.md`'s Pi-version-drift note; `UiReady` does not depend on
the version gate). All 8 named checks (a)–(h) pass in the default run; each of the three falsify hooks fails with exactly its
named code, and no other. Full output recorded in `baseline.md`'s T035 section.

## §4 — The keymap (SC-005)

```
node --test tests/pi/ui/keymap.test.ts
```

**Result: PASS.** `LAYERB_KEY`/`LAYERC_KEY`/`TOGGLE_KEY` (`ctrl+alt+r`/`ctrl+alt+m`/`ctrl+alt+t`) each match the Key Format regex, are
pairwise distinct, and match none of Pi's documented default bindings (checked against the `0.87.0` table actually installed here —
`baseline.md` T002; `ctrl+alt+]` is the only `ctrl+alt` default, a different key). The shortcut-registration contract is pinned
separately by `keys.test.ts` (load-time registration, lazy memoized `makeLive`).

## §5 — The human terminal smoke (FR-013, NC3 = B) — **IN PROGRESS: Layers A, B, C confirmed in a real terminal; the answer/dismiss/exclusion steps remain**

RPC cannot draw an overlay or press a key — this is the part automation cannot reach. Run by `human@batorfi` in `cmux`
(native macOS terminal on libghostty), Pi 0.87.1, via the throwaway [`smoke-harness.ts`](./smoke-harness.ts).

| Field | Value |
|---|---|
| Done? | **No** — steps 1–6 below confirmed (incl. the applied decision); the Gate-0 answer, dismiss key and an explicit mutual-exclusion run remain |
| Name | human@batorfi |
| Pi version | 0.87.1 |
| Terminal | cmux (also tried: macOS Terminal.app, during the registration-timing investigation) |

**Confirmed, by a human, in a real terminal:**

1. **Layer A** — after `/kiln-smoke-init` the footer showed `rail=spec lane=r9 switches=3 clock=HH:MM:SS`: `setStatus`, the gate-name
   transform (`spec`, not `3`) and the timestamp transform all correct. After a gate resolved the footer read `rail=—`, as designed.
2. **`ctrl+alt+r` fires** and raises Layer B: `popup · spec OPEN — awaiting a human move (or a WAIT)` (`presentPopup`'s real output).
3. **`ctrl+alt+m` fires** and raises Layer C as the **distinct Gate-0 face**: `=== Gate 0 — kiln-v1-smoke ===`, the roadmap rows,
   `Status: pending — awaiting your decision`, the moves list — not the per-gate card (FR-003's disjointness, visible).
4. `/kiln-smoke-check` reported `gate 3: still open, no answer yet` before any answer — no decision appears from merely opening a gate.
5. **The applied decision (SC-002, terminal half)**: `ctrl+alt+r` → Enter on the card → `approve` in the list → `/kiln-smoke-check` read
   `gate 3: APPLIED move=approve decidedBy=human@batorfi` — the human's explicit choice reached `applyMove` under their own `KILN_HUMAN` identity.
   (Preceded by a failed attempt that found two defects, both fixed — see below.)
6. Once the Gate-0 face was raised the popup was no longer drawn — *consistent with* mutual exclusion, but not yet proven (see below).

**Found in the second session** (`implementation-report.md` deviation 8): the human could not pick `approve`. Two defects, both fixed — the card now closes
on Kitty-protocol Esc/Enter (`ESC[27u`/`ESC[13u`), and a missing `KILN_HUMAN` now shows a named message instead of silently skipping the list. Re-run
after `export KILN_HUMAN=human@<you>` in the shell that launches Pi.

**Still to run** (a human, ~3 minutes; relaunch first — the fixture gate is now resolved): (a) press `ctrl+alt+m`, pick a move from the Gate-0
list (must be only `approve`/`revise`/`reject`) — exercises `recordGate0Decision`; (b) press `ctrl+alt+t` with an overlay open — it should
dismiss (the only key never yet pressed by a human); (c) mutual exclusion, explicitly: `ctrl+alt+r`, then `ctrl+alt+m` without answering —
the popup should close first and `/kiln-smoke-check` should read `WAITING (token=g3)`. (An earlier `WAITING (token=g3)` was observed but the
key sequence behind it was not recorded, so it is not counted.)

**What the investigation found along the way** (the smoke test doing its job — full account in `research.md` D10 and
`implementation-report.md` deviations 6–7):

- `kiln/pi/index.ts` (r8-owned) never calls `makeLiveUICtx()`/`registerKeys()`, so there was nothing to press when loaded directly;
  the harness wires the already-tested pieces together over a fixture gate (permanent wiring is r11's job).
- `keys.ts` called `registerShortcut` with the wrong argument shape (bare callback instead of `{ description, handler }`).
- **Five consecutive keymap choices "never fired"** and each got an encoding theory (Alt composition, Ctrl+Shift collapse, function-key
  modifiers, …). All wrong: shortcuts registered *inside a command handler* are accepted but never dispatched; registered at extension
  *load time* they fire. Found by testing a free single-modifier key (`ctrl+h`) both ways. `keys.ts` was redesigned accordingly
  (`makeLive(ctx)` factory, lazy + memoized). Only bare `alt+<letter>` composing a character (`⌥g` → `©`) is independently real.

**What remains unverified** (named plainly):

- The step-6–10 items above; `ctrl+alt+t` has never been pressed by a human.
- Whether Layers B/C are visually acceptable beyond "they draw" (SQ4); overlay survival across a turn boundary (SQ2); a late answer after
  a session switch (SQ6) — reasoned (D7), not measured.
- Linux and Windows (macOS only). Pi versions other than `0.87.x` (`MEASURED_PI_VERSIONS` still `0.85.1`, r8-owned, unmodified).

**Handback**: the row stays `queued`. What is left is five minutes of keypresses, not an investigation — see tasks.md T040.
