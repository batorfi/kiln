# Code review: The record (row r15) — the Node-floor change

**Branch**: `013-the-record` · **Reviewed**: 2026-10-29 · **Reviewer**: Claude (Sonnet 5.5), `code-review` at `high` effort

## 1. Scope and method

**Reviewed**: the uncommitted working-tree diff on top of `c18ae9e` — 13 modified files at the start of the review. It raises the supported Node range from `^22.19.0 || >=23.6.0` to `^22.19.0 || >=24.1.0` and removes the `PRAGMA busy_timeout` workaround from the seam. It touches `library/open.ts`, `package.json`, `package-lock.json`, `DEPENDENCIES.md`, the `durable` README, two tests, the root README, the vocabulary and the 013 spec, notes and implementation report. Surrounding code was read where a finding depended on it: `owner-lock.ts`, `record/src/entry.ts`, and the 013 plan, quickstart and tasks.

**Not reviewed**: the earlier 013 commits (US1–US7, the archive, the walk replays), which the report covers and a previous review already fixed in `c18ae9e`. This review says nothing about them.

**Executed after the fixes** (Node 25.9.0 unless stated):
- `npm run test:new`: **813 tests, 0 failures.**
- `npm run check`: all checks `PASS`, including `record`.
- `busy-timeout`, `owner-lock` and `dependencies-record` tests on **Node 22.19.0**: 14 of 14 pass.
- The same busy-timeout and owner-lock tests on **Node 23.6.0**: they fail, and the error names the Node version and the supported range.

**Not run**: the proof tier, and the default tier on 22.19.0 and 24.1.0. The floor matrix in the report predates this review's code changes.

## 2. Verdict

**Sound after the fixes in §4; one finding needed fixing before merge (F1).** Raising the floor is a better answer than a workaround, and the report records the decision and its reason. The weakness was that the new policy was only partly enforced. Nothing stopped an unsupported Node from running, the owner lock still carried the old workaround, and several documents of the same row still quoted the old range.

| # | Severity | Area | Finding | Status |
|---|---|---|---|---|
| F1 | Medium | `library/open.ts` | No runtime guard: on an unsupported Node (23.x) the busy timeout is 0, and a second connection fails with "database is locked" | **Fixed**, verified on 23.6.0 |
| F2 | Low–Med | `owner-lock.ts` | The lock still set `PRAGMA busy_timeout` and cited 23.6, contradicting "the seam sets nothing" | **Fixed** |
| F3 | Low | `library/open.ts` | `BUSY_TIMEOUT_MS` configures nothing; it mirrors the dependency's 5 s default | **Fixed** (comment states what it is for) |
| F4 | Low | `implementation-report.md` | §1 said the default tier is green on 23.6.0; §7 said the test fails there | **Fixed** |
| F5 | Low | `plan.md`, `quickstart.md`, `tasks.md` | Still declared or listed the old range | **Fixed** |
| F6 | Low | `record/src/entry.ts` | Comment called 23.x "inside the declared engines range" | **Fixed** |
| F7 | Low | other living docs | The PRD §7, `docs/concepts/first-run.md` and its mockup, and the `kiln-v1.md` explainer still quote `^22.18 || >=23.6` | **Not changed** (see §5) |
| F8 | Low | `package-lock.json` | Its `engines.node` had drifted from `package.json` and nothing would catch a repeat | **Fixed**, tested |

## 3. Findings

### F1 — No guard on an unsupported Node (Medium)

`npm ci` only warns about `engines`; the repo has no `engine-strict`. After the workaround was removed, `openStore` and `openReader` opened a connection whose `PRAGMA busy_timeout` was 0 on Node 23.x. Every library transaction begins `BEGIN IMMEDIATE`, so a `kiln record` tool or inspector that met the owner mid-commit failed at once with "database is locked", and a failed owner commit poisons its session. The only protection was `busy-timeout.test.ts`, which runs in the dev suite, never in production. The removed code made the connection safe on every Node; its replacement made it unsafe on some, silently.

**Fix**: `assertBusyTimeout` (`library/open.ts`) reads the timeout after `openNodeSqliteStorage`. At 0 it closes the storage and throws by name, giving the Node version and the supported range. It runs in both `openStore` and `openReader`. It checks `> 0`, not equality with `BUSY_TIMEOUT_MS`, so a library default change cannot turn a supported Node into a refusal.

