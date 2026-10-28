// r15 T052 (US4): every committed old walk replays to its original bytes; the stream kept because it fails still fails, naming the same rule; and the replay can fail.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { NAMED_ROWS, loadWalks, replayAll, replayStream, type WalkSet } from "../src/replay.ts";

const DIR = fileURLToPath(new URL("../../../fixtures/walks", import.meta.url));
const set = (): WalkSet => loadWalks(DIR);

test("five streams of three named rows are committed, and every one replays clean — original bytes, verdict, events", () => {
  const s = replayAll(set());
  assert.equal(s.results.length, 5);
  assert.deepEqual(s.results.flatMap((r) => r.problems.map((p) => `${r.name}: ${p.code} ${p.detail}`)), []);
  assert.deepEqual(s.results.flatMap((r) => r.streamFaults.map((f) => `${r.name}: ${f.code}`)), [], "and the stream rules find nothing else to report (the expected silent approvals aside)");
  assert.deepEqual(s.replayedRows, ["r2", "r3", "r7"]);
  assert.ok(s.results.every((r) => r.records > 0 && r.events === r.records), "every record became exactly one event");
});

test("the rows with no original are listed with a reason, never faked: r1 and r8", () => {
  const s = replayAll(set());
  assert.deepEqual(Object.keys(s.missingRows).sort(), ["r1", "r8"]);
  assert.match(s.missingRows.r1, /scaffold/);
  assert.match(s.missingRows.r8, /Pi extension/);
  assert.deepEqual(s.unexplained, []);
  assert.deepEqual([...s.replayedRows, ...Object.keys(s.missingRows)].sort(), [...NAMED_ROWS].sort(), "every named row is accounted for");
});

test("the streams kept because they fail still fail: R3, by the first program's validator and by the stream rules", () => {
  const broken = set().streams.filter((w) => w.meta.expect === "R3");
  assert.deepEqual(broken.map((w) => w.meta.name).sort(), ["r3-program-walk-broken", "r7-live-broken"]);
  for (const w of broken) assert.deepEqual(replayStream(w).problems, [], w.meta.name);
});

test("the replay can FAIL: one altered byte in the events, in the original, or a verdict that flips, is named", () => {
  const w = set().streams.find((x) => x.meta.name === "r7-live-inference")!;
  const altered = replayStream({ ...w, eventsText: w.eventsText.replace('"approve"', '"reject"') });
  assert.ok(altered.problems.some((p) => p.code === "replay-fixture-altered") && altered.problems.some((p) => p.code === "replay-differs"), JSON.stringify(altered.problems));
  const orig = replayStream({ ...w, original: w.original.replace("human@batorfi", "human@somebody") });
  assert.ok(orig.problems.some((p) => p.code === "replay-fixture-altered" || p.code === "replay-differs"));
  const wb = set().streams.find((x) => x.meta.name === "r7-live-broken")!;
  assert.ok(replayStream({ ...wb, meta: { ...wb.meta, expect: "valid" } }).problems.some((p) => p.code === "replay-verdict-differs"), "a broken stream claimed valid is caught");
  assert.ok(replayStream({ ...w, meta: { ...w.meta, expect: "R3" } }).problems.some((p) => p.code === "replay-verdict-differs"), "a valid stream claimed to fail is caught");
});

test("a replay of no walks proves nothing: it replays zero rows and says so", () => {
  const s = replayAll({ streams: [], missing: {} });
  assert.deepEqual([s.results.length, s.replayedRows.length, s.unexplained.length], [0, 0, 5]);
});
