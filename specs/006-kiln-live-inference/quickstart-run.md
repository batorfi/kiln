# Quickstart run — 006-kiln-live-inference (r7)

**Result: PASS.** Every scenario **S1–S13** reproduces its "Expect" from [quickstart.md](./quickstart.md), and — unlike r1–r3 —
the live scenarios were run against a **real local model**. All output below was captured at `/speckit.implement`, on the
reference host: **Ollama 0.34.2** at `127.0.0.1:11434`, model **`gemma4:12b`**, Node **v26.8.2**.

The spine of r7 holds: a **real** model is fired through the **same** single lane; the resident's output is **captured** (not
discarded); a probe that *actually dials* fails a **claimed** live run that **performed** no round-trip (the check r3 could not
make); and the P-VIII guard that r7 *spends* an exception against ends up **strictly stronger** — and, on the way, r7 found and
fixed that the pre-r7 guard had been **vacuous** since r1.

## Result matrix

| Scenario | Command | Expect | Observed |
|---|---|---|---|
| **S1** | `node --test "kiln/tests/**/*.test.ts"` *(no `KILN_LIVE`)* | green with **no** Ollama needed | ✔ **196 tests · 184 pass · 0 fail · 12 skipped** in 0.8 s. Every skip prints its reason: `live tier not enabled: set KILN_LIVE=1 (needs a running local Ollama + an installed model)` — never a silent pass |
| **S2** | `ollama-ready.ts --no-endpoint` / `--no-model` | non-zero; `skipped`; a **non-empty** reason | ✔ exit 1 each. `SKIPPED (a skip is NEVER a pass): endpoint unreachable (endpoint-unreachable) — is Ollama running?…` and `SKIPPED …: model "kiln-no-such-model:0b" is not installed — the live tier cannot run`. The 2nd names the model — the stale-default class of bug is now caught automatically |
| **S3** | plant `fetch(` in `kiln/src`; `ollama-ready.ts --extra-loopback` | caught, **named** | ✔ exit 1: `named gap: …/kiln/src/_plant_tmp.ts: a network CALL (fetch/http.request/…) outside the loopback allowlist` (the plant was then removed). `--extra-loopback` ⇒ `FAIL — (f) … exactly ONE loopback allowlist entry` |
| **S4** | the ancestor probes + validators | PASS / READY, unmodified | ✔ `runtime-ready` · `overlay-ready` · `live-ready` all **READY** (exit 0) — `live-ready` runs with **no Ollama**, R5 held. `roadmap.ts` on `specs/ROADMAP.md` and `kiln/ROADMAP.md` → **PASS**; `log.ts` on `r1-walk.jsonl` → **PASS** |
| **S5** | `ollama-ready.ts` | `ready=true`, (a)–(f) traced | ✔ **READY** in 8.1 s: `(e) … 9 round-trip(s) performed for 9 unit(s) — the \`live @ loopback\` claim is backed by real calls` |
| **S6** | `KILN_LIVE=1 … ollama-resident` | output varies; is captured | ✔ 4/4 live: non-empty, **differs per unit**, **identical when the same unit is re-run** (temp 0 + seed 42), and a full nine-unit walk captures **9 outputs** and PASSes `log.ts` |
| **S7** | the six falsify hooks | each names itself | ✔ all exit 1, each tripping **only its own check**: `--empty-visible`→**(c)** · `--forged-live`→**(e)** · `--extra-loopback`→**(f)** · `--no-endpoint`→**(a)** · `--no-model`→**(b)** · `--stub-unlogged`→**(d)** + the composed r3 probe |
| **S8** | `KILN_LIVE=1 … live-inference` | F-SINGLE · switches · P-II · no concurrency | ✔ **F-SINGLE holds over 27 live snapshots**; a forged two-running sequence still throws; **switches 3 == 3**; a weaker LoD binding **throws synchronously, before any model call** (`roundTrips()` unchanged); **max units in flight = 1** against the real resident |
| **S9** | `KILN_LIVE=1 … switch-cost` | cold ≫ warm, above the floor | ✔ `[P-IV] gemma4:12b: cold 2760 ms · warm 452 ms (median of 3: 433, 452, 525) · ratio 6.1×` — the **first assertion of Principle IV's "Testable as:" clause in the tree** |
| **S10** | `log.ts` on both fixtures | PASS / named R3 | ✔ `r7-live-inference.jsonl` (25 records, **captured from `gemma4:12b`**) → **PASS**; `r7-live-broken.jsonl` → `FAIL — R3 record seq=12 (gate-completion) (no-silent-approval)` |
| **S11** | `--test negative/async-await` | un-awaited ⇒ named failure | ✔ 4/4. The scan is **mutation-tested**: dropping a real `await` in `live-ready.ts` made it fail; restoring the file made it pass |
| **S12** | `git diff specs/ROADMAP.md`; `gate0` grep | no diff; only a `wait` | ✔ **ROADMAP.md: NO DIFF**; the only `gate0` record in the fixture is `["wait"]` — no `gate0: approved` emitted by the build |
| **S13** | resident grep; diff of 001's artifacts | recorded; 001 untouched | ✔ `resident selection → live model=gemma4:12b @ loopback (NC2-A: local, not cloud)`; `git diff --stat c99e241..HEAD -- <001 canonical + kiln/ui>` → **(empty)** |

