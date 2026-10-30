import { uuid7 } from "#contracts/events/id.ts";

// One valid `data` per catalog type (r15 tests). Used by the catalog, validate and upcast tests; a type with no example here fails `catalog.test.ts`.
export const D64 = "a".repeat(64);
export const REASON = { rule: { paths: ["web/**"], labels: ["ui"], journeys: "any" }, evaluated: { paths: "match", labels: "no-match", journeys: "absent" }, verdict: true };
export const EXAMPLES: Record<string, unknown> = {
  "gate.opened": { briefRef: "b1", gateKey: "3-spec", flow: "v2", round: 1 },
  "gate.waiting": { gate: "gate0", token: "g0001", deadline: "2026-09-12T00:30:00Z" },
  "move.committed": { kind: "approve", decidedBy: "human@r15-script", briefRef: "b1" },
  "gate.settled": { key: "m1", move: "approve", decidedBy: "human@r15-script" },
  "gate.withdrawn": { target: "2-architecture", noteRef: "walk:f/moves/fm1#note", noteDigest: D64 },
  "gate.not-applicable": { gate: "2a-experience", reason: REASON },
  "gate.became-applicable": { gate: "6a-ui-review", reason: REASON },
  "gate.skipped": { gate: "1-concept", reasoningRef: "row:f#triage.reasoning", reasoningDigest: D64 },
  "walk.admitted": { gate: "gate:f:gate0:1", required: [], cap: 2, overrideTriage: false, applicability: { "2a-experience": { applies: false, why: "rule" } }, skipped: [] },
  "walk.returned": { from: "7-verification", round: 1, kind: "reject", target: "@build", recross: ["6-review"], noteRef: "move:gate:f:7-verification:1#note", noteDigest: D64 },
  "walk.split": { from: "5-checkpoint", remainderRef: "move:gate:f:5-checkpoint:1#note", remainderDigest: D64 },
  "walk.left-lane": { from: "1-concept", round: 1, noteRef: "move:gate:f:1-concept:1#note", noteDigest: D64 },
  "walk.not-admitted": { gate: "gate0", round: 1, noteRef: "move:gate:f:gate0:1#note", noteDigest: D64 },
  "walk.completed": { approved: ["1-concept", "9-pr"] },
  "walk.move-ignored": { target: "2-architecture", noteRef: "walk:f/moves/fm1#note", noteDigest: D64, why: "walk-ended-merged" },
  "walk.fix-round": { kind: "mitigate", n: 1, cap: 2, verdict: "fail", pass: 1 },
  "lane.acquired": { holder: 7, model: "m1", hold: false },
  "lane.swapped": { from: "m1", to: "m2", swaps: 1 },
  "lane.released": { holder: 7 },
  "lane.transition": { kind: "swap", from: "m1", to: "m2", reason: "tier strongest → standard" },
  "gate.completed": { gate: 3, move: "approve", cost: { switches: 1, wallClock: "00:00" }, decidedBy: "human@batorfi" },
  "lane.cost-recorded": { switches: 1, wallClock: "00:00" },
  "unit.queued": { unit: 9, label: "author:3-spec:1", owner: "task:4" },
  "unit.started": { unit: 9, label: "author:3-spec:1", owner: "task:4" },
  "unit.settled": { unit: 9, label: "author:3-spec:1", owner: "task:4" },
  "unit.failed": { unit: 9, label: "author:3-spec:1", owner: "task:4" },
  "unit.aborted": { unit: 9, label: "author:3-spec:1", owner: "factory" },
  "command.accepted": { kind: "gate.open", requestHash: D64 },
  "command.refused": { kind: "gate.open", reason: "key-conflict" },
  "feature.archived": { archive: "archive/f-aaaaaaaa.kiln-archive", sha256: D64, bytes: 1234, counts: { docs: 10, tasks: 20, events: 30, texts: 2 } },
  "transcript.aged-out": { archive: "archive/f-aaaaaaaa.kiln-archive" },
  "delegation.armed": { of: "gate:f:4-plan:1", by: "human@batorfi", at: "2026-10-28T10:00:00Z", reviewer: "role:code-reviewer@m1" },
  "charter.approved": { version: "1", digest: D64, by: "human@batorfi" },
  "charter.amended": { version: "2", digest: D64, by: "human@batorfi" },
  "design-system.approved": { version: "1", digest: D64, by: "human@batorfi" },
  "design-system.amended": { version: "2", digest: D64, by: "human@batorfi" },
  "server.started": { contract: 3, libraryVersion: "1.4.0" },
  "server.recovered": { contract: 3, libraryVersion: "1.4.0" },
  "store.migrated": { from: 2, to: 3 },
  "roadmap.amended": { rowsDigest: D64, by: "human@batorfi" },
  "roadmap-gate.decided": { decision: "approve", by: "human@batorfi", rowsDigest: D64 },
  "record.unknown": { originalType: "something.else", digest: D64 },
};
/** A well-formed event around `data`, for the validation tests. */
export function eventOf(type: string, data: unknown, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: uuid7(Date.UTC(2026, 9, 28, 10), 5),
    seq: 5, type, schema: `${type}/1`, time: "2026-10-28T10:00:00.000Z", subject: "gate:f:3-spec:1", actor: "human@r15-script", correlation: "run:f", causation: "cmd:k1", trace: null, privacy: "internal", data, ...over,
  };
}
