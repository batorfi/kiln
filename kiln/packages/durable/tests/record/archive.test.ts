// r15 T061/T062 (US7): a finished feature is archived BY THE FACTORY — checksummed, verified before anything is compacted, the record whole, the keys kept — and a failure never costs the feature.
import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { openFactory, type Factory } from "#durable/factory.ts";
import { openReader } from "#durable/library/open.ts";
import { archivePath, readArchive, verifyArchive } from "#durable/record/archive.ts";
import type { ArchiveDoc } from "#durable/record/archive-task.ts";
import { digestOf } from "#durable/record/refs.ts";
import type { Refusal } from "#durable/types.ts";
import { drive, mkMove, PLAIN, walkTo, withFactory, type Chooser } from "../walk/support.ts";

const NOTE = "FR-3 is not testable: give it a number";
const HUMAN = (extra: Chooser = () => ({})): Chooser => (g, n) => ({ kind: "approve", decidedBy: "human@r15-script", ...(g.gateKey === "gate0" ? { admit: {} } : {}), ...extra(g, n) });
/** Approves everything, but revises Specification once with a note (so the walk holds a person's text). */
const WITH_NOTE: Chooser = HUMAN((g) => (g.gateKey === "3-spec" && g.round === 1 ? { kind: "revise", note: NOTE } : {}));
async function until(cond: () => boolean | Promise<boolean>, what: string, ms = 10_000): Promise<void> {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await cond()) return; await new Promise((r) => setTimeout(r, 25)); }
  throw new Error(`timed out waiting for ${what}`);
}
const archiveDoc = async (store: string, feature: string): Promise<ArchiveDoc | undefined> => { const r = await openReader(store); try { return await r.snapshot<ArchiveDoc>("kiln.archive", feature); } finally { await r.close(); } };
const archived = (store: string, feature: string) => async () => (await archiveDoc(store, feature))?.status === "archived";

test("a walk that ends is archived with no command: the file is beside the store, checksummed, and feature.archived names its checksum — once", () => withFactory(async (f, store) => {
  await f.walks.admit("k1", "w", PLAIN);
  assert.equal((await drive(f, "w", WITH_NOTE)).last.status, "done");
  await until(archived(store, "w"), "the archive");
  const mark = (await archiveDoc(store, "w"))!;
  assert.match(mark.archive!, /^w-[0-9a-f]{8}\.kiln-archive$/);
  assert.ok(existsSync(archivePath(store, mark.archive!)));
  await verifyArchive(store, { name: mark.archive!, sha256: mark.sha256!, bytes: mark.bytes! }, mark.counts);
  const ev = (await f.inspect()).outbox.filter((e) => e.type === "feature.archived");
  assert.equal(ev.length, 1);
  assert.deepEqual([ev[0].actor, ev[0].subject, ev[0].correlation], ["system", "w", "run:w"]);
  assert.equal((ev[0].data as any).sha256, mark.sha256);
  assert.equal(readdirSync(join(store, "archive")).filter((n) => n.includes(".tmp")).length, 0);
}));

test("the record is unchanged by archiving, and the feature stays readable from it", () => withFactory(async (f, store) => {
  await f.walks.admit("k1", "w", PLAIN);
  await drive(f, "w", WITH_NOTE);
  const beforeEvents = (await f.inspect()).outbox.filter((e) => e.type !== "feature.archived" && !e.type.startsWith("command."));
  await until(archived(store, "w"), "the archive");
  const after = (await f.inspect()).outbox;
  assert.deepEqual(after.filter((e) => e.type !== "feature.archived" && !e.type.startsWith("command.")).map((e) => e.seq), beforeEvents.map((e) => e.seq), "every event is still there, at its number");
  assert.equal(after.filter((e) => e.type === "feature.archived").length, 1, "plus the one");
  const v = await f.walks.state("w");
  assert.equal(v.status, "done");
  assert.ok(v.history.length > 40 && v.history.some((h) => h.type === "walk.completed"));
}));

