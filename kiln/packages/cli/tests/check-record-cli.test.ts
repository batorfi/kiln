// `kiln check record` through the real command (r15 T025). A planted fault goes into a temporary COPY of kiln/ — the command finds the tree it lives in, so the real tree is never touched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const kilnDir = fileURLToPath(new URL("../../..", import.meta.url));
const run = (kiln: string) => spawnSync(process.execPath, [join(kiln, "packages", "cli", "src", "main.ts"), "check", "record"], { encoding: "utf8", env: { ...process.env, NODE_TEST_CONTEXT: undefined } });

test("kiln check record on the real tree exits 0, says PASS, and says how much it examined", () => {
  const r = run(kilnDir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^PASS record — scanned \d+ files$/m);
  assert.match(r.stdout, /^note: examined: \d+ types, \d+ source files, \d+ committed types$/m);
});

test("a source file committing a type the catalog does not have exits 1 and names catalog-unknown-emitted and the file", () => {
  const tmp = mkdtempSync(join(tmpdir(), "kiln-cli-record-"));
  try {
    const kiln = join(tmp, "kiln");
    cpSync(kilnDir, kiln, { recursive: true, filter: (p) => !p.split(/[\\/]/).includes("node_modules") });
    writeFileSync(join(kiln, "packages", "durable", "src", "rogue.ts"), 'export const x = (tx: unknown) => appendEvent(tx, { type: "gate.exploded", subject: "f", at: 1, actor: "system", cause: "k", data: {} });\n');
    const r = run(kiln);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /catalog-unknown-emitted/);
    assert.match(r.stdout, /rogue\.ts/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("a schema file edited by hand exits 1 and names catalog-schemas-stale", () => {
  const tmp = mkdtempSync(join(tmpdir(), "kiln-cli-record-"));
  try {
    const kiln = join(tmp, "kiln");
    cpSync(kilnDir, kiln, { recursive: true, filter: (p) => !p.split(/[\\/]/).includes("node_modules") });
    const f = join(kiln, "schemas", "events", "walk.completed.1.json");
    writeFileSync(f, readFileSync(f, "utf8").replace('"approved"', '"approvals"'));
    const r = run(kiln);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /catalog-schemas-stale/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
