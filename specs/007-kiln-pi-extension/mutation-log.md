# Mutation log — the seam (T022)

Five deliberate breakages of `kiln/pi/outcome.ts`, applied one at a time, each restored before the next and confirmed byte-identical afterward (`diff` clean). All five were caught **by name**, either by the truth-table test itself (`seam.test.ts`) or by the two dedicated mutation tests already in that file.

| # | Mutation | Result | Caught by |
|---|---|---|---|
| 1 | Move the `cannot-ask` check to **last** in `interpret` | 1 failure | `seam.test.ts` "the real seam matches EVERY row" (rows N7/N9: a valid option string with `canAsk:false` is wrongly answered) |
| 2 | Drop the `options.includes` guard | 1 failure | same test (row N8, `"maybe"` not offered, now answered) |
| 3 | Accept a bare boolean `true` as an answer | 1 failure | same test (row N10, `wrong-type`, now answered) |
| 4 | Map `undefined` to `answered` | 1 failure | same test (the N1/N2/N3/N4/N6 rows using `undefined`, now answered) |
| 5 | Add a third argument (`{ timeout: 5000 }`) to `askGate`'s `select` call | 2 failures | `no-timeout.test.ts` ("exactly two arguments" and the static `timeout:` grep) |

**Conclusion:** every named failure mode in contract `pi-seam.md` S3.1 is caught by name, and the "no timeout" rule (FR-008) is enforced both behaviourally and statically. No mutation passed silently. `outcome.ts` is restored to the version implemented in T021 (confirmed via `diff`).

## T045 — the polish-phase sweep (beyond outcome.ts)

Six mutations across the driver, the probe and the status command, each applied, confirmed caught, then restored and verified byte-identical (`diff` clean).

| # | Mutation | File | Result | Caught by |
|---|---|---|---|---|
| A | `isAllowedBinary` always returns `true` (drops the basename refusal) | `_pi-driver.ts` | assertion failure | `pi-driver.test.ts` "refuses a binary whose basename is not pi or pi.cmd" |
| B | The launch deadline's `setTimeout` never fires | `_pi-driver.ts` | the SC-004 test **hangs** (confirmed with an external kill after 12 s) — in a real run this reports as a timeout failure, never a silent pass | `pi-driver.test.ts` "a HANGING fake pi is killed at the deadline" |
| C | `freshAgentDir()` returns the operator's real `~/.pi/agent` | `_pi-driver.ts` | assertion failure: `agent dir … is not under os.tmpdir()` | `pi-driver.test.ts` "PI_CODING_AGENT_DIR … NEVER the operator's ~/.pi/agent" |
| D | Check (f) is silently skipped (no push, no failure) | `pi-ready.ts` | assertion failure: `check f ran` is false | `pi-live.test.ts` "R2.1 — every measured non-answer shape refuses" |
| E | `evaluateShapes` always returns `{ ok: true }` | `pi-ready.ts` | 3 of 4 offline unit tests fail | `pi-ready.test.ts`'s new `evaluateShapes` unit tests (added this phase — see below) |
| F | `kiln-status`'s printed line uses a canned `999` instead of the real row count (while the structured `report.rows.total` field stays correct) | `status.ts` | assertion failure: `line says 999 rows but the truth is 1` | `status.test.ts`'s new line-parsing test (added this phase — see below) |

### Two real gaps this sweep found and closed

- **E** surfaced that "the control must answer" (contract `pi-ready.md` R2.1 — *"a probe that can never say answered proves nothing"*) had no test protecting it: the only existing coverage exercised the opposite direction (a non-answer wrongly reported as answered, via the `approve-non-answer` fixture). The check's decision logic was pulled out into a pure, exported `evaluateShapes` function and given four direct unit tests, closing the gap without adding a new hook to the fixed 11-name contract in `pi-ready.md` R6.
- **F** surfaced that `status.test.ts` checked the *structured* `report.rows.total` field but never the *printed line's* embedded count — so a status line that lied while the structured field stayed honest would have passed every existing test. A new test parses the count out of the line itself, at two different row counts, and compares it to the truth.

Both gaps are now closed; the full `kiln/tests/pi/` suite (124 tests) passes with the fixes in place.
