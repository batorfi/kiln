// `kiln check legacy` (r12 T036; contracts/legacy-identity.md): legacy/ is byte-identical to the baseline commit's tree, and the copy record is consistent.
// Pure filesystem — no process is spawned, nothing is written. The git cross-check (the baseline commit's tree id equals the manifest's) is a TEST,
// because it needs history and `git`: see checks/tests/legacy-baseline.test.ts.
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { CheckResult } from "./index.ts";

export interface ManifestFile { path: string; bytes: number; sha256: string; blobId: string }
export interface LegacyManifest {
  schema: 1;
  baseline: { commit: string; sourcePath: "kiln/"; treeId: string; generatedAt: string };
  ignore: string[];
  files: ManifestFile[];
}
export interface CopyRecord {
  legacy: string;
  ported?: string;
  kind: "ported" | "wait";
  since?: string;
  portedBy?: string;
  /** Test cases a `wait` record holds back (the 19 deferred cases are counted from here). */
  cases?: number;
  retiresWith: "legacy-retirement";
  note?: string;
}
export interface CopiesFile { schema: 1; records: CopyRecord[] }

export interface LegacyOptions {
  /** The legacy directory to examine (default: the repository's `legacy/`). Tests pass a temporary copy. */
  legacyDir?: string;
  /** The `kiln/` directory against which `ported` paths are resolved (default: this one). */
  kilnDir?: string;
  manifest?: LegacyManifest;
  copies?: CopiesFile;
}

const checksDir = fileURLToPath(new URL(".", import.meta.url));
const defaultKilnDir = fileURLToPath(new URL("..", import.meta.url));

const sha256 = (b: Buffer): string => createHash("sha256").update(b).digest("hex");
/** `factory-log/*.jsonl` → a matcher where `*` stays inside one path segment. */
const globToRegExp = (g: string): RegExp => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*") + "$");

function load<T>(path: string): T | string {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (e) {
    return `${path}: ${(e as Error).message}`;
  }
}

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    const full = join(e.parentPath, e.name);
    if (e.isDirectory() && !lstatSync(full).isSymbolicLink()) continue;
    out.push(relative(dir, full).split(sep).join("/"));
  }
  return out.sort();
}

export function checkLegacy(opts: LegacyOptions = {}): CheckResult {
  const kilnDir = opts.kilnDir ?? defaultKilnDir;
  const legacyDir = opts.legacyDir ?? join(kilnDir, "..", "legacy");
  const failures: CheckResult["failures"] = [];
  const result = (scanned?: number, notes: string[] = []): CheckResult => ({ name: "legacy", ok: failures.length === 0, failures, scanned, notes });

  const manifest = opts.manifest ?? load<LegacyManifest>(join(checksDir, "legacy-manifest.json"));
  const copies = opts.copies ?? load<CopiesFile>(join(checksDir, "legacy-copies.json"));
  if (typeof manifest === "string") failures.push({ code: "legacy-manifest-invalid", detail: `cannot read the manifest: ${manifest}` });
  else if (manifest.schema !== 1 || !Array.isArray(manifest.files) || !Array.isArray(manifest.ignore)) failures.push({ code: "legacy-manifest-invalid", detail: "the manifest is not schema 1 with files and ignore lists" });
  if (typeof copies === "string") failures.push({ code: "legacy-manifest-invalid", detail: `cannot read the copy record: ${copies}` });
  else if (copies.schema !== 1 || !Array.isArray(copies.records)) failures.push({ code: "legacy-manifest-invalid", detail: "the copy record is not schema 1 with a records list" });
  if (failures.length > 0 || typeof manifest === "string" || typeof copies === "string") return result();

  // never vacuous: a manifest that lists nothing would pass anything
  if (manifest.files.length === 0) failures.push({ code: "legacy-zero-files", detail: "the manifest lists zero files; a check that examined nothing proves nothing" });

  // 1. every manifest file exists and matches
  const known = new Set<string>();
  for (const f of manifest.files) {
    known.add(f.path);
    const abs = join(legacyDir, f.path);
    if (!existsSync(abs)) {
      failures.push({ code: "legacy-file-missing", file: `legacy/${f.path}`, detail: "listed in the manifest, absent from legacy/" });
      continue;
    }
    const content = readFileSync(abs);
    const actual = sha256(content);
    if (actual !== f.sha256 || content.length !== f.bytes) {
      failures.push({ code: "legacy-file-modified", file: `legacy/${f.path}`, detail: `expected sha256 ${f.sha256.slice(0, 12)}… (${f.bytes} bytes), found ${actual.slice(0, 12)}… (${content.length} bytes)` });
    }
  }

  // 2. nothing under legacy/ beyond the manifest, except the runtime artifacts .gitignore already excludes
  const ignored = manifest.ignore.map(globToRegExp);
  for (const path of filesUnder(legacyDir)) {
    if (known.has(path) || ignored.some((re) => re.test(path))) continue;
    failures.push({ code: "legacy-file-added", file: `legacy/${path}`, detail: "not in the manifest and not matched by an ignore glob" });
  }

  // 3. the copy record is consistent
  let deferred = 0;
  for (const r of copies.records) {
    const label = `${r.kind} ${r.legacy}${r.ported ? " ↔ " + r.ported : ""}`;
    const bad = (detail: string) => failures.push({ code: "legacy-copy-unlisted", file: r.legacy, detail: `${label}: ${detail}` });
    if (!known.has(r.legacy)) bad("the legacy path is not in the manifest");
    if (r.retiresWith !== "legacy-retirement") bad(`retiresWith must be "legacy-retirement"`);
    if (r.kind === "ported") {
      if (!r.ported) bad("a ported record needs a ported path");
      else if (r.ported.split("/").includes("..") || r.ported.startsWith("/")) bad("the ported path must lie inside kiln/");
      else if (!existsSync(join(kilnDir, r.ported))) bad("the ported file does not exist");
    } else if (r.kind === "wait") {
      if (!r.portedBy) bad("a wait record needs portedBy, the row that will port it");
      deferred += r.cases ?? 0;
    } else bad(`unknown kind "${String((r as { kind?: unknown }).kind)}"`);
  }

  return result(manifest.files.length, [
    `baseline ${manifest.baseline.commit.slice(0, 7)}… (tree ${manifest.baseline.treeId.slice(0, 8)}…); ${manifest.ignore.length} ignored globs; ${deferred} deferred cases listed`,
    "the baseline-commit cross-check is a test (npm test), not part of this command",
  ]);
}
