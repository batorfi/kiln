// Version 0 → 1 (research R7): real entries r14's own code wrote (fixtures/stores/r14-outbox-samples.json, made by tests/tools/make-r14-samples.ts before any call site changed).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { upcastEntry, upcastStored, EventSiblingMissing, EventVersionUnknown } from "#contracts/events/upcast.ts";
import type { Ctx, Entry0, Event } from "#contracts/events/types.ts";
import { FORBIDDEN_KEYS } from "#contracts/events/grammar.ts";
import { validateEvent } from "../src/events/validate.ts";
import { D64 } from "./support/examples.ts";

const SAMPLES = JSON.parse(readFileSync(new URL("../../../fixtures/stores/r14-outbox-samples.json", import.meta.url), "utf8")) as Record<string, Entry0[]>;
const digest = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");

/** Upcast a whole stream, giving each entry the earlier events as siblings (what `readRecord` does). */
function upcastStream(entries: Entry0[]): Event[] {
  const out: Event[] = [];
  const ctx: Ctx = { digest, siblings: (seq, key) => out.filter((e) => e.seq < seq && e.causation === `cmd:${key}`) };
  for (const e of entries) out.push(upcastEntry(e, ctx));
  return out;
}

const DROPPED = ["note", "reasoning", "remainder", "because"];

test("every entry of every real r14 stream upcasts to an event the catalog accepts", () => {
  let n = 0;
  for (const [name, entries] of Object.entries(SAMPLES)) {
    for (const e of upcastStream(entries)) {
      assert.deepEqual(validateEvent(e), [], `${name} #${e.seq} ${e.type}`);
      n++;
    }
  }
  assert.ok(n > 200, `${n} entries examined`);
});

test("the upcast is LOSSLESS over the fields the catalog admits: every admitted v0 field is in the event, every dropped one is a reference and a digest", () => {
  for (const [name, entries] of Object.entries(SAMPLES)) {
    const events = upcastStream(entries);
    entries.forEach((v0, i) => {
      const v1 = events[i];
      const d0 = v0.data as Record<string, unknown>;
      const d1 = v1.data as Record<string, unknown>;
      assert.equal(v1.type, v0.type, `${name} #${v0.seq}: the type name is kept`);
      assert.equal(v1.seq, v0.seq);
      assert.equal(v1.subject, v0.subject);
      assert.equal(v1.actor, v0.actor);
      assert.equal(v1.causation, `cmd:${v0.cause}`);
      assert.equal(v1.time, new Date(v0.at).toISOString());
      for (const [k, val] of Object.entries(d0)) {
        if (DROPPED.includes(k)) continue;
        if (k === "reason") {
          const { text: _t, ...rest } = val as Record<string, unknown>;
          assert.deepEqual(d1.reason, rest, `${name} #${v0.seq}: reason keeps rule, evaluated, verdict`);
        } else assert.deepEqual(d1[k], val, `${name} #${v0.seq} ${v0.type}.${k}`);
      }
      for (const k of DROPPED) {
        if (typeof d0[k] !== "string") continue;
        const prefix = k === "because" ? null : k;
        if (prefix) assert.equal(d1[`${prefix}Digest`], digest(d0[k] as string), `${name} #${v0.seq}: ${k} is carried as its digest`);
      }
    });
  }
});

