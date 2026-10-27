# Research: Durable core and the gate contract (row r13)

**Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

**Method.** Nothing in the spec is left as `NEEDS CLARIFICATION` (the two questions of the clarify step are answered). This file resolves the **design** questions the spec deliberately left to the plan, using three kinds of source, labelled: **[r42]** — what the spike *observed* about the pinned library (evidence in `specs/010-external-completion-spike/` and `spikes/r42/`); **[repo]** — what `kiln/` as of r12 actually does (read in this step: `checks/boundaries.ts`, `checks/network-lint.ts`, `packages/*/kiln.json`, `tests/run.ts`, `packages/contracts`); **[design]** — a decision made here, with its reason. Nothing is re-litigated that r42 settled.

## R1 — One seam: what exactly is imported, and the one place that imports it

**Decision [design].** The library is imported by **one directory only**, `kiln/packages/durable/src/library/`, which exposes a KILN-typed façade (`openStore`, `defineKilnTask`, `defineDoc`, `Tx`-like helpers). The rest of the durable package — and every other package — sees only KILN types (`TaskKind`, `Checkpoint`, `Gate`, `Move`, `Outcome` …). The boundary check admits the library at *package* level (`externals.onlyIn: ["durable"]`, the granularity it has); a durable-local test tightens it to the `library/` directory, and a second test scans the package's **public types** for library names (SC-010).

