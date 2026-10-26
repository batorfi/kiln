# Feature Specification: Spike — completing a waiting task from outside (row r42)

**Feature Branch**: `010-external-completion-spike`

**Created**: 2026-10-25

**Status**: **CLARIFIED (2026-10-25, 2026-10-26), PLANNED, TASKED and ANALYSED** — six questions asked and answered, all on the recommended option (see *Clarifications*); ready for `/speckit-implement`. Roadmap row **`r42`** was named the **admitted next row** at the Roadmap gate
(`human@batorfi`, 2026-10-25T18:37:45Z, entry 3 of `gate0.note` in [specs/ROADMAP.md](../ROADMAP.md)). It stays `queued` — never `active` — until its own first gate opens
(`chain_unattended=false`). **Nothing here admits a program, advances a gate, decides a gate or edits the roadmap** (constitution VI): the spike's report *states* a verdict;
a person records it at the Roadmap gate.

**Input**: the row **`r42`** — *"Spike: completing a waiting task from outside — a time-boxed go/no-go on the pinned Pi Durable: a move committed from outside the gate task
completes its decision task in one atomic commit, keyed exactly-once, first move wins, proven by kill-at-every-step tests; natively, or else an upstream proposal plus the named
fallback (a KILN decision table in the same SQLite transaction as the task store, behind the seam); a spike report decides go, go-with-fallback or no-go, and a no-go re-opens the
Roadmap gate before r13."* PRD requirement carried: **CORE-6** (settles the primitive that **CORE-3**, **CORE-4** and **CORE-5** rest on). Governing text:
[`docs/concepts/pi-durable.md`](../../docs/concepts/pi-durable.md) §7 and §12, [`docs/architecture/explainers/kiln-v1.md`](../../docs/architecture/explainers/kiln-v1.md) §7.3.

**Provenance (what r42 builds on).** r12 is `done` (`@PR#2`): the new `kiln/` has an empty `durable` package (one stated responsibility, nothing in it), a runner that fails a run that
executed nothing, and three checks — `network`, `boundaries`, `legacy` — that refuse a runtime dependency and any bare specifier unless a rule says otherwise. r42 is the first row that
needs a dependency; it keeps it **outside `kiln/`** (see *Clarifications*), so r12's guarantees stay true while the answer is found, and the report tells r13 how to adopt it properly if the verdict allows. r13 (the durable core) is blocked on this row (`deps: r12, r42`).

## Clarifications

### Session 2026-10-25

