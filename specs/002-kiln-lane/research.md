# Research & Resolved Unknowns: 002-kiln-lane (r1 — the lane runtime)

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Date**: 2026-09-13
· **Program**: [specs/ROADMAP.md](../../ROADMAP.md) (admitted 2026-09-13, `gate0.status: approved`)

Phase 0 output. **There are no `NEEDS CLARIFICATION` items** — every spec-level
unknown was resolved upstream: 001's research (U1–U8: the canonical TS +
`node --test` + JSONL + zero-dependency substrate) and this spec's **Clarifications
NC1–NC4** (UI-layer scope, stub resident, one human-event channel, row
granularity). What a runtime row *must still pin* is the **implementation-level
realization** of the already-declared contracts — *how* the lane, gate, writer,
scheduler, and watch are built to *satisfy* 001, not *whether*. Those runtime
choices are D1–D8 below; each is a decision the Phase 1 modules and quickstart
scenarios depend on.

---

## Decisions extracted (what the runtime must pin)

| ID | Runtime-realization question | Type | Resolved in |
|----|------------------------------|------|-------------|
| D1 | How the lane + director-as-scheduler realize "one resident, one running, hold/yield/resume" over a stub | precedent/best-practice | §D1 |
| D2 | The gate primitive's shape: an event-block that yields the lane on a headless `wait`, resumed by token | design | §D2 |
| D3 | Where no-silent-approval is **enforced at write time** (the choke point) | design/constraint | §D3 |
| D4 | The stub-resident **interface** the tests drive (no live Ollama — NC2) | integration | §D4 |
| D5 | The exact **dogfood path**: how the emitted JSONL is replayed through 001's `kiln/validate/log.ts` | integration | §D5 |
| D6 | The **switch-tax counter** + `cost` emission (P-IV realized) | design | §D6 |
| D7 | The HUD/Popup **event-driven recompute** + headless print twin + the no-poll/no-server assertion (P-IX) | design/constraint | §D7 |
| D8 | **RuntimeReady** as a falsifiable extension of 001's FiringReady; **file placement under `kiln/`** | structure/best-practice | §D8 |

---

## D1 — The lane + the director-as-scheduler (Principle III)

**Decision:** the lane is a single module over an in-memory `FactoryState`
(reused from `kiln/src/types.ts`, entity E1). The **director *is* the scheduler**
(P-III: "the director holds the lane, *yields* it to a worker, and *reclaims* it").
A walk drives it with a sequence of work units; the director (a) **holds** the lane
on a resident, (b) **yields** the *running* slot to one unit, (c) **reclaims** it when
the unit returns, (d) runs the next **affinity-compatible** unit with **no swap**,
and only on a *tier change* does it **swap** the resident. The single-lane invariant
(SC-001/US1) is proved by an assertion run against **captured `FactoryState` snapshots**
at each step: `resident` and `running` are **never both populated by two live
things** — at most one resident and one running at any instant.

**Rationale:** P-III is "the thesis of the whole system" (spec US1 *why*). A lane that
could ever hold two residents or two concurrent runs is a "foundry," which the
constitution forbids. Asserting the invariant over *snapshots* (not only at the end)
is what makes SC-001 "*at any instant*" provable, not just a final-state check.

**Alternatives considered:**
- **Async producer/consumer queue with backpressure** — rejected: adds concurrency
  KILN explicitly has none of ("no pane-per-worker parallelism," P-III/P-IX); a
  linear director loop suffices and is the *cheaper* realization.
- **A separate scheduling abstraction (a 14th module)** — rejected: the constitution
    says "the director *is* the scheduler — there is no separate scheduling
    abstraction to collapse" (constitution, "Local substrate & cost"). Folding the
    scheduler *into* the lane (E4) honors that.

---

## D2 — The gate primitive (block; headless `wait`; G3)

**Decision:** the gate is a small primitive that **holds the lane** at a frontier
head and returns *nothing* until a **human move arrives as an event**. The move must
be a member of **`MoveVocabulary(gate)`** — imported from 001's
`kiln/contracts/move-vocabulary.ts` (G3): the four special gates honor their sets
(**checkpoint** = `split+revise` + `approve`, no `reject`; **review** =
`approve`/`restart`, no `revise`; **verification** = `approve`/`reject` with ≤ 2
mitigation *rounds* per `MITIGATION_CAP`, then a human `wait`; **standard** =
`approve`/`revise`/`reject`). When **no UI / no decision** is present, the gate
**prints its card** and emits **one `wait`** record (`{ gate, token, deadline }` —
*the only valid unresolved shape*, R3) and **halts**; it **never writes a
`gate-completion`**. Resumption is by **token** (a `human-decision`/resume event
named to that `wait`'s token → the gate emits a `gate-completion` with a non-empty
`decidedBy: human` and advances) — the **single event channel** (NC3): one channel,
two forms (a live decision or a headless print+wait+token-resume).

