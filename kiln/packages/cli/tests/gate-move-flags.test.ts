// r14 T014: `kiln gate move` carries the optional fields of a move (--note, --target, --admit) and `kiln gate open` can open a gate with the walk's move semantics (--returns-to). The command line only CARRIES
// them: a missing value or an unreadable --admit file is a usage error (exit 2) before anything is sent; everything else is the owner's to judge, and a refusal is an answer (exit 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { briefRef } from "#durable/canonical.ts";
import { readFileSync } from "node:fs";
import { kiln, json, startKilnOwner } from "./support/kiln.ts";

const BRIEF_FILE = fileURLToPath(new URL("../../../fixtures/demo-brief.json", import.meta.url));
const REF = briefRef(JSON.parse(readFileSync(BRIEF_FILE, "utf8")));

test("usage errors are exit 2 and send nothing: a flag with no value, and a malformed --admit file", async () => {
  const dir = mkdtempSync(join(tmpdir(), "k14-flags-"));
  try {
    const base = ["gate", "move", "--store", join(dir, "s"), "--gate", "g", "--key", "k", "--kind", "approve", "--by", "h@test", "--brief-ref", "x"];
    const noValue = await kiln([...base, "--note"], { TMPDIR: dir });
    assert.equal(noValue.code, 2, noValue.stderr);
    assert.match(noValue.stderr, /bad argument "--note"/);
    const bad = join(dir, "admit.json");
    writeFileSync(bad, "{ not json");
    const malformed = await kiln([...base, "--admit", bad], { TMPDIR: dir });
    assert.equal(malformed.code, 2, malformed.stderr);
    assert.match(malformed.stderr, /--admit:/);
    assert.match(malformed.stderr, /\[--note <text>\] \[--target <gate\|@build\|roadmap>\] \[--admit <file\.json>\]/, "the usage text shows the new flags");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the new flags reach the owner: a refusal by name is exit 0, and the committed record holds the note, target and admit", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "k14-flags-"));
  const store = join(dir, "s");
  const env = { TMPDIR: dir };
  const owner = startKilnOwner(store, env);
  t.after(() => {
    if (owner.proc.exitCode === null && owner.proc.signalCode === null) owner.proc.kill("SIGKILL");
    rmSync(dir, { recursive: true, force: true });
  });
  await owner.ready;
  const opened = await kiln(["gate", "open", "--store", store, "--key", "o1", "--gate", "gate:f:gate0:1", "--gate-key", "gate0", "--flow", "v2", "--brief", BRIEF_FILE, "--returns-to", "", "--by", "factory"], env);
  assert.equal(opened.code, 0, opened.stderr);
  assert.deepEqual(json(opened).gate.noteRequired, ["revise", "reject"], "--returns-to opens the gate with the walk's semantics");

  const move = (key: string, kind: string, extra: string[]) => kiln(["gate", "move", "--store", store, "--gate", "gate:f:gate0:1", "--key", key, "--kind", kind, "--by", "human@test", "--brief-ref", REF, ...extra], env);
  const noNote = await move("m1", "revise", []);
  assert.equal(noNote.code, 0, "a refusal is an answer");
  assert.equal(json(noNote).reason, "invalid-move");
  assert.match(json(noNote).detail, /needs a note/);

  const admitFile = join(dir, "admit.json");
  writeFileSync(admitFile, JSON.stringify({ require: ["2a-experience"], fixRounds: 3 }));
  const ok = await move("m2", "approve", ["--note", "go", "--admit", admitFile]);
  assert.equal(ok.code, 0, ok.stderr);
  const rec = json(ok);
  assert.equal(rec.status, "committed");
  assert.deepEqual([rec.record.move.note, rec.record.move.admit], ["go", { require: ["2a-experience"], fixRounds: 3 }]);
});
