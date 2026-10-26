# Feature Specification: Durable core and the gate contract (row r13)

**Feature Branch**: `011-durable-core-gate-contract`

**Created**: 2026-10-26

**Status**: **Clarified (2026-10-26)** — three questions asked and answered on the recommended option (see *Clarifications*), then a cross-artifact analysis (2026-10-26) whose findings are folded in; ready for `/speckit-implement`. Roadmap row **`r13`** is the **admitted next row** (Roadmap gate, `human@batorfi`, entry 4 of `gate0.note` in [specs/ROADMAP.md](../ROADMAP.md), merged 2026-10-26T12:46:25Z). It stays `queued` — never `active` — until its own first gate opens (`chain_unattended=false`). **Nothing here admits a program, advances a gate, decides a gate or edits the roadmap** (constitution VI).

**Input**: the row **`r13`** — *"Durable core — the Pi Durable seam and the gate contract: roadmap, row, unit, gate and lane tasks; a move and its gate's completion in one atomic commit, first move wins, no clock settles a gate, headless means waiting; proven by kill-and-resume with nothing approved by a restart."* Dependencies **r12** (`done`, `@PR#2`) and **r42** (`done`, `@PR#4`, verdict **`go`**). PRD requirements carried: **CORE-1 … CORE-5**, **CORE-7 (the store; the archive is r15)** and **LANE-1**. Governing text: [`docs/concepts/pi-durable.md`](../../docs/concepts/pi-durable.md) §5–§11, [`docs/prd/kiln-prd.md`](../../docs/prd/kiln-prd.md) §6.2, constitution V, VI, VII, VIII, IX and *Dependencies*.

**Provenance (what r13 builds on, and does not re-open).**
- **r12** left `kiln/packages/durable` empty on purpose (one stated responsibility, nothing in it), a flow-as-data package (`flowOf`, `moveAllowed`, the closed set of nine move kinds), a runner that fails a run that executed nothing, and three never-vacuous checks — `network`, `boundaries`, `legacy` — under which `kiln/` has **no runtime dependency and nothing to install**.
- **r42** settled the primitive: one native composition of the pinned library (`@earendil-works/pi-durable` 1.4.0) keeps all five guarantees — atomic, keyed exactly once, first move wins, no clock, resumes as it was — including with the completer in another process. Its **post-spike port** ([contracts/gate-completion-port.md](../010-external-completion-spike/contracts/gate-completion-port.md), the *Post-spike form* section) and its [spike report](../010-external-completion-spike/spike-report.md) are **inputs**, not questions: this row builds the real gate on that contract and does not re-litigate the primitive. r42 also handed r13 four decisions (see *Dependency adoption*) and four **operating conditions** the durable core must itself guarantee (FR-040 … FR-043).
- The throw-away spike code in `spikes/r42/` is **not** product code and is **not** copied; the port is re-created here from the contract (spike report §8).

## Clarifications

### Session 2026-10-26

- Q: Node's built-in SQLite — the library's only durable storage — is **experimental** on the declared Node floor (Node prints a warning on 22.19.0; none on 25.9.0). Which posture does r13 take? → A: **Option A — accept it, record it, and watch it**: the floor stays `^22.19.0 || >=23.6.0`, the warning is accepted and documented as part of the recorded dependency decision, the storage is opened in exactly one place, and a test fails if the module disappears or its behaviour changes. No narrower Node range and no second SQLite binding in r13; a later row may revisit either.

### Session 2026-10-26 *(clarify)*

- Q: Should r13 itself ship the small local channel through which another process hands a move to the owner of the store, or only the in-process contract? → A: **Option A — ship a minimal local-only channel in r13**: the owner serves it on a private local socket (no TCP or UDP port, reachable only by the same user on the same machine), carrying just the port's operations (open a gate, submit a move, read a state) plus a ping and a ready signal; a thin CLI command uses it; the web server of r19/r20 reuses it later. Operator surfaces (listing gates, showing a gate) stay out of r13.
- Q: If a move names a brief that is not the brief the gate was opened with, should the gate refuse it, or record it as given? → A: **Option A — refuse it as `invalid-move`**: a move whose brief reference differs from the gate's committed brief, or that names none, is refused; nothing is written and the gate stays waiting. No new refusal code is added (the outcome vocabulary stays closed).

## User Scenarios & Testing *(mandatory)*

The "users" of this row are the **Operator** (the person who runs a factory and decides its gates, possibly days later, possibly from a different process than the one that opened them) and the **engineer** of the rows after r13 (r14 walks the flow, r15 records, r16 runs workers, r18 directs), who must build on a core they can trust without reading the library. Nothing here has a graphical surface; the proofs are crashes and restarts, and the interface is the contract.

