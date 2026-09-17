# Research & Resolved Unknowns: 004-kiln-live-walk (r3 — the first live-model smoke walk)

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Date**: 2026-09-16
· **Program**: [specs/ROADMAP.md](../../ROADMAP.md) (`gate0.status: approved`; r3 `deps: [r1]`,
re-admitted 2026-09-15)

Phase 0 output. **There are no `NEEDS CLARIFICATION` items** — every spec-level unknown was
resolved upstream and *in this row's own clarify pass* (2026-09-16): **001's research (U1–U8)**
(the canonical TS + `node --test` + JSONL + zero-dependency substrate), **r1's research (D1–D8)**
(the runtime modules + the **stub-resident** dogfood, `D4`/NC2-stub), and **r2's research
(D1–D8)** (the Layer-C overlay + its Gate-0 face + the headless twin; and r2's **NC1** — a *live-*
model TUI smoke walk is **r3's** territory, not r2's). This row's own **Clarifications NC1–NC3**
resolve the three *live*-path choices (the throwaway target · `--live`/`--stub` + guaranteed live ·
the in-scope live TUI smoke). What a live row *must still pin* is the **live-realization** of the
already-declared contracts — *how* the live resident, the live walk, the live TUI, and the
`LiveModelReady` probe are built to *satisfy* P-VIII/P-I/P-V/VII/IX, not *whether*. Those choices
are D1–D8 below; each is a decision the Phase 1 modules and quickstart scenarios depend on.

