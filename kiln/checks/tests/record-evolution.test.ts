// r15 T056 (US5, FR-020, SC-006): events keep their meaning as their shape changes. A breaking version of a type, with its upcaster, in a TEST catalog: stored version 1 events are presented as version 2,
// consumers see only version 2, and nothing the first program replays changes. An additive optional field needs no new version and no upcaster.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { catalog as shipped, type CatalogEntry } from "#contracts/events/catalog/index.ts";
import { upcastEntry, upcastStored } from "#contracts/events/upcast.ts";
import type { Ctx, Entry0, Event } from "#contracts/events/types.ts";
import { loadWalks, replayAll } from "#record/replay.ts";
import { foldRun } from "#record/projections/factory-log.ts";
import { validateEvent } from "#record/events/validate.ts";
import { checkRecord } from "../record.ts";
import { pristine } from "./record-negative.ts";

const digest = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");
const SAMPLES = JSON.parse(readFileSync(new URL("../../fixtures/stores/r14-outbox-samples.json", import.meta.url), "utf8")) as Record<string, Entry0[]>;
function v1Events(stream: Entry0[]): Event[] {
  const out: Event[] = [];
  const ctx: Ctx = { digest, siblings: (seq, key) => out.filter((e) => e.seq < seq && e.causation === `cmd:${key}`) };
  for (const e of stream) out.push(upcastEntry(e, ctx));
  return out;
}
const ctx0: Ctx = { digest, siblings: () => [] };

/** A catalog in which `gate.opened` has a BREAKING version 2: `gateKey` is renamed `gate`. */
function catalogWithV2(): Map<string, CatalogEntry> {
  const m = new Map(shipped);
  const e = shipped.get("gate.opened")!;
  const v2 = JSON.parse(JSON.stringify(e.versions[1]));
  v2.properties.gate = v2.properties.gateKey;
  delete v2.properties.gateKey;
  v2.required = v2.required.map((k: string) => (k === "gateKey" ? "gate" : k));
  m.set("gate.opened", {
    ...e, current: 2, versions: { 1: e.versions[1], 2: v2 },
    upcast: { 1: (x) => { const { gateKey, ...rest } = x.data as Record<string, unknown>; return { ...x, schema: "gate.opened/2", data: { ...rest, gate: gateKey } }; } },
    downcast: { 1: (x) => { const { gate, ...rest } = x.data as Record<string, unknown>; return { ...x, schema: "gate.opened/1", data: { ...rest, gateKey: gate } }; } },
  });
  return m;
}

test("a stored version 1 event is presented as version 2 through its upcaster; the consumer sees only version 2", () => {
  const cat = catalogWithV2();
  const v1 = v1Events(SAMPLES["interface-done"]).filter((e) => e.type === "gate.opened");
  assert.equal(v1.length, 12);
  for (const e of v1) {
    const v2 = upcastStored(e, ctx0, cat);
    assert.equal(v2.schema, "gate.opened/2");
    assert.ok("gate" in (v2.data as object) && !("gateKey" in (v2.data as object)));
    assert.equal((v2.data as { gate: string }).gate, (e.data as { gateKey: string }).gateKey);
  }
  assert.throws(() => upcastStored({ ...v1[0], schema: "gate.opened/3" }, ctx0, cat), /event-version-unknown/);
});

test("the factory-log built from the upcast events is byte-identical to the one built from the stored ones (the reducer handles only the current version, and the shape it reads did not change)", () => {
  const cat = catalogWithV2();
  for (const [name, stream] of Object.entries(SAMPLES)) {
    const v1 = v1Events(stream);
    const presented = v1.map((e) => (e.type === "gate.opened" ? upcastStored(e, ctx0, cat) : e));
    assert.deepEqual(foldRun(presented), foldRun(v1), name);
  }
});

test("every committed replay of the first program is unchanged by the new version (they hold no gate.opened, and nothing else moves)", () => {
  const s = replayAll(loadWalks(new URL("../../fixtures/walks", import.meta.url).pathname));
  assert.deepEqual(s.results.flatMap((r) => r.problems), []);
});

test("an upcaster that is lossless and pure passes the check; the catalog with version 2 is otherwise accepted", () => {
  const o = pristine();
  const r = checkRecord({ ...o, catalog: catalogWithV2(), files: null });
  assert.deepEqual(r.failures.map((f) => f.code), [], JSON.stringify(r.failures));
});

test("an ADDITIVE optional field needs no new version and no upcaster: old events still validate and every replay is identical", () => {
  const cat = new Map(shipped);
  const e = shipped.get("walk.completed")!;
  const v1 = JSON.parse(JSON.stringify(e.versions[1]));
  v1.properties.reviewer = { type: "string" }; // optional: not in `required`
  cat.set("walk.completed", { ...e, versions: { 1: v1 } });
  assert.equal(cat.get("walk.completed")!.current, 1);
  const old = v1Events(SAMPLES["interface-done"]).filter((x) => x.type === "walk.completed");
  assert.equal(old.length, 1);
  assert.deepEqual(validateEvent(old[0]), [], "an event written before the field existed is still valid");
  const r = checkRecord({ ...pristine(), catalog: cat, files: null });
  assert.deepEqual(r.failures.map((f) => f.code), [], "no upcaster is demanded for it");
});
