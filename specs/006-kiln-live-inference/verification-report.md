# Verification report — 006-kiln-live-inference (r7)

**Verdict: VERIFIED — with one deviation from the spec's wording (F-1, decided: keep as is) and stated limits.** The feature works end to end against a **real local
model**, from a **clean clone of `origin/main`**, and its tests are demonstrably able to fail: **17 of 17 deliberate breakages
were caught**. One behaviour differs from the spec's wording (F-1, below) — it fails *loudly* rather than skipping. It is
safe, and the human decided (2026-09-20) to keep it.

| | |
|---|---|
| **Feature** | r7 — true live local inference (`specs/006-kiln-live-inference/`) |
| **Verified commit** | `471e1c6` — identical on `origin/main`, local `HEAD`, and the fresh clone |
| **Verified** | 2026-09-20 · macOS (Darwin 25.6.0) · Node v26.8.2 · Ollama 0.34.2 · 96 GB RAM |
| **Method** | Independent of the implementation run: a fresh `git clone`, then execution — not reuse of earlier output |
| **Not part of the verified commit** | this report, `implementation-report.md`, and a 2-line doc correction (F-2) — all uncommitted |

---

## 1. Scope and method

**What "end to end" meant here.** The feature's promise is: *a real model is fired through the same single lane, its output is
captured, a probe that dials proves it, the P-VIII guard that permits it is stronger than before, and the offline experience is
unchanged.* Each clause was exercised for real, not only asserted by a unit test.

| # | Activity | Why it is independent evidence |
|---|---|---|
| V1 | **Fresh clone of `origin/main`** into an empty directory | Proves the *pushed* state is self-contained — no reliance on git-ignored logs, local files or `node_modules` |
| V2 | Default (offline) suite — normally, and with the default endpoint **pointed at a dead port** | Proves "green with no Ollama" (NC3) rather than assuming it |
| V3 | Full suite with the **live tier on**, model starting **unloaded** | A genuine cold load, against the real server |
| V4 | Every probe, every falsify hook, 001's validators, and the five dogfood pipelines **regenerated then validated** | The clone has no logs, so each pipeline is rebuilt from scratch |
| V5 | A **fresh live capture**, compared byte-for-byte with the committed fixture | Proves the fixture is reproducible from a live run, not merely a frozen file |
| V6 | **A second, non-thinking model** (`qwen3-coder-next`, 51.7 GB) | Probes the one assumption everything else shares: unconditional `think:false` |
| V7 | **Mutation testing** — 17 deliberate breakages | Proves the tests can *fail*; a suite that cannot go red verifies nothing |
| V8 | Governance + static properties, by independent `grep` and a fresh live walk | Checked separately from the test suite that asserts them |
| V9 | **Requirement trace** — FR/SC → tests that actually appeared as passing | Generated from captured results, so a ✔ cannot be written by hand |

---

## 2. Results summary

| | Check | Result |
|---|---|---|
| V1 | Clone integrity | ✔ HEAD `471e1c6` = remote = local · 211 tracked files · **0** git-ignored logs · no `node_modules` · `dependencies: {}` |
| V2 | Offline suite | ✔ **196 tests · 184 pass · 0 fail · 12 skipped** (0.9 s) — all 12 skips carry a printed reason, **0 without one** |
| V2 | …with Ollama unreachable | ✔ **identical** (196/184/0/12); and `ollama-ready.ts` **SKIPS**, exit 1, with a reason — never a pass |
| V3 | Live tier (cold model) | ✔ **196 tests · 196 pass · 0 fail · 0 skipped** (36.2 s) · `[P-IV] cold 2740 ms · warm 441 ms · 6.2×` |
| V4 | Probes | ✔ `runtime-ready` · `overlay-ready` · `live-ready` · `ollama-ready` all READY; the first three each report **`[33 files scanned]`** |
| V4 | Falsify hooks | ✔ **13 of 13** exit 1: 7 ancestor hooks + 6 `OllamaReady` hooks (§4.3); each r7 hook trips **only** its own check (`--stub-unlogged` also trips the composed r3 probe, by design) |
| V4 | Validators + dogfood | ✔ `roadmap.ts` ×2, `firing-ready.ts`, `log.ts` on both fixtures; 5 pipelines regenerate → validate correctly (4 PASS, 1 FAIL-as-designed) |
| V5 | Fresh live capture | ✔ both regenerated ledgers **byte-identical** to the committed fixtures (`83ee1714…`, `07e01c36…`); only `capturedAt` differs |
| V6 | Non-thinking model | ✔ `qwen3-coder-next` answered with `think:false` accepted (cold 51.7 GB load, 14.7 s) — **no defect** |
| V7 | Mutation testing | ✔ **17 / 17 killed**, each by the intended test; every file restored |
| V8 | Governance / static | ✔ all clean (§4.7) |
| V9 | Requirement trace | ✔ **0 unmet** — FR-001…FR-018, FR-015a, SC-001…SC-010 |
| — | `KILN_LIVE=1`, Ollama down | ✔ **F-1** — 12 tests fail loudly instead of skipping; **decided: keep as is** |