**The one deliberately-open *planning* tweak, resolved here (not a NEEDS CLARIFICATION): the
exact throwaway's nine-gate content + the `ctx.ui` live-walk wiring** (`ui-layers-deep.md §10 API
risk stratification`) — folded into **§D4/§D5** as low-risk lean defaults (the throwaway is a
**trivial** feature so its nine gates are all trivial; the `ctx.ui` wiring rides r2's confirmed
overlay primitive). The final key/wiring stays an `implement` tweak, but it is *off* r3's
critical path (the net is live, not the key).

---

## Decisions extracted (what the live path must pin)

| ID | Live-realization question | Type | Resolved in |
|----|---------------------------|------|-------------|
| D1 | How r3 realizes the **live** path: r1's stub is **replaced, on the default path, by a real local-model resident** (the "kiln fires live" that r1 deferred, NC2-stub) | precedent/constraint | §D1 |
| D2 | The **`--live`/`--stub` toggle** + a **recorded** fallback (NC2): how the selection is logged so a stand-in is **never silent**; `LiveModelReady` catches the unlogged swap | design/constraint | §D2 |
| D3 | The **live-walk sibling**: how r1's `walk.ts` is extended to drive a live resident through Gates 1–9, emitting the **same** log union (additive, no new `recordType` — D8/NC3 inherited) | structure/integration | §D3 |
| D4 | The **throwaway smoke feature** (NC1): a trivial one-off that still walks all nine gates cheaply | design | §D4 |
| D5 | The **live TUI smoke of A/B/C** (NC3): reusing r1/r2's *pure* render + twin, plus the *live* `ctx.ui` overlay path (r1/r2 rendered headlessly; r3 also runs `ctx.ui`) | precedent/constraint | §D5 |
| D6 | **LiveModelReady** as a falsifiable extension of r1's `RuntimeReady` + r2's `OverlayCReady`; **file placement under `kiln/`**; the `--broken` + *unlogged-stand-in* falsify hooks | structure/best-practice | §D6 |
| D7 | The **throwaway's full nine-gate lane + unattended tail**: r3 runs the *whole* rail live (including the vetoes + a clean unattended-tail cruise), proving the net *live* (SC-002/SC-005) | design | §D7 |
| D8 | **r3 is additive, judged by 001 + r1 + r2** — no re-declaration of the log union / schemas / `move-vocabulary.ts` / `roles.ts`, r1's `src/`+`ui/`, or r2's `overlay.ts`/`gate0-face.ts`; the toggle + live-resident ride the *existing* `transition`/`cost`/`gate-completion` records | structure/invariant | §D8 |

---

## D1 — r3 realizes the **live** path: default live resident; the stub is a *recorded* toggle (inverts r1's D4/NC2)

**Decision:** r1 (`002-kiln-lane`) proved the spine with a **deterministic stub resident**
(`kiln/src/stub-resident.ts`, r1 D4 — "the stub-resident *interface* the tests drive; no live
Ollama, NC2"): **the live path was explicitly r3's job.** R3 **inverts** that: the **default
resident is a real local-model adapter** (a local model served, e.g. Ollama — P-VIII, still
*local*; no cloud). Per **NC2**, a live local model is **guaranteed** in r3's environment, so the
live path is **primary**. r3 **does not delete or weaken** the stub — it **retains** it as the
`--stub` toggle (NC2), so the row stays **reproducible** and the r1/r2 dogfood stays green. The
resident stays the same **interface** `kiln/src/stub-resident.ts` declares (`run / model / tier`);
r3 adds a **live implementation** of that interface and a **toggle** that selects between it and
the stub.

**Rationale:** P-VIII is "the factory runs on *local* models with no cloud" — so "live" for r3
means a **real local** model, not a cloud call; P-I ("no model may approve its own work") means the
live walk's gates still resolve on a **human** `decidedBy`, not the model's. Inverting r1's D4
*direction* (live = default, not stub = default) is exactly what r1's NC2 promised r3 would do.

**Alternatives considered:**
- **Delete the stub for the live path.** Rejected: r1/r2's dogfood is **reproducibly stub-based**;
   losing the stub breaks the r1/r2 "kiln fires" proofs and r3's own `--live`/`--stub` toggle
   (NC2 wants *both*).
- **A cloud model.** Rejected outright (P-VIII — no cloud round-trip; the zero-network scan
   `F-LIVEREADY` must stay green, §D6).

---

## D2 — The `--live`/`--stub` toggle + a *recorded* fallback (NC2; never silent)

**Decision:** r3 exposes a **`--live`/`--stub` toggle** that selects the resident. **`--live` is the
default** (NC2: a live model is guaranteed). **`--stub`** runs r1's stub and is **RECORDED**, not
a silent stand-in: the selection is a **logged record** — a `transition`/`cost`-shaped entry that
names *which* resident ran the walk (`resident: "live"` vs `resident: "stub (RECORDED fallback,
NC2)"`), so a closed terminal **knows** the walk ran on a stand-in. Crucially, this reuses 001's
**`transition`/`cost`** union member — **no new `recordType`** (D8). The **"no silent stand-in"**
invariant is enforced two ways: (a) the **writer** already stamps every record
(`seq`/`ts`, P-VII), so the selection *is* in the log (P-VII), and (b) **`LiveModelReady`** (§D6)
**falsifies** an *unlogged* stand-in (a `--stub` selection that emits **no** recorded marker is the
vector that **flips `ready=false`** — SC-006).

**Rationale:** NC2 pins "live is guaranteed AND `--stub` still exists for reproducibility." The
constitution's one hard rule here is P-V/P-VII: a stand-in must be **recorded, distinguishable** —
the *exact* opposite of "a missing UI silently approves a gate" (P-V). Recording the selection in
the existing `transition`/`cost` records keeps it **additive** and makes "silently stood in for"
**falsifiable**.

**Alternatives considered:**
- **A new `resident-swap` / `resident-selection` `recordType` in 001's log.** Rejected (D8/NC3):
   it *re-declares* 001's union; a `transition` already carries `kind: "swap"` + a `reason`, exactly
  the slot a resident selection names itself in.
- **A `--stub` that is *not* logged (a pure offline toggle).** Rejected outright: that is a
   **silent stand-in** — the forbidden case P-V names; `LiveModelReady` must be *able to catch it*,
   so the selection *must* be recorded.

---

## D3 — The live-walk sibling extends r1's `walk.ts` (additive; same log union)

