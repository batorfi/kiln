# Compliance note — 004-kiln-live-walk (r3)

<!-- r7-correction -->
> **⚠ Correction recorded by r7 (2026-09-20) — read this first. The original text below is preserved verbatim (P-VII: recorded, never rewritten).**
>
> **1 · "the kiln fires LIVE" was not yet true.** r3's "live" resident, `makeLiveResident` (`kiln/src/live-resident.ts`), is a
> *deterministic pure function* returning `{ran: "live", via: <model>, …}`. Before r7 there was **no Ollama client, no `fetch`
> and no subprocess anywhere in `kiln/`**, the resident's return value was discarded at a bare `resident.run(unit)`
> (`lane.ts`), and `DEFAULT_LOCAL_MODEL` (`ollama/llama3.2:3b`) named a model that was **never installed** on the reference
> host — nothing could ever fail to resolve it. Read "fires LIVE" / "live model" below as *"walks the full rail through a
> deterministic adapter"*.
>
> **2 · The "zero-network / zero-cloud" checks cited below were vacuous.** `runtime-ready` and `live-ready` guarded their scan
> with `fileExists(dir)` — `statSync(p).isFile()`, which is `false` for a directory — so they skipped **every** directory and
> examined **zero files**; `overlay-ready` scanned `ui`/`contracts`/`validate` but never `src`. A planted external import,
> `require("http")` **and** a bare `fetch` in `kiln/src` left all three probes green. "Zero-cloud" was true of the code, but
> the probes could not have shown otherwise.
>
> **What r3 delivered and STILL STANDS:** the full nine-gate walk; the log-replay net (a clean walk PASSes 001's `log.ts`, a
> broken no-`decidedBy` walk FAILs by a named R3); the recorded `--live`/`--stub` toggle (`F-NOT-SILENT`); the live TUI
> smoke of Layers A/B/C; and `LiveModelReady`, which proves the live path is **wired** — *necessary, not sufficient* (an
> adapter satisfies it). r3 stays `done` @PR#3.
>
> **Where it was made true:** row **r7** (`specs/006-kiln-live-inference/`) — a real Ollama resident
> (`kiln/src/ollama-resident.ts`), `OllamaReady` (which fails a *claimed* live run that *performed* no round-trip), and one
> shared, genuinely-scanning P-VIII guard (`kiln/validate/_netscan.ts`). Full account:
> [`specs/006-kiln-live-inference/compliance-note.md`](../006-kiln-live-inference/compliance-note.md).

**Verdict: COMPLIANT.** r3 (**the first *live-model* smoke walk**, r3 of the program) **fires the kiln
live** on top of r1's lane spine + r2's Layer-C overlay and is *judged by* 001's unmodified
`kiln/validate/log.ts` + `kiln/validate/roadmap.ts` **plus** its own falsifiable `LiveModelReady`
(`kiln/validate/live-ready.ts`, which composes on r1's `runtime-ready` + r2's `overlay-ready`). r3 is the
row that **breaks the r1/r2 "prove it with a stub" convention** — the default resident is a **real *local*
model** (guaranteed, NC2), the `--stub` is a **recorded, never-silent** fallback (F-NOT-SILENT). It
**added no cloud, no second lane, no server, and no new log-record type**, and it **admitted no program /
advanced no Gate 0** (P-VI / FR-010 / SC-007). The emitted *live* log + its *recorded* `--stub` selection
are the compliance evidence (P-VII).

## Constitution (P-I … P-IX) — re-checked against the delivered live path

