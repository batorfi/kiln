# KILN — the nine human gates, in depth

> Companion to `20260911-concept.md` and `20260911-ui-layers-deep.md`.
> For each gate: **WHAT** it judges, **WHY** it exists, **HOW** it behaves in the
> single-lane co-operative model (moves, lane-hold, headless, line-of-defense).
> The nine gates below are the **per-row lane** (one feature, Gates 1–9). Above them
> runs **Gate 0 — Roadmap** (see `roadmap.md`, and `ui-layers-deep.md` Layer C): the
> human-only, pre-lane gate that fires the deliverable's roadmap row by row. Gate 0
> never auto-approves — not even headless. See `roadmap.md`.
> Date: 2026-09-11 · status: concept (pre-implementation).

---

## 0. Why nine gates at all

A single-lane, sequential factory has **no parallel safety net.** When the old
model ran N cmux panes, oversight came from a dashboard watching all of them.
With one lane, the gates become the **sole control points** — and because the
lane *waits* at a gate, every gate blocks the whole pipeline. Three invariants
make the gate system trustworthy:

- **Author / judge separation.** The director never implements code and never
  approves its own gate. A line-of-defense DU (critic, verifier, reviewer)
  *judges*; a separate human move *decides*.
- **One human, many judges.** Humans interact only at gates; the judges are
  local model heads. The human reads a **summary**, never the whole artifact.
- **Cheap to bounce early, expensive to bounce late.** Gate order is ordered so
  the cheap decisions (scope) come first and the expensive ones (a working build)
  come last.

A human may also **pre-delegate the approve** for the trailing gates (the
*unattended tail*, §3) — a deliberate, logged act, never the missing-UI fallback,
and never enough to silence a judge: a line-of-defense veto still halts the lane.

**But the nine gates are per-row.** A Roadmap is the deliverable's firing program:
an ordered list of feature-rows, each row one full pass through the nine gates below.
**Gate 0 — Roadmap** is the *pre-lane, human-only* gate that fires the program row by
row: it sits **above** the nine-gate lane and **re-opens between rows**. It is the one
gate the constitution never auto-authorizes — even headless it degrades to a *printed*
roadmap table and a `WAIT gate0` row, never a silent approval. See `roadmap.md`.

The nine per-row gates, in order (Gate 0 fires before the first row and at each row seam):

```
0 ROADMAP  (per-row lane below — fired row by row; human holds Gate 0 between firings)
1 CONCEPT   2 ARCH          3 SPEC    4 PLAN    5 CHECKPT  6 REVIEW
   ->        ->            ->         ->          ->          ->
   9 PR   8 DOCS    7 VERIFY
   (close)  (last-mile)(prove the build)
```

`TRIAGE` runs **before gate 1** and, for small features, routes the feature past
gates **1 + 2** (concept, architecture). All nine are "gates on the
permission-gate pattern": `pi.on("tool_call", …)` → `ctx.ui.select(…)` → block
the lane until the human returns a move.

---

## 1. Gate move matrix (the at-a-glance WHAT)

| gate | artifact judged | moves | line-of-defense | hold lane | headless |
| ---- | --------------- | ----- | --------------- | --------- | -------- |
| 0 roadmap | `ROADMAP.md` (the program) | approve / revise / reject + edit rows | no (program-level) | n/a | WAIT gate0 |
| 1 concept | `concept.md` | approve / revise / reject | no | no | WAIT row |
| 2 architecture | `arch.md` | approve / revise / reject | yes (critic) | yes | WAIT row |
| 3 spec | `spec.md` | approve / revise / reject | no | no | WAIT row |
| 4 plan | `plan.md` | approve / revise / reject | no | no | WAIT row |
| 5 checkpoint | git state | **`split+revise` (+ `approve`); no `reject`** | no | no | WAIT row |
| 6 review | diff + notes | approve / restart | yes (reviewer) | yes | WAIT row |
| 7 verification | `verification-report.md` | approve / reject | yes (verifier) | yes | WAIT row |
| 8 docs | `docs/*.md` | approve / revise / reject | no | no | WAIT row |
| 9 PR | `pr.md` | approve / reject | no | no | WAIT row |

Gate 0 adds a second class of move — **program edits** (approve / revise / reject,
plus edit / add / drop rows): the human reshaping the firing program itself, not just
the in-row artifact.

