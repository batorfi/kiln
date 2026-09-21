# Feature Specification: KILN on Pi — the extension foundation (row r8)

**Feature Branch**: `007-kiln-pi-extension` *(provisional short-name; the spec-directory name is per-checkout state. No git branch was created.)*

**Created**: 2026-09-21

**Status**: **Draft — three clarifications OPEN (NC1–NC3, each with a recommendation); not yet ready for `/speckit.plan`.**
Roadmap row **`r8`** was admitted at Gate 0 (`human@batorfi`, 2026-09-21T04:21:47Z, ledger entry 7 in [specs/ROADMAP.md](../ROADMAP.md)) and is `queued`,
`deps: ["r7"]`. It stays `queued` — never `active` — until its own Gates 1–9 lane opens a live gate (`chain_unattended=false`). **Nothing here admits a
program, advances a gate, decides a gate, or edits the roadmap** (P-VI): the row carries no `spec` pointer yet, and adding one is a Gate-0 edit the human makes.

**Input**: the row **`r8`** — *"kiln-v1 foundation — the Pi extension: spike the Pi extension API for real (ctx.ui, commands, lifecycle) and load KILN as an
actual Pi extension with a package layout the later rows build on."* The first of four rows (`r8`–`r11`) that make `kiln-v1` a **runnable factory**.

**Provenance (what r8 builds on, all closed to `main`)**:
- **r1** `002-kiln-lane` — the single lane, gate primitive, log writer, scheduler, and Layers A/B over one `FactoryState`.
- **r2** `003-kiln-roadmap-overlay` — Layer C and the Gate-0 face.
- **r3** `004-kiln-live-walk` — the full-rail walk and a "live TUI smoke" that drove KILN's **own abstract** `LiveUICtx`, never Pi.
- **r7** `006-kiln-live-inference` — a real Ollama resident, an async spine, and `OllamaReady`. **r7's verification is also the model for how r8 is proven:**
  measured evidence, env-gated tests that skip with a printed reason, and a probe that fails by name.

---

## Why this row exists

Everything KILN has built so far is written **against an abstract interface it invented**. The whole UI track (`ui-layers-deep.md`) was designed from Pi's
*documentation* and never once run on Pi. Every later runnable-factory row depends on what Pi actually allows, so r8 goes first, and it opens with a **spike**.

**The measured facts.** Pi `0.85.1`, macOS, 2026-09-21. Reproduce with [`pre-spec-probe/`](./pre-spec-probe) (`python3 drive.py answer|cancel|silent`) — a throwaway
extension driven through a **real** `pi --mode rpc` in an empty, hermetic `PI_CODING_AGENT_DIR`, `--offline`, with **no model called**.

