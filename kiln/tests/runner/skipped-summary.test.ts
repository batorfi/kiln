// Runner case R8 (r12 code-review finding 4): a skipped test is shown beside the count in the closing line — "170 tests" never hides that some did not run.
// (A shallow clone or an archive skips the git cross-checks; the exit code is still 0, so the line is where a person sees it.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";

const RUN = fileURLToPath(new URL("../run.ts", import.meta.url));
const run = (args: string[]) => spawnSync(process.execPath, [RUN, ...args], { encoding: "utf8" });
const withDir = <T>(fn: (dir: string) => T): T => {
  const dir = mkdtempSync(join(tmpdir(), "kiln-skip-"));
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
};

test("R8 skipped tests are counted in the closing line", () => {
  withDir((dir) => {
    writeFileSync(join(dir, "a.test.ts"), 'import { test } from "node:test";\ntest("passes", () => {});\ntest("skips", { skip: "no history here" }, () => {});\ntest("skips too", { skip: true }, () => {});\n');
    const r = run(["--new-only", dir]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /^new: 3 tests \(2 skipped\)$/m);
  });
});

test("R8 a run with no skipped test prints the plain count", () => {
  withDir((dir) => {
    writeFileSync(join(dir, "a.test.ts"), 'import { test } from "node:test";\ntest("passes", () => {});\n');
    const r = run(["--new-only", dir]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /^new: 1 tests$/m);
  });
});