---

## 3. Environment

```
date     2026-09-20T06:17:10Z         os       Darwin 25.6.0            node   v26.8.2
ollama   0.34.2                        RAM      96 GB (≈65 GB free)
models   gemma4:12b (7.6 GB, thinking) · muse-glimmer:30b-mlx (19 GB) · laguna-s-2.1:mxfp8 (135.8 GB)
         gemma4:31b-mlx (19 GB) · qwen3-coder-next (51.7 GB, NO thinking) · qwen3.8:27b-mlx (18 GB)
loaded   (none) at the start — so the first live call paid a genuine cold load
```

---

## 4. Detail

### 4.1 Offline tier — and the "no Ollama" claim, tested rather than assumed

```
$ node --test "kiln/tests/**/*.test.ts"                                   # clean clone, KILN_LIVE unset
   tests 196 · pass 184 · fail 0 · skipped 12                              # 0.9 s
   every skip:  live tier not enabled: set KILN_LIVE=1 (needs a running local Ollama + an installed model)

$ OLLAMA_HOST=127.0.0.1:1 node --test "kiln/tests/**/*.test.ts"           # the default endpoint is a DEAD port
   tests 196 · pass 184 · fail 0 · skipped 12                              # identical

$ OLLAMA_HOST=127.0.0.1:1 node kiln/validate/ollama-ready.ts
   SKIPPED (a skip is NEVER a pass): endpoint unreachable (endpoint-unreachable) — is Ollama running? …   # exit 1
```

### 4.2 Live tier (cold model, clean clone)

`KILN_LIVE=1 node --test --test-concurrency=1 "kiln/tests/**/*.test.ts"` → **196/196, 36.2 s**. The 12 live-tagged tests all
passed. P-IV, the first assertion of Principle IV's *"Testable as:"* clause: **cold 2740 ms · warm 441 ms (median 424, 441, 532)
· 6.2×** — reproducing the earlier 6.1× within noise. The ratio is **not a constant** (a first-ever load from disk measured ≈64×
before), which is why the test asserts a floor (≥2× and ≥500 ms), never the observed number.

### 4.3 Probes, hooks, validators, pipelines

| Probe | Exit | Note |
|---|---|---|
| `runtime-ready` · `overlay-ready` · `live-ready` | 0 · 0 · 0 | each `[33 files scanned]` — the pre-r7 scans examined **0** |
| `ollama-ready` | 0 | 8.0 s; `(e) 9 round-trip(s) performed for 9 unit(s)` |

| Falsify hook | Exit | Trips |
|---|---|---|
| `runtime-ready --broken` · `overlay-ready --broken-render` `--broken-gate0` · `live-ready --broken` `--broken-render` `--broken-gate0` `--stub-unlogged` | 1 ×7 | the named ancestor check |
| `ollama-ready --no-endpoint` | 1 | **(a)** · SKIPPED with a reason |
| `ollama-ready --no-model` | 1 | **(b)** · SKIPPED, names the model |
| `ollama-ready --empty-visible` | 1 | **(c)** only |
| `ollama-ready --forged-live` | 1 | **(e)** only — while r3's `LiveModelReady` stays READY |
| `ollama-ready --extra-loopback` | 1 | **(f)** only |
| `ollama-ready --stub-unlogged` | 1 | **(d)** + the composed r3 probe |

