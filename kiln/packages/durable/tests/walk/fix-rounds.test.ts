// r14 T076 (US7): Verification's automatic fix rounds — bounded by the cap pinned at admission (0–3, default 2), each one a `mitigate` by the FACTORY recorded in the commit that starts it, never a person's move and
// never a settlement; after a person's reject there are no more automatic rounds.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkInvariants } from "../proof/support/oracle.ts";
import { checkWalkInvariants } from "../proof/support/walk-oracle.ts";
import { DECIDER, drive, mkMove, moveHere, PLAIN, withFactory } from "./support.ts";
import type { Refusal } from "#durable/types.ts";
import type { Factory } from "#durable/factory.ts";

const brief = (v: { openGate: { brief: unknown } | null }) => v.openGate!.brief as Record<string, any>;
const rounds = async (f: Factory) => (await f.inspect()).outbox.filter((e) => e.type === "walk.fix-round");

/** Walks to the moment Verification opens, with `fixRounds` chosen at the Roadmap gate (or the default when undefined). */
async function toVerification(f: Factory, verifier: ("pass" | "fail")[], fixRounds?: number) {
  await f.walks.admit("k1", "f", { ...PLAIN, verifier });
  const d = await drive(f, "f", (g) => (g.gateKey === "7-verification" ? undefined : { kind: "approve", ...(g.gateKey === "gate0" ? { admit: fixRounds === undefined ? {} : { fixRounds: fixRounds as never } } : {}) }));
  assert.equal(d.last.openGate?.gateKey, "7-verification");
  return d.last;
}

for (const cap of [0, 1, 2, 3]) {
  test(`cap ${cap}, verdicts fail·fail·fail·pass: ${Math.min(cap, 3)} automatic round(s), then the gate opens for a person with the cap, the rounds used and the verdicts`, () => withFactory(async (f) => {
    const v = await toVerification(f, ["fail", "fail", "fail", "pass"], cap);
    const b = brief(v);
    assert.equal(b.fix.cap, cap);
    assert.equal(b.fix.used, cap);
    assert.deepEqual(b.fix.verdicts, ["fail", "fail", "fail", "pass"].slice(0, cap + 1));
    const rs = await rounds(f);
    assert.equal(rs.length, cap);
    rs.forEach((e, k) => {
      assert.equal(e.actor, "factory");
      assert.equal(e.cause, `walk:f:fix:1:${k + 1}`);
      assert.deepEqual([(e.data as any).kind, (e.data as any).n, (e.data as any).cap], ["mitigate", k + 1, cap]);
    });
    // no round settled anything: Verification had not opened, and when it did it is WAITING
    assert.equal((await f.inspect(v.openGate!.gateId)).gate, "waiting");
    assert.deepEqual(checkWalkInvariants(await f.inspect(), { feature: "f", facts: PLAIN.facts, cap }), []);
  }));
}

test("default cap is 2 when the Roadmap gate sets none; a verifier that passes needs no round", async () => {
  await withFactory(async (f) => {
    const v = await toVerification(f, ["fail", "fail", "fail"]);
    assert.deepEqual([brief(v).fix.cap, brief(v).fix.used], [2, 2]);
  });
  await withFactory(async (f) => {
    const v = await toVerification(f, ["pass"]);
    assert.deepEqual([brief(v).fix.used, brief(v).fix.verdicts], [0, ["pass"]]);
    assert.equal((await rounds(f)).length, 0);
  });
});

test("a cap outside 0–3 is refused at the Roadmap gate by name, and a person cannot make a `mitigate` move anywhere", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", PLAIN);
  const g0 = (await f.walks.next("f")).openGate!;
  for (const bad of [4, -1, 2.5]) {
    const r = await f.gates.submit(g0.gateId, "x", mkMove(g0, { admit: { fixRounds: bad as never } }));
    assert.equal((r as Refusal).reason, "invalid-move");
    assert.match((r as Refusal).detail ?? "", /fixRounds must be 0, 1, 2 or 3/);
  }
  const mit = await f.gates.submit(g0.gateId, "y", mkMove(g0, { kind: "mitigate" }));
  assert.match((mit as Refusal).detail ?? "", /"mitigate" is not a move a person can make/);
  assert.equal((await f.gates.state(g0.gateId)).state, "waiting");
}));

test("after a PERSON's reject there are no more automatic rounds: the verifier's next verdict is shown, the gate opens, and the cap is not spent again", () => withFactory(async (f) => {
  const v = await toVerification(f, ["fail", "fail", "fail", "fail", "pass"], 2);
  assert.equal(brief(v).fix.used, 2);
  const { next } = await moveHere(f, "f", v, { kind: "reject", note: "requirement 3 still fails" });
  assert.deepEqual([next.openGate!.gateKey, next.openGate!.round], ["6-review", 2]);
  const again = (await moveHere(f, "f", next, {}, "ap")).next;
  assert.deepEqual([again.openGate!.gateKey, again.openGate!.round], ["7-verification", 2]);
  assert.equal(brief(again).fix.used, 2, "the cap was not spent again");
  assert.equal((await rounds(f)).length, 2, "still only the two rounds of the first pass");
  assert.equal(brief(again).fix.verdicts.length, 4, "the verifier\'s next verdict is shown (fail), but no round follows it");
  assert.deepEqual(checkWalkInvariants(await f.inspect(), { feature: "f", facts: PLAIN.facts, cap: 2 }), []);
  const fin = await moveHere(f, "f", again, {}, "fin");
  assert.equal(fin.next.openGate?.gateKey, "8-docs");
}));

test("the rounds are separate units of work: a worker unit and a verifier unit per round, and the invariants hold", () => withFactory(async (f) => {
  const before = (await toVerification(f, ["fail", "fail", "pass"], 2)) && (await f.tasks.list()).filter((t) => t.kind === "kiln.unit").length;
  // concept 1 · architecture 2 (author, judge) · spec 1 · plan 1 · implementation 1 · code review 1 (judge) · verification 1 (the verifier) + 2 rounds × (a worker and the verifier again)
  assert.equal(before, 8 + 2 * 2);
  for (const t of (await f.tasks.list()).filter((t) => t.kind === "kiln.unit")) assert.equal(t.status, "terminal");
  const i = await f.inspect((await f.walks.state("f")).openGate!.gateId);
  assert.deepEqual(checkInvariants(i), []);
  void DECIDER;
}));
