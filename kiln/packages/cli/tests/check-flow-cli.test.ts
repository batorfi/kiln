// `kiln check flow` through the real command (r14 T021; quickstart §1). A planted fault goes into a temporary COPY of kiln/ — the command finds the tree it lives in, so the real one is never touched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const kilnDir = fileURLToPath(new URL("../../..", import.meta.url));
const cli = (kiln: string, ...args: string[]) =>
  spawnSync(process.execPath, [join(kiln, "packages", "cli", "src", "main.ts"), "check", ...args], { encoding: "utf8", env: { ...process.env, NODE_TEST_CONTEXT: undefined } });

function withCopy<T>(edit: (kiln: string) => void, fn: (kiln: string) => T): T {
  const tmp = mkdtempSync(join(tmpdir(), "kiln-cli-flow-"));
  try {
    const kiln = join(tmp, "kiln");
    cpSync(kilnDir, kiln, { recursive: true, filter: (p) => !p.split(/[\\/]/).includes("node_modules") });
    edit(kiln);
    return fn(kiln);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

test("kiln check flow on the real tree exits 0, says PASS, and says how many gates it examined", () => {
  const r = cli(kilnDir, "flow");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^PASS flow — scanned \d+ files/m);
  assert.match(r.stdout, /^note: 12 gates examined$/m);
});

test("kiln check (all of them) prints FIVE PASS lines, flow and record among them", () => {
  const r = cli(kilnDir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual([...r.stdout.matchAll(/^PASS (\w+)/gm)].map((m) => m[1]), ["network", "boundaries", "legacy", "flow", "record"]);
});

test("a tree whose v2 data loses the Merge gate exits 1 and names flow-anchor-last and flow-builtin-missing", () => {
  withCopy((kiln) => {
    const file = join(kiln, "packages", "contracts", "src", "flow", "v2.ts");
    const text = readFileSync(file, "utf8");
    const at = text.indexOf('key: "9-pr"');
    assert.ok(at > 0, "the Merge gate was not found in v2.ts — refusing to plant a fault in the wrong place");
    const start = text.lastIndexOf("g({", at);
    const end = text.indexOf("}),", at) + 3;
    writeFileSync(file, text.slice(0, start) + text.slice(end));
  }, (kiln) => {
    const r = cli(kiln, "flow");
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /^FAIL flow — \d+ failures?/m);
    assert.match(r.stdout, /flow-anchor-last packages\/contracts\/src\/flow\/v2\.ts/);
    assert.match(r.stdout, /flow-builtin-missing/);
    const json = JSON.parse(cli(kiln, "flow", "--json").stdout);
    assert.ok(json[0].failures.some((f: { code: string }) => f.code === "flow-anchor-last"), "--json carries the failures");
  });
});

test("an unknown check name is refused as before, and the usage text lists flow", () => {
  const r = cli(kilnDir, "nope");
  assert.equal(r.status, 2);
  assert.match(r.stderr, /known: network, boundaries, legacy, flow/);
});
