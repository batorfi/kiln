# KILN — the Roadmap (a deliverable's firing program)

> Status: Concept — pre-implementation. This doc owns the *deliverable-level* concept
> that sits **above** the per-feature lane: a **Roadmap** — one ordered firing program
> of feature rows the single lane fires **one row at a time**, with the human
> **re-admitting between rows** at **Gate 0**. It complements `concept.md` (the system),
> `process-flow.md` (one row's lane, end to end), `gates-why-how-what.md` (the nine
> gates, now **Gate 0 + Gates 1–9**), `ui-layers-deep.md` (the three UI surfaces —
> Layer C *is* this roadmap, drawn), and `kiln-analogy.md` (the firing image — one
> chamber firing **row by row**, the human between firings).
>
> The whole idea in one line: **the lane does not fire one feature and stop — it fires
> the roadmap, row by row; and the human re-checks the *program* at Gate 0, before the
> first row and at every row boundary, never letting the chain unattend a row the human
> never admitted.**

```
The KILN roadmap — the deliverable, as a firing program
═══════════════════════════════════════════════════════════════════════════════════════

  The lane fires ONE ROW at a time, GATE 0 at each seam. One chamber, many firings.

 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ DELIVERABLE: "Shipping-ready local dev harness (v1)"                          │
 │ ── ROADMARD: the ordered firing program ──                                    │
 │  ┌────────────┐  ┌───────────────────────────────────────────────┐           │
 │  │ GATE 0      │  ROADMAP                                          │ ◀ human,
 │  │ (pre-lane)  │  r1  core lane model     ● done  @PR#11            │  pre-lane
 │  │ approve the │  r2  Gate 0 / roadmap     ◆ current                  │  +
 │  │ whole program│  r3  cost model (switch)  ○ next   (deps r2)        │  inter-row
 │  │ ────────────│  r4  constitution gate    ○        (deps r3)        │  ONLY
 │  │  Approve  ──┼──┘  r5  factory-log schema ○        (deps r3)        │
 │  │  Revise (rows)                                                          │
 │  │  Reject (abandon)  r1 ─▷ r2 ─▷ r3 ─▷ r4 ─▷ r5  :: ordering         │
 │  └─────────────┴─ chain: APPROVE@row-boundary → next lane     ◁ NOT auto ◁│
 │     ▲  human re-admits here; NOT in the unattended tail            │
 │     └───────────────────────────────────────────────────────────────┘
 │                                                                       │
 │  each row rN === ONE full Gates 1–9 lane (a complete firing of the    │
 │  same chamber) on rN's own concept · arch · spec · plan · impl ·      │
 │  review · verify · docs · PR.  The lane re-shoots itself, row by row.  │
 └─────────────────────────────────────────────────────────────────────────────┘
              │
              ▼
  WHAT A ROW IS            ┌─ r1 ─▶ [G1·G2·G3·G4]─▶ [G5]─▶ [G6·G7]─▶ [G8·G9/PR] ─▶ done ─┐
                          │  (one full per-feature lane — process-flow.md)                  │
                          ▼                                                                  ▼
  ONE ROW = THE FULL LANE   concept → arch → spec → plan → impl → review → verify → docs → PR
                          each gate a HUMAN hold (or a logged, deliberate exception)
```

This is **the** new idea. In `concept.md` the lane already fires *one* feature and
ends at its PR. KILN scales that upward: a **deliverable** is a Roadmap of feature
**rows**, the lane re-shoots itself row by row, and a new pre-lane **Gate 0 —
Roadmap** is where the human admits (or re-admits) the program. The nine gates are
not displaced — each row runs *them in full*; Gate 0 is the layer *above* them, at
the seam between firings.

---

## 1. What a Roadmap is

A **Roadmap** is the deliverable's **ordered firing program**: a list of feature
**rows**, each row being **one complete per-feature lane** (the full Gates 1–9 walk
in `process-flow.md`), with a **topological order** and **dependency edges** between
rows. The lane fires **exactly one row at a time**; when a row reaches its PR it
**completes**, and the director proposes to start the next row — but **the next row
does not auto-start**: the human **re-admits at Gate 0**.

