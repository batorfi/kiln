// kiln/validate/_netscan.ts — T013/T014 (Foundational), r7 · NC2=A · D6 · contract R6 · hardened by code review CR-4/CR-8.
//
// The ONE definition of the P-VIII zero-network scan. Before r7 it existed as three near-copies, and
// (measured, r7) NONE of them could catch a violation in `kiln/src`:
//   · runtime-ready + live-ready guarded their loop with `fileExists(dir)` — but `fileExists` is
//     `statSync(p).isFile()`, FALSE for a directory, so they `continue`d past EVERY directory and scanned
//     NOTHING (a planted external import + `require("http")` in kiln/src left both probes green);
//   · overlay-ready scanned ui/contracts/validate but never `src`, where the resident lives.
// So the "zero-network (P-VIII) ✓" proof was vacuous since r1. This module fixes that, and adds what r7 needs to
// SPEND P-VIII's one loopback exception honestly:
//   1. CALL-based detection (a global `fetch` needs no import, so no import/primitive regex can see it);
//   2. a denylist of network/process modules (`node:http`, `node:net`, `node:child_process`, …);
//   3. a single-entry ALLOWLIST, keyed by the path RELATIVE TO THE SCAN ROOT (`src/ollama-resident.ts`);
//   4. a loopback-literal assertion on that module;
//   5. a NEVER-VACUOUS guard: scanning zero files is itself a failure.
// Code review (CR-4) then found the first version could still be FOOLED, and fixed it:
//   · comments were stripped with a regex, so a `//` or `/*` inside a STRING deleted a later `fetch(` — it now uses a
//     real TOKENIZER (strings, template literals with `${}` nesting, regex literals, both comment forms);
//   · the walk was non-recursive and `.ts`-only — it now recurses and covers .ts/.mts/.cts/.js/.mjs/.cjs;
//   · cheap evasions are flagged: aliasing `fetch`, computed access on the global object, computed `import()`/`require()`.
// WHAT THIS IS NOT: a sandbox. It is a LINT — it stops accidents and ordinary drift, not a determined attempt to hide a
// call (e.g. `globalThis[String.fromCharCode(...)]`). The resident additionally refuses non-loopback hosts and redirects at
// RUNTIME, which is the real enforcement. No cloud, no server, no gate advanced (P-VI).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { isLoopbackHost } from "../src/ollama-resident.ts";

/**
 * The directories the P-VIII scan covers — `src` included (the old probes never really scanned it). r8 adds `pi`: the ONE directory where Pi's
 * shape appears in KILN, so the extension code is policed like `kiln/src` (FR-014). It may import `node:fs`/`node:path`/`node:url` and relative
 * modules, and nothing else — not even a type from Pi (research D1).
 */
export const SCAN_DIRS = ["src", "ui", "validate", "contracts", "pi"] as const;

/** Source files worth scanning. Recursive; `node_modules` and dot-directories are skipped. */
export const SCAN_EXTENSIONS = /\.(?:ts|mts|cts|js|mjs|cjs)$/;

/**
 * The ONLY module(s) permitted to reach the local endpoint, keyed by the path RELATIVE TO THE SCAN ROOT
 * (`<dir>/<subpath>`). EXACTLY one entry — a second is refused by `allowlistIsSingle` (falsify hook
 * `--extra-loopback`). By path, not bare basename, so a same-named file elsewhere does not inherit the exemption.
 */
export const LOOPBACK_ALLOWLIST: readonly string[] = ["src/ollama-resident.ts"];

/**
 * r8 (research D6): the ONLY module(s) permitted to import `node:child_process` — `PiReady` must START a real Pi, and the scan forbids that everywhere
 * else. EXACTLY one entry, keyed by PATH like the loopback list (a same-named file elsewhere does not inherit it), refused otherwise by
 * `processAllowlistIsSingle` (falsify hook `--extra-process`). It exempts ONLY the `child_process` import: every network rule still applies to that
 * file, and the two exemptions never ride on each other (the loopback module may not spawn; the driver may not dial). The driver itself refuses to
 * spawn anything but `pi`, with `shell: false` (contracts/pi-ready.md R5).
 */