### User Story 1 - A gate waits for a person for as long as it takes, whatever happens to the machine (Priority: P1)

A gate is open and waiting for the Operator. The server is killed, the machine reboots, the process is restarted ten times in a row over a long weekend. When the factory is up again the gate is still open and still waiting — exactly as it was — and it accepts the Operator's move as if nothing had happened. No restart, crash, lost connection, timeout or clock jump has settled it, approved it, rejected it or parked it.

**Why this priority**: this is KILN's central promise (constitution V and VI: a missing person never approves; the Roadmap gate is human-only, always). Everything else in the factory is built on it.

**Independent Test**: open a gate, kill the owner at every named point of the open–wait sequence and again many times with no move in between, restart each time, and read the store from a fresh process: the gate is `waiting` with no move record, was never settled and was never blocked.

**Acceptance Scenarios**:

1. **Given** an open gate with no move, **When** the owner is killed abruptly and restarted, **Then** the gate is waiting and a valid move still settles it.
2. **Given** an open gate, **When** the owner is killed and restarted more times in a row than the library's crash-loop limit (its default is 5), with no move in between, **Then** the gate is still waiting, is not reported as parked or blocked, and the next valid move commits.
3. **Given** an open gate, **When** the system clock jumps ten years forward, or a long real time passes, **Then** nothing settles the gate and no timer, sleep or deadline exists on the gate or its decision (a person reading the store finds none).
4. **Given** a *headless* factory (no browser, no CLI attached, nobody watching), **When** a gate opens, **Then** it simply waits — headless means waiting; nothing is auto-approved to keep the run going.

---

### User Story 2 - A person's move settles a gate once, atomically, and the first move wins (Priority: P1)

The Operator decides a gate: the move and the gate's completion are one commit — either the move is recorded *and* the gate settled, or nothing at all is written. Sending the same move twice (a retry, a double click, a second device) returns the original outcome. Two different moves racing for the same gate produce exactly one winner; every loser is refused and told who won. A move that arrives after the gate has moved on is refused, and nothing changes.

**Why this priority**: the second half of the promise — a gate is settled by a person's move and by nothing else, exactly once. It is the contract r14 onwards depends on.

**Independent Test**: from a separate process, send 100 identical moves, then 100 different competing moves, then a stale one, an invalid one and a conflicting one — and kill the owner at every named step of the move: exactly one record, no half-applied move, every refusal named and harmless.

**Acceptance Scenarios**:

1. **Given** a waiting gate, **When** a valid move arrives with a new key, **Then** the move and the gate's completion are committed together and the outcome is `committed`; a `move.committed` entry naming the decider (actor) and the key (cause) is committed in that same commit.
2. **Given** a settled gate, **When** the same key arrives with an equal move — before or after any restart — **Then** the outcome is `repeat`, naming the original record, and nothing is written.
3. **Given** a settled gate, **When** the same key arrives with a *different* move, **Then** it is refused `key-conflict`, naming the original; it is never treated as a repeat.
4. **Given** a waiting gate and many different moves at once, **When** they race, **Then** exactly one is `committed` and each of the others is refused (`lost-race` or `stale`) naming the winner's key; the store holds one record.
5. **Given** a move with no decider, a move outside the gate's vocabulary, a move that names no brief or a brief other than the gate's committed one, or a gate that does not exist, **When** it arrives, **Then** it is refused (`invalid-move`, `unknown-gate`) and nothing is written.
6. **Given** the owner is up but not yet ready after a restart, **When** a move arrives, **Then** it is refused `not-ready`, and the same key succeeds a moment later.
7. **Given** the store fails at the moment of writing, **When** a move arrives, **Then** it is refused `store-error`, the gate is still waiting, nothing is recorded, and the same key commits once the fault is gone.
8. **Given** the owner is killed at any step between "move received" and "acknowledged", **When** it restarts, **Then** the gate is either waiting with no record, or settled with exactly one record whose completion is stored — never in between — and a caller who does not know the outcome can retry the same key safely.

---

### User Story 3 - A gate opens whole, with the brief exactly as it will be shown (Priority: P1)

When a gate opens, three things are committed together: the **gate document**, the **brief as it will be shown** to the person, and a **`gate.opened`** record. After any crash the gate is either not open at all, or open with all three. The move that later settles it refers to the brief **as it was seen** — so what the person decided on can always be reproduced.

**Why this priority**: a person can only decide what they were shown (constitution VII, everything is recorded); a gate that is open without its brief, or a brief that can change after the fact, makes every decision unauditable.

