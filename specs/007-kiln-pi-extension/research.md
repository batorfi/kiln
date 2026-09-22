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

### D11 — The driver answers a dialog while `prompt` is still pending  *(spike T009, measured)*

**Decision.** `validate/_pi-driver.ts` sends a slash-command `prompt` **without waiting for its response**, watches for the `extension_ui_request`, answers it, and only then reads the outcome.
**Rationale.** *Measured:* Pi answers a `prompt` only **after the command's handler finishes**, and a handler blocked on `select` cannot finish until the client answers — so a client that awaits the `prompt` response before answering **deadlocks until its own timeout** (the spike's first run "measured" every dialog at ~9.8 s: that was the *driver's* 10 s timeout, not Pi). Pi may also emit the `extension_ui_request` **before** the `prompt` response, so the driver searches *all* events for a not-yet-answered request rather than only new ones.
**Alternatives.** Awaiting `prompt` first — measured to deadlock. A fixed sleep — a race.

### D12 — The extension registers no event handlers, because handlers accumulate  *(spike T011, measured)*

**Decision.** Confirms the plan's contract E6: `kiln/pi/index.ts` registers **commands only**. No `pi.on(…)`.
**Rationale.** *Measured:* after `new_session`, Pi emits `session_shutdown`, **runs the extension's factory again**, and `session_start` then fires **twice** — consistent with the previous instance's handler still being alive alongside the new one. **Module-level state survives** the re-run (a counter carried `2 → 3`). A factory that registers handlers, or keeps state in a module variable, therefore double-fires and drifts across a session change. Commands did **not** double: the command list after `new_session` was identical (`['l-ping','l-ask']`, no `:n` suffix). r9, which needs events to redraw, must design for accumulation (an idempotent guard); r8 needs none.
**Alternatives.** A guarded handler registered once — needs a state flag, which the same measurement shows is unsafe to keep in the module.

## Part B — The findings register (SQ1–SQ11) — **completed by the spike (T008–T013), 2026-09-21**

Status key: **M** measured (run against real Pi 0.85.1, hermetic, no model) · **D** documented only · **T** needs the terminal (covered by the human smoke) or a model turn · **→rN** deferred with an owner.
Every **M** reproduces with a script in [`spike/`](./spike) (`python3 spike/<script>`), except run A/B/C/D of SQ1/SQ2/SQ11-headless, which are the planning-time runs recorded in [plan.md](./plan.md) and re-run against the real `kiln/` by T039.