| # | Observation | Evidence |
|---|---|---|
| M1 | **KILN loads into real Pi with no build step.** A `.ts` extension outside `kiln/` imported `kiln/src/clock.ts` and `kiln/ui/hud.ts` through their `.ts` specifiers; both resolved to functions. | probe `FACTS`: `kilnClock: function`, `kilnHud: function` |
| M2 | **A registered command runs with no model and no network.** Extension commands are checked before the LLM. Round trip in **0.2 s**. | `[answer] 0.2s`; `get_commands` lists `kiln-probe` with `source: extension` |
| M3 | **`ctx.ui.headless` does not exist.** `ui-layers-deep.md` §10 lists `ctx.hasUI / ctx.ui.headless` as *confirmed*. Half of that is false: there is `ctx.hasUI` and `ctx.mode` (`tui`/`rpc`/`json`/`print`), and no `headless`. | `uiHeadless: "undefined"`; the 28-key `ctx.ui` list contains no `headless` |
| M4 | **KILN's `raiseOverlay` has no counterpart.** `LiveUICtx.raiseOverlay(layer, content\|null)` is a fire-and-forget push; Pi's `ctx.ui.custom(factory, {overlay})` returns a **Promise** resolved by a `done` callback. And `LiveUICtx.setStatus(footer)` takes one argument; Pi's is `setStatus(key, text)`. | `uiRaiseOverlay: "undefined"`; `ExtensionUIContext` in `types.d.ts` |
| M5 | **In RPC mode `hasUI` is `true` but `custom()` returns `undefined`.** A UI is "present" and cannot draw Layer B or C. | `hasUI: true`, `CUSTOM_RESULT null` |
| M6 | **Headless dialogs answer instantly, with a non-answer, and the process exits 0.** In `-p` and `--mode json` (`hasUI: false`): the handler runs; `select → undefined` and `confirm → false` after **0 ms**; exit code **0**; `notify` prints nothing. | scratch run of a handler that logged to a file (both modes) |
| M7 | **A cancelled or timed-out dialog is also `undefined`.** A 4 s `timeout` resolved to `undefined` after **4.2 s**; a client `cancelled: true` gave `undefined`. Only an explicit choice returns the option string. | `SELECT_RESULT null` ×2 vs `"approve"` |
| M8 | **Pi ships a `llama` command of its own** (llama.cpp router), even in an empty config dir — so a probe cannot assert the command list is *exactly* KILN's. | `get_commands` under an empty `PI_CODING_AGENT_DIR` |
| M9 | **Pi is pre-1.0 and moving.** `0.85.1`. Its docs and its types were read; only the rows above were *run*. | `pi --version` |

**Three things the constitution and the design docs got wrong or left open**

1. **P-V's literal wording is not enough.** P-V says *"In headless (`!ctx.hasUI`) every gate … degrades to a durable `WAIT`."* M5 is a state that is **not** `!ctx.hasUI` and
   still cannot show a gate popup; M6 is `!ctx.hasUI` where a *naive* `if (!answer) continue` would sail through with exit 0. The principle is intact
   ("never silently approves"); its **detection recipe** is not. See NC3.
2. **A timeout is not a decision, and not KILN's to set.** Pi dialogs accept a `timeout` that auto-dismisses. P-IX says *"no surface blocks on a timer."* A gate waits for a human.
3. **The design doc's `confirmed` column is not evidence.** `ui-layers-deep.md` §10 marks APIs *confirmed* that were only read about. r8 replaces that column with measurements.

## What r8 is *not*

- **Not r9.** r8 does not put Layers A/B/C on Pi's real `ctx.ui`. It gives r9 the *seam* and the *facts* to do so.
- **Not r10 / r11.** No role agents, no tier→model mapping, no director, no lane-starting command. r8's command surface is **read-only status**.
- **Not a gate decision.** r8 writes **no** gate decision to the factory-log. A scripted test driver is never recorded as `human@…` (P-I, P-VII).
- **Not r4/r5.** Nothing is published or installed; `PiReady` runs Pi `--offline`.
- **Not a constitution amendment** — unless NC3 resolves that way, in which case it carries the rationale, version bump and migration note the Governance section requires.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — The Pi API is *known*, on the record (Priority: P1)

The operator (and the authors of r9–r11) need to know what Pi's extension API **actually** allows before designing on it. Every open question the UI design left
behind is answered by running real Pi — or is declared unanswerable, with the reason and the row that owns it.

**Why this priority**: it is the row's stated purpose, and every later row's plan cites it. A wrong "confirmed" (M3) costs a row.

**Independent Test**: read `research.md`; for each spike question (SQ1–SQ11) find either a measured answer with a command that reproduces it, or an explicit *not-measured — because — owner* entry. Delete one measurement and re-run it: the answer reproduces.

**Acceptance Scenarios**:
1. **Given** the spike questions below, **When** the findings record is complete, **Then** every one has a measured answer or a named deferral; none is silently absent.
2. **Given** `ui-layers-deep.md` §10 lists an API as *confirmed*, **When** the measurement disagrees (M3), **Then** the doc carries an append-only correction banner naming the measurement — the original text is not rewritten.
3. **Given** a `ctx.ui` method, **When** the findings are read, **Then** its behaviour in **each** mode (`tui`, `rpc`, `json`, `print`) is stated, and any cell that was not run is marked as such.

