// `kiln check boundaries` through the real command (r12 T076; quickstart §5). Planted violations go into a temporary COPY of kiln/ — the command finds
// the tree it lives in, so the real one is never touched.
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
  const tmp = mkdtempSync(join(tmpdir(), "kiln-cli-bound-"));
  try {
    const kiln = join(tmp, "kiln");
    cpSync(kilnDir, kiln, { recursive: true });
    for (const [p, text] of Object.entries(plant)) writeFileSync(join(kiln, p), text);
    return fn(kiln);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

test("kiln check boundaries on the real tree exits 0 and reports the rules and the files checked", () => {
  const r = cli(kilnDir, "boundaries");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^PASS boundaries — scanned \d+ files/m);
  assert.match(r.stdout, /17 layers declared; 0 external seams/);
});

test("record importing #lane/affinity.ts exits 1, naming the file and boundary-forbidden-import", () => {
  withCopy({ "packages/record/src/oops.ts": 'import "#lane/affinity.ts";\nexport const z = 1;\n' }, (kiln) => {
    const r = cli(kiln, "boundaries");
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /^FAIL boundaries — 1 failure/m);
    assert.match(r.stdout, /boundary-forbidden-import packages\/record\/src\/oops\.ts: imports #lane\/affinity\.ts \(record may import: contracts\)/);
  });
});

test("contracts importing node:fs exits 1 with boundary-contracts-io", () => {
  withCopy({ "packages/contracts/src/oops.ts": 'import fs from "node:fs";\nexport const z = fs;\n' }, (kiln) => {
    const r = cli(kiln, "boundaries");
    assert.equal(r.status, 1);
    assert.match(r.stdout, /boundary-contracts-io packages\/contracts\/src\/oops\.ts/);
    assert.equal(JSON.parse(cli(kiln, "boundaries", "--json").stdout)[0].failures[0].code, "boundary-contracts-io");
  });
});

test("all three checks together: the real tree passes npm run check's command and the exit code is 0", () => {
  const r = cli(kilnDir);
  assert.match(r.stdout, /^PASS network/m);
  assert.match(r.stdout, /^PASS boundaries/m);
  assert.match(r.stdout, /^PASS legacy/m);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
