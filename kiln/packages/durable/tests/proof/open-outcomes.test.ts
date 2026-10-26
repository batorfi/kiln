// r13 T024 — opening a gate, in-process (no kills): every outcome of the contract, and what a successful opening leaves in the store (spec US3, FR-010, contracts/gate-contract.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { briefRef } from "#durable/canonical.ts";
import { openFactory, type Factory } from "#durable/factory.ts";
import { vocabularyOf } from "#durable/gate/flow.ts";
import type { GateSpec } from "#durable/types.ts";
import { checkInvariants } from "./support/oracle.ts";

const GATE = "gate:demo:gate0:1";
const spec = (over: Partial<GateSpec> = {}): GateSpec => ({ gateId: GATE, gateKey: "gate0", flow: "v2", brief: { title: "Roadmap", items: [1, 2, 3] }, openedBy: "factory", ...over });

async function withFactory(run: (f: Factory, store: string) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "k13-open-"));
  const store = join(dir, "s");
  const f = await openFactory({ store });
  try {
    await f.ready;
    await run(f, store);
  } finally {
    await f.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
}

test("a new key opens a gate: the document, the brief and the gate.opened entry are all there, and the gate is waiting", () => withFactory(async (f) => {
  const r = await f.gates.open("o1", spec());
  assert.equal(r.status, "opened");
  if (r.status !== "opened") return;
  assert.equal(r.gate.briefRef, briefRef(spec().brief));
  assert.deepEqual(r.gate.vocabulary, vocabularyOf("gate0", "v2"));
  assert.equal(r.gate.openKey, "o1");
  assert.deepEqual(await f.gates.state(GATE), { state: "waiting" });
  const i = await f.inspect(GATE);
  assert.deepEqual(i.documents, { gate: true, brief: true, opened: true, moveCommitted: false, gateSettled: false });
  assert.equal(i.gate, "waiting");
  assert.equal(i.outbox.filter((e) => e.type === "gate.opened").length, 1);
  const e = i.outbox[0];
  assert.deepEqual([e.type, e.subject, e.actor, e.cause, e.seq], ["gate.opened", GATE, "factory", "o1", 1]);
  assert.deepEqual(checkInvariants(i), []);
}));

test("the vocabulary snapshot is the flow's moves at opening — flow v1 and v2 differ at the Roadmap gate's neighbours", () => withFactory(async (f) => {
  const a = await f.gates.open("a", spec({ gateId: "gate:f:3-spec:1", gateKey: "3-spec", flow: "v2" }));
  const b = await f.gates.open("b", spec({ gateId: "gate:f:3-spec:2", gateKey: "3-spec", flow: "v1" }));
  assert.ok(a.status === "opened" && b.status === "opened");
  if (a.status === "opened") assert.deepEqual(a.gate.vocabulary, vocabularyOf("3-spec", "v2"));
  if (b.status === "opened") assert.deepEqual(b.gate.vocabulary, vocabularyOf("3-spec", "v1"));
  assert.ok(vocabularyOf("3-spec", "v2")!.includes("approve"));
}));

test("the same key with an equal spec is a repeat: one gate, one gate.opened, the same task", () => withFactory(async (f) => {
  const first = await f.gates.open("o1", spec());
  const again = await f.gates.open("o1", spec());
  assert.equal(again.status, "repeat");
  if (first.status === "opened" && again.status === "repeat") assert.equal(again.taskId, first.taskId);
  const i = await f.inspect(GATE);
  assert.equal(i.outbox.filter((e) => e.type === "gate.opened").length, 1);
  assert.equal(i.tasks.filter((t) => t.kind === "kiln.gate").length, 1);
}));

test("key-conflict: the same key with a DIFFERENT spec, and another key for a gate id that already exists — both name the original key, and change nothing", () => withFactory(async (f) => {
  await f.gates.open("o1", spec());
  const before = await f.inspect(GATE);
  assert.deepEqual(await f.gates.open("o1", spec({ brief: { title: "changed" } })), { status: "refused", reason: "key-conflict", original: "o1" });
  assert.deepEqual(await f.gates.open("o2", spec()), { status: "refused", reason: "key-conflict", original: "o1" });
  assert.deepEqual(await f.inspect(GATE), before);
}));

test("invalid-move: a gate key not in the flow, a gate the flow does not have (2a under v1), a malformed id, a brief that is not JSON, no opener, a bad key — nothing is written", () => withFactory(async (f) => {
  const before = await f.inspect(GATE);
  const cases: [string, string, GateSpec][] = [
    ["k1", "unknown gate key", spec({ gateKey: "nope" as never })],
    ["k2", "2a under flow v1", spec({ gateId: "gate:x:2a:1", gateKey: "2a-experience", flow: "v1" })],
    ["k3", "unknown flow", spec({ flow: "v9" as never })],
    ["k4", "malformed id", spec({ gateId: "Not A Valid Id!" })],
    ["k5", "brief not JSON", spec({ brief: undefined as never })],
    ["k6", "brief with a function", spec({ brief: { f: () => 1 } as never })],
    ["k7", "no opener", spec({ openedBy: "  " })],
    ["", "empty key", spec()],
    ["x".repeat(201), "key too long", spec()],
  ];
  for (const [key, what, sp] of cases) {
    const r = await f.gates.open(key, sp);
    assert.deepEqual([r.status, (r as { reason?: string }).reason], ["refused", "invalid-move"], `${what}: ${JSON.stringify(r)}`);
  }
  assert.deepEqual(await f.inspect(GATE), before);
  assert.equal((await f.inspect()).tasks.length, 0, "no refused opening leaves a task");
  assert.deepEqual(await f.gates.state(GATE), { state: "unknown" });
}));

test("state is unknown for a gate never opened, and a read never creates one", () => withFactory(async (f) => {
  assert.deepEqual(await f.gates.state("gate:none:gate0:1"), { state: "unknown" });
  assert.deepEqual(await f.gates.state("gate:none:gate0:1"), { state: "unknown" });
  assert.equal((await f.inspect("gate:none:gate0:1")).documents.gate, false);
}));

test("the gate task starts, creates its decision, and waits on it — no timer, nothing parked", () => withFactory(async (f) => {
  await f.gates.open("o1", spec());
  for (let n = 0; n < 100; n++) { if ((await f.inspect(GATE)).decision === "live") break; await new Promise((r) => setTimeout(r, 20)); }
  const i = await f.inspect(GATE);
  assert.equal(i.decision, "live");
  assert.equal(i.gateTask, "live");
  assert.deepEqual(i.timers, []);
  assert.equal(f.reports.length, 0);
  const gate = i.tasks.find((t) => t.kind === "kiln.gate")!;
  const dec = i.tasks.find((t) => t.kind === "kiln.decision")!;
  assert.equal(dec.owner, gate.id, "the decision is owned by its gate");
  assert.deepEqual(checkInvariants(i), []);
}));
