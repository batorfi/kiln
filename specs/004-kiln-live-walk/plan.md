# Implementation Plan: 004-kiln-live-walk

**Branch**: `004-kiln-live-walk` | **Date**: 2026-09-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-kiln-live-walk/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition
describes the execution workflow.

## Summary

r1 (`002-kiln-lane`) and r2 (`003-kiln-roadmap-overlay`) proved the **runtime spine**, **Layer C**,
and a **blocking headless Gate-0** — but **headlessly, on a deterministic *stub* resident**, with a
print **twin** (their shared **NC1** deferred the *live* proof to **r3**). This row, **r3**, is the
**first *live-model* smoke walk**: it **inverts r1's D4/NC2** so the **default resident is a real
local model** (P-VIII — still *local*, no cloud), runs **one *trivial throwaway* feature through the
full Gates-1–9 rail live** (NC1), and **also clears r1/r2's NC1 debt — the live TUI smoke of Layers
A/B/C** (NC3). It is a **`--live`/`--stub` toggle that is *recorded*, never silent** (NC2): the
live path is the primary proof, the stub a logged fallback. R3 is **judged by** 001's
`kiln/validate/log.ts` (R1–R6), r1's `runtime-ready.ts`, and r2's `overlay-ready.ts`, extended by a
new falsifiable **`LiveModelReady`** probe (`kiln/validate/live-ready.ts`); it **emits the same log
union** r1/r2 emitted (additive, **no new `recordType`**), so a clean live walk **PASSES** and a
*broken* no-silent-approval path **FAILs it by a named R3**. R3 **fires the already-admitted
`specs/ROADMAP.md` program and *re-opens* Gate 0 at its own close — it admits nothing (P-VI/SC-007).**

**Approach (the load-bearing one):** make the "kiln fires" the r1/r2 proofs **live** without
rewriting anything canonical. The live resident is a **live impl of r1's `Resident` interface**
(E1); the live walk is a **sibling of r1's `walk.ts`** driving it through **all nine gates live** on
the throwaway (E2, D3); the `--live`/`--stub` **selection is recorded** in 001's `transition`/
`cost` union (E3, D2 — *never a silent stand-in*); the live TUI is **r1/r2's proven pure render
*twin*, plus a live `ctx.ui` path** that redraws on fired events and degrades to the printed
twin when the UI is absent (E4, D5 — r2's `disabledUi`, now on the live path); and
`LiveModelReady` (E5, D6) **composes on** `runtime-ready` + `overlay-ready` to assert "live path
wired, emits a PASSES log, a broken path FAILs R3, and a zero-network scan is green (plus a
*recorded* toggle)." Every principle r1/r2 proved *headlessly* is thereby proved **live**.

See [research.md](./research.md) for the live-realization decisions **D1–D8** and
[data-model.md](./data-model.md) for the live entities **E1–E5**, the
[contracts/](./contracts/) this row exposes (and the dogfood boundary it is judged against).

## Technical Context

All unknowns resolved — inherited from **001's research (U1–U8)** (the canonical TS + `node --test`
+ JSONL + zero-dependency substrate), from **r1's research (D1–D8)** (the runtime modules + the stub
resident + the dogfood), from **r2's research (D1–D8)** (Layer C + the Gate-0 face +
`OverlayCReady`), and from **this spec's Clarifications NC1–NC3** (NC1 **throwaway** target ·
NC2 **live guaranteed + `--live`/`--stub`** · NC3 **live TUI in scope**). No `NEEDS CLARIFICATION`
remains; a small set of *live-realization* choices is pinned in [research.md](./research.md)
(§D1–D8). The *planning* tweaks that stay off the critical path — the throwaway's exact nine-gate
content (§D4) and the `ctx.ui.custom`/`handoff.ts`/`ctx.ui.confirm` wiring (`ui-layers-deep.md §10`,
§D5) — are **low-risk `implement` choices**, off r3's net-critical path.

**Language/Version**: TypeScript (KILN's module shape) · Node `>= 22.6` (`kiln/package.json`
engines) · `node --test` for the live-walk + `LiveModelReady` suites. *Canonical contracts are 001's
JSON Schemas + `move-vocabulary.ts` + `roles.ts` + r1's `kiln/src/*`+`kiln/ui/*` + r2's
`kiln/ui/overlay.ts`/`gate0-face.ts`/`overlay-ready.ts`; r3 imports them, it does not re-declare
them (D8/NC3).*

