// `kiln check network` through the real command (r12 T069; quickstart §4). Planted violations go into a temporary COPY of kiln/ — the command finds the
// tree it lives in, so the real one is never touched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const kilnDir = fileURLToPath(new URL("../../..", import.meta.url));
const cli = (kiln: string, ...args: string[]) =>
  spawnSync(process.execPath, [join(kiln, "packages", "cli", "src", "main.ts"), "check", ...args], { encoding: "utf8", env: { ...process.env, NODE_TEST_CONTEXT: undefined } });

function withCopy<T>(plant: Record<string, string>, fn: (kiln: string) => T): T {
  const tmp = mkdtempSync(join(tmpdir(), "kiln-cli-net-"));
  try {
    const kiln = join(tmp, "kiln");
    cpSync(kilnDir, kiln, { recursive: true });
    for (const [p, text] of Object.entries(plant)) writeFileSync(join(kiln, p), text);
    return fn(kiln);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

test("kiln check network on the real tree exits 0 and reports the files scanned and the allowlist", () => {
  const r = cli(kilnDir, "network");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^PASS network — scanned \d+ files/m);
  assert.match(r.stdout, /note: allowlist: 0 entries/);
});

test("a fetch( planted in packages/lane/src exits 1, naming the file and network-call", () => {
  withCopy({ "packages/lane/src/oops.ts": 'export const go = () => fetch("https://example.com");\n' }, (kiln) => {
    const r = cli(kiln, "network");
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /^FAIL network — 1 failure/m);
    assert.match(r.stdout, /network-call packages\/lane\/src\/oops\.ts/);
  });
});

test('globalThis["fe" + "tch"] planted in a package exits 1 with network-computed', () => {
  withCopy({ "packages/lane/src/oops.ts": 'export const go = () => (globalThis as any)["fe" + "tch"](1);\n' }, (kiln) => {
    const r = cli(kiln, "network");
    assert.equal(r.status, 1);
    assert.match(r.stdout, /network-computed packages\/lane\/src\/oops\.ts/);
    const json = JSON.parse(cli(kiln, "network", "--json").stdout);
    assert.equal(json[0].failures[0].code, "network-computed");
  });
});

test("a node:child_process import planted in checks/ exits 1 with network-import; the other checks still run", () => {
  withCopy({ "checks/oops.ts": 'import { spawn } from "node:child_process"; export default spawn;\n' }, (kiln) => {
    const r = cli(kiln, "network", "legacy");
    assert.equal(r.status, 1);
    assert.match(r.stdout, /network-import checks\/oops\.ts/);
    assert.match(r.stdout, /^(PASS|FAIL) legacy/m, "every named check runs even when an earlier one fails (the copy has no legacy/ beside it, so legacy reports its own failure)");
  });
});
