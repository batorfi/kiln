# Quickstart Run — 002-kiln-lane (r1): the kiln fires on a stub

**Date**: 2026-09-13 · **Substrate**: Node 26, `node --test` · **Full suite**: **77 tests, 77 pass, 0 fail**
(the 45 from 001 unchanged + 32 for r1). This record asserts the load-bearing invariant (SC-003,
the dogfood), **zero gate-advances** (SC-007 / P-VI), and **zero cloud calls** (P-VIII / SC-006).

Each "Expect" from `quickstart.md` is reproduced by the listed command + observed result.

---

## S1 — The single lane (SC-001, US1)

- **Command**: `node --test kiln/tests/lane/lane.test.ts`
- **Result**: PASS — a 2-unit same-tier lane holds **one resident + one running unit at every
   snapshot** (`assertSingleLane` over captured snapshots); each `yield` is matched by a reclaim;
   `switches = 0`. The negative: a forged two-running-at-once "foundry" **throws** `F-SINGLE`.
- **Invariant**: `F-SINGLE` proven at any instant, not just at the end.

## S2 — The gate primitive (P-V, G3, US2)

- **Command**: `node --test kiln/tests/gate/gate.test.ts`
- **Result**: PASS — a headless gate-3 emits **exactly one `wait`** and **no `gate-completion`**
   (token `/^g[0-9a-f]+$/`); `applyMove(gate-6, "revise", …)` is **rejected** (review's set is
    `approve/restart`) and the gate stays open; a token-resumed legal move yields a
   `gate-completion` with a non-empty `decidedBy`; a `pre-delegation` auto-crosses gate 4's approve
   side as a **distinct** record; Gate 0 is **never** auto-cruised; every line-of-defense **veto
   halts** the cruise (a `wait`, no auto-completion).
- **Invariant**: a headless gate is recorded, never resolved.

## S3 — The log writer + the dogfood (SC-002/SC-003, US3)

- **Command**: `node --test kiln/tests/writer/ kiln/tests/dogfood/` then
   `node kiln/tests/dogfood/run.ts r1-walk`.
- **Result**: PASS — a full stub walk emits JSOnL with `seq` gap-free from 0 and `ts`
   non-decreasing. The dogfood (`node kiln/tests/dogfood/run.ts r1-walk`):
   `PASS — dogfood: 12 records, switches=1 → kiln/validate/log.ts`, exit 0; replayed through
    **001's unmodified `kiln/validate/log.ts`** it **PASSES** (R1–R6). A **truncated prefix** still
    PASSES (F-RECON closed-terminal); a **forced seq gap** is **named** (`R2 … expected …`); and the
   `--broken` vector (`node kiln/tests/dogfood/run.ts r1-holed --broken`) **FAILs** with a named
   reason — `FAIL — R3 record seq=7 (gate-completion) (no-silent-approval)` — exit 1.
- **Invariant**: a broken no-silent-approval path makes the emitted log FAIL 001's validator.

## S4 — The affinity scheduler (SC-004, P-IV/P-II, US4)

- **Command**: `node --test kiln/tests/scheduler/scheduler.test.ts`
- **Result**: PASS — all-same-tier ⇒ `switches = 0`; one genuine boundary ⇒ `switches = 1` (and the
   lane's realized count agrees with `switchCount`, T021); the "no swap on an affinity-compatible
   boundary" probe returns 0; the **four line-of-defense roles bind `strongest`** and any weaker
   LoD binding is **rejected at schedule time** as a G2/L1 config error.
- **Invariant**: `F-AFFINITY`; the switch count is the realized cost, not the gate count.

## S5 — The watch (SC-005, P-IX, US5)

- **Command**: `node --test kiln/tests/ui/ui.test.ts`
- **Result**: PASS — a captured **identical** state yields an **identical** HUD/Popup render (one
   source of truth); a fired event updates the shared `FactoryState` and the surfaces recompute; the
   input is left untouched (pure). A disabled UI **prints** the same content and a gate **still
   blocks**. The inspection asserts **no `setInterval`/`setTimeout`, no `new Server`/socket, no
   `require("http|net")`** across `kiln/ui/*.ts`.
- **Invariant**: `F-EVENTONLY`; no timer/socket/server; Layer C remains un-built (r2).

## S6 — RuntimeReady, the falsifiable probe (SC-006, P-VIII, US6)

- **Command**: `node kiln/validate/runtime-ready.ts` then `… --broken`.
- **Result**: `PASS` (exit 0) — every assert green: five src modules present, ui A/B + twin present,
   `index` **wired** (not 001's not-wired stub), **emitted log PASSES 001's `log.ts`** (11 records,
   R1–R6), and a **zero-network** scan over `kiln/{src,ui,validate,contracts}` finds **0** external
   dependencies / sockets / servers. `--broken` (exit 1): the no-silent-approval hole **FAILs the
   dogfood check and names it** (`FAIL — emitted log passes 001's log.ts … R3 no-silent-approval`).
- **Invariant**: RuntimeReady is falsifiable; it runs **no gate and no *real* feature** (a probe).

## S7 — r1 admits no program, advances no Gate 0 (SC-007 / P-VI / FR-012)

- **Command**: `node kiln/tests/dogfood/run.ts r1-walk` then
   `grep -c "\"gate0\"" kiln/factory-log/r1-walk.jsonl`.
- **Result**: `0` — the emitted log carries **no `gate0` record**; r1 **observes** the program gate
   (`gate0.status: pending` in `FactoryState`) and **emits no decision**. The admission is the
    **human record** in `specs/ROADMAP.md` (`gate0.status: approved`, `decided_by: human@batorfi`),
   which **validates** under `node kiln/validate/roadmap.ts specs/ROADMAP.md` → `PASS` (M3/M4).
- **Invariant**: the runtime is the one that never admitted the program; the human Gate 0 move did.

---

## Done when

Every `Expect` reproduced (§S1–S7); **77/77** tests green; the **emitted log PASSES 001's
`kiln/validate/log.ts`** (the dogfood, SC-003) while a **broken no-silent-approval path FAILs it
with a named reason** (SC-002→SC-003); **0** gate-advances in r1 (SC-007 / P-VI); **0** cloud
round-trips (P-VIII / SC-006). The kiln fires on a **stub** (NC2 → the first *live* walk is r3) and
r1 is ready for **r2** (Layer C UI).
