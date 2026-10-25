# kiln/pi/ — the Pi extension foundation (r8), extended with the real UI (r9)

**Trace**: [contracts/pi-extension.md](../../specs/007-kiln-pi-extension/contracts/pi-extension.md) E7 · FR-012 · SC-007 ·
[specs/008-kiln-pi-ui](../../specs/008-kiln-pi-ui) (r9).

This directory is the ONE place Pi's shape appears in KILN. It exists so `kiln/package.json`'s `"pi": {"extensions": ["./pi/index.ts"]}`
manifest can install as a self-contained unit (`pi install ./kiln`), and so the P-VIII scan (`SCAN_DIRS` in `validate/_netscan.ts`) can police
it exactly like `kiln/src`. No file outside this directory reads a Pi type (contract `pi-seam.md` S1).

## What is here today (r8)

| File | Role |
|---|---|
| `port.ts` | KILN's own structural view of the small part of Pi it uses, plus `detectCapability` (no logic beyond that — no imports at all) |
| `outcome.ts` | the seam: `interpret`, `askGate`, `resolveAsk` — turns whatever Pi returns into `answered`/`no-answer`, never a decision |
| `status.ts` | `kiln-status` — read-only, builds an idle `FactoryState` from `specs/ROADMAP.md` |
| `selftest.ts` | `kiln-selftest` — read-only, exercises the seam and one overlay against real Pi |
| `output.ts` | mode → output channel (`ctx.ui.notify` vs `console.log`) |
| `index.ts` | the entry Pi loads: registers the two commands above and nothing else |

## `kiln/pi/ui/` — the real UI on Pi (r9, delivered)

| File | Role |
|---|---|
| `present.ts` | the presentation wrapper (FR-015): calls the real `renderHud`/`renderPopup`/`renderOverlay`/`renderGate0Face` first, then applies exactly three fixed, tested substitutions (gate names, timestamps, header wording) |
| `identity.ts` | `resolveIdentity()` (NC1): reads `KILN_HUMAN`, the explicit session-level identity a human decision is recorded under |
| `live-ctx.ts` | `makeLiveUICtx()` (NC2 = A): the real `LiveUICtx` body — `setStatus` is a pure passthrough to Pi's real `ctx.ui.setStatus(key, text)`; `raiseOverlay` draws a dismiss-only `ctx.ui.custom()` card, then asks via `askGate`/`interpret` (r8's seam, reused unmodified), then applies via `applyMove`/`recordGate0Decision` |
| `keys.ts` | `registerKeys()`: registers the three re-declared shortcuts (`ui/keymap.ts`) against a Pi shortcut API — **not yet wired into `pi/index.ts`** (see the correction below) |

**A correction to r8's own projection** (measured during r9's implementation, not assumed): the projection below said `port.ts` would
"gain the members r9 needs." r9 did **not** touch `port.ts` — `live-ctx.ts` and `keys.ts` each declare their own small, local structural
types (e.g. `ShortcutApi`) exactly the way `port.ts` itself does, rather than growing the shared canonical file. `port.ts` stays
byte-for-byte unmodified (r9's own "untouched" test, `tests/pi/ui/untouched.test.ts`, pins this).

**Also measured, and a deliberate departure from research's own more aspirational framing**: Pi's `ctx.ui.custom()` is confirmed (M5,
already known from r8) to resolve `undefined` with `handleInput` **never invoked** under `rpc` — so Layer B/C's actual CHOICE could never
be proven by `UiReady` (RPC-only) if it depended solely on a custom-overlay's own list navigation. `live-ctx.ts` therefore uses the
overlay **only** for the visible, dismiss-only card, and `askGate`/`ctx.ui.select` (which **does** work over RPC, the same primitive r8's
own `PiReady` already drives) for the actual decision. See `live-ctx.ts`'s own header comment and
[`specs/008-kiln-pi-ui/implementation-report.md`](../../specs/008-kiln-pi-ui/implementation-report.md) for the full reasoning.

## Where the remaining two rows put their code

| Row | Adds | Home | Touches an r8/r9 file? |
|---|---|---|---|
| **r10** — role agents and model tiers | `agents/*.md` (the four line-of-defense roles, always on the strongest model, and the work roles); a tier → model mapping; unload-on-swap | `kiln/agents/` *(new — per `docs/concepts/concept.md` §9)* and `kiln/src/` | No. |
| **r11** — the director and commands | the director (turns an approved spec into gated work units); the commands that start a lane and answer a gate — **including actually calling `registerKeys()`/`makeLiveUICtx()` from a real `pi.registerCommand`/`registerShortcut` call**, which r9 built but deliberately did not wire into `pi/index.ts` (that file stays r8-owned and canonical) | `kiln/src/director.ts` *(new)* and `kiln/pi/commands/` *(new)* | `index.ts` registers the new commands (one added `registerCommand` call each) — no existing file moves. |

Neither r10 nor r11 requires moving a file r8 or r9 created; r11's commands live *under* `kiln/pi/`, in their own subdirectory, so the
scan continues to cover them without a `SCAN_DIRS` change.

## The `LiveUICtx` → Pi mapping (r9, delivered)

KILN's abstract UI interface (`kiln/ui/live-tui.ts`, built in r3/r7 against an interface KILN invented for itself) does not map one-for-one onto
Pi's real `ctx.ui` — this was one of r8's measured findings (see the `<!-- r8-correction -->` banner in
[`docs/concepts/ui-layers-deep.md`](../../docs/concepts/ui-layers-deep.md)):

- `LiveUICtx.setStatus(footer)` (one argument) → Pi's real `ctx.ui.setStatus(key, text)` (two arguments; a genuine, distinct
  fire-and-forget method — `docs/rpc.md` "setStatus": "Set or clear a status entry in the footer/status bar" — NOT `ctx.ui.notify`,
  research D9's resolution of the mockup review's open item). It is a pure passthrough: the CALLER is responsible for having already
  applied `present.ts`. Where `ctx.hasUI` is false (print/json), falls back to `output.ts`'s `emit()` — `setStatus` reaches no one there
  either.