### F2 — The owner lock kept the workaround (Low–Medium)

`owner-lock.ts` opened its own `DatabaseSync` with `timeout: 10_000` and also executed `PRAGMA busy_timeout = 10000`, with a comment citing 23.6. The busy-timeout test covers only the store connections. So the pragma was either dead code or a second, opposite policy for the same Node bug, and the claim that every supported Node applies the option was unproven for the lock.

**Fix**: the pragma is gone. `open()` reads the value back and, at 0, closes the database and throws by name. Every lock test (14 in `owner-lock.test.ts`) goes through it, so the claim is now exercised on each supported Node. On 23.6.0 it fails by name.

### F3 — `BUSY_TIMEOUT_MS` is a mirror, not a setting (Low)

The constant is passed to nothing; the library's own default (5 s) is what is in force. If an upgrade of the pinned library changed that default, `busy-timeout.test.ts` would fail with "x !== 5000" on every Node. The comment now says the number mirrors the pinned default and that the test is the canary for an upgrade. The constant stays, since the test needs it.

### F4–F6 — Documents that contradict the new range (Low)

- `implementation-report.md` §1 listed 23.6.0 among the Nodes where the default tier is green, while §7 said the busy-timeout test fails there. The 23.6.0 run used the removed workaround. §1 now says 23.6.0 was run too and is the reason the floor was raised. §7 now describes the refuse-by-name behaviour of the seam and the lock.
- `plan.md` ("Node `^22.19.0 || >=23.6.0` unchanged") and `quickstart.md` (the prerequisite line) now carry `^22.19.0 || >=24.1.0`. A reader following the fresh-clone quickstart (T073) on 23.x would have been told it was supported. The `tasks.md` T070 matrix line now notes that 23.6.0 was run and dropped.
- The `entry.ts` comment now says `import.meta.main` is undefined before Node 24.2, so on 24.1, the new floor.

### F8 — The lock's `engines` can drift (Low)

`package-lock.json` said `^22.18.0 || >=23.6.0` while `package.json` said `^22.19.0`. The row's edit fixed this by hand, but no test would catch a repeat. `dependencies-record.test.ts` has a new test: the lock's root `engines.node` equals `package.json`'s, and the README, `DEPENDENCIES.md` and the 013 quickstart all contain that string. Other copies of the range can still drift without a test failing (F7).

## 4. Changes made during the review

| File | Change |
|---|---|
| `kiln/packages/durable/src/library/open.ts` | `assertBusyTimeout`; called in `openStore` and `openReader`; `BUSY_TIMEOUT_MS` comment |
| `kiln/packages/durable/src/owner-lock.ts` | pragma removed; read-back check that throws by name |
| `kiln/packages/record/src/entry.ts` | comment |
| `kiln/packages/durable/tests/dependencies-record.test.ts` | the lock-`engines` and quoted-range test |
| `specs/013-the-record/{implementation-report,plan,quickstart,tasks}.md` | range and 23.6.0 statements |

Nothing is committed.

## 5. Open items and what this review did not decide

- **F7, other living docs.** The implementation report §7 records that the PRD (§7), `docs/concepts/first-run.md` and its mockup, `kiln-v1.md` §platform and the older specs were *not* edited because they are final or historical. This review did not override that. Two of them are user-facing: the first-run page tells a user that `^22.18 || >=23.6` works, which is now false (and was already stale against 22.19 since r13). Whether to edit them, or to put a note in them, is yours to decide.
- **Failure mode untested in-product.** The refuse-by-name path is exercised only by running the tests on 23.6.0 by hand; no test fakes a 0 timeout to check it on a supported Node. A seam for that would mean injecting the storage, which the current shape does not allow cheaply.
- **Other 23.x releases** (the report suspects 23.10+ apply the option) were not measured and stay excluded with the line.
- **Not re-run:** the floor matrix on 22.19.0 and 24.1.0 and the proof tier. The code changed after the report's matrix, so they should be re-run before the row closes.
- **Method limit.** The review ran at `high` effort on the diff. It is not a line-by-line audit of the 13 prior commits.
