# Technical overview: the r42 spike — completing a waiting task from outside

**Row**: `r42` of the `kiln-v1` firing program · **Feature**: `010-external-completion-spike` · **Written**: 2026-10-26 · **Status**: pre-implementation (spec clarified and analysed, 65 tasks ready)
**Audience**: the architect who must decide whether the durable core can be built on Pi Durable, and anyone who will inherit the answer.
**Companions**: [spec.md](./spec.md) (what and why, normative) · [plan.md](./plan.md) (how) · [research.md](./research.md) (what the library declares) · [data-model.md](./data-model.md) · [contracts/](./contracts/) · [tasks.md](./tasks.md)

> **Reading guide.** Sections 1–4 explain the problem and why it is a spike. Section 5 is the evidence gathered so far, labelled by how much it can be trusted. Sections 6–8 are the reasoning behind the design of the experiment.
> Sections 9–11 say what each outcome means for the rest of the program. Nothing in this document is a verdict: **the verdict is the product of the row, and it does not exist yet.**

---

## 1. Summary

KILN's central promise is that **a gate waits for a person for as long as it takes, and is settled by that person's move and by nothing else** — not by a restart, a crash, a lost connection or a clock. The factory is built to deliver this by
running gates as *durable waiting tasks* on **Pi Durable**, an experimental runtime for conversations, tasks and documents, reached through a single KILN module (the "seam").

That design leans on one primitive that the library does not obviously publish: **a move that arrives from outside the waiting task must complete that task, in the same atomic commit that records the move**, exactly once, with the first
move winning, surviving a kill at any instant. Every later row of the durable core (r13 the gate contract, r14 the walk, r15 the record, r16 real workers) assumes it. Row **r42** exists to find out — cheaply, early and with evidence —
whether the assumption holds, **before** anything is built on it.

The deliverable is not code. It is a **spike report** that states exactly one of three verdicts:

| Verdict | Meaning for the program |
|---|---|
| **go** | Pi Durable can do it natively; r13 builds the gate contract directly on it |
| **go-with-fallback** | It cannot; KILN will hold the decision itself behind the seam, an upstream proposal is ready, r13 proceeds on the fallback |
| **no-go** | Neither is sound enough; the Roadmap gate re-opens *before* r13 and the program is re-planned |

What makes the answer trustworthy is the method: a harness that **kills the process that owns the store with `SIGKILL` at every named step** of the move-and-completion sequence (and at random instants), restarts it, and lets an
**oracle** decide from the store alone whether the gate is in one of the only two legitimate states — *waiting with no move*, or *settled with exactly one move*. The harness is first proven on a known-correct and a known-broken design, so a
green result and a red result both mean something.

**What is already known** (section 5): reading the published package shows that the library's atomic-commit handle can read and create tasks but has **no operation that completes another task**, and that a task can wait only on other
tasks or on the clock. So the primitive is *not offered under that name*. Whether a composition of what *is* offered delivers all five guarantees is exactly what the spike must establish by running it. On desk evidence alone, a
`go-with-fallback` outcome is plausible — but that is an expectation, not a finding, and the plan is built so the evidence can overturn it.

---

## 2. Where r42 sits

### 2.1 The program around it

```text
 r12 Foundations reset ──► r42 THE SPIKE ──► r13 Durable core ──► r14 Gates as data ──► r15 The record ──► r16 Real workers
 (done, PR #2)             (this row)         gate contract         the twelve-gate        transactional       local models,
 legacy/ frozen            go / go-with-      "move + completion    flow walked            outbox, event       residency
 kiln/ skeleton            fallback / no-go   in one commit"        headless               stream
                              │
                              └─ a no-go re-opens the Roadmap gate BEFORE r13 (roadmap decision, 2026-10-21)
```

- **r12** delivered the new `kiln/` codebase: nine packages (one of them, `durable`, deliberately empty), a runner that refuses vacuous passes, and three checks (`network`, `boundaries`, `legacy`). It also made two promises r42 must keep:
  `kiln/` has **no runtime dependency** and **nothing to install**, and a bare import specifier is a failure.
