// r13 T032 — every outcome of the gate contract, in-process (contracts/gate-contract.md): committed, repeat, key-conflict, stale, lost-race, invalid-move (each of its kinds, including the brief rule of
// the clarification), unknown-gate, not-ready, store-error. EVERY refusal is asserted to leave the store exactly as it was.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { briefRef } from "#durable/canonical.ts";
import { openFactory, type Factory } from "#durable/factory.ts";
import type { Hooks } from "#durable/hooks.ts";
import type { GateSpec, Move, Outcome } from "#durable/types.ts";
import { checkInvariants } from "./support/oracle.ts";

const GATE = "gate:demo:gate0:1";
const BRIEF = { title: "Roadmap", items: [1, 2] };
const SPEC: GateSpec = { gateId: GATE, gateKey: "gate0", flow: "v2", brief: BRIEF, openedBy: "factory" };
const REF = briefRef(BRIEF);
const move = (over: Partial<Move> = {}): Move => ({ kind: "approve", decidedBy: "person@example", briefRef: REF, ...over });

async function withGate(run: (f: Factory, ctl: { failNextWrite(): void }) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "k13-out-"));
  let fail = false;
  const hooks: Hooks = {
    at: () => undefined,
    fault: (p) => { if (p === "store-write" && fail) { fail = false; throw new Error("injected store failure: store-write"); } },
  };
  const f = await openFactory({ store: join(dir, "s"), hooks });
  try {
    await f.ready;
    await f.gates.open("o1", SPEC);
    await run(f, { failNextWrite: () => { fail = true; } });
  } finally {
    await f.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
}
const until = async (cond: () => Promise<boolean>, ms = 4000): Promise<void> => { const end = Date.now() + ms; while (!(await cond())) { if (Date.now() > end) throw new Error("condition not reached"); await new Promise((r) => setTimeout(r, 20)); } };
/** Run `fn` and assert it changed nothing a reader can see. */
async function unchanged(f: Factory, fn: () => Promise<Outcome>): Promise<Outcome> {
  const before = await f.inspect(GATE);
  const r = await fn();
  assert.deepEqual(await f.inspect(GATE), before, `a refusal changed the store: ${JSON.stringify(r)}`);
  return r;
}

test("committed: the record, the move.committed entry (actor = decider, cause = key) and the decision's completion are all stored; the gate task converges and appends gate.settled", () => withGate(async (f) => {
  const r = await f.gates.submit(GATE, "m1", move());
  assert.equal(r.status, "committed");
  if (r.status !== "committed") return;
  assert.deepEqual([r.record.gateId, r.record.key, r.record.move.kind, r.record.seq], [GATE, "m1", "approve", 1]);
  assert.deepEqual(await f.gates.state(GATE), { state: "settled", record: r.record });
  await until(async () => (await f.inspect(GATE)).gateTask === "terminal");
  const i = await f.inspect(GATE);
  assert.equal(i.decision, "terminal");
  assert.equal(i.decisionMatchesRecord, true);
  const mc = i.outbox.find((e) => e.type === "move.committed")!;
  assert.deepEqual([mc.subject, mc.actor, mc.cause], [GATE, "person@example", "m1"]);
  const gs = i.outbox.find((e) => e.type === "gate.settled")!;
  assert.deepEqual([gs.subject, gs.actor, gs.cause], [GATE, "factory", "m1"]);
  assert.deepEqual(checkInvariants(i), []);
  assert.equal(f.reports.length, 0);
}));

test("repeat: the same key and an equal move returns the original record, any number of times, and writes nothing", () => withGate(async (f) => {
  const first = await f.gates.submit(GATE, "m1", move());
  await until(async () => (await f.inspect(GATE)).gateTask === "terminal");
  for (let n = 0; n < 3; n++) {
    const again = await unchanged(f, () => f.gates.submit(GATE, "m1", move()));
    assert.equal(again.status, "repeat");
    if (first.status === "committed" && again.status === "repeat") assert.deepEqual(again.record, first.record);
  }
}));

test("key-conflict: the same key with a DIFFERENT move is never a repeat, names the original key, and writes nothing", () => withGate(async (f) => {
  await f.gates.submit(GATE, "m1", move());
  await until(async () => (await f.inspect(GATE)).gateTask === "terminal");
  assert.deepEqual(await unchanged(f, () => f.gates.submit(GATE, "m1", move({ kind: "reject" }))), { status: "refused", reason: "key-conflict", original: "m1" });
  assert.deepEqual(await unchanged(f, () => f.gates.submit(GATE, "m1", move({ decidedBy: "someone@else" }))), { status: "refused", reason: "key-conflict", original: "m1" });
}));

test("stale: a move to a gate already settled by ANOTHER key is refused, names the key that settled it, and writes nothing", () => withGate(async (f) => {
  await f.gates.submit(GATE, "m1", move());
  await until(async () => (await f.inspect(GATE)).gateTask === "terminal");
  assert.deepEqual(await unchanged(f, () => f.gates.submit(GATE, "m2", move({ kind: "reject" }))), { status: "refused", reason: "stale", winner: "m1" });
}));

