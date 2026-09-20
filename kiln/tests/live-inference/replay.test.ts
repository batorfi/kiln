// kiln/tests/live-inference/replay.test.ts — T038 (US3), r7 · FR-009 / SC-006 (S10) · OFFLINE tier.
//
// A REAL live run, captured once by `npm run capture-fixture` and COMMITTED, replays through 001's UNMODIFIED
// `kiln/validate/log.ts` (R1–R6); its no-`decidedBy` sibling FAILs with a NAMED R3. Replay runs from the
// FIXTURE — not fresh live output — because determinism holds in-process (temperature 0 + a fixed seed) but
// NOT across model reloads or Ollama upgrades. This file needs no Ollama.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateLog } from "../../validate/log.ts";

const dir = fileURLToPath(new URL("../../fixtures/", import.meta.url));
const load = (f: string) => readFileSync(`${dir}${f}`, "utf8").split("\n").filter((l) => l.trim() !== "").map((l) => JSON.parse(l));
const good = () => load("r7-live-inference.jsonl");
const broken = () => load("r7-live-broken.jsonl");

test("S10 (FR-009): the committed REAL live run PASSES 001's unmodified log.ts (R1–R6)", () => {
  const r = validateLog(good(), undefined);
  assert.equal(r.valid, true, r.failures.join("\n"));
  assert.equal(good().length, 25, "a full nine-gate walk");
});

test("S10 (SC-006): its no-decidedBy sibling FAILs log.ts with a NAMED R3 (no-silent-approval)", () => {
  const r = validateLog(broken(), undefined);
  assert.equal(r.valid, false, "the broken sibling must NOT pass");
  assert.match(r.failures.join("\n"), /R3/, "the failure names R3");
  assert.match(r.failures.join("\n"), /no-silent-approval|silently approve/i, "…and the silent-approval rule");
});

test("FR-015: the fixture uses ONLY 001's record union — NO new recordType", () => {
  const allowed = new Set(["transition", "gate-completion", "human-decision", "cost", "wait", "pre-delegation"]);
  for (const rec of good()) assert.ok(allowed.has(rec.recordType), `unexpected recordType "${rec.recordType}"`);
});

test("O5: the fixture records the resident SYMBOLICALLY — a real model, `@ loopback`, never an address", () => {
  const first = good()[0];
  assert.equal(first.recordType, "transition");
  assert.match(first.transition.reason, /^resident selection → live model=\S+ @ loopback \(NC2-A: local, not cloud\)$/);
  assert.doesNotMatch(readFileSync(`${dir}r7-live-inference.jsonl`, "utf8"), /127\.0\.0\.1|localhost|:11434|https?:/, "no raw address anywhere in the ledger");
});

test("O6 / R5: no forbidden key, and no prompt or completion text, in the committed ledger", () => {
  const text = readFileSync(`${dir}r7-live-inference.jsonl`, "utf8");
  assert.doesNotMatch(text, /"(?:url|https?|endpoint|baseUrl|apiBase|externalUrl|remote|cloud)"\s*:/i);
  assert.doesNotMatch(text, /"(?:content|prompt|completion|message|output|response)"\s*:/i, "the ledger records THAT a unit ran — never what the model said");
});

test("S12 (P-VI / SC-009): the only gate0 record is a `wait` (a RE-OPEN at the row's close) — never an admission", () => {
  const g0 = good().filter((r) => JSON.stringify(r).includes('"gate0"'));
  assert.ok(g0.length >= 1, "Gate 0 is re-opened at the seam");
  for (const r of g0) assert.equal(r.recordType, "wait", `gate0 must only ever be a WAIT, got ${r.recordType}`);
  assert.doesNotMatch(readFileSync(`${dir}r7-live-inference.jsonl`, "utf8"), /"gate0"[^}]*"approved"/, "no `gate0: approved` emitted by the build");
});

test("D9: the fixture lives in kiln/fixtures/ (committable) and carries its provenance sidecar", () => {
  const meta = JSON.parse(readFileSync(`${dir}r7-live-inference.meta.json`, "utf8"));
  assert.ok(meta.model && meta.ollamaVersion && meta.capturedAt, "records WHICH model and Ollama version produced it");
  assert.equal(meta.roundTrips, 9, "nine REAL round-trips backed this capture");
});
