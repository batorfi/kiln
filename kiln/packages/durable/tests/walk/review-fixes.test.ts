// The code review of r14 (specs/012-…/code-review.md): F1 a feature is admitted once · F3 a feature-level move the walk's end makes moot is recorded as ignored · F4 an abandoned `next` is released ·
// F7 a reserved feature name. (F2 — the re-check inside the move's commit — is exercised on its settled-gate branch by F3; its open-gate branch needs a gate to open between a snapshot and a
// commit, which no named hook reaches.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openFactory } from "#durable/factory.ts";
import type { Refusal } from "#durable/types.ts";
import { DECIDER, mkMove, PLAIN, walkTo, withFactory } from "./support.ts";

test("F1: a feature is admitted once — the same key repeats, another key is refused by name, and the first walk is untouched", () => withFactory(async (f) => {
  const a = await f.walks.admit("adm-1", "dup", PLAIN);
  assert.equal(a.status, "created");
  assert.deepEqual(await f.walks.admit("adm-1", "dup", PLAIN), { status: "repeat", id: (a as { id: number }).id });

  const b = await f.walks.admit("adm-2", "dup", PLAIN);
  assert.equal(b.status, "refused");
  assert.equal((b as Refusal).reason, "key-conflict");
  assert.equal((b as Refusal).original, "adm-1");
  assert.match((b as Refusal).detail ?? "", /already has a walk/);

  const rows = (await f.tasks.list()).filter((t) => t.kind === "kiln.row");
  assert.equal(rows.length, 1, "no second row was created");
  const v = await f.walks.next("dup");
  assert.equal(v.openGate?.gateId, "gate:dup:gate0:1", "the first walk still opens its admission gate");
  assert.deepEqual(f.reports, [], "nothing failed or parked");
}));

test("F1: a feature whose walk has ended cannot be admitted again either", () => withFactory(async (f) => {
  await f.walks.admit("adm-1", "gone", PLAIN);
  const g = (await f.walks.next("gone")).openGate!;
  await f.gates.submit(g.gateId, "no", mkMove(g, { kind: "reject", note: "not now" }));
  assert.equal((await f.walks.next("gone", g.gateId)).status, "not-admitted");
  const again = await f.walks.admit("adm-2", "gone", PLAIN);
  assert.equal(again.status, "refused");
  assert.equal((again as Refusal).reason, "key-conflict");
}));

test("F7: the name `lane` is reserved (it is the subject of the lane's own entries)", () => withFactory(async (f) => {
  const r = await f.walks.admit("adm-1", "lane", PLAIN);
  assert.equal(r.status, "refused");
  assert.match((r as Refusal).detail ?? "", /reserved/);
}));

test("F4: a `next` whose caller went away is released at once and rejects", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", PLAIN);
  const g = (await f.walks.next("f")).openGate!;
  const gone = new AbortController();
  const waiting = f.walks.next("f", g.gateId, gone.signal); // nothing will change: it waits
  const outcome = waiting.then(() => "answered", (e: Error) => e.message);
  await new Promise((r) => setTimeout(r, 50));
  gone.abort();
  assert.equal(await outcome, "the caller went away");
  // and an already-aborted signal never starts a wait
  await assert.rejects(f.walks.next("f", g.gateId, gone.signal), /went away/);
  // the walk itself is unaffected: a fresh `next` still answers when something changes
  await f.gates.submit(g.gateId, "ap", mkMove(g, { admit: {} }));
  assert.notEqual((await f.walks.next("f", g.gateId)).openGate?.gateId, g.gateId);
}));

test("F3: a feature-level move that arrives while the person's own move is being consumed, and whose walk then ENDS, is recorded as ignored — never silently dropped", async () => {
  const dir = mkdtempSync(join(tmpdir(), "k14-review-"));
  let hold: Promise<void> | null = null;
  let release!: () => void;
  let held!: () => void;
  const reached = new Promise<void>((r) => (held = r));
  const f = await openFactory({
    store: join(dir, "s"),
    hooks: {
      at(p) {
        // the row has read the stored move at Merge and has not yet committed the consequence
        if (p === "walk.settled-read" && hold) {
          const h = hold;
          hold = null;
          held();
          return h;
        }
      },
      fault() {},
    },
  });
  try {
    await f.ready;
    await f.walks.admit("k1", "f", PLAIN);
    const at = await walkTo(f, "f", "9-pr");
    hold = new Promise<void>((r) => (release = r));
    const g = at.openGate!;
    assert.equal((await f.gates.submit(g.gateId, "ap", mkMove(g, {}))).status, "committed");
    await reached; // the gate is settled, the walk has not consumed it

    const r = await f.walks.move("f", "fm1", { kind: "reject", decidedBy: DECIDER, target: "2-architecture", note: "too late" });
    assert.equal(r.status, "committed", "the move is accepted: it is recorded to be applied after the person's own move");
    release();

    const v = await f.walks.next("f", g.gateId);
    assert.equal(v.status, "done", "the person's approve ended the walk");
    const ignored = v.history.filter((h) => h.type === "walk.move-ignored");
    assert.equal(ignored.length, 1);
    assert.equal(ignored[0].cause, "fm1");
    assert.equal(ignored[0].actor, DECIDER);
    assert.match(String((ignored[0].data as { because: string }).because), /the walk ended \(merged\)/);
    assert.equal(v.history.filter((h) => h.type === "walk.returned").length, 0, "nothing was sent back");
  } finally {
    release?.();
    await f.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
});
