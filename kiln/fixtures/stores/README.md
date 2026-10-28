# r14-shaped store fixtures (r15 T005)

Two stores written by **r14's unchanged owner** (commit `c09a5e1` plus the review fixes of PR #7), used by r15 to prove that a store r13/r14 wrote opens with the new owner, reads as current-version events and is never rewritten (SC-005).

Made by `node tests/tools/make-r14-store.ts` through the in-process factory, with an injected clock (2026-01-01, +1 s per tick) and fixed keys, closed cleanly so the file is checkpointed (no `-wal`). The library gives its conversations random ids, so the files are **not byte-reproducible**: the committed copies and the hashes below are the record. The script cannot be re-run meaningfully after r15's source changes (it would write the new format).

| Store | What | Outbox entries (v0) | SHA-256 of `factory.sqlite` |
|---|---|---|---|
| `r14-interface-done/` | the interface walk (`INTERFACE`, feature `iface`), 12 gates, every gate approved by `script:r14`; walk `done` | 38: gate.opened 12 · move.committed 12 · gate.settled 12 · walk.admitted 1 · walk.completed 1 | `36e0e4da04c346506b6fb24c44f663c3aab470ef3b5c6fa7e38e73f469fdc11f` |
| `r14-plain-waiting/` | the plain walk (`PLAIN`, feature `plain`) stopped with Specification waiting; walk `active` | 13: gate.opened 4 · move.committed 3 · gate.settled 3 · walk.admitted 1 · gate.not-applicable 2 | `6ef2f1d1ec825f1947e4587e82f86bd6760613cfbb89adcfb1ff0dc366fb3ae5` |

Tests copy a store to a temporary directory before opening it; nothing opens these files in place.
