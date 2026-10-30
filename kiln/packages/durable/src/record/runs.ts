// Which feature run a task belongs to (research R3, R11): follow the owner chain up to the `kiln.row` and read its feature. Used by the events of units and of the lane, whose subject is not a
// feature but whose history belongs to one. Reads through the transaction, so it sees tasks created earlier in the same commit.
import type { Tx } from "../store.ts";
import type { TaskId } from "../types.ts";

/** "run:<feature>" of the row that (transitively) owns this task, or null when no row does. */
export async function correlationOfTask(tx: Tx, taskId: TaskId | null | undefined): Promise<string | null> {
  let cur: TaskId | null | undefined = taskId;
  for (let hops = 0; cur != null && hops < 8; hops++) {
    const t = await tx.task(cur);
    if (!t) return null;
    if (t.kind === "kiln.row") {
      const feature = (t.input as { feature?: unknown } | null)?.feature;
      return typeof feature === "string" && feature !== "" ? `run:${feature}` : null;
    }
    cur = t.owner;
  }
  return null;
}

/** How an owner is written in an event: "factory" or "task:<id>". */
export const ownerString = (owner: TaskId | null | undefined): string => (owner == null ? "factory" : `task:${owner}`);
