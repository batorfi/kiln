# Data Model — 006-kiln-live-inference (r7) · Phase 1

**Input**: [spec.md](./spec.md) (E1–E5) · [research.md](./research.md) (D1–D9)

**Scope note**: r7 adds **no new factory-log `recordType`** and **no new persisted shape**. Every
record it emits is drawn from 001's union (`transition` / `cost` / `human-decision` /
`gate-completion` / `pre-delegation` / `wait`), exactly as r1/r2/r3 did. What follows are the
**runtime entities** and the **one widened signature** (D1), plus the validation rules each carries.

---

## E1 — `OllamaResident` (the live resident)

The first implementation of r1's `Resident` that performs a **real** call.

| Field / method | Shape | Rules |
|---|---|---|
| `run(unit)` | `Promise<unknown>` | **D4**: one `POST /api/chat`, `stream:false`, `think:false`, `temperature:0`, fixed `seed`, bounded `num_predict`. Resolves to the unit's work product. **Never decides a gate** (P-I). |
| `model()` | `string` | A **plain model name** (`gemma4:12b`), never a URL (P-VIII, inherited from r3). Must resolve in `/api/tags` (FR-004). |
| `tier()` | `Tier` | Reported tier. Line-of-defense roles still bind `strongest` via the **inherited** `bindRole` — unchanged (P-II). |
| `host` *(internal)* | `string` | `OLLAMA_HOST` or `127.0.0.1:11434`. **Must be loopback** (D6 check 3). Never surfaced into a log **key** (D5). |

**Validation rules**
1. **Non-empty visible output** — an empty `message.content` is a **named fault**, not work product
   (FR-003; the measured `/api/generate` trap).
