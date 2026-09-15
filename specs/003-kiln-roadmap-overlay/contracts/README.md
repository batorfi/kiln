# Overlay Interface Contracts — 003-kiln-roadmap-overlay (r2)

**Status**: design contracts (Phase 1). The **module surface this row exposes** and the
**boundary it is judged across** — *not* a re-declaration of 001's or r1's contracts.
**Trace**: Constitution P-I, P-V, P-VI, P-VII, P-VIII, P-IX.

r2 **renders** what a human decides and is **judged by** 001's + r1's validators. Three things live
here:

- **The overlay interface** ([overlay-api.md](./overlay-api.md)) — the Layer C render, its
  Gate-0 face, the headless twin's Layer-C half, and the **two new events** on r1's `FactoryEvent`.
- **The Gate-0 face contract** ([gate0-face.md](./gate0-face.md)) — the canonical
  `moveVocabulary("gate0")` on a *distinct* face, and how a Gate-0 decision is **recorded
  additively** (a `gate-completion` at `gate:"gate0"`).
- **The OverlayCReady check** ([overlay-ready.md](./overlay-ready.md)) — the falsifiable probe
  that asserts "Layer C exists, renders deterministically, blocks a headless Gate 0, pulls no cloud,"
  the **extension of r1's `RuntimeReady`**.

**What r2 does *not* re-declare** (001 + r1 stay canonical — imported/extended, not duplicated):

| contract | lives at | used by r2 |
|----------|----------|-----------|
| `FactoryState` / `RoadmapRow` / `RoadmapHead` / `Gate0` / `FactoryRecord` union | `kiln/src/types.ts` | the single store + the shapes r2 renders (001) |
| `FactoryEvent` union + `onEvent` (event ⇒ new state, F1/P-IX) | `kiln/ui/factory-state.ts` | r2 **extends the union additively** (`gate0_open` / `roadmap_row_done`, D4) |
| Layer A / B renders + the headless twin | `kiln/ui/hud.ts`, `kiln/ui/popup.ts`, `kiln/ui/twin.ts` | the overlay **composes** with A/B; r2 **extends the twin** (D5) |
| move vocabulary / `gate0` move set (G1–G5) | `kiln/contracts/move-vocabulary.ts` | the Gate-0 face renders `moveVocabulary("gate0")` |
| the log validator (R1–R6; already accepts `gate:"gate0"`) | `kiln/validate/log.ts` | the **dogfood boundary** a gate-0 walk's JSONL must PASS |
| roadmap schema + admission guard (M1–M4) | `kiln/schemas/roadmap.schema.json`, `kiln/validate/roadmap.ts` | the program **head r2 renders** is validated here |
| the admitted program | `[specs/ROADMAP.md](../../../ROADMAP.md)` (`gate0.status: approved`) | r2 **renders** the program; the admission is a **human record**, r2's is not it |
| r1's `RuntimeReady` probe | `kiln/validate/runtime-ready.ts` | `OverlayCReady` **composes on** it |

**The dogfood boundary (the heart of r2):** *the overlay the runtime renders + records must be
validatable by the contracts 001 + r1 built.* Concretely — a closed-row program walk emits
`gate-completion at gate:"gate0"` (+ a `roadmap_row_done`→`gate0_open`/`wait`) JSONL to
`kiln/factory-log/`; that JSONL **replayed through `kiln/validate/log.ts` (unmodified) must
PASS** (complete prefix, and a broken auto-approve vector **FAILs** R3 —
[quickstart.md](../quickstart.md), SC-003), and the **head r2 renders** still validates under
`kiln/validate/roadmap.ts` (M1–M4).

## Composition

```
001 (declares shapes + gate0 vocab + roadmap head) ──▶
r1 (runs the spine + Layers A/B + RuntimeReady) ──▶
r2 (renders Layer C + the Gate-0 face + twin + the two events) ── emits JSONL ──▶
      001's kiln/validate/log.ts (gate-0 gate-completion PASSES)
      001's kiln/validate/roadmap.ts (the rendered PROGRAM head PASSES / M3 guards the gate0 record)
OverlayCReady (E6) re-asserts wiring + deterministic render + a blocking headless Gate 0 + no cloud,
  running NO gate and admitting NO program — it COMPOSES ON r1's RuntimeReady.
```

r2 **advances no gate and admits no program**: its Gate-0 face *presents* the program; the decision
is a **human move** (`gate-completion` at `gate:"gate0"` with `decidedBy: human@…`), and the
admission record is `specs/ROADMAP.md` (Principle VI). The emitted log is the audit trail that
proves it (Principle VII).