**Independent Test**: kill the owner at every named step of opening a gate; after each restart the gate is absent or complete (document, brief, opened record), never partial; settle it and read back the move: it names the brief it was decided on, byte-for-byte as committed at opening.

**Acceptance Scenarios**:

1. **Given** a gate being opened, **When** the owner is killed at any step of the opening, **Then** on restart the gate is either not open (and opening it again, with the same key, yields one gate) or fully open.
2. **Given** an open gate, **When** it is settled, **Then** the move record references the committed brief as seen; the brief itself is unchanged since opening.
3. **Given** a gate already open, **When** the same opening is requested again (same key), **Then** there is still exactly one gate and one `gate.opened`.

---

### User Story 4 - Everything durable goes through one seam, and the five task types exist (Priority: P1)

All use of Pi Durable lives behind one KILN module, so that the rules (the gate contract, the lane, exactly-once) are written in KILN's own terms and outlive the library's API. The durable core provides the five task types of the factory — **roadmap** (holds the Roadmap gate), **row** (the director's shell for one feature), **unit** (one step), **gate**, **lane** — with their creation, checkpointing, waiting, resuming and settling. No other module of `kiln/` imports the library, and a check says so and fails by name.

**Why this priority**: CORE-1 and CORE-2. The seam is what makes "the contract outlives the API" true, and the task types are what r14–r18 attach their behaviour to.

**Independent Test**: the boundaries check passes on the tree and fails by name when a file outside the durable package imports the library (a planted violation); each task type can be created, run through its life, killed and resumed using only the seam's own types.

**Acceptance Scenarios**:

1. **Given** the tree, **When** `kiln check boundaries` runs, **Then** it passes, and the library is reachable only from the durable package.
2. **Given** a file in another package that imports the library (directly, by any spelling the check understands), **When** the check runs, **Then** it fails by name, naming the file.
3. **Given** each of the five task types, **When** it is created through the seam, run, killed and restarted, **Then** it resumes from its last checkpoint and finishes with the outcome it would have had without the crash.
4. **Given** the seam's public types, **When** a reader looks for the library's names in them, **Then** there are none (the contract is in KILN's terms only).

---

### User Story 5 - A half-done step never commits its result, and every command happens once (Priority: P2)

A unit task (one step) is killed halfway through its work. On restart it resumes from its last checkpoint and runs again; its partial result was never committed, so nothing is half-recorded and nothing is done twice. Any command that changes the factory (open a feature, open a gate, submit a move, create a task) carries an idempotency key; repeating it returns the original result and changes nothing.

**Why this priority**: CORE-4 and CORE-5 — the guarantee that makes unattended work safe. It rests on the gate contract (P1) but covers every other task.

**Independent Test**: a scripted unit task killed at every named point inside its work resumes and commits exactly one result; a command repeated 100 times, before and after restarts, takes effect once.

**Acceptance Scenarios**:

1. **Given** a unit task partway through, **When** the owner is killed and restarted, **Then** the task resumes from its last checkpoint and commits its result once; no half-result is visible at any point.
2. **Given** a command with a key, **When** it is repeated (concurrently or after a restart), **Then** the first outcome is returned for every repeat and its effect happened once.
3. **Given** the same key with a *different* command, **When** it arrives, **Then** it is refused as a conflict and nothing changes.

---

### User Story 6 - The lane: at most one running generation per factory, and it survives restarts (Priority: P2)

Each factory has one **lane task**. A step must acquire the lane before it starts a generation and release it when done; the lane holds the resident model, the hold flag (set for Architecture, Code review and Verification), and the swap count. At most one generation runs at a time; a second step asking for the lane waits its turn. The lane's state survives a restart; a lease held by a generation that died with the process is not mistaken for a running generation afterwards.

**Why this priority**: LANE-1 and constitution III (one lane per factory; sequential inside it). It is P2 because it needs the task machinery of the P1 stories, and because this row gives it **no real model** — it is proven with scripted generations; real models and residency arrive in r16.

**Independent Test**: two scripted steps ask for the lane at once — one runs, one waits; kill and restart in the middle — the lane state (resident model, hold flag, swap count) is as it was, no generation is considered running, and the waiting step proceeds.

**Acceptance Scenarios**:

1. **Given** the lane is free, **When** two steps ask for it at once, **Then** exactly one holds it and the other waits; at no instant do two hold it.
2. **Given** a step holds the lane, **When** the owner is killed and restarted, **Then** the lane's recorded state is as it was, the dead generation's lease is released, and the step (resumed from its checkpoint) re-acquires the lane before generating again.
3. **Given** the lane state (resident model, hold flag, swap count), **When** it is changed, **Then** the change is committed with the step that caused it and survives any restart.

---

### User Story 7 - One store per factory, one owner per store (Priority: P2)

A factory has exactly one durable store, and exactly one process owns it at a time. Anything else that wants to complete a gate (the CLI, a server worker) reaches it through the owner. A second process that tries to become an owner of an already-owned store is refused with a clear message, and never opens it. The durable core never leaves a waiting gate parked because of repeated crashes.

**Why this priority**: CORE-7 (store) and the r42 operating conditions: neither the library nor the database stops a second process from opening the file and taking its write lock while the owner is idle, so the rule has to be enforced by KILN, not assumed.

**Independent Test**: start an owner; start a second owner on the same store — it is refused every time and the first is unharmed; kill the first and start another — it takes over; a completer in a separate process delivers moves through the owner only.

**Acceptance Scenarios**:

1. **Given** an owned store, **When** a second process tries to become its owner, **Then** it is refused with a message naming the store and the current owner, and the store is untouched.
2. **Given** an owner killed abruptly, **When** another process starts, **Then** it becomes the owner (a dead owner does not hold the store forever) and resumes everything.
3. **Given** a completer that is a different process, **When** it submits a move, **Then** it goes through the owner's local channel and never touches the store file.
4. **Given** the owner's channel, **When** another user on the machine, or any host on the network, tries to use it, **Then** it is unreachable: the channel is a private local socket owned by the factory's user, and the owner holds no TCP or UDP port.

---

### User Story 8 - Adopting the dependency without weakening what r12 guaranteed (Priority: P2)

`kiln/` stops being dependency-free, deliberately and once: the library and its companions are added **pinned and locked**, reached only through the seam, as a **recorded decision**. The platform floor rises to what the library needs, and r12's own floor run is repeated on it. The three checks keep working and keep refusing: the boundary check admits the library only through the one declared external seam, the network check does not give a new door to the network, and the statements that said "nothing to install" are made true again.

**Why this priority**: r42 handed these decisions to r13 (constitution *Dependencies*: pinned, recorded, one seam). It is P2 because the P1 stories are the product; this story keeps the product from silently weakening the guarantees r12 gave.

**Independent Test**: on a fresh clone, install per the documented command, run the suite and the three checks on the new Node floor — all pass with the same or more tests; a planted second dependency, an unpinned version or a library import outside the seam each make a check fail by name.

**Acceptance Scenarios**:

1. **Given** a fresh clone, **When** the documented install and the suite run on the new floor, **Then** all tests and the three checks pass; the install is the only network act.
2. **Given** the declared dependencies, **When** a version range, a floating tag or an undeclared package is introduced, **Then** a check fails by name.
3. **Given** the checks, **When** they run, **Then** the network check still refuses network use anywhere in `kiln/` (the library's provider SDKs, present on disk, are never reached) and the boundary check lists the library as the one external seam.
4. **Given** the documentation that said "no dependency / nothing to install", **When** this row closes, **Then** it says what is true now.

---

### Edge Cases

- **Killed while opening a gate** (before, during, after the opening commit): absent or whole, never partial (US3).
- **Move arrives for a gate that is not open yet / was never opened:** refused `unknown-gate`; no gate is created by a move.
- **Move arrives while the owner is restarting:** `not-ready`, transient; the caller retries the same key. The window is bounded and the owner reports ready only when waiting gates can accept moves again.
- **Owner killed after the commit but before the acknowledgement:** the caller does not know the outcome; retrying the same key returns `repeat` of the original — safe at any time.
- **Two owners racing for one store at start-up:** exactly one wins; the other is refused (US7).
- **A restart storm** (more consecutive crashes than the library's own limit): no task of the factory is parked by it; waiting gates keep waiting; running tasks are resumed.
- **A very long wait** (months, several upgrades of KILN in between): the gate still waits and still accepts its move; the brief it carries is the one committed at opening.
- **The store is damaged or full at the moment of a move:** refused `store-error`, gate waiting, nothing recorded; the same key commits after the fault.
- **A move kind or decider the gate's vocabulary does not allow** (flow data of r12): `invalid-move`, nothing written; a move with no named decider never settles a gate.
- **A move that names a different brief than the gate's** (for example one decided against a stale view): `invalid-move`, nothing written; the person's decision is never recorded against something they were not shown.
- **The system clock moves backwards or jumps:** nothing settles, nothing expires; times in the record are facts, never triggers.
- **Host power loss:** outside the guarantee (abrupt process death is inside it); the core states the boundary, it does not pretend to cover it.
- **The socket directory already exists** (pre-created by another user, a symbolic link, or with the wrong mode): the owner refuses to serve and names the problem; it never serves in, or follows a link into, a directory it did not make safe.
- **A different version of the library opens the store:** not supported in this row; versions are pinned and an upgrade is a deliberate, recorded change.

## Requirements *(mandatory)*

### Functional Requirements

**The seam and the task types (CORE-1, CORE-2)**

- **FR-001**: All use of Pi Durable MUST live in one KILN module (the durable package); no other module of `kiln/` MAY import it, by any spelling, and a check MUST fail by name when one does.
- **FR-002**: The seam's public types and operations MUST be expressed in KILN's own terms only (gate, move, key, outcome, refusal, task, checkpoint); the library's names MUST NOT appear in them.
- **FR-003**: The durable core MUST provide five task types — **roadmap**, **row**, **unit**, **gate**, **lane** — each creatable, checkpointed, resumable and settleable through the seam, with its own stated checkpoint and outcome.
- **FR-004**: The **roadmap** task MUST hold the Roadmap gate; that gate MUST be settled only by a person's committed move (constitution VI) — no delegation, timer, or task MAY ever settle it. The **row** task MUST be the shell of one feature (its checkpoint is where the director of r18 will keep its state); the **unit** task MUST be one step; their *behaviour* is out of scope (r14, r16, r18).
- **FR-005**: Task creation, ownership (which task or factory owns which) and the set of live tasks MUST be readable from the store by a fresh process, never from memory.

**The gate contract (CORE-3)**

- **FR-010**: Opening a gate MUST commit, in one atomic step, the **gate document**, the **brief as it will be shown** and a **`gate.opened`** record; after any crash the gate is either not open or open with all three. Opening is keyed: the same key opens one gate. The outcomes of opening are `opened`, `repeat` (same key, equal request) and the refusals `key-conflict`, `invalid-move`, `store-error` and `not-ready` — no new refusal code. The opening commit also carries the `gate.opened` entry's **actor** (who opened it) and **cause** (the command key), per FR-019.
- **FR-011**: A gate MUST wait without running code and without holding a model, and MUST be settled **only** by a person's committed move (or, in a later row, an explicitly recorded delegation on a clean path); no timer, timeout, restart or clock MAY settle, expire, approve or park it. No durable timer, sleep or deadline MAY exist on a gate or its decision.
- **FR-012**: A **move** MUST be one atomic commit of: the move record (kind, `decidedBy`, the reference to the brief as seen, its key) **and** the completion of the gate's decision. Either both are stored or nothing is. The same commit MUST append the `move.committed` outbox entry (FR-019).
- **FR-013**: Moves MUST be **keyed exactly once**: the same key with an equal move returns the original outcome (`repeat`, naming the original record), at any time, before or after any restart; the same key with a different move is refused (`key-conflict`).
- **FR-014**: **First move wins.** Among racing moves exactly one is `committed`; every other is refused (`lost-race` or `stale`) and the refusal MUST name the key of the move that settled the gate. A refusal never changes the store.
- **FR-015**: A move MUST be validated against the gate's move vocabulary (from the flow data of r12), MUST have a named decider and MUST reference the brief the gate was opened with — a move that names no brief, or another one, is refused; otherwise it is refused `invalid-move` and nothing is written. A move to a gate that does not exist is refused `unknown-gate`.
- **FR-016**: The outcome vocabulary MUST be that of the post-spike contract — `committed`, `repeat`, and the refusals `lost-race`, `stale`, `key-conflict`, `invalid-move`, `unknown-gate`, `not-ready`, `store-error` — with `committed` meaning **durable** (acknowledged only after the record and the completion are stored). No new refusal code MAY be added without a contract change recorded in this row.
- **FR-017**: A move MUST be deliverable from a **different process** than the one that owns the store, through the owner, with every guarantee of FR-012 … FR-016 intact.
- **FR-018**: The state of a gate MUST be read from the store, never from memory: `waiting`, `settled` (with its one record) or `unknown`.
- **FR-019**: **Everything the core changes in a gate's life MUST be recorded** (constitution VII) as an entry of the factory's outbox, each with an **actor** and a **cause**, committed **in the same commit as the state it records**: `gate.opened` (actor: who opened it; cause: the command key), `move.committed` (actor: the decider; cause: the move's key), `gate.settled` (actor: the factory; cause: the settling move's key — committed with the gate task's own terminal state). After any crash a gate document without its `gate.opened`, a move record without its `move.committed`, or a terminal gate task without its `gate.settled` MUST NOT exist. The entries are minimal and their schema is not frozen here (the catalog is r15's); the recorded **deferral** — task and step progress, delegation and cost events — is stated in Assumptions.

**Resume and exactly-once (CORE-4, CORE-5)**

- **FR-020**: After any restart every live task MUST resume from its last checkpoint; a waiting gate MUST resume as waiting; a half-done step MUST NOT commit its result — its work is redone from the checkpoint and its result committed once.
- **FR-021**: Every command that changes the factory MUST carry an idempotency key; repeating a command returns its first outcome and changes nothing; the same key with a different command is refused as a conflict. *Command* means an operation invoked from outside the core — over the channel, the CLI or the API: **`gate.open`, `gate.move` and `task.create`** in this row. Internal transitions (a task's own checkpoint, the lane's acquire and release, serving and closing) are **not** commands and carry no key; they are recorded by FR-019 and FR-031.
- **FR-022**: The core MUST hold up under a **restart storm**: no task MAY be parked, faulted or abandoned because it was cut off by crashes (see FR-040).

**The lane (LANE-1)**

- **FR-030**: There MUST be one **lane task** per factory. A step MUST hold the lane before it starts a generation and release it afterwards; at most one generation MAY be running per factory at any instant.
- **FR-031**: The lane MUST record the **resident model**, the **hold flag** (for Architecture, Code review and Verification) and the **swap count**; changes to them MUST be committed with the step that causes them and MUST survive restarts. Each acquisition, release and swap MUST also be an outbox entry with actor and cause (FR-019): `lane.acquired`, `lane.released`, `lane.swapped`.
- **FR-032**: After a restart, a lease held by a generation that died with the process MUST be released; the resumed step re-acquires the lane before generating again; no restart MAY leave the lane reporting a generation that is not running, nor two.
- **FR-033**: In this row the lane is proven with **scripted generations**; no real model is loaded, and the affinity scheduler and model residency are out of scope (LANE-2 ported in r12; r16).

**One store, one owner (CORE-7, store)**

- **FR-040**: The durable core MUST be configured so that a waiting gate is **never parked** by repeated crashes, and this MUST be enforced where the library is opened (one place), not left to callers.
- **FR-041**: A factory MUST have exactly one durable store, and exactly one process MUST own it at a time; a second process attempting to own an owned store MUST be refused with a message naming the store and the owner, and MUST NOT open it. A dead owner MUST NOT hold the store forever.
- **FR-042**: Completers (CLI, server workers) MUST reach gates through the owner and MUST NOT open the store file themselves. (A completer in a different process is FR-017; this is the rule that makes it possible.)
- **FR-045**: The owner MUST serve a minimal **local-only channel** carrying exactly the port's operations — open a gate, submit a move, read a gate's state — plus a liveness probe and a ready signal. The channel MUST be a private local socket reachable only by the factory's own user on the same machine; the owner MUST NOT hold any network (TCP or UDP) port; and the network check MUST keep passing. Every outcome and refusal of FR-016 MUST cross the channel unchanged, and a caller whose owner dies mid-request MUST receive an explicit *outcome unknown* (retry the same key) rather than hang. The directory that holds the socket MUST be **safe**: created with mode `0700`, and if it already exists it MUST be a real directory (not a symbolic link), owned by the current user, with mode exactly `0700`, otherwise the owner MUST refuse to serve and say why; the same for the socket file (`0600`, owned by the current user). A path that someone else pre-created MUST never be trusted.
- **FR-046**: A thin command-line client MUST wrap the channel for scripted use (the headless walk of r14 drives it); operator surfaces beyond the port's three operations (listing gates, showing a gate's brief) are out of scope.
- **FR-043**: The owner MUST answer `not-ready` to moves between its start and the moment waiting gates can accept moves again, and MUST report ready only after that. The window MUST be **bounded at 5 seconds** — if waiting gates cannot accept moves by then the owner MUST say so (not report ready) — and **observable** (the channel's ready signal and `not-ready` answers).
- **FR-044**: The core MUST state its **power-loss boundary** (abrupt process death is covered; loss of host power may lose the newest commit and is not tested) in the seam's documentation.

**Dependency adoption (r42's hand-offs)**

- **FR-050**: The library and its companions MUST be admitted to `kiln/` as **pinned, locked** runtime dependencies (exact versions, committed lockfile), as a **recorded decision**, reachable only through the seam. A version range, a floating tag or an undeclared package MUST make a check fail by name.
- **FR-051**: The platform floor of `kiln/` MUST rise to what the library requires (at least Node 22.19.0), and r12's own floor run (done on 22.18.0) MUST be repeated on the new floor with the result recorded.
- **FR-052**: The boundary check MUST list the library as the one declared external seam (today `externals` is empty); the network check MUST keep refusing network use anywhere in `kiln/` — the library's provider SDKs, present on disk through its dependencies, MUST never be reached by KILN code; r12's three checks MUST stay never-vacuous and keep their own tests.
- **FR-053**: Every statement that `kiln/` has "no dependency" or "nothing to install" (README, quickstarts, package metadata) MUST be made true again, stating the one install step.
- **FR-054**: Node's built-in SQLite, on which the library's only durable storage rests and which is **experimental** on the declared floor, MUST be **accepted with its warning** on the supported range (Clarifications, 2026-10-26), recorded as part of the dependency decision, opened in **exactly one place**, and guarded by a test that fails if the module is missing or behaves differently — not by prose alone. The warning MUST be documented where the install is documented.

**Proof (the row's acceptance)**

- **FR-060**: The durable core MUST be proven by **kill-and-resume**: the owner is killed abruptly (SIGKILL, no cleanup) at every **named step** of opening a gate, waiting, receiving a move, committing it, acknowledging it and waking the gate's parent task, and at random instants; after each kill a fresh reader with no owner inspects the store and the invariants of the contract hold (waiting ⇔ no record; settled ⇔ exactly one record and a completed decision; at most one record; settled stays settled; waiting stays waiting and unparked; no timer).
- **FR-061**: The proof MUST be **never vacuous**: a run that exercised no kill point, or whose declared list of points is empty or not fully exercised, MUST fail by name; the proof MUST be shown able to fail (a deliberately half-applied commit is caught).
- **FR-062**: The proof MUST run with the completer in a separate process, and MUST include the cases of the contract: 100 repeats, 100 racers, a conflict, a stale move, an invalid move, an unknown gate, a move during start-up and an injected store failure.
- **FR-063**: Adopting the dependency MUST NOT reduce what r12 proved: the new and legacy suites keep passing with at least their previous counts, `npm run check` keeps three passes, and `legacy/` stays byte-identical to its baseline.

### Key Entities

- **Factory**: one durable store and one owning process; the unit that everything below lives in.
- **Task**: a durable state machine with a kind (roadmap, row, unit, gate, lane), an owner, an input fixed at creation, a checkpoint and an outcome; resumable from its checkpoint.
- **Gate**: a point that waits for a person; has a document, a brief as shown, a state (`waiting` / `settled`) and a move vocabulary taken from the flow data.
- **Brief as shown**: the committed content the person is shown when the gate opens; referenced, never rewritten, by the move.
- **Move / Move record**: a person's decision (kind, `decidedBy`, reference to the brief as seen) and the one record it leaves; at most one per gate.
- **Decision**: the completion of the gate's wait; completed in the same commit as the move record.
- **Key (idempotency key)**: the identity of one submission of a command or a move; same key + equal request = repeat, same key + different request = conflict.
- **Outcome / Refusal**: the closed vocabulary of the contract (committed, repeat, and the refusals); every refusal changes nothing.
- **Lane**: one per factory; resident model, hold flag, swap count, and at most one lease.
- **Lease**: the right to run one generation; released if its holder dies with the process.
- **Seam**: the one KILN module through which the library is reached; the home of the contract's types.
- **Owner**: the one process that holds the store; completers talk to it.
- **Channel**: the owner's private local socket and its small request/response vocabulary (the port's three operations, a liveness probe and a ready signal); the only way another process reaches a gate.
- **Outbox entry**: one append-only record `{seq, type, subject, at, actor, cause, data}` committed with the state it records; the interim event stream of this row (`gate.opened`, `move.committed`, `gate.settled`, `lane.acquired`, `lane.released`, `lane.swapped`) that r15 adopts as the first events of the record.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Killing the owner at **every named step** of the gate's life (open, wait, move received, commit, acknowledge, wake) and at ≥ 300 random instants leaves **zero** half-applied moves and zero half-open gates: after each kill a fresh reader finds the gate absent, waiting with no record, or settled with exactly one record and a completed decision. Every gate document has its `gate.opened` entry, every move record its `move.committed` entry and every terminal gate task its `gate.settled` entry, each naming an actor and a cause — in the same commit — after every kill.
- **SC-002**: A waiting gate survives **≥ 7 consecutive kills** with no move in between (more than the library's own limit of 5): still waiting, not parked, and the next valid move commits.
- **SC-003**: **100 concurrent identical moves** from a separate process yield exactly 1 `committed`, 99 `repeat` and 1 record; **100 competing moves** yield exactly 1 `committed` and 99 refusals each naming the winner; 100 more identical moves after a kill and restart yield 0 `committed`.
- **SC-004**: **No restart, timeout or clock jump (ten years, forward or backward) ever settles a gate** — 0 settlements in the proof; a read of the store finds 0 timers, sleeps or deadlines on any gate or decision.
- **SC-005**: A restarted owner reports ready, and accepts moves on every waiting gate, within **2 seconds** for a factory of at least 100 live tasks; a move that arrives earlier is refused `not-ready` and the same key succeeds afterwards.
- **SC-006**: **One** module of `kiln/` imports the library; a planted import elsewhere is refused by the boundary check by name in 100 % of the spellings the check already covers for other imports.
- **SC-007**: A second process tries to own an owned store **20 times** — refused 20 times, the first owner unharmed; after the first owner is killed, a new process takes over on its first attempt. The owner's open network ports number **0**, while serving, after a kill and after a restart; a request whose owner dies mid-way ends with an explicit *outcome unknown* within 5 seconds, never a hang.
- **SC-008**: Two steps asking for the lane at once: **0** instants with two holders across ≥ 100 trials; after a kill during a held lease, the lane reports **0** running generations until the resumed step re-acquires it.
- **SC-009**: On a fresh clone, the documented install plus `npm test` and `npm run check` pass on the new floor with **at least 184 new + 500 legacy** tests (r12's counts) plus the row's own, and the three checks report `PASS`; `legacy/` tree id is unchanged.
- **SC-010**: A reader who has never seen the library can write the next row's first task from this row's contract and documentation alone: the seam's public types contain **0** library names.

## Assumptions

- **Scope.** r13 delivers the **core**: the seam, the five task types, the gate contract, the lane, one-store-one-owner, and the dependency adoption. It also delivers the owner's minimal local channel and a thin CLI client over it (Clarifications). It does **not** deliver: operator surfaces such as listing gates or showing a brief, walking the twelve-gate flow headless (r14), the event record, outbox, catalog and the feature archive (r15 — CORE-7's archive half), real local workers and model residency (r16), configuration as files (r17), the director's logic (r18), the content of briefs and the web or CLI surfaces that show them (r19, r20), delegations (r21). Task *bodies* here are shells with scripted behaviour for the proof.
- **The outbox (events).** The PRD names `gate.opened` at gate opening and constitution VII wants every state change recorded with its cause and actor, atomically. The full event catalog, the stream and the rebuild of projections are **r15**; here the core commits a **minimal outbox** — `gate.opened`, `move.committed`, `gate.settled`, `lane.acquired`, `lane.released`, `lane.swapped`, each with actor and cause, each in the commit of the state it records — so that r15 can adopt them as its first events **without migration**. **Recorded deferral (the part of constitution VII this row does not meet):** events for task and step progress (created, started, finished), delegation, and cost arrive with r15 and r16; until then those transitions are visible in the store but are not entries in the stream.
- **The brief** is an opaque, committed, versioned piece of content in this row (what is shown); its structure belongs to the gate-brief rows. The move references it by identity.
- **Move vocabulary** comes from r12's flow data (`moveAllowed`, the closed set of nine move kinds); this row does not change it. A move needs a named decider; a person's identity and session handling are the surfaces' concern (r19/r20), the core only refuses a move with none.
- **The contract** is the post-spike port of r42, in KILN's terms, as the starting text; this row re-creates it in the product package, extends it to the gate's whole life (open, wait, settle) and the other task types, and records any change. The spike's code is not reused.
- **Operating conditions of r42** (crash-loop guard off, one owner per store, `committed` means durable, `not-ready` transient, power loss outside the guarantee) become the requirements FR-040 … FR-044.
- **Delegation** (a recorded, covered, clean-path auto-settle of a gate) is a later row (r21); the contract leaves room for it but nothing in r13 settles a gate without a person's move. The Roadmap gate never accepts one (constitution VI).
- **Lane** state is data in this row; "generation" is a scripted stand-in. A lease of a dead process is released at restart because the generation it stood for no longer exists; this is the safe default and a real model's residency (r16) refines, not reverses, it.
- **Dependency posture.** The library (and the two companions it needs) are added to `kiln/` as exact-pinned, locked dependencies, the only network act being the documented install; the boundary check's `externals` seam is where they are named. The runtime floor becomes `^22.19.0 || >=23.6.0` (the library needs ≥ 22.19.0; r12 excluded the odd 23.x range below type stripping). Everything else in r12's rules stays as it was.
- **Platform.** macOS only, as r12 and r42; other platforms are not measured and the row says so.
- **Store.** A local SQLite file (constitution VIII, local by default), one per factory; the workshop's own small store (multi-factory hosts, r25) is out of scope.
- **Proof tooling.** The kill-and-resume technique and the invariants (I1–I7) of r42 are the model for this row's tests, re-created in `kiln/`; they are not imported from `spikes/r42/`.