2. **Model must exist** — a name absent from `/api/tags` fails **by name** at start-up; no silent
   substitution, and any stub fallback stays **recorded** (FR-004, r3's `F-NOT-SILENT`).
3. **Bounded failure** — an unreachable host, a timeout, or a non-2xx is a named failure or a durable
   `wait`; never an indefinite block, and never an auto-approved gate.
4. **Never a decider** — the resident produces; a human `decidedBy` (or a distinct `pre-delegation`)
   decides (P-I).

**Relationships**: implements the *same* `Resident` interface as `makeStubResident` (r1) and
`makeLiveResident` (r3). Both of those remain **conforming and unedited** under D1's union widening.

---

## E2 — The widened `Resident.run` contract (the one declared signature change)

```
run(workUnit: WorkUnit): unknown | Promise<unknown>     // was: unknown
```

**State transition of the lane** (unchanged in shape, now awaited):

```
cold ──load──▶ resident held ──yield──▶ unit in flight ──await──▶ reclaimed ──▶ next unit
                     │                                                             │
                     └────────────────── swap (only on a genuine tier change) ◀─────┘
```

**Invariants that must survive the change**
| Invariant | Where proved | Rule under async |
|---|---|---|
| `F-SINGLE` (P-III) | `assertSingleLane` over per-step snapshots | **Exactly one** unit in flight at any awaited instant. No `Promise.all`, no overlapping units (FR-015a). |
| `switchCount` (P-IV) | `scheduler.switchCount` vs realized swaps | Unchanged — counting is pure and stays sync. |
| G2/L1 (P-II) | `bindRole` via `bindAll` | **Stays a synchronous throw** (D3), so a config error is still rejected *before anything runs*. |
| Byte-identical render (P-IX) | `kiln/ui/*` | UI stays **wholly synchronous** (D2); no surface awaits. |

**Async propagation set**: see [research.md D2](./research.md) — `lane.yield_`, `lane.run`,
`scheduler.schedule`, the three walk builders, and the four probes' `check*` entries. Everything pure
stays sync.

---

## E3 — `OllamaReady` (the dialling probe)

| Field | Shape | Meaning |
|---|---|---|
| `ready` | `boolean` | All checks passed. |
| `checks` | `Check[]` | Per-check `{ name, ok, detail }` trace (the r1/r2/r3 `Check` shape, imported). |
| `skipped` | `boolean` | True when a precondition (endpoint / model) is absent. |
| `skipReason` | `string?` | **Required when `skipped`** — the recorded reason (FR-006). A `skipped` result with no reason is itself a violation. |
| `live` | `LiveModelReadyResult` | The composed r3 probe it rides on. |

**Checks and falsify hooks**: a–f per [research.md D7](./research.md).

**Validation rules**
1. `skipped === true` ⇒ `ready === false` **and** `skipReason` non-empty. A skip is **never** a pass
   (P-V lifted to the suite).
2. Each falsify hook flips `ready=false` **naming itself** (SC-002).
3. The probe **never** advances a gate or admits a program (P-VI / SC-009).

---

## E4 — The committed live fixture

| Field | Value |
|---|---|
| Path | `kiln/fixtures/r7-live-inference.jsonl` (**D9** — `kiln/factory-log/*.jsonl` is git-ignored) |
| Content | One real live run's emitted JSONL, 001's union only, **no new `recordType`** |
| Replay | Must **PASS** 001's *unmodified* `kiln/validate/log.ts` (R1–R6) |
| Broken sibling | A no-`decidedBy` variant must **FAIL** with a **named R3** |
| Regeneration | Explicit command only; never silently rewritten by a test |

**Why it exists**: determinism holds in-process (verified identical at `temperature:0` + fixed seed)
but **not** across model reloads or Ollama upgrades. Replaying a committed artifact keeps the R1–R6
suite stable while the resident is not (FR-009).

---

## E5 — The switch-cost record (P-IV, measured)

| Field | Shape | Rule |
|---|---|---|
| `coldMs` | `number` | Load-and-generate from an unloaded model. |
| `warmMs` | `number` | The same call with the model resident. |
| `ratio` | `number` | `coldMs / warmMs`. **Must exceed the asserted floor** (SC-005). |

Reference measurement on the operator's machine: **18 040 ms cold · 280 ms warm · 64×**.

**Rules**: lives in the **gated** tier (NC3-A) — it loads and unloads real models. It asserts a
**conservative floor** (switching ≫ work), not the observed 64×, so a faster machine or a smaller
model does not turn a true claim into a red suite. This is the first assertion of P-IV's
*"Testable as:"* clause anywhere in the tree.

---

## E6 — The P-VIII boundary declaration (the hardened guard)

| Element | Shape | Rule |
|---|---|---|
| `LOOPBACK_ALLOWLIST` | `readonly string[]` | **Exactly one** entry: the live resident module. A second entry fails check (f). |
| call-based patterns | `RegExp[]` | `fetch(`, `http.request(`, `https.request(`, non-loopback `new URL(` — **in addition to** today's import/primitive patterns. |
| scan scope | `string[]` | `kiln/src`, `kiln/ui`, `kiln/validate`, `kiln/contracts` — `kiln/src` is **newly** covered for `fetch(`. |
| loopback assertion | predicate | The allowlisted module's target must be loopback; `$OLLAMA_HOST` is honoured **only if it names loopback**. The allowlist key is the kiln-relative path `src/ollama-resident.ts`. |

**Validation rules**
1. A planted `fetch(` in a **non**-allowlisted `kiln/src` module **fails, named** (today: undetected —
   verified against the actual regexes).
2. The allowlisted module **passes by name**, and its target must be loopback.
3. The scan is **strictly stronger** than before: everything it caught previously, it still catches.

**Note (D5)**: 001's `kiln/validate/log.ts` is **unchanged**. R5 scans record **keys**, not values, so
the resident's symbolic location rides r3's existing `transition.reason` slot and needs no amendment.

---

## What r7 does **not** add

- **No new log `recordType`** — 001's union is closed and stays closed (P-IX, FR-015).
- **No new persisted store** — the only new committed file is the fixture (E4).
- **No change to `kiln/validate/log.ts`, `roadmap.ts`, the JSON Schemas, or `move-vocabulary.ts`.**
- **No new runtime dependency** — `dependencies: {}` holds; `fetch` is a Node global.
- **No concurrency** — one unit in flight, always (FR-015a, P-III).
- **No gate advance, no program admission** — r7 fires the admitted program and **re-opens** Gate 0
  at its close (FR-016, SC-009).

## Trace

E1 → FR-001..FR-004, P-I/P-VIII · E2 → FR-015, FR-015a, P-II/P-III/P-IV/P-IX ·
E3 → FR-005, FR-006, FR-013, SC-002/SC-003 · E4 → FR-009, SC-006 · E5 → FR-008, SC-005, P-IV ·
E6 → FR-010, FR-011, FR-012, SC-007, P-VIII.
