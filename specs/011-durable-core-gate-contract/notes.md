# Lab notebook — row r13

Running notes in the order things were learned. Nothing is edited after the fact; a correction is a new entry. (The r42 notebook is `spikes/r42/NOTES.md`.)

## Mutation checks on the gate (T043) — 2026-10-26

Each sabotage was applied to a **committed, clean tree**, the named tests were run, and the sabotage was **undone and verified undone** (the script asserts `git status` is empty after each revert) before the next. A mutation that no test caught would have meant a missing assertion; none was missed.

| # | Sabotage | Caught by (first failing test) |
|---|---|---|
| 1 | the move record is written **without completing the decision** | `outcomes.test.ts` — *committed: the record, the move.committed entry … and the decision's completion are all stored* (2 failing) |
| 2 | the **brief-reference** check is skipped | `outcomes.test.ts` — *invalid-move: no decider, a kind outside the vocabulary, NO brief reference, ANOTHER brief reference* |
| 3 | a repeat is judged by memory, **not by the stored record** | `outcomes.test.ts` — *repeat: the same key and an equal move returns the original record …* (4 failing) |
| 4 | the **key-conflict** branch is dropped (a different move under the same key reads as a repeat) | `outcomes.test.ts` — *key-conflict: the same key with a DIFFERENT move is never a repeat …* |
| 5 | a **restart un-settles** a settled gate (every move record cleared at start) | `storm.test.ts` — *7 consecutive kills on a SETTLED gate: it stays settled with the very same record (I5)* |
| 6 | the injected **store failure is swallowed** (the fault point removed) | `kill-points-declared.test.ts` (a declared point no longer used) **and** `outcomes.test.ts` *store-error* |
| 7 | the **crash-loop guard left at the library's default of 5** | `storm.test.ts` — *7 consecutive kills with no move: … the next valid move commits* — the r42 finding reproduced in the product: with the default, the decision is parked and the move can no longer commit |

**A bug in the first run of the script, kept as a lesson.** The first run printed `tree clean after: False`: the revert used a path relative to `kiln/` from the repository root, so **no mutation was undone** and they accumulated; every result after #1 was therefore meaningless (they all failed on #1's leftover). Caught only because the script ends by asserting a clean tree. The script now asserts it after *every* revert. The tree was restored with `git checkout -- kiln/` and all seven were re-run.

## Random kills — calibration (T039) — 2026-10-26

Seed `20261026`, 300 trials. With delays 0–120 ms after the child printed `STARTED`: wrecks 6 absent · 30 waiting-whole · 264 settled, 233 s. The kills straddled the commit but skewed late, and 233 s alone would have blown the suite's time budget. Re-calibrated to 0–60 ms with shorter retry waits and 8 workers: **14 absent · 60 waiting-whole · 226 settled, 120 s, 0 violations**. Both runs: every wreck absent, whole-and-waiting, or settled — never partial — and the same keys safe to retry.

## The owner lock — a file became a transaction (T018, T052) — 2026-10-27

**First design (research R5):** create `owner.lock` by hard link, break a stale one by atomic rename + verify-and-put-back. It passed one-stale-lock and torn-lock rounds, but the 50-process stress test (T052, `owner-lock-stress.test.ts`) found it: in rounds 2 and 3 on a stale lock, **two starters both believed they owned the store**. Any "look at the file, then act on it" has a window between the two steps, and a verify-and-put-back cannot close it — a third starter can slip in between the rename and the put-back.

**Design now:** the lock is a tiny separate SQLite database (`<store>/owner.lock`, one row `{pid, host, started_at, socket}`). Deciding and claiming is **one** `BEGIN IMMEDIATE` transaction: read the row, judge it, replace it — no other starter can interleave. This is the plan's stated fallback (an atomic primitive instead of a file dance), using the one storage engine the row already depends on, so no new dependency. After the change: the stress test passes (rounds on a fresh store, on a stale lock ×3, with 50 real processes each — exactly one owner, 49 refusals naming it).

**Recorded deviation from R5:** a live pid on this host is **never** taken from, even when its channel does not answer. R5 allowed takeover when the pid is alive but the channel is silent; that would let a starter steal the store from an owner that is merely slow (a long recovery), producing two owners — the one outcome the lock exists to prevent. The channel probe now only makes the *refusal* more useful ("its channel did not answer; if pid N is not a KILN owner, empty the lock with …"). A pid reused by an unrelated process therefore needs a human, which is the safe direction to fail.

**Recorded deviation from T056:** the CLI imports three modules of the durable package, not one — `channel/client.ts`, `channel/path.ts` (pure socket-path arithmetic, no network) and `owner.ts` (the `kiln owner` runner, which is the process that *is* the owner). A completer (`kiln gate …`) uses only the first two and never opens the store; `channel.test.ts` scans `packages/cli/src` for exactly these three imports and for any mention of the store or library.

## Phase 7 — what the tests found while being written (T052–T059) — 2026-10-27

- The `lsof` control works as intended: the probe lists a real TCP listener (`TCP … LISTEN`) and nothing for the owner, which does hold its Unix-domain socket (`lsof -U` shows `.sock`).
- A silent owner is waited for the full 5 s (4.5–7 s measured window); a dropped connection is noticed at once as `connection-lost`; both are exit 4, outcome unknown.
- The separate-process variants reproduce the in-process counts exactly (1/99, 1/99, 0/100, 14 of 14 kill points); they take ≈ 100 s because each completer is a whole Node process.