## The whole suite, live tier on

```
$ KILN_LIVE=1 node --test --test-concurrency=1 "kiln/tests/**/*.test.ts"
  ℹ tests 196   ℹ pass 196   ℹ fail 0   ℹ skipped 0        (33 s)
```

`--test-concurrency=1` is **required** for the live tier: `node --test` runs files in parallel by default and the cost test
*unloads the model*, which would disrupt the others and contaminate its own timings. It is baked into the
`live-inference`, `switch-cost` and `test:live` npm scripts.

## What the refactor did NOT change (the async spine, NC1=B)

The async change touched ~40 call sites, so "no behavioural change" was **measured**, not assumed. The walks are
deterministic, so each pre-existing log was regenerated and **byte-compared** against the pre-refactor file on disk:

| walk | result |
|---|---|
| `r1-walk` (12 records) | **byte-identical** |
| `program-walk` (6 records) | **byte-identical** |
| `r3-live-stub` (25 records) | **byte-identical** |
| `r3-live-broken` (25 records) | **byte-identical** |
| `r3-live-walk` (25 records) | differs on **line 1 only** — the on-disk artifact had been left by a `--stub` run (`to: stub`); lines 2–25 identical; the regenerated `--live` log **PASSes** `log.ts` |

## The findings this run surfaced

These were not in the spec; they were found by *running* things, and each is recorded in the compliance note.

| # | Finding | Evidence |
|---|---|---|
| 1 | **The pre-r7 zero-network (P-VIII) scans were vacuous — since r1.** `runtime-ready` and `live-ready` guarded their loop with `fileExists(dir)`, i.e. `statSync(p).isFile()`, `false` for a directory, so they scanned **zero files**; `overlay-ready` never scanned `kiln/src`. | A planted external `import`, `require("http")` and a bare `fetch` in `kiln/src` left **all three probes green**. After the fix the same plant turns **all three red**, and every probe now reports `[33 files scanned]` |
| 2 | **r3's "live" resident never called a model**, and its default model was never installed. | no `fetch`/client/subprocess in `kiln/`; `DEFAULT_LOCAL_MODEL = "ollama/llama3.2:3b"` vs `/api/tags` |
| 3 | **`LiveModelReady` stays READY while `OllamaReady` FAILs** a forged live run — the gap r7 closes. | `falsify.test.ts`: `--forged-live` ⇒ `(e)` fails; `r.live.ready === true` |
| 4 | The **P-IV ratio is not a constant**: ~64× on a first-ever cold load from disk, **6.1×** when the weights are in the OS page cache. | reference 18 040 ms vs 280 ms (earlier); now 2 760 ms vs 452 ms. The test asserts a conservative floor, not either number |

## Setup checks

```
$ node kiln/validate/roadmap.ts specs/ROADMAP.md     → PASS
$ git diff --quiet specs/ROADMAP.md                  → no diff (r7 admitted nothing; Gate 0 is the human's)
$ git status --short kiln/fixtures                   → the two committed-evidence fixtures + provenance sidecar
```
