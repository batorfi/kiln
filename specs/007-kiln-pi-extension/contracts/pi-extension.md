# Contract — the KILN Pi extension (E8)

**Trace**: FR-003, FR-004, FR-005, FR-012, FR-013, FR-014 · P-VIII, P-IX · [research.md](../research.md) D2, D3, D4, D7

## E1 — The entry

`kiln/pi/index.ts` default-exports `function (pi)` — Pi's factory (sync). It:

- registers **exactly** `kiln-status` and `kiln-selftest`, and nothing else — **no event handlers, no tools, no shortcuts, no flags, no providers**;
- starts **no** process, socket, timer, watcher or network call (Pi's own rule: *do not start background resources from the factory*), and holds **no module-level mutable state**;
- is safe to load twice (`/reload`): registering the same two names again is Pi's job to reconcile; KILN keeps nothing that could double.

It also exports `makeKilnExtension(overrides?)` — the **injectable form** (a replacement `interpret`, a replacement clock) that `PiReady`'s mutant fixtures use. The default export is `makeKilnExtension()`.

## E2 — The manifest (NC2 = A + B)

`kiln/package.json` gains, and nothing else changes in it except a `pi-ready` script:

```json
"pi": { "extensions": ["./pi/index.ts"] }
```

`dependencies` stays `{}`. There is **no** `.pi/extensions/` entry for KILN in the repository, ever, and a test asserts it (SC-009).
Two ways to load, both exercised by `PiReady`:

| Way | Command | Scope |
|---|---|---|
| explicit | `pi -e kiln/pi/index.ts` | one run (development) |
| package | `pi install ./kiln` | user settings (`~/.pi/agent/settings.json`) — **`PiReady` does this into an empty temp dir only** |

## E3 — Commands

| Command | Does | Never does |
|---|---|---|
| `kiln-status` | reads `specs/ROADMAP.md` under `ctx.cwd`; prints a `FactoryState` summary (D4) | start a lane, decide a gate, write the log, call a model |
| `kiln-selftest [timeout]` | tries one overlay **first** if `canDraw` (closes on Enter/Esc), then asks one gate-shaped `select` through the seam; prints `SELFTEST …` (D7) | decide a gate, write the log; the `timeout` argument is a **shape test of Pi**, not a gate |

Both take at most one word of argument. Both are **read-only**: FR-005 holds for the pair.

## E4 — Output: where it goes, per mode (SQ11, measured)

| Mode | Channel | Why |
|---|---|---|
| `tui`, `rpc` | `ctx.ui.notify(text, "info")` | the UI can show it (rpc: an `extension_ui_request` the client renders) |
| `print`, `json` | `console.log(text)` → **stderr** | `notify` prints nothing there; Pi redirects an extension's stdout to stderr and keeps stdout for its own protocol |
| unknown | `console.log` | fail-safe: something reaches a human |

`PiReady` reports the channel it observed per mode. A mode that cannot show the output says so rather than staying silent.

**Format.** One line per fact, `KILN status …` / `SELFTEST …`, ASCII, no ANSI — so a probe (and a person using `2>&1`) can match it.

## E5 — Naming (measured collision behaviour)

Two extensions with the same command name are **both** renamed (`name:1`, `name:2`). So: the `kiln-` prefix; and **nothing resolves a KILN command by its bare name** — `PiReady` matches on `sourceInfo.path` and tolerates a `:n` suffix.

## E6 — What r8 does *not* register

No event handlers (so nothing needs an idempotent `session_shutdown`), no `registerTool`, no `registerShortcut`, no `registerFlag`, no `registerProvider`. **Nothing here may change Pi's or the operator's behaviour except adding two commands.**

## E7 — Where the later rows go (FR-012, SC-007) — *this table becomes `kiln/pi/README.md`*

| Row | Adds | Home | Touches an r8 file? |
|---|---|---|---|
| **r9** — the real UI on Pi | the real footer / popup / overlay on `ctx.ui`; a `LiveUICtx` implementation over Pi | `kiln/pi/ui/` (new) | **`port.ts`** gains members it needs; **`outcome.ts`** is called, unchanged. Nothing moves. |
| **r10** — roles and tiers | `agents/*.md`; the tier → model mapping; unload-on-swap | `kiln/agents/` (new, per `docs/concepts/concept.md` §9) and `kiln/src/` | no |
| **r11** — director and commands | the director; commands that start a lane and answer a gate | `kiln/src/director.ts` and `kiln/pi/commands/` (new) | `index.ts` registers the new commands (one added line each) |

The `LiveUICtx` ↔ Pi mapping r9 must do (research SQ4, Part C): `setStatus(footer)` → `ctx.ui.setStatus(key, text)`; `raiseOverlay(layer, content)` → `await ctx.ui.custom(factory, {overlay:true, overlayOptions})` (a Promise resolved by `done`, and **`undefined` in rpc**).

## E8 — Guarantees inherited, not changed (FR-013, FR-014)

r1–r7's validators and probes are unmodified; the suite stays green; `roadmap.ts` still PASSes. The P-VIII scan gains `"pi"` in `SCAN_DIRS` so this code is policed like `kiln/src`; `kiln/pi/` may import `node:fs`, `node:path`, `node:url` and relative modules, and **nothing else**.