Three special cases: **checkpoint** carries `split+revise` (+ `approve`) and **no
`reject`** — a checkpoint is not "done wrong," it may *grow* into two, so it is the
one feature-expanding move. **review** offers `restart` and **never** `revise` (the
reviewer judges, it does not author). **verification** `reject` does not bounce —
it **auto-runs a bounded mitigation loop** instead.

---

## 2. Why/how/what per gate

Each entry: **WHAT** (artifact + moves), **WHY** (risk it catches, decision it
gates, failure mode if skipped), **HOW** (single-lane behavior: lane yield,
lane-hold for line-of-defense, headless WAIT, move semantics).

---

### Gate 0 — ROADMAP (pre-lane, human-only; see `roadmap.md`)

**WHAT.** Artifact `ROADMAP.md` — the deliverable's **firing program**: an ordered
list of feature-rows, each row one full run of the nine gates below. Moves:
approve / revise / reject, plus **edit / add / drop rows**. Author: the director's
planner proposes; the human decides.

**WHY.** Before the lane fires its first row, the human must accept *what the
deliverable breaks into and in what order*. Gate 0 is the **program-level** gate:
it is never a per-row judge, so no line-of-defense DU holds it, and the lane does
not start until the program is admitted. Failure mode if skipped: a factory that
fires the wrong decomposition — or a row the human never meant to commit to.

**HOW.** Pre-lane: the lane has not fired yet, so there is nothing to hold. The
gate card lists the program (rows, deps, current). On **approve**, the first row
enters gate 1. At **each row seam** (after gate 9 / PR close) Gate 0 **re-opens**
(`roadmap_row_done`) to admit the next row — the human re-checks the program.
**Chaining** (fire the next row without stopping) is opt-in, logged, and
**veto-liftable**: any line-of-defense veto inside a chained row halts the chain and
returns to Gate 0. Gate 0 is the **one gate the constitution never auto-approves** —
even under the unattended tail it stays a human decision.

> **Headless (Gate 0):** no card can draw, but Gate 0 still never auto-approves.
> The factory prints the `ROADMAP.md` table to the factory-log, emits a
> `WAIT gate0` row with a resume token + deadline, and blocks the lane until the
> human returns to approve the program. A missing door never silently opens.

---

### Gate 1 — CONCEPT

**WHAT.** Artifact `concept.md`. Moves: approve / revise / reject. Author is the
concept-writer subagent (standard head); the human decides.

**WHY.** This is the cheapest gate and the one to bounce hardest on: a bad scope
or a misread intent now costs a few tokens; it costs a whole feature later. It
gates the decision "is this worth building, and on these premises." Failure mode
if skipped: scope creep and re-work downstream of every later gate.

**HOW.** For large features this is gate 1; for small ones `triage` already
routed past it (gates 1+2 skipped). When active, the director loads the resident
head, yields the lane to the concept-writer subagent, reclaims it, and raises the
gate card summarizing `concept.md`. Headless: a `WAIT` ledger row with a resume
token + deadline; the lane blocks, not draws.

---

### Gate 2 — ARCHITECTURE (line-of-defense, holds lane)

**WHAT.** Artifact `arch.md`. Moves: approve / revise / reject. Authors:
arch-designer (standard) + **arch-critic** (frontier, the judge).

**WHY.** Catch structural risk — module boundaries, data flow, the wrong
abstraction — before it becomes a spec and then code. The **critic is a
line-of-defense DU**: it judges the design, so it uses the frontier head and
**holds the lane** so the head that made the judgment is not evicted between the
judgment and the verdict. Failure mode if skipped: a build that works but is the
wrong shape — expensive to unwind post-spec.

**HOW.** Because it holds the lane, the scheduler schedules the arch-critic DU
before any work that would evict the frontier head. Revising bounces back to the
arch-designer, not to a human editor (the human only approves/rejects/revise-decides). In the single-lane model this gate is a genuine *load-bearing* checkpoint: nothing proceeds until the human accepts the structure.

---

### Gate 3 — SPEC

**WHAT.** Artifact `spec.md`. Moves: approve / revise / reject. Author: a
spec-writer subagent. The factory-log tracks the spec as the canonical contract.

