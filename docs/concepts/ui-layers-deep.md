# KILN — the UI layers, in depth (ASCII concept)

> Companion to `20260911-concept.md`. The status layer that replaces the old
> dashboard, shown entirely as **ASCII TUI concepts with descriptions**. Three
> surfaces read one shared `FactoryState` and one event stream:
> **Layer A = Flow HUD** (persistent footer), **Layer B = Flow Popup** (per-gate
> modal overlay), **Layer C = Roadmap overlay** (deliverable-level zoom-out, the
> new surface). One rule governs them all: **never poll, never run a server**.
> Date: 2026-09-11 · status: concept (pre-implementation).

> **What a "surface" is here.** Each surface is an ASCII rendering driven by the
> same `FactoryState`. The doc below *is* the spec: every surface is drawn as a
> box, then described in a few lines. Layer A and B are per-feature (the
> per-feature lane); Layer C is **one level up** — it shows the **roadmap** (the
> ordered, human-approved firing program of a deliverable) and where the current
> implementation sits in it. The headless fallback for every layer is a printed
> ledger form, **never a silent approval**.

---

## 1. The three surfaces, at a glance

```
+----------------------------------------------------------------------+
| THREE SURFACES, ONE FACTORY STATE, ONE EVENT STREAM                  |
| ------------------------------------------------------------------  |
|  Layer A  Flow HUD       always-on footer       (per-feature lane)     |
|  Layer B  Flow Popup     modal per-gate overlay (per-feature lane)     |
|  Layer C  Roadmap overlay deliverable view      (DELIVERABLE-level)    |
|      |            |               |                                     |
|      +------------+---------------+-------->  reads  FactoryState      |
|   pi.on(...) event stream  --->  recompute snapshot  --->  redraw      |
|   headless (no UI): each surface degrades to a PRINTED LEDGER FORM;     |
|   a missing surface never silently approves a gate (Gate 0 included).   |
+----------------------------------------------------------------------+
```

| Layer | surface | scope | mechanism |
| ----- | ------- | ----- | --------- |
| A | Flow HUD | per-feature lane | `ctx.ui.setStatus(slot)` footer |
| B | Flow Popup | per-feature lane | `ctx.ui.custom(fn,{overlay})` modal |
| C | Roadmap overlay | deliverable | `ctx.ui.custom(fn,{overlay})` zoom-out |
| (fallback) | headless ledger | any | printed `WAIT` / roadmap table |

Confirmed UI primitives (read this session):

| surface | API | precedent |
| ------- | --- | --------- |
| persistent footer slot | `ctx.ui.setStatus(slot, themedText)` | `status-line.ts` |
| live spinner | `ctx.ui.setWorkingIndicator(opts)` | `working-indicator.ts` |
| current model | `ctx.ui` model slot | `model-status.ts` |
| modal overlay | `ctx.ui.custom(fn,{overlay,overlayOptions})` | `doom-overlay/` |
| gate decision | `ctx.ui.select([...])` / `ctx.ui.confirm` | `permission-gate.ts` |
| headless detect | `ctx.hasUI`, `ctx.ui.headless` | `permission-gate.ts` |

---

## 2. Shared FactoryState (drives all three layers)

One object, mutated by events, read by redraws. **`roadmap` + `current` are
Layer-C fields; `gate0`/`rail` carry the gate state** (`gate0` is the
pre-lane **Gate 0 — Roadmap**; the per-feature `rail` is Gates 1–9).

```ts
interface FactoryState {
  resident:   { model: string; tier: string } | null;   // head in the lane
  running:    { duId: string; role: string } | null;     // current DU
  queue:     QueueEntry[];                               // depth-N, ordered
  switches:  number;                                      // switch-tax counter
  wallClock: string;                                      // "HH:MM"
  // --- Layer C (roadmap) + Gate 0 ---
  roadmap:   RoadmapRow[];                                // the deliverable's firing program
  current:   string;                                       // in-flight roadmap row id
  gate0:     Gate;                                        // Gate 0 -- Roadmap (pre-lane)
  gate?:     Gate;                                        // open per-feature gate (1-9)
}
interface RoadmapRow {
  id:       string;      // r1, r2, ...
  short:    string;      // one-line human description
  status:   "not-started" | "in-flight" | "pr" | "merged";
  deps:     string[];    // other row ids this row waits on
  gate?:    number;      // current gate (1-9) while in-flight
}
```

