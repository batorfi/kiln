// r14 T013 (+ T032): the gate's extended shape. A gate opened for a WALK stores what it was opened to accept (the kinds that need a note, the targets a reject may name) and `submitMove` judges a move
// against that stored document — by name, writing nothing on a refusal. A gate opened the r13 way behaves exactly as r13's (their tests run unchanged).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { briefRef } from "#durable/canonical.ts";
import { openFactory, type Factory } from "#durable/factory.ts";
import { checkRoadmap } from "#durable/tasks/validate.ts";
import type { GateSpec, Move, Refusal } from "#durable/types.ts";
import { checkInvariants } from "../proof/support/oracle.ts";

const BRIEF = { title: "a brief" };
const REF = briefRef(BRIEF);
const mv = (over: Partial<Move> = {}): Move => ({ kind: "approve", decidedBy: "human@test", briefRef: REF, ...over });

async function withFactory(run: (f: Factory) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "k14-ext-"));
  const f = await openFactory({ store: join(dir, "s") });
  try {
    await f.ready;
    await run(f);
  } finally {
    await f.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
}
const open = (f: Factory, gateId: string, over: Partial<GateSpec>) => f.gates.open(`open:${gateId}`, { gateId, gateKey: "7-verification", flow: "v2", brief: BRIEF, openedBy: "factory", ...over });
const refusedWith = (r: { status: string }, reason: string, text: RegExp): void => {
  assert.equal(r.status, "refused", JSON.stringify(r));
  assert.equal((r as Refusal).reason, reason);
  assert.match((r as Refusal).detail ?? "", text);
};
const untouched = async (f: Factory, gateId: string): Promise<void> => {
  assert.deepEqual(await f.gates.state(gateId), { state: "waiting" }, "a refusal changes nothing");
  const i = await f.inspect(gateId);
  assert.deepEqual(i.records, []);
  assert.deepEqual(checkInvariants(i), []);
};

test("a walk gate stores noteRequired and returnsTo once, at opening; a gate opened the r13 way stores none", () => withFactory(async (f) => {
  const w = await open(f, "gate:f:7-verification:1", { returnsTo: ["3-spec", "@build"] });
  assert.equal(w.status, "opened");
  if (w.status === "opened") {
    assert.deepEqual(w.gate.noteRequired, ["reject"]);
    assert.deepEqual(w.gate.returnsTo, ["3-spec", "@build"]);
  }
  const old = await open(f, "gate:f:7-verification:2", {});
  if (old.status === "opened") assert.deepEqual([old.gate.noteRequired, old.gate.returnsTo], [[], []], "no walk semantics unless asked");
  assert.equal((await open(f, "gate:f:7-verification:3", { returnsTo: [""] as never })).status, "refused");
}));

test("a corrective move needs a note: missing, blank and non-string are refused by name; a real note commits and is stored", () => withFactory(async (f) => {
  const G = "gate:f:7-verification:1";
  await open(f, G, { returnsTo: [] });
  for (const note of [undefined, "", "   "]) refusedWith(await f.gates.submit(G, "k", mv({ kind: "reject", note })), "invalid-move", /needs a note/);
  refusedWith(await f.gates.submit(G, "k", mv({ kind: "reject", note: 7 as never })), "invalid-move", /the note is a string/);
  await untouched(f, G);
  const ok = await f.gates.submit(G, "k", mv({ kind: "reject", note: "the verifier saw req 3 fail" }));
  assert.equal(ok.status, "committed");
  if (ok.status === "committed") assert.equal(ok.record.move.note, "the verifier saw req 3 fail");
}));

test("an approve may carry a note and it is still an approve (not a new kind)", () => withFactory(async (f) => {
  const G = "gate:f:7-verification:1";
  await open(f, G, { returnsTo: [] });
  const ok = await f.gates.submit(G, "k", mv({ note: "ship it, minor nits" }));
  assert.equal(ok.status, "committed");
  if (ok.status === "committed") assert.deepEqual([ok.record.move.kind, ok.record.move.note], ["approve", "ship it, minor nits"]);
}));

test("a target belongs to a reject and must be one the gate was opened to accept (its own gate always may be named)", () => withFactory(async (f) => {
  const G = "gate:f:7-verification:1";
  await open(f, G, { returnsTo: ["3-spec", "@build"] });
  refusedWith(await f.gates.submit(G, "k", mv({ target: "3-spec" })), "invalid-move", /a target belongs to a reject/);
  refusedWith(await f.gates.submit(G, "k", mv({ kind: "reject", note: "n", target: "1-concept" })), "invalid-move", /"1-concept" is not a place this gate can send work \(allowed: 7-verification, 3-spec, @build\)/);
  refusedWith(await f.gates.submit(G, "k", mv({ kind: "reject", note: "n", target: "roadmap" })), "invalid-move", /not a place this gate can send work/);
  refusedWith(await f.gates.submit(G, "k", mv({ kind: "reject", note: "n", target: 3 as never })), "invalid-move", /the target is a gate key/);
  await untouched(f, G);
  const ok = await f.gates.submit(G, "k", mv({ kind: "reject", note: "the yardstick is wrong", target: "3-spec" }));
  assert.equal(ok.status, "committed");
  if (ok.status === "committed") assert.equal(ok.record.move.target, "3-spec");
  const own = "gate:f:7-verification:9";
  await open(f, own, { returnsTo: [] });
  assert.equal((await f.gates.submit(own, "k2", mv({ kind: "reject", note: "again", target: "7-verification" }))).status, "committed", "naming the gate's own key is the same as naming nothing");
}));

