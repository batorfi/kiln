// r14 T064 (US5b): the feature-level move. A reject made on the FEATURE at any time: with a gate open it WITHDRAWS the gate in one commit (never settling it); with no gate open it is recorded for the walk,
// which applies it at its next wake and ignores the step it was running. Keyed exactly once, first move wins, judged against the store.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkInvariants } from "../proof/support/oracle.ts";
import { checkWalkInvariants, walkGateIds } from "../proof/support/walk-oracle.ts";
import { DECIDER, mkMove, openedOrder, PLAIN, walkTo, withFactory } from "./support.ts";
import type { Refusal } from "#durable/types.ts";

const fm = (target: string, note = "back", over: Record<string, unknown> = {}) => ({ kind: "reject" as const, decidedBy: DECIDER, target: target as never, note, ...over });

test("a gate is open: the feature-level reject WITHDRAWS it — no move record, gate.withdrawn and move.committed in the same commit — and the walk goes back to the target", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", PLAIN);
  const at = await walkTo(f, "f", "7-verification");
  const g = at.openGate!;
  const r = await f.walks.move("f", "fm1", fm("2-architecture", "the architecture is wrong"));
  assert.equal(r.status, "committed");
  assert.equal((r as any).record.effect, "withdrew");
  assert.equal((r as any).record.gateId, g.gateId);
  assert.deepEqual(await f.gates.state(g.gateId), { state: "withdrawn", key: "fm1", by: DECIDER });

  const i = await f.inspect(g.gateId);
  assert.equal(i.gate, "withdrawn");
  assert.deepEqual(i.records, [], "a withdrawn gate has NO move record");
  assert.equal(i.documents.gateSettled, false);
  assert.equal(i.documents.gateWithdrawn, true);
  assert.deepEqual(checkInvariants(i), [], "I1–I10 hold for a withdrawn gate");
  const entries = i.outbox.filter((e) => e.subject === g.gateId).map((e) => `${e.type}|${e.actor}|${e.cause}`);
  assert.ok(entries.includes(`gate.withdrawn|${DECIDER}|fm1`) && entries.includes(`move.committed|${DECIDER}|fm1`));
  assert.ok(!entries.some((e) => e.startsWith("gate.settled")));

  // a person\'s move on the withdrawn gate: stale, naming the feature move
  const late = await f.gates.submit(g.gateId, "late", mkMove(g, {}));
  assert.equal((late as Refusal).reason, "stale");
  assert.equal((late as Refusal).winner, "fm1");

  // the walk went back: Architecture round 2, then everything after it again
  const v = await f.walks.next("f", g.gateId);
  assert.deepEqual([v.openGate!.gateKey, v.openGate!.round], ["2-architecture", 2]);
  assert.equal((v.openGate!.brief as any).recross.target, "2-architecture");
  assert.equal((v.openGate!.brief as any).instruction.note, "the architecture is wrong");
  assert.ok(openedOrder(v).filter((k) => k === "7-verification#1").length === 1);
}));

test("no gate is open (a step is running): the move is RECORDED, the walk applies it at its next wake, and the finished step\'s result is ignored", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", { ...PLAIN, script: { stepMs: 300 } });
  const at = await walkTo(f, "f", "2-architecture");
  const g = at.openGate!;
  await f.gates.submit(g.gateId, "ap", mkMove(g, {}));
  // 3-spec\'s author is working (300 ms): no gate is open now
  const r = await f.walks.move("f", "fm1", fm("1-concept", "back to the concept"));
  assert.equal(r.status, "committed");
  assert.equal((r as any).record.effect, "recorded");
  const v = await f.walks.next("f", g.gateId);
  assert.deepEqual([v.openGate!.gateKey, v.openGate!.round], ["1-concept", 2], "the walk returned to the concept; Specification\'s author was never judged at a gate");
  assert.ok(!openedOrder(v).includes("3-spec#1"));
  assert.equal(v.history.filter((h) => h.type === "walk.returned").length, 1);
  assert.deepEqual(checkWalkInvariants(await f.inspect(), { feature: "f", facts: PLAIN.facts }), []);
}));

test("keyed exactly once: the same key and an equal move is a repeat; the same key and another move is a key-conflict; nothing is written twice", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", PLAIN);
  await walkTo(f, "f", "4-plan");
  const a = await f.walks.move("f", "fm1", fm("3-spec"));
  assert.equal(a.status, "committed");
  const b = await f.walks.move("f", "fm1", fm("3-spec"));
  assert.equal(b.status, "repeat");
  assert.deepEqual((b as any).record, (a as any).record);
  const c = await f.walks.move("f", "fm1", fm("3-spec", "a different note"));
  assert.equal((c as Refusal).reason, "key-conflict");
  const i = await f.inspect();
  assert.equal(i.outbox.filter((e) => e.type === "gate.withdrawn").length, 1);
}));