Events that mutate it (`pi.on`): `turn_start`, `turn_end`, `agent_end`,
`tool_call`, `session_start`, plus two Layer-C events — `gate0_open` /
`roadmap_row_done` — that push a Layer-C redraw. Each event handler recomputes
the snapshot and pushes a HUD redraw; a gate-open event also pushes a popup
open; a Gate-0-open event also pushes the Roadmap overlay.

---

## 3. Layer A — Flow HUD (always-on, per-feature lane)

**Description.** A persistent footer, redrawn on every event. Three fixed slots
show the *resident model / role*, the *current task + step rail* (the nine
per-feature gates), and *wall clock + switch tax*. It is the cheapest surface,
kept live while the human works with the director. **Per-feature scope:** it
shows the in-flight row's own Gates 1–9; the *deliverable* view is Layer C.

```
+-----------------------------------------------------------------------------+
| HUD  STRIP        (always-on footer, event-driven; 3 fixed slots)             |
| ----------------------------------------------------------------------------|
|  slot1 model/role     :     * qwen3-32b        (CODE)      head in the lane   |
|  slot2 task / steps    :  T003 worker     1v 2v 3* 4v 5v 6- 7- 8- 9-         |
|  slot3 rail / gate     :  gate: --        12:47        4 switches today       |
|  feature in flight     :  r3 "rate-limit / quota per key"   (of r1..r5)      |
|                                                                          |
|  event-driven only (no polling): on turn_start / turn_end / agent_end /       |
|  tool_call, recompute FactoryState then ctx.ui.setStatus(...)               |
+-----------------------------------------------------------------------------+
```

Glyph legend (single-width ASCII, safe for monospaced footers):

```
+--------------------------------------------------------------------------+
| GATE RAIL     (compact, inside HUD; one glyph per gate, Gates 1-9)        |
| -------------------------------------------------------------------------|
|   glyphs    done = v    current = *    pending = -    open-gate = +       |
|   example   1v 2v 3* 4v 5v 6- 7- 8- 9-  (1-2 done, 3* current,           |
|                                          6-9 pending; no + -> open)       |
+--------------------------------------------------------------------------+
```

Slot 1 doubles as the `model-status` "head in lane" readout; the `*` is the
`working-indicator` spinner when the head is streaming. The `feature in flight`
line is added for Layer C — it names the current roadmap row by id + short
description, so the per-feature HUD stays anchored to the deliverable.

---

## 4. Layer B — Flow Popup (modal overlay, per-feature lane)

**Description.** The old dashboard's "you were away, here's a gate" role, as a
modal that auto-rises when a gate opens. One overlay, two faces — *closed /
on-demand* and *open-gate* — driven by the same `ctx.ui.custom` primitive
`doom-overlay` uses. It returns the human's move via `ctx.ui.select([...])`,
so the popup is itself a gate decision surface. **Per-feature scope:** a *gate
card* of Gates 1–9 of one in-flight row; the *pre-lane* Gate 0 card is Layer C.

### 4.1 Closed / on-demand face

```
+--------------------------------------------------------------------------+
| FLOW  popup        (closed / on-demand)                                    |
| -------------------------------------------------------------------------|
|   GATE RAIL      [1] [2] [3*] [4] [5]        [6] [7] [8] [9]              |
|                          ^ current: PLAN / 9 of this row                  |
|    LANE        head = qwen3-32b (CODE)     * streaming   T003 worker      |
|   QUEUE            7 pending / next = qwen3-8b x3    (switch-tax flagged)  |
|   wall-clock       12:47        today: 4 switches                            |
|   gate: --            [no per-feature gate open]                           |
+--------------------------------------------------------------------------+
```

### 4.2 Open-gate face (a Gate 1–9 gate card)

```
+--------------------------------------------------------------------------+
| FLOW  popup       (OPEN  --  gate card, Gate 3 of 9 = PLAN)              |
| -------------------------------------------------------------------------|
|   GATE RAIL     1v 2v 3* 4v 5v   6-     7-     8-     9-                |
|                 done done current done done   pending x4                  |
|    ARTIFACT      plan.md        (read by a subagent, not loaded whole)    |
|   SUMMARY        4 tasks : T003, T004, T005, T006      est 12:07 wall    |
|   CRITICAL DEPS  T006 depends on T005, T004   (reviewer path)            |
|   SWITCHES        3 today        (qwen3-8b -> qwen3-32b for review)      |
|    DECISION                                                                   |
|          [ approve ]     proceed to checkpoint gate                        |
|          [ revise ]      bounce a task / spec back with notes             |
|          [ reject ]      drop the feature                                 |
+--------------------------------------------------------------------------+
```

