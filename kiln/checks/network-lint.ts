// `kiln check network` (r12 T063): the first program's P-VIII zero-network scan, ported (legacy validate/_netscan.ts, hardened by its code review CR-4/CR-8)
// over the new packages. A LINT of source files — not a sandbox and not a runtime monitor: it stops accidents and ordinary drift, not a determined attempt
// to hide a call (e.g. `globalThis[String.fromCharCode(…)]`); runtime enforcement arrives with the residency module (r16). Pure: reads files, spawns nothing.
//   1. CALL-based detection (a global `fetch` needs no import, so no import regex can see it);
//   2. a denylist of network/process modules (`node:http`, `node:net`, `node:child_process`, …), bare or `node:`-prefixed;
//   3. an ALLOWLIST keyed by PATH relative to kiln/ (`packages/lane/src/residency.ts`) — never a bare name — empty in r12; an allowlisted module may call the
//      local endpoint, and no absolute URL literal in it may name anything but loopback;
//   4. a NEVER-VACUOUS guard: scanning zero files is itself a failure;
//   5. the evasions the first version missed: a `//` inside a string, aliasing `fetch`, computed access on the global object, computed `import()`/`require()`.
// Dropped from the first program: the rule that the allowlist has EXACTLY one entry (research R9) and the Pi-driver process exemption (r12 has neither).
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isLoopbackHost } from "./loopback.ts";
import { moduleLoads, tokenize } from "./lex.ts";
import type { CheckResult } from "./index.ts";

/** Source files worth scanning. Recursive; `node_modules` and dot-directories are skipped. */
export const SCAN_EXTENSIONS = /\.(?:ts|mts|cts|js|mjs|cjs)$/;

export type NetworkCode =
  | "network-call" | "network-import" | "network-alias" | "network-computed" | "network-external-dependency" | "network-nonloopback-url"
  | "network-zero-files" | "network-allowlist-invalid" | "allowlist-bare-name" | "allowlist-missing-file";
export interface Offence { code: NetworkCode; detail: string }