- **r13** depends on r42 explicitly (`deps: [r12, r42]`). Its acceptance — *kill the server at every step of a gate task: it resumes, waits, and settles only on a committed move* — is the same property r42 tests, on a stand-in.
- The decision to spike first is recorded (roadmap, 2026-10-21): a time-boxed row before r13, with the default fallback being *an upstream proposal plus a KILN decision table committed in the same SQLite transaction as the task store, behind the seam* (PRD **CORE-6**).

### 2.2 Why a gate is a durable task at all

The first program (now `legacy/`) implemented waiting itself: a `WAIT` mechanism with resume tokens and deadlines, and a log writer kept consistent with state by hand. The restart replaces both with the substrate:

| KILN need | How the substrate is meant to supply it |
|---|---|
| A gate may wait overnight or for days | an open gate **is** a waiting task; it runs no code and holds no model |
| "A missing person never approves" (constitution V) | a restart resumes a waiting task **as waiting**; only a committed move settles it |
| One truth, one record | a person's move, its `decided_by`, and the gate's completion are **one commit** that also carries its event |
| Retries, double clicks, reconnects must not double-apply | an idempotency key makes the move exactly-once |

The last two rows are where the missing primitive bites: *the move and the completion are one commit*, and the move is made by something that is **not** the waiting task.

---

## 3. The problem, stated precisely

### 3.1 The sequence under test

```text
 browser/CLI ──(move, key)──► server (owner of the store) ──┐
                                                            ▼
                           ONE commit:  record the move (+ its key, decided_by, brief seen)
                                        complete the gate's decision task
                                                            │
                          gate task wakes ◄─────────────────┘   validates the move against the gate's vocabulary, settles
```

Before the commit, the gate is **waiting** and there is no move. After it, the gate is **settled** and there is exactly one move. There must be no state in between that survives a crash.

### 3.2 The five guarantees, and what breaks without each

| | Guarantee | If it fails |
|---|---|---|
| **a** | The move and the gate's completion are **one atomic commit** | a crash between the two leaves a recorded decision on a gate that never wakes, or a woken gate with no decision — a restart could *approve* or *lose* a decision |
| **b** | **Keyed exactly once**: the same key and the same move return the original outcome | a retry or double click applies a decision twice; a reconnect re-opens a settled gate |
| **c** | **First move wins**; a competing or stale move is refused and changes nothing | two tabs, or a person and a delegation, race; the loser silently overwrites the winner |
| **d** | **No clock, timeout or restart settles a gate** | a "stuck" gate gets resolved by a deadline: a missing person approves (constitution V) |
| **e** | A killed and restarted gate **resumes as it was** | the gate reopens, parks, or settles itself after a crash |

A same key with a *different* move is a **conflict** and is refused — never treated as a repeat — because treating it as a repeat would let a typo silently stand for a decision.

### 3.3 Why "from outside" is the crux

A task's code runs inside the task. A gate task *waits*; it runs nothing. The move arrives from a different execution context — an HTTP handler, a CLI command — possibly in **a different process** from the one that owns the store (a design
fact of the library: one process owns a storage, with no cross-process locking). Completing the waiting task from that context, atomically with the move, is the whole difficulty.

---

## 4. Why a spike, and why this shape

**Cost asymmetry.** If the primitive cannot be had, discovering it after r13–r16 means rewriting the gate contract, the record's outbox and the director. Discovering it now costs two working days. Hence a *time-boxed* row with a binary exit.

**Why the deliverable is a report, not a feature.** The decision is architectural (build on the library, build around it, or re-plan). Code written during a spike is shaped by the search; the report carries the *contract* and the *evidence*, and r13 re-creates the seam cleanly. By default nothing from the spike becomes product code (spec FR-012).

**Why the contract must be independent of the library.** PRD CORE-6: *the gate contract does not depend on the exact API.* Pi Durable is young and moves (the 1.4.0 changelog removes an API that held an invocation across a restart and adds a crash-loop guard). KILN's guarantees must outlive its API, so they are
stated in KILN's own terms (move, gate, decision, key, outcome, refusal) and every candidate implementation is tested against **that** interface, not against library calls.

