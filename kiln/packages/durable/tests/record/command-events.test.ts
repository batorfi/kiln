import { test } from "node:test";
import assert from "node:assert/strict";
import { withFactory } from "../walk/support.ts";

const accepted = async (f: Parameters<Parameters<typeof withFactory>[0]>[0]) => (await f.inspect()).outbox.filter((e) => e.type === "command.accepted");

test("an accepted command is one event in its own commit: kind, request hash, issuer, key", () => withFactory(async (f) => {
  const r = await f.tasks.create("c1", "kiln.unit", { label: "x", steps: 1 } as never, { kind: "factory" });
  assert.equal(r.status, "created");
  const ev = await accepted(f);
  assert.equal(ev.length, 1);
  assert.deepEqual([ev[0].actor, ev[0].cause, ev[0].subject, (ev[0].data as any).kind], ["system", "c1", "factory", "task.create"]);
  assert.match((ev[0].data as any).requestHash, /^[0-9a-f]{64}$/);
}));

test("a repeat of the same key writes no second event; a conflicting request and a refusal write none", () => withFactory(async (f) => {
  await f.tasks.create("c1", "kiln.unit", { label: "x", steps: 1 } as never, { kind: "factory" });
  assert.equal((await f.tasks.create("c1", "kiln.unit", { label: "x", steps: 1 } as never, { kind: "factory" })).status, "repeat");
  assert.equal((await f.tasks.create("c1", "kiln.unit", { label: "other", steps: 1 } as never, { kind: "factory" })).status, "refused");
  assert.equal((await f.tasks.create("c2", "kiln.unit", { label: "x", steps: 99999 } as never, { kind: "factory" })).status, "refused", "an invalid input is refused before anything is written");
  assert.equal((await accepted(f)).length, 1);
}));

test("opening a gate is a command accepted by whoever opened it", () => withFactory(async (f) => {
  const o = await f.gates.open("o1", { gateId: "gate:demo:gate0:1", gateKey: "gate0", flow: "v2", brief: { k: 1 } as never, openedBy: "factory" });
  assert.equal(o.status, "opened");
  assert.equal((await f.gates.open("o1", { gateId: "gate:demo:gate0:1", gateKey: "gate0", flow: "v2", brief: { k: 1 } as never, openedBy: "factory" })).status, "repeat");
  const ev = (await f.inspect()).outbox.filter((e) => e.type === "command.accepted" && e.cause === "o1");
  assert.equal(ev.length, 1, "one command, one event, however many times it is sent");
  assert.deepEqual([ev[0].actor, (ev[0].data as any).kind], ["factory", "gate.open"]);
  const opened = (await f.inspect()).outbox.filter((e) => e.type === "gate.opened");
  assert.equal(opened.length, 1);
  assert.notEqual(ev[0].seq, opened[0].seq, "the command and the gate it opened are separate events");
}));
