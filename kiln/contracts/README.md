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
