// F1, F2 (r12 T048): the v2 flow data equals the documents that govern it — the constitution (v2.1.0), the PRD (GATE-1, GATE-2) and the
// interface-gates concept (docs/concepts/ui-flow.md §4.1, §5.1) — read as TEXT at test time, so the data cannot drift from them.
// Every extraction asserts it found something: a parser that matches nothing must fail, never pass vacuously.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { flowOf } from "#contracts/flow/index.ts";
import { MOVE_KINDS } from "#contracts/moves.ts";

const root = new URL("../../../../", import.meta.url);
const read = (p: string) => readFileSync(new URL(p, root), "utf8");
const constitution = read(".specify/memory/constitution.md").replace(/\s+/g, " ");
const prd = read("docs/prd/kiln-prd.md");
const uiFlow = read("docs/concepts/ui-flow.md");
const v2 = flowOf("v2");

const must = <T>(v: T | null | undefined, what: string): T => {
  assert.ok(v !== null && v !== undefined, `could not find ${what} in the document — the test refuses to pass without it`);
  return v;
};
const kebab = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "-");

// ── the constitution ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("F2 the eleven feature-gate names of the constitution's default-flow sentence equal the data's, in order", () => {
  const m = /default flow\*\* — the \*\*Roadmap gate\*\* and (\w+) feature gates in order: (.+?)\. The constitution fixes/.exec(constitution);
  const [, count, list] = must(m, "the default-flow sentence");
  const names = list.split(",").map((s) => s.trim());
  assert.equal(names.length, 11);
  assert.equal(count, "eleven");
  assert.deepEqual(v2.gates.slice(1).map((g) => g.name), names);
  assert.equal(v2.gates[0].name, "Roadmap gate");
  assert.equal(v2.gates.at(-1)!.name, "Merge", "the Merge gate is always last");
});

test("F2 the five judges of Principle II equal the v2 roster", () => {
  const m = /Every \*\*judge role\*\* — the (.+?) on the built-in gates/.exec(constitution);
  const list = must(m, "Principle II's list of judges")[1];
  const judges = list.replace(/,? and the /, ", the ").split(/, the /).map((s) => kebab(s.replace(/^the /, "")));
  assert.equal(judges.length, 5);
  assert.deepEqual([...v2.roster.judges].sort(), [...judges].sort());
  // and each judged gate names a judge that is in the roster, with no judge left unplaced
  const onGates = v2.gates.map((g) => g.judge).filter((j): j is string => j !== undefined);
  assert.deepEqual(onGates.sort(), [...judges].sort());
});

test("F2 every move kind in the data is in the constitution's closed set; mitigate is only ever automatic; row edits only on the Roadmap gate", () => {
  const m = /closed set of move kinds\.\*\* Every move is one of a closed set of kinds with a known consequence — (.+?); teams may label/.exec(constitution);
  const sentence = must(m, "the closed set of move kinds")[1];
  const named = [...sentence.matchAll(/\*([a-z+]+)\*/g)].map((x) => x[1]);
  for (const k of ["approve", "revise", "reject", "restart", "split+revise", "mitigate"]) assert.ok(named.includes(k), `the constitution no longer names ${k}`);
  assert.match(sentence, /Roadmap gate's row edits/);
  assert.deepEqual([...MOVE_KINDS].filter((k) => !["edit-rows", "add-row", "drop-row"].includes(k)).sort(), [...named].sort());
  for (const g of v2.gates) {
    for (const k of [...g.moves, ...(g.automatic ?? [])]) assert.ok((MOVE_KINDS as readonly string[]).includes(k), `${g.key}: ${k} is not a move kind`);
    assert.ok(!g.moves.includes("mitigate"), `${g.key}: mitigate is never a person's move`);
    const rowEdits = g.moves.filter((k) => ["edit-rows", "add-row", "drop-row"].includes(k));
    if (g.key === "gate0") assert.deepEqual(rowEdits, ["edit-rows", "add-row", "drop-row"]);
    else assert.deepEqual(rowEdits, [], `${g.key}: row edits belong to the Roadmap gate only`);
  }
  assert.deepEqual(v2.gates.find((g) => g.key === "7-verification")!.automatic, ["mitigate"]);
});

// ── the PRD ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("F2 GATE-1: twelve plain names in the PRD's order, internal ids kept, and the two new ids", () => {
  const row = must(prd.split("\n").find((l) => l.startsWith("| GATE-1 |")), "the GATE-1 row");
  assert.match(row, /twelve gates/);
  const names = must(/\*\*Roadmap gate\*\*, (.+?)\. Experience design/.exec(row), "GATE-1's gate list")[0].replace(/\.\s*Experience design$/, "").replace(/\*\*/g, "").split(",").map((s) => s.trim());
  assert.equal(names.length, 12);
  assert.deepEqual(v2.gates.map((g) => g.name), names);
  assert.match(row, /`gate0`, `1-concept` … `9-pr`/);
  assert.match(row, /`2a-experience` and `6a-ui-review`/);
  assert.deepEqual(v2.gates.map((g) => g.key), ["gate0", "1-concept", "2-architecture", "2a-experience", "3-spec", "4-plan", "5-checkpoint", "6-review", "6a-ui-review", "7-verification", "8-docs", "9-pr"]);
});

