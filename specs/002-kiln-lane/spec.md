# Feature Specification: KILN Lane Runtime — the execution spine

**Feature Branch**: `002-kiln-lane`

**Created**: 2026-09-12

**Status**: Draft (clarified 2026-09-12 — NC1–NC4 resolved; see the Clarifications section below)

**Input**: User description: "scaffold the next feature spec for the lane runtime row."

**Scope resolution (the decisions this scaffold makes, and the ones it leaves open):**
- **This is roadmap row r1 — the *first runtime row*.** It replaces
   `kiln/index.ts`'s documented *not-wired* stub (001, Q1=C) with the **execution spine
   of the kiln**: the **single lane** that holds one resident model, the **gate primitive**
   that blocks the lane on a human event, the **factory-log writer** that emits the records
   001's validator checks, and the **model-affinity scheduler** that is the cost lever. This is
the "kiln starts firing" row — the lane now *produces* real `transition` /
   `gate-completion` records instead of only *declaring* their shapes.
- **Dogfood, headless-first, no cloud.** The runtime is proven **without a live model** by
   driving the lane with a **deterministic stub resident** (the "resident model" is an
   *interface*; a test supplies a fake), whose emitted log is then **replayed through
   001's `kiln/validate/log`** and must **PASS**. A broken no-silent-approval path must make
    the emitted log **FAIL** that validator with a named reason (SC-003). This keeps the row
   **local-first** (Principle VIII) and **independently testable** without Ollama.
- **UI is the watch, not the spine.** The Flow HUD (Layer A) and Flow Popup (Layer B) are
   in scope as **the event-driven surfaces over one shared `FactoryState`**, plus their
   headless *print* twin. **Layer C (the roadmap overlay)** is **deferred to a sibling row
   (r2)** — it draws the *program* this row itself belongs to, and belongs after r1 exists.

> **Resolved decisions (NC1–NC4, 2026-09-12; full Q/A in the Clarifications section below).**
>  Four genuine choices opened at scaffold time, then **confirmed** to their lean defaults
>  (the human accepted them on 2026-09-12); each is a now-**applied** decision. The `[lean: …]`
>  tag on each bullet below records its **confirmed answer** (no-longer-open):
> - **NC1 (UI-layer scope).** Does r1 ship **Layers A/B** and defer **Layer C** to r2?
>    [lean: **A/B in r1, C in r2**.]
> - **NC2 (resident-model substrate for the independent test).** Is each story's
>    *Independent Test* a **structural/headless** proof driven by a **deterministic stub head**
>     (no live Ollama call), or does it drive a genuine local model? [lean: **stub head,
>     local-first, no cloud** — a live-model smoke walk is its **own later row** (r3).]
> - **NC3 (human-event channel).** Are decisions a single event channel whose **headless form
>     prints the gate card + emits a durable `wait` (token+deadline) and resumes by token**,
>      or two separate paths? [lean: **one channel; headless = print + `wait` + token-resume**
>      — the headless contract of Principle V.]
> - **NC4 (row granularity).** Is r1 the **whole runtime (US1–US4)** with US5 (UI) as P2 in
>     the same lane, or does US5 split into its own row? [lean: **US1–US4 = the spine row;
>      US5 = P2 within r1; Layer C = r2** — keeps r1 "one row, one full lane."]
>
> **Context.** 001 (`001-kiln-scaffold`) delivered the **planning contracts**: the factory-
> log schema + validator, the ROADMAP schema + *empty* artifact, and the gate-rail contract —
> but **ran no lane and advanced no gate** (Q1=C; SC-006). This row is the **runtime
> counterpart**: it builds the thing 001's contracts were written *for*, and it is judged
> **by** them. Per KILN principle I, **the scaffold (001) *declared*; this row *runs*** —
> and the two never blur: the lane's *own* gate outcomes are still decided by a human (this
> spec is the human's to admit and the line-of-defense judges' to review; the lane never
> approves itself). Per Principle VI, **this row does not start until Gate 0 admits a program
> containing it** — proposed in the [draft PROGRAM](./contracts/draft-roadmap.md) and
> **admitted at Gate 0** in the [program](../../ROADMAP.md) (`gate0.status: approved`, `human@batorfi`,
> 2026-09-13); nothing here auto-advances it.
>
> This spec is written for the **human operator** who admits r1 at Gate 0 and decides its
> gates, and for the **line-of-defense reviewers/verifier** who judge the runtime. It states
> *what* each piece of the lane must do and *why*, per Principle IX (event-driven, no
> server/poll — the watch degrades to a print twin) and Principle VII (everything the lane
> does lands in the factory-log the row itself writes).

