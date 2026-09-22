---
description: "Task list for 007-kiln-pi-extension (r8) — KILN on Pi: the extension foundation"
---

# Tasks: 007-kiln-pi-extension (r8)

**Input**: Design documents from `specs/007-kiln-pi-extension/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) (D1–D10, findings register SQ1–SQ11) ·
[data-model.md](./data-model.md) (E1–E8) · [contracts/](./contracts/) (`pi-seam` S1–S7 · `pi-extension` E1–E8 · `pi-ready` R1–R6) · [quickstart.md](./quickstart.md) (§1–§6)

**Tests**: **INCLUDED.** This row's deliverable *is* a seam, a probe and a set of assertions — FR-006–FR-011, SC-003/SC-004 and the mutation requirement are test artifacts, not optional extras.
**Test-first inside every story:** the tests are written and seen to **fail** before the code that satisfies them.

**Organization**: grouped by user story (US1–US4 from spec.md). **Phase order is not story order, deliberately:** US3 (the seam — the row's centre) is built **before** US2, because `kiln-selftest` asks its question *through* the seam.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4; Setup / Foundational / Polish carry no story label

## Path Conventions

Single project; the toolchain lives under `kiln/` (`kiln/pi/` is **new**). Node `^22.18.0 || >=23.6.0`, `node --test` runs `.ts` directly, zero dependencies. Evidence scripts (Python, throwaway) live in `specs/007-kiln-pi-extension/spike/`.

**Canonical / existing artifacts that MUST NOT be modified** (any diff here is a task failure — asserted by T046):
`kiln/validate/log.ts` · `kiln/validate/roadmap.ts` · `kiln/validate/_core.ts` · `kiln/validate/_report.ts` · `kiln/schemas/*.json` · `kiln/contracts/move-vocabulary.ts` · `kiln/src/roles.ts` · `kiln/src/gate.ts` · `kiln/src/lane.ts` · `kiln/src/scheduler.ts` · `kiln/src/ollama-resident.ts` · all of `kiln/ui/*`.
**The only existing files r8 may change, and only additively:** `kiln/package.json` · `kiln/index.ts` · `kiln/validate/_netscan.ts` · `kiln/tests/run.ts` · `docs/concepts/ui-layers-deep.md` (append-only banner) · `README.md`.
**Two hard rules for every task:** *(1)* **nothing in `kiln/` imports `@earendil-works/*`** (research D1); *(2)* **never run `pi install` or any Pi command against the operator's own `~/.pi`** — hermetic temp config only (contract R1).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: record the baseline and land the two pieces of test tooling everything else leans on.

- [x] T001 Record the pre-change baseline in `specs/007-kiln-pi-extension/baseline.md`: `cd kiln && npm test` counts (expected **233 tests, 221 pass, 0 fail, 12 skipped**), `npm run validate:roadmap -- ../specs/ROADMAP.md` = PASS, all four existing probes READY (`ollama-ready` may skip with its printed reason), and `pi --version` = **0.85.1** — so any later regression is attributable.
- [x] T002 [P] Create the Pi tiering helper `kiln/tests/_pi-gate.ts` (research **D8**) **test-first** with `kiln/tests/runner/pi-gate.test.ts`: `piMode()` returns `"demand"` iff `KILN_PI==="1"`, `"off"` iff `KILN_PI==="0"`, else `"auto"`; `piAvailable()` runs `pi --version` via `spawnSync` (this file is under `tests/`, unscanned); `skipUnlessPi()` returns node-test `{ skip: <recorded reason> }` — **skip with a printed reason** when auto/off and Pi is absent or off; in `demand` mode it **never skips**: an absent or unmeasured Pi must make the test **fail** (the F-1 rule). Not a `*.test.ts`-named suite of its own. Cover all three modes × {present, absent}.
- [x] T003 [P] Add a **`--pi` flag** to `kiln/tests/run.ts` and the npm script `"test:pi": "node tests/run.ts --pi tests/pi"` to `kiln/package.json`: `--pi` sets `KILN_PI=1`, and after the run the runner **fails if no `PI-LIVE:` test passed** (FR-011: zero Pi tests when Pi was requested is a failure). Match both reporter formats — `/(?:✔|ok \d+ -)\s+PI-LIVE:/` — because the runner's own tests already tripped on `ℹ`-vs-TAP (the Node-floor lesson). Add cases to `kiln/tests/runner/` (a run with no `PI-LIVE:` pass fails; the default run and every existing flag are unchanged). *Edits an existing file — additive only.*

**Checkpoint**: baseline recorded; the tiering helper and the `--pi` guard exist; nothing behavioural changed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the shared vocabulary (`port.ts` types) and the two P-VIII scan changes (research **D6**). Everything else depends on these, and all are **offline-testable** — no Pi needed.

**⚠️ CRITICAL**: no user story work may begin until this phase is complete and the suite is green again.

- [x] T004 Create `kiln/pi/port.ts` — **types only, no logic, no imports**: `PiMode = "tui" | "rpc" | "json" | "print"`; the structural `PiApi` / `PiCtx` / `PiUi` per data-model **E1** (`registerCommand`, `ctx.mode`, `ctx.hasUI`, `ctx.cwd`, `ctx.ui.select`, `ctx.ui.notify`, `ctx.ui.custom`) with `mode` typed **optional** ("`mode` may be absent or a value KILN has never seen … that is a *valid* input that means **cannot ask**"); `Capability { mode; canAsk; canDraw; why }` (**E2**); `GateQuestion { title: string; options: readonly string[] }` — **"there is no `timeout` field and no `signal` field"**, `options` "non-empty and its members are distinct" (**E3**); `NoAnswerReason = "cannot-ask" | "dismissed" | "not-offered" | "wrong-type"` and `Outcome` (**E4**) — **"There is no third value"**. Must pass the P-VIII scan.
- [x] T005 Add `"pi"` to `SCAN_DIRS` in `kiln/validate/_netscan.ts`, **test-first** with `kiln/tests/pi/scan-pi.test.ts`: `SCAN_DIRS` includes `"pi"`; `zeroNetworkScan` over the real `kiln/pi/` is green with `filesScanned ≥ 1` (never vacuous); `scanText` **flags** a planted `import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"` as an *external dependency* (this is the **measured evidence for D1** — keep it as a test) and flags a planted `import … from "node:child_process"` in `kiln/pi/x.ts`. Every existing `tests/netscan/*` test stays green **unmodified**.
- [x] T006 Add the process allowlist to `kiln/validate/_netscan.ts`, **test-first** with `kiln/tests/pi/process-allowlist.test.ts` (mirror `tests/netscan/allowlist.test.ts`): export `PROCESS_ALLOWLIST: readonly string[] = ["validate/_pi-driver.ts"]` and `processAllowlistIsSingle()` (**exactly one** — an empty list and a second entry are both refused); give `scanText` an **optional fifth parameter** `processAllowlist = PROCESS_ALLOWLIST` and `zeroNetworkScan` an optional fourth. In the allowlisted file **only** the `child_process` import message is exempted. Tests: `child_process` in `validate/_pi-driver.ts` passes; the same text in `validate/other.ts` **fails**; in `src/_pi-driver.ts` (same basename, other dir) **fails** (by path, not basename — the CR-8 rule); `http`/`net`/`fetch(` in the allowlisted file **still fail**; a second entry is refused; every pre-existing call keeps its exact behaviour.
- [x] T007 Run the whole suite and the four existing probes (`runtime-ready`, `overlay-ready`, `live-ready`, `ollama-ready`): all as at T001. The scan now covers `kiln/pi/`, so this also proves `port.ts` is clean.

**Checkpoint**: the scan polices `kiln/pi/`; exactly one process-spawning module is permitted, by path; baseline restored.

---

## Phase 3: User Story 1 — The Pi API is *known*, on the record (Priority: P1) 🎯

**Goal**: SQ1–SQ11 each have a **measured** answer with a reproducing command, or an explicit *not measured — reason — owner*; the design docs stop claiming what was never run.

**Independent Test**: read `research.md` Part B — no blank row, no **D** cell called *confirmed*; delete a measurement and re-run its script — the answer reproduces; `ui-layers-deep.md` carries the banner and its original text is byte-identical.

Everything here is **read-only against Pi** and hermetic (spike scripts create a temp `PI_CODING_AGENT_DIR`, pass `--offline --no-session`, call no model).

- [x] T008 [US1] Create `specs/007-kiln-pi-extension/spike/pirpc.py` — the hermetic RPC harness proven during planning (temp agent dir removed in a `finally`; `--mode rpc --no-session --offline -ne`; a hard deadline that kills Pi; helpers to send commands, answer `extension_ui_request`s, and collect `extension_ui_response`) — and `spike/README.md` saying how to reproduce every measurement. These scripts are **throwaway evidence**, never shipped or scanned.
- [x] T009 [P] [US1] `spike/sq04_matrix.py` + `spike/matrix-ext.ts`: for `select`, `confirm`, `notify`, `setStatus`, `custom` measure every reachable cell of the **SQ4 matrix** in `rpc`, `json`, `print` — including `confirm` **answered / cancelled / timed out** and `custom` in `json`/`print` (the two `?` cells). Print a table.
- [x] T010 [P] [US1] `spike/sq07_sq11.py` + `spike/out-ext.ts`: **SQ7** — RPC `confirm` with `cancelled: true` and with a `timeout`: is `false` really conflated with "No"? **SQ11** — where does `console.log` / `process.stdout.write` go in **`rpc`** (the `print`/`json` answer — *stderr* — is already measured).
- [x] T011 [P] [US1] `spike/sq03_lifecycle.py` + `spike/life-ext.ts`: **SQ3** — drive RPC `new_session`, `switch_session`, `fork`, `clone` (and `/reload` if reachable) against an extension that records its registrations to a temp file: does anything double or leak? **Also the spec's edge case:** answer a dialog *after* a session switch — it must **not** be applied to a fresh gate. Cells that need the terminal are marked **T**, not guessed.
- [x] T012 [P] [US1] `spike/sq09_models.py`: **SQ9** — in an empty config, what do RPC `get_state` and `get_available_models` report; is Pi's bundled `llama` command (M8) relevant. **Measure only — the decision is r10's**; record the owner.
- [x] T013 [US1] Update `research.md` **Part B** (depends on T009–T012): replace every reachable **D** with **M** plus the command and result; fill the SQ4 table (no `?` left in `rpc`/`json`/`print`); leave **T** and **→rN** cells with their *reason*. **Invariant (data-model E7):** at the close of r8 *no row is blank and no **D** cell is described as *confirmed*.*
- [x] T014 [US1] Apply **Part C** as an **append-only** banner to `docs/concepts/ui-layers-deep.md` — an `<!-- r8-correction -->` block (the r7-overview pattern) naming `ctx.ui.headless` (does not exist), `ctx.ui.confirm` (decided: `select` only), `setStatus(key, text)`, `custom` (a Promise; `undefined` in rpc), and §11 Q1–Q7's status. **First** record the SHA-256 of the file as it stands now in the test below; the text **before** the marker must hash identically afterwards. Test: `kiln/tests/pi/doc-correction.test.ts`.
- [x] T015 [US1] `kiln/tests/pi/findings.test.ts` (SC-001, SC-006): parse `research.md` Part B — rows SQ1…SQ11 all present; none has an empty *Answer* or *Status*; every status is one of **M / D / T / →rN** (or a combination); no **D** cell contains the word *confirmed*; Part C's every named API appears in the banner.

**Checkpoint**: US1 complete — the findings record is honest and complete; the design docs are corrected without being rewritten.

---

## Phase 4: User Story 3 — A missing or silent human is never a decision (Priority: P1) 🎯 MVP

**Goal**: whatever Pi returns from a dialog becomes `answered(option)` **only** for an explicit choice of an offered option from a mode that can reach a human; everything else is `no-answer` → a durable `WAIT`.

**Independent Test**: the table-driven suite feeds the seam every measured non-answer shape and asserts `no-answer` for each; a mutant that turns any one row into an answer fails **that row by name**. Fully offline — no Pi.

> **Write T016–T019 first and watch them FAIL** — the code does not exist yet.

- [x] T016 [P] [US3] `kiln/tests/pi/capability.test.ts` (**FR-007**) — the **S2** table verbatim: `tui`+`hasUI:true` → `canAsk` **and** `canDraw`; `rpc`+`true` → `canAsk`, **not** `canDraw` (M5); `json`, `print` (`hasUI:false`) → neither; **any other / absent `mode` → neither** (fail-safe); `tui`/`rpc` with `hasUI:false` → neither (contradiction). **Nothing is inferred from `hasUI` alone** — include a case where `hasUI:true` and `mode` is absent.
- [x] T017 [P] [US3] `kiln/tests/pi/seam.test.ts` + `kiln/tests/pi/_seam-rows.ts` — the **S3.1 truth table as data**: **N1–N9** each **must** yield `no-answer` (with the contract's reason), **Y1** (`"approve"` from `tui`/`rpc`) the only `answered`. **Mutation harness (SC-003):** `_seam-rows.ts` exports `checkInterpret(fn)` returning the *names* of the rows it fails; the real `interpret` returns `[]`; **for each of N1–N9 a mutant `interpret` that maps that row to `answered`** must return a list containing **that row's name** — so a mutant is caught *by name*, not merely "some test failed". Include the order rule: a headless mode that returns a string by accident still yields `cannot-ask` (that check comes **first**).
- [x] T018 [P] [US3] `kiln/tests/pi/no-timeout.test.ts` (FR-008, S4): `askGate(ctx, q)` calls `ctx.ui.select` with **exactly two arguments** (`arguments.length === 2`); a fake `ctx` asserts no third argument and no `timeout`/`signal` key anywhere; **static check** — across `kiln/pi/*.ts`, `select(` appears only in `outcome.ts` (`askGate`) and in `selftest.ts` on a line carrying the marker `// SHAPE-TEST` (the labelled Pi-timeout probe, *not a gate*, research D7).
- [x] T019 [P] [US3] `kiln/tests/pi/seam-wait.test.ts` (FR-006, FR-009, S5): `resolveAsk` on **`no-answer`** returns r1's `Wait` (`{ gate, token, deadline }`) and leaves `gate.wait` set — built by the real `headlessWait`; on **`answered`** it returns the option **unapplied** (the gate is untouched: no `wait`, no move applied, **no `decidedBy` anywhere in the result**); **static purity** — `kiln/pi/outcome.ts` imports none of `applyMove`, `autoApprove`, `resumeByToken`, `makePreDelegation` and no log writer (so no new `recordType` is possible); a scripted reply **cannot** become `human@…`.
- [x] T020 [US3] Implement `detectCapability(ctx)` in `kiln/pi/port.ts` per **S2** (**FR-007**: headless is decided from mode and measured capability, *not `ctx.hasUI` alone*) — a capability is granted **only by an affirmative row**; the default is *cannot ask*; `why` names the deciding rule. Turns T016 green.
- [x] T021 [US3] Implement `kiln/pi/outcome.ts` per **S3–S5**: `interpret(raw, options, capability)` **in exactly this order** — `!canAsk → no-answer("cannot-ask")`; `undefined`/`null → "dismissed"`; non-string `→ "wrong-type"`; not in `options → "not-offered"`; else `answered(raw)`; `askGate(ctx, question)` (two-argument `select`); `resolveAsk(ctx, gate, question)` → `answered` unapplied, or `headlessWait(gate)`. Imports only `port.ts` and `../src/gate.ts`. Turns T017–T019 green.
- [x] T022 [US3] **Mutation pass** (recorded in the implementation report): temporarily break `outcome.ts` five ways — move the `cannot-ask` check last; drop the `options.includes` guard; accept `true`; map `undefined` to `answered`; add a third argument to `select` — and confirm **each** fails its row **by name**. Restore; suite green.
- [x] T023 [US3] Write `specs/007-kiln-pi-extension/compliance-note.md` (**FR-017**, S6): the **operational definition** of "headless" verbatim from `contracts/pi-seam.md` S6 (*cannot obtain an explicit human choice from a mode that can reach a human; decided by mode and measured capability, never by `ctx.hasUI` alone*), and why an implementation **stricter** than P-V's `!ctx.hasUI` wording is compliant; the constitution is **not amended** (NC3 = A); **the wording is to be revisited at the r9 seam**.

**Checkpoint**: US3 complete — the row's centre is built, mutation-proof and offline. **Stop here and you have the MVP:** a seam no silence can pass through.

---

## Phase 5: User Story 2 — KILN loads as a real Pi extension and answers a command (Priority: P1)

**Goal**: real Pi, started hermetically, loads KILN by `-e` **and** by the package manifest, lists both commands, and returns status — no model, under 5 s; a broken extension fails **by name**.

**Independent Test**: `cd kiln && npm run pi-ready` → READY; each falsify hook fails with **exactly its named failure**, never a pass, never a hang.

> **Write T024–T027 first and watch them FAIL.**

- [x] T024 [P] [US2] `kiln/tests/pi/extension.test.ts` (FR-004, contract **E1/E6**): drive the factory with a **fake `PiApi` that records every call** — exactly **two** `registerCommand` names (`kiln-status`, `kiln-selftest`) and **zero** of everything else (no `on`, tools, shortcuts, flags, providers); calling `makeKilnExtension()` twice yields two independent, state-free registrations (safe under `/reload`); **static**: `kiln/pi/*.ts` contains no `setTimeout`/`setInterval`/`fetch`/`spawn`/`createServer` and no module-level `let`/mutable state.
- [x] T025 [P] [US2] `kiln/tests/pi/status.test.ts` (FR-005, **E5**): from a temp `specs/ROADMAP.md`, `buildStatus(cwd)` reports a row count **equal to `extractHead`'s**, `nextEligible === nextEligibleRow(rows)`, and `lane: "none"`; the idle `FactoryState` is **`resident: null`, `running: null`, `queue: []`, `switches: 0`, `roadmap: <rows>`, `current: ""`, `gate0: { status: <head.gate0.status> }`, `gate: null`**; a missing ROADMAP answers `no roadmap found in <cwd>` (**not** a throw); a malformed head answers with a named message; **read-only** — the directory listing and file mtimes are unchanged afterwards.
- [x] T026 [P] [US2] `kiln/tests/pi/output.test.ts` (**E4**, SQ11): `emit(ctx, text)` — `tui`/`rpc` → `ctx.ui.notify(text, "info")`; `print`/`json` → `console.log` (captured); unknown mode → `console.log`; output is **ASCII with no ANSI**, one fact per line, prefixed `KILN status ` or `SELFTEST `.
- [x] T027 [P] [US2] `kiln/tests/pi/selftest.test.ts` (**E3**, D7): with a fake `ctx` per capability — `tui` draws **one overlay first** via `ctx.ui.custom(…, {overlay:true})`, *then* asks; `rpc` reports `canDraw=false` and **skips** the overlay (does not fail); `print`/`json` report `canAsk=false` and **never call `select`**; the line is exactly `SELFTEST mode=<m> canAsk=<b> canDraw=<b> outcome=answered:<opt>|no-answer:<reason>`; the `timeout` argument runs the same question **with** a Pi `timeout` on the `// SHAPE-TEST` line only; **writes nothing and decides nothing**.
- [x] T028 [US2] Implement `kiln/pi/output.ts` (turns T026 green). Imports `port.ts` only.
- [x] T029 [US2] Implement `kiln/pi/status.ts` (turns T025 green): reads `specs/ROADMAP.md` under `cwd` with `node:fs`; parses with `extractHead` (`../validate/roadmap.ts`); builds the idle `FactoryState`; renders with `renderHud` (`../ui/hud.ts`) and `nextEligibleRow` (`../ui/factory-state.ts`). **Read-only.**
- [x] T030 [US2] Implement `kiln/pi/selftest.ts` (turns T027 green): overlay first if `canDraw`, then `askGate` through the seam; the single `// SHAPE-TEST` line for the `timeout` argument. Writes no log, applies no move.
- [x] T031 [US2] Implement `kiln/pi/index.ts` (turns T024 green): `makeKilnExtension(overrides?)` — `overrides` may replace `interpret` (used **only** by the probe's mutant fixtures); the **default export is `makeKilnExtension()`**; registers `kiln-status` and `kiln-selftest` and **nothing else**. Each command takes at most one word of argument.
- [x] T032 [US2] Add the manifest to `kiln/package.json` — `"pi": { "extensions": ["./pi/index.ts"] }` (**NC2 = A + B**) — and write `kiln/tests/pi/layout.test.ts` (**SC-009**, contract **E2**): the manifest is exactly that; `dependencies` is still `{}`; **no `.pi/extensions/` entry for KILN exists at the repository root**; **no file under `kiln/` names an `@earendil-works/` specifier** (S1); the runner's `scripts.test.ts` stays green. *Edits an existing file — additive only.*
- [x] T033 [P] [US2] Create the falsify fixtures in `kiln/fixtures/pi/` (unscanned, like the other fixtures), each **deliberately wrong in exactly one way**: `bad-entry.ts` (no default-exported function), `throws-on-load.ts` (throws when the factory runs), `no-command.ts` (registers `kiln-status` only), `wrong-status.ts` (reports the wrong row count), `approve-non-answer.ts` (`makeKilnExtension({ interpret: <mutant mapping undefined → answered> })`), and `bad-manifest/package.json` (a `pi` manifest naming a file that does not exist). Relative imports of `../../pi/index.ts` only.
- [x] T034 [P] [US2] `kiln/tests/pi/pi-driver.test.ts` **(offline — no real Pi)** for contract **R1/R5**: the driver **refuses a binary whose basename is not `pi`/`pi.cmd`** with the named failure `pi-bin-refused`; it spawns with an **argument array and `shell: false`**; the `PI_CODING_AGENT_DIR` it passes is **fresh, empty, under `os.tmpdir()` and never the operator's `~/.pi/agent`**, and is **removed** afterwards even on failure; a fake `pi` executable that hangs (`kiln/fixtures/pi/hang/pi`, a `chmod +x` script) is **killed at the deadline** and reported as `timeout` — **never a hang** (SC-004).
- [x] T035 [US2] Implement `kiln/validate/_pi-driver.ts` (turns T034 green; **the only module in the repo that imports `node:child_process`**): `MEASURED_PI_VERSIONS = ["0.85.1"]`; the hermetic launcher (temp agent dir, `--offline` **and** `PI_OFFLINE=1`, `--no-session`, `--mode rpc`, `-ne` for the explicit-`-e` case); a tiny RPC client (`get_commands`, `prompt`, `extension_ui_response`); print/json runners; `install(dir)` into a **fresh** temp dir; per-step (10 s) and overall (30 s) deadlines. Imports **no** network module and calls no `fetch`.
- [x] T036 [P] [US2] `kiln/tests/pi/pi-ready.test.ts` **(offline parts)**: `skipped: true` implies **`ready: false` and a non-empty `skipReason`**; no Pi and `KILN_PI` unset → skip, exit **2**, reason printed; `KILN_PI=1` with no Pi → **FAIL `pi-missing`**; `--no-pi` → `pi-missing`; `--old-version` → `pi-version-unmeasured` (short-circuits before starting an extension); `--plant-autoload` → `autoload-present`; `--extra-process` and `--extra-loopback` → `allowlist-not-single`; the READY line reports the Pi version.
- [x] T037 [US2] Implement `kiln/validate/pi-ready.ts` per **R1–R6** (turns T036 green): checks **a–i**, each with its **named** failure (`pi-missing`, `pi-version-unmeasured`, `extension-load-error`, `command-missing`, `round-trip-mismatch`, `non-answer-approved`, `manifest-load-error`, `autoload-present`, `scan-red`, `allowlist-not-single`, plus `timeout` and `pi-bin-refused`); commands matched by **`sourceInfo.path` under `kiln/pi/`**, a `:n` suffix tolerated, **never by bare name** (D3); check **e** compares the status row count to the **truth parsed from `specs/ROADMAP.md`**, not a canned string; check **f** runs the **R2.1 shapes** (control / cancel / timeout / print / json / rpc-overlay) and reports **`non-answer-approved`** if any non-control shape says `answered`; the **control must be `answered:approve`** — a probe that can never say "answered" proves nothing. Add `"pi-ready": "node validate/pi-ready.ts"` to `kiln/package.json`. Composes on the earlier probes; runs no gate, admits no program (P-VI).
- [x] T038 [US2] `kiln/tests/pi/pi-live.test.ts` — every test named **`PI-LIVE: …`**, gated by `skipUnlessPi()` (T002): READY on real Pi 0.85.1 with the round trip **under 5 s** (SC-002); each R2.1 shape against real Pi; **every falsify hook end-to-end** — `bad-entry` and `throws-on-load` → `extension-load-error` (the latter **without hanging**), `no-command` → `command-missing`, `wrong-status` → `round-trip-mismatch`, `approve-non-answer` → **`non-answer-approved`**, `bad-manifest` → `manifest-load-error`. In `demand` mode an absent Pi **fails** these; in `auto` it skips with the printed reason.
- [x] T039 [US2] Re-run **SQ1 runs A and B against the *real* `kiln/`** (not the planning-time copy): `pi -e kiln/pi/index.ts`, and `pi install ./kiln` into a temp agent dir then Pi **without** `-e` — the whole `kiln/index.ts` still loads and both commands appear with `origin: package`. Record the commands and output in `research.md` SQ1 (**M**).
- [x] T040 [US2] **Checkpoint gate:** `cd kiln && npm run pi-ready` → **READY**; `npm run test:pi` passes and reports ≥ 1 `PI-LIVE:` pass; **each** hook in `quickstart.md` §3 fails with **exactly** its named failure; with `pi` removed from `PATH` the suite **skips with a printed reason** and `KILN_PI=1` **fails**. Record the results.

**Checkpoint**: US2 complete — KILN loads into real Pi both ways, answers a command, and a broken extension cannot pass or hang.

---

## Phase 6: User Story 4 — Later rows know where their code goes (Priority: P2)

**Goal**: the author of r9, r10 or r11 finds, written down, where their code goes — with **no r8 file having to move**.

**Independent Test**: a human at the plan gate reads `kiln/pi/README.md` and points to each row's home (SC-007); the tests below pin the note to reality.

- [x] T041 [US4] Write `kiln/pi/README.md` — the **layout note (FR-012)**: the contract **E7** table (r9 → `kiln/pi/ui/`; r10 → `kiln/agents/` + `kiln/src/`; r11 → `kiln/src/director.ts` + `kiln/pi/commands/`; and *which r8 file each may touch, if any*); the **`LiveUICtx` → Pi mapping** r9 must do (`setStatus(footer)` → `ctx.ui.setStatus(key, text)`; `raiseOverlay(layer, content)` → `await ctx.ui.custom(factory, { overlay: true, overlayOptions })` — a **Promise**, and **`undefined` in `rpc`**); and three "do not" rules: **never import Pi**, **never pass a `timeout` to a gate**, **never use `confirm` for a gate**.
- [x] T042 [US4] `kiln/tests/pi/layout-note.test.ts`: the README names **r9, r10 and r11**, each with a home path; every home path either exists **or is marked `(new)`**; no home path lies inside a file r8 owns; it names all three "do not" rules and the `LiveUICtx` mapping; every relative link in it resolves.

**Checkpoint**: US4 complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: wire the public surface, keep the docs honest, prove nothing existing moved, and hand the row back.

- [x] T043 [P] Additive re-exports in `kiln/index.ts` for the seam (`interpret`, `askGate`, `resolveAsk`, `detectCapability`, and the `Outcome`/`GateQuestion`/`Capability`/`NoAnswerReason` types). **`kiln/pi/index.ts` is *not* re-exported from here** — the Pi entry stays behind the manifest. Test: the pre-existing export names are all still present.
- [x] T044 [P] `README.md`: **Pi as an external, optional requirement**; the **measured Pi version (0.85.1)**; "verified on **macOS only**"; `npm run test:pi` and `npm run pi-ready`; the status line updated for r8. Add a test pinning **every version in `MEASURED_PI_VERSIONS` to the README** (**FR-015**) so the two cannot drift.
- [x] T045 [P] **Mutation sweep** beyond T022, recorded: break `_pi-driver.ts` (drop the basename refusal; drop the deadline; use the operator's dir), `pi-ready.ts` (skip check **f**; accept a control that never answers), `status.ts` (canned row count) — each must be caught **by name** by a test or a `PiReady` hook.
- [x] T046 `kiln/tests/pi/untouched.test.ts` — the r7 **CR-10 pattern**: pin **`BASE..CLOSE`** (set at implementation: `BASE` = the parent of r8's first implementation commit; `CLOSE` = its last) and assert **no artifact in the "MUST NOT be modified" list** changed within that range; skip **with a printed reason** if the history is unavailable. It pins a *historical fact about r8's own range*, not a standing prohibition.
- [x] T047 Full validation: `npm test` (0 newly failing; the count = T001's + r8's additions), `npm run test:pi`, `npm run pi-ready`, `runtime-ready`, `overlay-ready`, `live-ready`, `ollama-ready`, `validate:roadmap`. Record every count against T001.
- [x] T048 Write `specs/007-kiln-pi-extension/implementation-report.md` (r7's shape): what was built, **deviations from the plan**, the T022/T045 mutation results, the completed findings register in summary; and **refresh `overview.md`** — its status banner and "Where it is heading" — to say what now exists.
- [x] T049 Write `specs/007-kiln-pi-extension/verification-report.md`: an end-to-end run of `quickstart.md` §1–§4, and **§5's human terminal smoke as a required field** — **done / not done, the human's name, the date, the Pi version, the terminal, what was seen at each of the five steps, anything odd** (**FR-016, SC-008**). **This section is left for the human to fill; it is never filled by the implementer or implied.** State plainly what remains unverified: Linux, Windows, Pi ≠ 0.85.1, and the TUI until the smoke is recorded.
- [x] T050 Run a full code review and write `specs/007-kiln-pi-extension/code-review-report.md` (as for r7) — with particular attention to the seam's order of checks, the driver's spawn surface, and the scan changes.
- [x] T051 Fix the review's confirmed findings **test-first** (each with a test that failed before), and record the decisions taken and any left open with a reason.
- [x] T052 **Hand back to the human — do not close the row.** Per P-VI the director does **not** edit `specs/ROADMAP.md`: report that r8's lane is complete *except* the FR-016 smoke (if unrecorded), and list the human's moves — record the smoke, close r8 at the Gate-0 seam, add the row's `spec` pointer, and re-admit r9. The row stays `queued` until then.

---

## Dependencies & Execution Order

**Phase dependencies**: Setup → Foundational → **US1 ‖ US3** (independent of each other; both need only Foundational) → **US2** (needs US3's seam and T004–T006) → US4 (needs US2's files to exist) → Polish.

**Hard dependencies**

| Task(s) | Depends on | Why |
|---|---|---|
| T005 | T004 | `SCAN_DIRS` may not list a directory that does not exist (the scan fails on a missing dir) |
| T006 | — | the allowlist exists before the driver that needs it |
| T013 | T009–T012 | the register is filled from the measurements |
| T014, T015 | T013 | the banner and the structural test read the finished register |
| T020, T021 | T016–T019 | **tests first** — see them fail |
| T021 | T004, T020 | the seam uses the types and `detectCapability` |
| T028–T031 | T021 | `kiln-selftest` asks **through** the seam |
| T035 | T006, T034 | the driver may spawn only once the allowlist exists and its tests are written |
| T037 | T033, T035, T036 | the probe drives the driver and the fixtures |
| T038–T040 | T037 | live proof needs the probe |
| T039 | T031, T032 | the *real* `kiln/` needs its entry and manifest |
| T042 | T041 | the test reads the note |
| T046 | all code tasks | `CLOSE` is the last implementation commit |
| T049 | T047 | the report records the final counts |

**Parallel opportunities**

- **Phase 1**: T002 ‖ T003.
- **Phases 3 and 4 run in parallel** — US1 touches only `specs/` and one doc; US3 touches only `kiln/pi/` and `kiln/tests/pi/`.
- **Within US1**: T009 ‖ T010 ‖ T011 ‖ T012. **Within US3**: T016 ‖ T017 ‖ T018 ‖ T019.
- **Within US2**: T024 ‖ T025 ‖ T026 ‖ T027 · T033 ‖ T034 ‖ T036. **Polish**: T043 ‖ T044 ‖ T045.

**Sequential by nature**: T004 → T005 (a directory before it is scanned) · T020 → T021 (capability before the seam that uses it) · T035 → T037 → T038 → T040 (driver, probe, live proof, gate).

---

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + Phase 4 (US3).** That is the point at which the row's central promise is *built and proven offline*: no silence, cancellation, timeout or headless mode can pass through the seam as an approval. Everything else makes that promise visible in real Pi.

**Recommended order**

1. **Phase 2 in full** — small, offline, and it puts `kiln/pi/` inside the P-VIII scan *before* anything is written there.
2. **Phase 3 (US1) alongside Phase 4 (US3).** The spike can still change the design, so its answers land early; the seam does not need Pi at all.
3. **Phase 5 (US2)** — the extension, then the driver and probe, then the live proof.
4. **Phase 6 (US4)** — the layout note, once the files it points at exist.
5. **Phase 7** — polish, the reports, and the human handback.

**Two failure modes to watch for, both introduced by this row's own changes**

- **A probe that cannot say "answered" proves nothing.** Check **f** must include a control that *does* answer; without it a broken Pi wiring reads as "every non-answer was refused" (T037, T038).
- **A skip that looks like a pass.** With Pi absent the tier must skip **with a printed reason**, and `KILN_PI=1` must **fail** — never a green run that executed zero Pi tests (T002, T003, T036).

**Stop conditions (a line-of-defense veto halts the lane and returns it to the human)**: a canonical artifact needs modifying; the seam cannot be made to fail a mutant *by name*; the P-VIII scan can only be satisfied by widening an allowlist beyond **one** entry each; real Pi's behaviour contradicts a **measured** cell of the register in a way that changes a contract; or the spike shows KILN cannot load into Pi without a build step or a new dependency.

---

## Trace

Phase 2 → D1, D6, FR-014 · Phase 3 → **US1**, FR-001, FR-002, SC-001, SC-006, SQ1–SQ11 · Phase 4 → **US3**, FR-006, FR-007, FR-008, FR-009, FR-017, SC-003, S1–S7, E2–E4 · Phase 5 → **US2**, FR-003–FR-005, FR-010, FR-011, FR-013, SC-002, SC-004, SC-009, E5–E8, R1–R6 · Phase 6 → **US4**, FR-012, SC-007 · Phase 7 → FR-013, FR-015, FR-016, SC-005, SC-008.

**Task count**: **52** · **Setup** 3 · **Foundational** 4 · **US1** 8 · **US3** 8 · **US2** 17 · **US4** 2 · **Polish** 10.