**Decision:** r1's `kiln/src/walk.ts` already proves "a clean walk PASSES 001's log; a broken
auto-approve FAILs it, named R3" — but **with a stub** (`buildStubWalk`). R3 **adds a sibling**
(`buildLiveWalk`, or a `--live`/`--stub` selector on the *same* builder) that drives a **live
resident** through **one full Gates-1–9 lane** over the **throwaway feature** (§D4), emitting the
**same `transition` / `gate-completion` / `human-decision` / `cost` / `wait` / `pre-delegation`
records** r1 emitted — **no new `recordType`** (001 is canonical, D8). The r1 *broken* vector (a
`gate-completion` with no `decidedBy`) stays the SC-002→SC-003 falsify on the **live** log too
(SC-002). The walk's **dogfood** is the same as r1's: the emitted JSONL is replayed through
**001's unmodified `kiln/validate/log.ts`** and must **PASS** live; the broken path **FAILs** it
named.

**Rationale:** r1 D5 fixed the dogfood path ("the emitted JSONL is replayed through 001's
`kiln/validate/log.ts`"). R3's only *new* thing on the walk path is that the resident is **live**,
not that the log changes — so extending `walk.ts` additively (a live builder / a selector) keeps the
dogfood **unchanged** and the "001 declares / r1 runs / r3 runs live / r3 judged by 001" lineage
intact (D8).

**Alternatives considered:**
- **A fresh `kiln/src/live-walk.ts` that re-declares the emit sequence.** Rejected (D8): r1's
   already *emits the complete union* — a live sibling is **the same builder, a live resident**; a
   second builder re-declares and risks drift.
- **Re-derive the broken vector for the live path.** Rejected: r1's `run.ts --broken` (strip the
   gate-`3` `decidedBy`) already *is* the SC-003 falsify; r3 reuses it on the **live** emitted log.

---

## D4 — The throwaway smoke feature (NC1): a trivial one-off that still walks all nine gates

**Decision:** the feature that *walks the kiln* is a **deliberate, trivial throwaway** (NC1),
chosen **only** to exercise the rail end-to-end. It is **not** a self-referential "the kiln builds
a kiln" dogfood, **not** one of the later program rows (r4–r6 — their content stays out of r3's
scope), and **not** a durable feature. Lean default: **a ~1–2 line capability in `kiln/` that
touches the full rail for nothing else** — e.g. **adding a fourth, trivial read-only readiness
marker** or wiring a **no-op factory event → one `FactoryEvent` redraw**, enough to be a real
spec/plan/checkpoint/review/verify/docs/PR while costing near-zero. It is **deleted or left as a
documented throwaway** after the walk (`out of scope to keep`). Its **nine gates are all trivial**
because the feature is trivial — the point is to *fire every gate live*, not to build anything of
value.

**Rationale:** NC1 resolves the target as "throwaway" — the *reason* a throwaway exists is to make
the nine-gate **rail observable end-to-end** on the live path as cheaply as possible, *without*
spilling into later program rows. A trivial throwaway still forces a *real* `context.md →
concept.md → … → pr.md` lineage with a human `decidedBy` at each gate (FR-001/FR-012, SC-001).

**Alternatives considered:**
- **Walk a later program row (r4/r5/r6).** Rejected (NC1, and P-VI): that *pulls in* the content of
   a *different*, not-yet-fireable row and would advance the program the human hasn't re-admitted
   for it; r3's own content must stay *inside* r3.
- **A self-referential "kiln builds a kiln."** Rejected (NC1): heavier than a throwaway and risks
   re-firing r1/r2's own code; NC1 prefers the cheapest full-rail exercise.

---

## D5 — The live TUI smoke of Layers A/B/C (NC3): r1/r2's pure render, plus the *live* `ctx.ui` path

