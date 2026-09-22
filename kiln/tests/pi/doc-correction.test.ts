// kiln/tests/pi/doc-correction.test.ts — T014, r8 · FR-002 · SC-006 · OFFLINE tier (needs no Pi).
// `docs/concepts/ui-layers-deep.md` §10 called `ctx.ui.headless` "confirmed" and §11 left seven questions open — all written from Pi's DOCUMENTATION and
// never run. r8 ran them. The correction is an APPEND-ONLY banner (the r7 `<!-- r7-correction -->` pattern; P-VII: recorded, never rewritten): the
// original text must survive BYTE-FOR-BYTE, so this hashes it. If someone "fixes" §10 in place instead of correcting it, this fails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(fileURLToPath(new URL("../..", import.meta.url)).replace(/[\\/]$/, ""), "..");
const doc = readFileSync(join(repo, "docs", "concepts", "ui-layers-deep.md"), "utf8");

/** SHA-256 of the design doc as it stood BEFORE r8 (trailing whitespace trimmed) — recorded 2026-09-21 at commit 28897f8. */
const ORIGINAL_SHA256 = "f5e106d029728bc5e706a383a58a0b875d405e6274708771daa602d12684eb6f";
const BLOCK = /\n<!-- r8-correction -->[\s\S]*?<!-- \/r8-correction -->\n/;

test("FR-002: the r8 correction banner is present, exactly once, delimited by start and end markers", () => {
  assert.equal(doc.split("<!-- r8-correction -->").length - 1, 1, "exactly one start marker");
  assert.equal(doc.split("<!-- /r8-correction -->").length - 1, 1, "exactly one end marker");
  assert.match(doc, BLOCK);
});

test("FR-002 / P-VII: the ORIGINAL text is preserved verbatim — remove the banner and the file hashes to what it was before r8", () => {
  const original = doc.replace(BLOCK, "");
  assert.equal(createHash("sha256").update(original.trimEnd()).digest("hex"), ORIGINAL_SHA256, "the design doc was edited in place, not corrected by banner");
});

test("SC-006: the banner names every claim the measurements contradicted or decided, and where the evidence is", () => {
  const banner = BLOCK.exec(doc)?.[0] ?? "";
  for (const needle of [
    "ctx.ui.headless",          // §10 "confirmed" — does not exist
    "ctx.hasUI",                // … and hasUI alone is not enough (rpc)
    "confirm",                  // §10 "spike" / §11 Q4 — decided: select only
    "setStatus(key, text)",     // §10 "confirmed" — the signature
    "ctx.ui.custom",            // §10 "confirmed (doom)" — a Promise; undefined outside tui
    "raiseOverlay",             // KILN's push has no counterpart
    "§11",                      // the seven open questions
    "timeout",                  // a timeout is not a decision
    "specs/007-kiln-pi-extension/research.md",
  ]) assert.ok(banner.includes(needle), `the banner must mention ${needle}`);
  assert.match(banner, /2026-09-21/, "dated");
  assert.match(banner, /the measurement wins/i);
});

test("FR-002: the banner sits near the TOP, so a reader sees it before the claims it corrects", () => {
  assert.ok(doc.indexOf("<!-- r8-correction -->") < doc.indexOf("## 1. The three surfaces"), "before §1");
  assert.ok(doc.indexOf("<!-- r8-correction -->") < doc.indexOf("## 10. API risk stratification"), "before §10");
});
