// r14 T079 (US8): `gate-rail.md` is READ AS TEXT and compared with the flow data and the engine, gate by gate and field by field — so the contract, the data and what executes cannot drift apart. Every
// extraction asserts it found something (a parser that matches nothing must fail, never pass vacuously). A divergence names the gate and the field.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { consequence, flowOf, NO_PINS, noteRequired } from "#contracts/flow/index.ts";
import type { GateKey, MoveKind } from "#contracts/moves.ts";

const doc = readFileSync(new URL("../gate-rail.md", import.meta.url), "utf8");
const v2 = flowOf("v2");
const section = (from: string, to: string): string => {
  const a = doc.indexOf(from);
  const b = doc.indexOf(to, a + 1);
  assert.ok(a >= 0 && b > a, `the sections "${from}" … "${to}" were not found in gate-rail.md`);
  return doc.slice(a, b);
};
const rows = (text: string): string[][] => text.split("\n").filter((l) => /^\| `/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
const tick = (c: string): string => c.replace(/`/g, "").trim();
const dash = (c: string): string[] => (c === "—" || c === "" ? [] : c.split(/,\s*/).map((x) => x.trim()));

const flowRows = rows(section("## 1. The flow, v2", "*Needs a note:*"));

test("the table of §1 has the twelve gates of the data, in order", () => {
  assert.equal(flowRows.length, 12);
  assert.deepEqual(flowRows.map((r) => tick(r[0])), v2.gates.map((g) => g.key));
});

for (const g of v2.gates) {
  test(`§1 ${g.key}: name · question · moves · judge · note · triage · delegable equal the data`, () => {
    const r = flowRows.find((x) => tick(x[0]) === g.key);
    assert.ok(r, `${g.key} is missing from §1`);
    const [, , name, question, moves, judge, note, triage, delegable] = r;
    const field = (what: string, got: unknown, want: unknown) => assert.deepEqual(got, want, `${g.key} · ${what}: the contract says ${JSON.stringify(got)}, the data ${JSON.stringify(want)}`);
    field("name", name.replace(/\s*\*\([^)]*\)\*/g, ""), g.name);
    field("question", question, g.question);
    field("moves", moves.split(" · "), [...g.moves]);
    field("judge", judge === "—" ? undefined : judge, g.judge);
    field("note", dash(note), noteRequired(v2, g.key));
    field("triage", triage === "—" ? undefined : triage, g.triage);
    field("delegable", delegable, g.delegable);
    // the italic remarks on the name say the same as the data
    field("conditional", /\(conditional\)/.test(name), g.appliesWhen !== undefined);
    field("arms the tail", /arms the tail/.test(name), g.armsTail === true);
    field("restore point", /restore point/.test(name), g.restorePoint === true);
  });
}

test("the Verification cap and the automatic round the contract describes are the data\'s", () => {
  const cap = v2.gates.find((g) => g.key === "7-verification")!.mitigationCap!;
  assert.deepEqual(cap, { default: 2, min: 0, max: 3 });
  assert.match(doc, /default \*\*2\*\*, settable \*\*0–3\*\*/);
  assert.deepEqual(v2.gates.find((g) => g.key === "7-verification")!.automatic, ["mitigate"]);
  assert.ok(!v2.gates.some((g) => g.moves.includes("mitigate" as MoveKind)), "mitigate is in no person\'s vocabulary");
});

test("§2 every row of the consequence table is what `consequence()` returns", () => {
  const table = rows(section("## 2. Where moves lead", "Beyond the table:"));
  assert.ok(table.length >= 12, `only ${table.length} rows found — the parser must find the table`);
  for (const [move, goes, recross, work] of table) {
    const m = /^`([a-z+-]+)@([\w-]+)(?:→([\w@-]+))?`$/.exec(move);
    assert.ok(m, `cannot read the move cell ${move}`);
    const [, kind, gate, target] = m;
    const c = consequence(v2, gate as GateKey, kind as MoveKind, target as never, NO_PINS);
    const label = `${kind}@${gate}${target ? `→${target}` : ""}`;
    assert.equal(tick(goes), c.goto, `${label}: goes to`);
    assert.deepEqual(dash(recross), c.recross, `${label}: re-crossed`);
    assert.equal(work === "none" ? "none" : work, c.work, `${label}: work`);
  }
});

test("§2 covers every kind of move the data offers (a move without a row is a move nobody documented)", () => {
  const table = rows(section("## 2. Where moves lead", "Beyond the table:")).map((r) => /^`([a-z+-]+)@/.exec(r[0])![1]);
  const kinds = new Set<string>();
  for (const g of v2.gates) for (const k of g.moves) if (k !== "approve" && k !== "edit-rows" && k !== "add-row" && k !== "drop-row") kinds.add(k);
  for (const k of kinds) assert.ok(table.includes(k), `no row documents ${k}`);
});

test("the stale statements are gone: nothing says the rule is 'declared as data only' or that evaluating it belongs to a later row", () => {
  for (const stale of ["declared as data only", "declared as data only (`appliesWhen`)", "belongs to r14", "r14/r15", "evaluating it and recording the outcome are"]) {
    assert.ok(!doc.includes(stale), `gate-rail.md still says "${stale}"`);
  }
  assert.match(doc, /applies_when`, evaluated/, "§3 says the rule is evaluated");
  assert.match(doc, /\*\*Once, at admission\*\*/);
});

test("the invariants the contract names are the ones `kiln check flow` has codes for", () => {
  const validate = readFileSync(new URL("../src/flow/validate.ts", import.meta.url), "utf8");
  for (const topic of ["anchors", "restore point", "judge role", "closed set of move kinds", "loops"]) assert.ok(doc.includes(topic) || doc.includes(topic.replace("loops", "loop")), `§5 does not mention ${topic}`);
  for (const code of ["flow-anchor-first", "flow-after-merge", "flow-restart-no-restore-point", "flow-mitigate-person-move", "flow-cycle", "flow-arming-point"]) assert.ok(validate.includes(`"${code}"`), `the validator lost ${code}`);
});

test("v1 stays out of it: the contract points at the legacy rail and says no walk is run under it", () => {
  assert.match(doc, /legacy\/contracts\/gate-rail\.md/);
  assert.match(doc, /a walk is never run under it/);
});