**Specifiers the façade needs [r42]** (exactly what the spike's working strategy imported): `@earendil-works/pi-durable` (defineTask, defineExtension, defineDocFamily, createRegistry, createSession, Harness, ROOT_CONVERSATION_ID), `@earendil-works/pi-durable/storage/sqlite/node` (openNodeSqliteStorage), `@earendil-works/chord/context` (BACKGROUND_CONTEXT) and `@earendil-works/pi-ai/models` (createModels). They go in `boundaries.json → externals` as four listed specifiers, `onlyIn: ["durable"]`.

**The `pi-ai` wrinkle [repo + r42].** `packages/workers/kiln.json` says workers is "the only importer of pi-ai" (r16). But the library's `Harness.open` **requires** a `models` option, and the only way to build one is `createModels()` from `pi-ai`. The spike passed an empty one (no provider registered) and never sent a model input. **Decision:** the seam imports `createModels` from `@earendil-works/pi-ai/models` for that one purpose and registers **no provider**; the `workers` responsibility text is amended to "the only importer of pi-ai *for model calls*"; a test asserts that the seam's models object has no provider and that no model request path exists. This is recorded in Complexity Tracking.

**Alternatives rejected.** A re-export file at the package root (every other package could then import the library through it — defeats the seam); making `workers` own `createModels` and inject it (r13 would depend on a row that comes after it).

## R2 — The gate: the r42 composition, generalised

**Decision [r42 + design].** The gate is the composition the spike proved (`native-signal`), re-created in KILN's types, not copied:

- A **gate task** owns a **decision task**. The decision task's waiting step registers a single-shot *slot* in an **owner-level map** and awaits it; a move wakes it; it performs **one commit** that writes the move record **and** returns its own terminal state; the gate task (waiting on the decision) then settles. Nothing sleeps, no timer exists (I7).
- The **port's "settled" is "a move record exists"** (what `state()` and inspection derive from the store); the gate *task* is a projection that converges after a restart. The owner's `start()` withholds `ready` until every live decision has re-registered and no gate task is ready or running. [r42, NOTES Phase 4 notes 2 and 5: 178–197 ms to ready in the spike.]
- **Duplicates and rivals are judged against the stored record, never memory**: same key + equal move → `repeat`; same key + other move → `key-conflict`; other key → `stale` (record existed at arrival) or `lost-race` (appeared while waiting for the slot). The first caller takes the slot; others wait for its commit and re-judge.
- A failed commit (injected `store-write` fault or real) is caught in the step, answered `store-error`, and **re-arms the slot** — the step never returns without durable progress (the library faults a step that does).

**What r13 adds to the spike's gate.** (a) The gate is **opened** by one keyed commit that writes the **gate document**, the **brief as shown** and the **`gate.opened` record** (R3); (b) the move is validated against the **flow data's vocabulary** (`#contracts/flow` `moveVocabulary`) and must carry a **decider** and the **brief reference** of the gate (spec Clarifications Q2 → `invalid-move`); (c) gate and decision are addressed by a **gate id** supplied by the caller (deterministic: feature, gate key, round), so a re-open is a keyed repeat.

**Alternatives rejected.** The abort-driven composition (r42: fails a, c, d); completing the decision from a second commit (half-applied move); a KILN-owned decision table (the fallback — not needed, r42 T050).

## R3 — Where the gate's data lives: documents, and a minimal outbox

**Decision [design].** In the **root conversation** (the library's one always-present container; r42 used it too), three *document families keyed by gate id*:

| Document | Contents | Written |
|---|---|---|
| `kiln.gate` | gate id, flow gate key, flow version, move vocabulary **as of opening**, brief ref, opened-at | in the opening commit; never changed afterwards |
| `kiln.brief` | brief ref (sha-256 of the canonical content) and the content **as it will be shown** | in the opening commit; immutable |
| `kiln.move` | the one move record, or none | in the move commit (the step's single commit, with the decision's completion) |

and one **append-only `kiln.outbox`** document in the same conversation: `gate.opened` is appended in the opening commit. It is a **minimal durable record** `{seq, type, subject, at, actor, cause, data}` — r15 turns the outbox into the real event stream and adopts these entries **without migration** (spec Assumptions). Its schema is not frozen here; the `type` names follow `docs/concepts/the-record.md` §Gate and §Lane. **Constitution VII (analysis finding C1):** every state change r13 makes to a gate or the lane is an entry **with actor and cause, in the commit of the state it records** — `gate.opened` (opening), `move.committed` (the move's commit), `gate.settled` (the gate task's own terminal commit), `lane.acquired|released|swapped`. Task/step progress, delegation and cost events are the **recorded deferral** to r15/r16.

**Why documents, not entries.** Documents are "typed JSON committed atomically with transcripts and tasks" [r42 R4], the spike's `kiln.move` was a document and held under every kill point, and reading one from a fresh reader needs no conversation machinery. Entries belong to transcripts (r16).

**Brief identity [design].** The brief ref is the **content hash**, so "the move names the brief it was decided on" is an equality of two hashes, tamper-evident and free of version counters. A move whose ref differs from the gate's, or is absent, is `invalid-move`.

**Alternatives rejected.** One combined gate document (the move would then rewrite a document that must stay immutable); a version counter for briefs (a second thing to keep consistent).

## R4 — Exactly-once commands (CORE-5)

**Decision [design].** One **command ledger** (a document family `kiln.command`, keyed by the command's key). A command is `(key, kind, request)`; the ledger stores `requestHash = sha-256(canonical JSON of kind + request)` and the first **outcome**. Inside the *same commit as the command's effect*, the helper reads the ledger entry: absent → apply the effect and write the entry; present + equal hash → return the stored outcome (`repeat`), write nothing; present + other hash → refuse `key-conflict`. Moves use the same shape but keep their own record (`kiln.move`) so the port's outcomes stay exactly the contract's. **Key retention:** a command key lives as long as the thing it created exists in the live store (a move key: as long as the gate record, i.e. forever; r15's archive decides what compaction may drop, and must keep keys of anything still referenced) — settled in the plan, deferred from clarify.

Commands in r13: `gate.open`, `task.create` (roadmap, row, unit) and `gate.move`. Everything else r14+ adds uses the same helper.

## R5 — One owner per store (FR-041)

> **Built form (2026-10-27).** The file-and-rename design below failed its own 50-process stress test (two owners), so the lock is a small separate SQLite database with one row, taken in one `BEGIN IMMEDIATE` transaction; a live pid is **never** taken from (the channel probe only enriches the refusal); a clean close *empties the row* (the file stays). Where the text below says "exclusive-create", "rename" or "removes the lock", read that. Reasons and numbers: `notes.md`, "The owner lock — a file became a transaction".

**Facts [r42].** Neither SQLite nor the library stops a second process opening the file and taking the write lock while the owner is idle (observed on both files). So the rule is KILN's.

**Decision [design].** A **lock file** `<store>/owner.lock`, created with exclusive-create (`wx`), containing `{pid, host, startedAt, socket}`. Start-up:

1. `wx` succeeds → this process is the owner.
2. `EEXIST` → read the lock. **Foreign host** (a store moved between hosts must have been closed cleanly, which removes the lock): refuse, naming host and pid. **Same host**: the owner is *live* iff its pid exists **and** its channel answers a probe; then refuse with the owner's pid and socket in the message. Otherwise the lock is **stale**: take it over by *atomic rename* of the stale file to a unique name, **verify the renamed content equals what was read** (else put it back and retry — another starter got there first), then `wx` again.
3. Clean shutdown removes the lock and the socket; a SIGKILL leaves both, which step 2 handles.

The race handling is the part that needs a test, not argument: **50 simultaneous starters on one stale lock produce exactly one owner** (SC-007 uses 20 sequential refusals; this is the stress version). Also recorded: the lock lives *in the store directory* so it travels (or visibly doesn't) with the store (constitution XI); the **socket does not** (R6).

**Alternatives rejected.** The socket as lock (bind-or-fail races on unlink of a stale socket); `flock` (not in Node core); a lock row in SQLite (the file is exactly what the second process can open freely).

## R6 — The local channel (FR-045/046)

**Decision [design].** Newline-delimited JSON over a **Unix-domain socket**, one request per line, replies matched by id (the shape the spike's owner used, re-created). Operations: `ping`, `ready`, `gate.open`, `gate.move`, `gate.state`. The reply carries the contract's `Outcome` unchanged. The **socket path** is `<tmp>/kiln-<uid>/<sha1(store realpath)[0..8]>.sock` inside a directory created `0700`, the socket itself `0600` — short enough for macOS's ~100-character limit (the spike hit this: its path was ~65 chars), same-user only, and **not** inside the store (so a moved store never carries a dead socket). The lock file records the path.

**Safe socket directory (analysis finding S1).** The directory is created with `mkdir` mode `0700`; if it already exists it must be checked with `lstat`: a real directory (not a symlink), owned by the current uid, mode exactly `0700` — otherwise the owner **refuses to serve** (`ChannelUnsafe`, naming the path and the problem). The same for the socket file (`0600`, current uid). The check is a pure function over a stat result so the wrong-owner case is unit-tested without root; the symlink and wrong-mode cases are tested for real.

**Client behaviour [r42].** A request whose owner dies mid-way resolves to an explicit **outcome unknown** (`connection-lost` or `timeout`, default 5 s) — never a hang; the caller retries the same key. `not-ready` is the owner's answer between listen and ready.

**Network lint [repo].** `node:net` is on the lint's deny-list (`NET_MODULE`) and **an allowlisted module is not exempt from the import rule**, only from the call rules. So the lint gets a **local-IPC allowlist** — path-keyed like the existing one — that permits `node:net` in exactly `packages/durable/src/channel/{server,client}.ts` **and** forbids, in those files, any `listen`/`connect`/`createConnection` whose argument is a number, an options object or a non-absolute-path string (the rule the spike's no-network test used, ported). Tests: planted `server.listen(8080)`, `connect({host})`, `connect("example.com")`, and a `node:net` import in an unlisted file each fail by name.

**Alternatives rejected.** A loopback TCP port (a port is a network surface; constitution VIII/IX; r19 owns the loopback front door); stdin/stdout pipes (cannot serve several completers); a directory of request files (no atomic reply).

## R7 — Kill points without a kill switch in product code

**Decision [design].** The product code calls `hooks.at("<point>")` at each named step. `hooks` is an **injected object**, a no-op by default; there is **no environment variable** in the product that can kill a factory. The proof's test-only owner script (under `tests/`, not scanned by the network lint) injects hooks that `SIGKILL` the process at the armed point and a `faultAt` hook that throws at `store-write` (the injected store failure). The **declared list** of points is an exported constant; a static test asserts the set of names passed to `hooks.at` in the source **equals** the declared list (a new point cannot be forgotten), and the proof fails by name when a declared point never fired (FR-061, never vacuous).

**Points (named after the steps of the spec):** `open.begin`, `open.after-write`, `open.committed`, `wait.registered`, `move.received`, `move.commit-begin`, `move.commit-after-read`, `move.commit-after-write`, `move.committed`, `move.ack-sent`, `gate.wake`, `gate.settled`, `recover.start`, plus unit `unit.step-begin` / `unit.step-after-work` / `unit.step-committed` and lane `lane.acquire-after-write` / `lane.release-after-write`.

## R8 — Task shells, resume, "half-done never commits"

**Decision [design].** The three non-gate, non-lane kinds are **shells** with scripted behaviour:

- **unit**: `input {steps, label, needsLane?}`; each step is a phase that does its work then commits `checkpoint {done: i}`; the result is committed **once** at the end. Killed mid-step, it re-runs that step from the last checkpoint (the library re-runs a phase from its top); because the step's *work* is scripted pure computation recorded in the checkpoint, "half-done never commits" is observable: the store never shows a result before the final commit.
- **row**: the shell of a feature: `input {feature, script: [unit specs…]}`, creates child units one at a time and completes when they have. (r14 replaces the script with the real walk; r18 the director.)
- **roadmap**: holds **the Roadmap gate** — opens `gate0` through the same gate API and waits on it; settles with the person's move kind. No delegation parameter exists on it **by construction** (constitution VI): a test asserts the roadmap task's input has no such field and that a move without a decider is refused.

Every shell has the library-required `abort` handler (commit `aborted`) — defined, never exercised in r13. All creation goes through the keyed `task.create` command (R4). Ownership: roadmap and row tasks are owned by the factory's root; units by their row; the gate task by whoever opened it (a task or the root).

## R9 — The lane

**Decision [design].** The **lane task** lives in `packages/lane` (r12's `kiln.json` already says "the lane task … arrives with r13"; layer rules allow `lane → durable`), built on the seam's `defineKilnTask`. State in one document `kiln.lane`: `{resident: string|null, hold: boolean, swaps: number, lease: {holder, since}|null}`. `acquire(step)` / `release(step)` are **commits** that change the lease (and, with the step's own commit via a `within(tx)` helper, `resident`/`hold`/`swaps`), so a lane change is atomic with the step that caused it (FR-031).

**How the unit shell reaches the lane (analysis finding I1).** The layer rule is `lane → durable`, so the **durable** unit shell cannot import the lane. The seam defines a small **`LaneApi` port** (`acquire(step, opts)`, `release(step)`, `within(tx)`) in `types.ts`; `FactoryOptions.lane` receives an implementation; `packages/lane` implements and registers it. A unit with `needsLane` calls the port; with none supplied it fails by name at creation.

**Waiting for the lane.** A step asking while the lease is held waits **in the owner's memory** (the same slot pattern as the gate; the library's scheduler sees the step as running). The queue is **not durable**: after a restart every lease is **cleared** at `start()` (the generation died with the process — FR-032, safe default) and the resumed steps **re-request in task-id order** (deterministic; FIFO by creation). Priority and affinity ordering are LANE-2 (ported in r12) and r16. The proof uses scripted generations (spec Assumptions).

## R10 — Dependency adoption (r42's hand-offs)

**Decisions [design], with the facts they rest on.**

| Item | Decision | Fact |
|---|---|---|
| Pins | `kiln/package.json` gets `dependencies` of exactly `@earendil-works/pi-durable`, `pi-ai`, `chord`, all `1.4.0` (no `^`/`~`); `kiln/package-lock.json` committed; integrity equals r42's lock | r42 pin: 91 packages, 112 MB |
| Floor | `engines.node` → `^22.19.0 \|\| >=23.6.0` (the library needs ≥ 22.19.0; r12's `>=23.6.0` arm stays) | library `engines`; r12 verified 22.18, 23.6, 24.1, 25.9 [009 baseline] |
| Floor run | `npx -y node@22.19.0 tests/run.ts --new-only` and `kiln check` on the finished tree; plus 23.6.0 and 24.1.0 as r12 did; result recorded in this row's `baseline.md` | the allow-rule for that npx pattern exists locally |
| Recorded decision | `kiln/DEPENDENCIES.md`: each dependency, version, integrity, licence, why, seam; a test keeps it in sync with `package.json` and the lock | constitution *Dependencies* |
| Checks | `boundaries` gains three codes — `boundary-dependency-unpinned` (a range or tag), `boundary-dependency-undeclared` (an import of a package not in `dependencies`, or a dependency no external seam names), `boundary-lock-mismatch` (lockfile absent or disagreeing) — **inside the existing check**, so `npm run check` still reports **three** passes (spec SC-009). `network` stops flagging declared externals **only where the boundary rules open them** (one source of truth). | [repo] `network-external-dependency` fires on any bare specifier today |
| "Nothing to install" | `kiln/package.json` description, `README.md` §Node line, the r12 quickstart sentence (annotated, not rewritten: history), and a new README install line (`cd kiln && npm ci`) | grep: `kiln/package.json`, `README.md:221`, `specs/009-*/quickstart.md:8` |
| `node:sqlite` | **Accept, record, watch** (Clarifications Q1): the warning is documented next to the install line; storage opens in one place (`library/open.ts`); a **canary test** opens an in-memory `node:sqlite` database, runs a write/read and asserts it works on the running Node — it fails loudly if the module vanishes or changes | r42: warning on 22.19.0, none on 25.9.0 |

## R11 — The crash-loop guard (FR-040) and reports

**Decision [r42 + design].** `settings.restartLimit = Infinity` is set in `library/open.ts` — the only place the library is opened — and a test opens a factory through the seam and asserts the effective setting through an *observable* behaviour (7 consecutive kills, gate still accepts a move) rather than by reading a constant. The library's `onReport` is wired to a seam-level `reports` list; any `task_parked` or `task_faulted` fails the proof by name (FR-022).

## R12 — The proof, re-created in `kiln/`

**Decision [design].** The kill-and-resume proof is **re-created** under `kiln/packages/durable/tests/proof/` (not imported from `spikes/r42/`), in KILN's runner, never vacuous:

`oracle.ts` (invariants I1–I7 over an inspection read by a *fresh reader*: opens the store through the seam's read-only inspection, no owner) · `owner-main.ts` (the test-only owner process with injectable hooks) · scenarios for: every kill point × (open, move) ; random kills (300 seeded trials, 0–8 ms — the window that mattered in r42); restart storm (7 kills); clock jump (±10 years) and wall time; exactly-once (100 repeats, 100 racers, after-restart 100); conflict, stale, invalid (incl. brief mismatch), unknown gate, not-ready, injected store failure; different-process (CLI client); one-owner (20 refusals, 50 concurrent starters, takeover); lane (two-holder races ×100, kill during lease); task shells (kill at every unit point); and a **deliberately broken gate** (two commits) in the tests' support code that the oracle must catch — the control that shows the proof can fail (FR-061). Mutation checks on the new gate code are done committed-first and undone-first (r42's lesson).

**Time budget.** r42's evidence for four strategies took ~3.5 minutes; this row has one real gate and more scenarios per point. The proof tests run inside `npm test` unless the new suite grows past **3 minutes**, in which case the random-kill and storm scenarios move to a `proof` script that the row's close-out runs and records (never skipped silently — the runner prints which tier ran).

## R13 — Readiness and scale

**Decision [design + r42].** `ready` = every live decision task has re-registered its slot **and** no gate task is `ready`/`running` (r42's `waitConverged`, generalised to *all* gate decisions); bounded at 5 s then reported not-ready honestly. SC-005 (≤ 2 s for ≥ 100 live tasks) is **measured**, not assumed: the spike measured 178–197 ms for 2 tasks; the plan includes a scale test with 100 gates + 20 units and records the number. If it exceeds 2 s, the fix is re-registering decisions in parallel (they are independent), not relaxing the criterion.

## R14 — Refusing a store from another library version (analysis finding U3, FR-047)

**Decision [design].** The commit that **creates** a store also writes `kiln.store` `{libraryVersion, contract: 1, createdAt}`. `library/version.ts` reads the **installed** version by a JSON import of `@earendil-works/pi-durable/package.json` (`with { type: "json" }`; the specifier is added to the external seam's list — it resolved in r42's smoke check) and `library/open.ts` compares it with the recorded one **right after the storage opens and before `resume()`**, so no task runs under a mismatched library. A difference throws `StoreVersionMismatch { store, recorded, installed }`; nothing is written. `inspectStore` reports the recorded version without comparing (a diagnosing reader must be able to read an old store).

**Testing without a second library version [design].** `FactoryOptions.installedLibraryVersion` overrides the installed version **for tests only** (programmatic, documented as such; there is no environment variable). A test creates a store, closes it, reopens it claiming `9.9.9` and asserts the refusal, the message, **0 resumed tasks** and a byte-identical file; and a pure function `checkStoreVersion(recorded, installed)` is unit-tested.

**What it deliberately does not do.** It does not migrate (the library's own `migrate` hooks exist, but an upgrade is a recorded decision with its own row, constitution *Dependencies*), and it does not guess that a patch version is compatible: any difference refuses. The Complexity Tracking table is unchanged (this narrows behaviour; it widens nothing).

**Alternatives rejected.** Trusting the library to fail on an incompatible store (it may instead *succeed and corrupt*, which is the case worth refusing); recording the version in the lock file (the lock is removed at clean close, the store record travels with the data, constitution XI).

## Open items carried to the tasks (none blocks planning)

1. The **exact** Unix-socket path scheme must be checked against the macOS length limit with a deep store path (a test creates one at ~200 characters).
2. **Stale-lock takeover** under 50 concurrent starters — the one place the design relies on a race being handled; the test decides whether the verify-and-put-back step is enough.
3. Whether `kiln owner` should detach (daemonise) — **no** in r13: it runs in the foreground; supervision belongs to the workshop (r25) and to whoever starts it.
