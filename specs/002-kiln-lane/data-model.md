# Data Model: 002-kiln-lane (r1 — the lane runtime)

**Feature**: [spec.md](./spec.md) · **Research**: [research.md](./research.md) ·
**Plan**: [plan.md](./plan.md)

Phase 1: the **stateful runtime entities** r1 adds — the *realization* of the
*declarations* 001 fixed. 001 gave the **shapes** (the JSON Schemas, the
`FactoryState` type, `move-vocabulary.ts`, `roles.ts`); r1 gives the **store, the
blocker, the emitter, the cost machine, the watch, and the probe** that run over
those shapes. Each entity below is a *runtime* counterpart to an entity 001 declared;
the field *shapes* are unchanged and imported from `kiln/src/types.ts` +
`kiln/contracts/move-vocabulary.ts` + `kiln/src/roles.ts` (r1 **imports, not
re-declares** — the "001 is canonical" invariant).

---

## Entity 1 — The lane / `FactoryState` (single-resident store, E1 / US1)

The **in-memory single-resident state** 001 fixed the *shape* of
(001 data-model Entity 4); r1 realizes it as the **mutated-by-events store** the lane
holds and the two surfaces draw from (research D1/D7).

| field | type (001 shape) | runtime meaning in r1 |
|-------|------------------|-----------------------|
| `resident` | `{ model, tier } \| null` | the head in the lane; **held** by the director, swapped only on a tier change (E4) |
| `running` | `{ duId, role } \| null` | exactly **one** live work unit at a time |
| `queue` | array | the **model-affinity queue** the scheduler drains |
| `switches` | int ≥ 0 | the switch-tax counter (E4): 0 per affinity-compatible boundary, 1 per genuine tier change |
| `wallClock` | string `"HH:MM"` | the lane clock; emitted with each `cost` |
| `roadmap` | `RoadmapRow[]` | the program (`specs/ROADMAP.md`); r1 reads it, **never advances `gate0`** |
| `current` | string | the in-flight row id (r1 is *one row*; the walk is over *this* row's units, a stub) |
| `gate0` | `{ status }` | the program gate; r1 observes it (`approved` via the admission record) but **emits no `gate0` decision** |
| `gate` | `{ id } \| null` | the row's open Gates 1–9 gate (G1: distinct from `gate0`) |

**State transitions (D1):** `load`(resident) → `hold` → `yield`(unit) →
`resume` → … → `swap`(resident, on a tier change, bracketed by `cost`).

**Invariant `F-SINGLE` (= SC-001 / P-III):** at **any captured instant** `resident`
and `running` encode a **single lane** — **at most one resident and one running
work unit**; no parallel/duplicate lane. Asserted over **snapshots** in a walk,
not only at the end. **Rule `F1`** (P-IX, from 001): the state is mutated **only by
events** — no surface polls or runs a server.

---

## Entity 2 — The gate primitive (E2 / US2 / FR-002, FR-003)

The runtime of 001's **gate-rail contract** (`kiln/contracts/gate-rail.md`, G1–G5)
— a gate that **holds the lane** at a frontier head until a **human move** arrives,
or (headless) **prints + emits a durable `wait`** and halts.

| field | type | meaning / rule |
|-------|------|----------------|
| `id` | `gate0 \| 1..9` | G1: a row's live gate; **distinct** from the program gate. r1 **never emits a `gate0` completion** (P-VI/FR-012) |
| `open` | bool | a gate is one of: `open` (awaits a move) or `resolved` |
| `move?` | string ∈ `MoveVocabulary(id)` | G3: a move must be a member of the *gate's own* set (imported from `move-vocabulary.ts`) |
| `decidedBy?` | `human@…` | required on a `gate-completion` with `approve`/`restart`/merge, else a distinct `preDelegation` (R3) |
| `preDelegation?` | `{ of, by, at, reviewer?, note:"no objections" }` | the *distinct* auto-approve ledger entry (R4) |
| `wait?` | `{ gate, token, deadline }` | the **only** unresolved shape R3 permits; carries a resume **token** + **deadline** |

**Per-gate move sets (G3, imported — not re-declared):** *standard* 1/2/3/4/8 =
`approve`/`revise`/`reject`; **5-checkpoint** = `split+revise` (+ `approve`), **no
`reject`** (the one "grow" move, G5); **6-review** = `approve`/`restart`, **no
`revise`** (judge never authors); **7-verification** = `approve`/`reject` with
`reject` → auto-mitigate **≤ 2 rounds** (`MITIGATION_CAP`, G4) then a human `wait`;
**9-pr** = `approve`/`reject` (`approve` **is** the merge).

**Transitions (D2):** `open` + human move (legal) → `resolved` → emit
`gate-completion` (`move` ∈ set, `decidedBy: human` non-empty) and **advance**;
`open` + headless → print card + emit **`wait`** and **halt** (no
`gate-completion`); `open` + illegal `move ∉ MoveVocabulary(id)` → **rejected**, gate
**stays open** (US2 SC-3). Resumption is by **token** (the `wait`'s token names the
resume — the **single channel**, NC3).

---

## Entity 3 — The factory-log writer (E3 / US3 / FR-004, FR-005; SC-002, SC-003)

The **emitter** of the JSON L 001's `kiln/validate/log.ts` *checks* — r1's
counterpart is the *writer* 001's validator is the *checker*. It is the **single
choke point** that enforces no-silent-approval **at write time** (D3).

| concern | rule (001) | writer realization |
|---------|-----------|--------------------|
| well-formed | `R1` | each non-blank line is a JSON object conforming to `kiln/schemas/factory-log.schema.json` (imported, unmodified) |
| ordering | `R2` | `seq` **strictly increasing / gap-free**; `ts` **non-decreasing** (a monotonic counter + clock, not a guess) |
| no-silent-approval | `R3`/`R4` | a `gate-completion` with `move ∈ {approve, restart, merge}` is **written only if** `decidedBy: human@…` non-empty **or** a distinct `pre-delegation` — else the writer **throws**; unresolved gates appear **only** as a `wait` |
| pre-delegation distinct | `R4` | a `pre-delegation` is a **separate ledger entry** from a `human-decision` (the log tells *which* a gate ran through) |
| local-first | `R5` | **no record carries a cloud/remote field**; a missing outside resource emits a **flagged, non-blocking** record |
| traceability | `R6`/FR-009 | each emitted record (and the module that emits it) carries a **constitution traceability note** |

**State / guarantee (`F-RECON`, SC-003 / P-VII):** a **complete** walk → the stream
**PASSES** 001's validator; a **truncated** prefix → still **PASSES** to its last
emitted `seq` (the "closed terminal" is reconstructable to the exact gate/cost it
reached). A broken writer test vector (a silent `approve`) makes the emitted log
**FAIL** 001's validator with a **named reason** (the SC-002 → SC-003 negative).

---

## Entity 4 — The model-affinity scheduler + `Cost` (E4 / US4 / FR-006; SC-004, P-IV/P-II)

The **directora-scheduler**'s cost lever and the **`Cost` record producer**. Holds
the **resident** and changes it **only when the next unit's required tier differs**.

| field / behavior | rule | realization |
|------------------|------|-------------|
| `switches` counter | P-IV | starts 0; **increments only on a genuine tier boundary**; an **affinity-compatible interior boundary = 0**; a real change = **1** (SC-004) |
| `cost` emission | 001 `cost` schema | on each swap, emit `transition{ kind:"swap" }` **and a `cost` `{ switches, wallClock }`** that **brackets** it — greppable from the log alone |
| role binding | P-II / G2 / L1 | **reuses `kiln/src/roles.ts` `bindRole`**: the **four line-of-defense roles bind `strongest`, always** (incl. local); a **weaker binding on a LoD slot is rejected at schedule time** as a config error (001 `weakerBindingRejected`) |
| queue | P-IV | the **model-affinity queue** keeps *firing like units together* so the switch-tax is the **minimum the plan's tier sequence requires** |

**Cost realized:** `{ switches, wallClock }` — the switch count is *the* cost of a
walk, **not** the gate count. **Guarantee `F-AFFINITY`:** `switches` for an all-same-
tier phase = **0**; for one genuine tier boundary = **1**.

---

## Entity 5 — The Flow HUD / Flow Popup + headless twin (E5 / US5 / FR-007; SC-005, P-IX)

The **event-driven watch** over **one `FactoryState`**, with a **print fallback**.
**Layer C — the roadmap overlay — is out of scope (NC1 → r2).**

| surface | level | draws from | behavior (rule) |
|---------|-------|-----------|-----------------|
| **A — Flow HUD** | per-feature lane, in the footer | `FactoryState` | the strip `rail / lane / switches / clock`; **recomputes on a fired event only** |
| **B — Flow Popup** | per-feature lane, on-demand | `FactoryState` | the gate card; **auto-drawn at a gate; no timer/socket** |
| headless twin | (a missing A/B) | same `FactoryState` | **`print`s the exact same render**; a missing surface **hides the view, never the decision** (gate **still blocks**) |

**Guarantee `F-EVENTONLY` (F1, P-IX):** `FactoryState` mutates **only on fired
events**; a captured `state` yields an **identical render** on re-invocation
(deterministic read; one source of truth); an inspection finds **no `setInterval` /
`setTimeout`, no socket, no server** (SC-005).

---

## Entity 6 — The stub resident (E6 / NC2 — the deterministic test double)

The **resident-model *interface*** a test drives the lane with — **no live Ollama, no
network** (research D4). It is **deterministic** (fixed output per input) and is
**never the decider of a gate** (P-I/VI: a human is). It emits the
`transition`/`cost` events the scheduler and writer expect; it stands in for a real
local model so the walk is **reproducible** and **replayable** through
`kiln/validate/log.ts`. A **genuine live-model smoke walk is r3**, not r1.

---

## Entity 7 — The RuntimeReady probe (E7 / US6 / FR-009; SC-006)

A **static `node --test` probe** — the **falsifiable extension of 001's FiringReady**:

| assert | names |
|--------|-------|
| (a) the **lane + gate + writer exist and are wired** (`kiln/index.ts` no longer `not-wired`) | the missing/stubbed element |
| (b) a **synthetic stub-resident walk** runs and its **emitted log PASSES `kiln/validate/log.ts`** | the broken dogfood |
| (c) the runtime module graph **pulls no cloud** (zero-network grep) | the offending import |

**Guarantee `F-RUNTIMEREADY`:** **PASS** only when all three hold; **FAIL, naming
the broken element**, when exactly one is removed/broken. It **advances no gate and
runs no *real* feature** (a *probe*, not a *walk*; like FiringReady).

---

## Cross-entity invariants r1 makes true (success-criteria proof map)

| SC | proven by |
|----|-----------|
| SC-001 (one resident / one running, any instant) | E1 `F-SINGLE`, asserted over snapshots (D1) |
| SC-002 (0 silent approvals in any emitted log) | E3 `R3`/`R4` enforced **at write time** (D3) |
| SC-003 (100% of complete walks PASS 001's validator; prefix reconstructable) | E3 `F-RECON` via D5 dogfood |
| SC-004 (`switches`=0 same-tier, =1 per boundary; 0 weaker LoD bindings) | E4 `F-AFFINITY` + reused `roles.ts` |
| SC-005 (every redraw event-triggered; 0 timer/socket/server; disabled UI prints + blocks) | E5 `F-EVENTONLY` |
| SC-006 (RuntimeReady falsifiable; 0 cloud round-trips) | E7 `F-RUNTIMEREADY` + zero-network grep |
| SC-007 (0 cloud deps; 0 auto-advances of Gate 0; r1 doesn't self-admit) | E1 `roadmap`/`gate0` read-only + `specs/ROADMAP.md` holds the human admission |

**Constitution traceability (FR-009-analogue):** each of E1–E7 carries a **trace
note** naming its principle(s) (P-I…P-IX); the lane's emitted log is the **audit
trail** a downstream gate — and r2/r3's FiringReady-style checks — verify from.