```
  DELIVERABLE
   └── ROADMAP ── ordered firing program ──┐
        ├── row r1  ── full Gates 1–9 lane ──▶ @ PR#11   ◀── a complete FIRING
        ├── row r2  ── full Gates 1–9 lane ──▶ @ PR#12
        ├── row r3  ── full Gates 1–9 lane ──▶ @ PR#13
        └── ...
   (one chamber; the human re-admits at Gate 0, between firings)
```

Two things hold, and they are the point:

- **The whole program is human-approved before any row's lane starts.** At kickoff the
  director drafts the Roadmap and **Gate 0 (human-only)** approves *the program* —
  the rows, their order, their dependencies. Nothing fires on an unapproved roadmap.
- **The inter-row chain is not unattended by default.** Each row is gated by its own
  PR; after a PR, the row *completes* and Gate 0 opens **again**, at the seam. The
  unattended tail (`§` `gates-why-how-what.md §3`) only ever runs *within* a row
  (trailing gates Plan→PR). **Cross-row** chaining is a *separate, explicit, logged*
  human decision — and Gate 0 can **lift it** at any time, exactly the way any veto
  lifts the unattended tail.

Everything in this doc preserves that: Gate 0 never auto-approves, ever, including
headless; and a row never starts on a roadmap the human hasn't admitted.

---

## 2. The Roadmap artifact (`ROADMAP.md`)

The Roadmap is a **per-deliverable artifact**, committed and reviewed like any other
KILN deliverable. It is the human-readable, diffable record of the firing program and
its state. It has a **structured (YAML) head** and a **rendered table**. One
deliverable → one `ROADMAP.md`; one row → one feature lane → that lane's
`concept.md` / `spec.md` / `pr.md`, cross-referenced from the row.

```
ROADMAP.md   (one per deliverable; human-authored/approved at Gate 0)
─────────────────────────────────────────────────────────────────────────
deliverable: shipping-ready local dev harness (v1)
owner:    human@token        updated: <ts>

rows:                         # the firing program, in order — one row === one full Gates 1–9 lane
  - id:  r1
    short: core lane model                 # one-line feature statement (== the HUD row's label)
    scope: the single-lane scheduler, hold/yield, model-affinity queue
    deps: []                              # nothing — fires first
    status: done                           # ○ queued · ◆ active · ✎ revising · ✓ done · ⊘ aborted
    outcome: @PR#11 (gates 1–9 closed)      # a done row carries its closing PR
    spec: features/r1-core-lane-model/spec.md

  - id:  r2
    short: Gate 0 + the roadmap overlay
    scope: pre-lane human gate, roadmap.md schema, Layer C
    deps: [r1]
    status: active
    outcome: (in flight)

ordering:       [r1, r2, r3, r4, r5]      # the firing sequence
chain_unattended: false                   # human re-admits per row (Gate 0); see §3
gate0:                             # the approval record (== FactoryState.gate0)
  status: approved
  rows: r1..r5
  decided_by: human@token
  at: <ts>
  note: "approved rows r1–r5 in order; r2–r5 gated by human, not the tail"
```

```
  the same ROADMAP.md, rendered (this is roughly what Layer C draws)
  ═══════════════════════════════════════════════════════════════════════════════
  ROADMAP — DELIVERABLE "shipping-ready local dev harness (v1)"
  ──
   r1  core lane model        ● done   PR#11
   r2  Gate 0 + roadmap layer  ◆ active   (deps r1, satisfied)   ◀ you are here
   r3  cost model (switch)     ○ next     (deps r2, pending)
   r4  constitution gate       ○          (deps r3)
   r5  factory-log schema      ○          (deps r3)
   ──
   ordering  r1 → r2 → r3 → r4 → r5     chain: APPROVE@row-boundary (NOT auto)
   gate0  approved@12:03  rows=r1..r5  by human@token   (NOT auto — see §4)
  ═══════════════════════════════════════════════════════════════════════════════
```

