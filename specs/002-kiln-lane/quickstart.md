# Quickstart — 002-kiln-lane (r1) validation guide

**What this is.** A run guide that **proves the lane runtime fires** — the single lane,
the gate primitive, the factory-log writer, the affinity scheduler, the HUD/Popup watch,
and RuntimeReady — **without a live model**, by driving a **deterministic stub
resident** and **replaying the emitted log through 001's `kiln/validate/log.ts`** (the
dogfood). Each "Expect" maps to a success criterion.

**What this is NOT.** No live Ollama, no cloud, no real Gates 1–9 feature walk
(NC2 → that is **r3**), **and r1 admits no program / advances no Gate 0** (P-VI/FR-012).
The guide *runs a runtime* (unlike 001's purely-static guide), but on a *stub*, so it
stays local-first.

---

## Prerequisites

- **001 delivered and on branch** (the dogfood target): `kiln/schemas/`,
   `kiln/validate/log.ts` (+ `roadmap.ts`, `firing-ready.ts`),
   `kiln/contracts/move-vocabulary.ts`, `kiln/src/roles.ts`, `kiln/src/types.ts`.
- Node `>= 22.6` (`kiln/package.json` engines) · `node --test`.
- r1's runtime modules, built at `/speckit.implement` per
   [runtime-api.md](./contracts/runtime-api.md): `kiln/src/{lane,gate,log-writer,
     scheduler,stub-resident}.ts` + `kiln/ui/*.ts` + `kiln/validate/runtime-ready.ts`.
- The admitted program: [specs/ROADMAP.md](../../ROADMAP.md) (`gate0.status: approved`;
    **r1 is the first row** — this guide drives r1's *own* walk, a stub one).

## Setup

1. Confirm the runtime is **wired** (the 001 stub is replaced):

   ```
   ls kiln/src/lane.ts kiln/src/gate.ts kiln/src/log-writer.ts kiln/src/scheduler.ts kiln/src/stub-resident.ts
   ```
   **Expect:** all present; `kiln/index.ts` `laneIsWired() === true`.

2. Confirm the dogfood target still validates (the contract r1 is judged *by*):

   ```
   kiln/validate/roadmap specs/ROADMAP.md
   ```
   **Expect:** PASS — `gate0.status: approved` carries the full human-decided record
   (M3 / SC-007); r1's admission is a *human* move, not the runtime's.

---

## Scenario 1 — The single lane: one resident / one running, any instant (SC-001, US1)

- Drive a **tiny 2-unit lane** with `makeStubResident()`.
- Run:

   ```
   kiln/tests/lane            # node --test; snapshots FactoryState at each step
   ```
- **Expect:** PASS. At every snapshot **at most one resident and one running unit**;
   each `yield` is followed by a matching `resume` before the next unit begins; no
    parallel/duplicate lane exists. `switches = 0` for this same-tier 2-unit walk.

## Scenario 2 — The gate primitive: headless `wait`, illegal-move reject, resume (SC-002/US2 SC-1..4)

- (a) **Headless**: `openGate` gate 3 with no decision → capture output.
- (b) **Illegal move**: `applyMove(gate-6, "revise", "human@…")` (review's set is
    `approve/restart`).
- (c) **Resume**: feed a `human-decision` for the `wait`'s token at a legal gate.
- Run:

   ```
   kiln/tests/gate         # node --test
   ```
- **Expect:** (a) the lane emits **exactly one `wait`** and **no `gate-completion`**
   (no path yields `approved`) — a headless gate is recorded, not resolved.
(b) the illegal `move` is **rejected** and the gate **stays open**. (c) the legal move
emits a `gate-completion` (`move` ∈ the gate's set, `decidedBy` non-empty) and **the
emitted log PASSES `kiln/validate/log.ts`** (the SC-003 dogfood). (Unattended-tail
variant: each auto-crossed gate emits a **distinct `pre-delegation`**; a reviewer
`restart` / verifier `reject` / checkpoint overflow **halts the cruise**.)

## Scenario 3 — The log-writer: a complete walk's log PASSES; a prefix reconstructs (SC-003, US3)

- Run a **full stub walk** of r1's units; collect its emitted JSONL; **replay through 001's validator**:

   ```
   kiln/validate/log kiln/factory-log/<walk>.jsonl
   ```
- **Expect:** PASS. Every line matches `factory-log.schema.json`; `seq` strictly
  increasing / gap-free; `ts` non-decreasing. **Then truncate** the stream at an
   arbitrary point and re-validate → **the prefix still PASSES**, reconstructable to the
   exact last emitted gate/cost (the "closed terminal" case). **Then force** the next
   transition out of order → the validator **names** the gap/ordering violation
   (`missing seq N` / `ts non-decreasing`). A `transition.kind=swap` is **bracketed**
   by a `cost.switches` increment — the switch count is greppable from the log alone.

## Scenario 4 — The affinity scheduler: swap only on a tier change; LoD = strongest (SC-004, US4)

- Feed a unit sequence: several **same-tier** units, then **one** tier change; then the
   **four line-of-defense** units; then a **weaker binding** on a LoD slot.
- Run:

   ```
   kiln/tests/scheduler     # node --test
   ```
- **Expect:** the same-tier phase yields **`switches = 0`**; the single tier boundary
   yields **`switches = 1`** (on the boundary, not early/late); a "no swap on an
   affinity-compatible boundary" probe confirms the counter is **not inflated**; the four
   LoD units bind **`strongest`**, and a **weaker binding is rejected at schedule time**
   (reusing `kiln/src/roles.ts`).

## Scenario 5 — The watch: event-only redraw, no timer/server, headless twin blocks (SC-005, US5)

- Fire factory events on a lane; assert the shared `FactoryState` **mutates only on
   events** and both `renderHud`/`renderPopup` **recompute** from it.
- Run:

   ```
   kiln/tests/ui            # node --test; also a grep for timer/socket/server
   ```
- **Expect:** a captured identical state yields an **identical render** (one source of
  truth); an inspection finds **no `setInterval`/`setTimeout`, no socket, no server**
   (P-IX). With the UI **disabled** (headless), the same content is **printed by the
   twin** and the gate **still blocks** — a missing surface hides the view, never the
   decision.

## Scenario 6 — RuntimeReady: a real runtime emits a valid, cloud-free log (SC-006, US6)

- Run the **falsifiable probe** (extension of 001's FiringReady):

   ```
   kiln/validate/runtime-ready          # or kiln/tests/runtime-ready  (node --test)
   # then the negative: remove/break ONE element (writer / a no-silent-approval hole / wiring)
   kiln/validate/runtime-ready   # again
   ```
- **Expect:** PASS when lane + gate + writer are present and a **stub walk's emitted log
   PASSES** `kiln/validate/log.ts`. **FAIL, naming the broken element** when exactly one
   is removed. A **zero-network grep** over the runtime set confirms **0** cloud round-
   trips (P-VIII).

## Scenario 7 — r1 admits no program, advances no Gate 0 (SC-007 / P-VI, FR-012)

- Run any r1 walk to its `gate0` surface (headless) and inspect the emitted log:

   ```
   kiln/tests/runtime-ready        # the r1 walk
   grep -n '"gate0"' kiln/factory-log/<walk>.jsonl    # only reads/observes; no decision emitted
   ```
- **Expect:** r1 **emits no `gate0` decision** and **advances no program** — the
   admission is the **human record** in `specs/ROADMAP.md` (`gate0.status: approved`;
   `decided_by: human@batorfi`), and a headless r1 *prints the roadmap table and
   WAITs* on `gate0`, it does not auto-approve it (P-V, P-VI).

---

## Done when

Every scenario reproduces its "Expect," and — the spine of r1 — a stub walk's emitted
log **PASSES 001's `kiln/validate/log.ts`** while a broken no-silent-approval path makes
it **FAIL with a named reason**. Because r1 runs a *stub* (NC2) and **admits/advances
nothing at Gate 0** (P-VI), the guide proves *the kiln fires* on a stand-in resident,
local-first, judged by the contract 001 built — ready for **r2** (Layer C UI) and
**r3** (the first *live*-model smoke walk).
