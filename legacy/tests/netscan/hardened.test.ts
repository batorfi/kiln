// kiln/tests/netscan/hardened.test.ts — T039 (US4), r7 · SC-007 (S3) · OFFLINE tier.
// The hardened P-VIII scan catches what the pre-r7 scan provably missed. The "before" evidence is EXECUTABLE:
// the ORIGINAL regexes are reproduced verbatim below, so this file demonstrates the gap rather than asserting it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { scanText, zeroNetworkScan, SCAN_DIRS } from "../../validate/_netscan.ts";

// ── the PRE-r7 patterns, VERBATIM (runtime-ready.ts / overlay-ready.ts / live-ready.ts) ──
const OLD_EXTERNAL_IMPORT = /(?:^|\s)(?:import|export)\s+[^;'"]*?\s+from\s*["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)|import\(\s*["']([^"']+)["']\s*\)/g;
const OLD_NET_PRIMITIVE = /\b(?:new\s+(?:Server|Socket|WebSocket))\b|\brequire\(\s*["'](?:http|https|net|dns|tls)["']/;
function oldScanFlags(text: string): boolean {
  if (OLD_NET_PRIMITIVE.test(text)) return true;
  let m: RegExpExecArray | null; OLD_EXTERNAL_IMPORT.lastIndex = 0;
  while ((m = OLD_EXTERNAL_IMPORT.exec(text)) !== null) { const spec = m[1] ?? m[2] ?? m[3] ?? ""; if (spec && !/^(\.|\/|node:)/.test(spec)) return true; }
  return false;
}

const LOOPBACK_FETCH = `export async function leak(h: string) { return fetch(\`http://\${h}/api/chat\`); }`;
const REMOTE_FETCH = `export async function leak() { return fetch("https://api.example.com/v1/chat"); }`;

test("S3 baseline: the OLD scan is BLIND to a bare `fetch` — no import, no primitive — even to a REMOTE host", () => {
  assert.equal(oldScanFlags(REMOTE_FETCH), false, "the pre-r7 regexes do not trip on a remote fetch (the gap r7 closes)");
  assert.equal(oldScanFlags(LOOPBACK_FETCH), false);
});

test("S3 (SC-007): the HARDENED scan catches a planted `fetch(` in a NON-allowlisted kiln/src module — NAMED", () => {
  for (const src of [REMOTE_FETCH, LOOPBACK_FETCH]) {
    const off = scanText(src, "/x/kiln/src/planted.ts");
    assert.equal(off.length >= 1, true, "caught");
    assert.match(off.join("\n"), /planted\.ts: a network CALL/, "…and NAMES the file");
  }
});

test("S3: every network CALL shape is caught, not just fetch", () => {
  for (const [src, why] of [
    ["const r = await fetch(u);", "fetch"],
    ["http.request({ host: 'x' }, cb);", "http.request"],
    ["https.get('x', cb);", "https.get"],
    ["net.connect(80, 'x');", "net.connect"],
    ["dns.lookup('x', cb);", "dns.lookup"],
    ["const x = new XMLHttpRequest();", "XMLHttpRequest"],
    ["const s = new EventSource(u);", "EventSource"],
  ] as const) assert.ok(scanText(src, "/x/kiln/ui/p.ts").length >= 1, `${why} must be caught`);
});

test("S3: prose is not code — a comment mentioning fetch( / http.request( never trips the scan", () => {
  const src = `// we never call fetch(url) here, nor http.request(opts)\n/* fetch(x) is forbidden */\nexport const ok = 1;`;
  assert.deepEqual(scanText(src, "/x/kiln/src/prose.ts"), []);
});

test("SC-007: the scan is NEVER VACUOUS — the pre-r7 guard `fileExists(dir)` was `isFile()`, false for every directory", (t) => {
  const dir = fileURLToPath(new URL("../../src", import.meta.url));
  assert.equal(statSync(dir).isFile(), false, "a directory is not a file: the old guard `!fileExists(dir) → continue` skipped EVERY directory");
  // …so the old runtime-ready/live-ready scans examined ZERO files and passed. The shared scan refuses to:
  const empty = mkdtempSync(join(tmpdir(), "kiln-netscan-empty-"));
  t.after(() => rmSync(empty, { recursive: true, force: true }));
  assert.equal(zeroNetworkScan([empty], "x").ok, false, "scanning zero files is a FAILURE");
  assert.match(zeroNetworkScan([empty], "x").detail, /ZERO files/);
  assert.equal(zeroNetworkScan(["/no/such/dir"], "x").ok, false, "a missing directory is a FAILURE, not a skip");
});

test("SC-007: a directory-level scan finds a planted violation the old probes provably missed", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "kiln-netscan-plant-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src", "planted.ts"), `import leftPad from "left-pad";\nconst s = require("http");\n${REMOTE_FETCH}\n`);
  const r = zeroNetworkScan([join(dir, "src")], "ok");
  assert.equal(r.ok, false);
  assert.equal(r.filesScanned, 1, "the file was actually examined");
  assert.match(r.detail, /external dependency "left-pad"/);
  assert.match(r.detail, /network primitive/);
  assert.match(r.detail, /network CALL/);
});

test("SC-007: the REAL tree scans clean — and really scans (a non-trivial number of files)", () => {
  const root = fileURLToPath(new URL("../..", import.meta.url)).replace(/\/$/, "");
  const r = zeroNetworkScan(SCAN_DIRS.map((d) => `${root}/${d}`), "ok");
  assert.equal(r.ok, true, r.detail);
  assert.ok(r.filesScanned >= 25, `expected to examine the whole kiln tree, examined ${r.filesScanned}`);
});
