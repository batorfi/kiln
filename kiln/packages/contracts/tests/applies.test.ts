// r14 T041 (US2): `applies_when`, evaluated. Golden BYTES of the reason for each predicate state, OR across predicates, absent facts read as false, a required gate wins and can't be undone, UI review alone turns on
// at its slot and never the other way, and the module can reach no clock or model.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applicability, atUiSlot, flowOf, gateDef } from "#contracts/flow/index.ts";
import type { Applicability } from "#contracts/flow/types.ts";

const v2 = flowOf("v2");
const EXP = gateDef(v2, "2a-experience");
const UI = gateDef(v2, "6a-ui-review");
const PATHS = '["web/**","app/**","**/*.tsx","**/*.vue","**/*.css","design/**"]';

test("GOLDEN: Experience design on a feature that touches web/ — the reason, byte for byte", () => {
  const a = applicability(EXP, { paths: ["src/x.ts", "web/app.tsx"], labels: ["backend"], journeys: [] });
  assert.equal(
    JSON.stringify(a),
    `{"gate":"2a-experience","applies":true,"why":"rule","reason":{"rule":{"paths":${PATHS},"labels":["ui"],"journeys":"any"},"evaluated":{"paths":"match","labels":"no-match","journeys":"no-match"},"verdict":true,"text":"applies: path \\"web/app.tsx\\" matches \\"web/**\\"; no label is one of [ui]; the row cites no journey"}}`,
  );
});

test("GOLDEN: a feature that touches nothing in the interface — not applicable, with the reason that says so", () => {
  const a = applicability(EXP, { paths: ["src/lib/a.ts"], labels: [], journeys: [] });
  assert.equal(a.applies, false);
  assert.equal(a.reason!.text, `does not apply: no path matches [web/**, app/**, **/*.tsx, **/*.vue, **/*.css, design/**]; no label is one of [ui]; the row cites no journey`);
  assert.deepEqual(a.reason!.evaluated, { paths: "no-match", labels: "no-match", journeys: "no-match" });
});

test("OR across predicates: any one of paths, labels or a cited journey is enough for Experience design", () => {
  assert.equal(applicability(EXP, { paths: ["src/a.ts"], labels: ["ui"] }).applies, true);
  assert.equal(applicability(EXP, { paths: ["src/a.ts"], journeys: ["J2.1"] }).applies, true);
  assert.equal(applicability(EXP, { paths: ["design/tokens.json"] }).applies, true);
  assert.equal(applicability(EXP, { paths: ["src/a.ts"], labels: ["backend"], journeys: [] }).applies, false);
  // UI review at admission uses paths and labels only — the journey and the diff are not part of its admission rule
  assert.equal(applicability(UI, { paths: ["src/a.ts"], journeys: ["J1.3"] }).applies, false);
  assert.deepEqual(Object.keys(applicability(UI, { paths: [] }).reason!.evaluated), ["paths", "labels"]);
});

test("an ABSENT fact is false, and the reason says it was absent (never a guess, never apply-by-default)", () => {
  const a = applicability(EXP, {});
  assert.equal(a.applies, false);
  assert.deepEqual(a.reason!.evaluated, { paths: "absent", labels: "absent", journeys: "absent" });
  assert.equal(a.reason!.text, "does not apply: no paths were supplied; no labels were supplied; no journeys were supplied");
  const partly = applicability(EXP, { labels: ["ui"] });
  assert.equal(partly.applies, true);
  assert.equal(partly.reason!.evaluated.paths, "absent");
  assert.equal(partly.reason!.verdict, true);
});

test("a gate with no rule always applies and carries no reason", () => {
  for (const k of ["1-concept", "3-spec", "9-pr"] as const) assert.deepEqual(applicability(gateDef(v2, k), {}), { gate: k, applies: true, why: "unconditional" });
});

test("a REQUIRED gate applies whatever the rule says — and the record still shows what the rule said", () => {
  const a = applicability(EXP, { paths: ["src/a.ts"] }, ["2a-experience"]);
  assert.equal(a.applies, true);
  assert.equal(a.why, "required");
  assert.equal(a.reason!.verdict, false, "the rule's own verdict is kept");
  assert.match(a.reason!.text, /^required by a person at the Roadmap gate \(the rule said: does not apply: /);
  assert.equal(applicability(EXP, { paths: ["web/a.css"] }, ["2a-experience"]).why, "required", "required wins even when the rule is true");
  assert.equal(applicability(EXP, {}, ["6a-ui-review"]).why, "rule", "requiring another gate changes nothing here");
});

test("the same facts give identical bytes, however the caller builds them", () => {
  const f1 = { paths: ["web/a.tsx"], labels: ["ui"], journeys: ["J1"] };
  const f2 = { journeys: ["J1"], labels: ["ui"], paths: ["web/a.tsx"] };
  assert.equal(JSON.stringify(applicability(EXP, f1)), JSON.stringify(applicability(EXP, f2)));
});

test("UI review's slot: it turns ON when pinned away and the changed files meet a predicate — and in no other case", () => {
  const away: Applicability = applicability(UI, { paths: ["src/a.ts"] });
  assert.equal(away.applies, false);
  const on = atUiSlot(UI, away, { ui_files_changed: true });
  assert.equal(on?.applies, true);
  assert.equal(on?.why, "became-applicable");
  assert.equal(on?.reason!.text, `applies: the changed files meet "ui_files_changed" (the gate was pinned not applicable at admission)`);
  assert.deepEqual(on?.reason!.rule, { diff: ["ui_files_changed", "tokens_changed", "routes_changed"] });
  assert.equal(atUiSlot(UI, away, { tokens_changed: true })?.reason!.text.includes('"tokens_changed"'), true);
  assert.equal(atUiSlot(UI, away, { ui_files_changed: false, tokens_changed: false, routes_changed: false }), null);
  assert.equal(atUiSlot(UI, away, undefined), null, "facts not supplied: nothing changes");
  assert.equal(atUiSlot(UI, away, {}), null);
});

test("nothing ever turns an applicable gate off, a required gate stays, and Experience design never changes after admission", () => {
  const applies = applicability(UI, { paths: ["web/a.css"] });
  assert.equal(atUiSlot(UI, applies, { ui_files_changed: false }), null);
  const required = applicability(UI, {}, ["6a-ui-review"]);
  assert.equal(atUiSlot(UI, required, { ui_files_changed: true }), null, "already applicable: nothing to turn on");
  const expAway = applicability(EXP, { paths: ["src/a.ts"] });
  assert.equal(atUiSlot(EXP, expAway, { ui_files_changed: true }), null, "Experience design has no diff rule and does not change");
});

test("the module reaches no clock, no environment and no model", () => {
  const src = readFileSync(new URL("../src/flow/applies.ts", import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(src, /Date|performance|process|Math\.random|fetch|import .* from "node:/);
});
