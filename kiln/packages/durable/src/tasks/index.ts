// The task kinds the core provides (CORE-2) and the `tasks` API: creation THROUGH THE COMMAND LEDGER (`task.create`, CORE-5), with each kind's input validated by name before anything is written.
import { Refuse, runCommand, validKey } from "../commands.ts";
import type { Services } from "../services.ts";
import type { Owner, TaskKind } from "../store.ts";
import { refused, type JSON, type Key, type TaskApi, type TaskCreateOutcome, type TaskKindName } from "../types.ts";
import { roadmapKind } from "./roadmap.ts";
import { rowKind } from "./row.ts";
import { unitKind } from "./unit.ts";
import { walkDoc } from "../walk/doc.ts";
import { checkRoadmap, checkRow, checkUnit } from "./validate.ts";

export const CREATABLE: readonly TaskKindName[] = ["kiln.roadmap", "kiln.row", "kiln.unit"];

export function shellKinds(s: Services): TaskKind<any, any, any>[] {
  return [roadmapKind(s), rowKind(s), unitKind(s)];
}

export function makeTaskApi(s: Services): TaskApi {
  return {
    create: async (key: Key, kind: TaskKindName, input: JSON, owner: Owner): Promise<TaskCreateOutcome> => {
      if (!validKey(key)) return refused("invalid-move", { detail: "the key is a non-empty string of at most 200 characters" });
      if (!CREATABLE.includes(kind)) return refused("invalid-move", { detail: `"${String(kind)}" is not a task kind that can be created from outside (${CREATABLE.join(", ")})` });
      const bad = kind === "kiln.roadmap" ? checkRoadmap(input) : kind === "kiln.row" ? checkRow(input) : checkUnit(input);
      if (bad) return refused("invalid-move", { detail: bad });
      const needsLane = kind === "kiln.unit" ? (input as { needsLane?: boolean }).needsLane : kind === "kiln.row" ? ((input as { script?: { needsLane?: boolean }[] }).script ?? []).some((u) => u.needsLane) : false;
      if (needsLane && !s.lane) return refused("invalid-move", { detail: "a unit with needsLane needs the lane port, and none was supplied to this factory" });
      const out = await runCommand<{ id: number }>(s, key, "task.create", { kind, input, owner } as unknown as JSON, async (tx) => {
        // r14: a feature has ONE walk for good. The walk document is created in the SAME commit as the row, so a second admission of the name — under any other key, while the first walk
        // runs or after it ended — is refused here, by name, instead of being accepted and failing later when its row cannot open its first gate.
        const walk = kind === "kiln.row" ? (input as { feature: string; walk?: unknown }) : null;
        if (walk?.walk !== undefined) {
          const wd = await walkDoc(tx, walk.feature);
          if (wd.admittedBy !== undefined) throw new Refuse(refused("key-conflict", { original: wd.admittedBy, detail: `the feature "${walk.feature}" already has a walk (admitted under key "${wd.admittedBy}"); a feature is admitted once` }));
          wd.admittedBy = key;
        }
        return { id: await tx.createTask(kind, input, owner) };
      });
      if (out.status === "refused") return out;
      return { status: out.status === "applied" ? "created" : "repeat", id: out.result.id };
    },
    list: async () => (await s.store.tasks()).map((t) => ({ id: t.id, kind: t.kind, owner: t.owner ?? "factory", status: t.status, ...(t.outcome ? { outcome: t.outcome.status === "completed" ? { status: "completed" as const, result: t.outcome.result } : { status: t.outcome.status } } : {}) })),
  };
}