test("the live store keeps digests and keys, not text: briefs and notes are tombstoned, the archive holds them", () => withFactory(async (f, store) => {
  await f.walks.admit("k1", "w", PLAIN);
  await drive(f, "w", WITH_NOTE);
  await until(archived(store, "w"), "the archive");
  const r = await openReader(store);
  try {
    const briefs = (await r.docs<{ content?: any; briefRef?: string; archivedIn?: string }>("kiln.brief")).filter((d) => d.key.startsWith("gate:w:"));
    assert.ok(briefs.length >= 10 && briefs.every((b) => b.value.content?.archived === true && b.value.archivedIn && b.value.briefRef), "every brief: content gone, its reference kept");
    const moves = (await r.docs<{ record: { key: string; move: { note?: string; noteDigest?: string; kind: string } } | null }>("kiln.move")).filter((d) => d.key.startsWith("gate:w:") && d.value.record);
    const revised = moves.find((m) => m.value.record!.move.kind === "revise")!;
    assert.equal(revised.value.record!.move.note, undefined, "the note text is no longer in the live store");
    assert.equal(revised.value.record!.move.noteDigest, digestOf(NOTE));
    assert.ok(moves.every((m) => !("note" in m.value.record!.move)));
    const gates = (await r.docs<{ gateId?: string }>("kiln.gate")).filter((d) => d.key.startsWith("gate:w:"));
    assert.ok(gates.length >= 10 && gates.every((g) => g.value.gateId), "gate documents stay whole");
  } finally { await r.close(); }
  const mark = (await archiveDoc(store, "w"))!;
  const a = readArchive(store, mark.archive!);
  assert.ok(a.docs.some((d) => d.name === "kiln.move" && d.value.record?.move.note === NOTE), "the archive holds the note text");
  assert.ok(a.docs.some((d) => d.name === "kiln.brief" && d.value.content?.kind === "gate"), "and the brief content");
  assert.equal(a.events.length, mark.counts!.events);
  assert.ok(a.tasks.length >= 20 && a.tasks.some((t) => t.taskKind === "kiln.row"));
  assert.ok(mark.keys!.some((k) => k.startsWith("m:gate:w:")), "the move keys are carried");
}));

test("an archived feature's keys are not reusable: a repeat is a repeat, another note a key-conflict, another key stale — never new — and the name cannot be admitted again", () => withFactory(async (f, store) => {
  await f.walks.admit("k1", "w", PLAIN);
  const d = await drive(f, "w", WITH_NOTE);
  await until(archived(store, "w"), "the archive");
  const rev = d.steps.find((s) => s.kind === "revise")!;
  const refBrief = ((await openReader(store).then(async (r) => { const b = await r.snapshot<{ briefRef: string }>("kiln.gate", rev.gateId); await r.close(); return b; })))!.briefRef;
  const same = await f.gates.submit(rev.gateId, `m:${rev.gateId}`, { kind: "revise", decidedBy: "human@r15-script", briefRef: refBrief, note: NOTE });
  assert.equal(same.status, "repeat", JSON.stringify(same));
  const other = await f.gates.submit(rev.gateId, `m:${rev.gateId}`, { kind: "revise", decidedBy: "human@r15-script", briefRef: refBrief, note: "another note" });
  assert.deepEqual([other.status, (other as Refusal).reason], ["refused", "key-conflict"]);
  const stale = await f.gates.submit(rev.gateId, "someone-elses-key", { kind: "approve", decidedBy: "human@r15-script", briefRef: refBrief });
  assert.equal((stale as Refusal).reason, "stale");
  const again = await f.walks.admit("a-new-key", "w", PLAIN);
  assert.deepEqual([again.status, (again as Refusal).reason], ["refused", "key-conflict"], "the feature name is not admittable again");
}));

test("a walk that left the lane, and one that was not admitted, are archived too", () => withFactory(async (f, store) => {
  await f.walks.admit("k1", "gone", PLAIN);
  const at = await walkTo(f, "gone", "1-concept");
  await f.gates.submit(at.openGate!.gateId, "x", mkMove(at.openGate!, { kind: "reject", note: "not worth it", target: "roadmap", decidedBy: "human@r15-script" }));
  await f.walks.admit("k2", "no", PLAIN);
  const g = (await f.walks.next("no")).openGate!;
  await f.gates.submit(g.gateId, "n", mkMove(g, { kind: "reject", note: "not now", decidedBy: "human@r15-script" }));
  await until(archived(store, "gone"), "the left-lane archive");
  await until(archived(store, "no"), "the not-admitted archive");
  assert.equal((await f.inspect()).outbox.filter((e) => e.type === "feature.archived").length, 2);
}));

// ── T062: failure paths ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import type { Hooks } from "#durable/hooks.ts";

async function withHookedFactory(hooks: Hooks, run: (f: Factory, store: string, reopen: () => Promise<Factory>) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "k15-archfail-"));
  const store = join(dir, "s");
  const opened: Factory[] = [];
  try {
    const f = await openFactory({ store, hooks });
    opened.push(f);
    await f.ready;
    await run(f, store, async () => { await opened[opened.length - 1].close(); const g = await openFactory({ store }); opened.push(g); await g.ready; return g; });
  } finally {
    for (const f of opened) await f.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
}
const noFeatureArchived = async (f: Factory) => (await f.inspect()).outbox.filter((e) => e.type === "feature.archived").length === 0;