**WHY.** Pin the contract so plan, implementation and later verification share one
reference. The spec is the artifact the validator and the verifier ultimately
measure the build against; a fuzzy spec here poisons every later gate. Failure
mode if skipped: "done" becomes undefined; verification gate 7 has nothing to check against.

**HOW.** Standard subagent, standard head; the lane is yielded for the write and
reclaimed for the gate. Headless: WAIT row. Revise bounces to the spec author with notes.

---

### Gate 4 — PLAN (the dispatch-order gate)

**WHAT.** Artifact `plan.md`. Moves: approve / revise / reject. Author: the
director's planner. This is the "GATE 3 of 9" shown in the open pop-up card in the
UI deep-dive.

**WHY.** Commit to the task **decomposition and order** before any code is
written. In the single-lane model the plan *is* the dispatch queue's skeleton: the
task order here becomes the queue, and the **model-affinity batching** that
minimizes the switch tax is decided here. Failure mode if skipped: the queue
re-orders at runtime, switching models needlessly and blowing up the switch tax.

**HOW.** When approved, the scheduler materializes the DU queue from the plan's
task list, applies topological ordering, then model-affinity batching. Rejected
plans bounce to the planner. The plan gate is the only gate whose *decision*
directly shapes the scheduler's ordering policy downstream.

---

### Gate 5 — CHECKPOINT

**WHAT.** Artifact is **git state**, not a document (the `git-checkpoint`
precedent). Moves: **`split+revise` (+ `approve`); no `reject`**.

**WHY.** A safe commit point created **before** risky implementation begins — the
rollback handle for gates 6/7. It is a control gate, not a content gate: it
answers "do we have a clean, restorable commit to stand on before we do the risky
work." Failure mode if skipped: a failed review/verification has nowhere to reset to.

**HOW.** The director creates a checkpoint commit and asks the human to confirm the
base before implementation proceeds. Headless: WAIT row. Because a checkpoint is "not
done wrong," it carries **no `reject`**: the feature is either good enough to stand
on (**`approve`** the base and proceed) or too large to be one feature (**`split+revise`
grows it into two**), and that grow move is the reason checkpoint is the one
feature-expanding gate. *(Constitution governs over this doc §1/§4: the delivered
contract is `kiln/contracts/gate-rail.md` G5 + `move-vocabulary.ts`, where checkpoint
= `split+revise` + `approve`, no `reject`.)*

---

### Gate 6 — REVIEW (line-of-defense, restart only)

**WHAT.** Artifact: the code **diff + review notes** (`review-notes.md`). Moves:
approve / **restart** — **no revise**. Author/judge: the **code-reviewer**
(frontier, holds lane).

**WHY.** Independent critique of the produced code against the spec. The reviewer
is a line-of-defense DU: it *judges*, it does **not author** — so it cannot "revise"
the artifact. Its only corrective move is **restart** (throw this build back to
implementation). This separation (judge never author) is what makes a reviewer
decision trustworthy; a reviewer that also edited would grade its own work.
Failure mode if skipped: defects reach verification, where they are far costlier to find.

**HOW.** The reviewer DU holds the frontier lane; its output is a verdict
(approve / restart). `restart` re-opens implementation from the checkpoint (gate 5).
Headless: WAIT row; `restart` requeues the implementation DUs.

---

### Gate 7 — VERIFICATION (line-of-defense, bounded mitigation)

**WHAT.** Artifact `verification-report.md`. Moves: approve / **reject**.
Author/judge: the **verifier / diagnosis DU** (frontier, holds lane).

**WHY.** *Prove* the build meets the spec, not just "looks done." The verifier
checks the artifact/behavior against the gate-3 spec. The special thing here:
`reject` does **not** bounce to a human editor — it **auto-runs a mitigation
loop, capped at two rounds**, because the factory can often fix its own defects
cheaper than asking. The cap prevents an infinite fix/reject loop. Failure mode
if skipped or un-bounded: either shipped defects or a non-terminating repair loop.

**HOW.**

```
+--------------------------------------------------------------------------+
| VERIFICATION MITIGATION LOOP  (reject does NOT bounce to a human)          |
| -------------------------------------------------------------------------|
|   verify (round 1)      -> FAIL                                          |
|        |                                                                  |
|        v                                                                  |
|   auto-mitigate (round 1)   the harness tries to fix, not the human        |
|        |                                                                  |
|        v                                                                  |
|   verify (round 1, retry)  -> PASS  -> APPROVE                            |
|                           -> FAIL  -> up to round 2, then ESCALATE       |
|                                                                          |
|   policy: <= 2 mitigation rounds, then ESCALATE to the human (W-AIT row)   |
+--------------------------------------------------------------------------+
```

