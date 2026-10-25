// kiln/tests/pi/layout.test.ts — T032, r8 · SC-009 · NC2 = A + B · contracts/pi-extension.md E2, S1 · OFFLINE tier.
// KILN is loaded by `-e` AND by a Pi package manifest; it is never auto-loaded from `.pi/extensions/` (that would load KILN into every Pi
// session in this repo, including the ones building KILN). And KILN imports nothing from Pi, anywhere.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const kiln = fileURLToPath(new URL("../..", import.meta.url)).replace(/[\\/]$/, "");
const repo = join(kiln, "..");
const pkg = JSON.parse(readFileSync(join(kiln, "package.json"), "utf8"));

test("E2: kiln/package.json declares exactly the Pi manifest — one extension entry, ./pi/index.ts", () => {
  assert.deepEqual(pkg.pi, { extensions: ["./pi/index.ts"] });
  assert.ok(existsSync(join(kiln, "pi", "index.ts")));
});

test("SC-009: dependencies stays {} — the manifest adds no runtime dependency", () => {
  assert.deepEqual(pkg.dependencies, {});
});

test("SC-009: no .pi/extensions/ entry for KILN exists anywhere in the repository", () => {
  const dir = join(repo, ".pi", "extensions");
  if (!existsSync(dir)) return; // no such directory at all is trivially fine
  const walk = (d: string): string[] => readdirSync(d).flatMap((e) => {
    const p = join(d, e);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  const files = walk(dir).filter((f) => f.endsWith(".ts"));
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    assert.doesNotMatch(text, /kiln\/pi\/index/, `${f} appears to auto-load KILN`);
  }
});

test("S1: no SOURCE file (src/ui/validate/contracts/pi/index.ts) names an @earendil-works/* specifier — not even a type-only import", () => {
  // Restricted to the scanned source directories, not tests/: test fixtures legitimately construct that specifier AS A STRING to test the
  // scanner itself (scan-pi.test.ts). Real source never does.
  const walk = (d: string): string[] => readdirSync(d).flatMap((e) => {
    if (e === "node_modules" || e.startsWith(".")) return [];
    const p = join(d, e);
    return statSync(p).isDirectory() ? walk(p) : (e.endsWith(".ts") ? [p] : []);
  });
  const sourceFiles = ["src", "ui", "validate", "contracts", "pi"].flatMap((d) => (existsSync(join(kiln, d)) ? walk(join(kiln, d)) : []));
  sourceFiles.push(join(kiln, "index.ts"));
  for (const f of sourceFiles) {
    const text = readFileSync(f, "utf8");
    // an ACTUAL import/require/dynamic-import of the specifier — not prose in a comment explaining why it's forbidden (port.ts cites it verbatim as evidence)
    assert.doesNotMatch(text, /(?:import|export)\s+[^;]*?\bfrom\s*["']@earendil-works\/|require\(\s*["']@earendil-works\/|import\(\s*["']@earendil-works\//, `${f} imports Pi directly`);
  }
});

test("layout: the scripts.test.ts CR-1 check (every script target exists) still passes with the new manifest present", () => {
  // The manifest key sits beside `scripts` in the same package.json; this guards against a stray edit breaking that unrelated, existing contract.
  for (const [name, cmd] of Object.entries(pkg.scripts as Record<string, string>)) {
    const m = /^node\s+(?:--\S+\s+)*(\S+)/.exec(cmd);
    assert.ok(m, `script "${name}" must be a plain node command: ${cmd}`);
    assert.ok(existsSync(join(kiln, m[1])), `script "${name}" -> "${m[1]}" missing`);
  }
});