## Clarifications

### Session 2026-09-12

- **Q (NC1):** Does r1 ship only the Flow HUD/Popup (Layers A/B), deferring the roadmap overlay?
   → A: **Yes — A/B in r1; Layer C (the roadmap overlay) is a sibling row, r2.**
- **Q (NC2):** Is each story's independent test driven by a **stub** resident (no live model), or a live local
    model?
   → A: **Stub head, local-first, no cloud — a live-model smoke walk is its own row, r3.**
- **Q (NC3):** Is a human decision one event channel (headless = print + `wait` + token-resume), or two
    separate paths?
   → A: **One channel; the headless form prints the gate card, emits a durable `wait` (token+deadline), and
     resumes by token — the headless contract of Principle V.**
- **Q (NC4):** Is r1 the whole runtime with UI inside, or is the UI split into its own row?
   → A: **r1 = the spine (US1–US4) with US5 (UI) as P2 in the same lane; Layer C → r2, live walk →
     r3 — one row, one full lane.**

## User Scenarios & Testing *(mandatory)*

### User Story 1 — The single lane: one resident model, hold / yield / resume (Priority: P1)

The kiln's defining shape is **one chamber, one resident model at a time**. The **director is
the scheduler**: it holds the lane, **yields** it to a worker, and **reclaims** it when the
worker returns. The runtime must realize exactly this — never two resident models at once,
never a "foundry" of parallel lanes.

**Why this priority**: This is **Principle III** (the thesis of the whole system) made
runnable. It is the load-bearing spine the gate primitive (US2), the log writer (US3), and the
scheduler (US4) all plug into; without it nothing else has a lane to run on.

**Independent Test**: Drive a **tiny 2-unit lane** with a **stub resident** and assert (a) at
**any instant at most one** work unit is running and one model is resident; (b) the
`hold` → `yield` → `resume` transitions are emitted, in order; (c) no parallel/duplicate lane
exists. No live model is called (NC2 stub-head); the assertions are over the emitted
transition records and the `FactoryState` shape.

**Acceptance Scenarios**:

1. **Given** an empty lane and two queued work units, **When** the director runs them,
   **Then** the lane holds **exactly one resident model at a time** and **exactly one
    running unit at a time** (Principle III), and each `yield` is followed by a matching
     `resume` before the next unit begins.
2. **Given** a unit that finishes, **When** it returns, **Then** the director **reclaims the
   lane** and the next affinity-compatible unit (US4) runs on the resident model **without a
    swap**.
3. **Given** the `FactoryState` at any captured instant, **When** inspected, **Then**
    `resident` and `running` are never both populated with two concurrent units — the state
     encodes a single lane, not a fan-out.

---

### User Story 2 — The gate primitive: block on a human; degrade to a durable WAIT headless (Priority: P1)

The runtime must realize the **gate** the contracts declared: a gate **holds the lane** until a
human **`Approve / Revise / Reject`** (or the gate's specialized moves) arrives as an event,
using **this gate's own `MoveVocabulary`** (001's `gate-rail.md`, G3). When there is **no UI**,
the gate **never auto-approves**: it **prints the gate card** and emits a durable
**`wait`** record (`gate`, `token`, `deadline`) — the only valid unresolved shape — and resumes
by token. This is the runtime half of 001's R3/R4 no-silent-approval contract (Principle V).

