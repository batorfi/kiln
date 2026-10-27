// Mutation checks (r13 notes, r14 T023 …): apply a sabotage to a COMMITTED, CLEAN file, run the named tests, and require that they FAIL; then undo the sabotage and verify it is undone.
// A test suite that cannot see a deliberate defect proves nothing. The script refuses to start on a dirty file and refuses to finish if a revert left anything behind (r13's lesson: the first
// run of its script reverted the wrong path and mutations accumulated).
//   node tests/tools/mutate.ts <mutations.json>
// mutations.json: [{ "id": "…", "why": "…", "file": "packages/…" (relative to kiln/), "find": "exact text", "replace": "text", "tests": ["packages/…/x.test.ts"], "expect": "regexp the output must match" }]
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

const kilnDir = fileURLToPath(new URL("../..", import.meta.url));
const spec = process.argv[2];
if (!spec) {
  console.error("usage: node tests/tools/mutate.ts <mutations.json>");
  process.exit(2);
}
interface Mutation { id: string; why: string; file: string; find: string; replace: string; tests: string[]; expect?: string }
const mutations: Mutation[] = JSON.parse(readFileSync(resolve(spec), "utf8"));
const dirty = (file: string): boolean => spawnSync("git", ["diff", "--quiet", "--", join(kilnDir, file)], { cwd: kilnDir }).status !== 0;

let bad = 0;
for (const m of mutations) {
  const path = join(kilnDir, m.file);
  if (dirty(m.file)) {
    console.error(`REFUSED ${m.id}: ${m.file} has uncommitted changes — mutate only a committed, clean tree`);
    process.exit(2);
  }
  const original = readFileSync(path, "utf8");
  if (original.split(m.find).length !== 2) {
    console.error(`REFUSED ${m.id}: the text to sabotage must occur exactly once in ${m.file} (found ${original.split(m.find).length - 1})`);
    process.exit(2);
  }
  let outcome = "";
  try {
    writeFileSync(path, original.replace(m.find, m.replace));
    const r = spawnSync(process.execPath, ["--test", ...m.tests], { cwd: kilnDir, encoding: "utf8", env: { ...process.env, NODE_TEST_CONTEXT: undefined }, timeout: 300_000 });
    const out = r.stdout + r.stderr;
    const failing = [...out.matchAll(/^✖ (.+?) \(\d/gm)].map((x) => x[1]).filter((n) => !/\.test\.ts$/.test(n));
    const caught = r.status !== 0 && (m.expect ? new RegExp(m.expect).test(out) : true);
    outcome = caught ? `CAUGHT   ${m.id} — ${failing.slice(0, 3).join(" | ") || "the run failed"}` : `NOT CAUGHT ${m.id}: exit ${r.status}${m.expect ? `, expected /${m.expect}/` : ""}`;
    if (!caught) bad++;
  } finally {
    execFileSync("git", ["checkout", "--", path], { cwd: kilnDir });
  }
  const clean = !dirty(m.file);
  console.log(`${outcome}\n         (${m.why}) tree clean after: ${clean}`);
  if (!clean) {
    console.error(`FAIL: the revert of ${m.id} left ${m.file} changed`);
    process.exit(1);
  }
}
console.log(bad === 0 ? `all ${mutations.length} sabotages were caught` : `${bad} of ${mutations.length} sabotages were NOT caught`);
process.exit(bad === 0 ? 0 : 1);