The rendered table is what **Layer C (the roadmap overlay)** draws live and what the
**headless path prints** (§6). It is *not* the source of truth — the structured head
is; the table is a projection. This matches KILN everywhere: a **human reads a
summary, and the structured record is behind it.**

---

## 3. The in-memory model (what the surfaces draw from)

`ROADMAP.md` becomes, in `FactoryState`, the small roadmap-level fields that Layer C
(and its headless twin) draw from — a *view over* the same `lane` / `gate` the per
feature lane already uses, not a second store (the shared-state invariant in
`ui-layers-deep.md §2`):

```
type RoadmapRow = {
  id:        string      // "r2", "r3"
  short:     string      // one-liner → the row label
  status:    "queued" | "active" | "done" | "revising" | "aborted"
  deps:      string[]    // ["r1"] — satisfied when each dep's status == "done"
  outcome?:  string      // when done: the closure @PR#NN
  gate?:     LaneGate    // when this row is active: a live Gates 1–9 gate
  // (the same LaneGate type used by Layers A/B; no new gate concept)
}

// the roadmap-level additions to FactoryState (the lane/gate fields are unchanged):
roadmap:     RoadmapRow[]          // the deliverable's firing program
current:      string               // id of the active row (which lane is the "hot kiln")
gate0:        Gate                 // the pre-lane + inter-row roadmap gate (see §4)

// the inter-row event (row done → row done):
"roadmap_row_done"   { id, outcome }   // fires when a row's PR closes
```

`gate` and `gate0` are **two different gates** — don't conflate them: `gate` is *one
row's* live Gates 1–9 gate (Layers A/B draw it); `gate0` is the *program-level*
human gate (Layer C draws it; it sits **between** rows, not inside one).

---

## 4. Gate 0 — Roadmap (the pre-lane gate)

A road-map is only as good as the human's agreement on *what to build and in what
order* — so **Gate 0** is the **pre-lane, human-only** gate that approves the
program. It is the first gate at kickoff and re-opens at **every inter-row seam**.
It is **always human and never auto-approves**, including in headless: this is the
one gate no exception (unattended tail, cheap head, missing UI) is ever allowed to
silence.

```
+--------------------------------------------------------------------------+
|  GATE 0 — ROADMAP  (deliverable-level, pre-lane — human-only)             |
|  ─ not a per-feature gate; it sits ABOVE the row's Gates 1–9 ─          |
|                                                                            |
|  DELIVERABLE       shipping-ready local dev harness (v1)                  |
|  ── FIring PROGRAM (the rows the lane will fire, in order) ──            |
|   r1  core lane model       deps: —            ○ queued                   |
|   r2  Gate 0 + roadmap      deps: [r1]        ○ queued                   |
|   r3  cost model (switch)   deps: [r2]        ○ queued                   |
|   r4  constitution gate     deps: [r3]        ○ queued                   |
|   r5  factory-log schema    deps: [r3]        ○ queued                   |
|                                                                            |
|  ORDERING   r1 → r2 → r3 → r4 → r5   (a row fires when its deps are done) |
|  CHAIN      APPROVE@row-boundary      (NOT auto — the human re-admits)     |
|  (each row fires a full Gates 1–9 lane; see process-flow.md)             |
|                                                                            |
|   Moves:  APPROVE / REVISE / REJECT                                         |
|   [Approve]  [Revise] [Reject]  [Edit rows]  [Add row]  [Drop row]        |
|                                                                            |
|   APPROVE  admit r1..r5 in order; fire r1 now; human re-checks at each seam │
|   REVISE   edit the rows / order / deps, then re-admit   (a program edit)  |
|   REJECT   abandon / re-plan the whole deliverable                        |
|                                                                            |
|   HUMAN-ONLY · GATE 0 never auto-approves — not under the tail,            |
|   and not when there is no UI (it prints + WAITs instead; see §6).        |
+--------------------------------------------------------------------------+
```

