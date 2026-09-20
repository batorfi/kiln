// kiln/tests/netscan/strictly-stronger.test.ts — T041 (US4), r7 · NC2=A · D6 · OFFLINE tier.
// The hardening is ADDITIVE: everything the pre-r7 scan meant to catch, the new one still catches — and it
// catches strictly more. "Spending the loopback exception" is only honest if the guard ends up STRONGER.
import { test } from "node:test";
import assert from "node:assert/strict";
import { scanText } from "../../validate/_netscan.ts";

// the PRE-r7 patterns, verbatim
const OLD_EXTERNAL_IMPORT = /(?:^|\s)(?:import|export)\s+[^;'"]*?\s+from\s*["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)|import\(\s*["']([^"']+)["']\s*\)/g;
const OLD_NET_PRIMITIVE = /\b(?:new\s+(?:Server|Socket|WebSocket))\b|\brequire\(\s*["'](?:http|https|net|dns|tls)["']/;
function oldFlags(text: string): boolean {
  if (OLD_NET_PRIMITIVE.test(text)) return true;
  let m: RegExpExecArray | null; OLD_EXTERNAL_IMPORT.lastIndex = 0;
  while ((m = OLD_EXTERNAL_IMPORT.exec(text)) !== null) { const s = m[1] ?? m[2] ?? m[3] ?? ""; if (s && !/^(\.|\/|node:)/.test(s)) return true; }
  return false;
}
const P = "/x/kiln/src/planted.ts";

// A corpus of things the OLD scan caught. The property: old-caught ⊆ new-caught.
const OLD_POSITIVES = [
  'import leftPad from "left-pad";',
  'import { a } from "some-pkg/sub";',
  'export * from "left-pad";',
  'const x = require("left-pad");',
  'const m = await import("left-pad");',
  'const h = require("http");',
  'const h = require("https");',
  'const n = require("net");',
  'const d = require("dns");',
  'const t = require("tls");',
  "const s = new WebSocket(u);",
  "const s = new Server();",
  "const s = new Socket();",
];

test("strictly stronger (1/2): EVERY pattern the old scan caught is STILL caught", () => {
  for (const src of OLD_POSITIVES) {
    assert.equal(oldFlags(src), true, `precondition: the OLD scan flags: ${src}`);
    assert.ok(scanText(src, P).length >= 1, `the NEW scan must still flag: ${src}`);
  }
});

test("strictly stronger (2/2): it catches STRICTLY MORE — things the old scan waved through", () => {
  const newlyCaught = [
    "const r = await fetch(url);",
    'import http from "node:http";', // the old scan let EVERY `node:` specifier through
    'import https from "node:https";',
    'import net from "node:net";',
    'import { connect } from "node:tls";',
    'import { spawn } from "node:child_process";', // a subprocess is a network/process escape hatch too
    'import dns from "node:dns";',
    "http.request(opts, cb);",
    "https.get(u, cb);",
    "const x = new XMLHttpRequest();",
  ];
  let strictly = 0;
  for (const src of newlyCaught) {
    assert.equal(oldFlags(src), false, `precondition: the OLD scan missed: ${src}`);
    assert.ok(scanText(src, P).length >= 1, `the NEW scan must catch: ${src}`);
    strictly++;
  }
  assert.equal(strictly, newlyCaught.length);
});

test("it does NOT over-reach: legitimate relative imports, `node:fs`/`node:url`/`node:path`, and prose are all clean", () => {
  const clean = [
    'import { a } from "./lane.ts";',
    'import { b } from "../src/types.ts";',
    'import { readFileSync } from "node:fs";',
    'import { fileURLToPath } from "node:url";',
    'import { join } from "node:path";',
    "const url = new URL('../src', import.meta.url);", // a RELATIVE file URL, not a network target
    "// fetch(u) and http.request(o) are forbidden — this is a comment",
  ];
  for (const src of clean) assert.deepEqual(scanText(src, P), [], `must be clean: ${src}`);
});