**Rationale:** NC3 pins "one channel"; P-V pins "a headless gate is *recorded, never
resolved*"; G3 pins the per-gate move integrity. Realizing all three in one
primitive is what keeps a headless run honest (SC-002).

**Alternatives considered:**
- **Two separate code paths (interactive vs headless)** — rejected (NC3 chose *one
  channel*); two paths risk one path bypassing the no-silent-approval guarantee.
- **Auto-approve when a "reasonable" outcome can be inferred** — rejected *out of hand*
  as P-V's exact anti-pattern; the headless form *must* print + `wait`.

---

## D3 — No-silent-approval enforced at **write time** (the choke point)

**Decision:** the **log-writer is the single choke point** that enforces no-silent-
approval. A `gate-completion` whose `move ∈ {approve, restart}` or is a
*merge* may **only** be written if it carries a **non-empty `decidedBy:
human@…`** *or* a **distinct `pre-delegation`** record for the same gate (R3/R4);
otherwise the writer **throws** and the line is **never emitted**. A `wait` record
is the only shape an unresolved gate may take. This makes SC-002 ("0 emitted logs
contain a `gate-completion` … that lacks a `decidedBy` *or* a distinct
`pre-delegation`") a **producer-enforced** invariant, not merely a read-time check
001 does.

**Rationale:** 001's `kiln/validate/log.ts` *checks* R3/R4 on a stream; r1 must
**guarantee** it, so the writer must *produce only conforming* gates. Enforcing at
the emitter is what makes "0 silent approvals in any emitted log" true by
construction — and a deliberately broken writer (a test vector) must make the emitted
log *FAIL* 001's validator with a named reason (SC-003's negative).

**Alternatives considered:**
- **Enforce R3/R4 *only* at validation (read side)** — rejected: a broken writer could
  still emit a non-conforming line that 001 later flags; the constitution requires
  the invariant hold *in the trail itself* (P-VII). Producer enforcement is stronger.
- **A separate "approval gate" module** — rejected: adds a surface P-IX says to
  avoid; folding the check into the writer keeps one choke point.

---

## D4 — The stub-resident interface (NC2 · local-first, no Ollama)

**Decision:** the "resident model" is an **interface**, and a test/driver supplies a
**deterministic *stub*** (E6) — no live Ollama call, no network. The stub is fully
deterministic (fixed outputs per input), so a stub walk's emitted log is **reproducible**
and **replayable** through `kiln/validate/log.ts` — the only way r1 stays
**independently testable local-first** (NC2) and a *live-model smoke walk* is cleanly
**deferred to r3**. The stub emits the *transitions/costs* the scheduler and
writer expect; it is **never** the decider of a gate (the human is — P-I/VI).

**Rationale:** NC2 chose "stub head, no live model; live walk → r3." A deterministic
stub is what makes SC-001/SC-003 reproducible and P-VIII-honoring (a missing outside
resource is *flagged*, not a *block*); a live walk is a different, later row.

**Alternatives considered:**
- **A genuine Ollama call in r1's tests** — rejected (NC2): it couples r1 to a live
  substrate and breaks "independently testable."
- **A random/mock resident** — rejected: non-determinism breaks the *replay* that
  SC-003's "prefix validates" scenario needs.

---

## D5 — The dogfood path (how the emitted log is judged by 001)

