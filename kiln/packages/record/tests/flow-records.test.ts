// F4–F6, F10 (r12 T055): records are validated against the flow they were made under (FR-012, SC-008).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateLog, validateLogFile } from "#record/log.ts";

const kilnDir = fileURLToPath(new URL("../../..", import.meta.url));
const walk = join(kilnDir, "fixtures", "r7-live-inference.jsonl");
const TS = "2026-10-25T00:00:00Z";
const gc = (seq: number, gate: unknown, move: string, extra: Record<string, unknown> = {}) => ({
  recordType: "gate-completion", ts: TS, seq,
  "gate-completion": { gate, move, cost: { switches: 0, wallClock: "00:01" }, decidedBy: "human@token", ...extra },
});

test("F4 the committed r7 walk passes with v1 and with v2 (v2's sets are a superset)", () => {
  assert.deepEqual(validateLogFile(walk, undefined, { defaultFlow: "v1" }).failures, []);
  assert.deepEqual(validateLogFile(walk, undefined, { defaultFlow: "v2" }).failures, []);
  assert.equal(validateLogFile(walk).valid, true, "no option = history = v1");
});

test("F5 a Code review revise fails v1 naming the flow and the allowed moves; passes v2 and with \"flow\": \"v2\" in the record", () => {
  const rec = gc(1, 6, "revise");
  const v1 = validateLog([rec]);
  assert.equal(v1.valid, false);
  assert.match(v1.failures.join("\n"), /G3 record seq=1 \(gate-completion\)/);
  assert.match(v1.failures.join("\n"), /move "revise" not in MoveVocabulary\(gate=6, flow=v1\); allowed: approve, restart/);
  assert.equal(validateLog([rec], undefined, { defaultFlow: "v2" }).valid, true);
  assert.equal(validateLog([gc(1, 6, "revise", { flow: "v2" })]).valid, true, "a record that names v2 is judged by v2 even with no default");
});

test("F6 a record's own flow wins over defaultFlow, in both directions", () => {
  assert.equal(validateLog([gc(1, 6, "revise", { flow: "v2" })], undefined, { defaultFlow: "v1" }).valid, true);
  const r = validateLog([gc(1, 6, "revise", { flow: "v1" })], undefined, { defaultFlow: "v2" });
  assert.equal(r.valid, false);
  assert.match(r.failures.join("\n"), /flow=v1/);
});

test("F10 a gate 2a / 6a record fails v1 naming the gate and the flow, and passes v2 with an allowed move", () => {
  for (const gate of ["2a", "6a"]) {
    const r = validateLog([gc(1, gate, "approve")]);
    assert.equal(r.valid, false);
    assert.match(r.failures.join("\n"), new RegExp(`G3 record seq=1 .*\\n\\s+gate ${gate} is not in flow v1`));
    assert.equal(validateLog([gc(1, gate, "approve")], undefined, { defaultFlow: "v2" }).valid, true);
  }
  const bad = validateLog([gc(1, "6a", "reject", { flow: "v2" })]);
  assert.match(bad.failures.join("\n"), /MoveVocabulary\(gate=6a, flow=v2\); allowed: approve, revise, restart/);
  assert.match(validateLog([gc(1, "3a", "approve")]).failures.join("\n"), /G1 [\s\S]*neither gate0 nor 1\.\.9/);
});

test("an unknown flow in a record is a named failure, never a crash", () => {
  for (const flow of ["v3", "toString", 2]) {
    const r = validateLog([gc(1, 6, "approve", { flow })]);
    assert.equal(r.valid, false);
    assert.match(r.failures.join("\n"), /unknown flow/);
  }
});

test("the file path also rejects an unknown flow and an unknown gate at the schema (R1), and accepts 2a/6a", () => {
  const dir = mkdtempSync(join(tmpdir(), "kiln-flow-"));
  try {
    const write = (name: string, recs: unknown[]) => { const p = join(dir, name); writeFileSync(p, recs.map((r) => JSON.stringify(r)).join("\n") + "\n"); return p; };
    // a minimal valid stream needs the trace on the schema (R6), which the file path reads from the schema itself
    assert.equal(validateLogFile(write("ok.jsonl", [gc(1, "2a", "approve", { flow: "v2" })])).valid, true);
    assert.match(validateLogFile(write("badflow.jsonl", [gc(1, 6, "approve", { flow: "v9" })])).failures.join("\n"), /R1/);
    assert.match(validateLogFile(write("badgate.jsonl", [gc(1, "7a", "approve")])).failures.join("\n"), /R1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the CLI: --flow v2 changes the verdict of a Code review revise record; an unknown flow is a usage error", () => {
  const dir = mkdtempSync(join(tmpdir(), "kiln-flow-cli-"));
  try {
    const f = join(dir, "rev.jsonl");
    writeFileSync(f, JSON.stringify(gc(1, 6, "revise")) + "\n");
    const run = (...a: string[]) => spawnSync(process.execPath, [join(kilnDir, "packages", "record", "src", "log.ts"), ...a], { encoding: "utf8", env: { ...process.env, NODE_TEST_CONTEXT: undefined } });
    const v1 = run(f);
    assert.equal(v1.status, 1);
    assert.match(v1.stderr, /flow=v1\); allowed: approve, restart/);
    assert.equal(run(f, "--flow", "v2").status, 0);
    assert.equal(run(f, "--flow", "v9").status, 2);
    assert.equal(run(f, "--flow").status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
