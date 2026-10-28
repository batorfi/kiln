# Code review: Gates as data, walked headless (row r14)

**Branch**: `012-gates-as-data-walked-headless` (14 commits over `main`; 131 files, +7 629 / −185) · **Reviewed**: 2026-10-28 · **Reviewer**: Claude (Sonnet 5.5)

## 1. Scope and method

Reviewed in full: the flow engine and validator (`contracts/src/flow/*`), the walk (`durable/src/walk/*`), the gate extensions (`gate/open.ts`, `move.ts`, `tasks.ts`, `slots.ts`, `documents.ts`, `flow.ts`), the row task, the channel (protocol, server, client), the CLI (`feature-commands.ts`, `gate-commands.ts`, `cli-flags.ts`), `checks/flow.ts`, the test runner's tier split and `tests/tools/mutate.ts`. Read against `spec.md` (FR-020…FR-032), `plan.md`, `research.md`, `contracts/walk-contract.md` and `implementation-report.md`.

**Not reviewed in depth**: the ~3 400 lines of tests and fixtures (read only where a finding depended on them), `gate-rail.md` prose, and the `legacy/` tree (unchanged by this branch).

**Executed**:
- `npm test` (default tier, Node 25.9.0): **exit 0 — 643 new + 500 legacy (30 skipped) tests, 0 failures.** This agrees with the implementation report.
- The proof tier (`npm run proof`, ~276 s) was **not** re-run; its result is taken from the report.
- One throwaway probe (see F1). It was deleted; the working tree is clean.

## 2. Verdict

**Sound and merge-able, with one thing I would fix first (F1) and three I would at least decide about (F2–F4).** The design is coherent: rules live in data, the engine is pure, the walk's state is its checkpoint, and the row never writes a move record. I found no defect that lets a missing person approve a gate (constitution V) or that breaks exactly-once recording. The findings concern the edges: a request the owner should refuse up front, a narrow race in the feature-level move, and a few places where a recorded decision silently has no effect.

| # | Severity | Area | Finding | Status (after §6) |
|---|---|---|---|---|
| F1 | Medium | `tasks/index.ts` | A second `feature admit` of an existing feature name, under a new key, is accepted and its row then fails | **Fixed**, tested |
| F2 | Medium | `walk/moves.ts` | Feature-level move can be recorded as `pending` while a gate is open (stale `openGateId`) | **Fixed**; open-gate branch not deterministically testable |
| F3 | Medium | `walk/walk.ts` `decide` | A pending feature-level move is dropped without a record when the person's own move ends the walk | **Fixed**, tested |
| F4 | Low–Med | `channel/server.ts` | An abandoned `feature next` is never cancelled | **Fixed**, tested |
| F5 | Low | `walk/state.ts`, `walk.ts` | The fix-round budget is per feature, not per Verification crossing | **Not changed** — needs a spec decision |
| F6 | Low | `tests/tools/mutate.ts` | Can leave a sabotaged file behind (untracked file, or SIGINT) | **Fixed** |
| F7 | Low | various | Dead code and small inconsistencies | **Mostly fixed** (see §6) |

## 3. Findings

### F1 — Re-admitting an existing feature under a new key is accepted, then fails (Medium, reproduced)

`makeTaskApi.create` (`durable/src/tasks/index.ts:19-27`) validates the input and keys the command, but nothing checks that the feature has no walk yet. `kiln.walk/<feature>` and the gate ids (`gate:<feature>:gate0:1`) are shared by anyone using that feature name.

**Reproduction** (in-process factory, `PLAIN` walk input):
```
admit("adm-1", "dup")  → {"status":"created","id":9}     row waits at gate:dup:gate0:1
admit("adm-2", "dup")  → {"status":"created","id":18}    different key, same feature
after 1.5 s            → row 9 waiting, row 18 terminal {"status":"failed"}
```
The second `admit` is answered `created` and the person only learns of the problem when the row fails in `walk.admit` (`openGate` returns `key-conflict`, which `walk.ts:48` turns into a thrown error). Effects:
- The caller is told something was created that cannot work, and a failed task is left in the store (the `reports` list shows an entry for it).
- `cursorOf` (`walk/moves.ts:19-24`) takes the *first* row with that feature. If a failed duplicate ever sorts first, `feature move` answers `stale: the walk has no state` for a healthy walk.
- The same happens after a walk has ended (`done`, `not-admitted`, `left-lane`): re-admitting the name fails the same way.

**Fix**: in `create`, for `kiln.row` with a `walk`, read `kiln.walk/<feature>` (or search for a row of that feature) inside the command's transaction and refuse with a named reason (`stale`/`key-conflict` with detail "feature already has a walk"). Add a test beside `feature-cli.test.ts`. If re-running a feature is meant to be possible later, say so in the spec and key gate ids by walk.

### F2 — The feature-level move's "no gate open" path does not re-check inside its transaction (Medium, plausible)

