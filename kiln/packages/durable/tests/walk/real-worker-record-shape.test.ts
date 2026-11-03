// r16 T040 (US6, spec acceptance scenario 3): a real-worker walk's record is the SAME SHAPE as a scripted walk's — identical
// event TYPES in the same relative order, only `lane.*`/`unit.*` CONTENT differing (a real model name/result vs a scripted
// stand-in's). No live Ollama needed: `createWorkers`'s test-only `complete` seam (already proven by T018's own tests) stands
// in for the model, while the REAL lane (real `lane.acquired`/`released` events, no residency configured) is used for real —
// only the HTTP call to Ollama is faked, nothing about the record's shape.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openFactory, type Factory } from "#durable/factory.ts";
import type { WalkInput } from "#durable/walk/input.ts";
import { createKilnProvider } from "#lane/kiln-provider.ts";
import { createLane } from "#lane/lane-task.ts";
import { createWorkers } from "#workers/conversation.ts";
import { approveAll, drive } from "./support.ts";

// the same facts/triage as fixtures/walk-real-worker.json, inline so this test needs no live model
const FACTS: Omit<WalkInput, "script"> = { flow: "v2", facts: { paths: ["web/app.tsx"], labels: ["ui"], journeys: ["J1.3"] }, built: { ui_files_changed: true }, triage: { skip: true, reasoning: "a copy change on one screen" } };

async function runWalk(real: boolean, workspace: string): Promise<{ types: string[] }> {
  const dir = mkdtempSync(join(tmpdir(), "k16-shape-"));
  const lane = createLane(); // no residency: a fake complete() stands in for the model, but the lease itself is real
  const kilnProvider = createKilnProvider(lane.api);
  const workers = createWorkers({
    kilnProvider,
    complete: async () => ({ role: "assistant", content: [{ type: "text", text: "done" }], api: "openai-completions", provider: "kiln-ollama", model: "fake-model", usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: "stop", timestamp: Date.now() }) as never,
  });
  const f: Factory = await openFactory({ store: join(dir, "s"), lane: lane.api, tasks: lane.kinds, workers });
  try {
    await f.ready;
    const input: WalkInput = real
      ? { ...FACTS, script: { real: { roles: { author: { role: "worker", model: "fake-model" }, workers: { role: "worker", model: "fake-model" }, judge: { role: "reviewer", model: "fake-model" } }, workspace } } }
      : FACTS;
    const admitted = await f.walks.admit("k1", "demo", input);
    assert.equal(admitted.status, "created");
    const d = await drive(f, "demo", approveAll, 20);
    assert.equal(d.last.status, "done", `${real ? "real" : "scripted"} walk did not finish: ${JSON.stringify(d.last)}`);
    const i = await f.inspect();
    return { types: i.outbox.map((e) => e.type) };
  } finally {
    await f.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
}

test("a real-worker walk's record has the same event-type shape as a scripted walk's, apart from the lane's own real-residency bookkeeping — only lane.*/unit.* content differs otherwise", async (t) => {
  const workspace = mkdtempSync(join(tmpdir(), "k16-shape-ws-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));

  const scripted = await runWalk(false, workspace);
  const real = await runWalk(true, workspace);

  // a plain scripted todo-role unit never sets needsLane at all (work()'s existing shape, unchanged by r16), so it
  // never touches the lane; a real unit always does (FR-020/021). Filtering lane.* out of both isolates exactly the
  // claim spec.md's User Story 6 scenario 3 makes: the SAME shape for everything else — gate/move/walk/unit events,
  // in the same relative order — with the real walk's extra lane.* entries being the one, expected, named exception.
  const withoutLane = (types: string[]) => types.filter((t) => !t.startsWith("lane."));
  assert.deepEqual(withoutLane(real.types), withoutLane(scripted.types), "apart from lane.* entries, the two walks must produce the exact same sequence of event TYPES");
  assert.ok(real.types.some((t) => t.startsWith("lane.")), "sanity: the real-worker walk must actually have touched the lane for real, or this comparison is vacuous");
  assert.ok(!scripted.types.some((t) => t.startsWith("lane.")), "sanity: the plain scripted walk's own units never need the lane at all (work()'s existing, unchanged shape) — confirms the filtered-out set is exactly the real walk's addition, not noise from both sides");
});
