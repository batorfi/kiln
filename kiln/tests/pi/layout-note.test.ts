// kiln/tests/pi/layout-note.test.ts — T042, r8 · updated T033, r9 · FR-012 · SC-007 · OFFLINE tier.
// The layout note named a home for r9, r10 and r11 (r8's own projection); r9 has since delivered its own home for real
// (kiln/pi/ui/ now exists) — this pins the DELIVERED state for r9 and the still-PROJECTED state for r10/r11, and confirms
// none of r10/r11's still-projected homes collide with anything r8 or r9 actually created.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const kiln = fileURLToPath(new URL("../..", import.meta.url)).replace(/[\\/]$/, "");
const readme = readFileSync(join(kiln, "pi", "README.md"), "utf8");

// The files r8/r9 themselves created — none of r10/r11's named PROJECTED homes may be one of these.
const R8_FILES = ["pi/port.ts", "pi/outcome.ts", "pi/status.ts", "pi/selftest.ts", "pi/output.ts", "pi/index.ts", "pi/README.md"];
const R9_FILES = ["pi/ui/present.ts", "pi/ui/identity.ts", "pi/ui/live-ctx.ts", "pi/ui/keys.ts"];

test("SC-007: the note names r9 (delivered) and still-projected homes for r10 AND r11", () => {
  assert.match(readme, /kiln\/pi\/ui\//, "r9's delivered home (kiln/pi/ui/) is not named");
  for (const row of ["r10", "r11"]) assert.match(readme, new RegExp(`\\*\\*${row}\\*\\*`), `no ${row} row in the layout table`);
  for (const home of ["kiln/agents/", "kiln/src/director.ts", "kiln/pi/commands/"]) assert.ok(readme.includes(home), `home "${home}" not named`);
});

test("FR-012: none of r10/r11's still-projected homes is a file r8 or r9 itself owns", () => {
  const homeCells = [...readme.matchAll(/\| `([^`]+)` \*\(new[^)]*\)\*/g)].map((m) => m[1].replace(/^kiln\//, ""));
  for (const cell of homeCells) {
    assert.ok(!R8_FILES.includes(cell), `home cell "${cell}" is an r8-owned path`);
    assert.ok(!R9_FILES.includes(cell), `home cell "${cell}" is an r9-owned path`);
  }
});

test("layout: r9's UI home is DELIVERED (exists for real, not merely marked (new)); r10/r11's homes are still projected, not built", () => {
  assert.ok(existsSync(join(kiln, "pi", "ui")), "kiln/pi/ui/ should exist — r9 delivered it");
  for (const f of R9_FILES) assert.ok(existsSync(join(kiln, ...f.split("/"))), `${f} should exist — r9 delivered it`);
  assert.ok(!existsSync(join(kiln, "pi", "commands")), "kiln/pi/commands/ should not exist before r11");
  assert.ok(!existsSync(join(kiln, "agents")), "kiln/agents/ should not exist before r10");
});

test("layout: the note states the LiveUICtx -> Pi mapping (setStatus, raiseOverlay/custom) for r9", () => {
  assert.match(readme, /setStatus\(key, text\)/);
  assert.match(readme, /ctx\.ui\.custom/);
  assert.match(readme, /raiseOverlay/);
});

test("layout: the three 'do not' rules are all present (never import Pi, never a timeout on a gate, never confirm for a gate)", () => {
  assert.match(readme, /[Nn]ever import Pi/);
  assert.match(readme, /[Nn]ever pass a `timeout`/);
  assert.match(readme, /[Nn]ever use `ctx\.ui\.confirm`/);
});

test("layout: every relative markdown link in the note resolves", () => {
  const links = [...readme.matchAll(/\]\((?!https?:)([^)]+)\)/g)].map((m) => m[1].split("#")[0]).filter(Boolean);
  assert.ok(links.length > 0, "the note should link to at least the correction banner and the contract");
  for (const link of links) assert.ok(existsSync(join(kiln, "pi", link)), `broken link: ${link}`);
});
