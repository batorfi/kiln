# Quickstart: the acceptance run (row r15)

Prerequisites: `cd kiln && npm ci` (Node `^22.19.0 || >=24.1.0`); `npm test` and `npm run proof` green on the base. Every command below is offline; none opens a network port beyond r13's private socket.

## 1. The record of a walk, and the factory-log built from it (US1, US2, US3)

```sh
export S=$(mktemp -d)/store
node packages/cli/src/main.ts owner --store $S &                     # prints: listening … ready
node packages/cli/src/main.ts feature admit --store $S --key a1 --feature demo --walk fixtures/walk-plain.json
node tests/walk/drive.ts --store $S --feature demo --script fixtures/walk-plain.approve-all.json --by human@r15-script    # approves every gate through the CLI
node packages/cli/src/main.ts record verify --store $S                # PASS record — examined: <N> events, reached seq <N>
node packages/cli/src/main.ts record show --store $S --run demo | head -5          # envelopes: id, seq, type, schema, time, subject, actor, …
node packages/cli/src/main.ts record rebuild-log --store $S --run demo --out /tmp/rebuilt.jsonl
cmp /tmp/rebuilt.jsonl $S/projections/factory-log/demo.jsonl && echo BYTE-IDENTICAL
node packages/record/src/log.ts /tmp/rebuilt.jsonl                    # the first program's validator: PASS
```

Expected: gap-free sequence numbers, every event with an actor and a causation, no `note` text anywhere in `record show`, the rebuilt log byte-identical to the live one and accepted by the validator.

## 2. An invalid event cannot commit (US2)

`npm test -- packages/durable/tests/record/append-negative.test.ts` — one member per refusal code of `contracts/event-catalog.md` §1; each asserts the named refusal **and** that the state did not change.

## 3. The old walks replay byte-identically (US4)

```sh
node packages/cli/src/main.ts check record     # PASS record — examined: T types, S source files, W of 5 named walks (M missing: <names, why>), E events
node tests/run.ts packages/record/tests/replay.test.ts
```

Expected: every walk that has an original replays to its bytes; the r7 stream kept because it fails still fails with R3; any walk that could not be captured is **named with its reason**, never faked.

## 4. Old stores open; versions evolve (US5)

`npm test -- packages/durable/tests/record/store-compat.test.ts` opens an r14-shaped store (built from a committed fixture produced by the r14 owner) with the new owner: every entry reads as a current-version event, `kiln.outbox/main` is byte-identical afterwards, and the first new event continues at `legacyThrough + 1`. `…/upcast.test.ts` runs the test catalog with a breaking `gate.opened/2`: every committed replay stays byte-identical; a lossy and an impure upcaster are each caught.

## 5. Consumers (US6)

`npm test -- packages/durable/tests/record/backbone.test.ts`: a stalled consumer does not change a walk's outcome or its time (< 3 s in-process); a consumer killed at each of the four backbone points resumes from its cursor; every delivery is repeated and changes nothing.

## 6. The archive (US7)

```sh
node tests/run.ts packages/durable/tests/record/archive.test.ts
node packages/cli/src/main.ts record archive-show --store $S --archive $(ls $S/archive | head -1) --verify yes
```

Expected: the walk's end creates the archive with no command; checksum verified before any tombstone; `record show --run demo` and `feature state` answer as before; a repeated move key of the archived feature is `repeat`/`stale`, never new; `feature admit` of `demo` is refused.

## 7. The proof (SC-001, SC-003, SC-007, SC-008)

`npm run proof` — the kill matrix over the walk, backbone and archive points, 300 random kills, the weakened variants (a writer that skips validation, a consumer that advances before applying, a projection that reads the clock, an archive that compacts before verifying), each shown to be caught. Judged by a fresh reader with E1–E6 and r13/r14's I1–I10, W1–W4.

## 8. The measurements (SC-009)

`node tests/measure/record.ts` — writes bytes per event, append latency at 10³/10⁴/10⁵ events, factory-log rebuild time for a generated 10⁵-event record, the archive size and the walk overhead into `baseline.md` with the method.

## 9. Everything else still holds

`npm test` (default tier) and `npm run check` (five checks). `git diff main -- legacy` is empty; `specs/ROADMAP.md` is unchanged by the build.
