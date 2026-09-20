# Compliance Note — 002-kiln-lane (r1)

<!-- r7-correction -->
> **⚠ Correction recorded by r7 (2026-09-20) — read this first. The original text below is preserved verbatim (P-VII).**
>
> **The "zero-network / zero-cloud (P-VIII)" check cited below was vacuous.** The probe guarded its scan with
> `fileExists(dir)` — `statSync(p).isFile()`, `false` for a directory — and so skipped **every** directory and examined **zero
> files** (`overlay-ready` scanned `ui`/`contracts`/`validate` but never `src`). A planted external import, `require("http")`
> and a bare `fetch` in `kiln/src` left the probes green. The *code* was, and is, dependency-free; the *proof* could not have
> shown otherwise. r7 replaced the three copies with one shared, never-vacuous scan (`kiln/validate/_netscan.ts`). Full account:
> [`specs/006-kiln-live-inference/compliance-note.md`](../006-kiln-live-inference/compliance-note.md).

**Date**: 2026-09-13 · **Reviewed by**: (line-of-defense, at Gate 1–9 of r1 — a later human move) ·
**Verdict**: **COMPLIANT** — r1 added **no** cloud, **no** parallelism, **no** timer/socket/server,
and **advanced no gate / admitted no program**. The emitted log **is** the compliance evidence
(P-VII), reconstructed below.

This note is the r1 analogue of 001's `compliance-note.md`. It records what r1 ran (a lane — on a
*stub*) and the constitution principle(s) it realized, and confirms the ones it must not break.

## What r1 ran (and did not)

- **It ran a *stub* lane**, not a real feature (NC2): `buildStubWalk()` drives
   `makeStubResident()` through the single lane, opens/decides gates, and emits JSONL that is
   **judged by 001's unmodified `kiln/validate/log.ts`** (the dogfood, D5/SC-003). A **live-model
   smoke walk is r3**.
- **It advanced no gate and admitted no program** (P-VI / FR-012 / SC-007): the emitted log carries
   **no `gate0`** record (`grep -c '"gate0"' kiln/factory-log/r1-walk.jsonl` → `0`); the program
   admission is the **human record** in `specs/ROADMAP.md` (`gate0.status: approved`,
   `decided_by: human@batorfi`), which r1 only *reads*.
- **It pulled no cloud / ran no server** (P-VIII / SC-006): the zero-network scan over
   `kiln/{src,ui,validate,contracts}` finds **0** external dependencies / sockets / servers; the
   module graph and `package.json` remain **zero-runtime-dependency**.

## Principle-by-principle traceability (FR-009-analogue)

| Principle | How r1 respects / realizes it | Where proven |
|-----------|-------------------------------|--------------|
| **I** author/judge sep. | gates only *emit* a decision; the decider is a `human@…` or a *recorded* pre-delegation; a veto always halts | `gate.ts` `applyMove`/`resumeByToken`/`vetoHalt`; S2 |
| **II** strongest defense | the four LoD roles **bind `strongest`**; a weaker LoD binding is **rejected at schedule time** (`bindRole`) | `scheduler.ts` + `roles.ts`; S4 / SC-004 |
| **III** one lane / director-is-scheduler | `FactoryState` holds **one resident + one running at any instant**; the director holds/yields/reclaims; no parallel structure | `lane.ts` `F-SINGLE`; S1 / SC-001 |
| **IV** affinity swap-only-on-tier | swap **only** on a genuine tier change; `switches` = # boundaries; a `cost` brackets each swap | `scheduler.ts` + `lane.ts` T021; S4 / SC-004 |
| **V** headless never silently approves | a headless gate **prints + `wait`**; **no-silent-approval is enforced at write time** in the log-writer | `gate.ts` `headlessWait`; `log-writer.ts` `isSilentApproval`; S2/S3 / SC-002 |
| **VI** Gate 0 human-only | r1 **emits no `gate0` decision** and **admits no program**; Gate 0 lives in `specs/ROADMAP.md` | S7 / SC-007; emit-log grep |
| **VII** everything in the log | every transition/gate-completion/human-decision/cost/wait is a schema-conformant JSONL line; a closed terminal **reconstructs** (F-RECON) | `log-writer.ts`; dogfood prefix; S3 / SC-003 |
| **VIII** local-first | the stub resident is a **local test double** (no Ollama, no network); a zero-network grep confirms it; a missing outside resource would be a *flagged* `unavailableResource`, not a block | `stub-resident.ts`; RuntimeReady zero-network; S6 / SC-006 |
| **IX** three layers, event-driven, no server | HUD/Popup are **pure reads** of one `FactoryState`, redrawn **only on events**; the headless twin **prints** and the gate **still blocks**; no timer/socket/server | `kiln/ui/*`; S5 / SC-005 |
| **Governance / FR-009** | each entity E1–E7 carries a traceability note; the emitted **log is the audit trail** a downstream gate verifies from | `kiln/contracts/README.md` runtime cross-ref; E7 RuntimeReady |

## The "declare vs run" line held

001 **declared** (Q1=C): it shipped the schemas, the move vocabulary, `roles.ts`, `roles`/`FactoryState`
types, and a **not-wired** `kiln/index.ts` stub — and advanced **no** gate (SC-006 / Q1=C). r1 is
the **first row that runs**: it **wires** `kiln/index.ts` (`laneIsWired() === true`, T031) and
**produces** real `transition` / `gate-completion` / `wait` / `cost` records — but on a **stub**
resident, and **without admitting its own program** (P-VI). The two never blur: the runtime
*produces or moves*; a gate's outcome is still a *human* decision the runtime only *emits* (P-I).

## Residual / deferred to later rows

- **Layer C (the roadmap overlay)** — out of scope, deferred to **r2** (NC1).
- **The first *live-model* smoke walk** (driving a real Ollama head through Gates 1–9) — **r3**
  (NC2); r1 proves the runtime on a deterministic stand-in.
- The `gate0` admission of the `kiln-v1` program itself — the **human's** move, recorded in
   `specs/ROADMAP.md`; r1 does not and cannot perform it.
