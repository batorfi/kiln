// r14 T003 (research R16): the runner has two tiers. The default tier skips files named *.proof.test.ts and SAYS so; `--proof` runs only those; a proof file named on the command line always runs;
// a proof run with no proof file fails (a run that ran nothing proves nothing). Each case runs a COPY of the runner in a scratch tree, because the runner resolves everything from its own location.
import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL("..", import.meta.url));

function scratch(files: Record<string, string>): { dir: string; run: (args: string[]) => { status: number | null; out: string } } {
  const dir = mkdtempSync(join(tmpdir(), "kiln-tier-"));
  mkdirSync(join(dir, "tests"), { recursive: true });
  for (const f of ["run.ts", "measured-pi.ts", "pi-tier.ts"]) copyFileSync(join(HERE, f), join(dir, "tests", f));
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(join(dir, "tests", "cases"), { recursive: true });
    writeFileSync(join(dir, "tests", "cases", name), body);
  }
  const run = (args: string[]) => {
    const env = { ...process.env, NODE_TEST_CONTEXT: undefined } as NodeJS.ProcessEnv;
    const r = spawnSync(process.execPath, [join(dir, "tests", "run.ts"), "--new-only", ...args], { encoding: "utf8", env, cwd: dir });
    return { status: r.status, out: r.stdout + r.stderr };
  };
  return { dir, run };
}
const PASSING = `import { test } from "node:test"; test("ok", () => {});\n`;

test("the default tier does not run a proof file, and the output says how many it left out", () => {
  const s = scratch({ "a.test.ts": PASSING, "b.proof.test.ts": `import { test } from "node:test"; test("proof-only", () => { throw new Error("must not run in the default tier"); });\n` });
  try {
    const r = s.run([]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /tier: default \(1 proof files not run; npm run proof runs them\)/);
    assert.match(r.out, /new: 1 tests/);
  } finally { rmSync(s.dir, { recursive: true, force: true }); }
});

test("--proof runs only the proof files and says tier: proof", () => {
  const s = scratch({ "a.test.ts": `import { test } from "node:test"; test("default-only", () => { throw new Error("must not run in the proof tier"); });\n`, "b.proof.test.ts": PASSING });
  try {
    const r = s.run(["--proof"]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /tier: proof \(1 proof files\)/);
    assert.match(r.out, /proof: 1 tests/);
  } finally { rmSync(s.dir, { recursive: true, force: true }); }
});

test("a proof file named on the command line runs even in the default tier", () => {
  const s = scratch({ "b.proof.test.ts": PASSING });
  try {
    const r = s.run(["tests/cases/b.proof.test.ts"]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /new: 1 tests/);
  } finally { rmSync(s.dir, { recursive: true, force: true }); }
});

test("--proof with no proof file fails: a run that ran nothing proves nothing", () => {
  const s = scratch({ "a.test.ts": PASSING });
  try {
    const r = s.run(["--proof"]);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /ZERO tests/);
  } finally { rmSync(s.dir, { recursive: true, force: true }); }
});

test("--proof and --legacy-only exclude each other", () => {
  const s = scratch({ "a.test.ts": PASSING });
  try {
    const env = { ...process.env, NODE_TEST_CONTEXT: undefined } as NodeJS.ProcessEnv;
    const r = spawnSync(process.execPath, [join(s.dir, "tests", "run.ts"), "--proof", "--legacy-only"], { encoding: "utf8", env, cwd: s.dir });
    assert.equal(r.status, 2, r.stdout + r.stderr);
  } finally { rmSync(s.dir, { recursive: true, force: true }); }
});