test("no upcast event holds a forbidden key anywhere in its data", () => {
  const walk = (v: unknown, path: string): void => {
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${path}[${i}]`));
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { assert.ok(!FORBIDDEN_KEYS.includes(k), `${path}.${k}`); walk(x, `${path}.${k}`); }
  };
  for (const [name, entries] of Object.entries(SAMPLES)) upcastStream(entries).forEach((e) => walk(e.data, `${name}#${e.seq}`));
});

test("the upcast is PURE: the same stream gives the same events", () => {
  for (const entries of Object.values(SAMPLES)) assert.deepEqual(upcastStream(entries), upcastStream(entries));
});

test("a note is carried as the right reference: a gate move's note by the gate, a feature move's by its key", () => {
  const returned = upcastStream(SAMPLES["reject-to-build"]).find((e) => e.type === "walk.returned")!;
  assert.equal((returned.data as any).noteRef, "move:gate:f:7-verification:1#note");
  assert.equal((returned.data as any).noteDigest, digest("the build is wrong"));
  const withdrawn = upcastStream(SAMPLES.withdrawn);
  assert.equal((withdrawn.find((e) => e.type === "gate.withdrawn")!.data as any).noteRef, "walk:f/moves/fm1#note");
  assert.equal((withdrawn.find((e) => e.type === "walk.returned")!.data as any).noteRef, "walk:f/moves/fm1#note");
  assert.equal((upcastStream(SAMPLES["triage-skip"]).find((e) => e.type === "gate.skipped")!.data as any).reasoningRef, "row:f#triage.reasoning");
  const left = upcastStream(SAMPLES["left-lane"]).find((e) => e.type === "walk.left-lane")!;
  assert.equal((left.data as any).noteRef, "move:gate:f:1-concept:1#note");
  const split = upcastStream(SAMPLES.split).find((e) => e.type === "walk.split")!;
  assert.match((split.data as any).remainderRef, /^move:gate:f:5-checkpoint:1#note$/);
});

test("gate.settled takes its move and decider from the sibling move.committed; without it the read fails by name", () => {
  const events = upcastStream(SAMPLES["interface-done"]);
  const settled = events.filter((e) => e.type === "gate.settled");
  assert.equal(settled.length, 12);
  for (const s of settled) assert.deepEqual([(s.data as any).move, (s.data as any).decidedBy], ["approve", "script:r14"]);
  const entry = SAMPLES["interface-done"].find((e) => e.type === "gate.settled")!;
  assert.throws(() => upcastEntry(entry, { digest, siblings: () => [] }), (e: unknown) => e instanceof EventSiblingMissing);
});

test("an interim type nobody knows becomes record.unknown, carrying only its name and a digest", () => {
  const e = upcastEntry({ type: "something.else", subject: "x", at: 1_700_000_000_000, actor: "system", cause: "k", data: { secret: "do not copy me" }, seq: 3 }, { digest, siblings: () => [] });
  assert.equal(e.type, "record.unknown");
  assert.deepEqual(Object.keys(e.data as object).sort(), ["digest", "originalType"]);
  assert.deepEqual(validateEvent(e), []);
  assert.ok(!JSON.stringify(e).includes("do not copy me"));
});

test("the entries no scenario produced (lane, move-ignored) upcast too, from the shapes the code writes", () => {
  const mk = (type: string, data: unknown, subject: string, cause: string, actor: string, seq: number): Entry0 => ({ type, subject, at: 1_700_000_000_000 + seq, actor, cause, data, seq });
  const entries = [
    mk("lane.acquired", { holder: 7, model: "m1", hold: false }, "lane", "task:7", "task:7", 1),
    mk("lane.swapped", { from: "m1", to: "m2", swaps: 1 }, "lane", "task:7", "task:7", 2),
    mk("lane.released", { holder: 7, reason: "owner-restart" }, "lane", "restart", "factory", 3),
    mk("lane.released", { holder: 8 }, "lane", "task:8", "task:8", 4),
    mk("walk.move-ignored", { target: "2-architecture", note: "too late", because: "the walk ended (merged) by the move that settled gate:f:9-pr:1" }, "f", "fm1", "human@x", 5),
  ];
  const events = upcastStream(entries);
  for (const e of events) assert.deepEqual(validateEvent(e), [], e.type);
  assert.equal(events[0].correlation, null);
  assert.equal((events[4].data as any).why, "walk-ended-merged");
  assert.equal((events[4].data as any).noteDigest, digest("too late"));
});

test("a stored event of a version newer than the catalog's is refused by name", () => {
  const e = upcastStream(SAMPLES["left-lane"])[0];
  assert.throws(() => upcastStored({ ...e, schema: "gate.opened/9" }, { digest, siblings: () => [] }), (x: unknown) => x instanceof EventVersionUnknown);
  assert.equal(upcastStored(e, { digest, siblings: () => [] }), e, "a current-version event is returned as is");
  void D64;
});
