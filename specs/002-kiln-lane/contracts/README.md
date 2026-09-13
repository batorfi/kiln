# Runtime Interface Contracts — 002-kiln-lane (r1)

**Status**: design contracts (Phase 1). The **module surface this row exposes** and the
**boundary it is judged across** — *not* a re-declaration of 001's contracts.
**Trace**: Constitution P-I, P-II, P-IV, P-V, P-VI, P-VII, P-VIII, P-IX.

r1 **realizes** what 001 *declared* and is **judged by** 001's validator. Two things
live here:

- **The runtime interface** ([runtime-api.md](./runtime-api.md)) — the module surface the
  lane, gate, writer, scheduler, watch, and stub-resident expose to a driver/test.
- **The RuntimeReady check** ([runtime-ready.md](./runtime-ready.md)) — the falsifiable
  probe that asserts "the runtime exists and emits a valid, cloud-free log."

**What r1 does *not* re-declare** (001 stays canonical — imported, not duplicated):

| contract | lives at | used by r1 |
|----------|----------|-----------|
| factory-log record schema (R1–R6) | `kiln/schemas/factory-log.schema.json` | the writer emits into it; **the validator that judges r1** |
| the log validator (R1–R6) | `kiln/validate/log.ts` | the **dogfood boundary** the emitted log must PASS |
| roadmap schema + admission guard (M1–M4) | `kiln/schemas/roadmap.schema.json`, `kiln/validate/roadmap.ts` | r1 *reads* the admitted program; it **emits no `gate0`** |
| move vocabulary / per-gate move sets (G1–G5) | `kiln/contracts/move-vocabulary.ts` | the gate primitive's `MoveVocabulary(gate)` |
| role classification + strongest-model guard (G2/L1) | `kiln/src/roles.ts` | the scheduler's binding (P-II) |
| `FactoryState` / `FactoryRecord` union type | `kiln/src/types.ts` | the single in-memory store the lane + surfaces draw from |
| the empty ROADMAP ship (Q2=A) / the admitted program | `kiln/ROADMAP.md` / `specs/ROADMAP.md` | r1 reads the program; the admission is a *human* record |

**The dogfood boundary (the heart of r1):** *the lane the runtime produces must be
validatable by the contract 001 built.* Concretely — a stub-resident walk emits
JSONL to `kiln/factory-log/`, and that JSONL is **replayed through
`kiln/validate/log.ts` unmodified** and **must PASS** (complete, truncated prefix, and
the forced-violation negative all behave per [quickstart.md](../quickstart.md), SC-003).

## Composition

```
001 (declared) ── imports ──▶ r1 (runtime) ── emits JSONL ──▶ 001's kiln/validate/log.ts ──▶ PASS/FAIL
   └ shapes ──▶ E1 FactoryState / E2 gate / E3 writer / E4 scheduler / E5 HUD-Popup / E6 stub
   └ RuntimeReady (E7) re-asserts wiring + dogfood, running NO real feature
```

r1 **advances no gate and admits no program**: Gate 0 is `specs/ROADMAP.md` (a human
move), and the emitted log is the audit trail that proves it (Principle VII).
