# Quickstart: validating the durable core (row r13)

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contracts**: [contracts/](./contracts/) | **Data model**: [data-model.md](./data-model.md)

How to prove the row works end to end, **after** it is implemented; until then these commands describe what "done" looks like. Every scenario names the story it proves and the success criterion it settles. All commands run from `kiln/` unless stated; **macOS, Node ≥ 22.19** (r12's matrix, floor raised).

**Prerequisites**: Node `^22.19.0 || >=23.6.0`, git, a clone of the repository, network **once** for `npm ci`. Nothing else is installed globally. Node prints `ExperimentalWarning: SQLite is an experimental feature` on 22.19 — expected, documented, and guarded by a test (spec Clarification Q1).

## 0. The shape on disk *(US8 · FR-050, FR-053)*

```bash
cd kiln
grep -A4 '"dependencies"' package.json     # three entries, exact "1.4.0" — no ^ or ~
grep '"node"' package.json                 # "^22.19.0 || >=23.6.0"
git ls-files package-lock.json             # tracked
git check-ignore node_modules              # ignored
grep -c "no dependency\|nothing to install" ../README.md package.json   # 0 — the old statements are gone
```

**Expect**: three pinned dependencies, a tracked lockfile, the new floor, and `kiln/DEPENDENCIES.md` present with one section per dependency.

## 1. Install and the three checks *(US8 · SC-009)*

```bash
npm ci                                     # the one network act
npm run check                              # three PASS: network, boundaries, legacy
npm test                                   # new + legacy; exit 0
```

**Expect**: `PASS network`, `PASS boundaries`, `PASS legacy`; the runner's closing line shows **at least 184 new + 500 legacy** tests plus this row's own; the `node:sqlite` canary test passes. `git rev-parse HEAD:legacy` is still `20a82c7e214be256c804f6e8f1cd4cce9c8e9874`.

## 2. One seam *(US4 · FR-001, FR-002 · SC-006, SC-010)*

```bash
node packages/cli/src/main.ts check boundaries
npm test -- packages/durable/tests/seam.test.ts
```

**Expect**: boundaries passes. The seam tests show that only `packages/durable/src/library/` imports the library, that the package's exported declarations contain **0** library names, and that the models object has **no provider**. A planted `import "@earendil-works/pi-durable"` in another package makes `kiln check boundaries` fail with `boundary-bare-specifier`, naming the file (the negative suite, scenario 8).

## 3. A gate waits, whatever happens *(US1 · SC-001, SC-002, SC-004)*

```bash
npm test -- packages/durable/tests/proof/kill-points.test.ts packages/durable/tests/proof/storm.test.ts
```

**Expect**: for **every declared kill point** the owner dies by SIGKILL *at that point*, a fresh reader finds the gate absent, waiting-with-no-record or settled-with-one-record (never partial), and a restarted owner agrees; **≥ 7 consecutive kills** with no move leave the gate waiting, `reports` empty (nothing parked), and the next valid move **commits**; a ±10-year clock jump and 2 s of real time settle nothing and the store holds **0** timers. The run prints `exercised N of N` kill points and fails by name if any declared point never fired.

## 4. A move settles once, from another process *(US2, US3 · SC-003)*

```bash
node packages/cli/src/main.ts owner --store /tmp/kiln-demo &       # prints: listening / ready
node packages/cli/src/main.ts gate open --store /tmp/kiln-demo --key o1 --gate gate:demo:gate0:1 \
     --gate-key gate0 --flow v2 --brief ./fixtures/demo-brief.json --by factory
node packages/cli/src/main.ts gate state --store /tmp/kiln-demo --gate gate:demo:gate0:1     # {"state":"waiting"}
node packages/cli/src/main.ts gate move  --store /tmp/kiln-demo --gate gate:demo:gate0:1 --key m1 \
     --kind approve --by person@example --brief-ref <the hash `open` printed>               # {"status":"committed",…}
node packages/cli/src/main.ts gate move  … --key m1 …                                       # {"status":"repeat",…}
node packages/cli/src/main.ts gate move  … --key m2 --kind reject …                         # {"status":"refused","reason":"stale","winner":"m1"}
kill %1
npm test -- packages/durable/tests/proof/exactly-once.test.ts
```

**Expect**: the sequence above; and the test: **100** concurrent identical moves ⇒ 1 `committed`, 99 `repeat`, 1 record; **100** competing moves ⇒ 1 `committed`, 99 refused each naming the winner; **100** more after a SIGKILL and restart ⇒ 0 `committed`; plus a conflict, a stale, an invalid (no decider, kind outside the vocabulary, **no brief ref, a different brief ref**), an unknown gate, a move during start-up, and an injected store failure — every refusal leaves the store unchanged.

## 5. A gate opens whole *(US3)*

```bash
npm test -- packages/durable/tests/proof/open.test.ts
```

**Expect**: killed at every named step of opening, a gate is **absent or whole** (gate document + brief + `gate.opened` entry); opening again with the same key yields one gate and one outbox entry; a settled gate's move record names the brief it was decided on, and the stored brief hashes to that reference.

## 6. One owner per store, through a local channel only *(US7 · SC-007)*

```bash
npm test -- packages/durable/tests/proof/owner.test.ts packages/cli/tests/channel.test.ts
```

**Expect**: a second owner on an owned store is refused **20 times** (message names store, pid, host, socket) with the first unharmed; after SIGKILL of the first, a new process takes over on its first attempt; **50 concurrent starters** on a stale lock produce exactly one owner; `lsof -nP -a -i -p <ownerPid>` lists **no** network socket while serving, after a kill and after a restart; a request whose owner is killed mid-way ends with *outcome unknown* within 5 s; the socket is `0600` in a `0700` directory.

## 7. Steps, commands and the lane *(US5, US6 · SC-008)*

```bash
npm test -- packages/durable/tests/proof/units.test.ts packages/durable/tests/proof/commands.test.ts packages/lane/tests/lane-task.test.ts
```

**Expect**: a scripted unit killed at every named point resumes and commits **one** result — the store never shows a result before the last commit; a command repeated 100 times, before and after restarts, takes effect once, and the same key with another request is a conflict; two steps asking for the lane at once ⇒ exactly one holder, **0** instants with two across ≥ 100 trials; a kill during a held lease leaves **0** running generations until the resumed step re-acquires, and the lane's resident model, hold flag and swap count are as they were.

## 8. The proof can fail *(FR-061)*

```bash
npm test -- packages/durable/tests/proof/negative.test.ts packages/cli/tests/check-network.test.ts packages/cli/tests/check-boundaries.test.ts
```

**Expect**: the deliberately **half-applying** gate (two commits, in the tests' support code) is `not-held` for atomicity with the violated invariant named, at its seam and nowhere else; a run that exercises no kill point, or whose declared list is empty or not fully exercised, fails by name; and each planted violation of the checks fails by name — `listen(8080)`, a host in `connect`, `node:net` in an unlisted file, `node:http` in a listed one, an undeclared external, the library imported from `workers`, a `^1.4.0` pin, a missing lockfile.

## 9. Scale and readiness *(SC-005)*

```bash
npm test -- packages/durable/tests/proof/scale.test.ts
```

**Expect**: a factory holding **100 open gates and 20 units** is killed and restarted; the owner reports ready — and accepts a move on every waiting gate — within **2 s**; a move that arrives earlier is `not-ready` and the same key then commits. The measured time is printed and recorded in `baseline.md`.

## 10. The declared floor *(US8 · FR-051)*

```bash
npx -y node@22.19.0 tests/run.ts --new-only && npx -y node@22.19.0 packages/cli/src/main.ts check
npx -y node@23.6.0  tests/run.ts --new-only
npx -y node@24.1.0  tests/run.ts --new-only
```

**Expect**: the same pass counts as on the installed Node (r12's matrix with 22.18 replaced by 22.19); the warning on 22.19 is the only stderr noise; results in `baseline.md`.

## 11. Nothing else moved *(FR-063)*

```bash
cd .. && git rev-parse HEAD:legacy            # 20a82c7e214be256c804f6e8f1cd4cce9c8e9874
git diff --stat main -- legacy specs/ROADMAP.md   # empty
cd kiln && npm test                              # at least the r12 counts, plus this row's
```

## Done when

- Scenarios 0–9 behave as stated on a **fresh clone**, 10 is recorded, and 11 is empty/equal.
- The contract files are free of library names (`grep -nE 'pi-durable|@earendil-works|Harness|defineTask' specs/011-durable-core-gate-contract/contracts/{gate-contract,seam-api,owner-channel}.md` prints nothing).
- `specs/ROADMAP.md` is unchanged by this row, and r13 is still `queued` — closing it is the human's Roadmap-gate move.
