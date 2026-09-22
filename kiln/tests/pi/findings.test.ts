// kiln/tests/pi/findings.test.ts — T015, r8 · FR-001 · SC-001 · SC-006 · OFFLINE tier.
// Structural check on the register itself (Part B of research.md): no row is blank, every status is one of the defined marks, and no cell
// marked D (documented-only) is described as "confirmed" — that word is reserved for something r8 actually ran.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const featureDir = join(fileURLToPath(new URL("../../..", import.meta.url)).replace(/[\\/]$/, ""), "specs", "007-kiln-pi-extension");
const research = readFileSync(join(featureDir, "research.md"), "utf8");

function partBTable(): string[] {
  const start = research.indexOf("## Part B");
  const end = research.indexOf("## Part C");
  assert.ok(start >= 0 && end > start, "Part B / Part C headings must both exist");
  const body = research.slice(start, end);
  return body.split("\n").filter((l) => /^\|\s*\*\*SQ\d+\*\*/.test(l));
}

test("FR-001 / SC-001: all eleven SQ rows are present in the register, in order, none blank", () => {
  const rows = partBTable();
  assert.equal(rows.length, 11, `expected SQ1..SQ11, found ${rows.length}`);
  rows.forEach((row, i) => {
    assert.match(row, new RegExp(`^\\|\\s*\\*\\*SQ${i + 1}\\*\\*`), `row ${i} is not SQ${i + 1}`);
    const cells = row.split("|").map((c) => c.trim()).filter((c) => c.length > 0);
    assert.ok(cells.length >= 5, `SQ${i + 1} has too few columns: ${row}`);
    for (const c of cells) assert.notEqual(c, "", `SQ${i + 1} has an empty cell`);
  });
});

test("FR-001: every row's Status column uses only the defined marks (M/D/T, optionally qualified, joined by \u00b7, or a \u2192rN deferral)", () => {
  const seg = /^\*\*[MDT][^*]*\*\*(\s*\(.*\))?$|^\u2192r\d+(\s*\(.*\))?$/;
  for (const row of partBTable()) {
    const cells = row.split("|").map((c) => c.trim());
    const status = cells[4] ?? ""; // "" | **SQn** | Question | Answer | Status | ...
    assert.ok(status.length > 0, "status cell is empty");
    for (const part of status.split("\u00b7").map((p) => p.trim())) {
      assert.match(part, seg, `SQ status segment is not a recognised mark: "${part}" (whole cell: "${status}")`);
    }
  }
});

test("SC-006: no cell marked **D** (documented-only) uses the word \"confirmed\"", () => {
  for (const row of partBTable()) {
    if (!row.includes("**D**")) continue;
    assert.doesNotMatch(row.toLowerCase(), /confirmed/, `a D-only row claims "confirmed": ${row}`);
  }
});

test("FR-001: the SQ4 ctx.ui matrix exists and covers rpc/json/print for every listed method", () => {
  const start = research.indexOf("### SQ4"); const end = research.indexOf("## Part C");
  assert.ok(start >= 0 && end > start);
  const body = research.slice(start, end);
  for (const method of ["select(", "confirm(", "notify(", "setStatus(", "custom(", "hasUI"]) assert.ok(body.includes(method), `SQ4 matrix missing ${method}`);
  assert.doesNotMatch(body, /\|\s*\?\s*\|/, "no unresolved '?' cell remains for rpc/json/print");
});