After **two failed** mitigation rounds the gate escalates to the human as a
headless-style WAIT row carrying the diagnosis. Lane-hold keeps the verifier's
frontier head resident through the retry so the judge is consistent.

---

### Gate 8 — DOCS

**WHAT.** Artifacts: `docs/*.md` (and the concept deep-dives in `docs/concepts/`).
Moves: approve / revise / reject. Author: the **docs-synthesizer** (standard).

**WHY.** Last-mile consistency — the documentation reflects the *as-built* system,
not the original spec. Lower risk than the earlier gates, so this is usually an
approve. Failure mode if skipped: the shipped system and its description drift
apart, which bites the next feature that reads these docs.

**HOW.** Standard subagent; the lane is yielded for synthesis. Revise bounces to
the docs author with notes; headless WAIT row otherwise.

---

### Gate 9 — PR (the closing gate)

**WHAT.** Artifact `pr.md`. Moves: approve / reject. Author: the **PR-writer**
(standard).

**WHY.** The **final human sign-off** before merge: the human confirms the whole
feature — concept through verified docs — is what they want pushed. This is the
only point at which "ship it" is authorized. Failure mode if skipped: an
automatically merged feature no human has accepted end-to-end.

**HOW.** The director assembles the PR diff + `pr.md` and raises the final gate
card. Approve merges; reject returns the feature to an earlier gate. Headless:
WAIT row — the lane never merges without an explicit human move.

---

## 3. Cross-cutting behaviors

**Lane-hold (line-of-defense DUs).** Gates 2, 6, 7 run on the frontier head and
get the `lane: hold` flag. The scheduler never evicts a held head between the
work being judged and its verdict, so the judge sees a consistent resident model.
Without hold, model-affinity batching could unload the frontier head mid-judgment
and double the switch tax.

**Headless = WAIT rows, not blocking UI.** In CI/cron (`!ctx.hasUI`) no gate can
draw its card; every gate degrades to a `WAIT` row in the factory-log with a
**resume token + deadline** (the `timed-confirm` precedent). The lane still blocks
— it just *records* the wait. Default policy is `gate-block`: the lane halts at
each gate and requires `--headless` to proceed past it. The one **named exception to
"every gate degrades to a blank WAIT"** is not an exception in spirit: **Gate 0
prints the `ROADMAP.md` table** (not a blank card) *and* emits a `WAIT gate0` row —
it *records* the program the human never admitted and *blocks*, so a missing door
never silently opens. Gate 0 is the only gate whose headless form is "print-and-WAIT,",
never an auto-approve.

**The move vocabulary.** Most gates share `approve / revise / reject`. Three gates
diverge: **review** is `approve / restart` (judges but does not author, so no
revise), **verification** is `approve / reject` with auto-mitigation `<= 2` rounds,
and **checkpoint** is `split+revise (+ approve)` — **the one "grow" move, with no
`reject`** (a checkpoint is not "done wrong," it may become *two*; the corrective
move grows the feature rather than discarding it). PR omits `revise` (a merge is a
yes/no, not an edit).

**Triage routing.** For *small* features, `triage` runs before gate 1 and routes
the feature past **gates 1 + 2** (concept, architecture): the scope is obvious
enough that the expensive structural gates add cost over safety. Small features
still pass gates 3-9.

**Unattended tail (run-unattended after spec).** The companion to *triage
routing*: triage trims the **front** of a trivial feature (gates 1+2 skipped); an
operator who has just approved the **spec (gate 3)** may instead pre-authorize the
**approve** move for the trailing gates **4–9** and let the lane drive itself to a
PR with no further human stops. This delegation is **per-row, inside one row**
(gates 4–9 of a single feature). It **never authorizes Gate 0**: firing the
*next* roadmap row is always a fresh human decision at Gate 0 — the unattended tail
cannot chain a row the human did not admit. (An opt-in, logged "chain rows" mode
lets the human pick rows to auto-run, but any veto inside still returns to Gate 0.) This is **not** the headless WAIT fallback — it is
a *conscious, logged delegation by a human who already signed the contract*, the
exact opposite of a missing-UI silent approval, so it never weakens the "no model
may approve its own work" invariant.

