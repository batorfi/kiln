// Kill points and fault points as INJECTED hooks (research R7). The product calls `hooks.at(name)` at each named step; the default is a no-op. There is no environment
// variable anywhere under src/ that can kill or fault a factory — the test-only child owner (tests/proof/support/owner-main.ts) is the one place that arms a point.
// The declared lists below are the contract of the proof: a static test asserts that the names used in the source EQUAL these lists, and the proof fails by name
// when a declared point never fired (FR-060, FR-061).

export const KILL_POINTS = [
  // opening a gate
  "open.begin",
  "open.after-write",
  "open.committed",
  // waiting, and the move
  "wait.before-register",
  "wait.registered",
  "move.received",
  "move.commit-begin",
  "move.commit-after-read",
  "move.commit-after-write",
  "move.committed",
  "move.ack-sent",
  // the gate task following its decision
  "gate.wake",
  "gate.settled",
  // recovery
  "recover.start",
] as const;
export type KillPoint = (typeof KILL_POINTS)[number] | (string & {});

export const FAULT_POINTS = ["store-write"] as const;
export type FaultPoint = (typeof FAULT_POINTS)[number];

export interface Hooks {
  /** Called at a named step; a test-only implementation may end the process here, or return a promise to hold the step back (the product awaits it). */
  at(point: KillPoint): void | Promise<void>;
  /** Called where a store failure can be injected; a test-only implementation may throw here. */
  fault(point: FaultPoint): void;
}
export const NO_HOOKS: Hooks = { at() {}, fault() {} };
