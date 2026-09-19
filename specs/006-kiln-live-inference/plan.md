# Implementation Plan: 006-kiln-live-inference

**Branch**: `006-kiln-live-inference` | **Date**: 2026-09-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-kiln-live-inference/spec.md`

**Note**: This file is filled in by the `/speckit.plan` command; its definition describes the
execution workflow.

## Summary

r1–r3 proved the factory — the runtime spine, Layer C, a blocking headless Gate 0, a full-rail walk,
and a log-replay net — but **every one of them ran on a deterministic stand-in**. r3 was *named* the
live-model row and shipped an adapter instead: `kiln/src/live-resident.ts` returns a pure function,
`kiln/` contains **no** Ollama client, **no** `fetch`, and **no** subprocess, and
`DEFAULT_LOCAL_MODEL` names a model that is not installed. Its own ancestor flagged the gap at
`kiln/src/stub-resident.ts:8`. **r7 pays that debt**: a real Ollama-backed resident, a probe that
*actually dials*, the constitutional invariants re-asserted against a live model, and the first
numeric assertion of Principle IV.

**Approach (the load-bearing one)**: make the kiln fire for real **without forking anything
canonical**, and **strengthen the guard that the new capability spends**. Three moves:

1. **Widen, don't replace** (NC1=B, D1). `Resident.run` becomes `unknown | Promise<unknown>` — a
   *union*, so r1's stub and r3's adapter stay **conforming and unedited**; the async change lands in
   the ~40 **callers**. `bindAll` is split out so P-II's config rejection stays a **synchronous
   throw** (D3), and the UI stays wholly sync so byte-identical rendering survives (D2).
2. **Spend the loopback exception and harden the guard in the same change** (NC2=A, D6). The present
   zero-network scan was **verified not to catch a `fetch`**; r7 makes it call-based, brings
   `kiln/src` into scope, and allowlists **exactly one** module by name. Net effect: strictly
   stronger than before. And R5 needs **no amendment at all** — it scans keys, not values (D5), so
   the resident's symbolic location rides r3's existing `transition.reason` slot.
3. **Prove a call *happened*, not merely that a path exists** (D7). `LiveModelReady` is satisfiable by
   an adapter; `OllamaReady` adds *non-empty visible output* and *a fabricated live marker is caught*
   — the two checks r3 could not make. It **skips with a recorded reason** when no model is present
   (NC3=A), so the offline suite stays green for r5's installer and r6's docs.

See [research.md](./research.md) for decisions **D1–D9**, [data-model.md](./data-model.md) for
entities **E1–E6**, [contracts/](./contracts/) for the three design contracts, and
[quickstart.md](./quickstart.md) for the **S1–S13** validation scenarios.

## Technical Context

**No `NEEDS CLARIFICATION` remains.** NC1–NC3 were resolved by the human at gate 1 on 2026-09-19
(async HTTP + async spine · loopback is local, harden the guard · env-gated, skip-with-record), and
every realization choice is pinned in [research.md](./research.md) D1–D9. Inherited unchanged: 001's
substrate (U1–U8), r1's D1–D8, r2's D1–D8, r3's D1–D8.

**Language/Version**: TypeScript · Node `>= 22.6` (`kiln/package.json` engines) · `node --test` runs
`.ts` directly, no build step. *Canonical contracts — 001's JSON Schemas, `move-vocabulary.ts`,
`roles.ts`, r1's `kiln/src/*` + `kiln/ui/*`, r2's overlay, r3's live-walk — are **imported**, never
re-declared.*

**Primary Dependencies**: **none** — `dependencies: {}` holds. `fetch` is a Node global; the Ollama
HTTP API is reached over **loopback** (`OLLAMA_HOST`, default `127.0.0.1:11434`). Reference host:
Ollama v0.34.2 with six models pulled.

**Storage**: files + in-memory. Runtime logs stay in `kiln/factory-log/` (git-ignored); the
**committed** live fixture goes to `kiln/fixtures/r7-live-inference.jsonl` (**D9** — a fixture in
`factory-log/` could not be committed at all). No database, **no new `recordType`**.

**Testing**: `node --test`. Two tiers (**NC3=A**): the default tier is green **with no Ollama
installed**; the live tier is gated behind `KILN_LIVE=1` and **skips with a recorded reason** when a
precondition is absent. Log replay runs offline from the committed fixture.

**Target Platform**: local developer machine (macOS/Linux), Ollama-served local models. **No cloud**
— the only network action is a **loopback** call (NC2=A).

**Project Type**: single project — a Pi extension / CLI toolchain under `kiln/`.

**Performance Goals**: not throughput. The relevant number is the **switch tax**, which r7 asserts for
the first time: reference **18 040 ms cold vs 280 ms warm (64×)** on the operator's machine (E5/R7).
The assertion is a conservative floor, not the observed ratio.

**Constraints**: zero runtime dependencies (P-VIII) · exactly one unit in flight, no concurrency
(P-III/FR-015a) · no timer/socket/server in any UI surface (P-IX) · one declared signature change and
no other upstream rewrite (FR-015) · the default suite must not require a model.

**Scale/Scope**: ~4 900 existing lines under `kiln/`; r7 adds one resident, one probe, the scan
hardening, two fixtures, and `await` at ~40 call sites (`kiln/src` 6 · **`kiln/validate` 9** ·
`kiln/tests` ~25).

## Constitution Check

*GATE: must pass before Phase 0 research. Re-checked after Phase 1 design — see below.*

| # | Principle | Pre-design verdict |
|---|---|---|
| I | Author/judge separation | **PASS** — the resident *runs work*; it never decides a gate. Gates still resolve on a human `decidedBy` or a distinct `pre-delegation`. |
| II | Lines of defense are strongest | **PASS** — `bindRole` unchanged; **D3** keeps the rejection a *synchronous throw* so a weak judge is refused before anything runs. |
| III | One lane, one resident | **PASS, with an explicit guard** — async could invite concurrency, so **FR-015a** forbids it: one unit in flight, no `Promise.all`. `assertSingleLane` proves it over live snapshots. |
| IV | Affinity is the only cost lever | **PASS, strengthened** — `switchCount` unchanged *and* **first measured** (E5). |
| V | Headless never silently approves | **PASS, extended to the suite** — a skip carries a recorded reason; `skipped ⇒ !ready` (R3). |
| VI | Gate 0 is human-only | **PASS** — r7 admits no program; its close **re-opens** Gate 0 (S12). |
| VII | Everything recorded | **PASS** — resident identity + symbolic location recorded in an existing slot; **no** validator change needed (**D5**). |
| VIII | Local-first, no cloud | ⚠️ **EXCEPTION, declared and narrowed** — see Complexity Tracking. Loopback only, one allowlisted module, and the guard ends up **strictly stronger**. |
| IX | Three UI layers, event-driven, no server | **PASS** — UI stays wholly synchronous (**D2**); no surface awaits, polls, or opens a socket. |

**Gate verdict: PASS.** One exception (P-VIII), justified below, human-authorized at NC2, and *net
guard-strengthening* rather than guard-spending.

### Post-Phase-1 re-check

| Area | Re-check outcome |
|---|---|
| P-III under async | **Held** — contract [A4](./contracts/async-spine.md) makes "no concurrency" a reviewable rule, not an implementation habit. |
| P-VIII scope creep | **Reduced vs. spec** — D5 removed the anticipated `log.ts` amendment; **001 is now entirely untouched**. Only `Resident.run` widens. |
| P-V under async | **New risk found and closed** — an un-awaited walk inside a probe would report a *green* check on an *unbuilt* walk. **D8/A5/S11** make a forgotten `await` a named failure. |
| P-II under async | **New risk found and closed** — a bare `async schedule` would turn a throw into a rejected promise that `assert.throws` passes silently. **D3** splits `bindAll` to keep the sync throw. |
| P-IX | **Unchanged** — no new event, no new surface, no timer. |

**Post-design verdict: PASS.** Phase 1 *narrowed* the footprint (one fewer canonical file touched) and
surfaced two async-specific false-green risks, both now contracted against.

## Project Structure

### Documentation (this feature)

```text
specs/006-kiln-live-inference/
├── gate0-add-row-proposal.md   # the director's Gate-0 draft (pre-admission record)
├── spec.md                     # admitted 2026-09-19; NC1–NC3 resolved
├── plan.md                     # This file (/speckit.plan output)
├── research.md                 # Phase 0 — D1–D9
├── data-model.md               # Phase 1 — E1–E6
├── quickstart.md               # Phase 1 — S1–S13 validation scenarios
├── contracts/                  # Phase 1
│   ├── README.md
│   ├── async-spine.md          # the one declared signature change
│   ├── ollama-resident-api.md  # E1
│   └── ollama-ready.md         # E3 + E6
└── tasks.md                    # Phase 2 (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
kiln/
├── src/
│   ├── ollama-resident.ts      # NEW — E1; the ONLY module allowed to reach loopback
│   ├── stub-resident.ts        # widened interface ONLY (D1 union); impl UNEDITED
│   ├── lane.ts                 # await resident.run; run/yield_ async (D2)
│   ├── scheduler.ts            # split: bindAll (sync throw) + schedule (async) (D3)
│   ├── walk.ts                 # buildStubWalk / buildProgramWalk async
│   └── live-walk.ts            # buildLiveWalk async
├── validate/
│   ├── ollama-ready.ts         # NEW — E3; the dialling probe (checks a–f)
│   ├── _netscan.ts             # NEW — E6; call-based scan + named allowlist (shared)
│   ├── runtime-ready.ts        # await + adopt _netscan
│   ├── overlay-ready.ts        # await + adopt _netscan
│   └── live-ready.ts           # await + adopt _netscan; stays runnable with NO Ollama
├── fixtures/
│   ├── r7-live-inference.jsonl # NEW — E4; committed live evidence (D9)
│   └── r7-live-broken.jsonl    # NEW — the named-R3 counterpart
└── tests/
    ├── ollama-resident/        # NEW — S6 (gated)
    ├── live-inference/         # NEW — S8 invariants live (gated)
    ├── switch-cost/            # NEW — S9 the P-IV assertion (gated)
    ├── ollama-ready/           # NEW — S2, S3, S5, S7
    └── negative/async-await.test.ts  # NEW — S11 (D8/A5)

UNCHANGED (canonical — 001): kiln/validate/log.ts · kiln/validate/roadmap.ts ·
kiln/schemas/*.json · kiln/contracts/move-vocabulary.ts · kiln/src/roles.ts
UNCHANGED (r2/r3 surfaces): all of kiln/ui/* (stays wholly synchronous)
```

**Structure Decision**: r7 **extends** the existing flat `kiln/{src,validate,ui,tests}` layout —
one new resident beside the stub and the adapter, one new probe in the existing
`RuntimeReady → OverlayCReady → LiveModelReady → OllamaReady` chain, and a shared `_netscan.ts` so
the hardened guard has **one** definition rather than three divergent copies (it is currently
duplicated across the three probes). `kiln/fixtures/` — present but empty since 001 — becomes the home
for committed evidence, because `.gitignore` excludes `kiln/factory-log/*.jsonl`.

## Complexity Tracking

| Violation | Why needed | Simpler alternative rejected because |
|---|---|---|
| **P-VIII: a real network call** (loopback HTTP from `ollama-resident.ts`) | r7's entire deliverable is genuine local inference, and the constitution's *"Testable as:"* clause for P-VIII targets **external** round-trips. Resolved by the human at **NC2=A**: `127.0.0.1` is local. | **Subprocess (`ollama run`)** would avoid sockets but was measured to have **no `--seed`/`--temperature`** (3 runs → 3 digests), destroying the determinism the log-replay and byte-identical-render tests depend on; it also blocks unless stdin is closed and emits ANSI on a TTY. **A constitution amendment** (NC2-C) is heavier than the facts require. **Mitigation: the guard gets strictly stronger** — call-based detection, `kiln/src` newly in scope, exactly one allowlisted module, loopback-literal asserted. |
| **One widened upstream signature** (`Resident.run` → union with `Promise`) | Async is unavoidable for HTTP in Node, and the lane must await the model. **NC1=B**, with the sequencing rationale Gate 0 already accepted. | **Strict `Promise<unknown>`** would force edits to both existing residents — converting a widening into the upstream rewrite FR-015 forbids. **`AsyncResident` as a second interface** would fork the single source of truth (P-IX). **Sync-over-async** (worker + `Atomics.wait`) adds concurrency machinery to a codebase whose thesis is strict sequentiality. |

**Not a violation, worth noting**: the async change *introduces two new false-green risks* (an
un-awaited walk inside a probe; a config throw becoming a rejected promise). Both are closed by
design — **D3** and **D8/A5** — rather than accepted. r7 must not ship a new way to be silently wrong.

## Phase 0 — Outline & Research ✅

**Output**: [research.md](./research.md) — decisions **D1–D9**, each with rejected alternatives.
No `NEEDS CLARIFICATION` remains. Three items are deliberately left open as low-risk `implement`
choices: the cost-assertion threshold, the concrete default model name (its *staleness detection* is
settled), and two recorded validator findings that belong to a later hardening row.

## Phase 1 — Design & Contracts ✅

**Output**: [data-model.md](./data-model.md) (**E1–E6**) · [contracts/](./contracts/) (three design
contracts + README) · [quickstart.md](./quickstart.md) (**S1–S13**).

Phase 1 changed two things relative to the spec's expectations, both **reducing** scope:
- **001 is now entirely untouched.** The spec anticipated an R5 amendment for FR-012; D5 established
  that R5 scans **keys, not values**, so a documented convention on r3's existing `transition.reason`
  slot suffices.
- **The hardened scan gets one shared definition** (`_netscan.ts`) instead of patching three
  near-duplicate copies — less code than the spec implied, and one place for the allowlist.

## Next

`/speckit.tasks` — break this into tasks. The natural ordering is: the scan hardening and the
`await` propagation **first** (they are mechanical, offline-testable, and gate everything else), then
the resident, then the probe, then the fixtures and the gated tiers.