- `LiveUICtx.raiseOverlay(layer, content | null)` (a one-way push) → `ctx.ui.custom(factory, { overlay: true })` for the visible card
  (dismiss-only; **measured to resolve to `undefined`** in `rpc`/`json`/`print`, only `tui` can actually draw one — r8's own M5), **then**
  `askGate`/`interpret` (r8's seam) for the actual choice when one is needed. `null` closes whichever overlay is open for that layer.

## Real-Pi measurement update (r9, 2026-09-24)

The `pi` binary installed in this environment reports **`0.87.0`**, not the `0.85.1` r8 measured. `validate/_pi-driver.ts`'s
`MEASURED_PI_VERSIONS` (canonical, unmodified by r9) still lists only `0.85.1` — `PiReady`/`npm run pi-ready` therefore report
`pi-version-unmeasured` on this machine, a **pre-existing environment drift, not an r9 regression** (see
[`specs/008-kiln-pi-ui/baseline.md`](../../specs/008-kiln-pi-ui/baseline.md)). `UiReady` (`npm run ui-ready`) does **not** depend on
`checkPiReady()`'s version gate (contract `ui-ready.md` U1: "composes on `PiReady`... it does not re-prove that") — it drives its own
`RpcSession` calls directly, and is confirmed **READY** end-to-end against the installed `0.87.0`, including all three falsify hooks.
The three re-declared shortcuts (`ctrl+alt+r` / `ctrl+alt+m` / `ctrl+alt+t`) were re-checked against `0.87.0`'s own shipped
`docs/keybindings.md` — no conflict. **Found by the human terminal smoke test, after five wrong keymap guesses**: `pi.registerShortcut()`
calls made *inside a command handler* are accepted without error but **never fire**; only shortcuts registered synchronously at extension
**load time** (the top-level factory) do. Diagnosed by registering a free single-modifier key (`ctrl+h`) both ways. `pi/ui/keys.ts` was
redesigned to match (`registerKeys(pi, makeLive, opts)`: no `ctx` needed at registration; the `LiveUICtx` is built lazily on the first
press and memoized so mutual exclusion persists). With that fix `ctrl+alt+r` and `ctrl+alt+m` fired in the human's terminal on the first
try. Independently real: bare `alt+<letter>` types a composed character (`⌥g` → `©`) in macOS terminals, so `ctrl+alt+` is preferred. The
encoding theories offered during the investigation (Ctrl+Shift collapse, function-key modifier loss, …) were never tested against a
correctly-registered shortcut and are withdrawn. See `research.md` D10 and `verification-report.md` §5.

**For r11**: call `registerKeys()` from the extension's top-level factory, not from a command or event handler.

## Three rules that do not change

- **Never import Pi.** Not even `import type`. The P-VIII scan flags any non-relative, non-`node:` specifier — type-only imports included
  (`kiln/tests/pi/scan-pi.test.ts` pins this as a measured fact, not a style preference). Extend `port.ts` instead.
- **Never pass a `timeout` to a gate question.** A gate waits for a human, not a clock (P-IX, FR-008). The one exception is
  `kiln-selftest`'s labelled `// SHAPE-TEST` line, which observes Pi's *own* dialog timeout — it is not a gate and never goes through `askGate`.
- **Never use `ctx.ui.confirm` for a gate.** Measured: `confirm`'s `false` return value is identical whether the human said "No", cancelled,
  timed out, or the mode is headless — one value, five situations (SQ7, `research.md`). Gates use `ctx.ui.select` exclusively.
- **A `ctx.ui.custom(...)` overlay does not close itself.** Found the hard way (`verification-report.md` §5, finding F-1): Pi gives the
  returned component keyboard focus and does nothing further — no default Enter/Esc handling exists. The component **must** implement
  `handleInput(data)` and call the factory's 4th argument (`done`) itself, or the overlay hangs forever in a real terminal. `kiln-selftest`'s
  overlay (`selftest.ts`) is the reference pattern; RPC-mode automation (`PiReady`) cannot catch a missing `handleInput`, because RPC's
  `custom()` never invokes it at all — this is exactly the class of bug the human terminal smoke test exists to catch.
