// r14 T028 (+ T046/T063/T069/T073 as the stories land): the walk of a feature through the REAL command line — a real `kiln owner` process, `kiln feature admit|next|state`, and the scripted driver
// that shells out to `kiln gate move`. Nothing here opens a store or a gate except through the owner.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { startKilnOwner, type KilnOwner } from "./support/kiln.ts";
import { drive, kiln, type Script } from "../../../tests/walk/drive.ts";

const fx = (name: string) => fileURLToPath(new URL(`../../../fixtures/${name}`, import.meta.url));
const script = (name: string): Script => JSON.parse(readFileSync(fx(name), "utf8"));
const ORDER = ["gate0", "1-concept", "2-architecture", "2a-experience", "3-spec", "4-plan", "5-checkpoint", "6-review", "6a-ui-review", "7-verification", "8-docs", "9-pr"];

function world() {
  const dir = mkdtempSync(join(tmpdir(), "k14-cli-"));
  const owners: KilnOwner[] = [];
  const env = { TMPDIR: dir };
  return {
    dir, env, store: join(dir, "s"),
    async owner(): Promise<KilnOwner> {
      const o = startKilnOwner(join(dir, "s"), env);
      owners.push(o);
      await o.ready;
      return o;
    },
    cleanup() {
      for (const o of owners) if (o.proc.exitCode === null && o.proc.signalCode === null) o.proc.kill("SIGKILL");
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
const last = (r: { stdout: string }): any => JSON.parse(r.stdout.trim().split("\n").pop()!);

test("feature admit is keyed exactly once; feature next returns the admission gate; a move outside the vocabulary is refused by name", async (t) => {
  const w = world();
  t.after(() => w.cleanup());
  await w.owner();
  const a1 = await kiln(["feature", "admit", "--store", w.store, "--key", "k1", "--feature", "f-ui", "--walk", fx("walk-interface.json")], w.env);
  assert.equal(a1.code, 0, a1.stderr);
  assert.equal(last(a1).status, "created");
  const a2 = await kiln(["feature", "admit", "--store", w.store, "--key", "k1", "--feature", "f-ui", "--walk", fx("walk-interface.json")], w.env);
  assert.equal(last(a2).status, "repeat");
  const a3 = await kiln(["feature", "admit", "--store", w.store, "--key", "k1", "--feature", "f-ui", "--walk", fx("walk-plain.json")], w.env);
  assert.equal(a3.code, 0, "a refusal is an answer");
  assert.equal(last(a3).reason, "key-conflict");

  const next = await kiln(["feature", "next", "--store", w.store, "--feature", "f-ui"], w.env);
  assert.equal(next.code, 0, next.stderr);
  const v = last(next);
  assert.equal(v.openGate.gateKey, "gate0");
  assert.equal(v.openGate.brief.kind, "admission");
  assert.equal(next.stdout.trim().split("\n").length, 1, "one JSON line out");

  const bad = await kiln(["gate", "move", "--store", w.store, "--gate", v.openGate.gateId, "--key", "x", "--kind", "restart", "--by", "script:r14", "--brief-ref", v.openGate.briefRef, "--note", "n"], w.env);
  assert.equal(bad.code, 0);
  assert.equal(last(bad).reason, "invalid-move");
  assert.match(last(bad).detail, /"restart" is not a move of this gate/);
  const state = await kiln(["feature", "state", "--store", w.store, "--feature", "f-ui"], w.env);
  assert.equal(last(state).openGate.gateId, v.openGate.gateId, "the refusal wrote nothing: the same gate is still open");
});

test("US1: the interface feature walks the Roadmap gate and all eleven feature gates through the CLI, in the flow's order, one move each, and ends done", async (t) => {
  const w = world();
  t.after(() => w.cleanup());
  await w.owner();
  const a = await kiln(["feature", "admit", "--store", w.store, "--key", "k1", "--feature", "f-ui", "--walk", fx("walk-interface.json")], w.env);
  assert.equal(last(a).status, "created");
  const out = await drive({ store: w.store, feature: "f-ui", script: script("walk-interface.approve-all.json"), env: w.env });
  assert.deepEqual(out.steps.map((s) => s.gateKey), ORDER);
  assert.ok(out.steps.every((s) => s.answer.status === "committed" && s.round === 1));
  assert.equal(out.last.status, "done");
  assert.equal(out.last.openGate, null, "nothing opens after Merge");
  const finalState = last(await kiln(["feature", "state", "--store", w.store, "--feature", "f-ui"], w.env));
  assert.equal(finalState.history.filter((h: any) => h.type === "move.committed").length, 12);
  assert.ok(finalState.history.every((h: any) => h.actor && h.cause));
});

test("US2: the plain feature walks 10 gates through the CLI; the two interface gates are recorded not applicable with their reasons, and a move on one is unknown-gate", async (t) => {
  const w = world();
  t.after(() => w.cleanup());
  await w.owner();
  await kiln(["feature", "admit", "--store", w.store, "--key", "k1", "--feature", "f-plain", "--walk", fx("walk-plain.json")], w.env);
  const out = await drive({ store: w.store, feature: "f-plain", script: script("walk-plain.approve-all.json"), env: w.env });
  assert.deepEqual(out.steps.map((s) => s.gateKey), ORDER.filter((k) => k !== "2a-experience" && k !== "6a-ui-review"));
  assert.equal(out.last.status, "done");
  const state = last(await kiln(["feature", "state", "--store", w.store, "--feature", "f-plain"], w.env));
  const na = state.history.filter((h: any) => h.type === "gate.not-applicable");
  assert.deepEqual(na.map((h: any) => h.data.gate).sort(), ["2a-experience", "6a-ui-review"]);
  for (const h of na) {
    assert.ok(!("text" in h.data.reason), "the record holds the reason's facts, not its sentence");
    assert.deepEqual([h.data.reason.verdict, h.data.reason.evaluated.paths, h.data.reason.evaluated.labels], [false, "no-match", "no-match"]);
    assert.equal(h.actor, "factory");
  }
  const refused = await kiln(["gate", "move", "--store", w.store, "--gate", "gate:f-plain:2a-experience:1", "--key", "x", "--kind", "approve", "--by", "script:r14", "--brief-ref", "0".repeat(64)], w.env);
  assert.equal(refused.code, 0);
  assert.equal(last(refused).reason, "unknown-gate");
});
