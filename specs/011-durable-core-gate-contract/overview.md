# Technical overview: r13 — the durable core and the gate contract

**Row**: `r13` of the `kiln-v1` firing program · **Feature**: `011-durable-core-gate-contract` · **Written**: 2026-10-27 · **Status**: mid-implementation — phases 1–7 of 11 built and proven (T001–T059 of 80); units/commands, the lane, the dependency record and the floor matrix are still to come. Each section says which parts are built (**[built]**) and which are not (**[pending]**).
**Audience**: the engineer who must write the next row's first task on top of this one (r14, the walk), and the reviewer who has to decide whether the gate can be trusted.
**Companions**: [spec.md](./spec.md) (what and why, normative) · [plan.md](./plan.md) · [research.md](./research.md) (R1–R14, the design decisions) · [data-model.md](./data-model.md) · [contracts/](./contracts/) · [tasks.md](./tasks.md) · [baseline.md](./baseline.md) (measured readings per phase) · [notes.md](./notes.md) (lab notebook: what the work found) · the predecessor overview, [../010-external-completion-spike/overview.md](../010-external-completion-spike/overview.md).

> **Reading guide.** §1–3 say what the row is and what it inherited. §4–7 are the design: the seam, the gate, the data, the owner. §8 is how the design is *attacked* — the proof is the real product of the row. §9–11 are governance, decisions and deviations, and honest status. §12 is a glossary.

---

## 1. Summary

KILN promises that **a gate waits for a person for as long as it takes, and is settled by that person's move and by nothing else** — not by a restart, a crash, a lost connection or a clock. r42 (the spike) showed that this can be built on **Pi Durable**, an experimental runtime of durable tasks and documents, *if* a move arriving from outside completes the waiting task in the same atomic commit that records the move. Its verdict was `go`.

r13 turns the `go` into product code inside `kiln/`:

1. **One seam.** `packages/durable` is the only module that touches the library, and inside it only the `library/` directory does. Everything else sees KILN's own words: gate, move, key, outcome, refusal, task, checkpoint.
2. **The gate contract.** Open a gate whole (gate document + brief as shown + `gate.opened` entry, one commit). A move and its gate's completion are *one* commit. Keyed exactly once. First move wins. No clock ever settles anything.
3. **Task kinds.** Roadmap, row and unit shells; the gate and its decision; a lane task (the lane is **[pending]**).
4. **One owner per store**, reached by completers through a private local channel and a thin CLI — never by opening the store.
5. **A proof that can fail.** Kill the owner with SIGKILL at every named step; read the wreckage with a fresh reader that has no owner; judge it with an oracle; show that a deliberately broken gate is caught.
6. **Adopting the dependency without weakening r12.** Pinned, locked, recorded; r12's three checks widened narrowly, each widening proven by a planted violation.

What r13 deliberately is *not*: the walk of a feature through its stages (r14), the event stream and archive (r15), workers and models (r16), configuration (r17), the director (r18), operator surfaces (r19/r20), delegation (r21). The outbox written here is the *seed* of r15's stream, not the stream.

---

## 2. Where r13 sits

```
 r12 foundations reset (done)  ─┐
                                ├─▶  r13 DURABLE CORE  ──▶ r14 walk ──▶ r15 events/archive ──▶ r16 workers/models ──▶ …
 r42 spike, verdict go (done)  ─┘        (this row)
```

**What r42 handed over, and r13 did not re-litigate:**