### User Story 2 — KILN loads as a real Pi extension and answers a command (Priority: P1)

An operator starts real Pi with KILN loaded and runs a KILN command; KILN answers from inside Pi, using KILN's own modules, with no model.

**Why this priority**: it is the row's other half, and the only proof the packaging works.

**Independent Test**: `npm run pi-ready` (or the documented one-liner) starts Pi, loads KILN, runs the status command, and reports READY — or fails by name.

**Acceptance Scenarios**:
1. **Given** Pi is installed, **When** KILN is loaded the way NC2 resolves, **Then** Pi lists KILN's command with `source: extension` and the command returns a `FactoryState` summary.
2. **Given** the extension's factory function, **When** Pi loads it, **Then** it registers commands and handlers **only** — it starts no process, socket, timer, watcher, or network call (Pi's own rule for factories).
3. **Given** the extension is reloaded (`/reload`), **When** it loads a second time, **Then** nothing is doubly registered and shutdown handlers are idempotent.
4. **Given** Pi is **not** installed, **When** the tests run, **Then** they skip with a printed reason; **when** the operator explicitly asked for the Pi tier (`KILN_PI=1`), **then** they fail loudly (the F-1 rule).

### User Story 3 — A missing or silent human is never a decision (Priority: P1)

Whatever Pi hands back from a dialog, KILN turns it into a **decision only if a human explicitly chose one of the offered options**. Everything else is `no-answer`, and `no-answer` is a durable `WAIT`.

**Why this priority**: P-V is *the* rule that keeps an unattended run honest, and M5–M7 show four different ways Pi delivers a non-answer. This is the one piece where a mistake is silent.

**Independent Test**: a table-driven test feeds the seam every measured non-answer shape and asserts `no-answer` → `WAIT` for each; a mutation that maps any one to a decision fails that row by name.

**Acceptance Scenarios**:
1. **Given** `select` returns `undefined` (cancelled), **When** the seam interprets it, **Then** the outcome is `no-answer`, never `reject` or `defer` either.
2. **Given** `confirm` returns `false`, **When** the mode is `print`/`json`, **Then** the outcome is `no-answer` — `false` from a UI that cannot reach a human is **not** a "no".
3. **Given** RPC mode (`hasUI: true`, `custom()` → `undefined`), **When** a gate needs Layer B, **Then** the gate degrades to a `WAIT`; it does not proceed as if shown.
4. **Given** a gate dialog is built, **When** its arguments are inspected, **Then** it carries **no `timeout`**.
5. **Given** a human explicitly picks `approve`, **When** the seam interprets it, **Then** the outcome is an answer — and *only then* — and the test driver's scripted reply is **not** recorded as `human@…`.

### User Story 4 — Later rows know where their code goes (Priority: P2)

The author of r9, r10 or r11 opens the package and finds, written down, where the UI, the role agents, and the director/commands each go — with no restructuring.

**Why this priority**: r8's deliverable is a *foundation*; a foundation nobody can build on is a spike.

**Independent Test**: a human at the plan gate reads the layout note and confirms each of r9–r11 has a named home; the probe loads KILN through the same manifest r9 will extend.

**Acceptance Scenarios**:
1. **Given** the package layout, **When** r10 needs `agents/*.md` and r11 needs commands, **Then** the layout note names their homes and neither requires moving an r8 file.
2. **Given** the layout, **When** r9 replaces the abstract `LiveUICtx` with real Pi calls, **Then** the seam from US3 is the only place it has to change.

### Edge Cases

