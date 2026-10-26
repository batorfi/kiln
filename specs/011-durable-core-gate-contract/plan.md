# Implementation Plan: Durable core and the gate contract (row r13)

**Branch**: `011-durable-core-gate-contract` | **Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-durable-core-gate-contract/spec.md` (clarified 2026-10-26: three decisions recorded).

**Companions**: [research.md](./research.md) (R1–R13: the design decisions) · [data-model.md](./data-model.md) · [contracts/](./contracts/) (gate, seam API, owner channel, checks) · [quickstart.md](./quickstart.md) (the acceptance run).

## Summary

r13 turns r42's `go` into product code. `kiln/` gains **one seam** over Pi Durable 1.4.0 — `packages/durable`, whose `library/` directory is the only importer — and on it: the **gate contract** (open a gate whole; a move and its completion in one commit; keyed exactly once; first wins; never by clock), the five **task kinds** (roadmap, row, unit as shells; gate+decision; the lane in `packages/lane`), **idempotent commands**, **one store / one owner** (a lock file), and a **minimal local channel** with a thin CLI so another process can deliver moves. The gate is the composition r42 proved — a decision step that waits in the owner's memory and completes the gate in a single commit — **re-created** in KILN's types, with `restartLimit = Infinity` set in the one place the library opens.

The rest of the row is **proof and honesty**: the kill-and-resume proof is re-created inside `kiln/` (injected hooks, no kill switch in product code; a fresh-reader oracle; a deliberately broken gate that the proof must catch), the dependency is adopted as a **recorded, pinned, locked** decision with r12's three checks **narrowly** extended (each widening test-planted), and the floor rises to Node 22.19 with r12's own floor run repeated. Nothing r42 settled is re-opened; nothing of r14–r21 is pulled in.

## Technical Context

**Language/Version**: TypeScript run directly by Node's type stripping, no build step (as r12). Node `^22.19.0 || >=23.6.0` (floor raised from `^22.18.0`; the library needs ≥ 22.19.0). Type-stripping rules found in r42 apply: no constructor parameter properties, no enums, no namespaces.

**Primary Dependencies**: `@earendil-works/pi-durable` **1.4.0**, `@earendil-works/pi-ai` **1.4.0**, `@earendil-works/chord` **1.4.0** — exact pins, committed `kiln/package-lock.json` (91 packages, 112 MB; r42's lock is the starting point), reached **only** through `packages/durable/src/library/`. Node built-ins elsewhere (`node:net` only in the two channel files, `node:crypto`, `node:fs`, `node:os`).

**Storage**: one SQLite file per factory through the library's Node-SQLite storage (Node's built-in `node:sqlite`, *experimental* — accepted, recorded and canary-tested, Clarification Q1); a lock file beside it; a Unix socket under `$TMPDIR/kiln-<uid>/`.

**Testing**: r12's runner (`tests/run.ts`, never vacuous) over `node --test`. New: unit tests (types, hashing, ledger, lock), the **proof** under `packages/durable/tests/proof/` (child owner processes, SIGKILL at named points, fresh-reader oracle), CLI/channel tests, check tests with planted violations, and the floor matrix (22.19, 23.6, 24.1, installed).

**Target Platform**: macOS (as r12 and r42); other platforms are not measured and the README says so.

**Project Type**: library + CLI in the existing `kiln/` monorepo of packages (layered, checked by `kiln check boundaries`).

**Performance Goals**: owner **ready within 2 s** with ≥ 100 live tasks (SC-005, measured); a move acknowledged only after durable commit; no polling anywhere (constitution IX).

**Constraints**: no network port, ever (SC-007: 0); library names absent from public types (SC-010); the three checks stay three and stay never-vacuous; `legacy/` byte-identical; no environment variable in product code can kill or fault a factory; no timer on any gate or decision.

**Scale/Scope**: one factory per store; hundreds of tasks; one gate per (feature, gate key, round). Out of scope: the walk (r14), the event stream and archive (r15), workers and models (r16), config (r17), director (r18), web/operator surfaces (r19/r20), delegation (r21), multi-factory hosts (r25).

## Constitution Check

*GATE: passes before Phase 0 and again after Phase 1 design (re-checked below). `.specify/memory/constitution.md` v2.1.0.*

| Principle | Verdict | How the design meets it |
|---|---|---|
| **I** author / judge separation | pass | no model runs in r13; a gate settles only on a move that names a decider; nothing here lets a task settle a gate (the decision step has no path except a received move) |
| **II** judges on the strongest model | n/a | no judges, no models (the seam's models object has **no provider**, tested) |
| **III** one lane, sequential | pass | the lane task grants **one** lease; a test races two steps ×100 and asserts 0 double holders; generations are scripted here |
| **IV** affinity | n/a | LANE-2 was ported in r12; r13 stores resident/hold/swaps and orders FIFO; ordering by tier is r16 |
| **V** a missing person never approves | **pass — the core** | waiting is a stored state with no timer; no restart, crash count, clock or absence settles it; `restartLimit = Infinity` where the library opens; ≥ 7 consecutive kills tested; the Roadmap and every gate need a named decider |
| **VI** Roadmap gate human-only | pass | the roadmap task has no delegation field *by construction*; a test asserts it |
| **VII** everything recorded, atomically | pass (partly r15) | `gate.opened` is committed **in the same commit** as the gate document and brief (outbox entry); the full event catalog and rebuilds are r15; no migration needed (R3) |
| **VIII** local by default | pass | the only IPC is a `0600` Unix socket; **0** network ports (lsof test + lint); the library's provider SDKs sit on disk, unreachable, the network lint still covers every KILN source file |
| **IX** one committed state; event-driven surfaces | pass | the channel is not a front door and holds no truth; `state` reads the store; nothing polls (the proof's waits are on readiness events, with bounded retry only in *tests*) |
| **X** knowledge is not authority | n/a | — |
| **XI** a factory is portable | pass | the lock file travels with the store and names its host, so a foreign-host lock is **refused, never taken**; the socket is *not* in the store; a clean close removes the lock (the handover protocol) |
| **XII** workshops sovereign | n/a | no team space exists yet |
| ***Dependencies*** (pinned, recorded decision, one seam) | pass | exact pins + lock; `DEPENDENCIES.md` is the record (kept in sync by a test); one seam, enforced by the boundary check and a directory-level test |

**Gate evaluation:** no violation; four **tracked complexities** (below) are the places where r12's rules are deliberately stretched, each with a test.

**Post-design re-check (after R1–R13, data model and contracts):** unchanged — the design added no principle conflict. Two things were *tightened* by design: the oracle gained I3 (opening) and I8/I9, and the kill switch became an injected hook (no environment variable in product code).

## Project Structure

### Documentation (this feature)

```text
specs/011-durable-core-gate-contract/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/ gate-contract.md · seam-api.md · owner-channel.md · checks-and-docs.md
├── checklists/requirements.md
├── tasks.md          # /speckit-tasks
├── baseline.md       # the before/after readings and the floor matrix (written during implementation)
└── implementation-report.md   # at the end
```

### Source code (`kiln/`)

```text
kiln/
├── package.json                 # three exact dependencies; engines ^22.19.0 || >=23.6.0; description corrected
├── package-lock.json            # NEW, committed
├── DEPENDENCIES.md              # NEW: the recorded decision (name, version, integrity, licence, why, seam)
├── checks/
│   ├── boundaries.json          # cli → durable edge; externals: pi-durable seam
│   ├── boundaries.ts            # + boundary-dependency-unpinned | -undeclared | boundary-lock-mismatch
│   ├── network-lint.ts          # declared externals exempt where boundaries open them; local-IPC rule (path-only)
│   ├── local-ipc.json           # NEW: the two files allowed node:net
│   └── tests/                   # + planted-violation tests for every new code (r12's tests unchanged)
├── packages/
│   ├── durable/                 # THE SEAM
│   │   ├── kiln.json            # responsibility updated
│   │   ├── src/
│   │   │   ├── library/         # the ONLY importer of the library: open.ts (restartLimit ∞, no-provider models, onReport), tasks.ts, docs.ts, tx.ts
│   │   │   ├── types.ts hooks.ts factory.ts inspect.ts owner-lock.ts outbox.ts commands.ts
│   │   │   ├── gate/            # open.ts move.ts state.ts tasks.ts (gate + decision) slots.ts
│   │   │   ├── tasks/           # roadmap.ts row.ts unit.ts            (shells)
│   │   │   └── channel/         # protocol.ts server.ts client.ts       (node:net: ONLY here)
│   │   └── tests/
│   │       ├── seam.test.ts canary-sqlite.test.ts dependencies-record.test.ts hashing.test.ts ledger.test.ts owner-lock.test.ts
│   │       └── proof/
│   │           ├── support/     # owner-main.ts (test-only owner with injected hooks) · oracle.ts (I1–I9) · harness.ts · broken-gate.ts
│   │           └── kill-points · open · exactly-once · storm · clock · owner · units · commands · scale · negative  (.test.ts)
│   ├── lane/
│   │   ├── src/lane-task.ts     # NEW: the lane task on the seam (lease, resident, hold, swaps)
│   │   └── tests/lane-task.test.ts
│   ├── cli/
│   │   ├── src/main.ts          # + `owner` and `gate open|move|state` over the channel client
│   │   └── tests/channel.test.ts
│   └── workers/kiln.json        # text: "the only importer of pi-ai for model calls"
└── README.md (repo root)        # floor, install line, node:sqlite warning
```

**Structure Decision.** Everything the library touches is inside `packages/durable/src/library/`; the gate, tasks, ledger and channel are written in KILN types above it. The **lane task lives in `packages/lane`** (r12's own responsibility text and the layer rule `lane → durable`). The channel **client** lives in `durable` so the CLI needs exactly one new edge (`cli → durable`, tracked below). The proof lives next to the code it judges, in `durable/tests/proof/`, and uses only the seam and the CLI — never the library.

## Phases (implementation order — the tasks step turns each into dated, numbered tasks)

| Phase | What | Checkpoint (all on the installed Node unless stated) |
|---|---|---|
| **P0 Adopt the dependency, and prepare the checks** | `before` readings in `baseline.md`; pins, lock, `engines`, `DEPENDENCIES.md`, the corrected statements; **the checks first** — externals seam, `cli → durable` edge, the three boundary codes, the local-IPC rule, the network exemption — each with a *planted-violation test*; the `node:sqlite` canary | `npm ci`; `npm test` ≥ r12 counts + new; `npm run check` three PASS; no source imports the library yet |
| **P1 The seam skeleton** | `library/` façade; `openFactory` (lock, restart limit, no-provider models, clock, `reports`, `ready`); hooks and the declared kill-point list; `inspectStore` (fresh reader); seam tests (directory-level import test, public-types scan) | seam tests green; a factory opens, resumes an empty store and closes cleanly; a second `openFactory` is refused |
| **P2 The gate** | documents, outbox, command ledger; `openGate`, the gate + decision tasks and the owner slot, `submitMove`, `gateState`; readiness convergence; in-process unit tests of every outcome | every outcome of the contract returned correctly in-process; **no kill yet** |
| **P3 The proof harness and the first kills** | `owner-main`, oracle I1–I9, harness; kill-point tests for **open** and **move**; the **broken gate** and the never-vacuous guards; mutation checks (committed first) | every declared point fires and holds; the broken gate is caught at its seam only |
| **P4 The rest of the gate proof** | random kills (300), restart storm (≥ 7), clock ±10 y and wall time, exactly-once (100 / 100 / 100-after-restart), conflict/stale/invalid/unknown/not-ready/store-error, **scale** (100 gates + 20 units ≤ 2 s) | SC-001 … SC-005 met in-process (separate process arrives in P5) |
| **P5 Channel, CLI, one owner** | `channel/protocol|server|client`; `kiln owner` and `kiln gate …`; owner-lock stress (20 refusals, 50 concurrent starters, takeover); `lsof` and permission tests; the proof re-run with a **separate-process completer** | SC-003, SC-006, SC-007 met; the quickstart §4 and §6 run by hand |
| **P6 Task shells** | roadmap (no delegation field), row, unit; `task.create` through the ledger; kill-at-every-unit-point | SC-001 for units; "half-done never commits" demonstrated |
| **P7 The lane** | `packages/lane/src/lane-task.ts`; I8; ×100 race; kill during a lease | SC-008 met |
| **P8 Close** | the floor matrix (22.19, 23.6, 24.1); README and statements; `baseline.md` *after*; fresh-clone run of the quickstart; the implementation report; the tracked complexities re-read | quickstart §0–§11 behave as stated on a fresh clone; `legacy/` tree id unchanged; `specs/ROADMAP.md` untouched |

**Ordering rules.** The checks (P0) land **before** the code that needs them, so `npm run check` never fails on the branch. The proof harness (P3) lands **before** the rest of the gate's guarantees are claimed, and its broken-gate control is shown failing before the real gate is shown passing. Mutation checks on the gate are done on a **committed** tree and undone before anything else runs (r42's lesson). Each phase ends with a commit and its checkpoint recorded.

## Requirements → where they are proven

| Spec | Proven by |
|---|---|
| FR-001, 002, SC-006, SC-010 | `seam.test.ts` (directory-level import, public-types scan), `kiln check boundaries` + negative suite |
| FR-003, 004, 005 | `units.test.ts`, roadmap-shell test, `inspectStore` reads in every proof |
| FR-010 … 018, SC-001, 003 | `open.test.ts`, `kill-points.test.ts`, `exactly-once.test.ts` |
| FR-011, SC-002, 004 | `storm.test.ts`, `clock.test.ts` (0 timers, ≥ 7 kills, ±10 years) |
| FR-020 … 022 | `units.test.ts`, `commands.test.ts`, `storm.test.ts` (`reports` empty) |
| FR-030 … 033, SC-008 | `lane-task.test.ts` |
| FR-040 … 046, SC-005, 007 | `owner.test.ts`, `scale.test.ts`, `channel.test.ts` (`lsof`, permissions, outcome unknown) |
| FR-050 … 054, SC-009 | `dependencies-record.test.ts`, `canary-sqlite.test.ts`, check tests, the floor matrix, `baseline.md` |
| FR-060 … 063 | the proof directory as a whole + `negative.test.ts` (broken gate, vacuous runs, planted violations) |

## Risks

| Risk | Likelihood · impact | Mitigation |
|---|---|---|
| The proof suite makes `npm test` slow (r42: ~3.5 min for four strategies) | medium · medium | measure at P4; if the new suite exceeds **3 min**, random kills and the storm move to a `proof` script run at close-out and recorded — the runner prints which tier ran; never silent |
| Stale-lock takeover races (50 starters) | medium · high | the verify-and-put-back step (R5) is tested by stress; if it cannot be made reliable, fall back to a lock *directory* (`mkdir` is atomic) — decided at P5 |
| The library's behaviour differs on 22.19 vs 25.9 for something r42 did not exercise (task re-run, document families) | low · medium | r42 ran `native-signal` on 22.19; the floor matrix re-runs the whole new suite on 22.19, 23.6, 24.1 |
| The network lint grows holes when exempting declared externals | low · high | the exemption reads **the same file** the boundary check enforces; every new code has a planted test; r12's "strictly stronger" test stays green |
| `ready` takes longer than 2 s with 100+ tasks | low · medium | measured at P4; fix is parallel re-registration, not relaxing the criterion (R13) |
| The unit/row shells grow into the walk (scope creep into r14/r18) | medium · medium | shells are **scripted**; nothing reads flow data except the gate's vocabulary; any new behaviour needs a spec line |

## Complexity Tracking

> Places where r12's rules are deliberately stretched — each justified, each with a test.

| Stretch | Why needed | Simpler alternative rejected because |
|---|---|---|
| **`cli → durable` layer edge** (`boundaries.json`) | the thin CLI is a *client of the owner's channel*; the client module lives with the protocol it speaks | routing it through `server` (r19, not yet built) or putting socket code in `contracts` (no I/O allowed); a cli test pins the edge to the channel **client** only |
| **The seam imports `@earendil-works/pi-ai/models`** although `workers` is "the only importer of pi-ai" | the library's `Harness.open` *requires* a `models` option and only `createModels()` builds one | injecting it from `workers` makes r13 depend on r16; the statement is narrowed to "for model calls" and a test asserts **no provider** is ever registered |
| **Network lint: declared externals exempt; a path-only local-socket allowlist for `node:net`** | the library is a bare specifier, and the channel needs a Unix socket; both are denied today by design | a loopback TCP port (a real network surface); a second source of truth for externals (drift) — the exemptions read the boundary rules and the allowlist is path-keyed with self-checks |
| **`kiln.json`/README/package statements change** ("no dependency, nothing to install") | they become false the moment a dependency is admitted | leaving them is a lie; r12's quickstart is *annotated* rather than rewritten (history stays history) |
