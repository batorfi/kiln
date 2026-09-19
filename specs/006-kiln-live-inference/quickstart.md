# Quickstart — 006-kiln-live-inference (r7)

**Purpose**: the runnable scenarios that prove r7 works end to end. Each has a command and an
expected outcome. This is a **validation guide**, not an implementation guide — shapes live in
[data-model.md](./data-model.md), rules in [contracts/](./contracts/), and steps in `tasks.md`.

## Prerequisites

| | |
|---|---|
| Node | `>= 22.6` (`kiln/package.json` engines); `node --test` runs `.ts` directly, no build |
| Dependencies | **none** — `dependencies: {}` holds; `fetch` is a Node global |
| Ollama | required **only** for the gated live tier (S5–S9). Reference host: v0.34.2 at `127.0.0.1:11434` |
| Model | any name present in `/api/tags`. Reference: `gemma4:12b` |
| Gate | the live tier runs **only** with `KILN_LIVE=1` (NC3-A) |

Confirm a resident is reachable before running the gated tier:

```bash
curl -s http://127.0.0.1:11434/api/tags | python3 -m json.tool | head -20
```

---

## The offline tier (must pass with **no** Ollama installed)

### S1 — The suite is green with nothing pulled

```bash
node --test "kiln/tests/**/*.test.ts"
```

**Expect**: all tests pass, including r1/r2/r3's existing 124. The live tier **skips with a recorded
reason**; no test requires a model. *This is the scenario r5's installer and r6's docs depend on — a
newcomer clones and tests with nothing pulled.*

### S2 — A skip is never a pass

```bash
node kiln/validate/ollama-ready.ts --no-endpoint
node kiln/validate/ollama-ready.ts --no-model
```

**Expect**: exit **non-zero**, `ready=false`, `skipped=true`, and a **non-empty `skipReason`** naming
the precondition (*endpoint unreachable* / the model name). A `skipped` result with no reason is
itself a failure (contract R3).

### S3 — The hardened scan catches what the old one missed

Plant a `fetch(` call in a non-allowlisted `kiln/src` module, then:

```bash
node kiln/validate/ollama-ready.ts
```

**Expect**: `ready=false` **naming the offending module**. Verified baseline: today's
`NET_PRIMITIVE` and `EXTERNAL_IMPORT` regexes were run against a realistic loopback resident and
**neither tripped** — so this scenario fails to detect anything before r7. Remove the plant and the
allowlisted module alone passes **by name**.

```bash
node kiln/validate/ollama-ready.ts --extra-loopback
```

**Expect**: `ready=false` — a second allowlist entry is refused (exactly one module may reach
loopback).

### S4 — The ancestors still pass, unmodified

```bash
node kiln/validate/runtime-ready.ts
node kiln/validate/overlay-ready.ts
node kiln/validate/live-ready.ts
node kiln/validate/log.ts kiln/factory-log/r1-walk.jsonl
node kiln/validate/roadmap.ts specs/ROADMAP.md
```

**Expect**: all **PASS / READY**. r3's `live-ready` must stay runnable **with no Ollama present**
(contract R5) — the dialling checks belong to `OllamaReady` alone, so a closed row is not
retroactively broken.

---

## The gated live tier (`KILN_LIVE=1`)

### S5 — The kiln actually fires a local model

```bash
KILN_LIVE=1 node kiln/validate/ollama-ready.ts
```

**Expect**: `ready=true` with a per-check trace covering a–f. Check (c) proves a round-trip returned
**non-empty visible** content — the `think:false` discipline holding.

### S6 — Output varies with input, and is captured

```bash
KILN_LIVE=1 node --test kiln/tests/ollama-resident
```

**Expect**: two different work units produce **different** output (it is the model's output, not a
fixed string), and the result is **reachable by the walk** — not discarded as
`kiln/src/lane.ts:100` historically did.

### S7 — A missing model fails loudly; a fabricated live run is caught

```bash
KILN_LIVE=1 node kiln/validate/ollama-ready.ts --no-model
KILN_LIVE=1 node kiln/validate/ollama-ready.ts --empty-visible
KILN_LIVE=1 node kiln/validate/ollama-ready.ts --forged-live
KILN_LIVE=1 node kiln/validate/ollama-ready.ts --stub-unlogged
```

**Expect**: each exits non-zero and **names itself**. `--forged-live` is the check that separates r7
from r3: a *claimed* live run with no round-trip must be distinguishable from a *performed* one.

### S8 — The invariants hold against a real resident

```bash
KILN_LIVE=1 node --test kiln/tests/live-inference
```