**Decision:** r1 **and** r2 both rendered **headlessly** (r1: `renderHud`/`renderPopup` + a print
twin; r2: `renderOverlay` + `gate0-face` + a print twin that `WAIT`s on Gate 0). Their **NC1 debt**,
named to r3, is the **live TUI smoke**: the *same* pure render, driven by a **real pi `ctx.ui`
surface set** — **Layer A** (`ctx.ui.setStatus` footer), **Layer B** (`ctx.ui.custom` per-gate
popup), **Layer C** (`ctx.ui.custom` roadmap overlay + its Gate-0 face) — **redrawn on the walk's
fired events** (P-IX). R3 keeps r1/r2's **pure** render **unchanged** (it is the *headless* twin a
missing UI degrades to, P-V) and **adds** the **live `ctx.ui` wiring** as a path that runs when a
TUI is present, **degrading** to the printed twin when it isn't (exactly r2's `disabledUi`, D5).
This is the **one `ui-layers-deep.md §10`-flagged live surface** r3 exercises (`ctx.ui.custom`
overlay survive/`handoff.ts`/`ctx.ui.confirm` — *spiked*, but **off** r3's critical path per §
above).

**Rationale:** NC3 pins "r3 **does** clear the deferred live TUI smoke." The minimal realization is:
the live overlay **composes** with r1/r2's already-proven pure+twin (no re-declaration, D8), and a
`ctx.ui`-present path is added that **redraws on events only** (the SC-005 timer/socket grep must
stay green). The `§10` "spike" APIs are *wiring*, not *net* — so r3 proves the **event-only +
headless-degrade** invariants on the live path; the exact key/anchor stays an `implement` tweak.