The artifact (`plan.md`, `arch.md`, `concept.md`, `verification-report.md`) is
**read by a subagent and summarized**, never loaded whole into the popup —
keeps the overlay small and the popup state cheap.

### 4.3 Gate-face variants (move set differs per per-feature gate)

```
+--------------------------------------------------------------------------+
| GATE-FACE VARIANTS    (move set differs by gate type, Gates 1-9)         |
| -------------------------------------------------------------------------|
|   CONCEPT / SPEC / CHECKPOINT / DOCS / PR                                 |
|          [ approve ]       [ revise ]       [ reject ]                    |
|    REVIEW   (line-of-defense; reviewer never edits the artifact)          |
|          [ approve ]       [ restart ]    restart feature, NO revise      |
|    VERIFICATION (line-of-defense; harness auto-mitigates)                 |
|          [ approve ]       [ reject ]   reject -> mitigation loop, <= 2   |
+--------------------------------------------------------------------------+
```

---

## 5. Layer C — Roadmap overlay (deliverable-level, NEW)

**Description.** A zoom-out, above Layers A and B.** Where A and B show *one
feature's* lane, Layer C shows the whole **roadmap** — the ordered, human-
approved **firing program** for a deliverable (Layer C's `roadmap: RoadmapRow[]`
in §2). It renders every feature **row** with a *one-line short description*,
its **status** (`not-started / in-flight / PR / merged`), its `deps`, and where
the implementation sits *right now* — the in-flight row highlighted at its
**current gate**. It is **additive**: it composes with A (the footer, per-lane)
and B (the per-gate popup), it does not replace them. It also carries **Gate 0
— Roadmap**, the *pre-lane* human decision that approves the firing program
*before* any row's Gates 1–9 run. **Headless: it degrades to the roadmap table
printed to the ledger** — a missing overlay never hides or auto-approves Gate 0.

### 5.1 Roadmap overlay — in-flight face

```
+-----------------------------------------------------------------------------+
| ROADMAP  overlay     (Layer C, deliverable-level; 12:47 · 4 switches today)  |
| ----------------------------------------------------------------------------|
|  DELIVERABLE   "rate-limit the public API"        Gate 0: approved r1..r5    |
|   firing program -- each row = ONE full Gates 1-9 lane, in order            |
|  ------------------------------------------------------------------------ --|
|   id  STATUS     SHORT DESCRIPTION                  DEPS          LANE/GATE   |
|   r1  merged   register / verify e-mail (auth)       -            done        |
|   r2  merged   API-key issuance + rotation           r1          done        |
|   r3  IN-FLT  * "rate-limit / quota per key"        r2     * Spec/9  HERE    |
|   r4  pending   billing metering + usage report      r3            waits r3    |
|   r5  pending   usage dashboard (client)             r4            waits r4    |
|  -------------- unattended tail: STOP at r3 PR (inter-feature -> Gate 0) ----- |
|   [ r..roadmap key ]  open Layer C   ·  per-row veto still halts; per-row     |
|                        gate report; Gate 0 re-validated at each boundary      |
+-----------------------------------------------------------------------------+
```

### 5.2 Roadmap overlay — Gate 0 face (pre-lane, human-only)

```
+-----------------------------------------------------------------------------+
| ROADMAP  overlay      (OPEN -- GATE 0 -- Roadmap, PRE-LANE: before r1..r5)   |
| ----------------------------------------------------------------------------|
|  PROPOSED firing program   (drafted WITH the human by the director; not yet  |
|                               approved; no lane has run yet)                |
|  id  short description                          depends on   size (est)      |
|  r1  register / verify e-mail (auth)            -             M              |
|  r2  API-key issuance + rotation               r1            M              |
|  r3  rate-limit / quota per key                r2            L              |
|  r4  billing metering + usage report           r3            L              |
|  r5  usage dashboard (client)                  r4            S              |
|  -------------------------------------------------------------------- --    |
|  director proposes; the HUMAN decides (author/judge separation):            |
|          [ approve roadmap ] lock order + rows; start r1's lane            |
|          [ revise w/ director ]  reorder / split / coarsen with the director |
|          [ reject ]                 restart the breakdown                  |
|   Gate 0 is a human gate even headless (a durable WAIT) -- nothing auto-    |
|   approves the roadmap. Each approved row then runs its own Gates 1-9;      |
|   Gate 0 re-enters at every inter-feature boundary.                         |
+-----------------------------------------------------------------------------+
```

### 5.3 Layer C headless fallback (the roadmap table form)

When `!ctx.hasUI`, Layer C cannot rise, so the **roadmap degrades to a table
printed to the factory-log / ledger** — the firing program and its Gate-0
decision recorded, never auto-approved.

