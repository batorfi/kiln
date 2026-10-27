# Notes: row r14 (lab notebook — what the work found, in the order it was found)

**Branch**: `012-gates-as-data-walked-headless` | **Tasks**: [tasks.md](./tasks.md) | **Readings**: [baseline.md](./baseline.md)

## 2026-10-27 — Phase 2

* **`node` is not on this shell's default PATH.** `/opt/homebrew/bin/node` (v25.9.0) is; every command here is run after `export PATH=/opt/homebrew/bin:$PATH`. Nothing in the repo depends on this.
* **The runner's proof tier is only the proof files** (not a superset of the default tier). The task text said "include"; a superset re-runs r13's ~150 s for no new evidence, and the close-out runs both tiers anyway. `tests/runner/tier.test.ts` pins the behaviour.
* **r13's tests forced two compatibility decisions** (baseline.md, Phase 2): the note rule belongs to walk gates only; and `move-shape.test.ts`'s unknown-field example `note` became `comment`.
* **`gate open --returns-to`** was added to the CLI (not in the task list): it is the only way to open a gate with the walk's move semantics by hand, and the CLI flags test needs it.
* **A malformed `--admit` file is found before connecting** (usage exit 2, nothing sent); the first version read it after connecting and reported "owner unreachable" instead.

## 2026-10-27 — US4 (`kiln check flow`)

* **Mutation script** (`kiln/tests/tools/mutate.ts` + `specs/012-…/mutations-*.json`): applies a sabotage to a committed, clean file, runs the named tests, requires them to FAIL, reverts with `git checkout`, and fails if the file is not clean afterwards (r13's lesson). US4's three sabotages — delete the Merge-is-last rule, let an empty flow pass, make the glob dialect accept anything — were all caught by name, and each revert left the tree clean.
* **`structuredClone` is the wrong deep copy for the flow data.** v2 shares its rule objects between gates (`APPROVE`, `REVISE` …); `structuredClone` preserves that sharing, so a negative member meant to break *one* gate's rule broke every gate's — and the suite reported unrelated gates. The suite now clones through JSON. (The shared objects are fine in production: nothing mutates them.)
* **The suite found two real consequences, not bugs:** swapping Specification and Work plan puts Work plan before the arming point (its `delegable: "default"` is then invalid), and removing the restore point leaves Verification's `@build` default pointing at nothing. Both are listed as `also` on their members. A third — `appliesWhen` on Work plan making it "must be never delegable" — *was* a validator bug (the rule keyed on `appliesWhen` instead of on the two interface gates) and was fixed in `validate.ts`.
* **The negative suite counts 37 members for 28 codes** (the task text said "at least one per code"): several rules have more than one way to break (`returns_to` has four, arming three), plus two multi-fault members. The T018 wording "the repaired flow passes" is implemented as "the unmutated flow passes in the same harness AND no member reports a code that is neither its own nor a listed consequence" — stronger, since it also catches noise.
* **The flow check's `scanned` is 1** (the data file); the gate count is a note ("12 gates examined"), so `scanned` keeps meaning files read for every check (analysis finding X3).
