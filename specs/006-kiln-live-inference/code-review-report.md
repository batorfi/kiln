# Code review report — 006-kiln-live-inference (r7)

**Verdict (as reviewed): CHANGES REQUESTED — 1 High, 4 Medium, 6 Low, plus nits. All twelve have since been addressed — see §0.** The design is sound and the invariants hold, but the review
found **one silent-pass defect in the documented way to run the live tier**, and **four correctness gaps** that the tests do not
exercise because they only cover the happy path and the failures the author thought of. None blocks the offline suite; several
touch the constitution's own principles (P-V, P-VII, P-VIII).

| | |
|---|---|
| **Range reviewed** | `c99e241..471e1c6` (`484e457` · `378101a` · `471e1c6`) — 61 files, +2348 / −292 |
| **Focus** | the 15 production files (+728 / −160): `ollama-resident.ts`, `_netscan.ts`, `ollama-ready.ts`, `lane.ts`, `scheduler.ts`, `live-resident.ts`, `live-walk.ts`, the three probes, `_cli.ts`, `index.ts`, `package.json` — plus the tests and scripts that guard them |
| **Reviewed** | 2026-09-20 · Node v26.8.2 · Ollama 0.34.2 |
| **Reviewer** | a single reviewer, **the same session that wrote the code** — see *Limits* |

## 0. Resolution — all twelve findings addressed in a follow-up

*The findings below are preserved exactly as written — they are the record of what the review found. This section records what was done
about each, and how each fix was proven.* Every fix was written **test-first** where a behavioural failure could be reproduced, and every
new test was then **mutation-tested**: the fix was broken on purpose and the suite had to go red on the right test — **12 of 12 killed**.