test("first move wins: a second feature-level move while one waits for the walk is refused naming the first", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", { ...PLAIN, script: { stepMs: 400 } });
  const at = await walkTo(f, "f", "2-architecture");
  await f.gates.submit(at.openGate!.gateId, "ap", mkMove(at.openGate!, {}));
  const a = await f.walks.move("f", "fm1", fm("1-concept"));
  assert.equal(a.status, "committed");
  const b = await f.walks.move("f", "fm2", fm("1-concept", "again"));
  assert.equal(b.status, "refused");
  assert.ok(["stale", "lost-race"].includes((b as Refusal).reason));
  assert.equal((b as Refusal).winner, "fm1");
}));

test("refusals by name: no walk, not admitted yet, an ended walk, a bad shape, a target that is not earlier — and nothing is written", () => withFactory(async (f) => {
  assert.equal(((await f.walks.move("nope", "k", fm("1-concept"))) as Refusal).reason, "unknown-gate");
  await f.walks.admit("k1", "f", PLAIN);
  await f.walks.next("f"); // the admission gate is open: the feature is not admitted yet
  const early = await f.walks.move("f", "k", fm("1-concept"));
  assert.equal((early as Refusal).reason, "stale");
  assert.match((early as Refusal).detail ?? "", /not admitted yet/);

  await walkTo(f, "f", "3-spec");
  const bad = async (m: Record<string, unknown>, re: RegExp) => {
    const r = await f.walks.move("f", "kb", m as never);
    assert.equal((r as Refusal).reason, "invalid-move");
    assert.match((r as Refusal).detail ?? "", re);
  };
  await bad({ ...fm("1-concept"), kind: "approve" }, /only a reject can be made on a feature/);
  await bad({ ...fm("1-concept"), decidedBy: "  " }, /decidedBy is empty/);
  await bad({ ...fm("1-concept"), note: "" }, /needs a note/);
  await bad({ ...fm("1-concept"), target: undefined }, /names its target/);
  await bad(fm("3-spec"), /not a place this feature can go back to from 3-spec \(allowed: 1-concept, 2-architecture\)/);
  await bad(fm("4-plan"), /not a place/);
  await bad(fm("2a-experience"), /not a place/);
  await bad(fm("roadmap"), /not a place/);
  await bad(fm("@build"), /not a place/);
  assert.equal((await f.inspect()).outbox.filter((e) => e.type === "gate.withdrawn").length, 0, "nothing was written");
}));

test("an ended walk takes no feature-level move (stale)", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", PLAIN);
  await walkTo(f, "f", "1-concept");
  const v = await f.walks.next("f");
  const done = await (await import("./support.ts")).drive(f, "f");
  assert.equal(done.last.status, "done");
  const r = await f.walks.move("f", "late", fm("1-concept"));
  assert.equal((r as Refusal).reason, "stale");
  assert.match((r as Refusal).detail ?? "", /ended \(done\)/);
  void v;
}));

test("a person\'s move on the gate and a feature-level move racing for it: exactly one wins ×60, the loser is refused naming the winner, and the invariants hold on every gate", () => withFactory(async (f) => {
  let personWon = 0;
  let featureWon = 0;
  for (let n = 0; n < 60; n++) {
    const feature = `r${n}`;
    await f.walks.admit(`k${n}`, feature, PLAIN);
    const at = await walkTo(f, feature, "2-architecture");
    const g = at.openGate!;
    const [p, m] = await Promise.all([f.gates.submit(g.gateId, "person", mkMove(g, {})), f.walks.move(feature, "fmove", fm("1-concept", "race"))]);
    const personOk = p.status === "committed";
    const featureOk = m.status === "committed";
    if (personOk) personWon++;
    if (featureOk && (m as any).record.effect === "withdrew") featureWon++;
    // exactly one of: the person settled the gate | the feature move withdrew it (a feature move after the person\'s move is RECORDED and applied after — never both on the gate)
    const gi = await f.inspect(g.gateId);
    assert.ok(gi.gate === "settled" || gi.gate === "withdrawn", `${feature}: the gate ended one way (${gi.gate})`);
    assert.equal(gi.records.length + (gi.withdrawal ? 1 : 0), 1, `${feature}: exactly one ending`);
    assert.deepEqual(checkInvariants(gi), [], feature);
    if (gi.gate === "withdrawn") assert.equal((p as Refusal).reason, "stale", `${feature}: the person\'s move lost and names the winner`);
  }
  assert.ok(personWon + featureWon >= 60 - 5, "every race had a winner");
  for (const id of walkGateIds(await f.inspect(), "r0")) assert.deepEqual(checkInvariants(await f.inspect(id)), [], id);
}));
