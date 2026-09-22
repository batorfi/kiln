// kiln/tests/pi/layout-note.test.ts — T042, r8 · FR-012 · SC-007 · OFFLINE tier.
// The layout note names a home for r9, r10 and r11, and none of those homes is a file r8 owns.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const kiln = fileURLToPath(new URL("../..", import.meta.url)).replace(/[\\/]$/, "");
const readme = readFileSync(join(kiln, "pi", "README.md"), "utf8");

// The files r8 itself created — none of r9/r10/r11's named homes may be one of these.
const R8_FILES = ["pi/port.ts", "pi/outcome.ts", "pi/status.ts", "pi/selftest.ts", "pi/output.ts", "pi/index.ts", "pi/README.md"];

test("SC-007: the note names a home for r9, r10 AND r11", () => {
  for (const row of ["r9", "r10", "r11"]) assert.match(readme, new RegExp(`\\*\\*${row}\\*\\*`), `no ${row} row in the layout table`);
  for (const home of ["kiln/pi/ui/", "kiln/agents/", "kiln/src/director.ts", "kiln/pi/commands/"]) assert.ok(readme.includes(home), `home "${home}" not named`);
});

test("FR-012: none of r9/r10/r11's homes is a file r8 itself owns", () => {
  for (const f of R8_FILES) assert.doesNotMatch(readme.replace(new RegExp(`\\| ${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\|`), ""), new RegExp(`homes?.{0,40}${f}`), `an r8 file (${f}) is listed as a later row's home`);
  // more directly: the "home" column entries themselves must not equal any r8 file
  const homeCells = [...readme.matchAll(/\| `([^`]+)` \*\(new[^)]*\)\*/g)].map((m) => m[1]);
  for (const cell of homeCells) assert.ok(!R8_FILES.includes(cell.replace(/^kiln\//, "")), `home cell "${cell}" is an r8-owned path`);
});

test("layout: r9's UI home and r11's commands home are both marked (new) — they do not exist yet", () => {
  assert.doesNotMatch(readme, /`kiln\/pi\/ui\/`(?!\s*\*\(new)/);
  assert.ok(!existsSync(join(kiln, "pi", "ui")), "kiln/pi/ui/ should not exist before r9");
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
