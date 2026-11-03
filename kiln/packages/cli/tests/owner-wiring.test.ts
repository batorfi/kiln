// r16 T037 — a real `kiln owner` process, launched from THIS binary (not a test harness), actually has a lane and real workers:
// admitting a feature whose gates name a real role (fixtures/walk-real-worker.json) makes the owner acquire a lane lease for a
// real model and settle a unit with a real conversation's result — never `s.lane: undefined` (notes.md, found at T004). The
// drive stops right after gate0's approval, before deciding the next gate, so this stays a narrow wiring proof — T038 drives the
// WHOLE walk to Merge. Live-model tier (T005): skips by name, never silently, when Ollama or the pinned model is not reachable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { probeLiveModel, skipOption } from "../../../tests/live-gate.ts";
import { drive, kiln as driveKiln } from "../../../tests/walk/drive.ts";
import { kiln, json } from "./support/kiln.ts";
import { startKilnOwner } from "./support/kiln.ts";

const fxPath = fileURLToPath(new URL("../../../fixtures/walk-real-worker.json", import.meta.url));

test("a real kiln owner process acquires a lane lease and settles a unit with a real conversation's result", async (t) => {
  const status = await probeLiveModel();
  const skip = skipOption(status).skip;
  if (skip) { t.skip(skip); return; }

  const dir = mkdtempSync(join(tmpdir(), "k16-owner-wiring-"));
  const store = join(dir, "s");
  const workspace = join(dir, "ws");
  mkdirSync(workspace, { recursive: true });
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  // the committed fixture's workspace is a relative placeholder for the quickstart demo; this test points it at a real tmpdir
  const fixture = JSON.parse(readFileSync(fxPath, "utf8"));
  fixture.script.real.workspace = workspace;
  const walkPath = join(dir, "walk.json");
  writeFileSync(walkPath, JSON.stringify(fixture));

  const owner = startKilnOwner(store, {}, 20_000);
  t.after(() => owner.kill());
  await owner.ready;

  const admit = await kiln(["feature", "admit", "--store", store, "--key", "k1", "--feature", "demo", "--walk", walkPath]);
  assert.equal(admit.code, 0, admit.stderr);
  assert.equal(json(admit).status, "created");

  // approve gate0 only, then STOP right as the next (real) gate opens — its units already ran to get there, which is
  // all this narrow test needs; driving the whole walk to Merge is T038's job, not this wiring proof's
  await drive({ store, feature: "demo", script: { gate0: { kind: "approve", admit: {} }, "*": { kind: "approve", stop: true } }, patienceMs: 90_000 });

  const shown = await driveKiln(["record", "show", "--store", store, "--run", "demo"]);
  assert.equal(shown.code, 0, shown.stderr);
  const events = shown.stdout.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));

  const acquired = events.find((e: any) => e.type === "lane.acquired");
  assert.ok(acquired, `no lane.acquired in the record — a real role unit never reached the lane at all\n${JSON.stringify(events, null, 2)}`);
  assert.equal(acquired.data.model, "gemma4:12b", "the lane must have acquired for the real role's own model, not undefined or a placeholder");

  const settled = events.find((e: any) => e.type === "unit.settled");
  assert.ok(settled, `no unit.settled in the record — the real conversation never completed\n${JSON.stringify(events, null, 2)}`);
});
