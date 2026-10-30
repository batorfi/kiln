// Unit events (research R11): `unit.queued` in the commit that creates the unit, `unit.started` in the commit that records its first step, `unit.settled` in the terminal commit,
// `unit.aborted` when it is aborted. NOTE (library): `tx.task()` cannot read after the first table write of a transaction (`createTask` is one), so a creator passes its run EXPLICITLY. (`unit.failed` is catalogued but not emitted: a failed unit's end is written by the library, outside any commit of ours.)
import type { Services } from "../services.ts";
import type { Tx } from "../store.ts";
import type { TaskId } from "../types.ts";
import { appendEvent } from "./append.ts";
import { correlationOfTask, ownerString } from "./runs.ts";

export type UnitEventType = "unit.queued" | "unit.started" | "unit.settled" | "unit.aborted";

export async function appendUnitEvent(
  tx: Tx, s: Services, type: UnitEventType,
  u: { unit: TaskId; label: string; owner: TaskId | null; actor: string; cause: string; correlation?: string | null },
): Promise<void> {
  await appendEvent(tx, {
    type, subject: `unit:${u.unit}`, at: s.now(), actor: u.actor, cause: u.cause,
    correlation: u.correlation !== undefined ? u.correlation : await correlationOfTask(tx, u.owner), data: { unit: u.unit, label: u.label, owner: ownerString(u.owner) },
  });
}