**Primary Dependencies**: **None at runtime** (still `dependencies: {}`). "Live" means a **real
local model** (an **Ollama-served** model by default — P-VIII), reached **in-process over the local
harness**, **no cloud**; the `--stub` is a recorded, dependency-free fallback (E3). R3 adds the live
`ctx.ui` overlay path on pi's **already-confirmed** `ctx.ui.custom` primitive (`ui-layers-deep.md §10`)
— it adds **no new runtime dependency**. The `ctx.ui`-survival / `handoff.ts` / `ctx.ui.confirm`
items are `§10` *spikes*, **off r3's critical path** (D5): r3 proves the **event-only + headless-**
*degrade* net; the exact key/anchor is an `implement` tweak.

**Storage**: **Files + in-memory** — the live walk's factory-log is the **JSONL**
(`kiln/factory-log/`, e.g. `r3-live-walk.jsonl` / `r3-live-broken.jsonl`), the `--live`/`--stub`
**selection a recorded `transition`/`cost` slot** (E3), all validated by **001's unmodified**
`kiln/validate/log.ts`. No database. No new `recordType`.

**Testing**: `node --test` — the **live-walk**, **live-TUI**, toggle-`F-NOT-SILENT`, and
`LiveModelReady` suites **plus** the **dogfood** step (the emitted **live** JSONL is run through
**001's `kiln/validate/log.ts` and must PASS**; a broken no-silent-approval vector must **FAIL R3
by name**; a `--stub` selection must **appear in the log**, its absence must **fail**
`LiveModelReady`) and the **falsifiable `LiveModelReady`** probe (`--broken` / `--broken-render`
/ `--broken-gate0` / *unlogged-stand-in* / zero-network, all *naming* the broken element).
A **live model is assumed guaranteed** in the r3 environment (NC2), so the live path is the
*primary* proof; `--stub` is the *recorded* reproducibility fallback.

**Target Platform**: **Local workstation + CI** (the kiln chamber; macOS/Linux), **on a real local
model** (e.g. Ollama) by default, the `--stub` as a recorded fallback. This is the *first* r-row
whose **primary** proof is **live** (r1/r2 proved headlessly; r3 proves the **live** net).

**Project Type**: a **runtime + UI live-adapter row of r1's `kiln/`** — it adds a **live resident**
impl of r1's `Resident` interface, a **live `--live`/`--stub` toggle** (recorded), a **live-walk
sibling** of `walk.ts`, the **live `ctx.ui` overlay path** over r2's pure render, and a
`LiveModelReady` probe. No new toolchain, no web/mobile split, no server/poll (P-IX).

**Performance Goals**: N/A as a throughput target. The live TUI stays **event-only** (SC-005):
**one `FactoryState`, one render, redrawn only on a fired event** — no timer/socket/server. The
*cost* r3 cares about is the **switch-count** on the **live** sequence (P-IV — realized switches
== `switchCount`, SC-004).

**Constraints**: **live but local-first (no cloud)** (P-VIII; a zero-network scan must stay green);
**the `--stub` toggle is *recorded*, never a silent stand-in** (P-V/P-VII — SC-006; `F-NOT-SILENT`);
**no-silent-approval enforced live** — a broken vector **FAILs 001's `log.ts` R3 by name** (P-V;
SC-002/SC-003); **additive, not a re-declaration** — r3 imports 001's log union / schemas /
`move-vocabulary.ts` / `roles.ts` and r1's `src/`+`ui/`, plus r2's `overlay.ts`/`gate0-face.ts`/
`overlay-ready.ts`; it **adds no new `recordType`** (D8/NC3); **r3 fires the *already-admitted*
program and *re-opens* Gate 0, admitting nothing of its own** (P-VI/FR-010/SC-007).

**Scale/Scope**: **one live-resident impl + one toggle + one live-walk sibling + one live-TUI path
+ one `LiveModelReady` probe** (US1 live end-to-end = P1; US2 live TUI = P1, the r1/r2 NC1 debt;
US3 `LiveModelReady` = P2) over **one throwaway feature** that walks **all nine gates live**, not a
second lane, not a new record type, not an admitted program. Five r3-own entities (E1–E5) over the
inherited spine.

## Constitution Check

*GATE: passes before Phase 0; re-checked after Phase 1 below — result **PASS, no violations**; the
Complexity Tracking table is empty.*