**Why this priority**: A lane whose gates were *implicit* would be the missing-door silent
failure the constitution forbids. Making the gate an explicit **event-block + headless-`wait`**
is what keeps an unattended run honest. P1 with US1 — it is the other half of "a lane the human
holds the door."

**Independent Test**: Drive **one gate** two ways. (a) **Headless**: gate opens → the lane
emits a `wait` record and **halts** — `current`/`gate` stay set, **no `gate-completion` is
written**, and no path yields `approved`. (b) **Resumed**: feed a `human-decision` record for
that gate's `token` → the gate emits a `gate-completion` with a non-empty `decidedBy: human`,
and **the emitted log PASSES 001's `kiln/validate/log`** (dogfood).

**Acceptance Scenarios**:

1. **Given** a gate that opens with **no UI** present, **When** the lane reaches it, **Then** it
   **prints the gate card**, emits **one `wait`** record (token + deadline), and **never
    writes a `gate-completion`** — a headless gate is a **recorded, not a resolved** request
     (Principle V).
2. **Given** an open gate and a human event whose `move` is **not** in `MoveVocabulary(gate)`
   (e.g. `revise` at `6-review`, whose set is `approve/restart`), **When** applied, **Then** it
    is **rejected as illegal** and the gate stays open (G3 / move integrity).
3. **Given** an open gate and a `human-decision` with `decidedBy: human@…`, **When** the move
   is legal, **Then** the lane emits a `gate-completion` (move ∈ the gate's vocabulary,
   `decidedBy` non-empty) and **advances to the next gate**; the resulting log **passes**
      `kiln/validate/log` (SC-003 dogfood).
