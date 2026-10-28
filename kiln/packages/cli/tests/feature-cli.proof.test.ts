// r14 (US1, US2, US5 — PROOF tier): the slow command-line walks. The default tier keeps one interface walk and one plain walk through the CLI (feature-cli.test.ts); these are the others — each spawns a few dozen
// `kiln` processes. Their in-process equivalents (walk-inprocess, applicability, moves) run in the default tier.
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

test("US1: the same input on a second store walks the same gates with the same outcomes", async (t) => {
  const run = async () => {
    const w = world();
    try {
      await w.owner();
      await kiln(["feature", "admit", "--store", w.store, "--key", "k1", "--feature", "f-ui", "--walk", fx("walk-interface.json")], w.env);
      const out = await drive({ store: w.store, feature: "f-ui", script: script("walk-interface.approve-all.json"), env: w.env });
      const hist = last(await kiln(["feature", "state", "--store", w.store, "--feature", "f-ui"], w.env)).history.map((h: any) => `${h.type}|${h.actor}|${h.cause}`);
      return [...out.steps.map((s) => `${s.gateId}:${s.kind}:${s.answer.status}`), ...hist];
    } finally {
      w.cleanup();
    }
  };
  assert.deepEqual(await run(), await run());
  void t;
});


test("US2: requiring Experience design at the Roadmap gate (admit.require) gives 11 gates and why:'required'", async (t) => {
  const w = world();
  t.after(() => w.cleanup());
  await w.owner();
  await kiln(["feature", "admit", "--store", w.store, "--key", "k1", "--feature", "f-req", "--walk", fx("walk-plain.json")], w.env);
  const out = await drive({ store: w.store, feature: "f-req", script: script("walk-plain.require-experience.json"), env: w.env });
  assert.equal(out.steps.length, 11);
  assert.ok(out.steps.some((s) => s.gateKey === "2a-experience"));
  const state = last(await kiln(["feature", "state", "--store", w.store, "--feature", "f-req"], w.env));
  const admitted = state.history.find((h: any) => h.type === "walk.admitted");
  assert.deepEqual(admitted.data.applicability["2a-experience"], { applies: true, why: "required" });
});


test("US5: every kind of move through the command line — revise, a reject to an earlier gate, split+revise, restart, Verification\'s reject with no target — and the walk still ends in order", async (t) => {
  const w = world();
  t.after(() => w.cleanup());
  await w.owner();
  await kiln(["feature", "admit", "--store", w.store, "--key", "k1", "--feature", "f-moves", "--walk", fx("walk-plain.json")], w.env);
  const out = await drive({ store: w.store, feature: "f-moves", script: script("walk-plain.moves.json"), env: w.env });
  assert.equal(out.last.status, "done");
  assert.equal(out.steps.at(-1)!.gateKey, "9-pr");
  const kinds = out.steps.map((s) => `${s.gateKey}#${s.round}:${s.kind}`);
  for (const want of ["3-spec#1:revise", "4-plan#1:reject", "5-checkpoint#1:split+revise", "6-review#1:restart", "7-verification#1:reject"]) assert.ok(kinds.includes(want), `${want} in ${kinds.join(" ")}`);
  const state = JSON.parse((await kiln(["feature", "state", "--store", w.store, "--feature", "f-moves"], w.env)).stdout.trim().split("\n").pop()!);
  const types = state.history.map((h: any) => h.type);
  assert.ok(types.includes("walk.split") && types.filter((x: string) => x === "walk.returned").length >= 4);
  assert.ok(state.history.every((h: any) => h.actor && h.cause));
});

test("US5b: `kiln feature move` sends a feature back at any time — the open gate is withdrawn, the walk returns to the target, and a retry of the same key is a repeat", async (t) => {
  const w = world();
  t.after(() => w.cleanup());
  await w.owner();
  await kiln(["feature", "admit", "--store", w.store, "--key", "k1", "--feature", "f-fm", "--walk", fx("walk-plain.json")], w.env);
  // approve up to Specification
  const out = await drive({ store: w.store, feature: "f-fm", script: { ...script("walk-plain.approve-all.json"), "3-spec": { kind: "approve", stop: true } as never }, env: w.env });
  assert.equal(out.last.openGate.gateKey, "3-spec");
  const move = ["feature", "move", "--store", w.store, "--feature", "f-fm", "--key", "fm1", "--by", "script:r14", "--target", "1-concept", "--note", "back to the concept"];
  const r1 = await kiln(move, w.env);
  assert.equal(r1.code, 0, r1.stderr);
  assert.equal(last(r1).status, "committed");
  assert.equal(last(r1).record.effect, "withdrew");
  assert.equal(last(await kiln(move, w.env)).status, "repeat");
  const bad = await kiln(["feature", "move", "--store", w.store, "--feature", "f-fm", "--key", "fm2", "--by", "script:r14", "--target", "9-pr", "--note", "x"], w.env);
  assert.equal(last(bad).reason, "invalid-move");
  const next = last(await kiln(["feature", "next", "--store", w.store, "--feature", "f-fm", "--after", out.last.openGate.gateId], w.env));
  assert.deepEqual([next.openGate.gateKey, next.openGate.round], ["1-concept", 2]);
  const gs = last(await kiln(["gate", "state", "--store", w.store, "--gate", out.last.openGate.gateId], w.env));
  assert.equal(gs.state, "withdrawn");
});

test("US6: triage through the command line — a small plain feature walks 7 feature gates, a small interface feature 9; Concept and Architecture are SKIPPED with the reasoning", async (t) => {
  const w = world();
  t.after(() => w.cleanup());
  await w.owner();
  for (const [name, file, want] of [["f-sp", "walk-small-plain.json", 7], ["f-si", "walk-small-interface.json", 9]] as const) {
    await kiln(["feature", "admit", "--store", w.store, "--key", `k-${name}`, "--feature", name, "--walk", fx(file)], w.env);
    const out = await drive({ store: w.store, feature: name, script: script("walk-plain.approve-all.json"), env: w.env });
    assert.equal(out.steps.filter((s) => s.gateKey !== "gate0").length, want, name);
    assert.ok(!out.steps.some((s) => s.gateKey === "1-concept" || s.gateKey === "2-architecture"));
    const state = last(await kiln(["feature", "state", "--store", w.store, "--feature", name], w.env));
    const skipped = state.history.filter((h: any) => h.type === "gate.skipped");
    assert.deepEqual(skipped.map((h: any) => h.data.gate), ["1-concept", "2-architecture"]);
    assert.ok(skipped.every((h: any) => /^a (one-line|copy) change/.test(h.data.reasoning)));
  }
});
