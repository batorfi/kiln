// The owner-level wait slots (research R2). A gate's decision step registers a single-shot slot here and awaits it; a move wakes it. This is MEMORY by design — the library offers no
// durable "wait for an outside event" — and everything that matters is judged against the STORED record, never this map. After a restart the step re-runs from its top and registers again;
// until it has, a move is answered `not-ready` (FR-043).
import type { Key, Move } from "../types.ts";

export type SlotResult = "committed" | "lost" | { error: string };
export interface SlotRequest {
  key: Key;
  move: Move;
  done(result: SlotResult): void;
}
export interface Slot {
  /** The decision step has (re-)registered and is awaiting a move. */
  registered: boolean;
  /** A submission has taken the slot and its commit is in flight. */
  taken: boolean;
  deliver?: (r: SlotRequest | undefined) => void;
  /** Settles when the in-flight submission's commit has finished (committed, lost or failed). */
  inflight?: Promise<void>;
}
export class Slots {
  private readonly m = new Map<string, Slot>();
  get(gateId: string): Slot | undefined {
    return this.m.get(gateId);
  }
  set(gateId: string, slot: Slot): void {
    this.m.set(gateId, slot);
  }
  /** Remove it only if it is still THIS slot (a re-run may already have registered a newer one). */
  delete(gateId: string, slot: Slot): void {
    if (this.m.get(gateId) === slot) this.m.delete(gateId);
  }
  /** Gate ids whose decision step is registered right now. */
  registered(): string[] {
    return [...this.m.entries()].filter(([, s]) => s.registered).map(([id]) => id);
  }
}
