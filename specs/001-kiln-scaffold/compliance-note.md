# Compliance Note — 001-kiln-scaffold (T029)

**Date:** 2026-09-12 · Feature `001-kiln-scaffold` · **Constitution:** v1.0.0 (ratified).
This is the constitution-compliance evidence for the slice. Per P-VII the durable
audit trails live in the factory-log; for this *pre-lane* slice the "factory-log"
is replaced by this note + the test suite + the FiringReady check, since no lane
has fired yet.

## Gate-check: PASS (no violations to justify)

| Principle | Status | Evidence / how it is satisfied |
|-----------|--------|--------------------------------|
| I. Author / judge separation | ✅ | The scaffold only **declares** contracts; no role authors and *adjudicates* the same artifact. Tests (judges) are separate from the contracts (producers). Gate-0 admission is a *future* human move, never self-approved here. |
| II. Strongest defense | ✅ | `src/roles.ts` + `tests/negative/strongest-model.test.ts`: all four line-of-defense roles reject any tier below `strongest`, on the local substrate. |
| III. One lane / director-scheduler | ✅ | `src/types.ts` `FactoryState` encodes the single resident + affinity queue; no parallel structure introduced. |
| IV. Affinity swap-only | ✅ | `Cost` record (`switches`/`wallClock`) captures the switch tax; the "no swap on an affinity-compatible boundary" invariant is reserved, not violated. |
| V. Headless never silently approves | ✅ | `test…approval.test.ts` + schema `wait.not`: a gate may only be `approve` with a human `decidedBy` or a *distinct* `pre-delegation`; `WAIT` is the only unresolved shape; no-silent-approval verified. |
| VI. Gate 0 human-only, always | ✅ | Q2=A: `kiln/ROADMAP.md` ships `gate0.status=pending`, 0 rows, 0 ordering; `validate/roadmap.ts` M3 *rejects* any committed program; FiringReady requires the blank. No part of the slice pre-authorizes a program. |
| VII. Everything in the log | ✅ | `validate/log.ts` enforces R1–R6 (ordering, no-silent-approval, distinct pre-delegation, local-first, trace); schema `trace` fields satisfy FR-009. |
| VIII. Local-first | ✅ | `validate/log.ts checkLocalFirst` flags any cloud/remote field; a "flagged-unavailable" marker is legal; a zero-network grep over `kiln/` found no runtime fetch. (SC-005) |
| IX. Three layers, event-driven, no server | ✅ | `FactoryState` shape (F1) fixed for the log; no timer/socket/server anywhere. UI realization is deferred to a later row (Q1=C). |
| Governance / FR-009 | ✅ | Every schema carries a `trace` note; `gate-rail.md` is finalized; this note records the compliance mapping. |

## Open items carried forward (logged, not blocked)

1. **Gate 5 move-set discrepancy** (`research.md §D`, T021): `gates-why-how-what.md §1`
   marks **Checkpoint = approve/reject**, but the **constitution** says **Checkpoint =
   `split+revise` + approve, no `reject`** (the one "grow" move, a restorable base, not
   "done wrong"). Per the governance clause the *constitution governs*, so the delivered
   contract is `split+revise`/`no-reject`. **Action:** the docs track should reconcile
    `gates-why-how-what.md` §1/§4 to the constitution before the first runtime row.
2. **UI / lane realization** is intentionally **out of scope** for this slice (Q1=C).
   `kiln/index.ts` is a documented **not-wired stub**; the HUD/overlay and the
   lane/scheduler/gate primitives (concept §9) are subsequent roadmap rows.
3. **Roadmap head representation** uses JSON inside the `ROADMAP.md` (a valid YAML
   subset); a later row may add a real YAML head parser if a non-JSON head is
   desired. The "structured head is the source of truth; the table is a
    projection (M4)" invariant is preserved either way.
4. **`kiln/factory-log/` directory** is reserved (per `.gitignore`) for the runtime
   row that *writes* logs; this slice only *validates* them.

## Verdict

**Constitution-compliant. No violations requiring a Complexity-Tracking entry.**
The slice delivers planning contracts only, advances no gate, runs no lane, and
pulls no network — exactly the Q1=C / SC-006 surface.