test("F2 GATE-2: Implementation, Code review, Verification and Merge offer the PRD's moves", () => {
  const row = must(prd.split("\n").find((l) => l.startsWith("| GATE-2 |")), "the GATE-2 row");
  const movesOf = (label: string) => must(new RegExp(`${label} \`([^\`]+)\``).exec(row), `GATE-2's moves for ${label}`)[1].split(" · ");
  const data = (key: string) => [...v2.gates.find((g) => g.key === key)!.moves];
  assert.deepEqual(data("5-checkpoint"), movesOf("Implementation"));
  assert.deepEqual(data("6-review"), movesOf("Code review"));
  assert.deepEqual(data("7-verification"), movesOf("Verification"));
  assert.deepEqual(data("9-pr"), movesOf("Merge"));
  assert.match(row, /\*\*2\*\* automatic fix rounds/);
  assert.equal(v2.gates.find((g) => g.key === "7-verification")!.mitigationCap?.default, 2);
  // the two interface gates are in GATE-2 too
  assert.deepEqual(data("2a-experience"), movesOf("Experience design"));
  assert.deepEqual(data("6a-ui-review"), movesOf("UI review"));
});

// ── the interface-gates concept ──────────────────────────────────────────────────────────────────────────────────────────────────────
function gateBlock(id: string) {
  const m = new RegExp(`---\\nid: ${id}\\n([\\s\\S]*?)\\n---`).exec(uiFlow);
  const body = must(m, `the ${id} gate definition`)[1];
  const field = (name: string) => must(new RegExp(`^\\s*${name}: (.+)$`, "m").exec(body), `${id}.${name}`)[1].replace(/\s+#.*$/, "").trim();
  const list = (name: string) => field(name).replace(/^\[|\]$/g, "").split(",").map((s) => s.trim().replace(/^"|"$/g, "")).filter(Boolean);
  const movesBlock = must(/^moves:\n([\s\S]*?)^delegable:/m.exec(body), `${id}.moves`)[1];
  const moves = [...movesBlock.matchAll(/^  (\w+): \{([^}]*)\}/gm)].filter((x) => !/\bkind:/.test(x[2])).map((x) => x[1]);
  return { question: field("question"), judges: list("judges"), moves, paths: list("paths"), labels: list("labels"), after: field("after") };
}

test("F2 the interface gates equal ui-flow.md §4.1 and §5.1: question, judge, moves, applies_when, and their place", () => {
  for (const [key, id] of [["2a-experience", "experience-design"], ["6a-ui-review", "ui-review"]] as const) {
    const doc = gateBlock(id);
    const g = must(v2.gates.find((x) => x.key === key), key);
    assert.equal(g.question, doc.question, `${key}: question`);
    assert.deepEqual([g.judge], doc.judges, `${key}: judge`);
    assert.deepEqual([...g.moves], doc.moves, `${key}: moves`);
    assert.deepEqual([...(g.appliesWhen?.paths ?? [])], doc.paths, `${key}: applies_when.paths`);
    assert.deepEqual([...(g.appliesWhen?.labels ?? [])], doc.labels, `${key}: applies_when.labels`);
  }
  const keys = v2.gates.map((g) => g.key);
  assert.equal(keys[keys.indexOf("2a-experience") - 1], "2-architecture", "Experience design follows Architecture");
  assert.equal(keys[keys.indexOf("2a-experience") + 1], "3-spec", "and precedes the Specification");
  assert.equal(keys[keys.indexOf("6a-ui-review") - 1], "6-review", "UI review follows Code review");
  assert.equal(keys[keys.indexOf("6a-ui-review") + 1], "7-verification", "and precedes Verification");
  assert.equal(gateBlock("ui-review").after, "code-review");
});

test("F11 applies_when is declared only on the two interface gates, with deterministic keys only", () => {
  const withRule = v2.gates.filter((g) => g.appliesWhen !== undefined).map((g) => g.key);
  assert.deepEqual(withRule, ["2a-experience", "6a-ui-review"]);
  for (const g of v2.gates) if (g.appliesWhen) assert.deepEqual(Object.keys(g.appliesWhen).filter((k) => !["paths", "labels", "journeys", "diff"].includes(k)), [], `${g.key}: only deterministic predicates`);
  assert.equal(v2.gates.find((g) => g.key === "2a-experience")!.appliesWhen!.journeys, "any");
  assert.deepEqual([...v2.gates.find((g) => g.key === "6a-ui-review")!.appliesWhen!.diff!], ["ui_files_changed", "tokens_changed", "routes_changed"]);
  assert.equal(v2.gates.find((g) => g.key === "6a-ui-review")!.check, "ui-checker");
  assert.ok(flowOf("v1").gates.every((g) => g.appliesWhen === undefined), "v1 has no applies_when");
});