Critical invariant, shared with every other gate: **auto-proceed authorizes only
the approve side on the clean path — it never silences a line-of-defense veto.** A
judge's objection (arch-critic gate 2, reviewer `restart` gate 6, verifier
`reject` gate 7), or a checkpoint overflow (gate 5), **halts the auto-cruise and
returns the lane to the human**. Pre-authorized auto-proceed answers "if
everything checks out, don't bother me", not "ship it even if a judge says no."

By default the unattended **gate 9 (PR)** stops at a **ready-to-merge** PR for a
final human glance; the operator may additionally delegate the terminal
**Approve = merge**. Each auto-crossed gate still emits its gate report, tagged
**"auto-approved under pre-delegation (spec #N)"** with the reviewing model and a
"no objections" note — so the factory-log always separates *a human pre-delegating
the approve* from *a gate that genuinely ran with no human present*, the latter
staying the still-honest WAIT row.

---

## 4. Why/how/what: one-sentence summary per gate

| gate | WHY (one line) | WHAT (one line) | HOW-in-lane (one line) |
| ---- | -------------- | --------------- | --------------------- |
| 0 roadmap | admit the firing program (per-row) | `ROADMAP.md`, approve/revise/reject + edit rows | pre-lane, human-only, re-opens at each row seam |
| 1 concept | cheapest bounce, kill bad scope early | `concept.md`, A/R/x | first gate; subagent write; skip-if-small |
| 2 architecture | catch structural risk pre-code | `arch.md`, A/R/x | critic holds lane, frontier head |
| 3 spec | pin the contract everything checks vs | `spec.md`, A/R/x | validator-backed, canonical |
| 4 plan | fix dispatch order + affinity | `plan.md`, A/R/x | becomes the DU queue + batching |
| 5 checkpoint | restorable base before risk; grow, not reject | git state, `split+revise`/`approve` | git-checkpoint precedent |
| 6 review | independent critique of code | diff+notes, approve/restart | judge never authors -> restart |
| 7 verification | prove, don't assume done | `verification-report.md`, approve/reject | reject auto-mitigates <=2 |
| 8 docs | keep docs = as-built | `docs/*.md`, A/R/x | usually an approve |
| 9 PR | human sign-off to merge | `pr.md`, approve/reject | closing gate, never auto-merges |

---

## 5. Open questions (gate track)

1. Does a **revise** at gate N always route to the same stage's author, or can it
   skip stages (revise-architecture bouncing to concept)?
2. Is `restart` at review a full re-run from gate 5, or a re-decompose from gate 4?
3. Mitigation cap at 2 rounds — fixed, or a per-feature setting in the constitution?
4. Should **gates 8 + 9** be mergeable into one "docs+PR" gate to reduce gate fatigue
   on small features?
5. Headless default: `gate-block` everywhere, or a per-gate allowlist of
   auto-approvable gates (e.g. docs, in CI) — cf. the unattended tail (§3).
6. The unattended tail: which trailing gates may the human delegate (all of 4–9,
   or a subset such as docs-only), does delegation include the terminal PR merge
   by default, and is the veto-lift rule (any judge objection halts) fixed or a
   per-feature constitution setting?
7. **Gate 0 / Roadmap:** where does Gate 0 live vs the unattended tail — is the
   program-level decision (approve the *next* row) ever delegable, or is Gate 0
   strictly human-only (currently: strictly human-only, even headless)?
8. **Inter-row chaining:** should a human-approved "chain N rows" mode be opt-in by
   default, logged, and veto-liftable (a line-of-defense veto mid-row halts the
   chain and returns to Gate 0)? See `roadmap.md` §5.
9. **Roadmap artifact:** is `ROADMAP.md` a persisted artifact (validator-tracked,
   like `spec.md`) or a projection of `lane`/`gate0` state recomputed by the TUI?
10. **Layer C keybinding:** which key opens the roadmap overlay — `M` collides with
   existing TUI nav (`g`/list, `?`/help); a keymap spike is needed. See
   `ui-layers-deep.md` §5 / `roadmap.md` §9.
