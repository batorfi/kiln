# Quickstart run — 003-kiln-roadmap-overlay (r2)

**Result: PASS.** Every scenario (S1–S7) reproduces its "Expect" from [quickstart.md](./quickstart.md).
The spine of r2 holds: a closed-row **program walk passes 001's `kiln/validate/log.ts`** while a
**broken auto-approve FAILs it with a named R3**, the **rendered head** validates under
`kiln/validate/roadmap.ts`, and r2 **admits no program / advances no Gate 0** (SC-007).

Captured at `/speckit.implement` — all from a clean checkout, `node --test`, Node ≥ 22.6, the
**overlay + Gate-0 face + headless twin + OverlayCReady** present and wired. No live TUI walk
(NC1 → r3); r2 renders headlessly.

| Scenario | Command | Expect | Observed |
|----------|---------|--------|----------|
| **S1** | `node --test kiln/tests/overlay` | PASS | ✔ `renderOverlay` lists every row `id/status/short/deps/lane-gate`; exactly one `at gate 3 — HERE`; the others `waits r3`/`waits r4`; gate0 head `approved {rows, decided_by, at}` on top; byte-identical on a captured identical state (SC-005 folded into S1) |
| **S2** | `node --test kiln/tests/gate0-face` | PASS | ✔ the face shows **only** `moveVocabulary("gate0")` (`approve/revise/reject/edit-rows/add-row/drop-row`) on a distinct Layer-C face; a per-gate move at Gate 0 **and** a gate0 move at a per-gate card are **both rejected** (`gate0 ≠ gate`); **0** per-gate moves at Gate 0 / **0** gate0 moves at a per-gate card |
| **S3(+)** | `node tests/dogfood/run-program.ts program-walk` → `node kiln/validate/log.ts kiln/factory-log/program-walk.jsonl` | PASS | ✔ `PASS — program-walk: 6 records, gate-0 admitted by a human (gate0.re-entered)`; `log.ts` → **PASS** |
| **S3(–)** | `node tests/dogfood/run-program.ts program-broken --broken` → `node kiln/validate/log.ts kiln/factory-log/program-broken.jsonl` | FAIL, named R3 | ✔ `FAIL — R3 record seq=4 (gate-completion) (no-silent-approval)` — *gate gate0 move "approve" recorded with NO human decidedBy and NO distinct pre-delegation record* |
| **S4** | `node --test kiln/tests/inter-row` | PASS | ✔ `chain_unattended:false` ⇒ the row stops at its PR and Gate 0 re-opens (`gate0_open`/`WAIT`) before the next row; `true` + a veto ⇒ the cruise halts and Gate 0 is re-validated; a `roadmap_row_done` for a `done`/`merged` row ⇒ nothing (re-entered **0** times, SC-004) |
| **S5** | `node --test kiln/tests/ui` + grep timer/socket/server over `kiln/ui/*.ts` | PASS | ✔ every redraw is event-triggered; **no `setInterval`/`setTimeout`, no socket, no server**; a captured identical state ⇒ byte-identical `renderOverlay`; with the UI **disabled**, `disabledUi(state).blocks === true` on an open Gate-0 (prints + `WAIT`s, never auto-advances, P-V/P-VI) |
| **S6** | `node kiln/validate/overlay-ready` + `--broken-render` + `--broken-gate0` | PASS, then FAILs name the broken element | ✔ **READY** (present/wired + deterministic + a blocking headless Gate 0 + F1 human-only + dogfood + zero-network); `--broken-render` → `FAIL — overlay renders deterministically …`; `--broken-gate0` → `FAIL — Gate 0 admits no recorded exception (F1: human-only, P-VI)`; zero-network scan over `kiln/{ui,validate,contracts}` ⇒ **0** cloud round-trips |
| **S7** | `node kiln/validate/overlay-ready` + `grep '"gate":"gate0"' kiln/factory-log/program-walk.jsonl` | a recorded human `gate0` decision only; **no** program admission emitted | ✔ the walk emits `gate-completion@gate0` + a `gate0` **`wait`**, both **recorded / human** (`decidedBy: human@batorfi`); recordTypes are only `{gate-completion, human-decision, transition, wait}` (001's union, unchanged — **D3, no new log record type**); no `gate0: approved` **program admission** is emitted by r2 itself |

## Setup checks

```
$ ls kiln/ui/overlay.ts kiln/ui/gate0-face.ts kiln/validate/overlay-ready.ts
kiln/ui/overlay.ts  kiln/ui/gate0-face.ts  kiln/validate/overlay-ready.ts        # all present
$ node kiln/validate/log.ts   kiln/factory-log/r1-walk.jsonl                    # no regression
PASS
$ node kiln/validate/roadmap.ts specs/ROADMAP.md                                # the head r2 RENDERS
PASS
```

`kiln/validate/log` (r1 emit, **11 records**) and `kiln/validate/roadmap` (`specs/ROADMAP.md`,
`gate0.status: approved`, `decided_by: human@batorfi`) **both PASS** — SC-003 stays green, and the
admitted program is the **human record** in `specs/ROADMAP.md`; r2 *renders* that head, it does **not**
re-admit it.

## The program-walk log (the SC-002→SC-003 spine)

`kiln/factory-log/program-walk.jsonl` (complete, PASSES 001's `log.ts`; R1–R6 conformant):

```
0  transition       to r1
1  gate-completion  gate 9   (walk done; a row closes)
2  human-decision   gate gate0  decidedBy human@batorfi  move approve   (the HUMAN admits)
3  gate-completion  gate gate0  move approve  decidedBy human@batorfi   (ADDED, additive — no new recordType)
4  wait             gate gate0  token g0  deadline …        (Gate 0 RE-ENTERED on the road-seam)
```

recordTypes are **only** 001's — `{transition, gate-completion(×2), human-decision(×2), wait}` —
so the gate-0 admission is **additive** (D3). The **broken** variant
(`--broken`, `kiln/factory-log/program-broken.jsonl`) **omits the `decidedBy` from record 3** →
`node kiln/validate/log.ts` **FAILs seq=4 with R3 named** — *the no-silent-approval guard that F1's
human-only Gate 0 makes provable.*

## Assertion: r2 admits no program, advances no Gate 0 (SC-007 / P-VI / FR-014)

- **No program admission emitted:** the only gate-0 records r2 itself emits are a **recorded**
     human `gate-completion@gate0` and its re-entered **`wait`** — a *render* and a *waiting*,
     never a `gate0: approved` **admission**. The admission is the human record in
     `specs/ROADMAP.md`.
- **No Gate-0 advance inside r2:** Gate 0 is `pending` at the seam; r2 **blocks** on it
     (`disabledUi(state).blocks === true`), never auto-advances.
- **Zero program-admissions / zero gate-advances** in r2's code path — confirmed by S3/S4/S5/S6/S7.

## Coverage

| SC | Covered by scenario(s) |
|----|------------------------|
| SC-001 (whole program, one `HERE`) | S1 |
| SC-002 (`gate0 ≠ gate`) | S2 |
| SC-003 (additive gate-0; broken FAILs R3) | S3(+)/S3(–), S6 |
| SC-004 (`merged` row never re-entered) | S4 |
| SC-005 (captured state ⇒ identical overlay) | S1, S5 |
| SC-006 (OverlayCReady is a probe, not a walk) | S6 |
| SC-007 (no program admitted, no gate advanced) | S3, S7 |

**Done.** Layer C is **drawn, renders deterministically, blocks its program gate headless, and
re-declares nothing** — ready for **r3** (the first *live*-model smoke walk, which also proves a live
UI smoke walk that r2 defers per NC1).