export const PROCESS_ALLOWLIST: readonly string[] = ["validate/_pi-driver.ts"];

// ── the ORIGINAL patterns, kept verbatim (so nothing the old scan meant to catch is lost) ─────────────
const EXTERNAL_IMPORT = /(?:^|\s)(?:import|export)\s+[^;'"]*?\s+from\s*["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)|import\(\s*["']([^"']+)["']\s*\)/g;
const NET_PRIMITIVE = /\b(?:new\s+(?:Server|Socket|WebSocket))\b|\brequire\(\s*["'](?:http|https|net|dns|tls)["']/;

// ── r7 additions ──────────────────────────────────────────────────────────────────────────────────────
/** A network CALL. `fetch` is a Node global — it needs no import, so import/primitive regexes cannot see it. */
const NET_CALL = /\b(?:fetch|XMLHttpRequest|EventSource)\s*\(|\b(?:https?|http2|net|tls|dns|dgram)\s*\.\s*(?:request|get|connect|createConnection|lookup|resolve\w*|createSocket)\s*\(/;
/** Cheap evasions (CR-4 D/E): `fetch` used as a VALUE (aliased/destructured) or reached through computed access on the global. */
const NET_ALIAS = /(?<![\w$.])fetch\b(?!\s*[(:=])|\b(?:globalThis|window)\s*\.\s*fetch\b(?!\s*\()|\b(?:globalThis|window)\s*(?:as\s+[\w.<>]+\s*)?\)?\s*\[/;
/** A COMPUTED module load can fetch anything, invisibly to every specifier check (CR-4). */
const COMPUTED_LOAD = /\b(?:import|require)\s*\(\s*(?!["'`])/;
/** Network/process modules — bare OR `node:`-prefixed (the old scan let every `node:` specifier through). */
const NET_MODULE = /^(?:node:)?(?:http|https|http2|net|tls|dns|dgram|child_process)$/;
/** The one member of NET_MODULE the PROCESS allowlist may exempt (r8). */
const PROCESS_MODULE = /^(?:node:)?child_process$/;
/** An absolute URL literal, to check its host against loopback. */
const URL_LITERAL = /["'`]((?:https?|wss?):\/\/(\[[^\]]+\]|[^/"'`:?#\s$]+|\$\{[^}]*\})(?::\d+)?[^"'`\s]*)["'`]/g; // host: `[::1]` | name/IPv4 | `${…}`

// ── the tokenizer (CR-4) ──────────────────────────────────────────────────────────────────────────────
export interface Tokenized {
  /** Comments removed; string/template TEXT kept (needed for import specifiers and URL literals); regex literals blanked. */
  code: string;
  /** Comments removed; string/template TEXT blanked (so prose in a message never looks like a call); regex literals blanked. */
  blanked: string;
}

const REGEX_PREV = new Set([..."(,=:[!&|?{};+-*%<>~^"]);
const REGEX_KW = new Set(["return", "typeof", "case", "do", "else", "in", "of", "void", "delete", "throw", "new", "yield", "await"]);
const isIdStart = (c: string) => /[A-Za-z_$]/.test(c);
const isIdPart = (c: string) => /[\w$]/.test(c);

/**
 * A small JS/TS lexer — NOT a parser. It understands exactly what the scan needs: line and block comments, single- and
 * double-quoted strings, template literals (including nested `${ … }` code), and regex literals (told apart from division
 * by the previous token). That is what a regex-based comment stripper cannot do: it deleted a later `fetch(` after a
 * string containing `//`, and after a pair of strings holding a block-comment opener and closer.
 */
export function tokenize(src: string): Tokenized {
  let code = "";
  let blanked = "";
  const both = (c: string) => { code += c; blanked += c; };
  type Mode = { kind: "code"; braces: number; tpl: boolean } | { kind: "tpl" };
  const modes: Mode[] = [{ kind: "code", braces: 0, tpl: false }];
  const n = src.length;
  let i = 0;
  let lastSig = ""; // last significant (non-space) char emitted in code mode
  let lastWasKeyword = false;

  while (i < n) {
    const m = modes[modes.length - 1];
    const c = src[i];
    const d = src[i + 1];

    if (m.kind === "tpl") {
      if (c === "\\") { code += src.slice(i, i + 2); i += 2; continue; }
      if (c === "`") { both("`"); modes.pop(); i++; lastSig = "`"; lastWasKeyword = false; continue; }
      if (c === "$" && d === "{") { both("${"); modes.push({ kind: "code", braces: 1, tpl: true }); i += 2; lastSig = "{"; lastWasKeyword = false; continue; }
      code += c; if (c === "\n") blanked += c; // template TEXT: kept in `code`, blanked in `blanked`
      i++;
      continue;
    }

    // ── code mode ──
    if (c === "/" && d === "/") { while (i < n && src[i] !== "\n") i++; continue; }
    if (c === "/" && d === "*") { const e = src.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; both(" "); continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== "\n") j += src[j] === "\\" ? 2 : 1;
      const end = j < n && src[j] === c ? j + 1 : j; // an unterminated string ends at the newline
      code += src.slice(i, end);
      blanked += c + c;
      i = end; lastSig = c; lastWasKeyword = false;
      continue;
    }
    if (c === "`") { both("`"); modes.push({ kind: "tpl" }); i++; continue; }
    if (c === "/") {
      const regexAllowed = lastSig === "" || REGEX_PREV.has(lastSig) || (lastWasKeyword && isIdPart(lastSig));
      if (regexAllowed) {
        let j = i + 1; let inClass = false;
        while (j < n && src[j] !== "\n") {
          if (src[j] === "\\") { j += 2; continue; }
          if (src[j] === "[") inClass = true; else if (src[j] === "]") inClass = false;
          else if (src[j] === "/" && !inClass) break;
          j++;
        }
        if (j < n && src[j] === "/") { both("/ /"); i = j + 1; lastSig = "/"; lastWasKeyword = false; continue; }
      }
      both("/"); i++; lastSig = "/"; lastWasKeyword = false; // division
      continue;
    }
    if (c === "{" && m.tpl) m.braces++;
    if (c === "}" && m.tpl && --m.braces === 0) { both("}"); modes.pop(); i++; lastSig = "}"; lastWasKeyword = false; continue; }
    if (isIdStart(c)) {
      let j = i + 1;
      while (j < n && isIdPart(src[j])) j++;
      const id = src.slice(i, j);
      both(id); i = j; lastSig = id[id.length - 1]; lastWasKeyword = REGEX_KW.has(id);
      continue;
    }
    both(c); i++;
    if (!/\s/.test(c)) { lastSig = c; lastWasKeyword = false; }
  }
  return { code, blanked };
}

/** Comments removed; string text kept (kept for callers that only want comment-stripping). */
export function stripComments(text: string): string {
  return tokenize(text).code;
}

/** Default allowlist key from a path: the last two segments, with `\` normalised to `/` (CR-8). */
function defaultKey(fullPath: string): string {
  return fullPath.replace(/\\/g, "/").split("/").slice(-2).join("/");
}

/** Offenders for ONE file's text. Pure — the unit the planted-violation tests drive. */
export function scanText(
  text: string,
  path: string,
  allowlist: readonly string[] = LOOPBACK_ALLOWLIST,
  relKey?: string,
  processAllowlist: readonly string[] = PROCESS_ALLOWLIST, // r8 — optional, so every pre-existing call keeps its exact behaviour
): string[] {
  const out: string[] = [];
  const { code, blanked } = tokenize(text);
  const key = relKey ?? defaultKey(path);
  const allowed = allowlist.includes(key);
  const mayImportProcess = processAllowlist.includes(key);

  if (NET_PRIMITIVE.test(code)) out.push(`${path}: a socket/server/network primitive`);

  let m: RegExpExecArray | null;
  EXTERNAL_IMPORT.lastIndex = 0;
  while ((m = EXTERNAL_IMPORT.exec(code)) !== null) {
    const spec = m[1] ?? m[2] ?? m[3] ?? "";
    if (!spec) continue;
    if (NET_MODULE.test(spec)) {
      if (mayImportProcess && PROCESS_MODULE.test(spec)) continue; // r8: the ONE process-spawning module — and only the process import
      out.push(`${path}: imports the network/process module "${spec}"`);
    }
    else if (!/^(\.|\/|node:)/.test(spec)) out.push(`${path}: external dependency "${spec}"`);
  }

  if (COMPUTED_LOAD.test(blanked)) out.push(`${path}: a COMPUTED import()/require() — it can load any module, invisibly to every specifier check`);

  if (!allowed) {
    if (NET_CALL.test(blanked)) out.push(`${path}: a network CALL (fetch/http.request/…) outside the loopback allowlist [${allowlist.join(", ")}]`);
    else if (NET_ALIAS.test(blanked)) out.push(`${path}: fetch used as a VALUE or reached through the global object (aliasing/computed access) outside the loopback allowlist [${allowlist.join(", ")}]`);
  } else {
    // The allowlisted module may call the local endpoint — but no absolute URL literal may name anything else.
    URL_LITERAL.lastIndex = 0;
    while ((m = URL_LITERAL.exec(code)) !== null) {
      const host = m[2];
      if (host.startsWith("${")) continue; // an interpolated host is checked at RUNTIME (the resident refuses non-loopback)
      if (!isLoopbackHost(host)) out.push(`${path}: non-loopback URL literal "${m[1]}" in the allowlisted loopback module`);
    }
  }
  return out;
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
 * Scan every source file under each of `dirs`, RECURSIVELY. NEVER VACUOUS: a scan that examined ZERO files fails (the
 * pre-r7 probes "passed" while scanning nothing), and so does a missing directory.
 */
export function zeroNetworkScan(
  dirs: string[],
  okDetail: string,
  allowlist: readonly string[] = LOOPBACK_ALLOWLIST,
  processAllowlist: readonly string[] = PROCESS_ALLOWLIST, // r8 — optional
): NetScanResult {
  const offenders: string[] = [];
  let filesScanned = 0;
  for (const dir of dirs) {
    let isDir = false;
    try {
      isDir = statSync(dir).isDirectory(); // NOT `isFile()` — the exact bug that made the old scan inert
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
      offenders.push(...scanText(readFileSync(f.path, "utf8"), f.path, allowlist, f.key, processAllowlist));
    }
  }
  if (filesScanned === 0) offenders.push("zero-network scan examined ZERO files — a vacuous scan proves nothing (P-VIII)");
  return offenders.length === 0
    ? { ok: true, detail: `${okDetail} [${filesScanned} files scanned]`, offenders, filesScanned }
    : { ok: false, detail: offenders.join("; "), offenders, filesScanned };
}

/** Contract R6 / check (f): the loopback allowlist must have EXACTLY ONE entry. */
export function allowlistIsSingle(list: readonly string[] = LOOPBACK_ALLOWLIST): boolean {
  return list.length === 1;
}

/** r8 (R5 / check i): the process allowlist must ALSO have EXACTLY ONE entry — a second is refused (falsify hook `--extra-process`). */
export function processAllowlistIsSingle(list: readonly string[] = PROCESS_ALLOWLIST): boolean {
  return list.length === 1;
}
