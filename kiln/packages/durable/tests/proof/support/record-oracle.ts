// The record's invariants, judged by a FRESH reader of the store file (no owner, no memory), after any run or any kill (research R14, data-model §9):
//   E1  sequence numbers are 1…N with no gap or repeat; `head.next` is N+1; every chunk holds exactly its range
//   E2  every event is valid against the schema its `schema` field names
//   E3  every event has an actor in the grammar and a causation
//   E7  state ⇔ event: each gate document, move record, terminal unit, lane change, ledger entry and walk outcome has exactly its one event, and no such event lacks its state
// (E4 projections, E5 cursors and E6 archives are added by their stories.) A violation is a string `E<n>: …` naming the thing; an empty list is clean.
import { validateEvent } from "#record/events/validate.ts";
import { openReader } from "#durable/library/open.ts";
import { CHUNK, type EventChunk, type RecordHead } from "#durable/record/append.ts";
import { collect, fromReader, headOf, readRecord } from "#durable/record/read.ts";
import type { Event } from "#contracts/events/types.ts";
import type { GateDocData, MoveDocData } from "#durable/gate/documents.ts";
import type { WalkDoc } from "#durable/walk/doc.ts";

const count = (events: Event[], type: string, pick: (e: Event) => unknown, value: unknown): number => events.filter((e) => e.type === type && pick(e) === value).length;

export async function checkRecordInvariants(store: string): Promise<string[]> {
  const v: string[] = [];
  const r = await openReader(store);
  try {
    const src = fromReader(r);
    const head = await headOf(src);
    let events: Event[];
    try {
      events = await collect(readRecord(src));
    } catch (e) {
      return [`E1: the record cannot be read in order — ${(e as Error).message}`]; // a gap or a missing chunk is the first thing the reader meets
    }

    // ── E1 ──
    events.forEach((e, i) => { if (e.seq !== i + 1) v.push(`E1: event ${i + 1} has seq ${e.seq}`); });
    if (head.next !== events.length + 1) v.push(`E1: head.next is ${head.next} but the record holds ${events.length} events`);
    const stored = await r.snapshot<RecordHead>("kiln.record", "head");
    if (stored) {
      const lastChunk = Math.floor((events.length - 1) / CHUNK);
      for (let n = Math.floor(head.legacyThrough / CHUNK); n <= lastChunk && events.length > head.legacyThrough; n++) {
        const c = await r.snapshot<EventChunk>("kiln.event", String(n));
        const first = Math.max(n * CHUNK + 1, head.legacyThrough + 1);
        const last = Math.min((n + 1) * CHUNK, events.length);
        if (!c || c.events.length !== last - first + 1) v.push(`E1: chunk ${n} holds ${c?.events.length ?? 0} events, expected ${last - first + 1}`);
      }
    }
    // ── E2, E3 ──
    for (const e of events) {
      for (const f of validateEvent(e)) v.push(`${f.code === "event-actor-invalid" || f.code === "event-cause-missing" || f.code === "event-cause-dangling" ? "E3" : "E2"}: ${e.type} #${e.seq} ${f.code} ${f.path ?? ""}`.trim());
    }

    // ── E7 (only for state born under this owner: version 0 stores predate several of these events) ──
    if (head.legacyThrough === 0) {
      for (const g of await r.docs<GateDocData>("kiln.gate")) {
        if (g.value.gateId === undefined) continue;
        const n = count(events, "gate.opened", (e) => e.subject, g.key);
        if (n !== 1) v.push(`E7: gate ${g.key} has ${n} gate.opened events`);
      }
      for (const m of await r.docs<MoveDocData>("kiln.move")) {
        if (m.value.record) {
          const n = count(events, "move.committed", (e) => e.subject, m.key);
          if (n !== 1) v.push(`E7: gate ${m.key} has a move record and ${n} move.committed events`);
        }
        if (m.value.withdrawn) {
          const n = count(events, "gate.withdrawn", (e) => e.subject, m.key);
          if (n !== 1) v.push(`E7: gate ${m.key} is withdrawn and has ${n} gate.withdrawn events`);
        }
      }
      for (const e of events.filter((x) => x.type === "gate.opened")) {
        if ((await r.snapshot<GateDocData>("kiln.gate", e.subject))?.gateId === undefined) v.push(`E7: gate.opened #${e.seq} names ${e.subject}, which has no gate document`);
      }
      for (const e of events.filter((x) => x.type === "move.committed" && (x.data as { scope?: string }).scope !== "feature")) {
        if (!(await r.snapshot<MoveDocData>("kiln.move", e.subject))?.record) v.push(`E7: move.committed #${e.seq} names ${e.subject}, which has no move record`);
      }
      for (const t of await r.tasks({ kind: "kiln.unit" })) {
        const queued = count(events, "unit.queued", (e) => (e.data as { unit: number }).unit, t.id);
        if (queued !== 1) v.push(`E7: unit ${t.id} has ${queued} unit.queued events`);
        const settled = count(events, "unit.settled", (e) => (e.data as { unit: number }).unit, t.id);
        const aborted = count(events, "unit.aborted", (e) => (e.data as { unit: number }).unit, t.id);
        const started = count(events, "unit.started", (e) => (e.data as { unit: number }).unit, t.id);
        if (started > 1) v.push(`E7: unit ${t.id} has ${started} unit.started events`);
        const done = t.status === "terminal" ? t.outcome?.status : undefined;
        if (done === "completed" && (settled !== 1 || started !== 1)) v.push(`E7: unit ${t.id} completed with ${started} started and ${settled} settled events`);
        if (done !== "completed" && settled !== 0) v.push(`E7: unit ${t.id} is not completed but has a unit.settled event`);
        if (done === "aborted" && aborted !== 1) v.push(`E7: unit ${t.id} was aborted with ${aborted} unit.aborted events`);
      }
      for (const c of await r.docs<{ key?: string }>("kiln.command")) {
        if (c.value.key === undefined) continue;
        const n = count(events, "command.accepted", (e) => e.causation, `cmd:${c.key}`);
        if (n !== 1) v.push(`E7: ledger entry ${c.key} has ${n} command.accepted events`);
      }
      for (const w of await r.docs<WalkDoc>("kiln.walk")) {
        const status = w.value.status;
        const outcome: Record<string, string> = { done: "walk.completed", "left-lane": "walk.left-lane", "not-admitted": "walk.not-admitted" };
        for (const [st, type] of Object.entries(outcome)) {
          const n = events.filter((e) => e.type === type && e.subject === w.key).length;
          const want = status === st ? 1 : 0;
          // a walk that left the lane through a feature-level move or a reject at Concept records left-lane once; a done walk once
          if (n !== want) v.push(`E7: walk ${w.key} is ${status} and has ${n} ${type} events (expected ${want})`);
        }
      }
      const lane = await r.snapshot<{ swaps: number; lease: unknown }>("kiln.lane", "main");
      if (lane) {
        const lanes = events.filter((e) => e.type.startsWith("lane."));
        const acquired = lanes.filter((e) => e.type === "lane.acquired").length;
        const released = lanes.filter((e) => e.type === "lane.released").length;
        if (acquired - released !== (lane.lease ? 1 : 0)) v.push(`E7: lane has ${acquired} acquired and ${released} released events but ${lane.lease ? "a" : "no"} lease`);
        const swapped = lanes.filter((e) => e.type === "lane.swapped").length;
        if (swapped !== lane.swaps) v.push(`E7: lane.swaps is ${lane.swaps} but ${swapped} lane.swapped events exist`);
      }
    }
  } finally {
    await r.close();
  }
  return v;
}

