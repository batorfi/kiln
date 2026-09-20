// kiln/validate/_netscan.ts — T013/T014 (Foundational), r7 · NC2=A · D6 · contract R6.
//
// The ONE definition of the P-VIII zero-network scan. Before r7 it existed as three near-copies, and
// (measured, r7) NONE of them could catch a violation in `kiln/src`:
//   · runtime-ready + live-ready guarded their loop with `fileExists(dir)` — but `fileExists` is
//     `statSync(p).isFile()`, FALSE for a directory, so they `continue`d past EVERY directory and scanned
//     NOTHING (a planted external import + `require("http")` in kiln/src left both probes green);
//   · overlay-ready scanned only ui/contracts/validate — never `src`, where the resident lives.
// So the "zero-network (P-VIII) ✓" proof was vacuous since r1. This module fixes that, and on top of it
// adds what r7 needs to SPEND P-VIII's one loopback exception honestly:
//   1. CALL-based detection (a global `fetch`, `http.request`, …) — needs no import, so no import/primitive
//      regex can see it;
//   2. a denylist of network/process modules (`node:http`, `node:net`, `node:child_process`, …) — the old
//      `EXTERNAL_IMPORT` waved every `node:` specifier through;
//   3. a single-entry ALLOWLIST (by kiln-relative path): the only module permitted to reach loopback;
//   4. a loopback-literal assertion on that module: no absolute URL literal may name a non-loopback host;
//   5. a NEVER-VACUOUS guard: scanning zero files is itself a failure.
// It is ADDITIVE: everything the old scan intended to catch, this still catches. No cloud, no server,
// no gate advanced (P-VI). Comments are stripped before matching, so prose about `fetch` never trips it.

import { readFileSync, readdirSync, statSync } from "node:fs";

/** The directories the P-VIII scan covers — `src` included (the old probes never really scanned it). */
export const SCAN_DIRS = ["src", "ui", "validate", "contracts"] as const;

/**
 * The ONLY module(s) permitted to reach the local endpoint, by kiln-relative path (D6). EXACTLY one entry
 * — a second is refused by `allowlistIsSingle` (falsify hook `--extra-loopback`). By path, not bare
 * basename, so a same-named file in another directory does not inherit the exemption.
 */
export const LOOPBACK_ALLOWLIST: readonly string[] = ["src/ollama-resident.ts"];

/** Loopback hosts (P-VIII: `127.0.0.1` is local; the principle targets EXTERNAL round-trips — NC2=A). */
export const LOOPBACK_HOST = /^(?:127(?:\.\d{1,3}){3}|localhost|\[?::1\]?)$/i;

// ── the ORIGINAL patterns, kept verbatim (so nothing the old scan meant to catch is lost) ─────────────
const EXTERNAL_IMPORT = /(?:^|\s)(?:import|export)\s+[^;'"]*?\s+from\s*["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)|import\(\s*["']([^"']+)["']\s*\)/g;
const NET_PRIMITIVE = /\b(?:new\s+(?:Server|Socket|WebSocket))\b|\brequire\(\s*["'](?:http|https|net|dns|tls)["']/;

// ── r7 additions ──────────────────────────────────────────────────────────────────────────────────────
/** A network CALL. `fetch` is a Node global — it needs no import, so import/primitive regexes cannot see it. */
const NET_CALL = /\b(?:fetch|XMLHttpRequest|EventSource)\s*\(|\b(?:https?|http2|net|tls|dns|dgram)\s*\.\s*(?:request|get|connect|createConnection|lookup|resolve\w*|createSocket)\s*\(/;
/** Network/process modules — bare OR `node:`-prefixed (the old scan let every `node:` specifier through). */
const NET_MODULE = /^(?:node:)?(?:http|https|http2|net|tls|dns|dgram|child_process)$/;
/** An absolute URL literal, to check its host against loopback. */
const URL_LITERAL = /["'`]((?:https?|wss?):\/\/(\[[^\]]+\]|[^/"'`:?#\s$]+|\$\{[^}]*\})(?::\d+)?[^"'`\s]*)["'`]/g; // host: `[::1]` | name/IPv4 | `${…}`

/** Strip block comments and `//` line comments (conservatively: a `//` after `:` or a quote is a URL, not a comment). */
export function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

/** kiln-relative path (`src/x.ts`) from a full path — the allowlist key. */
function rel(fullPath: string): string {
  const parts = fullPath.split("/");
  return parts.slice(-2).join("/");
}

/** Offenders for ONE file's text. Pure — the unit the planted-violation tests drive. */
export function scanText(text: string, path: string, allowlist: readonly string[] = LOOPBACK_ALLOWLIST): string[] {
  const out: string[] = [];
  const code = stripComments(text);
  const allowed = allowlist.includes(rel(path));

  if (NET_PRIMITIVE.test(code)) out.push(`${path}: a socket/server/network primitive`);

  let m: RegExpExecArray | null;
  EXTERNAL_IMPORT.lastIndex = 0;
  while ((m = EXTERNAL_IMPORT.exec(code)) !== null) {
    const spec = m[1] ?? m[2] ?? m[3] ?? "";
    if (!spec) continue;
    if (NET_MODULE.test(spec)) out.push(`${path}: imports the network/process module "${spec}"`);
    else if (!/^(\.|\/|node:)/.test(spec)) out.push(`${path}: external dependency "${spec}"`);
  }

  if (NET_CALL.test(code) && !allowed) {
    out.push(`${path}: a network CALL (fetch/http.request/…) outside the loopback allowlist [${allowlist.join(", ")}]`);
  }

  if (allowed) {
    // The allowlisted module may call the local endpoint — but no absolute URL literal may name anything else.
    URL_LITERAL.lastIndex = 0;
    while ((m = URL_LITERAL.exec(code)) !== null) {
      const host = m[2];
      if (host.startsWith("${")) continue; // an interpolated host is checked at RUNTIME (the resident refuses non-loopback)
      if (!LOOPBACK_HOST.test(host)) out.push(`${path}: non-loopback URL literal "${m[1]}" in the allowlisted loopback module`);
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

/**
 * Scan the `.ts` files directly inside each of `dirs` (non-recursive, as before). NEVER VACUOUS: a scan
 * that examined ZERO files fails (the pre-r7 probes "passed" while scanning nothing).
 */
export function zeroNetworkScan(dirs: string[], okDetail: string, allowlist: readonly string[] = LOOPBACK_ALLOWLIST): NetScanResult {
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
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".ts")) continue;
      const p = `${dir}/${f}`;
      filesScanned++;
      offenders.push(...scanText(readFileSync(p, "utf8"), p, allowlist));
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
