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
