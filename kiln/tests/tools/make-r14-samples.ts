// r15 T013 — real version 0 entries for EVERY type r13/r14 emit, taken from r14's UNCHANGED code (run before any call site is switched; it cannot be re-run afterwards).
//   node tests/tools/make-r14-samples.ts   →   fixtures/stores/r14-outbox-samples.json   { scenario: StoredOutboxEntry[] }
// Each scenario is a fresh in-process factory with an injected clock and fixed keys; its whole outbox is kept, in order, so tests can replay a stream (siblings) as well as single entries.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { openFactory, type Factory } from "#durable/factory.ts";
import { drive, DECIDER, INTERFACE, mkMove, moveHere, PLAIN, walkTo } from "../../packages/durable/tests/walk/support.ts";

const OUT = fileURLToPath(new URL("../../fixtures/stores/r14-outbox-samples.json", import.meta.url));
const T0 = Date.UTC(2026, 0, 1);
const samples: Record<string, unknown[]> = {};

async function scenario(name: string, run: (f: Factory) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "k15-samples-"));
  let tick = 0;
  const f = await openFactory({ store: join(dir, "s"), now: () => T0 + 1000 * tick++ });
  try {
    await f.ready;
    await run(f);
    samples[name] = (await f.inspect()).outbox;
  } finally {
    await f.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
  console.log(name, samples[name].length);
}

await scenario("interface-done", async (f) => { await f.walks.admit("k1", "f", INTERFACE); await drive(f, "f"); });
await scenario("plain-not-applicable", async (f) => { await f.walks.admit("k1", "f", PLAIN); await drive(f, "f"); });
await scenario("reject-to-build", async (f) => { // walk.returned (work: workers)
  await f.walks.admit("k1", "f", PLAIN);
  await moveHere(f, "f", await walkTo(f, "f", "7-verification"), { kind: "reject", note: "the build is wrong" });
});
await scenario("reject-earlier", async (f) => { // walk.returned (target: an earlier gate, with recross)
  await f.walks.admit("k1", "f", PLAIN);
  await moveHere(f, "f", await walkTo(f, "f", "8-docs"), { kind: "reject", note: "the spec is wrong about ordering", target: "3-spec" });
});
await scenario("restart", async (f) => { // walk.returned (work: rebuild)
  await f.walks.admit("k1", "f", PLAIN);
  await moveHere(f, "f", await walkTo(f, "f", "6-review"), { kind: "restart", note: "rebuild from the restorable commit" });
});
await scenario("split", async (f) => { // walk.split + walk.returned
  await f.walks.admit("k1", "f", PLAIN);
  await moveHere(f, "f", await walkTo(f, "f", "5-checkpoint"), { kind: "split+revise", note: "the remainder goes back to the roadmap" });
});
await scenario("left-lane", async (f) => { // walk.left-lane
  await f.walks.admit("k1", "f", PLAIN);
  await moveHere(f, "f", await walkTo(f, "f", "1-concept"), { kind: "reject", note: "not worth building", target: "roadmap" });
});
await scenario("not-admitted", async (f) => { // walk.not-admitted
  await f.walks.admit("k1", "f", PLAIN);
  const v = await f.walks.next("f");
  await f.gates.submit(v.openGate!.gateId, "no", mkMove(v.openGate!, { kind: "reject", note: "not this quarter" }));
  await f.walks.next("f", v.openGate!.gateId);
});
await scenario("withdrawn", async (f) => { // gate.withdrawn + move.committed (scope: feature) + walk.returned (scope: feature)
  await f.walks.admit("k1", "f", PLAIN);
  await walkTo(f, "f", "4-plan");
  await f.walks.move("f", "fm1", { kind: "reject", decidedBy: DECIDER, target: "2-architecture", note: "the architecture is wrong" });
  await f.walks.next("f");
});
await scenario("triage-skip", async (f) => { // gate.skipped
  await f.walks.admit("k1", "f", { ...PLAIN, triage: { skip: true, reasoning: "a one-line copy change" } });
  await walkTo(f, "f", "3-spec");
});
await scenario("fix-rounds", async (f) => { // walk.fix-round
  await f.walks.admit("k1", "f", { ...PLAIN, verifier: ["fail", "fail", "pass"] });
  await walkTo(f, "f", "7-verification");
});
await scenario("became-applicable", async (f) => { // gate.became-applicable
  await f.walks.admit("k1", "f", { ...PLAIN, built: { ui_files_changed: true } });
  await walkTo(f, "f", "6a-ui-review");
});

writeFileSync(OUT, JSON.stringify(samples, null, 1) + "\n");
const types = new Set(Object.values(samples).flat().map((e: any) => e.type));
console.log("types:", [...types].sort().join(" "));
process.exit(0);