// ── the patterns, kept from the first program ──────────────────────────────────────────────────────────────────────────────────────
const NET_PRIMITIVE = /\b(?:new\s+(?:Server|Socket|WebSocket))\b|\brequire\(\s*["'](?:http|https|net|dns|tls)["']/;
/** A network CALL. `fetch` is a Node global — it needs no import, so import/primitive regexes cannot see it. */
const NET_CALL = /\b(?:fetch|XMLHttpRequest|EventSource)\s*\(|\b(?:https?|http2|net|tls|dns|dgram)\s*\.\s*(?:request|get|connect|createConnection|lookup|resolve\w*|createSocket)\s*\(/;
/** `fetch` used as a VALUE (aliased or destructured), or read off the global object. */
const NET_ALIAS = /(?<![\w$.])fetch\b(?!\s*[(:=])|\b(?:globalThis|window)\s*\.\s*fetch\b(?!\s*\()/;
/** Computed property access on the global object: `globalThis["fe" + "tch"]` (split out of the first program's alias rule so it fails by its own name). */
const NET_COMPUTED_ACCESS = /\b(?:globalThis|window)\s*(?:as\s+[\w.<>]+\s*)?\)?\s*\[/;
/** Network/process modules — bare OR `node:`-prefixed (the oldest scan let every `node:` specifier through). */
const NET_MODULE = /^(?:node:)?(?:http|https|http2|net|tls|dns|dgram|child_process)$/;
/** An absolute URL literal, to check its host against loopback. */
const URL_LITERAL = /["'`]((?:https?|wss?):\/\/(\[[^\]]+\]|[^/"'`:?#\s$]+|\$\{[^}]*\})(?::\d+)?[^"'`\s]*)["'`]/g; // host: `[::1]` | name/IPv4 | `${…}`
/** Specifiers that are not third-party packages: relative, absolute, `node:` builtins, and this package's own `#…` imports map. */
const INTERNAL_SPECIFIER = /^(\.|\/|node:|#)/;

/** Default allowlist key from a path: the last two segments, with `\` normalised to `/` (CR-8). Used only when the caller gives no key. */
function defaultKey(fullPath: string): string {
  return fullPath.replace(/\\/g, "/").split("/").slice(-2).join("/");
}

/** Offences for ONE file's text, each with its stable code. Pure — the unit the planted-violation tests drive. */
export function scanTextDetailed(text: string, path: string, allowlist: readonly string[] = [], relKey?: string): Offence[] {
  const out: Offence[] = [];
  const tokens = tokenize(text);
  const { code, blanked } = tokens;
  const allowed = allowlist.includes(relKey ?? defaultKey(path));

  if (NET_PRIMITIVE.test(code)) out.push({ code: "network-call", detail: "a socket/server/network primitive" });

  let computed = false;
  for (const { specifier: spec } of moduleLoads(tokens)) {
    if (spec === null) computed = true; // a COMPUTED import()/require(): not one plain string literal, so the module cannot be read from the source
    else if (NET_MODULE.test(spec)) out.push({ code: "network-import", detail: `imports the network/process module "${spec}"` });
    else if (!INTERNAL_SPECIFIER.test(spec)) out.push({ code: "network-external-dependency", detail: `external dependency "${spec}"` });
  }
  if (computed) out.push({ code: "network-computed", detail: "a COMPUTED import()/require() — it can load any module, invisibly to every specifier check" });

  if (!allowed) {
    const where = `outside the loopback allowlist [${allowlist.join(", ")}]`;
    if (NET_CALL.test(blanked)) out.push({ code: "network-call", detail: `a network CALL (fetch/http.request/…) ${where}` });
    else if (NET_ALIAS.test(blanked)) out.push({ code: "network-alias", detail: `fetch used as a VALUE or read off the global object (aliasing) ${where}` });
    if (NET_COMPUTED_ACCESS.test(blanked)) out.push({ code: "network-computed", detail: `computed property access on the global object (globalThis[…]) ${where}` });
  } else {
    // The allowlisted module may call the local endpoint — but no absolute URL literal may name anything else.
    URL_LITERAL.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = URL_LITERAL.exec(code)) !== null) {
      const host = m[2];
      if (host.startsWith("${")) continue; // an interpolated host is checked at RUNTIME (the residency module refuses non-loopback)
      if (!isLoopbackHost(host)) out.push({ code: "network-nonloopback-url", detail: `non-loopback URL literal "${m[1]}" in the allowlisted loopback module` });
    }
  }
  return out;
}

/** The first program's string form: `<path>: <what>`. */
export function scanText(text: string, path: string, allowlist: readonly string[] = [], relKey?: string): string[] {
  return scanTextDetailed(text, path, allowlist, relKey).map((o) => `${path}: ${o.detail}`);
}

export interface NetScanResult {
  ok: boolean;
  detail: string;
  offenders: string[];
  filesScanned: number;
}

/** Every source file under `dir`, recursively, with its key relative to the scan root (`<dir-name>/<subpath>`). */
function collect(dir: string, key: string, out: { path: string; key: string }[]): void {
  for (const e of readdirSync(dir).sort()) {
    if (e === "node_modules" || e.startsWith(".")) continue;
    const p = `${dir}/${e}`;
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) collect(p, `${key}/${e}`, out);
    else if (SCAN_EXTENSIONS.test(e)) out.push({ path: p, key: `${key}/${e}` });
  }
}

/**
 * The first program's directory scan, kept for its ported tests: every source file under each of `dirs`, RECURSIVELY, keyed relative to each scan root.
 * NEVER VACUOUS: a scan that examined ZERO files fails, and so does a missing directory.
 */
export function zeroNetworkScan(dirs: string[], okDetail: string, allowlist: readonly string[] = []): NetScanResult {
  const offenders: string[] = [];
  let filesScanned = 0;
  for (const dir of dirs) {
    let isDir = false;
    try {
      isDir = statSync(dir).isDirectory(); // NOT `isFile()` — the exact bug that made the oldest scan inert
    } catch {
      isDir = false;
    }
    if (!isDir) {
      offenders.push(`${dir}: scan directory missing or not a directory (a scan that skips a directory proves nothing)`);
      continue;
    }
    const files: { path: string; key: string }[] = [];
    collect(dir.replace(/[\\/]+$/, ""), dir.replace(/\\/g, "/").replace(/\/+$/, "").split("/").pop() ?? "", files);
    for (const f of files) {
      filesScanned++;
      offenders.push(...scanText(readFileSync(f.path, "utf8"), f.path, allowlist, f.key));
    }
  }
  if (filesScanned === 0) offenders.push("zero-network scan examined ZERO files — a vacuous scan proves nothing (P-VIII)");
  return offenders.length === 0
    ? { ok: true, detail: `${okDetail} [${filesScanned} files scanned]`, offenders, filesScanned }
    : { ok: false, detail: offenders.join("; "), offenders, filesScanned };
}

// ── the check ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface NetworkAllowlist { schema: 1; entries: { path: string; reason: string; loopbackOnly: true }[] }
export interface NetworkOptions {
  /** The kiln/ directory to scan (default: this one). Tests pass a temporary tree. */
  kilnDir?: string;
  allowlist?: NetworkAllowlist;
}

const defaultKilnDir = fileURLToPath(new URL("..", import.meta.url));
const posix = (p: string) => p.split(sep).join("/");

const isTestFile = (name: string) => /\.test\.[cm]?[jt]s$/.test(name);

/** Source files under `dir`, recursively, as keys relative to kiln/. Skips `tests/` directories, test files, `node_modules` and `.git` — and nothing else: a hidden directory is scanned. */
function sourceUnder(dir: string, key: string, out: string[]): void {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (e.isDirectory()) {
      if (e.name === "tests" || e.name === "node_modules" || e.name === ".git") continue;
      sourceUnder(join(dir, e.name), `${key}/${e.name}`, out);
    } else if (e.isFile() && SCAN_EXTENSIONS.test(e.name) && !isTestFile(e.name)) out.push(`${key}/${e.name}`);
  }
}

// The scan roots: every non-test source file anywhere under packages/<name>/ and under checks/ (recursively), as paths relative to kiln/. A file
// outside these roots (kiln/tests/, kiln/fixtures/) is not scanned — and the boundary check refuses to let source import from there.
export function networkScanFiles(kilnDir: string): string[] {
  const out: string[] = [];
  const packages = join(kilnDir, "packages");
  if (existsSync(packages)) {
    for (const p of readdirSync(packages, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (p.isDirectory()) sourceUnder(join(packages, p.name), `packages/${p.name}`, out);
    }
  }
  const checks = join(kilnDir, "checks");
  if (existsSync(checks)) sourceUnder(checks, "checks", out);
  return out.sort();
}

export function checkNetwork(opts: NetworkOptions = {}): CheckResult {
  const kilnDir = opts.kilnDir ?? defaultKilnDir;
  const failures: CheckResult["failures"] = [];
  const result = (scanned?: number, notes: string[] = []): CheckResult => ({ name: "network", ok: failures.length === 0, failures, scanned, notes });

  // the allowlist
  let allowlist = opts.allowlist;
  if (allowlist === undefined) {
    const path = join(kilnDir, "checks", "network-allowlist.json");
    try {
      allowlist = JSON.parse(readFileSync(path, "utf8")) as NetworkAllowlist;
    } catch (e) {
      failures.push({ code: "network-allowlist-invalid", file: "checks/network-allowlist.json", detail: `cannot read the allowlist: ${(e as Error).message}` });
      return result();
    }
  }
  if (allowlist.schema !== 1 || !Array.isArray(allowlist.entries)) {
    failures.push({ code: "network-allowlist-invalid", file: "checks/network-allowlist.json", detail: "the allowlist is not schema 1 with an entries list" });
    return result();
  }

  const files = networkScanFiles(kilnDir);
  const scannedSet = new Set(files);
  const keys: string[] = [];
  for (const e of allowlist.entries) {
    const bad = (code: NetworkCode, detail: string) => failures.push({ code, file: e.path, detail });
    if (typeof e.path !== "string" || !e.path.includes("/")) bad("allowlist-bare-name", `allowlist entry "${String(e.path)}" is a bare name; entries are paths relative to kiln/ (a same-named file elsewhere must not inherit the exemption)`);
    else if (!existsSync(join(kilnDir, e.path)) || !statSync(join(kilnDir, e.path)).isFile()) bad("allowlist-missing-file", `allowlist entry "${e.path}" names a file that does not exist`);
    else if (!scannedSet.has(e.path)) bad("allowlist-missing-file", `allowlist entry "${e.path}" is not a scanned source file (scan roots: packages/*, checks/ — recursively, tests excluded)`);
    else if (e.loopbackOnly !== true) bad("network-allowlist-invalid", `allowlist entry "${e.path}" must declare loopbackOnly: true`);
    else keys.push(e.path);
  }

  // the scan — never vacuous
  if (files.length === 0) failures.push({ code: "network-zero-files", detail: "the scan examined ZERO files (roots: packages/*, checks/ — recursively, tests excluded) — a vacuous scan proves nothing (P-VIII)" });
  for (const f of files) {
    for (const o of scanTextDetailed(readFileSync(join(kilnDir, f), "utf8"), f, keys, f)) failures.push({ code: o.code, file: f, detail: o.detail });
  }
  const n = allowlist.entries.length;
  return result(files.length, [`allowlist: ${n} entr${n === 1 ? "y" : "ies"}`]);
}
