// The factory-log, as a PROJECTION of the record (research R9, FR-040/FR-041): a pure reducer from one feature run\'s events to the first program\'s lines. It reads nothing but the events (and, optionally,
// a resolver for the text a reference names): no clock, no path, no process id, no other run — so a rebuild on any machine gives the same bytes, and the live projection (which folds the same
// events one batch at a time through `step`) cannot differ from a rebuild.
import { GATE_KEY_OF, type GateId } from "#contracts/moves.ts";
import type { Event } from "#contracts/events/types.ts";

export interface LogState {
  /** The next line number (the first program counted from 0). */
  seq: number;
  /** Lane swaps seen in this run: the `switches` of a settlement that does not carry its own cost. */
  switches: number;
  /** Milliseconds of the run\'s first event: the start of the wall clock a settlement reports. */
  firstMs: number | null;
  /** The flow each gate subject was opened under. */
  flows: Record<string, "v1" | "v2">;
}
export const initialState = (): LogState => ({ seq: 0, switches: 0, firstMs: null, flows: {} });

/** The text a `…Ref` names, or undefined (the reducer then leaves the field out: the record never held it). */
export type Resolver = (ref: string) => string | undefined;

const KEY_TO_ID: Record<string, GateId> = Object.fromEntries(Object.entries(GATE_KEY_OF).map(([id, key]) => [key, /^[0-9]+$/.test(id) ? Number(id) : id])) as Record<string, GateId>;
const gateKeyOf = (subject: string): string | undefined => /^gate:[^:]+:([^:]+):[0-9]+$/.exec(subject)?.[1];
const pad2 = (n: number): string => String(n).padStart(2, "0");
/** "MM:SS", or "HH:MM:SS" from a hundred minutes: the first program\'s `wallClock` pattern. */
export function wallClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return m >= 100 ? `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}:${pad2(s % 60)}` : `${pad2(m)}:${pad2(s % 60)}`;
}
const defined = (o: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/** Folds ONE event into the state; returns the new state and the lines it produced (zero or one). Never mutates its input. */
export function step(prev: LogState, e: Event, resolve?: Resolver): { state: LogState; lines: string[] } {
  const state: LogState = { ...prev, flows: { ...prev.flows } };
  const t = Date.parse(e.time);
  if (state.firstMs === null) state.firstMs = t;
  const d = e.data as Record<string, any>;
  let line: [string, Record<string, unknown>] | null = null;

  switch (e.type) {
    case "gate.opened":
      if (d.flow === "v1" || d.flow === "v2") state.flows[e.subject] = d.flow;
      break;
    case "lane.swapped":
      state.switches += 1;
      break;
    case "lane.transition":
      line = ["transition", defined({ kind: d.kind, from: d.from, to: d.to, reason: d.reason })];
      break;
    case "lane.cost-recorded":
      line = ["cost", { switches: d.switches, wallClock: d.wallClock }];
      break;
    case "move.committed": {
      if (d.scope === "feature") break; // sent back from the feature, not a gate\'s decision
      const note = typeof d.noteRef === "string" ? resolve?.(d.noteRef) : undefined;
      line = ["human-decision", defined({ gate: d.gate ?? gateKeyOf(e.subject) ?? e.subject, decidedBy: d.decidedBy, move: d.kind, note })];
      break;
    }
    case "gate.settled": {
      const key = gateKeyOf(e.subject) ?? e.subject;
      const flow = state.flows[e.subject];
      line = ["gate-completion", defined({
        gate: KEY_TO_ID[key] ?? key, move: d.move, cost: d.cost ?? { switches: state.switches, wallClock: wallClock(t - state.firstMs!) }, decidedBy: d.decidedBy, flow,
      })];
      break;
    }
    case "gate.completed":
      line = ["gate-completion", defined({
        gate: d.gate, move: d.move, cost: d.cost, decidedBy: d.decidedBy,
        preDelegation: d.preDelegation ? defined({ of: d.preDelegation.of, by: d.preDelegation.by, at: d.preDelegation.at, reviewer: d.preDelegation.reviewer, note: "no objections" }) : undefined, flow: d.flow,
      })];
      break;
    case "gate.waiting":
      line = ["wait", { gate: d.gate, token: d.token, deadline: d.deadline }];
      break;
    case "delegation.armed":
      line = ["pre-delegation", defined({ of: d.of, by: d.by, at: d.at, reviewer: d.reviewer, note: "no objections" })];
      break;
    default:
      break;
  }
  if (!line) return { state, lines: [] };
  const [recordType, payload] = line;
  const text = JSON.stringify({ recordType, ts: e.time, seq: state.seq, [recordType]: payload });
  state.seq += 1;
  return { state, lines: [text] };
}

/** A run\'s whole factory-log, rebuilt from its first event. */
export function foldRun(events: readonly Event[], resolve?: Resolver): string[] {
  let state = initialState();
  const out: string[] = [];
  for (const e of events) {
    const r = step(state, e, resolve);
    state = r.state;
    out.push(...r.lines);
  }
  return out;
}

/** The bytes of the file: one line each, `\n`-terminated (the first program\'s JSONL). An empty run is an empty file. */
export const fileOf = (lines: readonly string[]): string => lines.map((l) => `${l}\n`).join("");
