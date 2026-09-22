# kiln/pi/ — the Pi extension foundation (r8)

**Trace**: [contracts/pi-extension.md](../../specs/007-kiln-pi-extension/contracts/pi-extension.md) E7 · FR-012 · SC-007.

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

## Where the next three rows put their code

| Row | Adds | Home | Touches an r8 file? |
|---|---|---|---|
| **r9** — the real UI on Pi | the real footer, gate popup and roadmap overlay on `ctx.ui`; a `LiveUICtx` implementation over Pi | `kiln/pi/ui/` *(new)* | **`port.ts`** gains the members r9 needs (e.g. `ctx.ui.setStatus`, `ctx.ui.custom`'s real overlay factory type). **`outcome.ts`** is called, unchanged. Nothing here moves. |
| **r10** — role agents and model tiers | `agents/*.md` (the four line-of-defense roles, always on the strongest model, and the work roles); a tier → model mapping; unload-on-swap | `kiln/agents/` *(new — per `docs/concepts/concept.md` §9)* and `kiln/src/` | No. |
| **r11** — the director and commands | the director (turns an approved spec into gated work units); the commands that start a lane and answer a gate | `kiln/src/director.ts` *(new)* and `kiln/pi/commands/` *(new)* | `index.ts` registers the new commands (one added `registerCommand` call each) — no existing file moves. |

None of r9, r10 or r11 requires moving a file r8 created. r9's UI code and r11's commands both live *under* `kiln/pi/`, in their own subdirectories, so the scan continues to cover them without a `SCAN_DIRS` change.

## The `LiveUICtx` → Pi mapping (for r9)

KILN's abstract UI interface (`kiln/ui/live-tui.ts`, built in r3/r7 against an interface KILN invented for itself) does not map one-for-one onto
Pi's real `ctx.ui` — this was one of r8's measured findings (see the `<!-- r8-correction -->` banner in
[`docs/concepts/ui-layers-deep.md`](../../docs/concepts/ui-layers-deep.md)):

- `LiveUICtx.setStatus(footer)` (one argument) → Pi's `ctx.ui.setStatus(key, text)` (two arguments; a `key` per widget, `undefined` clears it).
- `LiveUICtx.raiseOverlay(layer, content | null)` (a one-way push) → `await ctx.ui.custom(factory, { overlay: true, overlayOptions })` — Pi's
  version returns a **Promise**, resolved by the component's own `done` callback, and **measured to resolve to `undefined`** in `rpc`, `json`
  and `print` (only `tui` can actually draw one). r9 has to build a real mapping here, not a rename.

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
