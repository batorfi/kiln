// The owner's channel protocol (contracts/owner-channel.md): newline-delimited JSON, one request per line, replies matched by id. Domain refusals are RESULTS (`ok: true`), exactly the contract's
// vocabulary — nothing is added or renamed in transit; `ok: false` is only for a request that could not be understood.
import type { FeatureMove, FeatureOutcome, GateSpec, GateState, Key, Move, OpenOutcome, Outcome, TaskCreateOutcome } from "../types.ts";
import type { WalkInput } from "../walk/input.ts";
import type { WalkView } from "../walk/view.ts";

export type ChannelRequest =
  | { id: number; op: "ping" }
  | { id: number; op: "ready" }
  | { id: number; op: "gate.open"; key: Key; spec: GateSpec }
  | { id: number; op: "gate.move"; gateId: string; key: Key; move: Move }
  | { id: number; op: "gate.state"; gateId: string }
  // r14: the walk of a feature
  | { id: number; op: "feature.admit"; key: Key; feature: string; walk: WalkInput }
  | { id: number; op: "feature.state"; feature: string }
  | { id: number; op: "feature.next"; feature: string; after?: string }
  | { id: number; op: "feature.move"; feature: string; key: Key; move: FeatureMove };
export type ChannelResult = { pong: true; ready: boolean; pid: number } | { ready: boolean } | OpenOutcome | Outcome | GateState | TaskCreateOutcome | WalkView | FeatureOutcome;
export type ChannelReply = { id: number | null; ok: true; result: ChannelResult } | { id: number | null; ok: false; error: string };

/** The largest request line the owner will read (a brief is JSON, but not a book). */
export const MAX_LINE = 4 * 1024 * 1024;
export const encode = (v: unknown): string => `${JSON.stringify(v)}\n`;
const OPS = ["ping", "ready", "gate.open", "gate.move", "gate.state", "feature.admit", "feature.state", "feature.next", "feature.move"];

export function parseRequest(line: string): ChannelRequest | { error: string; id: number | null } {
  let v: any;
  try {
    v = JSON.parse(line);
  } catch {
    return { error: "bad-request: not JSON", id: null };
  }
  if (typeof v !== "object" || v === null || !Number.isInteger(v.id)) return { error: "bad-request: no integer id", id: null };
  if (!OPS.includes(v.op)) return { error: `bad-request: unknown op "${String(v.op)}"`, id: v.id };
  return v as ChannelRequest;
}
