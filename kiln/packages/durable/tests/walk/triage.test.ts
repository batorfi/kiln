// r14 T073 (US6): triage may skip Concept and Architecture ONLY, with its reasoning recorded and shown in every later brief; "skipped" is a different outcome from "not applicable"; triage can never make an
// applicable interface gate not applicable; a person can override the skip at the Roadmap gate; a flow may forbid it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { flowOf } from "#contracts/flow/index.ts";
import { checkWalkInvariants } from "../proof/support/walk-oracle.ts";
import { drive, INTERFACE, PLAIN, walkTo, withFactory } from "./support.ts";

const SMALL = { skip: true, reasoning: "a one-line change in one module" };
const entries = async (f: Parameters<Parameters<typeof withFactory>[0]>[0], type: string) => (await f.inspect()).outbox.filter((e) => e.type === type);

test("a small plain feature skips Concept and Architecture: 7 feature gates, the two recorded SKIPPED (with the reasoning), not 'not applicable'", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", { ...PLAIN, triage: SMALL });
  const d = await drive(f, "f");
  assert.deepEqual(d.steps.map((s) => s.gateKey), ["gate0", "3-spec", "4-plan", "5-checkpoint", "6-review", "7-verification", "8-docs", "9-pr"]);
  const skipped = await entries(f, "gate.skipped");
  assert.deepEqual(skipped.map((e) => (e.data as any).gate), ["1-concept", "2-architecture"]);
  assert.ok(skipped.every((e) => e.actor === "factory" && (e.data as any).reasoning === SMALL.reasoning && e.cause === "walk:f:pin"));
  assert.deepEqual((await entries(f, "gate.not-applicable")).map((e) => (e.data as any).gate).sort(), ["2a-experience", "6a-ui-review"], "only the interface gates are 'not applicable' — skipped is another outcome");
  assert.deepEqual(checkWalkInvariants(await f.inspect(), { feature: "f", facts: PLAIN.facts }), []);
}));

test("every later brief carries the skip and its reasoning", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", { ...PLAIN, triage: SMALL });
  const at = await walkTo(f, "f", "3-spec");
  assert.deepEqual((at.openGate!.brief as any).triage, { skipped: ["1-concept", "2-architecture"], reasoning: SMALL.reasoning });
  const last = await walkTo(f, "f", "9-pr");
  assert.deepEqual((last.openGate!.brief as any).triage.skipped, ["1-concept", "2-architecture"]);
}));

test("a small INTERFACE feature still gets Experience design and UI review: triage cannot make an applicable gate not applicable", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", { ...INTERFACE, triage: SMALL });
  const d = await drive(f, "f");
  assert.deepEqual(d.steps.map((s) => s.gateKey).filter((k) => k !== "gate0"), ["2a-experience", "3-spec", "4-plan", "5-checkpoint", "6-review", "6a-ui-review", "7-verification", "8-docs", "9-pr"], "nine feature gates");
  assert.equal((await entries(f, "gate.not-applicable")).length, 0);
}));

test("a person can override the skip at the Roadmap gate: Concept and Architecture open as normal and nothing is recorded skipped", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", { ...PLAIN, triage: SMALL });
  const d = await drive(f, "f", (g) => ({ kind: "approve", ...(g.gateKey === "gate0" ? { admit: { overrideTriage: true } } : {}) }));
  assert.ok(d.steps.some((s) => s.gateKey === "1-concept") && d.steps.some((s) => s.gateKey === "2-architecture"));
  assert.equal((await entries(f, "gate.skipped")).length, 0);
  assert.deepEqual((await entries(f, "walk.admitted"))[0].data && ((await entries(f, "walk.admitted"))[0].data as any).overrideTriage, true);
}));

test("the admission brief shows the proposal; no triage proposal means nothing is skipped", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", { ...PLAIN, triage: SMALL });
  const b = (await f.walks.next("f")).openGate!.brief as any;
  assert.deepEqual(b.triage, { proposed: true, reasoning: SMALL.reasoning });
  await f.walks.admit("k2", "g", PLAIN);
  assert.deepEqual(((await f.walks.next("g")).openGate!.brief as any).triage, { proposed: false });
  const d = await drive(f, "g");
  assert.ok(d.steps.some((s) => s.gateKey === "1-concept"));
}));

test("skipped gates are never offered as a place to go back to", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", { ...PLAIN, triage: SMALL });
  const at = await walkTo(f, "f", "4-plan");
  assert.deepEqual(at.openGate!.returnsTo, ["3-spec"], "Concept and Architecture were skipped and Experience design is not applicable");
}));

test("a flow that forbids triage (no_triage_skip) skips nothing — the proposal is shown but the data says no", () => withFactory(async (f) => {
  const v2 = flowOf("v2") as { noTriageSkip?: boolean };
  v2.noTriageSkip = true;
  try {
    await f.walks.admit("k1", "f", { ...PLAIN, triage: SMALL });
    const d = await drive(f, "f");
    assert.ok(d.steps.some((s) => s.gateKey === "1-concept"), "Concept was crossed");
    assert.equal((await entries(f, "gate.skipped")).length, 0);
  } finally {
    delete v2.noTriageSkip;
  }
}));
