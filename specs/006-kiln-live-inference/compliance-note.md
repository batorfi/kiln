# Compliance note — 006-kiln-live-inference (r7)

**Verdict: COMPLIANT, with one declared and human-authorized exception (P-VIII, NC2=A) and one declared signature
widening (`Resident.run`, NC1=B).** Every principle is traced to a proof that was **run**, not asserted; results are in
[quickstart-run.md](./quickstart-run.md). r7 admits **no** program and advances **no** gate (P-VI): `specs/ROADMAP.md` has
**no diff**, and the only `gate0` record in the committed fixture is a `wait` — a *re-open* at the row's own close.

## Principle → proof

| # | Principle | Verdict | Proof |
|---|---|---|---|
| **I** | Author/judge separation | ✅ | The Ollama resident *runs* work and never decides a gate. The live fixture's every gate carries a human `decidedBy` or a distinct `pre-delegation`; its no-`decidedBy` sibling **FAILs `log.ts` with a named R3** (`r7-live-broken.jsonl` → `FAIL — R3 record seq=12 … (no-silent-approval)`) |
| **II** | Lines of defense are strongest | ✅ | `bindRole` is unchanged. Live: a weaker binding **throws synchronously, before any model call** (`affinity.test.ts`: `roundTrips()` is unchanged after the throw) — P-II's "rejected at schedule time, before anything runs" is literal |
| **III** | One lane, one resident | ✅ | `F-SINGLE` holds over **27 live snapshots**; a forged two-running sequence still throws. **Async did not become concurrency** (FR-015a): a static scan finds no `Promise.all/race/any/allSettled` in `kiln/src`; a measured wrapper shows **max 1 unit in flight** against both a slow stand-in and the real model; and the resident itself **refuses** a second concurrent `run` (`concurrent-run`) |
| **IV** | Affinity is the only cost lever | ✅ **+ first measurement** | Realized switches `3 == switchCount`. And the first-ever assertion of the *"Testable as:"* clause: `[P-IV] gemma4:12b: cold 2760 ms · warm 452 ms · 6.1×`. **Note:** the ratio is not a constant — ~64× on a first-ever load from disk, 6.1× with the weights in the OS page cache — so the test asserts a *conservative floor* (≥2× and ≥500 ms), never the observed number |
| **V** | Headless never silently approves | ✅ **extended to the suite** | `OllamaReady`: **`skipped ⇒ ¬ready ∧ a non-empty `skipReason`** (R3). With no Ollama the live tier skips **with a printed reason** — never a silent pass. `F-NOT-SILENT` inherited and re-asserted in check (d) |
| **VI** | Gate 0 is human-only | ✅ | r7 emitted no admission. `git diff specs/ROADMAP.md` empty; fixture `gate0` records = `["wait"]`. r7 *re-opens* Gate 0 at its close; `r4 → r6` await the human |
| **VII** | Everything recorded | ✅ | The resident's identity and a **symbolic** location (`resident selection → live model=gemma4:12b @ loopback (NC2-A: local, not cloud)`) ride r3's existing `transition.reason` slot. The ledger records *that* a unit ran and *on which resident* — **never the prompt or completion** (asserted). The r3 record is corrected (below) |
| **VIII** | Local-first, no cloud | ⚠️ **declared exception — see below** | One loopback call from **one** allowlisted module; the guard that polices it is **strictly stronger** than before |
| **IX** | Three UI layers, event-driven, no server | ✅ | **`kiln/ui/*` has no diff since r7 began** (asserted against git). The UI stayed wholly synchronous; no surface awaits, polls, or opens a socket |

## The declared exception — P-VIII (NC2=A, human-authorized 2026-09-19)

r7's deliverable is genuine local inference, so it makes a real network call: **loopback HTTP from
`kiln/src/ollama-resident.ts`**, the **only** module on the allowlist. The constitution's *"Testable as:"* clause for P-VIII
targets **external** round-trips; `127.0.0.1` is local. The exception was granted on one condition — **the guard ends up strictly
stronger than before** — and that condition is *demonstrated*, not claimed:

| | before r7 | after r7 |
|---|---|---|
| Files scanned by `runtime-ready` / `live-ready` | **0** (the `fileExists(dir)` = `isFile()` bug skipped every directory) | **33** |
| Does `overlay-ready` scan `kiln/src`? | **no** (`ui`/`contracts`/`validate` only) | **yes** |
| A planted external `import` + `require("http")` + bare `fetch` in `kiln/src` | **all three probes green** | **all three red**, naming the file |
| A bare `fetch` (needs no import) | invisible to any pattern | caught by a **call-based** pattern |
| `import … from "node:http"` / `node:net` / `node:child_process` | waved through (*every* `node:` specifier was) | caught |
| A scan that examines **zero** files | passed | **fails** (never vacuous) |
| Who may reach loopback | n/a | **exactly one** module, by kiln-relative path `src/ollama-resident.ts`; a second entry is refused (`--extra-loopback`); a same-named file in another directory does **not** inherit it |
| Which host may it reach | n/a | **loopback only**, enforced at construction — **including a host supplied via `OLLAMA_HOST`**, so an env var cannot redirect the lane to a remote box |

The strictly-stronger property is a **test** (`kiln/tests/netscan/strictly-stronger.test.ts`): it reproduces the *old* regexes
verbatim and asserts `old-caught ⊆ new-caught` over a corpus, then lists what is newly caught.

## The declared signature widening — `Resident.run` (NC1=B)

`run(workUnit): unknown | Promise<unknown>` — a **union**, so r1's stub and r3's adapter stay conforming and their
implementations are **unedited**. The async change landed in the callers. **Nothing else in 001's canonical surface changed**:
`git diff --stat c99e241..HEAD` over `kiln/validate/{log,roadmap,_core,_report}.ts`, `kiln/schemas/`,
`kiln/contracts/move-vocabulary.ts`, `kiln/src/roles.ts` and `kiln/ui/` is **empty**, asserted by
`kiln/tests/netscan/untouched.test.ts`. R5 needed no amendment: it scans record **keys**, not values.

## Where implementation departed from the plan (recorded, P-VII)

The plan was right in shape and wrong in six details. Each was found by running something, and each is fixed in the code.

| # | Plan said | What was found / done |
|---|---|---|
| 1 | **D2:** `buildProgramWalk` becomes async | It awaits **no** resident (only emits records), so it stays **synchronous** — the `twin`, `inter-row` and `run-program` sites and three `overlay-ready` sites needed no `await`. Conversely `buildStubWalk` made **two direct `resident.run` calls** (`walk.ts:56-57`) the call-site count missed, and the three probe *test* files needed awaits T011 didn't list |
| 2 | **D3:** "a bare `async schedule` makes `assert.throws` pass silently" | **Wrong in detail.** Measured: `assert.throws` against an async function **fails loudly**. The real vacuity is `assert.doesNotThrow(() => schedule(lod, …))` (`scheduler.test.ts:35`), which passes on a *rejection*. The design conclusion stands but is simpler: **`schedule` is a non-`async` function** that calls `bindAll` synchronously and returns the run promise, so the P-II throw stays synchronous and `assert.throws` is **unchanged**; the accepting test became `assert.doesNotReject` |
| 3 | **D8/A5:** a *probe* handed a Promise must fail named | The hazard is at the **test callers**, not inside probes. Measured by running the suite un-awaited: every probe test crashed *loudly*; **exactly one** assertion passed vacuously. But a lone `assert.ok(!broken.ready)` — the natural way to write a falsify test — *would* have. The guard is therefore a **static scan** (every async-spine call is awaited/returned), with planted cases and a **mutation test** |
| 4 | **R6:** allowlist `["ollama-resident.ts"]`; loopback "or `$OLLAMA_HOST`" | Allowlist is the kiln-relative **path** `src/ollama-resident.ts` (a bare basename would let a same-named file elsewhere inherit it); `OLLAMA_HOST` is honoured **only if it names loopback** |
| 5 | **D6:** the scan is *fetch-blind* | It was **vacuous** — see the table above. Also added: a network/process-module denylist (bare and `node:`), comment stripping, and the never-vacuous guard |
| 6 | **FR-015:** `Resident.run` is the *only* widened signature | Wiring a real resident into r3's walk needed **additive optional** fields: `resident`/`location` on `SelectResidentOptions` and `LiveWalkOptions`, an optional `location` parameter on `residentSelectionMarker`, and `outputs` on `WalkResult`/`LiveWalk`. Without them r3's behaviour is **byte-identical** (proved by regenerating four logs and by `recorded-selection.test.ts`), but the letter of FR-015 is *"one signature"*, and this is honestly *"one signature + optional additions"* |

## Known limits (stated, not hidden)

- **The lane's `swap` is still bookkeeping.** `lane.run` records `swap {from: X, to: X}` — the same model on both sides —
  because one resident object stands for the lane. r7 measures the *real* cost of a model load (cold vs warm, via
  `keep_alive`), but does **not** map tiers to different models or perform a genuine two-model swap. That is beyond this spec
  and is the natural next step for P-IV.
- **No type checker runs.** The repo is zero-dependency and Node strips types, so `unknown | Promise<unknown>` is a *contract*
  (`unknown | X` collapses to `unknown` in TypeScript anyway). Runtime behaviour is what the tests guard.
- **This does not judge model quality** (FR-018). A 12B model wrote *"I have completed the unit tests for the 'spec'
  module"* for a spec unit — fluent, plausible, unverified. That is what the gate rail and the human are for; r7 proves the
  kiln *fires*, not that the model is *good*.
- **The live tier is gated** (`KILN_LIVE=1`, NC3=A) and can rot if nobody runs it. Mitigation: it holds the real invariants
  and the cost assertion, so running it exercises the actual spine; `npm run test:live` is one command.
- **Two validator findings from the Gate-0 proposal remain open** and are out of scope: `nextEligibleRow` counts an
  `aborted` row as satisfying a dependency (contradicting M2), and `checkM1`'s cycle detector follows only `deps[0]`.

## The r3 record was corrected (FR-014 / SC-010)

A dated, **append-only** correction banner (original text preserved verbatim — **0 lines deleted**; 150 lines added across the first seven, 26 more for r3's overview) now heads the
eight documents that carried a claim the evidence did not support: r3's `implementation-report.md`, `quickstart-run.md`,
`compliance-note.md`, `contracts/live-walk.md`, `contracts/live-ready.md`, and — added afterwards, because it was **missed the first time** (it was not on
FR-014's list of five) — its plain-language `overview.md`, which said r3 "fires a real local model" — **and** r1's and r2's `compliance-note.md`, because
the vacuous zero-network scan undermined their "zero-cloud" assurances too. `gate0.note` entries 4 and 5 in
`specs/ROADMAP.md` were **deliberately not touched**: the ledger is append-only, and entry 5 already records the correction.
r3 stays `done` @PR#3; everything it truly delivered still stands.

## Hand-back to the human (P-VI)

r7 is complete and **Gate 0 re-opens at this seam**. r4's deps `[r2, r3, r7]` are now all `done`, so **r4 becomes eligible** —
but `chain_unattended=false`, so it waits for the human's re-admission. Recorded for that decision: **`batorfi/kiln` is already
public**, so r4's remaining content is a curated release dist + manifest + `PublishedReady`, not "make the kiln reachable by URL".


---

## Post-review hardening (2026-09-20)

A code review ([code-review-report.md](./code-review-report.md)) found gaps that touched three principles; all are fixed, and the P-VIII exception's
"the guard ends up strictly stronger" condition is now *better* met:

- **P-VIII.** The loopback pin used to be only as deep as the *configured* host: a local service answering `307 Location: <elsewhere>` would have the
  prompt re-sent off-box. The resident now **refuses every redirect** (`redirect-refused`). The scan itself could be fooled by a `//` inside a string, and never
  read subfolders or `.js` files; it now uses a real tokenizer, recurses, and flags aliasing and computed loads. It is stated plainly to be a **lint, not a sandbox**.
- **P-VII / P-V.** A failed unit used to vanish: no ledger record, and the lane's slot left claimed. It now records a `hold` and a **durable `wait`** and reclaims the
  slot; the halt is a loud exception carrying the partial ledger, never a silent one.
- **The claim that `npm run test:live` is one command** — made in this note — was **false as shipped** (it ran zero tests and exited 0). It is true now, and a test
  asserts every script resolves and that a zero-test run fails.
