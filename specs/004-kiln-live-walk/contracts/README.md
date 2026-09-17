# Live-Walk Interface Contracts — 004-kiln-live-walk (r3)

**Status**: design contracts (Phase 1). The **module surface this row exposes** and the
**boundary it is judged across** — *not* a re-declaration of 001's, r1's, or r2's contracts.
**Trace**: Constitution P-I, P-V, P-VI, P-VII, P-VIII, P-IX.

R3 makes **live** what r1 *ran* (the stub resident + stub walk + the runtime spine) and r2
*rendered* (Layer C + its Gate-0 face + `OverlayCReady`) — **additively**, extending the ancestors
it imports. Three things live here (E1/E3, E2, E5), plus the index below says what r3 **does not
re-declare**.

- **The live-resident + recorded toggle** ([live-resident-api.md](./live-resident-api.md)) — E1
   (a **live** impl of r1's `Resident` interface) + E3 (the **`--live`/`--stub`** selection,
   *recorded*, never a silent stand-in).
- **The live-walk sibling** ([live-walk.md](./live-walk.md)) — E2: a **full Gates-1–9 live lane**
   over the throwaway feature emitting **001's log union** (no new `recordType`), plus the broken
   R3 vector.
- **`LiveModelReady`** ([live-ready.md](./live-ready.md)) — E5: the **falsifiable** probe, an
    **extension of r1's `runtime-ready.ts` + r2's `overlay-ready.ts`** (live-path wiring +
   PASSES-emit + recorded `--stub` + deterministic render + a blocking headless Gate 0 +
   zero-cloud; a `--broken` hook names the R3 gap).

**What r3 does *not* re-declare** (001 + r1 + r2 stay canonical — imported/extended, duplicated
nowhere; D8/NC3):

| contract | lives at | used by r3 |
|----------|----------|-----------|
| `Resident` interface (`run/model/tier`) + the deterministic **stub** | `kiln/src/stub-resident.ts` | r3 adds a **live impl** (E1) and the `--stub` **selects** the existing stub (E3) |
| `FactoryState` / `RoadmapRow` / `Gate0` / `FactoryRecord` union | `kiln/src/types.ts` | the store + shapes the live walk + overlay drive (001) |
| `FactoryEvent` union + `onEvent` (event ⇒ new state, P-IX), incl. r2's `gate0_open`/`roadmap_row_done` | `kiln/ui/factory-state.ts` | the events E4's live TUI redraws on (r1+r2, *inherited*) |
| the gate primitive (open/wait/resume-by-token/auto-approve/veto-halt) | `kiln/src/gate.ts` | r3's live **gates** resolve the same way (r1) |
| the factory-log **writer** + the **R3** write-time no-silent-approval guard | `kiln/src/log-writer.ts` | a live, decider-less completion **still throws** (r1) |
| the affinity scheduler + `switchCount` + `bindRole` (LoD = `strongest`) | `kiln/src/scheduler.ts`, `kiln/src/roles.ts` | the live sequence's switches == `switchCount`; every LoD role on `strongest` (r1) |
| the log validator (R1–R6; already accepts the union; **names R3**) | `kiln/validate/log.ts` | **the dogfood boundary** the live JSONL must **PASS** / broken must **FAIL R3** |
| roadmap schema + admission guard (M1–M4) | `kiln/schemas/roadmap.schema.json`, `kiln/validate/roadmap.ts` | the program head r3 **fires** is validated here |
| Layer C render (`overlay.ts`) + the **distinct Gate-0 face** + `OverlayCReady` | `kiln/ui/overlay.ts`, `kiln/ui/gate0-face.ts`, `kiln/validate/overlay-ready.ts` | E4's live TUI path **composes on** r2's render + twin; `LiveModelReady` **composes on** `overlay-ready` |
| `runtime-ready.ts` | `kiln/validate/runtime-ready.ts` | `LiveModelReady` **composes on** it (emits PASSES-emit + zero-network) |
| the **admitted program** (`gate0.status: approved`, `human@batorfi`) | `[specs/ROADMAP.md](../../../ROADMAP.md)` | r3 **FIRES** it + **re-opens** Gate 0 at its close; the admission is a **human record**, r3's is not it |
| r1's `RuntimeReady` + r2's `OverlayCReady` probes | `kiln/validate/{runtime-ready,overlay-ready}.ts` | `LiveModelReady` **composes on both**, running no gate |

**The dogfood boundary (the heart of r3):** *the live walk r3 emits must be **validatable by the
contracts 001 + r1 + r2 already built**.* Concretely — a **live, full-nine-gate** walk over the
throwaway emits transition/`gate-completion`(human `decidedBy`)/`cost`/`pre-delegation`/`wait`
JSONL to `kiln/factory-log/`; that JSONL **replayed through `kiln/validate/log.ts` (unmodified)
must PASS** (SC-001), and the **broken** no-`decidedBy` vector **FAILs R3, named** (SC-002→SC-003);
the **rendered/program head** the overlay draws still validates under `kiln/validate/roadmap.ts`
(M1–M4), and a `--stub` selection is **recorded** in the log where its absence **fails**
`LiveModelReady` (SC-006, NC2/`F-NOT-SILENT`).

## Composition

```
001 (declares shapes + the log union + the gate0 vocab + the roadmap head) ──▶
r1 (runs the spine + Layers A/B + RuntimeReady; NC1 defers the live proof to r3) ──▶
r2 (renders Layer C + the Gate-0 face + OverlayCReady; its NC1 → the live TUI smoke is r3) ──▶
r3 (a LIVE-resident impl + the --live/--stub toggle + a live-walk sibling + a live ctx.ui path
   over r2's render + LiveModelReady) ── emits a LIVE JSONL ──▶
       001's kiln/validate/log.ts        (the full-nine-gate live walk PASSES; broken → named R3)
       001's kiln/validate/roadmap.ts    (the FIRED program head still PASSES / M3 guards the gate0 record)
       r1's kiln/validate/runtime-ready.ts ─▶ r2's kiln/validate/overlay-ready.ts ─▶
           r3's kiln/validate/live-ready.ts (LiveModelReady: live-path wiring + PASSES-emit +
              recorded --stub + deterministic render + a blocking headless Gate 0 + zero-cloud —
              a --broken hook NAMES the R3 gap; runs NO gate, admits NO program)
```

R3 **advances no gate and admits no program**: its `LiveModelReady` *asserts the live net*; the
gates the live walk opens resolve on a **human move** (or a *distinct* `pre-delegation` on the
tail); the program admission is `specs/ROADMAP.md` (Principle VI); the emitted **live** log (with
its **recorded** `--stub` selection) is the audit trail that proves it (Principle VII).
