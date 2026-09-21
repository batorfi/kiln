# Research — r8 (KILN on Pi): plan decisions, and the spike's findings register

**Trace**: [spec.md](./spec.md) FR-001, FR-002 · P-V, P-VIII, P-IX · Pi `0.85.1`, macOS, 2026-09-21.

This file has **three parts**. **A** records the decisions the plan makes. **B** is the **findings register** the spec calls the *findings record* (FR-001): SQ1–SQ11, pre-filled with everything
already run, and **completed by r8's spike task** — nothing in it may end the row as "unknown". **C** lists the corrections these findings force on `ui-layers-deep.md` (FR-002).

Everything marked **measured** was run against real Pi in a hermetic setup (`PI_CODING_AGENT_DIR` = an empty temp dir, `--offline`, `--no-session`, **no model called**). Everything marked **documented**
was read in Pi's own docs/types (`~/.local/lib/node_modules/@earendil-works/pi-coding-agent/docs/`) and **not run** — the spec's rule is that only what was run may be called confirmed.

---

## Part A — Decisions

### D1 — KILN never imports Pi. It declares the narrow surface it uses.

**Decision.** `kiln/pi/port.ts` declares KILN's *own structural types* for exactly the parts of Pi's `ExtensionAPI` / `ctx` that KILN touches (`registerCommand`, `ctx.mode`, `ctx.hasUI`, `ctx.cwd`,
`ctx.ui.{select, notify, custom}`). No file in `kiln/` imports `@earendil-works/*` — not even `import type`.
**Rationale.** *Measured:* the P-VIII scan flags **any** non-relative, non-`node:` specifier, **type-only imports included** — `scanText('import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"')` →
`external dependency "@earendil-works/pi-coding-agent"`. Importing Pi's types would either fail the scan or need an exemption in the guard that exists to keep KILN dependency-free. A structural port also
makes the **seam** literal: it *is* the list of things r9 must re-map, and it decouples KILN from Pi's pre-1.0 type churn (M9). Pi passes real objects; TypeScript's structural typing does the rest.
**Alternatives.** (a) `import type` from Pi + exempt it in the scan — weakens P-VIII's dependency rule for convenience. (b) A `devDependency` on Pi's types — adds a dependency to a project whose
selling point is `dependencies: {}`, and Pi's package is large.

### D2 — Layout: `kiln/pi/` holds everything Pi-facing; the entry is `kiln/pi/index.ts`

**Decision.** New directory `kiln/pi/` (entry, port, seam, status, self-test, output channel, a README layout note). `kiln/package.json` gains
`"pi": { "extensions": ["./pi/index.ts"] }` **(NC2 = A + B)**. **No** `.pi/extensions/` entry for KILN exists or is created. The role agents (r10) go in `kiln/agents/*.md` (the concept doc's own repo shape,
`docs/concepts/concept.md` §9); r9's real layers go in `kiln/pi/ui/`; r11's commands in `kiln/pi/commands/` and the director in `kiln/src/director.ts`. See [contracts/pi-extension.md](./contracts/pi-extension.md) E7.
**Rationale.** *Measured (B):* a package directory with that manifest is installed by `pi install <dir>` into an empty config dir (recorded as a **relative path**, not a copy), Pi then lists its command with
`origin: package, scope: user`, and an extension **inside the package imports `../src/clock.ts`** through its `.ts` specifier. *Measured (A):* the **whole** `kiln/index.ts` — 77 runtime exports, including
r7's Ollama resident — loads under Pi's loader from an extension file. So the extension can reach every existing KILN module with no build step and no new dependency.
**Alternatives.** `.pi/extensions/kiln/` — rejected by NC2 (auto-loads into every Pi session in this repo, including the ones building KILN). A top-level `extension/` outside `kiln/` — splits the package that
`pi install ./kiln` must be able to install alone.

### D3 — Command names carry a prefix; nothing resolves a command by its bare name