```
+--------------------------------------------------------------------------+
| LAYER C HEADLESS  (CI / cron / no UI) -- roadmap table form             |
| -------------------------------------------------------------------------|
|   id   status    short                 deps   lane/gate                  |
|   r1   merged    register/verify email -      done                        |
|   r2   merged    api-key issuance       r1    done                        |
|   r3   wait      rate-limit / quota     r2    gate_plan.token deadline...  |
|   r4   pending   billing metering       r3    -                           |
|   r5   pending   usage dashboard        r4    -                           |
|   gate0  approved@12:03  rows=r1..r5  decided_by=human@token (NOT auto-  |
|           -- the roadmap table is printed, Gate 0 stays a human WAIT   |
|           -- a missing Layer C never hides or auto-approves Gate 0        |
+--------------------------------------------------------------------------+
```

---

## 6. Auto-pop at gate (event-driven, the popups' job)

**Description.** The popups (B + C) *replace* the old dashboard's "you were
away, here's a gate" role. **Layer B** auto-rises when a per-feature gate
(1–9) opens; **Layer C** auto-rises when **Gate 0** opens (pre-lane, or at an
inter-feature boundary). The lane WAITS for the human decision while a card is
up; the human's only keyboard job is to *decide, not poll*.

```
+--------------------------------------------------------------------------+
| AUTO-POP AT GATE      (event-driven, no polling)                          |
| -------------------------------------------------------------------------|
|   DU done  ---->  Gate k opens   ---->  Layer B card rises  (lane WAITS)  |
|   row done ---->  Gate 0 re-opens -----> Layer C card rises (lane WAITS)  |
|   key      action                                                         |
|   g        open Layer B  Flow Popup (per-gate)      (human-initiated)     |
|   M        open Layer C  Roadmap overlay (deliverable) [proposed keymap]  |
|     ?        toggle open / close                                           |
|   q        quit                                                          |
|   Esc      close      (only when NOT sitting on a gate)                   |
|   Enter    APPROVE / SELECT the default move                              |
|   R        RESTART / REJECT          (gate-context-dependent)             |
|    [   ]     previous / next gate   (navigate history)                    |
|   (keybinding precedent: timed-confirm / confirm-destructive / question.ts)|
+--------------------------------------------------------------------------+
```

---

## 7. Headless path (CI / cron / no UI) — the no-silent-approval contract

**Description.** When `!ctx.hasUI`, *no surface can rise*, so every gate — *both
the per-feature Gates 1–9 and the pre-lane Gate 0* — degrades to a ledger row
carrying a **resume token + deadline** (the `timed-confirm` precedent), and
**Layer C degrades to the roadmap table (§5.3)**. The single-lane invariant
intact: the lane still waits, it just *records* the wait instead of *drawing*
it. **A missing overlay may hide a gate or a roadmap row; it may never
silently approve one — including Gate 0.**

```
+--------------------------------------------------------------------------+
| HEADLESS         (CI / cron / no UI -- all layers degrade to the ledger)  |
| -------------------------------------------------------------------------|
|   Layer B gate auto-pops  ->  the gate becomes a 'WAIT' row (token+dl  )  |
|   Layer C Gate 0 rise    ->  the roadmap -> a printed 'roadmap table'    |
|   ledger    state   gate       artifact                                   |
|   gate0     approved rows r1..r5  roadmap@12:03 decided_by=human@token  |
|   T003      done      --          r2.log                                    |
|   T004      wait     plan        gate_plan.token  deadline=+00:30          |
|    ...       (lane blocks, recorded, not drawn;  nothing auto-approves)    |
|    policy: 'gate-block' (block by default; --headless required to proceed) |
+--------------------------------------------------------------------------+
```

---

## 8. Data flow (events -> state -> surfaces)

```
pi event stream
    |
   v
event handler (pi.on)   --->  recompute FactoryState  (roadmap/current too)
                                    |
                +--------------+-----------------+----------------+
               v                v               v                 v
  ctx.ui.setStatus    ctx.ui.custom        ctx.ui.custom       roadmap table
   (Layer A HUD)       (Layer B popup)      (Layer C overlay)   (if headless)
  slot1..3 footer     overlay + B card     roadmap rows/        printed only
                                   |
                       ctx.ui.select([...]) -> Promise<move>  (Gate 0 or Gate 1-9)
                                   |
                          move applied -> gate/rail state -> next DU / next gate /
                          (at inter-feature boundary) -> Gate 0 re-enters for next row
```

