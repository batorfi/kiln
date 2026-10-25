# Contracts — 001-kiln-scaffold (Phase 1 interface contracts)

The **delivered contract** for this slice. It fixes the *shapes* that later
runtime rows import; it is **not** a runtime. Per research §A/§B, the **JSON
Schemas are canonical**; a downstream `kiln/src/types.ts` mirrors them.

| file | contract | source-of-truth | consumed by |
|------|----------|-----------------|-------------|
| [factory-log.schema.json](./factory-log.schema.json) | factory-log record (one JSONL line, union) | canonical schema | per-line validator (`node --test`), FiringReady |
| [roadmap.schema.json](./roadmap.schema.json) | ROADMAP.md structured head | canonical schema | ROADMAP validator, FiringReady |
| [gate-rail.md](./gate-rail.md) | per-gate move vocabulary + role classification (Gate 0 + 1–9) | human-readable contract | every gate-completion record; FiringReady |
| [roadmap-empty.example.md](./roadmap-empty.example.md) | the **shipped empty** ROADMAP.md (Q2=A) | example + positive/negative fixture | ROADMAP validator, quickstart |

## How the pieces compose

```
gate-rail.md  ──defines moves/roles──▶  factory-log.schema.json   (a gate-completion
                                          must carry a move ∈ MoveVocabulary(gateId))

roadmap.schema.json + roadmap-empty.example.md   ──M1–M4──▶  roadmap validator
                                                              (empty head passes; committed
                                                              gate0/ordering are rejected)

factory-log.schema.json (R1–R6)  +  roadmap.schema.json (M1–M4)  +  gate-rail.md (G1–G5)
         └──────────── FiringReady static check ────────────┘
            asserts all three are present, mutual-consistent, and trace-tagged
            (FiringReady is a static `node --test` suite; it advances NO gate — SC-006)
```

## Canonical placement (at implement time; research §H)

At `/speckit.tasks` / `/speckit.implement`, these files are **promoted** to the
shared root so later rows import them, rather than reaching into a completed
feature dir:

```
kiln/schemas/factory-log.schema.json
kiln/schemas/roadmap.schema.json
kiln/contracts/gate-rail.md           (== this gate-rail.md)
kiln/ROADMAP.md                       (== ships the empty head; Q2=A)
kiln/src/types.ts                     (TS mirror of the two JSON Schemas)
kiln/validate/                        (hand-rolled JSONL + roadmap validator)
kiln/tests/                           (node --test: contract / streaming / negative)
```

## Validation entry points (defined, not implemented here)

- `kiln/validate/` reads a JSONL log **line by line**: non-blank lines must
  parse as JSON and conform to `factory-log.schema.json`; `seq` must be strictly
  increasing / gap-free; `R3` (no-silent-approval) and `R5` (local-first)
  enforced per line.
- The ROADMAP validator parses the head, checks `roadmap.schema.json` + M1–M4, and
   **rejects** any `gate0.status: approved` or committed `ordering` (M3).
- A mismatch on **either** front (a missing transition, a malformed record, a
  committed gate0/ordering) **fails with a named reason** (SC-001/SC-008).

> **Scope guard (Q1=C / SC-006):** none of these contracts run a lane, advance a
> gate, or open a UI. They are *checked* statically; the runtime that emits and
> blocks on them is built by later rows. A "FiringReady" probe is a **negative**
> assertion ("the contracts exist and are consistent"), **not** a feature walk.

## Traceable cross-ref (FR-009 / T027)

Every contract names the constitution principle(s) it encodes (in the schema's `trace`
field and the gates-rail prose), so a downstream gate can verify compliance:

| Contract / rule | Constitution principle(s) | Encoded in |
|-----------------|---------------------------|------------|
| No-silent-approval (R3/R4); WAIT is the only unresolved-gate shape | P-V, P-VI | `factory-log.schema.json` (`wait.not`, R3/R4 in `validate/log.ts`) |
| Everything recorded & grep-able; trace notes | P-VII, FR-009 | `factory-log.schema.json` `trace`, `checkTrace` |
| Local-first; flag-not-block | P-VIII | `validate/log.ts` `checkLocalFirst`; zero-fetch CLI |
| Strongest defense; role classification | P-II, G2/L1 | `src/roles.ts`, `gate-rail.md` |
| One lane / director-is-scheduler; FactoryState shape | P-III, P-IX | `src/types.ts` `FactoryState` |
| Affinity swap-only-on-tier-change | P-IV | `Cost` record (`validate/log.ts`), `gate-rail.md` |
| Gate 0 = sole human admission; roadmap = reviewed artifact | P-VI | `roadmap.schema.json` (M3), `validate/roadmap.ts` |
| Per-gate move vocabulary; checkpoint grow; review restart; verify cap | P-I, gates rail | `contracts/move-vocabulary.ts` (G3, G5, G4) |
## Runtime cross-ref — r1 (002-kiln-lane, E1–E7 / FR-009-analogue)

> r1 **realizes** the shapes above and is **judged by** `kiln/validate/log.ts` (the dogfood, D5).
> The runtime lives under `kiln/` and is **wired** by `kiln/index.ts`; r1 **emits no `gate0`
> decision and admits no program** (P-VI / FR-012). Each entity carries its principle trace:

| Entity (E#) | Module | Realizes | Principle(s) | Proof (SC / quickstart) | Invariant |
|-------------|--------|----------|--------------|-------------------------|-----------|
| E1 lane + director-scheduler | `kiln/src/lane.ts` | one resident + one running at any instant | P-III | S1 / SC-001 | `F-SINGLE`, asserted over snapshots |
| E2 gate primitive | `kiln/src/gate.ts` | block; headless `wait`; token-resume; G3 move sets | P-V, P-I, G3 | S2 / SC-002 | headless ⇒ recorded, never resolved |
| E3 factory-log writer | `kiln/src/log-writer.ts` | R1–R6 emit + **write-time** no-silent-approval | P-V, P-VII | S3 / SC-002·SC-003 | `F-RECON`, the choke point |
| E4 affinity scheduler | `kiln/src/scheduler.ts` | hold resident; swap only on a tier change; LoD=strongest | P-IV, P-II | S4 / SC-004 | `F-AFFINITY`; a weaker LoD binding is rejected |
| E5 Flow HUD / Popup + twin | `kiln/ui/{factory-state,hud,popup,twin}.ts` | one shared `FactoryState`, event-only redraw, headless print | P-IX, P-V | S5 / SC-005 | `F-EVENTONLY`; no timer/socket/server |
| E6 stub resident | `kiln/src/stub-resident.ts` | a deterministic test double (no Ollama, no cloud) | P-VIII, NC2 | S3/S6 | a live walk is r3 |
| E7 RuntimeReady probe | `kiln/validate/runtime-ready.ts` | wired + valid-emit + zero-network | P-VI, P-VIII | S6 / SC-006 | falsifiable; runs no gate/feature |

### The dogfood boundary (the heart of r1)

```
001 (declared) ──imports──▶ r1 (runtime) ──emits JSONL──▶ kiln/validate/log.ts ──▶ PASS/FAIL
  shapes ──▶ E1 FactoryState / E2 gate / E3 writer / E4 scheduler / E5 watch / E6 stub
  RuntimeReady (E7) re-asserts wiring + dogfood + zero-network, running NO real feature
```

A broken no-silent-approval path makes the emitted log **FAIL 001's validator with a named
reason** (SC-002 → SC-003); a closed terminal leaves a **reconstructable prefix** (F-RECON, P-VII).
See `specs/002-kiln-lane/contracts/{runtime-api,runtime-ready}.md` for the module surface this row
exposes.

## Runtime cross-ref — r2 (003-kiln-roadmap-overlay, E1–E6 / FR-013-analogue)

> r2 **draws Layer C** on top of r1's spine and is **judged by** the same `kiln/validate/log.ts` +
> `kiln/validate/roadmap.ts` (the dogfood, D5) **plus** its falsifiable extension
> `kiln/validate/overlay-ready.ts`. r2 **admits no program** (P-VI / FR-014 / SC-007): the human
> record in `specs/ROADMAP.md` *admits*; r2 only *renders*. Each Layer-C entity carries its principle
> trace below; the E-numbers here are **canonical** (a keymap is a §D6 spike, **not** an entity):

| Entity (E#) | Module | Realizes | Principle(s) | Proof (SC / quickstart) | Invariant |
|-------------|--------|----------|--------------|-------------------------|-----------|
| E1 overlay | `kiln/ui/overlay.ts` | the whole program as `id/status/short/deps/lane-gate`; one row reads `— HERE`; the gate0 head on top | P-IX, P-VII | S1/S5 / SC-001·SC-005 | `F-OVERLAY`; one source of truth (SC-005) |
| E2 Gate-0 face | `kiln/ui/gate0-face.ts` | a **distinct** face showing **only** `moveVocabulary("gate0")`; a decider-less / per-gate admit is refused | P-V, P-VI (F1) | S2 / SC-002 | `F1-GATE0-HUMAN`; gate0 ≠ gate (SC-002) |
| E3 two Layer-C events | `kiln/ui/factory-state.ts` | `gate0_open` + `roadmap_row_done` (the P-IX redraw triggers); a road-seam re-enters Gate 0 | P-IX, P-VI | S4 / SC-004 | `F-NO-POLL`; a merged/done row is never re-entered (SC-004) |
| E4 headless twin | `kiln/ui/twin.ts` (extended) | with the UI **off**, the roadmap table is **printed** and Gate 0 **blocks** | P-V, P-VI | S3/S5 / SC-003·SC-005 | `F-GATE0-BLOCK`; absent overlay ⇒ print + WAIT, never auto-advance |
| E5 program head | `RoadmapHead` / `Gate0` (001 shape, imported) | the `gate0.status` + `rows` + `decided_by` + `at` head r2 renders (M3/M4) | P-VI, P-VII | S1/S7 / SC-007 | `F-NO-REDECLARE`; the head is 001's, not re-declared |
| E6 OverlayCReady | `kiln/validate/overlay-ready.ts` | the falsifiable probe: present/wired + deterministic + blocking-gate0 + zero-net | P-VIII, P-VI | S6 / SC-006 | `F-OVERLAYREADY`; falsifiable, runs no gate/feature |

### The dogfood boundary (r2 draws, it does not admit)

```
r1 (spine) ──composes──▶ r2 (Layer C) ──emits JSONL──▶ kiln/validate/log.ts ──▶ PASS/FAIL
  E1 overlay / E2 face / E4 twin ──render──▶ ONE FactoryState ──▶ deterministic overlay (SC-005)
  E2 recordGate0Decision ──emits──▶ gate-completion@"gate0" (additive, no new recordType, D3)
  a broken auto-approve of a missing Gate 0 ──FAILs log.ts──▶ named R3 (SC-002 → SC-003)
  OverlayCReady (E6) re-asserts render/face/twin + dogfood + zero-network, running NO gate/feature
```

r2 **admits no program / advances no Gate 0** (P-VI / FR-014 / SC-007): a headless r2 *prints the
program and `WAIT`s on Gate 0*; the admission is the human record in `specs/ROADMAP.md`. See
`specs/003-kiln-roadmap-overlay/contracts/{overlay-api,gate0-face,overlay-ready}.md` for the module
surface, and its `compliance-note.md` for the evidence.

---

## Runtime cross-ref — r3 (004-kiln-live-walk, E1–E5 / FR-013-analogue)

> r3 **fires the kiln live** on top of r1's spine + r2's overlay and is **judged by** 001's
> `kiln/validate/log.ts` + `kiln/validate/roadmap.ts` **plus** its falsifiable extension
> `kiln/validate/live-ready.ts` (which composes on r1's `runtime-ready` + r2's `overlay-ready` — r3 adds
> the *live* half, D7/D8). r3 **admits no program** (P-VI / FR-010 / SC-007): the human record in
> `specs/ROADMAP.md` *admits*; r3 only *fires* + *re-opens* Gate 0 at its own close. Each r3 entity
> carries its principle trace below; the E-numbers here are **canonical** (E1/E3 live resident + the
> *recorded* `--live`/`--stub` selection, no new `recordType`; E2 the live-walk sibling; E4 the live
> `ctx.ui` smoke; E5 the `LiveModelReady` probe):

| Entity (E#) | Module | Realizes | Principle(s) | Proof (SC / quickstart) | Invariant |
|-------------|--------|----------|--------------|-------------------------|-----------|
| E1 live resident | `kiln/src/live-resident.ts` | a LIVE `Resident` (r1's iface, imported): `run` a genuine input-dependent compute, `model()` a real **local** head (never `"stub-resident"`), `tier()` the live tier | P-I, P-VIII, P-II | S1 / SC-001 | `F-LIVE-RESIDENT`; the kiln fires **live**; LoD binds `strongest` |
| E3 recorded `--live`/`--stub` | `kiln/src/live-resident.ts` | a `--live`(default)/`--stub` selector that **RECORdS** its choice as a 001 `transition.reason` (no new recordType); an *unlogged* stand-in is the violation caught by E5 | P-V, P-VII | S6 / SC-006 | `F-NOT-SILENT`; a selection is *in the log*, never a silent stand-in |
| E2 live-walk sibling | `kiln/src/live-walk.ts` | `buildLiveWalk()`: the §D7 full nine-gate rail over the throwaway — an unattended `pre-delegation` tail + a *halted* LoD veto, emitting 001's union (no new recordType) + the recorded E3 selection | P-III, P-IV, P-IV/P-I | S1–S4,S8 / SC-001·003·004 | `F-LIVE-WALK`; PASSES 001's log.ts; broken no-`decidedBy` FAILs named R3 |
| E4 live `ctx.ui` smoke | `kiln/ui/live-tui.ts` | Layers A/B/C (r1 A/B + r2 C, composed) redrawn on the walk's **fired events only** (P-IX), over one `FactoryState`, **degrading** to r2's print twin when the UI is absent — which still **blocks** Gate 0 | P-V, P-VI, P-IX | S5 / SC-005·006 | `F-LIVE-TUI` + `F-GATE0-BLOCK`; event-only, no poll/socket/server |
| E5 LiveModelReady | `kiln/validate/live-ready.ts` | the *falsifiable* r3→r4 handoff probe: composes on r1+r2's checks and ADDS live-wired + PASSES-emit-live + F-NOT-SILENT + zero-net on both toggle positions; runs NO gate/feature | P-V, P-VI, P-VIII | S6/S7 / SC-006·007 | `F-LIVEREADY`; READY or named gap; falsifiable, admits nothing |

### The dogfood boundary (r3 fires live, it does not admit)

```
r1 (spine) ──composes──▶ r2 (Layer C) ──composes──▶ r3 (live) ──emits JSONL──▶ kiln/validate/log.ts ──▶ PASS/FAIL
  E1 live resident / E3 recorded --live/--stub ──drive──▶ the §D7 full nine-gate rail (E2)
  E2 buildLiveWalk ──emits──▶ 001's union: transition / gate-completion / human-decision / cost / wait / pre-delegation (+ the E3 transition)
     (NO new recordType — E3 rides the transition; D2/D8)
  E4 live ctx.ui ──redraws on fired events──▶ ONE FactoryState ──▶ byte-identical overlay (SC-005)
  a broken no-decidedBy live emit ──FAILs log.ts──▶ named R3 (SC-002 → SC-003, P-V)
  E5 LiveModelReady re-asserts r1+r2 + the live half, running NO gate/feature, admitting NO program
```

r3 **fires the kiln live** (the first genuinely live lane) but **admits no program / advances no Gate 0**
(P-VI / FR-010 / SC-007): the emitted *live* log's only `gate0` entry is a `wait` (a re-open at the own
seam); the admission is the human record in `specs/ROADMAP.md`. r3 *re-opens* Gate 0 at its close, it does
*not* admit the next row. See
`specs/004-kiln-live-walk/contracts/{live-resident-api,live-walk,live-ready}.md` for the module surface
and its `compliance-note.md` for the evidence.
