# Feature Specification: The record (row r15)

**Feature Branch**: `013-the-record`

**Created**: 2026-10-28

**Status**: Draft

**Input**: the row **`r15`** — *"The record — transactional outbox, schema-versioned event envelope and catalog, backbone with consumer cursors; the factory-log as a projection rebuilt byte-identically; the old committed walks replayed as event streams; the catalog includes the not-applicable gate outcome and the charter and design-system approved and amended events."* Depends on **r14** (done, PR #7). Requirements: **EVT-1…EVT-5, EVT-3a, CORE-7** (the archive; record size measured). Concept: [`docs/concepts/the-record.md`](../../docs/concepts/the-record.md).

**Provenance (what r15 builds on, and does not re-open).**

- **r13** gave the factory one store, one owner (one writer) and an interim **outbox**: an append-only list of entries — each with a type, a subject, a time, an **actor** and a **cause** — committed in the same commit as the state it records. Its schema was deliberately minimal and not frozen; r15 is the row that freezes it.
- **r14** made the outbox carry what a walk does: `walk.admitted`, `gate.not-applicable`, `gate.skipped`, `gate.became-applicable`, `gate.withdrawn`, `walk.returned`, `walk.fix-round`, `walk.split`, `walk.left-lane`, `walk.not-admitted`, `walk.completed`, `walk.move-ignored`, beside r13's `gate.opened`, `move.committed`, `gate.settled` and the lane's entries. Those entries, in stores that already exist, are **the first events of the record**: they are adopted, not migrated.
- **r12** ported the first program's factory-log schema and its validators, and kept the first program's committed streams as fixtures.
- **Nothing here changes how a gate is decided.** A person's move still settles a gate and nothing else does (constitution V). r15 changes what is *written down* about it and what can be *built from* what is written down.

## Clarifications

### Session 2026-10-28

- Q: Should the record keep a person's note and a triage reasoning as text inside the event, or only a reference and a digest to where the text is kept? → A: **Reference and digest only.** The current version of an event never holds the text. A version 0 event (written by r13/r14) keeps its inline text on disk, because stored events are never rewritten, but is presented without it; the text remains in the move's record and the walk's document, and travels into the feature archive with the feature (FR-006, FR-021, FR-060).
- Q: Should the rebuilt factory-log be one file per feature run, or one file for the whole factory? → A: **One file per feature run**, built from that feature's events (the events sharing its correlation). The existing format and validators are unchanged, and an old walk's replay is compared with its original file. A whole-factory view, if wanted, is a separate projection of a later row (FR-040, FR-041, SC-003).
- Q: If the first program's walkers for r1, r2, r3 or r8 cannot be run unchanged, should the row stop and report that, or build the stream by hand? → A: **Stop and report.** A stream counts only if it has a real original to be compared with byte for byte; a hand-converted stream is not built. The row names every walk it could not capture and why, and whether the row can close with fewer than five walks is the Roadmap gate's decision, not the build's (FR-050, SC-004).
- Q: When is a feature archived — automatically when its walk ends, or only when a person asks? → A: **Automatically when its walk ends** (merged, left the lane, or not admitted), by the factory, as its own recorded step after the walk's last event. It never blocks or fails the end of a walk; the archive is verified before anything is compacted; the feature stays readable from the record afterwards (FR-060, FR-064).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every state change is in the record, with its actor and cause, in one gap-free order (Priority: P1)

An auditor (or the owner's own checks) must be able to read a factory's record and find, for everything that changed, one event — written in the same atomic commit as the change — that says what it was about, **who** caused it and **why**, in a single order with no gaps. Today's outbox entries carry a type, subject, actor and cause but have no frozen shape, no identity, no version, and nothing stops an entry that names no real cause or carries someone's note text.

**Why this priority**: this is the record's reason to exist (EVT-1, EVT-2; constitution VII). Every later row — workers, the director, the web front door — writes into it; if its shape is wrong, everything built on it is wrong.

**Independent Test**: walk a scripted feature through every gate and, with the owner killed and restarted along the way, read the record with a fresh reader that never opened the factory: every state change has exactly one event, sequence numbers run 1…N without a gap or repeat, every event names an actor and a cause, and no event exists for something that did not happen.

**Acceptance Scenarios**:

1. **Given** a gate opens, a move is made, the gate settles and the walk goes on, **When** the record is read, **Then** each of those changes has one event with a unique identity, a sequence number, a type and schema version, a time, a subject, an actor, a cause, a correlation to the feature run, a privacy class and a data payload, and the events appear in commit order.
2. **Given** a commit fails or the owner is killed before it lands, **When** the factory restarts, **Then** neither the state change nor its event exists — never one without the other.
3. **Given** two clients issue commands at the same moment, **When** the record is read, **Then** the sequence is still gap-free and each event's cause is the command that produced it.
4. **Given** an event is offered whose data carries prompt, answer, transcript, note or code content, **When** it is committed, **Then** the commit is refused by name and the state it would have recorded does not change (see User Story 2).

---

### User Story 2 - Every event type has a versioned schema, and an invalid event fails its commit (Priority: P1)

A developer adding a state change must declare its event once — type, version, and the shape of its facts. From then on the shape is enforced where it matters: at the commit. A gate that tries to settle without a valid decider does not produce a bad event after the fact; it **cannot commit**.

**Why this priority**: EVT-3 turns today's "check after" (the first program's log-writer, the validators) into a property of committing. It is also what makes the record safe to keep forever and to replicate: its content is bounded by schema.

**Independent Test**: feed the owner one event of every kind it can produce and one deliberately invalid event per rule (unknown type, missing field, wrong type of field, no actor, no cause, content-bearing field, remote-endpoint field, a version the catalog does not know); every valid event commits and every invalid one is refused by name with the state unchanged. A catalog with no types, or a check that reads no events, fails.

**Acceptance Scenarios**:

1. **Given** the catalog, **When** it is listed, **Then** it contains a versioned schema for every event the factory produces today — the gate, move, lane, walk and row events of r13 and r14 — and the **experience** events the row names: a gate recorded as **not applicable** (with its reason), and the experience charter and design system **approved** and **amended**.
2. **Given** a gate settle that would carry no decider, **When** it is committed, **Then** the commit fails, the gate stays open, and no event exists.
3. **Given** an event type the catalog does not contain, **When** code tries to commit it, **Then** it is refused by name; adding a type is a catalog change that is itself tested.
4. **Given** an event whose data holds a forbidden field (content of a prompt, an answer, a note or code; a URL or endpoint), **When** it is committed, **Then** it is refused naming the field.

---

### User Story 3 - The factory-log is a projection, rebuilt byte-identically (Priority: P1)

The first program's factory-log (JSONL in the existing schema, checked by the existing validators) is now **built from the record**. A person or tool that reads the factory-log sees the same format as before; but the file is no longer written beside the state — it is derived from the events, so it cannot drift.

**Why this priority**: EVT-5 and constitution VII's testable claim: "every projection rebuilds identically from the stream". It is the first real proof that the record is the truth.

**Independent Test**: run a scripted walk with the factory-log projection live; delete the file; rebuild it from the record from the first event; compare the two byte for byte. Run the existing log validators on both.

**Acceptance Scenarios**:

1. **Given** a walk has run, **When** the factory-log is dropped and rebuilt from `seq` 1, **Then** the rebuilt file is byte-identical to the live one.
2. **Given** a rebuilt factory-log, **When** the existing validators run on it, **Then** they pass, including "no gate settles without a human decision or a distinct delegation", gap-free order, time never going backwards, and no remote-endpoint fields.
3. **Given** the owner is killed at any point while the projection is being kept up to date, **When** it restarts, **Then** the live file and a full rebuild are still byte-identical.
4. **Given** a projection that reads no events, **When** the check runs, **Then** it fails: a check that examines nothing proves nothing.

---

### User Story 4 - The old committed walks replay as event streams, byte-identical (Priority: P1)

The first program's committed walks — the closed rows **r1–r3, r7 and r8**, each one that has a real original (see Clarifications) — become event streams in the new record's format. Replaying each through the factory-log projection reproduces the original file exactly; replaying each through the validators gives the verdict it always gave, including the one stream that is *meant* to fail.

**Why this priority**: it is the proof of the whole design on real data nobody wrote for it, and it is the committed fixture the schema-evolution rule (User Story 5) is tested against. It is also what keeps the first program's history verifiable.

**Independent Test**: for each old walk: convert it to an event stream once and commit the stream; replay it into a fresh record; rebuild the factory-log; compare with the original bytes; run the validators; compare the verdict with the first program's.

**Acceptance Scenarios**:

1. **Given** a committed walk, **When** it is replayed, **Then** the rebuilt factory-log is byte-identical to the original.
2. **Given** the committed stream that the first program deliberately made invalid (a gate completed with no human decision), **When** it is replayed, **Then** the rebuild is still byte-identical **and** the validators still refuse it, naming the same rule.
3. **Given** the replay of every old walk, **When** the results are listed, **Then** the list says how many walks were replayed and how many events each held; a replay of zero walks fails.

---

### User Story 5 - Events keep their meaning as their shape changes (Priority: P2)

A schema will change. When it changes in a breaking way, stored events are **never rewritten**; a pure, lossless step converts the previous version to the new one when the event is read, and consumers only ever see the current version. Additive optional fields need no new version.

**Why this priority**: EVT-3a. It is what lets a permanent record survive years of change. It is P2 because the first catalog has few versions to evolve — but it is exercised for real on day one, because the entries r13 and r14 already stored are **version 0** and must be read as the catalog's first version.

**Independent Test**: take stores written by r13 and r14 (and the old walks' streams), read them through the current catalog, and check the result equals what an event of the current version would have said; add a deliberately breaking version in a test catalog with its upcaster and show the committed streams still project byte-identically; show a non-lossless upcaster is caught.

**Acceptance Scenarios**:

1. **Given** a store written by r14's owner, **When** the new owner opens it, **Then** every existing entry is readable as a current-version event, nothing stored is changed, and the factory-log rebuilt from it is the same as the one r14 would have implied.
2. **Given** a new schema version with its upcaster, **When** old events are read, **Then** consumers receive current-version events only and the committed walks still project byte-identically.
3. **Given** an upcaster that loses information or is not a pure function of the event, **When** the catalog is checked, **Then** the check fails naming the type and version.
4. **Given** an event of a version newer than the reader knows, **When** it is read, **Then** the read fails by name; it is never guessed at.

---

### User Story 6 - Consumers follow the record with durable cursors and never block the factory (Priority: P2)

Anything that wants to react to the record — the factory-log projection first, later the screens, the notifier, the metrics — reads it through an in-process backbone. Each consumer keeps its own cursor (the last event it has processed), is delivered every event at least once and handles repeats harmlessly, catches up after a restart, and a slow or failed consumer never holds up a gate, a move or a walk.

**Why this priority**: EVT-4. The projection of User Story 3 is the first consumer; the backbone is what makes the next ones cheap and safe. P2 because User Story 3 can be proven by a rebuild alone, but the *live* projection needs a cursor.

**Independent Test**: register a consumer that records what it sees; kill the owner at each named step of delivery and cursor advance; show after restart the consumer has seen every event at least once and, with a repeat applied, exactly the same result as without; then register a consumer that stalls and show a full walk still completes in the same time.

**Acceptance Scenarios**:

1. **Given** a consumer with a cursor at event *n*, **When** the factory restarts, **Then** it receives events *n+1…* and none are skipped.
2. **Given** a crash between processing an event and saving the cursor, **When** the factory restarts, **Then** that event is delivered again and the consumer's result is unchanged by the repeat.
3. **Given** a consumer that never returns, **When** a feature walks every gate, **Then** the walk completes and no commit waits on the consumer; the lag is visible to a reader of the cursors.
4. **Given** a new consumer, **When** it is added to a factory with history, **Then** it can start from the first event and reach the same state as one that was always there.

---

### User Story 7 - A finished feature leaves the live store in a checksummed archive, automatically, and the record stays whole (Priority: P2)

When a feature's walk ends, the factory itself archives it: its bulky working state — checkpoints, documents and (when they exist) conversations — is exported to a **feature archive** beside the store (never in git) with a checksum, recorded by a `feature.archived` event, and — only once the archive has been verified — its documents are compacted out of the live store (replaced by small tombstones). Nobody has to remember to do it, and nothing about a finished feature is lost from view: its story stays readable from the record. The **record is never archived, aged out or segmented**; the feature-level move keys that r14 keeps with each walk travel into the archive with it. r15 also **measures** the record's size and the time to rebuild it.

**Why this priority**: CORE-7. A live store that grows with every feature forever is a store nobody can keep. P2 because nothing in User Stories 1–6 depends on it.

**Independent Test**: let a scripted feature's walk end and watch it archive; verify the checksum; kill the owner at each step of the archiving and show the restart finishes it exactly once; compare the record before and after (identical, event for event); check the live store no longer holds the feature's working state; restore from the archive in a test and read the walk's moves and keys; run the measurements and read the report.

**Acceptance Scenarios**:

1. **Given** a feature whose walk has just ended (merged, left the lane or not admitted), **When** the factory has finished its last step for it, **Then** an archive exists beside the store with a recorded checksum, `feature.archived` names that checksum, and the live store has dropped the feature's checkpoints and documents.
2. **Given** an archived feature, **When** the record is read, **Then** every event of the feature is still there and the factory-log rebuild is unchanged.
3. **Given** a damaged archive, **When** it is verified, **Then** the checksum mismatch is reported by name, nothing is compacted, and the feature stays whole in the live store.
4. **Given** a feature whose walk has feature-level move keys, **When** it is archived, **Then** those keys are inside the archive and a repeat of one of them against the live store is not silently accepted as new.
5. **Given** the owner is killed at any step of archiving, **When** it restarts, **Then** the archive exists once, the event exists once, and either the live store still has the working state or it has been compacted after a verified archive — never neither.
6. **Given** a feature has just been archived, **When** a person asks for its state or history, **Then** they are answered from the record, as before.
7. **Given** a record of the size a busy factory reaches in a year, **When** the measurements run, **Then** the record's size and the time to rebuild it from the first event are reported with the method used.

---

### Edge Cases

- An event that is valid alone but whose **cause** names nothing that exists (an unknown command key or event): refused if the cause is declared as an event reference; recorded as given if it is a command key (the cause may be a person's command, not another event).
- The **same state change committed twice** under one command key: one event, not two (the command ledger's exactly-once carries over to events).
- The owner is killed **between** a commit and the delivery of its event to a consumer: the event is in the record; delivery happens after restart.
- A consumer's cursor is **ahead** of the record (a restored older store): detected by name; the consumer does not skip forward silently.
- A consumer **throws** on one event: that consumer stops at it and reports; other consumers and the factory continue.
- A stored entry of an **unknown interim type** (written by some other build): readable as an opaque, clearly marked unknown event; never silently dropped, never turned into a known type.
- A **breaking schema change with no upcaster**: the catalog check fails; the build does not pass.
- **Time** in an event runs backwards relative to the previous one (a clock step): recorded as it happened; the stream validator reports it; the projection is still deterministic.
- A **rebuild** is asked while the factory is writing: it reads a consistent prefix and says which `seq` it reached.
- The **walk's inline text** today (a move's note, a triage reasoning): the record carries a reference to where the text is kept and a digest of it, never the text (see Assumptions).
- The projection is rebuilt on a **different machine**: byte-identical, because nothing in it comes from the host (no local clock, path or process id).

## Requirements *(mandatory)*

### Functional Requirements

**The record and its envelope (EVT-1, EVT-2)**

- **FR-001**: Every state change the factory makes MUST commit its event(s) **in the same atomic commit** as the state it changes. A state change with no event, or an event with no state change, MUST NOT be possible; a failed or killed commit MUST leave neither.
- **FR-002**: A factory's record MUST have **one writer and one total order**: sequence numbers start at 1, increase by exactly 1, and never repeat or skip, across restarts and concurrent commands.
- **FR-003**: Every event MUST carry an **envelope**: a unique identity that sorts by time; its sequence number; its type; its schema version; the commit time; its subject (what it is about); its actor; its correlation (the feature run it belongs to); its causation (what led to it); a trace reference; a privacy class (`public`, `internal` or `sensitive`); and its data.
- **FR-004**: The **actor** MUST be one of: a person, the director, a role on a model, a delegation, or the system. A delegated approval MUST remain a **distinct** event from a person's move, naming the delegation that produced it (constitution VII, VI). A person actor MUST come from the decider the move named, never from free text added later.
- **FR-005**: Every event MUST have a **cause**. Following causes backwards from any event MUST reach a root (a person's command, a system start, or an external trigger) without a break.
- **FR-006**: An event's data MUST hold **facts and references only** — never prompt, answer, transcript, note or code content, never secrets, never a remote endpoint. Where a fact lives as text elsewhere in the store (a move's note, a triage reasoning, a rendered applicability reason), the event MUST carry **only** a reference to it and a digest of it — never the text, not even a short one.

**The catalog and commit-time validation (EVT-3)**

- **FR-010**: There MUST be a **catalog**: for each event type, one or more versioned schemas. The catalog MUST contain every event the factory produces after this row, grouped by what they are about: program and roadmap, row (feature), gate (opened, waiting, move committed, settled, withdrawn, not applicable, skipped, became applicable), unit, lane, mitigation (fix rounds), command, and system.
- **FR-011**: The catalog MUST also contain the **experience** events: a gate recorded as **not applicable** with its reason; the experience charter **approved** and **amended**; the design system **approved** and **amended**. Their schemas MUST be present and tested; the behaviour that emits the charter and design-system events belongs to later rows.
- **FR-012**: The catalog MAY also contain types for groups whose behaviour belongs to later rows (delegation, tool approval, model, egress, wiki, host) only where a row names them; a type with no schema MUST NOT be committable.
- **FR-013**: An event MUST be **validated against its type's schema at commit time**. An invalid event — unknown type, unknown version, missing or mistyped field, no actor, no cause, a forbidden content or endpoint field — MUST fail its commit, by name, leaving the state unchanged.
- **FR-014**: The existing rules the first program enforced after the fact MUST become rules of committing where they are about a single event or a gate's state: a gate cannot settle without a decider (refused at commit). A move outside its gate's move vocabulary for the flow the feature was admitted with is refused when it is submitted (as r13 already does) and is also flagged by the stream rules of FR-043 if it ever appears in a record.
- **FR-015**: Adding an event type MUST be a catalog change that a test covers; changing a payload's meaning MUST be a new schema version; removing a type MUST fail the catalog check until the removal is declared.

**Schema evolution (EVT-3a)**

- **FR-020**: Stored events MUST NEVER be rewritten. A breaking change to a schema MUST ship a **pure, lossless upcaster** from the previous version; consumers MUST handle only the current version; additive optional fields MUST need no new version.
- **FR-021**: The entries r13 and r14 wrote MUST be readable as **version 0** of their types and presented as current-version events through upcasters, without changing the store. Inline text a version 0 entry holds MUST be left on disk untouched and MUST NOT be presented to consumers: the presented event carries the reference and digest instead. An entry of an unknown type MUST be read as a marked unknown event.
- **FR-022**: Each upcaster MUST be proven by replaying the committed streams (User Story 4) through it with a **byte-identical** factory-log result, and MUST be shown **lossless** (the previous version is recoverable from the current one for every committed event) and **pure** (the same input gives the same output).
- **FR-023**: An event of a version **newer** than the reader knows MUST fail the read by name.

**The backbone and cursors (EVT-4)**

- **FR-030**: There MUST be an **in-process backbone** that delivers committed events, in order, to registered consumers. Delivery MUST be **at least once**; every consumer MUST be **idempotent** (a repeat changes nothing).
- **FR-031**: Each consumer MUST have a **durable cursor** — the last event it has fully processed — kept in the store and advanced only after the consumer has handled the event. After a restart a consumer MUST receive everything after its cursor.
- **FR-032**: A slow, stalled or failing consumer MUST NOT block a commit, a gate, a move or the walk. Its lag MUST be readable (cursor against the record's head), and its failure MUST be reported by name.
- **FR-033**: A consumer added later MUST be able to start at the first event and reach the state of one that was always there.
- **FR-034**: The backbone MUST NOT poll and MUST NOT put a timer on a gate (constitution IX): delivery follows commits.

**The factory-log projection (EVT-5)**

- **FR-040**: The factory-log MUST be a **projection** of the record, in the **existing schema** with its record types, produced by a consumer on the backbone, as **one file per feature run** built from the events that share that run's correlation. An event with no feature run (for example a system event) MUST produce no factory-log line. The first program's validators MUST run on each file unchanged.
- **FR-041**: A rebuild of a feature's factory-log from its first event MUST be **byte-identical** to the live file, after any run and after a kill at any point of delivery or cursor advance. The projection MUST depend on nothing but the events (no host clock, path, process id or ordering of unrelated work).
- **FR-042**: The checks for the record and its projection MUST be **never vacuous**: a stream, catalog or projection check that examines no events, or a replay of no walks, MUST fail and say how many it examined.
- **FR-043**: The stream-level rules the record's reader enforces MUST include: gap-free order; time not running backwards (reported, not hidden); no gate settled without a person's decision or a distinct delegation; delegation entries distinct from person entries; no content or remote-endpoint field; every move in its gate's vocabulary for the pinned flow.

**The old walks as event streams (EVT-3a proof)**

- **FR-050**: The first program's committed walks — closed rows **r1, r2, r3, r7 and r8** — MUST each be available as a committed **event stream** where it has an original, in the record's format, with a note saying how it was derived from the original and which original it is compared with. A walk whose original cannot be obtained by running the frozen first-program walkers unchanged (or, for r7, from the committed file) MUST NOT be reconstructed by hand: the row MUST name it and say why, and the check MUST report the count of streams replayed against the five the row names.
- **FR-051**: Replaying each stream through the factory-log projection MUST reproduce the original file **byte for byte**, and replaying it through the validators MUST give the verdict the first program gave — including the stream the first program kept *because it fails*.
- **FR-052**: Replay MUST be the test that proves every upcaster (FR-022). A catalog change that alters any replay result MUST fail.

**The archive and the size of the record (CORE-7)**

- **FR-060**: When a feature's walk **ends** (merged, left the lane or not admitted), the factory MUST export its working state to a **feature archive** beside the store, never in git, with a **checksum**; the archive MUST be recorded by a `feature.archived` event naming the checksum; and only after the archive has been **verified** MUST the feature's documents be compacted out of the live store (replaced by tombstones that keep digests, move keys and the admission marker). The archive MUST be verifiable later, and a mismatch MUST be reported by name.
- **FR-061**: The **record MUST NOT be archived, aged out or segmented**: archiving a feature MUST leave every event of that feature in the record and every projection unchanged.
- **FR-062**: The feature-level move keys that r14 keeps in the walk's document MUST travel **with** the archived feature; a command or move key MUST NOT become reusable, and the feature name MUST NOT become admittable again, merely because its feature was archived: the live store MUST keep whatever small marker is needed to refuse both.
- **FR-063**: The row MUST **measure and report**, with the method: the record's size per event and for a full interface walk; the time to rebuild the factory-log from the first event for a record of a realistic year's size (generated, not claimed); and the overhead the record adds to a scripted walk.
- **FR-064**: Archiving MUST be its own recorded, durable step (cause: the event that ended the walk; actor: the system), restartable after a kill and exactly-once. It MUST NOT delay or fail the end of the walk, MUST NOT block another feature, and a failure MUST be reported by name and retried, leaving the feature whole.

**What this row does not change**

- **FR-070**: Everything r13 and r14 proved MUST still hold: a gate waits and settles only on a committed move; first move wins; keyed exactly once; the kill proofs pass; the existing stores open and walk on with the new owner. `legacy/` MUST remain unchanged. No new network port, no new runtime dependency.
- **FR-071**: This row MUST NOT build the screens, live push, notifier, metrics, traces, health, insights, time travel (EVT-6), the knowledge `log.md`, the workshop or team records, or the behaviour of delegation, tool approval, models or hosts; it MAY define their event types only as FR-012 allows.

### Key Entities

- **Event**: one fact about a state change that has been committed — identity, order, type, version, time, subject, actor, correlation, causation, trace, privacy and data. Never holds content.
- **Record**: a factory's whole ordered, gap-free, permanent sequence of events.
- **Outbox (interim)**: r13/r14's append-only entries; read as version 0 of the record's events.
- **Catalog / Schema version**: the declared event types, each with its versioned shape and, where a version broke, its upcaster.
- **Upcaster**: a pure, lossless conversion from one version of an event type to the next, applied when an event is read.
- **Backbone / Consumer / Cursor**: delivery of committed events to registered readers; each reader's durable position.
- **Projection**: anything rebuilt from the record; here the **factory-log**, in the first program's schema, one file per feature run.
- **Event stream (committed walk)**: an old walk converted to events, kept as a fixture; the test data of replay.
- **Run**: the events of one feature, joined by their correlation `run:<feature>`; the factory-log is one file per run. The `walk.*` event types are the concept's row events (`row.*`) under the names r14 gave them.
- **Feature archive**: the checksummed export of a finished feature's working state, with the keys that go with it.
- **Measurement**: a reported figure with its method (record size, rebuild time, overhead).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a scripted interface walk (twelve gates) and a scripted plain walk, read by a fresh reader, **100 %** of state changes have exactly one event — counted as: each gate document, each move record, each terminal unit, each lane lease change, each ledger entry and each walk outcome has its event, and no event has no such state — sequence numbers are gap-free, and **0** events lack an actor or a cause; the same holds after the owner is killed at every named step of the walk (r14's kill points).
- **SC-002**: The catalog lists a versioned schema for **every** event type the factory produces (counted against the types the source can commit), including the not-applicable, charter and design-system events; **100 %** of a negative suite of invalid events (at least one per rule in FR-013) is refused by name with the state unchanged; a catalog or check that examines nothing fails.
- **SC-003**: The factory-log rebuilt from the record is **byte-identical** to the live file, for **each** feature run, for **both** scripted walks and after a kill at **every** named point of delivery and cursor advance; the existing validators pass on it. The proof walks decide as `human@…` (the validators' format for a person); a walk decided by a scripted `script:…` id is correctly refused by them as not human.
- **SC-004**: **Every** old walk that has an original (at least r7's two) replays to its original bytes, and the stream kept because it must fail still fails, naming the same rule; the run states how many of the five named walks it replayed and, for each one it did not, why not.
- **SC-005**: Stores written by r13 and r14 open with the new owner, every stored entry reads as a current-version event, and **0** bytes of the stored entries change.
- **SC-006**: A breaking version added to a test catalog with its upcaster leaves **every** committed replay byte-identical; an upcaster that is lossy or impure is caught by the check.
- **SC-007**: A consumer that stalls forever does not change the outcome of the scripted walk, which still completes in **under 3 s** in-process (r14's budget); a killed consumer resumes from its cursor and ends equal to an uninterrupted one.
- **SC-008**: A feature whose walk ends is archived by the factory with no command, verifies by checksum, and its documents are compacted to tombstones only after verification, exactly once even when the owner is killed at every step of archiving; the record and the factory-log rebuild are **unchanged** by it; the feature's move keys are inside the archive.
- **SC-009**: The size of the record per event and per walk, the rebuild time for a generated record of a year's size, and the walk overhead are reported with their method in the row's baseline.
- **SC-010**: Everything r13 and r14 proved still passes (default tier, proof tier), `legacy/` and `specs/ROADMAP.md` are unchanged by the build, and `kiln check` passes with the record's check added and never vacuous.

## Assumptions

- **Scope of "the old committed walks" (decided, see Clarifications).** The repository today holds exactly two committed factory-log streams: r7's valid and deliberately broken inline-inference walks (`kiln/fixtures/r7-live-*.jsonl`, copied in `legacy/fixtures`). The walks of **r1–r3 and r8** were produced by the first program's scripted walkers and its tests and were not kept as files. The row captures what it can by running those frozen walkers once, outside `legacy/`, and committing what they write; it never invents a stream. A walk it cannot capture is reported by name, and the Roadmap gate decides whether the row can close without it. **As built:** r2, r3 and r7 were captured (five streams, 73 events), each replaying to its original bytes and verdict; **r1 and r8 produced no stream** (r1 is the scaffold, r8 the Pi extension) and are named with the reason in `kiln/fixtures/walks/MISSING.json`. `kiln check record` reports `3 of 5 named rows replayed … missing: r1, r8` and fails if a named row is neither replayed nor explained. Whether the row closes with these two missing is for the Roadmap gate.
- **Interim entries are version 0.** The names and shapes r13 and r14 chose are the first, unversioned form of each type; nothing on disk is rewritten. The **type names stay** (decided while planning, research R4: the concept's spellings are examples and ~150 existing assertions read the interim names); what an upcaster changes between version 0 and version 1 is the shape — the envelope, and content leaving the payload.
- **Content stays out of the record (decided, see Clarifications).** r14's entries carry a person's note, a triage reasoning and a rendered applicability reason inline. The current version carries a reference and a digest; a version 0 event is presented without the text. The text is not lost: it remains in the store and in the feature archive with the feature.
- **The charter and design-system events have a schema and no emitter yet.** The setup artifacts they describe belong to later rows; this row makes them committable and tested, as the row's text asks.
- **One writer already exists.** The owner lock from r13 is the single writer; r15 relies on it and does not add a second mechanism.
- **Time is the commit time** read once per commit by the owner; the projection never reads a clock, so a rebuild on another machine gives the same bytes. The envelope's trace reference is present and **null until telemetry exists** (r28).
- **The factory-log projection keeps the first program's record types** (transition, gate-completion, human-decision, cost, wait, pre-delegation). Events with no counterpart there (for example the walk's own events) produce no factory-log line; the mapping from event to line is a declared table, tested both ways.
- **Archive scope today.** What a finished feature leaves behind now is its documents (briefs, move records, the walk's document, the gate and ledger documents), its tasks and its checkpoints. The pinned durable library offers no way to delete a document or a task, so compaction means **replacing the feature's documents by small tombstones** that keep digests, move keys and the admission marker (research R12); terminal tasks stay, with their size measured. Compacting task checkpoints, and the conversations that r16 will add, needs a library capability and is raised with the dependency record, not worked around. Age-out of archives is an Operator setting and belongs to configuration (r17); only the event type for it is catalogued here.
- **Measurements are macOS only**, as the rest of the codebase, and are reported with their method; no pass/fail threshold is invented beyond the walk's existing 3-second budget.
- **A person is `<name>@<token>` (found while building).** The event envelope's actor has a grammar; r13's tests used free-form deciders ("p", "person"). A move whose decider does not fit the grammar is refused at submit, a program (`script:…`) is never accepted as a person, and the command line's default actor is `system`. Delegated approvals are `delegation:…`, a different event from a person's move.
- **Files are written asynchronously (found while building).** The factory-log projection and the archive write a temporary file, `fsync` and rename without blocking the owner's thread: a synchronous `fsync` in the commit's tick made the r14 in-process walk 14 times slower (25 → 347 ms; now 36 ms). A follower must not hold up what it follows.
- **The supported Node range is `^22.19.0 || >=24.1.0` (raised while building).** Node 23.6.0 ignores the busy-timeout option of its SQLite module, so a second connection failed at once with "database is locked" while the owner committed. A person raised the floor rather than have the seam work around it: every Node in the range applies the option, and a test asserts the wait on whichever Node runs and fails by name on one that does not.
- **Reserved, not used.** The document name `kiln.projection` is declared in the store's closed list of names and nothing writes it: the factory-log is a file computed from the record.
