# Implementation Plan: KILN on Pi — the extension foundation (row r8)

**Branch**: `007-kiln-pi-extension` *(no git branch created; the directory name is the identity)* | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from [`specs/007-kiln-pi-extension/spec.md`](./spec.md) — **clarified 2026-09-21** (NC1 = automated + one human TUI smoke, NC2 = `-e` + package manifest, NC3 = no amendment).

## Summary

r8 puts KILN inside real Pi and makes the join safe. It (1) **finishes a spike** — the findings register SQ1–SQ11, most of it already measured against Pi `0.85.1` while planning — and corrects the design docs
where they were wrong; (2) adds **`kiln/pi/`**, a Pi extension with **two read-only commands** (`kiln-status`, `kiln-selftest`), loadable by `pi -e` and by a **package manifest**; (3) adds **one seam** that turns
whatever Pi returns from a dialog into `answered(option)` or `no-answer`, and hands every `no-answer` to r1's existing `headlessWait` — **a silent, cancelled, timed-out or unreachable human is never a decision**;
and (4) adds **`PiReady`**, a probe that starts a *real* Pi (hermetic, offline, model-free), loads KILN both ways, and fails by name.

**Approach, in one line:** *KILN declares the small surface of Pi it needs and imports nothing from Pi; the seam is strict and stateless; the probe is real.* The design decisions and their evidence are in
[research.md](./research.md) Part A (D1–D10); the pieces are specified in [contracts/](./contracts).

**What the planning phase already measured** (all real Pi, hermetic, no model — see research.md): the **whole** `kiln/index.ts` (77 exports) loads under Pi's loader; a `pi` manifest + `pi install <dir>` works into an empty
config dir; **two extensions with the same command name are both renamed**; in `print`/`json` an extension's `console.log` reaches **stderr** while `notify` prints nothing; and the repo's own P-VIII scan flags a
type-only Pi import and any `child_process` — which shaped D1 and D6.

## Technical Context

**Language/Version**: TypeScript run directly by Node `^22.18.0 || >=23.6.0` (type stripping, no build) — and also loaded by Pi's own loader (jiti); **measured** to accept KILN's `.ts` specifiers (M1, run A).

**Primary Dependencies**: **none added** (`dependencies: {}` stays). Pi is an *external tool* KILN runs on, and **no KILN file imports it** — KILN declares its own structural `PiPort` (D1).

**Storage**: none written. `kiln-status` **reads** `specs/ROADMAP.md`. No `recordType`, no factory-log write (FR-009). The only durable artefact r8 can cause is r1's existing `Wait`.

**Testing**: `node:test` in `kiln/tests/pi/`; the `PiReady` probe; **real Pi** in a hermetic setup, gated by `KILN_PI` (D8); mutation-tested seam (SC-003). Plus **one human terminal smoke** (FR-016).

**Target Platform**: macOS verified; Linux and Windows **unmeasured** (stated, as for the Node floor). Pi `0.85.1` only (D9).

**Project Type**: the existing `kiln/` toolchain (library + CLI probes) **plus** a Pi extension entry inside it.

**Performance Goals**: SC-002 — one command loads KILN and returns status in **< 5 s**, no model. *Measured:* a Pi round trip takes ~0.2 s.

**Constraints**: P-VIII scan covers the new code; **no timers, polls, sockets or servers** (P-IX); the factory function starts nothing; nothing existing changes behaviour (FR-013); `pi install` is only ever run into a **temp** config dir.

**Scale/Scope**: 6 source files and a layout note in `kiln/pi/`, 2 files in `kiln/validate/`, 10 test files, 6 committed fixtures, 1 compliance note, 1 doc-correction banner.

## Constitution Check

*GATE: passed before Phase 0; **re-checked after Phase 1 design — still passes**, with one justified addition (Complexity Tracking).*

| Principle | r8's position | Verdict |
|---|---|---|
| **I. Author / Judge separation** | r8 **decides no gate**. An `answered` outcome is returned *unapplied*; nothing in r8 records a `decidedBy`, so a scripted test driver is structurally unable to become `human@…` (S5, FR-009). | ✅ |
| **II. Lines of defense are strongest** | No roles, no models in r8. | ✅ n/a |
| **III. Single lane, one resident** | r8 starts **no lane**. The cross-process hazard (two Pi windows = two lanes) is recorded as a spec edge case and **owned by r11**. | ✅ noted |
| **IV. Affinity is the only cost lever** | No models, no swaps. | ✅ n/a |
| **V. Headless never silently approves** | The row's centre. A strict, stateless seam (S2/S3); `no-answer` → `headlessWait`; `select` only; no `timeout`; capability from **mode**, not `hasUI`. **Stricter than the text** (NC3 = A): it withholds in every case `!ctx.hasUI` does, and more. Compliance note filed at implementation (S6, FR-017). | ✅ |
| **VI. Gate 0 is human-only** | r8 edits no roadmap and admits nothing; the row's missing `spec` pointer stays a Gate-0 edit. | ✅ |
| **VII. Everything is recorded** | r8 writes nothing to the factory-log and adds **no** `recordType`; its findings are recorded in `research.md`. | ✅ |
| **VIII. Local-first** | New code is **inside the scan** (`"pi"` joins `SCAN_DIRS`); the loopback allowlist stays **exactly one**; `PiReady` runs Pi `--offline`. **One addition**: a single-entry `PROCESS_ALLOWLIST` so the probe may spawn `pi` — see below. | ✅ with a justified addition |
| **IX. No dashboard; event-driven; no polling** | The extension registers **no event handlers**, holds no timer/socket/server; a gate dialog never carries a `timeout` (S4). `kiln-selftest timeout` is a labelled *shape test of Pi*, not a KILN surface. | ✅ |

