// Generates kiln/checks/legacy-manifest.json from the git blobs of the BASELINE commit (r12 T034; contracts/legacy-identity.md).
// It reads `<commit>:kiln` — the first program's tree as it was before the move — never the working tree, so the manifest records the
// original whatever `legacy/` looks like later. It lives under tests/ because it spawns `git`, which the network lint must not see.
//
//   node tests/tools/make-legacy-manifest.ts <baseline-commit> [--out <file>]
//
// Regenerating is a deliberate, reviewed act, expected only when legacy is retired (then the manifest and legacy/ go together).

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isEntryPoint } from "#record/entry.ts";

const kilnDir = fileURLToPath(new URL("../..", import.meta.url));
const IGNORE = ["factory-log/*.jsonl", "factory-log/*.log"];

function git(args: string[], input?: Buffer): Buffer {
  const r = spawnSync("git", args, { cwd: kilnDir, maxBuffer: 256 * 1024 * 1024, input });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr?.toString() ?? r.error}`);
  return r.stdout;
}

export interface ManifestFile { path: string; bytes: number; sha256: string; blobId: string }

export function buildManifest(commitish: string) {
  const commit = git(["rev-parse", "--verify", `${commitish}^{commit}`]).toString().trim();
  const treeId = git(["rev-parse", `${commit}:kiln`]).toString().trim();
  const listing = git(["ls-tree", "--full-tree", "-r", "-z", `${commit}:kiln`]).toString("utf8").split("\0").filter(Boolean);
  // `git ls-tree` filters to the working directory's prefix unless --full-tree is given (above); a zero-file result is refused, never written.
  if (listing.length === 0) throw new Error(`no files found in ${commit}:kiln`);
  const files: ManifestFile[] = listing.map((line) => {
    const tab = line.indexOf("\t");
    const [mode, type, blobId] = line.slice(0, tab).split(" ");
    const path = line.slice(tab + 1);
    if (type !== "blob" || mode !== "100644") throw new Error(`unexpected entry in the baseline tree: ${mode} ${type} ${path}`);
    const content = git(["cat-file", "blob", blobId]);
    return { path, bytes: content.length, sha256: createHash("sha256").update(content).digest("hex"), blobId };
  });
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return {
    schema: 1 as const,
    baseline: { commit, sourcePath: "kiln/" as const, treeId, generatedAt: new Date().toISOString() },
    ignore: IGNORE,
    files,
  };
}

if (isEntryPoint(import.meta.url)) {
  const args = process.argv.slice(2);
  const outAt = args.indexOf("--out");
  const out = outAt >= 0 ? args[outAt + 1] : fileURLToPath(new URL("../../checks/legacy-manifest.json", import.meta.url));
  const commit = args.find((a, i) => !a.startsWith("--") && (outAt < 0 || i !== outAt + 1));
  if (!commit) {
    console.error("usage: node tests/tools/make-legacy-manifest.ts <baseline-commit> [--out <file>]");
    process.exit(2);
  }
  const m = buildManifest(commit);
  writeFileSync(out, JSON.stringify(m, null, 2) + "\n");
  console.log(`wrote ${out}: ${m.files.length} files, baseline ${m.baseline.commit.slice(0, 7)}, tree ${m.baseline.treeId}`);
}