| Hand-off | What r13 did with it |
|---|---|
| The gate-completion port and its outcomes/refusals (post-spike form) | Re-created in KILN's types as the gate contract ([contracts/gate-contract.md](./contracts/gate-contract.md)); the brief rule added (a move must name the gate's brief). |
| *Never park a waiting gate on repeated crashes* (the library's crash-loop guard) | `restartLimit = Infinity`, set in the one place the library is opened; a 7-kill storm proves it; one **mutation check** puts the library default (5) back and watches the proof fail. |
| *Exactly one process owns the store; completers go through the owner* | An owner lock (§7) and a Unix-domain-socket channel with a thin CLI. |
| *`committed` means durable; `not-ready` is a transient, retry-the-same-key answer; power loss is outside the guarantee* | Outcome vocabulary kept unchanged; readiness is a stored fact the owner reports; the power-loss boundary is written into the seam documentation (**[pending]**, T063). |
| Node floor ≥ 22.19.0; `kiln/` no longer dependency-free (3 pinned packages, 91 installed, 112 MB); experimental `node:sqlite` | Floor raised to `^22.19.0 \|\| >=23.6.0`; three exact pins and a tracked lockfile; `node:sqlite` *accepted, recorded and canary-tested*; the "nothing to install" statements and the floor matrix are **[pending]** (Phase 10). |

---

## 3. The shape of the system

```
                  ┌──────────────────────────── one OS process: the OWNER ─────────────────────────────┐
  kiln gate …     │                                                                                     │
  (any process) ──┼─▶ channel/server  ──▶  gates API  ──▶  gate/{open,move,state}  ─┐                   │
   Unix socket    │   (0600 socket,        tasks API       commands (ledger)         │  one Tx           │
   0 network      │    0700 directory)     inspect         outbox, slots, hooks      ▼                   │
                  │                                                         library/  (THE SEAM)         │
                  │                                                              │                       │
                  └──────────────────────────────────────────────────────────────┼───────────────────────┘
                                                                                 ▼
                                   <store>/  SQLite via node:sqlite (the library's only durable storage)
                                             + owner.lock  (a tiny SQLite lock database, one row)
```

**Layers inside `packages/durable/src/`** (line counts are the current ones; the whole package is ≈ 1 800 lines):

| Layer | Files | Role |
|---|---|---|
| Contract types | `types.ts`, `canonical.ts`, `hooks.ts` | KILN's vocabulary; canonical JSON and the sha-256 hashes built on it (brief identity, request identity); the declared kill/fault points. **No library name appears in the exported declarations (SC-010; a test scans them).** |
| The seam | `library/{open,tasks,docs,version}.ts` | The *only* importer of `@earendil-works/pi-durable`, `…/pi-ai/models`, `…/chord/context`. Exposes a KILN-typed façade: open a store, define a task kind, define a document family. |
| Gate | `gate/{documents,flow,open,move,state,slots,tasks}.ts` | Opening, moving, reading; the owner-memory *slots* decisions wait in; the gate and decision task definitions. |
| Ledger, outbox | `commands.ts`, `outbox.ts` | Exactly-once commands; the append-only record of what the core changed, with actor and cause. |
| Task shells | `tasks/{roadmap,row,unit,validate,index}.ts` | The shells of the other durable tasks. |
| The factory | `factory.ts`, `services.ts`, `store.ts`, `store-version.ts`, `inspect.ts` | `openFactory`: take the lock, open the store, refuse a store of another library version, converge, report ready, serve. `inspect` reads a store with **no owner** (the proof's fresh reader). |
| Ownership and channel | `owner-lock.ts`, `owner.ts`, `channel/{path,protocol,server,client}.ts` | One owner per store; the private socket; the client. The only two files allowed `node:net`. |

**Layering rule worth knowing.** `durable` cannot import `lane` (the boundary check enforces direction). The lane will implement a small `LaneApi` port (`acquire`, `release`) that `openFactory` receives as an option and hands to the unit shell. Task ids are an opaque `number` the library mints — KILN stores and passes them, never parses or builds them.

---

## 4. The seam **[built]**

**The rule.** The library is imported from exactly one directory. A boundary-check rule refuses it elsewhere *by name* (`boundary-bare-specifier`, every spelling the check already knows); a durable-local test tightens "package" to "directory"; a second test scans every file of every package — tests included — for library names outside `library/`; a third scans the public declarations.

**Why it matters.** The library is 1.4.0 and experimental. The contract — outcomes, refusals, documents, keys — must outlive its API. If the library changes shape, one directory changes, and the test suite (written against KILN's types) says whether the contract held.

**The models wrinkle.** The library's harness requires a `models` object, and the only way to build one is `createModels()` from `pi-ai`. The seam imports it for that single purpose and registers **no provider**; a test asserts the object has none and that no model request path exists. The `workers` package's "only importer of pi-ai" statement is amended to "…for model calls".

**Store-version guard (FR-047, SC-011).** The commit that creates a store also records the library version. `openFactory` compares it with the installed version *before resuming any task*; a difference refuses by name (both versions in the message), with zero tasks resumed and the file untouched. Without this, a library upgrade could silently reinterpret persisted task state.

---

## 5. The gate **[built]**

### 5.1 Anatomy

A gate is two library tasks:

* **`kiln.gate`** — the task other tasks can wait on. A *projection*: it converges after the decision.
* **`kiln.decision`** — owned by the gate. Its one step registers a **slot** in owner memory and awaits it. No timer, no sleep, no polling: it is a waiting task, and the store holds no deadline for it (the oracle looks for one and the only acceptable answer is "none").

### 5.2 Opening — one commit

```
 open(key, spec)                     ── keyed in the command ledger ──
   hooks: open.begin
   ONE commit:  kiln.gate  (id, gate key, flow version, move vocabulary AS OF OPENING, brief ref, opener)
              + kiln.brief (content as it will be shown, keyed by its sha-256)
              + outbox: gate.opened {actor: opener, cause: the open key}
              + the gate and decision tasks
   hooks: open.after-write … open.committed
```

After any crash the gate is **absent or whole** — never "a gate document but no brief". The same key again returns the same gate (`repeat`); another key for the same gate id is a `key-conflict` naming the first.

### 5.3 Moving — one commit

```
 submit(gateId, key, move)
   validate  → invalid-move (no decider · kind outside the flow's vocabulary · no brief ref · another brief ref)
   not ready → not-ready      (start-up convergence not finished)
   unknown gate → unknown-gate
   the first caller takes the slot; later callers wait for its commit and RE-JUDGE against the stored record
   the decision step wakes and does ONE commit:
        move record (kind, decidedBy, brief ref, key, decidedAt)
      + outbox: move.committed {actor: decider, cause: move key}
      + its own terminal state                      ← the completion of the gate's decision
   hooks, in order: move.received · move.commit-begin · move.commit-after-read · move.commit-after-write · move.committed · move.ack-sent
   then the gate task wakes and settles itself:  gate.wake · outbox gate.settled {actor: "gate", cause: move key} · gate.settled
```

**Judging is against the stored record, never memory** — that is what makes the answers right after a restart:

| Situation | Outcome |
|---|---|
| first valid move | `committed` — durable at the moment you hear it |
| same key, equal move | `repeat` — names the original record, at any time, before or after any restart |
| same key, different move | `refused: key-conflict` (names the original key) |
| other key, record existed at arrival | `refused: stale` (names the winner) |
| other key, record appeared while waiting for the slot | `refused: lost-race` (names the winner) |
| failed commit (real or injected) | `refused: store-error`; the slot is **re-armed**; nothing was stored; the same key later commits |
| owner not yet converged | `refused: not-ready` — transient, retry the same key |

Closed vocabulary; **no new refusal code** was added by r13. A refusal never changes the store.

### 5.4 The honest reading of "settled"

The port's *settled* means "a move record exists" — derived from the store by `state()` and by inspection. The gate **task** is a projection that converges (it may lag by milliseconds, or by a restart). The oracle encodes both: the record is the truth; the task must agree *eventually*.

---

## 6. Data **[built]**

All in the library's root conversation, as generic document families:

| Family | Written | Mutable? |
|---|---|---|
| `kiln.store` | in the commit that creates the store (contract number, library version) | never |
| `kiln.gate` | opening commit | never |
| `kiln.brief` | opening commit | never |
| `kiln.move` | the move commit | never; **at most one per gate** |
| `kiln.command` | with the effect it guards (the ledger: key → request hash → first outcome) | never |
| `kiln.outbox` | appended in the commit of the state it records | append-only; `{seq, type, subject, at, actor, cause, data}` with non-empty actor and cause |
| `kiln.lane` | **[pending]** (T064–T067) | in the commit of the step that changes it |

**Brief identity** is the sha-256 of the canonical JSON of the brief. "The move names the brief it was decided on" is therefore an equality of two hashes — tamper-evident, and no version counters to keep consistent.

**Exactly-once commands.** A command is `(key, kind, request)`. In the same commit as its effect, the ledger is read: absent → apply and record; present with an equal request hash → return the stored outcome; present with another hash → `key-conflict`. **Key retention (R4):** a key lives as long as the thing it created exists in the live store; archiving (r15) may drop keys only for things it also drops. This is documented in code and README **[pending]**, T063.

**Copies at every commit boundary.** The library hands documents out as drafts that become unusable when settled; the seam copies through `plain()` on the way in and out. (The first symptom of forgetting this was `Cannot use a settled overlay`.)

**Outbox as seed.** The `type` names follow the concept docs (`gate.opened`, `move.committed`, `gate.settled`, later `lane.*`). r15 adopts the entries without migration; the schema is not frozen here. Constitution VII is met *for what r13 changes*; task/step progress, delegation and cost events are a recorded deferral to r15/r16.

---

## 7. One owner per store **[built]**

### 7.1 Why KILN has to enforce it

Neither SQLite nor the library stops a second process from opening the file and taking the write lock while the owner is idle (observed in r42 on both files). Two writers on a store whose gates live in owner memory would give two completers racing for one decision. So ownership is KILN's rule.

### 7.2 The lock

`<store>/owner.lock` is a **small separate SQLite database with one row** `{pid, host, started_at, socket}`. Starting is one `BEGIN IMMEDIATE` transaction: read the row, judge it, and — if free or stale — replace it. No other starter can interleave between the judgement and the claim.

| Row says | Result |
|---|---|
| nothing | claim it |
| live pid on this host | **refuse** (`StoreOwned`: store, pid, host, socket) — never steal |
| another host | **refuse** — a store moved between hosts must have been closed cleanly, which empties the row (constitution XI) |
| dead pid on this host | take over, atomically |
| clean close | the owner empties its own row (matching pid + start time, so a stale holder cannot remove a successor's) |

**How it got this shape** (see `notes.md`): the first design — create a file by hard link, break a stale one by rename + verify-and-put-back — passed light tests and then failed the 50-process stress test, where two starters both believed they owned a stale lock. A look-then-act on a file always has a window. The transaction closes it, and the stress test (fresh store; one stale lock ×3; torn lock; 50 real processes each) now yields exactly one owner and 49 refusals naming it.

### 7.3 The channel

* **Transport.** Unix-domain socket at `<tmp>/kiln-<uid>/<sha1(realpath store)[0..8]>.sock` — short (macOS limits socket paths to ~100 characters; a 200-character store path is a test), per-user, *not* inside the store (a moved store must not carry a dead socket).
* **Safe-directory rule.** The socket directory must be a real directory (no symlink), owned by the current uid, mode exactly `0700`, or the owner refuses with `ChannelUnsafe` naming the path and the problem. The rule is a pure function over a stat result, so "owned by someone else" is unit-tested without root. The socket itself is tightened to `0600` and checked.
* **Protocol.** Newline-delimited JSON, id-matched replies; five operations — `ping`, `ready`, `gate.open`, `gate.move`, `gate.state`. Domain refusals travel as *results* unchanged; `ok:false` is only for a request that could not be understood.
* **Client.** Connects by path only; never opens the store. A request whose connection is lost, or that gets no answer within **5 s**, becomes `refused(store-error)` with `detail: connection-lost | timeout` — explicitly *outcome unknown*, never a hang; the caller retries the same key.

### 7.4 The CLI

```
kiln owner --store <dir>                      # prints "listening", then "ready"; runs until SIGTERM; clean close
kiln gate open  --store … --key … --gate … --gate-key … --flow v1|v2 --brief file.json [--by who]
kiln gate move  --store … --gate … --key … --kind … --by … --brief-ref <hash>
kiln gate state --store … --gate …
```

One JSON line out. Exit **0** for any *answered* request (a refusal is an answer), **2** usage, **3** owner unreachable, **4** outcome unknown. `kiln owner` itself exits 1 on a refused start (`StoreOwned`, `ChannelUnsafe`, a version mismatch). A completer never creates the lock or the store (tested).

### 7.5 Readiness (FR-043, SC-005)

After a restart the owner withholds `ready` until every live decision has re-registered its slot and no gate task is ready or running. Before then, moves are `not-ready`. This is the one internal wait in the design: it is bounded (5 s), it is not a surface, it settles nothing, and the *tests* retry `not-ready` with bounded backoff. Measured: **100 open gates + 20 live units, SIGKILLed and restarted → ready in 42 ms**, 99 further moves committed in 55 ms (budget 2 000 ms).

---

## 8. How the design is attacked **[built, except lane/units variants]**

A proof that cannot fail proves nothing. The proof is layered:

| Mechanism | What it is |
|---|---|
| **Kill points as injected hooks** | The product calls `hooks.at("move.commit-after-write")` etc.; the default is a no-op. **No environment variable under `src/` can kill or fault a factory.** The test-only child owner (`tests/proof/support/owner-main.ts`) is the one place that arms a point from the environment. Today: 14 declared points (`open.*`, `wait.*`, `move.*`, `gate.*`, `recover.start`) plus one fault point (`store-write`). |
| **Declared == used** | A static test asserts the names used in the source equal the declared list. A point that nothing calls, or a call that was never declared, fails. |
| **Child owner + SIGKILL** | The owner runs in a child process and dies with SIGKILL — no handler, no flush, no close — exactly as a crash looks to the store. |
| **Fresh reader** | `inspectStore` reads the store with *no owner and no library task machinery*: gate state, documents, records, outbox, timers, commands, the decision/gate-task relation. What a test judges is the store, never the owner's memory. |
| **Oracle I1–I9** | I1 a waiting gate has no move record · I2 a settled gate has exactly one record and its decision terminal with that record's key · I3 nothing half-applied (record without completed decision and vice versa; gate document without brief or `gate.opened`; record without `move.committed`; terminal gate task without `gate.settled`) · I4 at most one record and one gate document per id · I5 a settled gate stays settled with the same record across restarts · I6 a waiting gate stays waiting and is never parked · I7 no timer, sleep or deadline · I8 the lane never records two holders (once built) · I9 a command key has one outcome and one request hash. |
| **Never vacuous** | The guard fails by name — `proof-zero-kill-points`, `proof-no-point-fired`, `proof-point-not-fired` — and the run prints `kill points exercised: N of N`. |
| **A broken gate** | A deliberately half-applying gate (two commits) lives in the tests' support code; the oracle must flag it (I2 + I3) at its own seam and *only* there. |
| **Mutation checks** | Seven sabotages applied to a clean tree, each shown to be caught by a named test, each reverted and verified reverted. They include: record without completing the decision; brief check skipped; repeat judged by memory; key-conflict branch dropped; restart un-settling a settled gate; store failure swallowed; crash-loop guard left at the library default. |

**What the evidence says today** (details and dates in `baseline.md`):

* **14 of 14** declared kill points fire, and at each: absent / waiting-whole / settled-whole, never partial; a restarted owner agrees; the same keys are safe to retry; exactly one `gate.opened`, one `move.committed`, one `gate.settled`.
* **300 random kills** (seed 20261026): 0 violations. The wrecks straddle the commit (14 absent · 60 waiting · 226 settled in the recorded run).
* **7 consecutive kills** with no move: still waiting, nothing parked, the next valid move commits; on a settled gate the record is unchanged.
* **Clock ±10 years, 2 s of real time, headless gate**: still waiting, 0 timers; `decidedAt` comes from the injected clock.
* **100 / 100 / 100 exactly once** — identical moves (1 committed, 99 repeat), competing moves (1 committed, 99 refused naming the winner), and 100 more after a SIGKILL and restart (0 committed) — *and the same again with the completer a separate process* (`kiln gate …`, 25 command-line processes in flight), plus the same 14 of 14 kill points with a command-line process mid-request.
* **Outcome unknown is real**: an owner killed mid-move gives exit 4 within a second (`connection-lost`); a silent owner is waited for the full 5 s (`timeout`); the same key then finishes the job exactly once.
* **No network**: `lsof -nP -a -i -p <owner>` is empty while serving, after a move, after a SIGKILL and restart; a control proves the probe sees a real TCP listener; a static scan finds no `listen`/`connect` with a port or host.

---

## 9. Governance **[mostly built]**

| Principle | How r13 meets it |
|---|---|
| **V — a missing person never approves** (the core) | Waiting is a stored state with no timer. No restart, crash count, clock or absence settles a gate. Every move needs a named decider. `restartLimit = Infinity`, proven by the storm and a mutation check. |
| **VI — Roadmap gate is human-only** | The roadmap shell's input and checkpoint have no delegation field *by construction*; a test asserts it; a move with no decider is `invalid-move`. |
| **VII — everything recorded, atomically** | `gate.opened`, `move.committed`, `gate.settled` (and `lane.*` later) are outbox entries with actor and cause, committed with the state they record. |
| **VIII — local by default** | The only IPC is a `0600` socket; 0 network ports. The library's provider SDKs sit on disk (installed as its dependencies) and the network lint still covers every KILN source file. |
| **IX — one committed state, event-driven surfaces** | The channel holds no truth (`state` reads the store); no surface polls — the CLI makes one request and exits. |
| **XI — a factory is portable** | The lock lives in the store and names its host (a foreign-host lock is never taken); the socket does not live in the store. |
| *Dependencies* | Exact pins, a committed lockfile, one seam, a record (`DEPENDENCIES.md` **[pending]**, T068–T069). |

**r12's checks, widened narrowly.** Still three checks (`network`, `boundaries`, `legacy`), still never vacuous.

* *boundaries*: one declared external seam; dependencies must be exact and locked; library specifiers allowed only in the durable package (and a test says only in `library/`).
* *network*: externals are exempt from the host scan *because* the seam is the only place they are reachable; `node:net` is allowed in exactly two files listed in `checks/local-ipc.json` and only on a socket **path**. Planted violations — `listen(8080)`, a host in `connect`, `node:net` in an unlisted file, `node:http` in a listed one, an undeclared external, the library imported from `workers`, a `^1.4.0` pin, a missing lockfile — each fail by name.

---

## 10. Decisions and deviations worth knowing

| Decision | Why |
|---|---|
| Gate = task + decision task, completion in the decision's single commit (the r42 `native-signal` composition, re-created, not copied) | The only composition that survived all five r42 guarantees. |
| Documents, not transcript entries, for gate data | Committed atomically with tasks; a fresh reader needs no conversation machinery. |
| Brief ref = content hash | Tamper-evident equality; no counters. |
| Kill points as injected hooks | A kill switch in product code is a product risk; tests arm it from outside. |
| Task id is an opaque number | The library mints them; KILN never parses. (A first draft passed it where a string actor was required and the roadmap test caught it.) |
| `node:sqlite` accepted with its warning | Clarification Q1: the library's only durable storage rests on it; recorded, canary-tested, floor raised. |
| The channel and CLI ship in r13 | Clarification Q1: a completer in another process (FR-017) needs a way in, and r14's headless walk will drive it. |

**Deviations from the plan, recorded when they happened** (`notes.md`):

1. **The lock became a transaction** (§7.2) after the first design failed its own stress test.
2. **A live pid is never taken from**, even if its channel does not answer. The plan allowed takeover; that would let a starter steal from an owner that is merely slow — producing two owners, the one outcome the lock exists to prevent. The probe now only enriches the refusal ("its channel did not answer; if pid N is not a KILN owner, empty the lock with …"). A reused pid therefore needs a human — the safe direction to fail.
3. **The CLI imports three durable modules**, not one: the channel client, the pure path arithmetic, and the owner runner (`kiln owner` *is* the owner process). A completer uses only the first two; a test scans `packages/cli/src` for exactly these.
4. **Mutation script bug** (kept as a lesson): the first run's reverts used the wrong path, so mutations accumulated; the script now asserts a clean tree after every revert.

---

## 11. Status and what remains

| Phase | Tasks | State |
|---|---|---|
| 1 Baseline and dependency | T001–T003 | **done** — pinned and locked, aligned to r42's tree |
| 2 Foundations (checks, skeleton, guard, inspection, oracle, harness) | T004–T023 | **done** |
| 3–4 Gate opens whole; settles once (US3, US2) | T024–T036 | **done** |
| 5 The gate is attacked (US1) | T037–T043 | **done** — 14/14, 300 random, storm, clocks, control, 7 mutations |
| 6 One seam, shells, scale (US4) | T044–T051 | **done** — 100 gates + 20 units ready in 42 ms |
| 7 One owner, channel, CLI (US7) | T052–T059 | **done** — lock stress, channel, no-network, separate-process proofs; closing checkpoint (full `npm test` + `npm run check`, commit) in progress |
| 8 Units and commands (US5) | T060–T063 | pending — unit kill points (`unit.step-*`), 100× `task.create`, the key-retention note, `packages/durable/README.md` with the power-loss boundary |
| 9 The lane (US6) | T064–T067 | pending — `lane-task.ts` implementing `LaneApi`, FIFO, `lane.*` entries, release-on-restart, oracle I8 |
| 10 Adoption record and floor (US8) | T068–T072 | pending — `DEPENDENCIES.md` + sync test, `node:sqlite` canary, honest statements, floor matrix 22.19 / 23.6 / 24.1 |
| 11 Close-out | T073–T080 | pending — re-measure scale, decide suite time, fresh-clone run of the quickstart, complexity re-read, implementation report |

**Costs to watch.** The new suite takes ≈ 125 s before Phase 7's additions (the separate-process proof alone is ≈ 100 s, since each completer is a whole Node process). The plan's budget for the whole `npm test` is three minutes; T074 decides whether to split a `proof` script rather than silently exceed it.

**r13 stays `queued`.** Closing the row is the human's Roadmap-gate move; this row does not edit `ROADMAP.md`, and `legacy/` stays byte-identical to its baseline.

---

## 12. Risks and unknowns

* **Experimental foundations.** Pi Durable 1.4.0 and `node:sqlite` are both experimental. Mitigations: exact pins, the store-version guard, one seam, a canary test **[pending]**, the floor matrix **[pending]**. An unannounced library behaviour change is caught by the proof, not by reading release notes.
* **Not tested: power loss.** Process death is covered; loss of host power may lose the newest commit. Stated, not hidden.
* **macOS only.** r12 and r42 measured nothing else; the README will say so.
* **Pid reuse.** A dead owner's pid reused by an unrelated live process blocks start-up until a human empties the lock (the message gives the command). Deliberate (§10).
* **Suite time.** See §11.
* **Lane and units under kill** are not yet proven (Phases 8–9); the oracle's lane invariant (I8) exists only as a placeholder until then.

---

## 13. Glossary

* **Seam** — the one KILN module (`packages/durable`, library access only in `library/`) through which the library is reached.
* **Owner** — the single process that has opened a store; holds the lock and serves the channel.
* **Completer** — anything that settles a gate from outside the owner (the CLI, later server workers); reaches gates only through the owner.
* **Slot** — the owner-memory rendezvous a waiting decision step parks on; a move wakes it. Never the source of truth.
* **Kill point** — a named step in the product where a test may end the process; declared in `hooks.ts`.
* **Fresh reader** — `inspectStore`: reads a store with no owner and no task machinery.
* **Oracle** — the invariants I1–I9 applied to an inspection.
* **Outcome unknown** — the answer a client gives when the owner's reply never arrived; the same key is retried, and exactly-once makes that safe.
* **Outbox** — the append-only document of what the core changed, each entry with actor and cause; r15's event stream adopts it.

---

## 14. Reading order

1. This overview, then [contracts/gate-contract.md](./contracts/gate-contract.md) — the contract a next-row author actually needs.
2. [contracts/seam-api.md](./contracts/seam-api.md) and [contracts/owner-channel.md](./contracts/owner-channel.md).
3. [data-model.md](./data-model.md) §2 (the gate, and the invariants) and [research.md](./research.md) R2–R7.
4. [notes.md](./notes.md) for what the work found (the lock, the mutation checks, the calibration), and [baseline.md](./baseline.md) for the measured numbers per phase.
5. The proof, in this order: `packages/durable/tests/proof/support/oracle.ts` → `kill-points.test.ts` → `exactly-once.test.ts` → `different-process.test.ts`.
