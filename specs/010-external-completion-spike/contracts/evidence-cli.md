# Contract: the evidence command (`spikes/r42`)

**Spec**: FR-003, FR-013, SC-006 · All commands run from `spikes/r42/`.

| Command | What it does | Exit |
|---|---|---|
| `npm ci` | installs exactly the lockfile (the **one network act**; recorded in the report) | 0 / npm's |
| `npm run evidence` | runs every strategy against every guarantee, writes `out/evidence.json`, prints the table | 0 only if the run examined something and the evidence file was written; **the exit code does not say whether a guarantee held — the table does** (a spike reports `not-held`; it does not fail on it) |
| `npm run evidence -- --strategy <name>` | one strategy (`native-signal` · `native-abort` · `native-submission` · `fallback-document` · `fallback-table`) | as above |
| `npm run evidence -- --only <kind>` | one scenario kind (`kill-point` · `random-kill` · `repeat` · `race` · `conflict` · `store-error` · `different-process` · `no-clock` · `restart-limit`) | as above |
| `npm run evidence -- --markdown` | as above, but prints the Markdown table the report embeds **verbatim** (cell words are fixed: `held` · `not-held` · `not-proven`) | as above |
| `npm run report-check` | compares the written report (`specs/010-external-completion-spike/spike-report.md`) with `out/evidence.json` and the verdict rules | 0 only if every status and the verdict equal the evidence, every section is written, and the contract section names no library |
| `npm test` | the harness's own tests (the oracle, the kill hook, the never-vacuous rules) | 0 / 1 |
| `npm run kill-list` | prints each strategy's declared kill points, one per line, with its phase | 0 |

## Never vacuous (each is a failure, exit 1, by name)

| Code | When |
|---|---|
| `evidence-zero-tests` | no scenario ran |
| `evidence-zero-kill-points` | a strategy that was selected declared no kill points, or exercised none of those it declared |
| `evidence-install-mismatch` | `node_modules` is absent, or differs from `package-lock.json`, or the installed `@earendil-works/pi-durable` is not the pinned version |
| `evidence-wrong-platform` | not on a platform the report claims (macOS); the run still prints, marked *unsupported*, and exits 1 |
| `evidence-owner-failed` | the owner process could not start (for example the pinned package would not load) — printed with its stderr |
| `evidence-scenario-error` | a scenario threw something other than an owner failure (a bug in the harness); its guarantees are recorded `not-proven` and the run fails |

## Output

`out/evidence.json` follows [../data-model.md](../data-model.md) §3 (`Evidence`). `out/` is git-ignored; the report embeds the table and the counts. The command writes nothing outside `spikes/r42/out/` and the
temporary directory it creates for each scenario's store, which it removes.

## Safety

The harness opens no network socket (the owner listens on a Unix-domain socket in a private temporary directory), calls no model, and touches nothing under `kiln/`, `legacy/` or `specs/`.

## The report checker's failures (`npm run report-check`)

| Code | When |
|---|---|
| `report-evidence-missing` | `out/evidence.json` does not exist — run `npm run evidence` first |
| `report-section-missing` | one of the ten required sections ([spike-report.md](./spike-report.md) §1) is absent, out of order, or still a `_To be written_` placeholder |
| `report-status-mismatch` | a status in the report's table differs from the evidence; or a strategy is in one and not the other |
| `report-verdict-mismatch` | the `**Verdict:**` line is missing, or differs from what the rules derive from the evidence |
| `report-contract-names-library` | section 5 (the contract for r13) contains a library name (`pi-durable`, `@earendil-works`, `Harness`, `runtime.commit`, `defineTask`, `sleepUntil`, `abortTask`, `waitForTask`) |

The skeleton committed at T029 fails this check **on purpose** until the report is written (T061).