- **Pi is absent, older, or newer than measured** — `PiReady` fails by name (`pi-missing`, `pi-version-unmeasured`); it never guesses.
- **The operator's own Pi config loads other extensions** (M8) — the probe uses an empty config dir and never asserts an exact command list.
- **Two extensions register the same command name** — Pi suffixes them (`/kiln:1`); r8 measures what KILN's name becomes.
- **`/reload`, `/new`, `/resume` or `/fork` while a gate is open** — the durable `WAIT` in the factory-log is the truth; an orphaned dialog answered *after* a reload must not be applied to a fresh gate (stale-token rule). Measured, not assumed.
- **The RPC client disconnects mid-dialog** — a dialog with no answer never becomes one.
- **Two Pi processes in one repository** would be **two lanes**, which P-III forbids. r1's lane is in-process; a cross-process guard is **r11's** problem. r8 only records that the hazard exists.
- **Print/json mode swallows `notify`** (M6) — the status command must state where its output goes in each mode, or say it cannot.
- **A KILN module uses syntax Node strips but Pi's loader (jiti) does not, or the reverse** — M1 proved two modules; r8 must prove the ones the extension actually needs.

## Requirements *(mandatory)*

### The spike questions (the row's stated purpose — each answered by *running* Pi)

| # | Question | Source |
|---|---|---|
| **SQ1** | Load mechanisms: `-e <file>`, a package manifest (`pi.extensions` in `package.json`), `.pi/extensions/` — what each needs, and does the *whole* `kiln/index.ts` load under Pi's loader (no build, no runtime dependency)? | M1; `packages.md` |
| **SQ2** | Commands: naming, arguments, autocompletion, collision suffixes, and behaviour when run in each of the four modes. | M2, M6 |
| **SQ3** | Lifecycle: what `session_start` / `session_shutdown` / `/reload` / `/new` / `/resume` / compaction do to an extension's in-memory state — and therefore **where `FactoryState` may live** (the factory-log is the truth; Pi's session entries are not). | `extensions.md` lifecycle |
| **SQ4** | The `ctx.ui` matrix: every method a KILN layer needs × `{tui, rpc, json, print}` — return value, side effect, and where output goes when nothing is drawn. | M3–M7 |
| **SQ5** | Overlays (`ui-layers-deep.md` §11 Q1–3): does a `ctx.ui.custom` overlay survive `turn_end` / compaction; can it host a `select`; which `overlayOptions` give a full-width modal; what does `nonCapturing` buy. | §11 |
| **SQ6** | Keys (§11 Q5): the Layer-C key vs the per-gate keys; `registerShortcut`; conflicts with Pi's own keybindings. | §11 |
| **SQ7** | `confirm` vs `select` for the two-move gates (§11 Q4) — what each returns in each mode. | §11 |
| **SQ8** | Events: which Pi events can drive a `FactoryState` redraw with **no timer** (P-IX). | P-IX |
| **SQ9** | The model relationship: can an extension read or set the Pi session model, and does KILN's Ollama resident (r7) need Pi's model at all? **Measure only — the decision is r10's.** | P-VIII, P-I |
| **SQ10** | Discovery and trust: what project trust does to `.pi/extensions/` vs `-e` vs a package. | `security.md` |
| **SQ11** | Where can an extension put output in `print`/`json` mode, given `notify` is silent (M6)? | M6 |

### Functional Requirements