**Alternatives considered:**
- **A full interactive TUI build in r3.** Rejected (out of r3's scope + the throwaway-is-cheap
   principle): r3 *smokes* the live TUI (a `ctx.ui` path that renders on events, degrading to the
  twin), it does **not** build the production overlay (that is a later row's UI work).
- **Leave the live TUI to *another* row.** Rejected outright (NC3): r1 **and** r2 both **named r3**
   for exactly this debt; leaving it again would never clear it.

---

## D6 — LiveModelReady: a falsifiable extension of RuntimeReady + OverlayCReady (file placement)

**Decision:** r3 ships **`kiln/validate/live-ready.ts`** — a **falsifiable** probe that
**composes on** r1's `runtime-ready.ts` (wiring + a PASSES-emit + the zero-network scan) **and**
r2's `overlay-ready.ts` (deterministic render + a blocking headless Gate 0 + F1 human-only), plus
**two r3 hooks**: (a) the resident is **live** (a real local model is wired, not just a stub) —
**and** `--stub` is **allowed but *recorded*** (its selection appears in the log; SC-001 default is
`--live`), and (b) an **`--broken`** hook that names the R3 gap (the no-silent-approval hole,
SC-002/SC-003) and an *unlogged-stand-in* hook that names a `--stub` selection that **emits no
recorded marker** (SC-006). Placement **under `kiln/validate/`** alongside its ancestors (001/r1/r2
§D7/D8/§D8); it **runs no gate, no feature admission** (SC-006 analogue of `F-RUNTIMEREADY`/
`F-OVERLAYREADY`).

**Rationale:** r1 `RuntimeReady` and r2 `OverlayCReady` are both **falsifiable probes that run no
gate** (§D8 of each). R3's `LiveModelReady` is the **same shape** one level up: it asserts the
*live* path exists, is wired, emits a **PASSES** live log, a broken path **FAILs R3 by name**, and
a **zero-network** scan finds **0** cloud round-trips *and* a `--stub` toggle is *recorded* (never
silent). Composing on the ancestors keeps r3 additive and keeps "the kiln fires **live**" the
*handoff proof* for r4 (publish).

**Alternatives considered:**
- **A new top-level `kiln/` command.** Rejected (r1/r2 placement, §D7/D8): it belongs
   `kiln/validate/` as a *falsifiable* check, not a new top-level surface.
- **Fold the hooks into `overlay-ready.ts` (rewrite r2's probe).** Rejected (D8: r2 is canonical):
   r3 *extends/additive*, not *overwrites* r2; a broken r2 probe would also break r2's row.

---

## D7 — The throwaway's **full** nine-gate lane + unattended tail, run **live** (the net, live)

**Decision:** r3's throwaway walks the **entire rail live**, not a subset: **triage → 1 concept →
2 architecture (critic, LoD) → 3 spec → 4 plan → 5 checkpoint → 6 review (reviewer, LoD) → 7
verification (verifier, LoD, ≤2 mitigation) → 8 docs → 9 PR**, with: (a) a **clean unattended-tail
cruise** of gates 4–9 via a **distinct `pre-delegation`** (the approve side pre-authorized, SC/
FR-011), and (b) **at least one line-of-defense veto fired and *halted*** (the "crack in the cool" —
a critic objection / reviewer `restart` / verifier `reject` that **halts the cruise**, SC-
005/FR-007, US). Every gate resolves on a **human `decidedBy`** (or the distinct
`pre-delegation`); the throwaway's walk **emits the same log union** r1/r2 emitted, plus the
`transition`/`cost` **recorded `--live`/`--stub` selection** (D2), and it is **replayed through
001's `kiln/validate/log.ts` → PASS** (or **FAILs R3** on the broken vector). This is the "net is
live" proof (SC-002) — every LoD role ran on `strongest` (FR-005/P-II), the switches ==
`switchCount` (FR-004/P-IV), and `assertSingleLane` held over the live snapshots (FR-003/P-III).

**Rationale:** r3 is the row that proves the **net holds on the live path** — so it must exercise
**the whole rail** (every gate, every LoD backgate, the tail, a veto) *live*, not a hand-picked
subset. Keeping the feature **trivial** (D4) keeps the *cost* of a full nine-gate live walk
negligible even though the *coverage* is total.

**Alternatives considered:**
- **Walk only a few gates.** Rejected (the point of r3 is the **net live**, i.e. every gate the
   net guards — a subset leaves the "net is live" claim unproven).
- **Skip the unattended-tail/veto exercise.** Rejected (SC-005/FR-007): the live cruise + a halted
   veto are the *live* realization of P-I/P-V; without them r3 re-proves only the r1 *stub* shape.

---

## D8 — r3 is additive, judged by 001 + r1 + r2 (no re-declaration; D8/NC3 inherited)

**Decision:** r3 **imports and extends**, it does **not re-declare**. It reuses **001's** log/roadmap
schemas + the `FactoryState`/`RoadmapRow`/`Gate0` shapes + `move-vocabulary.ts` + `roles.ts`;
**r1's** `kiln/src/*` (lane/gate/log-writer/scheduler/walk/clock) + `kiln/ui/*` core
(factory-state/hud/popup/twin/keymap) + `runtime-ready.ts`; and **r2's** `overlay.ts`/`gate0-face.ts`/
extended `factory-state.ts`/`overlay-ready.ts`. R3 adds **exactly**: a **live resident** impl of
r1's `Resident` interface + the **`--live`/`--stub` toggle** (D2), a **live-walk sibling** of
`walk.ts` (D3), the **live `ctx.ui` overlay path** over r2's render (D5), and `live-ready.ts`
(D6) — all of it **additive**, riding 001's `transition`/`cost`/`gate-completion` union (**no new
`recordType`**) and r1/r2's modules. R3 **admits no program, advances no Gate 0**; it **fires the
already-admitted** `specs/ROADMAP.md` and **re-opens** Gate 0 at its own close (P-VI/FR-010/SC-007).

**Rationale:** the KILN *ancestor-canonical* invariant (001 D8 → r1 D8 → r2 D8) is the load-bearing
rule that keeps each row **judged by** its ancestors instead of *against* them. R3 inheriting it
means the **emitted live log PASSES 001's validator unchanged** and the broken vector **FAILs R3 by
name** — the dogfood holds across the *live* boundary.

**Alternatives considered:**
- **Re-declare the log union / a `resident-swap` record type / a fresh walk.** Rejected
   (D8/D3/D2): every re-declaration re-opens 001's "the log is canonical" invariant; r3 *rides*
   the existing records and modules.
