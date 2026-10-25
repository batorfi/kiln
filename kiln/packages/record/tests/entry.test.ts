// The entry guard (found in r12 US2): a command run through a symlinked directory must still run. Before the fix it printed nothing and exited 0.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isEntryPoint } from "#record/entry.ts";

const kilnDir = fileURLToPath(new URL("../../..", import.meta.url));
const cleanEnv = { ...process.env, NODE_TEST_CONTEXT: undefined };

test("isEntryPoint: true for the file itself, false for another file or an empty argv", () => {
  const me = fileURLToPath(import.meta.url);
  assert.equal(isEntryPoint(import.meta.url, me), true);
  assert.equal(isEntryPoint(import.meta.url, join(kilnDir, "package.json")), false);
  assert.equal(isEntryPoint(import.meta.url, ""), false, "an empty argv[1] is not the entry point");
  assert.equal(isEntryPoint(pathToFileURL("/no/such/file.ts").href, "/no/such/file.ts"), false, "a path that cannot be resolved says no, it does not throw");
});

test("a command run through a symlinked directory still runs and prints (it must not exit 0 silently)", () => {
  const tmp = mkdtempSync(join(tmpdir(), "kiln-link-"));
  try {
    const link = join(tmp, "k");
    symlinkSync(kilnDir, link);
    for (const script of [["packages", "cli", "src", "main.ts"]]) {
      const r = spawnSync(process.execPath, [join(link, ...script), "check", "legacy"], { encoding: "utf8", env: cleanEnv });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(r.stdout, /^PASS legacy/m, "no output through a symlink would be a silent pass");
    }
    const v = spawnSync(process.execPath, [join(link, "packages", "record", "src", "log.ts")], { encoding: "utf8", env: cleanEnv });
    assert.equal(v.status, 2, "the validator CLI reached its usage message");
    assert.match(v.stderr, /usage:/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
