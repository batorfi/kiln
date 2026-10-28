// r15 T051 — captures the first program's committed walks as event streams (research R10, Clarification Q3). Run by hand, once:
//     node spikes/015-capture-walks/capture.ts
// This directory is outside `kiln/` (which may not import `legacy/`) and outside `legacy/` (which must stay byte-identical): it READS the frozen walkers and the committed r7 files and WRITES into
// kiln/fixtures/walks/:
//     <name>.jsonl         the original factory-log, byte for byte
//     <name>.events.jsonl  the converted events, one canonical JSON envelope per line
//     <name>.refs.json     texts a reference in the stream names ({} — none of these walks has a note)
//     <name>.meta.json     how it was made, from which walker, and what its verdict must be
// It NEVER invents a stream: a walk it cannot capture is printed as missing, with the reason. It prints a table of what it did.
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { streamToEvents } from "../../kiln/packages/record/src/legacy-convert.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const out = join(root, "kiln", "fixtures", "walks");
mkdirSync(out, { recursive: true });
const sha = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");
const { buildStubWalk, buildProgramWalk } = await import(join(root, "legacy", "src", "walk.ts"));

interface Captured { name: string; row: string; walker: string; options: unknown; lines: string[]; expect: "valid" | "R3"; note: string }
const captured: Captured[] = [
  { name: "r2-stub-walk", row: "r2", walker: "legacy/src/walk.ts buildStubWalk()", options: {}, lines: (await buildStubWalk()).lines, expect: "valid", note: "the stub rail walk of the lane runtime (specs/002-kiln-lane): lane transitions, a swap and its cost, a human decision, a pre-delegation, a wait" },
  { name: "r3-program-walk", row: "r3", walker: "legacy/src/walk.ts buildProgramWalk()", options: {}, lines: buildProgramWalk().lines, expect: "valid", note: "a closed-row program walk of the roadmap overlay (specs/003-kiln-roadmap-overlay): a row closed at Gate 9, the admission at gate0, gate0 re-entered" },
  { name: "r3-program-walk-broken", row: "r3", walker: "legacy/src/walk.ts buildProgramWalk({ brokenAutoApprove: true })", options: { brokenAutoApprove: true }, lines: buildProgramWalk({ brokenAutoApprove: true }).lines, expect: "R3", note: "the same walk with the gate-0 decider stripped: kept because it MUST fail the first program's no-silent-approval rule (R3)" },
];
for (const [name, file, expect] of [["r7-live-inference", "r7-live-inference.jsonl", "valid"], ["r7-live-broken", "r7-live-broken.jsonl", "R3"]] as const) {
  const text = readFileSync(join(root, "legacy", "fixtures", file), "utf8");
  captured.push({ name, row: "r7", walker: `legacy/fixtures/${file} (committed; captured from a real local model by the first program)`, options: {}, lines: text.split("\n").filter(Boolean), expect, note: expect === "valid" ? "the committed live-inference walk (specs/006-kiln-live-inference)" : "its no-decidedBy sibling: kept because it MUST fail R3" });
}

const table: string[] = [];
for (const c of captured) {
  const original = c.lines.map((l) => `${l}\n`).join("");
  const events = streamToEvents(c.lines, c.name);
  const eventsText = events.map((e) => `${JSON.stringify(e)}\n`).join("");
  writeFileSync(join(out, `${c.name}.jsonl`), original);
  writeFileSync(join(out, `${c.name}.events.jsonl`), eventsText);
  writeFileSync(join(out, `${c.name}.refs.json`), "{}\n");
  writeFileSync(join(out, `${c.name}.meta.json`), JSON.stringify({ name: c.name, row: c.row, walker: c.walker, options: c.options, originalSha256: sha(original), eventsSha256: sha(eventsText), records: c.lines.length, derivedBy: "spikes/015-capture-walks/capture.ts (record/src/legacy-convert.ts)", capturedOn: "2026-10-28", expect: c.expect, note: c.note }, null, 2) + "\n");
  table.push(`  captured  ${c.row}  ${c.name.padEnd(24)} ${String(c.lines.length).padStart(3)} records  expect ${c.expect}`);
}
// the rows the program names that have NO original stream: reported, never built
const missing = [
  ["r1", "scaffold", "legacy/tests/contract/log.test.ts holds single per-line records for the schema test, not a whole stream; the scaffold row wrote no walk"],
  ["r8", "Pi extension", "legacy/pi/outcome.ts states the extension does not touch the factory-log; no stream of its own was found"],
];
writeFileSync(join(out, "MISSING.json"), JSON.stringify(Object.fromEntries(missing.map(([r, n, why]) => [r, `${n}: ${why}`])), null, 2) + "\n");
console.log(`captured ${captured.length} streams into kiln/fixtures/walks/\n${table.join("\n")}\nmissing (reported, not built):\n${missing.map(([r, n, why]) => `  missing   ${r}  ${n.padEnd(14)} ${why}`).join("\n")}`);