**WHAT.** Artifact `ROADMAP.md` (a roadmap, not a feature document). Moves:
**approve / revise / reject**, plus the program-edit moves `Edit rows / Add row /
Drop row`. Author is the director (it drafts the roadmap from the deliverable); the
human decides. This is the only gate that is *explicitly, unconditionally,
human-only* — even a missing UI prints the roadmap and **blocks**, never silences it.

**WHY.** This is the most expensive decision of all and the one to get right first:
a wrong *program* (bad rows, wrong order, a missing dependency) costs the whole
feature-set downstream of it, and unlike a single feature it is *not* cheap to
un-fire a row. It gates the decision "is this the right set of features, in this
order, and will we fire them one at a time with human re-checks." Failure mode if
skipped: a deliverable the human never chose — the lane happily builds the wrong
feature next with no human in the loop.

**HOW.** At kickoff the director drafts `ROADMAP.md`, opens **Gate 0**, and the
lane is **held** until a human move arrives as an event (a `gate0_open`, like the
lane-open). On **approve**, `gate0` records `approved@ts / rows=r1..rN /
decided_by=human@token` (a `gate0` *report* in the factory-log — durable, greppable,
**never auto-written by the model**) and the first row's lane begins. Because Gate 0
is pre-lane it sits **above** the in-lane Gates 1–9: it opens *before row 1's* lane
and *between row N and N+1's* — never inside a row's lane. Headless: §6.

---

## 5. Firing the program: row by row, human between

Once Gate 0 approves, the director executes the program **one row at a time**,
**respecting deps** (a row is *eligible* only when its `deps`'s status is `done`),
with **Gate 0 re-opening at every seam** to re-admit the next (or to revise the
remaining program as early feedback arrives).

```
  GATE 0 (pre-lane)
     │  APPROVE rows r1..r5
     ▼
  ┌─────────────┐
  │ ROW r1 ──▶  full Gates 1–9 lane ──▶ G9/PR  ──▶  r1 done  (@PR#11)│
  └─────────────┘
     │  "roadmap_row_done r1"  ─────────────► Gate 0 re-opens (inter-row) ◀ HUMAN, always
     ▼
  ┌─────────────┐
  │ ROW r2 ──▶  full Gates 1–9 lane ──▶ G9/PR  ──▶  r2 done  (@PR#12)│
  └─────────────┘
     │  "roadmap_row_done r2" ──► Gate 0 re-opens  ── …  (until the program is done)
  …
```

- **Deps gate eligibility.** r3 (deps r2) does not become *current* until r2 is
  done. The director picks the next **eligible** row; if several are eligible they
  fire in `ordering`, still one at a time (one lane, one "hot kiln").
- **Each row is a complete firing.** A row runs the *entire* per-feature lane
  (`process-flow.md`) — concept, arch, spec, plan, checkpoint, review, verify, docs,
  PR — with its own Gates 1–9 and its own (optional) unattended tail *within* it.
- **The seam is human.** At each `roadmap_row_done`, Gate 0 **re-opens** and the
  human **re-admits** the remaining program before the next row fires — or **revise
  the remaining rows** based on what the finished row taught the deliverable — or
  **stop.** The inter-row chain is **never unattended by default.**
- **Opt-in chaining.** *If the human explicitly elects* to chain (an unattended
  inter-row mode, logged like the unattended tail), rows fire back-to-back — **but
  Gate 0 remains the lifter**: any line-of-defense veto *inside* a row (arch-critic
  objection, reviewer `restart`, verifier `reject`, a checkpoint that overflows)
  **halts the chain and returns to the human**, exactly as a veto lifts the
  in-row tail. The human may re-elect the chain, row by row, but may **always
  lift it.**

This is the deliverable's analogue of the unattended tail, with one crucial
difference: the in-row tail pre-authorizes *approve-only* trailing gates *within* a
row; cross-row chaining is a *separate* decision and *never* weakens the per-row
gates. Gate 0 is the seam that keeps it honest.

---

## 6. The headless path (CI / cron / no UI)

A missing UI may **hide** Gate 0's overlay, but it must **never auto-approve** it.
In headless (`!ctx.hasUI`) Gate 0 degrades to a **printed roadmap table** plus a
**WAIT row** in the factory-log — the same no-silent-approval contract as the nine
per-feature gates in `gates-why-how-what.md §3`, extended to the program gate.

```
+-------------------------------------------------------+
|  GATE 0 (headless, no UI) — never silent:            |
|    the roadmap table is PRINTED, Gate 0 stays a human |
|    WAIT, and a WAIT row is appended to factory-log:   |
|                                                       |
|  WAIT  gate0  approve-deliverable "local-dev-harness" |
|        rows=r1..r5 · pending human · token g0_<id>     |
|        deadline <ts+30m> · headless · roadmap printed  |
|        (NOT auto-approved — no UI never silences Gate 0) |
+-------------------------------------------------------+
```

- **Print, don't pop.** The roadmap table (§2's rendered form) is written to the log
  / terminal so the human can *see* the program being requested without a TUI, and a
  `WAIT gate0 …` row is appended so the request is *durable and greppable*.
