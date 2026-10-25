# Contract: the evidence command (`spikes/r42`)

**Spec**: FR-003, FR-013, SC-006 · All commands run from `spikes/r42/`.

| Command | What it does | Exit |
|---|---|---|
| `npm ci` | installs exactly the lockfile (the **one network act**; recorded in the report) | 0 / npm's |
| `npm run evidence` | runs every strategy against every guarantee, writes `out/evidence.json`, prints the table | 0 only if the run examined something and the evidence file was written; **the exit code does not say whether a guarantee held — the table does** (a spike reports `not-held`; it does not fail on it) |
| `npm run evidence -- --strategy <name>` | one strategy (`native-signal` · `native-abort` · `native-submission` · `fallback-document` · `fallback-table`) | as above |
| `npm run evidence -- --only <kind>` | one scenario kind (`kill-point` · `random-kill` · `repeat` · `race` · `conflict` · `different-process` · `no-clock` · `restart-limit`) | as above |
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

## Output

`out/evidence.json` follows [../data-model.md](../data-model.md) §3 (`Evidence`). `out/` is git-ignored; the report embeds the table and the counts. The command writes nothing outside `spikes/r42/out/` and the
temporary directory it creates for each scenario's store, which it removes.

## Safety

The harness opens no network socket (the owner listens on a Unix-domain socket in a private temporary directory), calls no model, and touches nothing under `kiln/`, `legacy/` or `specs/`.
