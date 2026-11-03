// r16 T038 (US6, the row's own acceptance line, SC-001): the small-interface walk fixture (fixtures/walk-real-worker.json) reaches
// Merge with every worker/judge step a real pi-ai conversation, a person deciding every gate — 0 steps use the old `stepMs`
// stand-in. In-process (the CLI proof that the SAME wiring also works from the real `kiln owner` binary is T037's own
// owner-wiring.test.ts). Live-model tier (T005): skips by name, never silently, when Ollama or the pinned model is unreachable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { openFactory, type Factory } from "#durable/factory.ts";
import type { WalkInput } from "#durable/walk/input.ts";
import { createKilnProvider } from "#lane/kiln-provider.ts";
import { createLane } from "#lane/lane-task.ts";
import { createResidency } from "#lane/residency.ts";
import { createWorkers } from "#workers/conversation.ts";
import { probeLiveModel, skipOption } from "../../../../tests/live-gate.ts";
import { approveAll, drive, rowOf } from "./support.ts";

const fxPath = fileURLToPath(new URL("../../../../fixtures/walk-real-worker.json", import.meta.url));

async function withRealFactory(run: (f: Factory, workspace: string) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "k16-real-walk-"));
  const workspace = join(dir, "ws");
  mkdirSync(workspace, { recursive: true });
  const residency = createResidency({ budgetBytes: 64 * 1024 * 1024 * 1024 });
  const lane = createLane({ residency, budgetBytes: 64 * 1024 * 1024 * 1024 });
  const kilnProvider = createKilnProvider(lane.api);
  const workers = createWorkers({ kilnProvider, probe: (model) => residency.probe(model) });
  const f = await openFactory({ store: join(dir, "s"), lane: lane.api, tasks: lane.kinds, workers });
  try {
    await f.ready;
    await run(f, workspace);
  } finally {
    await f.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
}

test("the small-interface walk, with every author/judge step a real conversation, reaches Merge — 0 steps use the stepMs stand-in (SC-001)", { timeout: 10 * 60_000 }, async (t) => {
  const status = await probeLiveModel();
  const skip = skipOption(status).skip;
  if (skip) { t.skip(skip); return; }

  await withRealFactory(async (f, workspace) => {
    const fixture = JSON.parse(readFileSync(fxPath, "utf8")) as WalkInput;
    fixture.script!.real!.workspace = workspace;

    const admitted = await f.walks.admit("k1", "demo", fixture);
    assert.equal(admitted.status, "created");
    const t0 = Date.now();
    const loggingApproveAll = ((g: Parameters<typeof approveAll>[0], n: number) => {
      console.error(`[${((Date.now() - t0) / 1000).toFixed(1)}s] gate ${g.gateKey}#${g.round} open — approving`);
      return approveAll(g, n);
    }) as typeof approveAll;
    const d = await drive(f, "demo", loggingApproveAll, 20);
    console.error(`[${((Date.now() - t0) / 1000).toFixed(1)}s] drive finished: ${d.last.status}`);
    assert.equal(d.last.status, "done", `the walk did not reach done: ${JSON.stringify(d.last)}`);
    assert.equal(d.last.openGate, null, "nothing opens after Merge");

    const row = await rowOf(f);
    assert.equal(row?.status, "terminal");
    assert.deepEqual((row?.outcome as { result?: { outcome?: string } })?.result?.outcome, "merged");
    assert.ok(d.steps.every((s) => s.outcome.status === "committed"));
    assert.ok(d.steps.every((s) => s.kind === "approve" && (s.gateKey === "gate0" || s.outcome.status === "committed")));
    // triage skips Concept and Architecture for this fixture, same as the scripted walk-small-interface.json proof
    assert.ok(!d.steps.some((s) => s.gateKey === "1-concept" || s.gateKey === "2-architecture"));

    const i = await f.inspect();
    const units = i.tasks.filter((task) => task.kind === "kiln.unit");
    assert.ok(units.length > 0, "the walk must have created at least one unit");
    // fixtures/walk-real-worker.json only maps author/workers/judge to a real role — "check" (a deterministic,
    // non-LLM step unitRoles() also creates) is correctly NOT mapped and stays the scripted stand-in; SC-001's "0
    // stand-ins" claim is about the MAPPED roles, not every unit a gate happens to create.
    const MAPPED_ROLES = ["author", "workers", "judge"];
    for (const task of units) {
      const outcome = task.outcome as { status?: string; result?: { label?: string; results?: string[] } } | undefined;
      assert.equal(outcome?.status, "completed", `a unit did not complete: ${JSON.stringify(outcome)}`);
      const label = outcome?.result?.label;
      const results = outcome?.result?.results ?? [];
      const roleName = label?.split(":")[0];
      if (!roleName || !MAPPED_ROLES.includes(roleName)) continue; // a "check" (or any other unmapped) unit legitimately stays scripted
      // SC-001: 0 of the mapped roles' steps use the old stand-in's exact pattern (`${label}:${i}`, e.g. "author:3-spec:1:0")
      assert.ok(!results.some((r) => /^.+:.+:\d+:\d+$/.test(r)), `unit "${label}" looks like the stepMs stand-in's own label pattern, not a real result: ${JSON.stringify(results)}`);
    }
    const lanEvents = i.outbox.filter((e) => e.type === "lane.acquired");
    assert.ok(lanEvents.length > 0, "no lane.acquired at all — no unit ever reached the lane for real");
    assert.ok(lanEvents.every((e) => (e.data as { model?: string }).model === "gemma4:12b"));
  });
});
