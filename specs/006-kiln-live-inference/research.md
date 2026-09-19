# Research — 006-kiln-live-inference (r7) · Phase 0

**Input**: [spec.md](./spec.md) (admitted 2026-09-19T20:24:57Z; NC1–NC3 resolved) ·
[../ROADMAP.md](../ROADMAP.md) row `r7` · [../../.specify/memory/constitution.md](../../.specify/memory/constitution.md)

**Status**: **complete — no `NEEDS CLARIFICATION` remains.** The three spec-level branches were
resolved by the human at gate 1 (NC1 = async HTTP + an async spine · NC2 = loopback is local, harden
the guard · NC3 = env-gated, skip-with-record). What remains are *realization* choices, pinned below
as **D1–D9**, each with the alternatives that were rejected and why.

**Inherited, not re-derived**: 001's substrate research (U1–U8: TypeScript, `node --test`, JSONL,
zero dependencies), r1's D1–D8 (the runtime modules + the stub resident + the dogfood pattern), r2's
D1–D8 (Layer C + `OverlayCReady`), r3's D1–D8 (the live walk + the recorded toggle +
`LiveModelReady`). r7 **extends** that chain; it re-declares none of it.

---

## D1 — Widen `Resident.run` by *union*, not by replacement

**Decision**: type the interface as

```
run(workUnit: WorkUnit): unknown | Promise<unknown>
```

and make every **caller** `await` it. Do **not** change `run` to `Promise<unknown>` outright.

**Rationale**: a union keeps **r1's `makeStubResident` and r3's `makeLiveResident` conforming
without a single edit** — both return plain values, and `await` on a non-Promise is a no-op pass
through. The async change therefore lands entirely in the *callers*, which is the smallest honest
diff that satisfies NC1 and keeps FR-015's "one declared exception" literally true: **one** signature
widens, and no existing implementation is rewritten.

**Alternatives rejected**:
- **`run(): Promise<unknown>` (strict)** — forces edits to both existing residents and every test
  double for no behavioural gain; converts a widening into a breaking rewrite of upstream shapes,
  which FR-015 forbids.
- **A second interface (`AsyncResident`)** — two interfaces for one role fork the single source of
  truth (P-IX) and would make `lane.run` branch on which kind it holds.

**Consequence**: the async boundary is `await resident.run(unit)` at `kiln/src/lane.ts:100`, and
propagates outward from there.

## D2 — The async propagation set: exactly which functions become `async`

**Decision**: async is threaded through **only** the functions that transitively await a resident.
Everything pure stays synchronous.

| Becomes `async` | Stays **sync** (pure / no resident) |
|---|---|
| `lane.yield_` | `lane.makeLane`, `hold`, `resume`, `snap` |
| `lane.run` | `lane.assertSingleLane`, `hasSwapTransition` |
| `scheduler.schedule` | `scheduler.switchCount`, `lodUnitsBoundStrongest`, `roles.bindRole` |
| `walk.buildStubWalk`, `walk.buildProgramWalk` | all of `kiln/ui/*` (pure renders) |
| `live-walk.buildLiveWalk` | `log-writer` (in-memory accumulator), `clock`, `gate.*` |
| `validate/runtime-ready.checkRuntimeReady` | `validate/log.ts`, `roadmap.ts`, `_core.ts`, `_report.ts` |
| `validate/overlay-ready.checkOverlayReady` | — |
| `validate/live-ready.checkLiveModelReady` | — |
| `validate/ollama-ready.checkOllamaReady` (new) | — |

**Rationale**: keeping the **UI layer wholly synchronous** preserves P-IX's "a render is a pure read
of one `FactoryState`" and the byte-identical-render property (SC-005 on r2/r3). Keeping
`assertSingleLane`, `switchCount` and `bindRole` sync preserves the existing negative tests as
*throws*, not *rejections* (see D3).

**Measured blast radius** (call sites that must gain `await`): **≈40**, distributed as
`kiln/src` 6 · `kiln/validate` **9** · `kiln/tests` ~25.

