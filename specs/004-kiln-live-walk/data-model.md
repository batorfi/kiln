# Data Model: 004-kiln-live-walk (r3 — the first live-model smoke walk)

**Feature**: [spec.md](./spec.md) · **Research**: [research.md](./research.md) ·
**Plan**: [plan.md](./plan.md) · **Program**: [specs/ROADMAP.md](../../ROADMAP.md)

Phase 1: the **live-path entities** r3 adds — the *live* counterparts of what r1 *ran* (the stub
resident + the stub walk + the headless surfaces + `RuntimeReady`) and r2 *rendered* (Layer C +
the Gate-0 face + the `OverlayCReady` probe). r3 makes each **live** *additively*, extending the
ancestors it imports — it **does not re-declare** the `Resident` interface, the `FactoryState`
shape, the log union, the schemas, `move-vocabulary.ts`, `roles.ts`, or r1/r2's `ui/` modules
(research **D8 / NC3**, the ancestor-canonical invariant). Each entity below is a **live**
counterpart; the field shapes are **unchanged and imported** from r1's `kiln/src/*` and r2's
`kiln/ui/*` + 001's `kiln/src/types.ts`.

> **Numbering note (E1–E5).** The entities E1–E5 below are the **canonical** set r3 *adds*. A
> planning spike (`ui-layers-deep.md §10`: the `ctx.ui.custom` / `handoff.ts` / `ctx.ui.confirm`
> live-wiring) is **not** a first-class entity — it is a low-risk `implement` tweak and carries
> **no E-number** (the live TUI smoke rides E4's `ctx.ui` path; the exact key/anchor is an
> `implement` choice). R3 **extends** r1's E6 (stub) and r2's E6 (`OverlayCReady`), it does not
> renumber them — E5 here is `LiveModelReady`, which *composes on* r1 E7 + r2 E6.

---

## Entity 1 — The live resident (E1 / FR-001, FR-005) · `F-LIVE-RESIDENT`

A **live implementation of r1's `Resident` interface** (`kiln/src/stub-resident.ts`:
`run / model / tier`), selected as the **default** resident for r3 (inverting r1's D4/NC2-stub —
research **D1**). It is a **real local model** (served locally, P-VIII; **no cloud**), so the
line-of-defense roles run on it at `strongest` (FR-005/P-II, unchanged from r1).

| field (r1 `Resident`, imported) | meaning in r3 |
|----------------|-------------|
| `run(workUnit)` | runs a work unit **on the live model** (not a fixed stub `out`); a real inference the lane can drive through the rail |
| `model()` | the **live** local model name (e.g. an Ollama-served local model) — a real head, not `"stub-resident"` |
| `tier()` | the model's tier; LoD roles bind `strongest` (P-II/`bindRole`) exactly as in r1 |

**Guarantee `F-LIVE-RESIDENT` (SC-001 / P-VIII/P-I):** the **default** resident is **live** (a real
local model); the stub remains **available as a recorded toggle** (E3), so r1/r2's dogfood **and**
r3's `--live`/`--stub` path both hold. The live resident is **local** (a zero-network scan, E5,
stays green). A live walk's gates still resolve on a **human `decidedBy`** (P-I) — the model
*runs* work; it never *decides* a gate.

---

## Entity 2 — The live walk (E2 / FR-001, FR-002, FR-003, FR-004) · `F-LIVE-WALK`

The **live sibling of r1's `kiln/src/walk.ts`** (research **D3**): it drives **E1** through a
**full Gates-1–9 lane** over the **throwaway** (E…/§D4), emitting **001's existing log union**
(`transition` / `gate-completion` / `human-decision` / `cost` / `wait` / `pre-delegation`) —
**no new `recordType`** — plus the **recorded `--live`/`--stub` selection** (E3, a `transition`/
`cost` slot, D2). A **broken** variant splices a `gate-completion` **without a `decidedBy`** (the
r1 `run.ts --broken` vector, D3) so the emitted log **FAILs 001's `kiln/validate/log.ts` by a named
R3** (SC-002/SC-003).

