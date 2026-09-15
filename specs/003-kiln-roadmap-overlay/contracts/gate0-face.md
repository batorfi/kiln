# The Gate-0 Face — 003-kiln-roadmap-overlay (r2) · the one human-only, always gate

**Status**: design contract (Phase 1, D2/D3/NC2/NC3). How Layer C renders **Gate 0 — Roadmap**,
the *program* gate the constitution treats as the one that no exception may silence (P-VI). The
face is **distinct** from Layer B's per-gate card (NC2), and a Gate-0 decision is **recorded
additively** — **no new log record type** (NC3). **Trace**: P-I, P-V, P-VI, P-VII.

---

## The face (a distinct Layer-C face, `ui-layers-deep.md §5.2`)

Gate 0 renders on a **distinct face** — **never** Layer B's per-gate card chrome — with the
**roadmap-level move set**. The two faces are **disjoint** by construction (`gate0 ≠ gate`, G1):

| face | level | move vocabulary (canonical, imported) | payload |
|------|-------|---------------------------------------|---------|
| **Gate 0 face** (this) | program / inter-row | **`moveVocabulary("gate0")`** = `["approve","revise","reject","edit-rows","add-row","drop-row"]` | the **program**: the §5.2 `id / short / deps`/`size` table + the `gate0` head |
| Layer B gate card (r1) | per-lane Gates 1–9 | `moveVocabulary(1..9)` (standard / checkpoint / review / verify) | a row's gate artifact + its moves |

The **human-facing admission moves** are `approve` / `revise (w/ director)` / `reject`;
**`edit-rows / add-row / drop-row`** are the **program-edit** moves the admitted program
(`specs/ROADMAP.md`) advertises for Gate 0. A **per-gate 1–9 move is never accepted at Gate 0**, and
a **`gate0` move is never accepted at a per-gate card** — the two vocabularies are **disjoint**
(SC-002 / FR-006).

---

## The two faces of Gate 0

### 8.1 Pre-lane / inter-row face (`gate0.status: pending` or at a `roadmap_row_done` seam)

The overlay shows the **proposed** program (*drafted with the human by the director, not yet
admitted* before r1; the **next** row's program at an inter-row seam) with the move set. The
human decides — the agent **never auto-fills or auto-approves** (P-I/P-VI).

| id | short | deps | size (est) |
|----|-------|------|-----------|
| r1 | *the completed/next rows* | … | — |
| **r2** | **Flow UI — Layer C (roadmap overlay)** | **r1** | **M** |
| r3 | first live-model smoke walk | r1 | L |
| … | … | … | … |

**Moves:** `[approve roadmap]` lock the order + rows, start the next lane · `[revise w/
director]` reorder / split / coarsen · `[reject]` restart the breakdown (plus the program-edit
moves). A **veto** (a `revise`/`reject`) **holds the program open**; a `merged`/`done` row is
**never re-entered** (FR-009).

### 8.2 The headless face (P-V/P-VI, `!ctx.hasUI`)

With **no UI**, Gate 0 **prints the program table and emits a `wait`** (token + deadline) —
**never a `gate0: approved`**. This is the one no-exception gate: *even headless, Gate 0 prints-
and-waits rather than auto-advancing* (P-V: "an exact opposite of a missing-UI silent approval";
P-VI: "the one gate no exception may silence"). A broken path that **would** auto-approve a missing
Gate 0 is the **SC-002→SC-003 negative test vector** — it makes the emitted log **FAIL
`kiln/validate/log.ts`** with a named R3 reason.

---

## Recording a Gate-0 decision — *additively* (NC3 / D3)

A Gate-0 decision lands **two ways, no new record type**:

1. **The log** — a **`gate-completion`** with **`gate: "gate0"`**:
   ```json
   { "recordType": "gate-completion", "gate-completion": {
       "gate": "gate0", "move": "approve", "decidedBy": "human@batorfi",
       "cost": { "switches": 0, "wallClock": "12:47" } } }
   ```
   r1's validator (`kiln/validate/log.ts` → `checkDecisions`) **already** treats `gate === "gate0"`
   as `validGate` and G3-checks the move against `moveVocabulary("gate0")`; the R3 guard already
   requires a human `decidedBy` for an approving move. **No new `recordType` is added** — 001's
   `FactoryRecord` union is unchanged (D3/D8), so the emitted log **PASSES 001's validator
   unchanged** (SC-003).
2. **The authoritative state** — `specs/ROADMAP.md`'s head `gate0` block:
   `{ "status": "approved", "rows": "r1..r6", "decided_by": "human@batorfi", "at": "…", "note": "…" }`,
   validated by **`kiln/validate/roadmap.ts`** (M3: an `approved` head carries
   `rows / decided_by / at`; M1: `deps` resolve; no cycle).

**`roadmap_row_done`** is an **event** (D4), not a third record — its *effect* (a re-entered Gate 0
= a fresh `gate0_open` + `wait`) is what lands in the log; a row close is the *previous* row's
`gate-completion` (gate 9 → PR) plus the gate-0 re-entry.

---

## Invariants

- **Disjoint vocabularies.** `moveVocabulary("gate0")` and `moveVocabulary(1..9)` are never
   conflated — a cross-application is **rejected** (G1 / SC-002).
- **Human-only, always — no exception.** No path emits a `gate-completion` at `gate:"gate0"`
   **except on a `decidedBy: human@…`:** for Gate 0 the **R3 `pre-delegation` escape does not apply**
   (P-VI: Gate 0 is "*the one gate no exception may silence*") — a **pre-delegated** gate-0 approval
   (a **distinct `pre-delegation` record with no human decider**) is **rejected**, unlike a per-gate
   Gates 1–9 approval which P-V/P-VII *permit* via a logged `pre-delegation`. Even headless, Gate 0
   **prints-and-`WAIT`s** (P-V/P-VI).
- **No self-admission.** r2's overlay **renders / records** a Gate-0 decision a *human* made; it
   **never admits its own program** — the admission is `specs/ROADMAP.md` (P-VI / FR-014 / SC-007).