**Validators:** `roadmap.ts` on `specs/ROADMAP.md` and `kiln/ROADMAP.md` → PASS · `firing-ready.ts` → PASS · `log.ts` on
`r7-live-inference.jsonl` → **PASS**, on `r7-live-broken.jsonl` → **`FAIL — R3 record seq=12 (gate-completion) (no-silent-approval)`**.

**Dogfood pipelines** (each regenerated in the clean clone, then judged by 001's unmodified `log.ts`):

| Pipeline | Records | Result |
|---|---|---|
| `r1-walk` | 12 | PASS |
| `program-walk` | 6 | PASS |
| `r3-live-walk` | 25 | PASS |
| `r3-live-stub` | 25 | PASS |
| `r3-live-broken` | 25 | **FAIL, named R3** (as designed — exit 1) |

### 4.4 Fresh end-to-end capture → byte-identical to the committed fixture

```
$ node kiln/tests/dogfood/capture-fixture.ts        # clean clone, real gemma4:12b, 6.8 s
  PASS — captured 25 records from gemma4:12b (Ollama 0.34.2)
  r7-live-inference.jsonl   committed 83ee1714fdee56aa   regenerated 83ee1714fdee56aa   IDENTICAL
  r7-live-broken.jsonl      committed 07e01c36acd36667   regenerated 07e01c36acd36667   IDENTICAL
  meta differs from the committed file only in:  ['capturedAt']
```

The ledger records *that* a unit ran and on *which* resident — never what the model said — and the clock is deterministic, so
the JSONL is a pure function of the walk. A fresh live run therefore reproduces the committed evidence **exactly**.

### 4.5 Model coverage

| Model | Thinking | Result |
|---|---|---|
| `gemma4:12b` | yes | the whole suite; 9 real round-trips per walk |
| `qwen3-coder-next:latest` (51.7 GB) | **no** | ✔ `think:false` accepted; answered in 14.7 s including a cold load; unloaded afterwards |
| `muse-glimmer` · `gemma4:31b-mlx` · `qwen3.8:27b-mlx` | yes | **not exercised** |
| `laguna-s-2.1:mxfp8` (135.8 GB) | yes | **cannot load on this host** (135.8 GB > 96 GB RAM) — see §6 |

### 4.6 Mutation testing — the tests can fail

Each breakage was applied to the clean clone, the suite run, and the file restored (the clone was verified clean afterwards).

| ID | Deliberate breakage | Killed by |
|---|---|---|
| M1 | resident stops sending `think:false` | `O2: the request carries think:false…` |
| M2 | resident accepts **any** host | `P-VIII (NC2=A): a non-loopback host is REFUSED…` (+2) |
| M3 | an **empty** visible reply accepted as work product | `O3 empty-visible…` |
| M4 | resident stops refusing a concurrent run | `P-III / FR-015a: a second unit while one is in flight is REFUSED…` |
| M5 | `schedule` declared `async` (D3) | `US4 (P-II / G2): … REJECTED at schedule time` — confirming the **corrected** D3 finding |
| M6 | a weaker line-of-defense binding accepted (P-II) | `G2 every line-of-defense role rejects a weaker tier` (+4) |
| M7 | the **old vacuous scan** reinstated | `SC-007: a directory-level scan finds a planted violation…` (+2) |
| M8 | call-based network detection removed | `S3 (SC-007): the HARDENED scan catches a planted fetch(` (+4) |
| M9 | allowlist matches by **basename** | `R6: the exemption is by PATH…` |
| M10 | network-module denylist disabled | `strictly stronger (2/2)…` (+1) |
| M11 | a forgotten `await` in a probe | 18 tests, incl. the falsify suite |
| M12 | resident output no longer awaited/captured | 5 tests, incl. `A4 (dynamic, offline)…` |
| M13 | the model's **output leaks into the ledger** | `O6: … NEVER written to the ledger` |
| M14 | silent approvals no longer detected (P-V) | `US3 SC-002 (write-time): a silent approve is refused…` (+1) |
| M15 | Gate 0 can be auto-approved (P-VI) | `US2: Gate 0 is never auto-cruised…` |
| **M16** | `think:false` removed, against the **real** `gemma4:12b` | the resident raised **`empty-visible`**: *"returned NO visible content … a thinking model spending its whole budget on hidden reasoning"* — the hazard is **real**, and the guard names it |
| **M17** | round-trip counter removed, against the **real** probe | `OllamaReady` **(e)** FAILs: *"a CLAIMED live run is a PERFORMED one"* |

**17 / 17 killed.** M16 and M17 were run live because they only mean something against a real server.

### 4.7 Governance and static properties (independent of the test suite)

| Property | Evidence |
|---|---|
| **No new `recordType`** | a fresh live walk's 25 records use only `cost · gate-completion · human-decision · pre-delegation · transition · wait` |
| **The model's words never reach the ledger** | 9 captured outputs, **0** found in the JSONL |
| **Gate 0 not admitted by the build** | the only `gate0` record is a `wait`; no `gate0: approved` |
| **F-SINGLE / affinity live** | holds over **27** snapshots · switches **3 == 3** · max **1** unit in flight |
| **In-process determinism** | two consecutive live walks → identical outputs **and** identical ledgers |
| **001 canonical + `kiln/ui/*` + `specs/ROADMAP.md`** | `git diff c99e241..HEAD` → **empty** |
| **No network call outside the allowlisted module** | independent `grep` for `fetch(` / `http.request` / `node:http|net|tls|dns|child_process` in production dirs → none |
| **P-IX** | no timer / server construct in `kiln/ui` |
| **No concurrency primitive** | no `Promise.all/race/any/allSettled` in production code |
| **Zero runtime deps** | `dependencies: {}`, no lockfile |
| **Resident location recorded symbolically** | `resident selection → live model=gemma4:12b @ loopback (NC2-A: local, not cloud)`, and that value passes 001's unmodified `log.ts` |
| **001's R5 still rejects a remote key** | 001's own test `R5 a record with a nested cloud/remote field is flagged` **passed** in the live run |

### 4.8 Requirement trace

Generated from the live run's captured results: a requirement is ✔ only if **every** named test appeared as a *pass* and none as a
*fail*. Non-test requirements were checked by execution.

| Requirement | ✔ | Evidence |
|---|---|---|
| **FR-001** real resident | ✔ | `S6 (live): the output is the MODEL'S`; a nine-unit walk through the real lane |
| **FR-002** output captured | ✔ | `O6: … CAPTURED`; nine outputs from a fresh walk |
| **FR-003** empty-visible is a fault | ✔ | `O3 empty-visible`; `O2` (request carries `think:false`); **M16** live |
| **FR-004** model missing fails by name | ✔ | offline `O3 model-missing`; live `a model that is not installed fails BY NAME` |
| **FR-005** `OllamaReady` checks | ✔ | baseline + `S5 (live)` + all four r7 hooks |
| **FR-006** skip with reason; offline green | ✔ | `R3` ×3, `S2`; §4.1 (incl. dead-endpoint run) — *see F-1: decided* |
| **FR-007** invariants live | ✔ | `S8 (live)` ×3 |
| **FR-008** switch tax asserted | ✔ | `S9 (live, P-IV)` — 6.2× |
| **FR-009** replay from fixture | ✔ | `S10` ×2; §4.4 reproducibility |
| **FR-010** hardened, call-based, `kiln/src` in scope | ✔ | `S3` ×2, real-tree scan, `strictly stronger (1/2)`; M7, M8 |
| **FR-011** one allowlisted module | ✔ | `FR-011`, `R6` ×2; M9 |
| **FR-012** log records resident + location | ✔ | `O5` ×2; §4.7 |
| **FR-013** `DEFAULT_LOCAL_MODEL` verifiable | ✔ | `gemma4:12b` **is in** `/api/tags`; `R3: model absent` catches a stale one |
| **FR-014 / SC-010** r3 record corrected | ✔ | banners present in **7** docs at the verified commit (`grep -l '^<!-- r7-correction -->$'`); an **eighth** — r3's `overview.md`, missed at first — was added afterwards |
| **FR-015** additive | ✔ | canonical diff empty; fixture uses only 001's union; r3 marker byte-identical without `location` |
| **FR-015a** no concurrency | ✔ | `A4` static + dynamic + live; resident refusal; M4 |
| **FR-016 / SC-009** no admission | ✔ | ROADMAP no diff; only `wait` at `gate0` |
| **FR-017** scope guard | ✔ | no publish / installer / Pages artifact among r7's touched files |
| **FR-018** no quality judgement | ✔ | by construction: tests assert non-emptiness, variance and reproducibility only |
| **SC-001 … SC-008** | ✔ | as above; **SC-003** = §4.1, **SC-005** = §4.2, **SC-006** = §4.3–4.4 |

---

## 5. Findings

| ID | Severity | Status | Finding |
|---|---|---|---|
| **F-1** | Low–Medium | **DECIDED — keep as is** | **`KILN_LIVE=1` with Ollama unreachable makes the 12 gated tests FAIL, not skip.** Observed: exit 1, `tests 49 · pass 37 · fail 12`, each failing on a named `endpoint-unreachable`. **FR-006** says the live tier "SHALL skip with a recorded reason" when a precondition fails. The gate is only the env var; the probe skips correctly, the tests do not. It is **safe** (loud, never a silent pass; the default suite is unaffected) and arguably right — an operator who sets `KILN_LIVE=1` *demanded* live. **Either** add an endpoint/model precondition to `_live-gate.ts` so the tests skip with `endpoint unreachable`, **or** amend FR-006 to say *"an explicit `KILN_LIVE=1` with no endpoint fails, named"*. **Decision (human, 2026-09-20): keep as is.** An explicit `KILN_LIVE=1` is the operator *demanding* the live tier, so with no endpoint the gated tests fail, named — a skip there would let a broken setup look green. FR-006's *skip with a recorded reason* applies when the gate is **closed** (the default) and to the `OllamaReady` probe; spec FR-006 was clarified to say so, and `kiln/tests/runner/live-gate.test.ts` pins it. |
| **F-2** | Low | **FIXED (uncommitted)** | `quickstart-run.md` gave **11** and **5** records for `r1-walk` / `program-walk`. Those were `wc -l` counts of files with **no trailing newline**, which undercounts by one; the runner reports, and the files contain, **12** and **6**. Corrected. A *documentation* error only — no code or test was affected. |
| **F-3** | Info | recorded | The **P-IV ratio is not a constant**: 6.1× (earlier), 6.2× (here) with the weights in the OS page cache; ≈64× on a first-ever load from disk. The floor-based assertion is the correct design. |
| **F-4** | Info | recorded (known) | The lane's `swap` is still **bookkeeping** (`from == to`). r7 measures a real load but does not map tiers to different models. |
| **F-5** | Info | not reproduced | An earlier ~120 s stall in a loop of six probe runs was **not reproduced** in this verification (the same six hooks ran in ≈21 s). Cause still unproven. |

---

## 6. Not verified — stated limits

- **One host.** macOS / Darwin 25.6, Node **v26.8.2**, Ollama 0.34.2. `kiln/package.json` declares `engines: node >= 22.6`, but early Node 22
  releases (before type-stripping became the default) need `--experimental-strip-types`, and every script runs `node file.ts`
  without it. That is a **pre-existing** r1 property, and I did not test an older Node — so the *declared* minimum is
  **unverified** and may be wrong. Linux and Windows are untested.
- **Model breadth.** Exercised end to end: `gemma4:12b` (thinking) and `qwen3-coder-next` (non-thinking). **Not** exercised:
  `muse-glimmer`, `gemma4:31b-mlx`, `qwen3.8:27b-mlx`.
- **The "strongest" tier at scale.** The spec's edge case — *a 135 GB `strongest` model must not time out the gated suite* —
  is **untested**: `laguna-s-2.1` is 135.8 GB and this host has 96 GB. The default resident timeout is 300 s and the cost test
  allows 840 s, but neither has met a model that large.
- **No real two-model swap.** Only one model's cold/warm cost is measured (F-4).
- **Model quality** is out of scope by design (FR-018). Output that was fluent but unverified was observed and is not judged here.
- **The live tier is opt-in** and can rot if nobody runs `npm run test:live`; this verification is a point-in-time proof.
- **Human gates** were not exercised interactively — r7 fires the same non-interactive throwaway walk as r3.

---

## 7. Reproduce

```bash
git clone https://github.com/batorfi/kiln.git && cd kiln && git checkout 471e1c6
node --test "kiln/tests/**/*.test.ts"                       # 196 · 184 pass · 12 skipped · no Ollama needed
OLLAMA_HOST=127.0.0.1:1 node --test "kiln/tests/**/*.test.ts"   # identical — Ollama genuinely absent
ollama pull gemma4:12b                                      # then:
KILN_LIVE=1 node --test --test-concurrency=1 "kiln/tests/**/*.test.ts"   # 196/196  (or: npm run test:live)
node kiln/validate/ollama-ready.ts                          # READY — 9 round-trips for 9 units
node kiln/tests/dogfood/capture-fixture.ts && git diff --stat kiln/fixtures   # ledgers unchanged; only capturedAt moves
```

`--test-concurrency=1` is **required** for the live tier: `node --test` runs files in parallel and the cost test *unloads the model*.

---

## 8. Conclusion

The feature does what it claims, and — more usefully — it **fails when it should**. A real model is fired through the real lane
and its output captured but never logged; `OllamaReady` fails a *claimed* live run that *performed* nothing while r3's probe stays
green; the P-VIII guard now scans 33 files instead of 0 and stops a planted violation that previously passed all three probes;
and the offline experience is unchanged even with Ollama genuinely absent. Seventeen deliberate breakages, including two run
against the real server, were all caught.

**For the human:** F-1 was decided (fail loudly under an explicit `KILN_LIVE=1` — keep as is); the remaining step is to close r7 at the Gate-0 seam.
Nothing in this verification admitted a program or advanced a gate (P-VI); `specs/ROADMAP.md` was not touched.


---

## 9. Addendum — re-verification after the code-review fixes

*Sections 1–8 verified commit `471e1c6` from a fresh clone. A code review then led to fixes (see [code-review-report.md](./code-review-report.md) §0),
committed as **`0c5bc19`**. This addendum re-verifies **that commit from a fresh clone** (a local clone of the repository, so it contains only what was
committed — no git-ignored logs, nothing from the working tree). It was not pushed to GitHub when verified.*

| Check | Result |
|---|---|
| Clone integrity | ✔ HEAD `0c5bc19` · 0 git-ignored logs · no `node_modules` · `dependencies: {}` |
| Default (offline) suite — `node kiln/tests/run.ts` from the repo root, and `npm test` from `kiln/` | ✔ **229 tests · 217 pass · 0 fail · 12 skipped**, every skip with its reason (was 196/184/0/12) — 2 s |
| …with the default endpoint pointed at a **dead port** | ✔ **identical** (229/217/0/12) |
| **`npm run test:live`, run from `kiln/`** — the command that previously ran **zero tests** | ✔ **229/229 · 0 skipped · 36 s** · `[P-IV] cold 2730 ms · warm 449 ms · 6.1×` |
| Plain parallel `KILN_LIVE=1 node --test` | ✔ 228 pass · **1 skipped** — the cost test skips *itself* with its own reason instead of unloading the model under the others |
| Probes | ✔ all four READY; the scan reads **33 files** (recursively) |
| Falsify hooks | ✔ **13 of 13** exit 1; each r7 hook trips its own check (`--stub-unlogged` also trips the composed r3 probe, by design) |
| Validators + dogfood | ✔ `roadmap.ts` ×2, `firing-ready.ts`, `log.ts` on both fixtures (PASS / named R3); all five pipelines regenerate and validate (4 PASS, 1 FAIL-as-designed) |
| Fresh live capture | ✔ both regenerated ledgers **byte-identical** to the committed fixtures (`83ee1714…`, `07e01c36…`) |
| **Mutation testing — 29 / 29 killed** | ✔ the **12** breakages of the review fixes (redirects followed, slot not reclaimed, no `wait`, tokenizer blind to strings, no recursion, `keep_alive` dropped, `bad-body` renamed, contradictory options ignored, misbehaving server excused as a skip, a root-relative script, a runner that accepts zero tests, Windows separators) **and** the original **17**, re-run against the current code with updated patterns — including the two run against the **real server** (`think:false` removed ⇒ the real `gemma4:12b` returned nothing and the resident raised `empty-visible`; round-trip counter removed ⇒ check `(e)` fails) |
| Restoration | ✔ every mutated file was restored with `git checkout`; the clone was clean afterwards |

**F-1 was decided: keep as is** (`KILN_LIVE=1` with Ollama unreachable fails loudly, not skips) — see the decision in §5. It was not a code-review finding.

**Limits, as before:** one host (macOS, Node v26.8.2, Ollama 0.34.2); only `gemma4:12b` exercised end to end in this addendum (the non-thinking `qwen3-coder-next` was exercised in §4.5, before the fixes); CR-8's Windows handling was **not run on Windows**; and the fixes are **local commits — not yet pushed**.

---

## 10. Addendum — the Node version floor, measured (2026-09-21)

*Sections 6 and 9 said the declared `engines.node >= 22.6` was **unverified**. It is now verified — and it was wrong.* The documented command
(`node kiln/tests/run.ts`, which is what `npm test` runs) was run under each Node below, fetched with `npx node@<version>`, both as documented and with
`--experimental-strip-types` (offline suite; the live tier needs no particular Node).

| Node | As documented | With `--experimental-strip-types` |
|---|---|---|
| 20.19.0 | ✗ `ERR_UNKNOWN_FILE_EXTENSION` | ✗ option unsupported |
| **22.6.0** *(the old declared floor)* | ✗ | ✗ **218 of 232 tests**: one test file fails to load — the older type-stripper rejects a non-null `!` (`failure-modes.test.ts:101`); the production code itself loads |
| 22.12.0 · 22.17.1 | ✗ | ✓ **232 tests · 220 pass · 0 fail · 12 skipped** |
| **22.18.0** | ✓ 232 · 220 · 0 · 12 | ✓ |
| 23.5.0 | ✗ | ✓ |
| **23.6.0** | ✓ | ✓ |
| 24.21.0 · 25.9.0 · 26.8.2 | ✓ | ✓ |

**Result.** Type-stripping is unflagged from **22.18.0** and **23.6.0**, so the flag-free scripts need **`^22.18.0 || >=23.6.0`**. The old `>=22.6` was wrong
twice: it admitted versions that cannot run the commands at all (22.6–22.17, 23.0–23.5 without a flag), and 22.6 does not fully work even with the flag.
`engines.node` is now `^22.18.0 || >=23.6.0` and a test pins it. Older releases from 22.12 up work **with** `--experimental-strip-types`; anything that fails with
`ERR_UNKNOWN_FILE_EXTENSION` is a Node that is too old (or is missing the flag).

**A defect this found in the tests (fixed).** Two of the new script tests asserted the newer spec reporter's `ℹ tests N` output, so they failed on Node ≤ 24's TAP
output (`# tests N`) even though the code was correct. They are now reporter-agnostic. This is exactly the kind of assumption a single-Node verification cannot see.

**Still unverified:** Linux and Windows (this was all macOS), and Node 22.6–22.11 with the flag beyond the one file noted above.

