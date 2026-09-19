# Feature Specification: KILN Live Inference — a real Ollama-backed resident and a probe that actually dials it

**Feature Branch**: `006-kiln-live-inference`  *(provisional short-name; the spec-directory name is
per-checkout state, not a committed artifact. Note the directory number is **creation** order — this
row fires **before** `005-kiln-publish`, per the proposed `ordering`.)*

**Created**: 2026-09-19

**Status**: **Draft — pre-admission.** This spec describes **proposed** roadmap row **`r7`**, which is
**NOT YET A ROW**: it exists only as the director's Gate-0 draft at
[gate0-add-row-proposal.md](./gate0-add-row-proposal.md). Per **P-VI**, `r7` becomes real only when the
human's `add-row` + `edit-rows` move lands in [specs/ROADMAP.md](../ROADMAP.md). **This spec is void
unless that move is made.** Three decisions genuinely branch the work (**NC1 the sync/async fork ·
NC2 the P-VIII loopback reconciliation · NC3 the test tiering**) and are held, unresolved, for the
human's gate-1 sign-off. **NC1 is load-bearing: it decides whether this row is a single new file or a
refactor of the lane spine, and it should be settled before the Gate-0 vote.** Nothing here admits a
program, advances a gate, or runs a model.

**Input**: the proposed row **`r7`** — short *"true live local inference — a real Ollama-backed
resident + an OllamaReady preflight probe that actually dials the endpoint"*, `deps: ["r3"]`,
`status: queued`, inserted before `r4`.