In `submitFeatureMove` the decision "is a gate open?" is made from a snapshot (`wd`, `walk/moves.ts:38`, tested at line 54). The commit that records `pending` (`moves.ts:68-79`) re-reads the walk document and checks `moves[key]` and `pending`, but **not `w.openGateId`**. Line 73 even writes `gateId: wd.openGateId` from the stale snapshot.

Interleaving: the snapshot shows no open gate → the row's `openGate` commits (sets `openGateId`, and finds no `pending` so is not refused) → the move's commit sets `pending`. Result: a gate is open **and** a feature-level move is pending. Nothing withdraws the gate. The person asked to send the feature back "at any time" (FR-023) and got `committed`, but the feature sits at the open gate until someone moves it; then `decide` applies their move first and the feature-level reject *after* it (`walk.ts:242-250`), which can send a just-approved feature back. The window is narrow (between a snapshot and a commit), and the kill harness does not target it.

**Fix**: inside the commit, if `w.openGateId` is set, return a "retry" result and loop (the existing `continue` path handles `lost`); the next iteration takes the withdraw route. Add a test using a hook between snapshot and commit, or a unit test that seeds `openGateId` and `pending` race state.

### F3 — A pending feature-level move is discarded silently when the walk ends (Medium)

`decide` (`walk/walk.ts:242-250`) sets `wd.pending = null` and applies the pending move only `if (!out || !out.end)`. If the person's own move ends the walk (approve at Merge, a reject to the roadmap, a split) the pending move is cleared and **nothing is recorded**: no `walk.returned`, no note that it was ignored. Its record stays in `wd.moves` with `effect: "recorded"`, and the caller was told `committed`. A reader of the history sees a feature-level reject that was accepted and had no effect.

