// r14 T042/T047 (US2): applicability in a walk, in-process. Pinned ONCE at admission, recorded ONCE with its reason in the same commit as the pin, never decided by absence, never reversed — and a gate
// that is not applicable has nothing to open and nothing to decide.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkInvariants } from "../proof/support/oracle.ts";
import { approveAll, drive, INTERFACE, PLAIN, withFactory } from "./support.ts";
import { applicability, flowOf, gateDef } from "#contracts/flow/index.ts";

const entries = async (f: Parameters<Parameters<typeof withFactory>[0]>[0], type: string) => (await f.inspect()).outbox.filter((e) => e.type === type);

test("a plain feature walks 9 feature gates after the Roadmap gate; Experience design and UI review are recorded not applicable, once each, with their reasons", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f-plain", PLAIN);
  const d = await drive(f, "f-plain");
  assert.deepEqual(d.steps.map((s) => s.gateKey), ["gate0", "1-concept", "2-architecture", "3-spec", "4-plan", "5-checkpoint", "6-review", "7-verification", "8-docs", "9-pr"]);
  assert.equal(d.last.status, "done");
  const na = await entries(f, "gate.not-applicable");
  assert.deepEqual(na.map((e) => (e.data as { gate: string }).gate).sort(), ["2a-experience", "6a-ui-review"]);
  assert.ok(na.every((e) => e.actor === "factory" && e.cause === "walk:f-plain:pin"));
  const exp = na.find((e) => (e.data as { gate: string }).gate === "2a-experience")!;
  const want = applicability(gateDef(flowOf("v2"), "2a-experience"), PLAIN.facts, []).reason;
  assert.deepEqual((exp.data as { reason: unknown }).reason, want, "the recorded reason is exactly the engine's");
  assert.match((exp.data as { reason: { text: string } }).reason.text, /^does not apply: no path matches/);
  // no gate task, no gate document for the gates that do not apply
  const i = await f.inspect("gate:f-plain:2a-experience:1");
  assert.equal(i.gate, "absent");
  assert.equal((await f.inspect("gate:f-plain:6a-ui-review:1")).gate, "absent");
}));

test("a move on a gate that is not applicable is refused unknown-gate: there is nothing to decide", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f-plain", PLAIN);
  await drive(f, "f-plain", (g, n) => (n >= 3 ? undefined : approveAll(g, n)));
  const r = await f.gates.submit("gate:f-plain:2a-experience:1", "x", { kind: "approve", decidedBy: "script:r14", briefRef: "0".repeat(64) });
  assert.equal(r.status, "refused");
  assert.equal((r as { reason: string }).reason, "unknown-gate");
}));

test("a gate a person REQUIRED applies though its rule is false: 11 feature gates, why:'required', and the pin says so", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f-req", PLAIN);
  const d = await drive(f, "f-req", (g) => ({ kind: "approve", ...(g.gateKey === "gate0" ? { admit: { require: ["2a-experience"] as never } } : {}) }));
  assert.deepEqual(d.steps.map((s) => s.gateKey).includes("2a-experience"), true);
  assert.equal(d.steps.filter((s) => s.gateKey !== "gate0").length, 10, "9 + the required one; UI review is still not applicable");
  const admitted = (await entries(f, "walk.admitted"))[0].data as { required: string[]; applicability: Record<string, { applies: boolean; why: string }> };
  assert.deepEqual(admitted.required, ["2a-experience"]);
  assert.deepEqual(admitted.applicability["2a-experience"], { applies: true, why: "required" });
  assert.equal((await entries(f, "gate.not-applicable")).length, 1, "only UI review is recorded not applicable");
  const brief = (await f.walks.state("f-req")).history;
  assert.ok(brief.length > 0);
}));

test("the interface feature has both interface gates and records none not applicable", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f-ui", INTERFACE);
  const d = await drive(f, "f-ui");
  assert.equal(d.steps.length, 12);
  assert.equal((await entries(f, "gate.not-applicable")).length, 0);
  assert.equal((await entries(f, "gate.became-applicable")).length, 0, "an applicable gate is never 'became applicable'");
}));

test("UI review turns on at its slot when the changed files say so — recorded once, opens like any gate, and Experience design is untouched", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f-late", { ...PLAIN, built: { ui_files_changed: true } });
  const d = await drive(f, "f-late");
  assert.deepEqual(d.steps.map((s) => s.gateKey).filter((k) => k.startsWith("2a") || k.startsWith("6a")), ["6a-ui-review"]);
  const became = await entries(f, "gate.became-applicable");
  assert.equal(became.length, 1);
  assert.equal((became[0].data as { gate: string }).gate, "6a-ui-review");
  assert.equal(became[0].actor, "factory");
  assert.equal(became[0].cause, "walk:f-late:ui-slot");
  assert.equal((await entries(f, "gate.not-applicable")).length, 2, "the pin recorded both; the slot added a third entry, it did not rewrite one");
}));

test("an applicable gate is never reversed by later facts: an interface feature whose `built` says nothing changed still crosses UI review", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f-ui2", { ...INTERFACE, built: { ui_files_changed: false } });
  const d = await drive(f, "f-ui2");
  assert.equal(d.steps.map((s) => s.gateKey).includes("6a-ui-review"), true);
  assert.equal((await entries(f, "gate.not-applicable")).length, 0);
}));

test("missing facts read as false, with the reason saying absent — and the walk goes on with nine gates", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f-bare", { flow: "v2", facts: {} });
  const d = await drive(f, "f-bare");
  assert.equal(d.steps.length, 10);
  const na = (await entries(f, "gate.not-applicable")).map((e) => (e.data as { reason: { evaluated: Record<string, string> } }).reason.evaluated);
  assert.ok(na.every((ev) => Object.values(ev).every((v) => v === "absent")));
}));

test("the invariants hold on every gate of a plain walk", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f-plain", PLAIN);
  const d = await drive(f, "f-plain");
  for (const s of d.steps) assert.deepEqual(checkInvariants(await f.inspect(s.gateId)), [], s.gateId);
}));