## Project Structure

### Documentation (this feature)

```text
specs/007-kiln-pi-extension/
├── spec.md              # clarified 2026-09-21
├── plan.md              # this file
├── research.md          # A: decisions D1–D10 · B: the findings register SQ1–SQ11 (completed by the spike) · C: doc corrections
├── data-model.md        # E1–E8
├── quickstart.md        # runnable validation, incl. the human terminal smoke (§5)
├── contracts/
│   ├── pi-seam.md       # capability, the outcome rule, the timeout rule, the definition of "headless" (FR-017)
│   ├── pi-extension.md  # entry, manifest, commands, output channels, where r9–r11 go
│   └── pi-ready.md      # the probe, its named failures, the one process the scan allows
├── checklists/requirements.md
├── overview.md
├── pre-spec-probe/      # throwaway measurement scripts (not part of the toolchain)
└── tasks.md             # Phase 2 — /speckit.tasks (NOT created here)
```

### Source Code (repository root)

```text
kiln/
├── package.json             # + "pi": {"extensions": ["./pi/index.ts"]}, + scripts "pi-ready", "test:pi"
├── index.ts                 # + additive exports for the seam
├── pi/                      # NEW — everything Pi-facing; scanned by P-VIII
│   ├── index.ts             #   the entry: default = makeKilnExtension(); registers two commands, nothing else
│   ├── port.ts              #   KILN's own structural view of Pi + detectCapability()
│   ├── outcome.ts           #   the seam: GateQuestion, askGate(), interpret(), resolveAsk() → headlessWait
│   ├── status.ts            #   kiln-status: idle FactoryState from specs/ROADMAP.md
│   ├── selftest.ts          #   kiln-selftest: overlay (if canDraw) + one gate-shaped question + the timeout shape test
│   ├── output.ts            #   mode → channel (notify | stderr)
│   └── README.md            #   the layout note (FR-012, SC-007): where r9, r10, r11 go
├── validate/
│   ├── pi-ready.ts          # NEW — the probe PiReady (R2 checks, falsify hooks, CLI)
│   ├── _pi-driver.ts        # NEW — the ONLY module that spawns a process, and only `pi`; RPC client; deadline
│   └── _netscan.ts          # + "pi" in SCAN_DIRS, + PROCESS_ALLOWLIST (exactly one), + optional scanText param
├── fixtures/pi/             # NEW — deliberately broken things for the falsify hooks (unscanned, like the other fixtures)
│   ├── bad-entry.ts   throws-on-load.ts   no-command.ts   wrong-status.ts   approve-non-answer.ts
│   └── bad-manifest/package.json   # a `pi` manifest that points at a file that does not exist
└── tests/
    ├── run.ts               # + a `--pi` flag (sets KILN_PI=1; refuses a run in which no `PI-LIVE:` test passed — FR-011)
    ├── _pi-gate.ts          # NEW — KILN_PI tiering (D8)
    └── pi/                  # NEW
        ├── capability.test.ts   seam.test.ts (table-driven N1–N9/Y1 + mutants)   no-timeout.test.ts
        ├── extension.test.ts    (fake Pi API: two commands only, no handlers, no state, idempotent)
        ├── status.test.ts       output.test.ts      layout.test.ts (manifest present; no .pi/extensions for KILN; no Pi import; README pins the Pi version)
        ├── process-allowlist.test.ts   (mirrors the loopback allowlist tests)
        ├── pi-ready.test.ts     (each falsify hook → its named failure; skip-never-pass)
        └── pi-live.test.ts      (real Pi; gated by _pi-gate.ts)

docs/concepts/ui-layers-deep.md   # + an append-only `<!-- r8-correction -->` banner (FR-002) — original text untouched
README.md                         # + Pi as an external requirement, the measured Pi version, r8's status when it closes
specs/007-kiln-pi-extension/compliance-note.md   # written at implementation (FR-017)
```

