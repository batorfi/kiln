// L6 (r12 T040): the manifest's baseline tree id equals what git says the baseline commit's kiln/ tree was. Needs history, so it is a TEST and
// not part of `kiln check legacy` (which is pure filesystem). It lives under checks/tests/, outside the network lint's scan roots, so it may spawn git.
// Without history (a shallow clone, an exported archive) it SKIPS and says why — never passes silently.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const kilnDir = fileURLToPath(new URL("../..", import.meta.url));
const manifest = JSON.parse(readFileSync(new URL("../legacy-manifest.json", import.meta.url), "utf8"));
const git = (...args: string[]) => spawnSync("git", args, { cwd: kilnDir, encoding: "utf8" });

test("L6 the baseline commit's kiln/ tree id equals the manifest's baseline.treeId", (t) => {
  const have = git("cat-file", "-e", `${manifest.baseline.commit}^{commit}`);
  if (have.status !== 0) {
    const why = `baseline commit ${manifest.baseline.commit.slice(0, 7)} is not in the local history (shallow clone or archive?): the tree-id cross-check is skipped`;
    console.log(`skip: ${why}`);
    t.skip(why);
    return;
  }
  const tree = git("rev-parse", `${manifest.baseline.commit}:kiln`);
  assert.equal(tree.status, 0, tree.stderr);
  assert.equal(tree.stdout.trim(), manifest.baseline.treeId, "legacy-baseline-mismatch: the manifest does not describe the baseline commit's tree");
});

test("L6 the manifest's file count and blob ids agree with the baseline tree", (t) => {
  const have = git("cat-file", "-e", `${manifest.baseline.commit}^{commit}`);
  if (have.status !== 0) return t.skip("baseline commit not in the local history");
  const ls = git("ls-tree", "--full-tree", "-r", `${manifest.baseline.commit}:kiln`);
  assert.equal(ls.status, 0, ls.stderr);
  const blobs = new Map(ls.stdout.split("\n").filter(Boolean).map((l) => { const [, , id] = l.split("\t")[0].split(" "); return [l.split("\t")[1], id] as const; }));
  assert.equal(blobs.size, manifest.files.length, "legacy-baseline-mismatch: different number of files");
  for (const f of manifest.files) assert.equal(blobs.get(f.path), f.blobId, `legacy-baseline-mismatch: blob id of ${f.path}`);
});