**Provenance (what r7 builds on, all closed to `main`)**:
- **r1** `002-kiln-lane` — the runtime spine (`lane` / `gate` / `log-writer` / `scheduler`), Layers
  A/B over one `FactoryState`, the headless print-and-`WAIT` twin, `RuntimeReady` (@PR#1).
- **r2** `003-kiln-roadmap-overlay` — Layer C, its Gate-0 face, a blocking headless Gate 0,
  `OverlayCReady` (@PR#2).
- **r3** `004-kiln-live-walk` — the full-rail walk, the log-replay net (a clean walk PASSes 001's
  `log.ts`; a broken no-decider FAILs by name), the recorded `--live`/`--stub` toggle, the live TUI
  smoke of Layers A/B/C, `LiveModelReady` (@PR#3). **r7 pays the one debt r3 carried forward.**

---

## Why this row exists

**The measured facts.** Investigated on the operator's machine, 2026-09-19:

| Observation | Evidence |
|---|---|
| No model is ever invoked | no `fetch`, no HTTP client, no subprocess anywhere in `kiln/`; `makeLiveResident` (`kiln/src/live-resident.ts:56`) returns a pure function producing `{ran: "live", via: model, …}` |
| The runtime is synchronous end to end | `grep -rE '\basync\b|\bawait\b|Promise' kiln/src kiln/ui kiln/validate` → **0 matches** |
| A resident's output is discarded | `kiln/src/lane.ts:100` is a bare `resident.run(unit);` — the return value is never read, never logged |
| The default model does not exist | `DEFAULT_LOCAL_MODEL = "ollama/llama3.2:3b"`; `/api/tags` on this host lists `gemma4:12b`, `qwen3.8:27b-mlx`, `gemma4:31b-mlx`, `muse-glimmer:30b-mlx`, `qwen3-coder-next`, `laguna-s-2.1:mxfp8` — **no `llama3.2:3b`** |
| The debt was named by its own ancestor | `kiln/src/stub-resident.ts:8` — *"A genuine live-model smoke walk is r3 — not provided here."* r3 shipped a deterministic adapter instead |

**The P-VIII proof is weaker than it reads.** The three `*-ready` probes' zero-network check is
**import- and primitive-based**, not call-based: `NET_PRIMITIVE`
(`validate/runtime-ready.ts:74`, `overlay-ready.ts:188`, `live-ready.ts:67`) matches only
`new Server|Socket|WebSocket` and `require('http'|'https'|'net'|'dns'|'tls')`, and `EXTERNAL_IMPORT`
matches only bare import specifiers. Both regexes were run against a realistic `fetch`-based resident:
**neither trips.** A global `fetch("http://127.0.0.1:11434/…")` needs no import and no primitive, so
live HTTP can be added to the lane with all three *"zero-network (P-VIII) ✓"* checks **still green**.
Note the asymmetry: `kiln/ui/*.ts` **is** scanned for `fetch(` (`tests/ui/ui.test.ts:56`,
`tests/live-tui/live-tui.test.ts:46`), but `kiln/src/` never is. So the easy path to live inference is
also the path that silently voids the local-first proof. **r7 must close that hole in the same breath
that it uses the exception** — otherwise the row's own deliverable is undetectable by the row's own
guards.

**P-IV is provable and unproven.** Measured on this host: a **cold** load-and-generate took
**18.04 s**; the **warm** identical call took **0.28 s** — a **64×** ratio. Principle IV
(*"wall-clock = work + switching"*, switching locally dominant) is stated in the constitution with a
*"Testable as:"* clause and is **tested nowhere**. r7 is the first row that can turn it from a thesis
into an assertion.

**Determinism is achievable, and must not be relied on.** Two identical calls at `temperature: 0,
seed: 42` produced byte-identical output (`sha256` prefix `145fffff5196c371`, 356 bytes, twice). So a
live run *can* be reproducible in-process — but not across a model reload, an Ollama upgrade, or any
context change. The log-replay dogfood (001's `log.ts`, R1–R6) therefore must **not** be built on
fresh live output.

**These are thinking models.** A first call (`/api/generate`, `num_predict: 12`) returned
`content: ''` — the whole budget went to hidden reasoning. With `think: false` the same call returned
`'ready'`. A resident that omits that flag produces **empty work product with no error**, and because
`lane.ts:100` discards the output, **nothing in the current 124-test suite would notice.**

## What r7 is *not*

- **It is not r4.** r7 publishes nothing, creates no repo, pushes no bytes. r4 remains the
  distribution point and its spec (`specs/005-kiln-publish/`) stays valid as written.
- **It is not a re-opening of r1–r3's delivered scope.** r3's walk, log-replay net, recorded `--stub`
  toggle, and Layer A/B/C live smoke all stand and stay `done` @PR#3. r7 adds the resident those
  pieces were built to drive.
- **It is not a constitution amendment** — unless NC2 resolves that way, in which case it carries the
  written rationale, version bump, and migration note the Governance section requires.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — The kiln actually fires a local model (Priority: P1)

**The story.** An operator with Ollama running points the kiln at a model that is genuinely installed,
runs a walk, and gets work product that **came out of that model** — not a fixed string shaped like
it. The resident's output is **captured**, so "the kiln fired" is observable rather than asserted.

**Why this priority**: it is the row's whole reason to exist, and the trust anchor every downstream row
inherits. Without it, r4 publishes a governance tool whose central capability claim is a stub.

**Independent Test**: with Ollama up and a real model named, a walk produces output that varies with
the input unit and is traceable to the named model; with the model name changed to one that is not
installed, the run **fails loudly by name** rather than silently succeeding.

**Acceptance Scenarios**:
1. **Given** a running Ollama and an installed model, **When** a walk runs a work unit, **Then** the
   unit's output is the **model's** output, is non-empty, and is **captured** rather than discarded.
2. **Given** a model name that is not in `/api/tags`, **When** the walk starts, **Then** it fails
   **naming the missing model** — it does not fall back silently, and it does not report success.
3. **Given** a thinking-capable model, **When** a unit runs, **Then** the visible work product is
   non-empty (the `think`/reasoning-budget trap is handled, not inherited).
4. **Given** a live run, **When** a line-of-defense role's unit is scheduled, **Then** it still binds
   the **strongest** tier — `bindRole` throws on a weaker binding exactly as it does today (P-II holds
   live, on a local substrate).

---

### User Story 2 — A preflight probe that dials, and skips loudly when it can't (Priority: P1)

**The story.** The suite must stay honest on a machine with **no Ollama at all** — a newcomer's
machine, which is precisely r5's and r6's audience. So r7 ships `OllamaReady`: it checks the endpoint
answers, the named model is present, and one round-trip returns non-empty content. When any of those
fails it **skips with a recorded reason** — never a silent pass, never a green check that means
nothing.

**Why this priority**: this is P-V's "never silently approve" applied to the test suite itself, and it
is the exact pattern r3 already established for `--stub` (`F-NOT-SILENT`). A live capability whose
absence reads as success is worse than no capability.

**Independent Test**: with Ollama stopped, `OllamaReady` reports `ready=false` **naming which
precondition failed**, and the offline suite still completes green; with Ollama up and the model
pulled, it reports `ready=true` with a per-check trace. Each falsify hook names itself.

**Acceptance Scenarios**:
1. **Given** no Ollama process, **When** the probe runs, **Then** `ready=false` naming *endpoint
   unreachable*, and the live tier **skips with a recorded reason** rather than passing.
2. **Given** Ollama up but the named model absent, **When** the probe runs, **Then** `ready=false`
   naming *the model* — the current stale `llama3.2:3b` default is caught **automatically** instead of
   by inspection.
3. **Given** Ollama up and the model present, **When** the probe runs, **Then** `ready=true` with a
   per-check trace, and the live tier executes.
4. **Given** a fabricated "live ran" marker with no actual round-trip, **When** the probe runs,
   **Then** it flips `ready=false` by name — a *claimed* live run is distinguishable from a *performed*
   one.

---

### User Story 3 — The invariants hold live, and the affinity tax is measured (Priority: P1)

**The story.** The constitution's testable claims are re-asserted against a **real** resident: one
lane at a time (`F-SINGLE`), realized switches equal the P-IV counter, line-of-defense roles bind
strongest. And the switch tax itself — the thing the whole architecture is shaped around — gets a
number.

**Why this priority**: these assertions are **independent of model output**, so they run live without
flakiness. This is where *"the kiln fires live"* stops being a label on a deterministic function.

**Independent Test**: `assertSingleLane` over snapshots captured from a live walk; realized switches
`== switchCount(units)`; a weaker line-of-defense binding still throws; and a timed cold-vs-warm
comparison shows switch time dominating work time.

**Acceptance Scenarios**:
1. **Given** a live walk, **When** its per-step snapshots are asserted, **Then** `F-SINGLE` holds and a
   forged two-running snapshot still throws.
2. **Given** a live walk over a unit sequence with genuine tier changes, **When** switches are counted,
   **Then** realized switches `== switchCount(units)` (P-IV/SC-004 preserved live).
3. **Given** a cold resident and a warm one, **When** both are timed, **Then** switch time exceeds work
   time by a margin the test asserts — P-IV becomes a measured fact. *(Reference measurement on the
   operator's machine: 18.04 s cold vs 0.28 s warm.)*
4. **Given** a live run's emitted log, **When** it is replayed through 001's **unmodified** `log.ts`,
   **Then** it PASSes R1–R6; a broken no-`decidedBy` variant FAILs with a named R3.

---

### User Story 4 — The local-first guarantee is tightened, not quietly spent (Priority: P2)

**The story.** r7 is the first row to make a real network call, so it declares the boundary **and
strengthens the guard that polices it**: the zero-network scan becomes call-based, the one module
permitted to reach loopback is **explicitly allowlisted by name**, and the log gains a narrow way to
record *where* the resident ran without tripping R5.

**Why this priority**: P2 only because it follows NC2's resolution. But r7 must not ship without it —
a row that uses an exception the guards cannot see turns three green P-VIII checks into decoration.

**Independent Test**: the hardened scan **catches** a `fetch(`/`http.request` call in `kiln/src/` that
the current regexes miss; the allowlisted module passes by name; a second module attempting loopback
fails; and a log record naming the resident's location passes `log.ts` while a genuine cloud host
still fails R5.

**Acceptance Scenarios**:
1. **Given** the hardened scan, **When** a `fetch(` call is planted in a non-allowlisted `kiln/src/`
   module, **Then** it is **caught by name** (today: undetected).
2. **Given** the allowlist, **When** the one live-resident module reaches loopback, **Then** it passes
   — the exception is **declared**, narrow, and greppable.
3. **Given** a log record naming a loopback resident location, **When** `log.ts` validates it, **Then**
   it PASSes; **when** the host is a genuine remote, **Then** R5 still FAILs.
4. **Given** the whole change, **When** the offline suite runs with no Ollama, **Then** it is green —
   the local-first story survives on a machine with nothing pulled.

---

### Edge Cases

- **Ollama not installed / not running** → `OllamaReady` `ready=false`, live tier **skips with a
  recorded reason**, offline suite green. Never a silent pass.
- **Named model not pulled** → fail by name. No silent substitution of a different model, and no
  silent fall back to the stub (a `--stub` fallback stays legal but must remain **recorded**, per r3's
  `F-NOT-SILENT`).
- **A thinking model returns empty visible content** → treated as a **fault**, named. Not recorded as
  successful work product.
- **The model returns nonsense, or refuses** → **not** r7's problem. r7 proves the kiln *fires*, not
  that a 12B model is *good*. Quality is what the gate rail and the line-of-defense roles are for; a
  human still decides every gate.
- **A very large model (135 GB `laguna-s-2.1`) is named as `strongest`** → load time may dominate
  wall-clock by minutes. The cost assertion must tolerate this (it *is* the P-IV point) without
  timing out the suite.
- **Two models resident at once** → impossible by P-III and must stay impossible: `F-SINGLE` is
  asserted over live snapshots, and a swap must fully release before the next load.
- **The live call hangs** → bounded and recorded, degrading to a named failure or a durable `wait`;
  never an indefinite block, and never an auto-approved gate.
- **A live model produces a gate verdict** → **forbidden** (P-I). The resident *runs work*; a human
  `decidedBy` (or a distinct `pre-delegation`) decides. r7 changes nothing here.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** KILN SHALL provide a resident that performs **genuine local inference** against a running
  Ollama instance, implementing r1's existing `Resident` interface **without re-declaring it**.
- **FR-002** The resident's **output SHALL be captured** and reachable by the walk — the current
  discard at `kiln/src/lane.ts:100` SHALL NOT silently swallow live work product.
- **FR-003** The resident SHALL handle the **thinking-model visible-output trap**: an empty visible
  result is a **named fault**, not successful work.
- **FR-004** A model name that is **not installed** SHALL fail **by name** at start-up. No silent
  substitution; any stub fallback SHALL remain **recorded** (r3's `F-NOT-SILENT`).
- **FR-005** KILN SHALL provide an **`OllamaReady` preflight probe** asserting: the endpoint answers,
  the named model is present, and one round-trip returns non-empty content — each check
  independently falsifiable and **self-naming**.
- **FR-006** When any precondition fails, the live tier SHALL **skip with a recorded reason** and
  SHALL NOT report success. The **offline suite SHALL remain green** with no Ollama installed.
- **FR-007** The **constitutional invariants SHALL be re-asserted live**: `F-SINGLE` over live
  snapshots (P-III), realized switches `== switchCount(units)` (P-IV), every line-of-defense role
  bound `strongest` (P-II).
- **FR-008** KILN SHALL **assert the switch tax**: a timed cold-vs-warm comparison demonstrating switch
  time dominates work time (P-IV's *"Testable as:"* clause, currently untested).
- **FR-009** A live run's emitted log SHALL **replay through 001's unmodified `log.ts`** (R1–R6), and a
  broken no-`decidedBy` variant SHALL FAIL with a **named R3**. Replay SHALL run from a **captured
  fixture**, not fresh live output (determinism is not guaranteed across reloads).
- **FR-010** The **zero-network scan SHALL be hardened to call-based detection**, catching a
  `fetch(`/`http.request` in `kiln/src/` that the current import/primitive regexes miss, and applying
  to `kiln/src/` — not only `kiln/ui/`.
- **FR-011** The loopback exception SHALL be **declared and narrow**: exactly one named module may
  reach the local endpoint, allowlisted **by name**; any other module attempting it FAILs.
- **FR-012** The factory-log SHALL be able to **record which resident ran and where**, without R5
  admitting a genuine remote host (P-VII vs `validate/log.ts:19`).
- **FR-013** `DEFAULT_LOCAL_MODEL` SHALL name a model that the probe can verify, and its staleness
  SHALL be caught **automatically** rather than by inspection.
- **FR-014** r7 SHALL **correct the r3 record** (`specs/ROADMAP.md`'s "FIRED LIVE" / `gate0.note`
  entry 4 / `004-kiln-live-walk/quickstart-run.md` / its implementation report) to describe what r3
  actually delivered. This is a **factual correction to the compliance evidence** (P-VII), **not** a
  rewrite of history: r3's delivered scope stands and stays `done` @PR#3.
- **FR-015** r7 SHALL be **additive**: no new log `recordType`; r1's runtime, r2's overlay/
  `OverlayCReady`, and r3's live-walk/`LiveModelReady` are **imported and extended**, not re-declared.
  *(NC1 may require widening `Resident.run`'s signature — a **declared, spec'd** change, distinct from
  an incidental rewrite.)*
- **FR-016** r7 SHALL **admit no program** and advance no gate: it fires the admitted program and
  **re-opens** Gate 0 at its close for the human's re-admission of `r4 → r6` (P-VI).
- **FR-017** *(Scope guard.)* r7 SHALL NOT perform r4's publish, r5's installer, or r6's docs build.
- **FR-018** *(Scope guard.)* r7 SHALL NOT judge **model quality**. It proves the kiln *fires*; whether
  a given local model is *good* is what the gate rail and the human are for.

### Key Entities

- **E1 — The Ollama Resident.** A `Resident` implementation performing real local inference: model
  name resolution, the visible-output/thinking discipline, tier reporting, bounded failure. It
  **runs work and never decides a gate** (P-I).
- **E2 — `OllamaReady` (the preflight probe).** The sibling of `RuntimeReady`/`OverlayCReady`/
  `LiveModelReady`, and the first that **actually dials**. Skips **with a record**; never silently
  passes.
- **E3 — The captured live fixture.** One real live run's emitted JSONL, committed, so log replay
  (FR-009) is stable while the resident is not.
- **E4 — The switch-cost assertion.** The timed cold-vs-warm comparison that turns P-IV into a
  measured fact.
- **E5 — The declared P-VIII boundary.** The hardened call-based scan + the named loopback allowlist +
  the narrow R5 allowance: the exception made **visible to the guards that police it**.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** With Ollama up and a real model named, a walk's work product is **the model's output**,
  non-empty and captured — demonstrable by varying the input and observing the output vary.
- **SC-002** `OllamaReady` reports `ready=true` with a per-check trace on a live host, and
  `ready=false` **by name** for each of: endpoint down, model absent, empty visible output, fabricated
  live marker.
- **SC-003** **The offline suite is green with no Ollama installed**, and the skipped live tier leaves
  a **recorded reason** — zero silent passes.
- **SC-004** `F-SINGLE` holds over live snapshots; realized switches `== switchCount(units)`; a weaker
  line-of-defense binding still throws — all three asserted against a **real** resident.
- **SC-005** The **switch tax is asserted with numbers**: cold load time exceeds warm work time by the
  margin the test declares. *(Reference: 18.04 s vs 0.28 s = 64× on the operator's machine.)*
- **SC-006** The captured live fixture **PASSes 001's unmodified `log.ts`** (R1–R6); the broken
  no-`decidedBy` variant **FAILs with a named R3**.
- **SC-007** The hardened scan **catches a planted `fetch(` in `kiln/src/`** that today's regexes miss;
  the one allowlisted module passes by name; a second module attempting loopback fails.
- **SC-008** The log can name **which resident ran and where** while a genuine remote host still fails
  R5.
- **SC-009** **Zero self-admission**: at r7's close Gate 0 re-opens and `r4 → r6` await the human's
  re-admission; no program admitted by the build.
- **SC-010** The r3 record reads **true**: no artifact claims live inference that did not occur, and
  r3's delivered scope is described accurately and still stands.

## Assumptions

- **Ollama is available on the operator's machine** (verified: v0.34.2 at `127.0.0.1:11434`, six models
  pulled). It is **not** assumed available on a newcomer's machine — hence FR-006.
- **Loopback is not "cloud."** The working reading of P-VIII is that `127.0.0.1` is *local* and the
  principle targets **external round-trips**. This is the intuitive reading and matches P-VIII's
  rationale, but the *letter* of the principle and the guards' regexes do not currently distinguish
  the two — which is exactly why **NC2** is held rather than assumed.
- **Temperature 0 plus a fixed seed is reproducible in-process** (verified: identical `sha256` twice),
  and **not** reproducible across reloads or version changes — hence the fixture in FR-009.
- **The model quality question is out of scope.** A 12B local model may produce weak work product; the
  gate rail and human gates are the answer, not a stronger claim from r7.
- **This is pre-plan.** Module and file names, the probe's exact shape, the timing thresholds, and the
  allowlist mechanism belong in `research.md` / `data-model.md` / `contracts/` / `plan.md`.

## Clarifications

### Session 2026-09-19 (OPEN — gate-1; pending `human@batorfi`)

Three decisions genuinely branch the work. **NC1 should be settled before the Gate-0 vote on the row
itself**, because it determines whether r7 is a single new file or a spine refactor — and therefore
whether the sequencing argument for firing r7 before r4 holds at all.

#### Q (NC1) — How does a synchronous lane call an asynchronous model? **(load-bearing)**

**Context**: `Resident.run(workUnit): unknown` is synchronous, `kiln/src/lane.ts:100` calls it
synchronously and discards the result, and there are **0** occurrences of `async`/`await`/`Promise`
across `kiln/src`, `kiln/ui`, `kiln/validate`. Real inference is inherently asynchronous.

**What we need to know**: which way the lane absorbs a slow call — and consequently whether r4's
published surface is about to change.

| Option | Answer | Implications |
|--------|--------|--------------|
| **A** | **Subprocess, kept synchronous** — drive `ollama` via a blocking child process; `Resident.run` stays sync. | **No spine change**; `lane`/`walk`/`scheduler` untouched; FR-015 fully satisfied. Costs streaming and fine-grained request options; couples to the CLI rather than the API. **Weakens the case for firing r7 before r4** — worth re-reading the proposal's §2 counter-argument. *(Recommended if minimizing blast radius is the priority.)* |
| **B** | **Async HTTP + async spine** — `fetch` the API; thread `async` through `lane.run` → `walk` → `live-walk` → `scheduler.schedule` → both dogfood runners. | Full API access (streaming, options, `think: false`, seeds). A **breaking change to the surface r4 publishes** — which is precisely the sequencing argument for firing r7 first. Largest diff. |
| **C** | **Sync-over-async** — HTTP on a worker thread, blocking via `Atomics.wait`. | Keeps the interface sync **and** gets full API access; adds real concurrency machinery to a codebase whose thesis is strict sequentiality — arguably against P-III's spirit even if technically conformant. |
| Custom | Your own approach. | — |

#### Q (NC2) — What exactly does P-VIII permit, and how is the guard tightened?

**Context**: P-VIII says *no cloud round-trip*; its rationale is about scarce local models and
external dependency, not about loopback sockets. But the guards cannot tell the difference, and — as
verified — they **do not currently catch a `fetch` at all**. Separately, `validate/log.ts:19` forbids
`url`/`http`/`endpoint`/`baseUrl`… in any record, so the resident's location cannot be recorded even
though P-VII wants it recorded.

**What we need to know**: the declared boundary, and how the guards learn to police it.

| Option | Answer | Implications |
|--------|--------|--------------|
| **A** | **Loopback is local; harden the guard and allowlist one module by name**; add a narrow R5 allowance for a loopback resident location. | No constitution change (P-VIII's *intent* is satisfied); the exception becomes **visible and greppable**; the scan gets **strictly stronger** than today. *(Recommended.)* |
| **B** | **Subprocess only — no HTTP anywhere**, so P-VIII's letter is untouched and no allowlist is needed. | The cleanest governance story; pairs naturally with NC1-A. Still needs FR-010's hardening, since the current gap is real regardless. |
| **C** | **Amend the constitution** to state the local-endpoint boundary explicitly. | Most honest if loopback HTTP becomes normal across rows; requires the Governance section's written rationale, version bump, and migration note. |
| Custom | Your own reconciliation. | — |

#### Q (NC3) — Which tiers run live, and what does the default suite do?

**Context**: the suite is 124/124 green and must stay green offline — r5's installer and r6's docs
promise a newcomer a clean install with nothing pulled. But a live capability that never actually runs
in anyone's loop rots immediately.

**What we need to know**: the gating mechanism and which assertions are live versus pinned.

| Option | Answer | Implications |
|--------|--------|--------------|
| **A** | **Env-gated live tier** (e.g. `KILN_LIVE=1`), **skip-with-record** by default; log replay from a committed fixture; invariants + cost assertion live only when gated. | Offline suite stays green; live path is exercised deliberately; no flakiness in the default loop. *(Recommended.)* |
| **B** | **Live required** — the suite is red without Ollama. | Maximum pressure to keep the live path working; breaks the newcomer install story r5/r6 depend on. |
| **C** | **A separate command only** (`npm run live-inference`), never in `node --test`. | Zero risk to the suite; highest chance of silent rot, since nothing in the normal loop touches it. |
| Custom | Your own tiering. | — |

---

## Trace

- **P-I (author/judge separation)** — the live resident **runs work**; it never decides a gate. Every
  gate still resolves on a human `decidedBy` or a distinct `pre-delegation`. FR-018, Edge Cases.
- **P-II (strongest defense, always)** — line-of-defense roles bind `strongest` against a **real**
  model; `bindRole` still throws on a weaker binding. FR-007 / SC-004.
- **P-III (one lane, one resident)** — `F-SINGLE` asserted over **live** snapshots; a swap fully
  releases before the next load. FR-007 / SC-004.
- **P-IV (affinity is the cost lever)** — realized switches `== switchCount`, **plus** the first
  numeric assertion that switching dominates. FR-008 / SC-005.
- **P-V (never silently approve)** — lifted to the test suite: a missing Ollama **skips with a
  record**, never a silent pass; a fabricated live marker is caught. FR-006 / SC-002 / SC-003.
- **P-VI (Gate 0 human-only)** — r7 is itself only a **proposal** until a human's `add-row` lands; it
  admits no program and **re-opens** Gate 0 at its close. FR-016 / SC-009.
- **P-VII (everything recorded)** — the resident's identity and location become recordable; the r3
  record is corrected so the compliance evidence reads true. FR-012 / FR-014 / SC-008 / SC-010.
- **P-VIII (local-first)** — the boundary is **declared and narrowed**, and the guard that polices it
  is made **strictly stronger** than it is today. FR-010 / FR-011 / SC-007 / NC2.
- **P-IX (one source of truth, no poll/server)** — no new log `recordType`; upstream shapes imported,
  not re-declared; no timer or socket added to any UI surface. FR-015.
- **R1–R6 / 001** — a captured live run PASSes the **unmodified** `log.ts`; a broken no-decider FAILs
  by a **named R3**. FR-009 / SC-006.
- **M4** — `r7` is `queued`, never `active`, until its own lane opens a live gate.
- **Provenance** — r1 `RuntimeReady` → r2 `OverlayCReady` → r3 `LiveModelReady` → **r7 `OllamaReady`**,
  each composing the last. r7 pays the debt named at `kiln/src/stub-resident.ts:8`.