**The 9 in `kiln/validate` are the load-bearing ones** — they are the P-V/P-VIII proofs themselves
(`runtime-ready` 1, `overlay-ready` 3, `live-ready` 4, plus each probe's CLI entry). A probe that
silently fails to await a walk would report a *green* check on an *unbuilt* walk, which is precisely
the class of false-green this row exists to eliminate. **Therefore**: every probe's CLI entry gains an
explicit non-zero exit on a rejected promise, and D8 adds a test that a *forgotten* `await` is caught.

## D3 — Keep the G2/L1 config rejection synchronous by splitting `schedule`

**Decision**: split `scheduler.schedule` into a **sync validation half** and an **async run half**:

- `bindAll(units)` — **sync**; performs the `bindRole` loop that rejects a sub-`strongest`
  line-of-defense binding (P-II / G2 / L1).
- `schedule(units, resident)` — **async**; calls `bindAll` first, then `await run(...)`.

**Rationale**: `kiln/tests/scheduler/scheduler.test.ts:35,40` assert the config error with
`assert.throws(() => schedule(...))`. If `schedule` became a bare `async`, the throw would become a
**rejected promise** and `assert.throws` would silently pass on the *unrejected* promise object —
a false green in the P-II guard. Splitting keeps a **synchronous throw** available for the
configuration error while the run half is async.

**Alternatives rejected**:
- **Convert the tests to `assert.rejects`** — works, but it moves a *configuration* error (knowable
  with no model, no I/O, before anything runs) behind an await. P-II's value is that a weak judge is
  rejected **at schedule time, before anything runs**; keeping it sync keeps that property literal.

## D4 — Transport: `fetch` → `POST /api/chat`, non-streaming, thinking disabled

**Decision**: one `fetch` to `http://127.0.0.1:11434/api/chat` with

```
{ model, messages: [{role:"user", content}], stream: false, think: false,
  options: { temperature: 0, seed: <fixed>, num_predict: <bounded> } }
```

Read the visible reply from `message.content`. Host overridable by `OLLAMA_HOST` (default
`127.0.0.1:11434`); the model is a **plain name**, never a URL (P-VIII, inherited from r3).

**Rationale — all four choices are measured, not assumed** (`gemma4:12b`, this host):
- **`/api/chat` over `/api/generate`**: `/api/generate` with `num_predict: 12` returned
  `content: ''` — the budget went to hidden reasoning. `/api/chat` with `think: false` returned
  `'ready'`.
- **`think: false` is mandatory, not cosmetic**: without it the visible reply can be empty while the
  call "succeeds". This is FR-003's trap, and it is the reason an empty visible result must be a
  **named fault** rather than accepted work product.
- **`stream: false`**: a single response body keeps the resident a plain request/response and adds no
  incremental-parse state. Streaming is available and deliberately unused (it would serve a future
  live-HUD row, not this one).
- **`temperature: 0` + a fixed `seed`**: reproducibility, verified — two identical calls produced the
  same SHA-256 (`145fffff5196c371`, 356 bytes). This is what the subprocess path could not offer.

**Alternatives rejected**: the **`ollama run` subprocess** (NC1-A) — no `--seed`, no
`--temperature` (3 runs → 3 different digests), blocks indefinitely unless stdin is closed, and emits
ANSI spinner codes plus interleaved `Thinking…` on a TTY. A **pinned Modelfile** would restore
determinism but makes the committed fixture depend on a locally-built model tag.

## D5 — R5 needs **no** amendment: it scans keys, not values

**Decision**: record the resident's identity and location as a **value** in r3's existing
`transition.reason` slot — e.g.

```
resident selection → live model=gemma4:12b @ loopback (NC2-A: local, not cloud)
```

**and change `kiln/validate/log.ts` not at all.**

**Rationale**: `checkLocalFirst` walks `Object.keys(...)` and compares **key names** against
`FORBIDDEN_KEYS`; record **values are never inspected**. So a reason string naming a loopback
resident already passes R5 today, while a record carrying an actual `url:`/`endpoint:` **key** still
fails. FR-012 is therefore satisfied by a **documented convention**, not a validator change — the
smallest possible change to a canonical 001 artifact, and one fewer upstream edit than the spec
anticipated.

**Deliberate restraint**: the reason records a **symbolic** location (`@loopback`), not a raw
address. A ledger is for reconstructing decisions, and `127.0.0.1:11434` is noise in that record.

**Alternatives rejected**:
- **Add an `ALLOWED_FLAG_KEYS`-style loopback key** — a real change to 001's canonical validator,
  buying nothing that the existing slot does not already give.
- **Record nothing** — fails FR-012/P-VII: a closed terminal must know which resident ran.

## D6 — The hardened scan: call-based detection + a named single-module allowlist

**Decision**: extend the zero-network scan (shared by `runtime-ready`, `overlay-ready`,
`live-ready`, `ollama-ready`) with:

1. **A call-based pattern** catching `fetch(`, `http.request(`, `https.request(`, and
   `new URL(` on a non-loopback literal — in addition to today's import/primitive patterns.
2. **A single-module allowlist by name** (`LOOPBACK_ALLOWLIST = ["ollama-resident.ts"]`). Any
   **other** module in `kiln/src`, `kiln/ui`, `kiln/validate`, `kiln/contracts` making such a call
   fails, **named**.
3. **A loopback-literal assertion** on the allowlisted module: its target must resolve to
   `127.0.0.1`/`localhost`/`$OLLAMA_HOST`; a public host in that module fails too.
4. **`kiln/src` is now in scope** for the `fetch(` check — today only `kiln/ui` is scanned for it
   (`tests/ui/ui.test.ts:56`, `tests/live-tui/live-tui.test.ts:46`).

**Rationale**: the present guard is import-and-primitive based and was **verified not to catch a
`fetch`** — both `NET_PRIMITIVE` and `EXTERNAL_IMPORT` were run against a realistic loopback
resident and neither tripped. So r7 would otherwise consume a P-VIII exception that its own guards
cannot see. The scan must end up **strictly stronger** than before, which is the whole bargain of
NC2-A.

**Alternatives rejected**:
- **Allowlist a directory** — too coarse; a second module could quietly acquire network reach.
- **Drop the scan on the live module** — would make the P-VIII check decorative exactly where it
  matters most.

## D7 — `OllamaReady`: a probe that *dials*, and skips with a record

**Decision**: a fourth probe, composing on `live-ready` (which composes `overlay-ready` →
`runtime-ready`), asserting in order:

| # | Check | Falsify hook |
|---|---|---|
| a | endpoint answers (`GET /api/tags`, bounded timeout) | `--no-endpoint` |
| b | the **named** model is present in `/api/tags` | `--no-model` |
| c | one round-trip returns **non-empty visible** content | `--empty-visible` |
| d | the selection is **recorded** (r3's `F-NOT-SILENT`, inherited) | `--stub-unlogged` |
| e | a **fabricated** "live ran" marker with no round-trip is caught | `--forged-live` |
| f | the hardened scan (D6) is green and the allowlist has exactly one entry | `--extra-loopback` |

When (a) or (b) fails, the probe returns `ready:false` **with a recorded reason** and the live tier
**skips** — it never reports success (NC3-A, FR-006).

**Rationale**: (e) is the check that distinguishes r7 from r3. r3's `LiveModelReady` asserts the live
path *exists and is wired*; a deterministic adapter satisfies that. (c)+(e) together assert a call
*happened* and *returned model output*, which is the claim r3 could not make.

**Alternatives rejected**: folding these into `live-ready` — r3's probe is a *static* proof and must
stay runnable with no Ollama present; mixing a dialling check into it would make r3's own green
conditional on a model.

## D8 — Guard the async change itself: a forgotten `await` must fail loudly

**Decision**: add a negative test asserting that **an un-awaited walk cannot produce a green probe**
— i.e. a probe fed a `Promise` where it expects a `WalkResult` fails **named**, rather than reading
`undefined` fields as absent-and-fine.

**Rationale**: this is the specific new failure mode D2 introduces, and it sits inside the P-V/P-VIII
proofs (the 9 `validate/` call sites). Without it, the async refactor could convert a real check into
a false green — the same defect class as the `fetch`-blind scan, reintroduced by r7's own change.
r7 must not ship a new way to be silently wrong.

## D9 — Fixture location: `kiln/fixtures/`, not `kiln/factory-log/`

**Decision**: the committed live fixture (FR-009) lives at
`kiln/fixtures/r7-live-inference.jsonl`.

**Rationale**: the root `.gitignore` ignores `kiln/factory-log/*.jsonl` (keeping only `.gitkeep`), so
a fixture placed there **cannot be committed** and log replay would silently have nothing to replay.
`kiln/fixtures/` already exists and is empty — this is what it is for. Runtime logs stay in
`kiln/factory-log/` (ignored); the *committed evidence* lives in `kiln/fixtures/`.

**Capture discipline**: the fixture is produced by a real live run, committed once, and re-generated
only by an explicit command — never silently rewritten by a test, so replay is stable while the
resident is not.

---

## Open, deliberately (not blocking)

- **The cost-assertion threshold** (FR-008/SC-005). Reference measurement on this host: **18.04 s
  cold vs 0.28 s warm (64×)**. The asserted margin must tolerate a 135 GB `strongest` model without
  timing out the gated suite. Pinning the exact ratio and timeout is a low-risk `/speckit.tasks`
  choice; a conservative floor (switch ≫ work by a wide margin) is what SC-005 actually requires.
- **The default model name** (FR-013). `DEFAULT_LOCAL_MODEL` is currently `ollama/llama3.2:3b`, not
  installed here. The *mechanism* is settled — `OllamaReady` check (b) catches staleness
  automatically — so the concrete name is an `implement` detail, chosen from what `/api/tags` reports.
- **Two recorded validator findings** carried from the Gate-0 proposal, **out of r7's scope**:
  `nextEligibleRow` counts `aborted` as dep-satisfying (contradicting M2), and `checkM1`'s cycle
  detector follows only `deps[0]`. Both belong to a later hardening row, not here.

## Trace

D1/D2/D3 → FR-015, FR-015a, NC1 · D4 → FR-001, FR-003, FR-009 · D5 → FR-012, P-VII/R5 ·
D6 → FR-010, FR-011, SC-007, NC2 · D7 → FR-005, FR-006, SC-002, NC3 · D8 → FR-007, SC-004 ·
D9 → FR-009, SC-006.
