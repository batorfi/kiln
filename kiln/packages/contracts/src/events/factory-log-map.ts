// Which event types the factory-log projection turns into a line, and which record type (research R9). A DECLARED table, tested both ways: every catalog type is listed (a new type cannot slip in
// unmapped), and every listed type is in the catalog. `null` = the event produces no line. The line's contents are built by the reducer (record/src/projections/factory-log.ts).
export type LogRecordType = "transition" | "gate-completion" | "human-decision" | "cost" | "wait" | "pre-delegation";

export const FACTORY_LOG_MAP: Readonly<Record<string, LogRecordType | null>> = {
  // the first program\'s records, as events (read-only types) …
  "lane.transition": "transition",
  "lane.cost-recorded": "cost",
  "gate.completed": "gate-completion",
  "gate.waiting": "wait",
  "delegation.armed": "pre-delegation",
  // … and r13/r14\'s own: a person\'s move on a gate is a human-decision, a settlement a gate-completion
  "move.committed": "human-decision", // except a feature-level move (scope "feature"): not a gate\'s decision, no line
  "gate.settled": "gate-completion",
  // everything else is in the record and in no factory-log line (lane lease changes are not the first program\'s residency transitions; the walk\'s own outcomes have no counterpart there)
  "gate.opened": null, "gate.withdrawn": null, "gate.not-applicable": null, "gate.became-applicable": null, "gate.skipped": null,
  "walk.admitted": null, "walk.returned": null, "walk.split": null, "walk.left-lane": null, "walk.not-admitted": null, "walk.completed": null, "walk.move-ignored": null, "walk.fix-round": null,
  "unit.queued": null, "unit.started": null, "unit.settled": null, "unit.failed": null, "unit.aborted": null,
  "lane.acquired": null, "lane.swapped": null, "lane.released": null,
  "command.accepted": null, "command.refused": null,
  "feature.archived": null, "transcript.aged-out": null,
  "charter.approved": null, "charter.amended": null, "design-system.approved": null, "design-system.amended": null,
  "server.started": null, "server.recovered": null, "store.migrated": null,
  "roadmap.amended": null, "roadmap-gate.decided": null,
  "record.unknown": null,
};
