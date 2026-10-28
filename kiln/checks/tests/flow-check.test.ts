// r14 T018: `kiln check flow` and its negative suite. The shipped flow passes; EVERY deliberately invalid flow is refused with the code it was built for and no other (bar listed consequences);
// the suite is shown able to FAIL — a checker that accepts everything, one that always says the same thing, and a flow with no gates; two faults in one flow are both reported.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkFlow } from "../flow.ts";
import { flowOf } from "#contracts/flow/index.ts";
import { ALL_CODES, NEGATIVE, pristineFlow, runNegativeSuite, type FlowChecker } from "./flow-negative.ts";

const real: FlowChecker = (def) => {
  const r = checkFlow({ flow: def });
  return { ok: r.ok, codes: r.failures.map((f) => f.code) };
};

test("the shipped flow passes, and says how many gates it examined", () => {
  const r = checkFlow();
  assert.equal(r.ok, true, JSON.stringify(r.failures));
  assert.equal(r.name, "flow");
  assert.deepEqual(r.notes, ["12 gates examined"]);
  assert.ok((r.scanned ?? 0) >= 1);
});

test("every member of the negative suite is refused with every code it was built for, and with no noise", () => {
  const res = runNegativeSuite(real);
  assert.deepEqual(res.accepted.map((m) => m.rule), [], "members the check let through");
  assert.deepEqual(res.wrongCode.map((w) => `${w.member.rule} → reported ${w.reported.join(",")}`), [], "members refused without their code");
  assert.deepEqual(res.noise.map((n) => `${n.member.rule} → also ${n.unexpected.join(",")}`), [], "members that also reported an unrelated code (the failure must be the fault's)");
  assert.deepEqual(res.missed, [], "codes no member exercises");
  assert.ok(NEGATIVE.length >= ALL_CODES.length, "at least one member per code");
});

test("the unmutated flow passes in the same harness (so a failure above is the fault's, not the harness's)", () => {
  assert.deepEqual(real(pristineFlow()), { ok: true, codes: [] });
});

test("every code the validator can emit is in the contract list, and every listed code can be emitted (a rule nobody tries to break fails here)", () => {
  const src = readFileSync(new URL("../../packages/contracts/src/flow/validate.ts", import.meta.url), "utf8");
  const emitted = new Set([...src.matchAll(/add\("(flow-[a-z-]+)"/g)].map((m) => m[1]));
  assert.ok(emitted.size >= 20, `only ${emitted.size} codes found in validate.ts — the scan found too little`);
  const listed = new Set<string>(ALL_CODES);
  assert.deepEqual([...emitted].filter((c) => !listed.has(c)), [], "the validator emits a code that is not in the contract list");
  assert.deepEqual([...listed].filter((c) => !emitted.has(c)), [], "the contract lists a code the validator never emits");
});

test("THE SUITE CAN FAIL: a checker that accepts everything puts every member in `accepted`", () => {
  const res = runNegativeSuite(() => ({ ok: true, codes: [] }));
  assert.equal(res.accepted.length, NEGATIVE.length);
});

test("THE SUITE CAN FAIL: a checker that always fails with one fixed code is caught as `wrongCode` for every member that expects another", () => {
  const res = runNegativeSuite(() => ({ ok: false, codes: ["flow-vacuous"] }));
  assert.equal(res.accepted.length, 0);
  assert.equal(res.wrongCode.length, NEGATIVE.filter((m) => !(m.codes.length === 1 && m.codes[0] === "flow-vacuous")).length);
});

test("THE SUITE CAN FAIL: a checker that is deaf to one rule leaves its code in `accepted`/`wrongCode`", () => {
  const deaf: FlowChecker = (def) => {
    const r = real(def);
    const codes = r.codes.filter((c) => c !== "flow-glob-unsupported");
    return { ok: codes.length === 0, codes };
  };
  const res = runNegativeSuite(deaf);
  assert.ok(res.accepted.some((m) => m.codes.includes("flow-glob-unsupported")), "the glob member must slip through a checker that cannot see globs");
});

test("a coverage hole is reported: drop every member of a code and the suite names it in `missed`", () => {
  const without = NEGATIVE.filter((m) => !m.codes.includes("flow-cycle"));
  assert.deepEqual(runNegativeSuite(real, without).missed, ["flow-cycle"]);
});

test("a flow with no gates fails flow-vacuous (a check that examined nothing proves nothing)", () => {
  const empty = { ...pristineFlow(), gates: [] };
  const r = checkFlow({ flow: empty });
  assert.equal(r.ok, false);
  assert.deepEqual(r.failures.map((f) => f.code), ["flow-vacuous"]);
});

test("two faults in one flow are BOTH reported, three in three rules likewise (all-or-nothing validation lists everything, then fails)", () => {
  const two = NEGATIVE.find((m) => m.rule.startsWith("two faults"))!;
  const three = NEGATIVE.find((m) => m.rule.startsWith("three faults"))!;
  for (const m of [two, three]) {
    const r = checkFlow({ flow: m.mutate(pristineFlow()) });
    assert.equal(r.ok, false);
    const codes = r.failures.map((f) => f.code);
    for (const c of m.codes) assert.ok(codes.includes(c), `${m.rule}: expected ${c} among ${codes.join(",")}`);
  }
});

test("v1 is refused by name: the check is for the default flow", () => {
  const r = checkFlow({ flow: flowOf("v1") });
  assert.equal(r.ok, false);
  assert.equal(r.failures[0].code, "flow-version");
  assert.match(r.failures[0].detail, /default flow \(v2\)/);
});

test("failures name the gate in their detail and, for the shipped flow, the data file", () => {
  const broken = NEGATIVE.find((m) => m.codes.includes("flow-note-not-required"))!;
  const r = checkFlow({ flow: broken.mutate(pristineFlow()) });
  assert.match(r.failures[0].detail, /^1-concept: /);
  assert.equal(r.failures[0].file, undefined, "a flow handed in has no file");
});

test("the check is quick: well under 100 ms (it is pure data in, faults out)", () => {
  checkFlow(); // warm
  const t0 = performance.now();
  for (let i = 0; i < 20; i++) checkFlow();
  const each = (performance.now() - t0) / 20;
  assert.ok(each < 100, `checkFlow took ${each.toFixed(2)} ms per run`);
});
