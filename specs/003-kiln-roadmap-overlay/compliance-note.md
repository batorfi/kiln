# Compliance note — 003-kiln-roadmap-overlay (r2)

**Verdict: COMPLIANT.** r2 (**Layer C — the Roadmap overlay**, r2 of the program) draws the
zoom-out surface on top of r1's lane spine and is *judged by* 001's unmodified
`kiln/validate/log.ts` + `kiln/validate/roadmap.ts` and its r1 sibling
`kiln/validate/runtime-ready.ts`. r2 **draws Layer C headlessly** — it is a **render, not a live
walk** (NC1 ⇒ a live TUI smoke walk is **r3**) — and it **added no cloud, no second lane, no server,
and no new log-record type**, and it **admitted no program** (P-VI / FR-014 / SC-007). The emitted
program-walk log + the `specs/ROADMAP.md` head are the compliance evidence (P-VII).

## Constitution (P-I … P-IX) — re-checked against the delivered overlay

| Principle | Status | Where / how r2 complies |
|-----------|--------|-------------------------|
| **P-I** — Gates are the only decision boundary; no gate may be bypassed | ✔ | Gate 0 enters the program only via a `gate-completion@gate:"gate0"`; every other gate stays a per-gate 1–9 surface (`gate0 ≠ gate`, SC-002). |
| **P-II** — Strongest defense, role classification (L1) | ✔ | unchanged from r1 (`kiln/src/roles.ts`); the overlay re-renders r1's LoD=strongest head, no weaker LoD binding. |
| **P-III** — One lane; the director is the scheduler | ✔ | r2 renders r1's single-lane spine; it **adds no second lane**; the roadmap is the zoom-out of the *one* program. |
| **P-IV** — Affinity swap only on a tier change | ✔ | unchanged (r1 E4 `scheduler.ts`); r2 does not touch affinity. |
| **P-V** — Headless ⇒ record-and-advance via `wait`; a missing surface hides the *view*, never the *decision* | ✔ | **The heart of r2** — the headless twin (`E4`) prints the program table and `WAIT`s at a blocked Gate 0 (`F-GATE0-BLOCK`; `disabledUi(state).blocks === true`), never auto-advancing (US2/US3). |
| **P-VI** — Gate 0 is the **sole** human admission; human-only, always | ✔ | **the F1 fix** — a `gate0: approved` requires a **human `decidedBy`**; a per-gate pre-delegation is **refused** at Gate 0 (F1-GATE0-HUMAN); a decider-less gate-0 admission FAILs `log.ts` **R3 by name**. |
| **P-VII** — Everything recorded & grep-able; trace notes | ✔ | the gate-0 admission + its re-entered `wait` are additive records with a `trace`; the overlay carries an FR-013-analogue traceability note (`kiln/contracts/README.md`). |
| **P-VIII** — Local-first; **zero network** | ✔ | a zero-network scan over `kiln/{ui,validate,contracts}` finds **0** cloud round-trips (`F-OVERLAYREADY`); `package.json` `dependencies: {}` unchanged. |
| **P-IX** — No timer/server/socket; redraw is event-only | ✔ | exactly two `FactoryEvent`s added (`gate0_open`, `roadmap_row_done`, E3); a grep over `kiln/ui/*.ts` finds **no `setInterval`/`setTimeout`, no socket, no server** (`F-NO-POLL`). |

## Governance / non-negotiables

- **FR-013-analogue** (traceability) — ✔ each Layer-C entity (E1–E6 ↔ P-V/P-VI/P-IX/P-VIII +
      SC-001…007) is cross-referenced in `kiln/contracts/README.md` and carries a principle trace.
- **Ancestor-canonical invariant (D8/NC3)** — ✔ r2 **imports** r1 + 001, **extending** the
      closed `FactoryEvent` union with exactly two events, and adds **no new
      `factory-log` `recordType`** (the gate-0 decision rides `gate-completion`, D3). The two record
      types it touches are r1's/001's, unchanged.
- **P-VI / FR-014 / SC-007** — ✔ r2 **admits no program and advances no Gate 0**: the only
      program head it carries is `specs/ROADMAP.md` (`gate0.status: approved`, the **human**
     record); r2 *renders* it and *records* a human `gate-completion@gate0` + its re-entered `wait`
       (S7), never a `gate0: approved` **admission** of its own.

## Evidence (the compliance artefacts, P-VII)

- **E1 overlay** `kiln/ui/overlay.ts` — `renderOverlay(state)` (F-OVERLAY; SC-001/SC-005).
- **E2 Gate-0 face** `kiln/ui/gate0-face.ts` — `renderGate0Face` + `recordGate0Decision` (F1-GATE0-HUMAN; SC-002).
- **E3 two Layer-C events** `kiln/ui/factory-state.ts` — `onEvent` + `nextEligibleRow`/`blocks*` (F-NO-POLL; SC-004).
- **E4 headless twin** `kiln/ui/twin.ts` (extended) — `printHeadless`/`disabledUi` print + block (F-GATE0-BLOCK).
- **E6 overlay-readiness probe** `kiln/validate/overlay-ready.ts` — falsifiable `checkOverlayReady` (F-OVERLAYREADY; SC-006).
- **The dogfood log** `kiln/factory-log/program-walk.jsonl` (**PASS**) + the **broken**
     `kiln/factory-log/program-broken.jsonl` (**FAIL, named R3**) — emitted by
     `kiln/tests/dogfood/run-program.ts`.
- **The program head** `specs/ROADMAP.md` — `roadmap.ts` **PASS**.

## Verdict

**r2 COMPLIANT, and it drew Layer C headlessly.** Every non-negotiable holds: **no cloud, no second
lane, no server, no new log record type, no program admitted, no Gate advanced**, and the overlay is
**deterministic, composes with A/B, and blocks its program gate behind a human.** The spine — a
closed-row program walk passing 001's log while a broken auto-approve FAILs it by name — is green.
Ready for **r3** (the first *live*-model smoke walk, which also supplies the live TUI smoke walk r2
defers under NC1).
