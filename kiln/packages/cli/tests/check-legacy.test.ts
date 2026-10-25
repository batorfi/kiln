// `kiln check legacy` through the real command (r12 T041). The tamper case runs the command from a temporary copy of kiln/ + legacy/, so the
// real tree is never touched: the command finds legacy/ beside the kiln/ it lives in.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const kilnDir = fileURLToPath(new URL("../../..", import.meta.url));
const cli = (root: string, ...args: string[]) =>
  spawnSync(process.execPath, [join(root, "kiln", "packages", "cli", "src", "main.ts"), "check", ...args], { encoding: "utf8", env: { ...process.env, NODE_TEST_CONTEXT: undefined } });

test("kiln check legacy on the real tree exits 0 and prints PASS legacy", () => {
  const r = cli(join(kilnDir, ".."), "legacy");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^PASS legacy — scanned \d+ files/m);
  assert.match(r.stdout, /19 deferred cases listed/);
});

test("kiln check legacy on a copy with one modified legacy file exits 1 and names the file", () => {
  const tmp = mkdtempSync(join(tmpdir(), "kiln-cli-legacy-"));
  try {
    cpSync(join(kilnDir, "..", "legacy"), join(tmp, "legacy"), { recursive: true });
    cpSync(kilnDir, join(tmp, "kiln"), { recursive: true });
    const target = join(tmp, "legacy", "validate", "log.ts");
    writeFileSync(target, readFileSync(target, "utf8") + "\n// tampered\n");
    const r = cli(tmp, "legacy");
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /^FAIL legacy — 1 failure/m);
    assert.match(r.stdout, /legacy-file-modified legacy\/validate\/log\.ts/);
    const json = cli(tmp, "legacy", "--json");
    assert.equal(json.status, 1);
    assert.equal(JSON.parse(json.stdout)[0].failures[0].code, "legacy-file-modified");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