| Principle | How r3 realizes / respects it |
|-----------|-------------------------------|
| **I** Author/judge sep. | The live resident **runs** the work; **every gate still resolves on a human `decidedBy`** (or a *distinct* `pre-delegation`) — the live walk does **not** let a model approve its own work; a broken no-`decidedBy` vector **FAILs R3 by name** (SC-002/SC-003, FR-002/FR-011). |
| **II** Strongest defense | On the **live** path every line-of-defense role (architecture-critic, verifier, code-reviewer, docs-synthesizer) runs on **`strongest`** via the inherited `bindRole`, exactly as r1 — a cheaper LoD binding is *still* a config error the schedule rejects (FR-005). No new judge surface. |
| **III** One lane / director-scheduler | R3 drives **r1's single lane** live; it opens **zero** new lane (`F-SINGLE` holds over the live snapshots, SC-003). The throwaway is **one firing**, not a branch of the chamber. |
| **IV** Affinity swap-only-on-tier | No new cost lever; the **live** walk's realized switch count **== `switchCount`** (SC-004), one `cost` per genuine tier boundary, inherited from r1 D6. |
| **V** Headless never silently approves | The headline guard, **live**: a disabled UI still **prints the program + `WAIT`s** at an open Gate 0 (E4/F-GATE0-BLOCK, SC-005); the `--stub` is a **recorded** fallback, never a silent stand-in — `LiveModelReady` **catches** an unlogged swap (SC-006); a broken vector **FAILs R3** (SC-002). |
| **VI** Gate 0 human-only, always | R3 **fires the *admitted* `specs/ROADMAP.md` program and *re-opens* Gate 0 at its own close** (FR-010/SC-007); it **admits nothing of its own** and **advances no gate**. The `--stub`/live toggle never touches a Gate-0 *admission*. |
| **VII** Everything in the log | Every live transition, gate completion (**with the human `decidedBy`**), the unattended-tail `pre-delegation`, **and the `--live`/`--stub` selection** land in the **JSONL** and are reconstructable from the log alone (FR-006/FR-012; E2/E3/E5). |
| **VIII** Local-first | "Live" = a **real local model** (P-VIII, no cloud); a `--stub` fallback stays **recorded** and **cloud-free**; a **zero-network scan** over `kiln/{src,ui,validate,contracts}` finds **0** round-trips on `LiveModelReady` (SC-006, FR-001). |
| **IX** Three layers, event-driven, no server | The live TUI (E4) **composes** A/B/C over **one `FactoryState`**, **redraws only on a fired event** (r2's two Layer-C events + r1's), and **degrades to the print twin** when the UI is absent — **no `setInterval`/`setTimeout`/socket/server** (the `ui/*.ts` grep stays green; SC-005). |
| **Governance / FR-013-analogue** | Each live entity carries a **constitution traceability note**; the emitted **live** log (and its **recorded** `--stub` selection) is the **audit** a downstream gate (r4/publish) verifies compliance from (`LiveModelReady` re-asserts wiring + PASSES-emit + zero-cloud, **running no gate**). |

## Project Structure

### Documentation (this feature)

```text
specs/004-kiln-live-walk/
├── plan.md                   # this file (/speckit.plan)
├── research.md               # Phase 0 — live-realization decisions D1–D8 (no NEEDS CLARIFICATION; NC1/NC2/NC3 resolved 2026-09-16)
├── data-model.md             # Phase 1 — the live entities (E1–E5): the *live* counterparts of r1's stub-walk + r2's headless overlay
├── quickstart.md             # Phase 1 — the live-walk run guide (SC-001..SC-007; live by default, --stub recorded)
├── checklists/
│     └── requirements.md     # the spec quality checklist (004 spec.md)
├── contracts/                # Phase 1 — the live interface this row exposes + the dogfood boundary
│     ├── README.md                   # index: how r3 realizes r1/r2's contracts live; the "judge by 001+r1+r2" boundary
│     ├── live-resident-api.md        # E1+E3 — the live resident impl + the recorded --live/--stub toggle
│     ├── live-walk.md                # E2 — the live-walk sibling of walk.ts (full-nine-gate live lane + broken R3 vector)
│     └── live-ready.md               # E5 — LiveModelReady = the falsifiable extension of runtime-ready + overlay-ready
# (later) tasks.md + quickstart-run.md + compliance-note.md — produced by /speckit.tasks + /speckit.implement
# (no draft-roadmap — r1 admitted it; r3 FIRES the admitted program and re-opens Gate 0 at its close)
```

### Source Code (repository root, at `/speckit.implement` — research §D8)

R3 **extends r1's `kiln/src/`+`kiln/ui/` and r2's `kiln/ui/`** — it adds a **live `Resident`
impl + the `--live`/`--stub` toggle** (E1/E3), a **live-walk sibling** (E2), the **live `ctx.ui`
overlay path** over r2's render (E4), and **`kiln/validate/live-ready.ts`** (E5). It imports 001's
schemas + `move-vocabulary.ts` + `roles.ts`, r1's spine + twin, and r2's overlay/face/`overlay-ready`
— *no re-declaration of the log union / schemas / move vocabulary / `roles.ts` / r1 spine / r2 overlay.*

