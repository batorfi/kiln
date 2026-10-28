// r15 T044 (US3): the factory-log reducer is pure, the mapping table is complete both ways, and the first program\'s own streams survive the round trip event ↔ line byte for byte.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { catalog } from "#contracts/events/catalog/index.ts";
import { FACTORY_LOG_MAP } from "#contracts/events/factory-log-map.ts";
import type { Event } from "#contracts/events/types.ts";
import { streamToEvents } from "../src/legacy-convert.ts";
import { validateLog } from "../src/log.ts";
import { checkStream } from "../src/streams.ts";
import { fileOf, foldRun, initialState, step, wallClock } from "../src/projections/factory-log.ts";
import { validateEvent } from "../src/events/validate.ts";
import { eventOf } from "./support/examples.ts";

const FIX = (n: string): string[] => readFileSync(new URL(`../../../fixtures/${n}`, import.meta.url), "utf8").split("\n").filter(Boolean);

test("the mapping table names every catalog type and nothing that is not one", () => {
  assert.deepEqual([...catalog.keys()].sort(), Object.keys(FACTORY_LOG_MAP).sort());
});

test("the first program\'s committed r7 streams: line → event → line is the identity on bytes, and every event is valid", () => {
  for (const name of ["r7-live-inference.jsonl", "r7-live-broken.jsonl"]) {
    const lines = FIX(name);
    const events = streamToEvents(lines, name.replace(".jsonl", ""));
    assert.equal(events.length, lines.length);
    for (const e of events) assert.deepEqual(validateEvent(e), [], `${name} #${e.seq} ${e.type}`);
    assert.deepEqual(foldRun(events), lines, `${name}: the rebuilt factory-log equals the original`);
    assert.equal(fileOf(foldRun(events)), fileOf(lines));
  }
});

test("the verdicts survive: the valid stream passes the first program\'s validator and the deliberately broken one still fails R3 — on the REBUILT file, and by the stream rules on the events", () => {
  const good = streamToEvents(FIX("r7-live-inference.jsonl"), "r7-live-inference");
  const bad = streamToEvents(FIX("r7-live-broken.jsonl"), "r7-live-broken");
  const parse = (ls: string[]) => ls.map((l) => JSON.parse(l));
  assert.equal(validateLog(parse(foldRun(good))).valid, true);
  const r = validateLog(parse(foldRun(bad)));
  assert.equal(r.valid, false);
  assert.ok(r.failures.some((f) => /R3/.test(f)), r.failures.join("\n"));
  assert.deepEqual(checkStream(good, { flow: "v1" }).faults, []);
  assert.ok(checkStream(bad, { flow: "v1" }).faults.some((f) => f.code === "stream-silent-approval"));
});

test("the reducer is a function of the events alone: folding one by one through a JSON round trip of the state equals folding at once", () => {
  const events = streamToEvents(FIX("r7-live-inference.jsonl"), "r7-live-inference");
  let state = initialState();
  const out: string[] = [];
  for (const e of events) {
    const r = step(JSON.parse(JSON.stringify(state)), e);
    state = r.state;
    out.push(...r.lines);
  }
  assert.deepEqual(out, foldRun(events));
});

test("the reducer\'s source reads no clock, no environment, no randomness, no path (a rebuild on another machine gives the same bytes)", () => {
  const src = readFileSync(new URL("../src/projections/factory-log.ts", import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(src, /Date\.now|new Date\(\)|process\.|Math\.random|performance\.|import\.meta|node:|\bhostname\b|\bcwd\b/);
});

test("a settlement made by r13/r14\'s own events becomes a gate-completion with a derived cost, the gate\'s flow, and its decider — and a feature-level move becomes no line", () => {
  const G = "gate:f:3-spec:1";
  let n = 0;
  const ev = (type: string, data: unknown, over: Record<string, unknown> = {}): Event => eventOf(type, data, { seq: ++n, time: `2026-10-28T10:0${n}:30.000Z`, correlation: "run:f", ...over }) as unknown as Event;
  const events = [
    ev("gate.opened", { briefRef: "b", gateKey: "3-spec", flow: "v2", round: 1 }, { subject: G }),
    ev("lane.swapped", { from: "a", to: "b", swaps: 1 }, { subject: "lane" }),
    ev("move.committed", { kind: "approve", decidedBy: "human@batorfi" }, { subject: G, actor: "human@batorfi" }),
    ev("gate.settled", { key: "m1", move: "approve", decidedBy: "human@batorfi" }, { subject: G, actor: "factory" }),
    ev("move.committed", { kind: "reject", scope: "feature", target: "2-architecture", decidedBy: "human@batorfi" }, { subject: "f", actor: "human@batorfi" }),
  ];
  const lines = foldRun(events).map((l) => JSON.parse(l));
  assert.equal(lines.length, 2, "the feature-level move and the opening produce no line");
  assert.deepEqual(lines[0], { recordType: "human-decision", ts: events[2].time, seq: 0, "human-decision": { gate: "3-spec", decidedBy: "human@batorfi", move: "approve" } });
  assert.deepEqual(lines[1], { recordType: "gate-completion", ts: events[3].time, seq: 1, "gate-completion": { gate: 3, move: "approve", cost: { switches: 1, wallClock: "03:00" }, decidedBy: "human@batorfi", flow: "v2" } });
  assert.deepEqual(validateLog(lines).failures, []);
});

test("wallClock: MM:SS, and HH:MM:SS from a hundred minutes (the first program\'s pattern)", () => {
  assert.deepEqual([wallClock(0), wallClock(61_000), wallClock(59 * 60_000 + 59_000), wallClock(100 * 60_000), wallClock(-5)], ["00:00", "01:01", "59:59", "01:40:00", "00:00"]);
});
