// r14 T006: the glob dialect, with a golden case for EVERY pattern in docs/concepts/ui-flow.md §4.1/§5.1 (the interface gates' rule), and the edges that decide whether a rule means what it says.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compileGlob, firstMatch, globProblem, matchGlob } from "#contracts/flow/glob.ts";
import { flowOf } from "#contracts/flow/index.ts";

const GOLDEN: [string, string[], string[]][] = [
  ["web/**", ["web/a.ts", "web/x/y/z.css"], ["web", "web/", "webapp/a.ts", "src/web/a.ts"]],
  ["app/**", ["app/main.vue", "app/a/b"], ["application/a", "x/app/a"]],
  ["**/*.tsx", ["a.tsx", "src/a.tsx", "src/deep/er/a.tsx"], ["a.ts", "src/a.tsx.bak", "a.tsx/b"]],
  ["**/*.vue", ["App.vue", "src/App.vue"], ["App.vuex", "src/app.vue.ts"]],
  ["**/*.css", ["site.css", "web/site.css"], ["site.scss", "css"]],
  ["design/**", ["design/tokens.json", "design/a/b.md"], ["design", "designs/a", "x/design/a"]],
];

for (const [pattern, yes, no] of GOLDEN) {
  test(`golden: ${pattern}`, () => {
    for (const p of yes) assert.ok(matchGlob(pattern, p), `${pattern} must match ${p}`);
    for (const p of no) assert.ok(!matchGlob(pattern, p), `${pattern} must NOT match ${p}`);
  });
}

test("the golden list covers every pattern v2's interface rule uses (nothing the data uses is untested)", () => {
  const used = new Set<string>();
  for (const g of flowOf("v2").gates) for (const p of g.appliesWhen?.paths ?? []) used.add(p);
  assert.ok(used.size >= 6, "the data lost its interface paths");
  const golden = new Set(GOLDEN.map((g) => g[0]));
  for (const p of used) assert.ok(golden.has(p), `pattern ${p} is used by the flow data and has no golden case`);
});

test("the golden patterns equal the lists in ui-flow.md (the document and the data cannot drift apart)", () => {
  const text = readFileSync(new URL("../../../../docs/concepts/ui-flow.md", import.meta.url), "utf8");
  const found = [...text.matchAll(/paths: \[([^\]]+)\]/g)];
  assert.ok(found.length >= 2, "no paths lists found in ui-flow.md — refusing to pass vacuously");
  for (const m of found) for (const q of [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1])) assert.ok(GOLDEN.some((g) => g[0] === q), `ui-flow.md uses ${q}, which has no golden case`);
});

test("** matches zero segments in the middle, * stays inside one segment, ? is one character", () => {
  assert.ok(matchGlob("a/**/b", "a/b"));
  assert.ok(matchGlob("a/**/b", "a/x/y/b"));
  assert.ok(!matchGlob("a/*", "a/x/y"));
  assert.ok(matchGlob("a/*", "a/x"));
  assert.ok(matchGlob("a/?.ts", "a/x.ts"));
  assert.ok(!matchGlob("a/?.ts", "a/xy.ts"));
  assert.ok(matchGlob("**", "anything/at/all"));
  assert.ok(!matchGlob("**", ""));
});

test("matching is case-sensitive and literal characters are literal ('.' is not 'any character')", () => {
  assert.ok(!matchGlob("web/**", "WEB/a"));
  assert.ok(!matchGlob("a.tsx", "aXtsx"));
  assert.ok(matchGlob("a+b.ts", "a+b.ts"));
});

test("a pattern outside the dialect is refused by name, not guessed", () => {
  for (const [bad, why] of [["a/{b,c}", "{"], ["!a/**", "!"], ["a/[ab]", "["], ["a**b", "whole segment"], ["a\\b", "\\"], ["", "empty"]] as const) {
    const problem = globProblem(bad);
    assert.ok(problem && problem.includes(why), `${JSON.stringify(bad)} → ${problem}`);
    const c = compileGlob(bad);
    assert.equal(c.ok, false);
    assert.equal(matchGlob(bad, "a/b"), false, "an unsupported pattern never matches");
  }
  assert.equal(globProblem("web/**"), null);
});

test("firstMatch is deterministic: paths in the caller's order, then patterns in theirs", () => {
  assert.deepEqual(firstMatch(["**/*.css", "web/**"], ["src/a.ts", "web/a.css", "b.css"]), { path: "web/a.css", pattern: "**/*.css" });
  assert.equal(firstMatch(["web/**"], ["src/a.ts"]), undefined);
  assert.equal(firstMatch(["web/**"], []), undefined);
});
