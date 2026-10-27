# Notes: row r14 (lab notebook — what the work found, in the order it was found)

**Branch**: `012-gates-as-data-walked-headless` | **Tasks**: [tasks.md](./tasks.md) | **Readings**: [baseline.md](./baseline.md)

## 2026-10-27 — Phase 2

* **`node` is not on this shell's default PATH.** `/opt/homebrew/bin/node` (v25.9.0) is; every command here is run after `export PATH=/opt/homebrew/bin:$PATH`. Nothing in the repo depends on this.
* **The runner's proof tier is only the proof files** (not a superset of the default tier). The task text said "include"; a superset re-runs r13's ~150 s for no new evidence, and the close-out runs both tiers anyway. `tests/runner/tier.test.ts` pins the behaviour.
* **r13's tests forced two compatibility decisions** (baseline.md, Phase 2): the note rule belongs to walk gates only; and `move-shape.test.ts`'s unknown-field example `note` became `comment`.
* **`gate open --returns-to`** was added to the CLI (not in the task list): it is the only way to open a gate with the walk's move semantics by hand, and the CLI flags test needs it.
* **A malformed `--admit` file is found before connecting** (usage exit 2, nothing sent); the first version read it after connecting and reported "owner unreachable" instead.