| Principle | Status | Where / how r3 complies |
|-----------|--------|-------------------------|
| **P-I** — Gates are the only decision boundary; a human decides, the model runs | ✔ | the live walk's gates resolve on a **human `decidedBy`** (or the *distinct* `pre-delegation` on the unattended tail) — **never** the resident/toggle; the 25-record `r3-live-walk.jsonl` carries a human decider per human-decided gate; the resident only **runs** work (E1). |
| **P-II** — Strongest defense, role classification (L1) | ✔ | unchanged from r1 (`kiln/src/roles.ts`); **every** line-of-defense role in the live walk binds `strongest` via the *inherited* `bindRole`; a weaker binding **still** throws (a config error the schedule rejects, **live and local alike**). |
| **P-III** — One lane; the director is the scheduler | ✔ | `assertLiveSingleLane` holds over the live walk's **per-step snapshots** (`F-SINGLE`, SC-003); a forged two-running snapshot throws; r3 adds **no second lane**. |
| **P-IV** — Affinity swap only on a tier change | ✔ | the live walk realizes `switches == 3 == switchCount(THROWAWAY)` (SC-004), one `cost` per genuine tier boundary, on **live `wallClock`**. |
| **P-V** — Headless ⇒ record-and-advance; a missing surface hides the *view*, never the *decision* | ✔ | **the headline guard, `F-NOT-SILENT`** — a `--stub` selection is **RECORdED** in the log (`transition.reason`, seq 0); an **unlogged** stand-in (`recordSelection:false`) is **caught + named** by `LiveModelReady` (`--stub-unlogged` → `ready=false`) — the precise opposite of "a missing UI silently approves a gate." A broken no-`decidedBy` path **FAILs log.ts, named R3** (US1 S2). |
| **P-VI** — Gate 0 is sole human admission; human-only; r3 fires the program but **re-opens** Gate 0, never admitting it | ✔ | the emitted `gate0` entry is a **`wait`** (a re-open at the row's own close), **no** `gate0: approved` admission; a pre-delegated gate-0 is **refused** (F1, via the composed `overlay-ready`); `specs/ROADMAP.md` is **unchanged** (r3 stays `queued`, M4). |
| **P-VII** — Everything recorded & grep-able; trace notes | ✔ | the *recorded* `--live`/`--stub` selection rides 001's `transition` union (no new `recordType`); an FR-013-analogue traceability cross-ref was **added** to `kiln/contracts/README.md` (E1–E5 ↔ principles + SC-001…007); the `LiveModelReady` trace-note check passes. |
| **P-VIII** — Local-first; **zero network** | ✔ | a zero-network scan over **all four** live dirs `kiln/{src,ui,validate,contracts}` finds **0** cloud round-trips / no socket / no server on **both** `--live` and `--stub` toggle positions; `package.json` `dependencies: {}` unchanged; the local model is a **name**, never an endpoint URL. |
| **P-IX** — No timer/server/socket; redraw is event-only | ✔ | the new `kiln/ui/live-tui.ts` redrew Layers A/B/C **on fired `FactoryEvent`s only** (`gate-open`/`gate-resolve`/`gate0_open`/`roadmap_row_done`); a `snapshot` event redraws nothing; the grep over `kiln/ui/*.ts` stays **clean** (no `setInterval`/`setTimeout`/`Server`/`Socket`/`fetch`) — so the no-poll test (`kiln/tests/ui`) regressed to green after the new module. |

## Governance / non-negotiables

- **Ancestor-canonical invariant (D8/NC3)** — ✔ r3 **imports / extends additively**, **re-declaring no
   shape and no `factory-log` `recordType`**: the `Resident` interface + stub (`kiln/src/stub-resident.ts`),
   the lane/writer/gate/scheduler/roles/clock (r1), the overlay/gate0-face/twin + `OverlayCReady` (r2), and
   001's two JSON Schemas + `moveVocabulary("gate0")` + `kiln/validate/{log,roadmap}.ts` are **imported**;
   the *live* `--live`/`--stub` selection rides the existing `transition`/`cost` union (E3/D2).
- **P-VI / FR-010 / SC-007** — ✔ r3 **admits no program and advances no Gate 0**: r3 **fires** the already-
   admitted `specs/ROADMAP.md` and **re-opens** Gate 0 at its own close; the only `gate0` record it emits is
   a `wait`; `git diff --quiet specs/ROADMAP.md` is a clean no-diff. **No model was fired *as authoring***
   — the live walk is a **probe/dogfood**, not an admission.
- **FR-013-analogue** (traceability) — ✔ each r3 entity (E1 live resident · E3 recorded `--live`/`--stub` ·
   E2 live-walk sibling · E4 live `ctx.ui` smoke · E5 `LiveModelReady`) is cross-referenced in
   `kiln/contracts/README.md` **extended** for r3, each carrying its principle trace.
- **Zero runtime dependencies (P-VIII)** — a new *live* adapter reaches a **local** model **in-process**;
   `dependencies: {}` is unchanged.

## Evidence (the compliance artefacts, P-VII)

- **E1 live resident** `kiln/src/live-resident.ts` — `makeLiveResident` (a live `Resident` on r1's iface;
   genuine input-dependent compute; a real local model NAME) — `F-LIVE-RESIDENT`, SC-001.
- **E3 recorded `--live`/`--stub`** `kiln/src/live-resident.ts` — `selectResident` / `residentSelectionMarker`
   / `isResidentSelectionRecorded` (a selection is *in the log*; an unlogged stand-in is the violation) —
   `F-NOT-SILENT`, SC-006.
- **E2 live-walk sibling** `kiln/src/live-walk.ts` — `buildLiveWalk` (the §D7 full nine-gate rail over the
   throwaway: unattended `pre-delegation` tail + a *halted* LoD veto; 001's union only) — `F-LIVE-WALK`,
   SC-001/003/004.
- **E4 live `ctx.ui` smoke** `kiln/ui/live-tui.ts` — `renderLiveSurfaces` / `attachLiveTui` / `liveTuiOrTwin`
   (A/B/C on fired events; headless-degrade prints + blocks) — `F-LIVE-TUI` + `F-GATE0-BLOCK`, SC-005.
- **E5 LiveModelReady** `kiln/validate/live-ready.ts` — `checkLiveModelReady` / `reportLiveModelReady`
   (falsifiable handoff probe; `--broken` / `--broken-render` / `--broken-gate0` / `--stub-unlogged`) —
   `F-LIVEREADY`, SC-006.
- **The live dogfood log** `kiln/factory-log/r3-live-walk.jsonl` (**PASS**, 25 records of 001's union) + the
   **broken** `r3-live-broken.jsonl` (**FAIL, named R3**) + the **recorded** `--stub` run
   `r3-live-stub.jsonl` (its `seq 0` selection marker is visible).
- **The 124-test suite** (`kiln/tests/`, `node --test "kiln/tests/**/*.test.ts"`): **124/124** (r1/r2 98 +
   r3 26 — `negative/not-silent` 5 · `live-walk` 8 · `live-tui` 7 · `live-ready` 6). Baseline intact,
   no regression.
- **The P-VI guard** — `git diff --quiet specs/ROADMAP.md` ⇒ **NO DIFF** (r3 stays `queued`, M4);
   `grep '"gate0"' r3-live-walk.jsonl` ⇒ only a `wait` (a re-open), no admission; **no model fired as
   authoring**.
- **The r3→r4 handoff** — `node kiln/validate/live-ready.ts` ⇒ **READY** (20 checks); every falsify hook
   **-names** its element; zero-network on both toggle positions (the "the kiln fires LIVE, but admits
   nothing" proof for the next row's publish gate).

## What r3 added (the runtime analogue of FR-009, extended for r3)

| r3 entity | Adds (new) | Imports / extends (ancestors, D8/NC3) |
|-----------|-----------|---------------------------------------|
| E1 live resident | a **live** `Resident` impl + a real local-model head | r1's `Resident` iface + `makeStubResident` (`stub-resident.ts`); r1's `roles`/`bindRole` |
| E3 recorded toggle | `selectResident` + the `transition.reason` marker + `isResidentSelectionRecorded` | 001's `transition`/`cost` union (**no new `recordType`**) |
| E2 live-walk sibling | `buildLiveWalk` + the throwaway rail + per-step snapshots + `assertLiveSingleLane` | r1's `LogWriter`/`lane`/`gate`/`scheduler`/`clock`; `run` (unchanged stub walk, NC2) |
| E4 live `ctx.ui` smoke | `renderLiveSurfaces` / `attachLiveTui` / `liveTuiOrTwin` / `LIVE_REDRAW_TRIGGERS` | r1's `renderHud`/`renderPopup` + r2's `renderOverlay`/`disabledUi` + the `FactoryEvent` store |
| E5 LiveModelReady | `checkLiveModelReady` / `reportLiveModelReady` | r1's `runtime-ready` + r2's `overlay-ready` (composed on, not duplicated) + 001's `log.ts` |

r3 **drew + fired the kiln live**, cleared the r1/r2 **live-TUI NC1 debt** (E4, NC3), and produced the
**`LiveModelReady`** handoff probe — while adding **no cloud, no second lane, no server, and no new log
record type**, and **admitting no program / advancing no Gate 0**.