**Why a time box measured in active hours.** A spike expands to fill the calendar. The box is **16 working hours of active session time** (clarification 2026-10-26), logged in a ledger; at the limit the work stops, whatever is unfinished is reported `not-proven`, and the verdict is *no more favourable than the evidence*. The fallback and the upstream proposal are the first things cut; the evidence for a guarantee the verdict claims is never cut.

---

## 5. What is known today

`@earendil-works/pi-durable` **1.4.0** (the version pinned for the spike) was downloaded into a scratch directory outside the repository and **read, not run**. Its documentation, changelog, `package.json` and type declarations are the sources.
Every statement is labelled: **[declared]** — stated by the package; **[hypothesis]** — an inference the spike must test. Details and citations are in [research.md](./research.md).

### 5.1 The task model **[declared]**

- A task is a state machine with phases; each phase must commit a changed checkpoint or a terminal outcome. States: `pending`, `running`, `waiting`, `sleeping`, `completing`, `terminal`.
- `waiting` parks a task **until every task it names is terminal**. `sleeping` parks it **until the Harness clock reaches a deadline**. Those are the only two ways to wait: **there is no "wait for an external event" state.**
- A phase's `runtime.commit(...)` is atomic and may, in one commit, write documents, append entries, create tasks **and return the task's own next state, including `terminal`**.
- The handle given to a commit (`Tx`) can **read** a task and **create** tasks, write documents, append entries and place/settle submissions. **It has no operation that changes another task's state.**
- The only outside entry points that touch a task are `abortTask` (marks it and schedules its abort handler) and `retryTask` (re-runs a task parked by the restart limit). There is no `completeTask`.

### 5.2 Process and storage model **[declared]**

- **One process owns a storage at a time; there is no cross-process locking.** A different process cannot safely write a move to the same file — it must reach the owner. This is why the harness has an owner process and a separate outside completer.
- SQLite storage uses WAL with `synchronous = NORMAL`: *commits survive process crashes; the newest may be lost on power or host failure.* An abrupt process kill is inside the library's guarantee; host power loss is not, and the spike reports that boundary rather than testing it.
- A task cut off by a crash **five times in a row** without committing new state is **parked** as blocked (`restartLimit`, default 5; `Infinity` disables it). This matters for C1, whose decision task is *running* while it awaits the signal: a gate killed six times over a long weekend would be parked instead of waiting. A task parked in `waiting` or `sleeping` is not counted, which is why the restart-limit scenario kills more than five times and asserts the gate is neither blocked nor parked.

### 5.3 Packaging **[declared]**

- `engines.node >= 22.19.0`. r12 declared `^22.18.0`. If r13 adopts the library, **the declared Node floor of `kiln/` must rise**, and r12's floor verification (run on 22.18) must be repeated.
- **Storage rests on an experimental Node module on the floor** *(observed in a dry run, 2026-10-26, not declared by the package)*: SQLite storage uses Node's built-in `node:sqlite`, and Node 22.19.0 prints `ExperimentalWarning: SQLite is an experimental feature`. r13 must decide whether to accept that, pin a Node version where it is stable, or isolate it behind the seam. A dry-run install of the pinned set (91 packages once measured in T004, 112 MB `node_modules`) and a minimal harness open/close worked on Node 25.9.0 and 22.19.0.
- The package pulls a small dependency tree (`chord`, `pi-ai`, `pi-codemode`, `pi-telemetry`, `photon`, `diff`, `typebox`), each exact-pinned by the package. Adopting it means `kiln/` stops being dependency-free — a deliberate, recorded step that r12's rules (`externals` seam, `network-external-dependency`, "nothing to install") would have to be amended for. That is **r13's decision**, made on the report.

### 5.4 The consequence

The primitive is **not offered under its own name**. The spike's job is to learn whether a *composition* of what is offered gives all five guarantees (section 6). On desk evidence C1 below is the only native composition that is atomic by construction; whether it satisfies d and e depends on behaviour the library documents only indirectly (a phase that awaits across a restart; the restart limit).

---

## 6. The solution space, and why it is tried in this order

All candidates implement one **port** (`open` · `submit` · `state`) and are judged by one suite.