- **Block, don't advance.** Gate 0 is **pre-lane**; with no human move the program
  **does not fire** — `current` stays unset, no row starts. There is no "auto-first
  row."
- **The exception is still a human's.** The unattended tail and a cheap head may
  carry a row's *in-row* trailing gates, and an *explicitly elected* inter-row
  chaining may carry a *row boundary the human already approved* — but the
  **first-time** program approval at kickoff is always a human Gate 0 move even in
  headless. (This is the one gate the constitution never auto-authorizes.)
- **Vetoes still lift.** A line-of-defense veto inside any row, in any mode, halts
  the program and returns to the human; a missing UI never converts a veto into a
  pass.

---

## 7. The three UI surfaces that show the roadmap (Layer C)

The roadmap is *drawn* by **Layer C — the roadmap overlay**, a new **deliverable-level**
surface on top of the per-feature **Layer A (Flow HUD)** and **Layer B (Flow
Popup)** (full design in `ui-layers-deep.md §5`):

| layer | level | shows the roadmap | behavior |
|---|---|---|---|
| **A — Flow HUD**  | per-feature lane | the **active row's position** + program shape (a strip) | always-on, non-modal, in the footer |
| **B — Flow Popup**| per-feature lane | the row's live **Gates 1–9** gate card | auto-pops at a gate (modal) |
| **C — Roadmap overlay** | **deliverable** | the **whole program**: every row, status, deps, ordering | **on-demand** (proposed key `M`), additive — *composes* over A/B, doesn't replace them |

In headless there is no Layer C to pop; the **printed roadmap table** (§6) is its
twin, and a row's in-lane Gates 1–9 still degrade to `WAIT` rows via Layer B's
contract. A missing overlay **never** hides or auto-approves Gate 0.

---

## 8. Invariants (the things a roadmap must never break)

- **Gate 0 is human-only, always.** Not under the tail; not under a cheap head; and
  *especially* not when there is no UI — then it prints a roadmap table and **WAITs**,
  it does **not** auto-approve. Gate 0 is the one gate the constitution never
  auto-authorizes; the human admits the program.
- **One row, one line.** The lane fires **exactly one row at a time** (one chamber,
  one "hot kiln"); rows are sequential, **deps-gated**, and never parallel.
- **The inter-row chain is gated by a human.** Each `roadmap_row_done` **re-opens
  Gate 0**; cross-row chaining is *opt-in and logged*, and any line-of-defense veto
  **lifts** it — exactly as a veto lifts the in-row unattended tail. The chain is
  never the missing-UI fallback.
- **Dep order is enforced.** A row fires **only** when its `deps` are `done`; the
  director never advances a row past an unsatisfied dependency.
- **A row is a whole firing.** Each row runs the **full Gates 1–9** lane with its own
  (optional) in-row unattended tail — Gate 0 does not *short-circuit* a row's gates,
  it sits *between* them.
- **The gate that sits above the gates is `gate0`, not `gate`.** `gate` is one row's
  live Gates 1–9 gate; `gate0` is the program gate *between* rows. The two are
  never conflated in state or in the move vocabulary.
