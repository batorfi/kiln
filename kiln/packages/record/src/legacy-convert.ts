// The first program\'s factory-log records ↔ events (research R10): how an old walk becomes an event stream in the record\'s format. Pure. The inverse of the reducer
// (projections/factory-log.ts): `foldRun(streamToEvents(lines, name))` must give `lines` back byte for byte — that equality IS the replay proof.
import { uuid7 } from "#contracts/events/id.ts";
import type { Event } from "#contracts/events/types.ts";

export class LegacyConvertError extends Error {}

const actorOf = (decidedBy: unknown): string => (typeof decidedBy === "string" && /^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$/.test(decidedBy) ? decidedBy : "system");

/** One factory-log record (already parsed) as an event of run `name`. `index` is its 0-based position; the event\'s `seq` is `index + 1`. */
export function recordToEvent(rec: Record<string, any>, index: number, name: string): Event {
  if (rec.seq !== index) throw new LegacyConvertError(`record ${index} has seq ${rec.seq}: the first program numbered its lines 0…N-1 without a gap, and a replay cannot reproduce anything else`);
  if (typeof rec.ts !== "string") throw new LegacyConvertError(`record ${index} has no ts`);
  const type = rec.recordType as string;
  let evType: string;
  let data: Record<string, unknown>;
  let actor = "system";
  switch (type) {
    case "transition": evType = "lane.transition"; data = { ...rec.transition }; break;
    case "cost": evType = "lane.cost-recorded"; data = { ...rec.cost }; break;
    case "wait": evType = "gate.waiting"; data = { ...rec.wait }; break;
    case "human-decision": {
      const h = rec["human-decision"];
      if (h.note !== undefined) throw new LegacyConvertError(`record ${index}: a human-decision note is content, which the record never holds; none of the committed walks has one`);
      evType = "move.committed";
      data = { kind: h.move, decidedBy: h.decidedBy, ...(h.gate !== undefined ? { gate: h.gate } : {}) };
      actor = actorOf(h.decidedBy);
      break;
    }
    case "gate-completion": {
      const g = rec["gate-completion"];
      evType = "gate.completed";
      const { note, ...pre } = g.preDelegation ?? {};
      if (g.preDelegation && note !== "no objections") throw new LegacyConvertError(`record ${index}: a pre-delegation note other than "no objections" is not representable`);
      data = { gate: g.gate, move: g.move, cost: g.cost, ...(g.decidedBy !== undefined ? { decidedBy: g.decidedBy } : {}), ...(g.preDelegation ? { preDelegation: pre } : {}), ...(g.flow !== undefined ? { flow: g.flow } : {}) };
      actor = actorOf(g.decidedBy);
      break;
    }
    case "pre-delegation": {
      const p = rec["pre-delegation"];
      if (p.note !== "no objections") throw new LegacyConvertError(`record ${index}: a pre-delegation note other than "no objections" is not representable`);
      const { note: _n, ...rest } = p;
      evType = "delegation.armed"; data = rest;
      break;
    }
    default: throw new LegacyConvertError(`record ${index}: unknown recordType ${JSON.stringify(type)}`);
  }
  const seq = index + 1;
  return {
    id: uuid7(Date.parse(rec.ts), seq), seq, type: evType, schema: `${evType}/1`, time: rec.ts, subject: name, actor, correlation: `run:${name}`, causation: `cmd:legacy-walk:${name}`, trace: null, privacy: "internal", data,
  };
}

/** A whole stream (its JSONL lines) as events. */
export function streamToEvents(lines: readonly string[], name: string): Event[] {
  return lines.filter((l) => l.trim() !== "").map((l, i) => recordToEvent(JSON.parse(l), i, name));
}
