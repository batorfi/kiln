// Version 0 → 1 (research R7, contracts/event-catalog.md §4). A stored entry with no `schema` is what r13/r14 wrote; it is presented as a current-version event WITHOUT being rewritten.
// Pure for a fixed `ctx`: the same entry gives the same event. Inline content (a note, a reasoning) is never presented — the event carries a reference and a digest instead (Clarification Q1),
// and a rendered sentence is dropped. Everything here uses only the entry, its siblings and an injected digest function.
import { catalog as shipped, type CatalogEntry } from "./catalog/index.ts";
import { correlationOf, refString } from "./grammar.ts";
import { uuid7 } from "./id.ts";
import type { Ctx, Entry0, Event } from "./types.ts";

export class EventVersionUnknown extends Error {
  readonly type: string;
  readonly schema: string;
  constructor(type: string, schema: string) {
    super(`event-version-unknown: ${type} is stored as "${schema}", newer than this reader's catalog knows`);
    this.type = type;
    this.schema = schema;
  }
}
export class EventSiblingMissing extends Error {
  constructor(entry: Entry0, what: string) {
    super(`event-sibling-missing: ${entry.type} #${entry.seq} (cause "${entry.cause}") needs ${what}, which is not earlier in the stream`);
  }
}

/** Stable JSON text (keys sorted) for the digest of an entry we do not understand. */
export function stable(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(",")}}`;
}

const featureOf = (subject: string): string => /^gate:([^:]+):/.exec(subject)?.[1] ?? subject;
const gateIdOf = (subject: string, gateKey: unknown, round: unknown): string => `gate:${featureOf(subject)}:${String(gateKey)}:${String(round)}`;
const pair = (prefix: string, locator: string, text: unknown, ctx: Ctx): Record<string, string> => ({ [`${prefix}Ref`]: locator, [`${prefix}Digest`]: ctx.digest(typeof text === "string" ? text : "") });
const drop = (o: Record<string, unknown>, ...keys: string[]): Record<string, unknown> => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

/** The current-version `data` of a version 0 entry, or throws. */
function dataOf(e: Entry0, ctx: Ctx): { type: string; data: unknown } {
  const d = (e.data ?? {}) as Record<string, unknown>;
  const feature = featureOf(e.subject);
  switch (e.type) {
    case "gate.opened": {
      const round = Number(e.subject.split(":").pop());
      return { type: e.type, data: { ...d, ...(/^gate:/.test(e.subject) && Number.isInteger(round) ? { round } : {}) } };
    }
    case "move.committed": return { type: e.type, data: { ...d, decidedBy: e.actor } };
    case "gate.settled": {
      const move = ctx.siblings(e.seq, e.cause).find((s) => s.type === "move.committed" && s.subject === e.subject);
      if (!move) throw new EventSiblingMissing(e, "its move.committed");
      const m = move.data as { kind: string; decidedBy: string };
      return { type: e.type, data: { key: d.key, move: m.kind, decidedBy: m.decidedBy } };
    }
    case "gate.withdrawn": return { type: e.type, data: { target: d.target, ...pair("note", refString({ kind: "feature-move", feature, key: e.cause }), d.note, ctx) } };
    case "gate.not-applicable":
    case "gate.became-applicable": {
      const r = (d.reason ?? {}) as Record<string, unknown>;
      return { type: e.type, data: { gate: d.gate, reason: drop(r, "text") } };
    }
    case "gate.skipped": return { type: e.type, data: { gate: d.gate, ...pair("reasoning", refString({ kind: "triage", feature }), d.reasoning, ctx) } };
    case "walk.admitted":
    case "walk.completed":
    case "walk.fix-round":
    case "lane.acquired":
    case "lane.swapped":
    case "lane.released": return { type: e.type, data: d };
    case "walk.returned": {
      const feature_level = d.scope === "feature";
      const locator = feature_level ? refString({ kind: "feature-move", feature, key: e.cause }) : refString({ kind: "move", gateId: gateIdOf(e.subject, d.from, d.round) });
      return { type: e.type, data: { ...drop(d, "note"), ...pair("note", locator, d.note, ctx) } };
    }
    case "walk.split": {
      const move = ctx.siblings(e.seq, e.cause).find((s) => s.type === "move.committed" && /^gate:/.test(s.subject));
      if (!move) throw new EventSiblingMissing(e, "the move.committed it was made by");
      return { type: e.type, data: { from: d.from, ...pair("remainder", refString({ kind: "move", gateId: move.subject }), d.remainder, ctx) } };
    }
    case "walk.left-lane": return { type: e.type, data: { ...drop(d, "note"), ...pair("note", refString({ kind: "move", gateId: gateIdOf(e.subject, d.from, d.round) }), d.note, ctx) } };
    case "walk.not-admitted": return { type: e.type, data: { ...drop(d, "note"), ...pair("note", refString({ kind: "move", gateId: gateIdOf(e.subject, d.gate, d.round) }), d.note, ctx) } };
    case "walk.move-ignored": {
      const m = /ended \((merged|left-lane|not-admitted)\)/.exec(String(d.because ?? ""));
      return { type: e.type, data: { target: d.target, ...pair("note", refString({ kind: "feature-move", feature, key: e.cause }), d.note, ctx), why: `walk-ended-${m ? m[1] : "merged"}` } };
    }
    default: return { type: "record.unknown", data: { originalType: e.type, digest: ctx.digest(stable(e.data)) } };
  }
}

/** A version 0 entry as a current-version event. */
export function upcastEntry(e: Entry0, ctx: Ctx, catalog: ReadonlyMap<string, CatalogEntry> = shipped): Event {
  const { type, data } = dataOf(e, ctx);
  const c = catalog.get(type);
  if (!c) throw new EventVersionUnknown(type, `${type}/?`);
  return {
    id: uuid7(e.at, e.seq), seq: e.seq, type, schema: `${type}/${c.current}`, time: new Date(e.at).toISOString(), subject: e.subject, actor: e.actor,
    correlation: correlationOf(e.subject), causation: e.cause.startsWith("evt:") ? e.cause : `cmd:${e.cause}`, trace: null, privacy: c.privacy, data,
  };
}

/** A stored event of this schema is read as-is when its version is the catalog's current one; a newer one is refused by name. Older versions of a type go through that type's upcasters. */
/** `catalog` is the shipped one unless a test hands in another (a breaking version with its upcaster). */
export function upcastStored(stored: Event, ctx: Ctx, catalog: ReadonlyMap<string, CatalogEntry> = shipped): Event {
  const [type, v] = stored.schema.split("/");
  const c = catalog.get(type);
  const version = Number(v);
  if (!c || !Number.isInteger(version) || version > c.current) throw new EventVersionUnknown(type, stored.schema);
  let e = stored;
  for (let n = version; n < c.current; n++) {
    const up = c.upcast?.[n];
    if (!up) throw new EventVersionUnknown(type, `${type}/${n} has no upcaster`);
    e = up(e, ctx);
  }
  return e;
}
