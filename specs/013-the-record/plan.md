# Implementation Plan: The record (row r15)

**Branch**: `013-the-record` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-the-record/spec.md` (clarified 2026-10-28: four decisions recorded; three amendments made while planning — type names kept, archive compacts documents, trace null — noted under *Deviations*).

**Companions**: [research.md](./research.md) (R1–R16: the design decisions) · [data-model.md](./data-model.md) · [contracts/](./contracts/) (event and catalog, backbone and projection, archive, `kiln check record`) · [quickstart.md](./quickstart.md) (the acceptance run).

## Summary

r13 left an interim outbox, r14 filled it with what a walk does, and both said "r15 adopts these as the first events of the record". This row makes the record real, in four layers:

1. **The event and its catalog** — a frozen envelope, a versioned JSON schema per type (pure data in `contracts`), commit-time validation in one function (`appendEvent`) that replaces `appendOutbox`, and a rule that content never enters the payload: a note or a reasoning is a `{ref, digest}`. Units and commands, which r13/r14 did not record, get events; the experience, delegation and system types the row names get schemas.
2. **Storage and reading** — the record in **chunked documents** (measured: the single outbox document costs O(N) per append), entries r13/r14 wrote left exactly where they are and read as **version 0** through pure upcasters; `readRecord`/`readRun` serve the backbone, the walk's view and the inspector.
3. **The backbone and the factory-log** — consumers with durable cursors (transactional: effect and cursor in one commit; effect: at least once, idempotent), in-process, no timer; the **factory-log** as a pure reducer from events to the first program's lines, one file per feature run, rebuilt byte-identically.
4. **Replay, archive, measurement** — the first program's walks captured once outside `legacy/` and replayed byte-identically (any that cannot be captured is reported, never faked); a feature archive created automatically when a walk ends, verified before any tombstone is written; the record's size and rebuild time measured and reported.

The rest of the row is **proof**: `kiln check record` (never vacuous, with an 18-member negative suite), a negative suite for the commit, the r13/r14 kill harness extended with nine new named points and a stream/projection/archive oracle (E1–E6), and four deliberately weakened implementations each shown to be caught. Nothing of r16–r21 is pulled in: no workers, no model events, no live push, no delegation behaviour, no time travel.

## Technical Context

**Language/Version**: TypeScript run by Node's type stripping (as r12–r14). Node `^22.19.0 || >=23.6.0` unchanged. No parameter properties, enums or namespaces.

**Primary Dependencies**: none added. The three pinned packages stay behind `durable/src/library/`. `contracts` keeps `builtins: none` (no `node:crypto`: the id is arithmetic and the digest is injected); the SHA-256 and file I/O live in `durable`/`record`.

**Storage**: the existing per-factory store. New document families `kiln.event`, `kiln.record`, `kiln.cursor`, `kiln.projection`, `kiln.archive` (`DOC_NAMES`); `kiln.outbox/main` becomes read-only. The archive is a file beside the store (`<store>/archive/…`); the factory-log files are `<store>/projections/factory-log/…`. No store-contract bump (the contract guards the library version); a test opens an r14-shaped store with the new owner.

**Testing**: r12's runner over `node --test`, two tiers (r14 R16). New: pure tests (catalog, upcasters, reducer, mapping table), the commit-time negative suite, record/backbone/archive tests in-process, store-compat against an r14 fixture, replay of the committed walks, the `record` check and its negative suite, and — in the proof tier — the kill matrix, random kills and weakened variants.

**Target Platform**: macOS (as r12–r14); other platforms not measured and said so.

**Project Type**: library + CLI in the existing layered `kiln/` monorepo.

**Performance Goals**: append constant-time in the length of the record (measured at 10³/10⁴/10⁵ events); the in-process 12-gate walk stays under 3 s (r14: 0.2 s); `kiln check record` < 2 s; rebuild time reported, not thresholded.

**Constraints**: every r13/r14 test passes (some assertions on entry counts and on `data.note` are updated — listed in tasks); `legacy/` byte-identical; `ROADMAP.md` untouched by the build; no network port; no timer on a gate; no poll; no environment variable in product code can kill or fault a factory.

**Scale/Scope**: one writer per factory; a record of 10⁵–10⁶ events over a year; a run ≤ a few hundred events; chunks of 256. Out of scope: screens, live push, notifier, metrics, traces, health, time travel (EVT-6), `log.md`, workshop and team records, models, tool approval, hosts, delegation behaviour, age-out of archives (r17), compacting task checkpoints (library capability).

## Constitution Check

*GATE: passes before Phase 0 and again after Phase 1 design. `.specify/memory/constitution.md` v2.1.0.*

| Principle | Verdict | How the design meets it |
|---|---|---|
| **I** author / judge separation | n/a | no model runs; the catalog carries `unit.*` events but decides nothing |
| **II** judges on the strongest model | n/a | — |
| **III** one lane, sequential | pass | the lane gains correlation on its events; its behaviour is untouched |
| **IV** affinity | n/a | — |
| **V** a missing person never approves | **pass — preserved** | nothing in r15 settles a gate; the backbone only reads committed events; the archive runs after a walk ended; the proofs of r13/r14 are re-run on the new write path, and `gate.settled` now *requires* a decider and a move |
| **VI** Roadmap gate human-only | pass | `delegation.armed` is its own event type and never a person's `move.committed`; the stream rules (backbone §4) refuse a merged delegation; no delegation behaviour is added |
| **VII** everything recorded, atomically | **pass — the core** | `appendEvent` runs inside the caller's commit and refuses an invalid event by throwing, so the state does not change; units and commands are added so the claim "every state change" is true of the catalog; the factory-log becomes a projection that rebuilds byte-identically — the constitution's own "testable as" |
| **VIII** local by default | pass | no new IPC (record tools read the store offline); no network; forbidden remote keys are refused in events; the network lint and boundary check scan every new file |
| **IX** one committed state; event-driven surfaces | pass | the backbone wakes on an in-memory signal after commit and re-reads the store; no timer, no poll; cursors are in the store |
| **X** knowledge is not authority | n/a | — |
| **XI** a factory is portable | pass | the record, cursors, projections and the archive path are all under the store directory; a rebuild uses nothing from the host |
| **XII** workshops sovereign | n/a | — |
| *The Flow* | pass | unchanged; the move-vocabulary rule moves to a stream rule as well |
| *Dependencies* | pass | none added; the one library limit found (no delete) is recorded, not worked around |

**Gate evaluation:** no violation. Five tracked complexities below.

**Post-design re-check (after R1–R16, the data model and contracts):** two findings changed the design. (1) The single-document outbox is O(N) per append (measured), so the record is chunked — which also had to leave r13/r14's entries untouched, giving `legacyThrough` and a read-only legacy document (R2). (2) The library cannot delete a document or a task, so "compacted out of the live store" became "replaced by tombstones", with terminal tasks left and measured (R12). No principle is conflicted.

## Deviations from the spec (made while planning; the spec's Assumptions are amended to match)

1. **Type names stay** as r13/r14 wrote them (R4); the earlier assumption that the catalog's names differ from the interim ones is withdrawn. Only the shape changes between version 0 and version 1.
2. **Archive compacts documents, not tasks** (R12): the library offers no delete; the spec's FR-060 says "working state" and now says what that is.
3. **Trace is present and null** until telemetry exists (R3); FR-003 is met by the field's presence.
4. **Units and commands get events** (R11) — implied by FR-001/FR-010, not spelled out in the user stories; the cost (updated assertions) is stated.
5. **The proof walks decide as `human@r15-script`** (R9) so the first program's validator accepts the projected log; r14's `script:r14` fixtures are unchanged.

## Tracked complexities

| Complexity | Why it is accepted | Simpler alternative and why not |
|---|---|---|
| Chunked storage + `legacyThrough` + a run index | O(N) append measured; old entries must not move | one document (measured: 1.6 ms at 6 000 entries, linear); a second file (breaks "one commit") |
| Two read paths (v0 document, chunks) behind one `readRecord` | stored events are never rewritten | migrate on open (forbidden by EVT-3a) |
| `gate.settled` upcast needs its sibling `move.committed` | FR-014 needs a decider on the event, v0 entries lack it | invent a decider (a silent approval waiting to happen) |
| Capture of old walks by a spike outside `kiln/` and `legacy/` | `kiln` may not import legacy; `legacy/` is frozen | hand-conversion (nothing to compare against) |
| An archive task and an effect consumer, each with kill points | both must survive SIGKILL at every step | doing either inside a walk's last commit (unbounded commit, can fail the walk's end) |

## Project Structure

### Documentation (this feature)

```text
specs/013-the-record/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/ event-catalog.md · backbone-and-projection.md · archive.md · check-record.md
├── checklists/requirements.md
├── tasks.md          # /speckit-tasks
├── baseline.md       # before/after readings, suite time per tier, the measurements (written during implementation)
├── notes.md          # mutation checks, the capture inventory, decisions found on the way (written during implementation)
└── implementation-report.md   # at the end
```

### Source code (`kiln/`)

```text
kiln/
├── packages/
│   ├── contracts/src/events/
│   │   ├── types.ts envelope.ts id.ts                  # Event, Ctx, uuid7(time,seq) — pure
│   │   ├── catalog/ *.ts index.ts                      # one file per group: schemas as data, current versions, privacy
│   │   ├── upcast.ts                                   # v0 → v1 per type; record.unknown; EventVersionUnknown
│   │   ├── factory-log-map.ts                          # the event ↔ record table (R9)
│   │   └── index.ts
│   ├── record/src/
│   │   ├── events/validate.ts                          # validateEvent: schema, grammar, forbidden keys (uses validate-core)
│   │   ├── streams.ts                                  # E-stream rules (backbone §4)
│   │   ├── projections/factory-log.ts                  # the pure reducer foldRun(events, resolver)
│   │   ├── legacy-convert.ts                           # factory-log record ↔ event (the inverse of the table)
│   │   └── replay.ts                                   # replay a committed stream; compare bytes; verdict
│   ├── durable/src/
│   │   ├── record/
│   │   │   ├── append.ts                               # appendEvent (replaces outbox.ts), head, chunks, run index
│   │   │   ├── read.ts                                 # readRecord, readRun (v0 + chunks + upcast)
│   │   │   ├── refs.ts                                 # {ref, digest} for notes; resolve(ref)
│   │   │   ├── backbone.ts consumer.ts cursors.ts      # R8
│   │   │   ├── consumers/factory-log.ts files.ts       # the two consumers
│   │   │   ├── archive.ts archive-task.ts              # file format, the kiln.archive task
│   │   │   └── index.ts
│   │   ├── outbox.ts                                   # becomes a thin read-only shim over read.ts (compat view)
│   │   ├── store.ts types.ts hooks.ts factory.ts       # + DocNames · OutboxType→catalog · KILL_POINTS · wiring: backbone start/stop
│   │   ├── commands.ts                                 # + command.accepted
│   │   ├── library/tasks.ts open.ts                    # the seam wakes the backbone: wrapTx marks an append; runtime and root commits call onAppended after they resolve
│   │   ├── gate/ tasks/ walk/                          # call appendEvent; refs instead of notes; units emit unit.*; the row's terminal commit creates the archive task
│   │   ├── inspect.ts walk/view.ts                     # read through readRecord (compat view)
│   │   └── channel/                                    # unchanged
│   ├── lane/src/lane-task.ts                           # appendEvent + correlation of the holder's run
│   └── cli/src/record-commands.ts                      # kiln record show|status|verify|rebuild-log|archive-show
├── checks/record.ts index.ts tests/record-negative.ts record-check.test.ts     # the fifth check
├── fixtures/walks/                                     # the captured streams (R10)
├── fixtures/stores/                                    # r14-shaped stores made with r14's code (T005): r14-interface-done, r14-plain-waiting
├── schemas/events/*.json                               # generated from the catalog, kept equal by the check
└── tests/
    ├── measure/record.ts outbox-baseline.ts            # R15; the single-document "before"
    ├── tools/make-r14-store.ts gen-event-schemas.ts    # fixture and schema generators
    ├── walk/drive.ts                                   # unchanged: `--by` already sets the decider
    └── proof/ …                                        # (the durable proof support, extended)
packages/durable/tests/record/   append-negative · catalog · upcast · store-compat · read · backbone · factory-log · archive · measure-smoke  (.test.ts)
packages/durable/tests/proof/    record-kill-points · backbone-kill · archive-kill · record-random-kill  (.proof.test.ts) · record-weakened.test.ts · support/record-oracle.ts (E1–E6)
packages/record/tests/           validate · streams · reducer · mapping-table · legacy-convert · replay  (.test.ts)
spikes/015-capture-walks/        capture.ts README.md                                # one-off, outside kiln/ and legacy/
```

**Structure Decision.** The existing layered monorepo; the record is split along the layer rules (R1): pure rules in `contracts`/`record`, the store-bound parts in `durable`, the check in `checks`. The spike for old walks lives outside both `kiln/` and `legacy/` because it must read the latter and may not be read by the former.

## Risks

1. **Churn in r13/r14 tests** (R11, R13): counts of outbox entries change (a gate open now writes `command.accepted` too); assertions on `data.note` become `noteRef`. Mitigation: the compat view keeps field names; the tasks list every affected file up front; the default tier is run after each story.
2. **The old walks may not all be capturable** (R10): r8 in particular. Mitigation: Clarification Q3 — report by name; the check prints `W of 5`; the Roadmap gate decides.
3. **Wall time**: the default tier took 111 s (floor Node: 75–78 s); the new smoke tests must fit. Mitigation: heavy kill suites are `*.proof.test.ts` from the start; budget stated in `baseline.md`.
4. **The library limit on delete** (R12): compaction leaves terminal tasks. Mitigation: measured and stated; raised with the dependency record, not worked around.
5. **Determinism**: ids, chunk boundaries and the reducer must not depend on anything outside the events. Mitigation: E4 compares bytes after kills; the weakened "projection reads the clock" must be caught.