| | Mechanism | Atomic with the move? | Main risk | Why it is in the plan |
|---|---|---|---|---|
| **C1** *signal into a running phase* | the decision task's phase **awaits** a signal that the owner raises when an outside move arrives; the phase then does **one** `runtime.commit` that writes the move and returns `terminal` for itself. The gate task waits on the decision task. | **Yes, by construction** — one commit carries both | the library discourages waiting inside a phase (an invocation is held; a restart reruns the phase from the top); the restart-limit parking; a move arriving before the phase has re-registered after a restart (startup race) | the only native composition that can be atomic; the preferred attempt |
| **C2** *abort-driven* | the decision task parks `sleeping` with a far-future deadline; an outside move commits the record and then calls `abortTask`; the abort handler completes the task | **No** — two commits; atomicity would have to come from convergence | a far-future deadline is still a clock (violates d in spirit); the two-commit window (violates a) | expected to fail; **run anyway** (clarification) so the report can show *with evidence* why the obvious route is not enough |
| **C3** *keyed write-submission* | the move is a conversation write with a `requestId`, which the library already makes exactly-once | partly | built around model turns; does not complete a task | probed **only if** no native strategy holds a, d, e |
| **F1** *decision as a Pi document* | the move record is a typed document written in the commit; it is the **truth**; the task graph is advanced afterwards and **converges on restart** | the record is atomic with what shares its commit; the task advance is not | convergence logic must be correct at every kill point | the first fallback: keeps everything inside the library's own transactions |
| **F2** *decision as a table on the shared connection* | a real SQL table with a primary key (exactly-once, first-wins by construction); the task graph advanced after and converging | atomic with itself, not with a Pi commit | "same SQLite transaction as the task store" (the roadmap's wording) likely needs KILN to wrap the storage (**F3**) because Pi's commit callback exposes no raw SQL | built if F1 fails or to test the roadmap's literal wording |

**Why C1 first.** It is the only candidate that can deliver guarantee **a** natively, and its failure modes are specific and observable. **Why C2 anyway.** The decision to rule it out should be evidence, not assertion; it also exposes exactly where the
library's abort route breaks a and d, which is what an upstream proposal needs to cite. **Why the fallback is "the record is the truth, the task converges".** Because if no commit can complete another task, the only atomic thing KILN can
control is its own record; making the *record* authoritative and the task graph a projection that re-derives itself after any restart gives a, b, c, d and e without needing the missing operation — at the price that r13 owns the convergence code
until upstream lands. The report must say which source is authoritative if the two ever disagree.

---

## 7. How the experiment works

### 7.1 Architecture of the harness

```text
 tests / evidence runner (parent)
        │ spawn, SIGKILL, restart, inspect
        ▼
 ┌────────────────────────────┐   Unix-domain socket    ┌──────────────────────────┐
 │ OWNER process              │◄────────────────────────│ OUTSIDE COMPLETER        │
 │  · opens the store         │   open / submit / state │ (a separate process:     │
 │  · runs the strategy       │                         │  the CLI or a server     │
 │  · killPoint("…") hooks    │                         │  worker of r13)          │
 └─────────────┬──────────────┘                         └──────────────────────────┘
               │ SQLite file (WAL), private temp directory per scenario
               ▼
 ┌────────────────────────────┐
 │ ORACLE (fresh process)     │  reopens the store with no owner, reads only the store,
 │  invariants I1–I7          │  never memory
 └────────────────────────────┘
```

- **Owner + separate completer.** Because one process owns the store, "from outside" must be tested as *another process talking to the owner*. Every scenario is repeated with the completer in a separate process (FR-004, SC-004).
- **Unix-domain socket, private temp directory.** Local only (constitution VIII), scriptable, no port to collide on. A dedicated test verifies there is no network socket (static scan + `lsof` on the running owner).
- **`SIGKILL`.** Abrupt: no cleanup handler runs, nothing is flushed that would not be flushed by a real crash. Orderly shutdown tests would prove nothing about crash safety.

### 7.2 Two ways to kill, and why both

1. **Enumerated kill points (the proof).** Each strategy names the step boundaries of its own sequence — for C1 about ten: before the move arrives; after receipt; inside the commit callback before reads, after reads, **after writes before it returns (mid-transaction)**; after the commit returned but before the acknowledgement; after the acknowledgement; between the decision task's completion and the gate task waking; after the gate settles; and **during recovery** after an earlier kill. A kill point is a one-line call in the harness; when
   `KILL_AT=<name>` is set the process kills itself there. Deterministic, repeatable, countable: *N of N declared points exercised* is a number the report quotes (SC-002).
2. **Randomised external kills (supporting evidence).** A named point cannot reach *inside* the library's own commit statement. A few hundred kills at random 0–50 ms delays reach the interior. They can never prove absence of a bug, so the report labels them supporting.

### 7.3 The oracle

After every kill the store is reopened with **no owner** and judged by seven invariants ([data-model.md](./data-model.md) §2):

| # | Invariant | Guards |
|---|---|---|
| I1 | `waiting` ⇔ no move record | a, e |
| I2 | `settled` ⇔ exactly one record **and** the decision task is terminal with that move's outcome | a |
| I3 | never a record with a waiting gate, nor a settled gate with no record (**the half-applied move**) | a |
| I4 | at most one record per gate, whatever the submissions and restarts | b, c |
| I5 | a settled gate stays settled with the same record | e |
| I6 | a waiting gate stays waiting across any number of restarts — more than the library's restart limit — and is never blocked or parked | d, e |
| I7 | no timer, sleep or deadline on the gate or decision task | d |

### 7.4 Proving the harness before judging the library

An instrument that has never been seen to fail cannot be trusted when it passes. The foundation therefore includes two **control** strategies that do not use Pi Durable at all:

- **`control-sqlite`** — a correct single-transaction design. The harness must report it `held`. (If it reports anything else, the harness is wrong.)
- **`broken-two-commit`** — records the move in one transaction and marks the gate settled in a second. The harness must report guarantee **a** `not-held`, naming **I3**, at the kill point between the two.

Only when both behave are the native strategies run. The same discipline made r12's checks falsifiable.

### 7.5 How a verdict is derived

A guarantee is **held** for a strategy only if every scenario that targets it *ran* (count > 0) and passed; **not-held** if any ran and violated an invariant; **not-proven** if any did not run, the strategy declared no kill points, or the time box
ended first. A strategy declares **caveats** (for example, "d holds only with `restartLimit = Infinity`"), each marked *enforceable* if r13 can guarantee it structurally. The verdict is then mechanical:

- **go** — a native strategy holds a–e, including with an outside-process completer, and every caveat is enforceable;
- **go-with-fallback** — no native strategy qualifies, but a fallback holds a–e under the *same* scenarios;
- **no-go** — nothing holds all five, or a needed guarantee is `not-proven` everywhere when the box ends.

The evidence runner **refuses to pass vacuously** (zero scenarios, zero kill points, a missing or different install); and it reports `not-held` rather than failing on it — a spike's job is to find out, not to be green. A report checker verifies that every
status and the verdict in the written report equal those in `out/evidence.json`, and that the contract section contains no library names.

---

## 8. Decisions and their reasoning

*Clarification numbers follow the order of the spec's Clarifications section: 1 harness location, 2 version, 3 time-box length (2025-10-25 session); 4 always run C2, 5 how the box is measured, 6 store-failure scenario (2026-10-26 session).*

| # | Decision | Alternative considered | Why |
|---|---|---|---|
| 1 | **One port, one suite, many strategies** | per-strategy bespoke tests | makes "the fallback passes the same tests unchanged" checkable; keeps the contract free of the library |
| 2 | **Harness outside `kiln/`** (`spikes/r42/`, own `package.json`) *(clarification 1)* | inside `kiln/packages/durable` with a recorded opening of the boundary rules | a spike that may end in *no-go* should not loosen the product tree's guarantees; r12's checks then stay provably untouched (before/after control) |
| 3 | **Pin exactly 1.4.0, with a committed lockfile** *(clarification 2)* | "latest at start" | the verdict applies to one version; reproducibility beats freshness; a later version is a deliberate upgrade |
| 4 | **Time box = 16 active hours, in a ledger** *(clarifications 3 and 5)* | calendar days; wall-clock 48 h | auditable; independent of idle time; a stop rule that cannot be argued with |
| 5 | **C2 is always run, after C1** *(clarification 4)* | stop at the first native success | the report's "what was tried" must be evidence; C2 is cheap and sharpens the upstream proposal |
| 6 | **Store-failure scenario** *(clarification 6)* | leave as an edge case | a failure that leaves a gate half-written is exactly what the spike exists to find; an injected failure is cheap and non-abrupt |
| 7 | **Kill with SIGKILL at named points + random instants** | mocked storage faults; debugger tooling | tests the real process and real files; scriptable; honest about what each method can and cannot show |
| 8 | **Oracle reads the store, never memory** | asserting on returned outcomes | guarantee **e** is about the store; an in-memory answer proves nothing about a restart |
| 9 | **Report `not-held`; do not fail on it** | red build on a failed guarantee | a negative result is a result |
| 10 | **Upstream proposal drafted, never filed** | file it | filing is an outward-facing act that needs a person's say-so |
| 11 | **No gate decision, no roadmap edit** | have the report close the row | constitution VI: the Roadmap gate is human-only, always |

---

## 9. Governance and constraints

- **Constitution V** (*a missing person never approves*) is the property under test; **VI** (*the Roadmap gate is human-only*) means the report states a verdict and a person records it; **VII** (*everything recorded*) is met by pinning and recording the dependency, the evidence and the report;
  **VIII** (*local by default*) shapes the harness (Unix socket, no model, no network in tests — the one network act is `npm ci`, recorded); **Dependencies** (*pinned, recorded, one seam*) is why the dependency stays outside `kiln/` and why the port, not the library, is the contract.
- **r12's guarantees hold throughout**: `legacy/` byte-identical; `kiln/` dependency-free; `kiln check network|boundaries|legacy` and the 184 + 500 tests unchanged. The plan takes a reading **before** and **after** and requires them equal (SC-008).
- **Scope fence**: no real gate machinery, no event record, no web surface, no delegation, no model call. The spike uses a stand-in gate task and decision task.

---

## 10. What each outcome means for the rest of the program

| | **go** | **go-with-fallback** | **no-go** |
|---|---|---|---|
| r13 (durable core) | builds the gate contract directly on the native composition; adopts the dependency behind `kiln/packages/durable`, raises the Node floor to ≥ 22.19, amends r12's dependency rules | builds the gate contract on the fallback (record = truth, task converges); same dependency steps; owns the convergence code; plans its removal when upstream lands | does not start; the Roadmap gate re-opens and the program is re-planned |
| r14 / r15 | gates and the outbox sit on the native commit | the outbox and the record must treat the decision record as the authoritative source for gate outcomes | re-planned |
| Upstream | optional | proposal ready (not filed) | proposal useful as part of re-planning |
| Risk carried | library moves under the seam | fallback code is KILN's to maintain; divergence risk if the library later gains a native path | the plan itself |

In every case the report's **contract for r13** is the same document in KILN's terms; what changes is which strategy implements it and what is authoritative.

---

## 11. Risks and unknowns

| Risk | Why it matters | Mitigation in the plan |
|---|---|---|
| **The primitive does not exist natively** (likely on desk evidence) | the common case becomes `go-with-fallback` | planned for: fallback strategies run the same suite; the proposal is drafted |
| **C1 works but waits inside a phase**, which the library discourages | a `go` that is fragile | surfaced as a caveat; the verdict rule demotes a non-enforceable caveat to `go-with-fallback` |
| **Node floor 22.19 vs 22.18** | adopting the library changes `kiln/`'s declared support | reported as a finding for r13; the spike also runs on 22.19.0 |
| **Kill points cannot reach inside the library's own commit** | a bug there might be missed | randomised kills reach it; labelled supporting evidence, never proof |
| **Two processes on one file** | no cross-process lock | the completer never opens the file; one negative case records what happens |
| **Time box ends before the fallback is proven** | an incomplete picture | ordered native-first; `not-proven` is a status; the verdict is never more favourable than the evidence |
| **The library opens a network socket** | would break "local by default" | `no-network` test with `lsof`; a finding and a caveat if it does |
| **Host power loss** | WAL + `synchronous = NORMAL` may lose the newest commit | out of scope; stated as a boundary in the report |

**What would change our mind about the plan.** If the smoke test (T006) shows the pinned package will not load on the supported Node, the verdict is decided before any strategy is written. If the control strategy cannot be made to report `held`, the harness is wrong and nothing else is trusted. If C1 holds every guarantee including a different-process completer with enforceable caveats, the fallback tasks are skipped with the reason recorded.

---

## 12. Work, in one view

65 tasks in 8 phases ([tasks.md](./tasks.md)):

| Phase | Purpose | Tasks |
|---|---|---|
| 1 Setup | pin and install the dependency outside `kiln/`; start the clock and ledger; take the "before" reading of `kiln/` and its checks | 7 |
| 2 Foundational | port, kill hook, oracle, owner and client, and the two controls | 12 |
| 3 US1 — a verdict you can trust | the evidence runner, status and verdict rules, never-vacuous guards, report checker | 11 |
| 4 US2 — atomic completion | guarantees a, d, e by kill-at-every-point and random kills; C1, C2 (C3 if needed) | 13 |
| 5 US3 — exactly once | guarantees b, c; repeats, races, conflicts, store failure, the outside-process completer | 5 |
| 6 US4 — fallback | conditional: F1, F2, the same suite, the upstream proposal | 6 |
| 7 US5 — hand-over | the contract for r13, findings, fate of the code, closing the time box | 5 |
| 8 Polish | the no-network check, the report, the "after" reading, a fresh-clone run | 6 |

The minimum path to a defensible verdict is phases 1–5 (48 tasks). The report is written last because it needs every other phase's evidence; a skeleton and a checker exist from phase 3 so it cannot drift from the evidence.

---

## 13. Glossary

| Term | Meaning here |
|---|---|
| **Gate** | a point in the flow where a person decides; in the restart, a durable task that waits |
| **Decision task** | the waiting item a person's move completes |
| **Move** | a person's decision (approve, revise, …) with decider, the brief it was made against, and a key |
| **Key (idempotency key)** | identity of one submission: same key + same move = repeat; same key + different move = conflict |
| **Owner process** | the one process that holds the store and runs the tasks |
| **Seam** | the single KILN module that is allowed to import Pi Durable (`kiln/packages/durable`, from r13) |
| **Port** | the gate-completion interface (`open`, `submit`, `state`) in KILN's terms; every strategy implements it |
| **Strategy** | one way of implementing the port (native compositions C1–C3, fallbacks F1–F2, and two test controls) |
| **Kill point** | a named step boundary at which the owner kills itself with `SIGKILL` |
| **Oracle** | the read-only check of invariants I1–I7 on a reopened store |
| **Caveat** | a condition under which a guarantee holds; *enforceable* if r13 can guarantee it structurally |
| **Held / not-held / not-proven** | status of a guarantee: all targeting scenarios ran and passed / one violated an invariant / one did not run or time ran out |
| **Verdict** | `go`, `go-with-fallback` or `no-go`, derived from the evidence and recorded by a person |

---

## 14. Traceability and reading order

| To understand… | Read |
|---|---|
| what is required and why, normatively | [spec.md](./spec.md) — five stories, FR-001…FR-013, SC-001…SC-009, the clarifications |
| what the library declares, with citations | [research.md](./research.md) R1–R10 |
| the entities, states and invariants | [data-model.md](./data-model.md) |
| the interface r13 will inherit, the report's shape and verdict rules, the evidence command | [contracts/](./contracts/) |
| how to prove the spike works end to end | [quickstart.md](./quickstart.md) |
| the exact work, in order | [tasks.md](./tasks.md) |
| decisions about scope and time | spec *Clarifications* (2026-10-25 and 2026-10-26) and section 8 above |

### Decisions reserved for people

- **Recording the verdict** — the Roadmap gate, a person's move (and, for `no-go`, the re-planning).
- **Filing the upstream proposal** — if one is drafted.
- **Adopting Pi Durable into the product** — r13's decision, taken on the report, including the Node floor and the amendments to r12's dependency rules.
