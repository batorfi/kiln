# spikes/r42 — the external-completion spike

**This is a time-boxed experiment for roadmap row r42. It is not product code.** Nothing here is imported by `kiln/`, and nothing under `kiln/`, `legacy/` or `specs/ROADMAP.md` is changed by it. The product of the row is a *report* — a verdict (`go` · `go-with-fallback` · `no-go`) with its evidence — not this directory.

**The question.** Can a person's move, arriving from *outside* a waiting gate, complete that gate in **one atomic commit**, keyed exactly once, first move wins, with no clock involved, intact across a `SIGKILL` at any instant — on `@earendil-works/pi-durable` **1.4.0** (pinned exactly, with a committed lockfile)?

## Run it

```bash
cd spikes/r42
npm ci                      # the one network act; installs exactly the lockfile
npm run smoke               # the pinned package loads and a store opens and closes
npm test                    # the harness's own tests (the oracle, the kill hook, the evidence rules)
npm run evidence            # every strategy against every guarantee → out/evidence.json and a table
npm run kill-list           # each strategy's declared kill points
npm run report-check        # the written report agrees with out/evidence.json
```

Requires Node ≥ 22.19 (Pi Durable's own floor) on macOS. Nothing is installed globally.

## Read first

| | |
|---|---|
| What and why (normative) | [`specs/010-external-completion-spike/spec.md`](../../specs/010-external-completion-spike/spec.md) |
| An architect's reading | [`overview.md`](../../specs/010-external-completion-spike/overview.md) |
| The plan, data model and contracts | [`plan.md`](../../specs/010-external-completion-spike/plan.md) · [`data-model.md`](../../specs/010-external-completion-spike/data-model.md) · [`contracts/`](../../specs/010-external-completion-spike/contracts/) |
| The work, and the time box | [`tasks.md`](../../specs/010-external-completion-spike/tasks.md) · [`TIMEBOX.md`](./TIMEBOX.md) (16 active hours, kept in a ledger) |
| The lab notebook | `NOTES.md` (created as the work proceeds) |
| The product | `specs/010-external-completion-spike/spike-report.md` (written last) |