/**
 * E5 (research R14): every cursor is at or before the head; a TRANSACTIONAL consumer\'s documents equal a fresh fold to its cursor (the test consumer `count` holds exactly 1…cursor, each once);
 * an EFFECT consumer has delivered everything up to its cursor at least once (the test consumer `deliver-log`: the log contains every seq 1…cursor).
 */
export async function checkConsumerInvariants(store: string, deliveryLog?: string): Promise<string[]> {
  const v: string[] = [];
  const r = await openReader(store);
  try {
    const head = (await headOf(fromReader(r))).next - 1;
    const cursors = await r.docs<{ seq?: number }>("kiln.cursor");
    for (const c of cursors) if ((c.value.seq ?? 0) > head) v.push(`E5: cursor ${c.key} is at ${c.value.seq}, ahead of the head ${head}`);
    const count = cursors.find((c) => c.key === "count")?.value.seq;
    if (count !== undefined) {
      const applied = (await r.snapshot<{ applied?: number[] }>("kiln.projection", "count"))?.applied ?? [];
      const want = Array.from({ length: count }, (_, i) => i + 1);
      if (JSON.stringify(applied) !== JSON.stringify(want)) v.push(`E5: consumer count has applied ${applied.length} events but its cursor is ${count} (applied once each, in order, would be 1…${count})`);
    }
    const dl = cursors.find((c) => c.key === "deliver-log")?.value.seq;
    if (dl !== undefined && deliveryLog) {
      const { existsSync, readFileSync } = await import("node:fs");
      const got = new Set((existsSync(deliveryLog) ? readFileSync(deliveryLog, "utf8") : "").split("\n").filter(Boolean).map(Number));
      const missing = Array.from({ length: dl }, (_, i) => i + 1).filter((n) => !got.has(n));
      if (missing.length) v.push(`E5: consumer deliver-log has a cursor at ${dl} but never delivered ${missing.length} of those events (first: ${missing[0]})`);
    }
  } finally {
    await r.close();
  }
  return v;
}
