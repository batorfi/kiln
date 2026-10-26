# Research: Spike — completing a waiting task from outside (row r42)

**Date**: 2026-10-25 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

**Method.** The package `@earendil-works/pi-durable@1.4.0` was downloaded with `npm pack` into a scratch directory (`/tmp/r42-research/`, outside the repository) and **read, not run**: `README.md` (876 lines),
`CHANGELOG.md`, `package.json`, and the type declarations (`dist/types.d.ts`, `dist/harness/types.d.ts`, `dist/storage/sqlite/*.d.ts`). Nothing was executed and nothing was installed into the repository.
Everything below is **desk research** — what the library *documents and declares*. Every claim that matters is something the spike must *prove by running* (the evidence plan is in [plan.md](./plan.md));
none of it is a verdict. Statements are marked **[declared]** (read in the package) or **[hypothesis]** (an inference the spike must test).

## R1 — What Pi Durable 1.4.0 is, and what it requires

**Decision.** Spike against exactly `@earendil-works/pi-durable` **1.4.0** (spec Clarifications), in its own directory, installed from the npm registry with a committed lockfile.

**Findings [declared].**
- Package `@earendil-works/pi-durable`, MIT, "Durable conversation, task, and document runtime for Pi". Current release 1.4.0 (2026-10-21), the same number as the Pi CLI installed here (1.4.0).
- **`engines.node` is `>=22.19.0`.** r12 declared `^22.18.0 || >=23.6.0` for `kiln/`. This is a **finding for the report**: if r13 adopts Pi Durable behind the `durable` package, the declared Node floor of `kiln/` must rise to 22.19
  (and r12's Node-floor verification — it ran on 22.18.0 — must be repeated on 22.19). The spike itself lives outside `kiln/` and so does not trip over it.
- Runtime dependencies: `@earendil-works/chord` 1.4.0, `pi-ai` 1.4.0, `pi-codemode` 1.4.0, `pi-telemetry` 1.4.0, `@silvia-odwyer/photon` 0.3.3, `diff` 8.0.4, `typebox` 1.3.27 — every one exact-pinned by the package itself.
  Adopting Pi Durable therefore adds a small tree of dependencies, not one; the lockfile records them. **[declared]** The package root loads TypeBox (~23 MB RSS unbundled).
- The package exposes subpaths: `.`, `./storage/sqlite/node` (`openNodeSqliteStorage(path, options?)`, which uses Node's built-in SQLite through `@earendil-works/chord/sqlite/node`), `./testing`, `./storage/memory`, others.

**Alternatives considered.** Measuring against the "latest" at start (rejected by the human: fixed version, reproducible); vendoring the source (rejected: the constitution says dependencies are pinned and reached through a seam, not copied).

## R2 — The task model: what can wait, and for what

**Findings [declared].**
- A task (`defineTask`) is a state machine with **phases**; each phase handler "must commit a changed checkpoint or a terminal outcome through `runtime.commit()`". States: `pending`, `running`, **`waiting`** (parked "until
  every task in `on` is terminal"), **`sleeping`** (parked "until the Harness clock reaches `until`"), `completing`, `terminal`.
- **A task can wait only on other tasks or on the clock.** There is no "wait for an external event" state.
- `runtime.commit((tx, current) => nextState)` is atomic: "either all of it is stored or none of it"; the callback may write documents, append entries, create tasks, **and return the task's own next state (including `terminal`)**
  in the same commit.
- The `Tx` handle given to a commit can **read** a task (`tx.task(id)`) and **create** tasks (`tx.createTask`), write documents (`tx.doc`), append entries, and place/settle *submissions*. **It has no method that changes another
  task's state.** [declared — `interface Tx` in `dist/types.d.ts` read in full: reads, `createTask`, `createConversation`, `appendEntry`, submission create/place/settle, `doc`, `retireDoc`; no task-state transition] This is the central finding: the library's atomic-commit surface does **not** include "complete that task".
- The only **external** entry points on `Harness` that touch a task are `abortTask(id)` (commits the abort mark, signals the run, schedules the task's *abort handler*; resolves `"marked" | "terminal"`) and
  `retryTask(id)` (re-runs a task parked by the restart limit). `waitForTask(id)` observes. There is no `completeTask`, `resolveTask` or `settleTask`.

**Consequence.** The spike's question has an unobvious answer in the library as published: **the primitive is not offered under that name**. The spike must find out whether one of the *compositions* below gives all five guarantees.

## R3 — Candidate native compositions (the spike tries these, in this order)

All three are **[hypothesis]**: derived from the declared API; none has been run.

**C1 — "signal into a running phase" (the preferred native attempt).** The decision task `D` is a task whose phase handler, once started, *awaits an in-memory promise* that the **owner process** resolves when an outside
move arrives; the phase then performs **one** `runtime.commit` that writes the move record (with its key) *and* returns `{status: "terminal", …}` for `D`. That is atomic by construction (one commit carries both). The gate task
`G` waits `on: [D]`, so `G` wakes only when `D` is terminal. Questions the spike answers: (a) after a kill, `D` reruns its phase from the top (pending → running) and re-awaits — is it correctly "still waiting"? (b) the library's own
notes discourage waiting inside a phase (`CHANGELOG 1.4.0`: "`TaskRuntime.sleep()` is removed: it waited inside a phase, which holds an invocation and, after a restart, reruns the phase and restarts the wait") — is this
acceptable for a wait that has no end by design? (c) **the crash-loop guard**: "a task cut off by a crash 5 times in a row without committing a new state is parked" (`settings.restartLimit`, default 5) — a gate killed six times
over a long weekend would be **parked as blocked** instead of waiting; the setting must be `Infinity` (the changelog says so) and the spike proves it. (d) the first outside move must find the phase already re-registered after a
restart: the startup race.

**C2 — "abort-driven".** `D` parks in a durable `sleeping` state; an outside move first commits the move record, then calls `Harness.abortTask(D)`; `D`'s **abort handler** reads the record and commits `terminal`. Declared: "An abort
mark does not wait for [the sleep]". This is **two commits**, so atomicity would have to come from convergence (the abort handler re-derives the outcome from the record after any restart), and `sleeping` needs an `until` —
a far-future timestamp is still a clock. Expected to fail guarantees (a) and (d) as stated; kept because the *report must say so with evidence*, not by assertion.

**C3 — "the move is a keyed write-submission".** `Conversation.submit({type: …, requestId})` is **exactly-once natively** ("A retried submission with the same `requestId` returns the existing submission"), and a *write*
submission settles `done` when placed. The spike probes whether a gate can be modelled as a conversation waiting on that submission. Expected to fit exactly-once and first-wins but not "complete a task"; probed only if C1 and C2
leave a gap, because the submission machinery is built around model turns.

**Alternatives rejected without running.** Polling a document from a waiting task (a task cannot wait on a document; a poll loop needs a timer, which is a clock); a bespoke scheduler outside Pi Durable (defeats the seam).

## R4 — The fallback (what "named fallback" can mean in this library)

The roadmap's named fallback is "a KILN decision table committed in the same SQLite transaction as the task store, behind the seam". Declared facts bear on how literally that can be built:

- `openNodeSqliteStorage(path, options)` opens the database itself; `SqliteStorage.open(database, {prefix})` accepts a database adapter, and `openNodeSqliteDatabase` is exported — so a **shared connection** is possible
  [declared]. The README's shared-database example is for the Cloudflare adapter, and warns "direct storage calls bypass the queue and may be rolled back with a Pi transaction".
- Pi's `commit()` hands the callback a `Tx`, **not raw SQL**. A host-table write on the shared adapter is therefore **a separate transaction** from a Pi commit unless KILN wraps the storage itself. **[hypothesis]** "Same SQLite
  transaction" is achievable in three ways, which the spike evaluates in this order:
  - **F1 — the decision as a Pi *document*** written in the same commit as everything else that must be atomic with it (documents are "typed JSON state committed atomically with transcripts and tasks"). Atomicity is native;
    uniqueness ("first wins") is enforced inside the commit by reading the document first. No raw SQL. KILN's *decision record* is a document, not a table.
  - **F2 — a real table on the shared connection** in a transaction KILN controls; the Pi task graph is then advanced **after** (idempotently), so the table is the truth and the task is a projection that **converges** after
    any restart. Atomic with itself (a primary key gives exactly-once and first-wins), not with the task store.
  - **F3 — a wrapper over `SqliteStorage`** so one transaction carries both. Most faithful to the roadmap's words, most coupled to library internals; considered only if F1/F2 fail a guarantee.
- Whichever is chosen, the **gate contract must not depend on it** (CORE-6): it is hidden behind the port in [contracts/gate-completion-port.md](./contracts/gate-completion-port.md), and the same tests run against every strategy.

## R5 — One process owns a storage; "from outside" means "through the owner"

**Finding [declared].** "One process owns a storage at a time; there is no cross-process locking." SQLite is in WAL mode with `synchronous = NORMAL`: "commits survive process crashes; the newest may be lost on power or host
failure." Consequences:

- A *different-process completer* (spec FR-004, SC-004) **cannot open the same database file** to write a move; it must reach the **owner** over a channel. The harness therefore has an **owner process** (opens the store, runs the
  tasks) and a **client process** (the outside completer: the CLI or server worker of r13) talking over a local channel. A Unix-domain socket in the system temp directory is local-only (constitution VIII) and scriptable.
- "Abrupt kill" (SIGKILL) is within the library's stated guarantee (process crash), **power loss is not** — which is what the spec's Assumptions already say. The spike reports this boundary instead of testing it.
- A second process opening the file by mistake is a *negative* test worth one case: the report should say what happens (the library gives no lock; SQLite's own locking applies) so r13 can rule it out structurally.

## R6 — How to kill "at every step"

**Decision.** Two complementary methods; both are required by the report.

1. **Enumerated kill points (deterministic).** The harness code names each step boundary of the move-and-completion sequence with `killPoint("<name>")`; when the owner is started with `KILL_AT=<name>` it terminates
   itself with `SIGKILL` there — abrupt, no cleanup, no `close()`. The test then starts a fresh owner on the same file and checks the invariants. Points are declared *by each strategy* (the list is part of its definition and is
   printed in the report); the suite iterates over `strategy.killPoints`, and a run that iterated zero fails (FR-003, SC-006). Representative points: before the move arrives; after receipt, before the commit; inside the commit callback
   before and after the writes (i.e. mid-transaction); after the commit returned, before the acknowledgement; after the acknowledgement; between the decision task's completion and the gate task waking; during **recovery** after a
   previous kill.
2. **Randomised external kills (statistical).** The parent sends a move and kills the owner after a random delay (0–50 ms, a few hundred trials per strategy), then restarts and checks the invariants. This reaches the library's
   interior (between its own statements), which a named point cannot. It cannot prove absence, so the report treats it as supporting evidence, never as the proof.

**Invariants checked after every kill (the oracle).** For one gate and one key: (I1) the gate is `waiting` **iff** no move record exists; (I2) the gate is `settled` **iff** exactly one move record exists *and* the decision task
is terminal with that move's outcome; (I3) never both a move record and a still-waiting gate, nor a settled gate with no record; (I4) the record count for the gate is ≤ 1; (I5) a settled gate stays settled across further
restarts; (I6) a waiting gate stays waiting across any number of restarts with no move — including more than the library's restart limit.

**Alternatives rejected.** Mocking storage failures (would test the mock); `process.exit()` or graceful `close()` (not abrupt); a debugger/`ptrace` harness (platform-specific, unscriptable).

## R7 — Where the spike lives and how it is built

**Decision (from the spec's Clarifications).** `spikes/r42/` at the repository root, **outside `kiln/`**, with its own `package.json`, an **exact** version pin for `@earendil-works/pi-durable`, and a committed
`package-lock.json` (the integrity hashes and the transitive pins are the "recorded decision"). `node_modules/` is git-ignored. TypeScript runs by Node's type stripping like the rest of the repository, so there is no build step.

**Why this is safe for r12's guarantees.** `kiln check network|boundaries` scan `kiln/packages/**` and `kiln/checks/**` only; `kiln/tests/run.ts` discovers tests under `kiln/` only; `legacy/` is not touched. So nothing in the
spike can change a result of `kiln/` — and **the plan verifies that**, not assumes it (SC-008: run all three before and after, compare).

**Alternatives considered.** Inside `kiln/packages/durable` with a boundary opening (rejected by the human, Clarification 1); a git worktree or a branch not merged (the evidence must be reproducible from the merged tree).

## R8 — The never-vacuous rule for the evidence

**Decision.** The evidence runner (`npm run evidence` in `spikes/r42/`) refuses to pass: zero tests, zero kill points exercised for a strategy that declared some, a strategy whose declared list is empty, or an install that is
missing or different from the lockfile. It writes `out/evidence.json` (strategy → guarantee → status → counts) from which the report's table is produced; a guarantee is **held** only if every test that targets it ran (count > 0)
and passed. This mirrors r12's `kiln check` discipline and the legacy `tests/run.ts` "zero tests fails" rule.

## R9 — The upstream proposal

**Decision.** If C1 fails any guarantee, the report carries an upstream proposal **draft** (`spikes/r42/upstream-proposal.md`, referenced from the report) written for a maintainer who has never heard of KILN: the use case (a person
decides a gate days later, from another process), the gap (`Tx` cannot complete another task; tasks wait only on tasks or the clock), and the smallest change (a way for a commit to complete a task that is parked waiting
for an external completion, keyed). It is **not filed**; filing is a person's decision (spec FR-007). The repository is `github.com/earendil-works/pi` (`packages/durable`), per the package metadata.

## R10 — Time box and its bookkeeping

**Decision.** Two working days, counted as 16 hours of active session time in a ledger (spec, clarification 2026-10-26). `spikes/r42/TIMEBOX.md` records the start instant, a checkpoint after each phase of the plan, and the end; at the end instant the work stops and the report lists what is
unproven. The plan sizes the phases to fit (≈ 0.25 d setup, 0.5 d harness and kill infrastructure, 0.75 d strategies and guarantee tests, 0.25 d fallback if needed, 0.25 d report) with the fallback and the proposal as the first things
to be cut *down* (never the evidence for a guarantee the verdict claims).
