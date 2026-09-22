// kiln/tests/pi/scan-pi.test.ts — T005, r8 · research D1 / D6 · FR-014 · OFFLINE tier (needs no Pi).
// `kiln/pi/` is the ONE place Pi's shape appears in KILN, so it must be INSIDE the P-VIII scan like `kiln/src`. And the scan is what makes D1
// ("KILN imports nothing from Pi") a measured necessity rather than a taste: it flags ANY non-relative, non-`node:` specifier — type-only imports included.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCAN_DIRS, scanText, zeroNetworkScan } from "../../validate/_netscan.ts";

const kiln = fileURLToPath(new URL("../..", import.meta.url)).replace(/[\\/]$/, "");

test("FR-014: `pi` is a scanned directory (so the extension code is policed like kiln/src)", () => {
  assert.ok((SCAN_DIRS as readonly string[]).includes("pi"), `SCAN_DIRS = ${SCAN_DIRS.join(", ")}`);
});

test("FR-014: the scan over the REAL kiln/pi is green and NEVER vacuous (it examined at least one file)", () => {
  const r = zeroNetworkScan([join(kiln, "pi")], "kiln/pi is clean");
  assert.equal(r.ok, true, r.detail);
  assert.ok(r.filesScanned >= 1, "a scan that examined ZERO files proves nothing (P-VIII)");
});

test("D1 (the measured evidence): a planted TYPE-ONLY Pi import is flagged as an external dependency — which is why KILN declares its own port", () => {
  const off = scanText('import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";\nexport default function (pi: ExtensionAPI) {}\n', "/x/kiln/pi/index.ts");
  assert.equal(off.length, 1, JSON.stringify(off));
  assert.match(off[0], /external dependency "@earendil-works\/pi-coding-agent"/);
});

test("D6: `child_process` is flagged anywhere in kiln/pi — the extension itself never spawns anything", () => {
  const off = scanText('import { spawn } from "node:child_process";\nspawn("pi", []);\n', "/x/kiln/pi/x.ts");
  assert.ok(off.some((o) => /network\/process module "node:child_process"/.test(o)), JSON.stringify(off));
});

test("FR-014: the network rules apply to kiln/pi — `fetch(` and `node:http` are flagged (only r7's one loopback module is exempt)", () => {
  assert.ok(scanText('const r = await fetch("http://127.0.0.1:11434/x");', "/x/kiln/pi/status.ts").length >= 1);
  assert.ok(scanText('import http from "node:http";', "/x/kiln/pi/status.ts").length >= 1);
});
