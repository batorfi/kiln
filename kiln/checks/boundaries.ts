// `kiln check boundaries` (r12 T074; contracts/boundaries.md): PRD §8.2's dependency direction, seam rules and "no bare specifiers", enforced by a rule file
// (checks/boundaries.json) instead of hoped for. It reads the import specifiers of every non-test source file — everything under `packages/<name>/` and `checks/` —
// with the shared tokenizer, so a specifier inside a string, a comment or a template is never read as an import. Pure: reads files, spawns nothing.
//   · `#<pkg>/…` and a relative import into another package are the same thing, and must be in the importing package's allowed list (siblings are not);
//   · `node:` builtins are free except in `contracts`, which does no I/O;
//   · anything else is a bare specifier — refused, unless an `externals` seam opens it for that package (none in r12: FR-002; one in r13: the durable seam);
//   · (r13) dependencies: `kiln/package.json` `dependencies` must be EXACT versions, each must be named by an external seam and each seam package must be declared, and
//     `kiln/package-lock.json` must exist and agree — three codes, `boundary-dependency-unpinned`, `boundary-dependency-undeclared`, `boundary-lock-mismatch`;
//   · nothing under kiln/ imports from legacy/;
//   · every directory under packages/ is declared in the rules and every package (and checks/) states a non-empty responsibility in its kiln.json;
//   · a scan that examined no file fails — never vacuous.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { moduleSpecifiers, tokenize } from "./lex.ts";
import { networkScanFiles } from "./network-lint.ts";
import type { CheckResult } from "./index.ts";

export interface BoundaryRules {
  schema: 1;
  /** Each package → the packages it may import (earlier in the PRD §8.2 chain). Siblings are not importable. */
  layers: Record<string, { imports: string[]; builtins?: "none" | "any" }>;
  /** Dependencies that may appear as bare specifiers, per seam. EMPTY in r12; r13 opens the durable seam. */
  externals: Record<string, { specifiers: string[]; onlyIn: string[] }>;
  /** Nothing under kiln/ may import from here (path relative to the repository root). */
  forbidden: { legacyRoot: string };
}
export interface BoundaryOptions {
  /** The kiln/ directory to check (default: this one). Tests pass a scratch tree. */
  kilnDir?: string;
  rules?: BoundaryRules;
}

const defaultKilnDir = fileURLToPath(new URL("..", import.meta.url));
const posix = (p: string) => p.split(sep).join("/");
const isRelative = (s: string) => s.startsWith("./") || s.startsWith("../");
/** The package a bare specifier belongs to: `@scope/name/sub` → `@scope/name`, `name/sub` → `name`. */
export const packageOf = (spec: string): string => (spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]);
/** An EXACT version: major.minor.patch with optional pre-release and build — no range, tag, URL or path. */
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/** Problems with the rule file itself: shape, dangling references, and cycles (a dependency direction that loops has no direction). */
function rulesProblems(r: unknown): string[] {
  const x = r as Partial<BoundaryRules> | null;
  if (!x || typeof x !== "object" || x.schema !== 1) return ["the rule file is not schema 1"];
  if (!x.layers || typeof x.layers !== "object") return ["the rule file has no layers"];
  const out: string[] = [];
  const names = Object.keys(x.layers);
  for (const [n, l] of Object.entries(x.layers)) {
    if (!Array.isArray(l?.imports)) { out.push(`layer "${n}" has no imports list`); continue; }
    for (const i of l.imports) if (!names.includes(i)) out.push(`layer "${n}" may import "${i}", which is not a declared layer`);
    if (l.builtins !== undefined && l.builtins !== "none" && l.builtins !== "any") out.push(`layer "${n}": builtins must be "none" or "any"`);
  }
  if (typeof x.externals !== "object" || x.externals === null) out.push("the rule file has no externals object");
  else for (const [n, e] of Object.entries(x.externals)) if (!Array.isArray(e?.specifiers) || !Array.isArray(e?.onlyIn)) out.push(`external "${n}" needs specifiers and onlyIn lists`);
  if (typeof x.forbidden?.legacyRoot !== "string") out.push("the rule file has no forbidden.legacyRoot");
  if (out.length > 0) return out;
  // cycles
  const state = new Map<string, 1 | 2>();
  const visit = (n: string, path: string[]): void => {
    if (state.get(n) === 2) return;
    if (state.get(n) === 1) { out.push(`the layers form a cycle: ${[...path, n].join(" → ")}`); return; }
    state.set(n, 1);
    for (const i of x.layers![n].imports) visit(i, [...path, n]);
    state.set(n, 2);
  };
  names.forEach((n) => visit(n, []));
  return out;
}