```text
kiln/
├─ src/
│     ├─ stub-resident.ts   # (r1) REUSED — the Resident interface + the stub; r3's --stub toggle selects it (recorded)
│     ├─ live-resident.ts   # E1+E3 — a LIVE impl of the Resident interface + the --live/--stub SELECTION (recorded in the log)
│     ├─ walk.ts            # (r1) REUSED — buildStubWalk; E2's live-walk SIBLING reuses its emit sequence
│     ├─ live-walk.ts       # E2 — a LANE-LANE live-walk builder: drive E1 through Gates 1–9 on the throwaway; broken R3 vector
│     ├─ scheduler.ts       # (r1) REUSED — switchCount / LoD-strongest bind (live sequence too)
│     ├─ log-writer.ts      # (r1) REUSED — the R3 write-time guard (a live, decider-less completion still throws)
│     └─ gate.ts            # (r1) REUSED — openGate/headlessWait/resumeByToken/autoApprove/vetoHalt (live gates)
├─ ui/
│     ├─ overlay.ts         # (r2) REUSED — renderOverlay; E4's live path COMPOSES on it
│     ├─ gate0-face.ts      # (r2) REUSED — the distinct Gate-0 face (F1 human-only)
│     ├─ factory-state.ts   # (r1+r2) REUSED — onEvent; the two Layer-C events gate0_open/roadmap_row_done
│     ├─ twin.ts            # (r1+r2) REUSED — disabledUi: the headless degrade E4 falls back to (F-GATE0-BLOCK)
│     ├─ live-tui.ts        # E4 — the LIVE ctx.ui overlay path over r1/r2's render; degrades to the print twin
│     └─ keymap.ts          # (r2) REUSED — M/g/? surface keys (a low-risk implement tweak, not a live entity)
├─ validate/
│     ├─ log.ts             # (001) THE VALIDATOR r3's LIVE log DOGFOODS through (already accepts the union; names R3)
│     ├─ roadmap.ts          # (001) M1–M4; the admitted program head specs/ROADMAP.md r3 fires still validates here
│     ├─ runtime-ready.ts   # (r1) REUSED — LiveModelReady COMPOSES ON it (emits PASSES-emit + zero-network)
│     ├─ overlay-ready.ts   # (r2) REUSED — LiveModelReady COMPOSES ON it (deterministic render + blocking Gate 0 + F1)
│     └─ live-ready.ts      # E5 — LiveModelReady: live-path wiring + PASSES-emit + recorded --stub + zero-cloud (falsifiable)
├─ index.ts                # EXTENDED — also exports the live-resident / live-walk / live-tui / live-ready (no program admitted)
├─ factory-log/            # REUSED — r3-live-walk.jsonl (PASS) + r3-live-broken.jsonl (FAIL, named R3); a --stub selection recorded
└─ tests/                  # node --test: live-walk/ live-tui/ liveReady/ dogfood/ + the F-NOT-SILENT (unlogged-stand-in) suite
```

**Structure Decision**: single-project (KILN = one `kiln/` extension, per 001 §H + r1 §D8 + r2
§D8). No web/mobile split. The live path is **realized under `kiln/src/` + `kiln/ui/`** (the shared
import root) and **judged by** 001's `kiln/validate/log.ts` (dogfood, the R3 falsify) *plus*
`kiln/validate/roadmap.ts` (the program head it fires) *and* the composed `live-ready.ts` — the
live walk/adapters *emit + render* what a human decides; the three validators **consume**, and the
ancestors stay **canonical** (Principle I, D8). R3 **imports** r1/r2/001 rather than re-declaring
them (NC3), so the emitted live log **PASSES** unchanged and the broken vector **FAILs R3**.

## Complexity Tracking

> **No Constitution violations, so nothing to justify.** R3 adds **no cloud dependency** (P-VIII —
> local model, a zero-network scan stays green), **no second lane** (`F-SINGLE` holds, P-III), no
> parallelism, no server/poll (P-IX), and **no new log `recordType`** — the `--live`/`--stub`
> toggle rides the existing `transition`/`cost` union (D2/NC3, D8). The live TUI and the live
> resident are *extensions* of r1/r2's already-proven **stub + headless twin** that NC1 deferred
> here — r3 is **simpler** than it would be if it built the production overlay from scratch; it
> **smokes the live net** on the ancestors' modules instead. The only r3-own structures (the live
> resident impl, the toggle, the live-walk sibling, the live TUI path, `LiveModelReady`) are
> *required* to realize the net **live** (P-V "the net is live", P-VIII "live local model", P-VI
> "fires the admitted program, admits nothing"), not optional. No Complexity Tracking entries are
> required.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)*    | —             | —                                     |