- **FR-001** The findings record (`research.md`) SHALL answer SQ1–SQ11 — each with a **measured** answer and the command that reproduces it, or an explicit *not measured — reason — owner row*. No question is silently dropped. *(US1)*
- **FR-002** Where a measurement contradicts `ui-layers-deep.md` §10/§11 (notably M3), the doc SHALL gain an **append-only correction banner** naming the measurement; the original text is not rewritten. *(US1)*
- **FR-003** KILN SHALL load as a real Pi extension through the mechanism **[NEEDS CLARIFICATION: NC2 — how KILN is placed and loaded]**, importing KILN's own modules with **no build step** and **no new runtime dependency** (`kiln/package.json` keeps `dependencies: {}`). *(US2)*
- **FR-004** The extension's factory function SHALL start **no** process, socket, timer, watcher or network call, register commands and handlers only, and be safe under `/reload` (no double registration; idempotent `session_shutdown`). *(US2)*
- **FR-005** r8 SHALL register a **read-only** status command returning a `FactoryState` summary. The plan SHALL state, per mode, where that output goes — or that a mode cannot show it (SQ11) — and `PiReady` SHALL report it. It SHALL NOT start a lane, decide a gate, or write the factory-log. *(US2)*
- **FR-006** A **single seam** SHALL translate Pi's dialog results into `answered(option)` or `no-answer`. Only an **explicit selection of one of the offered options, delivered by a mode that can reach a human,** is `answered`. `undefined`, `null`, `false`-from-a-headless-mode, cancellation, timeout, and `custom()` → `undefined` are all `no-answer`; `no-answer` SHALL become a durable `WAIT` and SHALL NOT be mapped to approve, reject or defer. *(US3; P-V)*
- **FR-007** "Headless" SHALL be decided from **mode and measured capability, not `ctx.hasUI` alone** (M5). A missing capability **hides** a layer and degrades; it never advances a gate. **[NEEDS CLARIFICATION: NC3 — is P-V's `!ctx.hasUI` wording amended, or read as implemented-more-strictly?]** *(US3; P-V, P-IX)*
- **FR-008** A gate dialog built by KILN SHALL carry **no `timeout`** option: a gate waits for a human and does not expire into anything (P-IX). *(US3)*
- **FR-009** r8 SHALL write **no gate decision** to the factory-log, and a scripted driver's reply SHALL NEVER be recorded as `human@…` (P-I, P-VII). Any record r8 does emit SHALL add **no new `recordType`** and pass 001's **unmodified** `log.ts`. *(US3)*
- **FR-010** A probe **`PiReady`** (`npm run pi-ready`) SHALL start a **real** Pi in a hermetic environment (empty `PI_CODING_AGENT_DIR`, `--offline`, `--no-session`, no model), load KILN, run the status command, and exercise the FR-006 seam against real Pi's non-answer shapes. It SHALL **fail by name** for: `pi-missing`, `pi-version-unmeasured`, `extension-load-error`, `command-missing`, `round-trip-mismatch`, and — most important — `non-answer-approved`. Its sufficiency as *the* acceptance test is **[NEEDS CLARIFICATION: NC1 — what proves "loaded as a real Pi extension"]**. *(US2, US3)*
- **FR-011** Pi-dependent tests SHALL skip with a **printed reason** when Pi is absent and **fail loudly** when `KILN_PI=1` was set explicitly (r7's F-1 rule). A run that executes zero Pi tests when Pi was requested is a failure. *(US2)*
- **FR-012** The package layout SHALL be documented so that r9 (UI on Pi), r10 (role agents, tiers) and r11 (director, commands) each have a named home that needs **no** r8 file to move. *(US4)*
- **FR-013** **Nothing existing changes behaviour.** The 233-test suite stays green; r1–r7 validators and probes are unmodified; `roadmap.ts` still PASSes; the only edits to existing files are additive wiring and the FR-002 banners. *(all)*
- **FR-014** The P-VIII scan SHALL cover the new extension code like `kiln/src`. KILN's only network use stays r7's one allowlisted module; Pi's own provider traffic is Pi's, and `PiReady` runs Pi `--offline`. *(P-VIII)*
- **FR-015** Only **measured** Pi versions are declared supported (the lesson of the Node floor: a range nobody ran is a false claim). The README states the measured Pi version(s), and `PiReady` reports the version it ran. *(US2)*

### Key Entities

- **Findings record** — the answers to SQ1–SQ11, each with evidence and a reproduction command, plus the corrections it forces on the design docs.
- **The Pi seam** — the one place KILN's needs meet Pi's `ctx`: capability detection by mode, the calls layers make, and the outcome mapping. r9 changes this and nothing else.
- **Outcome** — `answered(option)` | `no-answer`. There is no third "default" value.
- **`PiReady` result** — READY, or a named failure from FR-010, plus the Pi version and mode it ran.
- **Extension entry / manifest** — the single file Pi loads and the manifest that points at it.

## Success Criteria *(mandatory)*

- **SC-001** **100 %** of SQ1–SQ11 have a measured answer or a named deferral; **0** are silent.
- **SC-002** From a clean checkout with Pi installed, **one documented command** loads KILN into real Pi and returns the status summary in **under 5 s** with **no model call**.
- **SC-003** **0 silent approvals:** every non-answer shape measured (at least: cancelled, timed out, `print`, `json`, RPC `custom()` → `undefined`) yields `no-answer` → `WAIT`; a deliberate mutation that maps any one of them to a decision is caught **by name**.
- **SC-004** A deliberately broken extension — wrong entry point, throws on load, or missing command — makes `PiReady` FAIL **by name**, never pass or hang.
- **SC-005** **0** new runtime dependencies; the existing suite is green with **0** newly failing tests; **0** existing behaviours changed.
- **SC-006** **0** statements in `ui-layers-deep.md` remain marked *confirmed* that the findings measured false.
- **SC-007** A human reviewer, reading only the layout note, can point to where each of r9, r10 and r11 puts its code.

## Clarifications — **OPEN** (NC1–NC3, recommendations offered; the human decides)

| # | Question | Options | Recommended |
|---|---|---|---|
| **NC1** | What is the acceptance test for *"loaded as a real Pi extension"*? | **A.** Automated only: `PiReady` against real Pi in RPC mode (model-free; measured feasible in 0.2 s). **B.** A, **plus** one human TUI smoke recorded in the verification report. **C.** A TUI driven by a pty/tmux harness. | **B.** RPC returns `custom() → undefined` (M5), so **A cannot prove any overlay**; the TUI is the only place the layers will ever live. A pty harness (C) is a large build for one row. The human smoke is one Gate-7 action and is honest about what automation cannot reach. |
| **NC2** | How is KILN placed and loaded? | **A.** Explicit `pi -e <path>` only. **B.** A Pi package manifest (`"pi": {"extensions": […]}` in `kiln/package.json`), so `pi install ./kiln` works. **C.** Project-local `.pi/extensions/kiln/` auto-discovery. | **A + B.** C needs project trust and would **auto-load KILN into every Pi session in this repo — including the sessions that are building KILN with Spec Kit**, a dogfooding conflict. The manifest is what r4/r5 will ship, so r8 should prove it now. |
| **NC3** | P-V says headless is `!ctx.hasUI`; M5 and M6 show that is neither necessary nor sufficient. | **A.** No amendment: implement the stricter rule (FR-006/007), record an operational definition in the r8 contract and a compliance note. **B.** Amend P-V's wording (patch `1.0.1`, with the Governance rationale and migration note). | **A** now: the principle — *never silently approves* — is untouched and the code is *stricter* than the text, so it cannot violate it. Revisit at r9, when the real UI makes the wording matter. B is available to the human at any Gate 0. |

## Assumptions

- Pi `0.85.1` is installed locally (`~/.local/bin/pi`); Pi is an **external** tool KILN runs on, not something KILN vendors.
- Verified on **macOS only**; Linux and Windows are unmeasured and the README will say so (as it does for the Node floor).
- **TUI behaviour is documented, not measured** (M-rows cover `rpc`, `json`, `print`). The TUI is what NC1's human smoke reaches.
- r8 changes no lane, gate, scheduler or log semantics; the async spine from r7 is unchanged.
- The Pi *session* model and KILN's Ollama *resident* are different things; their relationship (SQ9) is **measured** here and **decided** in r10.
- `specs/007-kiln-pi-extension/pre-spec-probe/` is **throwaway evidence**: it is not part of the toolchain, is not scanned or shipped, and is superseded by r8's own spike.