**Fix**: when discarding, append an entry (e.g. `walk.move-ignored`, cause = the move's key, data = why) in the same commit, or refuse the move up front while the cursor is on the last gate. Either way, name the case in `walk-contract.md` §6.

### F4 — `feature next` has no cancellation on the owner (Low–Medium)

`channel/server.ts:46` awaits `walks.next(...)` for as long as the walk takes to change; the client deliberately has no timeout (`client.ts`, `waitMs = 0`). When the client disconnects (Ctrl-C of `kiln feature next`) the socket is destroyed, but the server loop keeps going: it re-arms a `Watch` waiter and, on every `notify` for that feature, re-reads the walk (including the whole outbox, `view.ts:52-55`) until the walk changes. A walk parked at a human gate for days therefore accumulates one live loop per abandoned `next`. Each only wastes work, and `send` guards `socket.destroyed`, so there is no incorrect output. Still, it is an unbounded leak that the stated "no timer" rule makes easy to hit.

**Fix**: pass an `AbortSignal` from the socket's `close` event into `nextWalk`, and disarm on abort. Add a test using `watch.size`, which already exists for this purpose.

### F5 — The fix-round budget is not reset per Verification crossing (Low)

`fix.used`, `ix` and `verdicts` live on the walk (`state.ts:43`), and `personRejected` (`state.ts:155`, `walk.ts:186`) stays true for the life of the feature. After a person rejects at Verification there are no automatic rounds on any later crossing; if Verification is re-reached after a reject at Merge, the rounds already used still count against the cap. `walk-contract.md` §5 and `research.md` R10 state this on purpose ("used pinned at the cap"), so this is not a defect in the build. The spec text (FR-032, "before the gate opens for a person") reads as per opening. I would settle it in the spec so the two agree.

### F6 — `mutate.ts` revert is not total (Low)

`tests/tools/mutate.ts` checks cleanliness with `git diff --quiet` and restores with `git checkout -- <file>`. For a file that is untracked, `git diff` reports clean, the sabotage is written, and `git checkout` then fails, leaving the file mutated. A Ctrl-C during a run also leaves the file mutated, since no signal handler restores it. The tool is only used on committed files today, so this is a guard-rail, not a live bug: refuse untracked files, and restore in a `SIGINT` handler.

### F7 — Dead code and small inconsistencies (Low)

- `walk/walk.ts:166` (`void flow;`) and `:263` (`void gateDef;`) silence unused names instead of removing them; `work` computes `flow` and uses it once. `walk/state.ts:63` (`void flow;`, unused parameter on `startState`).
- `walk/moves.ts:94`: `export type { GateKey }` is unused.
- `walk/walk.ts:34`: `Run<C>` ignores its type parameter.
- `walk/moves.ts` comments contain stray escaped apostrophes (`gate\'s`, `person\'s`, lines 2 and others) and a `\'` inside string literals in `refused` details, which print literally if copied; harmless in a template-less string but untidy.
- `walk/walk.ts:92`: `c.ok ? c.cap : 2` hides a cap refusal behind the default; `judgeExtras` already guarantees 0–3, so this branch cannot fire, but the literal `2` duplicates the flow's data default.
- `walk/walk.ts:86-88`: a triage refusal (`noTriageSkip`) is silently turned into "skip nothing" with no record. The shipped flow never sets it; a flow that does would lose the explanation.
- `cli/gate-commands.ts`: `--brief` is parsed *after* connecting, unlike `--admit` which the comment says is read before any connection. It is cleaned up by `finally`, so only the comment and the behaviour differ.
- A feature named `lane` is allowed by `FEATURE_PATTERN` and would collide with the `lane` subject in `readWalk`'s history filter (`view.ts:54`).

## 4. What is good

- **Rules are data, the engine is pure.** `engine.ts` has no gate names in it; `consequence`, `targetsOf` and `earlierThan` all derive from `rules`/`restorePoint`. `validateFlow` collects every fault and each rule has a negative-suite member.
- **Recovery is designed, not hoped for.** Every transition is recomputable from (flow, checkpoint, stored record); the opening of the next gate is idempotent by a deterministic key; kill points are declared and checked against the source.
- **The feature-level move reuses r13's single-shot slot**, so first-move-wins and exactly-once are one mechanism rather than two.
- **Honest evidence.** The implementation report lists what the proof does not show, and its §8 matches the code I saw (e.g. the `whenReady` fix, the `openGate` registration wait).
- **Backwards compatibility** is kept by construction: r13 gates keep r13 behaviour unless opened with `walk`/`returnsTo`.

## 5. Recommendations, in order

1. Fix F1 (small, reproduced, with a test).
2. Fix F2 (one extra check inside the commit, plus a test).
3. Decide F3 (record the ignored move) and F5 (align the spec with the contract).
4. Fix F4 together with F7's tidy-ups; harden F6 when the tool next changes.
5. Re-run `npm run proof` after F1–F3, since F2 and F3 touch the walk's commits and hooks.

## 6. Resolution (2026-10-28)

F1–F4, F6 and most of F7 are fixed on this branch. F5 is left as it was: it is a decision about what the spec means, not a defect.

| # | What changed |
|---|---|
| F1 | `tasks/index.ts`: admitting a row with a `walk` creates the feature's `kiln.walk` document in the same commit and records `admittedBy` (new field in `walk/doc.ts`). A second admission of the name under another key — while the walk runs or after it ended — is refused `key-conflict` naming the first key, and no row is created. The same key still answers `repeat`. Side effect: a walk's status reads `admitting` from the moment of admission instead of `starting`; no test depended on the difference. |
| F2 | `walk/moves.ts`: the commit that records a pending move now re-reads `openGateId` and, if that gate has neither a move nor a withdrawal, writes nothing and loops so the next pass withdraws it. A gate that is already settled-but-unconsumed still takes the move as pending (the case `decide` is built for). The recorded `gateId` now comes from the transaction, not the snapshot. **Limit:** the open-gate branch needs a gate to open between a snapshot and a commit; no named hook reaches that window, and adding a kill point would change the proof matrix. The settled branch is covered by the F3 test; the open branch is covered by reading only. |
| F3 | `walk/walk.ts` `decide`: when the person's move ends the walk, the pending move is recorded as `walk.move-ignored` (new `OutboxType`; actor the mover, cause its key, data says why) in the same commit. Still to do for the contract: name this case in `walk-contract.md` §6. |
| F4 | `nextWalk` and `WalkApi.next` take an `AbortSignal`; the channel server aborts it when the connection closes, which releases the waiter and rejects. `nextWalk` also disarms on a failed read, and `Watch.disarm` removes an empty waiter set. |
| F6 | `tests/tools/mutate.ts` refuses a file git does not track and restores the sabotaged file on SIGINT/SIGTERM. |
| F7 | Removed `void flow` / `void gateDef` and the unused `GateKey` re-export; `Run<C>` is now `Run`; stray `\'` escapes removed from `walk/moves.ts`; the `: 2` cap fallback in `pin` is now a thrown fault (`capChecked`); `lane` is a reserved feature name; the `--brief`/`--admit` comment in `gate-commands.ts` matches what the code does. **Not changed:** a triage refusal under `noTriageSkip` is still silent (the shipped flow never sets it); `startState` keeps its unused `flow` parameter (renamed `_flow`) because the tests call it. |

**New tests**: `durable/tests/walk/review-fixes.test.ts` (5): F1 ×2, F7, F4, F3. With the fixes to `walk.ts`, `tasks/index.ts` and `view.ts` reverted, the run did not finish (the F3 and F4 tests wait forever), so the tests do detect the defects. I did not capture a clean per-test failure list for the reverted state.

**Evidence after the fixes** (Node 25.9.0, macOS):
- `npm test`: exit 0 — 648 new + 500 legacy (30 skipped) tests, 0 failures (643 before, plus the 5 new).
- `npm run proof`: exit 0 — 92 tests, 92 pass, 0 fail, 233 s. The proof matrix, the kill-point declaration check and the oracle invariants are unchanged and pass.
- Not re-run: the floor matrix on Node 22.19.0 / 23.6.0 / 24.1.0, and `npm run check`. The new code uses nothing newer than the existing code does, but it has not been run on those versions.