**Decision:** a stub walk's emitted JSONL is **replayed through
`kiln/validate/log.ts`** (001's real validator, unmodified). The quickstart's
dogfood scenario (SC-003) runs three passes: (a) a **complete** walk → the stream
**PASSES** (R1–R6); (b) a **truncated** prefix → still **PASSES** (gap-free up to
the last emitted `seq`); (c) a **forced out-of-order / gap** stream → the validator
**names** the `seq`/`ts`/`R`/`G` violation. The exact import is
`kiln/validate/log.ts` (`validateLog(lines)` / its CLI `kiln/validate/`), the same
entry 001's quickstart Scenario 1–3 already exercise — r1 adds no second validator.

**Rationale:** "the runtime is judged *by* the contract 001 built" (spec §Scope,
"Dogfood the 001 contract"); 001 stays canonical (r1 does *not* re-declare the
shapes). Reusing the *unmodified* 001 validator is the only realization that keeps
"001 declares, r1 runs, and r1 is judged by 001" literally true.

**Alternatives considered:**
- **A fresh validator in r1** — rejected: would re-declare R1–R6, breaking the
   "001 is canonical" invariant (spec §Dogfood).
- **Validate only at the end of a walk** — rejected: SC-003 requires the *prefix*
   (a closed terminal) to reconstruct and validate, which is a *stream* property.

---

## D6 — The switch-tax counter + `cost` emission (Principle IV)

**Decision:** the scheduler tracks a **`switches` counter** starting at 0 that
**increments only on a genuine tier boundary** — when the next work unit's required
tier **differs** from the resident's. An **affinity-compatible interior boundary
swaps 0**; each real tier change **swaps exactly 1**. On every swap the lane emits
a `transition{ kind:"swap" }` *and* a `cost` record that **brackets** it
(`{ switches, wallClock }`, the 001 schema field). The cost number the runtime
*realizes* is the **switch count** (the dominant local term of
`wall-clock = work + switching`), **not** the gate count (SC-004). The counter is
**greppable from the log alone** (a `cost` record after every `transition.kind=swap`).

**Alternatives considered:**
- **Count swaps by diffing residents after the walk** — rejected: P-IV wants the
   *counter* to be the source (the `cost.switches` field), and a "no swap on an
   affinity-compatible boundary" probe is only falsifiable if the counter is the
   running value, not a post-hoc diff.
- **Emit `cost` once at the end** — rejected: SC-004 needs each boundary's `cost`
   to *bracket* its `swap` transition, so the log alone shows *where* the tax fell.

---

## D7 — HUD/Popup event-driven recompute + headless twin (Principle IX)

**Decision:** a single **`FactoryState`** (E1, reused shape) is the *only* store.
**Layers A/B** are pure **render functions** of that state (`hud(state)` → the flow
HUD strip `rail / lane / switches / clock`; `popup(state)` → the on-demand gate
card) that are invoked **only on a fired factory event** — never on a timer, never
from a server. The **headless twin** is a **`print` of the exact same render**
when no surface is present. SC-005 / P-IX is proved two ways: (a) a captured
`state S` yields an **identical render** on re-invocation (deterministic read; one
source of truth), and (b) an **inspection / grep** over the UI code finds **no
`setInterval`/`setTimeout`, no socket, no server endpoint**. A missing Layer A/B
*degrades to the printed twin* and the gate **still blocks** — a missing watch hides
the view, never the decision.

**Alternatives considered:**
- **A polling refresh loop / a status server** — rejected *out of hand* (P-IX:
   "never by polling, and never from a server" is a *testable* invariant).
- **Two state stores (one for UI, one for the lane)** — rejected: P-IX's "one
   shared `FactoryState`" / "a distilled read, not a second source of truth"; the
   lane and the surfaces must read *the* state, not copies.

---

## D8 — RuntimeReady (US6) + file placement under `kiln/`

**Decision:** **RuntimeReady** is a **static `node --test` probe** — the
**extension of 001's `FiringReady`** (E7) — that asserts (a) the lane, gate, and
writer **exist and are wired**; (b) a **synthetic stub-resident walk** runs and its
**emitted log PASSES** `kiln/validate/log.ts`; and (c) the runtime module graph
**pulls no cloud** (a zero-network grep). It **advances no gate and runs no *real*
feature** (a *probe*, not a *walk* — like FiringReady), and is **falsifiable**
(remove/break one element → FAIL naming it, SC-006). Placement (001 research §H,
carried): the runtime modules + `runtime-ready` land **under `kiln/`** (the shared
import root), importing 001's schemas/validators/`move-vocabulary.ts`/`roles.ts`
— *no re-declaration* — and the per-feature planning docs stay in
`specs/002-kiln-lane/`.

**Rationale:** "the runtime analogue of FR-009 in 001" (spec US6 *why*); reusing
the *same* entry-point shape as FiringReady keeps one local CI story.

**Alternatives considered:**
- **RuntimeReady *fires a real feature* as proof** — rejected (SC-005-style
  "probe not a walk"; also it would start to *run* the program r1 must not).
- **Keep the runtime under the feature dir** — rejected (001 §H): later rows (r2, r5)
  must import the runtime from the shared root, not from a completed feature dir.

---

## Summary of resolved decisions

- **D1** → single `FactoryState` lane; director-as-scheduler holds/yields/reclaims;
    one resident + one running asserted over *snapshots* (SC-001).
- **D2** → one gate primitive (block + headless `wait` + token-resume, NC3 one
   channel) enforcing `MoveVocabulary(gate)` (G3) for all four special sets.
- **D3** → no-silent-approval enforced **at write time** in the log-writer (R3/R4;
   SC-002 producer-enforced).
- **D4** → deterministic **stub resident** interface; a live model is **r3**, not r1.
- **D5** → dogfood by replaying the emitted JSONL through **001's unmodified
   `kiln/validate/log.ts`** (complete / prefix / forced-violation; SC-003).
- **D6** → a running **`switches`** counter that increments only on a genuine tier
   change, bracketed by a `cost` record (P-IV; SC-004).
- **D7** → HUD/Popup = **pure recompute** of one `FactoryState`, **event-only**,
    with a headless **`print` twin**; **no timer/socket/server** (P-IX; SC-005).
- **D8** → **RuntimeReady** = a falsifiable static extension of `FiringReady`
   (no gate advances; SC-006); the runtime is **promoted under `kiln/`**, judging
   itself by 001 and re-declaring nothing.