**Decision.** Commands are `kiln-status` and `kiln-selftest`. `PiReady` finds them by **`sourceInfo.path`** in `get_commands`, accepting a `:n` suffix.
**Rationale.** *Measured (D):* two extensions registering the same name are **both renamed** — `dup:1`, `dup:2`; neither keeps `dup`. So a bare `/kiln` typed by an operator with another `kiln` extension installed
would resolve to nothing *silently*. A distinctive prefix makes a collision unlikely; resolving by source path makes the probe immune to it.
**Alternatives.** A single `kiln` command with sub-arguments — one collision then breaks everything. Registering under several aliases — clutter, and it does not remove the rename.

### D4 — Status is built from disk on every call; output goes where the mode can show it

**Decision.** `kiln-status` reads `specs/ROADMAP.md` under `ctx.cwd`, builds an **idle `FactoryState`** (`lane: none`) with r2's `extractHead`, and renders r1's HUD line plus the next eligible row (`nextEligibleRow`).
It keeps **no state in the extension** — so `/reload`, `/new`, `/resume` and compaction cannot lose or double it (SQ3 is settled by construction, then measured). Output: `tui`/`rpc` → `ctx.ui.notify`; `print`/`json` → `console.log`.
**Rationale.** *Measured (C):* in `-p` and `--mode json`, `notify` prints **nothing**, but `console.log` and `process.stdout.write` arrive on **stderr** — Pi redirects an extension's stdout so its own protocol stays clean
(print: stdout empty; json: stdout carries only Pi's event stream). So headless status is *readable*, on stderr, and a script can tell it from protocol. A missing ROADMAP is a normal answer (`no roadmap found in <cwd>`), not an error.
**Alternatives.** Keeping a `FactoryState` in the extension — it would drift from the log the moment a session is reloaded (P-VII: the log is the truth). Writing to stdout directly — measured to be redirected, so it would look like it works.

### D5 — The seam: `select` only, no `timeout`, one strict rule; a non-answer becomes a `WAIT`

**Decision.** Gate questions use **`ctx.ui.select` only**, with **no** `timeout` and no `signal` option. The seam (`kiln/pi/outcome.ts`) returns `answered(option)` **iff** the mode can ask **and** the value is a string
**in the offered list**; anything else is `no-answer`, which is handed to r1's existing **`headlessWait`** (a durable `Wait`, never resolved by the seam). Full rule: [contracts/pi-seam.md](./contracts/pi-seam.md).
**Rationale.** *Measured (M6, M7):* `select` is the only dialog that **distinguishes** an explicit choice (the option string) from every non-answer (`undefined`). `confirm` returns **`false`** for a "No", for a
cancel, for a timeout **and** for a headless mode — four different situations, one value — so it can never carry a gate. *Measured (M5):* RPC reports `hasUI: true` yet `custom()` returns `undefined`, so
capability must come from **mode**, not `hasUI` alone. `headlessWait` already exists, is the P-V mechanism r1 built, and "never writes a `gate-completion`" (`src/gate.ts`) — reusing it means r8 invents no
second way for a gate to wait.
**Alternatives.** Mapping `false` to "reject" — turns silence into a recorded decision. Passing a `timeout` and treating expiry as a reject — a timer deciding (P-IX). Adding a new `Wait` shape — a second path to audit.

### D6 — `PiReady` = a probe plus ONE process-spawning module, allowlisted like the loopback one

**Decision.** `validate/pi-ready.ts` (the probe: checks, falsify hooks, CLI) and `validate/_pi-driver.ts` (the **only** module that may spawn a process, and it may spawn **only** `pi`; an RPC client with a hard
deadline). `_netscan.ts` gains `"pi"` in `SCAN_DIRS` and a **`PROCESS_ALLOWLIST` with exactly one entry** (`validate/_pi-driver.ts`), enforced by the same single-entry rule and a falsify hook as the loopback list.
**Rationale.** *Measured:* the scan flags `node:child_process` in any scanned directory — and `validate/` is scanned. A probe that starts real Pi must spawn it. Exempting a *directory* would punch a hole in the
rule that exists to catch `spawn("curl", …)`; exempting **one named file, once**, and asserting it only ever spawns `pi`, keeps the hole the size of the need. This is the r7 pattern (one loopback module) applied to
the other thing the scan forbids. Cost: a small, additive change to `_netscan.ts` and its tests — recorded in *Complexity Tracking* (plan.md).
**Alternatives.** Put the driver in `tests/` (unscanned) and import it from `validate/` — an unscanned module that can do anything, reachable from a scanned one. Skip the scan for `validate/pi-*` — same hole, wider.

### D7 — A second read-only command, `kiln-selftest`, because nothing else exercises the seam inside Pi

**Decision.** `kiln-selftest` (read-only; no lane, no log, no gate) asks a **gate-shaped** `select` through the seam, tries `ctx.ui.custom(…, {overlay: true})` when the capability says it can draw, and prints
`SELFTEST mode=<m> canAsk=<b> canDraw=<b> outcome=answered:<opt>|no-answer:<reason>`. An argument `timeout` runs the same question **with** a Pi timeout, as a **shape test of Pi** (not a gate).
**Rationale.** FR-010 requires exercising the seam against *real* Pi's non-answer shapes, and FR-016's human smoke needs something to press Esc on. Without an in-Pi driver the probe could only test KILN's
own fake. The `timeout` variant exists because **KILN never passes a timeout to a gate (FR-008)** — so the only way to observe Pi's timeout shape on every run (and catch drift) is a labelled non-gate.
**Alternatives.** Test the seam only against fakes — proves KILN's code, not that Pi's shapes are what the fakes say. Reuse `kiln-status` — muddles a read-only report with an interactive probe.

### D8 — Tiering: run when Pi is there; skip with a printed reason when it is not; fail loudly when asked

**Decision.** `tests/_pi-gate.ts` (a sibling of `_live-gate.ts`): **`KILN_PI` unset** → run if a `pi` binary is found, otherwise **skip with a recorded reason**; **`KILN_PI=1`** → the tier is *demanded*: a missing or
unmeasured Pi **fails** (the F-1 rule); **`KILN_PI=0`** → skip explicitly. A run that requested Pi and executed **zero** Pi tests fails (FR-011): the live tests are named `PI-LIVE: …`, and `node tests/run.ts --pi` (= `npm run test:pi`) sets `KILN_PI=1` and **refuses a run in which no `PI-LIVE:` test passed** — the same guard the runner already applies to a run of zero tests.
**Rationale.** Unlike r7's live tier, this one is **cheap and hermetic** — 0.2 s a round trip, offline, no model, no session, a temp config dir — so making it opt-in would only let it rot. Auto-run keeps it honest on
any machine that has Pi; the skip reason keeps a Pi-less CI green *and* visible.
**Alternatives.** Opt-in only (`KILN_PI=1`) like r7 — nobody would run it. Always require Pi — breaks `npm test` for a newcomer with no Pi (r5/r6's premise).

### D9 — Only measured Pi versions are supported, and the list is one constant

**Decision.** `MEASURED_PI_VERSIONS = ["0.85.1"]` in `_pi-driver.ts`. `PiReady` reports the version it ran and **fails by name** (`pi-version-unmeasured`) on any other. A test pins the README's stated version to the constant.
**Rationale.** The Node-floor lesson (r7 §10): a declared range nobody ran was wrong on both ends. Pi is pre-1.0 and fast (M9), so an unmeasured newer version is *more* likely to differ than to match. Adding a version =
run the suite on it, then edit one constant and the README.
**Alternatives.** A semver range (`^0.85`) — claims versions nobody ran. No check — a silent drift.

### D10 — The human TUI smoke is a written protocol, recorded at verification (NC1 = B)

**Decision.** [quickstart.md](./quickstart.md) §5 is the exact protocol (five steps, ~5 minutes, a real terminal). The **verification report** records it as **done — by whom, when, on which Pi version — or not done**.
It is not a test and cannot be skipped by omission (SC-008).
**Rationale.** RPC's `custom() → undefined` (M5) makes overlays unprovable by automation; the terminal is where the layers will live. A pty harness was rejected in NC1.

---

## Part B — The findings register (SQ1–SQ11) — **completed by the spike task**

Status key: **M** measured (run against real Pi) · **D** documented only · **T** needs the terminal (covered by the human smoke) · **→rN** deferred with an owner. *The spike task turns every **D** it can into **M**;
what it cannot, it leaves as **T** or **→rN** with the reason.*

| # | Question | Answer so far | Status | Evidence / reproduce | Left for the spike task |
|---|---|---|---|---|---|
| **SQ1** | Load mechanisms | `-e <file>` works; the **whole** `kiln/index.ts` (77 exports) loads under Pi's loader; a `pi` manifest + `pi install <dir>` works into an empty config (relative-path entry, no copy); extension inside a package imports `../src/*.ts`. `.pi/extensions/` documented (needs trust) and **rejected** (NC2). | **M** (`-e`, whole index, manifest) · **D** (`.pi/extensions`) | `/tmp/kp` runs A, B (this plan, 2026-09-21); [`pre-spec-probe/`](./pre-spec-probe) | Re-run A and B against the *real* `kiln/` (not a copy) once the entry exists |
| **SQ2** | Commands | Registration works; runs with no model; **collision renames both** (`dup:1`,`dup:2`); commands run in `print`/`json` too. Arguments/autocomplete (`getArgumentCompletions`) documented. | **M** · **D** (autocomplete) | run D; M2, M6 | Args and autocompletion → **→r11** (r8's commands take at most one word) |
| **SQ3** | Lifecycle vs state | By construction state is rebuilt from disk per call (D4). Behaviour of `/reload`, `/new`, `/resume`, `/fork`, compaction on a registered extension: documented only. | **D** | `extensions.md` lifecycle diagram | Measure `/reload` and session switches (RPC `new_session`/`switch_session` where they exist); **T** for the rest. **Also**: an orphaned dialog answered after a reload must not apply (spec edge case) |
| **SQ4** | The `ctx.ui` matrix | See the table below. | mixed | M3–M7; `types.d.ts` | Fill every **D** cell reachable in `rpc`/`json`/`print`; **T** for `tui` |
| **SQ5** | Overlays | `custom(factory, {overlay, overlayOptions})` → Promise resolved by `done`; `OverlayOptions` has `width`, `minWidth`, `maxHeight`, `anchor`, `row`, `col`, `margin`, `visible`, `nonCapturing` (read from `pi-tui`'s `tui.d.ts`). Survival across `turn_end`/compaction, and hosting a `select`, unknown. | **D** | `types.d.ts`, `tui.d.ts` | **T** — the human smoke draws and closes one overlay; survival/hosting → **→r9** (needs a real layer) |
| **SQ6** | Keys | `registerShortcut(key, {handler})` exists; `ctx.ui.onTerminalInput` exists. Conflicts with Pi's own keybindings unmeasured. | **D** | `types.d.ts`; `keybindings.md` | **→r9** — needs the TUI and a real layer; r8 records the two APIs and that no key is claimed |
| **SQ7** | `confirm` vs `select` | **Decided: `select` only** (D5). `confirm → false` in `print`/`json` (measured); `false` also results from cancel/timeout per docs. | **M** (headless) · **D** (cancel/timeout on `confirm`) | run C-scratch (M6) | Measure RPC `confirm` with `cancelled: true` and with a timeout, to confirm the conflation |
| **SQ8** | Events without a timer | r8 registers **no event handlers** (commands only), so it needs none. Available for r9: `turn_start`, `turn_end`, `agent_end`, `agent_settled`, `session_start`, `session_shutdown`, `session_*`, `model_select`, … | **D** | `extensions.md` lifecycle | List them in the findings; **→r9** for which drive a redraw |
| **SQ9** | Pi's model vs KILN's resident | `ctx.model`, `ctx.modelRegistry`, `ctx.scopedModels`, `pi.setModel`, `pi.registerProvider` exist; Pi **bundles a `llama` command** (llama.cpp router) even in an empty config. Whether Pi can host an Ollama model as its session model: unmeasured. | **D** · **M** (`llama`) | M8 | Measure what RPC `get_state`/`get_available_models` report in an empty config. **Decision → r10** |
| **SQ10** | Discovery and trust | A **user-scope package** loads without a trust prompt (B); `-e` files load (A). `.pi/extensions` needs project trust and would auto-load — **rejected** (NC2). | **M** · **D** | run B; `security.md` | — |
| **SQ11** | Output when nothing is drawn | **`print`/`json`: `console.log` and `process.stdout.write` go to *stderr*; `notify` prints nothing; stdout stays protocol-clean.** | **M** | run C | Also check `rpc`: where does `console.log` go? (protects the RPC stream?) |

### SQ4 — the `ctx.ui` matrix (what a KILN layer needs)

| Method | `tui` | `rpc` | `json` | `print` |
|---|---|---|---|---|
| `select(title, options, opts?)` | **D** string / `undefined` on Esc | **M** string on answer; `undefined` on `cancelled`; `undefined` after `timeout` (4.2 s) | **M** `undefined`, 0 ms | **M** `undefined`, 0 ms |
| `confirm(title, message, opts?)` | **D** boolean | **D** `confirmed: bool` / cancelled | **M** `false`, 0 ms | **M** `false`, 0 ms |
| `notify(msg, level)` | **D** shows | **M** emits an `extension_ui_request` | **M** prints nothing | **M** prints nothing |
| `setStatus(key, text)` | **D** footer | **D** emits a request | **D** no-op | **D** no-op |
| `custom(factory, {overlay})` | **D** `Promise<T>`, resolved by `done` | **M** `undefined` | **?** | **?** |
| `hasUI` / `mode` | **D** `true` / `"tui"` | **M** `true` / `"rpc"` | **M** `false` / `"json"` | **M** `false` / `"print"` |

`?` = to be measured in the spike. **`ctx.ui.headless` does not exist** (M3); **`ctx.ui.raiseOverlay` does not exist** (M4).

---

## Part C — Corrections this forces on `ui-layers-deep.md` (FR-002)

Applied as an **append-only banner** (`<!-- r8-correction -->`), the way r7's overview was corrected — the original text is left as written.

| Where | The document says | Measured / decided | Action |
|---|---|---|---|
| §10, row `ctx.hasUI` / `ctx.ui.headless` | *confirmed* | **`headless` does not exist**; `hasUI` exists but is not sufficient (RPC: `true` yet cannot draw). Use `ctx.mode` + capability. | banner |
| §10, row `ctx.ui.confirm(...)` | *spike*, "fall back to `select`" | **Decided: `select` only** — `confirm`'s `false` conflates No/cancel/timeout/headless. | banner |
| §10, row `ctx.ui.setStatus` | *confirmed* | Signature is `setStatus(key, text)`; KILN's `LiveUICtx.setStatus(footer)` has one argument. | banner |
| §10, row `ctx.ui.custom(overlay)` | *confirmed (doom)* | Confirmed to **exist**; it returns a **Promise**, and in `rpc` returns `undefined`. KILN's `raiseOverlay` push has no counterpart. | banner |
| §10, rows `handoff.ts`, overlay `Component` type, keybinding `M` | *spike* | `handoff.ts` and `doom-overlay/` exist (read); the key question is **→r9**. | banner |
| §11, Q1–Q7 | open | Q1–Q3, Q5: **T / →r9** (need a real layer); Q4: **decided** (`select`); Q6–Q7 are r9's design questions. | banner |