**Structure Decision.** Everything Pi-facing lives in **one new directory, `kiln/pi/`**, which is the package's `pi` manifest target, is scanned by P-VIII, and is the only place that ever names Pi's shape. The probe follows r7's
layout (`validate/` probe + one privileged module). No file outside `kiln/pi/` reads a Pi type. Existing files change only **additively** (a manifest key, exports, a scan directory and one allowlist, a banner, README lines).

### What changes in existing files (FR-013)

| File | Change | Why it is safe |
|---|---|---|
| `kiln/package.json` | `+ "pi"` manifest, `+ "pi-ready"` and `"test:pi"` scripts | `dependencies` stays `{}`; the runner's own tests already pin `engines` |
| `kiln/index.ts` | `+` re-exports of the seam types/functions | purely additive |
| `kiln/tests/run.ts` | `+ --pi` flag: sets `KILN_PI=1` and **refuses a run in which no `PI-LIVE:` test passed** (FR-011: zero Pi tests when Pi was requested is a failure) | an added flag; the default run and every existing flag are unchanged; the runner's own tests stay green and gain a case |
| `kiln/validate/_netscan.ts` | `+ "pi"` in `SCAN_DIRS`; `+ PROCESS_ALLOWLIST`; `+` optional 5th param on `scanText` | every existing call keeps its behaviour; the r7 scan tests are **unmodified** and stay green; new tests mirror them |
| `docs/concepts/ui-layers-deep.md` | append-only banner | original §10/§11 left as written |
| `README.md` | Pi requirement + measured version + r8 status | docs |

*Not touched:* `validate/log.ts`, `roadmap.ts`, `_core.ts`, `_report.ts`, `schemas/`, `contracts/move-vocabulary.ts`, `src/roles.ts`, the lane, gate, scheduler and resident. r8 adds an "untouched since r8 began" test with a pinned `BASE..CLOSE` range at close (the r7 pattern, CR-10).

## Delivery order (what `/speckit.tasks` will expand)

1. **P0 — Spike.** Finish research.md Part B: turn every reachable **D** into **M** with the command; leave **T**/**→rN** with reasons; write Part C's banner into `ui-layers-deep.md`. *(US1)* — comes first because it can still change the design.
2. **P1 — The seam, test-first.** `port.ts`, `outcome.ts`; the N1–N9/Y1 table and its **mutants** written **before** the code; `no-timeout` test. *(US3 — the row's centre)*
3. **P2 — The extension.** `index.ts`, `status.ts`, `selftest.ts`, `output.ts`, the manifest, `kiln/pi/README.md`, `layout.test.ts`. *(US2, US4)*
4. **P3 — The probe.** `PROCESS_ALLOWLIST` + `SCAN_DIRS` first (with tests), then `_pi-driver.ts`, `pi-ready.ts`, the fixtures, `_pi-gate.ts`, `pi-live.test.ts`. *(US2, US3)*
5. **P4 — Close-out.** README, `compliance-note.md`, the "untouched" test, the verification report — with **FR-016's human terminal smoke recorded done or not done** — and the code review.

## Risks

| Risk | Mitigation |
|---|---|
| **Pi's API moves** (pre-1.0, fast) | D9: only measured versions; `PiReady` reports the version and fails by name; the seam is the single place to update |
| **The probe hangs on a wedged Pi** | R1: a hard deadline that kills the process; a fixture (`throws-on-load`) proves it |
| **The scan exemption widens over time** | exactly one entry, one binary, `shell: false`, a falsify hook (`--extra-process`), and tests that mirror the loopback ones |
| **The TUI is unmeasured** | NC1 = B: FR-016's human smoke; recorded, never implied |
| **`pi install` touching the operator's settings** | only ever into a **fresh temp** `PI_CODING_AGENT_DIR`; a test asserts the operator's dir is not the target |
| **A future Pi renames both commands on collision** (measured) | resolved by `sourceInfo.path`, never by bare name (D3) |

## Complexity Tracking

| Addition | Why it is needed | Simpler alternative rejected because |
|---|---|---|
| **`PROCESS_ALLOWLIST` (one entry) in the P-VIII scan** | `PiReady` must **start** Pi, and the scan bans `child_process` in every scanned directory — *measured*. | Exempting a directory, or putting the driver in unscanned `tests/`, leaves a hole that can hide `spawn("curl", …)`; **one named file, spawning only `pi`, with an exactly-one rule and a falsify hook** keeps the hole the size of the need (research D6). |
| **A second command, `kiln-selftest`** | FR-010 needs the seam exercised against *real* Pi's shapes, and FR-016's human needs something to press Esc on. Nothing else in a read-only surface asks a question. | Testing only against fakes proves KILN's code, not Pi's behaviour; overloading `kiln-status` mixes a report with an interactive probe (research D7). FR-005's "read-only" holds for both. |
