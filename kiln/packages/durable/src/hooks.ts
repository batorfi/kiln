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
  "move.ack-sent", // the outcome is determined and is being handed back to the caller
  // the gate task following its decision
  "gate.wake",
  "gate.settled",
  // recovery
  "recover.start",
  // a unit's step (the work is redone after a kill, the result is committed once)
  "unit.step-begin",
  "unit.step-after-work",
  "unit.step-committed",
  // the walk (r14): each point is declared by the task that first fires it
  "walk.admit-opened",
  "walk.admission-read",
  "walk.pin-begin",
  "walk.pin-after-write",
  "walk.pin-committed",
  "walk.unit-created",
  "walk.gate-opening",
  "walk.gate-opened",
  "walk.settled-read",
  "walk.consume-after-write",
  "walk.consume-committed",
  "walk.withdraw-received",
  "walk.withdraw-after-write",
  "walk.withdraw-committed",
  "walk.fix-round-begin",
  "walk.fix-round-committed",
  // the record (r15): mid-commit, after the event is written into its chunk and before the commit returns — a kill here loses the state AND its event together
  "record.append-after-write",
  // the backbone (r15): a batch read; inside the commit that applies it (transactional); after the commit; after a delivery and before its cursor moves (effect)
  "backbone.batch-read",
  "backbone.apply-after-write",
  "backbone.committed",
  "backbone.delivered",
  // the archive (r15): the file is written; verified; mid-commit with its tombstones; committed
  "archive.export-written",
  "archive.verified",
  "archive.commit-after-write",
  "archive.committed",
  // the lane: before the commit that changes it ends (nothing stored yet) and right after (stored, the generation not yet started / not yet released)
  "lane.acquire-after-write",
  "lane.acquire-committed",
  "lane.release-after-write",
  "lane.release-committed",
] as const;
/** The points of the gate's own life (the gate proofs drive these); the unit points are driven by the unit proof, the lane points by the lane proof, the walk points by the walk proof (r14). */
export const GATE_KILL_POINTS: readonly string[] = KILL_POINTS.filter((p) => !/^(unit|lane|walk|record|backbone|archive)\./.test(p));
/** r15: the record's own points (the event append). */
export const RECORD_KILL_POINTS: readonly string[] = KILL_POINTS.filter((p) => p.startsWith("record."));
/** r15: the backbone's points (a batch read, applied, committed, delivered). */
export const BACKBONE_KILL_POINTS: readonly string[] = KILL_POINTS.filter((p) => p.startsWith("backbone."));
/** r15: the archive's points (file written, verified, mid-commit, committed). */
export const ARCHIVE_KILL_POINTS: readonly string[] = KILL_POINTS.filter((p) => p.startsWith("archive."));
export const UNIT_KILL_POINTS: readonly string[] = KILL_POINTS.filter((p) => p.startsWith("unit."));
/** r14: the walk's points. Each is declared in `KILL_POINTS` by the task that first fires it (the declared set must EQUAL the set the source uses), so this list grows with the walk. */
export const WALK_KILL_POINTS: readonly string[] = KILL_POINTS.filter((p) => p.startsWith("walk."));
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
