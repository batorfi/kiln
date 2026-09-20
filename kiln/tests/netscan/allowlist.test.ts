// kiln/tests/netscan/allowlist.test.ts — T040 (US4), r7 · FR-011 · contract R6 (S3) · OFFLINE tier.
// EXACTLY ONE module may reach the local endpoint, allowlisted by kiln-relative PATH; a second entry is refused;
// and the one allowed module may not name a non-loopback host.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { scanText, LOOPBACK_ALLOWLIST, LOOPBACK_HOST, allowlistIsSingle } from "../../validate/_netscan.ts";
import { isLoopbackHost } from "../../src/ollama-resident.ts";

const FETCH_LOOPBACK = "export const go = (h: string) => fetch(`http://${h}/api/chat`);";
const REAL = fileURLToPath(new URL("../../src/ollama-resident.ts", import.meta.url));

test("FR-011: the allowlist has EXACTLY ONE entry — the resident, by kiln-relative path", () => {
  assert.deepEqual([...LOOPBACK_ALLOWLIST], ["src/ollama-resident.ts"]);
  assert.equal(allowlistIsSingle(LOOPBACK_ALLOWLIST), true);
  assert.equal(allowlistIsSingle([...LOOPBACK_ALLOWLIST, "src/other.ts"]), false, "a SECOND entry is refused (--extra-loopback)");
  assert.equal(allowlistIsSingle([]), false, "an EMPTY allowlist is not 'exactly one' either");
});

test("R6: the allowlisted module PASSES by name — the REAL resident makes network calls and is not flagged", () => {
  const real = readFileSync(REAL, "utf8");
  assert.match(real.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1"), /\bfetch\s*\(/, "precondition: the real resident DOES call fetch");
  assert.deepEqual(scanText(real, REAL), [], "…and the scan accepts it, because it is the ONE allowlisted module");
});

test("R6: the exemption is by PATH — the same code in ANY OTHER module is caught, even one with the same basename", () => {
  assert.deepEqual(scanText(FETCH_LOOPBACK, "/x/kiln/src/ollama-resident.ts"), [], "the allowlisted path passes");
  for (const other of ["/x/kiln/src/other.ts", "/x/kiln/ui/ollama-resident.ts", "/x/kiln/validate/ollama-resident.ts", "/x/kiln/src/sub/ollama-resident.ts"]) {
    const off = scanText(FETCH_LOOPBACK, other);
    assert.ok(off.some((o) => /network CALL/.test(o)), `${other} must NOT inherit the exemption`);
  }
});

test("R6: even the allowlisted module may not name a NON-loopback host in an absolute URL literal", () => {
  const remote = 'export const go = () => fetch("https://api.example.com/v1/chat");';
  const off = scanText(remote, "/x/kiln/src/ollama-resident.ts");
  assert.ok(off.some((o) => /non-loopback URL literal "https:\/\/api\.example\.com/.test(o)), "a remote literal in the allowlisted module is caught");
  for (const ok of ['"http://127.0.0.1:11434/api/chat"', '"http://localhost:8080/x"', '"http://[::1]:11434/x"']) {
    assert.deepEqual(scanText(`export const u = ${ok};`, "/x/kiln/src/ollama-resident.ts"), [], `${ok} is loopback`);
  }
});

test("the allowlist does NOT excuse the OTHER rules — the allowlisted module still may not import a network module or a dependency", () => {
  for (const bad of ['import http from "node:http";', 'import { spawn } from "node:child_process";', 'import x from "left-pad";', 'const s = require("http");']) {
    assert.ok(scanText(bad, "/x/kiln/src/ollama-resident.ts").length >= 1, `${bad} must still be caught in the allowlisted module`);
  }
});

test("drift guard: the scan's loopback definition and the resident's agree on every host", () => {
  for (const h of ["127.0.0.1", "127.5.5.5", "localhost", "LOCALHOST", "::1", "[::1]", "0.0.0.0", "10.0.0.5", "192.168.1.9", "example.com", "127.0.0.1.evil.com", "localhost.evil.com"]) {
    assert.equal(LOOPBACK_HOST.test(h), isLoopbackHost(h), `the two definitions must agree on "${h}"`);
  }
  assert.equal(isLoopbackHost("127.0.0.1.evil.com"), false, "a look-alike host is not loopback");
});