4. **Given** the unattended tail (a human pre-delegated the *approve* side after Spec), **When**
   a clean path runs, **Then** each auto-crossed gate emits a **distinct `pre-delegation`
    record** (`auto-approved under pre-delegation`, reviewing model, "no objections") and an
     *architecture-critic objection / reviewer `restart` / verifier `reject` / checkpoint
    overflow still halts the cruise and returns to the human* — auto-proceed **never lifts a
    veto** (Principle I / the gate-rail's two-trim rule).

---

### User Story 3 — The factory-log writer: emit well-formed records; a closed terminal leaves a complete trail (Priority: P1)

001 *checks* the log; this story is the runtime that **writes** it. Every `transition`
    (load/hold/yield/swap), **gate-completion**, **human-decision**, **cost** number
    (resident / **switch count** / wall-clock), and **wait** must be emitted as a **JSONL line
    that conforms to `factory-log.schema.json`**, with `seq` **strictly increasing and
    gap-free** (R1–R2). A terminal that closes mid-feature leaves a **complete, reconstructable
    trail** (Principle VII).

**Why this priority**: The log is the system of record and the compliance evidence; a runtime
that cannot *faithfully write* into 001's schema would make every gate unverifiable. P1 — it is
what lets SC-003 (the emitted log must pass its own validator) be true.

**Independent Test**: **Run a lane**, capture its JSONL, and **replay it through 001's
`kiln/validate/log`**. A complete run **PASSES** (R1–R6). Then **truncate the stream** at an
arbitrary point → the validator still **PASSES the prefix** and, when the *expected* next
transition is forced out of order, names the gap/ordering violation (R2). No cloud call occurs
anywhere (P-VIII).

**Acceptance Scenarios**:

1. **Given** a full lane walk, **When** its emitted JSONL is validated, **Then** every line
   matches `factory-log.schema.json`; `seq` is **strictly increasing / gap-free**; `ts`
   non-decreasing — the run **PASSES** (R1–R2, P-VII).
2. **Given** the walk's log, **When** a `transition.kind = swap` is present, **Then** a
   matching **`cost.switches` +1** record brackets it, and the **switch count is greppable**
   from the log alone (P-IV captured as a record, not a memory).
3. **Given** a terminal that closes early, **When** the partial log is replayed, **Then** the
   **prefix validates** and the journey is **reconstructable to the exact gate/cost reached**;
    no shape is lost to the close (edge case "closed terminal").
4. **Given** a gate that cannot be decided with a human present, **When** written, **Then** it
   appears **only** as a `wait` record — **no record ever carries `status: approved` without a
   `decidedBy` human or a distinct `pre-delegation`** (R3, the no-silent-approval invariant,
    now enforced at write time, not only at read).

---

### User Story 4 — The model-affinity scheduler: hold the resident, swap only on a tier change (Priority: P1)

"The lane is the cost." The runtime's single most impactful lever (Principle IV) is to **hold
the resident model** and **change it only when the next unit's required tier differs** — a
**swap only on a tier change**. Work units queue in a **model-affinity queue**; the director
picks the next compatibility-respecting unit and pays a **switch tax** only at a genuine
boundary. The `Cost` record (001's field) is populated here.

**Why this priority**: Cost is *the* reason KILN looks like a kiln; a lane that swapped needlessly
would defeat the thesis. P1 — it is inseparable from "one resident at a time" (US1) and is the
cost number US3 logs.

**Independent Test**: Feed the scheduler a **unit tier sequence** with two phases — several
**same-tier** units then one **tier change** — and assert the emitted **`switches` count is
exactly the number of *tier boundaries*** (an affinity-compatible interior boundary swaps **0**;
each genuine tier change swaps **1**). A "no swap on an affinity-compatible boundary" probe
proves the counter is not inflated.

**Acceptance Scenarios**:

1. **Given** a sequence of units that are all the **same tier**, **When** the lane runs them,
   **Then** **`switches = 0`** after them (kept resident, no re-light).
2. **Given** a sequence with **one tier change** mid-run, **When** the lane runs it, **Then**
   **`switches = 1`** and the swap lands **on the boundary**, not early/late.
3. **Given** the four **line-of-defense** units (critic, verifier, reviewer, docs-synthesizer),
   **When** scheduled, **Then** each is bound to the **`strongest`** tier — a weaker binding is
    **rejected as a configuration error** at schedule time (P-II / 001's G2, now enforced by the
     scheduler, not just declared).
4. **Given** the full run's `Cost` record, **When** read, **Then** it carries
   `{ switches, wallClock }` and the affinity invariant ("no swap on an affinity-compatible
    boundary") holds — the cost of the walk is the **switch count**, not the gate count.

---

### User Story 5 — The Flow HUD + Flow Popup: the watch, event-driven over one FactoryState (Priority: P2)

So a human can *watch the kiln where the work happens*, the runtime draws **Layer A (Flow HUD**,
the persistent footer strip: `rail / lane / switches / clock`) and **Layer B (Flow Popup**, the
on-demand gate card). Both read **one shared `FactoryState`** and **redraw on a fired factory
event — never by polling, never from a server** (Principle IX). Their **headless twin** *prints*
the same content (the print is the twin of the surface; a missing surface **never silently
advances**). The roadmap overlay (**Layer C**) is **out of scope here** (NC1 → r2).

**Why this priority**: Valuable and principle-mandated, but it is a *view over* the spine
    (US1–US4), not the spine — the lane must run and log correctly **before** the watch has
   anything to draw. P2.

**Independent Test**: **Fire the factory events** on a lane and assert (a) the shared
`FactoryState` **mutates only on events**; (b) the HUD/Popup **recompute deterministically**
from that state (same state → same render); (c) **no timer and no server exist** — inspection
finds no polling loop, socket, or endpoint (P-IX); (d) with the UI **disabled**, the same
content is **printed** by the headless twin and **a gate still blocks** (the watch's absence
never advances a gate).

**Acceptance Scenarios**:

1. **Given** a lane mid-walk, **When** a factory event fires, **Then** `FactoryState` updates
   and **both surfaces recompute from it**; a captured identical state yields an
   **identical render** (a distilled read, one source of truth).
2. **Given** the runtime, **When** inspected, **Then** **no surface blocks on a timer or a
   socket** and there is **no server** — every redraw is event-triggered (P-IX).
3. **Given** the UI disabled (headless), **When** a gate opens, **Then** the surface's content is
   **printed** (the twin) and the **gate still blocks/WAITs** — a missing Layer **A/B** hides
    the watch, it does **not** silently approve (the headless contract, extended to the watch).

---

### User Story 6 — The RuntimeReady check: the runtime exists, emits a valid log, pulls no cloud (Priority: P3)

The handoff gate into later rows. A **static `node --test`** **RuntimeReady** check (the
**extension of 001's FiringReady**) asserts: the lane, gate, and log-writer **exist** and are
wired; a **synthetic stub-resident walk** runs and its **emitted log passes 001's
`kiln/validate/log`**; and the module graph **pulls no cloud** (P-VIII). It **advances no gate
and runs no *real* feature** — like FiringReady, it is a *probe*, not a walk.

**Why this priority**: P3 — it depends on US1–US5 being present; on its own it proves nothing,
but it is the falsifiable proof that "the kiln fires" for the first time.

**Independent Test**: Run RuntimeReady with the full runtime present → **PASS**; **remove or
break one** element (the writer, the gate-block, or a no-silent-approval path) → **FAIL, naming
the missing/broken element**. A zero-network grep over the runtime confirms P-VIII.

**Acceptance Scenarios**:

1. **Given** the lane + gate + log-writer present and wired, **When** RuntimeReady runs a
   **stub-resident** walk and validates its output, **Then** it **PASSES** and emits a
   traceability note mapping each runtime piece to its constitution principle(s) (the runtime
   analogue of FR-009).
2. **Given** the runtime with the **log-writer removed** (or a no-silent-approval hole
   introduced), **When** RuntimeReady runs, **Then** it **FAILS and names the broken element**
    (falsifiable, SC-005-style).
3. **Given** the runtime module set, **When** inspected for outbound dependency, **Then** it
   makes **no cloud round-trip** and a missing outside resource (web) is **flagged, not
    blocking** (P-VIII) — the row is local-first by construction.

---

### Edge Cases

- **Closed terminal mid-feature.** Because US3 writes a gap-free, reconstructable log, a
   partial walk is reconstructable to the exact gate/cost it reached; a closed terminal
   **reopens at the last `wait`/`gate`**, it does not lose state or silently complete.
- **A headless gate must never resolve itself.** With no UI, a gate prints its card and
   emits a `wait` (token+deadline); the **only** continuation is a human token-resume or a
    *recorded* pre-delegation — never a silent `approved` (Principle V).
- **An illegal move at a gate.** A human event whose `move ∉ MoveVocabulary(gate)` is
   rejected and the gate **stays open** (e.g. `revise` is illegal at `6-review`).
- **A line-of-defense veto inside the unattended tail.** Any critic objection / reviewer
   `restart` / verifier `reject` / checkpoint overflow **halts the cruise** and returns the
    lane to a human — auto-proceed authorizes the *approve side* only.
- **A weaker model at a defense slot.** The scheduler **rejects** binding a line-of-defense
   role below `strongest` at schedule time (P-II), on every substrate including local.
- **A tier boundary vs an affine boundary.** The switch counter increments **only** at a real
   tier change; a same-tier interior boundary is provably **no-swap** (P-IV).
- **Missing watch (Layers A/B disabled).** The content is **printed by the headless twin**;
   the gate **still blocks** — a missing surface hides the view, never the decision.
- **Cloud reference.** No runtime path may require a cloud round-trip; a missing outside
   resource (web research feeding Concept) is **flagged unavailable, not blocking** (P-VIII).
- **A `split+revise` at a checkpoint.** The checkpoint gate carries **`split+revise (+ append)`
   and no `reject`**; a split grows the feature into two and re-plans around both (001's G5;
    the reconciled Gate-5 move set), which US3 must log as a `transition`/`cost`, never a
   `reject`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The runtime MUST realize a **single execution lane** holding **exactly one
  resident model and one running unit at any instant**, with the **director as the scheduler**
   that **holds, yields, and reclaims** the lane (Principle III).
- **FR-002**: The runtime MUST realize a **gate primitive** that **blocks the lane** until a
  human move arrives; the move MUST be a member of **that gate's `MoveVocabulary`** (001's
   `gate-rail.md`, G3); the four specialized gates MUST honor their sets (**checkpoint** =
    `split+revise (+ approve`, **no `reject`**; **review** = `approve/restart`, no `revise`;
   **verification** = `approve/reject` with **≤ 2 auto-mitigation rounds** then a human
    `wait`; **standard** = `approve/revise/reject`).
- **FR-003**: With **no UI**, a gate MUST **print its card and emit a durable `wait`**
   (`gate`, `token`, `deadline`) and **MUST NOT emit a `gate-completion`** — a headless gate
    is **recorded, never resolved** (Principle V). The only continuations are a **human token-
    resume** or a **distinct `pre-delegation`** record.
- **FR-004**: The runtime MUST **write every `transition / gate-completion / human-decision /
  cost / wait`** as a **JSONL line conforming to `factory-log.schema.json`** with `seq`
    **strictly increasing / gap-free** and `ts` non-decreasing — i.e. the emitted log MUST
    **pass 001's `kiln/validate/log`**.
- **FR-005**: The no-silent-approval invariant MUST be enforced **at write time**: no
   `gate-completion` MAY carry `move = approve/restart`/merge **without** a non-empty
   `decidedBy: human` **or** a **distinct `pre-delegation`** record; a `wait` record MUST be
    the only unresolved shape (001's R3/R4, now producer-enforced).
- **FR-006**: The runtime MUST realize a **model-affinity scheduler** that holds the resident
   and **changes it only when the next unit's tier differs**; the emitted **`switches`**
    counter MUST equal the number of genuine tier boundaries (no swap on an affine boundary);
   the four **line-of-defense** roles MUST bind to **`strongest`**, with a weaker binding
    **rejected at schedule time** (Principle IV / Principle II).
- **FR-007**: The runtime MUST draw **Layer A (Flow HUD)** and **Layer B (Flow Popup)** over
   **one shared `FactoryState`**, redrawing **only on fired events — no polling, no server**;
   a **headless twin prints** the same content (Principle IX). **Layer C (roadmap overlay) is
   out of scope for this row** (deferred to r2).
- **FR-008**: The unattended tail MUST pre-authorize **only the approve side** of trailing
   gates **within one row**, emit a **distinct `pre-delegation`** record for each auto-crossed
   gate, and **halt on any line-of-defense veto** (critic / reviewer `restart` / verifier
   `reject` / checkpoint overflow), returning the lane to the human (Principle I / gate-rail
    two-trim rule).
- **FR-009**: The runtime MUST provide a **RuntimeReady** static check (the extension of 001's
  FiringReady) that asserts the lane + gate + writer are present and that a **stub-resident
   walk's emitted log passes 001's `kiln/validate/log`** — **advancing no gate and running no
   real feature** (the probe is not a walk).
- **FR-010**: Every runtime path MUST be **local-first / cloud-independent** (Principle VIII):
  no path may require a cloud round-trip, and a missing outside resource MUST be expressible as
   a **flagged, non-blocking** record.
- **FR-011**: Each runtime piece MUST carry a **constitution traceability note** (the runtime
   analogue of FR-009 in 001), so a downstream gate can verify compliance, and the emitted log
   MUST remain the **compliance evidence** a closed terminal leaves behind (Principle VII).
- **FR-012**: This row MUST **not itself auto-admit any program or advance Gate 0** — it is
   roadmap row r1, fired only because **Gate 0 (a human) admitted the program** it belongs to;
   that admission is recorded in the [program](../../ROADMAP.md) as `gate0.status: approved`
     (Principle VI) — the runtime is the one that never admitted it.

### Key Entities

- **The lane / `FactoryState`**: the single-resident state (`resident`, `running`, `queue`,
   `switches`, `wallClock`, `roadmap`, `current`, `gate0`, `gate`) 001 fixed the **shape** of;
   this row is the **mutated-by-events** store (US1/US5), no polling/server (Principle IX).
- **The gate primitive**: the event-block that holds the lane at a frontier head for a human
   decision (or a headless `wait`)  — the runtime of 001's gate-rail contract (US2).
- **The factory-log writer**: the emitter of R1–R6-conformant JSONL — the runtime counterpart of
   001's validator; the system of record (US3, Principle VII).
- **The model-affinity scheduler**: the director-as-scheduler's cost lever; the `Cost`
   record producer (US4, Principle IV); enforces the strongest-model binding (P-II).
- **The Flow HUD / Flow Popup + headless twin**: the two TUI layers over one `FactoryState`
   with a print fallback (US5, Principle IX).
- **The RuntimeReady check**: a falsifiable probe that the runtime exists and emits a valid,
   cloud-free log — the handoff gate for later rows (US6).
- **`RoadmapRow` / `Roadmap`**: r1 *is* one row; the [program](../../ROADMAP.md)
   frames the sequence — **admitted by Gate 0, not by this row**.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **100%** of driven walks hold **exactly one resident model and one running unit
   at any instant** (asserted over `FactoryState` captures) — Principle III is provable at
   runtime, not only in the doc.
- **SC-002**: **0** emitted logs contain a `gate-completion` with `move = approve/restart`/
   merge that lacks a `decidedBy: human` **or** a distinct `pre-delegation` record — the no-
   silent-approval invariant holds **at write time** (001's R3/R4, now producer-enforced).
- **SC-003**: **100%** of complete synthetic walks, when their emitted JSONL is **replayed
   through 001's `kiln/validate/log`**, **PASS** (R1–R2: gap-free/well-formed); the same
    stream, truncated, **PASSES the prefix** and is reconstructable to its last gate/cost.
- **SC-004**: The scheduler emits **`switches = 0`** for an all-same-tier phase and **`switches
   = 1`** for a single genuine tier boundary; **0** weaker bindings on a line-of-defense slot
    are accepted at schedule time (P-IV / P-II).
- **SC-005**: **100%** of "every redraw is event-triggered" holds — **0** runtime surfaces block
   on a timer or a socket and **0** servers exist; a disabled UI **prints** and still **blocks**
   (Principle IX).
- **SC-006**: The **RuntimeReady** check is **falsifiable** — it PASSES only when the lane +
   gate + writer are present and a stub walk's log validates, and **FAILS naming the broken
    element** when exactly one is removed; a zero-network grep confirms **0** cloud round-
    trips (P-VIII).
- **SC-007**: **0** cloud dependencies and **0** auto-advances of Gate 0 occur in this row —
   it is local-first and does not admit its own program (Principle VI: r1 is admitted by a
    human Gate 0, recorded in `specs/ROADMAP.md` as `gate0.status: approved`).

## Assumptions

- **Substrate.** KILN is a single-lane, gate-railed, **locally-served** (Ollama-style) factory
   on the **pi** coding-agent harness, with no cloud dependency (Principles III, VIII). This row
    builds the **runtime** that 001's contracts were written for.
- **NC1 (UI scope) — lean default.** r1 ships **Layers A/B (the watch)**; **Layer C (the roadmap
   overlay)** is a **sibling row (r2)**, since it draws the *program* r1 belongs to.
- **NC2 (resident-model substrate) — lean default.** Each story's **Independent Test** is
   **structural/headless**, driven by a **deterministic stub resident** (no live Ollama call); a
    **live-model smoke walk** is its **own later row (r3)**. This keeps r1 independently
   testable and local-first.
- **NC3 (human-event channel) — lean default.** **One channel**; its **headless form prints the
   gate card + emits a durable `wait` (token+deadline) and resumes by token** — the headless
    contract of Principle V, extended to the watch.
- **NC4 (row granularity) — lean default.** r1 = **the spine (US1–US4)** with **US5 (UI) as P2
   within r1**; **Layer C → r2**. Keeps r1 "one row, one full lane" (the KILN default).
- **Dogfood the 001 contract.** The row is judged **by** 001: the lane's emitted log must
   **pass 001's `kiln/validate/log`**, and the emitted records must satisfy R1–R6 / G3 as written
    in 001. 001 stays canonical; this row does not re-declare the shapes.
- **Guidance vs. law.** The runtime concept docs (`docs/concepts/`) are guidance; the
    **constitution governs** where they disagree. The **Gate-5 reconciliation** (checkpoint =
   `split+revise (+ append)`, no `reject`, resolved on the docs track in 001) is the move set
    the checkpoint gate realizes.
- **Local models** are the operator's concern; per Principle VIII a missing outside resource (web)
   is **flagged, not blocking**, and must be expressible as a non-blocking record.
- **Dates.** Constitution ratification and this spec date are 2026-09-12 (repo install
   manifest / system clock), continuing 001's lineage.

## Out of Scope

- **Layer C (the roadmap overlay / deliverable-level view)** — a **sibling row (r2)**; it draws
   the *program* this row belongs to, after the spine exists (NC1).
- A **live-model smoke walk** (driving a real Ollama head, a full Gates 1–9 feature end-to-end)
   — its **own later row (r3)**; r1 proves the runtime with a **stub resident** (NC2).
- The **content** of the *actual* fired program's later rows (r2, r3, …) — Gate 0 authors and
   admits them; r1 is the *first* row, not the *whole* program.
- Any **cloud backend** or **web dashboard** (KILN has none; P-VIII).
- **Advancing Gate 0 or auto-admitting the program** — a human move (Principle VI); the
   [program](../../ROADMAP.md) is now
     **admitted** (`gate0.status: approved`; the [draft](./contracts/draft-roadmap.md) it
    superseded is frozen at `pending`).
- The **UI implementation spikes** for Layer C (overlay lifetime, keymap `M`, confirm-vs-select)
   — r2's territory; r1 only ships A/B over one `FactoryState` with a print twin.

## Traceability to the Constitution

- **Principle I (author / judge sep.)** → FR-002/FR-008/FR-012 (the lane runs workers;
   **gates are judged by a human / the four line-of-defense roles**, never by the lane itself;
    a veto always halts) — US2/US4.
- **Principle II (strongest defense)** → FR-002/FR-006 (the four line-of-defense roles bind
   **`strongest, always`, including local**; a weaker binding is **rejected at schedule time**)
   — SC-004, US4.
- **Principle III (one lane / director-scheduler)** → FR-001 (one resident / one running at any
   instant; director holds/yields/reclaims) — SC-001, US1.
- **Principle IV (affinity swap-only-on-tier)** → FR-006 (swap only on a tier change; `switches`
   = genuine boundaries; cost record emitted) — SC-004, US4.
- **Principle V (headless never silently approves)** → FR-003/FR-005 (a headless gate prints +
   `wait`; no-write of a silent `approved`; no-silent-approval enforced **at write time**) —
   SC-002, US2/US3.
- **Principle VI (Gate 0 human-only, always)** → FR-012/SC-007 (r1 **does not admit its own
   program**; the [program](../../ROADMAP.md) now reads `gate0.status: approved` — the row is
   admitted by a human, not by itself).
- **Principle VII (everything in the log)** → FR-004/FR-011/SC-003 (the lane **writes** R1–R6
   records whose log is itself the compliance evidence; a closed terminal leaves a complete
    trail) — US3/US5.
- **Principle VIII (local-first)** → FR-010/SC-006/SC-007 (no cloud round-trip; a missing
   outside resource is flagged, not blocking; the row is proven with a stub resident) — US6.
- **Principle IX (three layers, event-driven, no server)** → FR-007/SC-005 (Layers A/B redraw
   only on events; the headless twin **prints**; no timer/socket/server) — US5.
- **Governance / FR-009-analogue** → FR-011 (each runtime piece carries a constitution
   traceability note; the emitted log is the audit trail a gate verifies compliance from).