test("a damaged archive is reported by name, NOTHING is compacted, other features and the feature itself are unaffected, and the next start archives it properly", async () => {
  let damaged = 0;
  let where = "";
  const hooks: Hooks = { at(p) { if (p === "archive.export-written" && damaged++ === 0) { for (const n of readdirSync(join(where, "archive"))) appendFileSync(join(where, "archive", n), "garbage\n"); } }, fault() {} };
  await withHookedFactory(hooks, async (f, store, reopen) => {
    where = store;
    await f.walks.admit("k1", "a", PLAIN);
    assert.equal((await drive(f, "a", HUMAN())).last.status, "done");
    await until(async () => (await archiveDoc(store, "a"))?.status === "failed", "the failure to be recorded");
    const mark = (await archiveDoc(store, "a"))!;
    assert.match(mark.error!, /archive-checksum-mismatch/, "reported by name");
    assert.ok(await noFeatureArchived(f), "no feature.archived event");
    const r = await openReader(store);
    try {
      const briefs = (await r.docs<{ content?: any }>("kiln.brief")).filter((d) => d.key.startsWith("gate:a:"));
      assert.ok(briefs.length > 0 && briefs.every((b) => b.value.content?.archived !== true), "nothing was compacted: every brief still has its content");
    } finally { await r.close(); }
    // another feature walks to its end meanwhile
    await f.walks.admit("k2", "b", PLAIN);
    assert.equal((await drive(f, "b", HUMAN())).last.status, "done");
    await until(archived(store, "b"), "the other feature to be archived");
    assert.equal((await f.walks.state("a")).status, "done", "the failed one is whole and readable");
    // the next start tries again — and this time the archive is whole
    const g = await reopen();
    await until(archived(store, "a"), "the retry at the next start");
    await verifyArchive(store, { name: (await archiveDoc(store, "a"))!.archive!, sha256: (await archiveDoc(store, "a"))!.sha256!, bytes: (await archiveDoc(store, "a"))!.bytes! });
    assert.equal((await g.inspect()).outbox.filter((e) => e.type === "feature.archived" && e.subject === "a").length, 1);
  });
});

test("an I/O failure while writing the archive is recorded, retried at the next start, and the walk's end was never delayed", async () => {
  let failures = 0;
  const hooks: Hooks = { at(p) { if (p === "archive.export-written" && failures++ === 0) throw new Error("injected: the disk is full"); }, fault() {} };
  await withHookedFactory(hooks, async (f, store, reopen) => {
    await f.walks.admit("k1", "a", PLAIN);
    const t0 = Date.now();
    assert.equal((await drive(f, "a", HUMAN())).last.status, "done");
    assert.ok(Date.now() - t0 < 3000, "the walk ended in its usual time, whatever the archive did");
    await until(async () => (await archiveDoc(store, "a"))?.status === "failed", "the failure");
    assert.match((await archiveDoc(store, "a"))!.error!, /disk is full/);
    await reopen();
    await until(archived(store, "a"), "the retry");
  });
});

test("nothing is archived while the walk is running — only an ended walk has an archive task", () => withFactory(async (f, store) => {
  await f.walks.admit("k1", "w", PLAIN);
  await walkTo(f, "w", "6-review");
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(existsSync(join(store, "archive")), false);
  assert.equal((await f.tasks.list()).filter((t) => t.kind === "kiln.archive").length, 0);
}));

test("an event that lands in the run between the export and the compacting commit is not lost: the stale file is not committed, the run is exported again, and the final archive holds the event", async () => {
  const { appendEvent } = await import("#durable/record/append.ts");
  let services: { store: { commit: (fn: (tx: any) => Promise<unknown>) => Promise<unknown> } } | undefined;
  let late = 0;
  const hooks: Hooks = {
    async at(p) {
      if (p === "archive.verified" && late++ === 0) await services!.store.commit((tx) => appendEvent(tx, { type: "lane.released", subject: "lane", at: Date.now(), actor: "factory", cause: "late", correlation: "run:w", data: { holder: 4242 } }));
    },
    fault() {},
  };
  const dir = mkdtempSync(join(tmpdir(), "k15-archstale-"));
  const store = join(dir, "s");
  const f = await openFactory({ store, hooks, tasks: (s) => { services = s as never; return []; } });
  try {
    await f.ready;
    await f.walks.admit("k1", "w", PLAIN);
    assert.equal((await drive(f, "w", HUMAN())).last.status, "done");
    await until(archived(store, "w"), "the archive").catch(async (e) => { throw new Error(`${e.message}: ${JSON.stringify(await archiveDoc(store, "w"))}`); });
    const mark = (await archiveDoc(store, "w"))!;
    const a = readArchive(store, mark.archive!);
    assert.ok(a.events.some((e) => e.type === "lane.released" && (e.data as { holder: number }).holder === 4242), "the final archive holds the event that arrived after the first export");
    assert.equal((await f.inspect()).outbox.filter((e) => e.type === "feature.archived").length, 1, "archived once");
    assert.equal(late, 2, "the verified point was reached twice: the stale file was dropped and the run exported again");
  } finally {
    await f.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
});