| # | Question | Answer | Status | Evidence / reproduce | Remaining |
|---|---|---|---|---|---|
| **SQ1** | Load mechanisms | `-e <file>` works; the **whole** `kiln/index.ts` (77 exports) loads under Pi's loader; a `pi` manifest + `pi install <dir>` works into an empty config (a **relative-path** entry, no copy); an extension inside a package imports `../src/*.ts`. **Re-run against the real `kiln/` (T035): both routes list `kiln-status` and `kiln-selftest` with the correct `source`/`origin`.** **Also measured: `-ne` (no extension discovery) blocks a PACKAGE-installed extension too — only an explicit `-e` still works with it** — so the driver's package-loading session omits `-ne`. `.pi/extensions/` needs project trust and would auto-load — **rejected** (NC2). | **M** (`-e`, whole index, manifest, `-ne` interaction) · **D** (`.pi/extensions`) | planning runs A, B; T035's real-`kiln/` run; [`pre-spec-probe/`](./pre-spec-probe) | — |
| **SQ2** | Commands | Registration works and runs with **no model**; **two extensions with the same name are both renamed** (`dup:1`, `dup:2`); commands run in `print` and `json`; the command list is **unchanged across `new_session`** (no doubling, no suffix). **`prompt` answers only after the handler finishes** (D11). Arguments and autocompletion (`getArgumentCompletions`) documented. | **M** · **D** (autocomplete) | run D; `spike/sq03_lifecycle.py` (C); `spike/sq04_matrix.py` | arguments/autocomplete → **→r11** (r8's commands take at most one word) |
| **SQ3** | Lifecycle vs state | On `new_session`: `session_shutdown` fires, the **factory runs again**, **module-level state survives** (counter `2 → 3`), and `session_start` fires **twice** — handlers accumulate (D12). Commands are replaced cleanly. **`/reload` sent over RPC has no observable effect** (no factory re-run, no session events). `clone` fails — *"This session has not been saved yet. Wait for the first assistant response"*; `fork`, `clone` and a meaningful `switch_session` need a **saved session**, i.e. a model turn. **A dialog left open across `new_session` is NOT cancelled: `new_session` succeeds at once and a late answer IS DELIVERED to the stale handler** (`ask-result: approve` logged after the switch). | **M** (new_session, orphan dialog, command list) · **T** (`/reload`) · **T / needs a model** (`fork`, `clone`, `switch_session`) | `python3 spike/sq03_lifecycle.py` | applying an answer must bind to the gate's **token** — r1's `resumeByToken` already refuses a non-matching token (`"still-open"`); the answer-applying code is **→r9/r11**. `/reload`, fork/clone → **T** |
| **SQ4** | The `ctx.ui` matrix | See the table below. | **M** (`rpc`, `json`, `print`) · **D** (`tui`) | `python3 spike/sq04_matrix.py` | `tui` column → **T** (the human smoke) |
| **SQ5** | Overlays | `custom(factory, {overlay, overlayOptions})` → a Promise resolved by `done`; `OverlayOptions` has `width`, `minWidth`, `maxHeight`, `anchor`, `row`, `col`, `margin`, `visible`, `nonCapturing` (`pi-tui`'s `tui.d.ts`). **In `rpc`, `json` and `print` it returns `undefined`** (and `rpc` emits no UI request). **In `tui`, Pi does NOT auto-close an overlay on Enter/Esc — the component itself MUST implement `handleInput` and call `done`, or it hangs forever** (measured the hard way: F-1 in `verification-report.md` §5, found by the human smoke test, invisible to `rpc`-mode automation). Survival across `turn_end`/compaction, and hosting a `select`, unknown. | **M** (`undefined` outside `tui`; `tui` close behaviour) · **D** (survival, hosting) | `spike/sq04_matrix.py`; `kiln/tests/pi/selftest.test.ts`'s regression tests | survival/hosting → **→r9** (needs a real layer) |
| **SQ6** | Keys | `registerShortcut(key, {handler})` and `ctx.ui.onTerminalInput` exist. Conflicts with Pi's own keybindings unmeasured. | **D** | `types.d.ts`; `keybindings.md` | **→r9** — needs the TUI and a real layer; r8 claims **no** key |
| **SQ7** | `confirm` vs `select` | **Decided: `select` only.** *Measured:* in `rpc`, a `confirm` **answered NO, cancelled, timed out** all return `false` — and so does `confirm` in `json` and `print`: **one value for five situations.** `select` returns a **string only for an explicit choice**; cancel, timeout and both headless modes return `undefined`. | **M** | `python3 spike/sq07_sq11.py` | — |
| **SQ8** | Events without a timer | r8 registers **no event handlers**, so it needs none (D12: they accumulate across a session change). Available for r9: `turn_start`, `turn_end`, `agent_end`, `agent_settled`, `session_start`, `session_shutdown`, `model_select`, … | **D** | `extensions.md` lifecycle | which events drive a redraw → **→r9** |
| **SQ9** | Pi's model vs KILN's resident | In an **empty config** Pi has **no usable session model**: `get_state.model.id` is `"unknown"`, `get_available_models` returns **0** models. Pi **bundles a `llama` command** (llama.cpp router). Pi documents configuring Ollama, vLLM and LM Studio providers in `~/.pi/agent/models.json` (`models.md`); `ctx.model`, `ctx.modelRegistry`, `pi.setModel`, `pi.registerProvider` exist. | **M** (empty config) · **D** (Ollama via `models.json`, the API) | `python3 spike/sq09_models.py`; `models.md` | **decision → r10** — whether KILN's resident and Pi's session model are one thing |
| **SQ10** | Discovery and trust | A **user-scope package** loads with no trust prompt (B); `-e` files load (A). `.pi/extensions` needs project trust and would auto-load — **rejected** (NC2). | **M** · **D** | run B; `security.md` | — |
| **SQ11** | Output when nothing is drawn | **In `print`, `json` and `rpc`, an extension's `console.log`, `process.stdout.write` and `console.error` all land on *stderr***; stdout stays protocol-clean (rpc: **no** non-JSON line on stdout). `notify` prints nothing in `print`/`json`; in `rpc` it is an `extension_ui_request`. | **M** | `python3 spike/sq07_sq11.py`; run C | — |

### SQ4 — the `ctx.ui` matrix (what a KILN layer needs)

| Method | `tui` | `rpc` | `json` | `print` |
|---|---|---|---|---|
| `select(title, options, opts?)` | **D** string / `undefined` on Esc | **M** answered → `"a"`; **cancelled → `undefined`**; **timeout 1.5 s → `undefined` (1504 ms)** | **M** `undefined`, 0 ms | **M** `undefined`, 0 ms |
| `confirm(title, message, opts?)` | **D** boolean | **M** yes → `true`; **NO → `false`; cancelled → `false`; timeout → `false`** | **M** `false`, 0 ms | **M** `false`, 0 ms |
| `notify(msg, level)` | **D** shows | **M** emits a `notify` request | **M** returns; **nothing printed** | **M** returns; nothing printed |
| `setStatus(key, text)` | **D** footer | **M** emits a `setStatus` request (set, then clear) | **M** returns (no-op) | **M** returns (no-op) |
| `custom(factory, {overlay})` | **D** `Promise<T>`, resolved by `done` | **M** `undefined`; **no UI request emitted** | **M** `undefined` | **M** `undefined` |
| `hasUI` / `mode` | **D** `true` / `"tui"` | **M** `true` / `"rpc"` | **M** `false` / `"json"` | **M** `false` / `"print"` |

**`ctx.ui.headless` does not exist** (M3); **`ctx.ui.raiseOverlay` does not exist** (M4). The `tui` column is **T**: it is what the human smoke (quickstart §5) covers.

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