test("admit belongs to the Roadmap gate's approve; its cap, flags and required gates are checked by name", () => withFactory(async (f) => {
  const V = "gate:f:7-verification:1";
  await open(f, V, { returnsTo: [] });
  refusedWith(await f.gates.submit(V, "k", mv({ admit: {} })), "invalid-move", /admit belongs to the Roadmap gate's approve/);
  const G = "gate:f:gate0:1";
  await open(f, G, { gateKey: "gate0", returnsTo: [] });
  refusedWith(await f.gates.submit(G, "k", mv({ kind: "revise", note: "n", admit: {} })), "invalid-move", /admit belongs to the Roadmap gate's approve/);
  refusedWith(await f.gates.submit(G, "k", mv({ admit: { fixRounds: 4 as never } })), "invalid-move", /fixRounds must be 0, 1, 2 or 3/);
  refusedWith(await f.gates.submit(G, "k", mv({ admit: { fixRounds: -1 as never } })), "invalid-move", /fixRounds must be 0, 1, 2 or 3/);
  refusedWith(await f.gates.submit(G, "k", mv({ admit: { overrideTriage: "yes" as never } })), "invalid-move", /overrideTriage is true or false/);
  refusedWith(await f.gates.submit(G, "k", mv({ admit: { require: ["3-spec"] } })), "invalid-move", /"3-spec" is not a gate a person can require \(only the conditional gates: 2a-experience, 6a-ui-review\)/);
  refusedWith(await f.gates.submit(G, "k", mv({ admit: { require: ["gate0"] } })), "invalid-move", /not a gate a person can require/);
  refusedWith(await f.gates.submit(G, "k", mv({ admit: { require: "2a-experience" as never } })), "invalid-move", /require is a list/);
  refusedWith(await f.gates.submit(G, "k", mv({ admit: { delegation: { to: "x" } } as never })), "invalid-move", /admit has no field delegation/);
  await untouched(f, G);
  const ok = await f.gates.submit(G, "k", mv({ admit: { require: ["2a-experience"], overrideTriage: true, fixRounds: 1 } }));
  assert.equal(ok.status, "committed");
  if (ok.status === "committed") assert.deepEqual(ok.record.move.admit, { require: ["2a-experience"], overrideTriage: true, fixRounds: 1 });
}));

test("mitigate is the factory's: a person's attempt is refused with its own reason, wherever it is sent", () => withFactory(async (f) => {
  const G = "gate:f:7-verification:1";
  await open(f, G, { returnsTo: [] });
  refusedWith(await f.gates.submit(G, "k", mv({ kind: "mitigate" })), "invalid-move", /"mitigate" is not a move a person can make/);
  await untouched(f, G);
}));

test("equality covers the new fields: a changed note under the same key is a key-conflict; an equal move with note and target is a repeat", () => withFactory(async (f) => {
  const G = "gate:f:7-verification:1";
  await open(f, G, { returnsTo: ["3-spec"] });
  const move = mv({ kind: "reject", note: "first", target: "3-spec" });
  const a = await f.gates.submit(G, "k1", move);
  assert.equal(a.status, "committed");
  const again = await f.gates.submit(G, "k1", { target: "3-spec", note: "first", briefRef: REF, decidedBy: "human@test", kind: "reject" });
  assert.equal(again.status, "repeat", "key order never matters");
  const changed = await f.gates.submit(G, "k1", mv({ kind: "reject", note: "second", target: "3-spec" }));
  assert.equal(changed.status, "refused");
  assert.equal((changed as Refusal).reason, "key-conflict");
  const other = await f.gates.submit(G, "k2", mv({ kind: "reject", note: "first", target: "3-spec" }));
  assert.equal((other as Refusal).reason, "stale", "another key after the gate settled is stale, as in r13");
}));

test("a gate opened the r13 way needs no note (r13's tests stay as they were)", () => withFactory(async (f) => {
  const G = "gate:old:gate0:1";
  await open(f, G, { gateKey: "gate0" });
  assert.equal((await f.gates.submit(G, "k", mv({ kind: "reject" }))).status, "committed");
}));

test("there is no delegation anywhere on a move or on the Roadmap task (constitution VI)", () => {
  const types = readFileSync(new URL("../../src/types.ts", import.meta.url), "utf8");
  const move = /export interface Move \{[\s\S]*?\n\}/.exec(types)?.[0];
  const admit = /export interface Admit \{[\s\S]*?\n\}/.exec(types)?.[0];
  assert.ok(move && admit, "could not find the Move/Admit declarations — refusing to pass without them");
  assert.doesNotMatch(move!, /deleg/i);
  assert.doesNotMatch(admit!, /deleg/i);
  assert.match(checkRoadmap({ factory: "f", delegation: { to: "x" } }) ?? "", /unknown field: delegation.*accepts no delegation/);
});

test("an unknown field on a move is neither stored nor part of a repeat (a delegation smuggled in is dropped)", () => withFactory(async (f) => {
  const G = "gate:f:7-verification:1";
  await open(f, G, { returnsTo: [] });
  const ok = await f.gates.submit(G, "k", { ...mv(), delegation: { by: "x" } } as never);
  assert.equal(ok.status, "committed");
  if (ok.status === "committed") assert.deepEqual(Object.keys(ok.record.move).sort(), ["briefRef", "decidedBy", "kind"]);
}));