- Q: Where should the spike's test harness and its Pi Durable dependency live in the repository? → A: **Option A — a separate spike directory outside `kiln/`** (for example `spikes/r42/`) with its own pinned dependency. `kiln/` and its three checks are untouched, and nothing in `kiln/` imports from it or from Pi Durable.
- Q: Which Pi Durable version should the spike measure and pin? → A: **Option A — exactly `@earendil-works/pi-durable` 1.4.0**, the current release (also the version of the Pi installed on the author's machine), pinned now and recorded with its name, version and integrity hash. A newer release appearing mid-spike is a later, deliberate upgrade and is not part of this verdict.
- Q: How long should the spike's time box be? → A: **Option B — two working days** (counted as 16 working hours of active session time, see Session 2026-10-26), with its start time recorded in the report. When it ends, work stops and the report lists what is not proven.

### Session 2026-10-26 *(after the cross-artifact analysis)*

- Q: If the first native strategy (C1, a signal into a running phase) holds all five guarantees, should the second native strategy (C2, abort-driven) still be built and run? → A: **Option B — always run C2**, after C1's results are recorded and only within the native-strategies phase's time budget; it feeds the report's "what was tried". The third (C3, a keyed write-submission) stays conditional on no native strategy holding a, d, e.
- Q: How is "two working days" measured, so the end of the time box can be computed? → A: **Option A — 16 working hours of active session time**, logged in a ledger at each checkpoint; nights and idle time do not count, and the box ends when the running total reaches 16 h.
- Q: Do we test "store damaged or full at the moment of the move"? → A: **Option A — yes, one scenario**: a store failure is injected at the moment of the move; the move is refused with `store-error`, the gate is still waiting, nothing is recorded, and the same key commits once the fault is gone. A genuinely full disk is not simulated.

## User Scenarios & Testing *(mandatory)*

The "users" of a spike are the people who must decide and build on its answer: **the Operator at the Roadmap gate**, who needs a verdict they can trust, and **the engineer starting r13**,
who needs to know what the durable core may rely on. The behaviour under test belongs to the factory's own promise: *a person's move and the gate's completion are one event, or neither
happened.*

### User Story 1 - A verdict I can trust at the Roadmap gate (Priority: P1)

The Operator opens the spike report and finds one of exactly three verdicts — **go** (Pi Durable can do it natively), **go-with-fallback** (it cannot, and KILN will hold the decision
itself, with an upstream proposal ready), or **no-go** (neither is sound enough to build the durable core on) — with the evidence next to each claim, and with the version of Pi Durable it
was measured on. The Operator can re-run the evidence themselves.

**Why this priority**: the whole durable core (r13–r15) and every later row rests on this one primitive; a wrong "go" builds the factory on sand, and an unclear report stalls the program.

**Independent Test**: hand the report and the repository to someone who did not write it; they run one documented command from a clean checkout and see the same verdict-supporting results.

**Acceptance Scenarios**:

1. **Given** the finished spike, **When** the Operator reads the report, **Then** it states exactly one verdict, the Pi Durable version it applies to, and for each of the five guarantees (below) whether it held, with a pointer to the evidence.
2. **Given** a clean checkout and the documented command, **When** a person runs the evidence, **Then** it reproduces the report's results and says plainly if it could not run (a run that examined nothing is a failure, never a pass).
3. **Given** a verdict of **no-go**, **When** the report is read, **Then** it states what is broken, what was tried, and what re-planning the Roadmap gate must consider before r13 — and nothing in the repository has already acted on it.

---

### User Story 2 - A move completes a waiting gate in one commit, or not at all (Priority: P1)

A gate is waiting for a person. A move arrives from outside the task that is waiting — from the server on behalf of a browser, or the CLI. In **one** commit the move is recorded and the
waiting decision is completed. If the factory is killed at any instant before that commit is stored, the gate is still waiting and the move is not recorded; if it is killed after, both
are there. Never one without the other.

**Why this priority**: this is constitution V ("a missing person never approves") made structural. If a half-applied move is possible, a restart could approve, or lose, a decision.

**Independent Test**: kill the factory at every step boundary of the move-and-completion sequence (and during the commit itself); restart; inspect the store: each outcome is "waiting, no move" or "settled, move recorded" — nothing else.

**Acceptance Scenarios**:

1. **Given** a waiting gate, **When** a valid move is committed from outside, **Then** the decision completes and the move is recorded in the same commit, and the gate then settles on that move.
2. **Given** a factory killed at each enumerated step of that sequence, **When** it restarts, **Then** the gate is either still waiting with no move recorded, or settled with the move recorded — in 100 % of the kill points.
3. **Given** a gate that is waiting, **When** the factory restarts any number of times with no move, **Then** the gate is still waiting, and no clock, timeout or restart ever settles it.
4. **Given** a waiting gate and a store that fails at the moment the move is written, **When** a valid move is submitted, **Then** it is refused with a named reason (`store-error`), nothing is recorded, the gate is still waiting — and once the fault is gone the same key commits normally.

---

### User Story 3 - Exactly once, first move wins, stale moves refused (Priority: P1)

The same move can arrive twice (a retry, a double click, a reconnect) and two *different* moves can race for the same gate. The first committed move wins; a repeat of it returns the original
outcome and changes nothing; a competing move, or a move against a gate that has already moved on, is refused and changes nothing.

**Why this priority**: CORE-3 and CORE-5 — without it a person's decision could apply twice or be overturned by a late tab.

**Independent Test**: submit one move under the same key many times, and many competing moves at once, including across a restart; count the effects and the outcomes.

**Acceptance Scenarios**:

1. **Given** a move already committed under key K, **When** the same key and the same move arrive again (before or after a restart), **Then** the original outcome is returned and nothing new is committed.
2. **Given** two different moves racing for one waiting gate, **When** both are submitted, **Then** exactly one is committed; the other is refused, and the refusal says which move won.
3. **Given** a gate already settled, **When** a late move arrives, **Then** it is refused and nothing is committed.
4. **Given** key K already used for move A, **When** key K arrives with a *different* move B, **Then** it is refused as a conflict — never silently treated as a repeat of A.

---

### User Story 4 - If Pi Durable cannot do it, KILN can, and upstream knows (Priority: P2)

If the library does not offer the primitive, the spike shows the **named fallback** working under exactly the same tests: a KILN-owned decision record written in the same transaction as the
task store, behind the single place KILN reaches the library, so the gate contract does not change when the library later gains the feature. An upstream proposal is drafted — not filed —
describing the gap.

**Why this priority**: it is the plan's default if the native path fails, and it turns a "no" into a "yes, here is how"; but it only matters if US2/US3 fail natively, so it ranks below them.

**Independent Test**: run the US2 and US3 tests against the fallback; they pass unchanged. Read the proposal: a maintainer who has never heard of KILN can see the gap, the use case and the smallest change that would close it.

**Acceptance Scenarios**:

1. **Given** the native path fails any guarantee, **When** the fallback is exercised, **Then** every US2 and US3 scenario passes on it, unchanged.
2. **Given** a go-with-fallback verdict, **When** the report is read, **Then** an upstream proposal is attached, marked *not filed*, and the report says what replaces the fallback once upstream lands.
3. **Given** the native path holds everything, **When** the report is read, **Then** the fallback is recorded as *not needed* and the evidence says why.

---

### User Story 5 - r13 can start without rework, and the spike stays in its box (Priority: P2)

The engineer starting r13 finds, in the report, the contract the durable core may rely on, written in KILN's own terms (move, gate, decision, key, outcome) rather than the library's call
names, plus the exact Pi Durable version to pin. The spike also finished inside its recorded time box: when the box ran out, work stopped and the report said what was and was not proven.

**Why this priority**: a spike that answers but cannot be built on, or that never ends, still costs the program.

**Independent Test**: r13's first task can be written from the report alone; the report's dates show the box was kept.

**Acceptance Scenarios**:

1. **Given** the report, **When** r13 is planned, **Then** every guarantee it needs (CORE-3: atomic move and completion, exactly once, first move wins, stale refused, no clock settles) is listed with its status and nothing in the list depends on an API detail.
2. **Given** the time box expiring before every scenario is proven, **When** the work stops, **Then** the report lists what is unproven and the verdict is no more favourable than the evidence — an unproven guarantee is never reported as held.
3. **Given** the spike's code, **When** its fate is read, **Then** the report says what (if anything) becomes product code and what is thrown away; nothing else enters the product tree by default.

---

### Edge Cases

- The library offers something *close* to the primitive (completes a task from outside but not atomically with the move, or atomically but not keyed): the report grades it by the five guarantees, not by whether a function of the right name exists.
- The factory is killed *during* the commit itself, not only between steps: the outcome is still one of the two allowed states.
- The process that owns the store is the only one that may write; an outside caller (the CLI, a server worker) reaches it through that owner — the test must cover a completer that is a different process from the owner.
- A resumed task re-sends or re-runs interrupted work: a resumed gate must not re-apply an already-committed move, and must not reopen a settled one.
- Library defaults include timers or timeouts on waiting tasks: if any can settle a gate, that is a failure of the "no clock settles a gate" guarantee even if it never fired in the tests.
- The same key arrives with an identical move after a restart and after a long wait: still the original outcome.
- The library's version moves during the spike: results apply only to the version they were measured on, and the report says which.
- The store fails at the moment of the move (simulated by an injected failure; a genuinely full disk is not): the move is refused with a named reason, and the gate is still waiting.
- A fallback and a native path disagree on an outcome: the contract in the report says which one is authoritative and why.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The spike MUST produce one **spike report** that states exactly one verdict — **go**, **go-with-fallback** or **no-go** — and the exact version of Pi Durable it applies to (`@earendil-works/pi-durable` 1.4.0). The report is the product of the row.
- **FR-002**: The report MUST grade the primitive against five guarantees, each *held* / *not held* / *not proven*, with evidence: **(a)** the move and the gate's completion are one atomic commit; **(b)** keyed exactly once; **(c)** first move wins and a stale or competing move is refused; **(d)** no clock, timeout or restart settles a gate; **(e)** a killed-and-restarted gate resumes as waiting.
- **FR-003**: Each guarantee MUST be exercised by tests that **kill the factory at every enumerated step boundary** of the sequence (and during the commit), restart it, and assert the store is in one of the two allowed states. "During the commit" means *inside the commit callback* (a named kill point, after the writes and before it returns) and *at random instants* (supporting evidence — a named point cannot reach inside the store's own commit statement). The report MUST list the enumerated kill points and how many were exercised; a run that exercised none MUST fail.
- **FR-004**: The tests MUST include a completer that is **a different process** from the one that owns the store, and a case of **many repeated** and **many competing** submissions of moves for one gate.
- **FR-005**: A repeat of a committed move (same key, same move) MUST return the original outcome and commit nothing; the same key with a *different* move MUST be refused as a conflict.
- **FR-006**: A move against a gate that has already settled, or that loses a race, MUST be refused with the winner named, and MUST leave the store unchanged.
- **FR-007**: If any guarantee is not held natively, the spike MUST demonstrate the **named fallback** — a KILN-owned decision record committed in the same transaction as the task store, behind the one place KILN reaches the library — passing the same tests unchanged, and MUST draft an **upstream proposal** describing the gap. The proposal MUST NOT be filed or sent without a person's say-so.
- **FR-008**: The report MUST state the **contract the durable core may rely on** in KILN's own terms (move, gate, decision, key, outcome, refusal reasons), independent of the library's call names, and MUST state which guarantees depend on the fallback so that r13 can plan for its removal.
- **FR-009**: The spike MUST run inside a **recorded time box** (length in *Assumptions*). When the box ends, work stops and the report lists what is not proven; an unproven guarantee MUST NOT be reported as held, and the verdict MUST NOT be more favourable than the evidence.
- **FR-010**: The spike's harness and its Pi Durable dependency MUST live in a **separate spike directory outside `kiln/`**, with their own **pinned** version recorded in the report (constitution, *Dependencies*). Nothing under `kiln/` MAY import from the spike or from Pi Durable, `kiln/` MUST stay dependency-free, and r12's rules and checks MUST NOT be changed by this row. After the spike, `kiln check network`, `boundaries` and `legacy` MUST pass unchanged. Adopting the dependency into the product (behind the `durable` package, with any rule change that needs) is r13's decision, taken on the report, not this row's.
- **FR-011**: The spike MUST NOT edit `legacy/`, MUST NOT change `specs/ROADMAP.md` or record a gate decision, and MUST NOT make any network call in its tests; acquiring the dependency is the one network act and is recorded.
- **FR-012**: The report MUST state the fate of the spike's code — what becomes product code (with the row that adopts it), what is discarded — and by default nothing from the spike is treated as product code.
- **FR-013**: The evidence MUST be **reproducible by one documented command from a clean checkout**, and MUST say plainly when it could not run (missing dependency, unsupported platform); it MUST never report success for a run that examined nothing.

### Key Entities

- **Gate task**: the durable task that represents an open gate and waits; it runs no code and holds no model while waiting.
- **Decision task**: the waiting item inside the gate that a person's move completes.
- **Move**: a person's decision (approve, revise, …) with its decider, the brief it was made against, and its key.
- **Idempotency key**: the identity of one move submission; the same key with the same move is a repeat, with a different move a conflict.
- **Outcome**: *committed* (this move won), *repeat* (original outcome returned), or *refused* with a named reason (stale, lost the race, conflict, store error).
- **Decision record (fallback)**: KILN's own durable record of a move and its outcome, written in the same transaction as the task store.
- **Kill point**: a named step boundary in the sequence at which the factory is killed in a test.
- **Spike report**: the verdict, the version, the five guarantees with evidence, the contract for r13, the fate of the code, the upstream proposal if any.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The report states exactly one of the three verdicts and one pinned Pi Durable version; an Operator who did not write it can find, for each of the five guarantees, its status and its evidence in under five minutes.
- **SC-002**: At **100 %** of the enumerated kill points (including the one during the commit), after restart the store is in one of the two allowed states; **0** half-applied moves and **0** gates settled by a restart or a clock are observed.
- **SC-003**: Among **at least 100** repeated submissions of one move and **at least 100** competing moves for one gate, exactly **one** is committed; every other is a repeat or a named refusal; the number of recorded moves for the gate is **1**.
- **SC-004**: A different-process completer passes every scenario the same-process completer passes.
- **SC-005**: When any guarantee is not held natively, **all** of the above hold on the fallback with the tests unchanged, and an upstream proposal is attached and not filed.
- **SC-006**: One documented command from a clean checkout reproduces the report's results on the pinned version; it fails when it examines zero kill points.
- **SC-007**: The spike finishes within its recorded time box; any scenario left unproven is listed as such and none is reported as held.
- **SC-008**: After the spike, `kiln check` (network, boundaries, legacy) and the existing suites pass; `legacy/` is byte-identical to its baseline; `specs/ROADMAP.md` carries no change made by this row.
- **SC-009**: The contract in the report lets r13's first tasks be written without opening the library's documentation: every term it uses is KILN's own.

## Assumptions

- **Time box** (confirmed): **two working days, counted as 16 working hours of active session time** (not calendar days), recorded as a ledger with its start time in the report. The row says "time-boxed" without a length; two days is enough to try the native path, the fallback and the kill tests once, and short enough that a no-go costs little.
- **Which Pi Durable** (confirmed): `@earendil-works/pi-durable` **1.4.0**, recorded exactly (name, version, integrity) in the report. Results apply to that version only; a later version is a new, deliberate upgrade with its own review (`pi-durable.md` §11).
- The Operator and the engineer starting r13 are the readers; the spike has no end-user interface.
- The store is a local SQLite file (constitution VIII, local by default); one process owns it, others reach it through that owner — the guarantees are about that arrangement.
- "Kill" means abrupt process termination (no clean shutdown), not an orderly stop; host power loss and disk failure are out of scope beyond what the store itself guarantees on an abrupt kill.
- The gate contract (CORE-3) does not depend on the exact library API (CORE-6); the report is written so that it need not change if the API changes.
- Platform: macOS only, as r12 (the README states it); other platforms are not measured and the report says so.
- Out of scope: the durable core itself (r13), the event record (r15), the web surface, delegations and any model call; the spike uses a stand-in gate task, not the real gate machinery.
