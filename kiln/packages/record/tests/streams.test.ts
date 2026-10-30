import { test } from "node:test";
import assert from "node:assert/strict";
import type { Event } from "#contracts/events/types.ts";
import { checkStream } from "../src/streams.ts";
import { eventOf } from "./support/examples.ts";

let n = 0;
const ev = (type: string, data: unknown, over: Record<string, unknown> = {}): Event => eventOf(type, data, { seq: ++n, time: `2026-10-28T10:00:${String(n).padStart(2, "0")}.000Z`, ...over }) as unknown as Event;
const codes = (r: { faults: { code: string }[] }): string[] => [...new Set(r.faults.map((f) => f.code))];
const G = "gate:f:3-spec:1";
const good = (): Event[] => {
  n = 0;
  return [
    ev("gate.opened", { briefRef: "b", gateKey: "3-spec", flow: "v2", round: 1 }, { subject: G, causation: "cmd:o1" }),
    ev("move.committed", { kind: "approve", decidedBy: "human@batorfi", briefRef: "b" }, { subject: G, causation: "cmd:m1", actor: "human@batorfi" }),
    ev("gate.settled", { key: "m1", move: "approve", decidedBy: "human@batorfi" }, { subject: G, causation: "evt:2", actor: "factory" }),
  ];
};

test("a valid stream passes and says how many events it examined", () => {
  const r = checkStream(good());
  assert.deepEqual(r, { examined: 3, faults: [] });
});
test("record-vacuous: a stream of no events fails and says it examined none", () => assert.deepEqual(checkStream([]), { examined: 0, faults: [{ code: "record-vacuous", detail: "the stream has no events: a check that examined nothing proves nothing" }] }));
test("stream-gap: 1,2,4 — and a stream not starting at 1 — fail; a single run read out of a larger record is allowed to skip", () => {
  const g = good();
  assert.deepEqual(codes(checkStream([g[0], g[1], { ...g[2], seq: 4, causation: "cmd:s1" }])), ["stream-gap"]);
  assert.deepEqual(codes(checkStream([{ ...g[0], seq: 2 }, { ...g[1], seq: 3 }])), ["stream-gap"]);
  assert.deepEqual(codes(checkStream([g[0], { ...g[2], causation: "cmd:s1" }], { whole: false })), []);
});
test("time-backwards: an event earlier than its predecessor is reported, not hidden", () => {
  const g = good();
  assert.deepEqual(codes(checkStream([g[0], { ...g[1], time: "2026-10-28T09:00:00.000Z" }, g[2]])), ["time-backwards"]);
});
/** A gate round decided by `decidedBy`, as a clean numbered stream (optionally preceded by other events). */
const decided = (decidedBy: string, before: Event[] = []): Event[] => {
  const base = before.length;
  const at = (i: number) => `2026-10-28T10:00:${String(10 + i).padStart(2, "0")}.000Z`;
  const mk = (i: number, type: string, data: unknown, over: Record<string, unknown>) => ({ ...eventOf(type, data, over), seq: base + i, time: at(base + i) }) as unknown as Event;
  return [
    ...before,
    mk(1, "move.committed", { kind: "approve", decidedBy }, { subject: G, causation: "cmd:m1", actor: decidedBy }),
    mk(2, "gate.settled", { key: "m1", move: "approve", decidedBy }, { subject: G, causation: "cmd:m1", actor: "factory" }),
  ];
};
test("stream-silent-approval: a settle by a non-human, with no delegation, fails; by a human or a named delegation passes", () => {
  assert.deepEqual(codes(checkStream(decided("script:r14"))), ["stream-silent-approval"]);
  assert.deepEqual(codes(checkStream(decided("human@x"))), []);
  const armed = { ...eventOf("delegation.armed", { of: G, by: "human@x", at: "2026-10-28T10:00:00Z" }, { actor: "human@x", subject: "f", causation: "cmd:d1" }), seq: 1, time: "2026-10-28T10:00:10.000Z" } as unknown as Event;
  assert.deepEqual(codes(checkStream(decided("delegation:d1", [armed]).map((e) => (e.type === "move.committed" ? { ...e, type: "move.committed" } : e)).filter((e) => e.type !== "move.committed").map((e, i) => ({ ...e, seq: i + 1 })))), [], "a settlement under a delegation that was armed for the gate is not silent");
});
test("stream-delegation-merged: a delegation decided as a person's move fails", () => {
  const g = good();
  const merged = [g[0], { ...g[1], actor: "delegation:d1", data: { kind: "approve", decidedBy: "delegation:d1" } }, g[2]];
  assert.ok(codes(checkStream(merged as Event[])).includes("stream-delegation-merged"));
});
test("stream-content-key: a note in an event's data fails", () => {
  const g = good();
  assert.ok(codes(checkStream([g[0], { ...g[1], data: { ...(g[1].data as object), note: "redo" } }, g[2]] as Event[])).includes("stream-content-key"));
});
test("stream-move-not-in-vocabulary: a move the gate's flow does not offer fails; the same gate under another flow can allow it", () => {
  const g = good();
  const bad = [g[0], { ...g[1], data: { kind: "restart", decidedBy: "human@batorfi" } }, g[2]];
  assert.ok(codes(checkStream(bad as Event[])).includes("stream-move-not-in-vocabulary"));
});
test("causation-chain-broken: an evt: cause that is not an earlier event of the stream fails", () => {
  const g = good();
  assert.ok(codes(checkStream([g[0], g[1], { ...g[2], causation: "evt:7" }])).includes("causation-chain-broken"));
  assert.ok(codes(checkStream([g[0], g[1], { ...g[2], causation: "evt:3" }])).includes("causation-chain-broken"), "an event cannot be caused by itself");
});