**Expect**:
- `F-SINGLE` holds over live snapshots; a forged two-running snapshot still **throws**.
- realized switches `== switchCount(units)` (P-IV preserved live).
- every line-of-defense role binds `strongest`; a weaker binding **throws synchronously**
  (contract A3 — a config error is still rejected before anything runs).
- **no concurrency**: exactly one unit in flight; no `Promise.all`, no overlapping units (FR-015a).

### S9 — The switch tax, measured

```bash
KILN_LIVE=1 node --test kiln/tests/switch-cost
```

**Expect**: cold load time exceeds warm work time by the asserted **floor**. Reference measurement on
the operator's machine: **18 040 ms cold · 280 ms warm · 64×**. The assertion is a conservative floor,
not the observed ratio, so a faster machine or a smaller model does not turn a true claim red. *This
is the first assertion of Principle IV's "Testable as:" clause anywhere in the tree.*

---

## Log replay (fixture-based, runs offline)

### S10 — A real live run replays through 001's unmodified validator

```bash
node kiln/validate/log.ts kiln/fixtures/r7-live-inference.jsonl
node kiln/validate/log.ts kiln/fixtures/r7-live-broken.jsonl
```

**Expect**: the first **PASSes** R1–R6; the second **FAILs with a named R3**
(`no-silent-approval` — a gate move with no human `decidedBy` and no distinct `pre-delegation`).

**Why a fixture** (D9): determinism holds in-process — two identical calls at `temperature:0` plus a
fixed seed produced the same SHA-256 — but **not** across model reloads or Ollama upgrades. Replaying
a committed artifact keeps R1–R6 stable while the resident is not. The fixture lives in
`kiln/fixtures/` because `.gitignore` excludes `kiln/factory-log/*.jsonl`, so a fixture placed there
could not be committed at all.

### S11 — A forgotten `await` cannot produce a green probe

```bash
node --test kiln/tests/negative/async-await.test.ts
```

**Expect**: a probe handed a `Promise` where it expects a resolved result **fails, named** — it must
not read `undefined` fields as absent-and-fine. *9 of r7's ~40 async call sites are inside the
`*-ready` probes, i.e. the P-V/P-VIII proofs themselves; an un-awaited walk there would report a green
check on an unbuilt walk.*

---

## Governance checks (P-VI / P-VII)

### S12 — r7 admits no program and advances no gate

```bash
git diff --quiet specs/ROADMAP.md && echo "ROADMAP: NO DIFF"
grep '"gate0"' kiln/fixtures/r7-live-inference.jsonl
```

**Expect**: `ROADMAP.md` unchanged by any r7 code path, and the only `gate0` record in the fixture is a
**`wait`** (a re-open at the row's own close) — never a `gate0: approved` emitted by the build
(FR-016 / SC-009). r7 fires the already-admitted program; the human re-admits `r4 → r6` at the seam.

### S13 — The resident is recorded, and 001 is untouched

```bash
grep 'resident selection' kiln/fixtures/r7-live-inference.jsonl
git diff --stat kiln/validate/log.ts kiln/validate/roadmap.ts kiln/schemas/ kiln/contracts/move-vocabulary.ts
```

**Expect**: a `transition.reason` naming the resident and a **symbolic** `@loopback` location; and
**no diff** in 001's canonical artifacts. R5 scans **keys, not values**, so this convention passes the
unmodified `log.ts` (D5) — while a record putting the address in a `url:` key would still correctly
fail.

---

## Result matrix (to be filled at `/speckit.implement` → `quickstart-run.md`)

| Scenario | Command | Expect | Observed |
|---|---|---|---|
| S1 | `node --test …` | green, no Ollama needed | — |
| S2 | `ollama-ready --no-endpoint` / `--no-model` | skip **with** a reason, non-zero | — |
| S3 | planted `fetch(` / `--extra-loopback` | caught, named | — |
| S4 | the four ancestor probes | PASS / READY | — |
| S5 | `KILN_LIVE=1 ollama-ready` | `ready=true`, a–f traced | — |
| S6 | `KILN_LIVE=1 --test ollama-resident` | output varies, is captured | — |
| S7 | four falsify hooks | each names itself | — |
| S8 | `KILN_LIVE=1 --test live-inference` | F-SINGLE, switches, P-II, no concurrency | — |
| S9 | `KILN_LIVE=1 --test switch-cost` | cold ≫ warm, above the floor | — |
| S10 | `log.ts` on both fixtures | PASS / named R3 | — |
| S11 | `--test negative/async-await` | un-awaited ⇒ named failure | — |
| S12 | ROADMAP diff + `gate0` grep | no diff; only a `wait` | — |
| S13 | resident grep + 001 diff | recorded; 001 untouched | — |