---

## 9. Invariants

**Per-surface / per-layer**
- **Always-on but cheap.** Layer A is an event-driven footer; it does not cost
  model calls or block the lane.
- **One overlay primitive.** Closed/informational and open-gate (and the Gate-0
  face) are faces of *one* `ctx.ui.custom`, so a missing UI never *inadvertently*
  auto-advances.
- **Summarized, not loaded whole.** Gate artifacts are summarized by a subagent
  before they reach a popup/overlay.
- **Headless = ledger, not auto-approve** — and now explicitly the **roadmap is
  a printed, human-recorded table, not an auto-advancing roadmap.**
- **Never re-enters a completed row.** The roadmap can't auto-restart a
  `merged` row; inter-feature progression waits on Gate 0.

**Roadmap / Layer C**
- **Gate 0 is before all nine.** The per-feature Gates 1–9 keep their numbers;
  Gate 0 is a separate *pre-lane* human gate that approves the firing program
  and re-enters at every inter-feature boundary.
- **One row = one full lane.** Each roadmap row, once approved, runs its own
  Gates 1–9 exactly as a standalone feature; the overlay only *frames* the
  sequence.
- **In-flight is visible.** The overlay always shows *where* the implementation is
  (current row + current gate); a missing overlay degrades to a printed table.
- **No auto-approve of the roadmap.** Layer C's headless fallback records, never
  decides; the human authors the roadmap *with* the director and approves it.
- **Inter-feature unattended default = one PR.** A roadmap-level unattended run
  stops at each row's PR; chaining across rows is a separately authorized, higher-
  risk move that still preserves per-row veto-still-halts, per-row reports, and
  Gate-0 re-validation.

---

## 10. API risk stratification (UI track)

| API | status | mitigation |
| --- | ------ | ---------- |
| `ctx.ui.setStatus` | confirmed | none |
| `ctx.ui.setWorkingIndicator` | confirmed | none |
| `ctx.ui.select` | confirmed | none (gate moves / Gate 0 moves) |
| `ctx.ui.notify(msg, level)` | confirmed | none |
| `ctx.ui.custom(overlay)` | confirmed (doom) | use doom's overlay skeleton |
| `ctx.hasUI` / `ctx.ui.headless` | confirmed | none |
| `handoff.ts` yield/reclaim | **spike** | adapt its lane switch; read P0 |
| overlay `Component` type | **spike** | doom's custom component is template |
| `ctx.ui.confirm(...)` | **spike** | fall back to `ctx.ui.select` |
| Layer C keybinding (`M`) | **spike** | final key vs `?`/`g`; confirm TUI key layer |

---

## 11. Implementation milestones (UI track)

| phase | deliverable |
| ----- | ----------- |
| U1 | `hud.ts`: slot1..3 footer on `turn_*` events (Layer A) |
| U2 | `overlay.ts`: closed face + gate card (Layer B) on doom overlay skeleton |
| U3 | auto-pop on gate-open event + keybinding map (§6) |
| U4 | gate-face variant table by gate type (§4.3) |
| U5 | headless WAIT-row degradation (§7) + ledger integration |
| U6 | polish: glyph legend, switch-tax surfacing, navigate-history |
| **U7** | **`roadmap.ts`: Layer C overlay — roadmap rows/short/status, in-flight highlight, Gate 0 face (§5), auto-rise on `gate0_open`/`roadmap_row_done`, headless roadmap-table fallback (§5.3/§7)** |

---

## 12. Open questions (UI)

1. Does `ctx.ui.custom` overlay survive a `turn_end` / compaction, or must it be
   re-registered each event? (affects U1/U2 redraw strategy.)
2. Can the overlay host `ctx.ui.select` directly, or must moves be wired through
   the overlay's own key handler? (affects U3.)
3. Exact overlay `anchor`/`width`/`maxHeight` options for a full-width modal.
4. `ctx.ui.confirm` vs `ctx.ui.select` for the simple two-move gates (§4.3 verify).
5. **Layer C sizing:** one wide overlay listing all rows (the §5.1 box) vs a
   compact strip (like Layer A) — and the keymap conflict between a Layer-C key
   (`M`) and the per-gate `g`/`?`. (affects U7.)
6. **Gate-0 face:** does Gate 0 reuse the Layer-B gate-card chrome (§4.2) with a
   `roadmap` payload, or is it a distinct Layer-C face (§5.2)?
7. **Roadmap-as-artifact:** is `ROADMAP.md` a first-class on-disk artifact
   (analogous to `context.md`) or a derived projection of `factory-log` rows?