test("lost-race / stale: 25 different keys at once — exactly one committed, every other refused naming the winner", () => withGate(async (f) => {
  const kinds = ["approve", "revise", "reject"] as const;
  const rs = await Promise.all(Array.from({ length: 25 }, (_, n) => f.gates.submit(GATE, `race-${n}`, move({ kind: kinds[n % 3], decidedBy: `person-${n}@example` }))));
  const won = rs.filter((r) => r.status === "committed");
  assert.equal(won.length, 1);
  const winner = (won[0] as { record: { key: string } }).record.key;
  for (const r of rs) if (r.status !== "committed") {
    assert.equal(r.status, "refused");
    assert.ok(["lost-race", "stale"].includes((r as { reason: string }).reason), JSON.stringify(r));
    assert.equal((r as { winner?: string }).winner, winner);
  }
  const i = await f.inspect(GATE);
  assert.equal(i.records.length, 1);
  assert.equal(i.records[0].key, winner);
  assert.deepEqual(checkInvariants(i), []);
}));

test("invalid-move: no decider (empty / blank), a kind outside the gate's vocabulary, NO brief reference, and ANOTHER brief reference — each refused, none writes anything, the gate stays waiting", () => withGate(async (f) => {
  const cases: [string, Move][] = [
    ["empty decidedBy", move({ decidedBy: "" })],
    ["blank decidedBy", move({ decidedBy: "   " })],
    ["a kind the flow does not allow here", move({ kind: "restart" })],
    ["a kind that is no kind at all", move({ kind: "delete" as never })],
    ["no briefRef", move({ briefRef: "" })],
    ["another briefRef", move({ briefRef: briefRef({ title: "something the person was never shown" }) })],
  ];
  for (const [what, m] of cases) {
    const r = await unchanged(f, () => f.gates.submit(GATE, `bad-${what}`, m));
    assert.deepEqual([r.status, (r as { reason?: string }).reason], ["refused", "invalid-move"], `${what}: ${JSON.stringify(r)}`);
  }
  assert.deepEqual(await f.gates.state(GATE), { state: "waiting" });
  assert.equal((await f.gates.submit(GATE, "good", move())).status, "committed", "and a valid move still commits afterwards");
}));

test("unknown-gate: refused, and no gate is created by the move", () => withGate(async (f) => {
  const r = await f.gates.submit("gate:nowhere:gate0:1", "m1", move());
  assert.deepEqual(r, { status: "refused", reason: "unknown-gate" });
  assert.deepEqual(await f.gates.state("gate:nowhere:gate0:1"), { state: "unknown" });
  assert.equal((await f.inspect("gate:nowhere:gate0:1")).documents.gate, false);
}));

test("not-ready: after a restart, while the decision step has not re-registered, a move is refused and the SAME key commits once ready", async () => {
  const dir = mkdtempSync(join(tmpdir(), "k13-nr-"));
  const store = join(dir, "s");
  try {
    const first = await openFactory({ store });
    await first.ready;
    await first.gates.open("o1", SPEC);
    await first.close();
    // restart with the decision step held back from registering for 500 ms: the owner is up but cannot yet accept
    const hooks: Hooks = { at: (p) => (p === "wait.before-register" ? new Promise<void>((r) => setTimeout(r, 500)) : undefined), fault: () => {} };
    const second = await openFactory({ store, hooks });
    try {
      const early = await second.gates.submit(GATE, "m1", move());
      assert.deepEqual([early.status, (early as { reason?: string }).reason], ["refused", "not-ready"]);
      assert.equal((await second.gates.open("o9", { ...SPEC, gateId: "gate:other:gate0:1" }) as { reason?: string }).reason, "not-ready", "opening is refused the same way");
      assert.deepEqual(await second.gates.state(GATE), { state: "waiting" }, "state is a read of the store and works while not ready");
      assert.equal((await second.inspect(GATE)).records.length, 0, "the refusal wrote nothing");
      await second.ready;
      const later = await second.gates.submit(GATE, "m1", move());
      assert.equal(later.status, "committed");
    } finally {
      await second.close().catch(() => {});
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("store-error: a store failure at the moment of writing is refused, the gate is still waiting, nothing is recorded — and the same key commits once the fault is gone (the slot was re-armed)", () => withGate(async (f, ctl) => {
  ctl.failNextWrite();
  const r = await unchanged(f, () => f.gates.submit(GATE, "m1", move()));
  assert.equal(r.status, "refused");
  assert.equal((r as { reason: string }).reason, "store-error");
  assert.deepEqual(await f.gates.state(GATE), { state: "waiting" });
  assert.equal((await f.inspect(GATE)).records.length, 0);
  const ok = await f.gates.submit(GATE, "m1", move());
  assert.equal(ok.status, "committed");
  assert.equal((await f.inspect(GATE)).records.length, 1);
}));