| ID | Status | What changed | Proof |
|---|---|---|---|
| **CR-1** 🔴 | ✅ fixed | New `kiln/tests/run.ts` runner resolves paths from **its own location** (works from any cwd), sets the env flags itself, **fails a run that executed zero tests**, and forces serial mode for the cost test. All 15 scripts rewritten to package-relative paths. | `npm run test:live` from `kiln/` → **229/229, 36 s** (was: 0 tests, exit 0). `runner/scripts.test.ts` (7) resolves every script's target, runs the runner from three cwds, and drives real `npm run`. Mutations N10, N11 killed. |
| **CR-2** 🟠 | ✅ fixed | `redirect: "manual"`; any 3xx is a named **`redirect-refused`** (preflight and chat alike). | Two-server test: the redirect target received **nothing**. N1 killed. Live smoke against real Ollama unaffected. |
| **CR-3** 🟠 | ✅ fixed | The lane **reclaims its slot** on failure and throws `LaneRunError` (carrying the partial result). `buildLiveWalk` records a `hold` + a **durable `wait`** at the gate the unit feeds and throws `WalkHaltedError` carrying the **partial ledger** (still a *loud* exception). Runners persist it; `capture-fixture` refuses to write a partial fixture. | 5 tests: slot is `null` after failure, lane reusable, the partial ledger **passes 001's `log.ts`**, no error text leaks into it. N2, N3 killed. |
| **CR-4** 🟠 | ✅ fixed (lint, not sandbox) | Comment stripping replaced by a real **tokenizer** (strings, template literals with `${}` nesting, regex literals, both comment forms). The scan now **recurses** and covers `.ts/.mts/.cts/.js/.mjs/.cjs`; flags aliasing, computed access on the global, and computed `import()`/`require()`. The allowlist key is now relative to the **scan root**. | Cases A–F from this report are all caught (`bypass.test.ts`, 8 tests); the real tree still scans clean (33 files). N4, N5 killed. **Residual, stated in the file header:** it is a *lint*; `globalThis[String.fromCharCode(…)]` still evades — the runtime refusals (loopback host, no redirects) are the real enforcement. |
| **CR-5** 🟠 | ✅ fixed (half) | The resident sends **`keep_alive`** (default `"30m"`, configurable, `-1` = never unload) and gains **`unload()`**. | Offline: body carries `keep_alive`. **Live:** after a call the model is held until ≈ +30 min (Ollama's default ≈ 5); `unload()` empties `/api/ps` and is not counted as a round-trip. N6 killed. **Not done:** wiring `unload()` into a *lane swap* needs a tier→model mapping that does not exist yet (already the flagged next step for P-IV). |
| **CR-6** 🟡 | ✅ fixed | Both `.json()` calls go through `readJson` → named **`bad-body`**. The probe now separates *absent* (unreachable/timeout ⇒ **skip**) from *misbehaving* (bad-status/bad-body/redirect ⇒ **fail, by its real code**), and reports any other error as `unknown`. | `classification.test.ts`; `failure-modes.test.ts`. N7, N9 killed. |
| **CR-7** 🟡 | ✅ fixed | `selectResident` **throws** on a supplied resident/location with a stub selection (including the `assumeLiveAvailable:false` fallback). | `select-resident.test.ts` (3) — legitimate forms unchanged. N8 killed. |
| **CR-8** 🟡 | ✅ fixed | The allowlist key normalises `\`→`/`; no script uses a `VAR=value` prefix (the runner sets env). | Windows-path tests; a script-guard test. N12 killed. **Not run on real Windows.** |
| **CR-9** 🟡 | ✅ fixed | Check **(d)** now also verifies the **driving** walk's own selection; the unreachable `!claimed ||` branch is gone; the dialing walk has an **overall deadline** (default 10 min); a halted walk is named by unit and code. | `classification.test.ts` (7). |
| **CR-10** 🟡 | ✅ fixed | `untouched.test.ts` pins **both** ends of r7's range (`c99e241..471e1c6`) and no longer inspects `HEAD` or the working tree — a historical fact, not a standing prohibition. | It no longer fails when the ROADMAP is closed or the two recorded validator fixes land. |
| **CR-11** 🟡 | ✅ fixed | The cost test is its **own opt-in** (`KILN_LIVE_COST=1`; `--cost` implies serial); a gap under 200 ms **skips with a reason** instead of failing. | Plain parallel `KILN_LIVE=1` → 228 pass + **1 skipped** (the cost test, with its reason) — it can no longer unload the model under the others. |
| **CR-12** ⚪ | ✅ fixed | Removed the unused `readdirSync`/`FactoryState` imports and the duplicate `bindAll` export; the no-concurrency test reuses the tokenizer; **one** `isLoopbackHost` (now strict: `127.999.999.999` is rejected) imported by the scan; temp dirs are cleaned up. | Drift test replaced by a verdict table asserted through *both* paths. |

**Re-verification of the fixed code** (a fresh clone of commit `0c5bc19`; full detail in [verification-report.md](./verification-report.md) §9): default suite **229 tests · 217 pass · 0 fail · 12 skipped**
(each skip with its reason); `npm run test:live` **229/229**; all four probes READY (`[33 files scanned]`); **13 of 13** hooks flip; a fresh
live capture reproduces both committed ledgers **byte for byte**; **29 of 29** mutations killed (these 12 fixes plus the original 17). **Decided, unchanged:** verification finding **F-1** (`KILN_LIVE=1` with
Ollama unreachable fails loudly rather than skipping) — not a code-review finding; the human decided to keep it as is.

---

## 1. Method — and how this report differs from a read-through

Every finding below was **reproduced by running code**, not inferred by reading; the repro is given with each. Suspicions that
did *not* reproduce are listed under *Verified sound* so the reader can see what was checked. Nothing in the repository was
modified during the review (scratch scripts lived in `/tmp`, a pre-r7 worktree was created and removed).

The first attempt used the `code-review` skill, which fanned out to three review agents; **all three died on a session rate limit
and returned no findings**. The review was therefore redone directly. It was not delegated to anything else, and no partial
sub-agent output was used.

## 2. Findings at a glance

| ID | Sev | Category | Where | Summary |
|---|---|---|---|---|
| **CR-1** | 🔴 **High** | correctness / docs | `kiln/package.json:20-24` | **`npm run test:live` runs ZERO tests and exits 0**; the other new scripts crash — and four docs and a committed file tell people to use them |
| **CR-2** | 🟠 Med | security · P-VIII | `ollama-resident.ts:102` | The resident **follows HTTP redirects** — the validated loopback host does not pin the destination |
| **CR-3** | 🟠 Med | correctness · P-V/VII | `lane.ts:114,169` · `live-walk.ts` | A failed unit leaves **`lane.running` stuck** and the walk leaves **no ledger record at all** |
| **CR-4** | 🟠 Med | correctness · P-VIII | `_netscan.ts:49,117` | The scan can be **bypassed**: comment-stripper mangles lines with `//` or `/*` in a string; subdirectories and non-`.ts` files are never scanned |
| **CR-5** | 🟠 Med | design · P-IV | `ollama-resident.ts:162` | No `keep_alive`: the model unloads after Ollama's 5-minute default, so a human gate wait re-pays the cold load |
| **CR-6** | 🟡 Low | robustness | `ollama-resident.ts:128,173` · `ollama-ready.ts:121` | A 200 with a non-JSON body escapes as a raw `SyntaxError` — not a named failure — and the probe mislabels it |
| **CR-7** | 🟡 Low | correctness | `live-resident.ts:151` | `selectResident({mode:"stub", resident})` **silently discards** the supplied resident |
| **CR-8** | 🟡 Low | portability | `_netscan.ts:54` · `package.json:24` | Path handling and the `KILN_LIVE=1 …` script are POSIX-only; the allowlisted module is *flagged* on Windows |
| **CR-9** | 🟡 Low | probe quality | `ollama-ready.ts:89,167` | Check (d) tests a stand-in, not the walk under test; a dead `!claimed` branch; no overall deadline |
| **CR-10** | 🟡 Low | maintainability | `untouched.test.ts:10` | Hard-coded `BASE` turns "r7 didn't touch 001" into "**nobody may ever** touch 001, `kiln/ui`, or the ROADMAP" |
| **CR-11** | 🟡 Low | test design | `switch-cost.test.ts:21` | The live tier relies on serialization nothing enforces, and a fixed 500 ms floor can flake |
| **CR-12** | ⚪ Nit | hygiene | several | orphaned import, duplicate export, duplicated regex, config whitespace noise, leaked temp dirs |

---

## 3. Findings in detail

### CR-1 🔴 High — `npm run test:live` silently runs nothing and passes

**Where:** `kiln/package.json:20-24` (my r7 scripts) — the same flaw pre-exists in the r1–r3 scripts.

`package.json` lives in `kiln/`, and `npm run` executes scripts with `kiln/` as the working directory. Every script uses
**repo-root-relative** paths (`kiln/tests/...`, `kiln/validate/...`), so from `kiln/` they resolve to `kiln/kiln/...`:

```
$ cd kiln && npm run test:live          → exit 0 | ℹ tests 0            ← ZERO tests, reported as success
$ cd kiln && npm run ollama-ready       → exit 1 | Cannot find module '…/kiln/kiln/validate/ollama-…'
$ cd kiln && npm run live-inference     → exit 1 | Could not find 'kiln/tests/live-inference'
```

**Why High.** `test:live` is the command I *recommended* as the one-command way to exercise the live tier — a false green in a
project whose central rule is **"never silently approve"** (P-V). It is named in `implementation-report.md` (×3),
`compliance-note.md`, `verification-report.md` (×2) and my commit messages, and — worse — the committed provenance sidecar
`kiln/fixtures/r7-live-inference.meta.json` and `capture-fixture.ts` tell the next person to *"Regenerate ONLY via `npm run
capture-fixture`"*, which crashes. My own verification used raw `node …` commands, so it never touched the broken scripts and
gave no warning. The claim *"`npm run test:live` is one command"* is **false as shipped**.

**Fix.** Make the scripts cwd-independent — either drop the `kiln/` prefix from every path (`node --test tests/**/*.test.ts`,
`node validate/ollama-ready.ts`) **or** move `package.json` to the repo root. Separately, refuse a zero-test run (`node --test`
exits 0 on "tests 0"); a wrapper or a `--test` reporter check is enough. For portability use a tiny Node runner instead of
`KILN_LIVE=1 node …` (see CR-8). **Then correct the four docs and the fixture sidecar.**

---

### CR-2 🟠 Medium — the resident follows redirects, so the loopback pin is only skin-deep

**Where:** `kiln/src/ollama-resident.ts:102` — `fetch(url, { ...init, signal })` with the default `redirect: "follow"`.

The resident validates the *configured* host is loopback (`resolveOllamaBase`, refusing even `OLLAMA_HOST`), but nothing pins
where a request *ends up*. Repro — a loopback server answers `/api/chat` with `307 Location: <another origin>`:

```
resident returned: "served by the REDIRECT TARGET"
second origin received: [ 'POST /elsewhere body=You are the "worker" role working on uni' ]
→ the resident FOLLOWED a redirect to a different origin
```

The **POST body — the prompt — was re-sent to the second origin**. Here the target was another loopback port; it would be just
as happy with a remote URL. That defeats the exact property NC2=A was granted on (*loopback only, even via `OLLAMA_HOST`*), and
`_netscan`'s allowlist cannot see it because the URL is built at runtime. Threat model: a compromised or misconfigured local
service (or a local proxy) redirecting off-box — modest, but this row's whole bargain was that the exception stays narrow.

**Fix.** `redirect: "error"` (one line) and a test with a redirecting fake server asserting a named failure.

---

### CR-3 🟠 Medium — a failed unit corrupts lane state and leaves no record

**Where:** `kiln/src/lane.ts:114` (`lane.running = …` set in `yield_`) and `:169` (`await yield_(…)` with **no `try/finally`**);
`kiln/src/live-walk.ts` (in-memory `LogWriter`, drained only at the end).

```
1. run() rejected: model exploded
   lane.running AFTER the failure: {"duId":"b","role":"worker"}   <<< the slot was never reclaimed
2. buildLiveWalk with a failing resident → threw … | partial ledger / wait record: NO
```

Two consequences. **(a) State:** the single-lane slot is left claimed by a unit that will never finish, so any surface that
reads the same `FactoryState` keeps showing it "running" — P-III's *"reclaims it when the worker returns"* has no failure path.
**(b) Record:** an exception discards the in-memory writer, so a mid-walk failure leaves **nothing** in the factory-log. P-VII
says every transition is recorded; the spec's own edge case says a hanging call is *"bounded **and recorded**, degrading to a
named failure **or a durable `wait`**"* — r7 delivers the named failure but not the record. With a real model this is not
hypothetical: timeouts and `model-missing` are exactly the failures the resident was built to raise.

**Fix.** `try { … } finally { resume(lane) }` in `run`, and have `buildLiveWalk` catch a resident failure, emit a durable `wait`
(001's union already has it) naming the unit and `OllamaError.code`, and return the partial ledger.

---

### CR-4 🟠 Medium — the P-VIII scan can be bypassed

**Where:** `kiln/validate/_netscan.ts:49` (`stripComments`) and `:117` (`readdirSync`, `.endsWith(".ts")`).

r7 sold the scan as *never vacuous* and *strictly stronger*. It is both — but it is still a **heuristic**, and these all evaded it:

```
control: plain fetch                          CAUGHT
A: a string containing // before the call     MISSED   const p = "a//b"; export const go = () => fetch(u);
B: a string containing /* … */ around it      MISSED   const a = "/*"; …fetch(u)…; const b = "*/";
C: a template literal containing //           MISSED
D: fetch via a computed property name         MISSED   globalThis["fe"+"tch"](u)        (inherent to static analysis)
E: fetch aliased first                        MISSED   const f = globalThis.fetch; f(u) (inherent)
F: fetch in kiln/src/sub/*.ts, *.js, *.mjs    MISSED   scan ok = true, files scanned = 1
```

**A–C are defects of the comment-stripper**, not limits of static analysis: the regex `(^|[^:"'\`\\])//.*$` treats `//` inside a
string as a comment start and **deletes the rest of the line — including a later `fetch(`**; the block-comment regex deletes
everything between a `"/*"` and a `"*/"` in different strings. **F is a coverage hole:** the scan is non-recursive and `.ts`-only,
so a new `kiln/src/adapters/` directory, or any `.js`/`.mjs` file, is invisible — and the allowlist test even exercises a
`src/sub/…` path that the scanner would never visit. D and E are inherent, but the report should say so. The realistic risk is
**accidental**, not adversarial (P-VIII guards against dependency drift, not a hostile committer), which is why this is Medium.

**Fix.** Strip comments with a small tokenizer (or remove string literals first, then comments); recurse into subdirectories and
include `.js/.mjs/.cjs`; add tests for A–C and F; state plainly in the header that this is a **lint, not a sandbox**.

---

### CR-5 🟠 Medium — nothing holds the model resident, so "held heat" only works inside a fast test

**Where:** `kiln/src/ollama-resident.ts:162` — the request `options` carry no `keep_alive`.

Ollama unloads an idle model after **5 minutes** by default. The kiln's thesis is *hold the resident, pay for a swap only on a
tier change* (P-III/IV) — but a walk with **human gates** routinely idles for longer than five minutes, so the next unit silently
re-pays a cold load (measured **6.1×** with warm page cache, **≈64×** from disk) with no `swap` recorded. Every test finishes in
seconds, so this cannot show up in the suite. Conversely, a genuine tier change never *unloads* the outgoing model
(`keep_alive: 0`), so the "one resident model" claim is not enforced on the server either — the lane's `swap` is bookkeeping
(already acknowledged in the compliance note), and `keep_alive` is the missing half.

**Fix.** Add a `keepAlive` option (default e.g. `"30m"`, or `-1`) and send it; on a real swap send `keep_alive: 0` for the outgoing
model. Add a live test that a >5 min idle is not required to hold the model (or assert the header/field is sent, offline).

---

### CR-6 🟡 Low — HTTP 200 with a non-JSON body escapes as a raw `SyntaxError`

**Where:** `ollama-resident.ts:128` and `:173` (`await res.json()`); `ollama-ready.ts:121`.

The resident's headline promise is *"every failure is NAMED (`OllamaError.code`)"*. It isn't, for a well-formed HTTP response with
a bad body — e.g. a proxy or captive-portal error page:

```
200 + HTML on /api/tags   → SyntaxError | named OllamaError: false | Unexpected token '<', "<html>bad "…
200 + HTML on /api/chat   → SyntaxError | named OllamaError: false
```

`OllamaReady`'s preflight `catch` then defaults any non-`OllamaError` to `"endpoint-unreachable"`, so the probe reports the wrong
cause. **Fix:** wrap both `.json()` calls and raise `bad-status`/a new `bad-body` code; make the probe's fallback `"unknown"`.

---

### CR-7 🟡 Low — a resident passed with `mode: "stub"` is silently dropped

**Where:** `kiln/src/live-resident.ts:151` (the stub branch ignores `opts.resident` and `opts.location`).

```
selectResident({ mode: "stub", resident: fake, location: "loopback" })
  → resident used: false | marker: resident selection → stub (RECORDED fallback, NC2)
```

It *is* recorded, so it is honest — but the caller supplied a resident and got a different one with no error. That is the same
"silent stand-in" shape `F-NOT-SILENT` exists to catch, just on the API rather than the ledger. **Fix:** throw on the
contradictory options, or document and test the precedence.

---

### CR-8 🟡 Low — POSIX-only assumptions

`_netscan.ts:54` `rel()` splits on `"/"`: on Windows the allowlisted resident is **flagged**
(`allowlisted module at a Windows-style path → FLAGGED`), turning every probe red. `package.json:24` uses `KILN_LIVE=1 node …`,
which is invalid in `cmd.exe`. The repo declares `engines: node >= 22.6` and no OS; these are untested. **Fix:** normalise with
`path.sep`/`replaceAll("\\", "/")`; replace the env-prefixed script with a Node runner (also fixes CR-1).

---

### CR-9 🟡 Low — three weaknesses in `OllamaReady` itself

- **(d) checks a stand-in** (`ollama-ready.ts:89`): it builds its *own* adapter walk with `location:"loopback"` and asserts the
  marker is present in *that* — not in the walk that (c) and (e) actually drive. It proves the mechanism, not the instance.
- **A dead branch** (`:167`): `truthful = !claimed || …` — but the probe *always* passes `location:"loopback"`, so `claimed` is
  always true and `!claimed` is unreachable; the code suggests (e) can pass "because nothing was claimed".
- **No overall deadline:** the resident bounds *one call* (300 s), but the probe drives nine — a stuck server can hold the probe
  for up to 45 minutes. **Fix:** inspect the driving walk's own marker for (d), delete the dead branch, add a probe-level timeout.

---

### CR-10 🟡 Low — `untouched.test.ts` will fail for the wrong reason, repeatedly

**Where:** `kiln/tests/netscan/untouched.test.ts:10` — `BASE = "c99e241"`, compared against `HEAD` and the working tree.

The intent is *"r7 didn't change 001"*; the effect is *"nobody may ever change 001, `kiln/ui/*`, or `specs/ROADMAP.md`"*. It will
fail (a) the moment the human closes r7 in the ROADMAP — as already warned in the reports — and (b) when the two **recorded
validator fixes** (`nextEligibleRow` counting `aborted`; `checkM1` following only `deps[0]`) land, since both live in canonical
files. Each future row would have to move the baseline. **Fix:** pin the *upper* bound to r7's close commit
(`c99e241..471e1c6`) so it asserts a historical fact, not a standing prohibition.

---

### CR-11 🟡 Low — the gated tier depends on things nothing enforces

The live suite is only correct with `--test-concurrency=1` (the cost test *unloads the model* under the others), but that flag is
only in scripts that are themselves broken (CR-1); a plain `KILN_LIVE=1 node --test` runs files in parallel and can fail
spuriously. `ABS_FLOOR_MS = 500` (`switch-cost.test.ts:21`) is a fixed absolute — on a fast machine with a small model, a true
switch tax under 500 ms would fail a true claim. **Fix:** put the cost test behind its own script/opt-in, or detect concurrency;
scale the absolute floor to the measured warm time.

---

### CR-12 ⚪ Nits

- `kiln/validate/live-ready.ts` — `readdirSync` is now an **unused import**, orphaned by r7's deletion of the local scan
  (`FactoryState` is unused too, but pre-existing).
- `kiln/index.ts:44` — `export { bindAll }` duplicates a name already exported by `export * from "./src/scheduler.ts"`.
- `kiln/tests/live-inference/no-concurrency.test.ts:34` re-implements comment stripping; import `stripComments` from `_netscan.ts`.
- `LOOPBACK_HOST` (`_netscan.ts`) duplicates `isLoopbackHost` (`ollama-resident.ts:47`); a drift test guards it, but one definition
  is better. `isLoopbackHost` also accepts non-IPs like `127.999.999.999` (harmless).
- `kiln/package.json` — r7 re-indented five pre-existing lines; whitespace noise in a feature diff.
- `kiln/tests/netscan/hardened.test.ts` creates temp directories it never removes.

---

## 4. Verified sound (checked, did not reproduce)

| Suspicion | Result |
|---|---|
| `think:false` is rejected by a **non-thinking** model | ✔ `qwen3-coder-next` accepted it (14.7 s incl. a 51.7 GB cold load) |
| The pre-r7 probes really were green with a planted violation — **including a fetch-only plant** | ✔ verified directly on `c99e241`: fetch-only and import+`require("http")` plants both left all three probes green, so the correction banners are accurate |
| `schedule` can throw synchronously despite being promise-returning | ✔ non-`async` by design; `assert.throws` unchanged; mutation M5 kills the async variant |
| A concurrent `run` on one resident | ✔ refused (`concurrent-run`); mutation M4 |
| `OLLAMA_HOST` can redirect the lane to a remote host | ✔ refused at construction |
| Model output leaks into the ledger | ✔ 0 of 9 outputs found; mutation M13 |
| A new `recordType` slipped in | ✔ none; 001's canonical artifacts, `kiln/ui/*` and the ROADMAP have an empty diff |
| Forgotten `await` can go green | ✔ static guard, mutation-tested (M11) |
| Unbounded blocking on a dead server | ✔ every call is timeout-bounded (offline test) |
| Runtime dependencies added | ✔ `dependencies: {}` |

## 5. Strengths worth keeping

- **Named, testable failures** (`OllamaError.code`) and a resident that refuses concurrent use *itself*, not just via the lane.
- **Defence in depth on P-II:** the config throw stays synchronous, and it fires *before any model call* (asserted via `roundTrips()`).
- **The mutation discipline.** 17 deliberate breakages, each caught by the intended test, is unusually strong evidence.
- **Honest documentation of its own corrections** — the append-only banners, the corrected D3, the recorded limits.
- **The fixture design:** a committed, reproducible ledger with a provenance sidecar, replayed offline.

## 6. Recommended order of work

| Priority | Findings | Effort |
|---|---|---|
| **Before the next row** | **CR-1** (scripts + four docs + the fixture sidecar) | small |
| **Before publishing (r4)** | **CR-2** (`redirect:"error"`), **CR-3** (`finally` + a `wait` record), **CR-4** (tokenizer + recursion) | small–medium |
| **Design decision** | **CR-5** (`keep_alive` + unload-on-swap) — belongs with the tier→model mapping already flagged as future work | medium |
| **Cleanup** | CR-6 → CR-12 | small |

CR-2, CR-3 and CR-4 all sit on the surface **r4 is about to publish**, which is the argument for fixing them first.

## 7. Limits of this review

- **Not independent.** The reviewer is the session that wrote the code; it is prone to the author's blind spots. The findings
  above are the ones that *reproduced*, but a second reviewer should sign off on **CR-2/3/4** before r4.
- **Sub-agent fan-out failed** (session rate limit); no parallel coverage was obtained.
- **Runtime only where reproducible.** Windows behaviour (CR-8) was inferred from a path-shape repro, not run on Windows.
  CR-5's five-minute idle was not waited out — it follows from Ollama's documented default and `ollama ps`, not from a 5-minute test.
- **Tests were read for weaknesses, not exhaustively re-run**; the verification report covers execution (196/196, 17/17 mutations).
- **No code was changed** in response to any finding — this is a report, not a fix.
