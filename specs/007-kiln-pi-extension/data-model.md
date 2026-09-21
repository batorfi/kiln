# Data model — r8 (KILN on Pi)

**Trace**: [spec.md](./spec.md) *Key Entities* · [research.md](./research.md) · [contracts/](./contracts)

r8 adds **no persisted data and no `recordType`** (FR-009). Everything below is an in-memory shape or a text artifact. The only durable thing r8 can cause is the `Wait` r1's `headlessWait` already defines.

## E1 — `PiPort` (KILN's own structural view of Pi)   · `kiln/pi/port.ts`

The *only* place Pi's shape appears in KILN. Structural types, **no import of Pi** (research D1).

| Member | Type (sketch) | Used by |
|---|---|---|
| `pi.registerCommand(name, { description, handler })` | `(name: string, o: { description?: string; handler(args: string, ctx: PiCtx): void \| Promise<void> }) => void` | the entry |
| `ctx.mode` | `"tui" \| "rpc" \| "json" \| "print" \| undefined` | capability |
| `ctx.hasUI` | `boolean` | capability (never alone — M5) |
| `ctx.cwd` | `string` | status |
| `ctx.ui.select(title, options, opts?)` | `Promise<string \| undefined>` | the seam |
| `ctx.ui.notify(message, level?)` | `void` | output |
| `ctx.ui.custom(factory, { overlay })` | `Promise<T \| undefined>` | self-test (tui only) |

**Rules.** (1) Nothing outside `kiln/pi/` reads a Pi type. (2) Anything KILN does not list here it does not call. (3) `mode` may be absent or a value KILN has never seen (a newer Pi) — that is a *valid* input that means **cannot ask**.

## E2 — `Capability`   · `detectCapability(ctx)`

| Field | Meaning |
|---|---|
| `mode` | the mode as reported, or `"unknown"` |
| `canAsk` | this run can put a question to a human and receive an explicit choice |
| `canDraw` | this run can host `ctx.ui.custom` (an overlay) |
| `why` | one line saying which rule decided it (for the log line and the self-test) |

Derived, not stored. The truth table is [contracts/pi-seam.md](./contracts/pi-seam.md) S2.

## E3 — `GateQuestion`

`{ title: string; options: readonly string[] }` — **there is no `timeout` field and no `signal` field**, so a gate dialog *cannot* carry one by construction (FR-008). `options` is non-empty and its members are distinct.

## E4 — `Outcome`

```
Outcome = { kind: "answered"; option: string }
        | { kind: "no-answer"; reason: NoAnswerReason }
NoAnswerReason = "cannot-ask"     // the mode has no way to reach a human (json / print / unknown / !hasUI)
               | "dismissed"      // undefined — cancelled, timed out, or closed
               | "not-offered"    // a string that is not one of the offered options
               | "wrong-type"     // anything that is not a string (e.g. a boolean)
```

**There is no third value** — no "default", no "implicit yes". `no-answer` carries the *reason* so the log line and the self-test can say why.

**Transition.** `no-answer` → `headlessWait(gate)` → a `Wait { gate, token, deadline }` (r1, unchanged). The seam **never** calls `applyMove`, `autoApprove` or `resumeByToken`. Only a later, explicit human move on the token can resolve the wait.

## E5 — `StatusReport`   · `kiln/pi/status.ts`

| Field | Meaning |
|---|---|
| `roadmapFound` | whether `specs/ROADMAP.md` exists under `ctx.cwd` and its head parses |
| `rows` | count of roadmap rows, and a count per status |
| `nextEligible` | `nextEligibleRow(rows)` or `null` |
| `lane` | always `"none"` in r8 — no lane exists in Pi yet |
| `line` | r1's `renderHud` of the idle `FactoryState` |
| `channel` | where it was sent (`notify` \| `stderr`) |

Idle `FactoryState`: `resident: null`, `running: null`, `queue: []`, `switches: 0`, `roadmap: <rows>`, `current: ""`, `gate0: { status: <head.gate0.status> }`, `gate: null`. Read-only; nothing written.

## E6 — `PiReadyResult`   · `validate/pi-ready.ts`

`{ ready: boolean; skipped: boolean; skipReason: string; piVersion: string | null; checks: Check[]; failures: PiReadyFailure[] }`.
`PiReadyFailure` is one of the **named** values in [contracts/pi-ready.md](./contracts/pi-ready.md) R2. **Skip is never a pass:** `skipped: true` implies `ready: false` and a **non-empty** `skipReason` (r7's R3, reused).

## E7 — The findings register

The SQ1–SQ11 table in [research.md](./research.md) Part B. Each row: question, answer, status (**M**/**D**/**T**/**→rN**), evidence, and remaining work. **Invariant:** at the close of r8 no row is blank, and no **D** cell is described as *confirmed*.

## E8 — Extension entry and manifest

`kiln/pi/index.ts` — `export default function (pi: PiPort['pi'])` plus `makeKilnExtension(overrides?)` (the injectable form the probe's mutant fixtures use). `kiln/package.json` → `"pi": { "extensions": ["./pi/index.ts"] }`.
The entry holds **no module-level mutable state** and starts nothing (FR-004).

## Relationships

`index.ts` → registers `status.ts` and `selftest.ts` handlers → both use `output.ts` (mode → channel) and `port.ts` (types, `detectCapability`) → `selftest.ts` asks through `outcome.ts`'s `askGate` → `interpret` → `headlessWait` (r1's `src/gate.ts`).
`validate/pi-ready.ts` → `validate/_pi-driver.ts` → a real `pi` process → `kiln/pi/index.ts`.