export function checkBoundaries(opts: BoundaryOptions = {}): CheckResult {
  const kilnDir = opts.kilnDir ?? defaultKilnDir;
  const failures: CheckResult["failures"] = [];
  const result = (scanned?: number, notes: string[] = []): CheckResult => ({ name: "boundaries", ok: failures.length === 0, failures, scanned, notes });

  let rules: BoundaryRules | undefined = opts.rules;
  if (rules === undefined) {
    try {
      rules = JSON.parse(readFileSync(join(kilnDir, "checks", "boundaries.json"), "utf8")) as BoundaryRules;
    } catch (e) {
      failures.push({ code: "boundary-rules-invalid", file: "checks/boundaries.json", detail: `cannot read the rule file: ${(e as Error).message}` });
      return result();
    }
  }
  const problems = rulesProblems(rules);
  if (problems.length > 0) {
    for (const detail of problems) failures.push({ code: "boundary-rules-invalid", file: "checks/boundaries.json", detail });
    return result();
  }
  const { layers, externals } = rules;
  const legacyRoot = resolve(kilnDir, "..", rules.forbidden.legacyRoot);

  // the structure: every package declared, every unit with a responsibility
  const units: string[] = [];
  const packagesDir = join(kilnDir, "packages");
  if (existsSync(packagesDir)) {
    for (const d of readdirSync(packagesDir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (!d.isDirectory()) continue;
      if (!Object.hasOwn(layers, d.name)) failures.push({ code: "boundary-package-undeclared", file: `packages/${d.name}`, detail: `packages/${d.name} is not declared in checks/boundaries.json; a row that creates a package adds its place in the same diff` });
      units.push(`packages/${d.name}`);
    }
  }
  if (existsSync(join(kilnDir, "checks"))) units.push("checks");
  for (const u of units) {
    let responsibility: unknown;
    try {
      responsibility = (JSON.parse(readFileSync(join(kilnDir, u, "kiln.json"), "utf8")) as { responsibility?: unknown }).responsibility;
    } catch {
      failures.push({ code: "boundary-responsibility-missing", file: u, detail: `${u} has no readable kiln.json stating its single responsibility` });
      continue;
    }
    if (typeof responsibility !== "string" || responsibility.trim() === "") failures.push({ code: "boundary-responsibility-missing", file: u, detail: `${u}/kiln.json has no non-empty responsibility` });
  }

  // r13: the dependencies the package file declares (absent in a scratch tree that has no package.json: the dependency rules then do not apply, and the notes say so)
  let deps: Record<string, string> | undefined;
  const pkgPath = join(kilnDir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const d = (JSON.parse(readFileSync(pkgPath, "utf8")) as { dependencies?: Record<string, string> }).dependencies ?? {};
      if (typeof d !== "object" || d === null || Array.isArray(d)) throw new Error("dependencies is not an object");
      deps = d;
    } catch (e) {
      failures.push({ code: "boundary-package-json-invalid", file: "package.json", detail: `cannot read the dependencies of package.json: ${(e as Error).message}` });
    }
  }
  const usedPackages = new Set<string>();

  // the imports
  const files = networkScanFiles(kilnDir);
  if (files.length === 0) failures.push({ code: "boundary-zero-files", detail: "the scan examined ZERO files (roots: packages/<name>/, checks/ — recursively, tests excluded) — a vacuous scan proves nothing" });
  const allowedList = (pkg: string) => (layers[pkg].imports.length ? layers[pkg].imports.join(", ") : "nothing");
  for (const file of files) {
    const owner = file.startsWith("checks/") ? "checks" : file.split("/")[1];
    if (!Object.hasOwn(layers, owner)) continue; // an undeclared package: already reported above, and it has no rules to apply
    const at = (code: string, detail: string) => failures.push({ code, file, detail });
    const toPackage = (target: string, spec: string) => {
      if (target === owner) return;
      if (!Object.hasOwn(layers, target)) at("boundary-forbidden-import", `imports ${spec} (${owner} may import: ${allowedList(owner)}; "${target}" is not a declared package)`);
      else if (!layers[owner].imports.includes(target)) at("boundary-forbidden-import", `imports ${spec} (${owner} may import: ${allowedList(owner)})`);
    };
    for (const spec of moduleSpecifiers(tokenize(readFileSync(join(kilnDir, file), "utf8")))) {
      if (isRelative(spec)) {
        const abs = resolve(dirname(join(kilnDir, file)), spec);
        if (abs === legacyRoot || abs.startsWith(legacyRoot + sep)) { at("boundary-legacy-import", `imports ${spec}, which is under ${rules.forbidden.legacyRoot} (nothing under kiln/ may import the frozen first program; copy the code instead)`); continue; }
        const rel = posix(relative(kilnDir, abs));
        if (rel.startsWith("..")) { at("boundary-forbidden-import", `imports ${spec}, which is outside kiln/`); continue; }
        const pm = /^packages\/([^/]+)(?:\/|$)/.exec(rel);
        if (pm) toPackage(pm[1], spec);
        else if (rel === "checks" || rel.startsWith("checks/")) toPackage("checks", spec);
        else at("boundary-forbidden-import", `imports ${spec}, which is ${rel} — source may import only from packages/ and checks/ (not from tests/, fixtures/ or the root of kiln/)`);
      } else if (spec.startsWith("#")) {
        toPackage(spec.slice(1).split("/")[0], spec);
      } else if (spec.startsWith("node:")) {
        if (layers[owner].builtins === "none") at("boundary-contracts-io", `imports ${spec} (${owner} does no I/O: no node: builtin is allowed here)`);
      } else if (!Object.values(externals).some((e) => e.specifiers.includes(spec) && e.onlyIn.includes(owner))) {
        at("boundary-bare-specifier", `imports "${spec}" (no external seam is open for it in ${owner})`);
      } else {
        // the seam is open for this package: the package it belongs to must also be a declared dependency
        const pkg = packageOf(spec);
        usedPackages.add(pkg);
        if (deps !== undefined && !Object.hasOwn(deps, pkg)) at("boundary-dependency-undeclared", `imports "${spec}", but ${pkg} is not in package.json dependencies`);
      }
    }
  }
  // r13: the dependencies themselves
  const dependencyNotes: string[] = [];
  if (deps === undefined) {
    if (!existsSync(pkgPath)) dependencyNotes.push("no package.json: dependency rules not applied");
  } else {
    const seamPackages = new Set(Object.values(externals).flatMap((e) => e.specifiers.map(packageOf)));
    for (const [name, version] of Object.entries(deps)) {
      if (typeof version !== "string" || !EXACT_VERSION.test(version)) failures.push({ code: "boundary-dependency-unpinned", file: "package.json", detail: `dependency ${name} is "${String(version)}": an exact version (for example 1.4.0) is required — no range, tag, URL or path` });
      if (!seamPackages.has(name)) failures.push({ code: "boundary-dependency-undeclared", file: "package.json", detail: `dependency ${name} is declared but no external seam in checks/boundaries.json names it` });
    }
    for (const pkg of seamPackages) if (!Object.hasOwn(deps, pkg)) failures.push({ code: "boundary-dependency-undeclared", file: "checks/boundaries.json", detail: `an external seam names ${pkg}, which is not in package.json dependencies` });
    const names = Object.keys(deps);
    if (names.length > 0) {
      const lockPath = join(kilnDir, "package-lock.json");
      if (!existsSync(lockPath)) failures.push({ code: "boundary-lock-mismatch", file: "package-lock.json", detail: "package-lock.json is missing: a dependency without a committed lockfile is not reproducible" });
      else {
        try {
          const lock = JSON.parse(readFileSync(lockPath, "utf8")) as { packages?: Record<string, { version?: string; dependencies?: Record<string, string> }> };
          const root = lock.packages?.[""]?.dependencies ?? {};
          for (const name of names) {
            if (root[name] !== deps[name]) failures.push({ code: "boundary-lock-mismatch", file: "package-lock.json", detail: `the lockfile's root asks for ${name} ${String(root[name])}, package.json for ${deps[name]}` });
            const installed = lock.packages?.[`node_modules/${name}`]?.version;
            if (installed !== deps[name]) failures.push({ code: "boundary-lock-mismatch", file: "package-lock.json", detail: `the lockfile resolves ${name} to ${String(installed)}, package.json pins ${deps[name]}` });
          }
          for (const name of Object.keys(root)) if (!Object.hasOwn(deps, name)) failures.push({ code: "boundary-lock-mismatch", file: "package-lock.json", detail: `the lockfile's root lists ${name}, which package.json does not declare` });
        } catch (e) {
          failures.push({ code: "boundary-lock-mismatch", file: "package-lock.json", detail: `package-lock.json is not readable JSON: ${(e as Error).message}` });
        }
      }
    }
    dependencyNotes.push(`${names.length} dependenc${names.length === 1 ? "y" : "ies"}, exact and locked`);
  }
  const nExt = Object.keys(externals).length;
  return result(files.length, [`${Object.keys(layers).length} layers declared; ${nExt} external seam${nExt === 1 ? "" : "s"}; rules: dependency direction, node: builtins, bare specifiers, legacy imports, responsibilities`, ...dependencyNotes]);
}
