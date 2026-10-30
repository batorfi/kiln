// The record's event (research R3, data-model §1). Pure types: no I/O, no clock, no `node:` import.
export type Privacy = "public" | "internal" | "sensitive";

export interface Event<D = unknown> {
  /** UUIDv7-shaped and DETERMINISTIC: a function of (time, seq) only — see id.ts. Sorts by (time, seq). */
  id: string;
  /** 1…N, gap-free, one writer per factory. */
  seq: number;
  /** A catalog type, e.g. "gate.settled". */
  type: string;
  /** "<type>/<version>", e.g. "gate.settled/1". */
  schema: string;
  /** ISO-8601 UTC instant: the clock of the commit that wrote it. */
  time: string;
  /** What it is about: "gate:<feature>:<key>:<round>" · "<feature>" · "lane" · "factory". */
  subject: string;
  actor: string;
  /** "run:<feature>" for anything belonging to a feature run; null for the factory's own events. */
  correlation: string | null;
  /** "cmd:<key>" (a command or move key) or "evt:<seq>" (an earlier event). */
  causation: string;
  /** Present, and null until telemetry exists (r28). */
  trace: string | null;
  privacy: Privacy;
  /** Facts and {ref, digest} pairs only (FR-006). */
  data: D;
}

/** What an upcaster may use besides the entry itself. Pure for a fixed `digest` and a fixed stream (research R7). */
export interface Ctx {
  digest(text: string): string;
  /** The earlier events of the stream with this subject and causation key (a v0 `gate.settled` needs its `move.committed`). */
  siblings(seq: number, key: string): Event[];
}

/** An entry as r13/r14 stored it: version 0, no `schema` field. */
export interface Entry0 {
  type: string;
  subject: string;
  at: number;
  actor: string;
  cause: string;
  data: unknown;
  seq: number;
}

/** A content-bearing fact is mentioned only as a locator and the SHA-256 (hex) of the text it names. */
export interface ContentPair {
  ref: string;
  digest: string;
}