| emitted record (001 union, imported) | meaning in r3's live walk |
|-------------------------------------|---------------------------|
| `transition {kind, from?, to?, reason?}` | the live load/hold/yield/**swap** + the **recorded resident selection** (`--live`/`--stub`), stamped `seq`/`ts` (P-VII) |
| `cost {switches, wallClock}` | one per genuine tier boundary; the realized switches **== `switchCount`** (FR-004/P-IV); live `wallClock` |
| `gate-completion {gate, move, decidedBy, cost, preDelegation?}` | a **human** `decidedBy` per gate (FR-001/SC-001), or a `move ∈ moveVocabulary(gate)` via a **distinct `pre-delegation`** on the tail (FR-011) |
| `human-decision` / `wait` / `pre-delegation` | the open-gate (`wait`, P-V), the unattended-tail pre-authorization (P-VI, distinct), and the live TUI-event audit (E4) |

**Guarantee `F-LIVE-WALK` (SC-001–SC-004 / P-III, P-IV, P-I):** the live emitted log **PASSES**
001's `kiln/validate/log.ts` (the "kiln fires **live**"); `assertSingleLane` holds over the live
snapshots (`F-SINGLE`, FR-003); realized switches == `switchCount` (FR-004); and the broken variant
**FAILs R3 by name** (SC-002/SC-003). R3 is **additive** (D8): it *extends* `walk.ts`, it does not
re-declare its emit sequence.

---

## Entity 3 — The `--live`/`--stub` toggle + its *recorded* selection (E3 / NC2 / FR-006, FR-013) · `F-NOT-SILENT`

The **resident selector** (research **D2**): selects E1 (live, **default**, NC2) or r1's stub.
The **selection is *recorded*** — it lands in the log as a `transition`/`cost` slot (D2; no new
`recordType`), so a closed terminal **knows** which resident ran. The *no-silent-stand-in* line:

| surface absent / toggle | behavior (rule) |
|-------------------------|-----------------|
| **`--live` (default)** | runs **E1** (a real local model); the walk is the primary proof |
| **`--stub`** | runs r1's deterministic stub as a **RECORDED** fallback — the selection is in the log; **never silent** |
| **an *unlogged* `--stub` stand-in** | a **violation** `LiveModelReady` (E5) **catches**: a `--stub` that emits **no** recorded marker ⇒ `ready=false`, **named** |

**Guarantee `F-NOT-SILENT` (FR-006, SC-006 / P-V, P-VII):** a stand-in (the `--stub`) is **always
recorded**, distinguishable from a live run — the *exact opposite* of the "missing-UI silent
approval" P-V forbids. Recorded on the existing `transition`/`cost` union (D8/NC3), so the log
union is **unchanged**; the falsify is in E5 (`LiveModelReady`), not a new record type.

---

## Entity 4 — The live TUI smoke of Layers A/B/C (E4 / NC3 / FR-007, FR-008) · `F-LIVE-TUI`

The **r1/r2 NC1 debt r3 clears** (research **D5**): r1 (`renderHud`/`renderPopup`) and r2
(`renderOverlay`/`gate0-face` + a `WAIT`-on-Gate-0 twin) rendered **headlessly**; E4 **adds the
*live* `ctx.ui` path** — **Layer A** (`ctx.ui.setStatus` footer), **Layer B** (`ctx.ui.custom` per-
gate popup), **Layer C** (`ctx.ui.custom` roadmap overlay + its Gate-0 face) — **redrawn on the
walk's fired events** (P-IX), over **one shared `FactoryState`**, **composing** with r1/r2 and
**degrading** to the printed twin when the UI is absent (r2's `disabledUi`).

| surface (r1/r2, imported) | live behavior in r3 (NC3) |
|---------------------------|---------------------------|
| **Layer A** (HUD footer) | live `ctx.ui.setStatus` redraws `rail/lane/switches/clock` on each event |
| **Layer B** (per-gate popup) | live `ctx.ui.custom` rises on a `gate-open`; a `gate-resolve` closes it |
| **Layer C** (roadmap overlay + Gate-0 face) | live `ctx.ui.custom` on `gate0_open`/`roadmap_row_done` (r2's two events, D4); the same distinct `moveVocabulary("gate0")` face (r2 E2) |
| **the headless twin** (r1/r2, imported) | when `!ctx.hasUI`, E4 **degrades to the print** — the program + a `WAIT` on an open Gate 0, **never auto-advancing** (P-V/P-VI) — the `F-GATE0-BLOCK` r2 proved, now on the live path |

**Guarantee `F-LIVE-TUI` (SC-005, P-IX / P-V):** the live overlay redraws **on fired events only**
(no `setInterval`/`setTimeout`/socket/server — the `ui/*.ts` timer/socket grep **stays green**,
D5); a captured identical state ⇒ a **byte-identical** render (one source of truth, SC-005); and a
disabled UI **prints the program + `WAIT`s** at an open Gate 0 (never auto-advances). E4 **reuses**
r1/r2's pure render + twin (D8) and adds only the live `ctx.ui` wiring (§10 — a low-risk `implement`
tweak, no E-number of its own).

---

## Entity 5 — `LiveModelReady` (E5 / US3 / FR-013) · `F-LIVEREADY` · a falsifiable extension

The r3 handoff probe (`kiln/validate/live-ready.ts`), a **falsifiable** extension of r1's
`runtime-ready.ts` (**E7**) and r2's `overlay-ready.ts` (**E6**) (research **D6**). It asserts the
**live path** and runs **no gate, no feature admission** (SC-006 analogue of `F-RUNTIMEREADY`/
`F-OVERLAYREADY`):

| check (composes on r1 E7 + r2 E6) | r3's assertion | falsify hook |
|----------------------------------|----------------|--------------|
| **wiring (r1 E7)** | the live resident + live-walk + `ctx.ui` overlay + `live-ready.ts` exist + `kiln/index.ts` exports them on the spine | point a dep at a missing file ⇒ names it, `ready=false` |
| **PASSES-emit (r1 E7)** | the **live** walk's JSONL **PASSES 001's `kiln/validate/log.ts`** (R1–R6, with a human `decidedBy` per gate) | `--broken`: strip a gate-`3` `decidedBy` ⇒ **named R3** `ready=false` |
| **deterministic render (r2 E6)** | the live TUI overlay (E4) renders **byte-identically** on identical state (SC-005) | `--broken-render` ⇒ names it |
| **blocking headless Gate 0 + F1 (r2 E6)** | an open Gate 0 **prints + `WAIT`s**, human-only (a pre-delegation is **refused**) | `--broken-gate0` ⇒ names it |
| **recorded toggle (r3, D2/E3)** | a `--stub` selection is **recorded** in the log | an **unlogged** stand-in ⇒ `ready=false`, **named** |
| **zero-network (r1 E7 + r2 E6)** | a scan over **`kiln/{src,ui,validate,contracts}`** finds **0** cloud round-trips / no socket / no server (P-VIII/P-IX) | an external import / net primitive ⇒ names it |

**Guarantee `F-LIVEREADY` (SC-006 / P-VIII, P-IX, P-V):** `LiveModelReady` **READY**s on the live
walk and **falsifies** its `--broken` (named R3) and *unlogged-stand-in* hooks, with a **zero-**
network scan green; it **admits no program / advances no Gate 0**.

---

## Cross-entity invariants r3 makes true (success-criteria proof map)

| SC | invariant | entities | principle |
|----|-----------|----------|-----------|
| **SC-001** "the kiln fires **live**" | a full Gates-1–9 live walk's log **PASSES 001's `log.ts`** with a real `decidedBy` | E1, E2, E5 | P-I, P-VIII |
| **SC-002** "the net is **live**" | a broken (no-`decidedBy`) vector **FAILs R3 by name** | E2, E5 | P-V |
| **SC-003** "one lane, live" | `assertSingleLane` over the live snapshots (`F-SINGLE`) | E2 | P-III |
| **SC-004** "cheap to hold, live" | realized switches == `switchCount`; every LoD role ran on `strongest` | E1, E2, E5 | P-IV, P-II |
| **SC-005** "the deferred live TUI (NC3)" | live A/B/C redraws **on events only**; disabled UI prints + **blocks an open Gate 0** | E4, E5 | P-IX, P-V |
| **SC-006** "the handoff" | `LiveModelReady` READY + falsifies `--broken`/unlogged-stand-in + zero-cloud | E5 | P-VIII, P-IX |
| **SC-007** "no self-admission" | r3 **fires the admitted** program, **re-opens** Gate 0 at its close, admits nothing | E2, E5 | P-VI |

> **Additivity audit (D8/NC3):** across E1–E5 r3 adds **zero** new log `recordType` (E3 rides the
> `transition`/`cost` union), **zero** new schema, **zero** new module **re-declaration** of
> r1/r2/001 (it *imports* `Resident`, `FactoryState`, the log union, `move-vocabulary.ts`,
> `roles.ts`, r1's `src/`+`ui/`, and r2's `overlay.ts`/`gate0-face.ts`/`overlay-ready.ts`). The
> only r3-own additions are the **live-resident impl + toggle (E1/E3)**, the **live-walk sibling
> (E2)**, the **live `ctx.ui` overlay path (E4)**, and **`LiveModelReady` (E5)**. R3 **admits no
> program, advances no Gate 0** (P-VI/SC-007).
