// kiln/tests/pi/process-allowlist.test.ts — T006, r8 · research D6 · contracts/pi-ready.md R5 · FR-014 · OFFLINE tier.
// `PiReady` must START Pi, so ONE module may import `node:child_process`. The scan forbids that everywhere it looks (measured), and a directory-wide
// exemption would leave a hole big enough for `spawn("curl", …)`. So the exemption is the size of the need — mirroring r7's loopback rule:
// exactly ONE file, keyed by PATH (not basename), enforced by an exactly-one rule, and it exempts ONLY the `child_process` import — every network
// rule still applies to that file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROCESS_ALLOWLIST, processAllowlistIsSingle, LOOPBACK_ALLOWLIST, scanText, zeroNetworkScan } from "../../validate/_netscan.ts";

const SPAWN = 'import { spawn } from "node:child_process";\nexport const go = () => spawn("pi", ["--version"], { shell: false });\n';
const DRIVER = "/x/kiln/validate/_pi-driver.ts";

test("R5: PROCESS_ALLOWLIST is EXACTLY ONE entry — `validate/_pi-driver.ts` — and an empty list or a second entry is refused", () => {
  assert.deepEqual([...PROCESS_ALLOWLIST], ["validate/_pi-driver.ts"]);
  assert.equal(processAllowlistIsSingle(PROCESS_ALLOWLIST), true);
  assert.equal(processAllowlistIsSingle([...PROCESS_ALLOWLIST, "validate/other.ts"]), false, "a SECOND entry is refused");
  assert.equal(processAllowlistIsSingle([]), false, "an EMPTY list is not 'exactly one' either");
});

test("R5: the allowlisted file may import child_process — `node:` prefixed, bare, named or default", () => {
  for (const src of [
    SPAWN,
    'import cp from "node:child_process";\nexport const x = cp;\n',
    'import { spawnSync } from "child_process";\nexport const x = spawnSync;\n',
  ]) assert.deepEqual(scanText(src, DRIVER), [], src);
});

test("R5: the SAME text anywhere else is flagged — by PATH, not basename (the CR-8 rule)", () => {
  for (const other of ["/x/kiln/validate/other.ts", "/x/kiln/src/_pi-driver.ts", "/x/kiln/ui/_pi-driver.ts", "/x/kiln/pi/_pi-driver.ts", "/x/kiln/validate/sub/_pi-driver.ts", "/x/kiln/tests/x.ts"]) {
    const off = scanText(SPAWN, other);
    assert.ok(off.some((o) => /network\/process module "node:child_process"/.test(o)), `${other} must NOT inherit the exemption: ${JSON.stringify(off)}`);
  }
});

test("R5: an explicit scan key decides, not the path — zeroNetworkScan's `<dir>/<subpath>` key", () => {
  assert.deepEqual(scanText(SPAWN, "/anywhere/at/all.ts", LOOPBACK_ALLOWLIST, "validate/_pi-driver.ts"), []);
  assert.ok(scanText(SPAWN, "/x/kiln/validate/_pi-driver.ts", LOOPBACK_ALLOWLIST, "src/_pi-driver.ts").length >= 1);
});

test("R5: the exemption is ONLY the child_process import — every NETWORK rule still applies to the allowlisted file", () => {
  assert.ok(scanText('import http from "node:http";', DRIVER).length >= 1, "node:http is still flagged");
  assert.ok(scanText('import net from "node:net";', DRIVER).length >= 1, "node:net is still flagged");
  assert.ok(scanText('const r = await fetch("http://127.0.0.1:11434/x");', DRIVER).length >= 1, "fetch( is still flagged — this file is NOT the loopback module");
  assert.ok(scanText("const s = new Socket();", DRIVER).length >= 1, "a socket primitive is still flagged");
  assert.ok(scanText('import x from "left-pad";', DRIVER).some((o) => /external dependency "left-pad"/.test(o)), "an external dependency is still flagged");
  assert.ok(scanText("const m = await import(name);", DRIVER).some((o) => /COMPUTED import/.test(o)), "a computed import() is still flagged");
});

test("R5: the two exemptions do not ride on each other — the LOOPBACK module may not spawn, the DRIVER may not dial", () => {
  assert.ok(scanText(SPAWN, "/x/kiln/src/ollama-resident.ts").length >= 1, "src/ollama-resident.ts (loopback) may NOT import child_process");
  assert.ok(scanText('const r = await fetch("http://127.0.0.1:11434/api");', DRIVER).length >= 1, "the driver may NOT dial even loopback");
});

test("R5: a custom process allowlist is honoured (the fifth parameter) — and a 2-entry list is what `--extra-process` feeds the probe", () => {
  assert.deepEqual(scanText(SPAWN, "/x/kiln/validate/other.ts", LOOPBACK_ALLOWLIST, undefined, ["validate/other.ts"]), []);
  assert.ok(scanText(SPAWN, DRIVER, LOOPBACK_ALLOWLIST, undefined, ["validate/other.ts"]).length >= 1, "an allowlist that does not name the driver does not exempt it");
});

test("R5: through zeroNetworkScan — the driver's spawn is clean, a stranger's spawn is an offender", () => {
  const root = mkdtempSync(join(tmpdir(), "kiln-procscan-"));
  try {
    mkdirSync(join(root, "validate"));
    writeFileSync(join(root, "validate", "_pi-driver.ts"), SPAWN);
    const ok = zeroNetworkScan([join(root, "validate")], "clean");
    assert.equal(ok.ok, true, ok.detail);
    assert.equal(ok.filesScanned, 1);
    writeFileSync(join(root, "validate", "stranger.ts"), SPAWN);
    const bad = zeroNetworkScan([join(root, "validate")], "clean");
    assert.equal(bad.ok, false);
    assert.match(bad.detail, /stranger\.ts.*child_process/);
    assert.doesNotMatch(bad.detail, /_pi-driver\.ts/, "only the stranger is named");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("FR-013: nothing existing moved — the same spawn in src/ is flagged with the SAME message as before r8", () => {
  const off = scanText(SPAWN, "/x/kiln/src/a.ts");
  assert.deepEqual(off, ['/x/kiln/src/a.ts: imports the network/process module "node:child_process"']);
});