- **The roadmap is a reviewed artifact, not ephemeral UI.** `ROADMAP.md` is
  committed; Gate 0 and every `roadmap_row_done` are **factory-log records**
  (durable, greppable, *never model-written-as-*approve* — a human move, or a
  `WAIT`/`gate-block` record).
- **One `RoadmapRow` ↔ one HUD row ↔ one gate-1..9 lane ↔ one closure PR.** The HUD
  strip, the overlay table, and the log all refer to the *same* program by `id`.
- **The roadmap is additive, not a replacement.** Layer C **composes** over Layers
  A/B; a roadmap surface must not displace a row's per-feature gate visibility.

---

## 9. Open questions (roadmap / Gate 0 track)

1. **Row granularity** — how small should a *row* be? One row = one *feature* (full
   Gates 1–9), or can a deliverable ship *sub*-feature rows that share a lane? (The
   doc above assumes **one row = one full feature = one full lane**; sub-feature
   rows would need a cheaper "mini-lane" and are out of scope for now.)
2. **Gate 0 face on rev** — does revising the *remaining* program (post row r1,
   before r2) re-use the same Gate 0 card with the done rows collapsed, or a second
   "amend" face? (Lean: **reuse the same card**, done rows pinned as `done`/collapsed;
   one card, two *phases* — pre-lane and inter-row.)
3. **Deps as a DAG** — can rows branch in parallel conceptually and be *fired* in one
   lane still (topological), or must the roadmap stay strictly linear? (Doc assumes
   **linear-with-deps**, fired topologically, always one at a time — matches "one
   chamber.")
4. **`ROADMAP.md` as artifact vs. projection** — is the roadmap a *committed
   artifact* under review, or a *projection* the director maintains? (Doc:
   **both** — human-authored at Gate 0, then updated as rows complete; the *status*
   column is a projection, the *program* is the reviewed record.)
5. **Inter-row chaining default** — opt-out (on by default, human stops) or opt-in
   (off by default, human chains)? (Doc assumes **opt-in, off by default** — the
   human re-admits each row at Gate 0 unless they explicitly elect chaining — the
   conservative read.)
6. **Chaining veto-lift** — does a veto inside a chained row abort only that row, or
   the whole remaining program? (Doc: **abort the chain, return to the human at
   Gate 0**; resuming the chain is a fresh human election each time it continues.)
7. **Layer C keybinding / size** — does `M` collide with existing TUI keys (g =
   go/scroll, ? = help); what's a sensible overlay height / row cap; and a keymap
   spike must precede any UI work (mirrors `ui-layers-deep.md`'s keymap spike).

---

## 10. How it plugs into the existing docs (the cross-refs)

- **`concept.md §4`** — the one-paragraph version of everything above (the headline).
- **`process-flow.md`** — *one row's* lane, end to end; a Roadmap is a *sequence*
  of these with Gate 0 between them.
- **`gates-why-how-what.md`** — **Gate 0 + Gates 1–9**: Gate 0 is the *pre-lane*
  gate added *before* the nine; the cross-cutting tail §3 gains a "inter-row
  chaining, veto-lifted by Gate 0" clause.
- **`ui-layers-deep.md §5`** — **Layer C (roadmap overlay)** draws the live roadmap;
  §2's `FactoryState` carries `roadmap / current / gate0`; §7's headless contract
  extends to Gate 0 (print roadmap + WAIT).
- **`kiln-analogy.md`** — the roadmap is a *batch of firings on one chamber, fired
  row by row, the human between firings*; Gate 0 is the human *between firings*,
  not inside a firing.
- **`skills/director.md`** — the director owns a new **pre-lane duty**: author
  `ROADMAP.md`, open **Gate 0**, fire the program row by row, hold for Gate 0 at
  each seam (unless the human chained it).

*The roadmap is the deliverable, and the lane is the kiln; a Roadmap is one
chamber firing its firing program row by row — the human holds the door between
each firing at Gate 0, never inside the firing, and a missing door never silently
opens.*