## The lane (T064–T067) — what was built, and two deviations — 2026-10-27

Built as research R9 describes: `packages/lane/src/lane-task.ts` — `createLane()` returns `{ api, kinds }`; the port goes in as `FactoryOptions.lane`, the `kiln.lane` task kind as `FactoryOptions.tasks`. State is the document `kiln.lane/main` `{resident, hold, swaps, lease}`; each acquire/release is one commit with its `lane.*` entries; waiting is in owner memory, FIFO; `start()` releases a dead generation's lease (entry actor `factory`, cause `restart`) and the resumed steps ask again in task-id order.

**Deviation 1 — no `within(tx)`.** The plan had the unit's own commit carry the lane change. A release inside the unit's step commit would have to wake the next waiter *after that commit succeeds*, which a function called inside someone else's transaction cannot know. Since a lease left by a dead generation is released at start, a release in its own commit loses nothing: the worst a kill can do (between the step's commit and the release) leaves a lease the restart clears. `acquire` is still one commit with the resident model, hold flag, swap count and entries. `contracts/seam-api.md` was updated to the built form.

**Deviation 2 — the port gained `start()`**, because "one lane task per factory" and "release at start" need a moment where the factory tells the lane the store is open. The lane task itself (`kiln.lane`) does nothing until r16 gives it a scheduler; it stays alive until the factory closes. Two extra kill points beyond the plan's two (`lane.acquire-committed`, `lane.release-committed`) cover the case that matters most for FR-032: killed *just after* the commit, the lease is held by a generation that no longer exists.

**Observed in the proof** (wreck state at each point, 2nd hit): `acquire-after-write` — 0 holders, resident m1, hold true, swaps 0; `acquire-committed` — **1 holder** (dead generation), resident m2, swaps 1; `release-after-write` — 1 holder (the release did not commit); `release-committed` — 0 holders. In every case the restart reported 0 holders until a resumed step asked again, with resident/hold/swaps unchanged, and both units finished.

**Oracle I8 sharpened.** It now walks the outbox in order and fails if the entries ever record two holders or a release of nothing — not only if the totals balance.

## Complexity Tracking, re-read against what was built (T078) — 2026-10-27

| Stretch (plan) | As built |
|---|---|
| `cli → durable` layer edge | **As planned, widened by two modules.** The edge exists in `boundaries.json`. The plan pinned it to the channel client; the CLI imports three modules — `channel/client.ts`, `channel/path.ts` (pure socket-path arithmetic) and `owner.ts` (the `kiln owner` runner, which *is* the owner process). A completer (`kiln gate …`) uses only the first two and never opens the store. `channel.test.ts` scans `packages/cli/src` for exactly these three and for any mention of the store or the library. `main.ts` loads the gate commands on demand so `kiln check` never loads the durable package. |
| The seam imports `pi-ai/models` with no provider | **As planned.** `library/open.ts` calls `createModels()` once; a test asserts the object has no provider and no model request path; the `workers` statement says "for model calls". |
| Network lint: externals exempt; path-only `node:net` allowlist | **As planned.** `checks/local-ipc.json` lists exactly the two channel files; planted violations (`listen(8080)`, a host in `connect`, `node:net` in an unlisted file, `node:http` in a listed one, an undeclared external) each fail by name; `no-network.test.ts` adds an OS-level `lsof` observation with a control. |
| "No dependency / nothing to install" statements | **As planned.** `package.json` description and the README corrected; `specs/009-…/quickstart.md` annotated, not rewritten; `DEPENDENCIES.md` is the record, kept equal to `package.json` and the lock by a test, which also asserts the old phrases are gone. |
| Event stream minimal; task/step/delegation/cost events deferred | **As planned, slightly more recorded.** Gate (`gate.opened`, `move.committed`, `gate.settled`) and lane (`lane.acquired`, `lane.released`, `lane.swapped`, plus a restart release with actor `factory`) entries all carry actor and cause in the commit of the state they record. Task/step progress, delegation and cost events remain r15/r16's. |
| `LaneApi` port in `durable`, implemented in `lane` | **As planned, with the port reshaped.** `within(tx)` dropped and `start()` added (see "The lane" above); durable never imports lane (the boundary check holds). |

**Additions not in the plan's table, for the record:** the owner lock became a single transaction on a small lock database (it failed its own stress test as a file); a live pid is never taken from; two extra lane kill points; the storage is opened in one *file* (two functions: the owner's store and the ownerless reader), not one function; and the Node-floor matrix found three defects (below).

## Node-floor matrix findings (T072) — 2026-10-27

The first matrix pass was green on 22.19.0 and red on 23.6.0 (5 tests) and 24.1.0 (2 tests). All three causes were real and are fixed:
1. **`DatabaseSync`'s `timeout` option is ignored on 23.6.0**, so the 50 simultaneous starters failed with `database is locked` instead of waiting for each other. The lock now also sets `PRAGMA busy_timeout`, which every supported version honours. *A product defect the floor matrix existed to find.*
2. **`rmSync` on a symlink to a directory throws `EISDIR` on 23.6.0 and 24.1.0** — a test cleanup; now `unlinkSync`.
3. **A stress round saw two "owners" on 24.1.0.** Not a lock failure: the winner released after a fixed hold, so a starter that booted late on a loaded machine acquired legitimately. The starters now hold until every starter has had its turn (a barrier on stdin), which makes "exactly one owner" a fair claim however slowly a machine boots 50 processes. Any second owner now would be a true violation.
